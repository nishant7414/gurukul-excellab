import * as XLSX from "xlsx";
import type { CellFormat, SheetData, WorkbookData } from "./types";
import { toRaw } from "./workbook";
import { FUNCS, UNSUPPORTED } from "./core";
import { functionsUsed } from "./parser";
import { parseISODate } from "./dates";

/** Hard limits keep a huge or hostile file from freezing the browser. All parsing happens locally; nothing is uploaded. */
export const IMPORT_LIMITS = { bytes: 5 * 1024 * 1024, cells: 50_000, sheets: 20 };

export interface ImportSheetInfo {
  name: string;
  rows: number;
  cols: number;
  cells: number;
  formulas: number;
}
export interface ImportReport {
  fileName: string;
  kind: "xlsx" | "csv";
  sheets: ImportSheetInfo[];
  /** functions in the file that Gurukul ExcelLab evaluates */
  functionsSupported: string[];
  /** functions in the file Gurukul ExcelLab does not evaluate (their cells will show an error, never an invented value) */
  functionsUnsupported: { name: string; reason: string }[];
  textDates: { sheet: string; addr: string; value: string }[];
  textDateCount: number;
  cellsWithEdgeSpaces: number;
  warnings: string[];
}
export type ImportResult = { ok: true; workbook: WorkbookData; report: ImportReport } | { ok: false; error: string };

const TEXT_DATE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$|^\d{4}-\d{1,2}-\d{1,2}$/;

export function importWorkbook(data: ArrayBuffer | string, fileName: string, size: number): ImportResult {
  const lower = fileName.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf(".") + 1);
  if (ext === "xlsm" || ext === "xlsb" || ext === "xls" || ext === "xltm") return { ok: false, error: `".${ext}" files are not accepted. Macro-enabled and legacy formats could carry code; save the workbook as .xlsx (without macros) or .csv and try again.` };
  if (ext !== "xlsx" && ext !== "csv") return { ok: false, error: `Unsupported file type ".${ext}". Choose a .xlsx or .csv file.` };
  if (size > IMPORT_LIMITS.bytes) return { ok: false, error: `This file is ${(size / 1048576).toFixed(1)} MB. The limit is ${IMPORT_LIMITS.bytes / 1048576} MB.` };

  if (ext === "xlsx") {
    const head = new Uint8Array(data as ArrayBuffer, 0, Math.min(2, (data as ArrayBuffer).byteLength));
    if (head.length < 2 || head[0] !== 0x50 || head[1] !== 0x4b) return { ok: false, error: "This file is not a real .xlsx workbook (it is not a valid zip package). It may be damaged or renamed from another type." };
  }
  let book: XLSX.WorkBook;
  try {
    book = ext === "csv" ? XLSX.read(data as string, { type: "string" }) : XLSX.read(data as ArrayBuffer, { type: "array", cellFormula: true, cellNF: true, bookVBA: true });
  } catch (e) {
    return { ok: false, error: `The file could not be read (${e instanceof Error ? e.message : "unknown error"}). It may be damaged or not a real ${ext.toUpperCase()} file.` };
  }
  if ((book as XLSX.WorkBook & { vbaraw?: unknown }).vbaraw) return { ok: false, error: "This workbook contains macros (VBA). Gurukul ExcelLab never imports macros. Save a copy without macros (.xlsx) and try again." };
  if (book.SheetNames.length > IMPORT_LIMITS.sheets) return { ok: false, error: `The workbook has ${book.SheetNames.length} sheets; the limit is ${IMPORT_LIMITS.sheets}.` };

  const warnings: string[] = [];
  const sheets: SheetData[] = [];
  const infos: ImportSheetInfo[] = [];
  const used = new Set<string>();
  const textDates: ImportReport["textDates"] = [];
  let textDateCount = 0;
  let edge = 0;
  let total = 0;
  let errorCells = 0;

  for (const name of book.SheetNames) {
    const ws = book.Sheets[name];
    const sheet: SheetData = { name, cells: {}, formats: {}, colWidths: {}, hiddenRows: [] };
    let formulas = 0;
    let maxR = 0, maxC = 0, count = 0;
    for (const key of Object.keys(ws)) {
      if (key[0] === "!") continue;
      const cell = ws[key] as XLSX.CellObject;
      const { r, c } = XLSX.utils.decode_cell(key);
      let raw = "";
      if (cell.f) {
        raw = "=" + cell.f;
        formulas++;
        for (const fn of functionsUsed(raw)) used.add(fn);
      } else if (cell.t === "e") {
        errorCells++;
        continue;
      } else if (cell.v !== undefined && cell.v !== null) {
        if (cell.t === "n") raw = String(cell.v);
        else if (cell.t === "b") raw = cell.v ? "TRUE" : "FALSE";
        else if (cell.t === "d") raw = String(cell.v instanceof Date ? Math.round(cell.v.getTime() / 86400000) + 25569 : cell.v);
        else {
          const s = String(cell.v);
          raw = toRaw(s);
          if (s !== s.trim() && s.trim() !== "") edge++;
          if (TEXT_DATE.test(s.trim()) && (!/^\d{4}-/.test(s.trim()) || parseISODate(s.trim()) !== null)) {
            textDateCount++;
            if (textDates.length < 10) textDates.push({ sheet: name, addr: key, value: s });
          }
        }
        if (cell.t === "n" && cell.z && XLSX.SSF.is_date(cell.z)) sheet.formats[key] = { nf: "date" } as CellFormat;
      }
      if (raw === "") continue;
      count++;
      total++;
      if (total > IMPORT_LIMITS.cells) return { ok: false, error: `The workbook has more than ${IMPORT_LIMITS.cells.toLocaleString()} filled cells, which is beyond what Gurukul ExcelLab can safely load in the browser.` };
      sheet.cells[key] = raw;
      maxR = Math.max(maxR, r + 1);
      maxC = Math.max(maxC, c + 1);
    }
    sheets.push(sheet);
    infos.push({ name, rows: maxR, cols: maxC, cells: count, formulas });
  }
  if (!sheets.length || total === 0) return { ok: false, error: "The file contains no data." };
  if (errorCells) warnings.push(`${errorCells} cell(s) held an Excel error value and were skipped.`);
  if (ext === "csv") warnings.push("A CSV file has no formulas, formatting or multiple sheets. Dates in a CSV may arrive as text.");
  if (ext === "xlsx") warnings.push("Charts, PivotTables, macros, Power Query, Power Pivot, comments, data validation and conditional formatting are not imported. Cell values, formulas and sheet names are.");
  const named = book.Workbook?.Names?.length ?? 0;
  if (named) warnings.push(`${named} named range(s) were found and were not imported.`);

  const names = [...used].sort();
  return {
    ok: true,
    workbook: { sheets },
    report: {
      fileName, kind: ext as "xlsx" | "csv", sheets: infos,
      functionsSupported: names.filter((f) => FUNCS.has(f)),
      functionsUnsupported: names.filter((f) => !FUNCS.has(f)).map((f) => ({ name: f, reason: UNSUPPORTED[f] ?? "Not recognised by the Gurukul ExcelLab engine." })),
      textDates, textDateCount, cellsWithEdgeSpaces: edge, warnings,
    },
  };
}

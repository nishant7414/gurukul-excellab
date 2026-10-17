import * as XLSX from "xlsx";
import { FUNCS, UNSUPPORTED } from "./core";
import { functionsUsed } from "./parser";
import type { CellFormat, NumberFormat, WorkbookData } from "./types";

export type ExportKind = "xlsx" | "csv";

export interface ExportOptions {
  kind?: ExportKind;
  fileName?: string;
  title?: string;
  exerciseId?: string;
  objective?: string;
  instructions?: string[];
  includeInstructionsSheet?: boolean;
}

export interface ExportReport {
  kind: ExportKind;
  sheets: number;
  formulas: number;
  functionsSupported: string[];
  functionsUnsupported: { name: string; reason: string }[];
  warnings: string[];
}

const NF_Z: Record<NumberFormat, string | undefined> = {
  general: undefined,
  number: "#,##0.00",
  currency: '"₹"#,##0.00',
  percent: "0.00%",
  date: "yyyy-mm-dd",
  text: "@",
};

export function slugFilePart(s: string, max = 40): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max);
}

export function workbookFileName(opts: { title?: string; exerciseId?: string; kind?: ExportKind } = {}): string {
  const kind = opts.kind ?? "xlsx";
  const parts = ["gurukul-excellab"];
  if (opts.exerciseId) parts.push(slugFilePart(opts.exerciseId, 24));
  if (opts.title) parts.push(slugFilePart(opts.title, 36));
  if (parts.length === 1) parts.push("workbook");
  return `${parts.join("-")}.${kind}`;
}

/** OOXML workbooks are ZIP containers. CSV downloads must never pass this check. */
export function isXlsxZip(data: ArrayBuffer | Uint8Array): boolean {
  const b = data instanceof Uint8Array ? data : new Uint8Array(data);
  return b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
}

function normalizeOpts(kindOrOpts: ExportKind | ExportOptions = "xlsx"): ExportOptions & { kind: ExportKind } {
  if (typeof kindOrOpts === "string") return { kind: kindOrOpts };
  return { kind: "xlsx", ...kindOrOpts };
}

const NOTES = "Challenge notes";

function withNotesSheet(wb: WorkbookData, opts: ExportOptions): WorkbookData {
  if (!opts.includeInstructionsSheet) return wb;
  if (wb.sheets.some((s) => s.name.toLowerCase() === NOTES.toLowerCase())) return wb;
  const cells: Record<string, string> = {
    A1: opts.title ?? "Gurukul ExcelLab challenge",
    A3: "These notes are for reference. Check Answer uses the local Gurukul ExcelLab sheet in the browser, not this downloaded file.",
  };
  if (opts.exerciseId) cells.B1 = opts.exerciseId;
  if (opts.objective) cells.A2 = opts.objective;
  (opts.instructions ?? []).forEach((line, i) => { cells[`A${5 + i}`] = line; });
  return {
    ...wb,
    sheets: [...wb.sheets, { name: NOTES, cells, formats: {}, colWidths: { 1: 480 }, hiddenRows: [] }],
  };
}

function applyNumberFormat(cell: XLSX.CellObject, fmt: CellFormat | undefined) {
  if (!fmt?.nf) return;
  const z = NF_Z[fmt.nf];
  if (z) cell.z = z;
}

export function exportWorkbook(wb: WorkbookData, kindOrOpts: ExportKind | ExportOptions = "xlsx"): { blob: Blob; fileName: string; report: ExportReport } {
  const opts = normalizeOpts(kindOrOpts);
  const kind = opts.kind;
  const source = kind === "xlsx" ? withNotesSheet(wb, opts) : wb;
  const used = new Set<string>();
  let formulas = 0;
  const book = XLSX.utils.book_new();
  const sheets = kind === "csv" ? source.sheets.slice(0, 1) : source.sheets;
  for (const sh of sheets) {
    const ws: XLSX.WorkSheet = {};
    let maxR = 0, maxC = 0;
    for (const [a, raw] of Object.entries(sh.cells)) {
      const { r, c } = XLSX.utils.decode_cell(a);
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
      const fmt = sh.formats[a];
      let cell: XLSX.CellObject;
      if (raw.startsWith("=")) {
        formulas++;
        for (const fn of functionsUsed(raw)) used.add(fn);
        cell = { t: "n", v: 0, f: raw.slice(1) };
      } else if (raw.startsWith("'")) {
        cell = { t: "s", v: raw.slice(1), z: "@" };
      } else if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(raw)) {
        cell = { t: "n", v: Number(raw) };
      } else if (raw.toUpperCase() === "TRUE" || raw.toUpperCase() === "FALSE") {
        cell = { t: "b", v: raw.toUpperCase() === "TRUE" };
      } else {
        cell = { t: "s", v: raw };
      }
      applyNumberFormat(cell, fmt);
      ws[a] = cell;
    }
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    const maxCol = Math.max(maxC, ...Object.keys(sh.colWidths).map((k) => Number(k) - 1), 0);
    const cols: XLSX.ColInfo[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const px = sh.colWidths[c + 1];
      cols.push(px ? { wpx: Math.max(36, Math.min(500, px)) } : {});
    }
    if (cols.some((col) => col.wpx)) ws["!cols"] = cols;
    XLSX.utils.book_append_sheet(book, ws, sh.name.slice(0, 31) || "Sheet1");
  }

  const names = [...used].sort();
  const warnings: string[] = [
    "Macros, VBA, PivotTables, charts, Power Query, Power Pivot and external links are not part of this workbook model and are not written.",
    "Number formats and column widths that Gurukul ExcelLab stores are written when present. Bold, fill colour, alignment, conditional formatting, data validation, notes, hyperlinks and filters created in the ribbon stay in the browser workspace and are not faithfully exported by this download.",
  ];
  if (kind === "csv") warnings.push("CSV can hold only the first worksheet and cannot store formulas as formulas.");

  const out = kind === "csv"
    ? XLSX.write(book, { type: "array", bookType: "csv" })
    : XLSX.write(book, { type: "array", bookType: "xlsx", cellDates: false });
  const blob = new Blob([out], { type: kind === "csv" ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return {
    blob,
    fileName: opts.fileName ?? workbookFileName({ title: opts.title, exerciseId: opts.exerciseId, kind }),
    report: {
      kind,
      sheets: sheets.length,
      formulas: kind === "csv" ? 0 : formulas,
      functionsSupported: names.filter((f) => FUNCS.has(f)),
      functionsUnsupported: names.filter((f) => !FUNCS.has(f)).map((f) => ({ name: f, reason: UNSUPPORTED[f] ?? "Not recognised by the Gurukul ExcelLab engine." })),
      warnings,
    },
  };
}

export function downloadWorkbook(wb: WorkbookData, kindOrOpts: ExportKind | ExportOptions = "xlsx") {
  const { blob, fileName } = exportWorkbook(wb, kindOrOpts);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

import * as XLSX from "xlsx";
import { FUNCS, UNSUPPORTED } from "./core";
import { functionsUsed } from "./parser";
import type { WorkbookData } from "./types";

export interface ExportReport {
  kind: "xlsx" | "csv";
  sheets: number;
  formulas: number;
  functionsSupported: string[];
  functionsUnsupported: { name: string; reason: string }[];
  warnings: string[];
}

export function exportWorkbook(wb: WorkbookData, kind: "xlsx" | "csv" = "xlsx"): { blob: Blob; fileName: string; report: ExportReport } {
  const used = new Set<string>();
  let formulas = 0;
  const book = XLSX.utils.book_new();
  const sheets = kind === "csv" ? wb.sheets.slice(0, 1) : wb.sheets;
  for (const sh of sheets) {
    const ws: XLSX.WorkSheet = {};
    let maxR = 0, maxC = 0;
    for (const [a, raw] of Object.entries(sh.cells)) {
      const { r, c } = XLSX.utils.decode_cell(a);
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
      if (raw.startsWith("=")) {
        formulas++;
        for (const fn of functionsUsed(raw)) used.add(fn);
        ws[a] = { t: "n", v: 0, f: raw.slice(1) };
      } else if (raw.startsWith("'")) {
        ws[a] = { t: "s", v: raw.slice(1), z: "@" };
      } else if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(raw)) {
        ws[a] = { t: "n", v: Number(raw) };
      } else if (raw.toUpperCase() === "TRUE" || raw.toUpperCase() === "FALSE") {
        ws[a] = { t: "b", v: raw.toUpperCase() === "TRUE" };
      } else {
        ws[a] = { t: "s", v: raw };
      }
    }
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    XLSX.utils.book_append_sheet(book, ws, sh.name.slice(0, 31) || "Sheet1");
  }

  const names = [...used].sort();
  const warnings: string[] = [
    "Macros, VBA, PivotTables, charts, Power Query, Power Pivot and external links are not part of this workbook model and are not written.",
    "Conditional formatting, data validation, notes, hyperlinks and filters created in the ribbon are kept while you stay in Gurukul ExcelLab, but this .xlsx/.csv download only includes cell values, formulas and sheet names.",
  ];
  if (kind === "csv") warnings.push("CSV can hold only the first worksheet and cannot store formulas as formulas.");

  const out = kind === "csv"
    ? XLSX.write(book, { type: "array", bookType: "csv" })
    : XLSX.write(book, { type: "array", bookType: "xlsx", cellDates: false });
  const blob = new Blob([out], { type: kind === "csv" ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return {
    blob,
    fileName: kind === "csv" ? "gurukul-excellab-workbook.csv" : "gurukul-excellab-workbook.xlsx",
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

export function downloadWorkbook(wb: WorkbookData, kind: "xlsx" | "csv" = "xlsx") {
  const { blob, fileName } = exportWorkbook(wb, kind);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

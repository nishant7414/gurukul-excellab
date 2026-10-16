import inv from "./sourceInventory.generated.json";
import type { CellFormat, SheetData, WorkbookData } from "../engine/types";
import { parseRange, inRange } from "../engine/refs";
import { toRaw } from "../engine/workbook";

export interface InvCell {
  a: string;
  t: string;
  v: string | number | boolean;
  f?: string;
  nf?: string;
  masked?: boolean;
}
export interface InvSheet {
  id: string;
  index: number;
  name: string;
  ref: string | null;
  empty: boolean;
  cells: InvCell[];
}
export const SOURCE = inv as unknown as {
  workbookId: string;
  fileNameInspected: string;
  fileNameExpectedBySpec: string;
  fileBytes: number;
  sha256: string;
  sheetNames: string[];
  maskedCellCount: number;
  sheets: InvSheet[];
};

export const sourceSheet = (name: string): InvSheet => {
  const s = SOURCE.sheets.find((x) => x.name === name);
  if (!s) throw new Error(`Source sheet "${name}" not found`);
  return s;
};
export const srcCell = (sheet: string, a: string): InvCell | undefined => sourceSheet(sheet).cells.find((c) => c.a === a);
export const srcValue = (sheet: string, a: string) => srcCell(sheet, a)?.v;

const isDateFmt = (nf?: string) => !!nf && /[dmy]/i.test(nf) && /y/i.test(nf);

/**
 * Copy a source range into exercise cells at the SAME addresses as the instructor's worksheet.
 * `formulas: true` keeps the original formulas; otherwise their cached values are copied.
 */
export function copySource(sheet: string, range: string, opts: { formulas?: boolean; into?: SheetData } = {}): SheetData {
  const target: SheetData = opts.into ?? { name: sheet, cells: {}, formats: {}, colWidths: {}, hiddenRows: [] };
  const r = parseRange(range)!;
  for (const c of sourceSheet(sheet).cells) {
    if (!inRange(c.a, r)) continue;
    if (opts.formulas && c.f) target.cells[c.a] = "=" + c.f;
    else target.cells[c.a] = toRaw(c.v as string | number | boolean);
    if (isDateFmt(c.nf)) target.formats[c.a] = { nf: "date" } as CellFormat;
  }
  return target;
}

export function sheetOf(name: string, cells: Record<string, string>, formats: Record<string, CellFormat> = {}): SheetData {
  return { name, cells: { ...cells }, formats: { ...formats }, colWidths: {}, hiddenRows: [] };
}
export function workbookOf(...sheets: SheetData[]): WorkbookData {
  return { sheets };
}

/** Build cells from a 2D array starting at a given address (e.g. "A1"). Text is apostrophe-protected when needed. */
export function grid(start: string, rows: (string | number | null)[][]): Record<string, string> {
  const m = /^([A-Z]+)(\d+)$/.exec(start)!;
  let col0 = 0;
  for (const ch of m[1]) col0 = col0 * 26 + ch.charCodeAt(0) - 64;
  const row0 = Number(m[2]);
  const out: Record<string, string> = {};
  rows.forEach((row, ri) =>
    row.forEach((v, ci) => {
      if (v === null || v === "") return;
      let n = col0 + ci;
      let letters = "";
      while (n > 0) {
        letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
        n = Math.floor((n - 1) / 26);
      }
      out[`${letters}${row0 + ri}`] = typeof v === "number" ? String(v) : typeof v === "string" && v.startsWith("=") ? v : toRaw(v);
    }),
  );
  return out;
}

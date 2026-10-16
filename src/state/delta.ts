import type { CellFormat, SheetData, WorkbookData } from "../engine/types";

/**
 * Large practice tables (hundreds or thousands of rows) must not be copied into localStorage on every save.
 * A delta keeps only what the learner changed relative to the exercise's starting workbook.
 */
export interface SheetDelta {
  name: string;
  set: Record<string, string>;
  del: string[];
  fmt: Record<string, CellFormat | null>;
  hidden: number[];
}
export interface WorkbookDelta { v: 1; sheets: SheetDelta[] }

/** a workbook with more than this many cells is saved as a delta */
export const DELTA_FROM_CELLS = 1500;
export const cellCount = (wb: WorkbookData) => wb.sheets.reduce((n, s) => n + Object.keys(s.cells).length, 0);

const same = (a: CellFormat | undefined, b: CellFormat | undefined) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function diffWorkbook(base: WorkbookData, wb: WorkbookData): WorkbookDelta {
  const sheets: SheetDelta[] = wb.sheets.map((s) => {
    const b = base.sheets.find((x) => x.name === s.name);
    const set: Record<string, string> = {}, del: string[] = [], fmt: Record<string, CellFormat | null> = {};
    for (const [k, v] of Object.entries(s.cells)) if (b?.cells[k] !== v) set[k] = v;
    if (b) for (const k of Object.keys(b.cells)) if (!(k in s.cells)) del.push(k);
    const keys = new Set([...Object.keys(s.formats), ...Object.keys(b?.formats ?? {})]);
    for (const k of keys) if (!same(s.formats[k], b?.formats[k])) fmt[k] = s.formats[k] ?? null;
    return { name: s.name, set, del, fmt, hidden: [...s.hiddenRows] };
  });
  return { v: 1, sheets };
}

export function applyDelta(base: WorkbookData, d: WorkbookDelta): WorkbookData {
  const clone = (s: SheetData): SheetData => ({ ...s, cells: { ...s.cells }, formats: { ...s.formats }, colWidths: { ...s.colWidths }, hiddenRows: [...s.hiddenRows] });
  const sheets = base.sheets.map(clone);
  for (const sd of d.sheets) {
    const s = sheets.find((x) => x.name === sd.name);
    if (!s) continue;
    for (const k of sd.del) delete s.cells[k];
    Object.assign(s.cells, sd.set);
    for (const [k, f] of Object.entries(sd.fmt)) { if (f === null) delete s.formats[k]; else s.formats[k] = f; }
    s.hiddenRows = [...sd.hidden];
  }
  return { sheets };
}

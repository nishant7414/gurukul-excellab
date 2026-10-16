import type { CellFormat, SheetData } from "../engine/types";
import { toRaw } from "../engine/workbook";
import { addr, numToCol } from "../engine/refs";
import type { Dataset } from "./types";

const NF: Partial<Record<string, CellFormat>> = { date: { nf: "date" }, currency: { nf: "currency" }, percent: { nf: "percent" } };

/** Column letter of a dataset column key (A-based), computed from the schema only (no rows needed). */
export const colLetter = (ds: Dataset, key: string): string => {
  const i = ds.columns.findIndex((c) => c.key === key);
  if (i < 0) throw new Error(`Dataset ${ds.id} has no column "${key}"`);
  return numToCol(i + 1);
};

/** Open a dataset as a worksheet: header in row 1, data from row 2, date/currency/percent columns formatted. Generates the rows on demand. */
export function datasetSheet(ds: Dataset, name = ds.sheet): SheetData {
  const cells: Record<string, string> = {};
  const formats: Record<string, CellFormat> = {};
  const colWidths: Record<number, number> = {};
  ds.columns.forEach((c, ci) => {
    cells[addr(ci + 1, 1)] = toRaw(c.header);
    formats[addr(ci + 1, 1)] = { bold: true, fill: "#e8eefc" };
    colWidths[ci + 1] = Math.max(72, Math.min(190, c.header.length * 9 + 24));
  });
  const rows = ds.rows();
  const colFmt = ds.columns.map((c) => NF[c.type]);
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    for (let ci = 0; ci < row.length; ci++) {
      const v = row[ci];
      if (v === null || v === "") continue;
      const a = addr(ci + 1, ri + 2);
      // generated arithmetic (for example 0.1 x 3) can leave binary noise such as 0.30000000000000004; keep 12 significant digits
      cells[a] = toRaw(typeof v === "number" ? Number(v.toPrecision(12)) : v);
      const f = colFmt[ci];
      if (f && typeof v === "number") formats[a] = f;
    }
  }
  return { name, cells, formats, colWidths, hiddenRows: [] };
}

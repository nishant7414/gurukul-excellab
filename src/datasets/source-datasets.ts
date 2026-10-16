import { SOURCE } from "../data/source";
import { addr, numToCol, parseAddr } from "../engine/refs";
import type { Scalar } from "../engine/types";
import { defineDataset } from "./define";
import type { Dataset } from "./types";

/**
 * The instructor's workbook sheets, registered as read-only datasets so the library shows that every original table is preserved.
 * (The lessons and exercises that use them are unchanged.) Masked values stay masked.
 */
const SHEET_CONCEPTS: Record<string, string[]> = { Transpose: ["TR"], "Excel Forms": ["EF"], "Auto and flash fill": ["AF"], "Text to column": ["TC"], "Handling Text Data": ["HT"], "Vlookup ": ["VL"] };

export function sourceDatasets(): Dataset[] {
  return SOURCE.sheets.filter((s) => !s.empty && s.cells.length > 0).map((s, i) => {
    let c1 = 1e9, c2 = 0, r1 = 1e9, r2 = 0;
    for (const c of s.cells) { const p = parseAddr(c.a); if (!p) continue; c1 = Math.min(c1, p.col); c2 = Math.max(c2, p.col); r1 = Math.min(r1, p.row); r2 = Math.max(r2, p.row); }
    const width = c2 - c1 + 1;
    const d = defineDataset({
      id: `DS-SRC-${i + 1}`, alias: `src${i + 1}`, sheet: s.name.trim(), title: `Original workbook: "${s.name.trim()}" sheet`, category: "Original workbook", tier: "Easy",
      rowCount: r2 - r1 + 1, description: `The instructor's "${s.name.trim()}" worksheet exactly as inspected (${SOURCE.fileNameInspected}), cells ${addr(c1, r1)}:${addr(c2, r2)}. Sensitive values are masked.`,
      topics: ["Original workbook sheet"], concepts: SHEET_CONCEPTS[s.name] ?? ["SRC"],
      columns: Array.from({ length: width }, (_, k) => ({ key: numToCol(c1 + k), header: numToCol(c1 + k), type: "mixed" as const })),
      note: "Original teacher-provided table. Read-only; used by the classroom lessons.",
      gen: () => {
        const grid: Scalar[][] = Array.from({ length: r2 - r1 + 1 }, () => Array<Scalar>(width).fill(null));
        for (const c of s.cells) { const p = parseAddr(c.a); if (p) grid[p.row - r1][p.col - c1] = c.v as Scalar; }
        return grid;
      },
    });
    return { ...d, origin: "source" as const };
  });
}

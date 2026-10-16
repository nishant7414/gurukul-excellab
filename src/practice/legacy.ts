import { CHALLENGE_EXERCISES } from "../content/ex-challenges";
import { parseInput } from "../engine/workbook";
import { addr, numToCol } from "../engine/refs";
import type { Scalar } from "../engine/types";
import { defineDataset } from "../datasets/define";
import type { DataCategory, Dataset, Tier } from "../datasets/types";

/**
 * The six challenges that shipped before the dataset library each carry a small inline table. They are kept exactly as they were, and
 * registered here (read from their own workbooks, not duplicated) so every challenge in the app references a dataset id.
 */
const META: { cat: DataCategory; tier: Tier; topics: string[]; concepts: string[] }[] = [
  { cat: "Sales and E-commerce", tier: "Medium", topics: ["Salesperson performance"], concepts: ["LK"] },
  { cat: "Data Cleaning", tier: "Easy", topics: ["Inconsistent capitalization", "Extra spaces between words"], concepts: ["DC", "TX"] },
  { cat: "Finance and Accounting", tier: "Easy", topics: ["Invoice tracking"], concepts: ["LG", "DT"] },
  { cat: "Sales and E-commerce", tier: "Medium", topics: ["Customer orders"], concepts: ["CA"] },
  { cat: "Finance and Accounting", tier: "Easy", topics: ["Monthly income and expenses"], concepts: ["RF", "SM"] },
  { cat: "Education", tier: "Easy", topics: ["Student marks and grades"], concepts: ["DA"] },
];

export function legacyDatasets(): Dataset[] {
  return CHALLENGE_EXERCISES.map((ex, i) => {
    const sh = ex.workbook().sheets.find((s) => s.name === ex.activeSheet)!;
    const headers: string[] = [];
    for (let c = 1; sh.cells[addr(c, 1)] !== undefined; c++) headers.push(parseInput(sh.cells[addr(c, 1)]).kind === "value" ? String((parseInput(sh.cells[addr(c, 1)]) as { value: Scalar }).value) : sh.cells[addr(c, 1)]);
    let last = 1;
    for (const k of Object.keys(sh.cells)) { const m = /^([A-Z]+)(\d+)$/.exec(k); if (m && m[1].length === 1 && m[1] <= numToCol(headers.length)) last = Math.max(last, Number(m[2])); }
    const m = META[i];
    const d = defineDataset({
      id: `DS-LEGACY-CH-${i + 1}`, alias: `legacy${i + 1}`, sheet: ex.activeSheet, title: `Challenge ${i + 1} table: ${ex.title}`, category: m.cat, tier: m.tier, rowCount: last - 1,
      description: `The small inline table that challenge CH-${i + 1} has used since it was first built (kept unchanged).`, topics: m.topics, concepts: m.concepts,
      columns: headers.map((h, k) => ({ key: numToCol(k + 1).toLowerCase(), header: h, type: "mixed" as const })),
      note: "Existing challenge table, preserved as-is.",
      gen: () => Array.from({ length: last - 1 }, (_, r) => headers.map((_h, c) => { const raw = sh.cells[addr(c + 1, r + 2)]; const p = parseInput(raw); return p.kind === "value" ? p.value : p.kind === "formula" ? raw : null; })),
    });
    return d;
  });
}

import { describe, expect, it } from "vitest";
import { compute, toRaw } from "../engine/workbook";
import { applySolution, checkExercise } from "../learning/checker";
import { PRACTICE, PRACTICE_EXERCISES } from "./registry";

const brief = (fb: { status: string; sheet?: string; addr?: string; checkLabel?: string; expected?: unknown; actual?: unknown; formula?: string }[]) =>
  fb.filter((f) => f.status !== "correct").slice(0, 3).map((f) => `${f.status} ${f.sheet}!${f.addr} [${f.checkLabel}] expected=${String(f.expected)} actual=${String(f.actual)} f=${f.formula}`);

describe("practice challenges: reference solutions", () => {
  PRACTICE.forEach((c, i) => {
    const ex = PRACTICE_EXERCISES[i];
    it(`${c.id} ${c.title}: solution passes, untouched sheet fails`, () => {
      const solved = checkExercise(ex, applySolution(ex));
      expect(brief(solved.feedback), `${c.id} solved`).toEqual([]);
      expect(solved.passed).toBe(true);
      const blank = checkExercise(ex, ex.workbook());
      expect(blank.passed).toBe(false);
    }, 60000);
    if (ex.checks.some((k) => k.type === "formula")) {
      it(`${c.id}: typing the correct values instead of formulas is rejected`, () => {
        const wb = applySolution(ex);
        const comp = compute(wb);
        for (const key of Object.keys(ex.solution.cells)) {
          const bang = key.lastIndexOf("!");
          const sheet = bang >= 0 ? key.slice(0, bang) : ex.activeSheet;
          const a = bang >= 0 ? key.slice(bang + 1) : key;
          const v = comp.value(sheet, a);
          const sh = wb.sheets.find((x) => x.name === sheet)!;
          if (typeof v === "number") sh.cells[a] = String(v);
          else if (typeof v === "string") sh.cells[a] = toRaw(v);
        }
        expect(checkExercise(ex, wb).passed).toBe(false);
      }, 60000);
    }
  });
});

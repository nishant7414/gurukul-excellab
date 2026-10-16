import { describe, expect, it } from "vitest";
import { ALL_EXERCISES } from "./registry";
import { applySolution, checkExercise } from "../learning/checker";
import { compute, toRaw } from "../engine/workbook";
import { cloneWb, getSheet } from "../engine/ops";
import type { FormulaCheck } from "../learning/types";
import { cellsIn, parseRange } from "../engine/refs";

const spreadsheetExercises = ALL_EXERCISES.filter((e) => !e.questions);

describe("exercise registry", () => {
  it("has unique ids", () => expect(new Set(ALL_EXERCISES.map((e) => e.id)).size).toBe(ALL_EXERCISES.length));
  it("every exercise has hints, a solution and instructions", () => {
    for (const e of ALL_EXERCISES) {
      expect(e.hints.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.solution.explanation.length, e.id).toBeGreaterThan(10);
      expect(e.instructions.length, e.id).toBeGreaterThan(0);
    }
  });
});

describe.each(spreadsheetExercises.map((e) => [e.id, e] as const))("%s", (_id, ex) => {
  it("rejects the untouched starting workbook", () => {
    expect(checkExercise(ex, ex.workbook()).passed).toBe(false);
  });
  it("accepts the reference solution", () => {
    const r = checkExercise(ex, applySolution(ex));
    const bad = r.feedback.filter((f) => f.status !== "correct").map((f) => `${f.addr}: ${f.status} ${f.message} actual=${f.actual} expected=${f.expected}`);
    expect(bad).toEqual([]);
    expect(r.passed).toBe(true);
  });
  it("rejects hard-coded values where a formula is required", () => {
    const formulaChecks = ex.checks.filter((c): c is FormulaCheck => c.type === "formula" && c.requireFormula !== false);
    if (!formulaChecks.length) return;
    const solved = applySolution(ex);
    const comp = compute(solved);
    const hard = cloneWb(solved);
    for (const c of formulaChecks) {
      const sh = getSheet(hard, c.sheet)!;
      for (const a of cellsIn(parseRange(c.range)!)) {
        const cell = comp.cell(c.sheet, a);
        if (sh.cells[a]?.startsWith("=")) sh.cells[a] = toRaw(cell.value);
      }
    }
    expect(checkExercise(ex, hard).passed).toBe(false);
  });
  it("rejects tampering with protected cells", () => {
    if (!ex.editable.length) return;
    const solved = applySolution(ex);
    const sh = getSheet(solved, ex.activeSheet)!;
    const first = Object.keys(ex.workbook().sheets.find((s) => s.name === ex.activeSheet)!.cells).find((k) => {
      const r = ex.editable.map((e) => parseRange(e)!);
      return !r.some((rr) => cellsIn(rr) && [...cellsIn(rr)].includes(k));
    });
    if (!first) return;
    sh.cells[first] = "TAMPERED";
    const res = checkExercise(ex, solved);
    expect(res.passed).toBe(false);
    expect(res.feedback.some((f) => f.status === "locked-changed")).toBe(true);
  });
});

describe("question-based exercises", () => {
  for (const e of ALL_EXERCISES.filter((x) => x.questions)) {
    it(`${e.id}: every question has a valid correct option and an explanation`, () => {
      for (const q of e.questions!) {
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(q.options.length);
        expect(q.explanation.length).toBeGreaterThan(10);
      }
    });
  }
});

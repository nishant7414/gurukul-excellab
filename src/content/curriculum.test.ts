import { describe, expect, it } from "vitest";
import { ALL_EXERCISES, EXERCISE_BY_ID } from "./registry";
import { ALL_LESSONS, LESSON_BY_ID } from "./lessons";
import { CONCEPTS } from "../data/audit";
import { CHALLENGES } from "./ex-challenges";
import { QUIZZES } from "./quizzes";
import { MODULES } from "./modules";
import { PRACTICE_BY_ID } from "../practice/registry";
import { conceptCoverage } from "./coverage";
import { applySolution, checkExercise } from "../learning/checker";
import { compute, evaluateFormula } from "../engine/workbook";
import { displayValue } from "../engine/format";
import { applyTextToColumns, autoFillRange, cloneWb, filterRows, flashFillAt, getSheet, planTextToColumns, sortRange } from "../engine/ops";
import { addr, parseAddr } from "../engine/refs";
import type { Exercise } from "../learning/types";

describe("curriculum consistency", () => {
  it("every lesson has exactly one guided, one independent and one mastery exercise, all registered", () => {
    for (const l of ALL_LESSONS) {
      const exs = l.exerciseIds.map((id) => EXERCISE_BY_ID.get(id));
      expect(exs.every(Boolean), l.id).toBe(true);
      expect(exs.map((e) => e!.kind), l.id).toEqual(["guided", "independent", "mastery"]);
      for (const e of exs) expect(e!.lessonId, e!.id).toBe(l.id);
    }
  });
  it("every exercise belongs to exactly one lesson, challenge or quiz that lists it", () => {
    const owned = new Set(ALL_LESSONS.flatMap((l) => l.exerciseIds));
    const chal = new Map(CHALLENGES.map((c) => [c.id, c.exerciseId]));
    const quiz = new Map(QUIZZES.map((c) => [c.id, c.exerciseId]));
    for (const e of ALL_EXERCISES) {
      if (LESSON_BY_ID.has(e.lessonId)) expect(owned.has(e.id), e.id).toBe(true);
      else if (chal.has(e.lessonId)) expect(chal.get(e.lessonId), e.id).toBe(e.id);
      else if (quiz.has(e.lessonId)) expect(quiz.get(e.lessonId), e.id).toBe(e.id);
      else if (PRACTICE_BY_ID.get(e.lessonId)) expect(PRACTICE_BY_ID.get(e.lessonId)!.exerciseId, e.id).toBe(e.id);
      else throw new Error(`${e.id} has an unknown owner ${e.lessonId}`);
    }
    expect(CHALLENGES.length).toBe(6);
    expect(QUIZZES.length).toBe(4);
  });
  it("every source concept points to an existing lesson that is practised by at least one of its exercises", () => {
    for (const c of CONCEPTS) {
      const lesson = ALL_LESSONS.find((l) => l.id === c.lessonId);
      expect(lesson, `${c.id} -> ${c.lessonId}`).toBeTruthy();
      const covered = lesson!.exerciseIds.some((id) => EXERCISE_BY_ID.get(id)!.conceptIds.includes(c.id)) || lesson!.conceptIds.includes(c.id);
      expect(covered, `${c.id} in ${lesson!.id}`).toBe(true);
    }
  });
  it("every concept id referenced by a lesson or an exercise exists", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const l of ALL_LESSONS.filter((x) => x.track === "classroom")) for (const c of l.conceptIds) expect(ids.has(c), `${l.id}:${c}`).toBe(true);
    for (const e of ALL_EXERCISES.filter((x) => LESSON_BY_ID.get(x.lessonId)?.track === "classroom")) for (const c of e.conceptIds) expect(ids.has(c), `${e.id}:${c}`).toBe(true);
  });
  it("no exercise or lesson text contains an unmasked identifier-like number", () => {
    const json = JSON.stringify([ALL_LESSONS, ALL_EXERCISES.map((e) => ({ ...e, workbook: e.workbook() }))]);
    expect(/\b\d{9,}\b/.test(json)).toBe(false);
  });
});

describe("question-based exercises verified by the engine", () => {
  const qs = ALL_EXERCISES.filter((e) => e.questions);
  it("has at least one question exercise", () => expect(qs.length).toBeGreaterThan(0));
  for (const e of qs) {
    it(`${e.id}: predict questions equal the engine result`, () => {
      for (const q of e.questions!) {
        if (!q.engine) continue;
        const wb = e.workbook();
        const sh = getSheet(wb, e.activeSheet)!;
        for (const [k, v] of Object.entries(q.engine.cells ?? {})) sh.cells[k] = v;
        const v = evaluateFormula(wb, e.activeSheet, q.engine.formula);
        const out = displayValue(Array.isArray(v) ? v[0][0] : v);
        expect(out, q.id).toBe(q.options[q.correct]);
      }
    });
  }
});

/** The simulated operations the UI exposes must be able to reach the expected results from the starting workbook. */
describe("operation exercises are reachable through the real operations", () => {
  const run = (id: string, fn: (ex: Exercise, wb: ReturnType<Exercise["workbook"]>) => void) =>
    it(id, () => {
      const ex = EXERCISE_BY_ID.get(id)!;
      const wb = ex.workbook();
      fn(ex, wb);
      const r = checkExercise(ex, wb);
      expect(r.feedback.filter((f) => f.status !== "correct").map((f) => `${f.addr} ${f.message} ${f.actual}`)).toEqual([]);
      expect(r.passed).toBe(true);
    });
  const sheetOf = (ex: Exercise, wb: ReturnType<Exercise["workbook"]>) => getSheet(wb, ex.activeSheet)!;

  run("EX-AF-1-1", (ex, wb) => { autoFillRange(sheetOf(ex, wb), { c1: 2, r1: 4, c2: 2, r2: 5 }, { r2: 23 }); });
  run("EX-AF-1-2", (ex, wb) => { autoFillRange(sheetOf(ex, wb), { c1: 3, r1: 4, c2: 3, r2: 5 }, { r2: 13 }); });
  run("EX-AF-1-3", (ex, wb) => { const s = sheetOf(ex, wb); autoFillRange(s, { c1: 4, r1: 4, c2: 4, r2: 4 }, { r2: 15 }); autoFillRange(s, { c1: 5, r1: 4, c2: 5, r2: 5 }, { r2: 15 }); });
  const flash = (col: string, row: number) => (ex: Exercise, wb: ReturnType<Exercise["workbook"]>) => {
    const s = sheetOf(ex, wb);
    const res = flashFillAt(s, compute(wb), ex.activeSheet, parseAddr(`${col}1`)!.col, row);
    expect("error" in res ? res.error : "").toBe("");
    if (!("error" in res)) Object.assign(s.cells, res.filled);
  };
  run("EX-AF-2-1", flash("H", 6));
  run("EX-AF-2-2", flash("M", 6));
  run("EX-AF-3-1", flash("R", 6));
  run("EX-AF-3-2", flash("H", 15));
  const t2c = (src: string, dest: string, o: { delimiters: string[]; treatConsecutiveAsOne?: boolean; qualifier?: '"' | "'" | "" }, rows: [number, number]) => (ex: Exercise, wb: ReturnType<Exercise["workbook"]>) => {
    const s = sheetOf(ex, wb);
    const col = parseAddr(`${src}1`)!.col;
    const plan = planTextToColumns(s, compute(wb), ex.activeSheet, { c1: col, r1: rows[0], c2: col, r2: rows[1] }, dest, { treatConsecutiveAsOne: false, qualifier: "", ...o });
    applyTextToColumns(s, plan);
  };
  run("EX-TC-1-1", t2c("B", "D3", { delimiters: [","] }, [3, 12]));
  run("EX-TC-1-2", t2c("B", "D3", { delimiters: [";"] }, [3, 8]));
  run("EX-TC-1-3", t2c("B", "D3", { delimiters: [","], qualifier: '"' }, [3, 7]));
  run("EX-TC-2-3", (ex, wb) => {
    t2c("B", "D3", { delimiters: [","] }, [3, 8])(ex, wb);
    const s = sheetOf(ex, wb);
    for (let r = 3; r <= 8; r++) ["D", "E", "F"].forEach((c, i) => { s.cells[`${["H", "I", "J"][i]}${r}`] = `=TRIM(${c}${r})`; });
  });
  const TABLE = { c1: 1, r1: 1, c2: 6, r2: 13 };
  run("EX-A6-1", (ex, wb) => { filterRows(sheetOf(ex, wb), compute(wb), ex.activeSheet, TABLE, 2, "=", "North", true); });
  run("EX-A6-2", (ex, wb) => { sortRange(sheetOf(ex, wb), compute(wb), ex.activeSheet, TABLE, 4, true, true); });
  run("EX-A6-3", (ex, wb) => {
    sortRange(sheetOf(ex, wb), compute(wb), ex.activeSheet, TABLE, 2, false, true);
    filterRows(sheetOf(ex, wb), compute(wb), ex.activeSheet, TABLE, 4, ">", "40", true);
  });
  it("EX-A6-3 fails when the filter is applied before the sort (order matters, as the lesson says)", () => {
    const ex = EXERCISE_BY_ID.get("EX-A6-3")!;
    const wb = ex.workbook();
    filterRows(sheetOf(ex, wb), compute(wb), ex.activeSheet, TABLE, 4, ">", "40", true);
    sortRange(sheetOf(ex, wb), compute(wb), ex.activeSheet, TABLE, 2, false, true);
    expect(checkExercise(ex, wb).passed).toBe(false);
  });
  it("transpose exercises can be completed with copyRange + pasteClip", async () => {
    const { copyRange, pasteClip } = await import("../engine/ops");
    for (const [id, dest] of [["EX-TR-2-1", "L12"], ["EX-TR-2-2", "B18"], ["EX-TR-2-3", "A8"]] as const) {
      const ex = EXERCISE_BY_ID.get(id)!;
      const wb = cloneWb(ex.workbook());
      const s = getSheet(wb, ex.activeSheet)!;
      const range = id === "EX-TR-2-3" ? { c1: 1, r1: 1, c2: 7, r2: 5 } : { c1: 3, r1: 3, c2: 9, r2: 7 };
      const clip = copyRange(wb, compute(wb), ex.activeSheet, range, false);
      const p = parseAddr(dest)!;
      pasteClip(s, clip, p.col, p.row, "transpose");
      if (id === "EX-TR-2-2") for (const c of ["C", "D", "E", "F"]) s.cells[`${c}23`] = `=${c}21-${c}22`;
      if (id === "EX-TR-2-3") for (let r = 9; r <= 14; r++) s.cells[addr(6, r)] = `=SUM(B${r}:E${r})`;
      const res = checkExercise(ex, wb);
      expect(res.feedback.filter((f) => f.status !== "correct").map((f) => `${f.addr} ${f.message}`), id).toEqual([]);
      expect(res.passed, id).toBe(true);
    }
  });
  it("reference solutions of every spreadsheet exercise still pass (sanity)", () => {
    for (const e of ALL_EXERCISES.filter((x) => !x.questions)) expect(checkExercise(e, applySolution(e)).passed, e.id).toBe(true);
  });
});

describe("module catalogue", () => {
  it("lists 22 unique modules (the original M01-M20 are all kept) whose lessons exist, and every built lesson belongs to exactly one module", () => {
    expect(MODULES.length).toBe(22);
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(22);
    for (let i = 1; i <= 20; i++) expect(MODULES.some((m) => m.id === `M${String(i).padStart(2, "0")}`), `M${i} kept`).toBe(true);
    const seen = new Map<string, string>();
    for (const m of MODULES) for (const l of m.lessonIds) {
      expect(LESSON_BY_ID.has(l), `${m.id}:${l}`).toBe(true);
      expect(seen.has(l), `${l} in two modules`).toBe(false);
      seen.set(l, m.id);
    }
    for (const l of ALL_LESSONS) expect(seen.has(l.id), `${l.id} is in no module`).toBe(true);
  });
  it("additional lessons name the module that lists them", () => {
    for (const l of ALL_LESSONS.filter((x) => x.track === "additional")) expect(MODULES.find((m) => m.id === l.moduleId)?.lessonIds, l.id).toContain(l.id);
  });
});

describe("source concept coverage", () => {
  it("reports which source concepts have a lesson and at least one exercise", () => {
    const cov = conceptCoverage();
    const missing = cov.filter((c) => !c.covered).map((c) => c.concept.id);
    // every concept in the audit must be practised somewhere; if one is not, the audit page says so instead of claiming it
    expect(missing).toEqual([]);
  });
});

describe("question option order", () => {
  it("the correct option is spread across positions, not always first", () => {
    const qs = ALL_EXERCISES.flatMap((e) => e.questions ?? []);
    expect(qs.length).toBeGreaterThan(20);
    const first = qs.filter((q) => q.correct === 0).length;
    expect(first / qs.length).toBeLessThan(0.5);
    for (const pos of [0, 1, 2]) expect(qs.some((q) => q.correct === pos), `position ${pos}`).toBe(true);
  });
});

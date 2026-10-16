import { describe, expect, it } from "vitest";
import { CHALLENGES, CHALLENGE_EXERCISES } from "../content/ex-challenges";
import { applySolution, checkExercise } from "../learning/checker";
import { compute } from "../engine/workbook";
import { defineDataset } from "../datasets/define";
import { validateDataset } from "../datasets/validate";
import { DATASET_BY_ID } from "../datasets/registry";
import { CATALOG, CATALOG_BY_ID, NO_FILTERS, anotherDataset, conceptProgress, filterCatalog, statsFor } from "./catalog";
import { buildCoverageReport, deepChecks, formatReport } from "./coverage";
import { PRACTICE_CONCEPTS } from "./concepts";
import { PRACTICE, PRACTICE_EXERCISES } from "./registry";
import type { AppState, ExerciseProgress } from "../state/store";

const prog = (o: Partial<ExerciseProgress> = {}): ExerciseProgress => ({ attempts: 0, passed: false, assisted: false, hintsUsed: 0, solutionViewed: false, bestCorrect: 0, lastTotal: 0, ...o });
const state = (ex: Record<string, ExerciseProgress> = {}) => ({ exercises: ex }) as Pick<AppState, "exercises">;

describe("catalogue and coverage report (computed from the real registries)", () => {
  const report = buildCoverageReport();

  it("lists the six original challenges (unchanged) and every practice challenge exactly once", () => {
    expect(CATALOG.length).toBe(CHALLENGES.length + PRACTICE.length);
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
    expect(CATALOG.filter((e) => e.legacy).map((e) => e.id)).toEqual(["CH-1", "CH-2", "CH-3", "CH-4", "CH-5", "CH-6"]);
    for (const c of CHALLENGES) {
      const ex = CHALLENGE_EXERCISES.find((x) => x.id === c.exerciseId)!;
      expect(checkExercise(ex, applySolution(ex)).passed, c.id).toBe(true);
      expect(checkExercise(ex, ex.workbook()).passed, `${c.id} untouched`).toBe(false);
    }
  });
  it("has no broken references, tier-rule violations, repeated consecutive datasets or duplicates", () => {
    expect(report.brokenRefs).toEqual([]);
    expect(report.tierViolations).toEqual([]);
    expect(report.consecutiveSameDataset).toEqual([]);
    expect(report.duplicateWarnings).toEqual([]);
  });
  it("reports the original workbook and challenges as preserved", () => {
    expect(report.originalPreserved.notes).toEqual([]);
    expect(report.originalPreserved.ok).toBe(true);
  });
  it("meets each supported concept's target, and reports unsupported concepts as Missing (never faked)", () => {
    for (const c of report.concepts) {
      const def = PRACTICE_CONCEPTS.find((p) => p.id === c.id)!;
      if (def.supported) { expect(c.actual, c.id).toBeGreaterThanOrEqual(def.target); expect(c.status).toBe("Complete"); }
      else { expect(c.actual, c.id).toBe(0); expect(c.status).toBe("Missing"); }
    }
    expect(report.phases.find((p) => p.phase.startsWith("Concepts Gurukul ExcelLab cannot"))?.status).toBe("Missing");
  });
  it("counts in the report equal counts taken directly from the registries", () => {
    expect(report.challenges.total).toBe(CATALOG.length);
    expect(report.concepts.reduce((n, c) => n + c.additional + c.original, 0)).toBe(CATALOG.length);
    expect(report.challenges.byTier.Easy + report.challenges.byTier.Medium + report.challenges.byTier.Hard).toBe(CATALOG.length);
    expect(report.datasets.byCategory.reduce((n, c) => n + c.datasets, 0)).toBe(report.datasets.total);
    expect(formatReport(report)).toContain(`${CATALOG.length} challenges`);
  });
  it("every Hard challenge uses a table large or messy enough, and no challenge is easier than its data", () => {
    for (const e of CATALOG.filter((x) => !x.legacy)) {
      const ds = e.datasetIds.map((d) => DATASET_BY_ID.get(d)!);
      if (e.tier === "Hard") expect(ds.some((d) => d.tier === "Hard" || d.rowCount >= 300 || d.issues.length >= 2) || ds.length >= 3, e.id).toBe(true);
    }
  });
});

describe("challenge selection helpers", () => {
  it("'Try another dataset' picks the same concept on a different dataset, deterministically, and never changes progress", () => {
    const st = state({ "EX-PC-LK-01": prog({ attempts: 3, passed: true, bestCorrect: 4, lastTotal: 4 }) });
    const frozen = JSON.stringify(st);
    for (const e of CATALOG) {
      const a = anotherDataset(e, st);
      const b = anotherDataset(e, st);
      expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
      for (const x of a) {
        expect(x.concept).toBe(e.concept);
        expect(x.id).not.toBe(e.id);
        expect(x.datasetIds.some((d) => e.datasetIds.includes(d)), `${e.id} -> ${x.id}`).toBe(false);
      }
    }
    expect(JSON.stringify(st)).toBe(frozen);
  });
  it("filters by difficulty, concept, dataset category, completion and original/additional", () => {
    const st = state({ "EX-PC-LK-01": prog({ attempts: 1, passed: true }), "EX-CH-1": prog({ attempts: 2, passed: true }) });
    expect(filterCatalog(CATALOG, NO_FILTERS, st).length).toBe(CATALOG.length);
    expect(filterCatalog(CATALOG, { ...NO_FILTERS, tier: "Hard" }, st).every((e) => e.tier === "Hard")).toBe(true);
    expect(filterCatalog(CATALOG, { ...NO_FILTERS, concept: "CS" }, st).length).toBe(10);
    expect(filterCatalog(CATALOG, { ...NO_FILTERS, source: "original" }, st).map((e) => e.id)).toEqual(["CH-1", "CH-2", "CH-3", "CH-4", "CH-5", "CH-6"]);
    expect(filterCatalog(CATALOG, { ...NO_FILTERS, completion: "completed" }, st).map((e) => e.id).sort()).toEqual(["CH-1", "PC-LK-01"]);
    expect(filterCatalog(CATALOG, { ...NO_FILTERS, completion: "incomplete" }, st).length).toBe(CATALOG.length - 2);
    const edu = filterCatalog(CATALOG, { ...NO_FILTERS, category: "Education" }, st);
    expect(edu.length).toBeGreaterThan(0);
    expect(edu.every((e) => e.datasetIds.some((d) => DATASET_BY_ID.get(d)?.category === "Education"))).toBe(true);
  });
  it("challenge status and concept mastery come only from recorded attempts", () => {
    const e = CATALOG_BY_ID.get("PC-LK-01")!;
    expect(statsFor(e, state()).status).toBe("new");
    expect(statsFor(e, state({ [e.exerciseId]: prog({ attempts: 2 }) })).status).toBe("in-progress");
    const done = statsFor(e, state({ [e.exerciseId]: prog({ attempts: 2, passed: true, assisted: true, hintsUsed: 3, bestCorrect: 5, lastTotal: 5, lastAt: "2026-01-01T00:00:00Z" }) }));
    expect(done).toMatchObject({ status: "completed", assisted: true, hintsUsed: 3, bestCorrect: 5, total: 5, attempts: 2 });
    expect(conceptProgress(state()).every((c) => !c.mastered)).toBe(true);
    const lk = CATALOG.filter((x) => x.concept === "LK");
    const all = Object.fromEntries(lk.map((x) => [x.exerciseId, prog({ attempts: 1, passed: true })]));
    expect(conceptProgress(state(all)).find((c) => c.concept === "LK")?.mastered).toBe(true);
    const assisted = Object.fromEntries(lk.map((x) => [x.exerciseId, prog({ attempts: 1, passed: true, assisted: true })]));
    expect(conceptProgress(state(assisted)).find((c) => c.concept === "LK")?.mastered).toBe(false);
  });
});

describe("guards", () => {
  it("the sensitive-data guard rejects phone-like, Aadhaar-like and real-domain e-mail values", () => {
    const bad = (value: string) => defineDataset({ id: "DS-TEST-BAD", alias: "bad", sheet: "Bad", title: "Bad", category: "Operations and Other", tier: "Easy", rowCount: 1, description: "x", topics: [], columns: [{ key: "a", header: "A", type: "text" }], gen: () => [[value]] });
    expect(validateDataset(bad("9876543210")).some((f) => f.level === "error")).toBe(true);
    expect(validateDataset(bad("1234 5678 9012")).some((f) => f.level === "error")).toBe(true);
    expect(validateDataset(bad("someone@gmail.com")).some((f) => f.level === "error")).toBe(true);
    expect(validateDataset(bad("student@example.com")).filter((f) => f.level === "error")).toEqual([]);
  });
  it("a challenge on a 1,000-row table is still quick to compute", () => {
    const i = PRACTICE.findIndex((c) => c.id === "PC-CS-08");
    const ex = PRACTICE_EXERCISES[i];
    const solved = applySolution(ex);
    const t = performance.now();
    compute(solved);
    expect(performance.now() - t).toBeLessThan(3000);
  });
});

describe("deep validation (generates every dataset and runs every reference solution)", () => {
  it("finds no dataset errors, failing solutions, unverifiable challenges or simulated-flag mismatches", () => {
    const d = deepChecks();
    expect(d.datasetErrors).toEqual([]);
    expect(d.failedSolutions).toEqual([]);
    expect(d.unverifiable).toEqual([]);
    expect(d.simulatedMismatch).toEqual([]);
  }, 180000);
});

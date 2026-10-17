import { describe, expect, it } from "vitest";
import { ALL_EXERCISES } from "../content/registry";
import { ALL_LESSONS } from "../content/lessons";
import { QUIZZES } from "../content/quizzes";
import { DATASETS } from "../datasets/registry";
import { GOOGLE_SAMPLE_SHEET } from "../sheets/catalog";
import { auditChallengeMappings } from "./mapping-audit";

describe("challenge mapping audit", () => {
  const audit = auditChallengeMappings();

  it("matches the live curriculum counts", () => {
    expect(audit.lessons).toBe(ALL_LESSONS.length);
    expect(audit.exercises).toBe(ALL_EXERCISES.length);
    expect(audit.practical).toBe(ALL_EXERCISES.filter((e) => !e.questions).length);
    expect(audit.quizzes).toBe(QUIZZES.length);
    expect(audit.questionExercises).toBe(ALL_EXERCISES.filter((e) => e.questions).length);
    expect(audit.datasets).toBe(DATASETS.length);
    expect(audit.practical + audit.questionExercises).toBe(audit.exercises);
  });

  it("gives every practical challenge a starter workbook and checks", () => {
    expect(audit.fullyConfigured).toBe(audit.practical);
    expect(audit.requiringDataset).toBe(0);
    for (const row of audit.rows.filter((r) => r.kind === "practical")) {
      expect(row.starterCells, row.exerciseId).toBeGreaterThan(0);
      expect(row.activeSheetOk, row.exerciseId).toBe(true);
      expect(row.hasChecks, row.exerciseId).toBe(true);
      expect(row.missingDatasetIds, row.exerciseId).toEqual([]);
    }
  });

  it("does not invent Google workbooks or assign Class Data to lessons", () => {
    expect(audit.invalidMappings).toBe(0);
    expect(audit.duplicateMappings).toBe(0);
    expect(audit.requiringWorkbookMapping).toBe(audit.practical);
    for (const row of audit.rows) {
      expect(JSON.stringify(row)).not.toContain("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    }
    expect(GOOGLE_SAMPLE_SHEET.spreadsheetUrl).toContain("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
  });

  it("records catalog dataset ids only when they exist", () => {
    const catalogued = audit.rows.filter((r) => r.catalogDatasetIds.length > 0);
    expect(catalogued.length).toBeGreaterThan(0);
    for (const row of catalogued) expect(row.missingDatasetIds).toEqual([]);
  });
});

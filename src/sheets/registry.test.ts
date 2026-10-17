import { describe, expect, it } from "vitest";
import { ALL_EXERCISES } from "../content/registry";
import { GOOGLE_SAMPLE_SHEET } from "./catalog";
import { auditWorkbookConfig, bindExercise } from "./registry";

const SAMPLE_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

describe("workbook registry", () => {
  const audit = auditWorkbookConfig();

  it("gives every exercise an explicit workbook status", () => {
    expect(audit.total).toBe(ALL_EXERCISES.length);
    expect(audit.quizzes + audit.practical).toBe(audit.total);
    expect(new Set(audit.bindings.map((b) => b.workbookId)).size).toBe(audit.total);
    for (const b of audit.bindings) {
      expect(["quiz", "local-only", "configured", "invalid", "unused"]).toContain(b.status);
    }
  });

  it("does not assign Google's Class Data sample to any challenge", () => {
    for (const b of audit.bindings) {
      expect(b.google?.spreadsheetUrl ?? "").not.toContain(SAMPLE_ID);
      if (b.open && b.open.ok) expect(b.open.spreadsheetId).not.toBe(SAMPLE_ID);
    }
    expect(GOOGLE_SAMPLE_SHEET.spreadsheetUrl).toContain(SAMPLE_ID);
  });

  it("treats practical exercises without a URL as local-only, not configured", () => {
    const practical = audit.bindings.filter((b) => b.kind === "practical");
    expect(audit.localOnly).toBe(practical.length);
    expect(audit.configured).toBe(0);
    expect(audit.missing.length).toBe(practical.length);
  });

  it("records verified local sheets and ranges from the exercise definition", () => {
    const vl = bindExercise(ALL_EXERCISES.find((e) => e.id === "EX-VL-1-1")!);
    expect(vl.localSheet.length).toBeGreaterThan(0);
    expect(vl.verifiedRanges.length).toBeGreaterThan(0);
    expect(vl.roles).toContain("local-dataset");
    expect(vl.status).toBe("local-only");
  });

  it("marks a Settings URL as configured or invalid", () => {
    const ok = bindExercise(ALL_EXERCISES.find((e) => e.id === "EX-VL-1-1")!, {
      "EX-VL-1-1": { title: "Mine", spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxTemplateSheet99/edit" },
    });
    expect(ok.status).toBe("configured");
    expect(ok.googleSource).toBe("settings");
    expect(ok.roles).toContain("editable-template");

    const bad = bindExercise(ALL_EXERCISES.find((e) => e.id === "EX-VL-1-1")!, {
      "EX-VL-1-1": { spreadsheetUrl: "https://example.com/not-sheets" },
    });
    expect(bad.status).toBe("invalid");
    expect(bad.issues.length).toBeGreaterThan(0);
  });

  it("reports unused and duplicate mappings", () => {
    const url = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxSharedSheetAAA1/edit";
    const report = auditWorkbookConfig({
      "EX-VL-1-1": { spreadsheetUrl: url },
      "EX-VL-1-2": { spreadsheetUrl: url },
      "NOT-AN-EXERCISE": { spreadsheetUrl: url },
    });
    expect(report.unused).toContain("NOT-AN-EXERCISE");
    expect(report.duplicates.some((d) => d.exerciseIds.includes("EX-VL-1-1") && d.exerciseIds.includes("EX-VL-1-2"))).toBe(true);
    expect(report.configured).toBe(2);
  });
});

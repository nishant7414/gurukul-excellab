import { describe, expect, it } from "vitest";
import { resolveGoogleOpenLink } from "./googleOpen";

describe("resolveGoogleOpenLink", () => {
  it("returns unconfigured when no assignment or practice URL", () => {
    expect(resolveGoogleOpenLink("EX-VL-1-1", undefined, {})).toEqual({ state: "unconfigured" });
  });

  it("opens the Settings assignment for this exercise only", () => {
    const url = "https://docs.google.com/spreadsheets/d/1LessonSpecificWorkbook99/edit";
    const link = resolveGoogleOpenLink("EX-VL-1-1", undefined, {
      "EX-VL-1-1": { spreadsheetUrl: url },
    });
    expect(link.state).toBe("ready");
    if (link.state === "ready") {
      expect(link.openUrl).toContain("1LessonSpecificWorkbook99");
      expect(link.source).toBe("settings");
    }
  });

  it("prefers the student practice copy over the shared template", () => {
    const template = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxTemplateSheet99/edit";
    const copy = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxStudentCopy99/edit";
    const link = resolveGoogleOpenLink("EX-VL-1-1", copy, {
      "EX-VL-1-1": { spreadsheetUrl: template },
    });
    expect(link.state).toBe("ready");
    if (link.state === "ready") {
      expect(link.openUrl).toContain("1abcdefghijklmnopqrstuvwxStudentCopy99");
      expect(link.source).toBe("practice");
    }
  });

  it("returns invalid for a malformed saved URL", () => {
    const link = resolveGoogleOpenLink("EX-VL-1-1", undefined, {
      "EX-VL-1-1": { spreadsheetUrl: "https://example.com/not-a-sheet" },
    });
    expect(link.state).toBe("invalid");
  });

  it("does not reuse another exercise's mapping", () => {
    const link = resolveGoogleOpenLink("EX-VL-1-2", undefined, {
      "EX-VL-1-1": { spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1OnlyForOne/edit" },
    });
    expect(link).toEqual({ state: "unconfigured" });
  });
});

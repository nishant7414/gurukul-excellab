import { describe, expect, it } from "vitest";
import { CONCEPTS, INCONSISTENCIES, SHEET_AUDITS } from "./audit";
import { SOURCE, sourceSheet } from "./source";

describe("source inventory", () => {
  it("contains the seven worksheets in the original order with exact names (incl. trailing space)", () => {
    expect(SOURCE.sheetNames).toEqual(["Transpose", "Sheet1", "Excel Forms", "Auto and flash fill", "Text to column", "Handling Text Data", "Vlookup "]);
  });
  it("Sheet1 is empty and the other six are populated", () => {
    expect(sourceSheet("Sheet1").empty).toBe(true);
    for (const n of SOURCE.sheetNames.filter((x) => x !== "Sheet1")) expect(sourceSheet(n).cells.length).toBeGreaterThan(0);
  });
  it("never stores long numeric identifiers", () => {
    const text = JSON.stringify(SOURCE);
    expect(/\d{9,}/.test(text.replace(SOURCE.sha256, ""))).toBe(false);
  });
  it("the catalogue holds 60 products", () => {
    const ids = sourceSheet("Vlookup ").cells.filter((c) => /^B\d+$/.test(c.a) && Number(c.a.slice(1)) >= 3);
    expect(ids).toHaveLength(60);
  });
});

describe("every flagged inconsistency is verified against the real data", () => {
  for (const i of INCONSISTENCIES) it(`${i.id} (${i.sheet} ${i.cells})`, () => expect(i.verify()).toBe(true));
});

describe("concept inventory", () => {
  it("has unique stable ids", () => expect(new Set(CONCEPTS.map((c) => c.id)).size).toBe(CONCEPTS.length));
  it("references only real sheet names", () => {
    for (const c of CONCEPTS) expect(SOURCE.sheetNames).toContain(c.sheet);
  });
  it("sheet audit covers all seven sheets", () => expect(SHEET_AUDITS.map((s) => s.name)).toEqual(SOURCE.sheetNames));
  it("worked-formula concepts really have a formula at the cited place", () => {
    const checks: Record<string, [string, string]> = {
      "C-HT-01": ["O6", "LEFT"], "C-HT-03": ["Q6", "RIGHT"], "C-HT-04": ["S6", "TEXTAFTER"], "C-HT-06": ["S7", "TEXTSPLIT"],
      "C-HT-07": ["W3", "SEARCH"], "C-HT-08": ["X3", "FIND"], "C-HT-11": ["BB5", "PROPER"], "C-HT-14": ["AN6", "LEN"],
      "C-HT-15": ["AV6", "TEXT"], "C-HT-16": ["AR6", "CONCATENATE"],
    };
    const s = sourceSheet("Handling Text Data");
    for (const [id, [cell, fn]] of Object.entries(checks)) {
      expect(CONCEPTS.find((c) => c.id === id)?.evidence).toBe("worked-formula");
      expect(s.cells.find((c) => c.a === cell)?.f ?? "").toContain(fn);
    }
  });
  it("heading-only concepts really have no formula in the source", () => {
    const s = sourceSheet("Handling Text Data");
    const anyOf = (fn: string) => s.cells.some((c) => (c.f ?? "").toUpperCase().includes(fn + "("));
    for (const fn of ["MID", "TRIM", "TEXTBEFORE", "SUBSTITUTE", "FILTERXML", "FILTER", "TOCOL", "TOROW", "TRANSPOSE", "UPPER", "LOWER"]) expect(anyOf(fn)).toBe(false);
  });
});

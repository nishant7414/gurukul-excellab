import { describe, expect, it } from "vitest";
import { XlError } from "../engine/types";
import {
  compareNumber,
  compareScalar,
  compareTable,
  compareText,
  formulaUsesAny,
  manualReviewResult,
  matchFormulaString,
  normalizeText,
  scoreFromCounts,
  scorePartial,
} from "./validators";

describe("compareNumber", () => {
  it("accepts an exact number", () => {
    expect(compareNumber(10, 10).ok).toBe(true);
  });
  it("uses an explicit absolute tolerance", () => {
    expect(compareNumber(10.04, 10, 0.05).ok).toBe(true);
    expect(compareNumber(10.06, 10, 0.05).ok).toBe(false);
  });
  it("uses a small relative default when no tolerance is given", () => {
    expect(compareNumber(1, 1 + 1e-12).ok).toBe(true);
    expect(compareNumber(1, 1.01).ok).toBe(false);
  });
});

describe("compareText", () => {
  it("requires an exact match by default", () => {
    expect(compareText("North", "North").ok).toBe(true);
    expect(compareText("north", "North").ok).toBe(false);
    expect(compareText("north", "North").reason).toBe("case");
  });
  it("can ignore case and collapse whitespace", () => {
    expect(compareText("  NORTH  ", "North", { ignoreCase: true, trim: true }).ok).toBe(true);
    expect(normalizeText("  A   B  ", { normalizeWhitespace: true })).toBe("A B");
    expect(compareText("A   B", "A B", { normalizeWhitespace: true }).ok).toBe(true);
  });
});

describe("compareScalar", () => {
  it("compares blank, text, numbers and errors", () => {
    expect(compareScalar(null, "").ok).toBe(true);
    expect(compareScalar("Ada", "Ada").ok).toBe(true);
    expect(compareScalar(2, 2).ok).toBe(true);
    expect(compareScalar(new XlError("#N/A"), new XlError("#N/A")).ok).toBe(true);
    expect(compareScalar("2", 2).ok).toBe(false);
  });
});

describe("compareTable", () => {
  it("compares a grid of expected output values", () => {
    expect(compareTable([[1, "A"]], [[1, "A"]]).ok).toBe(true);
    expect(compareTable([[1, "A"]], [[1, "B"]]).ok).toBe(false);
    expect(compareTable([[1]], [[1, 2]]).reason).toBe("cols");
  });
});

describe("matchFormulaString", () => {
  it("checks the formula text without evaluating it", () => {
    expect(matchFormulaString("=VLOOKUP(A2,$D$2:$F$20,2,FALSE)", "VLOOKUP\\(.*FALSE")).toBe(true);
    expect(matchFormulaString("=SUM(A1:A3)", "VLOOKUP")).toBe(false);
    expect(matchFormulaString("=SUM(A1)", "(")).toBe(false);
  });
});

describe("scorePartial", () => {
  it("reports partial credit and a configurable pass threshold", () => {
    expect(scorePartial([true, true, false])).toEqual({ correct: 2, total: 3, percent: 67, passed: false });
    expect(scorePartial([true, true, false], 0.6).passed).toBe(true);
    expect(scoreFromCounts(3, 4).percent).toBe(75);
    expect(scoreFromCounts(0, 0).passed).toBe(false);
  });
});

describe("formulaUsesAny and manual review", () => {
  it("detects function names in a formula string", () => {
    expect(formulaUsesAny("=Index(A1:B2,1,2)", ["INDEX", "MATCH"])).toBe(true);
    expect(formulaUsesAny("=SUM(A1)", ["INDEX"])).toBe(false);
  });
  it("never marks an unsupported review task correct", () => {
    const r = manualReviewResult("Chart layout needs a person to review.");
    expect(r.passed).toBe(false);
    expect(r.correct).toBe(0);
  });
});

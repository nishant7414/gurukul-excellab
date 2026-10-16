import { describe, expect, it } from "vitest";
import { FN_CASES, fixtureWorkbook } from "./cases";
import { compute, evaluateFormula } from "./workbook";
import { shiftFormula, functionsUsed } from "./parser";
import { XlError, isErr, isMatrix } from "./types";

const norm = (v: unknown): unknown => {
  if (isErr(v)) return v.code;
  if (isMatrix(v)) return v.map((r) => r.map(norm));
  return v;
};

describe("function cases (hand-computed expectations)", () => {
  const wb = fixtureWorkbook();
  for (const k of FN_CASES) {
    it(`${k.fn}: ${k.formula}`, () => {
      const got = norm(evaluateFormula(wb, "S", k.formula));
      if (typeof k.expected === "number" && typeof got === "number") expect(got).toBeCloseTo(k.expected, 9);
      else expect(got).toEqual(k.expected);
    });
  }
});

describe("recalculation, references and arrays", () => {
  it("recalculates dependents when an input changes", () => {
    const wb = fixtureWorkbook();
    wb.sheets[0].cells.K1 = "=A1*2";
    wb.sheets[0].cells.K2 = "=K1+1";
    expect(compute(wb).value("S", "K2")).toBe(21);
    wb.sheets[0].cells.A1 = "100";
    expect(compute(wb).value("S", "K2")).toBe(201);
  });
  it("detects circular references", () => {
    const wb = fixtureWorkbook();
    wb.sheets[0].cells.K1 = "=K2+1";
    wb.sheets[0].cells.K2 = "=K1+1";
    const v = compute(wb).value("S", "K1");
    expect(isErr(v) && v.code).toBe("#CIRC!");
  });
  it("spills dynamic arrays into neighbouring cells and reads them back", () => {
    const wb = fixtureWorkbook();
    wb.sheets[0].cells.K1 = "=SEQUENCE(3)";
    wb.sheets[0].cells.L10 = "=SUM(K1:K3)";
    const c = compute(wb);
    expect(c.value("S", "K1")).toBe(1);
    expect(c.value("S", "K3")).toBe(3);
    expect(c.cell("S", "K2").spilledFrom).toBe("S!K1");
    expect(c.value("S", "L10")).toBe(6);
  });
  it("reports #SPILL! when the spill range is blocked", () => {
    const wb = fixtureWorkbook();
    wb.sheets[0].cells.K1 = "=SEQUENCE(3)";
    wb.sheets[0].cells.K2 = "blocker";
    const v = compute(wb).value("S", "K1");
    expect(isErr(v) && v.code).toBe("#SPILL!");
  });
  it("gives a meaningful message for syntax errors and wrong argument counts", () => {
    const wb = fixtureWorkbook();
    const a = evaluateFormula(wb, "S", "=SUM(");
    expect(a).toBeInstanceOf(XlError);
    const b = evaluateFormula(wb, "S", "=LEFT()");
    expect(isErr(b) && b.detail).toMatch(/argument/);
    const d = evaluateFormula(wb, "S", "=1/0");
    expect(isErr(d) && d.detail).toMatch(/divide/i);
  });
  it("unsupported functions never fabricate a value", () => {
    const wb = fixtureWorkbook();
    const v = evaluateFormula(wb, "S", '=FILTERXML("<a/>","//a")');
    expect(isErr(v) && v.code).toBe("#UNSUPPORTED!");
    expect(isErr(v) && v.detail).toMatch(/not evaluate/);
  });
  it("whole-column references use the used extent", () => {
    const wb = fixtureWorkbook();
    expect(evaluateFormula(wb, "S", "=SUM(A:A)")).toBe(150);
  });
});

describe("shiftFormula (relative / absolute / mixed)", () => {
  it("shifts relative references", () => expect(shiftFormula("=A1+B2", 1, 0)).toBe("=A2+B3"));
  it("keeps absolute references", () => expect(shiftFormula("=$A$1*B1", 3, 2)).toBe("=$A$1*D4"));
  it("handles mixed references", () => {
    expect(shiftFormula("=$A1+B$1", 2, 2)).toBe("=$A3+D$1");
  });
  it("shifts ranges and keeps locked tables", () =>
    expect(shiftFormula("=VLOOKUP(J3,$B$3:$F$62,2,FALSE)", 1, 0)).toBe("=VLOOKUP(J4,$B$3:$F$62,2,FALSE)"));
  it("does not alter text in strings or function names", () =>
    expect(shiftFormula('=IF(A1="A1",LOG10(B2),0)', 1, 0)).toBe('=IF(A2="A1",LOG10(B3),0)'));
  it("keeps sheet prefixes", () => expect(shiftFormula("=Products!$A$2:$E$61+Products!A2", 1, 0)).toBe("=Products!$A$2:$E$61+Products!A3"));
  it("produces #REF! when shifted off the sheet", () => expect(shiftFormula("=A1", -1, 0)).toBe("=#REF!"));
});

describe("functionsUsed", () => {
  it("lists nested functions", () => {
    expect(functionsUsed('=IFERROR(INDEX(A1:A3,MATCH("x",B1:B3,0)),"")').sort()).toEqual(["IFERROR", "INDEX", "MATCH"]);
  });
});

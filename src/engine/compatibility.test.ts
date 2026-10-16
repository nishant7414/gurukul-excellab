import { describe, expect, it } from "vitest";
import { FUNCS, UNSUPPORTED } from "./core";
import { FN_CASES, fixtureWorkbook } from "./cases";
import { evaluateFormula } from "./workbook";
import { isErr, isMatrix } from "./types";

const TARGET = [
  "SUM", "AVERAGE", "MIN", "MAX", "COUNT", "COUNTA", "ROUND",
  "IF", "IFS", "AND", "OR", "NOT", "IFERROR", "IFNA",
  "SUMIF", "SUMIFS", "COUNTIF", "COUNTIFS", "AVERAGEIF", "AVERAGEIFS",
  "VLOOKUP", "HLOOKUP", "XLOOKUP", "INDEX", "MATCH", "XMATCH",
  "LEFT", "RIGHT", "MID", "LEN", "TRIM", "UPPER", "LOWER", "PROPER",
  "CONCAT", "CONCATENATE", "TEXT", "TEXTBEFORE", "TEXTAFTER", "TEXTSPLIT",
  "TODAY", "NOW", "DATE", "YEAR", "MONTH", "DAY", "DATEDIF", "EOMONTH", "WORKDAY", "NETWORKDAYS",
  "MEDIAN", "MODE", "STDEV", "VAR", "RANK", "LARGE", "SMALL", "PERCENTILE",
  "FILTER", "SORT", "SORTBY", "UNIQUE", "SEQUENCE", "TRANSPOSE", "LET",
  "PMT", "FV", "PV", "NPV", "IRR", "SUBTOTAL", "AGGREGATE",
] as const;

const norm = (v: unknown): unknown => {
  if (isErr(v)) return v.code;
  if (isMatrix(v)) return v.map((r) => r.map(norm));
  return v;
};

describe("formula compatibility (from real evaluations)", () => {
  const wb = fixtureWorkbook();
  const byFn = new Map<string, { ok: number; fail: string[] }>();
  for (const k of FN_CASES) {
    const got = norm(evaluateFormula(wb, "S", k.formula));
    const pass = typeof k.expected === "number" && typeof got === "number"
      ? Math.abs(got - k.expected) < 1e-9
      : JSON.stringify(got) === JSON.stringify(k.expected);
    const rec = byFn.get(k.fn) ?? { ok: 0, fail: [] };
    if (pass) rec.ok++;
    else rec.fail.push(`${k.formula} got ${JSON.stringify(got)} expected ${JSON.stringify(k.expected)}`);
    byFn.set(k.fn, rec);
  }

  it("every recorded function case matches its hand-computed result", () => {
    const fails = [...byFn.values()].flatMap((v) => v.fail);
    expect(fails).toEqual([]);
  });

  it("classifies the target list without claiming Excel parity", () => {
    const rows = TARGET.map((name) => {
      const implemented = FUNCS.has(name);
      const tested = byFn.get(name);
      const unsupported = name in UNSUPPORTED;
      let status: "implemented and verified" | "implemented but not fully verified" | "not implemented";
      if (implemented && tested && tested.ok > 0 && tested.fail.length === 0) status = "implemented and verified";
      else if (implemented) status = "implemented but not fully verified";
      else status = "not implemented";
      return { name, status, unsupported };
    });
    const verified = rows.filter((r) => r.status === "implemented and verified").map((r) => r.name);
    const missing = rows.filter((r) => r.status === "not implemented").map((r) => r.name);
    expect(verified).toContain("SUM");
    expect(verified).toContain("XLOOKUP");
    expect(verified).toContain("PMT");
    expect(verified).toContain("DATEDIF");
    expect(missing).toEqual(expect.arrayContaining(["LET", "XMATCH", "NPV", "IRR", "SUBTOTAL", "AGGREGATE"]));
    expect(FUNCS.size).toBeGreaterThan(80);
    expect(Object.keys(UNSUPPORTED)).toEqual(expect.arrayContaining(["LET", "LAMBDA", "FILTERXML"]));
  });
});

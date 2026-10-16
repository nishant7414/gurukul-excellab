import { describe, expect, it } from "vitest";
import { applyTextToColumns, autoFillRange, copyRange, fillSeries, filterRows, flashFill, pasteClip, planTextToColumns, sortRange, splitText } from "./ops";
import { compute, emptyWorkbook } from "./workbook";
import { parseRangeStrict } from "./ops";

const wbWith = (cells: Record<string, string>) => {
  const wb = emptyWorkbook(["S"]);
  Object.assign(wb.sheets[0].cells, cells);
  return wb;
};

describe("Paste Special → Transpose", () => {
  it("turns rows into columns and keeps every value", () => {
    const wb = wbWith({ A1: "Roll", B1: "Name", C1: "Fee", A2: "1", B2: "om", C2: "100", A3: "2", B3: "raj", C3: "200" });
    const comp = compute(wb);
    const clip = copyRange(wb, comp, "S", parseRangeStrict("A1:C3"));
    pasteClip(wb.sheets[0], clip, 5, 1, "transpose"); // E1
    const c2 = compute(wb);
    expect(c2.matrix("S", "E1:G3")).toEqual([["Roll", 1, 2], ["Name", "om", "raj"], ["Fee", 100, 200]]);
  });
  it("pastes formula results as values in transpose mode", () => {
    const wb = wbWith({ A1: "5", A2: "=A1*2" });
    const clip = copyRange(wb, compute(wb), "S", parseRangeStrict("A1:A2"));
    pasteClip(wb.sheets[0], clip, 3, 1, "transpose");
    expect(wb.sheets[0].cells.D1).toBe("10");
  });
  it("normal paste shifts relative formula references", () => {
    const wb = wbWith({ A1: "1", B1: "=A1+1" });
    const clip = copyRange(wb, compute(wb), "S", parseRangeStrict("B1"));
    pasteClip(wb.sheets[0], clip, 2, 5, "all"); // B5
    expect(wb.sheets[0].cells.B5).toBe("=A5+1");
  });
});

describe("Text to Columns", () => {
  it("splits on commas and keeps leading spaces", () => {
    expect(splitText("John, Smith, New York", { delimiters: [","], treatConsecutiveAsOne: false, qualifier: "" })).toEqual(["John", " Smith", " New York"]);
  });
  it("comma + space with consecutive-as-one removes the leading spaces but also splits city names", () => {
    expect(splitText("Bob, Brown, San Francisco", { delimiters: [",", " "], treatConsecutiveAsOne: true, qualifier: "" })).toEqual(["Bob", "Brown", "San", "Francisco"]);
  });
  it("honours text qualifiers", () => {
    expect(splitText('a,"b,c",d', { delimiters: [","], treatConsecutiveAsOne: false, qualifier: '"' })).toEqual(["a", "b,c", "d"]);
  });
  it("plans, detects conflicts and applies", () => {
    const wb = wbWith({ A1: "x,y", A2: "p,q", C1: "occupied" });
    const comp = compute(wb);
    const plan = planTextToColumns(wb.sheets[0], comp, "S", parseRangeStrict("A1:A2"), "C1", { delimiters: [","], treatConsecutiveAsOne: false, qualifier: "" });
    expect(plan.conflicts).toEqual(["C1"]);
    delete wb.sheets[0].cells.C1;
    applyTextToColumns(wb.sheets[0], plan);
    expect(compute(wb).matrix("S", "C1:D2")).toEqual([["x", "y"], ["p", "q"]]);
  });
  it("numbers produced by splitting become numbers", () => {
    const wb = wbWith({ A1: "a,12" });
    const plan = planTextToColumns(wb.sheets[0], compute(wb), "S", parseRangeStrict("A1"), "C1", { delimiters: [","], treatConsecutiveAsOne: false, qualifier: "" });
    applyTextToColumns(wb.sheets[0], plan);
    expect(compute(wb).value("S", "D1")).toBe(12);
  });
});

describe("AutoFill", () => {
  it("extends a single date by one day", () => {
    expect(fillSeries([{ raw: "44969", fmt: { nf: "date" } }], 3).raws).toEqual(["44970", "44971", "44972"]);
  });
  it("copies a single plain number", () => {
    expect(fillSeries([{ raw: "5" }], 3).raws).toEqual(["5", "5", "5"]);
  });
  it("continues a two-number linear series", () => {
    expect(fillSeries([{ raw: "1" }, { raw: "3" }], 3).raws).toEqual(["5", "7", "9"]);
  });
  it("continues days and months, and cycles", () => {
    expect(fillSeries([{ raw: "Mon" }], 3).raws).toEqual(["Tue", "Wed", "Thu"]);
    expect(fillSeries([{ raw: "Nov" }, { raw: "Dec" }], 2).raws).toEqual(["Jan", "Feb"]);
    expect(fillSeries([{ raw: "January" }], 2).raws).toEqual(["February", "March"]);
  });
  it("increments text ending in a number", () => {
    expect(fillSeries([{ raw: "Item1" }], 2).raws).toEqual(["Item2", "Item3"]);
    expect(fillSeries([{ raw: "A001" }], 2).raws).toEqual(["A002", "A003"]);
  });
  it("fills upward in reverse", () => {
    expect(fillSeries([{ raw: "5" }, { raw: "6" }], 2, true).raws).toEqual(["4", "3"]);
  });
  it("fill-down shifts relative refs but keeps absolute refs", () => {
    const wb = wbWith({ A1: "1", A2: "2", A3: "3", B1: "=A1*$D$1", D1: "10" });
    autoFillRange(wb.sheets[0], parseRangeStrict("B1"), { r2: 3 });
    expect(wb.sheets[0].cells.B3).toBe("=A3*$D$1");
    expect(compute(wb).matrix("S", "B1:B3")).toEqual([[10], [20], [30]]);
  });
  it("fills right", () => {
    const wb = wbWith({ A1: "Jan" });
    autoFillRange(wb.sheets[0], parseRangeStrict("A1"), { c2: 3 });
    expect(compute(wb).matrix("S", "A1:C1")).toEqual([["Jan", "Feb", "Mar"]]);
  });
});

describe("Flash Fill (simulation)", () => {
  it("splits first names from an example", () => {
    const wb = wbWith({ A1: "John Smith", A2: "Sarah Connor", A3: "Michael Jordan", B1: "John" });
    const r = flashFill(wb.sheets[0], compute(wb), "S", 2, [1], 1, 3);
    expect("filled" in r && r.filled).toEqual({ B2: "Sarah", B3: "Michael" });
  });
  it("combines two columns using the separator in the example", () => {
    const wb = wbWith({ A1: "Alice", B1: "Johnson", A2: "Bob", B2: "Smith", C1: "Alice Johnson" });
    const r = flashFill(wb.sheets[0], compute(wb), "S", 3, [1, 2], 1, 2);
    expect("filled" in r && r.filled).toEqual({ C2: "Bob Smith" });
  });
  it("extracts email domains", () => {
    const wb = wbWith({ A1: "john@example.com", A2: "sarah@company.org", B1: "example.com" });
    const r = flashFill(wb.sheets[0], compute(wb), "S", 2, [1], 1, 2);
    expect("filled" in r && r.filled).toEqual({ B2: "company.org" });
  });
  it("extracts years from dates", () => {
    const wb = wbWith({ A1: "45047", A2: "44420", B1: "2023" });
    const r = flashFill(wb.sheets[0], compute(wb), "S", 2, [1], 1, 2);
    expect("filled" in r && r.filled).toEqual({ B2: "2021" });
  });
  it("asks for an example when there is none and admits when no pattern is found", () => {
    const wb = wbWith({ A1: "John Smith", A2: "Sarah Connor" });
    const none = flashFill(wb.sheets[0], compute(wb), "S", 2, [1], 1, 2);
    expect("error" in none && none.error).toMatch(/at least one example/);
    wb.sheets[0].cells.B1 = "zzz-unrelated";
    const bad = flashFill(wb.sheets[0], compute(wb), "S", 2, [1], 1, 2);
    expect("error" in bad && bad.error).toMatch(/could not recognise/);
  });
});

describe("Sort and filter", () => {
  const base = () => wbWith({ A1: "Name", B1: "Fee", C1: "Bal", A2: "c", B2: "30", C2: "=B2-1", A3: "a", B3: "10", C3: "=B3-1", A4: "b", B4: "20", C4: "=B4-1" });
  it("sorts ascending by a column, moving whole rows and keeping formulas row-consistent", () => {
    const wb = base();
    sortRange(wb.sheets[0], compute(wb), "S", parseRangeStrict("A1:C4"), 2, false, true);
    const c = compute(wb);
    expect(c.matrix("S", "A2:C4")).toEqual([["a", 10, 9], ["b", 20, 19], ["c", 30, 29]]);
  });
  it("sorts descending", () => {
    const wb = base();
    sortRange(wb.sheets[0], compute(wb), "S", parseRangeStrict("A1:C4"), 1, true, true);
    expect(compute(wb).matrix("S", "A2:A4")).toEqual([["c"], ["b"], ["a"]]);
  });
  it("filters rows and hides the rest", () => {
    const wb = base();
    filterRows(wb.sheets[0], compute(wb), "S", parseRangeStrict("A1:C4"), 2, ">", "15", true);
    expect(wb.sheets[0].hiddenRows).toEqual([3]);
    filterRows(wb.sheets[0], compute(wb), "S", parseRangeStrict("A1:C4"), 1, "contains", "c", true);
    expect(wb.sheets[0].hiddenRows).toEqual([3, 4]);
  });
});

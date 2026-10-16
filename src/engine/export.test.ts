import { describe, expect, it } from "vitest";
import { emptyWorkbook, compute } from "./workbook";
import { exportWorkbook } from "./export";
import { importWorkbook } from "./import";

describe("exportWorkbook", () => {
  it("writes formulas as formulas and they calculate after a round-trip import", async () => {
    const wb = emptyWorkbook(["Sales", "Notes"]);
    wb.sheets[0].cells = { A1: "10", A2: "20", A3: "=SUM(A1:A2)", B1: "'007" };
    wb.sheets[1].cells = { A1: "keep" };
    const { blob, fileName, report } = exportWorkbook(wb, "xlsx");
    expect(fileName).toMatch(/\.xlsx$/);
    expect(report.sheets).toBe(2);
    expect(report.formulas).toBe(1);
    expect(report.functionsSupported).toEqual(["SUM"]);
    const buf = await blob.arrayBuffer();
    const res = importWorkbook(buf, fileName, buf.byteLength);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.workbook.sheets.map((s) => s.name)).toEqual(["Sales", "Notes"]);
    expect(res.workbook.sheets[0].cells.A3).toBe("=SUM(A1:A2)");
    expect(res.workbook.sheets[0].cells.B1).toBe("'007");
    expect(compute(res.workbook).value("Sales", "A3")).toBe(30);
  });

  it("reports that CSV keeps only the first sheet and drops formulas", () => {
    const wb = emptyWorkbook(["A", "B"]);
    wb.sheets[0].cells = { A1: "1", A2: "=A1+1" };
    const { report } = exportWorkbook(wb, "csv");
    expect(report.kind).toBe("csv");
    expect(report.sheets).toBe(1);
    expect(report.formulas).toBe(0);
    expect(report.warnings.some((w) => /first worksheet/i.test(w))).toBe(true);
  });

  it("warns that charts, pivots and ribbon extras are not written", () => {
    const wb = emptyWorkbook(["S"]);
    wb.sheets[0].cells = { A1: "1" };
    const { report } = exportWorkbook(wb, "xlsx");
    expect(report.warnings.some((w) => /PivotTables/i.test(w))).toBe(true);
  });
});

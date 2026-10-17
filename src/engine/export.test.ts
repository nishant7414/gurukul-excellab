import { describe, expect, it } from "vitest";
import { emptyWorkbook, compute } from "./workbook";
import { exportWorkbook, isXlsxZip, workbookFileName } from "./export";
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

  it("writes a genuine xlsx ZIP with a challenge filename and notes sheet", async () => {
    const wb = emptyWorkbook(["Sales"]);
    wb.sheets[0].cells = { A1: "10", A2: "=A1*2" };
    wb.sheets[0].formats.A1 = { nf: "number" };
    const { blob, fileName, report } = exportWorkbook(wb, {
      kind: "xlsx",
      title: "North region totals",
      exerciseId: "EX-VL-1-1",
      objective: "Total the units.",
      instructions: ["Enter SUM in B2."],
      includeInstructionsSheet: true,
    });
    expect(fileName).toBe(workbookFileName({ title: "North region totals", exerciseId: "EX-VL-1-1" }));
    expect(fileName).toMatch(/gurukul-excellab-ex-vl-1-1-north-region-totals\.xlsx/);
    const buf = await blob.arrayBuffer();
    expect(isXlsxZip(buf)).toBe(true);
    expect(report.sheets).toBe(2);
    const res = importWorkbook(buf, fileName, buf.byteLength);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.workbook.sheets.map((s) => s.name)).toEqual(["Sales", "Challenge notes"]);
    expect(res.workbook.sheets[0].cells.A2).toBe("=A1*2");
    expect(compute(res.workbook).value("Sales", "A2")).toBe(20);
    expect(res.workbook.sheets[1].cells.A1).toMatch(/North region totals/);
  });

  it("does not treat a CSV download as an xlsx workbook", async () => {
    const wb = emptyWorkbook(["S"]);
    wb.sheets[0].cells = { A1: "1" };
    const { blob, fileName } = exportWorkbook(wb, "csv");
    expect(fileName).toMatch(/\.csv$/);
    expect(isXlsxZip(await blob.arrayBuffer())).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { importWorkbook } from "./import";
import { compute } from "./workbook";

function xlsxBuffer(build: (wb: XLSX.WorkBook) => void): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  build(wb);
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return out;
}

describe("importWorkbook", () => {
  it("imports values, formulas and sheets from an .xlsx and the formulas calculate", () => {
    const buf = xlsxBuffer((wb) => {
      const ws = XLSX.utils.aoa_to_sheet([["Item", "Qty", "Price", "Total"], ["Pen", 2, 1.5], ["Book", 3, 4]]);
      ws.D2 = { t: "n", f: "B2*C2", v: 3 }; ws.D3 = { t: "n", f: "B3*C3", v: 12 }; ws["!ref"] = "A1:D3";
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"]]), "Other");
    });
    const res = importWorkbook(buf, "t.xlsx", buf.byteLength);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.report.sheets.map((s) => s.name)).toEqual(["Data", "Other"]);
    expect(res.report.sheets[0].formulas).toBe(2);
    expect(res.workbook.sheets[0].cells.D2).toBe("=B2*C2");
    expect(compute(res.workbook).value("Data", "D3")).toBe(12);
  });
  it("reports supported and unsupported functions and never invents values for the latter", () => {
    const buf = xlsxBuffer((wb) => { const ws = XLSX.utils.aoa_to_sheet([[1]]); ws.B1 = { t: "n", f: "SUM(A1:A1)", v: 1 }; ws.C1 = { t: "s", f: 'FILTERXML("<a/>","//a")', v: "" }; ws["!ref"] = "A1:C1"; XLSX.utils.book_append_sheet(wb, ws, "S"); });
    const res = importWorkbook(buf, "f.xlsx", buf.byteLength);
    expect(res.ok && res.report.functionsSupported).toEqual(["SUM"]);
    expect(res.ok && res.report.functionsUnsupported.map((f) => f.name)).toEqual(["FILTERXML"]);
    if (res.ok) {
      const v = compute(res.workbook).value("S", "C1");
      expect(String((v as { code?: string }).code)).toBe("#UNSUPPORTED!");
    }
  });
  it("detects text dates and stray spaces", () => {
    const buf = xlsxBuffer((wb) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["01/15/2023"], ["  padded "], ["2024-02-30"]]), "S"));
    const res = importWorkbook(buf, "d.xlsx", buf.byteLength);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.report.textDateCount).toBe(1);
      expect(res.report.cellsWithEdgeSpaces).toBe(1);
    }
  });
  it("imports csv", () => {
    const text = "a,b\n1,2\n3,4\n";
    const res = importWorkbook(text, "x.csv", text.length);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.workbook.sheets[0].cells.A2).toBe("1");
      expect(res.report.kind).toBe("csv");
    }
  });
  it("rejects macro-enabled, legacy and unknown files, and oversized files", () => {
    for (const n of ["m.xlsm", "m.xlsb", "old.xls", "a.pdf", "noext"]) expect(importWorkbook(new ArrayBuffer(8), n, 8).ok).toBe(false);
    const big = importWorkbook(new ArrayBuffer(8), "big.xlsx", 6 * 1024 * 1024);
    expect(!big.ok && big.error).toMatch(/limit/);
  });
  it("rejects a damaged file with a readable message", () => {
    const res = importWorkbook(new TextEncoder().encode("not a zip").buffer as ArrayBuffer, "bad.xlsx", 9);
    expect(res.ok).toBe(false);
  });
  it("rejects an empty workbook", () => {
    const res = importWorkbook("", "e.csv", 0);
    expect(res.ok).toBe(false);
  });
});

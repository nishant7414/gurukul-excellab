import { describe, expect, it } from "vitest";
import { emptyWorkbook } from "../../engine/workbook";
import { fromUniverSnapshot, isEditable, makeEditGuard, toUniverSnapshot } from "./adapter";

describe("Univer workbook adapter", () => {
  it("round-trips formulas, numbers, and text without inventing values", () => {
    const wb = emptyWorkbook(["Data"]);
    wb.sheets[0].cells = { A1: "10", B1: "20", C1: "=A1+B1", D1: "'007", E1: "North" };
    wb.sheets[0].formats.C1 = { bold: true, nf: "number" };
    const snap = toUniverSnapshot(wb, makeEditGuard());
    const sheet = snap.sheets[snap.sheetOrder[0]];
    expect(sheet.cellData[0][0].v).toBe(10);
    expect(sheet.cellData[0][2].f).toBe("=A1+B1");
    expect(sheet.cellData[0][2].v).toBe(30);
    expect(sheet.cellData[0][3].t).toBe(4);

    const back = fromUniverSnapshot(snap);
    expect(back.sheets[0].cells).toMatchObject({ A1: "10", B1: "20", C1: "=A1+B1", D1: "'007", E1: "North" });
    expect(back.sheets[0].formats.C1?.bold).toBe(true);
    expect(back.sheets[0].formats.C1?.nf).toBe("number");
  });

  it("restores locked cells if the snapshot tries to change them", () => {
    const wb = emptyWorkbook(["Lookup"]);
    wb.sheets[0].cells = { B3: "Turbo T-Shirt", K3: "" };
    const guard = makeEditGuard(["K3:K3"], "Lookup");
    expect(isEditable(guard, "Lookup", "K3")).toBe(true);
    expect(isEditable(guard, "Lookup", "B3")).toBe(false);

    const snap = toUniverSnapshot(wb, guard);
    snap.sheets[snap.sheetOrder[0]].cellData[2][1] = { v: "hacked", t: 1 };
    snap.sheets[snap.sheetOrder[0]].cellData[2][10] = { f: "=VLOOKUP(J3,$B$3:$F$62,2,FALSE)" };
    const back = fromUniverSnapshot(snap, wb, guard);
    expect(back.sheets[0].cells.B3).toBe("Turbo T-Shirt");
    expect(back.sheets[0].cells.K3).toBe("=VLOOKUP(J3,$B$3:$F$62,2,FALSE)");
  });

  it("keeps Univer extras (notes, validation, filters) on the workbook", () => {
    const wb = emptyWorkbook(["Data"]);
    wb.extras = { SHEET_NOTE_PLUGIN: { "sheet-0": {} } };
    const snap = toUniverSnapshot(wb, makeEditGuard());
    expect(snap.resources).toEqual(wb.extras);
    const back = fromUniverSnapshot({ ...snap, resources: { SHEET_FILTER_PLUGIN: { ok: true } } });
    expect(back.extras).toEqual({ SHEET_FILTER_PLUGIN: { ok: true } });
  });
});


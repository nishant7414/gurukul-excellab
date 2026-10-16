// Deterministic extraction of the instructor workbook into src/data/sourceInventory.generated.json
// Usage: node scripts/extract-source.mjs "<path to Data Entry.xlsx>"
// Privacy: any value that is a run of >= 9 digits (e.g. an Aadhar number) is replaced with a masked,
// synthetic placeholder BEFORE it is written anywhere. The original value is never persisted.
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/extract-source.mjs <xlsx>");
  process.exit(1);
}
const buf = fs.readFileSync(file);
const wb = XLSX.read(buf, { cellFormula: true, cellDates: false });
const MASK = "XXXX-XXXX-XXXX";
let maskedCount = 0;
const sheets = wb.SheetNames.map((name, i) => {
  const ws = wb.Sheets[name];
  const cells = [];
  for (const a of Object.keys(ws).filter((k) => !k.startsWith("!"))) {
    const c = ws[a];
    let v = c.v;
    let masked = false;
    if ((typeof v === "number" || typeof v === "string") && /^\d{9,}$/.test(String(v).replace(/\s/g, ""))) {
      v = MASK;
      masked = true;
      maskedCount++;
    }
    const cell = { a, t: masked ? "s" : c.t, v };
    if (c.f) cell.f = c.f;
    if (c.z && c.z !== "General") cell.nf = c.z;
    if (masked) cell.masked = true;
    cells.push(cell);
  }
  // sort row-major
  const dec = (a) => {
    const m = /^([A-Z]+)(\d+)$/.exec(a);
    let col = 0;
    for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
    return [Number(m[2]), col];
  };
  cells.sort((x, y) => {
    const [r1, c1] = dec(x.a);
    const [r2, c2] = dec(y.a);
    return r1 - r2 || c1 - c2;
  });
  return { id: `SHEET-${i + 1}`, index: i, name, ref: ws["!ref"] ?? null, empty: cells.length === 0, cells };
});

const out = {
  workbookId: "WB-DATA-ENTRY",
  fileNameInspected: path.basename(file),
  fileNameExpectedBySpec: "Data Entry(1).xlsx",
  fileBytes: buf.length,
  // hash lets a reviewer confirm which exact file was inspected without storing its contents
  sha256: crypto.createHash("sha256").update(buf).digest("hex"),
  sheetNames: wb.SheetNames,
  maskedCellCount: maskedCount,
  sheets,
};
const dest = path.resolve("src/data/sourceInventory.generated.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
console.log("Wrote", dest, "sheets:", sheets.map((s) => `${JSON.stringify(s.name)}(${s.cells.length})`).join(", "), "masked:", maskedCount);

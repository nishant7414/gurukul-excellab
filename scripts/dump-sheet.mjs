// Developer helper: print a source sheet's cells as "addr = value  [formula]" (masked inventory only).
import { readFileSync } from "node:fs";
const inv = JSON.parse(readFileSync(new URL("../src/data/sourceInventory.generated.json", import.meta.url), "utf8"));
const name = process.argv[2];
const sh = inv.sheets.find((s) => s.name === name);
if (!sh) { console.log("no sheet", name); process.exit(1); }
for (const c of sh.cells) console.log(`${c.a} = ${JSON.stringify(c.v)}${c.f ? "   [=" + c.f + "]" : ""}${c.nf ? "  nf:" + c.nf : ""}`);

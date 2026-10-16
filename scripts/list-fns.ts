import "../src/engine/workbook";
import { FUNCS, UNSUPPORTED } from "../src/engine/core";

const by: Record<string, string[]> = {};
for (const f of FUNCS.values()) (by[f.category] ??= []).push(f.name);
for (const [k, v] of Object.entries(by)) console.log(`${k} (${v.length}): ${v.sort().join(" ")}`);
console.log(`total ${FUNCS.size}; unsupported: ${Object.keys(UNSUPPORTED).join(" ")}`);

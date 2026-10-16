import { asMatrix, collapse, compareValues, dims, flat, reg, toBool, toNum, unwrap } from "./core";
import { XlError, isErr, type Matrix, type Scalar, type Value } from "./types";

const cat = "Dynamic arrays" as const;
const transposeM = (m: Matrix): Matrix => (m.length ? m[0].map((_, c) => m.map((r) => r[c])) : m);

reg({ name: "TRANSPOSE", min: 1, max: 1, category: cat, impl: ([a]) => collapse(transposeM(asMatrix(a))) });
reg({
  name: "SEQUENCE", min: 1, max: 4, category: cat,
  impl: (a) => {
    const rows = Math.trunc(toNum(a[0]));
    const cols = a[1] === undefined || a[1] === null ? 1 : Math.trunc(toNum(a[1]));
    const start = a[2] === undefined || a[2] === null ? 1 : toNum(a[2]);
    const step = a[3] === undefined || a[3] === null ? 1 : toNum(a[3]);
    if (rows < 1 || cols < 1) throw new XlError("#VALUE!", "SEQUENCE needs at least 1 row and 1 column.");
    if (rows * cols > 100000) throw new XlError("#NUM!", "SEQUENCE is limited to 100,000 cells in Gurukul ExcelLab.");
    const out: Matrix = [];
    for (let r = 0; r < rows; r++) out.push(Array.from({ length: cols }, (_, c) => start + (r * cols + c) * step));
    return collapse(out);
  },
});
reg({
  name: "FILTER", min: 2, max: 3, category: cat,
  impl: ([arr, inc, ifEmpty]) => {
    const m = asMatrix(arr);
    const i = asMatrix(inc);
    const d = dims(m), di = dims(i);
    let out: Matrix;
    if (di.cols === 1 && di.rows === d.rows) {
      out = m.filter((_, r) => {
        const v = i[r][0];
        if (isErr(v)) throw v;
        return typeof v === "number" ? v !== 0 : toBool(v);
      });
    } else if (di.rows === 1 && di.cols === d.cols) {
      const keep = i[0].map((v) => (typeof v === "number" ? v !== 0 : toBool(v)));
      out = m.map((row) => row.filter((_, c) => keep[c]));
      if (out[0]?.length === 0) out = [];
    } else throw new XlError("#VALUE!", "FILTER's include array must have the same number of rows (or columns) as the array.");
    if (!out.length) {
      if (ifEmpty !== undefined && ifEmpty !== null) return ifEmpty;
      throw new XlError("#CALC!", "FILTER found no rows that meet the condition. Supply the if_empty argument to show a friendly message.");
    }
    return collapse(out);
  },
});
function cmp(a: Scalar, b: Scalar, desc: boolean): number {
  const blankA = a === null, blankB = b === null;
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  const c = compareValues(a, b);
  return desc ? -c : c;
}
reg({
  name: "SORT", min: 1, max: 4, category: cat,
  impl: ([arr, idx, ord, byCol]) => {
    let m = asMatrix(arr);
    const bc = byCol !== undefined && byCol !== null && toBool(byCol);
    const k = idx === undefined || idx === null ? 1 : Math.trunc(toNum(idx));
    const desc = ord !== undefined && ord !== null && toNum(ord) === -1;
    if (bc) m = transposeM(m);
    if (k < 1 || k > dims(m).cols) throw new XlError("#VALUE!", "SORT's sort_index is outside the array.");
    const sorted = m.map((r, i) => ({ r, i })).sort((x, y) => cmp(x.r[k - 1], y.r[k - 1], desc) || x.i - y.i).map((x) => x.r);
    return collapse(bc ? transposeM(sorted) : sorted);
  },
});
reg({
  name: "SORTBY", min: 2, max: Infinity, category: cat,
  impl: (a) => {
    const m = asMatrix(a[0]);
    const keys: { vals: Scalar[]; desc: boolean }[] = [];
    for (let i = 1; i < a.length; i += 2) {
      const vals = flat(a[i]);
      if (vals.length !== m.length) throw new XlError("#VALUE!", "Each SORTBY key must have one value per row of the array.");
      const o = a[i + 1];
      keys.push({ vals, desc: o !== undefined && o !== null && toNum(o) === -1 });
    }
    const order = m.map((_, i) => i).sort((x, y) => {
      for (const k of keys) {
        const c = cmp(k.vals[x], k.vals[y], k.desc);
        if (c) return c;
      }
      return x - y;
    });
    return collapse(order.map((i) => m[i]));
  },
});
reg({
  name: "UNIQUE", min: 1, max: 3, category: cat,
  impl: ([arr, byCol, once]) => {
    let m = asMatrix(arr);
    const bc = byCol !== undefined && byCol !== null && toBool(byCol);
    const ex = once !== undefined && once !== null && toBool(once);
    if (bc) m = transposeM(m);
    const key = (r: Scalar[]) => JSON.stringify(r.map((v) => (typeof v === "string" ? v.toLowerCase() : isErr(v) ? v.code : v)));
    const counts = new Map<string, number>();
    m.forEach((r) => counts.set(key(r), (counts.get(key(r)) ?? 0) + 1));
    const seen = new Set<string>();
    const out: Matrix = [];
    for (const r of m) {
      const k = key(r);
      if (ex ? counts.get(k) === 1 : !seen.has(k)) out.push(r);
      seen.add(k);
    }
    if (!out.length) throw new XlError("#CALC!", "UNIQUE found no values that match the options.");
    return collapse(bc ? transposeM(out) : out);
  },
});
function toVector(row: boolean) {
  return ([arr, ign, byCol]: Value[]): Value => {
    const m = asMatrix(arr);
    const ignore = ign === undefined || ign === null ? 0 : Math.trunc(toNum(ign));
    const bc = byCol !== undefined && byCol !== null && toBool(byCol);
    const src = bc ? transposeM(m) : m;
    let vals = src.flat();
    if (ignore === 1 || ignore === 3) vals = vals.filter((v) => v !== null);
    if (ignore === 2 || ignore === 3) vals = vals.filter((v) => !isErr(v));
    if (!vals.length) throw new XlError("#CALC!", "No values remain after ignoring blanks/errors.");
    return collapse(row ? [vals] : vals.map((v) => [v]));
  };
}
reg({ name: "TOCOL", min: 1, max: 3, category: cat, impl: toVector(false) });
reg({ name: "TOROW", min: 1, max: 3, category: cat, impl: toVector(true) });
reg({
  name: "TAKE", min: 2, max: 3, category: cat,
  impl: ([arr, r, c]) => {
    const m = asMatrix(arr);
    const d = dims(m);
    const rows = Math.trunc(toNum(r));
    let out = rows >= 0 ? m.slice(0, rows) : m.slice(Math.max(0, d.rows + rows));
    if (c !== undefined && c !== null) {
      const cols = Math.trunc(toNum(c));
      out = out.map((row) => (cols >= 0 ? row.slice(0, cols) : row.slice(Math.max(0, d.cols + cols))));
    }
    if (!out.length || !out[0].length) throw new XlError("#CALC!");
    return collapse(out);
  },
});
reg({
  name: "DROP", min: 2, max: 3, category: cat,
  impl: ([arr, r, c]) => {
    const m = asMatrix(arr);
    const d = dims(m);
    const rows = Math.trunc(toNum(r));
    let out = rows >= 0 ? m.slice(rows) : m.slice(0, Math.max(0, d.rows + rows));
    if (c !== undefined && c !== null) {
      const cols = Math.trunc(toNum(c));
      out = out.map((row) => (cols >= 0 ? row.slice(cols) : row.slice(0, Math.max(0, d.cols + cols))));
    }
    if (!out.length || !out[0].length) throw new XlError("#CALC!");
    return collapse(out);
  },
});
void unwrap;

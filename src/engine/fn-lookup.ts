import { asMatrix, collapse, compareValues, dims, flat, reg, toBool, toNum, unwrap } from "./core";
import { XlError, isErr, isMatrix, type Matrix, type Scalar, type Value } from "./types";
import { wildcardRegex } from "./fn-text";

const cat = "Lookup and reference" as const;

const typeRank = (v: Scalar) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : typeof v === "boolean" ? 2 : 3);

function exactEq(a: Scalar, b: Scalar): boolean {
  if (isErr(a) || isErr(b)) return false;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "string") return a.toLowerCase() === (b as string).toLowerCase();
  return a === b;
}

function hasWildcard(s: Scalar) {
  return typeof s === "string" && /[*?~]/.test(s);
}

/** index of first (or last) exact match, optionally with wildcards */
function findExact(keys: Scalar[], look: Scalar, wildcard: boolean, fromEnd = false): number {
  const order = keys.map((_, i) => i);
  if (fromEnd) order.reverse();
  if (wildcard && hasWildcard(look)) {
    const re = new RegExp(`^(?:${wildcardRegex(look as string, "i").source})$`, "i");
    for (const i of order) if (typeof keys[i] === "string" && re.test(keys[i] as string)) return i;
    return -1;
  }
  for (const i of order) if (exactEq(keys[i], look)) return i;
  return -1;
}

/** Excel-style binary search for approximate match: last position whose key <= look (ascending data assumed). */
function approxAsc(keys: Scalar[], look: Scalar): number {
  const idx = keys.map((_, i) => i).filter((i) => typeRank(keys[i]) === typeRank(look) && keys[i] !== null);
  let lo = 0, hi = idx.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (compareValues(keys[idx[mid]], look) <= 0) {
      found = idx[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}
function approxDesc(keys: Scalar[], look: Scalar): number {
  const idx = keys.map((_, i) => i).filter((i) => typeRank(keys[i]) === typeRank(look) && keys[i] !== null);
  let lo = 0, hi = idx.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (compareValues(keys[idx[mid]], look) >= 0) {
      found = idx[mid];
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

const NA = (msg: string) => new XlError("#N/A", msg);

reg({
  name: "VLOOKUP", min: 3, max: 4, category: cat, lift: [0],
  impl: ([look, table, col, approx]) => {
    const t = asMatrix(table);
    const ci = Math.trunc(toNum(col));
    const exact = approx !== undefined && approx !== null && !toBool(approx);
    if (ci < 1) throw new XlError("#VALUE!", "VLOOKUP's col_index_num must be 1 or greater.");
    if (ci > dims(t).cols) throw new XlError("#REF!", `col_index_num is ${ci} but the table_array has only ${dims(t).cols} column(s).`);
    const keys = t.map((r) => r[0]);
    const l = unwrap(look);
    if (isErr(l)) throw l;
    const i = exact ? findExact(keys, l, true) : approxAsc(keys, l);
    if (i < 0) throw NA(exact ? `VLOOKUP could not find "${String(l)}" in the first column of the table (exact match).` : `"${String(l)}" is smaller than every value in the first column.`);
    return t[i][ci - 1];
  },
});
reg({
  name: "HLOOKUP", min: 3, max: 4, category: cat, lift: [0],
  impl: ([look, table, row, approx]) => {
    const t = asMatrix(table);
    const ri = Math.trunc(toNum(row));
    const exact = approx !== undefined && approx !== null && !toBool(approx);
    if (ri < 1) throw new XlError("#VALUE!", "HLOOKUP's row_index_num must be 1 or greater.");
    if (ri > t.length) throw new XlError("#REF!", `row_index_num is ${ri} but the table_array has only ${t.length} row(s).`);
    const keys = t[0];
    const l = unwrap(look);
    if (isErr(l)) throw l;
    const i = exact ? findExact(keys, l, true) : approxAsc(keys, l);
    if (i < 0) throw NA(`HLOOKUP found no match for "${String(l)}" in the first row.`);
    return t[ri - 1][i];
  },
});
reg({
  name: "MATCH", min: 2, max: 3, category: cat, lift: [0],
  impl: ([look, arr, type]) => {
    const keys = flat(arr);
    const mt = type === undefined || type === null ? 1 : Math.trunc(toNum(type));
    const l = unwrap(look);
    if (isErr(l)) throw l;
    const i = mt === 0 ? findExact(keys, l, true) : mt > 0 ? approxAsc(keys, l) : approxDesc(keys, l);
    if (i < 0) throw NA(`MATCH could not find "${String(l)}" in the lookup array.`);
    return i + 1;
  },
});
reg({
  name: "INDEX", min: 2, max: 4, category: cat,
  impl: ([arr, row, col]) => {
    const m = asMatrix(arr);
    const d = dims(m);
    let r = row === null || row === undefined ? 0 : Math.trunc(toNum(row));
    let c = col === null || col === undefined ? 0 : Math.trunc(toNum(col));
    if (col === undefined && d.rows === 1) {
      c = r;
      r = 1;
    } else if (col === undefined && d.cols === 1) {
      c = 1;
    }
    if (r < 0 || c < 0 || r > d.rows || c > d.cols) throw new XlError("#REF!", `INDEX position (${r}, ${c}) is outside the ${d.rows}×${d.cols} array.`);
    if (r === 0 && c === 0) return m;
    if (r === 0) return collapse(m.map((x) => [x[c - 1]]));
    if (c === 0) return collapse([m[r - 1]]);
    return m[r - 1][c - 1];
  },
});
reg({
  name: "CHOOSE", min: 2, max: Infinity, category: cat, lift: [0],
  impl: (a) => {
    const i = Math.trunc(toNum(a[0]));
    if (i < 1 || i >= a.length) throw new XlError("#VALUE!", "CHOOSE's index_num is out of range.");
    return a[i];
  },
});
reg({
  name: "XLOOKUP", min: 3, max: 6, category: cat, lift: [0],
  impl: (a) => {
    const [look, larr, rarr] = a;
    const hasNF = a.length > 3 && a[3] !== null;
    const mm = a.length > 4 && a[4] !== null ? Math.trunc(toNum(a[4])) : 0;
    const sm = a.length > 5 && a[5] !== null ? Math.trunc(toNum(a[5])) : 1;
    const lm = asMatrix(larr);
    const rm = asMatrix(rarr);
    const ld = dims(lm);
    const vertical = ld.cols === 1 || ld.rows !== 1;
    if (ld.rows !== 1 && ld.cols !== 1) throw new XlError("#VALUE!", "XLOOKUP's lookup_array must be a single row or a single column.");
    const keys = flat(lm);
    const rd = dims(rm);
    if ((vertical ? rd.rows : rd.cols) !== keys.length) throw new XlError("#VALUE!", "XLOOKUP's return_array must have the same number of rows (or columns) as lookup_array.");
    const l = unwrap(look);
    if (isErr(l)) throw l;
    let i = -1;
    const fromEnd = sm === -1;
    if (mm === 0) i = findExact(keys, l, false, fromEnd);
    else if (mm === 2) i = findExact(keys, l, true, fromEnd);
    else {
      i = findExact(keys, l, false, fromEnd);
      if (i < 0) {
        // next smaller (-1) or next larger (1)
        let best = -1;
        keys.forEach((k, idx) => {
          if (typeRank(k) !== typeRank(l) || k === null) return;
          const c = compareValues(k, l);
          if (mm === -1 && c < 0 && (best < 0 || compareValues(k, keys[best]) > 0)) best = idx;
          if (mm === 1 && c > 0 && (best < 0 || compareValues(k, keys[best]) < 0)) best = idx;
        });
        i = best;
      }
    }
    if (i < 0) {
      if (hasNF) return a[3];
      throw NA(`XLOOKUP could not find "${String(l)}". Supply an if_not_found value to handle missing keys.`);
    }
    return collapse(vertical ? [rm[i]] : rm.map((r) => [r[i]]));
  },
});
export type { Matrix, Value };
export { isMatrix };

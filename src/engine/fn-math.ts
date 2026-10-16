import { asMatrix, dims, flat, reg, toBool, toNum, unwrap } from "./core";
import { XlError, isErr, isMatrix, type Scalar, type Value } from "./types";
import { compareValues } from "./core";

/** Collect numbers like SUM: direct args are coerced, range/array args contribute only real numbers. */
export function collectNums(args: Value[]): number[] {
  const out: number[] = [];
  for (const a of args) {
    if (isMatrix(a)) {
      for (const v of a.flat()) {
        if (isErr(v)) throw v;
        if (typeof v === "number") out.push(v);
      }
    } else {
      if (isErr(a)) throw a;
      if (a === null) continue;
      out.push(toNum(a));
    }
  }
  return out;
}

const cat = "Math and statistics" as const;

reg({ name: "SUM", min: 1, max: Infinity, category: cat, impl: (a) => collectNums(a).reduce((x, y) => x + y, 0) });
reg({
  name: "AVERAGE", min: 1, max: Infinity, category: cat,
  impl: (a) => {
    const n = collectNums(a);
    if (!n.length) throw new XlError("#DIV/0!", "AVERAGE found no numbers to average.");
    return n.reduce((x, y) => x + y, 0) / n.length;
  },
});
reg({ name: "MIN", min: 1, max: Infinity, category: cat, impl: (a) => { const n = collectNums(a); return n.length ? Math.min(...n) : 0; } });
reg({ name: "MAX", min: 1, max: Infinity, category: cat, impl: (a) => { const n = collectNums(a); return n.length ? Math.max(...n) : 0; } });
reg({
  name: "COUNT", min: 1, max: Infinity, category: cat,
  impl: (a) => {
    let c = 0;
    for (const x of a) {
      if (isMatrix(x)) c += x.flat().filter((v) => typeof v === "number").length;
      else if (typeof x === "number" || typeof x === "boolean") c++;
      else if (typeof x === "string") { try { toNum(x); c++; } catch { /* not numeric */ } }
    }
    return c;
  },
});
reg({
  name: "COUNTA", min: 1, max: Infinity, category: cat,
  impl: (a) => a.reduce<number>((c, x) => c + flat(x).filter((v) => v !== null).length, 0),
});
reg({
  name: "COUNTBLANK", min: 1, max: 1, category: cat,
  impl: (a) => flat(a[0]).filter((v) => v === null || v === "").length,
});

function pow10(n: number, d: number) {
  const s = String(n);
  if (s.includes("e")) return n * Math.pow(10, d);
  return Number(s + "e" + d);
}
function roundMode(n: number, d: number, mode: "half" | "up" | "down"): number {
  const neg = n < 0;
  const abs = Math.abs(n);
  const scaled = pow10(abs, d);
  let r: number;
  if (mode === "half") r = Math.round(scaled);
  else if (mode === "up") r = Math.ceil(scaled - 1e-9 * scaled);
  else r = Math.floor(scaled + 1e-9 * scaled);
  const back = String(r).includes("e") ? r / Math.pow(10, d) : Number(String(r) + "e" + -d);
  return neg ? -back : back;
}
for (const [name, mode] of [["ROUND", "half"], ["ROUNDUP", "up"], ["ROUNDDOWN", "down"]] as const) {
  reg({
    name, min: 2, max: 2, category: cat, lift: "all",
    impl: ([n, d]) => roundMode(toNum(n), Math.trunc(toNum(d)), mode),
  });
}
reg({ name: "ABS", min: 1, max: 1, category: cat, lift: "all", impl: ([n]) => Math.abs(toNum(n)) });
reg({ name: "INT", min: 1, max: 1, category: cat, lift: "all", impl: ([n]) => Math.floor(toNum(n)) });
reg({
  name: "MOD", min: 2, max: 2, category: cat, lift: "all",
  impl: ([n, d]) => {
    const dd = toNum(d);
    if (dd === 0) throw new XlError("#DIV/0!", "MOD cannot divide by zero.");
    const x = toNum(n);
    return x - dd * Math.floor(x / dd);
  },
});
reg({
  name: "SUMPRODUCT", min: 1, max: Infinity, category: cat,
  impl: (a) => {
    const ms = a.map(asMatrix);
    const d = dims(ms[0]);
    for (const m of ms) {
      const dm = dims(m);
      if (dm.rows !== d.rows || dm.cols !== d.cols) throw new XlError("#VALUE!", "SUMPRODUCT arrays must all have the same size.");
    }
    let total = 0;
    for (let r = 0; r < d.rows; r++)
      for (let c = 0; c < d.cols; c++) {
        let p = 1;
        for (const m of ms) {
          const v = m[r][c];
          if (isErr(v)) throw v;
          p *= typeof v === "number" ? v : typeof v === "boolean" ? 0 : 0;
        }
        total += p;
      }
    return total;
  },
});

/* ---------- logical ---------- */
const lg = "Logical" as const;
reg({
  name: "IF", min: 2, max: 3, category: lg, lazy: true,
  impl: (nodes, ctx) => {
    const cond = ctx.evalNode(nodes[0]);
    const pick = (b: boolean): Value => {
      const n = b ? nodes[1] : nodes[2];
      if (!n) return b ? true : false;
      if (n.t === "empty") return 0;
      return ctx.evalNode(n);
    };
    if (!isMatrix(cond)) return pick(toBool(cond));
    const t = ctx.evalNode(nodes[1]);
    const f = nodes[2] ? ctx.evalNode(nodes[2]) : false;
    return cond.map((row, r) =>
      row.map((c, ci) => {
        const pickFrom = toBoolSafe(c) ? t : f;
        if (isErr(c)) return c;
        return isMatrix(pickFrom) ? (pickFrom[Math.min(r, pickFrom.length - 1)]?.[Math.min(ci, pickFrom[0].length - 1)] ?? null) : pickFrom;
      }),
    );
  },
});
function toBoolSafe(v: Scalar): boolean {
  try { return toBool(v); } catch { return false; }
}
reg({
  name: "IFS", min: 2, max: Infinity, category: lg, lazy: true,
  impl: (nodes, ctx) => {
    if (nodes.length % 2) throw new XlError("#VALUE!", "IFS needs condition/value pairs.");
    for (let i = 0; i < nodes.length; i += 2) if (toBool(ctx.evalNode(nodes[i]))) return ctx.evalNode(nodes[i + 1]);
    throw new XlError("#N/A", "IFS found no condition that was TRUE.");
  },
});
reg({
  name: "IFERROR", min: 2, max: 2, category: lg, lazy: true,
  impl: (nodes, ctx) => {
    const v = ctx.evalNode(nodes[0]);
    if (isErr(v)) return ctx.evalNode(nodes[1]);
    if (isMatrix(v)) {
      const alt = ctx.evalNode(nodes[1]);
      return v.map((row) => row.map((x) => (isErr(x) ? unwrap(alt) : x)));
    }
    return v;
  },
});
reg({
  name: "IFNA", min: 2, max: 2, category: lg, lazy: true,
  impl: (nodes, ctx) => {
    const v = ctx.evalNode(nodes[0]);
    return isErr(v) && v.code === "#N/A" ? ctx.evalNode(nodes[1]) : v;
  },
});
reg({
  name: "SWITCH", min: 3, max: Infinity, category: lg, lazy: true,
  impl: (nodes, ctx) => {
    const v = unwrap(ctx.evalNode(nodes[0]));
    const rest = nodes.slice(1);
    const hasDefault = rest.length % 2 === 1;
    const pairs = hasDefault ? rest.length - 1 : rest.length;
    for (let i = 0; i < pairs; i += 2) {
      if (compareValues(v, unwrap(ctx.evalNode(rest[i]))) === 0) return ctx.evalNode(rest[i + 1]);
    }
    if (hasDefault) return ctx.evalNode(rest[rest.length - 1]);
    throw new XlError("#N/A", "SWITCH found no matching value and no default.");
  },
});
function logicalCollect(args: Value[]): boolean[] {
  const out: boolean[] = [];
  for (const a of args) {
    if (isMatrix(a)) {
      for (const v of a.flat()) {
        if (isErr(v)) throw v;
        if (typeof v === "boolean") out.push(v);
        else if (typeof v === "number") out.push(v !== 0);
      }
    } else out.push(toBool(a));
  }
  if (!out.length) throw new XlError("#VALUE!", "No logical values were found.");
  return out;
}
reg({ name: "AND", min: 1, max: Infinity, category: lg, impl: (a) => logicalCollect(a).every(Boolean) });
reg({ name: "OR", min: 1, max: Infinity, category: lg, impl: (a) => logicalCollect(a).some(Boolean) });
reg({ name: "NOT", min: 1, max: 1, category: lg, lift: "all", impl: ([a]) => !toBool(a) });

/* ---------- information ---------- */
const info = "Information and error handling" as const;
const testFn = (name: string, f: (v: Scalar) => boolean) =>
  reg({ name, min: 1, max: 1, category: info, lift: "all", impl: ([v]) => f(v as Scalar) });
testFn("ISNUMBER", (v) => typeof v === "number");
testFn("ISTEXT", (v) => typeof v === "string");
testFn("ISBLANK", (v) => v === null);
testFn("ISERROR", (v) => isErr(v));
testFn("ISNA", (v) => isErr(v) && v.code === "#N/A");

/* ---- additional statistics and arithmetic ---- */
reg({ name: "MEDIAN", min: 1, max: Infinity, category: cat, impl: (a) => {
  const n = collectNums(a).sort((x, y) => x - y);
  if (!n.length) throw new XlError("#NUM!", "MEDIAN found no numbers.");
  const m = Math.floor(n.length / 2);
  return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2;
} });
for (const [name, large] of [["LARGE", true], ["SMALL", false]] as const) {
  reg({ name, min: 2, max: 2, category: cat, impl: ([arr, k]) => {
    const n = collectNums([arr]).sort((x, y) => (large ? y - x : x - y));
    const i = Math.trunc(toNum(k));
    if (i < 1 || i > n.length) throw new XlError("#NUM!", `${name} needs k between 1 and the number of values (${n.length}).`);
    return n[i - 1];
  } });
}
reg({ name: "PRODUCT", min: 1, max: Infinity, category: cat, impl: (a) => collectNums(a).reduce((x, y) => x * y, 1) });
reg({ name: "SQRT", min: 1, max: 1, category: cat, lift: "all", impl: ([n]) => {
  const v = toNum(n);
  if (v < 0) throw new XlError("#NUM!", "SQRT cannot take the square root of a negative number.");
  return Math.sqrt(v);
} });
reg({ name: "POWER", min: 2, max: 2, category: cat, lift: "all", impl: ([b, e]) => Math.pow(toNum(b), toNum(e)) });

function stdev(nums: number[], sample: boolean): number {
  if (nums.length < (sample ? 2 : 1)) throw new XlError("#DIV/0!", sample ? "STDEV needs at least two numbers." : "STDEV.P needs at least one number.");
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const ss = nums.reduce((a, b) => a + (b - mean) ** 2, 0);
  return Math.sqrt(ss / (sample ? nums.length - 1 : nums.length));
}
function variance(nums: number[], sample: boolean): number {
  if (nums.length < (sample ? 2 : 1)) throw new XlError("#DIV/0!", "VAR needs enough numbers.");
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (sample ? nums.length - 1 : nums.length);
}
reg({ name: "STDEV", min: 1, max: Infinity, category: cat, impl: (a) => stdev(collectNums(a), true) });
reg({ name: "STDEVP", min: 1, max: Infinity, category: cat, impl: (a) => stdev(collectNums(a), false) });
reg({ name: "VAR", min: 1, max: Infinity, category: cat, impl: (a) => variance(collectNums(a), true) });
reg({ name: "VARP", min: 1, max: Infinity, category: cat, impl: (a) => variance(collectNums(a), false) });
reg({ name: "RANK", min: 2, max: 3, category: cat, lift: [0], impl: ([n, ref, order]) => {
  const target = toNum(n);
  const nums = collectNums([ref]);
  const desc = order === undefined || order === null || toNum(order) === 0;
  const sorted = [...nums].sort((x, y) => (desc ? y - x : x - y));
  const i = sorted.findIndex((v) => v === target);
  if (i < 0) throw new XlError("#N/A", "RANK did not find that number in the list.");
  return i + 1;
} });
reg({ name: "MODE", min: 1, max: Infinity, category: cat, impl: (a) => {
  const nums = collectNums(a);
  if (!nums.length) throw new XlError("#N/A", "MODE needs numbers.");
  const freq = new Map<number, number>();
  let best = nums[0], bestN = 0;
  for (const n of nums) {
    const c = (freq.get(n) ?? 0) + 1;
    freq.set(n, c);
    if (c > bestN) { best = n; bestN = c; }
  }
  if (bestN < 2) throw new XlError("#N/A", "MODE needs a value that appears more than once.");
  return best;
} });
reg({ name: "PERCENTILE", min: 2, max: 2, category: cat, impl: ([arr, k]) => {
  const nums = collectNums([arr]).sort((a, b) => a - b);
  const p = toNum(k);
  if (!nums.length || p < 0 || p > 1) throw new XlError("#NUM!", "PERCENTILE needs a k between 0 and 1.");
  const idx = (nums.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? nums[lo] : nums[lo] + (nums[hi] - nums[lo]) * (idx - lo);
} });

function annuity(rate: number, nper: number, pmt: number, pv: number, fv: number, type: number, want: "pmt" | "fv" | "pv"): number {
  const typ = type ? 1 : 0;
  if (rate === 0) {
    if (want === "pmt") return -(pv + fv) / nper;
    if (want === "fv") return -(pv + pmt * nper);
    return -(fv + pmt * nper);
  }
  const grow = Math.pow(1 + rate, nper);
  if (want === "pmt") return -(rate * (pv * grow + fv)) / ((1 + rate * typ) * (grow - 1));
  if (want === "fv") return -pv * grow - pmt * (1 + rate * typ) * (grow - 1) / rate;
  return -(fv + pmt * (1 + rate * typ) * (grow - 1) / rate) / grow;
}
reg({ name: "PMT", min: 3, max: 5, category: cat, lift: "all", impl: ([r, n, pv, fv, typ]) => annuity(toNum(r), toNum(n), 0, toNum(pv), fv === undefined ? 0 : toNum(fv), typ === undefined ? 0 : toNum(typ), "pmt") });
reg({ name: "FV", min: 3, max: 5, category: cat, lift: "all", impl: ([r, n, pmt, pv, typ]) => annuity(toNum(r), toNum(n), toNum(pmt), pv === undefined ? 0 : toNum(pv), 0, typ === undefined ? 0 : toNum(typ), "fv") });
reg({ name: "PV", min: 3, max: 5, category: cat, lift: "all", impl: ([r, n, pmt, fv, typ]) => annuity(toNum(r), toNum(n), toNum(pmt), 0, fv === undefined ? 0 : toNum(fv), typ === undefined ? 0 : toNum(typ), "pv") });

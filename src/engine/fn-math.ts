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

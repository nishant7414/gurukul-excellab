import type { Node } from "./parser";
import { XlError, isErr, isMatrix, type Matrix, type Scalar, type Value } from "./types";
import { numToStr } from "./format";

/* ---------- coercion ---------- */
export function toNum(v: Value): number {
  if (isMatrix(v)) v = v[0]?.[0] ?? null;
  if (isErr(v)) throw v;
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const s = v.trim();
  if (s !== "") {
    const pct = /^(-?[\d.,]+)%$/.exec(s);
    if (pct && !isNaN(Number(pct[1].replace(/,/g, "")))) return Number(pct[1].replace(/,/g, "")) / 100;
    const n = Number(s.replace(/^\+/, ""));
    if (!isNaN(n) && /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return n;
  }
  throw new XlError("#VALUE!", `"${v}" is text and cannot be used as a number here.`);
}
export function toStr(v: Value): string {
  if (isMatrix(v)) v = v[0]?.[0] ?? null;
  if (isErr(v)) throw v;
  if (v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return numToStr(v);
}
export function toBool(v: Value): boolean {
  if (isMatrix(v)) v = v[0]?.[0] ?? null;
  if (isErr(v)) throw v;
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const u = v.toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE") return false;
  throw new XlError("#VALUE!", `"${v}" cannot be read as TRUE or FALSE.`);
}
export const dims = (m: Matrix) => ({ rows: m.length, cols: m[0]?.length ?? 0 });
export const asMatrix = (v: Value): Matrix => (isMatrix(v) ? v : [[v]]);
export const flat = (v: Value): Scalar[] => (isMatrix(v) ? v.flat() : [v]);
export function unwrap(v: Value): Scalar {
  return isMatrix(v) ? (v[0]?.[0] ?? null) : v;
}
export function collapse(m: Matrix): Value {
  return m.length === 1 && m[0].length === 1 ? m[0][0] : m;
}

/* ---------- registry ---------- */
export type FnCategory =
  | "Math and statistics"
  | "Logical"
  | "Text"
  | "Date and time"
  | "Lookup and reference"
  | "Conditional aggregation"
  | "Information and error handling"
  | "Dynamic arrays"
  | "Financial"
  | "Database and analysis";

export interface EvalCtx {
  sheet: string;
  cell(sheet: string, col: number, row: number): Scalar;
  extent(sheet: string): { maxCol: number; maxRow: number };
  hasSheet(name: string): boolean;
  evalNode(n: Node): Value;
  /** Optional fast path: a fresh copy of a rectangular block of cell values. */
  range?(sheet: string, c1: number, r1: number, c2: number, r2: number): Matrix;
}

export interface FnDef {
  name: string;
  min: number;
  max: number;
  category: FnCategory;
  /** lazy functions receive AST nodes and decide what to evaluate (IF, IFERROR...) */
  lazy?: boolean;
  /** argument indexes that are scalar-typed; array input to them is broadcast elementwise (Excel 365 behaviour) */
  lift?: number[] | "all";
  /** true when result changes between calculations (TODAY, NOW) */
  volatile?: boolean;
  impl: (args: any[], ctx: EvalCtx) => Value;
}
export const FUNCS = new Map<string, FnDef>();
const RANGE_ARG_FNS = new Set(["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "COUNTA", "COUNTBLANK", "AND", "OR", "SUMPRODUCT"]);

/** Real Excel functions that Gurukul ExcelLab deliberately does NOT evaluate. They never return a fabricated value. */
export const UNSUPPORTED: Record<string, string> = {
  FILTERXML: "It needs an XML/XPath engine and is not available in Excel for the web or on Mac, so it is taught as a guided, non-evaluated exercise.",
  LET: "Named variables inside formulas are not implemented yet.",
  LAMBDA: "User-defined functions are not implemented yet.",
  XMATCH: "Not implemented yet; use MATCH.",
  VSTACK: "Not implemented yet.",
  HSTACK: "Not implemented yet.",
  CHOOSECOLS: "Not implemented yet.",
  CHOOSEROWS: "Not implemented yet.",
  MAP: "Not implemented yet.",
  REDUCE: "Not implemented yet.",
  BYROW: "Not implemented yet.",
  BYCOL: "Not implemented yet.",
  SUBTOTAL: "Not implemented yet.",
  AGGREGATE: "Not implemented yet.",
  WEBSERVICE: "External data calls are intentionally not available.",
  STOCKHISTORY: "External data calls are intentionally not available.",
  GOALSEEK: "Goal Seek is a command, not a function; it is taught as a guided step-by-step task.",
};
export function reg(def: FnDef) {
  FUNCS.set(def.name, def);
}

function broadcast(args: Value[], idx: number[], f: (a: Value[]) => Value): Value {
  const mats = idx.map((i) => (isMatrix(args[i]) ? (args[i] as Matrix) : null));
  if (mats.every((m) => m === null)) return f(args);
  let rows = 1, cols = 1;
  for (const m of mats) if (m) {
    const d = dims(m);
    rows = Math.max(rows, d.rows);
    cols = Math.max(cols, d.cols);
  }
  const out: Matrix = [];
  for (let r = 0; r < rows; r++) {
    const row: Scalar[] = [];
    for (let c = 0; c < cols; c++) {
      const a = args.slice();
      let bad: XlError | null = null;
      idx.forEach((i, k) => {
        const m = mats[k];
        if (m) {
          const rr = m.length === 1 ? 0 : r;
          const cc = m[0].length === 1 ? 0 : c;
          if (r >= m.length && m.length !== 1 || c >= m[0].length && m[0].length !== 1) bad = new XlError("#N/A");
          else a[i] = m[rr][cc];
        }
      });
      if (bad) {
        row.push(bad);
        continue;
      }
      try {
        const res = f(a);
        row.push(isMatrix(res) ? (res[0]?.[0] ?? null) : res);
      } catch (e) {
        if (e instanceof XlError) row.push(e);
        else throw e;
      }
    }
    out.push(row);
  }
  return out;
}

/* ---------- operators ---------- */
export function compareValues(a: Scalar, b: Scalar): number {
  const rank = (v: Scalar) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : typeof v === "boolean" ? 2 : -1);
  if (a === null) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  if (isErr(a)) throw a;
  if (isErr(b)) throw b;
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (typeof a === "string") {
    const x = a.toLowerCase(), y = (b as string).toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (typeof a === "boolean") return Number(a) - Number(b as boolean);
  return (a as number) - (b as number);
}

function binOp(op: string, a: Value, b: Value): Value {
  return broadcast([a, b], [0, 1], ([x, y]) => {
    const xs = unwrap(x), ys = unwrap(y);
    if (isErr(xs)) throw xs;
    if (isErr(ys)) throw ys;
    switch (op) {
      case "+": return toNum(xs) + toNum(ys);
      case "-": return toNum(xs) - toNum(ys);
      case "*": return toNum(xs) * toNum(ys);
      case "/": {
        const d = toNum(ys);
        if (d === 0) throw new XlError("#DIV/0!", "A formula tried to divide by zero (or by an empty cell).");
        return toNum(xs) / d;
      }
      case "^": {
        const r = Math.pow(toNum(xs), toNum(ys));
        if (!isFinite(r)) throw new XlError("#NUM!");
        return r;
      }
      case "&": return toStr(xs) + toStr(ys);
      case "=": return compareValues(xs, ys) === 0;
      case "<>": return compareValues(xs, ys) !== 0;
      case "<": return compareValues(xs, ys) < 0;
      case ">": return compareValues(xs, ys) > 0;
      case "<=": return compareValues(xs, ys) <= 0;
      case ">=": return compareValues(xs, ys) >= 0;
    }
    throw new XlError("#VALUE!");
  });
}

/* ---------- evaluator ---------- */
export function evalNode(n: Node, ctx: EvalCtx): Value {
  try {
    return evalInner(n, ctx);
  } catch (e) {
    if (e instanceof XlError) return e;
    throw e;
  }
}

function sheetFor(ctx: EvalCtx, sheet?: string): string {
  const s = sheet ?? ctx.sheet;
  if (!ctx.hasSheet(s)) throw new XlError("#REF!", `The sheet "${s}" does not exist.`);
  return s;
}

function evalInner(n: Node, ctx: EvalCtx): Value {
  switch (n.t) {
    case "num": return n.v;
    case "str": return n.v;
    case "bool": return n.v;
    case "err": return new XlError(n.v);
    case "empty": return null;
    case "name": return new XlError("#NAME?", `"${n.name}" is not a known function or name. Check the spelling.`);
    case "ref": return ctx.cell(sheetFor(ctx, n.sheet), n.col, n.row);
    case "range": {
      const s = sheetFor(ctx, n.sheet);
      let r2 = n.r2;
      if (n.openEnd) r2 = Math.max(1, ctx.extent(s).maxRow);
      if (ctx.range) return ctx.range(s, n.c1, n.r1, n.c2, r2);
      const out: Matrix = [];
      for (let r = n.r1; r <= r2; r++) {
        const row: Scalar[] = [];
        for (let c = n.c1; c <= n.c2; c++) row.push(ctx.cell(s, c, r));
        out.push(row);
      }
      return out;
    }
    case "arr": return n.rows.map((r) => r.map((x) => unwrap(evalNode(x, ctx))));
    case "unary": {
      const v = evalNode(n.x, ctx);
      if (n.op === "+") return v;
      return broadcast([v], [0], ([x]) => -toNum(x as Value));
    }
    case "pct": {
      const v = evalNode(n.x, ctx);
      return broadcast([v], [0], ([x]) => toNum(x as Value) / 100);
    }
    case "bin": return binOp(n.op, evalNode(n.l, ctx), evalNode(n.r, ctx));
    case "call": {
      const def = FUNCS.get(n.name);
      if (!def) {
        const why = UNSUPPORTED[n.name];
        if (why) return new XlError("#UNSUPPORTED!", `${n.name} is a real Excel function, but the Gurukul ExcelLab simulator does not evaluate it. ${why}`);
        return new XlError("#NAME?", `${n.name} is not recognised. Check the spelling, or see the Function Library for functions the Gurukul ExcelLab simulator supports.`);
      }
      if (n.args.length < def.min || n.args.length > def.max)
        return new XlError("#VALUE!", `${n.name} was given ${n.args.length} argument(s) but expects ${def.min}${def.max === Infinity ? " or more" : def.max !== def.min ? `–${def.max}` : ""}.`);
      if (def.lazy) return def.impl(n.args, { ...ctx, evalNode: (x) => evalNode(x, ctx) });
      const c2: EvalCtx = ctx;
      const asRange = RANGE_ARG_FNS.has(n.name);
      const args = n.args.map((a) => {
        if (a.t === "empty") return null;
        const v = evalNode(a, ctx);
        // Excel does not coerce text held in a referenced cell for aggregating functions (SUM("5") works, SUM(A1) with A1="5" does not)
        return asRange && a.t === "ref" ? [[v as Scalar]] : v;
      });
      const run = (a: Value[]) => def.impl(a, c2);
      if (def.lift) {
        const idx = def.lift === "all" ? args.map((_, i) => i) : def.lift.filter((i) => i < args.length);
        // when a lifted argument is an error scalar, propagate
        return broadcast(args, idx, run);
      }
      return run(args);
    }
  }
}

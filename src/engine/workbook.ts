import "./fn-math";
import "./fn-text";
import "./fn-date";
import "./fn-cond";
import "./fn-lookup";
import "./fn-array";
import { evalNode, type EvalCtx } from "./core";
import { ParseError, parseCached } from "./parser";
import { XlError, isErr, isMatrix, type Matrix, type Scalar, type SheetData, type Value, type WorkbookData } from "./types";
import { addr, cellsIn, parseAddr, parseRange } from "./refs";

/* ---------- typed input ---------- */
export type ParsedInput =
  | { kind: "blank" }
  | { kind: "formula"; formula: string }
  | { kind: "value"; value: Scalar };

export function parseInput(raw: string | undefined): ParsedInput {
  if (raw === undefined || raw === "") return { kind: "blank" };
  if (raw.startsWith("=") && raw.length > 1) return { kind: "formula", formula: raw };
  if (raw.startsWith("'")) return { kind: "value", value: raw.slice(1) };
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(raw)) return { kind: "value", value: Number(raw) };
  if (/^[-+]?(\d+\.?\d*|\.\d+)%$/.test(raw)) return { kind: "value", value: Number(raw.slice(0, -1)) / 100 };
  const up = raw.toUpperCase();
  if (up === "TRUE") return { kind: "value", value: true };
  if (up === "FALSE") return { kind: "value", value: false };
  return { kind: "value", value: raw };
}

/** Convert a value to the raw string that parseInput will read back as the same value (text is apostrophe-protected). */
export function toRaw(v: Scalar): string {
  if (v === null) return "";
  if (isErr(v)) return v.code;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  const p = parseInput(v);
  if (v === "" ) return "";
  if (p.kind === "value" && p.value === v) return v;
  return "'" + v;
}

export interface CellResult {
  value: Scalar;
  raw: string;
  formula?: string;
  /** size of the dynamic array this formula returns (when larger than 1x1 and not blocked) */
  spill?: { rows: number; cols: number };
  spilledFrom?: string;
}

export class Computed {
  wb: WorkbookData;
  private results: Map<string, CellResult>;
  constructor(wb: WorkbookData, results: Map<string, CellResult>) {
    this.wb = wb;
    this.results = results;
  }
  sheet(name: string): SheetData | undefined {
    const l = name.toLowerCase();
    return this.wb.sheets.find((s) => s.name.toLowerCase() === l);
  }
  cell(sheet: string, a: string): CellResult {
    const s = this.sheet(sheet);
    const key = `${s?.name ?? sheet}!${a.toUpperCase()}`;
    return this.results.get(key) ?? { value: null, raw: "" };
  }
  value(sheet: string, a: string): Scalar {
    return this.cell(sheet, a).value;
  }
  matrix(sheet: string, ref: string): Matrix {
    const r = parseRange(ref);
    if (!r) throw new Error(`Bad range ${ref}`);
    const out: Matrix = [];
    for (let row = r.r1; row <= r.r2; row++) {
      const line: Scalar[] = [];
      for (let col = r.c1; col <= r.c2; col++) line.push(this.value(r.sheet ?? sheet, addr(col, row)));
      out.push(line);
    }
    return out;
  }
}

class Calc {
  memo = new Map<string, CellResult>();
  visiting = new Set<string>();
  spills = new Map<string, Scalar>();
  spillOwner = new Map<string, string>();
  names = new Map<string, SheetData>();
  rangeCache = new Map<string, Matrix>();
  wb: WorkbookData;
  private prevSpills: Map<string, Scalar>;
  constructor(wb: WorkbookData, prevSpills: Map<string, Scalar>) {
    this.wb = wb;
    this.prevSpills = prevSpills;
    for (const s of wb.sheets) this.names.set(s.name.toLowerCase(), s);
  }
  ctxFor(sheet: string): EvalCtx {
    const ctx: EvalCtx = {
      sheet,
      cell: (sh, col, row) => this.cellValue(sh, col, row),
      extent: (sh) => this.extent(sh),
      hasSheet: (n) => this.names.has(n.toLowerCase()),
      evalNode: (n) => evalNode(n, ctx),
      range: (sh, c1, r1, c2, r2) => this.rangeBlock(sh, c1, r1, c2, r2),
    };
    return ctx;
  }
  /**
   * Values of a rectangular block. Large blocks are read once per calculation pass and
   * served as copies, so hundreds of SUMIFS/COUNTIFS over the same column stay fast.
   */
  rangeBlock(sheet: string, c1: number, r1: number, c2: number, r2: number): Matrix {
    const big = (r2 - r1 + 1) * (c2 - c1 + 1) >= 40;
    const key = big ? `${sheet.toLowerCase()}|${c1},${r1},${c2},${r2}` : "";
    if (big) {
      const hit = this.rangeCache.get(key);
      if (hit) return hit.map((row) => row.slice());
    }
    const out: Matrix = [];
    let circular = false;
    for (let r = r1; r <= r2; r++) {
      const row: Scalar[] = [];
      for (let c = c1; c <= c2; c++) {
        const v = this.cellValue(sheet, c, r);
        if (isErr(v) && v.code === "#CIRC!") circular = true;
        row.push(v);
      }
      out.push(row);
    }
    if (big && !circular) this.rangeCache.set(key, out.map((row) => row.slice()));
    return out;
  }
  extent(sheet: string) {
    const s = this.names.get(sheet.toLowerCase());
    let maxRow = 0, maxCol = 0;
    if (s)
      for (const k of Object.keys(s.cells)) {
        if (s.cells[k] === "") continue;
        const p = parseAddr(k);
        if (p) {
          maxRow = Math.max(maxRow, p.row);
          maxCol = Math.max(maxCol, p.col);
        }
      }
    return { maxRow, maxCol };
  }
  cellValue(sheet: string, col: number, row: number): Scalar {
    return this.cellResult(sheet, col, row).value;
  }
  cellResult(sheetName: string, col: number, row: number): CellResult {
    const sh = this.names.get(sheetName.toLowerCase());
    if (!sh) return { value: new XlError("#REF!"), raw: "" };
    const a = addr(col, row);
    const key = `${sh.name}!${a}`;
    const hit = this.memo.get(key);
    if (hit) return hit;
    const raw = sh.cells[a] ?? "";
    const parsed = parseInput(raw);
    let res: CellResult;
    if (parsed.kind === "blank") {
      const sp = this.prevSpills.get(key);
      res = sp !== undefined ? { value: sp, raw: "", spilledFrom: this.spillOwner.get(key) } : { value: null, raw: "" };
      // ownership recorded from the previous pass
      return (this.memoSet(key, res), res);
    }
    if (parsed.kind === "value") {
      res = { value: parsed.value, raw };
      this.memoSet(key, res);
      return res;
    }
    if (this.visiting.has(key)) return { value: new XlError("#CIRC!", "Circular reference: this formula depends on its own result."), raw };
    this.visiting.add(key);
    let value: Value;
    try {
      const node = parseCached(parsed.formula);
      value = evalNode(node, this.ctxFor(sh.name));
    } catch (e) {
      if (e instanceof ParseError) value = new XlError("#NAME?", `Formula syntax problem: ${e.message}`);
      else throw e;
    }
    this.visiting.delete(key);
    res = { value: null, raw, formula: parsed.formula };
    if (isMatrix(value)) {
      const rows = value.length;
      const cols = value[0]?.length ?? 0;
      res.value = value[0]?.[0] ?? null;
      if (rows * cols > 1) {
        let blocked = false;
        const targets: string[] = [];
        for (let r = 0; r < rows && !blocked; r++)
          for (let c = 0; c < cols; c++) {
            if (r === 0 && c === 0) continue;
            const ta = addr(col + c, row + r);
            const tk = `${sh.name}!${ta}`;
            if ((sh.cells[ta] ?? "") !== "" || this.spills.has(tk)) {
              blocked = true;
              break;
            }
            targets.push(tk);
          }
        if (blocked) res.value = new XlError("#SPILL!", "The result needs more room than is available: a neighbouring cell is not empty. Clear the cells in the spill range.");
        else {
          res.spill = { rows, cols };
          let i = 0;
          for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
              if (r === 0 && c === 0) continue;
              const tk = targets[i++];
              this.spills.set(tk, value[r][c]);
              this.spillOwner.set(tk, key);
            }
        }
      }
    } else res.value = value;
    this.memoSet(key, res);
    return res;
  }
  private memoSet(key: string, res: CellResult) {
    this.memo.set(key, res);
  }
}

export function compute(wb: WorkbookData): Computed {
  let prev = new Map<string, Scalar>();
  let calc: Calc = new Calc(wb, prev);
  let prevOwner = new Map<string, string>();
  for (let pass = 0; pass < 5; pass++) {
    calc = new Calc(wb, prev);
    calc.spillOwner = new Map(prevOwner);
    for (const s of wb.sheets) {
      const keys = Object.keys(s.cells)
        .map((k) => ({ k, p: parseAddr(k)! }))
        .filter((x) => x.p && s.cells[x.k] !== "")
        .sort((a, b) => a.p.row - b.p.row || a.p.col - b.p.col);
      for (const { p } of keys) calc.cellResult(s.name, p.col, p.row);
    }
    const same = calc.spills.size === prev.size && [...calc.spills].every(([k, v]) => sameScalar(prev.get(k), v));
    prev = calc.spills;
    prevOwner = calc.spillOwner;
    if (same) break;
  }
  // final results: include spilled cells that are not explicit
  const results = new Map(calc.memo);
  for (const [k, v] of calc.spills) {
    const prior = results.get(k);
    if (!prior || prior.raw === "") results.set(k, { value: v, raw: "", spilledFrom: calc.spillOwner.get(k) });
  }
  return new Computed(wb, results);
}
function sameScalar(a: Scalar | undefined, b: Scalar): boolean {
  if (a === undefined) return false;
  if (isErr(a) && isErr(b)) return a.code === b.code;
  return a === b;
}

/** Evaluate an arbitrary formula (e.g. from the Playground) in the context of a workbook. */
export function evaluateFormula(wb: WorkbookData, sheet: string, formula: string): Value {
  const comp = compute(wb);
  const calc = new Calc(wb, new Map());
  // use computed workbook values by wrapping its lookups
  const ctx: EvalCtx = {
    sheet,
    cell: (sh, col, row) => comp.value(sh, addr(col, row)),
    extent: (sh) => calc.extent(sh),
    hasSheet: (n) => !!comp.sheet(n),
    evalNode: (n) => evalNode(n, ctx),
  };
  try {
    return evalNode(parseCached(formula.startsWith("=") ? formula : "=" + formula), ctx);
  } catch (e) {
    if (e instanceof ParseError) return new XlError("#NAME?", `Formula syntax problem: ${e.message}`);
    throw e;
  }
}

export function emptyWorkbook(sheetNames: string[] = ["Sheet1"]): WorkbookData {
  return { sheets: sheetNames.map((n) => ({ name: n, cells: {}, formats: {}, colWidths: {}, hiddenRows: [] })) };
}
export { cellsIn };

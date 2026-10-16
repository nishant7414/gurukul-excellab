import type { ErrorCode } from "./types";
import { colToNum, numToCol } from "./refs";

export type Node =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "err"; v: ErrorCode }
  | { t: "empty" }
  | { t: "ref"; sheet?: string; col: number; row: number }
  | { t: "range"; sheet?: string; c1: number; r1: number; c2: number; r2: number; openEnd?: boolean }
  | { t: "unary"; op: "-" | "+"; x: Node }
  | { t: "pct"; x: Node }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "call"; name: string; args: Node[] }
  | { t: "arr"; rows: Node[][] }
  | { t: "name"; name: string };

export class ParseError extends Error {}

const ERR_LITERALS: ErrorCode[] = ["#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#N/A", "#NUM!", "#NULL!", "#SPILL!"];
const CELL = String.raw`\$?[A-Za-z]{1,3}\$?\d+`;
const SHEET = String.raw`(?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!`;
const REF_RE = new RegExp(`^(${SHEET})?(${CELL})(?::(${CELL}))?(?![A-Za-z0-9_(.])`);
const COLRANGE_RE = new RegExp(String.raw`^(${SHEET})?(\$?[A-Za-z]{1,3}):(\$?[A-Za-z]{1,3})(?![A-Za-z0-9_(.])`);

function splitCell(s: string) {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(s)!;
  return { col: colToNum(m[1]), row: Number(m[2]) };
}
function cleanSheet(s?: string) {
  if (!s) return undefined;
  s = s.slice(0, -1);
  if (s.startsWith("'")) s = s.slice(1, -1).replace(/''/g, "'");
  return s;
}

const PREC: Record<string, number> = {
  "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1,
  "&": 2,
  "+": 3, "-": 3,
  "*": 4, "/": 4,
  "^": 5,
};

export function parseFormula(src: string): Node {
  const text = src.startsWith("=") ? src.slice(1) : src;
  let i = 0;
  const ws = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const peek = () => text[i];

  function parseExpr(minPrec: number): Node {
    let left = parseUnary();
    for (;;) {
      ws();
      let op = "";
      const two = text.slice(i, i + 2);
      if (["<>", "<=", ">="].includes(two)) op = two;
      else if ("=<>&+-*/^".includes(peek() ?? "§")) op = peek();
      if (!op) break;
      const p = PREC[op];
      if (p < minPrec) break;
      i += op.length;
      // ^ is left-associative in Excel
      const right = parseExpr(p + 1);
      left = { t: "bin", op, l: left, r: right };
    }
    return left;
  }

  function parseUnary(): Node {
    ws();
    const c = peek();
    if (c === "-" || c === "+") {
      i++;
      // Excel: unary minus binds tighter than ^ (=-2^2 is 4)
      const x = parseUnary();
      return { t: "unary", op: c, x };
    }
    return parsePostfix();
  }

  function parsePostfix(): Node {
    let n = parsePrimary();
    for (;;) {
      ws();
      if (peek() === "%") {
        i++;
        n = { t: "pct", x: n };
      } else break;
    }
    return n;
  }

  function parseArgs(): Node[] {
    const args: Node[] = [];
    ws();
    if (peek() === ")") {
      i++;
      return args;
    }
    for (;;) {
      ws();
      if (peek() === "," || peek() === ")") args.push({ t: "empty" });
      else args.push(parseExpr(1));
      ws();
      if (peek() === ",") {
        i++;
        continue;
      }
      if (peek() === ")") {
        i++;
        break;
      }
      throw new ParseError(`Expected "," or ")" at position ${i + 1}`);
    }
    return args;
  }

  function parsePrimary(): Node {
    ws();
    const c = peek();
    if (c === undefined) throw new ParseError("Formula ended unexpectedly");
    if (c === "(") {
      i++;
      const e = parseExpr(1);
      ws();
      if (peek() !== ")") throw new ParseError('Missing closing ")"');
      i++;
      return e;
    }
    if (c === '"') {
      let s = "";
      i++;
      for (;;) {
        if (i >= text.length) throw new ParseError("Text string is missing its closing quote");
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            s += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        s += text[i++];
      }
      return { t: "str", v: s };
    }
    if (c === "{") {
      i++;
      const rows: Node[][] = [[]];
      for (;;) {
        rows[rows.length - 1].push(parseExpr(1));
        ws();
        if (peek() === ",") i++;
        else if (peek() === ";") {
          i++;
          rows.push([]);
        } else if (peek() === "}") {
          i++;
          break;
        } else throw new ParseError("Invalid array constant");
      }
      return { t: "arr", rows };
    }
    if (c === "#") {
      for (const e of ERR_LITERALS) if (text.slice(i, i + e.length).toUpperCase() === e) {
        i += e.length;
        return { t: "err", v: e };
      }
      throw new ParseError("Unknown error literal");
    }
    const rest = text.slice(i);
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest);
    if (num && !/^[A-Za-z_$]/.test(rest)) {
      // a cell like "1A" is not valid; digits then letters means not a number
      const after = rest[num[0].length];
      if (after && /[A-Za-z_]/.test(after)) throw new ParseError(`Unexpected "${after}" after number`);
      i += num[0].length;
      return { t: "num", v: Number(num[0]) };
    }
    // references
    const ref = REF_RE.exec(rest);
    if (ref) {
      i += ref[0].length;
      const sheet = cleanSheet(ref[1]);
      const a = splitCell(ref[2]);
      if (ref[3]) {
        const b = splitCell(ref[3]);
        return {
          t: "range",
          sheet,
          c1: Math.min(a.col, b.col),
          r1: Math.min(a.row, b.row),
          c2: Math.max(a.col, b.col),
          r2: Math.max(a.row, b.row),
        };
      }
      return { t: "ref", sheet, col: a.col, row: a.row };
    }
    const colr = COLRANGE_RE.exec(rest);
    if (colr) {
      i += colr[0].length;
      const a = colToNum(colr[2].replace("$", ""));
      const b = colToNum(colr[3].replace("$", ""));
      return { t: "range", sheet: cleanSheet(colr[1]), c1: Math.min(a, b), r1: 1, c2: Math.max(a, b), r2: 1, openEnd: true };
    }
    const id = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest);
    if (id) {
      const name = id[0];
      i += name.length;
      if (peek() === "(") {
        i++;
        return { t: "call", name: name.toUpperCase(), args: parseArgs() };
      }
      const up = name.toUpperCase();
      if (up === "TRUE") return { t: "bool", v: true };
      if (up === "FALSE") return { t: "bool", v: false };
      return { t: "name", name };
    }
    throw new ParseError(`Unexpected character "${c}" at position ${i + 1}`);
  }

  const node = parseExpr(1);
  ws();
  if (i < text.length) {
    if (text[i] === "#") throw new ParseError('The spill operator "#" is not supported by the Gurukul ExcelLab simulator');
    throw new ParseError(`Unexpected "${text[i]}" at position ${i + 1}`);
  }
  return node;
}

const cache = new Map<string, Node | ParseError>();
export function parseCached(f: string): Node {
  let r = cache.get(f);
  if (!r) {
    try {
      r = parseFormula(f);
    } catch (e) {
      if (e instanceof ParseError) r = e;
      else throw e;
    }
    cache.set(f, r);
  }
  if (r instanceof ParseError) throw r;
  return r;
}

/** Collect uppercase function names used in a formula (for answer checking). */
export function functionsUsed(formula: string): string[] {
  const out = new Set<string>();
  const walk = (n: Node) => {
    switch (n.t) {
      case "call":
        out.add(n.name);
        n.args.forEach(walk);
        break;
      case "bin":
        walk(n.l);
        walk(n.r);
        break;
      case "unary":
      case "pct":
        walk(n.x);
        break;
      case "arr":
        n.rows.forEach((r) => r.forEach(walk));
        break;
    }
  };
  try {
    walk(parseFormula(formula));
  } catch {
    /* ignore */
  }
  return [...out];
}

/**
 * Shift the relative parts of every reference in a formula, as Excel does when a formula is copied
 * or filled. `$` markers are honoured. References that would fall off the sheet become #REF!.
 */
export function shiftFormula(formula: string, dRow: number, dCol: number): string {
  if (!formula.startsWith("=")) return formula;
  let out = "";
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < formula.length) {
        if (formula[j] === '"') {
          if (formula[j + 1] === '"') j += 2;
          else break;
        } else j++;
      }
      out += formula.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const rest = formula.slice(i);
    const prev = i > 0 ? formula[i - 1] : "";
    if (!/[A-Za-z0-9_.]/.test(prev)) {
      const m = new RegExp(`^(${SHEET})?(\\$?)([A-Za-z]{1,3})(\\$?)(\\d+)(?::(\\$?)([A-Za-z]{1,3})(\\$?)(\\d+))?(?![A-Za-z0-9_(.])`).exec(rest);
      if (m) {
        const shift = (absC: string, col: string, absR: string, row: string) => {
          const c = absC ? colToNum(col) : colToNum(col) + dCol;
          const r = absR ? Number(row) : Number(row) + dRow;
          if (c < 1 || r < 1) return null;
          return `${absC}${numToCol(c)}${absR}${r}`;
        };
        const a = shift(m[2], m[3], m[4], m[5]);
        const b = m[7] ? shift(m[6], m[7], m[8], m[9]) : "";
        out += m[1] ?? "";
        out += a === null || b === null ? "#REF!" : b ? `${a}:${b}` : a;
        i += m[0].length;
        continue;
      }
      const cr = COLRANGE_RE.exec(rest);
      if (cr) {
        const sh = (s: string) => (s.startsWith("$") ? s : numToCol(colToNum(s) + dCol));
        out += `${cr[1] ?? ""}${sh(cr[2])}:${sh(cr[3])}`;
        i += cr[0].length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

import { asMatrix, dims, flat, reg, toNum, unwrap } from "./core";
import { XlError, isErr, type Matrix, type Scalar, type Value } from "./types";
import { parseISODate } from "./dates";
import { wildcardRegex } from "./fn-text";

/** Builds a predicate from an Excel criterion such as ">=10", "<>apple", "a*", 5, "". */
export function makeMatcher(criterion: Scalar): (cell: Scalar) => boolean {
  if (isErr(criterion)) throw criterion;
  if (typeof criterion === "number") return (c) => (typeof c === "number" ? c === criterion : typeof c === "string" && c.trim() !== "" && Number(c) === criterion);
  if (typeof criterion === "boolean") return (c) => c === criterion;
  if (criterion === null) return (c) => c === null || c === 0;
  let op = "=";
  let rest = criterion;
  const m = /^(<>|>=|<=|=|>|<)/.exec(criterion);
  if (m) {
    op = m[1];
    rest = criterion.slice(op.length);
  }
  const iso = parseISODate(rest);
  const asNum = rest.trim() !== "" && !isNaN(Number(rest)) ? Number(rest) : iso;
  const cmpNum = (c: Scalar): number | null => (typeof c === "number" ? c : null);
  if (asNum !== null && rest.trim() !== "") {
    return (c) => {
      let n = cmpNum(c);
      if (n === null && typeof c === "string" && (op === "=" || op === "<>") && c.trim() !== "" && !isNaN(Number(c))) n = Number(c);
      if (n === null) return op === "<>";
      switch (op) {
        case "=": return n === asNum;
        case "<>": return n !== asNum;
        case ">": return n > asNum;
        case "<": return n < asNum;
        case ">=": return n >= asNum;
        default: return n <= asNum;
      }
    };
  }
  if (rest === "") {
    if (op === "=") return (c) => c === null || c === "";
    if (op === "<>") return (c) => c !== null && c !== "";
  }
  if ((op === "=" || op === "<>") && !/[*?~]/.test(rest)) {
    // fast path: plain text equality (no wildcards) is a case-insensitive string comparison
    const lo = rest.toLowerCase();
    return (c) => {
      const hit = c !== null && !isErr(c) && (typeof c === "number" ? String(c) === rest : String(c).toLowerCase() === lo);
      return op === "=" ? hit : !hit;
    };
  }
  if (op === "=" || op === "<>") {
    const re = wildcardRegex(rest, "i");
    const full = new RegExp(`^(?:${re.source})$`, "i");
    return (c) => {
      const hit = c !== null && !isErr(c) && typeof c !== "number" ? full.test(String(c)) : typeof c === "number" ? full.test(String(c)) : false;
      return op === "=" ? hit : !hit;
    };
  }
  const lo = rest.toLowerCase();
  return (c) => {
    if (typeof c !== "string") return false;
    const x = c.toLowerCase();
    return op === ">" ? x > lo : op === "<" ? x < lo : op === ">=" ? x >= lo : x <= lo;
  };
}

const cat = "Conditional aggregation" as const;

function sameShape(a: Matrix, b: Matrix) {
  const x = dims(a), y = dims(b);
  if (x.rows !== y.rows || x.cols !== y.cols) throw new XlError("#VALUE!", "The ranges in this function must all be the same size.");
}
function matchingMask(pairs: [Value, Value][]): boolean[][] {
  const first = asMatrix(pairs[0][0]);
  const d = dims(first);
  const mask = Array.from({ length: d.rows }, () => Array(d.cols).fill(true) as boolean[]);
  for (const [rng, crit] of pairs) {
    const m = asMatrix(rng);
    sameShape(first, m);
    const test = makeMatcher(unwrap(crit));
    for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.cols; c++) if (!test(m[r][c])) mask[r][c] = false;
  }
  return mask;
}
function pickValues(vals: Value, mask: boolean[][]): Scalar[] {
  const m = asMatrix(vals);
  const out: Scalar[] = [];
  mask.forEach((row, r) => row.forEach((ok, c) => ok && out.push(m[r]?.[c] ?? null)));
  return out;
}
const nums = (xs: Scalar[]) => xs.filter((x): x is number => typeof x === "number");

reg({ name: "COUNTIF", min: 2, max: 2, category: cat, impl: ([r, c]) => matchingMask([[r, c]]).flat().filter(Boolean).length });
reg({
  name: "COUNTIFS", min: 2, max: Infinity, category: cat,
  impl: (a) => {
    const pairs: [Value, Value][] = [];
    for (let i = 0; i < a.length; i += 2) pairs.push([a[i], a[i + 1]]);
    if (a.length % 2) throw new XlError("#VALUE!", "COUNTIFS needs range/criteria pairs.");
    return matchingMask(pairs).flat().filter(Boolean).length;
  },
});
reg({
  name: "SUMIF", min: 2, max: 3, category: cat,
  impl: ([r, c, s]) => {
    const mask = matchingMask([[r, c]]);
    return nums(pickValues(s === undefined || s === null ? r : s, mask)).reduce((x, y) => x + y, 0);
  },
});
reg({
  name: "SUMIFS", min: 3, max: Infinity, category: cat,
  impl: (a) => {
    const pairs: [Value, Value][] = [];
    for (let i = 1; i < a.length; i += 2) pairs.push([a[i], a[i + 1]]);
    if ((a.length - 1) % 2) throw new XlError("#VALUE!", "SUMIFS needs range/criteria pairs after the sum range.");
    sameShape(asMatrix(a[0]), asMatrix(a[1]));
    return nums(pickValues(a[0], matchingMask(pairs))).reduce((x, y) => x + y, 0);
  },
});
const avg = (xs: number[]) => {
  if (!xs.length) throw new XlError("#DIV/0!", "No cells matched the criteria, so there is nothing to average.");
  return xs.reduce((x, y) => x + y, 0) / xs.length;
};
reg({
  name: "AVERAGEIF", min: 2, max: 3, category: cat,
  impl: ([r, c, s]) => avg(nums(pickValues(s === undefined || s === null ? r : s, matchingMask([[r, c]])))),
});
reg({
  name: "AVERAGEIFS", min: 3, max: Infinity, category: cat,
  impl: (a) => {
    const pairs: [Value, Value][] = [];
    for (let i = 1; i < a.length; i += 2) pairs.push([a[i], a[i + 1]]);
    return avg(nums(pickValues(a[0], matchingMask(pairs))));
  },
});
void flat;
void toNum;

import { isErr, type Scalar } from "../engine/types";

export interface CompareOpts {
  /** Absolute numeric tolerance. When omitted, numbers use a small relative default. */
  tolerance?: number;
  ignoreCase?: boolean;
  trim?: boolean;
  normalizeWhitespace?: boolean;
}

export interface CompareResult {
  ok: boolean;
  reason?: string;
}

export function normalizeText(value: string, opts?: Pick<CompareOpts, "ignoreCase" | "trim" | "normalizeWhitespace">): string {
  let t = value;
  if (opts?.trim) t = t.trim();
  if (opts?.normalizeWhitespace) t = t.replace(/\s+/g, " ").trim();
  if (opts?.ignoreCase) t = t.toLowerCase();
  return t;
}

export function defaultNumberTolerance(expected: number, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  return 1e-9 * Math.max(1, Math.abs(expected));
}

export function compareNumber(actual: number, expected: number, tolerance?: number): CompareResult {
  const t = defaultNumberTolerance(expected, tolerance);
  const ok = Math.abs(actual - expected) <= t;
  return ok ? { ok: true } : { ok: false, reason: "numeric" };
}

export function compareText(actual: string, expected: string, opts?: CompareOpts): CompareResult {
  const a = normalizeText(actual, opts);
  const b = normalizeText(expected, opts);
  if (a === b) return { ok: true };
  if (actual.trim() === expected.trim() && actual !== expected) return { ok: false, reason: "whitespace" };
  if (actual.toLowerCase() === expected.toLowerCase()) return { ok: false, reason: "case" };
  return { ok: false, reason: "text" };
}

/** Exact or tolerant comparison used by the exercise checker. Defaults match historical Check Answer behaviour. */
export function compareScalar(actual: Scalar, expected: Scalar, opts?: CompareOpts): CompareResult {
  if (isErr(expected)) {
    const ok = isErr(actual) && actual.code === expected.code;
    return ok ? { ok: true } : { ok: false, reason: "error" };
  }
  if (isErr(actual)) return { ok: false, reason: "error" };

  let left: Scalar = actual;
  let right: Scalar = expected;
  if (opts?.trim) {
    if (typeof left === "string") left = left.trim();
    if (typeof right === "string") right = right.trim();
  }
  if (opts?.normalizeWhitespace) {
    if (typeof left === "string") left = normalizeText(left, { normalizeWhitespace: true, trim: true });
    if (typeof right === "string") right = normalizeText(right, { normalizeWhitespace: true, trim: true });
  }

  if (expected === null || expected === "") {
    const blank = left === null || left === "";
    return blank ? { ok: true } : { ok: false, reason: "blank" };
  }
  if (typeof right === "number") {
    if (typeof left !== "number") return { ok: false, reason: "type" };
    return compareNumber(left, right, opts?.tolerance);
  }
  if (typeof right === "string" && typeof left === "string") {
    return compareText(left, right, { ignoreCase: opts?.ignoreCase });
  }
  return left === right ? { ok: true } : { ok: false, reason: "value" };
}

export function compareTable(actual: Scalar[][], expected: Scalar[][], opts?: CompareOpts): CompareResult {
  if (actual.length !== expected.length) return { ok: false, reason: "rows" };
  for (let r = 0; r < expected.length; r++) {
    const er = expected[r] ?? [];
    const ar = actual[r] ?? [];
    if (ar.length !== er.length) return { ok: false, reason: "cols" };
    for (let c = 0; c < er.length; c++) {
      const cell = compareScalar(ar[c] ?? null, er[c] ?? null, opts);
      if (!cell.ok) return { ok: false, reason: `cell:${r}:${c}` };
    }
  }
  return { ok: true };
}

export function matchFormulaString(raw: string, pattern: string, flags = "i"): boolean {
  try {
    return new RegExp(pattern, flags).test(raw);
  } catch {
    return false;
  }
}

export interface PartialScore {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
}

/** Score a list of independent check outcomes. `passThreshold` is 0–1; default 1 means every check must pass. */
export function scorePartial(results: boolean[], passThreshold = 1): PartialScore {
  const total = results.length;
  const correct = results.filter(Boolean).length;
  const percent = total ? Math.round((100 * correct) / total) : 0;
  const ratio = total ? correct / total : 0;
  return { correct, total, percent, passed: total > 0 && ratio + 1e-12 >= passThreshold };
}

export function scoreFromCounts(correct: number, total: number, passThreshold = 1): PartialScore {
  const percent = total ? Math.round((100 * correct) / total) : 0;
  const ratio = total ? correct / total : 0;
  return { correct, total, percent, passed: total > 0 && ratio + 1e-12 >= passThreshold };
}

export function formulaUsesAny(raw: string, names: string[]): boolean {
  const upper = raw.toUpperCase();
  return names.some((n) => upper.includes(n.toUpperCase()));
}

export interface ManualReview {
  passed: false;
  correct: 0;
  total: 1;
  percent: 0;
  message: string;
}

export function manualReviewResult(message: string): ManualReview {
  return { passed: false, correct: 0, total: 1, percent: 0, message };
}

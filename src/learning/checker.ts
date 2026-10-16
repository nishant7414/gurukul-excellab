import { compute, type Computed } from "../engine/workbook";
import { displayValue } from "../engine/format";
import { functionsUsed } from "../engine/parser";
import { addr, cellsIn, inRange, parseAddr, parseRange } from "../engine/refs";
import { XlError, isErr, type Scalar, type WorkbookData } from "../engine/types";
import type { CellFeedback, Check, CheckResult, Exercise, FormulaCheck, InputReader, MistakeTag } from "./types";
import { cloneWb, getSheet } from "../engine/ops";

/** Reads *input* data (constants, or computed values for formula inputs) from a workbook. */
export function makeReader(wb: WorkbookData, known?: Computed): InputReader {
  const comp = known ?? compute(wb);
  return {
    get: (sheet, a) => comp.value(sheet, a),
    range: (sheet, ref) => comp.matrix(sheet, ref),
  };
}

const show = (v: Scalar) => (v === null ? "(blank)" : typeof v === "string" ? `"${v}"` : displayValue(v));

function same(actual: Scalar, expected: Scalar, tol?: number, ignoreCase?: boolean): boolean {
  if (isErr(expected)) return isErr(actual) && actual.code === expected.code;
  if (isErr(actual)) return false;
  if (expected === null || expected === "") return actual === null || actual === "";
  if (typeof expected === "number") {
    if (typeof actual !== "number") return false;
    const t = tol ?? 1e-9 * Math.max(1, Math.abs(expected));
    return Math.abs(actual - expected) <= t;
  }
  if (typeof expected === "string" && typeof actual === "string") return ignoreCase ? actual.toLowerCase() === expected.toLowerCase() : actual === expected;
  return actual === expected;
}

interface Diagnosis {
  message: string;
  hint: string;
  tag: MistakeTag;
}

const ERROR_HELP: Record<string, Diagnosis> = {
  "#N/A": { tag: "lookup-not-found", message: "The lookup did not find a match (#N/A).", hint: "Check the lookup value, that the search column is the first column of the table, and that you used an exact match (FALSE / 0) where required." },
  "#REF!": { tag: "col-index", message: "A reference points outside the data (#REF!).", hint: "If you used VLOOKUP, the column number may be larger than the number of columns in your table." },
  "#VALUE!": { tag: "function-arguments", message: "A function received the wrong kind of value (#VALUE!).", hint: "Check each argument: text where a number is expected (or the reverse), or a position that is outside the text." },
  "#NAME?": { tag: "function-arguments", message: "Excel does not recognise a name in the formula (#NAME?).", hint: "Check the spelling of the function name and that text is wrapped in double quotes." },
  "#DIV/0!": { tag: "cell-reference", message: "The formula divides by zero or by an empty cell (#DIV/0!).", hint: "Check the cell you are dividing by." },
  "#CIRC!": { tag: "cell-reference", message: "The formula refers to its own cell, directly or indirectly (circular reference).", hint: "Make sure the formula does not include the cell it is in." },
  "#SPILL!": { tag: "cell-reference", message: "The formula's result needs more room than is available (#SPILL!).", hint: "Clear the cells below/right of the formula so the results can spill." },
  "#CALC!": { tag: "other", message: "The formula produced an empty array (#CALC!).", hint: "Nothing matched your condition. Check the criteria, or supply the optional if_empty argument." },
  "#UNSUPPORTED!": { tag: "unsupported", message: "This function is not evaluated by the Gurukul ExcelLab simulator.", hint: "Use one of the supported functions listed in the Function Library for this exercise." },
  "#NUM!": { tag: "function-arguments", message: "A number is not valid for this function (#NUM!).", hint: "Check numeric arguments." },
};

function diagnose(raw: string, actual: Scalar, expected: Scalar, rangeRows: number): Diagnosis {
  const f = raw.toUpperCase();
  if (isErr(actual)) {
    const base = ERROR_HELP[actual.code] ?? { tag: "error-value" as MistakeTag, message: `The formula returns ${actual.code}.`, hint: "Read the error detail and check each argument." };
    let hint = base.hint;
    if (actual.code === "#N/A" && f.includes("VLOOKUP") && !/,\s*(FALSE|0)\s*\)\s*$/.test(f.replace(/\)+\s*$/, ")")) && /VLOOKUP\([^)]*\)/.test(f)) hint += " Your VLOOKUP might be missing the exact-match argument.";
    if (actual.code === "#N/A" && f.includes("VLOOKUP") && rangeRows > 1 && /VLOOKUP\([^,]+,\s*(?!\$)[A-Z]+\$?\d+:/.test(f)) {
      return { tag: "absolute-reference", message: "The lookup returned #N/A. Your table range is not locked, so it shifts down as the formula is filled.", hint: "Lock the table_array with $ signs (for example $B$3:$F$62) so it does not move." };
    }
    return { ...base, hint: actual.detail ? `${actual.detail} ${hint}` : hint };
  }
  if (typeof actual === "string" && typeof expected === "string") {
    if (actual.trim() === expected.trim() && actual !== expected) return { tag: "extra-spaces", message: "The text matches except for leading or trailing spaces.", hint: "Wrap the result in TRIM, or check the delimiter you used." };
    if (actual.toLowerCase() === expected.toLowerCase()) return { tag: "case", message: "The letters are right but the capitalisation differs.", hint: "Check PROPER / UPPER / LOWER, or the case-sensitivity of FIND vs SEARCH." };
  }
  if (typeof expected === "number" && typeof actual === "string" && Number(actual) === expected) return { tag: "text-number", message: "The value looks right but it is text, not a number.", hint: "Wrap with VALUE, or avoid text functions that return text when a number is needed." };
  if (typeof expected === "string" && typeof actual === "number" && String(actual) === expected) return { tag: "text-number", message: "The value looks right but it is a number, not text.", hint: "The expected result is text; use a text function or TEXT()." };
  if (typeof expected === "number" && typeof actual === "number") {
    if (Math.abs(actual - expected) < 0.01 + Math.abs(expected) * 0.001) return { tag: "rounding", message: "Very close, but not the expected value: rounding differs.", hint: "Check the number of decimal places in ROUND, or whether the exercise asks for rounding at all." };
    if (/VLOOKUP/.test(f) && /,\s*(TRUE|1)\s*\)/.test(f)) return { tag: "approximate-match", message: "Approximate match returned a different row than an exact match would.", hint: "Use FALSE (or 0) as the last argument for an exact match." };
  }
  if (/VLOOKUP/.test(f)) {
    if (!/,\s*(FALSE|0)\s*\)/.test(f)) return { tag: "approximate-match", message: "The result is not what an exact-match lookup returns.", hint: "VLOOKUP's fourth argument should be FALSE (or 0) for an exact match." };
    return { tag: "col-index", message: "The lookup found a row but returned a different column's value.", hint: "Count the columns from the left of your table_array: the first column is 1." };
  }
  if (/TEXTSPLIT|TEXTBEFORE|TEXTAFTER|SPLIT/.test(f)) return { tag: "delimiter", message: "The text was split at a different place than expected.", hint: "Check the delimiter character (including spaces) and the instance number." };
  if (/DATE|YEAR|MONTH|TEXT\(/.test(f)) return { tag: "date-format", message: "The date part or format differs from what was expected.", hint: "Check the format code (for example \"mmmm\" for a full month name) or which date function you used." };
  if (/\bLEFT|RIGHT|MID|FIND|SEARCH|LEN/.test(f)) return { tag: "function-arguments", message: "The text function returned something different from the expected result.", hint: "Check the number of characters / start position arguments." };
  return { tag: "cell-reference", message: "The result differs from the expected value.", hint: "Check that every cell reference points to the right row and column, and that relative/absolute references are right." };
}

function applyOverrides(wb: WorkbookData, sheet: string, ov: Record<string, string>) {
  for (const [k, v] of Object.entries(ov)) {
    const bang = k.lastIndexOf("!");
    const sh = getSheet(wb, bang >= 0 ? k.slice(0, bang) : sheet);
    const a = bang >= 0 ? k.slice(bang + 1) : k;
    if (sh) {
      if (v === "") delete sh.cells[a];
      else sh.cells[a] = v;
    }
  }
}

/** Computed workbooks shared by every check of one grading run (the base sheet and each perturbed copy). */
interface GradeCache {
  base: Computed;
  variants: Map<string, Computed>;
}

function runFormulaCheck(c: FormulaCheck, wb: WorkbookData, cache: GradeCache): CellFeedback[] {
  const out: CellFeedback[] = [];
  const range = parseRange(c.range)!;
  const sheet = getSheet(wb, c.sheet);
  if (!sheet) return [{ sheet: c.sheet, addr: c.range, status: "missing", message: `The worksheet "${c.sheet}" is missing.`, checkLabel: c.label, tag: "missing-input" }];
  const comp = cache.base;
  const expected = c.expected(makeReader(wb, comp));
  const rows = range.r2 - range.r1 + 1;
  const needFormula = c.requireFormula !== false;
  // pre-compute perturbed variants
  const variants = (c.perturb ?? []).map((ov) => {
    const key = `${c.sheet}|${JSON.stringify(ov)}`;
    let vc = cache.variants.get(key);
    let w: WorkbookData | null = null;
    if (!vc) {
      w = cloneWb(wb);
      applyOverrides(w, c.sheet, ov);
      vc = compute(w);
      cache.variants.set(key, vc);
    }
    return { comp: vc, expected: c.expected(makeReader(w ?? wb, vc)) };
  });
  for (let r = range.r1; r <= range.r2; r++) {
    for (let col = range.c1; col <= range.c2; col++) {
      const a = addr(col, r);
      let raw = sheet.cells[a] ?? "";
      const exp = expected[r - range.r1]?.[col - range.c1] ?? null;
      const cr = comp.cell(c.sheet, a);
      // a cell filled by a dynamic-array spill counts as produced by its anchor formula
      if (raw === "" && cr.spilledFrom) {
        const bang = cr.spilledFrom.lastIndexOf("!");
        raw = getSheet(wb, cr.spilledFrom.slice(0, bang))?.cells[cr.spilledFrom.slice(bang + 1)] ?? "";
      }
      const fb = (status: CellFeedback["status"], message: string, extra: Partial<CellFeedback> = {}): CellFeedback => ({
        sheet: c.sheet, addr: a, status, formula: raw || undefined, expected: show(exp), message, checkLabel: c.label, ...extra,
      });
      if (raw === "" && (exp === null || exp === "")) {
        out.push(fb("correct", "Correct (this cell should stay empty).", { actual: "(blank)" }));
        continue;
      }
      if (raw === "") {
        out.push(fb("missing", "This cell is empty.", { actual: "(blank)", hint: "Enter your formula in this cell.", tag: "missing-input" }));
        continue;
      }
      const act = comp.value(c.sheet, a);
      if (needFormula && !raw.startsWith("=")) {
        out.push(fb("hardcoded", "A typed value was entered, but this exercise needs a formula.", { actual: show(act), hint: "Start with = and build the answer from the cells in the table, so it still works if the data changes.", tag: "hardcoded" }));
        continue;
      }
      if (raw.startsWith("=")) {
        const used = functionsUsed(raw);
        const bad = (c.forbiddenFunctions ?? []).filter((f) => used.includes(f));
        if (bad.length) {
          out.push(fb("forbidden-function", `This exercise does not allow ${bad.join(", ")}.`, { actual: show(act), hint: "Use the function the lesson is teaching.", tag: "wrong-function" }));
          continue;
        }
        const missing = (c.requiredFunctions ?? []).filter((g) => !g.some((f) => used.includes(f)));
        if (missing.length) {
          out.push(fb("wrong-function", `This exercise requires ${missing.map((g) => g.join(" or ")).join(" and ")}.`, { actual: show(act), hint: `Rewrite the formula using ${missing[0].join(" or ")}.`, tag: "wrong-function" }));
          continue;
        }
      }
      if (!same(act, exp, c.tolerance, c.ignoreCase)) {
        const d = diagnose(raw, act, exp, rows);
        out.push(fb(isErr(act) ? "error" : "wrong", d.message, { actual: show(act), hint: d.hint, tag: d.tag }));
        continue;
      }
      // anti-hardcoding: the same formula must be right on changed inputs
      let general = true;
      for (const v of variants) {
        const e2 = v.expected[r - range.r1]?.[col - range.c1] ?? null;
        const a2 = v.comp.value(c.sheet, a);
        if (!same(a2, e2, c.tolerance, c.ignoreCase)) {
          general = false;
          out.push(fb("not-general", `The answer is correct now, but it breaks when the input data changes (it gave ${show(a2)} where ${show(e2)} was expected).`, { actual: show(act), hint: "Point to the data cells instead of typing part of the answer into the formula.", tag: "not-general" }));
          break;
        }
      }
      if (general) out.push(fb("correct", "Correct.", { actual: show(act) }));
    }
  }
  return out;
}

function runChecks(ex: Exercise, wb: WorkbookData): CellFeedback[] {
  const fbs: CellFeedback[] = [];
  const comp = compute(wb);
  const cache: GradeCache = { base: comp, variants: new Map() };
  for (const c of ex.checks as Check[]) {
    if (c.type === "formula") fbs.push(...runFormulaCheck(c, wb, cache));
    else if (c.type === "values") {
      const range = parseRange(c.range)!;
      for (let r = range.r1; r <= range.r2; r++)
        for (let col = range.c1; col <= range.c2; col++) {
          const a = addr(col, r);
          const exp = c.expected[r - range.r1]?.[col - range.c1] ?? null;
          let act = comp.value(c.sheet, a);
          const base = { sheet: c.sheet, addr: a, expected: show(exp), checkLabel: c.label };
          if (c.trim && typeof act === "string") act = act.trim();
          if (same(act, exp)) fbs.push({ ...base, status: "correct", actual: show(act), message: "Correct." });
          else if (act === null) fbs.push({ ...base, status: "missing", actual: "(blank)", message: "This cell is empty but should contain a value.", hint: "Check that you applied the operation to the whole range and chose the right destination.", tag: "operation-result" });
          else {
            const d = typeof act === "string" && typeof exp === "string" && act.trim() === exp.trim() ? { tag: "extra-spaces" as MistakeTag, message: "Matches except for leading/trailing spaces.", hint: "Clean the spaces (TRIM) or choose the delimiter more carefully." } : { tag: "operation-result" as MistakeTag, message: "This value is not what the operation should produce here.", hint: "Check the source range, the destination and the delimiter/options you chose." };
            fbs.push({ ...base, status: "wrong", actual: show(act), ...d });
          }
        }
    } else if (c.type === "visibleRows") {
      const sh = getSheet(wb, c.sheet)!;
      const range = parseRange(c.range)!;
      const key = parseAddr(c.keyCol + "1")!.col;
      const visible: Scalar[] = [];
      for (let r = range.r1; r <= range.r2; r++) if (!sh.hiddenRows.includes(r)) visible.push(comp.value(c.sheet, addr(key, r)));
      const ok = visible.length === c.expected.length && visible.every((v, i) => same(v, c.expected[i]));
      fbs.push({
        sheet: c.sheet, addr: c.range, checkLabel: c.label, status: ok ? "correct" : "wrong", tag: ok ? undefined : "operation-result",
        actual: `[${visible.map(show).join(", ")}]`, expected: `[${c.expected.map(show).join(", ")}]`,
        message: ok ? "Correct." : "The visible rows do not match the expected result in content or order.",
        hint: ok ? undefined : "Re-check the column, the condition and the sort direction you applied.",
      });
    } else if (c.type === "records") {
      const sh = getSheet(wb, c.sheet)!;
      const [r1, r2] = c.rows.split(":").map(Number);
      for (let r = r1; r <= (r2 || r1); r++) {
        const get = (col: string) => comp.value(c.sheet, `${col}${r}`);
        for (const col of c.columns) {
          const a = `${col.col}${r}`;
          const raw = sh.cells[a] ?? "";
          const v = get(col.col);
          const base = { sheet: c.sheet, addr: a, checkLabel: c.label, formula: raw.startsWith("=") ? raw : undefined };
          if (raw === "") { fbs.push({ ...base, status: "missing", actual: "(blank)", expected: `${col.name} is required`, message: `${col.name} is mandatory but empty.`, hint: "Complete every field of the record.", tag: "missing-input" }); continue; }
          if (col.kind === "text") {
            const ok = typeof v === "string" && v.trim() !== "" && isNaN(Number(v));
            fbs.push(ok ? { ...base, status: "correct", actual: show(v), message: "Correct." } : { ...base, status: "wrong", actual: show(v), expected: `${col.name}: text`, message: `${col.name} should be text.`, hint: "Names are text. Check you typed it in the right column.", tag: "text-number" });
          } else if (col.kind === "number") {
            const ok = typeof v === "number" && v >= (col.min ?? -Infinity);
            fbs.push(ok ? { ...base, status: "correct", actual: show(v), message: "Correct." } : { ...base, status: "wrong", actual: show(v), expected: `${col.name}: a number${col.min !== undefined ? ` ≥ ${col.min}` : ""}`, message: `${col.name} should be a number.`, hint: typeof v === "string" ? "This looks like text. Type the number without quotes or an apostrophe." : "Check the value.", tag: "text-number" });
          } else {
            const exp = col.calc!(get);
            const ok = raw.startsWith("=") && typeof v === "number" && Math.abs(v - exp) < 1e-9;
            fbs.push(ok ? { ...base, status: "correct", actual: show(v), message: "Correct." } : !raw.startsWith("=") ? { ...base, status: "hardcoded", actual: show(v), expected: show(exp), message: `${col.name} must be calculated with a formula.`, hint: "Use a formula such as =F6-G6.", tag: "hardcoded" } : { ...base, status: "wrong", actual: show(v), expected: show(exp), message: `${col.name} has the wrong value.`, hint: "Subtract the deposit from the total fee.", tag: "cell-reference" });
          }
        }
        const problem = c.rowRule?.(get);
        if (problem) fbs.push({ sheet: c.sheet, addr: `${c.columns[0].col}${r}`, checkLabel: c.label, status: "wrong", message: problem, hint: "Check the relationship between the fields.", tag: "other" });
      }
    } else if (c.type === "formulaText") {
      const sh = getSheet(wb, c.sheet)!;
      const raw = sh.cells[c.cell] ?? "";
      const ok = new RegExp(c.pattern, "i").test(raw);
      fbs.push({
        sheet: c.sheet, addr: c.cell, checkLabel: c.label, status: ok ? "correct" : raw ? "wrong" : "missing", formula: raw || undefined,
        actual: raw || "(blank)", expected: "A FILTERXML formula with an XML string and an XPath string",
        message: ok ? "The formula has the right shape. (Shape-checked only: Gurukul ExcelLab does not evaluate FILTERXML.)" : c.message,
        hint: ok ? undefined : "Use =FILTERXML(xml_text, xpath) where xpath starts with //.", tag: ok ? undefined : "function-arguments",
      });
    }
  }
  return fbs;
}

function lockedChanges(ex: Exercise, wb: WorkbookData): CellFeedback[] {
  if (!ex.editable.length) return [];
  const init = ex.workbook();
  const editable = ex.editable.map((e) => {
    const r = parseRange(e)!;
    return { ...r, sheet: r.sheet ?? ex.activeSheet };
  });
  const out: CellFeedback[] = [];
  for (const s of init.sheets) {
    const cur = getSheet(wb, s.name);
    const keys = new Set([...Object.keys(s.cells), ...Object.keys(cur?.cells ?? {})]);
    for (const k of keys) {
      const isEditable = editable.some((e) => e.sheet.toLowerCase() === s.name.toLowerCase() && inRange(k, e));
      if (isEditable) continue;
      if ((s.cells[k] ?? "") !== (cur?.cells[k] ?? ""))
        out.push({ sheet: s.name, addr: k, status: "locked-changed", checkLabel: "Protected cells", message: "This cell is part of the provided data and was changed.", hint: "Restore the original value; only edit the highlighted answer cells.", tag: "cell-reference", actual: cur?.cells[k] ?? "(blank)", expected: s.cells[k] ?? "(blank)" });
    }
  }
  return out;
}

export function checkExercise(ex: Exercise, wb: WorkbookData): CheckResult {
  const fb = [...runChecks(ex, wb), ...lockedChanges(ex, wb)];
  const correct = fb.filter((f) => f.status === "correct").length;
  const total = fb.filter((f) => f.status !== "locked-changed").length;
  const passed = fb.length > 0 && fb.every((f) => f.status === "correct");
  const bad = fb.filter((f) => f.status !== "correct");
  const tags = [...new Set(bad.map((f) => f.tag).filter(Boolean))] as MistakeTag[];
  const summary = passed ? "All checks passed." : `${correct} of ${total} checked cells are correct${bad.some((b) => b.status === "locked-changed") ? "; protected cells were changed" : ""}.`;
  return { passed, correct, total, feedback: fb, summary, tags };
}

/** Apply a Solution (reference answer) to a fresh copy of the exercise workbook. */
export function applySolution(ex: Exercise, wb: WorkbookData = ex.workbook()): WorkbookData {
  const w = cloneWb(wb);
  for (const [k, v] of Object.entries(ex.solution.cells)) {
    const bang = k.lastIndexOf("!");
    const sh = getSheet(w, bang >= 0 ? k.slice(0, bang) : ex.activeSheet);
    const a = bang >= 0 ? k.slice(bang + 1) : k;
    if (!sh) continue;
    if (v === "") delete sh.cells[a];
    else sh.cells[a] = v;
  }
  if (ex.solution.hiddenRows) getSheet(w, ex.activeSheet)!.hiddenRows = [...ex.solution.hiddenRows];
  return w;
}

export { cellsIn, XlError };

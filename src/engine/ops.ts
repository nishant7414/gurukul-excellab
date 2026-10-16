import type { CellFormat, Scalar, SheetData, WorkbookData } from "./types";
import { isErr } from "./types";
import { addr, cellsIn, numToCol, parseAddr, parseRange, type RangeRef } from "./refs";
import { shiftFormula } from "./parser";
import { type Computed, parseInput, toRaw } from "./workbook";
import { MONTHS, DAYS, parseISODate, ymd } from "./dates";
import { compareValues } from "./core";

export const cloneWb = (wb: WorkbookData): WorkbookData => structuredClone(wb);
export const getSheet = (wb: WorkbookData, name: string) => wb.sheets.find((s) => s.name.toLowerCase() === name.toLowerCase());

/* =============================== clipboard =============================== */
export interface ClipCell {
  raw: string;
  value: Scalar;
  fmt?: CellFormat;
}
export interface Clip {
  sheet: string;
  range: RangeRef;
  rows: number;
  cols: number;
  cells: ClipCell[][];
  cut: boolean;
}
export function copyRange(wb: WorkbookData, comp: Computed, sheet: string, range: RangeRef, cut = false): Clip {
  const sh = getSheet(wb, sheet)!;
  const cells: ClipCell[][] = [];
  for (let r = range.r1; r <= range.r2; r++) {
    const row: ClipCell[] = [];
    for (let c = range.c1; c <= range.c2; c++) {
      const a = addr(c, r);
      row.push({ raw: sh.cells[a] ?? "", value: comp.value(sheet, a), fmt: sh.formats[a] });
    }
    cells.push(row);
  }
  return { sheet, range, rows: cells.length, cols: cells[0].length, cells, cut };
}
export type PasteMode = "all" | "values" | "formulas" | "transpose" | "formats";

/** Paste into `sheet` at (col,row). Returns list of destination addresses written. */
export function pasteClip(sh: SheetData, clip: Clip, col: number, row: number, mode: PasteMode): string[] {
  const written: string[] = [];
  const t = mode === "transpose";
  const rows = t ? clip.cols : clip.rows;
  const cols = t ? clip.rows : clip.cols;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const src = t ? clip.cells[c][r] : clip.cells[r][c];
      const a = addr(col + c, row + r);
      if (mode === "formats") {
        if (src.fmt) sh.formats[a] = { ...src.fmt };
        else delete sh.formats[a];
        written.push(a);
        continue;
      }
      let raw: string;
      if (mode === "values" || mode === "transpose") {
        // Transpose pastes results, not formulas (documented simulator limitation)
        raw = src.raw.startsWith("=") ? toRaw(src.value) : src.raw;
      } else {
        // plain paste: formulas move like a copy (relative references shift by the paste offset)
        const srcR = clip.range.r1 + r, srcC = clip.range.c1 + c;
        raw = src.raw.startsWith("=") ? shiftFormula(src.raw, row + r - srcR, col + c - srcC) : src.raw;
      }
      if (raw === "") delete sh.cells[a];
      else sh.cells[a] = raw;
      if (src.fmt && mode !== "values") sh.formats[a] = { ...src.fmt };
      written.push(a);
    }
  return written;
}
export function clearRange(sh: SheetData, range: RangeRef) {
  for (const a of cellsIn(range)) delete sh.cells[a];
}

/* ============================ Text to Columns ============================ */
export interface T2COptions {
  delimiters: string[]; // e.g. [","], [" "], ["\t"], [";"], or any custom single/multi-char
  treatConsecutiveAsOne: boolean;
  qualifier: '"' | "'" | "";
}
export function splitText(text: string, o: T2COptions): string[] {
  const ds = o.delimiters.filter((d) => d !== "");
  if (!ds.length) return [text];
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  let i = 0;
  let lastWasDelim = false;
  while (i < text.length) {
    const ch = text[i];
    if (o.qualifier && ch === o.qualifier) {
      if (inQ && text[i + 1] === o.qualifier) {
        cur += ch;
        i += 2;
        continue;
      }
      inQ = !inQ;
      i++;
      continue;
    }
    if (!inQ) {
      const d = ds.find((x) => text.startsWith(x, i));
      if (d) {
        if (!(o.treatConsecutiveAsOne && lastWasDelim)) out.push(cur);
        cur = "";
        lastWasDelim = true;
        i += d.length;
        continue;
      }
    }
    lastWasDelim = false;
    cur += ch;
    i++;
  }
  out.push(cur);
  return out;
}
export interface T2CPlan {
  parts: string[][];
  width: number;
  destination: RangeRef;
  /** non-empty destination cells that would be overwritten (Excel warns about this) */
  conflicts: string[];
}
export function planTextToColumns(sh: SheetData, comp: Computed, sheet: string, src: RangeRef, destCell: string, o: T2COptions): T2CPlan {
  const d = parseAddr(destCell);
  if (!d) throw new Error("Invalid destination cell");
  if (src.c1 !== src.c2) throw new Error("Text to Columns works on one column at a time. Select a single column.");
  const parts: string[][] = [];
  for (let r = src.r1; r <= src.r2; r++) {
    const v = comp.value(sheet, addr(src.c1, r));
    parts.push(v === null ? [] : splitText(isErr(v) ? v.code : String(v), o));
  }
  const width = Math.max(1, ...parts.map((p) => p.length));
  const destination: RangeRef = { c1: d.col, r1: d.row, c2: d.col + width - 1, r2: d.row + parts.length - 1 };
  const conflicts: string[] = [];
  parts.forEach((p, ri) => {
    for (let c = 0; c < p.length; c++) {
      const a = addr(d.col + c, d.row + ri);
      if ((sh.cells[a] ?? "") !== "" && !(d.col + c === src.c1 && d.row + ri === src.r1 + ri)) conflicts.push(a);
    }
  });
  return { parts, width, destination, conflicts };
}
export function applyTextToColumns(sh: SheetData, plan: T2CPlan) {
  plan.parts.forEach((p, ri) => {
    p.forEach((v, c) => {
      const a = addr(plan.destination.c1 + c, plan.destination.r1 + ri);
      if (v === "") delete sh.cells[a];
      else sh.cells[a] = isNumericText(v) ? v : v; // numbers become numbers, like Excel's General format
    });
  });
}
const isNumericText = (v: string) => parseInput(v).kind === "value" && typeof (parseInput(v) as { value: Scalar }).value === "number";

/* ================================ AutoFill ================================ */
export interface FillCell {
  raw: string;
  fmt?: CellFormat;
}
function splitTrailingNumber(s: string) {
  const m = /^(.*?)(\d+)$/.exec(s);
  return m ? { prefix: m[1], num: Number(m[2]), width: m[2].length, padded: m[2].startsWith("0") && m[2].length > 1 } : null;
}
function matchList(list: string[], abbr: string[], s: string) {
  const i = list.findIndex((x) => x.toLowerCase() === s.toLowerCase());
  if (i >= 0) return { list, i };
  const j = abbr.findIndex((x) => x.toLowerCase() === s.toLowerCase());
  return j >= 0 ? { list: abbr, i: j } : null;
}
const caseLike = (like: string, s: string) => (like === like.toUpperCase() ? s.toUpperCase() : like === like.toLowerCase() ? s.toLowerCase() : s);

/**
 * Generate `count` further raw values continuing the pattern in `src` (one row or column of cells), as Excel's fill handle would.
 * Describes the pattern it detected so the UI can explain it.
 */
export function fillSeries(src: FillCell[], count: number, reverse = false): { raws: string[]; fmts: (CellFormat | undefined)[]; pattern: string } {
  const n = src.length;
  const order = reverse ? [...src].reverse() : src;
  const raws: string[] = [];
  const fmts = Array.from({ length: count }, (_, k) => order[k % n].fmt);
  const sign = reverse ? -1 : 1;
  const vals = order.map((c) => parseInput(c.raw));
  // formulas: copy pattern
  if (vals.some((v) => v.kind === "formula")) {
    for (let k = 0; k < count; k++) {
      const c = order[k % n];
      raws.push(c.raw.startsWith("=") ? c.raw : c.raw); // direction shifting handled by caller (needs row/col delta)
    }
    return { raws, fmts, pattern: "Formulas are copied; relative references shift with each cell." };
  }
  const nums = vals.map((v) => (v.kind === "value" && typeof v.value === "number" ? v.value : null));
  const isDateFmt = order.every((c) => c.fmt?.nf === "date");
  if (nums.every((x) => x !== null)) {
    const ys = (nums as number[]).map((x) => x);
    if (n === 1) {
      if (isDateFmt) {
        for (let k = 1; k <= count; k++) raws.push(String(ys[0] + k * sign));
        return { raws, fmts, pattern: "A single date is extended one day at a time." };
      }
      for (let k = 0; k < count; k++) raws.push(String(ys[0]));
      return { raws, fmts, pattern: "A single number is copied (Excel only creates a series if you use Ctrl or give two values)." };
    }
    // linear trend (Excel uses a linear fit of the selected cells)
    const xs = ys.map((_, i) => i);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    for (let k = 0; k < count; k++) {
      const v = my + slope * (n + k - mx);
      raws.push(String(Math.round(v * 1e9) / 1e9));
    }
    return { raws, fmts, pattern: `A linear series with step ${Math.round(slope * 1e6) / 1e6} was detected.` };
  }
  // text: lists
  const texts = vals.map((v) => (v.kind === "value" && typeof v.value === "string" ? v.value : null));
  if (texts.every((t) => t !== null)) {
    const t0 = texts[0] as string;
    const m = matchList(MONTHS, MONTHS.map((x) => x.slice(0, 3)), t0) ?? matchList(DAYS, DAYS.map((x) => x.slice(0, 3)), t0);
    if (m) {
      let step = 1;
      if (n >= 2) {
        const m2 = m.list.findIndex((x) => x.toLowerCase() === (texts[1] as string).toLowerCase());
        if (m2 >= 0) step = (((m2 - m.i) % m.list.length) + m.list.length) % m.list.length || 1;
      }
      // with 2+ cells the step already encodes direction (src was reversed above); with one cell use the drag direction
      const dir = n === 1 ? sign : 1;
      for (let k = 0; k < count; k++) {
        const pos = m.i + (n + k) * step * dir;
        raws.push(caseLike(t0, m.list[((pos % m.list.length) + m.list.length) % m.list.length]));
      }
      return { raws, fmts, pattern: "A built-in list (month or weekday names) was recognised and continued." };
    }
    const tn = splitTrailingNumber(t0);
    if (tn) {
      let step = 1;
      if (n >= 2) {
        const t1 = splitTrailingNumber(texts[1] as string);
        if (t1 && t1.prefix === tn.prefix) step = t1.num - tn.num;
      }
      for (let k = 0; k < count; k++) {
        const num = tn.num + (n + k) * step * (n === 1 ? sign : 1);
        const s = String(num).padStart(tn.padded ? tn.width : 0, "0");
        raws.push(toRaw(tn.prefix + s));
      }
      return { raws, fmts, pattern: `Text ending in a number ("${t0}") was continued with step ${step}.` };
    }
  }
  for (let k = 0; k < count; k++) raws.push(order[k % n].raw);
  return { raws, fmts, pattern: "No series pattern found, so the selected cells are repeated." };
}

/** Apply a fill-handle drag. `src` is the selected range, `target` the extra cells (adjacent, below/right/above/left). */
export function autoFillRange(sh: SheetData, src: RangeRef, to: { c2?: number; r2?: number; c1?: number; r1?: number }): { pattern: string; written: string[] } {
  const written: string[] = [];
  let pattern = "";
  const vertical = to.r2 !== undefined || to.r1 !== undefined;
  const reverse = (to.r1 !== undefined && to.r1 < src.r1) || (to.c1 !== undefined && to.c1 < src.c1);
  if (vertical) {
    const count = reverse ? src.r1 - (to.r1 as number) : (to.r2 as number) - src.r2;
    if (count <= 0) return { pattern: "", written };
    for (let c = src.c1; c <= src.c2; c++) {
      const cells: FillCell[] = [];
      for (let r = src.r1; r <= src.r2; r++) cells.push({ raw: sh.cells[addr(c, r)] ?? "", fmt: sh.formats[addr(c, r)] });
      const res = fillSeries(cells, count, reverse);
      pattern = res.pattern;
      for (let k = 0; k < count; k++) {
        const row = reverse ? src.r1 - 1 - k : src.r2 + 1 + k;
        const a = addr(c, row);
        if (row < 1) continue;
        let raw = res.raws[k];
        if (raw.startsWith("=")) {
          const origin = cells[reverse ? (cells.length - 1 - (k % cells.length)) : k % cells.length];
          const originRow = reverse ? src.r2 - (k % cells.length) : src.r1 + (k % cells.length);
          raw = shiftFormula(origin.raw, row - originRow, 0);
        }
        if (raw === "") delete sh.cells[a];
        else sh.cells[a] = raw;
        if (res.fmts[k]) sh.formats[a] = { ...(res.fmts[k] as CellFormat) };
        written.push(a);
      }
    }
  } else {
    const count = reverse ? src.c1 - (to.c1 as number) : (to.c2 as number) - src.c2;
    if (count <= 0) return { pattern: "", written };
    for (let r = src.r1; r <= src.r2; r++) {
      const cells: FillCell[] = [];
      for (let c = src.c1; c <= src.c2; c++) cells.push({ raw: sh.cells[addr(c, r)] ?? "", fmt: sh.formats[addr(c, r)] });
      const res = fillSeries(cells, count, reverse);
      pattern = res.pattern;
      for (let k = 0; k < count; k++) {
        const col = reverse ? src.c1 - 1 - k : src.c2 + 1 + k;
        if (col < 1) continue;
        const a = addr(col, r);
        let raw = res.raws[k];
        if (raw.startsWith("=")) {
          const origin = cells[reverse ? (cells.length - 1 - (k % cells.length)) : k % cells.length];
          const originCol = reverse ? src.c2 - (k % cells.length) : src.c1 + (k % cells.length);
          raw = shiftFormula(origin.raw, 0, col - originCol);
        }
        if (raw === "") delete sh.cells[a];
        else sh.cells[a] = raw;
        if (res.fmts[k]) sh.formats[a] = { ...(res.fmts[k] as CellFormat) };
        written.push(a);
      }
    }
  }
  return { pattern, written };
}

/* ================================ Flash Fill ================================ */
export interface FlashResult {
  pattern: string;
  filled: Record<string, string>;
}
type Transform = { name: string; apply: (inputs: string[]) => string | null };

const monthName = (s: string) => {
  const n = parseISODate(s) ?? (isFinite(Number(s)) && s.trim() !== "" ? Number(s) : null);
  return n === null ? null : ymd(n);
};
function candidateTransforms(nInputs: number): Transform[] {
  const T: Transform[] = [];
  for (let k = 0; k < nInputs; k++) {
    const get = (i: string[]) => i[k] ?? "";
    for (const [dn, d] of [["space", " "], ["comma", ","], ["hyphen", "-"], ["underscore", "_"], ["dot", "."], ["@", "@"], ["slash", "/"]] as const) {
      T.push({ name: `text before the first ${dn} in input ${k + 1}`, apply: (i) => (get(i).includes(d) ? get(i).slice(0, get(i).indexOf(d)) : get(i)) });
      T.push({ name: `text after the first ${dn} in input ${k + 1}`, apply: (i) => (get(i).includes(d) ? get(i).slice(get(i).indexOf(d) + d.length) : null) });
      T.push({ name: `text after the last ${dn} in input ${k + 1}`, apply: (i) => (get(i).includes(d) ? get(i).slice(get(i).lastIndexOf(d) + d.length) : null) });
    }
    T.push({ name: `trimmed first word of input ${k + 1}`, apply: (i) => get(i).trim().split(/\s+/)[0] ?? null });
    T.push({ name: `last word of input ${k + 1}`, apply: (i) => get(i).trim().split(/\s+/).slice(-1)[0] ?? null });
    T.push({ name: `initials of input ${k + 1}`, apply: (i) => get(i).trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("") });
    T.push({ name: `UPPERCASE of input ${k + 1}`, apply: (i) => get(i).toUpperCase() });
    T.push({ name: `lowercase of input ${k + 1}`, apply: (i) => get(i).toLowerCase() });
    T.push({ name: `Proper Case of input ${k + 1}`, apply: (i) => get(i).toLowerCase().replace(/[^\W\d_]+/gu, (w) => w[0].toUpperCase() + w.slice(1)) });
    T.push({ name: `the year of the date in input ${k + 1}`, apply: (i) => { const d = monthName(get(i)); return d ? String(d.y) : null; } });
    T.push({ name: `the month number of the date in input ${k + 1}`, apply: (i) => { const d = monthName(get(i)); return d ? String(d.m) : null; } });
    T.push({ name: `the month name of the date in input ${k + 1}`, apply: (i) => { const d = monthName(get(i)); return d ? MONTHS[d.m - 1] : null; } });
    T.push({ name: `the day of the date in input ${k + 1}`, apply: (i) => { const d = monthName(get(i)); return d ? String(d.d) : null; } });
    for (const n of [1, 2, 3, 4, 5]) {
      T.push({ name: `first ${n} characters of input ${k + 1}`, apply: (i) => get(i).slice(0, n) });
      T.push({ name: `last ${n} characters of input ${k + 1}`, apply: (i) => (get(i).length >= n ? get(i).slice(-n) : null) });
    }
  }
  if (nInputs >= 2) {
    for (const sep of [" ", ", ", "-", " - ", ".", "_", "", ","]) {
      for (const [a, b] of nInputs === 2 ? [[0, 1], [1, 0]] : [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]])
        T.push({ name: `input ${a + 1} + "${sep}" + input ${b + 1}`, apply: (i) => (i[a] !== undefined && i[b] !== undefined ? i[a] + sep + i[b] : null) });
    }
  }
  return T;
}
/**
 * SIMULATION of Excel's Flash Fill: given example outputs typed in the output column, infer a simple rule from a built-in library of
 * transformations and apply it to the remaining rows. Native Excel Flash Fill uses a far richer program-synthesis engine.
 */
export function flashFill(sh: SheetData, comp: Computed, sheet: string, outCol: number, inputCols: number[], firstRow: number, lastRow: number): FlashResult | { error: string } {
  const rowsInfo: { row: number; inputs: string[]; example: string | null }[] = [];
  for (let r = firstRow; r <= lastRow; r++) {
    const inputs = inputCols.map((c) => {
      const v = comp.value(sheet, addr(c, r));
      return v === null ? "" : isErr(v) ? v.code : String(v);
    });
    const ex = sh.cells[addr(outCol, r)];
    rowsInfo.push({ row: r, inputs, example: ex !== undefined && ex !== "" ? (ex.startsWith("'") ? ex.slice(1) : ex) : null });
  }
  const examples = rowsInfo.filter((r) => r.example !== null && r.inputs.some((x) => x !== ""));
  if (!examples.length) return { error: "Flash Fill needs at least one example. Type the result you want for the first row, then run Flash Fill again." };
  const transforms = candidateTransforms(inputCols.length);
  const hit = transforms.find((t) => examples.every((e) => t.apply(e.inputs) === e.example));
  if (!hit) return { error: "Flash Fill could not recognise a pattern from your example(s). Try giving a second example that makes the pattern clearer." };
  const filled: Record<string, string> = {};
  for (const r of rowsInfo) {
    if (r.example !== null || r.inputs.every((x) => x === "")) continue;
    const out = hit.apply(r.inputs);
    // like Excel's General format, digits-only results become numbers; protect anything that would be read as a formula
    if (out !== null) filled[addr(outCol, r.row)] = out.startsWith("=") || out.startsWith("'") ? "'" + out : out;
  }
  return { pattern: `Detected pattern: ${hit.name}`, filled };
}

/**
 * Flash Fill as the UI runs it: the active cell is the output column; the up-to-two non-empty columns to its left are the inputs;
 * the block of input rows around the active row is used and typed examples in the output column teach the pattern.
 * The first row of the block may be a header, so it is tried with and without.
 */
export function flashFillAt(sh: SheetData, comp: Computed, sheet: string, col: number, row: number): FlashResult | { error: string } {
  const inputs: number[] = [];
  for (const c of [col - 2, col - 1]) if (c >= 1 && comp.cell(sheet, addr(c, row)).value !== null) inputs.push(c);
  if (!inputs.length) return { error: "Flash Fill needs data in the column(s) to the left of the cell you typed the example in." };
  const hasIn = (r: number) => inputs.some((c) => comp.cell(sheet, addr(c, r)).value !== null);
  let top = row; while (top > 1 && hasIn(top - 1)) top--;
  let last = row; while (hasIn(last + 1)) last++;
  let res = flashFill(sh, comp, sheet, col, inputs, top, last);
  if ("error" in res && top < row) res = flashFill(sh, comp, sheet, col, inputs, top + 1, last);
  return res;
}

/* ============================ Sort and filter ============================ */
export function sortRange(sh: SheetData, comp: Computed, sheet: string, range: RangeRef, keyCol: number, desc: boolean, hasHeader: boolean) {
  const start = hasHeader ? range.r1 + 1 : range.r1;
  const rows: { r: number; key: Scalar; raws: string[]; fmts: (CellFormat | undefined)[] }[] = [];
  for (let r = start; r <= range.r2; r++) {
    const raws: string[] = [];
    const fmts: (CellFormat | undefined)[] = [];
    for (let c = range.c1; c <= range.c2; c++) {
      raws.push(sh.cells[addr(c, r)] ?? "");
      fmts.push(sh.formats[addr(c, r)]);
    }
    rows.push({ r, key: comp.value(sheet, addr(keyCol, r)), raws, fmts });
  }
  const sorted = [...rows].sort((a, b) => {
    const ab = a.key === null, bb = b.key === null;
    if (ab || bb) return ab === bb ? a.r - b.r : ab ? 1 : -1; // blanks always last
    const cmp = compareValues(a.key, b.key);
    return (desc ? -cmp : cmp) || a.r - b.r;
  });
  sorted.forEach((row, i) => {
    const target = start + i;
    row.raws.forEach((raw, ci) => {
      const a = addr(range.c1 + ci, target);
      const moved = raw.startsWith("=") ? shiftFormula(raw, target - row.r, 0) : raw;
      if (moved === "") delete sh.cells[a];
      else sh.cells[a] = moved;
      if (row.fmts[ci]) sh.formats[a] = { ...(row.fmts[ci] as CellFormat) };
      else delete sh.formats[a];
    });
  });
}

export type FilterOp = "=" | "<>" | ">" | "<" | ">=" | "<=" | "contains" | "begins" | "ends";
export function filterRows(sh: SheetData, comp: Computed, sheet: string, range: RangeRef, keyCol: number, op: FilterOp, operand: string, hasHeader: boolean) {
  const start = hasHeader ? range.r1 + 1 : range.r1;
  const hidden = new Set(sh.hiddenRows);
  const num = operand.trim() !== "" && !isNaN(Number(operand)) ? Number(operand) : null;
  for (let r = start; r <= range.r2; r++) {
    const v = comp.value(sheet, addr(keyCol, r));
    const s = v === null ? "" : String(v).toLowerCase();
    const o = operand.toLowerCase();
    let keep: boolean;
    switch (op) {
      case "=": keep = num !== null && typeof v === "number" ? v === num : s === o; break;
      case "<>": keep = num !== null && typeof v === "number" ? v !== num : s !== o; break;
      case ">": keep = typeof v === "number" && num !== null && v > num; break;
      case "<": keep = typeof v === "number" && num !== null && v < num; break;
      case ">=": keep = typeof v === "number" && num !== null && v >= num; break;
      case "<=": keep = typeof v === "number" && num !== null && v <= num; break;
      case "contains": keep = s.includes(o); break;
      case "begins": keep = s.startsWith(o); break;
      default: keep = s.endsWith(o);
    }
    if (keep) hidden.delete(r);
    else hidden.add(r);
  }
  sh.hiddenRows = [...hidden].sort((a, b) => a - b);
}
export const clearFilter = (sh: SheetData) => {
  sh.hiddenRows = [];
};

export function parseRangeStrict(s: string): RangeRef {
  const r = parseRange(s);
  if (!r) throw new Error(`"${s}" is not a valid range`);
  return r;
}
export { numToCol };

import type { CellFormat, NumberFormat, Scalar, SheetData, WorkbookData } from "../engine/types";
import { toRaw } from "../engine/workbook";
import { addr, colToNum, numToCol } from "../engine/refs";
import { makeRng } from "../datasets/rng";
import { dataset } from "../datasets/registry";
import { datasetSheet } from "../datasets/sheet";
import type { Dataset } from "../datasets/types";
import type { Check, Difficulty, Exercise, FormulaCheck, InputReader } from "../learning/types";
import type { Answer, CellsTask, ChallengeDef, ColTask, Ctx, GridTask, InputTask, PanelTask, PracticeChallenge, RawTask, Row, Task, TblInfo, X } from "./types";

const TIER_DIFFICULTY: Record<string, Difficulty> = { Easy: "Beginner", Medium: "Intermediate", Hard: "Advanced" };

export function tblInfo(ds: Dataset): TblInfo {
  const L = (key: string) => {
    const i = ds.columns.findIndex((c) => c.key === key);
    if (i < 0) throw new Error(`${ds.id} has no column "${key}"`);
    return numToCol(i + 1);
  };
  const n = ds.rowCount;
  const lastCol = numToCol(ds.columns.length);
  return { id: ds.id, alias: ds.alias, sheet: ds.sheet, n, first: 2, last: n + 1, L, rng: (key) => `$${L(key)}$2:$${L(key)}$${n + 1}`, all: `A2:${lastCol}${n + 1}` };
}

const rowsFromMatrix = (ds: Dataset, m: Scalar[][]): Row[] => m.map((r) => Object.fromEntries(ds.columns.map((c, i) => [c.key, r[i] ?? null])));

interface Assembled {
  datasets: Dataset[];
  tabs: Record<string, TblInfo>;
  extra: Record<string, { cells: Record<string, string>; formats: Record<string, CellFormat>; widths: Record<number, number> }>;
  editable: string[];
  checks: Check[];
  solution: Record<string, string>;
  instructions: string[];
  hiddenRows?: number[];
  tools: RawTask["tools"];
  simulationNote?: string;
  firstFormula: string;
  criteria: string[];
  hints: string[];
}

/** tolerances are written as plain numbers, without binary noise such as 0.30600000000000005 */
const tol = (x: number | undefined) => (x === undefined ? undefined : Number(x.toPrecision(10)));

export function defineChallenge(def: ChallengeDef): { challenge: PracticeChallenge; exercise: Exercise } {
  const datasets = def.ds.map(dataset);
  const primary = datasets[0];
  const exerciseId = `EX-${def.id}`;
  let asm: Assembled | null = null;
  const get = () => (asm ??= assemble(def, datasets));

  const challenge: PracticeChallenge = {
    id: def.id, concept: def.concept, tier: def.tier, datasetIds: def.ds, title: def.title, minutes: def.minutes, skill: def.skill, context: def.context, output: def.output,
    exerciseId, multiTable: datasets.length > 1, simulated: !!def.simulationNote,
  };
  const dsNote = datasets.map((d) => `${d.title} (${d.id}, ${d.rowCount} rows x ${d.columns.length} columns)`).join("; ");
  const exercise = {
    id: exerciseId, lessonId: def.id, kind: def.tier === "Hard" ? "mastery" : "independent", title: def.title, objective: def.output, origin: "generated",
    conceptIds: [`practice:${def.concept}`], datasetNote: `Generated practice data: ${dsNote}. Rows are synthetic.`, scenario: def.context,
    activeSheet: primary.sheet, difficulty: TIER_DIFFICULTY[def.tier],
    get simulationNote() { return get().simulationNote; },
    get instructions() { return get().instructions; },
    get editable() { return get().editable; },
    get checks() { return get().checks; },
    get hints() { return get().hints; },
    get tools() { return get().tools.length ? get().tools : undefined; },
    get solution() { const a = get(); return { explanation: `${def.explanation}${def.mistakes.length ? ` Common mistakes: ${def.mistakes.join(" · ")}` : ""}`, cells: a.solution, hiddenRows: a.hiddenRows }; },
    get outputSpec() { return def.output; },
    get criteria() { return get().criteria; },
    get mistakes() { return def.mistakes; },
    workbook: (): WorkbookData => workbookOf(get()),
  } as unknown as Exercise;
  return { challenge, exercise };
}

function workbookOf(a: Assembled): WorkbookData {
  const sheets: SheetData[] = a.datasets.map((d) => {
    const s = datasetSheet(d);
    const ex = a.extra[d.sheet];
    if (ex) { Object.assign(s.cells, ex.cells); Object.assign(s.formats, ex.formats); Object.assign(s.colWidths, ex.widths); }
    return s;
  });
  return { sheets };
}

/* ------------------------------ templates ------------------------------ */
interface TplCtx { sheet: string; row: number; inLetters?: string[]; ans?: string[]; lastRow?: number; rl?: string; cl?: string; cells?: string[] }
function makeTpl(tabs: Record<string, TblInfo>, primaryAlias: string, inputs: Record<string, { sheet: string; cell: string }>) {
  return (s: string, c: TplCtx): string => {
    const q = (sheet: string, ref: string) => (sheet === c.sheet ? ref : `${sheet}!${ref}`);
    let out = s.replace(/\{r\}/g, String(c.row)).replace(/\{p\}/g, String(c.row - 1)).replace(/\{pp\}/g, String(Math.max(1, c.row - 2)));
    if (c.cells) out = out.replace(/\{c(\d+)\}/g, (_m, i: string) => c.cells![Number(i)] ?? _m);
    if (c.rl) out = out.replace(/\{rl\}/g, c.rl);
    if (c.cl) out = out.replace(/\{cl\}/g, c.cl);
    return out.replace(/@@?(?:[A-Za-z][A-Za-z0-9]*|\*)(?:\.(?:[A-Za-z][A-Za-z0-9]*|\*))?/g, (tok) => {
      const abs = tok.startsWith("@@");
      const body = tok.slice(abs ? 2 : 1);
      const [a, b] = body.split(".");
      const keyOf = (t: TblInfo, k: string) => { try { return t.L(k); } catch { return null; } };
      let alias = primaryAlias, key = a;
      if (b !== undefined) { alias = a; key = b; }
      const t = tabs[alias];
      if (abs && /^ans\d+$/.test(a) && c.ans && c.ans[Number(a.slice(3))] && c.lastRow) { const L = c.ans[Number(a.slice(3))]; return `$${L}$2:$${L}$${c.lastRow}`; }
      if (!abs && /^ans\d+$/.test(a) && c.ans && c.ans[Number(a.slice(3))]) return `${c.ans[Number(a.slice(3))]}${c.row}`;
      if (!abs && /^in\d+$/.test(a) && c.inLetters) return `${c.inLetters[Number(a.slice(2))]}${c.row}`;
      if (!abs && b === undefined && inputs[a]) return q(inputs[a].sheet, inputs[a].cell);
      if (abs && b === undefined && inputs[a]) return q(inputs[a].sheet, inputs[a].cell);
      if (!t) return tok;
      if (key === "*") { const m = /^A2:([A-Z]+)(\d+)$/.exec(t.all)!; return q(t.sheet, `$A$2:$${m[1]}$${m[2]}`); }
      const L = keyOf(t, key);
      if (!L) return tok;
      return abs ? q(t.sheet, `$${L}$2:$${L}$${t.last}`) : q(t.sheet, `${L}${c.row}`);
    });
  };
}

function assemble(def: ChallengeDef, datasets: Dataset[]): Assembled {
  const tabs: Record<string, TblInfo> = Object.fromEntries(datasets.map((d) => [d.alias, tblInfo(d)]));
  const byAlias: Record<string, Dataset> = Object.fromEntries(datasets.map((d) => [d.alias, d]));
  const primary = datasets[0];
  const rng = makeRng(def.id);
  const ctx: Ctx = {
    id: def.id, rng, T: tabs, rows: (alias) => byAlias[alias].rows(),
    pick: (alias, n) => rng.sample(Array.from({ length: byAlias[alias].rowCount }, (_, i) => i), n).sort((a, b) => a - b),
    v: (alias, key, i) => { const d = byAlias[alias]; return d.rows()[i][d.columns.findIndex((c) => c.key === key)] ?? null; },
  };
  const tasks = def.tasks(ctx);

  const extra: Assembled["extra"] = {};
  const sheetExtra = (sheet: string) => (extra[sheet] ??= { cells: {}, formats: {}, widths: {} });
  const cursor: Record<string, number> = Object.fromEntries(datasets.map((d) => [d.sheet, d.columns.length]));
  const tblOf = (alias?: string) => tabs[alias ?? primary.alias] ?? (() => { throw new Error(`${def.id}: unknown table ${alias}`); })();
  const hdr = (sheet: string, col: number, text: string, width?: number) => {
    const e = sheetExtra(sheet);
    e.cells[addr(col, 1)] = toRaw(text);
    e.formats[addr(col, 1)] = { bold: true, fill: "#fff3b0" };
    e.widths[col] = width ?? Math.max(92, Math.min(200, text.length * 9 + 24));
  };

  // pass 1: assumption cells share one block per sheet
  const inputs: Record<string, { sheet: string; cell: string }> = {};
  const inputTasks = tasks.filter((t): t is InputTask => t.kind === "input");
  const bySheet = new Map<string, InputTask[]>();
  for (const t of inputTasks) { const s = tblOf(t.table).sheet; bySheet.set(s, [...(bySheet.get(s) ?? []), t]); }
  for (const [sheet, list] of bySheet) {
    const start = (cursor[sheet] ?? 1) + 2;
    const e = sheetExtra(sheet);
    e.cells[addr(start, 1)] = "Assumption"; e.formats[addr(start, 1)] = { bold: true, fill: "#e8eefc" };
    e.cells[addr(start + 1, 1)] = "Value"; e.formats[addr(start + 1, 1)] = { bold: true, fill: "#e8eefc" };
    e.widths[start] = 150; e.widths[start + 1] = 100;
    list.forEach((t, k) => {
      e.cells[addr(start, k + 2)] = toRaw(t.label);
      e.cells[addr(start + 1, k + 2)] = toRaw(t.value);
      if (t.nf) e.formats[addr(start + 1, k + 2)] = { nf: t.nf };
      inputs[t.name] = { sheet, cell: `$${numToCol(start + 1)}$${k + 2}` };
    });
    cursor[sheet] = start + 1;
  }
  const tpl = makeTpl(tabs, primary.alias, inputs);

  const readAll = (r: InputReader): Record<string, Row[]> => Object.fromEntries(datasets.map((d) => [d.alias, rowsFromMatrix(d, r.range(d.sheet, tabs[d.alias].all))]));
  const getter = (r: InputReader) => (name: string): Scalar => { const p = inputs[name]; if (!p) throw new Error(`${def.id}: unknown input ${name}`); return r.get(p.sheet, p.cell.replace(/\$/g, "")); };

  // anti-hardcoding: rotate the dependency columns of the dataset tables by 1 and 5 rows
  const baseSheets = new Map(datasets.map((d) => [d.alias, datasetSheet(d)]));
  const perturbFor = (deps: string[]): Record<string, string>[] => {
    return [1, 5].map((shift) => {
      const ov: Record<string, string> = {};
      for (const dep of deps) {
        if (dep.startsWith("@")) {
          // an assumption cell: re-run the learner's formula with a different value (rejects a typed-in constant)
          const it = inputTasks.find((x) => x.name === dep.slice(1)), p = inputs[dep.slice(1)];
          if (it && p && typeof it.value === "number") ov[`${p.sheet}!${p.cell.replace(/\$/g, "")}`] = String(Number((shift === 1 ? it.value * 1.5 : it.value * 0.75).toPrecision(12)));
          continue;
        }
        const [a, k] = dep.includes(".") ? dep.split(".") : [primary.alias, dep];
        const t = tabs[a], base = baseSheets.get(a);
        if (!t || !base) continue;
        const L = t.L(k);
        const raws = Array.from({ length: t.n }, (_, i) => base.cells[`${L}${i + 2}`] ?? "");
        for (let i = 0; i < t.n; i++) { const v = raws[(i + shift) % t.n]; ov[`${t.sheet}!${L}${i + 2}`] = v; }
      }
      return ov;
    });
  };

  const colLetters: Record<string, string[]> = {};
  const editable: string[] = [];
  const checks: Check[] = [];
  const solution: Record<string, string> = {};
  const instructions: string[] = [];
  const criteria: string[] = [];
  let firstFormula = "";
  let tools: RawTask["tools"] = [];
  let simulationNote = def.simulationNote;
  let hiddenRows: number[] | undefined;
  const sol = (sheet: string, a: string, f: string) => { solution[sheet === primary.sheet ? a : `${sheet}!${a}`] = f; if (!firstFormula && f.startsWith("=")) firstFormula = f; };
  const fmtCell = (sheet: string, a: string, nf?: NumberFormat) => { if (nf) sheetExtra(sheet).formats[a] = { nf }; };
  const crit = (label: string, range: string, a: { required?: string[][]; forbidden?: string[] }) =>
    criteria.push(`${label} (${range}): every cell must equal the value calculated independently from the data, be a formula (a typed answer is rejected)${a.required?.length ? `, use ${a.required.map((g) => g.join(" or ")).join(" and ")}` : ""}${a.forbidden?.length ? `, not use ${a.forbidden.join(", ")}` : ""}, and stay correct when the source data changes.`);

  for (const t of tasks) {
    if (t.kind === "input") continue;
    if (t.kind === "raw") {
      editable.push(...t.editable); checks.push(...t.checks); Object.assign(solution, t.solution.cells); tools = [...new Set([...tools, ...t.tools])];
      if (t.solution.hiddenRows) hiddenRows = t.solution.hiddenRows;
      simulationNote = t.simulationNote ?? simulationNote; instructions.push(t.text);
      criteria.push(...t.checks.map((c) => `${c.label}: the rows and values shown in the table must match the expected result.`));
      continue;
    }
    const tab = tblOf(t.table), sheet = tab.sheet;
    const fcheck = (a: Answer | GridTask, range: string, expected: (r: InputReader) => Scalar[][], deps: string[], label: string): FormulaCheck => ({
      type: "formula", label, sheet, range, expected, requiredFunctions: a.required, forbiddenFunctions: "forbidden" in a ? a.forbidden : undefined,
      tolerance: tol(a.tolerance), ignoreCase: "ignoreCase" in a ? a.ignoreCase : undefined, perturb: perturbFor(deps),
    });
    if (t.kind === "col") {
      const colN = t.into ? colToNum(tab.L(t.into)) : (cursor[sheet] += 1);
      const L = numToCol(colN), first = 2, last = tab.last;
      (colLetters[sheet] ??= []).push(L);
      if (!t.into) hdr(sheet, colN, t.header);
      editable.push(`${sheet === primary.sheet ? "" : sheet + "!"}${L}${first}:${L}${last}`);
      for (let r = first; r <= last; r++) { sol(sheet, `${L}${r}`, tpl(t.formula, { sheet, row: r, ans: colLetters[sheet], lastRow: tab.last })); fmtCell(sheet, `${L}${r}`, t.nf); }
      checks.push(fcheck(t, `${L}${first}:${L}${last}`, (rd) => { const T = readAll(rd); const get = getter(rd); return T[tab.alias].map((row, i) => [t.expect({ r: rd, T, row, i, in: [], get })]); }, t.deps, t.label));
      crit(t.label, `${L}${first}:${L}${last}`, t);
      instructions.push(t.text.replace(/\{range\}/g, `${L}${first}:${L}${last}`).replace(/\{col\}/g, L));
    } else if (t.kind === "panel") {
      const start = cursor[sheet] + 2;
      const m = t.inputs[0].values.length;
      t.inputs.forEach((inp, k) => { hdr(sheet, start + k, inp.header); inp.values.forEach((v, i) => { const e = sheetExtra(sheet); e.cells[addr(start + k, i + 2)] = toRaw(v); if (inp.nf) e.formats[addr(start + k, i + 2)] = { nf: inp.nf }; }); sheetExtra(sheet).formats[addr(start + k, 1)] = { bold: true, fill: "#e8eefc" }; });
      const inLetters = t.inputs.map((_, k) => numToCol(start + k));
      const ranges: string[] = [];
      t.answers.forEach((a, k) => {
        const colN = start + t.inputs.length + k, L = numToCol(colN);
        hdr(sheet, colN, a.header);
        const range = `${L}2:${L}${m + 1}`;
        editable.push(`${sheet === primary.sheet ? "" : sheet + "!"}${range}`); ranges.push(range);
        for (let r = 2; r <= m + 1; r++) { sol(sheet, `${L}${r}`, tpl(a.formula, { sheet, row: r, inLetters, ans: t.answers.map((_x, kk) => numToCol(start + t.inputs.length + kk)), lastRow: m + 1 })); fmtCell(sheet, `${L}${r}`, a.nf); }
        checks.push(fcheck(a, range, (rd) => {
          const T = readAll(rd); const get = getter(rd);
          return Array.from({ length: m }, (_, i) => [a.expect({ r: rd, T, row: {}, i, in: inLetters.map((l) => rd.get(sheet, `${l}${i + 2}`)), get })]);
        }, t.deps, a.label));
        crit(a.label, range, a);
      });
      cursor[sheet] = start + t.inputs.length + t.answers.length - 1;
      instructions.push(t.text.replace(/\{range\}/g, ranges[0] ?? "").replace(/\{ranges\}/g, ranges.join(", ")).replace(/\{in\}/g, `${inLetters[0]}2:${inLetters[0]}${m + 1}`));
    } else if (t.kind === "cells") {
      const start = cursor[sheet] + 2;
      hdr(sheet, start, "Measure", 180); hdr(sheet, start + 1, "Your answer", 130);
      const ads: string[] = [];
      t.cells.forEach((c, i) => {
        const e = sheetExtra(sheet); const row = i + 2, a = addr(start + 1, row);
        e.cells[addr(start, row)] = toRaw(c.label);
        editable.push(`${sheet === primary.sheet ? "" : sheet + "!"}${a}`); ads.push(a);
        sol(sheet, a, tpl(c.formula, { sheet, row, ans: colLetters[sheet], lastRow: tab.last, cells: t.cells.map((_x, k) => addr(start + 1, k + 2)) })); fmtCell(sheet, a, c.nf);
        checks.push(fcheck({ ...c, header: c.header ?? c.label, formula: c.formula } as Answer, a, (rd) => { const T = readAll(rd); return [[c.expect({ r: rd, T, row: {}, i, in: [], get: getter(rd) })]]; }, t.deps, c.label));
        crit(c.label, a, c);
      });
      cursor[sheet] = start + 1;
      instructions.push(t.text.replace(/\{range\}/g, ads.join(", ")).replace(/\{first\}/g, ads[0]).replace(/\{last\}/g, ads[ads.length - 1]));
    } else if (t.kind === "grid") {
      const start = cursor[sheet] + 2;
      const e = sheetExtra(sheet);
      hdr(sheet, start, t.corner, 130);
      t.colLabels.forEach((v, j) => { e.cells[addr(start + 1 + j, 1)] = toRaw(v); e.formats[addr(start + 1 + j, 1)] = { bold: true, fill: "#e8eefc" }; e.widths[start + 1 + j] = 105; });
      t.rowLabels.forEach((v, i) => { e.cells[addr(start, i + 2)] = toRaw(v); });
      const L1 = numToCol(start + 1), L2 = numToCol(start + t.colLabels.length), last = t.rowLabels.length + 1;
      editable.push(`${sheet === primary.sheet ? "" : sheet + "!"}${L1}2:${L2}${last}`);
      for (let i = 0; i < t.rowLabels.length; i++) for (let j = 0; j < t.colLabels.length; j++) {
        const a = addr(start + 1 + j, i + 2);
        sol(sheet, a, tpl(t.formula, { sheet, row: i + 2, rl: `$${numToCol(start)}${i + 2}`, cl: `${numToCol(start + 1 + j)}$1` })); fmtCell(sheet, a, t.nf);
      }
      checks.push(fcheck({ expect: () => null, formula: "", header: "", label: t.label, required: t.required, tolerance: tol(t.tolerance) }, `${L1}2:${L2}${last}`, (rd) => { const T = readAll(rd); const get = getter(rd); return t.rowLabels.map((rl, i) => t.colLabels.map((cl) => t.expect({ r: rd, T, row: {}, i, in: [], get }, rl, cl))); }, t.deps, t.label));
      crit(t.label, `${L1}2:${L2}${last}`, t);
      cursor[sheet] = start + t.colLabels.length;
      instructions.push(t.text.replace(/\{range\}/g, `${L1}2:${L2}${last}`));
    } else if (t.kind === "spill") {
      const w = t.headers.length;
      const start = cursor[sheet] + 2;
      t.headers.forEach((h, k) => hdr(sheet, start + k, h));
      const L1 = numToCol(start), L2 = numToCol(start + w - 1), last = t.height + 1;
      const anchor = `${L1}2`, area = `${L1}2:${L2}${last}`;
      editable.push(`${sheet === primary.sheet ? "" : sheet + "!"}${area}`);
      sol(sheet, anchor, tpl(t.formula, { sheet, row: 2, ans: colLetters[sheet], lastRow: tab.last }));
      if (t.nf) for (let r = 2; r <= last; r++) for (let k = 0; k < w; k++) fmtCell(sheet, addr(start + k, r), t.nf);
      checks.push({
        type: "formula", label: t.label, sheet, range: area, requiredFunctions: t.required, forbiddenFunctions: t.forbidden, tolerance: tol(t.tolerance), ignoreCase: t.ignoreCase, perturb: perturbFor(t.deps),
        expected: (rd) => {
          const T = readAll(rd);
          const rows = t.expect({ r: rd, T, row: {}, i: 0, in: [], get: getter(rd) });
          if (rows.length > t.height) throw new Error(`${def.id}: spill result has ${rows.length} rows but the answer area holds ${t.height}`);
          return Array.from({ length: t.height }, (_, i) => Array.from({ length: w }, (_, k) => rows[i]?.[k] ?? null));
        },
      });
      criteria.push(`${t.label} (${anchor}): write ONE formula in ${anchor}; its result must spill over ${area} and equal the independently calculated result, and stay correct when the source data changes. Needs Excel 2021 / Microsoft 365 for the real thing.`);
      cursor[sheet] = start + w - 1;
      instructions.push(t.text.replace(/\{range\}/g, anchor).replace(/\{area\}/g, area));
    } else if (t.kind === "sortfilter") {
      if (sheet !== primary.sheet) throw new Error(`${def.id}: sort/filter works on the primary table only`);
      const ds = byAlias[tab.alias];
      const m = ds.rows();
      const keyIdx = (k: string) => { const i = ds.columns.findIndex((c) => c.key === k); if (i < 0) throw new Error(`${def.id}: unknown sort key ${k}`); return i; };
      const cmpv = (a: Scalar, b: Scalar, dir: 1 | -1): number => {
        if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1; // blanks always last
        const la = String(a).toLowerCase(), lb = String(b).toLowerCase();
        return dir * (typeof a === "number" && typeof b === "number" ? a - b : la < lb ? -1 : la > lb ? 1 : 0);
      };
      let order = m.map((_r, i) => i);
      const keys = t.sort ?? [];
      if (keys.length) order = [...order].sort((a, b) => { for (const k of keys) { const ix = keyIdx(k.key); const c = cmpv(m[a][ix], m[b][ix], k.dir); if (c) return c; } return a - b; });
      const sorted = order.map((i) => m[i]);
      const range = `A2:${numToCol(ds.columns.length)}${tab.last}`;
      if (keys.length) {
        editable.push(range);
        checks.push({ type: "values", label: `${t.label}: row order`, sheet, range, expected: sorted.map((r) => [...r]) });
        sorted.forEach((r, i) => r.forEach((v, j) => sol(sheet, addr(j + 1, i + 2), v === null ? "" : toRaw(v))));
        criteria.push(`${t.label}: the whole table must be in the expected order (rows move as a whole; every value must still be in its original row).`);
      }
      if (t.keep) {
        const keep = t.keep;
        const hidden = rowsFromMatrix(ds, sorted).map((r, i) => (keep(r) ? 0 : i + 2)).filter((x) => x > 0);
        hiddenRows = hidden;
        checks.push({ type: "visibleRows", label: `${t.label}: visible rows`, sheet, range, keyCol: "A", expected: sorted.filter((_r, i) => !hidden.includes(i + 2)).map((r) => r[0]) });
        criteria.push(`${t.label}: exactly the matching rows must be visible, in the expected order. Filtering hides rows; it does not delete them.`);
      }
      tools = [...new Set([...(tools ?? []), ...(keys.length ? ["sort" as const] : []), ...(t.keep ? ["filter" as const] : [])])];
      simulationNote ??= "Sorting and filtering are simulated with dialogs; Excel uses the Sort and Filter commands and the header drop-down arrows.";
      instructions.push(t.text);
    }
  }
  // the tables' own sheet widths for answer columns are applied through `extra`; a final hint shows the first formula
  const hints = [...def.hints, `For the first answer cell the formula looks like: ${firstFormula || "(this challenge uses the toolbar tools; no formula)"}`];
  return { datasets, tabs, extra, editable, checks, solution, instructions, hiddenRows, tools, simulationNote, firstFormula, criteria, hints };
}
void ({} as CellsTask & ColTask & PanelTask & Task & X);

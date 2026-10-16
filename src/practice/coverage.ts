import { CLASSROOM_SHEETS } from "../content/lessons";
import { CHALLENGES } from "../content/ex-challenges";
import { EXERCISE_BY_ID } from "../content/registry";
import { MODULES } from "../content/modules";
import { UNSUPPORTED } from "../engine/core";
import { applySolution, checkExercise } from "../learning/checker";
import { CATEGORIES, type DataCategory, type Tier } from "../datasets/types";
import { DATASETS, DATASET_BY_ID, LEGACY_DATASETS, SOURCE_DATASETS } from "../datasets/registry";
import { uncoveredTopics, validateDataset, validateRegistry } from "../datasets/validate";
import { REQUIRED_TOPICS } from "../datasets/required";
import { CATALOG, TIER_ORDER, type CatalogEntry } from "./catalog";
import { PRACTICE_CONCEPTS } from "./concepts";
import { PRACTICE, PRACTICE_EXERCISES } from "./registry";

/**
 * The coverage report. Everything here is computed from the live registries (datasets, catalogue, exercises); nothing is typed in by hand
 * except the plain-language statements in `LIMITATIONS`. `deep: true` also generates every dataset and runs every reference solution through the real checker,
 * which is slower (tens of seconds), so the in-app page only does that when asked.
 */
export type Status = "Complete" | "Partial" | "Missing";

export interface ConceptRow {
  id: string;
  title: string;
  moduleId: string;
  band: string;
  target: number;
  actual: number;
  additional: number;
  original: number;
  tiers: Record<Tier, number>;
  status: Status;
  note?: string;
}
export interface CategoryRow { category: DataCategory; datasets: number; easy: number; medium: number; hard: number; generated: number; fromSource: number; topicsRequired: number; topicsCovered: number }
export interface ModuleRow { id: string; title: string; lessons: number; challenges: number; status: "Lessons and practice" | "Lessons only" | "Practice only" | "Planned (nothing built)" }
export interface DeepResult {
  datasetsChecked: number;
  datasetErrors: string[];
  datasetWarnings: string[];
  challengesChecked: number;
  /** reference solution does not pass the real checker, or the untouched sheet already passes */
  failedSolutions: string[];
  /** challenge has no check that compares a computed value or formula */
  unverifiable: string[];
  simulatedMismatch: string[];
  msTaken: number;
}
export interface PhaseRow { phase: string; status: Status; evidence: string }
export interface CoverageReport {
  deep: boolean;
  datasets: { total: number; generated: number; fromSource: number; legacy: number; byTier: Record<Tier, number>; byCategory: CategoryRow[]; totalRows: number; largest: { id: string; rows: number } };
  challenges: { total: number; original: number; additional: number; multiTable: number; simulated: number; byTier: Record<Tier, number>; datasetsUsed: number; datasetsUnused: string[] };
  concepts: ConceptRow[];
  modules: ModuleRow[];
  uncoveredTopics: { category: string; topic: string }[];
  brokenRefs: string[];
  tierViolations: string[];
  consecutiveSameDataset: string[];
  duplicateWarnings: string[];
  heavilyReused: string[];
  originalPreserved: { sheets: string; challenges: string; ok: boolean; notes: string[] };
  limitations: string[];
  deepResult?: DeepResult;
  phases: PhaseRow[];
}

export const LIMITATIONS: string[] = [
  "Sorting and filtering are simulated with Gurukul ExcelLab dialogs, not Excel's drop-down arrows. The filter tool is not cumulative: only one filter condition can be active at a time.",
  "Dynamic-array challenges run on Gurukul ExcelLab's own engine. Real Excel needs 2021 or Microsoft 365 for them. LET, LAMBDA, XMATCH, VSTACK, HSTACK, CHOOSECOLS and MAP are not evaluated.",
  `${Object.keys(UNSUPPORTED).length} real Excel functions (for example PMT, IPMT, NPV, RANK, DATEDIF, SUBTOTAL and AGGREGATE) are not evaluated; finance challenges build schedules and ratios from arithmetic instead.`,
  "PivotTables, Power Query, charts and dashboards, data validation and conditional formatting cannot be built or evaluated here. They are reported as Missing, not as challenges.",
  "Answers are checked by value and by formula text on the dataset plus two modified copies (to reject typed-in answers). A formula that hard-codes values in a way that survives those copies, or that gives the same numbers through an unexpected route, can still pass.",
  "Where a challenge requires a particular function (for example SUMIFS), the checker looks for that name in the formula text; it does not judge style or efficiency.",
  "Progress, hints and saved work live in this browser (localStorage). Nothing is synced between devices, and clearing site data removes it.",
  "All data is synthetic and seeded, so it is repeatable. Rows are generated when a dataset is opened; the six original challenge tables and the instructor's workbook sheets are kept as they were.",
  "The 26 px row height used for windowing very large sheets has not been confirmed in a real browser unless the phase table below says so.",
];

const tierCount = (): Record<Tier, number> => ({ Easy: 0, Medium: 0, Hard: 0 });

function conceptRows(): ConceptRow[] {
  return PRACTICE_CONCEPTS.map((c) => {
    const all = CATALOG.filter((e) => e.concept === c.id);
    const add = all.filter((e) => e.source === "additional");
    const tiers = tierCount();
    for (const e of add) tiers[e.tier]++;
    // the target is measured on the additional, dataset-driven challenges only; the six originals are reported but not used to reach a target
    const actual = add.length;
    const status: Status = !c.supported || actual === 0 ? "Missing" : actual >= c.target ? "Complete" : "Partial";
    return { id: c.id, title: c.title, moduleId: c.moduleId, band: c.band, target: c.target, actual, additional: add.length, original: all.length - add.length, tiers, status, note: c.limitation };
  });
}

function moduleRows(): ModuleRow[] {
  return MODULES.map((m) => {
    const concepts = PRACTICE_CONCEPTS.filter((c) => c.moduleId === m.id && c.supported).map((c) => c.id);
    const challenges = CATALOG.filter((e) => concepts.includes(e.concept)).length;
    const lessons = m.lessonIds.length;
    const status: ModuleRow["status"] = lessons && challenges ? "Lessons and practice" : lessons ? "Lessons only" : challenges ? "Practice only" : "Planned (nothing built)";
    return { id: m.id, title: m.title, lessons, challenges, status };
  });
}

function categoryRows(): CategoryRow[] {
  return CATEGORIES.map((category) => {
    const ds = DATASETS.filter((d) => d.category === category);
    const topics = category === "Original workbook" ? [] : REQUIRED_TOPICS[category];
    const have = new Set(DATASETS.flatMap((d) => d.topics));
    return {
      category, datasets: ds.length, easy: ds.filter((d) => d.tier === "Easy").length, medium: ds.filter((d) => d.tier === "Medium").length, hard: ds.filter((d) => d.tier === "Hard").length,
      generated: ds.filter((d) => d.origin === "generated").length, fromSource: ds.filter((d) => d.origin === "source").length,
      topicsRequired: topics.length, topicsCovered: topics.filter((t) => have.has(t)).length,
    };
  });
}

/** per concept, challenges in catalogue order that start on the same primary dataset as the one before */
function consecutive(): string[] {
  const out: string[] = [];
  for (const c of PRACTICE_CONCEPTS) {
    const list = CATALOG.filter((e) => e.concept === c.id);
    for (let i = 1; i < list.length; i++) if (list[i].primary.id === list[i - 1].primary.id) out.push(`${c.id}: ${list[i - 1].id} and ${list[i].id} both open on ${list[i].primary.id}`);
  }
  return out;
}

function duplicates(): string[] {
  const out: string[] = [];
  const seen = new Map<string, CatalogEntry>();
  for (const e of CATALOG) {
    const t = `title:${e.title.trim().toLowerCase()}`;
    const s = `task:${e.concept}|${e.datasetIds.join("+")}|${e.skill.trim().toLowerCase()}`;
    for (const k of [t, s]) {
      const prev = seen.get(k);
      if (prev) out.push(`${prev.id} and ${e.id} look alike (${k.startsWith("title") ? "same title" : "same concept, datasets and skill"})`);
      else seen.set(k, e);
    }
  }
  return out;
}

function brokenRefs(): string[] {
  const out: string[] = [];
  for (const e of CATALOG) {
    for (const d of e.datasetIds) if (!DATASET_BY_ID.has(d)) out.push(`${e.id} references unknown dataset ${d}`);
    if (!EXERCISE_BY_ID.has(e.exerciseId)) out.push(`${e.id} has no exercise ${e.exerciseId}`);
    if (!PRACTICE_CONCEPTS.some((c) => c.id === e.concept)) out.push(`${e.id} has unknown concept ${e.concept}`);
  }
  const ids = CATALOG.map((e) => e.id);
  for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) out.push(`duplicate challenge id ${id}`);
  for (const d of DATASETS) for (const r of d.related) if (!DATASET_BY_ID.has(r)) out.push(`dataset ${d.id} lists unknown related dataset ${r}`);
  return [...new Set(out)];
}

function tierViolations(): string[] {
  const out: string[] = [];
  for (const e of CATALOG.filter((x) => !x.legacy)) for (const d of e.datasetIds) {
    const ds = DATASET_BY_ID.get(d);
    if (ds && TIER_ORDER[e.tier] < TIER_ORDER[ds.tier]) out.push(`${e.id} is ${e.tier} but uses ${ds.tier} dataset ${d}`);
  }
  return out;
}

function originalPreserved(): CoverageReport["originalPreserved"] {
  const notes: string[] = [];
  const sheetsOk = CLASSROOM_SHEETS.filter((s) => SOURCE_DATASETS.some((d) => d.sheet === s.sheet.trim()));
  if (sheetsOk.length !== CLASSROOM_SHEETS.length) notes.push(`missing source sheets: ${CLASSROOM_SHEETS.filter((s) => !sheetsOk.includes(s)).map((s) => s.sheet).join(", ")}`);
  const ch = CHALLENGES.filter((c) => EXERCISE_BY_ID.has(c.exerciseId) && CATALOG.some((e) => e.id === c.id && e.legacy));
  if (ch.length !== CHALLENGES.length) notes.push("an original challenge is missing from the catalogue");
  if (LEGACY_DATASETS.length !== CHALLENGES.length) notes.push("original challenge tables are not all registered");
  const mods = ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12", "M13", "M14", "M15", "M16", "M17", "M18", "M19", "M20"].filter((id) => !MODULES.some((m) => m.id === id));
  if (mods.length) notes.push(`missing original modules ${mods.join(", ")}`);
  return { sheets: `${sheetsOk.length} of ${CLASSROOM_SHEETS.length} classroom sheets registered as read-only datasets`, challenges: `${ch.length} of ${CHALLENGES.length} original challenges kept (${CHALLENGES.map((c) => c.id).join(", ")})`, ok: notes.length === 0, notes };
}

/**
 * The deep checks as a list of small steps, so the page can run them without freezing the browser (one step per dataset or challenge).
 * `deepChecks()` simply runs every step in a row.
 */
export function deepPlan(): { total: number; step: (i: number) => string; finish: () => DeepResult } {
  const t0 = Date.now();
  const datasetErrors: string[] = [];
  const datasetWarnings: string[] = [];
  const failedSolutions: string[] = [];
  const unverifiable: string[] = [];
  const simulatedMismatch: string[] = [];
  const push = (f: { dataset: string; level: "error" | "warn"; message: string }) => (f.level === "error" ? datasetErrors : datasetWarnings).push(`${f.dataset}: ${f.message}`);
  const steps: (() => string)[] = [
    () => { validateRegistry().forEach(push); return "dataset registry"; },
    ...DATASETS.map((d) => () => { validateDataset(d).forEach(push); return d.id; }),
    ...PRACTICE.map((c, i) => () => {
      const ex = PRACTICE_EXERCISES[i];
      const solved = checkExercise(ex, applySolution(ex));
      if (!solved.passed) failedSolutions.push(`${c.id}: reference solution does not pass`);
      else if (checkExercise(ex, ex.workbook()).passed) failedSolutions.push(`${c.id}: the untouched sheet already passes`);
      if (!ex.checks.some((k) => k.type === "formula" || k.type === "values" || k.type === "visibleRows")) unverifiable.push(`${c.id}: no value or formula check`);
      if (c.simulated !== !!ex.simulationNote) simulatedMismatch.push(`${c.id}: catalogue says simulated=${c.simulated}, exercise says ${!!ex.simulationNote}`);
      return c.id;
    }),
  ];
  return {
    total: steps.length,
    step: (i) => steps[i](),
    finish: () => ({ datasetsChecked: DATASETS.length, datasetErrors, datasetWarnings, challengesChecked: PRACTICE.length, failedSolutions, unverifiable, simulatedMismatch, msTaken: Date.now() - t0 }),
  };
}

export function deepChecks(): DeepResult {
  const p = deepPlan();
  for (let i = 0; i < p.total; i++) p.step(i);
  return p.finish();
}
export function buildCoverageReport(opts: { deep?: boolean; deepResult?: DeepResult } = {}): CoverageReport {
  const deepResult = opts.deepResult ?? (opts.deep ? deepChecks() : undefined);
  const byTier = tierCount();
  for (const d of DATASETS) byTier[d.tier]++;
  const cTier = tierCount();
  for (const e of CATALOG) cTier[e.tier]++;
  const usage = new Map<string, number>();
  for (const e of CATALOG) for (const d of e.datasetIds) usage.set(d, (usage.get(d) ?? 0) + 1);
  const generated = DATASETS.filter((d) => d.origin === "generated");
  const largest = DATASETS.reduce((m, d) => (d.rowCount > m.rows ? { id: d.id, rows: d.rowCount } : m), { id: "", rows: 0 });
  const concepts = conceptRows();
  const modules = moduleRows();
  const refs = brokenRefs();
  const tiers = tierViolations();
  const consec = consecutive();
  const dups = duplicates();
  const orig = originalPreserved();
  const unused = DATASETS.filter((d) => d.origin === "generated" && !usage.has(d.id)).map((d) => d.id);
  const miss = uncoveredTopics();

  const supported = concepts.filter((c) => PRACTICE_CONCEPTS.find((p) => p.id === c.id)!.supported);
  const unsupported = concepts.filter((c) => !PRACTICE_CONCEPTS.find((p) => p.id === c.id)!.supported);
  const deepOk = !!deepResult && deepResult.datasetErrors.length === 0 && deepResult.failedSolutions.length === 0 && deepResult.unverifiable.length === 0;
  const phases: PhaseRow[] = [
    { phase: "Dataset library (ids, categories, tiers, schema, related, source)", status: miss.length === 0 && refs.filter((r) => r.startsWith("dataset")).length === 0 ? "Complete" : "Partial", evidence: `${DATASETS.length} datasets in ${CATEGORIES.length} categories; ${miss.length} brief topics uncovered` },
    { phase: "Original workbook and original challenges preserved", status: orig.ok ? "Complete" : "Partial", evidence: `${orig.sheets}; ${orig.challenges}` },
    { phase: "Challenges for every supported concept at its minimum count", status: supported.every((c) => c.status === "Complete") ? "Complete" : supported.some((c) => c.actual > 0) ? "Partial" : "Missing", evidence: `${supported.filter((c) => c.status === "Complete").length} of ${supported.length} supported concepts at target` },
    { phase: "Concepts Gurukul ExcelLab cannot evaluate (PivotTables, Power Query, charts, validation, conditional formatting)", status: "Missing", evidence: `${unsupported.map((c) => c.id).join(", ")}: no challenges, by design (reported, not faked)` },
    { phase: "Multi-table case studies", status: (concepts.find((c) => c.id === "CS")?.status ?? "Missing"), evidence: `${concepts.find((c) => c.id === "CS")?.actual ?? 0} of ${concepts.find((c) => c.id === "CS")?.target ?? 0}` },
    { phase: "Automated validation of datasets and challenges", status: deepResult ? (deepOk ? "Complete" : "Partial") : "Partial", evidence: deepResult ? `${deepResult.datasetsChecked} datasets and ${deepResult.challengesChecked} challenges checked in ${(deepResult.msTaken / 1000).toFixed(1)}s: ${deepResult.datasetErrors.length} dataset errors, ${deepResult.failedSolutions.length} failing solutions, ${deepResult.unverifiable.length} unverifiable` : "Not run in this report (the test-suite runs it; use the deep report to include it)" },
  ];

  return {
    deep: !!deepResult,
    datasets: { total: DATASETS.length, generated: generated.length, fromSource: SOURCE_DATASETS.length, legacy: LEGACY_DATASETS.length, byTier, byCategory: categoryRows(), totalRows: DATASETS.reduce((n, d) => n + d.rowCount, 0), largest },
    challenges: { total: CATALOG.length, original: CATALOG.filter((e) => e.legacy).length, additional: CATALOG.filter((e) => !e.legacy).length, multiTable: CATALOG.filter((e) => e.multiTable).length, simulated: CATALOG.filter((e) => e.simulated).length, byTier: cTier, datasetsUsed: usage.size, datasetsUnused: unused },
    concepts, modules, uncoveredTopics: miss, brokenRefs: refs, tierViolations: tiers, consecutiveSameDataset: consec, duplicateWarnings: dups,
    heavilyReused: [...usage].filter(([, n]) => n >= 4).map(([id, n]) => `${id} (${n} challenges)`),
    originalPreserved: orig, limitations: LIMITATIONS, deepResult, phases,
  };
}

/** plain-text rendering used by the report script and the copy button */
export function formatReport(r: CoverageReport): string {
  const L: string[] = [];
  const h = (t: string) => L.push("", t, "=".repeat(t.length));
  const row = (...c: (string | number)[]) => L.push(c.map((x, i) => (i === 0 ? String(x).padEnd(46) : String(x).padStart(8))).join(" "));
  L.push(`EXCELGYM PRACTICE COVERAGE REPORT (${r.deep ? "deep: datasets generated and every reference solution run" : "metadata only"})`);
  h("1. Datasets");
  L.push(`${r.datasets.total} datasets: ${r.datasets.generated - r.datasets.legacy} newly generated, ${r.datasets.fromSource} original workbook sheets, ${r.datasets.legacy} original challenge tables (kept as they were). ${r.datasets.totalRows.toLocaleString("en-US")} rows in all; largest ${r.datasets.largest.id} (${r.datasets.largest.rows.toLocaleString("en-US")} rows).`);
  L.push(`By tier: Easy ${r.datasets.byTier.Easy}, Medium ${r.datasets.byTier.Medium}, Hard ${r.datasets.byTier.Hard}`);
  row("Category", "datasets", "Easy", "Medium", "Hard", "topics");
  for (const c of r.datasets.byCategory) row(c.category, c.datasets, c.easy, c.medium, c.hard, c.category === "Original workbook" ? "n/a" : `${c.topicsCovered}/${c.topicsRequired}`);
  L.push(r.uncoveredTopics.length ? `Brief topics not covered: ${r.uncoveredTopics.map((t) => `${t.category}: ${t.topic}`).join("; ")}` : "Every topic in the brief is covered by at least one dataset.");
  h("2. Challenges");
  L.push(`${r.challenges.total} challenges: ${r.challenges.additional} additional, ${r.challenges.original} original (CH-1..CH-6, unchanged). Multi-table: ${r.challenges.multiTable}. Using a simulated tool: ${r.challenges.simulated}.`);
  L.push(`By tier: Easy ${r.challenges.byTier.Easy}, Medium ${r.challenges.byTier.Medium}, Hard ${r.challenges.byTier.Hard}. Generated datasets used by at least one challenge: ${r.challenges.datasetsUsed}; generated datasets not used by any challenge: ${r.challenges.datasetsUnused.length}${r.challenges.datasetsUnused.length ? ` (${r.challenges.datasetsUnused.join(", ")})` : ""}.`);
  h("3. Concepts (target counts the additional challenges only)");
  row("Concept", "target", "actual", "Easy", "Medium", "Hard", "orig", "status");
  for (const c of r.concepts) row(`${c.id} ${c.title}`, c.target, c.actual, c.tiers.Easy, c.tiers.Medium, c.tiers.Hard, c.original, c.status);
  for (const c of r.concepts.filter((x) => x.note)) L.push(`  ${c.id}: ${c.note}`);
  h("4. Roadmap modules");
  for (const m of r.modules) L.push(`${m.id} ${m.title.padEnd(40)} lessons ${String(m.lessons).padStart(2)}  challenges ${String(m.challenges).padStart(3)}  ${m.status}`);
  h("5. Warnings");
  const list = (t: string, xs: string[]) => L.push(`${t}: ${xs.length ? xs.length : "none"}`, ...xs.map((x) => `  - ${x}`));
  list("Broken references", r.brokenRefs);
  list("Tier-rule violations", r.tierViolations);
  list("Consecutive challenges on the same dataset", r.consecutiveSameDataset);
  list("Possible duplicates", r.duplicateWarnings);
  list("Datasets used by four or more challenges", r.heavilyReused);
  if (r.deepResult) {
    h("6. Deep validation");
    list("Dataset errors", r.deepResult.datasetErrors);
    list("Dataset warnings", r.deepResult.datasetWarnings);
    list("Reference solutions that fail (or untouched sheet passes)", r.deepResult.failedSolutions);
    list("Unverifiable challenges", r.deepResult.unverifiable);
    list("Simulated-flag mismatches", r.deepResult.simulatedMismatch);
  } else L.push("", "6. Deep validation: not run");
  h("7. Original material preserved");
  L.push(r.originalPreserved.sheets, r.originalPreserved.challenges, r.originalPreserved.ok ? "OK" : `PROBLEM: ${r.originalPreserved.notes.join("; ")}`);
  h("8. Evaluator limitations");
  for (const x of r.limitations) L.push(`- ${x}`);
  h("9. Phase status");
  for (const p of r.phases) L.push(`[${p.status}] ${p.phase}`, `    ${p.evidence}`);
  return L.join("\n");
}

import { ALL_EXERCISES } from "../content/registry";
import { ALL_LESSONS } from "../content/lessons";
import { QUIZZES } from "../content/quizzes";
import { DATASET_BY_ID, DATASETS } from "../datasets/registry";
import { CATALOG_BY_EXERCISE } from "./catalog";
import { getSheet } from "../engine/ops";
import { auditWorkbookConfig } from "../sheets/registry";

export interface ChallengeMappingRow {
  exerciseId: string;
  title: string;
  kind: "quiz" | "practical";
  starterCells: number;
  activeSheetOk: boolean;
  hasChecks: boolean;
  catalogDatasetIds: string[];
  missingDatasetIds: string[];
  googleStatus: "quiz" | "local-only" | "configured" | "invalid";
  fullyConfigured: boolean;
  requiresDataset: boolean;
  requiresWorkbookMapping: boolean;
  issues: string[];
}

export interface ChallengeMappingAudit {
  lessons: number;
  exercises: number;
  practical: number;
  quizzes: number;
  questionExercises: number;
  datasets: number;
  fullyConfigured: number;
  requiringDataset: number;
  requiringWorkbookMapping: number;
  invalidMappings: number;
  duplicateMappings: number;
  unusedMappings: number;
  issues: string[];
  rows: ChallengeMappingRow[];
}

/** Audit starter workbooks and dataset links. Does not invent datasets or Google URLs. */
export function auditChallengeMappings(): ChallengeMappingAudit {
  const google = auditWorkbookConfig();
  const rows: ChallengeMappingRow[] = [];
  const issues: string[] = [...google.issues];

  for (const ex of ALL_EXERCISES) {
    if (ex.questions?.length) {
      rows.push({
        exerciseId: ex.id,
        title: ex.title,
        kind: "quiz",
        starterCells: 0,
        activeSheetOk: true,
        hasChecks: (ex.questions?.length ?? 0) > 0,
        catalogDatasetIds: [],
        missingDatasetIds: [],
        googleStatus: "quiz",
        fullyConfigured: true,
        requiresDataset: false,
        requiresWorkbookMapping: false,
        issues: [],
      });
      continue;
    }

    const wb = ex.workbook();
    const sheet = getSheet(wb, ex.activeSheet);
    const starterCells = wb.sheets.reduce((n, s) => n + Object.keys(s.cells).length, 0);
    const catalog = CATALOG_BY_EXERCISE.get(ex.id);
    const catalogDatasetIds = catalog?.datasetIds ?? [];
    const missingDatasetIds = catalogDatasetIds.filter((id) => !DATASET_BY_ID.has(id));
    const binding = google.bindings.find((b) => b.exerciseId === ex.id);
    const googleStatus = binding?.status === "configured" || binding?.status === "invalid" ? binding.status : "local-only";
    const rowIssues: string[] = [];
    if (!sheet) rowIssues.push("Active sheet is missing from the starter workbook.");
    if (starterCells === 0) rowIssues.push("Starter workbook has no cells.");
    if (ex.checks.length === 0) rowIssues.push("No automated checks are defined.");
    if (missingDatasetIds.length) rowIssues.push(`Unknown dataset id(s): ${missingDatasetIds.join(", ")}`);
    if (binding?.issues.length) rowIssues.push(...binding.issues);

    const requiresDataset = starterCells === 0 || !sheet;
    const requiresWorkbookMapping = googleStatus === "local-only";
    const fullyConfigured = !requiresDataset && ex.checks.length > 0 && missingDatasetIds.length === 0;

    if (rowIssues.length) issues.push(...rowIssues.map((m) => `${ex.id}: ${m}`));
    rows.push({
      exerciseId: ex.id,
      title: ex.title,
      kind: "practical",
      starterCells,
      activeSheetOk: !!sheet,
      hasChecks: ex.checks.length > 0,
      catalogDatasetIds,
      missingDatasetIds,
      googleStatus,
      fullyConfigured,
      requiresDataset,
      requiresWorkbookMapping,
      issues: rowIssues,
    });
  }

  const practical = rows.filter((r) => r.kind === "practical");
  return {
    lessons: ALL_LESSONS.length,
    exercises: ALL_EXERCISES.length,
    practical: practical.length,
    quizzes: QUIZZES.length,
    questionExercises: rows.filter((r) => r.kind === "quiz").length,
    datasets: DATASETS.length,
    fullyConfigured: practical.filter((r) => r.fullyConfigured).length,
    requiringDataset: practical.filter((r) => r.requiresDataset).length,
    requiringWorkbookMapping: practical.filter((r) => r.requiresWorkbookMapping).length,
    invalidMappings: google.invalid + practical.filter((r) => r.missingDatasetIds.length > 0).length,
    duplicateMappings: google.duplicates.length,
    unusedMappings: google.unused.length,
    issues,
    rows,
  };
}

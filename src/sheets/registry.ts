import { ALL_EXERCISES } from "../content/registry";
import type { Exercise } from "../learning/types";
import { CATALOG_BY_EXERCISE } from "../practice/catalog";
import { DATASET_BY_ID } from "../datasets/registry";
import { GOOGLE_SHEET_DEFAULTS, type GoogleSheetAssignment, type SheetsMode } from "./catalog";
import { inspectEmbedUrl, inspectSheetsUrl, type SheetsUrlOk } from "./urls";

export type WorkbookRole = "quiz" | "local-dataset" | "published-preview" | "editable-template" | "student-copy";
export type MappingStatus = "quiz" | "local-only" | "configured" | "invalid" | "unused";

export interface ExerciseWorkbookBinding {
  workbookId: string;
  exerciseId: string;
  title: string;
  kind: "quiz" | "practical";
  roles: WorkbookRole[];
  datasetIds: string[];
  datasetTitles: string[];
  datasetNote: string;
  localSheet: string;
  /** Ranges taken from the exercise definition (editable cells and checks). */
  verifiedRanges: string[];
  google: GoogleSheetAssignment | null;
  googleSource: "none" | "settings" | "catalog";
  open: SheetsUrlOk | { ok: false; error: string } | null;
  embed: SheetsUrlOk | { ok: false; error: string } | null;
  editableOpen: SheetsUrlOk | { ok: false; error: string } | null;
  status: MappingStatus;
  issues: string[];
}

export interface WorkbookAudit {
  total: number;
  quizzes: number;
  practical: number;
  localOnly: number;
  configured: number;
  invalid: number;
  unused: string[];
  duplicates: { spreadsheetId: string; exerciseIds: string[] }[];
  missing: string[];
  issues: string[];
  bindings: ExerciseWorkbookBinding[];
}

function verifiedRanges(ex: Exercise): string[] {
  const out = new Set<string>();
  for (const r of ex.editable) out.add(r);
  for (const c of ex.checks) {
    if (c.type === "formula" || c.type === "values" || c.type === "visibleRows") out.add(`${c.sheet}!${c.range}`);
    else if (c.type === "formulaText") out.add(`${c.sheet}!${c.cell}`);
    else if (c.type === "records") out.add(`${c.sheet}!rows ${c.rows}`);
  }
  return [...out];
}

export function assignmentFor(exerciseId: string, overrides?: Record<string, GoogleSheetAssignment>): { assignment: GoogleSheetAssignment; source: "settings" | "catalog" } | null {
  if (overrides?.[exerciseId]) return { assignment: overrides[exerciseId], source: "settings" };
  if (GOOGLE_SHEET_DEFAULTS[exerciseId]) return { assignment: GOOGLE_SHEET_DEFAULTS[exerciseId], source: "catalog" };
  return null;
}

/** Resolve a configured Google workbook. Never falls back to an unrelated public sample. */
export function resolveAssignedSheet(exerciseId: string, overrides?: Record<string, GoogleSheetAssignment>) {
  const found = assignmentFor(exerciseId, overrides);
  if (!found) return null;
  const { assignment, source } = found;
  return {
    assignment,
    source,
    open: inspectSheetsUrl(assignment.spreadsheetUrl),
    embed: inspectEmbedUrl(assignment.embedUrl, assignment.spreadsheetUrl),
    fallback: assignment.fallbackUrl ? inspectSheetsUrl(assignment.fallbackUrl) : null,
  };
}

export function bindExercise(ex: Exercise, overrides?: Record<string, GoogleSheetAssignment>): ExerciseWorkbookBinding {
  const catalog = CATALOG_BY_EXERCISE.get(ex.id);
  const datasetIds = catalog?.datasetIds ?? [];
  const datasetTitles = datasetIds.map((id) => DATASET_BY_ID.get(id)?.title ?? id);
  const issues: string[] = [];
  const roles: WorkbookRole[] = [];

  if (ex.questions?.length) {
    return {
      workbookId: `wb:quiz:${ex.id}`,
      exerciseId: ex.id,
      title: ex.title,
      kind: "quiz",
      roles: ["quiz"],
      datasetIds,
      datasetTitles,
      datasetNote: ex.datasetNote,
      localSheet: ex.activeSheet,
      verifiedRanges: [],
      google: null,
      googleSource: "none",
      open: null,
      embed: null,
      editableOpen: null,
      status: "quiz",
      issues,
    };
  }

  roles.push("local-dataset");
  const found = assignmentFor(ex.id, overrides);
  let status: MappingStatus = "local-only";
  let open: ExerciseWorkbookBinding["open"] = null;
  let embed: ExerciseWorkbookBinding["embed"] = null;
  let editableOpen: ExerciseWorkbookBinding["editableOpen"] = null;
  let google: GoogleSheetAssignment | null = null;
  let googleSource: ExerciseWorkbookBinding["googleSource"] = "none";

  if (found) {
    google = found.assignment;
    googleSource = found.source;
    open = inspectSheetsUrl(found.assignment.spreadsheetUrl);
    embed = inspectEmbedUrl(found.assignment.embedUrl, found.assignment.spreadsheetUrl);
    editableOpen = found.assignment.fallbackUrl ? inspectSheetsUrl(found.assignment.fallbackUrl) : open;
    if (!open.ok) {
      status = "invalid";
      issues.push(open.error);
    } else {
      status = "configured";
      if (open.kind === "published") roles.push("published-preview");
      else roles.push("editable-template");
      if (embed.ok && (embed.kind === "published" || embed.kind === "preview" || embed.kind === "embed")) {
        if (!roles.includes("published-preview")) roles.push("published-preview");
      }
    }
    if (found.assignment.fallbackUrl && editableOpen && !editableOpen.ok) {
      issues.push(`Editable workbook URL: ${editableOpen.error}`);
      if (status !== "invalid") status = "invalid";
    }
    if (open.ok && !open.copyUrl && !found.assignment.fallbackUrl) {
      issues.push("Published-only link: students cannot use Google's official Make a copy page from this URL.");
    }
  }

  if (catalog && catalog.datasetIds.some((id) => !DATASET_BY_ID.has(id))) {
    issues.push("A listed dataset id is not in the dataset library.");
  }

  return {
    workbookId: `wb:${ex.id}`,
    exerciseId: ex.id,
    title: ex.title,
    kind: "practical",
    roles,
    datasetIds,
    datasetTitles,
    datasetNote: ex.datasetNote,
    localSheet: ex.activeSheet,
    verifiedRanges: verifiedRanges(ex),
    google,
    googleSource,
    open,
    embed,
    editableOpen,
    status,
    issues,
  };
}

export function auditWorkbookConfig(overrides?: Record<string, GoogleSheetAssignment>): WorkbookAudit {
  const bindings = ALL_EXERCISES.map((ex) => bindExercise(ex, overrides));
  const practical = bindings.filter((b) => b.kind === "practical");
  const byId = new Map<string, string[]>();
  for (const b of bindings) {
    if (b.open && b.open.ok && b.open.spreadsheetId) {
      const list = byId.get(b.open.spreadsheetId) ?? [];
      list.push(b.exerciseId);
      byId.set(b.open.spreadsheetId, list);
    }
  }
  const known = new Set(ALL_EXERCISES.map((e) => e.id));
  const unused = [
    ...Object.keys(GOOGLE_SHEET_DEFAULTS).filter((id) => !known.has(id)),
    ...Object.keys(overrides ?? {}).filter((id) => !known.has(id)),
  ];
  const issues: string[] = [];
  for (const b of bindings) issues.push(...b.issues.map((m) => `${b.exerciseId}: ${m}`));
  for (const id of unused) issues.push(`${id}: mapping does not match an exercise`);

  return {
    total: bindings.length,
    quizzes: bindings.filter((b) => b.kind === "quiz").length,
    practical: practical.length,
    localOnly: practical.filter((b) => b.status === "local-only").length,
    configured: practical.filter((b) => b.status === "configured").length,
    invalid: practical.filter((b) => b.status === "invalid").length,
    unused,
    duplicates: [...byId.entries()].filter(([, ids]) => ids.length > 1).map(([spreadsheetId, exerciseIds]) => ({ spreadsheetId, exerciseIds })),
    missing: practical.filter((b) => b.status === "local-only").map((b) => b.exerciseId),
    issues,
    bindings,
  };
}

export function modeFor(binding: ExerciseWorkbookBinding): SheetsMode {
  if (binding.embed?.ok) return "embedded-view";
  return "open-in-sheets";
}

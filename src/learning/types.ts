import type { Scalar, WorkbookData } from "../engine/types";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Job-ready";
export type ExerciseKind = "guided" | "independent" | "mastery";
/** source = built on data taken from the instructor's workbook (masked where needed); generated = new synthetic practice */
export type Origin = "source" | "generated";

export type MistakeTag =
  | "cell-reference"
  | "absolute-reference"
  | "lookup-range"
  | "col-index"
  | "approximate-match"
  | "lookup-not-found"
  | "delimiter"
  | "extra-spaces"
  | "case"
  | "date-format"
  | "function-arguments"
  | "hardcoded"
  | "wrong-function"
  | "not-general"
  | "unsupported"
  | "error-value"
  | "rounding"
  | "text-number"
  | "missing-input"
  | "operation-result"
  | "knowledge"
  | "other";

export const TAG_LABEL: Record<MistakeTag, string> = {
  "cell-reference": "Incorrect cell reference",
  "absolute-reference": "Missing absolute-reference ($) markers",
  "lookup-range": "Incorrect lookup range",
  "col-index": "Wrong lookup column index",
  "approximate-match": "Approximate match used instead of exact",
  "lookup-not-found": "Lookup value not found / not handled",
  delimiter: "Incorrect delimiter handling",
  "extra-spaces": "Extra spaces",
  case: "Capitalisation difference",
  "date-format": "Wrong date handling or formatting",
  "function-arguments": "Incorrect function arguments",
  hardcoded: "Typed a value instead of a formula",
  "wrong-function": "Required function not used",
  "not-general": "Formula only works for the current data",
  unsupported: "Unsupported function or feature",
  "error-value": "Formula returns an error",
  rounding: "Rounding difference",
  "text-number": "Text stored as a number (or the reverse)",
  "missing-input": "Required cell left empty",
  "operation-result": "Operation result differs from expected",
  knowledge: "Concept question answered incorrectly",
  other: "Other",
};

export interface InputReader {
  get(sheet: string, addr: string): Scalar;
  range(sheet: string, ref: string): Scalar[][];
}

export interface FormulaCheck {
  type: "formula";
  label: string;
  sheet: string;
  range: string;
  /** independent reference calculation from the input data (does NOT use the formula engine) */
  expected: (r: InputReader) => Scalar[][];
  /** each inner array is an "any of" group; every group must be satisfied. Omit for outcome-only checks. */
  requiredFunctions?: string[][];
  forbiddenFunctions?: string[];
  /** default true: a typed constant is rejected */
  requireFormula?: boolean;
  /** extra input variations ("sheet!addr" or "addr" -> raw) used to detect hard-coded answers */
  perturb?: Record<string, string>[];
  tolerance?: number;
  /** compare text ignoring case (default false) */
  ignoreCase?: boolean;
}
export interface ValuesCheck {
  type: "values";
  label: string;
  sheet: string;
  range: string;
  expected: Scalar[][];
  /** do not fail when an expected blank cell is blank-ish */
  trim?: boolean;
  ignoreCase?: boolean;
  tolerance?: number;
  normalizeWhitespace?: boolean;
  /** Allow the value to be typed or produced by a formula/operation (operations never need a formula) */
  note?: string;
}
export interface VisibleRowsCheck {
  type: "visibleRows";
  label: string;
  sheet: string;
  /** the table body to evaluate (header excluded) */
  range: string;
  keyCol: string;
  /** expected visible values of keyCol in order */
  expected: Scalar[];
}
export interface FormulaTextCheck {
  type: "formulaText";
  label: string;
  sheet: string;
  cell: string;
  /** regex source that the raw formula text must match. NOT evaluated. */
  pattern: string;
  message: string;
}
export interface RecordColumn {
  col: string;
  name: string;
  /** text: non-empty and not a number; number: a real number >= min; calc: a formula whose result equals calc(row) */
  kind: "text" | "number" | "calc";
  min?: number;
  calc?: (get: (col: string) => Scalar) => number;
}
/** Validates data-entry rows by rules (type, completeness, relationships) rather than exact values. */
export interface RecordsCheck {
  type: "records";
  label: string;
  sheet: string;
  /** e.g. "6:8" */
  rows: string;
  columns: RecordColumn[];
  rowRule?: (get: (col: string) => Scalar) => string | null;
}
export type Check = FormulaCheck | ValuesCheck | VisibleRowsCheck | FormulaTextCheck | RecordsCheck;

export interface McqQuestion {
  id: string;
  prompt: string;
  /** optional formula to display; for "predict" questions its engine result is verified by tests */
  formula?: string;
  options: string[];
  correct: number;
  explanation: string;
  tag?: MistakeTag;
  type?: "choice" | "predict" | "find-error" | "which-function" | "scenario" | "explain";
  /** "predict" questions: the engine evaluates this formula on this data and the result must equal options[correct] (checked by tests) */
  engine?: { cells?: Record<string, string>; formula: string };
}

export interface Solution {
  explanation: string;
  /** reference solution: "Sheet!A1" or "A1" (active sheet) -> raw input */
  cells: Record<string, string>;
  /** rows hidden by the reference solution (filter exercises) */
  hiddenRows?: number[];
}

export type ToolId = "transpose" | "textToColumns" | "autofill" | "flashfill" | "sort" | "filter";

export interface Exercise {
  id: string;
  lessonId: string;
  kind: ExerciseKind;
  title: string;
  objective: string;
  origin: Origin;
  /** stable concept ids this exercise practises */
  conceptIds: string[];
  /** where the dataset came from, in plain words */
  datasetNote: string;
  scenario?: string;
  instructions: string[];
  workbook: () => WorkbookData;
  activeSheet: string;
  /** ranges (optionally "Sheet!A1:B2") the student may edit. Everything else is locked. Empty = everything editable. */
  editable: string[];
  checks: Check[];
  hints: string[];
  solution: Solution;
  /** spreadsheet exercises vs concept questions */
  questions?: McqQuestion[];
  tools?: ToolId[];
  /** shown as a badge when the exercise is not a faithful reproduction of native Excel */
  simulationNote?: string;
  /** formula expected to be hand-written (anti-hardcoding applies) */
  difficulty: Difficulty;
  /** what the finished work must contain (practice challenges) */
  outputSpec?: string;
  /** how the answer is judged, in plain words (practice challenges) */
  criteria?: string[];
  /** typical errors, shown with the solution (practice challenges) */
  mistakes?: string[];
  /** 0–1 fraction of checks that must pass. Default 1 (every check). Frontend keys are inspectable. */
  passThreshold?: number;
}

export type CellStatus =
  | "correct"
  | "missing"
  | "wrong"
  | "error"
  | "hardcoded"
  | "wrong-function"
  | "forbidden-function"
  | "not-general"
  | "locked-changed";

export interface CellFeedback {
  sheet: string;
  addr: string;
  status: CellStatus;
  formula?: string;
  actual?: string;
  expected?: string;
  message: string;
  hint?: string;
  tag?: MistakeTag;
  checkLabel: string;
}
export interface CheckResult {
  passed: boolean;
  correct: number;
  total: number;
  /** 0–100 partial score. Passing still requires every required check unless passThreshold is set. */
  scorePercent: number;
  feedback: CellFeedback[];
  summary: string;
  tags: MistakeTag[];
  notices?: string[];
}

/* ---------- lessons ---------- */
export type Track = "classroom" | "additional";
export interface LessonContent {
  simple: string;
  useCase: string;
  syntax?: string;
  example?: { title: string; formula?: string; result?: string; steps: string[] };
  mistakes: string[];
  compat: string[];
}
export interface Lesson {
  id: string;
  track: Track;
  title: string;
  level: string; // "Classroom" or "Level 1: Beginner"...
  moduleId?: string;
  sourceSheet?: string;
  minutes: number;
  prerequisites: string[]; // lesson ids
  objectives: string[];
  conceptIds: string[];
  content: LessonContent;
  exerciseIds: string[];
  difficulty: Difficulty;
}

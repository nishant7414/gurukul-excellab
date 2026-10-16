import type { Scalar, NumberFormat } from "../engine/types";
import type { InputReader, ToolId, Check, Solution } from "../learning/types";
import type { Tier } from "../datasets/types";

/** A row of a dataset table keyed by column key (read from the worksheet at check time, so it reflects any perturbation). */
export type Row = Record<string, Scalar>;

export interface X {
  r: InputReader;
  /** every dataset table of the challenge, by alias */
  T: Record<string, Row[]>;
  /** the row being answered (column tasks) or panel row (panel tasks) */
  row: Row;
  i: number;
  /** the learner-visible input values of the current panel row */
  in: Scalar[];
  /** a named assumption cell */
  get: (name: string) => Scalar;
}

export interface Answer {
  header: string;
  label: string;
  expect: (x: X) => Scalar;
  /** formula template for the first data row; see `tpl` in build.ts */
  formula: string;
  required?: string[][];
  forbidden?: string[];
  nf?: NumberFormat;
  tolerance?: number;
  ignoreCase?: boolean;
}

export interface ColTask extends Answer {
  kind: "col";
  /** write into this EXISTING (blank) column of the table instead of adding a new column */
  into?: string;
  /** table (dataset alias) that receives the new column; default is the primary dataset */
  table?: string;
  text: string;
  /** table columns that the answer depends on; the checker re-runs the learner's formula on rotated copies of these to reject hard-coded answers */
  deps: string[];
}
export interface PanelTask {
  kind: "panel";
  table?: string;
  title: string;
  text: string;
  inputs: { header: string; values: Scalar[]; nf?: NumberFormat }[];
  answers: Answer[];
  deps: string[];
}
export interface CellsTask {
  kind: "cells";
  table?: string;
  title: string;
  text: string;
  cells: (Omit<Answer, "header"> & { header?: string })[];
  deps: string[];
}
export interface GridTask {
  kind: "grid";
  table?: string;
  title: string;
  text: string;
  rowLabels: Scalar[];
  colLabels: Scalar[];
  corner: string;
  expect: (x: X, rowLabel: Scalar, colLabel: Scalar) => Scalar;
  /** template; {rl} = this row's label cell (column absolute), {cl} = this column's label cell (row absolute) */
  formula: string;
  required?: string[][];
  label: string;
  nf?: NumberFormat;
  deps: string[];
  tolerance?: number;
}
/** one formula in one cell whose result spills into a rectangle (dynamic arrays). The rectangle is `headers.length` wide and `height` tall; expected rows are padded with blanks. */
export interface SpillTask {
  kind: "spill";
  table?: string;
  title: string;
  text: string;
  label: string;
  headers: string[];
  height: number;
  expect: (x: X) => Scalar[][];
  formula: string;
  required?: string[][];
  forbidden?: string[];
  nf?: NumberFormat;
  tolerance?: number;
  ignoreCase?: boolean;
  deps: string[];
}
/** sort and/or filter the (primary) table with the toolbar tools; the expected order and visible rows are derived from the dataset */
export interface SortFilterTask {
  kind: "sortfilter";
  table?: string;
  text: string;
  label: string;
  /** applied in order of importance: the first entry is the main sort key */
  sort?: { key: string; dir: 1 | -1 }[];
  keep?: (r: Row) => boolean;
}
export interface InputTask { kind: "input"; table?: string; name: string; label: string; value: Scalar; nf?: NumberFormat }
/** a task whose checks and reference solution are supplied directly (sorting and filtering with the toolbar tools) */
export interface RawTask {
  kind: "raw";
  text: string;
  editable: string[];
  checks: Check[];
  solution: Solution;
  tools: ToolId[];
  simulationNote?: string;
}
export type Task = ColTask | PanelTask | CellsTask | GridTask | SpillTask | SortFilterTask | InputTask | RawTask;

export interface ChallengeDef {
  id: string;
  concept: string;
  tier: Tier;
  /** dataset ids; the first is the primary dataset (its sheet is active) */
  ds: string[];
  title: string;
  minutes: number;
  /** the formula or skill practised, for the card */
  skill: string;
  /** business context shown above the instructions */
  context: string;
  /** short statement of what the finished sheet must contain */
  output: string;
  /** conceptual hints; a final hint showing the first-row formula is added automatically */
  hints: string[];
  explanation: string;
  mistakes: string[];
  tasks: (c: Ctx) => Task[];
  /** shown when the challenge needs a feature that is only simulated */
  simulationNote?: string;
  /** challenge ids considered a close variant of this one (for duplicate warnings) */
  note?: string;
}

/** Challenge-building context (available while tasks are defined). */
export interface Ctx {
  id: string;
  /** deterministic picks seeded by the challenge id */
  rng: import("../datasets/rng").Rng;
  /** dataset tables by alias (layout only; rows load on demand) */
  T: Record<string, TblInfo>;
  /** raw generated rows of a dataset, by alias (loads the dataset) */
  rows: (alias: string) => Scalar[][];
  /** indices (0-based) of n distinct rows */
  pick: (alias: string, n: number) => number[];
  /** row value by dataset column key */
  v: (alias: string, key: string, i: number) => Scalar;
}
export interface TblInfo {
  id: string;
  alias: string;
  sheet: string;
  n: number;
  /** first and last worksheet row of the data */
  first: number;
  last: number;
  /** column letter of a key */
  L: (key: string) => string;
  /** absolute range of a column, e.g. $C$2:$C$31 */
  rng: (key: string) => string;
  /** all data columns, e.g. A2:F31 */
  all: string;
}

export interface PracticeChallenge {
  id: string;
  concept: string;
  tier: Tier;
  datasetIds: string[];
  title: string;
  minutes: number;
  skill: string;
  context: string;
  output: string;
  exerciseId: string;
  /** challenge id of the original six challenges is kept in `legacy` */
  legacy?: boolean;
  /** true for challenges that practise more than one dataset */
  multiTable: boolean;
  /** original sheet-based tools used */
  simulated: boolean;
}

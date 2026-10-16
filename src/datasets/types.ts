import type { Scalar } from "../engine/types";
import type { Rng } from "./rng";

export type Tier = "Easy" | "Medium" | "Hard";
export type DataCategory =
  | "Education" | "Sales and E-commerce" | "Human Resources" | "Finance and Accounting"
  | "Inventory and Supply Chain" | "Customer Service and Marketing" | "Operations and Other" | "Data Cleaning" | "Original workbook";
export const CATEGORIES: DataCategory[] = ["Education", "Sales and E-commerce", "Human Resources", "Finance and Accounting", "Inventory and Supply Chain", "Customer Service and Marketing", "Operations and Other", "Data Cleaning", "Original workbook"];

export type ColType = "text" | "number" | "currency" | "percent" | "date" | "id" | "mixed";
export interface DatasetColumn { key: string; header: string; type: ColType; note?: string }

/** Data-quality issues a messy dataset is *declared* to contain. Tests check each declared issue is really present. */
export type QualityIssue =
  | "leading-trailing-spaces" | "inconsistent-case" | "extra-inner-spaces" | "duplicate-rows" | "missing-values"
  | "dates-as-text" | "mixed-date-formats" | "numbers-as-text" | "inconsistent-codes" | "inconsistent-categories"
  | "out-of-range" | "leading-zero-keys" | "unmatched-keys";

export interface Dataset {
  id: string;
  /** short name used in formulas, templates and `x.T.<alias>` */
  alias: string;
  /** worksheet name used when the dataset is opened in the spreadsheet (no spaces) */
  sheet: string;
  title: string;
  category: DataCategory;
  tier: Tier;
  description: string;
  /** the topics from the product brief that this dataset covers, e.g. "Student attendance" */
  topics: string[];
  columns: DatasetColumn[];
  /** declared row count (the layout is computed from this without generating rows); tests assert it equals rows().length */
  rowCount: number;
  related: string[];
  concepts: string[];
  origin: "source" | "generated";
  issues: QualityIssue[];
  /** generates (and memoises) the data rows, header excluded. Called only when a dataset is opened. */
  rows: () => Scalar[][];
  /** messy datasets: the reference clean version of the same rows (never shown before a solution is requested) */
  clean?: () => Scalar[][];
  /** where the data came from, in plain words */
  note?: string;
}

export interface DatasetInput extends Omit<Dataset, "rows" | "clean" | "origin" | "issues" | "related" | "concepts" | "note"> {
  related?: string[];
  concepts?: string[];
  issues?: QualityIssue[];
  note?: string;
  gen?: (r: Rng) => Scalar[][];
  /** messy datasets: generate the messy rows and the matching clean reference together */
  pair?: (r: Rng) => { messy: Scalar[][]; clean: Scalar[][] };
}

/** Compact column spec: [key, header, type] */
export type Col = [key: string, header: string, type: ColType];
export const cols = (cs: Col[]): DatasetColumn[] => cs.map(([key, header, type]) => ({ key, header, type }));

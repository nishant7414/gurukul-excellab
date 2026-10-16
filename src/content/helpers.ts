import type { Scalar, SheetData } from "../engine/types";
import { colToNum } from "../engine/refs";
import type { Exercise, InputReader } from "../learning/types";

export type ExerciseInput = Omit<Exercise, "difficulty" | "origin"> & { difficulty?: Exercise["difficulty"]; origin: Exercise["origin"] };

export const mk = (e: ExerciseInput): Exercise => ({ difficulty: e.kind === "guided" ? "Beginner" : e.kind === "independent" ? "Intermediate" : "Advanced", ...e });

export const widths = (s: SheetData, w: Record<string, number>): SheetData => {
  for (const [k, v] of Object.entries(w)) s.colWidths[colToNum(k)] = v;
  return s;
};

/** One column of an input range as a flat list. */
export const col = (r: InputReader, sheet: string, ref: string): Scalar[] => r.range(sheet, ref).map((x) => x[0]);
/** Pad a list to a fixed number of rows (spill checks have a fixed range). */
export const pad = (list: Scalar[], rows: number): Scalar[][] => Array.from({ length: rows }, (_, i) => [i < list.length ? list[i] : null]);
export const column = (xs: Scalar[]): Scalar[][] => xs.map((x) => [x]);
export const str = (v: Scalar) => (v === null ? "" : String(v));
export const num = (v: Scalar) => (typeof v === "number" ? v : Number(v));

/** Build solution cells by filling a column with a formula template. `{r}` is the row number. */
export function fillDown(colLetter: string, from: number, to: number, template: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (let r = from; r <= to; r++) out[`${colLetter}${r}`] = template.replace(/\{r\}/g, String(r));
  return out;
}
export function mergeCells(...parts: Record<string, string>[]): Record<string, string> {
  return Object.assign({}, ...parts);
}

export const ROUND2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

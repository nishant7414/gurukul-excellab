import type { Lesson } from "../learning/types";
import { VLOOKUP_LESSONS } from "./lessons-vl";
import { SOURCE_LESSONS } from "./lessons-src";
import { EXTRA_LESSONS } from "./lessons-extra";

export const ALL_LESSONS: Lesson[] = [...SOURCE_LESSONS, ...VLOOKUP_LESSONS, ...EXTRA_LESSONS];
export const LESSON_BY_ID = new Map(ALL_LESSONS.map((l) => [l.id, l]));

/** Source sheets in the order shown in the classroom. */
export const CLASSROOM_SHEETS: { sheet: string; title: string; blurb: string }[] = [
  { sheet: "Transpose", title: "Transpose", blurb: "Turning rows into columns." },
  { sheet: "Excel Forms", title: "Excel Forms and data entry", blurb: "Entering records in a table." },
  { sheet: "Auto and flash fill", title: "AutoFill and Flash Fill", blurb: "Series, patterns and example-based filling." },
  { sheet: "Text to column", title: "Text to Columns", blurb: "Splitting delimited text." },
  { sheet: "Handling Text Data", title: "Handling text data", blurb: "Text functions, cleanup and combining." },
  { sheet: "Vlookup ", title: "VLOOKUP and friends", blurb: "Lookups with VLOOKUP, XLOOKUP, INDEX/MATCH." },
];

export type Band = "Introductory" | "Intermediate" | "Advanced" | "Major topic";

export interface PracticeConcept {
  id: string;
  title: string;
  band: Band;
  /** minimum number of distinct, working challenges required before the concept can be called Complete */
  target: number;
  /** roadmap module (see content/modules.ts) */
  moduleId: string;
  /** roadmap lessons that this practice extends */
  lessonIds: string[];
  blurb: string;
  /** false when Gurukul ExcelLab cannot evaluate or simulate the feature, so no honest challenge can be built */
  supported: boolean;
  limitation?: string;
}

export const BAND_TARGET: Record<Band, number> = { Introductory: 5, Intermediate: 8, Advanced: 10, "Major topic": 12 };
const c = (id: string, title: string, band: Band, moduleId: string, lessonIds: string[], blurb: string, extra: Partial<PracticeConcept> = {}): PracticeConcept =>
  ({ id, title, band, target: BAND_TARGET[band], moduleId, lessonIds, blurb, supported: true, ...extra });

export const PRACTICE_CONCEPTS: PracticeConcept[] = [
  c("RF", "Cell references", "Introductory", "M02", ["A-01"], "Relative, absolute and mixed references on realistic tables."),
  c("SM", "Summary functions", "Introductory", "M03", ["A-02"], "SUM, AVERAGE, MIN, MAX, COUNT, MEDIAN, ROUND."),
  c("LG", "Logic: IF, IFS, AND, OR", "Intermediate", "M04", ["A-03"], "Decisions, tiers, flags and eligibility rules."),
  c("DT", "Dates", "Intermediate", "M07", ["A-05"], "Tenure, due dates, durations, month ends, working days."),
  c("SF", "Sorting and filtering", "Intermediate", "M09", ["A-06"], "Sort whole tables and filter rows with the toolbar tools (simulated dialogs).", { limitation: "Sorting and filtering are simulated with dialogs, not Excel's drop-down arrows." }),
  c("TX", "Text functions", "Intermediate", "M06", ["L-HT-1", "L-HT-2", "L-HT-3", "L-HT-4", "L-HT-5", "L-HT-6", "L-HT-7"], "LEFT, MID, RIGHT, FIND, SUBSTITUTE, TEXTJOIN, TEXT and friends."),
  c("FIN", "Finance calculations", "Advanced", "M21", [], "Variances, margins, schedules, payroll and forecasts built from formulas.", { limitation: "PMT, FV and PV are available. IPMT, NPV and IRR are not; some schedules still use arithmetic." }),
  c("CS", "Multi-table case studies", "Advanced", "M22", ["L-VL-5"], "Business problems that need two or more related tables and several skills."),
  c("LK", "Lookups: VLOOKUP, XLOOKUP, INDEX/MATCH", "Major topic", "M08", ["L-VL-1", "L-VL-2", "L-VL-3", "L-VL-4", "L-VL-5"], "Find values across tables, handle missing keys and messy keys."),
  c("CA", "Conditional aggregation", "Major topic", "M05", ["A-04"], "COUNTIF(S), SUMIF(S), AVERAGEIF(S), SUMPRODUCT."),
  c("DC", "Data cleaning", "Major topic", "M14", ["L-HT-1", "L-HT-2", "L-HT-3"], "Spaces, case, codes, dates and numbers stored as text, duplicates, invalid values."),
  c("DA", "Dynamic arrays", "Major topic", "M10", ["A-07"], "UNIQUE, SORT, SORTBY, FILTER, TAKE, SEQUENCE and friends.", { limitation: "Needs Excel 2021 / Microsoft 365 for the real thing; no LET, LAMBDA, VSTACK, XMATCH in the engine." }),
  c("PT", "PivotTables", "Major topic", "M18", [], "Summarise data by dragging fields.", { supported: false, limitation: "Gurukul ExcelLab cannot build or evaluate PivotTables. Planned as guided steps only; no challenge is claimed." }),
  c("PQ", "Power Query", "Major topic", "M19", [], "Import and reshape data with a query.", { supported: false, limitation: "Gurukul ExcelLab does not run Power Query. Planned as guided steps only; no challenge is claimed." }),
  c("DB", "Dashboards and charts", "Major topic", "M17", [], "Report layouts and charts built from raw data.", { supported: false, limitation: "Gurukul ExcelLab has no chart or dashboard engine, so these cannot be verified." }),
  c("DV", "Data validation", "Introductory", "M15", [], "Drop-down lists and input rules.", { supported: false, limitation: "Data validation rules are not implemented in the worksheet." }),
  c("CF", "Conditional formatting", "Introductory", "M16", [], "Highlighting cells by rule.", { supported: false, limitation: "Conditional formatting is not implemented in the worksheet." }),
];
export const CONCEPT_BY_ID = new Map(PRACTICE_CONCEPTS.map((x) => [x.id, x]));

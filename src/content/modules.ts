/** Gurukul ExcelLab's 22-module catalogue. A module with neither lessons nor practice challenges is PLANNED and shown that way everywhere. */
export interface Module {
  id: string;
  title: string;
  level: "Level 1: Beginner" | "Level 2: Intermediate" | "Level 3: Advanced" | "Level 4: Job-ready";
  summary: string;
  lessonIds: string[];
  /** true when the module is built from the instructor's workbook */
  fromSource: boolean;
  note?: string;
}

export const MODULES: Module[] = [
  { id: "M01", title: "Workbook basics and data entry", level: "Level 1: Beginner", summary: "Rows, columns, typing records, text versus numbers.", lessonIds: ["L-EF-1", "L-EF-2"], fromSource: true },
  { id: "M02", title: "Cell references", level: "Level 1: Beginner", summary: "Relative, absolute and mixed references.", lessonIds: ["A-01"], fromSource: false },
  { id: "M03", title: "Summary functions", level: "Level 1: Beginner", summary: "SUM, AVERAGE, MIN, MAX, COUNT, ROUND, MEDIAN.", lessonIds: ["A-02"], fromSource: false },
  { id: "M04", title: "Logic and decisions", level: "Level 2: Intermediate", summary: "IF, AND, OR, IFS.", lessonIds: ["A-03"], fromSource: false },
  { id: "M05", title: "Conditional totals", level: "Level 2: Intermediate", summary: "COUNTIF, SUMIF and the *IFS family.", lessonIds: ["A-04"], fromSource: false },
  { id: "M06", title: "Handling text data", level: "Level 2: Intermediate", summary: "LEFT, MID, RIGHT, TEXTAFTER, SEARCH, TRIM, PROPER, TEXT, FILTER and friends.", lessonIds: ["L-HT-1", "L-HT-2", "L-HT-3", "L-HT-4", "L-HT-5", "L-HT-6", "L-HT-7"], fromSource: true },
  { id: "M07", title: "Dates", level: "Level 3: Advanced", summary: "YEAR, MONTH, DATE, EOMONTH, NETWORKDAYS, TEXT.", lessonIds: ["A-05"], fromSource: false },
  { id: "M08", title: "Lookups", level: "Level 3: Advanced", summary: "VLOOKUP, approximate match, XLOOKUP, INDEX/MATCH.", lessonIds: ["L-VL-1", "L-VL-2", "L-VL-3", "L-VL-4", "L-VL-5"], fromSource: true },
  { id: "M09", title: "Sorting and filtering", level: "Level 2: Intermediate", summary: "Sort whole rows, filter by a condition.", lessonIds: ["A-06"], fromSource: false },
  { id: "M10", title: "Dynamic arrays", level: "Level 3: Advanced", summary: "UNIQUE, SORT, FILTER, SEQUENCE, SORTBY, TAKE.", lessonIds: ["A-07"], fromSource: false },
  { id: "M11", title: "AutoFill and Flash Fill", level: "Level 1: Beginner", summary: "Series, dates, pattern-based filling.", lessonIds: ["L-AF-1", "L-AF-2", "L-AF-3"], fromSource: true },
  { id: "M12", title: "Transpose", level: "Level 1: Beginner", summary: "Turn rows into columns with Paste Special.", lessonIds: ["L-TR-1", "L-TR-2"], fromSource: true },
  { id: "M13", title: "Text to Columns", level: "Level 1: Beginner", summary: "Split delimited text, clean the result.", lessonIds: ["L-TC-1", "L-TC-2"], fromSource: true },
  { id: "M14", title: "Data-cleaning workflows", level: "Level 4: Job-ready", summary: "Combine TRIM, PROPER, TEXTAFTER and dates on messy lists.", lessonIds: [], fromSource: false, note: "No lesson yet. Practised in the Challenges page (data-cleaning challenges on messy datasets)." },
  { id: "M15", title: "Data validation", level: "Level 3: Advanced", summary: "Drop-down lists, rules, input messages.", lessonIds: [], fromSource: false },
  { id: "M16", title: "Conditional formatting", level: "Level 3: Advanced", summary: "Highlight cells by rule.", lessonIds: [], fromSource: false },
  { id: "M17", title: "Charts", level: "Level 3: Advanced", summary: "Choose and build a chart.", lessonIds: [], fromSource: false },
  { id: "M18", title: "PivotTables (guided steps)", level: "Level 4: Job-ready", summary: "Summarise data by dragging fields. Will be taught as guided steps, not simulated.", lessonIds: [], fromSource: false },
  { id: "M19", title: "Power Query (guided steps)", level: "Level 4: Job-ready", summary: "Import and reshape data. Will be taught as guided steps, not simulated.", lessonIds: [], fromSource: false },
  { id: "M20", title: "Named ranges, tables and what-if", level: "Level 4: Job-ready", summary: "Tables, named ranges, scenarios.", lessonIds: [], fromSource: false },
  { id: "M21", title: "Finance calculations", level: "Level 4: Job-ready", summary: "Variances, margins, growth, schedules and payroll built from formulas.", lessonIds: [], fromSource: false, note: "Practice only (no lessons yet). The engine has no PMT/IPMT/NPV, so schedules are built from arithmetic." },
  { id: "M22", title: "Multi-table case studies", level: "Level 4: Job-ready", summary: "Business problems that join two or more related tables.", lessonIds: [], fromSource: false, note: "Practice only (no lessons yet). Builds on the lookup lessons." },
];

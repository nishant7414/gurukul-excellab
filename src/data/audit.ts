import { SOURCE, sourceSheet, srcCell, srcValue } from "./source";
import { ymd } from "../engine/dates";

export type Evidence = "worked-formula" | "instruction" | "dataset" | "heading-only" | "implicit";
export const EVIDENCE_LABEL: Record<Evidence, string> = {
  "worked-formula": "Worked formula present in the workbook",
  instruction: "Task instruction present in the workbook",
  dataset: "Example data present in the workbook",
  "heading-only": "Heading/label only — the workbook has no worked example (practice example is generated)",
  implicit: "Implied by the sheet, not stated (needs instructor review)",
};

export interface SourceConcept {
  id: string;
  sheet: string; // exact original sheet name
  name: string;
  evidence: Evidence;
  cells: string; // where it was found
  note?: string;
  lessonId: string;
}
const C = (id: string, sheet: string, name: string, evidence: Evidence, cells: string, lessonId: string, note?: string): SourceConcept => ({ id, sheet, name, evidence, cells, lessonId, note });

export const CONCEPTS: SourceConcept[] = [
  // Transpose
  C("C-TR-01", "Transpose", "Rows, columns, tables and ranges", "dataset", "C3:I7", "L-TR-1", "Student-fee table: 7 fields, 4 records."),
  C("C-TR-02", "Transpose", "Selecting and copying a table (Ctrl+A, Ctrl+C, Ctrl+V)", "instruction", "B12:B14", "L-TR-1"),
  C("C-TR-03", "Transpose", "Paste Special → Transpose", "instruction", "B11, B15", "L-TR-2", 'Source text reads "paste speacial -> transpose" (typo preserved in the audit).'),
  C("C-TR-04", "Transpose", "Relationship between original and transposed data", "dataset", "K4 label; L12:P18; B18:F24; L21:P27", "L-TR-2"),
  C("C-TR-05", "Transpose", "Calculating balance = Total Fee − Deposit", "worked-formula", "H6, H7 (F6-G6, F7-G7); O17, P17; E23, F23; O26, P26", "L-TR-1"),
  C("C-TR-06", "Transpose", "Verifying records and fields remain intact", "implicit", "L12:P18 vs C3:I7", "L-TR-2", "The workbook shows transposed copies but does not state a verification step; verification is taught as an extension."),
  // Excel Forms
  C("C-EF-01", "Excel Forms", "Entering structured data", "dataset", "C4:H8", "L-EF-1"),
  C("C-EF-02", "Excel Forms", "Completing missing fields", "dataset", "C6:C7 (roll numbers 13 and 14 only)", "L-EF-1"),
  C("C-EF-03", "Excel Forms", "Column alignment and avoiding overwriting neighbouring cells", "implicit", "C4:H8", "L-EF-1", "Implied by the table layout; not stated."),
  C("C-EF-04", "Excel Forms", "Text versus numeric values", "dataset", "D5:E5 (text) vs F5:H5 (numbers)", "L-EF-2"),
  C("C-EF-05", "Excel Forms", "Calculating balances", "dataset", "H5 (900 = 1000 − 100, typed as a constant)", "L-EF-1"),
  C("C-EF-06", "Excel Forms", "Checking mandatory fields and validating records", "implicit", "C6:C7 incomplete records", "L-EF-2", "No validation rule is stated in the workbook; derived from the incomplete records."),
  // Auto and flash fill
  C("C-AF-01", "Auto and flash fill", "AutoFill", "dataset", "B4:B23 (1–20); C4:C13", "L-AF-1"),
  C("C-AF-02", "Auto and flash fill", "Recognising a sequential date pattern", "dataset", "C4:C13 (consecutive date serials)", "L-AF-1"),
  C("C-AF-03", "Auto and flash fill", "Splitting full names", "dataset", "G2, G4:I9", "L-AF-2"),
  C("C-AF-04", "Auto and flash fill", "Combining first and last names", "dataset", "K2, K4:M9", "L-AF-2"),
  C("C-AF-05", "Auto and flash fill", "Extracting an email domain", "dataset", "Q2, Q4:R9", "L-AF-3"),
  C("C-AF-06", "Auto and flash fill", "Extracting the year from a date", "dataset", "G11, G13:H18", "L-AF-3"),
  C("C-AF-07", "Auto and flash fill", "Extracting the month from a date", "dataset", "I13:I18", "L-AF-3"),
  C("C-AF-08", "Auto and flash fill", "Checking results produced by automatic pattern recognition", "implicit", "H5 (trailing space), I16 (month mismatch)", "L-AF-2", "Derived from inconsistencies found in the example outputs."),
  C("C-AF-09", "Auto and flash fill", "Flash Fill as distinct from formulas", "implicit", "Whole sheet (no formulas present)", "L-AF-2", "The sheet contains no formulas, so the method used to produce the example outputs cannot be determined."),
  // Text to column
  C("C-TC-01", "Text to column", "Understanding delimiters", "dataset", "B2:B12 (comma-separated)", "L-TC-1"),
  C("C-TC-02", "Text to column", "Splitting text into columns", "dataset", "B2:F12", "L-TC-1"),
  C("C-TC-03", "Text to column", "Previewing split results", "implicit", "—", "L-TC-1", "Wizard behaviour is not in the workbook; taught as part of the operation."),
  C("C-TC-04", "Text to column", "Selecting output columns / destination", "dataset", "D2:F2 headers", "L-TC-1"),
  C("C-TC-05", "Text to column", "Leading spaces after a delimiter", "dataset", "E3, F3 (\" Smith\", \" New York\")", "L-TC-2"),
  C("C-TC-06", "Text to column", "Cleaning spaces after splitting", "implicit", "E3:F3", "L-TC-2", "Cleaning is implied by the leading spaces; not stated."),
  C("C-TC-07", "Text to column", "Checking the resulting fields", "dataset", "D3:F4", "L-TC-2"),
  // Handling Text Data
  C("C-HT-01", "Handling Text Data", "LEFT", "worked-formula", "M3:O6 (O6 =LEFT(M6,3))", "L-HT-1"),
  C("C-HT-02", "Handling Text Data", "MID", "heading-only", "N3 (\"Mid Function \")", "L-HT-1", "Heading only; no formula or data."),
  C("C-HT-03", "Handling Text Data", "RIGHT", "worked-formula", "P3:Q6 (Q6 =RIGHT(P6,2))", "L-HT-1"),
  C("C-HT-04", "Handling Text Data", "TEXTAFTER", "worked-formula", "R3:S6 (S6 =TEXTAFTER(R6,\"@\"))", "L-HT-2"),
  C("C-HT-05", "Handling Text Data", "TEXTBEFORE", "heading-only", "V3 (\"textbefore\")", "L-HT-2", "Heading only."),
  C("C-HT-06", "Handling Text Data", "TEXTSPLIT", "worked-formula", "S3, S7 (=TEXTSPLIT(R7,\"@\"))", "L-HT-2"),
  C("C-HT-07", "Handling Text Data", "SEARCH", "worked-formula", "W2, W3 (=SEARCH(\"@\",R6))", "L-HT-3"),
  C("C-HT-08", "Handling Text Data", "FIND", "worked-formula", "X2, X3 (=FIND(\"@\",R6))", "L-HT-3"),
  C("C-HT-09", "Handling Text Data", "SUBSTITUTE", "heading-only", "Y2 (\"substitute\")", "L-HT-3", "Heading only."),
  C("C-HT-10", "Handling Text Data", "TRIM", "heading-only", "U3 (\"trim\")", "L-HT-4", "Heading only."),
  C("C-HT-11", "Handling Text Data", "PROPER", "worked-formula", "AE2; BA5:BB12 (=PROPER(BA5)…)", "L-HT-4"),
  C("C-HT-12", "Handling Text Data", "UPPER", "heading-only", "AF2 (\"upper\")", "L-HT-4", "Heading only."),
  C("C-HT-13", "Handling Text Data", "LOWER", "heading-only", "AG2 (\"lower \")", "L-HT-4", "Heading only."),
  C("C-HT-14", "Handling Text Data", "LEN", "worked-formula", "AM3:AN6 (AN6 =LEN(AM6))", "L-HT-4"),
  C("C-HT-15", "Handling Text Data", "TEXT", "worked-formula", "AU3:AV6 (AV6 =TEXT(AU6,\"MMMM\"))", "L-HT-5"),
  C("C-HT-16", "Handling Text Data", "CONCATENATE", "worked-formula", "AP3:AR6 (AR6 =CONCATENATE(AP6,\"-\",AQ6))", "L-HT-5"),
  C("C-HT-17", "Handling Text Data", "FILTER", "heading-only", "AA2 (\"filter\")", "L-HT-6", "Heading only."),
  C("C-HT-18", "Handling Text Data", "TOCOL", "heading-only", "AB2 (\"tocol\")", "L-HT-6", "Heading only."),
  C("C-HT-19", "Handling Text Data", "TOROW", "heading-only", "AC2 (\"torow\")", "L-HT-6", "Heading only."),
  C("C-HT-20", "Handling Text Data", "TRANSPOSE", "heading-only", "AD2 (\"transpose\")", "L-HT-6", "Heading only."),
  C("C-HT-21", "Handling Text Data", "FILTERXML", "heading-only", "Z2 (\"filterxml\")", "L-HT-7", "Heading only. Not available in Excel for the web; not evaluated by Gurukul ExcelLab."),
  // Vlookup
  C("C-VL-A", "Vlookup ", "Lookup keys", "dataset", "B2:B62 (ProductID)", "L-VL-1"),
  C("C-VL-B", "Vlookup ", "VLOOKUP syntax", "dataset", "J2:O2 headers (…(VLOOKUP))", "L-VL-1"),
  C("C-VL-C", "Vlookup ", "Selecting the table array", "dataset", "B2:F62", "L-VL-1"),
  C("C-VL-D", "Vlookup ", "Choosing the column index", "dataset", "K2:M2 → columns 2, 3, 4 of B:F", "L-VL-1"),
  C("C-VL-E", "Vlookup ", "Exact-match lookup", "implicit", "J3:J20", "L-VL-1", "The workbook does not state exact vs approximate; exact is implied by product-ID keys."),
  C("C-VL-F", "Vlookup ", "Approximate-match lookup and its limitations", "implicit", "—", "L-VL-2", "Not present in the workbook; required by the specification and taught as an extension on generated data."),
  C("C-VL-G", "Vlookup ", "XLOOKUP syntax", "dataset", "S2:W17", "L-VL-4"),
  C("C-VL-H", "Vlookup ", "INDEX and MATCH together", "dataset", "Y2:AC17", "L-VL-5"),
  C("C-VL-I", "Vlookup ", "Retrieving product names", "dataset", "K2, T2, Z2", "L-VL-1"),
  C("C-VL-J", "Vlookup ", "Retrieving categories", "dataset", "L2, U2, AA2", "L-VL-1"),
  C("C-VL-K", "Vlookup ", "Retrieving unit prices", "dataset", "M2, V2, AB2", "L-VL-1"),
  C("C-VL-L", "Vlookup ", "Handling missing product IDs", "implicit", "—", "L-VL-2", "Every lookup ID in the workbook exists in the catalogue (verified), so the missing-ID case is generated practice."),
  C("C-VL-M", "Vlookup ", "Line amount = quantity × unit price", "worked-formula", "O2, O3:O5 (=M3*N3)", "L-VL-3"),
  C("C-VL-N", "Vlookup ", "Comparing the three lookup approaches", "implicit", "J:O vs S:W vs Y:AC", "L-VL-5"),
];

/* ------------------------------ inconsistencies ------------------------------ */
export interface Inconsistency {
  id: string;
  sheet: string;
  cells: string;
  severity: "inconsistency" | "gap" | "observation";
  text: string;
  /** executed in the test-suite against the real extracted inventory */
  verify: () => boolean;
}
const hasF = (sh: string, a: string) => !!srcCell(sh, a)?.f;
const isNum = (sh: string, a: string) => typeof srcValue(sh, a) === "number";

export const INCONSISTENCIES: Inconsistency[] = [
  { id: "INC-FILE-1", sheet: "(file)", cells: "—", severity: "observation", text: 'The inspected file is named "Data Entry.xlsx" but the specification names "Data Entry(1).xlsx". Sheet names match exactly. Please confirm it is the same workbook.', verify: () => SOURCE.fileNameInspected !== SOURCE.fileNameExpectedBySpec && SOURCE.sheetNames.length === 7 },
  { id: "INC-TR-1", sheet: "Transpose", cells: "H4:H7", severity: "inconsistency", text: "Balance is a typed constant in H4 and H5 but a formula (=F6-G6, =F7-G7) in H6 and H7.", verify: () => !hasF("Transpose", "H4") && !hasF("Transpose", "H5") && hasF("Transpose", "H6") && hasF("Transpose", "H7") },
  { id: "INC-TR-2", sheet: "Transpose", cells: "I4:I7", severity: "gap", text: "An identifier (Aadhar Number) exists only for the first record. It has been replaced by a masked synthetic value in Gurukul ExcelLab and the original is never stored.", verify: () => SOURCE.maskedCellCount >= 1 && !!srcCell("Transpose", "I4")?.masked && !srcCell("Transpose", "I5") && !srcCell("Transpose", "I6") && !srcCell("Transpose", "I7") },
  { id: "INC-TR-3", sheet: "Transpose", cells: "M17:P17", severity: "inconsistency", text: "In the transposed copy, Balance is a constant in M17:N17 but a formula in O17:P17.", verify: () => !hasF("Transpose", "M17") && !hasF("Transpose", "N17") && hasF("Transpose", "O17") && hasF("Transpose", "P17") },
  { id: "INC-TR-4", sheet: "Transpose", cells: "B15", severity: "observation", text: 'Instruction text contains the typo "speacial" (kept verbatim in the audit).', verify: () => String(srcValue("Transpose", "B15")).includes("speacial") },
  { id: "INC-EF-1", sheet: "Excel Forms", cells: "H5", severity: "observation", text: "Balance (900) is typed, not calculated, although 1000 − 100 = 900.", verify: () => !hasF("Excel Forms", "H5") && srcValue("Excel Forms", "H5") === 900 && srcValue("Excel Forms", "F5") === 1000 && srcValue("Excel Forms", "G5") === 100 },
  { id: "INC-EF-2", sheet: "Excel Forms", cells: "C6:C7", severity: "gap", text: "Records 13 and 14 contain a roll number only; every other field is empty (treated as an exercise to complete, not as an error).", verify: () => isNum("Excel Forms", "C6") && isNum("Excel Forms", "C7") && !srcCell("Excel Forms", "D6") && !srcCell("Excel Forms", "H7") },
  { id: "INC-AF-1", sheet: "Auto and flash fill", cells: "H5", severity: "inconsistency", text: 'First-name example "John " has a trailing space; the other first names do not.', verify: () => srcValue("Auto and flash fill", "H5") === "John " && srcValue("Auto and flash fill", "H6") === "Sarah" },
  { id: "INC-AF-2", sheet: "Auto and flash fill", cells: "G16, I16", severity: "inconsistency", text: "The date in G16 falls in November but the month example in I16 is 1. The other month examples agree with their dates.", verify: () => {
      const g16 = srcValue("Auto and flash fill", "G16") as number;
      const bad = ymd(g16).m !== srcValue("Auto and flash fill", "I16");
      const good = [14, 15, 17, 18].every((r) => ymd(srcValue("Auto and flash fill", `G${r}`) as number).m === srcValue("Auto and flash fill", `I${r}`));
      return bad && good;
    } },
  { id: "INC-AF-3", sheet: "Auto and flash fill", cells: "whole sheet", severity: "observation", text: "The worksheet contains no formulas, so it cannot show whether the examples came from Flash Fill, formulas or typing.", verify: () => sourceSheet("Auto and flash fill").cells.every((c) => !c.f) },
  { id: "INC-AF-4", sheet: "Auto and flash fill", cells: "C4:C13 vs B4:B23", severity: "gap", text: "Dates stop at row 13 while the numbering continues to row 23 — intentional blank practice space (not an error).", verify: () => !srcCell("Auto and flash fill", "C14") && isNum("Auto and flash fill", "B23") },
  { id: "INC-TC-1", sheet: "Text to column", cells: "D4:F4", severity: "inconsistency", text: 'Row 4 outputs repeat "John / Smith / New York" although B4 is "Alice, Johnson, Los Angeles". Not treated as authoritative; flagged for instructor review.', verify: () => srcValue("Text to column", "B4") === "Alice, Johnson, Los Angeles" && srcValue("Text to column", "D4") === "John" && srcValue("Text to column", "E4") === " Smith" },
  { id: "INC-TC-2", sheet: "Text to column", cells: "E3:F3", severity: "observation", text: 'Split results keep a leading space (" Smith", " New York") because the delimiter is "," but the source separates with ", ".', verify: () => srcValue("Text to column", "E3") === " Smith" && srcValue("Text to column", "F3") === " New York" },
  { id: "INC-HT-1", sheet: "Handling Text Data", cells: "H4:H11", severity: "inconsistency", text: "The Date column mixes text dates (e.g. \"01/15/2023\") with real date serial numbers.", verify: () => { const kinds = [4, 5, 6, 7, 8, 9, 10, 11].map((r) => typeof srcValue("Handling Text Data", `H${r}`)); return kinds.includes("string") && kinds.includes("number"); } },
  { id: "INC-HT-2", sheet: "Handling Text Data", cells: "S7:T7", severity: "observation", text: "S7 holds =TEXTSPLIT(R7,\"@\") and the second spilled value sits in T7 as a plain stored value (spill residue). The same cell range elsewhere has no such value.", verify: () => hasF("Handling Text Data", "S7") && !hasF("Handling Text Data", "T7") && srcValue("Handling Text Data", "T7") === "example.com" },
  { id: "INC-HT-3", sheet: "Handling Text Data", cells: "M4, O6", severity: "inconsistency", text: 'The task says "first three letters" of the Product Code, but codes such as "A123B" contain digits (result "A12"). Gurukul ExcelLab calls these "characters".', verify: () => String(srcValue("Handling Text Data", "M4")).includes("letters") && srcValue("Handling Text Data", "O6") === "A12" },
  { id: "INC-HT-4", sheet: "Handling Text Data", cells: "AP4, AR6", severity: "inconsistency", text: 'The task asks for "John Smith - New York" (spaces around the hyphen) but the example formula returns "John Smith-New York".', verify: () => String(srcValue("Handling Text Data", "AP4")).includes("John Smith - New York") && srcValue("Handling Text Data", "AR6") === "John Smith-New York" },
  { id: "INC-HT-5", sheet: "Handling Text Data", cells: "N3, U3, V3, Y2:AD2, AF2:AG2", severity: "gap", text: "MID, TRIM, TEXTBEFORE, SUBSTITUTE, FILTERXML, FILTER, TOCOL, TOROW, TRANSPOSE, UPPER and LOWER appear only as headings. No formula or data accompanies them, so their exercises are generated practice.", verify: () => ["N3", "U3", "V3", "Y2", "Z2", "AA2", "AB2", "AC2", "AD2", "AF2", "AG2"].every((a) => typeof srcValue("Handling Text Data", a) === "string") && !["N4", "U4", "V4", "Y3", "Z3", "AA3", "AB3", "AC3", "AD3", "AF3", "AG3"].some((a) => srcCell("Handling Text Data", a)) },
  { id: "INC-VL-1", sheet: "Vlookup ", cells: "O3:O20", severity: "gap", text: "Line Amount formulas (=M3*N3) exist only in O3:O5 and evaluate to 0 because M3:M20 is empty. Remaining cells are intentional blank practice spaces.", verify: () => hasF("Vlookup ", "O3") && hasF("Vlookup ", "O5") && !srcCell("Vlookup ", "O6") && !srcCell("Vlookup ", "M3") },
  { id: "INC-VL-2", sheet: "Vlookup ", cells: "C3:C62", severity: "observation", text: "Several product names occur under more than one ProductID with different prices (e.g. \"Classic Snack Pack\"), so ProductName is not a safe lookup key. Use the ID.", verify: () => { const m = new Map<string, number>(); sourceSheet("Vlookup ").cells.filter((c) => /^C(\d+)$/.test(c.a) && Number(c.a.slice(1)) >= 3).forEach((c) => m.set(String(c.v), (m.get(String(c.v)) ?? 0) + 1)); return [...m.values()].some((n) => n > 1); } },
  { id: "INC-VL-3", sheet: "Vlookup ", cells: "J3:J20, S3:S17, Y3:Y17", severity: "observation", text: "Every ProductID being looked up exists in the catalogue (P001–P060), so the source contains no missing-ID case.", verify: () => { const ids = new Set(sourceSheet("Vlookup ").cells.filter((c) => /^B\d+$/.test(c.a) && Number(c.a.slice(1)) >= 3).map((c) => String(c.v))); const looked = sourceSheet("Vlookup ").cells.filter((c) => /^(J|S|Y)(\d+)$/.test(c.a) && Number(c.a.slice(1)) >= 3).map((c) => String(c.v)); return ids.size === 60 && looked.length > 0 && looked.every((v) => ids.has(v)); } },
  { id: "INC-VL-4", sheet: "Vlookup ", cells: "S3:W17 vs Y3:AC17", severity: "observation", text: "Sections B (XLOOKUP) and C (INDEX/MATCH) use identical product IDs and quantities; Section A uses a different list of 18.", verify: () => { const g = (col: string) => sourceSheet("Vlookup ").cells.filter((c) => new RegExp(`^${col}\\d+$`).test(c.a) && Number(c.a.slice(col.length)) >= 3).map((c) => c.v).join("|"); return g("S") === g("Y") && g("W") === g("AC") && g("J") !== g("S"); } },
  { id: "INC-S1", sheet: "Sheet1", cells: "—", severity: "observation", text: "No identifiable learning content found.", verify: () => sourceSheet("Sheet1").empty && sourceSheet("Sheet1").cells.length === 0 },
];

export interface SheetAudit {
  name: string;
  hasContent: boolean;
  datasets: string[];
  instructions: { cell: string; text: string }[];
  uncertainty: string[];
  unsupported: string[];
  reviewStatus: "Analyzed" | "Needs review" | "Not analyzed";
}

/** Instruction-like text cells, read from the real inventory (not hand-typed). */
export function instructionsOf(sheet: string): { cell: string; text: string }[] {
  const picks: Record<string, string[]> = {
    Transpose: ["B11", "B12", "B13", "B14", "B15", "K4"],
    "Excel Forms": [],
    "Auto and flash fill": ["G2", "K2", "Q2", "G11"],
    "Text to column": [],
    "Handling Text Data": ["M4", "P4", "R4", "AM4", "AP4", "AU4"],
    "Vlookup ": [],
    Sheet1: [],
  };
  return (picks[sheet] ?? []).map((a) => ({ cell: a, text: String(srcValue(sheet, a) ?? "") }));
}

export const SHEET_AUDITS: SheetAudit[] = [
  { name: "Transpose", hasContent: true, datasets: ["Student-fee table C3:I7 (4 records, 7 fields; identifier masked)", "Transposed copies L12:P18, B18:F24, L21:P27"], instructions: instructionsOf("Transpose"), uncertainty: ["Typed vs calculated balances are mixed (INC-TR-1, INC-TR-3)."], unsupported: ["Paste Special → Transpose is reproduced as a simulation (values pasted; formulas are converted to results)."], reviewStatus: "Needs review" },
  { name: "Sheet1", hasContent: false, datasets: [], instructions: [], uncertainty: [], unsupported: [], reviewStatus: "Analyzed" },
  { name: "Excel Forms", hasContent: true, datasets: ["Student-fee table C4:H8 (1 complete record, 2 incomplete)"], instructions: [], uncertainty: ["No instruction text. Not treated as Excel's Data Form feature (no evidence in the file)."], unsupported: [], reviewStatus: "Analyzed" },
  { name: "Auto and flash fill", hasContent: true, datasets: ["Numbering B4:B23; dates C4:C13", "Names G4:I9; K4:M9", "Emails Q4:R9", "Dates G13:I18"], instructions: instructionsOf("Auto and flash fill"), uncertainty: ["No formulas present: method behind examples unknown (INC-AF-3).", "Month example I16 disagrees with its date (INC-AF-2).", "Trailing space in H5 (INC-AF-1)."], unsupported: ["Flash Fill is a simulation based on a built-in pattern library; it is not Excel's native engine."], reviewStatus: "Needs review" },
  { name: "Text to column", hasContent: true, datasets: ["Comma-separated records B3:B12 with three output columns D:F"], instructions: [], uncertainty: ["Row 4 outputs contradict the input (INC-TC-1)."], unsupported: ["The Text to Columns wizard is a simulation."], reviewStatus: "Needs review" },
  { name: "Handling Text Data", hasContent: true, datasets: ["Customer table B3:J11", "Function demo blocks M3:AV13 and BA5:BB12"], instructions: instructionsOf("Handling Text Data"), uncertainty: ["Mixed text/serial dates (INC-HT-1).", "Task wording differs from the example output (INC-HT-3, INC-HT-4).", "Eleven topics are headings only (INC-HT-5)."], unsupported: ["FILTERXML is not evaluated (guided exercise only)."], reviewStatus: "Needs review" },
  { name: "Vlookup ", hasContent: true, datasets: ["Catalogue B2:F62 (60 products)", "Section A J2:O20 (18 lookups)", "Section B S2:W17 (15)", "Section C Y2:AC17 (15)"], instructions: [], uncertainty: ["Line Amount formulas present only in O3:O5 (INC-VL-1).", "No missing-ID case in the source (INC-VL-3)."], unsupported: [], reviewStatus: "Analyzed" },
];

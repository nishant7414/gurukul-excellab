import { copySource, grid, sheetOf, srcValue, workbookOf } from "../data/source";
import { ymd } from "../engine/dates";
import type { Scalar } from "../engine/types";
import type { Exercise } from "../learning/types";
import { mk, widths } from "./helpers";

export const AF = "Auto and flash fill";
export const TC = "Text to column";

const names = [["John Smith"], ["Sarah Connor"], ["Michael Jordan"], ["Emily Blunt"], ["Chris Hemsworth"]] as const;
const firsts = ["John", "Sarah", "Michael", "Emily", "Chris"];
const lasts = ["Smith", "Connor", "Jordan", "Blunt", "Hemsworth"];
void names;

const afWidths = { B: 40, C: 100, G: 130, H: 100, I: 100, J: 110, K: 90, L: 90, M: 130, Q: 170, R: 130 };
const dateFmt = { nf: "date" as const };

/* ============================ L-AF-1 ============================ */
const AF1: Exercise[] = [
  mk({
    id: "EX-AF-1-1", lessonId: "L-AF-1", kind: "guided", origin: "source", conceptIds: ["C-AF-01"],
    title: "AutoFill a number series 1 to 20",
    objective: "Give Excel two example numbers and let AutoFill continue the pattern.",
    datasetNote: "The serial-number column B4:B23 (1–20) from the instructor's \"Auto and flash fill\" worksheet.",
    instructions: ["B4 and B5 already contain 1 and 2.", "Select B4:B23 (use the Name box, or click B4 and Shift+click B23).", "Press the AutoFill button (keyboard alternative) or drag the small square in the corner of B5 down to B23.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(AF, { ...grid("B4", [[1], [2]]) }), afWidths)),
    activeSheet: AF, editable: ["B6:B23"], tools: ["autofill"],
    checks: [{ type: "values", label: "Series 1 to 20", sheet: AF, range: "B4:B23", expected: Array.from({ length: 20 }, (_, i) => [i + 1]) }],
    hints: ["Excel needs at least two cells to know the step (2 − 1 = 1).", "Select B4:B23, then press AutoFill. The cells that already hold the pattern are the examples."],
    solution: { explanation: "With 1 and 2 as examples Excel detects a step of 1 and continues to 20.", cells: Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`B${i + 6}`, String(i + 3)])) },
  }),
  mk({
    id: "EX-AF-1-2", lessonId: "L-AF-1", kind: "independent", origin: "source", conceptIds: ["C-AF-01", "C-AF-02"],
    title: "AutoFill consecutive dates",
    objective: "Continue a sequence of dates with AutoFill.",
    datasetNote: "The ten consecutive dates C4:C13 (serials 44969–44978) from the instructor's worksheet; only the first two are given.",
    instructions: ["C4 and C5 contain two consecutive dates.", "Fill C6:C13 so the dates continue one day at a time.", "Check Answer."],
    workbook: () => { const w = workbookOf(widths(sheetOf(AF, { C3: "Date", C4: "44969", C5: "44970" }, { C4: dateFmt, C5: dateFmt }), afWidths)); return w; },
    activeSheet: AF, editable: ["C6:C13"], tools: ["autofill"],
    checks: [{ type: "values", label: "Ten consecutive dates", sheet: AF, range: "C4:C13", expected: Array.from({ length: 10 }, (_, i) => [44969 + i]) }],
    hints: ["Select C4:C13 and use AutoFill: the first two cells are the pattern."],
    solution: { explanation: "Two consecutive dates establish a step of one day.", cells: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`C${i + 6}`, String(44971 + i)])) },
  }),
  mk({
    id: "EX-AF-1-3", lessonId: "L-AF-1", kind: "mastery", origin: "generated", conceptIds: ["C-AF-01"],
    title: "Month names and invoice numbers",
    objective: "Use AutoFill on text lists and on text that ends in a number.",
    datasetNote: "Generated practice (the instructor's sheet only fills numbers and dates).",
    instructions: ["D4 contains Jan. Fill D4:D15 so it continues through Dec.", "E4 and E5 contain INV-001 and INV-002. Fill E4:E15 up to INV-012.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(AF, { D4: "Jan", E4: "INV-001", E5: "INV-002" }), { D: 80, E: 100 })),
    activeSheet: AF, editable: ["D5:D15", "E6:E15"], tools: ["autofill"],
    checks: [
      { type: "values", label: "Months", sheet: AF, range: "D4:D15", expected: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => [m]) },
      { type: "values", label: "Invoice numbers", sheet: AF, range: "E4:E15", expected: Array.from({ length: 12 }, (_, i) => [`INV-${String(i + 1).padStart(3, "0")}`]) },
    ],
    hints: ["Select D4:D15 and AutoFill; Excel knows month names.", "For E, the number keeps its leading zeros. Select E4:E15 and AutoFill."],
    solution: { explanation: "Built-in lists (months) and trailing-number text are both continued by AutoFill.", cells: { ...Object.fromEntries(["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => [`D${i + 5}`, m])), ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`E${i + 6}`, `INV-${String(i + 3).padStart(3, "0")}`])) } },
  }),
];

/* ============================ L-AF-2 ============================ */
const nameSheet = () => {
  const s = copySource(AF, "G4:G9");
  s.cells["H4"] = "First Name"; s.cells["I4"] = "Last Name"; s.cells["G2"] = "1. Splitting Full Names";
  return s;
};
const AF2: Exercise[] = [
  mk({
    id: "EX-AF-2-1", lessonId: "L-AF-2", kind: "guided", origin: "source", conceptIds: ["C-AF-03", "C-AF-08", "C-AF-09"],
    title: "Flash Fill: split first names",
    objective: "Show Flash Fill one example, then let it fill the rest of the column.",
    datasetNote: "Full names G5:G9 from the instructor's worksheet. In the source, H5 holds \"John \" with a trailing space (INC-AF-1); here the example is clean.",
    instructions: ["H5 contains the example: John.", "Click H6.", "Press the Flash Fill button. Gurukul ExcelLab works out the rule from your example and fills H6:H9.", "Read the status message under the sheet: it says which pattern was detected.", "Check Answer."],
    workbook: () => { const s = nameSheet(); s.cells["H5"] = "John"; return workbookOf(widths(s, afWidths)); },
    activeSheet: AF, editable: ["H6:H9"], tools: ["flashfill"],
    simulationNote: "Flash Fill is a simulation: Gurukul ExcelLab looks for a simple rule that matches your example(s). Real Excel's Flash Fill recognises more patterns. Flash Fill results are fixed values, not formulas.",
    checks: [{ type: "values", label: "First names", sheet: AF, range: "H5:H9", expected: firsts.map((f) => [f]) }],
    hints: ["Type the first name for the first row yourself (already done in H5).", "Select H6 and press Flash Fill."],
    solution: { explanation: "Flash Fill spotted \"text before the first space\" and applied it to the other names.", cells: { H6: "Sarah", H7: "Michael", H8: "Emily", H9: "Chris" } },
  }),
  mk({
    id: "EX-AF-2-2", lessonId: "L-AF-2", kind: "independent", origin: "source", conceptIds: ["C-AF-04", "C-AF-09"],
    title: "Flash Fill: combine first and last names",
    objective: "Combine two columns into one full name with Flash Fill.",
    datasetNote: "First and last names K5:L9 from the instructor's worksheet; M5 holds the instructor's example (\"Alice Johnson\").",
    instructions: ["M5 shows the pattern: first name, space, last name.", "Click M6 and use Flash Fill.", "Check Answer."],
    workbook: () => { const s = copySource(AF, "K4:M5"); copySource(AF, "K6:L9", { into: s }); s.cells["K2"] = "2. Combining First and Last Names"; return workbookOf(widths(s, afWidths)); },
    activeSheet: AF, editable: ["M6:M9"], tools: ["flashfill"],
    simulationNote: "Flash Fill is a simulation; the results are fixed values, not formulas.",
    checks: [{ type: "values", label: "Full names", sheet: AF, range: "M5:M9", expected: [["Alice Johnson"], ["Bob Smith"], ["Charlie Davis"], ["Diana Watson"], ["Evan Baker"]] }],
    hints: ["Click M6, then Flash Fill. It uses the two cells to the left of the active cell as inputs."],
    solution: { explanation: "Pattern: first name + \" \" + last name.", cells: { M6: "Bob Smith", M7: "Charlie Davis", M8: "Diana Watson", M9: "Evan Baker" } },
  }),
  mk({
    id: "EX-AF-2-3", lessonId: "L-AF-2", kind: "mastery", origin: "generated", conceptIds: ["C-AF-09", "C-AF-03", "C-AF-08"],
    title: "Flash Fill is static; formulas update",
    objective: "Build a first-name formula that keeps working when a name changes, unlike Flash Fill output.",
    datasetNote: "Full names G5:G9 from the instructor's worksheet. Column J is generated.",
    instructions: ["In J5:J9 write a formula that returns the first name from column G.", "Use TEXTBEFORE, or LEFT with FIND.", "Check Answer. Gurukul ExcelLab also changes some names behind the scenes to confirm your formulas update."],
    workbook: () => { const s = nameSheet(); s.cells["J4"] = "First (formula)"; return workbookOf(widths(s, afWidths)); },
    activeSheet: AF, editable: ["J5:J9"],
    checks: [{ type: "formula", label: "First names by formula", sheet: AF, range: "J5:J9", requiredFunctions: [["TEXTBEFORE", "LEFT", "MID"]], expected: (r) => [5, 6, 7, 8, 9].map((n) => [String(r.get(AF, `G${n}`)).split(" ")[0]]), perturb: [{ G5: "Zoe Adams" }, { G7: "Kim Lee" }] }],
    hints: ["=TEXTBEFORE(G5,\" \") returns the text before the first space.", "Older Excel: =LEFT(G5,FIND(\" \",G5)-1)."],
    solution: { explanation: "=TEXTBEFORE(G5,\" \") filled down. When G5 changes, J5 changes too.", cells: Object.fromEntries([5, 6, 7, 8, 9].map((n) => [`J${n}`, `=TEXTBEFORE(G${n}," ")`])) },
  }),
];

/* ============================ L-AF-3 ============================ */
const emailSheet = () => { const s = copySource(AF, "Q4:Q9"); s.cells["R4"] = "Domain"; s.cells["Q2"] = "Extracting Domain from Email Addresses"; return s; };
const dates = [45047, 44420, 44150, 43524, 44772];
const dateSheet = () => {
  const s = sheetOf(AF, { G11: "Extracting Year from Dates", G13: "Date", H13: "Year", I13: "Month", ...Object.fromEntries(dates.map((d, i) => [`G${14 + i}`, String(d)])) }, Object.fromEntries(dates.map((_, i) => [`G${14 + i}`, dateFmt])));
  return s;
};
const yr = (n: number) => ymd(n).y;
const mo = (n: number) => ymd(n).m;
const AF3: Exercise[] = [
  mk({
    id: "EX-AF-3-1", lessonId: "L-AF-3", kind: "guided", origin: "source", conceptIds: ["C-AF-05"],
    title: "Flash Fill: extract email domains",
    objective: "Extract the part of an email after @ with one example and Flash Fill.",
    datasetNote: "Email addresses Q5:Q9 from the instructor's worksheet; R5 holds the instructor's example (example.com).",
    instructions: ["R5 shows the domain of the first email.", "Click R6 and press Flash Fill.", "Check Answer."],
    workbook: () => { const s = emailSheet(); s.cells["R5"] = "example.com"; return workbookOf(widths(s, afWidths)); },
    activeSheet: AF, editable: ["R6:R9"], tools: ["flashfill"],
    simulationNote: "Flash Fill is a simulation; results are fixed values.",
    checks: [{ type: "values", label: "Domains", sheet: AF, range: "R5:R9", expected: [["example.com"], ["company.org"], ["service.net"], ["techfirm.com"], ["university.edu"]] }],
    hints: ["Click R6 and press Flash Fill."],
    solution: { explanation: "Pattern: text after the first @.", cells: { R6: "company.org", R7: "service.net", R8: "techfirm.com", R9: "university.edu" } },
  }),
  mk({
    id: "EX-AF-3-2", lessonId: "L-AF-3", kind: "independent", origin: "source", conceptIds: ["C-AF-06"],
    title: "Flash Fill: extract the year from dates",
    objective: "Pull the year out of a date column.",
    datasetNote: "Dates G14:G18 from the instructor's worksheet; H14 holds the instructor's example (2023).",
    instructions: ["H14 shows the year of the first date.", "Click H15 and run Flash Fill.", "Check Answer."],
    workbook: () => { const s = dateSheet(); s.cells["H14"] = "2023"; return workbookOf(widths(s, afWidths)); },
    activeSheet: AF, editable: ["H15:H18"], tools: ["flashfill"],
    simulationNote: "Flash Fill is a simulation; results are fixed values.",
    checks: [{ type: "values", label: "Years", sheet: AF, range: "H14:H18", expected: dates.map((d) => [yr(d)]) }],
    hints: ["Give Flash Fill the example in H14, then use it from H15."],
    solution: { explanation: "Pattern: the year of the date.", cells: Object.fromEntries(dates.slice(1).map((d, i) => [`H${15 + i}`, String(yr(d))])) },
  }),
  mk({
    id: "EX-AF-3-3", lessonId: "L-AF-3", kind: "mastery", origin: "source", conceptIds: ["C-AF-06", "C-AF-07", "C-AF-08"],
    title: "Year and month by formula",
    objective: "Use YEAR and MONTH instead of Flash Fill, and compare with the instructor's typed month column.",
    datasetNote: "Dates G14:G18 from the instructor's worksheet. The instructor's typed months (I14:I18) do not all match the dates (INC-AF-2); your formulas give the correct months.",
    instructions: ["In H14:H18 return the year of each date; in I14:I18 return the month number.", "Use the YEAR and MONTH functions.", "Check Answer."],
    workbook: () => workbookOf(widths(dateSheet(), afWidths)),
    activeSheet: AF, editable: ["H14:H18", "I14:I18"],
    checks: [
      { type: "formula", label: "Year", sheet: AF, range: "H14:H18", requiredFunctions: [["YEAR"]], expected: (r) => [14, 15, 16, 17, 18].map((n) => [yr(r.get(AF, `G${n}`) as number)]), perturb: [{ G14: "44000" }, { G16: "45500" }] },
      { type: "formula", label: "Month", sheet: AF, range: "I14:I18", requiredFunctions: [["MONTH"]], expected: (r) => [14, 15, 16, 17, 18].map((n) => [mo(r.get(AF, `G${n}`) as number)]), perturb: [{ G14: "44000" }, { G16: "45500" }] },
    ],
    hints: ["=YEAR(G14) returns the year; =MONTH(G14) returns 1–12.", "Fill both columns down to row 18."],
    solution: { explanation: "=YEAR(G14) and =MONTH(G14), filled down.", cells: Object.fromEntries([14, 15, 16, 17, 18].flatMap((n) => [[`H${n}`, `=YEAR(G${n})`], [`I${n}`, `=MONTH(G${n})`]])) },
  }),
];
void lasts;

/* ============================ Text to Columns ============================ */
const srcLines = (): string[] => Array.from({ length: 10 }, (_, i) => String(srcValue(TC, `B${3 + i}`)));
const rawSplit = (lines: string[], delim: string): Scalar[][] => lines.map((l) => l.split(delim).map((p) => (p.trim() !== "" && !isNaN(Number(p)) ? Number(p) : p)));
const putGrid = (m: Scalar[][], col0: string, row0: number): Record<string, string> => {
  const out: Record<string, string> = {};
  m.forEach((row, ri) => row.forEach((v, ci) => { if (v !== null) out[`${String.fromCharCode(col0.charCodeAt(0) + ci)}${row0 + ri}`] = typeof v === "number" ? String(v) : String(v); }));
  return out;
};
const tcBase = () => { const s = copySource(TC, "B2:B12"); s.cells["D2"] = "First Name"; s.cells["E2"] = "Last Name"; s.cells["F2"] = "City"; return s; };
const tcW = { B: 230, C: 20, D: 100, E: 100, F: 120, G: 40, H: 100, I: 100, J: 120 };

const TC1: Exercise[] = [
  mk({
    id: "EX-TC-1-1", lessonId: "L-TC-1", kind: "guided", origin: "source", conceptIds: ["C-TC-01", "C-TC-02", "C-TC-03", "C-TC-04"],
    title: "Split comma-separated text into columns",
    objective: "Use Text to Columns with a comma delimiter and choose where the result goes.",
    datasetNote: "The ten \"First, Last, City\" strings B3:B12 from the instructor's \"Text to column\" worksheet. Note the spaces after the commas.",
    instructions: ["Select B3:B12.", "Click Text to Columns. Step 1: keep Delimited. Step 2: tick Comma only and look at the preview. Step 3: set the destination to D3 and Finish.", "Leading spaces remain after a comma-only split (as in the instructor's E3 and F3). That is expected here; the next lesson cleans them.", "Check Answer."],
    workbook: () => workbookOf(widths(tcBase(), tcW)), activeSheet: TC, editable: ["D3:F12"], tools: ["textToColumns"],
    simulationNote: "The Convert Text to Columns Wizard is simulated for Delimited data only (not Fixed width).",
    checks: [{ type: "values", label: "Split with comma only", sheet: TC, range: "D3:F12", expected: rawSplit(srcLines(), ",") }],
    hints: ["The destination matters. If you keep the default, the result overwrites column B.", "Tick only Comma. If you also tick Space, \"New York\" breaks into two columns."],
    solution: { explanation: "Select B3:B12 → Delimited → Comma → destination D3. Spaces after commas stay at the start of the Last Name and City cells.", cells: putGrid(rawSplit(srcLines(), ","), "D", 3) },
  }),
  mk({
    id: "EX-TC-1-2", lessonId: "L-TC-1", kind: "independent", origin: "generated", conceptIds: ["C-TC-01", "C-TC-02", "C-TC-04"],
    title: "A different delimiter: semicolons",
    objective: "Choose the correct delimiter for different data and see numbers arrive as numbers.",
    datasetNote: "Generated order lines (the instructor's sheet only uses commas).",
    instructions: ["B3:B8 hold orders such as Laptop;45000;3.", "Split them into D3:F8 with the right delimiter.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(TC, { B2: "Order", D2: "Item", E2: "Price", F2: "Qty", ...grid("B3", [["Laptop;45000;3"], ["Mouse;650;10"], ["Monitor;12500;2"], ["Keyboard;1800;5"], ["Webcam;3200;4"], ["Cable;250;20"]]) }), tcW)),
    activeSheet: TC, editable: ["D3:F8"], tools: ["textToColumns"],
    simulationNote: "The wizard is simulated (Delimited only).",
    checks: [{ type: "values", label: "Orders split by semicolon", sheet: TC, range: "D3:F8", expected: rawSplit(["Laptop;45000;3", "Mouse;650;10", "Monitor;12500;2", "Keyboard;1800;5", "Webcam;3200;4", "Cable;250;20"], ";") }],
    hints: ["Step 2 has a Semicolon checkbox.", "Set the destination to D3."],
    solution: { explanation: "Delimited → Semicolon → destination D3.", cells: putGrid(rawSplit(["Laptop;45000;3", "Mouse;650;10", "Monitor;12500;2", "Keyboard;1800;5", "Webcam;3200;4", "Cable;250;20"], ";"), "D", 3) },
  }),
  mk({
    id: "EX-TC-1-3", lessonId: "L-TC-1", kind: "mastery", origin: "generated", conceptIds: ["C-TC-01", "C-TC-02", "C-TC-03"],
    title: "A comma inside a quoted name",
    objective: "Use the text qualifier so that a comma inside quotes does not split the field.",
    datasetNote: "Generated rows such as \"Smith, John\",Sales,45000.",
    instructions: ["Split B3:B7 into D3:F7 using Comma as the delimiter and a double quote as the text qualifier.", "Each name (\"Smith, John\") must stay in one cell and column G must stay empty.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(TC, { B2: "Record", D2: "Name", E2: "Dept", F2: "Salary", ...grid("B3", [['"Smith, John",Sales,45000'], ['"Khan, Ayesha",Stores,38000'], ['"Rao, Dev",Sales,41000'], ['"Das, Mira",HR,36000'], ['"Lee, Sam",Stores,39500']]) }), tcW)),
    activeSheet: TC, editable: ["D3:G7"], tools: ["textToColumns"],
    simulationNote: "The wizard is simulated (Delimited only).",
    checks: [{ type: "values", label: "Quoted names stay whole", sheet: TC, range: "D3:G7", expected: [["Smith, John", "Sales", 45000, null], ["Khan, Ayesha", "Stores", 38000, null], ["Rao, Dev", "Sales", 41000, null], ["Das, Mira", "HR", 36000, null], ["Lee, Sam", "Stores", 39500, null]] }],
    hints: ["In Step 2, set Text qualifier to the double quote (\").", "With the qualifier, the comma inside the quotes is ignored."],
    solution: { explanation: "Delimiter Comma + text qualifier \" keeps \"Smith, John\" in one cell.", cells: { D3: "Smith, John", E3: "Sales", F3: "45000", D4: "Khan, Ayesha", E4: "Stores", F4: "38000", D5: "Rao, Dev", E5: "Sales", F5: "41000", D6: "Das, Mira", E6: "HR", F6: "36000", D7: "Lee, Sam", E7: "Stores", F7: "39500" } },
  }),
];

const splitStart = () => { const s = tcBase(); Object.assign(s.cells, putGrid(rawSplit(srcLines(), ","), "D", 3)); s.cells["H2"] = "First (clean)"; s.cells["I2"] = "Last (clean)"; s.cells["J2"] = "City (clean)"; return s; };
const trimOf = (r: { get: (s: string, a: string) => Scalar }, col: string, n: number) => String(r.get(TC, `${col}${n}`) ?? "").replace(/ +/g, " ").trim();
const TC2: Exercise[] = [
  mk({
    id: "EX-TC-2-1", lessonId: "L-TC-2", kind: "guided", origin: "source", conceptIds: ["C-TC-05", "C-TC-06", "C-TC-07"],
    title: "Remove the leading space with TRIM",
    objective: "Spot the space left in front of a split value and clean it with TRIM.",
    datasetNote: "The split result D3:F12 reproduces the instructor's E3 (\" Smith\") and F3 (\" New York\") leading spaces.",
    instructions: ["Look at E3: the text starts with a space even though it is invisible. LEN(E3) is one more than the visible letters.", "In I3 write a formula that returns E3 without the extra space.", "Check Answer."],
    workbook: () => workbookOf(widths(splitStart(), tcW)), activeSheet: TC, editable: ["I3"],
    checks: [{ type: "formula", label: "Cleaned last name (row 3)", sheet: TC, range: "I3", requiredFunctions: [["TRIM"]], expected: (r) => [[trimOf(r, "E", 3)]], perturb: [{ E3: "  Lee  " }] }],
    hints: ["TRIM(text) removes leading and trailing spaces and collapses repeats inside.", "=TRIM(E3)"],
    solution: { explanation: "=TRIM(E3) returns Smith without the leading space.", cells: { I3: "=TRIM(E3)" } },
  }),
  mk({
    id: "EX-TC-2-2", lessonId: "L-TC-2", kind: "independent", origin: "source", conceptIds: ["C-TC-06", "C-TC-07"],
    title: "Clean all three fields for every row",
    objective: "Clean every split field with TRIM.",
    datasetNote: "Split data D3:F12 as in the instructor's sheet.",
    instructions: ["Fill H3:J12 with TRIM versions of D3:F12.", "Check Answer."],
    workbook: () => workbookOf(widths(splitStart(), tcW)), activeSheet: TC, editable: ["H3:J12"],
    checks: [{ type: "formula", label: "Trimmed fields", sheet: TC, range: "H3:J12", requiredFunctions: [["TRIM"]], expected: (r) => Array.from({ length: 10 }, (_, i) => ["D", "E", "F"].map((c) => trimOf(r, c, 3 + i))), perturb: [{ D3: " x " }, { F8: "  Paris  " }] }],
    hints: ["=TRIM(D3) in H3, then fill right to J3 and down to row 12."],
    solution: { explanation: "=TRIM(D3) filled across three columns and down ten rows.", cells: Object.fromEntries(Array.from({ length: 10 }, (_, i) => ["H", "I", "J"].map((c, k) => [`${c}${3 + i}`, `=TRIM(${["D", "E", "F"][k]}${3 + i})`])).flat()) },
  }),
  mk({
    id: "EX-TC-2-3", lessonId: "L-TC-2", kind: "mastery", origin: "generated", conceptIds: ["C-TC-02", "C-TC-05", "C-TC-06", "C-TC-07"],
    title: "Split messy data, then clean it",
    objective: "Combine the wizard and TRIM: some rows have extra spaces on both sides of the commas.",
    datasetNote: "Generated messy strings in the same First, Last, City layout.",
    instructions: ["Split B3:B8 into D3:F8 with Comma.", "Clean D3:F8 into H3:J8 with TRIM formulas.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(TC, { B2: "Full Data", D2: "First Name", E2: "Last Name", F2: "City", H2: "First (clean)", I2: "Last (clean)", J2: "City (clean)", ...grid("B3", [["John ,Smith , New York"], ["Alice,  Johnson,Los Angeles"], ["Bob , Brown ,Chicago"], ["Emma,Davis , Houston"], ["David ,  Wilson,Miami"], ["Sophia, Miller ,Dallas"]]) }), tcW)),
    activeSheet: TC, editable: ["D3:F8", "H3:J8"], tools: ["textToColumns"],
    simulationNote: "The wizard is simulated (Delimited only).",
    checks: [
      { type: "values", label: "Split with comma", sheet: TC, range: "D3:F8", expected: rawSplit(["John ,Smith , New York", "Alice,  Johnson,Los Angeles", "Bob , Brown ,Chicago", "Emma,Davis , Houston", "David ,  Wilson,Miami", "Sophia, Miller ,Dallas"], ",") },
      { type: "formula", label: "Cleaned fields", sheet: TC, range: "H3:J8", requiredFunctions: [["TRIM"]], expected: (r) => Array.from({ length: 6 }, (_, i) => ["D", "E", "F"].map((c) => trimOf(r, c, 3 + i))), perturb: [{ D3: "  Zed  " }] },
    ],
    hints: ["Split first (destination D3), then TRIM each column into H:J."],
    solution: {
      explanation: "Wizard (Comma → D3), then =TRIM(D3) filled across and down.",
      cells: { ...putGrid(rawSplit(["John ,Smith , New York", "Alice,  Johnson,Los Angeles", "Bob , Brown ,Chicago", "Emma,Davis , Houston", "David ,  Wilson,Miami", "Sophia, Miller ,Dallas"], ","), "D", 3), ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => ["H", "I", "J"].map((c, k) => [`${c}${3 + i}`, `=TRIM(${["D", "E", "F"][k]}${3 + i})`])).flat()) },
    },
  }),
];

export const AUTOFILL_EXERCISES: Exercise[] = [...AF1, ...AF2, ...AF3];
export const TEXT_TO_COLUMNS_EXERCISES: Exercise[] = [...TC1, ...TC2];

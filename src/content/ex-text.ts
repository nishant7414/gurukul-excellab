import { copySource, grid, sheetOf, workbookOf } from "../data/source";
import { MONTHS, ymd } from "../engine/dates";
import type { Scalar, WorkbookData } from "../engine/types";
import type { Exercise, McqQuestion } from "../learning/types";
import { mk, widths } from "./helpers";

export const HT = "Handling Text Data";
const W = { B: 100, C: 170, D: 90, E: 100, F: 90, G: 90, H: 90, I: 70, J: 150, M: 100, N: 60, O: 60, P: 110, Q: 50, R: 190, S: 150, T: 120, U: 90, V: 120, W: 70, X: 70, Y: 150, AM: 100, AN: 60, AP: 100, AQ: 100, AR: 200, AU: 90, AV: 90, BA: 120, BB: 120 };

const rows6to13 = [6, 7, 8, 9, 10, 11, 12, 13];
const afterAt = (s: string) => s.slice(s.indexOf("@") + 1);
const beforeAt = (s: string) => s.slice(0, s.indexOf("@"));
const proper = (s: string) => s.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_m, a, b) => a + b.toUpperCase());

const codeSheet = () => { const s = copySource(HT, "M3:M13"); copySource(HT, "P3:P13", { into: s }); return s; };
const emailSheet = () => { const s = copySource(HT, "R3:R13"); s.cells["S3"] = "Text after"; s.cells["V3"] = "textbefore"; s.cells["T3"] = "Text split"; return s; };

/* ============================ L-HT-1: LEFT / MID / RIGHT ============================ */
const HT1: Exercise[] = [
  mk({
    id: "EX-HT-1-1", lessonId: "L-HT-1", kind: "guided", origin: "source", conceptIds: ["C-HT-01"],
    title: "First three letters with LEFT",
    objective: "Extract the first characters of a product code.",
    datasetNote: "Product codes M6:M13 from the instructor's \"Handling Text Data\" worksheet (the instruction is in M4).",
    instructions: ["Task from the worksheet: extract the first three letters from the Product Code.", "Click O6 and write a formula using LEFT for the code in M6 (A123B).", "Check Answer."],
    workbook: () => { const s = codeSheet(); s.cells["M4"] = "Extract the first three letters from the Product Code."; return workbookOf(widths(s, W)); },
    activeSheet: HT, editable: ["O6"],
    checks: [{ type: "formula", label: "LEFT of M6", sheet: HT, range: "O6", requiredFunctions: [["LEFT"]], expected: (r) => [[String(r.get(HT, "M6")).slice(0, 3)]], perturb: [{ M6: "Q9876" }] }],
    hints: ["=LEFT(text, number_of_characters)", "The text is in M6 and you want 3 characters."],
    solution: { explanation: "=LEFT(M6,3) returns A12.", cells: { O6: "=LEFT(M6,3)" } },
  }),
  mk({
    id: "EX-HT-1-2", lessonId: "L-HT-1", kind: "independent", origin: "source", conceptIds: ["C-HT-01", "C-HT-03"],
    title: "LEFT for codes, RIGHT for transaction IDs",
    objective: "Use LEFT and RIGHT on whole columns.",
    datasetNote: "Product codes M6:M13 and transaction IDs P6:P13 from the instructor's worksheet.",
    instructions: ["O6:O13: the first three letters of each Product Code.", "Q6:Q13: the last two characters of each Transaction ID.", "Check Answer."],
    workbook: () => { const s = codeSheet(); s.cells["M4"] = "Extract the first three letters from the Product Code."; s.cells["P4"] = "Extract the last two characters from the Transaction ID."; return workbookOf(widths(s, W)); },
    activeSheet: HT, editable: ["O6:O13", "Q6:Q13"],
    checks: [
      { type: "formula", label: "First three letters", sheet: HT, range: "O6:O13", requiredFunctions: [["LEFT"]], expected: (r) => rows6to13.map((n) => [String(r.get(HT, `M${n}`)).slice(0, 3)]), perturb: [{ M7: "QWERT" }] },
      { type: "formula", label: "Last two characters", sheet: HT, range: "Q6:Q13", requiredFunctions: [["RIGHT"]], expected: (r) => rows6to13.map((n) => [String(r.get(HT, `P${n}`)).slice(-2)]), perturb: [{ P8: "TXN1999" }] },
    ],
    hints: ["=LEFT(M6,3) and =RIGHT(P6,2), then fill down.", "RIGHT(\"TXN1001\",2) is \"01\" (text, with the leading zero)."],
    solution: { explanation: "LEFT(M6,3) and RIGHT(P6,2) filled down.", cells: Object.fromEntries(rows6to13.flatMap((n) => [[`O${n}`, `=LEFT(M${n},3)`], [`Q${n}`, `=RIGHT(P${n},2)`]])) },
  }),
  mk({
    id: "EX-HT-1-3", lessonId: "L-HT-1", kind: "mastery", origin: "generated", conceptIds: ["C-HT-02", "C-HT-01", "C-HT-03"],
    title: "Pull the year and sequence out of an invoice ID",
    objective: "Use MID (and RIGHT) with VALUE to turn pieces of text into numbers.",
    datasetNote: "Generated IDs like INV-2024-0042. The instructor's sheet names MID but gives no example.",
    instructions: ["Each ID in A2:A7 looks like INV-2024-0042.", "B2:B7: the year as a number (MID + VALUE).", "C2:C7: the sequence number as a number (RIGHT + VALUE).", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(HT, { A1: "Invoice ID", B1: "Year", C1: "Sequence", ...grid("A2", [["INV-2024-0042"], ["INV-2023-0105"], ["INV-2024-0007"], ["INV-2022-0999"], ["INV-2025-0013"], ["INV-2021-0250"]]) }), { A: 130, B: 70, C: 90 })),
    activeSheet: HT, editable: ["B2:C7"],
    checks: [
      { type: "formula", label: "Year", sheet: HT, range: "B2:B7", requiredFunctions: [["MID"]], expected: (r) => [2, 3, 4, 5, 6, 7].map((n) => [Number(String(r.get(HT, `A${n}`)).slice(4, 8))]), perturb: [{ A2: "INV-2030-0001" }] },
      { type: "formula", label: "Sequence", sheet: HT, range: "C2:C7", requiredFunctions: [["RIGHT"]], expected: (r) => [2, 3, 4, 5, 6, 7].map((n) => [Number(String(r.get(HT, `A${n}`)).slice(-4))]), perturb: [{ A3: "INV-2000-0500" }] },
    ],
    hints: ["INV-2024-0042: the year starts at character 5 and is 4 characters long: MID(A2,5,4).", "VALUE() converts text such as \"2024\" to a number.", "=VALUE(RIGHT(A2,4))"],
    solution: { explanation: "=VALUE(MID(A2,5,4)) and =VALUE(RIGHT(A2,4)).", cells: Object.fromEntries([2, 3, 4, 5, 6, 7].flatMap((n) => [[`B${n}`, `=VALUE(MID(A${n},5,4))`], [`C${n}`, `=VALUE(RIGHT(A${n},4))`]])) },
  }),
];

/* ============================ L-HT-2: TEXTAFTER / TEXTBEFORE / TEXTSPLIT ============================ */
const HT2: Exercise[] = [
  mk({
    id: "EX-HT-2-1", lessonId: "L-HT-2", kind: "guided", origin: "source", conceptIds: ["C-HT-04"],
    title: "Domain of an email with TEXTAFTER",
    objective: "Return the text after a delimiter.",
    datasetNote: "Email addresses R6:R13 from the instructor's worksheet (S6 holds the instructor's =TEXTAFTER(R6,\"@\") example).",
    instructions: ["Task from the worksheet: extract the domain part from the email (after @).", "Click S6 and write =TEXTAFTER(...) for R6.", "Check Answer."],
    workbook: () => workbookOf(widths(emailSheet(), W)), activeSheet: HT, editable: ["S6"],
    checks: [{ type: "formula", label: "Domain of R6", sheet: HT, range: "S6", requiredFunctions: [["TEXTAFTER"]], expected: (r) => [[afterAt(String(r.get(HT, "R6")))]], perturb: [{ R6: "me@site.io" }] }],
    hints: ["=TEXTAFTER(text, delimiter)", "The delimiter is \"@\" in quotes."],
    solution: { explanation: "=TEXTAFTER(R6,\"@\") returns example.com.", cells: { S6: '=TEXTAFTER(R6,"@")' } },
  }),
  mk({
    id: "EX-HT-2-2", lessonId: "L-HT-2", kind: "independent", origin: "source", conceptIds: ["C-HT-04", "C-HT-05"],
    title: "Domain and username for every email",
    objective: "Use TEXTAFTER and TEXTBEFORE together on a column.",
    datasetNote: "R6:R13 from the instructor's worksheet. The instructor names TEXTBEFORE but gives no example; the task here is generated.",
    instructions: ["S6:S13: the domain (after @).", "V6:V13: the username (before @).", "Check Answer."],
    workbook: () => workbookOf(widths(emailSheet(), W)), activeSheet: HT, editable: ["S6:S13", "V6:V13"],
    checks: [
      { type: "formula", label: "Domains", sheet: HT, range: "S6:S13", requiredFunctions: [["TEXTAFTER"]], expected: (r) => rows6to13.map((n) => [afterAt(String(r.get(HT, `R${n}`)))]), perturb: [{ R7: "x@y.z" }] },
      { type: "formula", label: "Usernames", sheet: HT, range: "V6:V13", requiredFunctions: [["TEXTBEFORE"]], expected: (r) => rows6to13.map((n) => [beforeAt(String(r.get(HT, `R${n}`)))]), perturb: [{ R7: "x@y.z" }] },
    ],
    hints: ["=TEXTBEFORE(R6,\"@\") returns the part before the @."],
    solution: { explanation: "TEXTAFTER(R6,\"@\") and TEXTBEFORE(R6,\"@\") filled down.", cells: Object.fromEntries(rows6to13.flatMap((n) => [[`S${n}`, `=TEXTAFTER(R${n},"@")`], [`V${n}`, `=TEXTBEFORE(R${n},"@")`]])) },
  }),
  mk({
    id: "EX-HT-2-3", lessonId: "L-HT-2", kind: "mastery", origin: "source", conceptIds: ["C-HT-06"],
    title: "Split an email in one formula with TEXTSPLIT",
    objective: "Use one TEXTSPLIT formula that spills into the neighbouring cells.",
    datasetNote: "Instructor's example: S7 =TEXTSPLIT(R7,\"@\") spills the username and domain across S7:T7.",
    instructions: ["Click S7 and enter =TEXTSPLIT(R7,\"@\"). The result fills S7 and T7 (a spill).", "Do the same for R13 in S13.", "T7 and T13 must stay empty so the result has room.", "Check Answer."],
    workbook: () => workbookOf(widths(emailSheet(), W)), activeSheet: HT, editable: ["S7:T7", "S13:T13"],
    simulationNote: "TEXTSPLIT needs Excel 2021 / Microsoft 365. Older Excel shows #NAME?; use Text to Columns or LEFT/FIND there.",
    checks: [
      { type: "formula", label: "Row 7 split", sheet: HT, range: "S7:T7", requiredFunctions: [["TEXTSPLIT"]], expected: (r) => [[beforeAt(String(r.get(HT, "R7"))), afterAt(String(r.get(HT, "R7")))]], perturb: [{ R7: "a_b@c.org" }] },
      { type: "formula", label: "Row 13 split", sheet: HT, range: "S13:T13", requiredFunctions: [["TEXTSPLIT"]], expected: (r) => [[beforeAt(String(r.get(HT, "R13"))), afterAt(String(r.get(HT, "R13")))]], perturb: [{ R13: "q@w.e" }] },
    ],
    hints: ["Type the formula only in S7; do not type in T7.", "=TEXTSPLIT(R7,\"@\")"],
    solution: { explanation: "One formula per row spills across two cells.", cells: { S7: '=TEXTSPLIT(R7,"@")', S13: '=TEXTSPLIT(R13,"@")' } },
  }),
];

/* ============================ L-HT-3: SEARCH / FIND / SUBSTITUTE ============================ */
const pos = (s: string) => s.indexOf("@") + 1;
const HT3: Exercise[] = [
  mk({
    id: "EX-HT-3-1", lessonId: "L-HT-3", kind: "guided", origin: "source", conceptIds: ["C-HT-07", "C-HT-08"],
    title: "Find the position of @ with SEARCH",
    objective: "Return the character position of a symbol inside text.",
    datasetNote: "Instructor's example W3 =SEARCH(\"@\",R6) over the email in R6.",
    instructions: ["Click W3.", "Write a formula that returns the position of \"@\" in R6 (john@example.com), using SEARCH.", "Check Answer."],
    workbook: () => { const s = emailSheet(); s.cells["W2"] = "Search"; s.cells["X2"] = "find"; return workbookOf(widths(s, W)); }, activeSheet: HT, editable: ["W3"],
    checks: [{ type: "formula", label: "Position of @", sheet: HT, range: "W3", requiredFunctions: [["SEARCH"]], expected: (r) => [[pos(String(r.get(HT, "R6")))]], perturb: [{ R6: "ab@x.com" }] }],
    hints: ["=SEARCH(find_text, within_text)", "find_text is \"@\"; within_text is the cell R6."],
    solution: { explanation: "=SEARCH(\"@\",R6) returns 5 (john is 4 letters).", cells: { W3: '=SEARCH("@",R6)' } },
  }),
  mk({
    id: "EX-HT-3-2", lessonId: "L-HT-3", kind: "independent", origin: "source", conceptIds: ["C-HT-08", "C-HT-09"],
    title: "FIND positions and SUBSTITUTE",
    objective: "Use FIND on a column, then replace a character with SUBSTITUTE.",
    datasetNote: "R6:R13 from the instructor's worksheet. The instructor names SUBSTITUTE but gives no example; that task is generated.",
    instructions: ["X6:X13: the position of \"@\" using FIND.", "Y6:Y13: the email with \"@\" replaced by \" at \" using SUBSTITUTE.", "Check Answer."],
    workbook: () => { const s = emailSheet(); s.cells["X2"] = "find"; s.cells["Y2"] = "substitute"; return workbookOf(widths(s, W)); }, activeSheet: HT, editable: ["X6:Y13"],
    checks: [
      { type: "formula", label: "FIND positions", sheet: HT, range: "X6:X13", requiredFunctions: [["FIND"]], expected: (r) => rows6to13.map((n) => [pos(String(r.get(HT, `R${n}`)))]), perturb: [{ R8: "k@z.com" }] },
      { type: "formula", label: "SUBSTITUTE", sheet: HT, range: "Y6:Y13", requiredFunctions: [["SUBSTITUTE"]], expected: (r) => rows6to13.map((n) => [String(r.get(HT, `R${n}`)).replace("@", " at ")]), perturb: [{ R8: "k@z.com" }] },
    ],
    hints: ["=FIND(\"@\",R6)", "=SUBSTITUTE(R6,\"@\",\" at \")"],
    solution: { explanation: "FIND(\"@\",R6) and SUBSTITUTE(R6,\"@\",\" at \").", cells: Object.fromEntries(rows6to13.flatMap((n) => [[`X${n}`, `=FIND("@",R${n})`], [`Y${n}`, `=SUBSTITUTE(R${n},"@"," at ")`]])) },
  }),
  mk({
    id: "EX-HT-3-3", lessonId: "L-HT-3", kind: "mastery", origin: "generated", conceptIds: ["C-HT-07", "C-HT-08"],
    title: "FIND is case-sensitive, SEARCH is not",
    objective: "See the difference between FIND and SEARCH and handle the error when text is not found.",
    datasetNote: "Generated reference strings.",
    instructions: ["Column B has references; some say INV in capitals, some in lowercase.", "C2:C6: position of \"INV\" using FIND, or 0 when it is not found (use IFERROR).", "D2:D6: position of \"inv\" using SEARCH, or 0 when not found.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(HT, { A1: "Ref", B1: "Reference", C1: "FIND INV", D1: "SEARCH inv", ...grid("B2", [["INV-A12"], ["inv-b34"], ["PO-INV-77"], ["Credit-note"], ["Inv-9"]]) }), { A: 30, B: 130, C: 90, D: 100 })),
    activeSheet: HT, editable: ["C2:D6"],
    checks: [
      { type: "formula", label: "FIND (case-sensitive)", sheet: HT, range: "C2:C6", requiredFunctions: [["FIND"], ["IFERROR", "IFNA"]], expected: (r) => [2, 3, 4, 5, 6].map((n) => [String(r.get(HT, `B${n}`)).indexOf("INV") + 1]), perturb: [{ B3: "INV-1" }] },
      { type: "formula", label: "SEARCH (not case-sensitive)", sheet: HT, range: "D2:D6", requiredFunctions: [["SEARCH"], ["IFERROR", "IFNA"]], expected: (r) => [2, 3, 4, 5, 6].map((n) => [String(r.get(HT, `B${n}`)).toLowerCase().indexOf("inv") + 1]), perturb: [{ B5: "xx-inv" }] },
    ],
    hints: ["FIND(\"INV\",B2) returns #VALUE! when there is no capital INV.", "=IFERROR(FIND(\"INV\",B2),0)"],
    solution: { explanation: "IFERROR(FIND(\"INV\",B2),0) and IFERROR(SEARCH(\"inv\",B2),0).", cells: Object.fromEntries([2, 3, 4, 5, 6].flatMap((n) => [[`C${n}`, `=IFERROR(FIND("INV",B${n}),0)`], [`D${n}`, `=IFERROR(SEARCH("inv",B${n}),0)`]])) },
  }),
];

/* ============================ L-HT-4: TRIM / PROPER / UPPER / LOWER / LEN ============================ */
const nameBlock = () => copySource(HT, "AM3:AM13");
const properBlock = () => copySource(HT, "BA5:BA12");
const HT4: Exercise[] = [
  mk({
    id: "EX-HT-4-1", lessonId: "L-HT-4", kind: "guided", origin: "source", conceptIds: ["C-HT-11"],
    title: "Fix capitalisation with PROPER",
    objective: "Convert irregular capitalisation to Proper Case.",
    datasetNote: "Names BA5:BA12 from the instructor's worksheet (BB5 holds the instructor's =PROPER(BA5)).",
    instructions: ["BA5 is JoHn Smith.", "Click BB5 and make it John Smith with PROPER.", "Check Answer."],
    workbook: () => workbookOf(widths(properBlock(), W)), activeSheet: HT, editable: ["BB5"],
    checks: [{ type: "formula", label: "Proper case", sheet: HT, range: "BB5", requiredFunctions: [["PROPER"]], expected: (r) => [[proper(String(r.get(HT, "BA5")))]], perturb: [{ BA5: "aNNa dE sOUZA" }] }],
    hints: ["=PROPER(text)"], solution: { explanation: "=PROPER(BA5) returns John Smith.", cells: { BB5: "=PROPER(BA5)" } },
  }),
  mk({
    id: "EX-HT-4-2", lessonId: "L-HT-4", kind: "independent", origin: "source", conceptIds: ["C-HT-11", "C-HT-14"],
    title: "PROPER for a list and LEN for lengths",
    objective: "Apply PROPER and LEN to whole columns.",
    datasetNote: "BA5:BA12 and AM6:AM13 from the instructor's worksheet (the instructor shows AN6 =LEN(AM6) = 10).",
    instructions: ["BB5:BB12: proper-case version of BA5:BA12.", "AN6:AN13: the length of each name in AM6:AM13 (spaces count).", "Check Answer."],
    workbook: () => { const s = properBlock(); copySource(HT, "AM6:AM13", { into: s }); s.cells["AM5"] = "Name"; s.cells["AM4"] = "Find the length of each Name"; return workbookOf(widths(s, W)); },
    activeSheet: HT, editable: ["BB5:BB12", "AN6:AN13"],
    checks: [
      { type: "formula", label: "PROPER", sheet: HT, range: "BB5:BB12", requiredFunctions: [["PROPER"]], expected: (r) => [5, 6, 7, 8, 9, 10, 11, 12].map((n) => [proper(String(r.get(HT, `BA${n}`)))]), perturb: [{ BA8: "eMILY wONG" }] },
      { type: "formula", label: "LEN", sheet: HT, range: "AN6:AN13", requiredFunctions: [["LEN"]], expected: (r) => rows6to13.map((n) => [String(r.get(HT, `AM${n}`)).length]), perturb: [{ AM7: "Jo" }] },
    ],
    hints: ["=LEN(AM6) counts every character including the space."],
    solution: { explanation: "PROPER(BA5) and LEN(AM6) filled down.", cells: { ...Object.fromEntries([5, 6, 7, 8, 9, 10, 11, 12].map((n) => [`BB${n}`, `=PROPER(BA${n})`])), ...Object.fromEntries(rows6to13.map((n) => [`AN${n}`, `=LEN(AM${n})`])) } },
  }),
  mk({
    id: "EX-HT-4-3", lessonId: "L-HT-4", kind: "mastery", origin: "generated", conceptIds: ["C-HT-10", "C-HT-11", "C-HT-12", "C-HT-13", "C-HT-14"],
    title: "Clean a messy name list",
    objective: "Combine TRIM, PROPER, UPPER, LOWER and LEN to clean data.",
    datasetNote: "Generated names with extra spaces and irregular capitals.",
    instructions: ["B2:B6: clean name — remove extra spaces and use Proper Case (nest TRIM inside PROPER).", "C2:C6: the clean name in UPPER case.", "D2:D6: the clean name in lower case.", "E2:E6: how many characters TRIM removed (LEN of the original minus LEN of the clean name).", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(HT, { A1: "Raw", B1: "Clean", C1: "UPPER", D1: "lower", E1: "Spaces removed", ...grid("A2", [["  jOHN    smith "], ["maria   GARCIA"], [" raj  patel  "], ["emily WONG"], ["  chris   kim"]]) }), { A: 150, B: 130, C: 130, D: 130, E: 120 })),
    activeSheet: HT, editable: ["B2:E6"],
    checks: [
      { type: "formula", label: "Clean", sheet: HT, range: "B2:B6", requiredFunctions: [["TRIM"], ["PROPER"]], expected: (r) => [2, 3, 4, 5, 6].map((n) => [proper(String(r.get(HT, `A${n}`)).replace(/ +/g, " ").trim())]), perturb: [{ A2: "  zED   ali " }] },
      { type: "formula", label: "UPPER", sheet: HT, range: "C2:C6", requiredFunctions: [["UPPER"]], expected: (r) => [2, 3, 4, 5, 6].map((n) => [String(r.get(HT, `A${n}`)).replace(/ +/g, " ").trim().toUpperCase()]), perturb: [{ A2: "  zED   ali " }] },
      { type: "formula", label: "lower", sheet: HT, range: "D2:D6", requiredFunctions: [["LOWER"]], expected: (r) => [2, 3, 4, 5, 6].map((n) => [String(r.get(HT, `A${n}`)).replace(/ +/g, " ").trim().toLowerCase()]), perturb: [{ A2: "  zED   ali " }] },
      { type: "formula", label: "Spaces removed", sheet: HT, range: "E2:E6", requiredFunctions: [["LEN"]], expected: (r) => [2, 3, 4, 5, 6].map((n) => { const a = String(r.get(HT, `A${n}`)); return [a.length - a.replace(/ +/g, " ").trim().length]; }), perturb: [{ A2: "  zED   ali " }] },
    ],
    hints: ["=PROPER(TRIM(A2))", "C2 can use B2: =UPPER(B2).", "=LEN(A2)-LEN(B2)"],
    solution: { explanation: "B: =PROPER(TRIM(A2)); C: =UPPER(B2); D: =LOWER(B2); E: =LEN(A2)-LEN(B2).", cells: Object.fromEntries([2, 3, 4, 5, 6].flatMap((n) => [[`B${n}`, `=PROPER(TRIM(A${n}))`], [`C${n}`, `=UPPER(B${n})`], [`D${n}`, `=LOWER(B${n})`], [`E${n}`, `=LEN(A${n})-LEN(B${n})`]])) },
  }),
];
void nameBlock;

/* ============================ L-HT-5: CONCATENATE / TEXT ============================ */
const joinBlock = () => { const s = copySource(HT, "AP5:AQ13"); s.cells["AP4"] = 'Combine Name and City to form a full string like "John Smith - New York".'; return s; };
const monthOf = (serial: number) => MONTHS[ymd(serial).m - 1];
const HT5: Exercise[] = [
  mk({
    id: "EX-HT-5-1", lessonId: "L-HT-5", kind: "guided", origin: "source", conceptIds: ["C-HT-16"],
    title: "Join name and city",
    objective: "Combine two cells with a separator.",
    datasetNote: "Name/City pairs AP6:AQ13 from the instructor's worksheet. The task text asks for \"John Smith - New York\"; the instructor's own formula uses \"-\" without spaces (INC-HT-1). This exercise follows the task text.",
    instructions: ["Click AR6 and build John Smith - New York from AP6 and AQ6.", "Use CONCATENATE (or the & operator).", "Check Answer."],
    workbook: () => workbookOf(widths(joinBlock(), W)), activeSheet: HT, editable: ["AR6"],
    checks: [{ type: "formula", label: "Name - City", sheet: HT, range: "AR6", expected: (r) => [[`${r.get(HT, "AP6")} - ${r.get(HT, "AQ6")}`]], perturb: [{ AP6: "Ann Lee", AQ6: "Pune" }] }],
    hints: ["=CONCATENATE(AP6,\" - \",AQ6) or =AP6&\" - \"&AQ6", "The separator is space, hyphen, space."],
    solution: { explanation: "=CONCATENATE(AP6,\" - \",AQ6) returns John Smith - New York.", cells: { AR6: '=CONCATENATE(AP6," - ",AQ6)' } },
  }),
  mk({
    id: "EX-HT-5-2", lessonId: "L-HT-5", kind: "independent", origin: "source", conceptIds: ["C-HT-16", "C-HT-15"],
    title: "Join for every row; month names with TEXT",
    objective: "Combine columns for every row, and convert dates to month names with TEXT.",
    datasetNote: "AP6:AQ13 and the dates AU6:AU9 from the instructor's worksheet (the instructor shows AV6 =TEXT(AU6,\"MMMM\") = May).",
    instructions: ["AR6:AR13: name - city for every row.", "AV6:AV9: the full month name of each date (TEXT with \"MMMM\").", "Check Answer."],
    workbook: () => { const s = joinBlock(); copySource(HT, "AU5:AU9", { into: s }); for (const a of ["AU6", "AU7", "AU8", "AU9"]) s.formats[a] = { nf: "date" }; s.cells["AU4"] = "Find the month name from given date"; return workbookOf(widths(s, W)); },
    activeSheet: HT, editable: ["AR6:AR13", "AV6:AV9"],
    checks: [
      { type: "formula", label: "Name - City", sheet: HT, range: "AR6:AR13", expected: (r) => rows6to13.map((n) => [`${r.get(HT, `AP${n}`)} - ${r.get(HT, `AQ${n}`)}`]), perturb: [{ AQ8: "Goa" }] },
      { type: "formula", label: "Month names", sheet: HT, range: "AV6:AV9", requiredFunctions: [["TEXT"]], expected: (r) => [6, 7, 8, 9].map((n) => [monthOf(r.get(HT, `AU${n}`) as number)]), perturb: [{ AU6: "44600" }] },
    ],
    hints: ["=TEXT(AU6,\"MMMM\") gives the full month name.", "Fill both columns down."],
    solution: { explanation: "CONCATENATE and TEXT(AU6,\"MMMM\").", cells: { ...Object.fromEntries(rows6to13.map((n) => [`AR${n}`, `=CONCATENATE(AP${n}," - ",AQ${n})`])), ...Object.fromEntries([6, 7, 8, 9].map((n) => [`AV${n}`, `=TEXT(AU${n},"MMMM")`])) } },
  }),
  mk({
    id: "EX-HT-5-3", lessonId: "L-HT-5", kind: "mastery", origin: "generated", conceptIds: ["C-HT-15", "C-HT-16"],
    title: "Build an invoice sentence",
    objective: "Combine text, a formatted date and a formatted amount into one sentence.",
    datasetNote: "Generated invoice rows.",
    instructions: ["D2:D5 must read like: Invoice for Asha dated 15-Feb-2023: 1,250.50", "Use TEXT(...,\"dd-mmm-yyyy\") for the date and TEXT(...,\"#,##0.00\") for the amount, joined with & or CONCATENATE.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(HT, { A1: "Date", B1: "Amount", C1: "Customer", D1: "Sentence", A2: "44972", A3: "45048", A4: "45263", A5: "44993", B2: "1250.5", B3: "99", B4: "1234567.891", B5: "42000", ...grid("C2", [["Asha"], ["Bilal"], ["Chitra"], ["Dev"]]) }, { A2: { nf: "date" }, A3: { nf: "date" }, A4: { nf: "date" }, A5: { nf: "date" } }), { A: 100, B: 100, C: 90, D: 330 })),
    activeSheet: HT, editable: ["D2:D5"],
    checks: [{
      type: "formula", label: "Invoice sentence", sheet: HT, range: "D2:D5", requiredFunctions: [["TEXT"]],
      expected: (r) => [2, 3, 4, 5].map((n) => { const d = ymd(r.get(HT, `A${n}`) as number); const amt = (r.get(HT, `B${n}`) as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return [`Invoice for ${r.get(HT, `C${n}`)} dated ${String(d.d).padStart(2, "0")}-${MONTHS[d.m - 1].slice(0, 3)}-${d.y}: ${amt}`]; }),
      perturb: [{ B2: "5.5" }, { C3: "Zed" }],
    }],
    hints: ["=\"Invoice for \"&C2&\" dated \"&TEXT(A2,\"dd-mmm-yyyy\")&\": \"&TEXT(B2,\"#,##0.00\")"],
    solution: { explanation: "Join pieces with & and format the date and amount with TEXT.", cells: Object.fromEntries([2, 3, 4, 5].map((n) => [`D${n}`, `="Invoice for "&C${n}&" dated "&TEXT(A${n},"dd-mmm-yyyy")&": "&TEXT(B${n},"#,##0.00")`])) },
  }),
];

/* ============================ L-HT-6: FILTER / TOCOL / TOROW / TRANSPOSE ============================ */
const custTable = (): WorkbookData => { const s = copySource(HT, "B3:J11"); s.cells["L3"] = "Result"; for (const a of ["H4", "H7", "H9"]) delete s.formats[a]; return workbookOf(widths(s, { ...W, L: 130, N: 130 })); };
const custRows = [4, 5, 6, 7, 8, 9, 10, 11];
const padCol = (xs: Scalar[], n: number): Scalar[][] => Array.from({ length: n }, (_, i) => [i < xs.length ? xs[i] : null]);
const grid3 = () => workbookOf(widths(sheetOf(HT, { ...grid("A1", [[1, 2, 3], [4, 5, 6], [7, 8, 9]]), A5: "TRANSPOSE here:", E1: "TOCOL:", G1: "TOROW:" }), { A: 60, B: 50, C: 50, D: 20, E: 60, F: 50, G: 60, H: 40, I: 40, J: 40, K: 40, L: 40, M: 40, N: 40, O: 40, P: 40 }));
const HT6: Exercise[] = [
  mk({
    id: "EX-HT-6-1", lessonId: "L-HT-6", kind: "guided", origin: "source", conceptIds: ["C-HT-17"],
    title: "FILTER customers by country",
    objective: "Return only the rows that meet a condition.",
    datasetNote: "The customer table B3:J11 from the instructor's worksheet (the instructor lists FILTER as a heading only; this exercise is generated on that data).",
    instructions: ["In L4 write =FILTER(...) that returns the Name (column B) of customers whose Country (column G) is India.", "The answer spills down automatically. Leave the cells below it empty.", "Check Answer."],
    workbook: custTable, activeSheet: HT, editable: ["L4:L8"],
    simulationNote: "FILTER needs Excel 2021 / Microsoft 365.",
    checks: [{ type: "formula", label: "Indian customers", sheet: HT, range: "L4:L8", requiredFunctions: [["FILTER"]], expected: (r) => padCol(custRows.filter((n) => r.get(HT, `G${n}`) === "India").map((n) => r.get(HT, `B${n}`)), 5), perturb: [{ G5: "India" }] }],
    hints: ["=FILTER(array, include)", "array is B4:B11; include is G4:G11=\"India\"."],
    solution: { explanation: "=FILTER(B4:B11,G4:G11=\"India\") returns Raj Patel and Anita Desai.", cells: { L4: '=FILTER(B4:B11,G4:G11="India")' } },
  }),
  mk({
    id: "EX-HT-6-2", lessonId: "L-HT-6", kind: "independent", origin: "generated", conceptIds: ["C-HT-18", "C-HT-19", "C-HT-20"],
    title: "Reshape a block: TOCOL, TOROW, TRANSPOSE",
    objective: "Turn a 3×3 block into a column, a row and its transpose.",
    datasetNote: "Generated 3×3 block (the instructor lists these functions as headings only).",
    instructions: ["F1: =TOCOL(A1:C3) spills the nine values into one column.", "H1: =TOROW(A1:C3) spills them into one row.", "A6: =TRANSPOSE(A1:C3) spills a 3×3 block with rows and columns swapped.", "Check Answer."],
    workbook: grid3, activeSheet: HT, editable: ["F1:F9", "H1:P1", "A6:C8"],
    simulationNote: "TOCOL, TOROW and TRANSPOSE (spilling) need Excel 2021 / Microsoft 365 (TRANSPOSE works in older Excel as an array formula).",
    checks: [
      { type: "formula", label: "TOCOL", sheet: HT, range: "F1:F9", requiredFunctions: [["TOCOL"]], expected: (r) => r.range(HT, "A1:C3").flat().map((n) => [n]), perturb: [{ A1: "100" }] },
      { type: "formula", label: "TOROW", sheet: HT, range: "H1:P1", requiredFunctions: [["TOROW"]], expected: (r) => [r.range(HT, "A1:C3").flat()], perturb: [{ A1: "100" }] },
      { type: "formula", label: "TRANSPOSE", sheet: HT, range: "A6:C8", requiredFunctions: [["TRANSPOSE"]], expected: (r) => { const m = r.range(HT, "A1:C3"); return [0, 1, 2].map((c) => m.map((row) => row[c])); }, perturb: [{ A1: "100" }] },
    ],
    hints: ["Each formula goes in one cell only: F1, H1 and A6.", "The cells it fills must be empty."],
    solution: { explanation: "Three single-cell formulas, each spilling.", cells: { F1: "=TOCOL(A1:C3)", H1: "=TOROW(A1:C3)", A6: "=TRANSPOSE(A1:C3)" } },
  }),
  mk({
    id: "EX-HT-6-3", lessonId: "L-HT-6", kind: "mastery", origin: "generated", conceptIds: ["C-HT-17"],
    title: "FILTER with two conditions and a fallback",
    objective: "Combine conditions with multiplication and use the if_empty argument.",
    datasetNote: "Customer table B3:J11 from the instructor's worksheet; the conditions are generated.",
    instructions: ["L4: names of customers from India with Amount greater than 280.", "N4: names of customers from India with Amount greater than 1000. Nobody qualifies, so show the text None instead of an error.", "Check Answer."],
    workbook: custTable, activeSheet: HT, editable: ["L4:L6", "N4:N6"],
    simulationNote: "FILTER needs Excel 2021 / Microsoft 365.",
    checks: [
      { type: "formula", label: "India and Amount > 280", sheet: HT, range: "L4:L6", requiredFunctions: [["FILTER"]], expected: (r) => padCol(custRows.filter((n) => r.get(HT, `G${n}`) === "India" && (r.get(HT, `I${n}`) as number) > 280).map((n) => r.get(HT, `B${n}`)), 3), perturb: [{ I11: "600" }] },
      { type: "formula", label: "India and Amount > 1000, else None", sheet: HT, range: "N4:N6", requiredFunctions: [["FILTER"]], expected: (r) => { const hit = custRows.filter((n) => r.get(HT, `G${n}`) === "India" && (r.get(HT, `I${n}`) as number) > 1000).map((n) => r.get(HT, `B${n}`)); return padCol(hit.length ? hit : ["None"], 3); }, perturb: [{ I6: "5000" }] },
    ],
    hints: ["Multiply conditions for AND: (G4:G11=\"India\")*(I4:I11>280).", "The third argument of FILTER is the value to show when nothing matches."],
    solution: { explanation: "=FILTER(B4:B11,(G4:G11=\"India\")*(I4:I11>280)) and the same with 1000 and \"None\" as if_empty.", cells: { L4: '=FILTER(B4:B11,(G4:G11="India")*(I4:I11>280))', N4: '=FILTER(B4:B11,(G4:G11="India")*(I4:I11>1000),"None")' } },
  }),
];

/* ============================ L-HT-7: FILTERXML (question-based, not evaluated) ============================ */
const quizSheet = () => workbookOf(sheetOf("Concept", {}));
/** Deterministic shuffle so the right answer is not always the first option (same order on every load, so tests and learners agree). */
function shuffleOptions(exId: string, q: McqQuestion): McqQuestion {
  let h = 2166136261;
  for (const ch of `${exId}:${q.id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => { h = (h + 0x6d2b79f5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return { ...q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct) };
}
const mcqExercise = (input: { id: string; lessonId: string; kind: Exercise["kind"]; title: string; objective: string; conceptIds: string[]; questions: McqQuestion[]; hints: string[]; origin?: Exercise["origin"]; datasetNote?: string }): Exercise => {
  const e = { ...input, questions: input.questions.map((q) => shuffleOptions(input.id, q)) };
  return mk({
    id: e.id, lessonId: e.lessonId, kind: e.kind, origin: e.origin ?? "generated", conceptIds: e.conceptIds, title: e.title, objective: e.objective,
    datasetNote: e.datasetNote ?? "Concept questions written for Gurukul ExcelLab.", instructions: ["Choose one answer for every question, then press Check Answer."],
    workbook: quizSheet, activeSheet: "Concept", editable: [], checks: [], hints: e.hints, questions: e.questions,
    solution: { explanation: e.questions.map((q) => `${q.prompt} → ${q.options[q.correct]}`).join(" | "), cells: {} },
  });
};
const HT7: Exercise[] = [
  mcqExercise({
    id: "EX-HT-7-1", lessonId: "L-HT-7", kind: "guided", title: "What FILTERXML does", objective: "Describe FILTERXML, its two arguments and where it works.", conceptIds: ["C-HT-21"], origin: "source",
    datasetNote: "The instructor's worksheet lists \"filterxml\" as a heading with no example (INC-HT-2). These are concept questions; Gurukul ExcelLab does not evaluate FILTERXML.",
    hints: ["FILTERXML reads text that is XML and picks parts using an XPath address."],
    questions: [
      { id: "q1", prompt: "What does FILTERXML return?", options: ["Parts of an XML text that match an XPath expression", "Rows of a table that match a condition", "The XML file saved on disk", "A count of XML tags"], correct: 0, explanation: "FILTERXML(xml, xpath) parses XML held as text and returns the nodes that match the XPath.", tag: "knowledge" },
      { id: "q2", prompt: "What is the second argument of FILTERXML?", options: ["An XPath expression such as //city", "A delimiter", "A column index number", "A file name"], correct: 0, explanation: "The second argument is an XPath expression, for example \"//city\" selects every <city> element.", tag: "knowledge" },
      { id: "q3", prompt: "Where is FILTERXML NOT available?", options: ["Excel for the web and Excel for Mac", "Excel for Windows", "Every version of Excel", "Only Excel 2007"], correct: 0, explanation: "Microsoft documents FILTERXML as unavailable in Excel for the web and Excel for Mac, so workbooks that must run everywhere should avoid it.", tag: "knowledge" },
    ],
  }),
  mk({
    id: "EX-HT-7-2", lessonId: "L-HT-7", kind: "independent", origin: "generated", conceptIds: ["C-HT-21"],
    title: "Write the shape of a FILTERXML formula",
    objective: "Write a correctly shaped FILTERXML formula: an XML text and an XPath.",
    datasetNote: "Generated XML snippet. Gurukul ExcelLab checks only the shape of the formula; it does not evaluate FILTERXML.",
    instructions: ["A1 contains XML text with three <city> elements.", "In C1 write a FILTERXML formula that reads the XML in A1 and selects every <city> using the XPath //city.", "Check Answer (shape only)."],
    workbook: () => workbookOf(widths(sheetOf(HT, { A1: "<list><city>Pune</city><city>Delhi</city><city>Goa</city></list>", C1: "" }), { A: 380, C: 200 })), activeSheet: HT, editable: ["C1"],
    simulationNote: "FILTERXML is not evaluated by Gurukul ExcelLab, so the cell will show #UNSUPPORTED!. Only the formula's shape is checked. In real Excel for Windows it would return Pune, Delhi and Goa.",
    checks: [{ type: "formulaText", label: "FILTERXML shape", sheet: HT, cell: "C1", pattern: '^=\\s*FILTERXML\\(\\s*A1\\s*,\\s*"//\\s*city\\s*"\\s*\\)\\s*$', message: "Expected =FILTERXML(A1,\"//city\"): the XML cell first, then the XPath in quotes." }],
    hints: ["=FILTERXML(xml, xpath)", "The xml argument is the cell A1. The xpath is the text \"//city\"."],
    solution: { explanation: "=FILTERXML(A1,\"//city\") (Excel for Windows returns the three city names).", cells: { C1: '=FILTERXML(A1,"//city")' } },
  }),
  mcqExercise({
    id: "EX-HT-7-3", lessonId: "L-HT-7", kind: "mastery", title: "Choosing the right text tool", objective: "Pick a portable alternative and predict simple results.", conceptIds: ["C-HT-21", "C-HT-04"],
    hints: ["Think about who has to open the file and which version of Excel they use."],
    questions: [
      { id: "q1", prompt: "A teammate on Excel for the web gets #NAME? from FILTERXML. What is the best fix?", options: ["Avoid FILTERXML: split the text with TEXTBEFORE/TEXTAFTER, Text to Columns or LEFT/FIND", "Retype the formula in capitals", "Turn on iterative calculation", "Add more brackets"], correct: 0, explanation: "FILTERXML is not available in Excel for the web, so use functions that exist everywhere.", tag: "unsupported", type: "scenario" },
      { id: "q2", prompt: "What does this formula return?", formula: '=TEXTAFTER("raj@india.com","@")', options: ["india.com", "raj", "@india.com", "raj@india"], correct: 0, explanation: "TEXTAFTER returns everything after the first \"@\".", tag: "function-arguments", type: "predict", engine: { formula: '=TEXTAFTER("raj@india.com","@")' } },
      { id: "q3", prompt: "Which formula is a valid FILTERXML shape?", options: ["=FILTERXML(A1,\"//city\")", "=FILTERXML(\"//city\")", "=FILTERXML(A1)", "=FILTERXML(//city,A1)"], correct: 0, explanation: "FILTERXML needs the XML text first and an XPath string second.", tag: "function-arguments", type: "find-error" },
    ],
  }),
];

export const TEXT_EXERCISES: Exercise[] = [...HT1, ...HT2, ...HT3, ...HT4, ...HT5, ...HT6, ...HT7];
export { mcqExercise };

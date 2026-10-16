import { grid, sheetOf, workbookOf } from "../data/source";
import { dateToSerial } from "../engine/dates";
import type { CellFormat, Scalar } from "../engine/types";
import type { Difficulty, Exercise, InputReader } from "../learning/types";
import { col, fillDown, mergeCells, mk, pad, widths } from "./helpers";

const n = (v: Scalar) => (typeof v === "number" ? v : Number(v));

export interface Challenge {
  id: string;
  exerciseId: string;
  title: string;
  difficulty: Difficulty;
  minutes: number;
  skills: string[];
  blurb: string;
}

/* ---------------- CH-1 sales commission tiers (approximate match) ---------------- */
const SA = "Sales";
const reps: [string, number][] = [["Asha", 8400], ["Ben", 10000], ["Chen", 24999], ["Dina", 25000], ["Eli", 31250], ["Farah", 49999], ["Gus", 50000], ["Hana", 72500]];
const TIERS: [number, number][] = [[0, 0], [10000, 0.03], [25000, 0.05], [50000, 0.08]];
const commission = () => workbookOf(widths(sheetOf(SA, { ...grid("A1", [["Rep", "Sales", "Commission"], ...reps.map(([a, b]) => [a, b, null])]), ...grid("E1", [["Sales from", "Rate"], ...TIERS.map(([a, b]) => [a, b])]) }), { A: 80, B: 80, C: 100, E: 90, F: 70 }));

/* ---------------- CH-2 clean the customer list ---------------- */
const CL = "Customers";
const messy: [string, string][] = [["  rAJ   pAtEl ", " RAJ.PATEL@Example.COM "], ["maria  SILVA", "Maria@Mail.Org"], [" li   WEI", "li.wei@Corp.Net  "], ["ANITA desai ", " anita@Example.com"], ["  tom  o  brien", "TOM@Home.IO"]];
const proper = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const customers = () => workbookOf(widths(sheetOf(CL, grid("A1", [["Raw name", "Raw email", "Clean name", "Email domain"], ...messy.map(([a, b]) => [a, b, null, null])])), { A: 150, B: 190, C: 140, D: 130 }));

/* ---------------- CH-3 overdue tracker ---------------- */
const IV = "Invoices";
const inv: [string, [number, number, number], string][] = [["INV-1", [2024, 5, 20], "Yes"], ["INV-2", [2024, 6, 10], "No"], ["INV-3", [2024, 6, 30], "No"], ["INV-4", [2024, 7, 15], "No"], ["INV-5", [2024, 6, 1], "Yes"], ["INV-6", [2024, 7, 1], "No"]];
const TODAY = dateToSerial(2024, 7, 1);
const dateFmt = (cells: string[]): Record<string, CellFormat> => Object.fromEntries(cells.map((c) => [c, { nf: "date" } as CellFormat]));
const invoices = () => workbookOf(widths(sheetOf(IV, { ...grid("A1", [["Invoice", "Due date", "Paid?", "Status", "Days overdue"], ...inv.map(([a, d, p]) => [a, dateToSerial(...d), p, null, null])]), ...grid("G1", [["Today"], [TODAY]]) }, dateFmt([...inv.map((_, k) => `B${k + 2}`), "G2"])), { A: 70, B: 100, C: 60, D: 80, E: 110, G: 100 }));
const status = (due: number, paid: string, today: number) => (paid === "Yes" ? "Paid" : due < today ? "Overdue" : "Open");

/* ---------------- CH-4 region x status cross-tab ---------------- */
const OR = "Orders";
type Ord = [number, string, string, number, string];
const orders: Ord[] = [[1, "North", "Asha", 40, "Delivered"], [2, "South", "Ben", 25, "Pending"], [3, "North", "Chen", 60, "Delivered"], [4, "East", "Asha", 15, "Delivered"], [5, "West", "Ben", 50, "Cancelled"], [6, "South", "Chen", 35, "Delivered"], [7, "North", "Asha", 20, "Pending"], [8, "East", "Ben", 45, "Delivered"], [9, "West", "Asha", 30, "Delivered"], [10, "South", "Asha", 55, "Delivered"], [11, "East", "Chen", 10, "Pending"], [12, "North", "Ben", 70, "Cancelled"]];
const REGIONS = ["North", "South", "East", "West"], STATUSES = ["Delivered", "Pending", "Cancelled"];
const crosstab = () => workbookOf(widths(sheetOf(OR, { ...grid("A1", [["Order", "Region", "Rep", "Units", "Status"], ...orders.map((o) => [...o])]), ...grid("H1", [["Region", ...STATUSES, "Total"]]), ...grid("H2", REGIONS.map((x) => [x])) }), { A: 55, B: 60, C: 55, D: 50, E: 80, H: 70, I: 80, J: 70, K: 80, L: 60 }));
const unitsOf = (r: InputReader, region: string, st: string) => col(r, OR, "A2:A13").reduce<number>((s, _, k) => (r.get(OR, `B${k + 2}`) === region && r.get(OR, `E${k + 2}`) === st ? s + n(r.get(OR, `D${k + 2}`)) : s), 0);

/* ---------------- CH-5 debug the sheet ---------------- */
const FX = "Fix";
const fixSheet = () => workbookOf(widths(sheetOf(FX, { ...grid("A1", [["Item", "Qty", "Price", "Total"], ["Pens", 10, 1.5, "=B2*C3"], ["Books", 4, 12, "=B3+C3"], ["Bags", 2, 30, "=B4*C4"], ["Caps", 6, 8, 48], ["Cups", 12, 2.5, "=B6*C6"]]), ...grid("F1", [["Grand total"]]), ...grid("G1", [["=SUM(D2:D4)"]]) }), { A: 70, B: 50, C: 60, D: 70, F: 90, G: 80 }));
const fixItems = [[10, 1.5], [4, 12], [2, 30], [6, 8], [12, 2.5]];

/* ---------------- CH-6 top three ---------------- */
const TP = "Team";
const team: [string, number][] = [["Asha", 72], ["Ben", 88], ["Chen", 64], ["Dina", 91], ["Eli", 58], ["Farah", 77], ["Gus", 85], ["Hana", 69]];
const teamSheet = () => workbookOf(widths(sheetOf(TP, grid("A1", [["Name", "Score"], ...team.map(([a, b]) => [a, b])])), { A: 80, B: 60, D: 110 }));

const base = { kind: "mastery" as const, origin: "generated" as const, conceptIds: [] as string[] };
export const CHALLENGE_EXERCISES: Exercise[] = [
  mk({
    ...base, id: "EX-CH-1", lessonId: "CH-1", difficulty: "Job-ready", title: "Sales commission tiers", objective: "Look up a rate from a tier table with an approximate match, then calculate the commission.",
    datasetNote: "Generated sales figures and a tier table in E1:F5. Boundaries (10,000 / 25,000 / 50,000) are included on purpose.", scenario: "A company pays 0% below 10,000, 3% from 10,000, 5% from 25,000 and 8% from 50,000. Each rep's whole sales figure earns the rate of the highest tier reached.",
    instructions: ["In C2:C9 calculate each rep's commission = Sales × the rate from the tier table (E2:F5).", "Use an approximate-match lookup (VLOOKUP with TRUE, or INDEX/MATCH with match type 1). The tier table is sorted from smallest to largest.", "Fill down; lock the tier table with $."],
    workbook: commission, activeSheet: SA, editable: ["C2:C9"],
    checks: [{ type: "formula", label: "Commission", sheet: SA, range: "C2:C9", requiredFunctions: [["VLOOKUP", "MATCH", "XLOOKUP"]], expected: (r) => { const tiers = r.range(SA, "E2:F5").map((t) => [n(t[0]), n(t[1])]); return col(r, SA, "B2:B9").map((s) => [n(s) * [...tiers].reverse().find(([t]) => n(s) >= t)![1]]); }, perturb: [{ B2: "25000", B3: "9999", B4: "50000" }, { F3: "0.04" }] }],
    hints: ["Approximate match finds the largest threshold that is not bigger than the sales figure.", "=B2*VLOOKUP(B2,$E$2:$F$5,2,TRUE)", "TRUE (or omitting the last argument) is what makes the lookup approximate."],
    solution: { explanation: "VLOOKUP with TRUE finds the last tier whose 'from' value is ≤ the sales figure. Multiply that rate by the sales. The tier table must stay sorted ascending.", cells: fillDown("C", 2, 9, "=B{r}*VLOOKUP(B{r},$E$2:$F$5,2,TRUE)") },
  }),
  mk({
    ...base, id: "EX-CH-2", lessonId: "CH-2", difficulty: "Advanced", title: "Clean the customer list", objective: "Normalise messy names and extract tidy email domains.",
    datasetNote: "Generated messy names and emails (extra spaces, wrong capitalisation).",
    instructions: ["C2:C6: the name with extra spaces removed and Each Word Capitalised (e.g. \"Raj Patel\").", "D2:D6: the email domain in lower case (e.g. \"example.com\"). Remove stray spaces first."],
    workbook: customers, activeSheet: CL, editable: ["C2:D6"],
    checks: [
      { type: "formula", label: "Clean name", sheet: CL, range: "C2:C6", requiredFunctions: [["TRIM"], ["PROPER"]], expected: (r) => col(r, CL, "A2:A6").map((s) => [proper(String(s))]), perturb: [{ A2: "  mARy   jO  " }] },
      { type: "formula", label: "Email domain", sheet: CL, range: "D2:D6", requiredFunctions: [["LOWER", "TEXTAFTER"]], expected: (r) => col(r, CL, "B2:B6").map((s) => [String(s).trim().toLowerCase().split("@")[1]]), perturb: [{ B2: " Sam@Test.ORG " }] },
    ],
    hints: ["TRIM removes leading, trailing and doubled spaces. PROPER capitalises each word.", "=PROPER(TRIM(A2))", '=LOWER(TEXTAFTER(TRIM(B2),"@"))'],
    solution: { explanation: "Wrap functions inside each other: TRIM first, then PROPER. For the domain, TRIM the email, take the text after @ and lower-case it.", cells: mergeCells(fillDown("C", 2, 6, "=PROPER(TRIM(A{r}))"), fillDown("D", 2, 6, '=LOWER(TEXTAFTER(TRIM(B{r}),"@"))')) },
  }),
  mk({
    ...base, id: "EX-CH-3", lessonId: "CH-3", difficulty: "Advanced", title: "Overdue invoice tracker", objective: "Combine IF with date comparison and date subtraction.",
    datasetNote: "Generated invoices. 'Today' is a fixed typed date in G2 so the answer does not change tomorrow.",
    instructions: ["D2:D7 Status: \"Paid\" if Paid? is Yes; otherwise \"Overdue\" if the due date is before Today (G2); otherwise \"Open\".", "E2:E7 Days overdue: the number of days between Today and the due date for overdue invoices, otherwise 0.", "Point to G2 with an absolute reference; do not type the date."],
    workbook: invoices, activeSheet: IV, editable: ["D2:E7"],
    checks: [
      { type: "formula", label: "Status", sheet: IV, range: "D2:D7", requiredFunctions: [["IF", "IFS"]], expected: (r) => inv.map((_, k) => [status(n(r.get(IV, `B${k + 2}`)), String(r.get(IV, `C${k + 2}`)), n(r.get(IV, "G2")))]), perturb: [{ G2: String(dateToSerial(2024, 6, 15)) }, { G2: String(dateToSerial(2024, 8, 1)) }] },
      { type: "formula", label: "Days overdue", sheet: IV, range: "E2:E7", requiredFunctions: [["IF", "IFS"]], expected: (r) => inv.map((_, k) => { const due = n(r.get(IV, `B${k + 2}`)); const t = n(r.get(IV, "G2")); return [status(due, String(r.get(IV, `C${k + 2}`)), t) === "Overdue" ? t - due : 0]; }), perturb: [{ G2: String(dateToSerial(2024, 6, 15)) }, { G2: String(dateToSerial(2024, 8, 1)) }] },
    ],
    hints: ["Nest two IFs: first Paid, then Overdue.", '=IF(C2="Yes","Paid",IF(B2<$G$2,"Overdue","Open"))', '=IF(D2="Overdue",$G$2-B2,0)'],
    solution: { explanation: "Test Paid first (a paid invoice is never overdue), then compare the due date with Today. Days overdue is a date subtraction.", cells: mergeCells(fillDown("D", 2, 7, '=IF(C{r}="Yes","Paid",IF(B{r}<$G$2,"Overdue","Open"))'), fillDown("E", 2, 7, '=IF(D{r}="Overdue",$G$2-B{r},0)')) },
  }),
  mk({
    ...base, id: "EX-CH-4", lessonId: "CH-4", difficulty: "Job-ready", title: "Region × status summary table", objective: "Build a two-way summary with one SUMIFS formula using mixed references.",
    datasetNote: "Generated order table; the summary headers are in H1:L1 and H2:H5.",
    instructions: ["I2:K5: total Units for each Region (row label in column H) and Status (column label in row 1). Write ONE SUMIFS formula in I2 and fill it right and down.", "L2:L5: the total for each region (SUM of its row)."],
    workbook: crosstab, activeSheet: OR, editable: ["I2:L5"],
    checks: [
      { type: "formula", label: "Units by region and status", sheet: OR, range: "I2:K5", requiredFunctions: [["SUMIFS"]], expected: (r) => REGIONS.map((rg) => STATUSES.map((st) => unitsOf(r, rg, st))), perturb: [{ D2: "99", B3: "East" }, { E4: "Pending", D5: "1" }] },
      { type: "formula", label: "Region totals", sheet: OR, range: "L2:L5", requiredFunctions: [["SUM"]], expected: (r) => REGIONS.map((rg) => [STATUSES.reduce((s, st) => s + unitsOf(r, rg, st), 0)]), perturb: [{ D2: "99", B3: "East" }] },
    ],
    hints: ["Lock the data ranges completely ($D$2:$D$13) and use mixed references for the labels: $H2 and I$1.", "=SUMIFS($D$2:$D$13,$B$2:$B$13,$H2,$E$2:$E$13,I$1)", "=SUM(I2:K2) for the totals."],
    solution: { explanation: "$H2 locks the label column but lets the row change; I$1 locks the label row but lets the column change. The three data ranges never move.", cells: mergeCells(Object.fromEntries(REGIONS.flatMap((_, i) => [..."IJK"].map((c) => [`${c}${i + 2}`, `=SUMIFS($D$2:$D$13,$B$2:$B$13,$H${i + 2},$E$2:$E$13,${c}$1)`]))), fillDown("L", 2, 5, "=SUM(I{r}:K{r})")) },
  }),
  mk({
    ...base, id: "EX-CH-5", lessonId: "CH-5", difficulty: "Intermediate", title: "Find and fix the broken formulas", objective: "Debug a sheet that contains a wrong reference, a wrong operator, a typed number and a short range.",
    datasetNote: "Generated sheet containing deliberate mistakes.",
    instructions: ["Totals in D2:D6 should be Qty × Price for every row. Some cells are wrong: find each bug and fix it.", "Every Total must be a formula (no typed numbers).", "G1 (Grand total) must add all five totals."],
    workbook: fixSheet, activeSheet: FX, editable: ["D2:D6", "G1"],
    checks: [
      { type: "formula", label: "Totals", sheet: FX, range: "D2:D6", expected: (r) => fixItems.map((_, k) => [n(r.get(FX, `B${k + 2}`)) * n(r.get(FX, `C${k + 2}`))]), perturb: [{ B2: "7", C5: "9", B6: "1" }] },
      { type: "formula", label: "Grand total", sheet: FX, range: "G1", requiredFunctions: [["SUM"]], expected: (r) => [[fixItems.reduce((s, _, k) => s + n(r.get(FX, `B${k + 2}`)) * n(r.get(FX, `C${k + 2}`)), 0)]], perturb: [{ B2: "7", C5: "9", B6: "1" }] },
    ],
    hints: ["D2 points at the wrong row of Price.", "D3 adds instead of multiplying.", "D5 is a typed number, and G1's range stops one row early."],
    solution: { explanation: "D2 used C3 instead of C2; D3 used + instead of *; D5 was typed instead of calculated; the SUM range D2:D4 missed D5:D6.", cells: mergeCells(fillDown("D", 2, 6, "=B{r}*C{r}"), { G1: "=SUM(D2:D6)" }) },
  }),
  mk({
    ...base, id: "EX-CH-6", lessonId: "CH-6", difficulty: "Job-ready", title: "Top three scorers", objective: "Return the best three names with one dynamic-array formula.",
    datasetNote: "Generated team scores (no ties).", simulationNote: "Dynamic arrays need Excel 2021 or Microsoft 365.",
    instructions: ["In D2 write one formula that spills the names of the three highest scorers, best first.", "Leave the cells below the three results empty."],
    workbook: teamSheet, activeSheet: TP, editable: ["D2:D8"],
    checks: [{ type: "formula", label: "Top three names", sheet: TP, range: "D2:D8", requiredFunctions: [["SORTBY", "SORT"]], expected: (r) => { const rows = col(r, TP, "A2:A9").map((nm, k) => ({ nm: String(nm), s: n(r.get(TP, `B${k + 2}`)) })); return pad(rows.sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.nm), 7); }, perturb: [{ B2: "100", B3: "99" }, { B5: "50", B6: "49" }] }],
    hints: ["SORTBY(names, scores, -1) sorts names by score, largest first.", "TAKE(array, 3) keeps the first three rows.", "=TAKE(SORTBY(A2:A9,B2:B9,-1),3)"],
    solution: { explanation: "SORTBY orders the names by their scores (−1 = descending) and TAKE keeps the first three.", cells: { D2: "=TAKE(SORTBY(A2:A9,B2:B9,-1),3)" } },
  }),
];

export const CHALLENGES: Challenge[] = [
  { id: "CH-1", exerciseId: "EX-CH-1", title: "Sales commission tiers", difficulty: "Job-ready", minutes: 15, skills: ["VLOOKUP approximate match", "Absolute references"], blurb: "Pay each rep the rate of the highest tier they reach." },
  { id: "CH-2", exerciseId: "EX-CH-2", title: "Clean the customer list", difficulty: "Advanced", minutes: 12, skills: ["TRIM", "PROPER", "LOWER", "TEXTAFTER"], blurb: "Tidy messy names and pull out email domains." },
  { id: "CH-3", exerciseId: "EX-CH-3", title: "Overdue invoice tracker", difficulty: "Advanced", minutes: 12, skills: ["IF", "Dates", "Absolute references"], blurb: "Label invoices Paid / Overdue / Open and count days overdue." },
  { id: "CH-4", exerciseId: "EX-CH-4", title: "Region × status summary", difficulty: "Job-ready", minutes: 15, skills: ["SUMIFS", "Mixed references"], blurb: "One formula fills a whole cross-tab." },
  { id: "CH-5", exerciseId: "EX-CH-5", title: "Find and fix the broken formulas", difficulty: "Intermediate", minutes: 10, skills: ["Debugging", "References", "SUM"], blurb: "Four deliberate bugs are hiding in this sheet." },
  { id: "CH-6", exerciseId: "EX-CH-6", title: "Top three scorers", difficulty: "Job-ready", minutes: 10, skills: ["SORTBY", "TAKE", "Dynamic arrays"], blurb: "One spilling formula returns the leaderboard." },
];

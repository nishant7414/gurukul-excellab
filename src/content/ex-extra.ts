import { grid, sheetOf, workbookOf } from "../data/source";
import { DAYS, dateToSerial, ymd } from "../engine/dates";
import type { CellFormat, Scalar, SheetData } from "../engine/types";
import type { Exercise, InputReader } from "../learning/types";
import { col, fillDown, mergeCells, mk, pad, widths } from "./helpers";

/* Generated practice for the additional curriculum (not taken from the instructor's workbook). */
const n = (v: Scalar) => (typeof v === "number" ? v : Number(v));

/* ======================================================================================
   A-01  Cell references: relative, absolute, mixed
   ====================================================================================== */
const REFS = "Refs";
const refItems: [string, number, number][] = [["Notebook", 12, 3.5], ["Pen box", 8, 12], ["Stapler", 5, 18.25], ["Folder", 20, 2.4], ["Marker set", 6, 9.99], ["Desk lamp", 3, 42], ["Ruler", 25, 1.2], ["Eraser pack", 10, 4.75]];
const refsBase = (): SheetData => widths(sheetOf(REFS, grid("A1", [["Item", "Qty", "Price", "Total"], ...refItems.map(([i, q, p]) => [i, q, p, null])])), { A: 110, B: 60, C: 70, D: 80, E: 80, F: 80, G: 70 });
const refsGuided = () => workbookOf(refsBase());
const refsTax = () => {
  const s = refsBase();
  Object.assign(s.cells, grid("D2", refItems.map((_, k) => [`=B${k + 2}*C${k + 2}`])), grid("E1", [["Tax"]]), grid("F1", [["Tax rate"], ]), grid("G1", [[0.18]]));
  return workbookOf(s);
};
const RATES = [0.05, 0.1, 0.15, 0.2];
const AMOUNTS = [1000, 2500, 4000, 5500, 7000, 8500];
const gridSheet = () => workbookOf(widths(sheetOf("Grid", { ...grid("A1", [["Amount \\ Rate", ...RATES]]), ...grid("A2", AMOUNTS.map((a) => [a])) }), { A: 110, B: 80, C: 80, D: 80, E: 80 }));

const A1X: Exercise[] = [
  mk({
    id: "EX-A1-1", lessonId: "A-01", kind: "guided", origin: "generated", conceptIds: [],
    title: "Your first calculated cell", objective: "Multiply two cells by pointing at them instead of typing numbers.",
    datasetNote: "A generated stationery list.", scenario: "Work out the total cost of the first item.",
    instructions: ["In D2 write a formula that multiplies the Qty in B2 by the Price in C2.", "Start with =, click the cells (or type their addresses), and press Enter.", "Check Answer."],
    workbook: refsGuided, activeSheet: REFS, editable: ["D2"],
    checks: [{ type: "formula", label: "Total for row 2", sheet: REFS, range: "D2", expected: (r) => [[n(r.get(REFS, "B2")) * n(r.get(REFS, "C2"))]], perturb: [{ B2: "7", C2: "3.5" }] }],
    hints: ["The multiplication sign in Excel is *.", "=B2*C2"],
    solution: { explanation: "=B2*C2 multiplies the two cells. When Qty or Price changes, the Total follows.", cells: { D2: "=B2*C2" } },
  }),
  mk({
    id: "EX-A1-2", lessonId: "A-01", kind: "independent", origin: "generated", conceptIds: [],
    title: "A fixed tax rate: absolute reference", objective: "Fill a formula down while one reference stays locked.",
    datasetNote: "Generated list with a single tax rate in G1.",
    instructions: ["Totals are already in D2:D9. The tax rate is in G1.", "In E2:E9 calculate Tax = Total × tax rate.", "The rate cell must stay G1 in every row: lock it with $ (press F4 while editing)."],
    workbook: refsTax, activeSheet: REFS, editable: ["E2:E9"],
    checks: [{ type: "formula", label: "Tax per row", sheet: REFS, range: "E2:E9", expected: (r) => refItems.map((_, k) => [n(r.get(REFS, `B${k + 2}`)) * n(r.get(REFS, `C${k + 2}`)) * n(r.get(REFS, "G1"))]), perturb: [{ G1: "0.05" }, { B3: "10", C4: "20" }] }],
    hints: ["Write the first formula in E2, then fill down.", "Without $, G1 becomes G2, G3 … as you fill down and the answers break.", "=D2*$G$1"],
    solution: { explanation: "$G$1 is an absolute reference: it does not move when the formula is filled down, while D2 is relative and becomes D3, D4 …", cells: fillDown("E", 2, 9, "=D{r}*$G$1") },
  }),
  mk({
    id: "EX-A1-3", lessonId: "A-01", kind: "mastery", origin: "generated", conceptIds: [],
    title: "One formula for a whole grid: mixed references", objective: "Write a single formula that fills a two-way table.",
    datasetNote: "Generated amounts (down column A) and rates (across row 1).",
    instructions: ["Fill B2:E7 so each cell is Amount × Rate, using the amount in column A and the rate in row 1.", "Write ONE formula in B2, then fill right and down.", "Hint: fix the column of the amount and the row of the rate."],
    workbook: gridSheet, activeSheet: "Grid", editable: ["B2:E7"],
    checks: [{ type: "formula", label: "Amount × rate grid", sheet: "Grid", range: "B2:E7", expected: (r) => AMOUNTS.map((_, i) => RATES.map((__, j) => n(r.get("Grid", `A${i + 2}`)) * n(r.get("Grid", `${"BCDE"[j]}1`)))), perturb: [{ A2: "3000", C1: "0.5", A7: "100" }] }],
    hints: ["The amount is always in column A, but its row changes: $A2.", "The rate is always in row 1, but its column changes: B$1.", "=$A2*B$1"],
    solution: { explanation: "=$A2*B$1 is a mixed-reference formula: $A locks the column, B$1 locks the row. Fill it across and down.", cells: Object.fromEntries(AMOUNTS.flatMap((_, i) => [..."BCDE"].map((c) => [`${c}${i + 2}`, `=$A${i + 2}*${c}$1`]))) },
  }),
];

/* ======================================================================================
   A-02  SUM, AVERAGE, MIN, MAX, COUNT, ROUND, LARGE, MEDIAN
   ====================================================================================== */
const SC = "Scores";
const scores: [string, number][] = [["Asha", 72], ["Ben", 85], ["Chen", 64], ["Dina", 91], ["Eli", 58], ["Farah", 77], ["Gus", 85], ["Hana", 69]];
const scoreSheet = (labels: string[]) => workbookOf(widths(sheetOf(SC, { ...grid("A1", [["Student", "Score"], ...scores.map(([a, b]) => [a, b])]), ...grid("D1", [["Measure", "Result"], ...labels.map((l) => [l, null])]) }), { A: 80, B: 60, D: 220, E: 80 }));
const sc = (r: InputReader) => col(r, SC, "B2:B9").map(n);
const sum = (x: number[]) => x.reduce((a, b) => a + b, 0);

const A2X: Exercise[] = [
  mk({
    id: "EX-A2-1", lessonId: "A-02", kind: "guided", origin: "generated", conceptIds: [],
    title: "Total and average", objective: "Summarise a column with SUM and AVERAGE.", datasetNote: "Generated class scores.",
    instructions: ["E2: the total of all scores (use SUM).", "E3: the average score (use AVERAGE).", "Select the whole score range B2:B9 instead of adding cells one by one."],
    workbook: () => scoreSheet(["Total", "Average"]), activeSheet: SC, editable: ["E2:E3"],
    checks: [
      { type: "formula", label: "Total", sheet: SC, range: "E2", requiredFunctions: [["SUM"]], expected: (r) => [[sum(sc(r))]], perturb: [{ B2: "100", B9: "1" }] },
      { type: "formula", label: "Average", sheet: SC, range: "E3", requiredFunctions: [["AVERAGE"]], expected: (r) => [[sum(sc(r)) / sc(r).length]], perturb: [{ B2: "100", B9: "1" }] },
    ],
    hints: ["=SUM(B2:B9)", "=AVERAGE(B2:B9)"],
    solution: { explanation: "SUM adds every number in the range; AVERAGE divides that total by how many numbers there are.", cells: { E2: "=SUM(B2:B9)", E3: "=AVERAGE(B2:B9)" } },
  }),
  mk({
    id: "EX-A2-2", lessonId: "A-02", kind: "independent", origin: "generated", conceptIds: [],
    title: "Highest, lowest and how many", objective: "Use MAX, MIN and COUNT.", datasetNote: "Generated class scores.",
    instructions: ["E2: the highest score (MAX).", "E3: the lowest score (MIN).", "E4: how many students have a score (COUNT)."],
    workbook: () => scoreSheet(["Highest", "Lowest", "Number of scores"]), activeSheet: SC, editable: ["E2:E4"],
    checks: [
      { type: "formula", label: "Highest", sheet: SC, range: "E2", requiredFunctions: [["MAX"]], expected: (r) => [[Math.max(...sc(r))]], perturb: [{ B3: "120" }] },
      { type: "formula", label: "Lowest", sheet: SC, range: "E3", requiredFunctions: [["MIN"]], expected: (r) => [[Math.min(...sc(r))]], perturb: [{ B3: "2" }] },
      { type: "formula", label: "Count", sheet: SC, range: "E4", requiredFunctions: [["COUNT"]], expected: (r) => [[col(r, SC, "B2:B9").filter((x) => typeof x === "number").length]], perturb: [{ B9: "" }] },
    ],
    hints: ["MAX, MIN and COUNT all take the range B2:B9.", "COUNT counts numbers only. COUNTA counts anything that is not empty."],
    solution: { explanation: "MAX and MIN return the extremes. COUNT returns how many cells in the range hold numbers.", cells: { E2: "=MAX(B2:B9)", E3: "=MIN(B2:B9)", E4: "=COUNT(B2:B9)" } },
  }),
  mk({
    id: "EX-A2-3", lessonId: "A-02", kind: "mastery", origin: "generated", conceptIds: [],
    title: "Combine functions: spread, runner-up, rounded average", objective: "Nest and combine functions to answer a reporting question.", datasetNote: "Generated class scores.",
    instructions: ["E2: the spread = highest − lowest (must use MAX and MIN).", "E3: the second-highest score (LARGE).", "E4: the average rounded to 1 decimal place (ROUND with AVERAGE).", "E5: the median score (MEDIAN)."],
    workbook: () => scoreSheet(["Spread (highest − lowest)", "Second-highest score", "Average, 1 decimal", "Median"]), activeSheet: SC, editable: ["E2:E5"],
    checks: [
      { type: "formula", label: "Spread", sheet: SC, range: "E2", requiredFunctions: [["MAX"], ["MIN"]], expected: (r) => [[Math.max(...sc(r)) - Math.min(...sc(r))]], perturb: [{ B2: "120", B5: "20" }] },
      { type: "formula", label: "Second highest", sheet: SC, range: "E3", requiredFunctions: [["LARGE"]], expected: (r) => [[[...sc(r)].sort((a, b) => b - a)[1]]], perturb: [{ B2: "120", B3: "119" }] },
      { type: "formula", label: "Rounded average", sheet: SC, range: "E4", requiredFunctions: [["ROUND"], ["AVERAGE"]], expected: (r) => [[Math.round((sum(sc(r)) / sc(r).length) * 10) / 10]], perturb: [{ B2: "100", B9: "1" }] },
      { type: "formula", label: "Median", sheet: SC, range: "E5", requiredFunctions: [["MEDIAN"]], expected: (r) => { const s = [...sc(r)].sort((a, b) => a - b); const m = s.length >> 1; return [[s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2]]; }, perturb: [{ B2: "100", B9: "1" }] },
    ],
    hints: ["=MAX(B2:B9)-MIN(B2:B9)", "=LARGE(B2:B9,2) — the second argument is the position.", "=ROUND(AVERAGE(B2:B9),1)", "=MEDIAN(B2:B9)"],
    solution: { explanation: "LARGE(range,2) is the 2nd biggest value. ROUND(x,1) keeps one decimal. MEDIAN is the middle value of the sorted scores.", cells: { E2: "=MAX(B2:B9)-MIN(B2:B9)", E3: "=LARGE(B2:B9,2)", E4: "=ROUND(AVERAGE(B2:B9),1)", E5: "=MEDIAN(B2:B9)" } },
  }),
];

/* ======================================================================================
   A-03  IF, AND, OR, IFS
   ====================================================================================== */
const MK = "Marks";
const marks: [string, number][] = [["Asha", 35], ["Ben", 82], ["Chen", 47], ["Dina", 60], ["Eli", 39], ["Farah", 91], ["Gus", 55], ["Hana", 74]];
const marksSheet = (head: string) => workbookOf(widths(sheetOf(MK, grid("A1", [["Student", "Marks", head], ...marks.map(([a, b]) => [a, b, null])])), { A: 80, B: 60, C: 90 }));
const bonusRows: [string, number, string][] = [["Asha", 62, "Delivered"], ["Ben", 48, "Delivered"], ["Chen", 75, "Pending"], ["Dina", 50, "Delivered"], ["Eli", 20, "Cancelled"], ["Farah", 90, "Delivered"], ["Gus", 49, "Pending"], ["Hana", 55, "Delivered"]];
const bonusSheet = () => workbookOf(widths(sheetOf("Bonus", grid("A1", [["Rep", "Units", "Status", "Bonus?"], ...bonusRows.map(([a, b, c]) => [a, b, c, null])])), { A: 80, B: 60, C: 90, D: 80 }));
const grade = (m: number) => (m >= 80 ? "A" : m >= 60 ? "B" : m >= 40 ? "C" : "D");

const A3X: Exercise[] = [
  mk({
    id: "EX-A3-1", lessonId: "A-03", kind: "guided", origin: "generated", conceptIds: [],
    title: "Pass or Fail with IF", objective: "Return one of two texts depending on a condition.", datasetNote: "Generated marks.",
    instructions: ["In C2:C9 show \"Pass\" when Marks are 40 or more, otherwise \"Fail\".", "Use IF, then fill down."],
    workbook: () => marksSheet("Result"), activeSheet: MK, editable: ["C2:C9"],
    checks: [{ type: "formula", label: "Result", sheet: MK, range: "C2:C9", requiredFunctions: [["IF"]], expected: (r) => col(r, MK, "B2:B9").map((m) => [n(m) >= 40 ? "Pass" : "Fail"]), perturb: [{ B2: "95", B3: "10", B4: "40" }] }],
    hints: ["IF(test, value_if_true, value_if_false)", "The test is B2>=40. Text results go in double quotes.", '=IF(B2>=40,"Pass","Fail")'],
    solution: { explanation: "IF checks B2>=40. If true it returns \"Pass\", otherwise \"Fail\". Note >= includes exactly 40.", cells: fillDown("C", 2, 9, '=IF(B{r}>=40,"Pass","Fail")') },
  }),
  mk({
    id: "EX-A3-2", lessonId: "A-03", kind: "independent", origin: "generated", conceptIds: [],
    title: "Bonus rule with AND", objective: "Require two conditions at the same time.", datasetNote: "Generated sales reps.",
    instructions: ["A rep earns a bonus only if Units are 50 or more AND the order Status is \"Delivered\".", "In D2:D9 show \"Yes\" or \"No\" using IF with AND."],
    workbook: bonusSheet, activeSheet: "Bonus", editable: ["D2:D9"],
    checks: [{ type: "formula", label: "Bonus?", sheet: "Bonus", range: "D2:D9", requiredFunctions: [["IF"], ["AND"]], expected: (r) => bonusRows.map((_, k) => [n(r.get("Bonus", `B${k + 2}`)) >= 50 && r.get("Bonus", `C${k + 2}`) === "Delivered" ? "Yes" : "No"]), perturb: [{ B3: "80", B4: "80", C4: "Delivered" }, { B6: "50", C6: "Pending" }] }],
    hints: ["AND(test1, test2) is TRUE only when both are TRUE.", "Put the AND inside IF as its test.", '=IF(AND(B2>=50,C2="Delivered"),"Yes","No")'],
    solution: { explanation: "AND returns TRUE only when both tests are true; IF turns that TRUE/FALSE into \"Yes\"/\"No\".", cells: fillDown("D", 2, 9, '=IF(AND(B{r}>=50,C{r}="Delivered"),"Yes","No")') },
  }),
  mk({
    id: "EX-A3-3", lessonId: "A-03", kind: "mastery", origin: "generated", conceptIds: [],
    title: "Grade bands: nested IF or IFS", objective: "Handle more than two outcomes.", datasetNote: "Generated marks.",
    instructions: ["In C2:C9 return the grade: A for 80 or more, B for 60 to 79, C for 40 to 59, otherwise D.", "Use nested IF or IFS. The order of the tests matters."],
    workbook: () => marksSheet("Grade"), activeSheet: MK, editable: ["C2:C9"],
    checks: [{ type: "formula", label: "Grade", sheet: MK, range: "C2:C9", requiredFunctions: [["IF", "IFS"]], expected: (r) => col(r, MK, "B2:B9").map((m) => [grade(n(m))]), perturb: [{ B2: "95", B3: "65", B4: "45", B5: "5", B6: "80", B7: "60", B8: "40", B9: "79" }] }],
    hints: ["Test the highest band first: once a test is true, Excel stops.", "IF(B2>=80,\"A\", IF(B2>=60,\"B\", …))", 'Alternative: =IFS(B2>=80,"A",B2>=60,"B",B2>=40,"C",TRUE,"D")'],
    solution: { explanation: "Tests run from the top band down; the first true test wins. The final value (or TRUE in IFS) catches everything else.", cells: fillDown("C", 2, 9, '=IF(B{r}>=80,"A",IF(B{r}>=60,"B",IF(B{r}>=40,"C","D")))') },
  }),
];

/* ======================================================================================
   A-04  COUNTIF, SUMIF, COUNTIFS, SUMIFS, AVERAGEIFS, SUMPRODUCT
   ====================================================================================== */
const OR = "Orders";
type Ord = [number, string, string, number, number, string];
const orders: Ord[] = [
  [1, "North", "Asha", 40, 12.5, "Delivered"], [2, "South", "Ben", 25, 20, "Pending"], [3, "North", "Chen", 60, 8, "Delivered"], [4, "East", "Asha", 15, 30, "Delivered"],
  [5, "West", "Ben", 50, 15, "Cancelled"], [6, "South", "Chen", 35, 12.5, "Delivered"], [7, "North", "Asha", 20, 25, "Pending"], [8, "East", "Ben", 45, 10, "Delivered"],
  [9, "West", "Asha", 30, 18, "Delivered"], [10, "South", "Asha", 55, 9, "Delivered"], [11, "East", "Chen", 10, 40, "Pending"], [12, "North", "Ben", 70, 7.5, "Delivered"],
];
const ordersSheet = (extra: Record<string, string>): SheetData => widths(sheetOf(OR, { ...grid("A1", [["Order", "Region", "Rep", "Units", "Price", "Status"], ...orders.map((o) => [...o])]), ...extra }), { A: 60, B: 70, C: 70, D: 60, E: 60, F: 80, H: 120, I: 90 });
const ord = (r: InputReader, c: string) => r.range(OR, `${c}2:${c}13`).map((x) => x[0]);

const A4X: Exercise[] = [
  mk({
    id: "EX-A4-1", lessonId: "A-04", kind: "guided", origin: "generated", conceptIds: [],
    title: "Count orders for one region", objective: "Count the rows that meet one condition with COUNTIF.", datasetNote: "Generated order table.",
    instructions: ["The region to count is typed in H2.", "In I2 count how many orders (rows) belong to that region. Point to H2; do not type the region name inside the formula."],
    workbook: () => workbookOf(ordersSheet({ ...grid("H1", [["Region"]]), ...grid("H2", [["North"]]), ...grid("I1", [["Orders"]]) })), activeSheet: OR, editable: ["I2"],
    checks: [{ type: "formula", label: "Orders in region", sheet: OR, range: "I2", requiredFunctions: [["COUNTIF"]], expected: (r) => [[ord(r, "B").filter((x) => x === r.get(OR, "H2")).length]], perturb: [{ H2: "South" }, { H2: "East" }] }],
    hints: ["COUNTIF(range, criteria)", "range is the Region column B2:B13; criteria is the cell H2.", "=COUNTIF(B2:B13,H2)"],
    solution: { explanation: "COUNTIF looks through B2:B13 and counts the cells equal to the value in H2.", cells: { I2: "=COUNTIF(B2:B13,H2)" } },
  }),
  mk({
    id: "EX-A4-2", lessonId: "A-04", kind: "independent", origin: "generated", conceptIds: [],
    title: "Total units for one rep", objective: "Add up a column for rows that match a condition with SUMIF.", datasetNote: "Generated order table.",
    instructions: ["The rep name is typed in H2.", "In I2 add up the Units (column D) for that rep using SUMIF."],
    workbook: () => workbookOf(ordersSheet({ ...grid("H1", [["Rep"]]), ...grid("H2", [["Asha"]]), ...grid("I1", [["Units"]]) })), activeSheet: OR, editable: ["I2"],
    checks: [{ type: "formula", label: "Units for rep", sheet: OR, range: "I2", requiredFunctions: [["SUMIF"]], expected: (r) => [[sum(ord(r, "C").map((x, k) => (x === r.get(OR, "H2") ? n(ord(r, "D")[k]) : 0)))]], perturb: [{ H2: "Ben" }, { H2: "Chen" }] }],
    hints: ["SUMIF(range, criteria, sum_range)", "range is the Rep column, criteria is H2, sum_range is the Units column.", "=SUMIF(C2:C13,H2,D2:D13)"],
    solution: { explanation: "SUMIF checks C2:C13 against H2 and adds the matching rows from D2:D13.", cells: { I2: "=SUMIF(C2:C13,H2,D2:D13)" } },
  }),
  mk({
    id: "EX-A4-3", lessonId: "A-04", kind: "mastery", origin: "generated", conceptIds: [],
    title: "Two conditions: SUMIFS, COUNTIFS, AVERAGEIFS", objective: "Summarise rows that meet several conditions.", datasetNote: "Generated order table.",
    instructions: ["Region is in H2 and Status is in H3.", "I2: total Units for that Region AND Status (SUMIFS).", "I3: number of such orders (COUNTIFS).", "I4: average Price of such orders (AVERAGEIFS).", "I5: revenue (Units × Price) of all orders with the Status in H3, any region (SUMPRODUCT)."],
    workbook: () => workbookOf(ordersSheet({ ...grid("H1", [["Criteria"]]), ...grid("H2", [["North"], ["Delivered"]]), ...grid("H4", [["(I4 average price)"]]) })), activeSheet: OR, editable: ["I2:I5"],
    checks: (() => {
      const match = (r: InputReader) => ord(r, "B").map((x, k) => x === r.get(OR, "H2") && ord(r, "F")[k] === r.get(OR, "H3"));
      const ps = [{ H2: "East", H3: "Delivered" }, { H2: "South", H3: "Pending" }, { H2: "West", H3: "Delivered" }];
      return [
        { type: "formula" as const, label: "Units (SUMIFS)", sheet: OR, range: "I2", requiredFunctions: [["SUMIFS"]], expected: (r: InputReader) => [[sum(match(r).map((m, k) => (m ? n(ord(r, "D")[k]) : 0)))]], perturb: ps },
        { type: "formula" as const, label: "Orders (COUNTIFS)", sheet: OR, range: "I3", requiredFunctions: [["COUNTIFS"]], expected: (r: InputReader) => [[match(r).filter(Boolean).length]], perturb: ps },
        { type: "formula" as const, label: "Average price (AVERAGEIFS)", sheet: OR, range: "I4", requiredFunctions: [["AVERAGEIFS"]], expected: (r: InputReader) => { const p = match(r).map((m, k) => (m ? n(ord(r, "E")[k]) : null)).filter((x): x is number => x !== null); return [[sum(p) / p.length]]; }, perturb: ps },
        { type: "formula" as const, label: "Revenue for status (SUMPRODUCT)", sheet: OR, range: "I5", requiredFunctions: [["SUMPRODUCT"]], expected: (r: InputReader) => [[sum(ord(r, "F").map((x, k) => (x === r.get(OR, "H3") ? n(ord(r, "D")[k]) * n(ord(r, "E")[k]) : 0)))]], perturb: ps },
      ];
    })(),
    hints: ["SUMIFS puts the sum_range FIRST: SUMIFS(sum_range, range1, crit1, range2, crit2).", "COUNTIFS(range1, crit1, range2, crit2); AVERAGEIFS(average_range, range1, crit1, range2, crit2).", "=SUMPRODUCT((F2:F13=H3)*D2:D13*E2:E13) multiplies matching rows and adds them."],
    solution: { explanation: "The *IFS functions take pairs of (range, criteria). SUMPRODUCT multiplies arrays row by row; (F2:F13=H3) is 1 where the status matches and 0 elsewhere.", cells: { I2: "=SUMIFS(D2:D13,B2:B13,H2,F2:F13,H3)", I3: "=COUNTIFS(B2:B13,H2,F2:F13,H3)", I4: "=AVERAGEIFS(E2:E13,B2:B13,H2,F2:F13,H3)", I5: "=SUMPRODUCT((F2:F13=H3)*D2:D13*E2:E13)" } },
  }),
];

/* ======================================================================================
   A-05  Dates
   ====================================================================================== */
const DT = "Dates";
const dts: [number, number, number][] = [[2024, 1, 15], [2024, 2, 29], [2024, 3, 31], [2024, 6, 10], [2024, 9, 5], [2024, 12, 25]];
const dtSerials = dts.map(([y, m, d]) => dateToSerial(y, m, d));
const dateFmt = (cells: string[]): Record<string, CellFormat> => Object.fromEntries(cells.map((c) => [c, { nf: "date" } as CellFormat]));
const dateSheet = (heads: string[]) => workbookOf(widths(sheetOf(DT, { ...grid("A1", [["Invoice date", ...heads]]), ...grid("A2", dtSerials.map((s) => [s])) }, dateFmt(dtSerials.map((_, k) => `A${k + 2}`))), { A: 100, B: 100, C: 100, D: 110, E: 110, F: 130, G: 100, H: 110 }));
const dv = (r: InputReader) => col(r, DT, "A2:A7").map(n);
const eom = (s: number) => { const { y, m } = ymd(s); return dateToSerial(y, m + 1, 0); };
const networkdays = (a: number, b: number) => { let c = 0; for (let s = a; s <= b; s++) { const wd = ymd(s).wd; if (wd !== 0 && wd !== 6) c++; } return c; };

const A5X: Exercise[] = [
  mk({
    id: "EX-A5-1", lessonId: "A-05", kind: "guided", origin: "generated", conceptIds: [],
    title: "Year and month of an invoice", objective: "Pull parts out of a date with YEAR and MONTH.", datasetNote: "Generated invoice dates (real dates, not text).",
    instructions: ["B2:B7: the year of each date (YEAR).", "C2:C7: the month number (MONTH)."],
    workbook: () => dateSheet(["Year", "Month"]), activeSheet: DT, editable: ["B2:C7"],
    checks: [
      { type: "formula", label: "Year", sheet: DT, range: "B2:B7", requiredFunctions: [["YEAR"]], expected: (r) => dv(r).map((s) => [ymd(s).y]), perturb: [{ A2: String(dateToSerial(2031, 7, 4)) }] },
      { type: "formula", label: "Month", sheet: DT, range: "C2:C7", requiredFunctions: [["MONTH"]], expected: (r) => dv(r).map((s) => [ymd(s).m]), perturb: [{ A2: String(dateToSerial(2031, 7, 4)) }] },
    ],
    hints: ["A date is a serial number underneath; YEAR(A2) and MONTH(A2) read the parts.", "=YEAR(A2)  and  =MONTH(A2)"],
    solution: { explanation: "YEAR and MONTH take a date and return its year or month number.", cells: mergeCells(fillDown("B", 2, 7, "=YEAR(A{r})"), fillDown("C", 2, 7, "=MONTH(A{r})")) },
  }),
  mk({
    id: "EX-A5-2", lessonId: "A-05", kind: "independent", origin: "generated", conceptIds: [],
    title: "Due date and weekday name", objective: "Do date arithmetic and format a date as text.", datasetNote: "Generated invoice dates.",
    instructions: ["B2:B7: the due date = invoice date + 30 days. (Format the column as a date if you see a number.)", "C2:C7: the weekday name of the invoice date, e.g. Monday (TEXT with \"dddd\")."],
    workbook: () => dateSheet(["Due date (+30 days)", "Weekday"]), activeSheet: DT, editable: ["B2:C7"],
    checks: [
      { type: "formula", label: "Due date", sheet: DT, range: "B2:B7", expected: (r) => dv(r).map((s) => [s + 30]), perturb: [{ A2: String(dateToSerial(2031, 7, 4)) }] },
      { type: "formula", label: "Weekday name", sheet: DT, range: "C2:C7", requiredFunctions: [["TEXT"]], expected: (r) => dv(r).map((s) => [DAYS[ymd(s).wd]]), perturb: [{ A2: String(dateToSerial(2031, 7, 4)) }] },
    ],
    hints: ["Dates are numbers: one day is 1.", "=A2+30", '=TEXT(A2,"dddd")'],
    solution: { explanation: "Adding 30 to a date moves it 30 days on. TEXT(date,\"dddd\") returns the weekday as text.", cells: mergeCells(fillDown("B", 2, 7, "=A{r}+30"), fillDown("C", 2, 7, '=TEXT(A{r},"dddd")')) },
  }),
  mk({
    id: "EX-A5-3", lessonId: "A-05", kind: "mastery", origin: "generated", conceptIds: [],
    title: "Month end and working days", objective: "Combine DATE, EOMONTH and NETWORKDAYS.", datasetNote: "Generated invoice dates.",
    instructions: ["B2:B7: days left in the year = 31 December of the invoice year − the invoice date (build the 31 December date with DATE and YEAR).", "C2:C7: the last day of the invoice month (EOMONTH).", "D2:D7: working days (Mon–Fri) from the invoice date to that month end, both included (NETWORKDAYS)."],
    workbook: () => dateSheet(["Days to year end", "Month end", "Working days to month end"]), activeSheet: DT, editable: ["B2:D7"],
    checks: [
      { type: "formula", label: "Days to year end", sheet: DT, range: "B2:B7", requiredFunctions: [["DATE"], ["YEAR"]], expected: (r) => dv(r).map((s) => [dateToSerial(ymd(s).y, 12, 31) - s]), perturb: [{ A2: String(dateToSerial(2031, 7, 4)) }] },
      { type: "formula", label: "Month end", sheet: DT, range: "C2:C7", requiredFunctions: [["EOMONTH"]], expected: (r) => dv(r).map((s) => [eom(s)]), perturb: [{ A2: String(dateToSerial(2031, 7, 4)) }] },
      { type: "formula", label: "Working days", sheet: DT, range: "D2:D7", requiredFunctions: [["NETWORKDAYS"]], expected: (r) => dv(r).map((s) => [networkdays(s, eom(s))]), perturb: [{ A2: String(dateToSerial(2031, 7, 4)) }] },
    ],
    hints: ["=DATE(YEAR(A2),12,31)-A2", "=EOMONTH(A2,0) — 0 means the same month.", "=NETWORKDAYS(A2,EOMONTH(A2,0))"],
    solution: { explanation: "DATE builds a date from year, month, day. EOMONTH(date,0) is the month's last day. NETWORKDAYS counts weekdays between two dates, inclusive.", cells: mergeCells(fillDown("B", 2, 7, "=DATE(YEAR(A{r}),12,31)-A{r}"), fillDown("C", 2, 7, "=EOMONTH(A{r},0)"), fillDown("D", 2, 7, "=NETWORKDAYS(A{r},EOMONTH(A{r},0))")) },
  }),
];

/* ======================================================================================
   A-06  Sort and filter (guided tools)
   ====================================================================================== */
const ordersCells = () => ordersSheet({});
const rowCells = (list: Ord[]): Record<string, string> => grid("A2", list.map((o) => [...o]));
const stable = (list: Ord[], idx: number, desc: boolean) => list.map((o, k) => ({ o, k })).sort((a, b) => { const x = a.o[idx], y = b.o[idx]; const c = typeof x === "number" ? (x as number) - (y as number) : String(x).toLowerCase().localeCompare(String(y).toLowerCase()); return (desc ? -c : c) || a.k - b.k; }).map((x) => x.o);

const hiddenFor = (pred: (o: Ord) => boolean, from: Ord[] = orders) => from.map((o, k) => ({ o, r: k + 2 })).filter((x) => !pred(x.o)).map((x) => x.r);
const byUnitsDesc = stable(orders, 3, true);
const byRegion = stable(orders, 1, false);
const regionThenBig = byRegion.filter((o) => o[3] > 40);

const A6X: Exercise[] = [
  mk({
    id: "EX-A6-1", lessonId: "A-06", kind: "guided", origin: "generated", conceptIds: [],
    title: "Filter: show only the North region", objective: "Use the Filter tool so only rows that meet a condition are visible.", datasetNote: "Generated order table.",
    instructions: ["Click any cell in the Region column (B) of the table.", "Press the Filter button in the toolbar, choose column B, the condition \"equals\" and the value North.", "Only the North orders should stay visible. Then press Check Answer."],
    workbook: () => workbookOf(ordersCells()), activeSheet: OR, editable: [], tools: ["filter"],
    simulationNote: "Filtering is simulated with a dialog; Excel uses the drop-down arrows on the header row.",
    checks: [{ type: "visibleRows", label: "Visible orders", sheet: OR, range: "A2:F13", keyCol: "A", expected: orders.filter((o) => o[1] === "North").map((o) => o[0]) }],
    hints: ["The Filter button is in the spreadsheet toolbar.", "Condition: Region equals North.", "Rows that do not match are hidden, not deleted."],
    solution: { explanation: "Filtering hides the rows that do not match; the data is not changed.", cells: {}, hiddenRows: hiddenFor((o) => o[1] === "North") },
  }),
  mk({
    id: "EX-A6-2", lessonId: "A-06", kind: "independent", origin: "generated", conceptIds: [],
    title: "Sort by Units, largest first", objective: "Sort a whole table so rows stay together.", datasetNote: "Generated order table.",
    instructions: ["Click a cell in the Units column (D).", "Use the Sort button: column D, largest to smallest (descending).", "Each row must move as a whole: the Order number stays with its Region, Rep, Units, Price and Status."],
    workbook: () => workbookOf(ordersCells()), activeSheet: OR, editable: ["A2:F13"], tools: ["sort"],
    simulationNote: "Sorting is simulated with a dialog; Excel uses Data → Sort or the filter drop-down.",
    checks: [{ type: "values", label: "Orders sorted by Units (descending)", sheet: OR, range: "A2:F13", expected: byUnitsDesc.map((o) => [...o]) }],
    hints: ["Choose Descending, because we want the largest Units first.", "Sorting only one column would separate the values from their rows — the tool sorts the whole table."],
    solution: { explanation: "The table is sorted by the Units column, largest to smallest, with every row kept intact.", cells: rowCells(byUnitsDesc) },
  }),
  mk({
    id: "EX-A6-3", lessonId: "A-06", kind: "mastery", origin: "generated", conceptIds: [],
    title: "Sort by Region, then show only big orders", objective: "Combine sorting and filtering in the right order.", datasetNote: "Generated order table.",
    instructions: ["First sort the table by Region, A to Z.", "Then filter Units so only orders with MORE than 40 units are visible.", "Order matters: sort first, then filter. (Rows with equal regions keep their original order.)"],
    workbook: () => workbookOf(ordersCells()), activeSheet: OR, editable: ["A2:F13"], tools: ["sort", "filter"],
    simulationNote: "Sorting and filtering are simulated with dialogs.",
    checks: [{ type: "visibleRows", label: "Visible orders after sort and filter", sheet: OR, range: "A2:F13", keyCol: "A", expected: regionThenBig.map((o) => o[0]) }],
    hints: ["Sort: column B, ascending.", "Filter: column D, condition \"greater than\", value 40.", "If you filter first and sort afterwards, the hidden rows no longer line up. Use \"Clear filter\" and start again."],
    solution: { explanation: "After sorting by Region, a Units > 40 filter keeps the big orders in region order.", cells: rowCells(byRegion), hiddenRows: hiddenFor((o) => o[3] > 40, byRegion) },
  }),
];

/* ======================================================================================
   A-07  Dynamic arrays: UNIQUE, SORT, FILTER, SEQUENCE
   ====================================================================================== */
const NM = "People";
const people: [string, number][] = [["Maya", 82], ["Zed", 55], ["Maya", 91], ["Liam", 70], ["Zed", 88], ["Nora", 64], ["Liam", 73], ["Omar", 95], ["Nora", 45], ["Maya", 60]];
const peopleSheet = () => workbookOf(widths(sheetOf(NM, grid("A1", [["Name", "Score"], ...people.map(([a, b]) => [a, b])])), { A: 80, B: 60, D: 120, F: 120 }));
const names = (r: InputReader) => col(r, NM, "A2:A11").map(String);
const uniq = (xs: string[]) => [...new Set(xs.map((x) => x))];
const sortAZ = (xs: string[]) => [...xs].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

const A7X: Exercise[] = [
  mk({
    id: "EX-A7-1", lessonId: "A-07", kind: "guided", origin: "generated", conceptIds: [],
    title: "UNIQUE: each name once", objective: "Write one formula that spills a list of distinct values.", datasetNote: "Generated names with repeats.",
    instructions: ["In D2 write a formula that lists every name in A2:A11 once.", "Write it in D2 only and leave D3 downward empty: the results spill automatically."],
    workbook: peopleSheet, activeSheet: NM, editable: ["D2:D11"],
    simulationNote: "Dynamic arrays need Excel 2021 or Microsoft 365.",
    checks: [{ type: "formula", label: "Distinct names", sheet: NM, range: "D2:D11", requiredFunctions: [["UNIQUE"]], expected: (r) => pad(uniq(names(r)), 10), perturb: [{ A3: "Pia" }] }],
    hints: ["=UNIQUE(range)", "=UNIQUE(A2:A11)"],
    solution: { explanation: "UNIQUE returns each distinct value once, in order of first appearance, and spills down.", cells: { D2: "=UNIQUE(A2:A11)" } },
  }),
  mk({
    id: "EX-A7-2", lessonId: "A-07", kind: "independent", origin: "generated", conceptIds: [],
    title: "SORT(UNIQUE(...)): an alphabetical list", objective: "Nest dynamic-array functions.", datasetNote: "Generated names with repeats.",
    instructions: ["In D2 list each name once, sorted A to Z, with a single formula."],
    workbook: peopleSheet, activeSheet: NM, editable: ["D2:D11"],
    simulationNote: "Dynamic arrays need Excel 2021 or Microsoft 365.",
    checks: [{ type: "formula", label: "Sorted distinct names", sheet: NM, range: "D2:D11", requiredFunctions: [["SORT"], ["UNIQUE"]], expected: (r) => pad(sortAZ(uniq(names(r))), 10), perturb: [{ A3: "Aaron" }] }],
    hints: ["The inner function runs first: UNIQUE makes the list, SORT orders it.", "=SORT(UNIQUE(A2:A11))"],
    solution: { explanation: "UNIQUE(A2:A11) is the list of distinct names; SORT puts it in A–Z order.", cells: { D2: "=SORT(UNIQUE(A2:A11))" } },
  }),
  mk({
    id: "EX-A7-3", lessonId: "A-07", kind: "mastery", origin: "generated", conceptIds: [],
    title: "High scorers and a distinct count", objective: "Combine FILTER, UNIQUE, SORT and COUNTA.", datasetNote: "Generated names and scores.",
    instructions: ["D2: names whose Score is 70 or more, each name once, A to Z (spills).", "F2: how many different people appear in the whole list (one formula, no spilling)."],
    workbook: peopleSheet, activeSheet: NM, editable: ["D2:D11", "F2"],
    simulationNote: "Dynamic arrays need Excel 2021 or Microsoft 365.",
    checks: [
      { type: "formula", label: "High scorers", sheet: NM, range: "D2:D11", requiredFunctions: [["FILTER"], ["UNIQUE"], ["SORT"]], expected: (r) => { const nm = names(r); const sc2 = col(r, NM, "B2:B11").map(n); return pad(sortAZ(uniq(nm.filter((_, k) => sc2[k] >= 70))), 10); }, perturb: [{ B3: "99", B9: "99" }, { B2: "10" }] },
      { type: "formula", label: "Distinct people", sheet: NM, range: "F2", requiredFunctions: [["UNIQUE"]], expected: (r) => [[uniq(names(r)).length]], perturb: [{ A3: "Pia" }] },
    ],
    hints: ["FILTER(names, scores>=70) gives the names (with repeats).", "Wrap it: SORT(UNIQUE(FILTER(...))).", "For the count wrap UNIQUE in COUNTA: =COUNTA(UNIQUE(A2:A11))"],
    solution: { explanation: "FILTER keeps the rows that meet the condition, UNIQUE removes repeats and SORT orders them. COUNTA counts the items in the unique list.", cells: { D2: "=SORT(UNIQUE(FILTER(A2:A11,B2:B11>=70)))", F2: "=COUNTA(UNIQUE(A2:A11))" } },
  }),
];

export const EXTRA_EXERCISES: Exercise[] = [...A1X, ...A2X, ...A3X, ...A4X, ...A5X, ...A6X, ...A7X];

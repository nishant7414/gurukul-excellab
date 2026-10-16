import { copySource, grid, sheetOf, srcValue, workbookOf } from "../data/source";
import { numToCol } from "../engine/refs";
import { toRaw } from "../engine/workbook";
import type { Scalar, WorkbookData } from "../engine/types";
import type { Exercise } from "../learning/types";
import { mergeCells, mk, widths } from "./helpers";

export const TR = "Transpose";
export const EF = "Excel Forms";

/** The instructor's student-fee table C3:I7 (Aadhar value is masked in the inventory) with its two worked balance formulas. */
function feeTable(): WorkbookData {
  const s = copySource(TR, "C3:I7", { formulas: true });
  s.cells["K4"] = "<---- Original Data";
  widths(s, { C: 60, D: 100, E: 100, F: 80, G: 110, H: 70, I: 120, K: 130, L: 110, M: 80, N: 80, O: 80, P: 80 });
  return workbookOf(s);
}
/** Static transpose of the source table C3:I7 (formula cells use their cached values, like Paste Special does). */
const srcMatrix = (): Scalar[][] => {
  const rows: Scalar[][] = [];
  for (let r = 3; r <= 7; r++) {
    const row: Scalar[] = [];
    for (let c = 3; c <= 9; c++) row.push((srcValue(TR, `${numToCol(c)}${r}`) as Scalar) ?? null);
    rows.push(row);
  }
  return rows;
};
const transposed = (m: Scalar[][]): Scalar[][] => m[0].map((_, c) => m.map((row) => row[c]));
const placeRaw = (m: Scalar[][], col0: number, row0: number): Record<string, string> => {
  const out: Record<string, string> = {};
  m.forEach((row, ri) => row.forEach((v, ci) => { if (v !== null) out[`${numToCol(col0 + ci)}${row0 + ri}`] = toRaw(v); }));
  return out;
};

/* ============================ L-TR-1 ============================ */
const TR1: Exercise[] = [
  mk({
    id: "EX-TR-1-1", lessonId: "L-TR-1", kind: "guided", origin: "source", conceptIds: ["C-TR-01", "C-TR-05"],
    title: "Calculate one balance",
    objective: "Identify the rows, columns and fields of a table, then calculate Balance = Total Fee − Deposit Amount.",
    datasetNote: "The student-fee table C3:I7 from the instructor's \"Transpose\" worksheet. The Aadhar column is shown with a masked placeholder.",
    scenario: "Each row is one student record; each column is one field. The Balance column is calculated, not typed.",
    instructions: [
      "Count the records (rows under the headings) and the fields (columns). There are 4 records and 7 fields.",
      "Click H4, the Balance cell of the first student (roll no 1).",
      "Type a formula that subtracts the Deposit Amount (column G) from the Total Fee (column F) for that row.",
      "Press Enter, then Check Answer.",
    ],
    workbook: () => { const w = feeTable(); const s = w.sheets[0]; delete s.cells["H4"]; delete s.cells["H5"]; delete s.cells["H6"]; delete s.cells["H7"]; return w; },
    activeSheet: TR, editable: ["H4"],
    checks: [{ type: "formula", label: "Balance for roll no 1", sheet: TR, range: "H4", expected: (r) => [[(r.get(TR, "F4") as number) - (r.get(TR, "G4") as number)]], perturb: [{ F4: "12000" }, { G4: "250" }] }],
    hints: ["A formula always starts with =.", "Total Fee is in F4 and Deposit Amount is in G4.", "Subtract: =F4-G4."],
    solution: { explanation: "Balance = Total Fee − Deposit. For row 4 the formula is =F4-G4, which gives 5000.", cells: { H4: "=F4-G4" } },
  }),
  mk({
    id: "EX-TR-1-2", lessonId: "L-TR-1", kind: "independent", origin: "source", conceptIds: ["C-TR-05", "C-TR-01"],
    title: "Balance for all four students",
    objective: "Calculate every student's balance with formulas, not typed numbers.",
    datasetNote: "Same instructor table. In the original workbook two balances (H4, H5) are typed numbers and two (H6, H7) are formulas; here all four must be formulas.",
    instructions: ["Fill H4:H7 with Balance = Total Fee − Deposit Amount.", "Write the formula once and fill it down, or type each one.", "Check Answer."],
    workbook: () => { const w = feeTable(); const s = w.sheets[0]; for (const a of ["H4", "H5", "H6", "H7"]) delete s.cells[a]; return w; },
    activeSheet: TR, editable: ["H4:H7"],
    checks: [{ type: "formula", label: "Balances", sheet: TR, range: "H4:H7", expected: (r) => [4, 5, 6, 7].map((n) => [(r.get(TR, `F${n}`) as number) - (r.get(TR, `G${n}`) as number)]), perturb: [{ F5: "7000" }, { G7: "100" }] }],
    hints: ["Write =F4-G4 in H4, then use Fill Down (Ctrl+D) over H4:H7.", "Relative references move with each row, so the same formula works in every row."],
    solution: { explanation: "=F4-G4 in H4, filled down to H7 (each row uses its own F and G).", cells: { H4: "=F4-G4", H5: "=F5-G5", H6: "=F6-G6", H7: "=F7-G7" } },
  }),
  mk({
    id: "EX-TR-1-3", lessonId: "L-TR-1", kind: "mastery", origin: "generated", conceptIds: ["C-TR-01", "C-TR-05"],
    title: "Larger fee table with totals",
    objective: "Calculate balances for six records and add column totals that keep working if the data changes.",
    datasetNote: "Generated practice table with the same field layout as the instructor's table. The totals row is an extension beyond the source workbook.",
    instructions: ["Fill the Balance column H4:H9 (Total Fee − Deposit).", "In row 10, give the totals of Total Fee (F10), Deposit (G10) and Balance (H10) with SUM.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(TR, {
      ...grid("C3", [["Roll No", "Student Name", "Father Name", "Total Fee", "Deposit Amount", "Balance"]]),
      ...grid("C4", [[1, "asha", "mohan", 12000, 5000], [2, "bilal", "yusuf", 9000, 9000], [3, "chitra", "gopal", 15000, 2500], [4, "dev", "anil", 7000, 1000], [5, "esha", "ravi", 11000, 4000], [6, "farah", "imran", 8500, 500]]),
      E10: "Totals",
    }), { C: 60, D: 100, E: 100, F: 90, G: 110, H: 90 })),
    activeSheet: TR, editable: ["H4:H9", "F10:H10"],
    checks: [
      { type: "formula", label: "Balances", sheet: TR, range: "H4:H9", expected: (r) => [4, 5, 6, 7, 8, 9].map((n) => [(r.get(TR, `F${n}`) as number) - (r.get(TR, `G${n}`) as number)]), perturb: [{ F6: "20000" }] },
      {
        type: "formula", label: "Totals row", sheet: TR, range: "F10:H10", requiredFunctions: [["SUM"]],
        expected: (r) => { const s = (c: string) => [4, 5, 6, 7, 8, 9].reduce((a, n) => a + (r.get(TR, `${c}${n}`) as number), 0); return [[s("F"), s("G"), s("F") - s("G")]]; },
        perturb: [{ F4: "13000" }, { G8: "4500" }],
      },
    ],
    hints: ["H4 is =F4-G4; fill it down to H9.", "SUM(F4:F9) adds the six fees.", "H10 can be =SUM(H4:H9) or =F10-G10; both are correct."],
    solution: { explanation: "Balances: =F{r}-G{r}. Totals: =SUM(F4:F9), =SUM(G4:G9), =SUM(H4:H9).", cells: mergeCells({ F10: "=SUM(F4:F9)", G10: "=SUM(G4:G9)", H10: "=SUM(H4:H9)" }, Object.fromEntries([4, 5, 6, 7, 8, 9].map((n) => [`H${n}`, `=F${n}-G${n}`]))) },
  }),
];

/* ============================ L-TR-2 ============================ */
const TR2: Exercise[] = [
  mk({
    id: "EX-TR-2-1", lessonId: "L-TR-2", kind: "guided", origin: "source", conceptIds: ["C-TR-02", "C-TR-03", "C-TR-04"],
    title: "Transpose the table with Paste Special",
    objective: "Copy the whole table and paste it transposed so that fields become rows and records become columns.",
    datasetNote: "Instructor's table C3:I7. The expected result is the instructor's transposed copy at L12:P18.",
    instructions: [
      "Click any cell inside the table (for example D5) and press Ctrl+A. The current region C3:I7 is selected, not the whole sheet.",
      "Press Ctrl+C (or the Copy button).",
      "Click L12.",
      "Open Paste ▾ and choose Paste Special → Transpose.",
      "Check Answer.",
    ],
    workbook: feeTable, activeSheet: TR, editable: ["L12:P18"], tools: ["transpose"],
    simulationNote: "Paste Special → Transpose is simulated. Like the real command with default options, formula results are pasted as values, so the Balance cells arrive as numbers.",
    checks: [{ type: "values", label: "Transposed table", sheet: TR, range: "L12:P18", expected: transposed(srcMatrix()) }],
    hints: ["Selecting the table: click inside it and press Ctrl+A once.", "Paste at the top-left cell of the destination, L12.", "Use Paste ▾ → Transpose, not a normal paste."],
    solution: { explanation: "Select C3:I7, copy, click L12, Paste Special → Transpose. The 5×7 table becomes 7×5.", cells: placeRaw(transposed(srcMatrix()), 12, 12) },
  }),
  mk({
    id: "EX-TR-2-2", lessonId: "L-TR-2", kind: "independent", origin: "source", conceptIds: ["C-TR-03", "C-TR-04", "C-TR-05", "C-TR-06"],
    title: "Transpose, then restore the Balance formulas",
    objective: "Transpose the table to B18 and recalculate the Balance row with formulas, as in the instructor's second copy.",
    datasetNote: "Instructor's table C3:I7; expected layout is the instructor's copy at B18:F24 (whose Balance cells E23:F23 are formulas).",
    instructions: [
      "Copy the table C3:I7 and paste it transposed at B18.",
      "In the new table the Balance row is row 23. Replace C23:F23 with formulas that subtract Deposit Amount (row 22) from Total Fee (row 21).",
      "Check Answer. Every record and field must still be present.",
    ],
    workbook: feeTable, activeSheet: TR, editable: ["B18:F24"], tools: ["transpose"],
    simulationNote: "Paste Special → Transpose is simulated (values are pasted).",
    checks: [
      { type: "values", label: "Fields and records (excluding the Balance row)", sheet: TR, range: "B18:F22", expected: transposed(srcMatrix()).slice(0, 5) },
      { type: "values", label: "Aadhar row (masked)", sheet: TR, range: "B24:F24", expected: [transposed(srcMatrix())[6]] },
      { type: "formula", label: "Balance row", sheet: TR, range: "C23:F23", expected: (r) => [["C", "D", "E", "F"].map((c) => (r.get(TR, `${c}21`) as number) - (r.get(TR, `${c}22`) as number))], perturb: [{ C21: "9999" }, { F22: "1" }] },
    ],
    hints: ["Paste Special → Transpose at B18 places the labels in column B.", "The Balance row is row 23: write =C21-C22 in C23 and fill right.", "Do not type numbers into row 23; use formulas."],
    solution: { explanation: "Transpose C3:I7 to B18, then C23:F23 = Total Fee (row 21) − Deposit (row 22).", cells: mergeCells(placeRaw(transposed(srcMatrix()), 2, 18), { C23: "=C21-C22", D23: "=D21-D22", E23: "=E21-E22", F23: "=F21-F22" }) },
  }),
  mk({
    id: "EX-TR-2-3", lessonId: "L-TR-2", kind: "mastery", origin: "generated", conceptIds: ["C-TR-03", "C-TR-04", "C-TR-06"],
    title: "Months down, products across",
    objective: "Transpose a sales table so months run down the rows, then total each month.",
    datasetNote: "Generated sales data (4 products × 6 months). Not from the instructor's workbook.",
    instructions: ["Select A1:G5 and copy it.", "Paste it transposed at A8. Months now run down column A.", "In F9:F14 total each month's sales across the four products with SUM.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(TR, {
      ...grid("A1", [["Product", "Jan", "Feb", "Mar", "Apr", "May", "Jun"], ["Pens", 120, 135, 90, 150, 160, 170], ["Books", 80, 70, 95, 100, 85, 110], ["Bags", 40, 55, 60, 45, 70, 65], ["Lamps", 25, 30, 20, 35, 40, 45]]),
      F8: "Total",
    }), { A: 80, B: 70, C: 70, D: 70, E: 70, F: 70, G: 70 })),
    activeSheet: TR, editable: ["A8:E14", "F9:F14"], tools: ["transpose"],
    simulationNote: "Paste Special → Transpose is simulated (values are pasted).",
    checks: [
      { type: "values", label: "Transposed sales table", sheet: TR, range: "A8:E14", expected: transposed([["Product", "Jan", "Feb", "Mar", "Apr", "May", "Jun"], ["Pens", 120, 135, 90, 150, 160, 170], ["Books", 80, 70, 95, 100, 85, 110], ["Bags", 40, 55, 60, 45, 70, 65], ["Lamps", 25, 30, 20, 35, 40, 45]]) },
      { type: "formula", label: "Monthly totals", sheet: TR, range: "F9:F14", requiredFunctions: [["SUM"]], expected: (r) => [9, 10, 11, 12, 13, 14].map((n) => [["B", "C", "D", "E"].reduce((a, c) => a + ((r.get(TR, `${c}${n}`) as number) || 0), 0)]), perturb: [{ B9: "1000" }, { D12: "5" }] },
    ],
    hints: ["Paste Special → Transpose at A8.", "F9 is =SUM(B9:E9). Fill it down to F14."],
    solution: {
      explanation: "Transpose A1:G5 to A8, then =SUM(B9:E9) filled down to F14.",
      cells: mergeCells(placeRaw(transposed([["Product", "Jan", "Feb", "Mar", "Apr", "May", "Jun"], ["Pens", 120, 135, 90, 150, 160, 170], ["Books", 80, 70, 95, 100, 85, 110], ["Bags", 40, 55, 60, 45, 70, 65], ["Lamps", 25, 30, 20, 35, 40, 45]]), 1, 8), Object.fromEntries([9, 10, 11, 12, 13, 14].map((n) => [`F${n}`, `=SUM(B${n}:E${n})`]))),
    },
  }),
];

/* ============================ L-EF-1 / L-EF-2 ============================ */
const efSheet = (extra: Record<string, string> = {}) =>
  workbookOf(widths(sheetOf(EF, { ...grid("C4", [["Roll No", "Student Name", "Father Name", "Total Fee", "Deposit Amount", "Balance"]]), ...extra }), { C: 60, D: 110, E: 110, F: 90, G: 110, H: 80, I: 100, J: 100, K: 100 }));
const EF_BASE = { ...grid("C5", [[12, "ramesh", "suresh", 1000, 100]]), H5: "=F5-G5" };
const EF_COLS = [
  { col: "C", name: "Roll No", kind: "number" as const, min: 1 },
  { col: "D", name: "Student Name", kind: "text" as const },
  { col: "E", name: "Father Name", kind: "text" as const },
  { col: "F", name: "Total Fee", kind: "number" as const, min: 1 },
  { col: "G", name: "Deposit Amount", kind: "number" as const, min: 0 },
  { col: "H", name: "Balance", kind: "calc" as const, calc: (g: (c: string) => Scalar) => (g("F") as number) - (g("G") as number) },
];
const WANT: Record<number, [string, string, number, number]> = { 13: ["meena", "mohan", 12000, 3000], 14: ["sunil", "anil", 9000, 4500] };
const wantRule = (get: (c: string) => Scalar): string | null => {
  const w = WANT[get("C") as number];
  if (!w) return "Keep the provided roll number.";
  const ok = String(get("D")).trim().toLowerCase() === w[0] && String(get("E")).trim().toLowerCase() === w[1] && get("F") === w[2] && get("G") === w[3];
  return ok ? null : `Roll ${get("C")}: use exactly Student Name ${w[0]}, Father Name ${w[1]}, Total Fee ${w[2]}, Deposit ${w[3]}.`;
};

const EF1: Exercise[] = [
  mk({
    id: "EX-EF-1-1", lessonId: "L-EF-1", kind: "guided", origin: "source", conceptIds: ["C-EF-01", "C-EF-02", "C-EF-03", "C-EF-05"],
    title: "Complete one student record",
    objective: "Fill in one incomplete record without overwriting the neighbouring cells, and calculate its balance.",
    datasetNote: "The instructor's \"Excel Forms\" table C4:H7. Record 12 is complete; records 13 and 14 have only their roll numbers.",
    scenario: "Roll no 13 is Student Name meena, Father Name mohan, Total Fee 12000, Deposit Amount 3000.",
    instructions: ["Click D6 and type the student name. Press Tab to move right.", "Fill the Father Name, Total Fee and Deposit Amount in the same row (Tab between fields).", "In H6 enter the Balance as a formula (Total Fee − Deposit).", "Check Answer."],
    workbook: () => efSheet({ ...EF_BASE, C6: "13", C7: "14" }), activeSheet: EF, editable: ["D6:H6"],
    simulationNote: "Excel's Data Form dialog is not simulated; you enter the record directly in the table.",
    checks: [{ type: "records", label: "Record for roll no 13", sheet: EF, rows: "6:6", columns: EF_COLS, rowRule: wantRule }],
    hints: ["Press Tab (not Enter) to move to the next field in the same row.", "Names are text; fees are numbers (do not put quotes around them).", "Balance in H6: =F6-G6."],
    solution: { explanation: "meena / mohan / 12000 / 3000 and H6 =F6-G6 (9000).", cells: { D6: "meena", E6: "mohan", F6: "12000", G6: "3000", H6: "=F6-G6" } },
  }),
  mk({
    id: "EX-EF-1-2", lessonId: "L-EF-1", kind: "independent", origin: "source", conceptIds: ["C-EF-01", "C-EF-02", "C-EF-05"],
    title: "Complete both unfinished records",
    objective: "Enter two complete records with correct field types and calculated balances.",
    datasetNote: "Instructor's \"Excel Forms\" table; the specific names and fees are supplied by this exercise because the workbook leaves those fields blank.",
    scenario: "Roll 13: meena, mohan, 12000, 3000. Roll 14: sunil, anil, 9000, 4500.",
    instructions: ["Complete rows 6 and 7 using the details above.", "Balance must be a formula in both rows.", "Check Answer."],
    workbook: () => efSheet({ ...EF_BASE, C6: "13", C7: "14" }), activeSheet: EF, editable: ["D6:H7"],
    simulationNote: "Excel's Data Form dialog is not simulated.",
    checks: [{ type: "records", label: "Records 13 and 14", sheet: EF, rows: "6:7", columns: EF_COLS, rowRule: wantRule }],
    hints: ["Each row needs six fields: roll no (given), name, father name, total fee, deposit and balance.", "Fill H6 and H7 with =F6-G6 and =F7-G7."],
    solution: { explanation: "Rows 6 and 7 completed; balances 9000 and 4500 by formula.", cells: { D6: "meena", E6: "mohan", F6: "12000", G6: "3000", H6: "=F6-G6", D7: "sunil", E7: "anil", F7: "9000", G7: "4500", H7: "=F7-G7" } },
  }),
  mk({
    id: "EX-EF-1-3", lessonId: "L-EF-1", kind: "mastery", origin: "generated", conceptIds: ["C-EF-01", "C-EF-05", "C-EF-06"],
    title: "Employee advance register (you choose the data)",
    objective: "Enter four valid records of your own. A record is valid when every field is present, types are right, and the advance does not exceed the salary.",
    datasetNote: "Generated layout for practice; you invent the names and amounts.",
    instructions: ["Enter four employees in rows 5–8: Department and Employee Name as text, Salary and Advance as numbers.", "Net Pay is Salary − Advance, calculated with a formula.", "The Advance must not exceed the Salary.", "Check Answer."],
    workbook: () => workbookOf(widths(sheetOf(EF, { ...grid("C4", [["Emp ID", "Employee Name", "Department", "Salary", "Advance", "Net Pay"]]), ...grid("C5", [[101], [102], [103], [104]]) }), { C: 60, D: 130, E: 110, F: 90, G: 90, H: 90 })),
    activeSheet: EF, editable: ["D5:H8"],
    checks: [{
      type: "records", label: "Valid employee records", sheet: EF, rows: "5:8",
      columns: [
        { col: "C", name: "Emp ID", kind: "number", min: 1 }, { col: "D", name: "Employee Name", kind: "text" }, { col: "E", name: "Department", kind: "text" },
        { col: "F", name: "Salary", kind: "number", min: 1 }, { col: "G", name: "Advance", kind: "number", min: 0 },
        { col: "H", name: "Net Pay", kind: "calc", calc: (g) => (g("F") as number) - (g("G") as number) },
      ],
      rowRule: (g) => ((g("G") as number) > (g("F") as number) ? "Advance is larger than the salary, which makes the record invalid." : null),
    }],
    hints: ["Use Tab to move across a row.", "Net Pay: =F5-G5 and fill down.", "Pick an advance smaller than the salary."],
    solution: { explanation: "Any four valid rows are accepted; this reference uses sample values.", cells: { D5: "Asha", E5: "Sales", F5: "30000", G5: "5000", H5: "=F5-G5", D6: "Bilal", E6: "Stores", F6: "28000", G6: "0", H6: "=F6-G6", D7: "Chitra", E7: "HR", F7: "35000", G7: "10000", H7: "=F7-G7", D8: "Dev", E8: "Sales", F8: "26000", G8: "2000", H8: "=F8-G8" } },
  }),
];

const efTextNums = () => efSheet({ ...grid("C5", [[12, "ramesh", "suresh"]]), F5: "'1000", G5: "100", H5: "=F5-G5", ...grid("C6", [[13, "meena", "mohan", 2000, 300]]), H6: "=F6-G6", ...grid("C7", [[14, "sunil", "anil", 3000, 500]]), H7: "=F7-G7", E8: "Total Fee", F8: "=SUM(F5:F7)" });
const EF2: Exercise[] = [
  mk({
    id: "EX-EF-2-1", lessonId: "L-EF-2", kind: "guided", origin: "source", conceptIds: ["C-EF-04"],
    title: "Text that looks like a number",
    objective: "Recognise a number that was stored as text and fix it.",
    datasetNote: "Instructor's \"Excel Forms\" table (record 12) with one fee deliberately stored as text; other rows are generated to give a total.",
    instructions: ["Look at F5. It is left-aligned like text, so it is stored as text. F8's SUM ignores it.", "Retype F5 as a real number (1000, no quote marks).", "F8 should now total 6000. Check Answer."],
    workbook: efTextNums, activeSheet: EF, editable: ["F5"],
    checks: [{ type: "values", label: "Total Fee for roll 12 is a number", sheet: EF, range: "F5", expected: [[1000]] }, { type: "values", label: "Total of fees", sheet: EF, range: "F8", expected: [[6000]] }],
    hints: ["Numbers are right-aligned by default; text is left-aligned.", "Click F5, type 1000 and press Enter."],
    solution: { explanation: "Retype 1000 so Excel stores a number. SUM then totals 1000 + 2000 + 3000 = 6000.", cells: { F5: "1000" } },
  }),
  mk({
    id: "EX-EF-2-2", lessonId: "L-EF-2", kind: "independent", origin: "generated", conceptIds: ["C-EF-04"],
    title: "Convert text numbers with a formula",
    objective: "Convert a whole column of text numbers into real numbers without retyping them.",
    datasetNote: "Generated: three fees stored as text.",
    instructions: ["Total Fee in F5:F7 is text.", "In J5:J7 write a formula that returns the fee as a real number (for example with VALUE).", "Check Answer."],
    workbook: () => efSheet({ ...grid("C5", [[12, "ramesh", "suresh"], [13, "meena", "mohan"], [14, "sunil", "anil"]]), F5: "'1000", F6: "'2000", F7: "'3000", J4: "Fee (number)" }), activeSheet: EF, editable: ["J5:J7"],
    checks: [{ type: "formula", label: "Fees as numbers", sheet: EF, range: "J5:J7", expected: (r) => [5, 6, 7].map((n) => [Number(r.get(EF, `F${n}`))]), perturb: [{ F5: "'4500" }, { F7: "'12" }] }],
    hints: ["=VALUE(F5) converts text such as \"1000\" into the number 1000.", "Fill down to J7."],
    solution: { explanation: "=VALUE(F5) filled down. (=F5*1 also works.)", cells: { J5: "=VALUE(F5)", J6: "=VALUE(F6)", J7: "=VALUE(F7)" } },
  }),
  mk({
    id: "EX-EF-2-3", lessonId: "L-EF-2", kind: "mastery", origin: "generated", conceptIds: ["C-EF-06", "C-EF-04"],
    title: "Flag incomplete records",
    objective: "Use a formula to mark each record Complete or Incomplete and count the incomplete ones.",
    datasetNote: "Generated register of six records; two have a missing field (as records 13 and 14 do in the instructor's sheet).",
    instructions: ["In I5:I10 return \"Complete\" when all six fields (C:H) are filled, otherwise \"Incomplete\".", "In K2 count the incomplete records.", "Check Answer."],
    workbook: () => efSheet({ ...grid("C5", [[12, "ramesh", "suresh", 1000, 100, 900], [13, "meena", "mohan", 2000, 300, 1700], [14, null, "anil", 3000, 500, 2500], [15, "tara", "vijay", 1500, 0, 1500], [16, "uma", "kishan", 1800, null, 1800], [17, "vik", "mahesh", 2200, 200, 2000]]), I4: "Status", J2: "Incomplete:" }), activeSheet: EF, editable: ["I5:I10", "K2"],
    checks: [
      { type: "formula", label: "Status per record", sheet: EF, range: "I5:I10", requiredFunctions: [["IF", "IFS"]], expected: (r) => [5, 6, 7, 8, 9, 10].map((n) => [r.range(EF, `C${n}:H${n}`)[0].every((v) => v !== null) ? "Complete" : "Incomplete"]), perturb: [{ D7: "asha" }, { G9: "500" }] },
      { type: "formula", label: "Number of incomplete records", sheet: EF, range: "K2", expected: (r) => [[[5, 6, 7, 8, 9, 10].filter((n) => r.range(EF, `C${n}:H${n}`)[0].some((v) => v === null)).length]], perturb: [{ D7: "asha" }, { G9: "500" }] },
    ],
    hints: ["COUNTA counts non-empty cells: COUNTA(C5:H5)=6 means complete.", "=IF(COUNTA(C5:H5)=6,\"Complete\",\"Incomplete\")", "K2: =COUNTIF(I5:I10,\"Incomplete\")"],
    solution: { explanation: "IF + COUNTA per row; COUNTIF over the status column for the total.", cells: { ...Object.fromEntries([5, 6, 7, 8, 9, 10].map((n) => [`I${n}`, `=IF(COUNTA(C${n}:H${n})=6,"Complete","Incomplete")`])), K2: '=COUNTIF(I5:I10,"Incomplete")' } },
  }),
];

export const TRANSPOSE_EXERCISES: Exercise[] = [...TR1, ...TR2];
export const FORMS_EXERCISES: Exercise[] = [...EF1, ...EF2];

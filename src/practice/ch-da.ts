import { defineChallenge } from "./build";
import { eq, n, s } from "./h";
import type { Row } from "./types";
import type { Scalar } from "../engine/types";

const SIM = "Dynamic-array functions (UNIQUE, SORT, FILTER, TAKE ...) need Excel 2021 or Microsoft 365. Gurukul ExcelLab evaluates them with its own engine; spill areas are simulated as a fixed answer rectangle.";
const vals = (r: Row): Scalar[] => Object.values(r);
const cmp = (a: Scalar, b: Scalar): number => (typeof a === "number" && typeof b === "number" ? a - b : s(a).toLowerCase() < s(b).toLowerCase() ? -1 : s(a).toLowerCase() > s(b).toLowerCase() ? 1 : 0);
const uniqueBy = <T,>(xs: T[], key: (x: T) => string): T[] => { const seen = new Set<string>(); return xs.filter((x) => { const k = key(x).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); };
const sortRows = (rows: Row[], key: string, dir: 1 | -1) => [...rows].sort((a, b) => dir * cmp(a[key] ?? null, b[key] ?? null));
const col1 = (xs: Scalar[]): Scalar[][] => xs.map((v) => [v]);

export const DA = [
  defineChallenge({
    id: "PC-DA-01", concept: "DA", tier: "Easy", ds: ["DS-HR-DIRECTORY"], title: "A list of departments, each once", minutes: 8, skill: "UNIQUE", simulationNote: SIM,
    context: "The staff directory repeats the department for every person. HR wants the distinct departments for a drop-down source.",
    output: "A spilled list of the distinct departments in first-appearance order.",
    hints: ["UNIQUE(range) returns each value once.", "Write the formula in the first answer cell only; the rest fills by itself (spills)."],
    explanation: "UNIQUE removes repeats and keeps the order of first appearance. One formula fills the whole list.",
    mistakes: ["Typing the formula in every cell", "Selecting the header too", "Typing the departments by hand"],
    tasks: () => [{ kind: "spill", title: "Distinct departments", label: "Distinct departments", headers: ["Departments"], height: 8, text: "In {range} write one formula that lists every department once.", deps: ["dept"], required: [["UNIQUE"]],
      expect: (x) => col1(uniqueBy(x.T.dir, (r) => s(r.dept ?? null)).map((r) => r.dept ?? null)), formula: "=UNIQUE(@@dept)" }],
  }),
  defineChallenge({
    id: "PC-DA-02", concept: "DA", tier: "Easy", ds: ["DS-EDU-COURSES"], title: "Departments as a sorted row", minutes: 10, skill: "SORT, UNIQUE, TRANSPOSE", simulationNote: SIM,
    context: "The timetable header needs the departments across a row, in alphabetical order, with no repeats.",
    output: "A spilled row of the distinct departments sorted A to Z.",
    hints: ["Build it inside out: UNIQUE first, then SORT.", "TRANSPOSE turns the vertical list into a horizontal row."],
    explanation: "TRANSPOSE(SORT(UNIQUE(range))) chains three dynamic-array functions: distinct values, ordered, then turned sideways.",
    mistakes: ["Sorting before removing duplicates (still works but wastes steps)", "Forgetting TRANSPOSE so the list is vertical", "Mismatched brackets"],
    tasks: () => [{ kind: "spill", title: "Department row", label: "Sorted departments (row)", headers: ["D1", "D2", "D3", "D4", "D5", "D6"], height: 1, text: "In {range} write one formula that returns the departments once each, sorted A to Z, as a row.", deps: ["dept"], required: [["UNIQUE"], ["SORT"], ["TRANSPOSE", "TOROW"]],
      expect: (x) => [uniqueBy(x.T.courses, (r) => s(r.dept ?? null)).map((r) => r.dept ?? null).sort((a, b) => cmp(a, b))], formula: "=TRANSPOSE(SORT(UNIQUE(@@dept)))" }],
  }),
  defineChallenge({
    id: "PC-DA-03", concept: "DA", tier: "Easy", ds: ["DS-EDU-MARKS"], title: "A live merit list", minutes: 10, skill: "SORT with a column index and order", simulationNote: SIM,
    context: "The principal wants the class listed from the highest to the lowest Maths mark, updating when marks change.",
    output: "The whole marks table in descending Maths order.",
    hints: ["SORT(array, sort_index, order): the sort index is the column number inside the array; order -1 means descending.", "Maths is the third column of A:F."],
    explanation: "SORT(A2:F21, 3, -1) sorts every row by its third column from largest to smallest. It re-sorts automatically when a mark changes.",
    mistakes: ["Sorting only one column (rows no longer match)", "Using order 1 for descending", "Counting the sort index from column A of the sheet instead of the array"],
    tasks: () => [{ kind: "spill", title: "Merit list", label: "Merit list", headers: ["Roll No", "Name", "Maths", "Science", "English", "Grade"], height: 20, text: "In {range} return the whole table sorted by Maths from highest to lowest.", deps: ["maths", "name", "roll", "science", "english", "grade"], required: [["SORT", "SORTBY"]],
      expect: (x) => sortRows(x.T.marks, "maths", -1).map(vals), formula: "=SORT(@@*,3,-1)" }],
  }),
  defineChallenge({
    id: "PC-DA-04", concept: "DA", tier: "Medium", ds: ["DS-INV-STOCK"], title: "Reorder list: stock below the reorder level", minutes: 15, skill: "FILTER with a comparison between two columns", simulationNote: SIM,
    context: "The stores team needs a live list of every stock line whose quantity on hand is below its reorder level.",
    output: "All columns of the stock lines with OnHand < Reorder level; \"None\" when no line qualifies.",
    hints: ["FILTER(array, include, if_empty). The include argument is a TRUE/FALSE column.", "onhand<reorder compares the two ranges row by row.", "The answer area is big enough for every line."],
    explanation: "FILTER(A2:F76, C2:C76<D2:D76, \"None\") keeps only the rows where the comparison is TRUE.",
    mistakes: ["Filtering one column only", "Using a single cell instead of the full range in the condition", "Leaving out if_empty so an empty result gives an error"],
    tasks: () => [{ kind: "spill", title: "Reorder list", label: "Lines to reorder", headers: ["SKU", "Warehouse", "On hand", "Reorder level", "Unit cost", "Updated"], height: 75, text: "In {range} return the stock lines whose On hand is below the Reorder level.", deps: ["onhand", "reorder", "sku", "wh", "cost", "updated"], required: [["FILTER"]],
      expect: (x) => { const r = x.T.stock.filter((q) => n(q.onhand ?? null) < n(q.reorder ?? null)); return r.length ? r.map(vals) : [["None"]]; }, formula: '=FILTER(@@*,@@onhand<@@reorder,"None")' }],
  }),
  defineChallenge({
    id: "PC-DA-05", concept: "DA", tier: "Medium", ds: ["DS-SAL-REPS"], title: "Top five rep-quarters by sales", minutes: 15, skill: "TAKE with SORT", simulationNote: SIM,
    context: "A sales director wants a live leaderboard: the five best rep results across all quarters.",
    output: "The five rows with the highest Sales, best first.",
    hints: ["Sort the table by the Sales column (4th) from largest to smallest.", "TAKE(array, 5) keeps the first five rows of the sorted result."],
    explanation: "TAKE(SORT(A2:F33, 4, -1), 5) sorts descending by Sales and keeps just the first five rows.",
    mistakes: ["Taking before sorting", "Sorting ascending", "Asking for columns instead of rows"],
    tasks: () => [{ kind: "spill", title: "Leaderboard", label: "Top five by sales", headers: ["Rep", "Region", "Quarter", "Sales", "Calls", "Deals"], height: 5, text: "In {range} return the five rows with the highest Sales, best first.", deps: ["sales", "rep", "region", "quarter", "calls", "deals"], required: [["TAKE", "INDEX"], ["SORT", "SORTBY", "LARGE"]],
      expect: (x) => sortRows(x.T.reps, "sales", -1).slice(0, 5).map(vals), formula: "=TAKE(SORT(@@*,4,-1),5)" }],
  }),
  defineChallenge({
    id: "PC-DA-06", concept: "DA", tier: "Medium", ds: ["DS-FIN-EXPENSES"], title: "Distinct category and description pairs", minutes: 12, skill: "UNIQUE over two columns", simulationNote: SIM,
    context: "The accountant wants a chart-of-expenses list: each Category with each Description used, no repeats.",
    output: "A two-column spill of the distinct Category/Description pairs.",
    hints: ["UNIQUE works on a block of columns and compares whole rows.", "The Category and Description columns sit side by side (B and C)."],
    explanation: "UNIQUE(B2:C26) considers a row a repeat only when both columns match an earlier row.",
    mistakes: ["Running UNIQUE on one column and losing the pairing", "Selecting non-adjacent columns", "Counting rows instead of listing them"],
    tasks: () => [{ kind: "spill", title: "Expense pairs", label: "Distinct category and description pairs", headers: ["Category", "Description"], height: 25, text: "In {range} list each distinct Category and Description pair once.", deps: ["cat", "desc"], required: [["UNIQUE"]],
      expect: (x) => uniqueBy(x.T.expenses, (r) => `${s(r.cat ?? null)}|${s(r.desc ?? null)}`).map((r) => [r.cat ?? null, r.desc ?? null]), formula: "=UNIQUE($B$2:$C$26)" }],
  }),
  defineChallenge({
    id: "PC-DA-07", concept: "DA", tier: "Medium", ds: ["DS-OPS-EVENTS"], title: "Unpaid student registrations", minutes: 15, skill: "FILTER with two conditions (AND)", simulationNote: SIM,
    context: "The events team chases fees. It needs every registration where the attendee type is Student and Paid is No.",
    output: "All columns of the registrations that meet both conditions.",
    hints: ["Multiply the two TRUE/FALSE tests to make an AND: (type=\"Student\")*(paid=\"No\").", "Add an if_empty text so the formula does not error when nothing matches."],
    explanation: "Multiplying conditions gives 1 only when both are TRUE; FILTER keeps the rows with 1.",
    mistakes: ["Using AND() which returns a single TRUE/FALSE", "Missing brackets around each test", "Comparing text without quotes"],
    tasks: () => [{ kind: "spill", title: "Unpaid students", label: "Unpaid student registrations", headers: ["Reg ID", "Event", "Type", "Date", "Fee", "Paid"], height: 100, text: "In {range} return the registrations where Type is Student and Paid is No.", deps: ["type", "paid", "id", "event", "date", "fee"], required: [["FILTER"]],
      expect: (x) => { const r = x.T.events.filter((e) => eq(e.type ?? null, "Student") && eq(e.paid ?? null, "No")); return r.length ? r.map(vals) : [["None"]]; }, formula: '=FILTER(@@*,(@@type="Student")*(@@paid="No"),"None")' }],
  }),
  defineChallenge({
    id: "PC-DA-08", concept: "DA", tier: "Easy", ds: ["DS-SAL-MONTHLY"], title: "Months that beat the average", minutes: 10, skill: "FILTER with an aggregate inside the condition", simulationNote: SIM,
    context: "Management wants to see which months had revenue above the yearly monthly average.",
    output: "A spilled list of the months (dates) whose revenue is above the average month.",
    hints: ["The condition can contain a calculation: revenue range > AVERAGE(revenue range).", "FILTER the Month column using that condition."],
    explanation: "FILTER(month, revenue>AVERAGE(revenue)) keeps the months where the comparison is TRUE.",
    mistakes: ["Comparing against a typed number", "Using the average of units", "Filtering the revenue column instead of the months"],
    tasks: () => [{ kind: "spill", title: "Strong months", label: "Months above average revenue", headers: ["Month"], height: 12, nf: "date", text: "In {range} list the months whose Revenue is above the average monthly revenue.", deps: ["revenue", "month"], required: [["FILTER"]],
      expect: (x) => { const avg = x.T.monthly.reduce((t, r) => t + n(r.revenue ?? null), 0) / x.T.monthly.length; const r = x.T.monthly.filter((m) => n(m.revenue ?? null) > avg); return col1(r.map((m) => m.month ?? null)); }, formula: '=FILTER(@@month,@@revenue>AVERAGE(@@revenue),"None")' }],
  }),
  defineChallenge({
    id: "PC-DA-09", concept: "DA", tier: "Hard", ds: ["DS-SUP-TICKETS"], title: "Agents who handled urgent tickets", minutes: 20, skill: "SORT(UNIQUE(FILTER()))", simulationNote: SIM,
    context: "Across 800 tickets, the support manager wants an alphabetical list of the agents who have handled at least one Urgent ticket.",
    output: "A sorted list of distinct agent names.",
    hints: ["FILTER(agent column, priority column = \"Urgent\") gives the agent of every urgent ticket (with repeats).", "Wrap it in UNIQUE and then in SORT."],
    explanation: "Three functions nest: FILTER picks the urgent tickets' agents, UNIQUE removes repeats, SORT orders them.",
    mistakes: ["Forgetting UNIQUE (each ticket becomes a line)", "Filtering on the agent instead of the priority", "Extra spaces in the criteria text"],
    tasks: () => [{ kind: "spill", title: "Urgent agents", label: "Agents with urgent tickets", headers: ["Agent"], height: 8, text: "In {range} list each agent who handled an Urgent ticket once, sorted A to Z.", deps: ["agent", "priority"], required: [["FILTER"], ["UNIQUE"], ["SORT"]],
      expect: (x) => col1(uniqueBy(x.T.tickets.filter((t) => eq(t.priority ?? null, "Urgent")), (t) => s(t.agent ?? null)).map((t) => t.agent ?? null).sort(cmp)), formula: '=SORT(UNIQUE(FILTER(@@agent,@@priority="Urgent")))' }],
  }),
  defineChallenge({
    id: "PC-DA-10", concept: "DA", tier: "Hard", ds: ["DS-SAL-TXN"], title: "Ten largest transactions of the year", minutes: 20, skill: "TAKE and SORTBY on 1,500 rows", simulationNote: SIM,
    context: "An auditor wants a live list of the ten biggest transactions with every detail, whatever new data is pasted in.",
    output: "The ten rows with the highest Amount, largest first.",
    hints: ["SORTBY(array, by_array, order) sorts the whole table by another range.", "The Amount column is the sort key; TAKE keeps the first 10 rows."],
    explanation: "TAKE(SORTBY(table, amount, -1), 10) sorts the full table by Amount descending and keeps the first ten rows.",
    mistakes: ["Sorting only the amount column", "Using ascending order", "Mismatched array sizes in SORTBY"],
    tasks: () => [{ kind: "spill", title: "Top transactions", label: "Ten largest transactions", headers: ["Txn", "Date", "Product", "Region", "Rep", "Qty", "Disc", "Amount"], height: 10, text: "In {range} return the ten transactions with the highest Amount, largest first.", deps: ["amount", "id", "date", "product", "region", "rep", "qty", "disc"], required: [["TAKE", "INDEX"], ["SORTBY", "SORT", "LARGE"]],
      expect: (x) => sortRows(x.T.txn, "amount", -1).slice(0, 10).map(vals), formula: "=TAKE(SORTBY(@@*,@@amount,-1),10)" }],
  }),
  defineChallenge({
    id: "PC-DA-11", concept: "DA", tier: "Hard", ds: ["DS-MKT-LEADS"], title: "Best won leads", minutes: 25, skill: "FILTER, SORT and TAKE together", simulationNote: SIM,
    context: "The sales head reviews the eight highest-value leads that were actually Won.",
    output: "The eight Won leads with the highest value, highest first.",
    hints: ["First FILTER the table to Stage = \"Won\".", "SORT the result by Value (8th column) descending.", "TAKE the first eight rows."],
    explanation: "TAKE(SORT(FILTER(table, stage=\"Won\"), 8, -1), 8): filter, then order, then keep the top rows.",
    mistakes: ["Sorting before filtering and picking Lost deals", "Wrong sort column index", "Not using absolute ranges"],
    tasks: () => [{ kind: "spill", title: "Best won leads", label: "Eight best won leads", headers: ["Lead", "Created", "Source", "Campaign", "Owner", "Stage", "Converted", "Value"], height: 8, text: "In {range} return the eight Won leads with the highest Value, highest first.", deps: ["stage", "value", "id", "created", "source", "campaign", "owner", "converted"], required: [["FILTER"], ["SORT", "SORTBY"], ["TAKE", "INDEX"]],
      expect: (x) => sortRows(x.T.leads.filter((l) => eq(l.stage ?? null, "Won")), "value", -1).slice(0, 8).map(vals), formula: '=TAKE(SORT(FILTER(@@*,@@stage="Won"),8,-1),8)' }],
  }),
  defineChallenge({
    id: "PC-DA-12", concept: "DA", tier: "Hard", ds: ["DS-HR-ATTRITION"], title: "Why people leave: distinct exit reasons", minutes: 20, skill: "FILTER on non-blank cells with UNIQUE and SORT", simulationNote: SIM,
    context: "People Analytics needs the list of distinct exit reasons recorded for employees who have actually left (Exit date filled in).",
    output: "A sorted list of the distinct reasons for people with an exit date.",
    hints: ["An employee has left when the Exit date is not blank: exit range<>\"\".", "FILTER the Reason column on that condition, then UNIQUE, then SORT."],
    explanation: "FILTER(reason, exit<>\"\") ignores current employees, UNIQUE removes repeats and SORT puts the reasons in order.",
    mistakes: ["Listing blank reasons for current staff", "Testing exit=0 instead of <>\"\"", "Forgetting UNIQUE"],
    tasks: () => [{ kind: "spill", title: "Exit reasons", label: "Distinct exit reasons", headers: ["Reason"], height: 8, text: "In {range} list the distinct reasons of employees who have an exit date, sorted A to Z.", deps: ["reason", "exit"], required: [["FILTER"], ["UNIQUE"], ["SORT"]],
      expect: (x) => col1(uniqueBy(x.T.attrition.filter((a) => (a.exit ?? null) !== null && (a.reason ?? null) !== null), (a) => s(a.reason ?? null)).map((a) => a.reason ?? null).sort(cmp)), formula: '=SORT(UNIQUE(FILTER(@@reason,@@exit<>"")))' }],
  }),
];

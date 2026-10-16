import { defineChallenge } from "./build";
import { eq } from "./h";

const NOTE = "Sorting and filtering are simulated with the toolbar's Sort and Filter dialogs. In Excel you would use the Sort and Filter commands or the header drop-down arrows. Only one filter condition at a time is supported.";

export const SF = [
  defineChallenge({
    id: "PC-SF-01", concept: "SF", tier: "Easy", ds: ["DS-SAL-PRODUCTS"], title: "Price list, most expensive first", minutes: 5, skill: "Sort descending", simulationNote: NOTE,
    context: "The shop owner wants the catalogue ordered by price, highest first.",
    output: "All 25 products sorted by Unit price descending, every row kept together.",
    hints: ["Click a cell in the Unit price column, then use the Sort button.", "Choose descending (largest to smallest)."],
    explanation: "Sorting reorders whole rows by the values of one column, so each product keeps its own name, category and cost.",
    mistakes: ["Sorting one column only", "Ascending instead of descending", "Including the header row in the sort"],
    tasks: (c) => [{ kind: "sortfilter", label: "Price list", sort: [{ key: "price", dir: -1 }], text: `Sort the whole table by Unit price (column ${c.T.products.L("price")}) from largest to smallest.` }],
  }),
  defineChallenge({
    id: "PC-SF-02", concept: "SF", tier: "Easy", ds: ["DS-HR-DIRECTORY"], title: "Show only the IT team", minutes: 5, skill: "Filter equals", simulationNote: NOTE,
    context: "The IT manager needs a quick look at the IT people in the staff directory.",
    output: "Only the rows whose Department is IT are visible (the other rows are hidden, not deleted).",
    hints: ["Open the Filter dialog, choose the Department column and the condition equals IT.", "Filtering hides rows; it never deletes them."],
    explanation: "A filter hides every row that does not meet the condition and leaves the data unchanged.",
    mistakes: ["Deleting rows instead of filtering", "Filtering the wrong column", "Typing IT with extra spaces"],
    tasks: (c) => [{ kind: "sortfilter", label: "IT team", keep: (r) => eq(r.dept ?? null, "IT"), text: `Filter column ${c.T.dir.L("dept")} (Department) so that only IT remains visible.` }],
  }),
  defineChallenge({
    id: "PC-SF-03", concept: "SF", tier: "Easy", ds: ["DS-EDU-MARKS"], title: "Rank within grade (two-level sort)", minutes: 8, skill: "Sorting by two columns", simulationNote: NOTE,
    context: "The teacher wants students grouped by Grade (A first) and, inside each grade, ordered by Maths marks from highest to lowest.",
    output: "The table ordered by Grade A to Z, then by Maths descending.",
    hints: ["The tool sorts by one column at a time and keeps the existing order of equal rows.", "So sort by the less important column first (Maths, descending), then by the more important one (Grade, A to Z)."],
    explanation: "Sorting is stable: rows with equal values keep their previous order. Sorting by the secondary key first and the primary key last gives a two-level sort.",
    mistakes: ["Sorting Grade first and Maths last (destroys the grouping)", "Sorting Maths ascending", "Selecting only one column"],
    tasks: (c) => [{ kind: "sortfilter", label: "Marks ranked within grade", sort: [{ key: "grade", dir: 1 }, { key: "maths", dir: -1 }], text: `Sort by Maths (column ${c.T.marks.L("maths")}) descending first, then by Grade (column ${c.T.marks.L("grade")}) A to Z.` }],
  }),
  defineChallenge({
    id: "PC-SF-04", concept: "SF", tier: "Medium", ds: ["DS-SAL-CUSTOMERS"], title: "Oldest Pune customers first", minutes: 8, skill: "Sort, then filter", simulationNote: NOTE,
    context: "The CRM team contacts long-standing customers in Pune, starting with the earliest joiners.",
    output: "Customers sorted by Joined date (oldest first); only Pune customers visible.",
    hints: ["Sort first by the Joined column ascending.", "Then filter the City column to equal Pune."],
    explanation: "Sort first, then filter: the hidden rows are decided after the order is final.",
    mistakes: ["Filtering first and sorting afterwards (rows hidden at the wrong positions)", "Sorting descending", "Filtering the segment instead of the city"],
    tasks: (c) => [{ kind: "sortfilter", label: "Pune customers by joining date", sort: [{ key: "joined", dir: 1 }], keep: (r) => eq(r.city ?? null, "Pune"), text: `Sort by Joined (column ${c.T.customers.L("joined")}) ascending, then filter City (column ${c.T.customers.L("city")}) to equal Pune.` }],
  }),
  defineChallenge({
    id: "PC-SF-05", concept: "SF", tier: "Medium", ds: ["DS-SAL-ORDERS"], title: "Biggest delivered orders", minutes: 8, skill: "Sort, then filter", simulationNote: NOTE,
    context: "Operations reviews delivered orders, largest quantity first.",
    output: "Orders sorted by Qty (largest first); only Delivered orders visible.",
    hints: ["Sort by Qty descending.", "Then filter Status equals Delivered."],
    explanation: "Equal quantities keep their original order, so the result is reproducible.",
    mistakes: ["Ascending sort", "Filtering before sorting", "Misspelling Delivered"],
    tasks: (c) => [{ kind: "sortfilter", label: "Delivered orders by quantity", sort: [{ key: "qty", dir: -1 }], keep: (r) => eq(r.status ?? null, "Delivered"), text: `Sort by Qty (column ${c.T.orders.L("qty")}) from largest to smallest, then filter Status (column ${c.T.orders.L("status")}) to equal Delivered.` }],
  }),
  defineChallenge({
    id: "PC-SF-06", concept: "SF", tier: "Medium", ds: ["DS-HR-EMP"], title: "Resigned employees by salary", minutes: 8, skill: "Sort and filter on text", simulationNote: NOTE,
    context: "HR reviews the pay of employees who have resigned, highest salary first.",
    output: "Employees sorted by Salary descending; only those with Status Resigned visible.",
    hints: ["Sort by Salary descending.", "Filter the Status column: equals Resigned."],
    explanation: "A text filter compares without regard to case; the sort is by number.",
    mistakes: ["Sorting only the salary column", "Filtering the Status of On leave", "Filtering before sorting"],
    tasks: (c) => [{ kind: "sortfilter", label: "Resigned employees by salary", sort: [{ key: "salary", dir: -1 }], keep: (r) => eq(r.status ?? null, "Resigned"), text: `Sort by Salary (column ${c.T.emp.L("salary")}) descending, then filter Status (column ${c.T.emp.L("status")}) to equal Resigned.` }],
  }),
  defineChallenge({
    id: "PC-SF-07", concept: "SF", tier: "Medium", ds: ["DS-OPS-HOTEL"], title: "Suite bookings by rate", minutes: 8, skill: "Sort and filter", simulationNote: NOTE,
    context: "Revenue management compares what guests paid for Suites, highest rate first.",
    output: "Bookings sorted by Rate descending; only Suite bookings visible.",
    hints: ["Sort by the Rate column, largest to smallest.", "Filter the Room column to equal Suite."],
    explanation: "Equal rates keep their booking order, so the order is unambiguous.",
    mistakes: ["Sorting by Room instead of Rate", "Using contains with a typo", "Not sorting before filtering"],
    tasks: (c) => [{ kind: "sortfilter", label: "Suite bookings by rate", sort: [{ key: "rate", dir: -1 }], keep: (r) => eq(r.room ?? null, "Suite"), text: `Sort by Rate (column ${c.T.hotel.L("rate")}) descending, then filter Room (column ${c.T.hotel.L("room")}) to equal Suite.` }],
  }),
  defineChallenge({
    id: "PC-SF-08", concept: "SF", tier: "Hard", ds: ["DS-EDU-EXAM"], title: "Top marks in Hall A with missing marks last", minutes: 12, skill: "Sort with blanks, then filter (400 rows)", simulationNote: NOTE,
    context: "The exam cell reviews 400 exam sittings. Some marks are missing (absent students). Blank marks must stay at the bottom, and only Hall A is of interest.",
    output: "Sittings sorted by Marks descending (blanks last); only Centre = Hall A visible.",
    hints: ["Sort by Marks descending; blank cells always move to the bottom.", "Then filter Centre to equal Hall A.", "The sheet is long: scroll the table to check."],
    explanation: "Excel always places blank cells last in a sort, regardless of direction.",
    mistakes: ["Expecting blanks at the top in a descending sort", "Filtering first", "Filtering Hall A with the wrong spelling"],
    tasks: (c) => [{ kind: "sortfilter", label: "Hall A sittings by marks", sort: [{ key: "marks", dir: -1 }], keep: (r) => eq(r.centre ?? null, "Hall A"), text: `Sort by Marks (column ${c.T.exam.L("marks")}) descending, then filter Centre (column ${c.T.exam.L("centre")}) to equal Hall A.` }],
  }),
];

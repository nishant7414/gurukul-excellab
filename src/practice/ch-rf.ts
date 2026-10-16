import { defineChallenge } from "./build";
import { countWhere, n } from "./h";

export const RF = [
  defineChallenge({
    id: "PC-RF-01", concept: "RF", tier: "Easy", ds: ["DS-SAL-PRODUCTS"], title: "Add GST from one rate cell", minutes: 8, skill: "Absolute reference to an assumption cell",
    context: "The GST rate sits in one cell. Every price in the catalogue must use it, so changing the rate updates every price.",
    output: "GST amount and Price including GST for 25 products, driven by the rate cell.",
    hints: ["The rate cell must not move when the formula is filled down: lock it with $ (or press F4).", "GST amount = price x rate. Price including GST = price + GST amount."],
    explanation: "An absolute reference such as $G$2 always points at the same cell, however the formula is copied.",
    mistakes: ["Relative reference to the rate (it slides down to empty cells)", "Typing 0.18 inside every formula", "Adding the rate instead of multiplying"],
    tasks: () => [
      { kind: "input", name: "gst", label: "GST rate", value: 0.18, nf: "percent" },
      { kind: "col", header: "GST", label: "GST amount", text: "In {range} calculate price x GST rate using the rate cell.", deps: ["price", "@gst"], nf: "currency", tolerance: 1e-9, expect: (x) => n(x.row.price ?? null) * n(x.get("gst")), formula: "=@price*@@gst" },
      { kind: "col", header: "Price incl. GST", label: "Price including GST", text: "In {range} add the GST amount to the price.", deps: ["price", "@gst"], nf: "currency", tolerance: 1e-9, expect: (x) => n(x.row.price ?? null) + n(x.row.price ?? null) * n(x.get("gst")), formula: "=@price+@ans0" },
    ],
  }),
  defineChallenge({
    id: "PC-RF-02", concept: "RF", tier: "Easy", ds: ["DS-SAL-PROMO"], title: "Discount matrix with mixed references", minutes: 10, skill: "Mixed references ($A2 and B$1)",
    context: "Marketing wants to see the order value after each discount level for four different minimum-spend amounts.",
    output: "A grid where each cell is the order value (row label) reduced by the discount (column label).",
    hints: ["The row label is always in column A: lock the column ($A2). The discount is always in row 1: lock the row (B$1).", "Value after discount = order value x (1 - discount)."],
    explanation: "A mixed reference locks only the row or only the column. One formula can then be filled across and down the whole grid.",
    mistakes: ["Locking both row and column", "Locking neither", "Using the discount as a whole number"],
    tasks: (c) => [{ kind: "grid", title: "Discount matrix", label: "Order value after discount", corner: "Order value", rowLabels: c.pick("promo", 4).map((i) => c.v("promo", "min", i)), colLabels: [0.05, 0.1, 0.15, 0.2], nf: "currency", deps: [], tolerance: 1e-9,
      text: "Fill {range}: each cell is the order value of its row after the discount of its column (row labels are order values, column labels are discount rates).",
      expect: (_x, rl, cl) => n(rl) * (1 - n(cl)), formula: "={rl}*(1-{cl})", required: [] }],
  }),
  defineChallenge({
    id: "PC-RF-03", concept: "RF", tier: "Easy", ds: ["DS-FIN-BUDGET"], title: "Spread annual budgets over four quarters", minutes: 10, skill: "Absolute references to four assumption cells",
    context: "Each department's annual budget is released over four quarters in agreed shares kept in assumption cells.",
    output: "Q1 to Q4 budgets for 7 departments, each using its own share cell.",
    hints: ["Each quarter has its own share cell; refer to it with an absolute reference.", "Quarter budget = annual budget x that quarter's share."],
    explanation: "Because each formula is filled down, the share cells must be absolute; the annual budget must stay relative.",
    mistakes: ["Using the Q1 share for every quarter", "Relative references to the shares", "Dividing instead of multiplying"],
    tasks: () => [
      { kind: "input", name: "sh1", label: "Q1 share", value: 0.2, nf: "percent" },
      { kind: "input", name: "sh2", label: "Q2 share", value: 0.25, nf: "percent" },
      { kind: "input", name: "sh3", label: "Q3 share", value: 0.25, nf: "percent" },
      { kind: "input", name: "sh4", label: "Q4 share", value: 0.3, nf: "percent" },
      ...(["sh1", "sh2", "sh3", "sh4"] as const).map((sh, i) => ({ kind: "col" as const, header: `Q${i + 1} budget`, label: `Q${i + 1} budget`, text: `In {range} calculate the Q${i + 1} budget: annual budget x the Q${i + 1} share.`, deps: ["annual", `@${sh}`], nf: "currency" as const, tolerance: 1e-6, expect: (x: { row: Record<string, import("../engine/types").Scalar>; get: (k: string) => import("../engine/types").Scalar }) => n(x.row.annual ?? null) * n(x.get(sh)), formula: `=@annual*@@${sh}` })),
    ],
  }),
  defineChallenge({
    id: "PC-RF-04", concept: "RF", tier: "Medium", ds: ["DS-FIN-ACTUAL"], title: "Budget variance with a review threshold", minutes: 15, skill: "Relative references to neighbouring columns plus an absolute threshold",
    context: "Finance compares the actual spend of each department-month to budget and flags those beyond a tolerance kept in one cell.",
    output: "Variance, Variance % and a Review/OK flag for 84 department-months, and the number to review.",
    hints: ["Variance = Actual - Budget; Variance % = Variance / Budget.", "The flag compares ABS(variance %) with the tolerance cell, which must be absolute.", "Use your Variance % column in the flag instead of repeating the arithmetic."],
    explanation: "Row formulas use relative references to their own row; the tolerance uses an absolute reference so it stays fixed while filling down.",
    mistakes: ["Relative tolerance reference", "Dividing by Actual instead of Budget", "Testing the signed value instead of ABS"],
    tasks: () => [
      { kind: "input", name: "tol", label: "Tolerance", value: 0.1, nf: "percent" },
      { kind: "col", header: "Variance", label: "Variance", text: "In {range} calculate Actual - Budget.", deps: ["actual", "budget"], nf: "currency", expect: (x) => n(x.row.actual ?? null) - n(x.row.budget ?? null), formula: "=@actual-@budget" },
      { kind: "col", header: "Variance %", label: "Variance %", text: "In {range} calculate Variance / Budget.", deps: ["actual", "budget"], nf: "percent", tolerance: 1e-9, expect: (x) => (n(x.row.actual ?? null) - n(x.row.budget ?? null)) / n(x.row.budget ?? null), formula: "=@ans0/@budget" },
      { kind: "col", header: "Flag", label: "Review flag", text: "In {range} return Review when the absolute Variance % is above the tolerance, otherwise OK.", deps: ["actual", "budget", "@tol"], required: [["IF"], ["ABS"]], expect: (x) => (Math.abs((n(x.row.actual ?? null) - n(x.row.budget ?? null)) / n(x.row.budget ?? null)) > n(x.get("tol")) ? "Review" : "OK"), formula: '=IF(ABS(@ans1)>@@tol,"Review","OK")' },
      { kind: "cells", title: "Review count", text: "In {range} count the rows flagged for review.", deps: ["actual", "budget", "@tol"], cells: [{ label: "Rows to review", required: [["COUNTIF", "COUNTIFS", "SUMPRODUCT"]], expect: (x) => countWhere(x.T.actual, (r) => Math.abs((n(r.actual ?? null) - n(r.budget ?? null)) / n(r.budget ?? null)) > n(x.get("tol"))), formula: '=COUNTIF(@@ans2,"Review")' }] },
    ],
  }),
  defineChallenge({
    id: "PC-RF-05", concept: "RF", tier: "Easy", ds: ["DS-FIN-LOANSCHED"], title: "Build a loan repayment schedule", minutes: 18, skill: "Relative reference to the previous row; absolute references to inputs",
    context: "A 12-month loan is repaid in equal monthly instalments (EMI). Each month's interest is charged on the opening balance, the rest of the EMI repays principal and the closing balance carries over to the next month.",
    output: "Opening balance, interest, principal repaid and closing balance for all 12 months, driven by the three input cells.",
    hints: ["Opening balance of month 1 is the loan amount; later months start from the previous row's closing balance.", "Interest = opening balance x annual rate / 12.", "Principal repaid = EMI - interest. Closing = opening - principal repaid.", "Refer to the input cells with absolute references."],
    explanation: "The first row reads the loan amount; every later row points to the cell above (a relative reference). The inputs are absolute so they never move.",
    mistakes: ["Opening balance that always uses the loan amount", "Interest on the closing balance", "Relative references to the inputs"],
    simulationNote: "The engine has no PMT/IPMT functions, so the schedule is built from arithmetic and the EMI is supplied as an input.",
    tasks: () => {
      const sched = (x: { get: (k: string) => import("../engine/types").Scalar; T: Record<string, import("./types").Row[]> }) => {
        const r = n(x.get("rate")) / 12, emi = n(x.get("emi"));
        let open = n(x.get("loan"));
        return x.T.sched.map(() => { const interest = open * n(x.get("rate")) / 12; const prin = emi - interest; const close = open - prin; const row = { open, interest, prin, close }; open = close; return row; }).map((v) => ({ ...v, r }));
      };
      return [
        { kind: "input", name: "loan", label: "Loan amount", value: 600000, nf: "currency" },
        { kind: "input", name: "rate", label: "Annual rate", value: 0.12, nf: "percent" },
        { kind: "input", name: "emi", label: "Monthly EMI", value: 53310, nf: "currency" },
        { kind: "col", into: "open", header: "Opening", label: "Opening balance", text: "In {range} enter the opening balance: the loan amount in month 1, otherwise the previous month's closing balance.", deps: ["@loan", "@rate", "@emi"], nf: "currency", tolerance: 1e-6, expect: (x) => sched(x)[x.i].open, formula: "=IF(@no=1,@@loan,F{p})" },
        { kind: "col", into: "interest", header: "Interest", label: "Interest", text: "In {range} calculate the month's interest: opening balance x annual rate / 12.", deps: ["@loan", "@rate", "@emi"], nf: "currency", tolerance: 1e-6, expect: (x) => sched(x)[x.i].interest, formula: "=@open*@@rate/12" },
        { kind: "col", into: "principal", header: "Principal", label: "Principal repaid", text: "In {range} calculate the principal repaid: EMI - interest.", deps: ["@loan", "@rate", "@emi"], nf: "currency", tolerance: 1e-6, expect: (x) => sched(x)[x.i].prin, formula: "=@@emi-@interest" },
        { kind: "col", into: "close", header: "Closing", label: "Closing balance", text: "In {range} calculate the closing balance: opening balance - principal repaid.", deps: ["@loan", "@rate", "@emi"], nf: "currency", tolerance: 1e-6, expect: (x) => sched(x)[x.i].close, formula: "=@open-@principal" },
      ];
    },
  }),
];

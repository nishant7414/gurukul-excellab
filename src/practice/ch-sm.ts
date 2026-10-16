import { defineChallenge } from "./build";
import { n, round } from "./h";
import type { Scalar } from "../engine/types";

const nums = (xs: Scalar[]) => xs.filter((v): v is number => typeof v === "number");
const med = (xs: number[]) => { const a = [...xs].sort((p, q) => p - q); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

export const SM = [
  defineChallenge({
    id: "PC-SM-01", concept: "SM", tier: "Easy", ds: ["DS-FIN-LEDGER"], title: "Monthly net result and yearly totals", minutes: 10, skill: "SUM, AVERAGE, MAX, MIN",
    context: "A small business keeps a month-by-month ledger of income and costs.",
    output: "Total costs and net result for each month, then the year's total income, average net, best and worst month.",
    hints: ["Total costs = SUM of rent, utilities, salaries and other (one row).", "Net = income - total costs.", "MAX and MIN find the best and worst months."],
    explanation: "SUM adds a row of cells; AVERAGE, MAX and MIN summarise a column.",
    mistakes: ["Including the income in the total costs", "Summing a column that includes text", "Typing totals"],
    tasks: () => [
      { kind: "col", header: "Total costs", label: "Total costs", text: "In {range} add rent, utilities, salaries and other for each month.", deps: ["rent", "utilities", "salaries", "other"], nf: "currency", required: [["SUM"]], expect: (x) => n(x.row.rent ?? null) + n(x.row.utilities ?? null) + n(x.row.salaries ?? null) + n(x.row.other ?? null), formula: "=SUM(@rent:@other)" },
      { kind: "col", header: "Net", label: "Net result", text: "In {range} calculate income minus total costs.", deps: ["income", "rent", "utilities", "salaries", "other"], nf: "currency", expect: (x) => n(x.row.income ?? null) - (n(x.row.rent ?? null) + n(x.row.utilities ?? null) + n(x.row.salaries ?? null) + n(x.row.other ?? null)), formula: "=@income-@ans0" },
      { kind: "cells", title: "Year summary", text: "In {range} give the total income, average net, best month and worst month.", deps: ["income", "rent", "utilities", "salaries", "other"], cells: [
        { label: "Total income", nf: "currency", required: [["SUM"]], expect: (x) => nums(x.T.ledger.map((r) => r.income ?? null)).reduce((a, b) => a + b, 0), formula: "=SUM(@@income)" },
        { label: "Average net", nf: "currency", tolerance: 1e-6, required: [["AVERAGE"]], expect: (x) => { const v = x.T.ledger.map((r) => n(r.income ?? null) - (n(r.rent ?? null) + n(r.utilities ?? null) + n(r.salaries ?? null) + n(r.other ?? null))); return v.reduce((a, b) => a + b, 0) / v.length; }, formula: "=AVERAGE(@@ans1)" },
        { label: "Best month net", nf: "currency", required: [["MAX"]], expect: (x) => Math.max(...x.T.ledger.map((r) => n(r.income ?? null) - (n(r.rent ?? null) + n(r.utilities ?? null) + n(r.salaries ?? null) + n(r.other ?? null)))), formula: "=MAX(@@ans1)" },
        { label: "Worst month net", nf: "currency", required: [["MIN"]], expect: (x) => Math.min(...x.T.ledger.map((r) => n(r.income ?? null) - (n(r.rent ?? null) + n(r.utilities ?? null) + n(r.salaries ?? null) + n(r.other ?? null)))), formula: "=MIN(@@ans1)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-SM-02", concept: "SM", tier: "Easy", ds: ["DS-OPS-ENERGY"], title: "Electricity bill analysis", minutes: 10, skill: "SUM, AVERAGE, MEDIAN, MAX, ROUND",
    context: "A facilities manager reviews twelve months of electricity use.",
    output: "Each month's bill (kWh x rate, rounded to 2 decimals), then total bill, average and median kWh and the peak-demand maximum.",
    hints: ["Bill = kWh x Rate; ROUND(value, 2).", "MEDIAN is the middle value; AVERAGE is the mean."],
    explanation: "ROUND controls decimals; AVERAGE and MEDIAN describe the typical month in different ways.",
    mistakes: ["Rounding after summing instead of per month", "Using AVERAGE when MEDIAN is asked", "Summing the rate column"],
    tasks: () => [
      { kind: "col", header: "Bill", label: "Monthly bill", text: "In {range} calculate kWh x rate rounded to 2 decimals.", deps: ["kwh", "rate"], nf: "currency", required: [["ROUND"]], tolerance: 1e-9, expect: (x) => round(n(x.row.kwh ?? null) * n(x.row.rate ?? null), 2), formula: "=ROUND(@kwh*@rate,2)" },
      { kind: "cells", title: "Usage summary", text: "In {range} give the total bill, average kWh, median kWh and maximum peak demand.", deps: ["kwh", "rate", "peak"], cells: [
        { label: "Total bill", nf: "currency", tolerance: 1e-6, required: [["SUM"]], expect: (x) => x.T.energy.reduce((t, r) => t + round(n(r.kwh ?? null) * n(r.rate ?? null), 2), 0), formula: "=SUM(@@ans0)" },
        { label: "Average kWh", tolerance: 1e-9, required: [["AVERAGE"]], expect: (x) => x.T.energy.reduce((t, r) => t + n(r.kwh ?? null), 0) / x.T.energy.length, formula: "=AVERAGE(@@kwh)" },
        { label: "Median kWh", tolerance: 1e-9, required: [["MEDIAN"]], expect: (x) => med(x.T.energy.map((r) => n(r.kwh ?? null))), formula: "=MEDIAN(@@kwh)" },
        { label: "Maximum peak demand", required: [["MAX"]], expect: (x) => Math.max(...x.T.energy.map((r) => n(r.peak ?? null))), formula: "=MAX(@@peak)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-SM-03", concept: "SM", tier: "Easy", ds: ["DS-HR-HEADCOUNT"], title: "Quarterly headcount summary", minutes: 10, skill: "AVERAGE, SUM, COUNT, MAX, MIN",
    context: "HR tracks the headcount of seven departments over four quarters.",
    output: "Average headcount and Q1-to-Q4 change per department; the company's Q4 total, largest and smallest department and number of departments.",
    hints: ["AVERAGE(q1:q4) per row, ROUND to 1 decimal.", "Change = Q4 - Q1.", "COUNT counts the numeric cells."],
    explanation: "Row-wise functions summarise across columns; column-wise functions summarise across departments.",
    mistakes: ["Averaging the budget column too", "Subtracting in the wrong order", "COUNTA vs COUNT confusion on a numeric column"],
    tasks: () => [
      { kind: "col", header: "Average", label: "Average headcount", text: "In {range} return the average of Q1 to Q4, rounded to 1 decimal.", deps: ["q1", "q2", "q3", "q4"], required: [["AVERAGE", "ROUND"]], tolerance: 1e-9, expect: (x) => round((n(x.row.q1 ?? null) + n(x.row.q2 ?? null) + n(x.row.q3 ?? null) + n(x.row.q4 ?? null)) / 4, 1), formula: "=ROUND(AVERAGE(@q1:@q4),1)" },
      { kind: "col", header: "Change", label: "Change Q1 to Q4", text: "In {range} return Q4 minus Q1.", deps: ["q1", "q4"], expect: (x) => n(x.row.q4 ?? null) - n(x.row.q1 ?? null), formula: "=@q4-@q1" },
      { kind: "cells", title: "Company summary", text: "In {range} give the Q4 total, the largest and smallest Q4 headcount and the number of departments.", deps: ["q4", "dept"], cells: [
        { label: "Q4 total", required: [["SUM"]], expect: (x) => x.T.headcount.reduce((t, r) => t + n(r.q4 ?? null), 0), formula: "=SUM(@@q4)" },
        { label: "Largest Q4 department", required: [["MAX"]], expect: (x) => Math.max(...x.T.headcount.map((r) => n(r.q4 ?? null))), formula: "=MAX(@@q4)" },
        { label: "Smallest Q4 department", required: [["MIN"]], expect: (x) => Math.min(...x.T.headcount.map((r) => n(r.q4 ?? null))), formula: "=MIN(@@q4)" },
        { label: "Number of departments", required: [["COUNTA", "COUNT", "ROWS"]], expect: (x) => x.T.headcount.length, formula: "=COUNTA(@@dept)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-SM-04", concept: "SM", tier: "Easy", ds: ["DS-FIN-CASHFLOW"], title: "Free cash flow for the year ahead", minutes: 12, skill: "Arithmetic with SUM, running total, MAX, MIN",
    context: "A treasurer plans cash for the next twelve months: receipts, payments and capital spending.",
    output: "Net cash and running cash balance per month, and the best month, worst month, total and average net cash.",
    hints: ["Net cash = receipts - payments - capex.", "The running balance adds this month's net cash to last month's balance (first month = its own net cash).", "SUM, MAX, MIN and AVERAGE summarise the Net column."],
    explanation: "Each month's net is simple arithmetic; a running total uses SUM from the first row to the current row with a mixed reference.",
    mistakes: ["Forgetting capex", "A running total with a fully relative range", "Summing the balance column instead of net"],
    tasks: () => [
      { kind: "col", header: "Net cash", label: "Net cash", text: "In {range} calculate receipts - payments - capex.", deps: ["receipts", "payments", "capex"], nf: "currency", expect: (x) => n(x.row.receipts ?? null) - n(x.row.payments ?? null) - n(x.row.capex ?? null), formula: "=@receipts-@payments-@capex" },
      { kind: "col", header: "Balance", label: "Running balance", text: "In {range} return the cumulative net cash up to and including each month.", deps: ["receipts", "payments", "capex"], nf: "currency", required: [["SUM"]], expect: (x) => x.T.cashflow.slice(0, x.i + 1).reduce((t, r) => t + n(r.receipts ?? null) - n(r.payments ?? null) - n(r.capex ?? null), 0), formula: "=SUM($E$2:E{r})" },
      { kind: "cells", title: "Cash summary", text: "In {range} give the total, average, best and worst monthly net cash.", deps: ["receipts", "payments", "capex"], cells: [
        { label: "Total net cash", nf: "currency", required: [["SUM"]], expect: (x) => x.T.cashflow.reduce((t, r) => t + n(r.receipts ?? null) - n(r.payments ?? null) - n(r.capex ?? null), 0), formula: "=SUM(@@ans0)" },
        { label: "Average net cash", nf: "currency", tolerance: 1e-6, required: [["AVERAGE"]], expect: (x) => x.T.cashflow.reduce((t, r) => t + n(r.receipts ?? null) - n(r.payments ?? null) - n(r.capex ?? null), 0) / x.T.cashflow.length, formula: "=AVERAGE(@@ans0)" },
        { label: "Best month", nf: "currency", required: [["MAX"]], expect: (x) => Math.max(...x.T.cashflow.map((r) => n(r.receipts ?? null) - n(r.payments ?? null) - n(r.capex ?? null))), formula: "=MAX(@@ans0)" },
        { label: "Worst month", nf: "currency", required: [["MIN"]], expect: (x) => Math.min(...x.T.cashflow.map((r) => n(r.receipts ?? null) - n(r.payments ?? null) - n(r.capex ?? null))), formula: "=MIN(@@ans0)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-SM-05", concept: "SM", tier: "Medium", ds: ["DS-OPS-SURVEY"], title: "Survey scorecard", minutes: 15, skill: "AVERAGE, MEDIAN, COUNT, ROUND over 150 responses",
    context: "A satisfaction survey has four 1-5 questions answered by 150 people.",
    output: "Each respondent's average score (2 decimals), then the response count, the average score per question (2 decimals), the median of question 1 and the highest overall average.",
    hints: ["AVERAGE(q1:q4) per row, rounded to 2 decimals.", "ROUND(AVERAGE(column), 2) for each question.", "MAX of the per-respondent averages gives the best respondent."],
    explanation: "Summary functions work on rows and columns alike; ROUND keeps the report tidy.",
    mistakes: ["Averaging the averages instead of the raw scores", "Counting rows with COUNTA on a text column but including the header", "Not rounding"],
    tasks: () => [
      { kind: "col", header: "Respondent average", label: "Respondent average", text: "In {range} return the average of the four answers rounded to 2 decimals.", deps: ["q1", "q2", "q3", "q4"], required: [["AVERAGE"], ["ROUND"]], tolerance: 1e-9, expect: (x) => round((n(x.row.q1 ?? null) + n(x.row.q2 ?? null) + n(x.row.q3 ?? null) + n(x.row.q4 ?? null)) / 4, 2), formula: "=ROUND(AVERAGE(@q1:@q4),2)" },
      { kind: "cells", title: "Question summary", text: "In {range} give the response count, the average of each question (2 decimals), the median of question 1 and the highest respondent average.", deps: ["q1", "q2", "q3", "q4", "id"], cells: [
        { label: "Responses", required: [["COUNTA", "COUNT", "ROWS"]], expect: (x) => x.T.survey.length, formula: "=COUNTA(@@id)" },
        ...(["q1", "q2", "q3", "q4"] as const).map((k, i) => ({ label: `Average Q${i + 1}`, tolerance: 1e-9, required: [["AVERAGE"], ["ROUND"]], expect: (x: { T: Record<string, import("./types").Row[]> }) => round(x.T.survey.reduce((t, r) => t + n(r[k] ?? null), 0) / x.T.survey.length, 2), formula: `=ROUND(AVERAGE(@@${k}),2)` })),
        { label: "Median Q1", required: [["MEDIAN"]], expect: (x) => med(x.T.survey.map((r) => n(r.q1 ?? null))), formula: "=MEDIAN(@@q1)" },
        { label: "Highest respondent average", tolerance: 1e-9, required: [["MAX"]], expect: (x) => Math.max(...x.T.survey.map((r) => round((n(r.q1 ?? null) + n(r.q2 ?? null) + n(r.q3 ?? null) + n(r.q4 ?? null)) / 4, 2))), formula: "=MAX(@@ans0)" },
      ] },
    ],
  }),
];

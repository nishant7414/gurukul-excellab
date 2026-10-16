import { defineChallenge } from "./build";
import { countWhere, eq, find, n, round, sumWhere } from "./h";
import type { Row } from "./types";

const SUMIF_ = [["SUMIF", "SUMIFS", "SUMPRODUCT"]];
const CNT = [["COUNTIF", "COUNTIFS", "SUMPRODUCT"]];
const byType = (rows: Row[], t: string) => sumWhere(rows, (r) => eq(r.type ?? null, t), "amount");

export const FIN = [
  defineChallenge({
    id: "PC-FIN-01", concept: "FIN", tier: "Medium", ds: ["DS-FIN-PNL"], title: "Build an income statement from account lines", minutes: 20, skill: "SUMIF by account type, subtotals, margins",
    context: "The trial balance lists revenue, cost of goods sold, operating expenses and tax lines. The owner wants a short income statement with margins.",
    output: "Revenue, COGS, gross profit, operating expenses, operating profit, tax, net profit and the gross and net margins.",
    hints: ["Total each type with SUMIF(type column, \"Revenue\", amount column), and the same for COGS, Operating expense and Tax.", "Gross profit = revenue - COGS; operating profit = gross profit - operating expenses; net profit = operating profit - tax.", "Margins divide profit by revenue; refer to the cells above instead of retyping numbers."],
    explanation: "SUMIF collects each category; the subtotals are chained from the cells above, so a change in any account line flows through to the net profit.",
    mistakes: ["Typing subtotals", "Subtracting tax before operating expenses", "Dividing margin by cost instead of revenue"],
    simulationNote: "The engine has no financial functions; the statement is built from SUMIF and arithmetic.",
    tasks: () => {
      const rev = (x: { T: Record<string, Row[]> }) => byType(x.T.pnl, "Revenue"), cogs = (x: { T: Record<string, Row[]> }) => byType(x.T.pnl, "COGS"), opx = (x: { T: Record<string, Row[]> }) => byType(x.T.pnl, "Operating expense"), tax = (x: { T: Record<string, Row[]> }) => byType(x.T.pnl, "Tax");
      return [{ kind: "cells", title: "Income statement", text: "In {range} fill the income statement from top to bottom.", deps: ["type", "amount"], cells: [
        { label: "Revenue", nf: "currency", required: SUMIF_, expect: (x) => rev(x), formula: '=SUMIF(@@type,"Revenue",@@amount)' },
        { label: "Cost of goods sold", nf: "currency", required: SUMIF_, expect: (x) => cogs(x), formula: '=SUMIF(@@type,"COGS",@@amount)' },
        { label: "Gross profit", nf: "currency", expect: (x) => rev(x) - cogs(x), formula: "={c0}-{c1}" },
        { label: "Operating expenses", nf: "currency", required: SUMIF_, expect: (x) => opx(x), formula: '=SUMIF(@@type,"Operating expense",@@amount)' },
        { label: "Operating profit", nf: "currency", expect: (x) => rev(x) - cogs(x) - opx(x), formula: "={c2}-{c3}" },
        { label: "Tax", nf: "currency", required: SUMIF_, expect: (x) => tax(x), formula: '=SUMIF(@@type,"Tax",@@amount)' },
        { label: "Net profit", nf: "currency", expect: (x) => rev(x) - cogs(x) - opx(x) - tax(x), formula: "={c4}-{c5}" },
        { label: "Gross margin %", nf: "percent", tolerance: 1e-9, expect: (x) => (rev(x) - cogs(x)) / rev(x), formula: "={c2}/{c0}" },
        { label: "Net margin %", nf: "percent", tolerance: 1e-9, expect: (x) => (rev(x) - cogs(x) - opx(x) - tax(x)) / rev(x), formula: "={c6}/{c0}" },
      ] }];
    },
  }),
  defineChallenge({
    id: "PC-FIN-02", concept: "FIN", tier: "Medium", ds: ["DS-FIN-ACTUAL"], title: "Department budget versus actual", minutes: 18, skill: "SUMIF, variance, variance %",
    context: "Seven departments report monthly budget and actual spend for a year. The CFO wants one line per department.",
    output: "For each department: annual budget, annual actual, variance, variance % and an Over/Within budget status.",
    hints: ["SUMIF by department for both budget and actual.", "Variance = actual - budget (positive means overspent).", "Variance % = variance / budget."],
    explanation: "SUMIF totals the 12 monthly lines per department; the variance columns then compare the two totals.",
    mistakes: ["Subtracting budget from actual in the wrong order", "Dividing the variance by actual", "Treating a zero variance as over budget"],
    tasks: () => [{ kind: "panel", title: "Department view", text: "In {ranges} fill the totals and variances for each department in {in}.", deps: ["dept", "budget", "actual"],
      inputs: [{ header: "Department", values: ["Sales", "Finance", "HR", "IT", "Operations", "Marketing", "Support"] }],
      answers: [
        { header: "Budget", label: "Annual budget", nf: "currency", required: SUMIF_, expect: (x) => sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "budget"), formula: "=SUMIF(@@dept,@in0,@@budget)" },
        { header: "Actual", label: "Annual actual", nf: "currency", required: SUMIF_, expect: (x) => sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "actual"), formula: "=SUMIF(@@dept,@in0,@@actual)" },
        { header: "Variance", label: "Variance", nf: "currency", expect: (x) => sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "actual") - sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "budget"), formula: "=@ans1-@ans0" },
        { header: "Variance %", label: "Variance %", nf: "percent", tolerance: 1e-9, expect: (x) => (sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "actual") - sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "budget")) / sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "budget"), formula: "=@ans2/@ans0" },
        { header: "Status", label: "Budget status", required: [["IF", "IFS"]], expect: (x) => (sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "actual") > sumWhere(x.T.actual, (r) => eq(r.dept ?? null, x.in[0]), "budget") ? "Over budget" : "Within budget"), formula: '=IF(@ans2>0,"Over budget","Within budget")' },
      ] }],
  }),
  defineChallenge({
    id: "PC-FIN-03", concept: "FIN", tier: "Medium", ds: ["DS-FIN-LOANS"], title: "EMI, total payable and interest for 30 loans", minutes: 20, skill: "The EMI formula with POWER, ROUND",
    context: "Without PMT, the EMI of a reducing-balance loan is P x r / (1 - (1 + r)^-n), where r is the monthly rate and n the number of months.",
    output: "Monthly rate, EMI (2 decimals), total payable and total interest for each loan.",
    hints: ["Monthly rate = annual rate / 12.", "POWER(1 + r, -n) raises (1+r) to the power minus n.", "Total payable = EMI x term; interest = total payable - principal."],
    explanation: "The EMI formula makes the present value of the instalments equal to the principal. Rounding to 2 decimals matches how a lender quotes it.",
    mistakes: ["Dividing the annual rate by 100 again", "Using the term in years", "Forgetting the minus in the exponent"],
    simulationNote: "The engine has no PMT function; the EMI is built from its algebraic formula.",
    tasks: () => [
      { kind: "col", header: "Monthly rate", label: "Monthly rate", text: "In {range} divide the annual rate by 12.", deps: ["rate"], nf: "percent", tolerance: 1e-12, expect: (x) => n(x.row.rate ?? null) / 12, formula: "=@rate/12" },
      { kind: "col", header: "EMI", label: "EMI", text: "In {range} calculate the EMI rounded to 2 decimals.", deps: ["principal", "rate", "term"], nf: "currency", required: [["POWER"], ["ROUND"]], tolerance: 0.0051, expect: (x) => { const r = n(x.row.rate ?? null) / 12; return round((n(x.row.principal ?? null) * r) / (1 - Math.pow(1 + r, -n(x.row.term ?? null))), 2); }, formula: "=ROUND(@principal*@ans0/(1-POWER(1+@ans0,-@term)),2)" },
      { kind: "col", header: "Total payable", label: "Total payable", text: "In {range} multiply the EMI by the term in months.", deps: ["principal", "rate", "term"], nf: "currency", tolerance: 0.0051 * 60, expect: (x) => { const r = n(x.row.rate ?? null) / 12; return round((n(x.row.principal ?? null) * r) / (1 - Math.pow(1 + r, -n(x.row.term ?? null))), 2) * n(x.row.term ?? null); }, formula: "=@ans1*@term" },
      { kind: "col", header: "Interest", label: "Total interest", text: "In {range} subtract the principal from the total payable.", deps: ["principal", "rate", "term"], nf: "currency", tolerance: 0.0051 * 60, expect: (x) => { const r = n(x.row.rate ?? null) / 12; return round((n(x.row.principal ?? null) * r) / (1 - Math.pow(1 + r, -n(x.row.term ?? null))), 2) * n(x.row.term ?? null) - n(x.row.principal ?? null); }, formula: "=@ans2-@principal" },
      { kind: "cells", title: "Portfolio", text: "In {range} give the total interest of the portfolio and the highest EMI.", deps: ["principal", "rate", "term"], cells: [
        { label: "Total interest (portfolio)", nf: "currency", tolerance: 0.0051 * 60 * 30, required: [["SUM"]], expect: (x) => x.T.loans.reduce((t, l) => { const r = n(l.rate ?? null) / 12; return t + round((n(l.principal ?? null) * r) / (1 - Math.pow(1 + r, -n(l.term ?? null))), 2) * n(l.term ?? null) - n(l.principal ?? null); }, 0), formula: "=SUM(@@ans3)" },
        { label: "Highest EMI", nf: "currency", tolerance: 0.0051, required: [["MAX"]], expect: (x) => Math.max(...x.T.loans.map((l) => { const r = n(l.rate ?? null) / 12; return round((n(l.principal ?? null) * r) / (1 - Math.pow(1 + r, -n(l.term ?? null))), 2); })), formula: "=MAX(@@ans1)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-FIN-04", concept: "FIN", tier: "Medium", ds: ["DS-HR-PAYROLL"], title: "Monthly payroll with proration and provident fund", minutes: 20, skill: "Proration, allowances, deductions, totals",
    context: "Pay is prorated for paid days out of 30. Allowances are a percentage of the prorated basic, the provident fund (PF) rate is an assumption, and other deductions are a fixed amount.",
    output: "Prorated basic, gross pay, PF and net pay for 40 employees, then total and average net pay.",
    hints: ["Prorated basic = basic x paid days / 30.", "Gross = prorated basic x (1 + allowance %).", "PF = prorated basic x PF rate (absolute reference).", "Net = gross - PF - other deductions."],
    explanation: "Each step builds on the previous column. The PF rate is one assumption cell, so changing it recalculates the whole payroll.",
    mistakes: ["Applying PF to gross instead of basic", "Not prorating the allowance", "Using 100 instead of 30 days"],
    tasks: () => [
      { kind: "input", name: "pf", label: "PF rate", value: 0.12, nf: "percent" },
      { kind: "col", header: "Prorated basic", label: "Prorated basic", text: "In {range} calculate basic x paid days / 30.", deps: ["basic", "days"], nf: "currency", tolerance: 1e-6, expect: (x) => (n(x.row.basic ?? null) * n(x.row.days ?? null)) / 30, formula: "=@basic*@days/30" },
      { kind: "col", header: "Gross", label: "Gross pay", text: "In {range} add the allowance (percentage of the prorated basic).", deps: ["basic", "days", "allow"], nf: "currency", tolerance: 1e-6, expect: (x) => ((n(x.row.basic ?? null) * n(x.row.days ?? null)) / 30) * (1 + n(x.row.allow ?? null)), formula: "=@ans0*(1+@allow)" },
      { kind: "col", header: "PF", label: "Provident fund", text: "In {range} calculate the PF on the prorated basic using the PF rate cell.", deps: ["basic", "days", "@pf"], nf: "currency", tolerance: 1e-6, expect: (x) => ((n(x.row.basic ?? null) * n(x.row.days ?? null)) / 30) * n(x.get("pf")), formula: "=@ans0*@@pf" },
      { kind: "col", header: "Net pay", label: "Net pay", text: "In {range} calculate gross pay - PF - other deductions.", deps: ["basic", "days", "allow", "deduct", "@pf"], nf: "currency", tolerance: 1e-6, expect: (x) => ((n(x.row.basic ?? null) * n(x.row.days ?? null)) / 30) * (1 + n(x.row.allow ?? null)) - ((n(x.row.basic ?? null) * n(x.row.days ?? null)) / 30) * n(x.get("pf")) - n(x.row.deduct ?? null), formula: "=@ans1-@ans2-@deduct" },
      { kind: "cells", title: "Payroll totals", text: "In {range} give the total and the average net pay.", deps: ["basic", "days", "allow", "deduct", "@pf"], cells: [
        { label: "Total net pay", nf: "currency", tolerance: 1e-4, required: [["SUM"]], expect: (x) => x.T.payroll.reduce((t, r) => { const b = (n(r.basic ?? null) * n(r.days ?? null)) / 30; return t + b * (1 + n(r.allow ?? null)) - b * n(x.get("pf")) - n(r.deduct ?? null); }, 0), formula: "=SUM(@@ans3)" },
        { label: "Average net pay", nf: "currency", tolerance: 1e-4, required: [["AVERAGE"]], expect: (x) => x.T.payroll.reduce((t, r) => { const b = (n(r.basic ?? null) * n(r.days ?? null)) / 30; return t + b * (1 + n(r.allow ?? null)) - b * n(x.get("pf")) - n(r.deduct ?? null); }, 0) / x.T.payroll.length, formula: "=AVERAGE(@@ans3)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-FIN-05", concept: "FIN", tier: "Medium", ds: ["DS-FIN-INVOICES"], title: "Late fees and the amount still due", minutes: 20, skill: "Date arithmetic with assumptions, ROUND, MAX",
    context: "Unpaid invoices past their due date attract a late fee of 1.5% of the invoice per month overdue (pro-rated by days / 30) as at the chosen date.",
    output: "Days overdue, late fee and total still due for 150 invoices, then total outstanding, total late fees and the number overdue.",
    hints: ["Days overdue = MAX(0, as-of date - due date) for unpaid invoices, 0 for paid ones.", "Late fee = ROUND(amount x monthly rate x days / 30, 2).", "Total due = amount + late fee for unpaid invoices, 0 for paid ones."],
    explanation: "MAX(0, ...) stops negative days for invoices that are not yet due. The fee uses the monthly rate pro-rated by days.",
    mistakes: ["Charging fees on paid invoices", "Negative days for not-yet-due invoices", "Applying the monthly rate as a daily rate"],
    tasks: () => [
      { kind: "input", name: "asof", label: "As-of date", value: 45930, nf: "date" },
      { kind: "input", name: "feerate", label: "Late fee per month", value: 0.015, nf: "percent" },
      { kind: "col", header: "Days overdue", label: "Days overdue", text: "In {range} return the days overdue (0 for paid or not-yet-due invoices).", deps: ["status", "due", "@asof"], required: [["MAX", "IF"]], expect: (x) => (eq(x.row.status ?? null, "Paid") ? 0 : Math.max(0, n(x.get("asof")) - n(x.row.due ?? null))), formula: '=IF(@status="Paid",0,MAX(0,@@asof-@due))' },
      { kind: "col", header: "Late fee", label: "Late fee", text: "In {range} calculate the late fee: amount x monthly fee rate x days overdue / 30, rounded to 2 decimals.", deps: ["status", "due", "amount", "@asof", "@feerate"], nf: "currency", required: [["ROUND"]], tolerance: 1e-9, expect: (x) => round((n(x.row.amount ?? null) * n(x.get("feerate")) * (eq(x.row.status ?? null, "Paid") ? 0 : Math.max(0, n(x.get("asof")) - n(x.row.due ?? null)))) / 30, 2), formula: "=ROUND(@amount*@@feerate*@ans0/30,2)" },
      { kind: "col", header: "Total due", label: "Total still due", text: "In {range} return amount + late fee for unpaid invoices and 0 for paid ones.", deps: ["status", "due", "amount", "@asof", "@feerate"], nf: "currency", tolerance: 1e-9, expect: (x) => (eq(x.row.status ?? null, "Paid") ? 0 : n(x.row.amount ?? null) + round((n(x.row.amount ?? null) * n(x.get("feerate")) * Math.max(0, n(x.get("asof")) - n(x.row.due ?? null))) / 30, 2)), formula: '=IF(@status="Paid",0,@amount+@ans1)' },
      { kind: "cells", title: "Collections summary", text: "In {range} give the total still due, the total late fees and the number of overdue invoices.", deps: ["status", "due", "amount", "@asof", "@feerate"], cells: [
        { label: "Total still due", nf: "currency", tolerance: 1e-6, required: [["SUM"]], expect: (x) => x.T.invoices.reduce((t, r) => t + (eq(r.status ?? null, "Paid") ? 0 : n(r.amount ?? null) + round((n(r.amount ?? null) * n(x.get("feerate")) * Math.max(0, n(x.get("asof")) - n(r.due ?? null))) / 30, 2)), 0), formula: "=SUM(@@ans2)" },
        { label: "Total late fees", nf: "currency", tolerance: 1e-6, required: [["SUM"]], expect: (x) => x.T.invoices.reduce((t, r) => t + round((n(r.amount ?? null) * n(x.get("feerate")) * (eq(r.status ?? null, "Paid") ? 0 : Math.max(0, n(x.get("asof")) - n(r.due ?? null)))) / 30, 2), 0), formula: "=SUM(@@ans1)" },
        { label: "Overdue invoices", required: CNT, expect: (x) => countWhere(x.T.invoices, (r) => !eq(r.status ?? null, "Paid") && n(x.get("asof")) - n(r.due ?? null) > 0), formula: '=COUNTIF(@@ans0,">0")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-FIN-06", concept: "FIN", tier: "Medium", ds: ["DS-SAL-MONTHLY"], title: "Growth, moving average and year-to-date", minutes: 20, skill: "References to previous rows, AVERAGE over a sliding range, running SUM",
    context: "The finance team tracks month-on-month growth, a 3-month moving average that smooths seasonality, the returns rate and revenue year-to-date.",
    output: "MoM growth %, 3-month average revenue, returns rate and YTD revenue for 12 months, then the best growth month and the yearly returns rate.",
    hints: ["MoM growth = (this revenue - last revenue) / last revenue. The first month has no previous value: leave it blank with IF(ISNUMBER(previous cell), ..., \"\").", "The moving average needs 3 months: use COUNT on the last 3 cells to decide, else blank.", "YTD = SUM from the first row (locked with $) to the current row."],
    explanation: "Relative references to the cell above or two rows above create sliding calculations; an anchored start ($C$2) creates a running total.",
    mistakes: ["Dividing by the current month", "A moving average over only 1 or 2 months at the start", "A running total that restarts every row"],
    tasks: () => [
      { kind: "col", header: "MoM growth", label: "MoM growth", text: "In {range} calculate the growth of revenue versus the previous month; leave the first month blank.", deps: ["revenue"], nf: "percent", tolerance: 1e-9, required: [["IF"]], expect: (x) => (x.i === 0 ? "" : (n(x.row.revenue ?? null) - n(x.T.monthly[x.i - 1].revenue ?? null)) / n(x.T.monthly[x.i - 1].revenue ?? null)), formula: '=IF(ISNUMBER(C{p}),(@revenue-C{p})/C{p},"")' },
      { kind: "col", header: "3-month avg", label: "3-month average revenue", text: "In {range} return the average revenue of this and the previous two months; blank until three months exist.", deps: ["revenue"], nf: "currency", tolerance: 1e-6, required: [["AVERAGE"]], expect: (x) => (x.i < 2 ? "" : (n(x.T.monthly[x.i].revenue ?? null) + n(x.T.monthly[x.i - 1].revenue ?? null) + n(x.T.monthly[x.i - 2].revenue ?? null)) / 3), formula: '=IF(COUNT(C{pp}:C{r})=3,AVERAGE(C{pp}:C{r}),"")' },
      { kind: "col", header: "Returns %", label: "Returns rate", text: "In {range} calculate returns / revenue.", deps: ["revenue", "returns"], nf: "percent", tolerance: 1e-9, expect: (x) => n(x.row.returns ?? null) / n(x.row.revenue ?? null), formula: "=@returns/@revenue" },
      { kind: "col", header: "YTD revenue", label: "Year-to-date revenue", text: "In {range} return the cumulative revenue from the first month to this month.", deps: ["revenue"], nf: "currency", required: [["SUM"]], expect: (x) => x.T.monthly.slice(0, x.i + 1).reduce((t, r) => t + n(r.revenue ?? null), 0), formula: "=SUM(C$2:C{r})" },
      { kind: "cells", title: "Year view", text: "In {range} give the best month-on-month growth and the yearly returns rate (total returns / total revenue).", deps: ["revenue", "returns"], cells: [
        { label: "Best MoM growth", nf: "percent", tolerance: 1e-9, required: [["MAX"]], expect: (x) => Math.max(...x.T.monthly.slice(1).map((r, i) => (n(r.revenue ?? null) - n(x.T.monthly[i].revenue ?? null)) / n(x.T.monthly[i].revenue ?? null))), formula: "=MAX(@@ans0)" },
        { label: "Yearly returns rate", nf: "percent", tolerance: 1e-9, required: [["SUM"]], expect: (x) => x.T.monthly.reduce((t, r) => t + n(r.returns ?? null), 0) / x.T.monthly.reduce((t, r) => t + n(r.revenue ?? null), 0), formula: "=SUM(@@returns)/SUM(@@revenue)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-FIN-07", concept: "FIN", tier: "Medium", ds: ["DS-SAL-PRODUCTS"], title: "Margins, target pricing and break-even", minutes: 20, skill: "Margin, markup, ROUNDUP, assumptions",
    context: "Management wants unit margin, margin and markup percentages, the price needed for a target margin and the units to sell to cover a fixed cost.",
    output: "Margin, Margin %, Markup %, Price for target margin and Break-even units for 25 products, plus the average margin and the number of products below the target margin.",
    hints: ["Margin = price - cost; margin % = margin / price; markup % = margin / cost.", "Price for target margin m: cost / (1 - m). Round to 2 decimals.", "Break-even units = fixed cost / unit margin, rounded up with ROUNDUP.", "Compare margin % with the target using COUNTIF and \"<\"&target."],
    explanation: "Margin and markup use different denominators (price and cost). The price for a target margin solves price x (1 - m) = cost.",
    mistakes: ["Confusing margin with markup", "Rounding break-even down", "Typing the target into every formula"],
    tasks: () => [
      { kind: "input", name: "fixed", label: "Fixed cost", value: 250000, nf: "currency" },
      { kind: "input", name: "target", label: "Target margin", value: 0.4, nf: "percent" },
      { kind: "col", header: "Margin", label: "Unit margin", text: "In {range} calculate price - cost.", deps: ["price", "cost"], nf: "currency", tolerance: 1e-9, expect: (x) => n(x.row.price ?? null) - n(x.row.cost ?? null), formula: "=@price-@cost" },
      { kind: "col", header: "Margin %", label: "Margin %", text: "In {range} calculate margin / price.", deps: ["price", "cost"], nf: "percent", tolerance: 1e-9, expect: (x) => (n(x.row.price ?? null) - n(x.row.cost ?? null)) / n(x.row.price ?? null), formula: "=@ans0/@price" },
      { kind: "col", header: "Markup %", label: "Markup %", text: "In {range} calculate margin / cost.", deps: ["price", "cost"], nf: "percent", tolerance: 1e-9, expect: (x) => (n(x.row.price ?? null) - n(x.row.cost ?? null)) / n(x.row.cost ?? null), formula: "=@ans0/@cost" },
      { kind: "col", header: "Target price", label: "Price for target margin", text: "In {range} calculate cost / (1 - target margin), rounded to 2 decimals.", deps: ["cost", "@target"], nf: "currency", required: [["ROUND"]], tolerance: 1e-9, expect: (x) => round(n(x.row.cost ?? null) / (1 - n(x.get("target"))), 2), formula: "=ROUND(@cost/(1-@@target),2)" },
      { kind: "col", header: "Break-even units", label: "Break-even units", text: "In {range} calculate the units needed to cover the fixed cost: fixed cost / unit margin, rounded up.", deps: ["price", "cost", "@fixed"], required: [["ROUNDUP", "CEILING"]], expect: (x) => Math.ceil(n(x.get("fixed")) / (n(x.row.price ?? null) - n(x.row.cost ?? null)) - 1e-12), formula: "=ROUNDUP(@@fixed/@ans0,0)" },
      { kind: "cells", title: "Pricing review", text: "In {range} give the average margin % and the number of products whose margin % is below the target.", deps: ["price", "cost", "@target"], cells: [
        { label: "Average margin %", nf: "percent", tolerance: 1e-9, required: [["AVERAGE"]], expect: (x) => x.T.products.reduce((t, r) => t + (n(r.price ?? null) - n(r.cost ?? null)) / n(r.price ?? null), 0) / x.T.products.length, formula: "=AVERAGE(@@ans1)" },
        { label: "Products below the target margin", required: CNT, expect: (x) => countWhere(x.T.products, (r) => (n(r.price ?? null) - n(r.cost ?? null)) / n(r.price ?? null) < n(x.get("target"))), formula: '=COUNTIF(@@ans1,"<"&@@target)' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-FIN-08", concept: "FIN", tier: "Hard", ds: ["DS-SAL-TXN", "DS-SAL-PRODUCTS"], title: "Gross profit by region from 1,500 transactions", minutes: 30, skill: "Lookup cost, COGS, profit, margin, SUMIFS by region",
    context: "Transaction amounts are net of discount, but cost sits in the product catalogue. Finance wants the gross profit of every transaction and of every region.",
    output: "Unit cost, COGS, Profit and Margin % for each transaction; gross profit by region and the overall margin.",
    hints: ["Look up the unit cost of the product in the catalogue (5th column).", "COGS = qty x unit cost; profit = amount - COGS; margin % = profit / amount.", "SUMIFS the profit column by region; overall margin = total profit / total amount."],
    explanation: "A lookup brings the cost to each sale. Then arithmetic and SUMIFS give profit by region, and the overall margin uses totals (not an average of margins).",
    mistakes: ["Averaging row margins instead of dividing total profit by total revenue", "Looking up the price instead of the cost", "Ignoring the discount (the amount is already net)"],
    tasks: () => [
      { kind: "col", header: "Unit cost", label: "Unit cost", text: "In {range} look up the unit cost of each transaction's product.", deps: ["product", "products.id", "products.cost"], nf: "currency", required: [["VLOOKUP", "XLOOKUP", "INDEX"]], expect: (x) => n(find(x.T.products, "id", x.row.product ?? null)?.cost ?? null), formula: "=VLOOKUP(@product,@@products.*,5,FALSE)" },
      { kind: "col", header: "COGS", label: "Cost of goods sold", text: "In {range} multiply qty by the unit cost.", deps: ["qty", "product", "products.id", "products.cost"], nf: "currency", tolerance: 1e-6, expect: (x) => n(x.row.qty ?? null) * n(find(x.T.products, "id", x.row.product ?? null)?.cost ?? null), formula: "=@qty*@ans0" },
      { kind: "col", header: "Profit", label: "Profit", text: "In {range} subtract the COGS from the amount.", deps: ["amount", "qty", "product", "products.id", "products.cost"], nf: "currency", tolerance: 1e-6, expect: (x) => n(x.row.amount ?? null) - n(x.row.qty ?? null) * n(find(x.T.products, "id", x.row.product ?? null)?.cost ?? null), formula: "=@amount-@ans1" },
      { kind: "col", header: "Margin %", label: "Margin %", text: "In {range} divide the profit by the amount.", deps: ["amount", "qty", "product", "products.id", "products.cost"], nf: "percent", tolerance: 1e-9, expect: (x) => (n(x.row.amount ?? null) - n(x.row.qty ?? null) * n(find(x.T.products, "id", x.row.product ?? null)?.cost ?? null)) / n(x.row.amount ?? null), formula: "=@ans2/@amount" },
      { kind: "cells", title: "Region profit", text: "In {range} give the profit of each region and the overall margin %.", deps: ["amount", "qty", "region", "product", "products.id", "products.cost"], cells: [
        ...["North", "South", "East", "West"].map((rg) => ({ label: `Profit: ${rg}`, nf: "currency" as const, tolerance: 1e-4, required: SUMIF_, expect: (x: { T: Record<string, Row[]> }) => x.T.txn.reduce((t, r) => (eq(r.region ?? null, rg) ? t + n(r.amount ?? null) - n(r.qty ?? null) * n(find(x.T.products, "id", r.product ?? null)?.cost ?? null) : t), 0), formula: `=SUMIFS(@@ans2,@@region,"${rg}")` })),
        { label: "Overall margin %", nf: "percent" as const, tolerance: 1e-9, required: [["SUM"]], expect: (x) => x.T.txn.reduce((t, r) => t + n(r.amount ?? null) - n(r.qty ?? null) * n(find(x.T.products, "id", r.product ?? null)?.cost ?? null), 0) / x.T.txn.reduce((t, r) => t + n(r.amount ?? null), 0), formula: "=SUM(@@ans2)/SUM(@@amount)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-FIN-09", concept: "FIN", tier: "Hard", ds: ["DS-MKT-CAMPAIGNS", "DS-MKT-LEADS"], title: "Campaign return on investment from won leads", minutes: 30, skill: "SUMIFS/COUNTIFS across tables, ROI, verdict",
    context: "Each lead records the campaign that generated it. Marketing finance values a campaign by the leads it Won, compared with what was spent.",
    output: "Won leads, Won value, ROI % and a verdict for 40 campaigns, then portfolio totals.",
    hints: ["COUNTIFS and SUMIFS on the Leads sheet with the campaign ID and Stage = Won.", "ROI = (won value - spend) / spend.", "Verdict: Profitable when ROI > 0, No wins when there are no won leads, else Loss."],
    explanation: "Conditions across tables link campaign spend to the value its leads produced. ROI compares gain and cost.",
    mistakes: ["Counting all leads instead of Won leads", "ROI = value / spend (that is a ratio, not ROI)", "Forgetting the campaign condition"],
    tasks: () => [
      { kind: "col", header: "Won leads", label: "Won leads", text: "In {range} count the Won leads of each campaign.", deps: ["id", "leads.campaign", "leads.stage"], required: [["COUNTIFS", "SUMPRODUCT"]], expect: (x) => countWhere(x.T.leads, (l) => eq(l.campaign ?? null, x.row.id ?? null) && eq(l.stage ?? null, "Won")), formula: '=COUNTIFS(@@leads.campaign,@id,@@leads.stage,"Won")' },
      { kind: "col", header: "Won value", label: "Won value", text: "In {range} total the Value of the Won leads of each campaign.", deps: ["id", "leads.campaign", "leads.stage", "leads.value"], nf: "currency", required: [["SUMIFS", "SUMPRODUCT"]], expect: (x) => sumWhere(x.T.leads, (l) => eq(l.campaign ?? null, x.row.id ?? null) && eq(l.stage ?? null, "Won"), "value"), formula: '=SUMIFS(@@leads.value,@@leads.campaign,@id,@@leads.stage,"Won")' },
      { kind: "col", header: "ROI %", label: "ROI %", text: "In {range} calculate (won value - spend) / spend.", deps: ["id", "spend", "leads.campaign", "leads.stage", "leads.value"], nf: "percent", tolerance: 1e-9, expect: (x) => (sumWhere(x.T.leads, (l) => eq(l.campaign ?? null, x.row.id ?? null) && eq(l.stage ?? null, "Won"), "value") - n(x.row.spend ?? null)) / n(x.row.spend ?? null), formula: "=(@ans1-@spend)/@spend" },
      { kind: "col", header: "Verdict", label: "Verdict", text: "In {range} return Profitable (ROI above 0), No wins (no Won leads) or Loss.", deps: ["id", "spend", "leads.campaign", "leads.stage", "leads.value"], required: [["IF", "IFS"]], expect: (x) => { const w = countWhere(x.T.leads, (l) => eq(l.campaign ?? null, x.row.id ?? null) && eq(l.stage ?? null, "Won")); const v = sumWhere(x.T.leads, (l) => eq(l.campaign ?? null, x.row.id ?? null) && eq(l.stage ?? null, "Won"), "value"); return v - n(x.row.spend ?? null) > 0 ? "Profitable" : w === 0 ? "No wins" : "Loss"; }, formula: '=IF(@ans2>0,"Profitable",IF(@ans0=0,"No wins","Loss"))' },
      { kind: "cells", title: "Portfolio", text: "In {range} give the total spend, the total won value, the portfolio ROI % and the number of profitable campaigns.", deps: ["id", "spend", "leads.campaign", "leads.stage", "leads.value"], cells: [
        { label: "Total spend", nf: "currency", required: [["SUM"]], expect: (x) => x.T.campaigns.reduce((t, r) => t + n(r.spend ?? null), 0), formula: "=SUM(@@spend)" },
        { label: "Total won value", nf: "currency", required: [["SUM"]], expect: (x) => x.T.campaigns.reduce((t, r) => t + sumWhere(x.T.leads, (l) => eq(l.campaign ?? null, r.id ?? null) && eq(l.stage ?? null, "Won"), "value"), 0), formula: "=SUM(@@ans1)" },
        { label: "Portfolio ROI %", nf: "percent", tolerance: 1e-9, expect: (x) => (x.T.campaigns.reduce((t, r) => t + sumWhere(x.T.leads, (l) => eq(l.campaign ?? null, r.id ?? null) && eq(l.stage ?? null, "Won"), "value"), 0) - x.T.campaigns.reduce((t, r) => t + n(r.spend ?? null), 0)) / x.T.campaigns.reduce((t, r) => t + n(r.spend ?? null), 0), formula: "=({c1}-{c0})/{c0}" },
        { label: "Profitable campaigns", required: CNT, expect: (x) => countWhere(x.T.campaigns, (r) => sumWhere(x.T.leads, (l) => eq(l.campaign ?? null, r.id ?? null) && eq(l.stage ?? null, "Won"), "value") - n(r.spend ?? null) > 0), formula: '=COUNTIF(@@ans3,"Profitable")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-FIN-10", concept: "FIN", tier: "Medium", ds: ["DS-INV-STOCK"], title: "Stock valuation, shortfall cost and ABC classes", minutes: 25, skill: "Valuation, MAX, LARGE, class bands, share of total",
    context: "Finance values inventory at cost, estimates the cost of topping stock up to the reorder level and classifies lines: A (top 10 by value), B (next 20), C (rest).",
    output: "Stock value, shortfall units, shortfall cost and ABC class for 75 stock lines, plus total value, total shortfall cost and the share of value held in class A.",
    hints: ["Value = on hand x unit cost; shortfall units = MAX(0, reorder level - on hand); shortfall cost = shortfall x unit cost.", "A line is class A when its value is at least the 10th largest value: LARGE(value range, 10); class B when at least the 30th largest.", "Class A share = value of class A (SUMIFS) / total value; refer to the cells above."],
    explanation: "LARGE(range, k) gives the k-th biggest value, which is the cut-off for each class. SUMIFS by class gives the value held in A.",
    mistakes: ["Using SMALL instead of LARGE", "Negative shortfall for overstocked lines (needs MAX(0,...))", "Dividing class A value by the number of lines instead of total value"],
    tasks: () => {
      const val = (r: Row) => n(r.onhand ?? null) * n(r.cost ?? null);
      const cut = (x: { T: Record<string, Row[]> }, k: number) => [...x.T.stock.map(val)].sort((a, b) => b - a)[k - 1];
      const cls = (x: { T: Record<string, Row[]> }, r: Row) => (val(r) >= cut(x, 10) ? "A" : val(r) >= cut(x, 30) ? "B" : "C");
      return [
        { kind: "col", header: "Value", label: "Stock value", text: "In {range} multiply on hand by the unit cost.", deps: ["onhand", "cost"], nf: "currency", tolerance: 1e-6, expect: (x) => val(x.row), formula: "=@onhand*@cost" },
        { kind: "col", header: "Shortfall units", label: "Shortfall units", text: "In {range} return how many units are missing to reach the reorder level (0 when stock is enough).", deps: ["onhand", "reorder"], required: [["MAX", "IF"]], expect: (x) => Math.max(0, n(x.row.reorder ?? null) - n(x.row.onhand ?? null)), formula: "=MAX(0,@reorder-@onhand)" },
        { kind: "col", header: "Shortfall cost", label: "Shortfall cost", text: "In {range} multiply the shortfall units by the unit cost.", deps: ["onhand", "reorder", "cost"], nf: "currency", tolerance: 1e-6, expect: (x) => Math.max(0, n(x.row.reorder ?? null) - n(x.row.onhand ?? null)) * n(x.row.cost ?? null), formula: "=@ans1*@cost" },
        { kind: "col", header: "ABC class", label: "ABC class", text: "In {range} return A for the 10 highest values, B for the next 20 and C for the rest.", deps: ["onhand", "cost"], required: [["LARGE", "RANK"]], expect: (x) => cls(x, x.row), formula: '=IF(@ans0>=LARGE(@@ans0,10),"A",IF(@ans0>=LARGE(@@ans0,30),"B","C"))' },
        { kind: "cells", title: "Inventory finance summary", text: "In {range} give the total stock value, total shortfall cost, the value held in class A and its share of the total.", deps: ["onhand", "reorder", "cost"], cells: [
          { label: "Total stock value", nf: "currency", tolerance: 1e-4, required: [["SUM"]], expect: (x) => x.T.stock.reduce((t, r) => t + val(r), 0), formula: "=SUM(@@ans0)" },
          { label: "Total shortfall cost", nf: "currency", tolerance: 1e-4, required: [["SUM"]], expect: (x) => x.T.stock.reduce((t, r) => t + Math.max(0, n(r.reorder ?? null) - n(r.onhand ?? null)) * n(r.cost ?? null), 0), formula: "=SUM(@@ans2)" },
          { label: "Value held in class A", nf: "currency", tolerance: 1e-4, required: SUMIF_, expect: (x) => x.T.stock.reduce((t, r) => (cls(x, r) === "A" ? t + val(r) : t), 0), formula: '=SUMIFS(@@ans0,@@ans3,"A")' },
          { label: "Class A share of value", nf: "percent", tolerance: 1e-9, expect: (x) => x.T.stock.reduce((t, r) => (cls(x, r) === "A" ? t + val(r) : t), 0) / x.T.stock.reduce((t, r) => t + val(r), 0), formula: "={c2}/{c0}" },
        ] },
      ];
    },
  }),
];

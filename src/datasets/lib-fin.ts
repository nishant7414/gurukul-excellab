import { defineDataset as ds } from "./define";
import { cols } from "./types";
import { D, dateIn, pad } from "./rng";
import { DEPTS, customerIds } from "./masters";

export const FIN_DATASETS = [
  ds({
    id: "DS-FIN-EXPENSES", alias: "expenses", sheet: "Expenses", title: "Small-office expense tracker", category: "Finance and Accounting", tier: "Easy", rowCount: 25,
    description: "25 expense entries with category, description, amount and how it was paid.",
    topics: ["Monthly income and expenses"], concepts: ["SM", "CA", "SF", "RF"],
    columns: cols([["date", "Date", "date"], ["cat", "Category", "text"], ["desc", "Description", "text"], ["amount", "Amount", "currency"], ["paid", "Paid by", "text"]]),
    gen: (r) => {
      const items: [string, string][] = [["Rent", "Office rent"], ["Travel", "Cab to client"], ["Food", "Team lunch"], ["Utilities", "Electricity bill"], ["Software", "Cloud subscription"], ["Travel", "Train tickets"], ["Food", "Snacks"], ["Utilities", "Internet"], ["Software", "Design licence"], ["Rent", "Storage unit"]];
      return Array.from({ length: 25 }, (_, i) => { const [c, d] = items[i % items.length]; return [D(2025, 4, 1) + i * 2 + r.int(0, 1), c, d, c === "Rent" ? r.pick([18000, 6500]) : r.money(250, 4800, 10), r.pick(["Card", "UPI", "Cash"])]; });
    },
  }),
  ds({
    id: "DS-FIN-LEDGER", alias: "ledger", sheet: "Ledger", title: "Monthly income and expenses", category: "Finance and Accounting", tier: "Easy", rowCount: 12,
    description: "A year of monthly income with rent, utilities, salaries and other costs.",
    topics: ["Monthly income and expenses", "Profit and loss calculations"], concepts: ["SM", "FIN", "RF"],
    columns: cols([["month", "Month", "date"], ["income", "Income", "currency"], ["rent", "Rent", "currency"], ["utilities", "Utilities", "currency"], ["salaries", "Salaries", "currency"], ["other", "Other costs", "currency"]]),
    gen: (r) => Array.from({ length: 12 }, (_, i) => [D(2025, i + 1, 1), r.money(420000, 760000, 1000), 60000, r.money(9000, 21000, 100), r.money(230000, 290000, 1000), r.money(18000, 82000, 500)]),
  }),
  ds({
    id: "DS-FIN-BUDGET", alias: "deptbudget", sheet: "Departments", title: "Department budgets", category: "Finance and Accounting", tier: "Easy", rowCount: 7, related: ["DS-FIN-ACTUAL"],
    description: "Seven departments with a department head, cost-centre code and annual budget.",
    topics: ["Department budgets"], concepts: ["LK", "FIN", "RF", "CS"],
    columns: cols([["dept", "Department", "text"], ["head", "Head", "text"], ["cc", "Cost centre", "id"], ["annual", "Annual budget", "currency"]]),
    gen: () => [["Sales", "Asha Kulkarni", "CC10", 2400000], ["Finance", "Bilal Sheikh", "CC20", 1200000], ["HR", "Chitra Nair", "CC30", 900000], ["IT", "Dev Malhotra", "CC40", 3600000], ["Operations", "Esha Rao", "CC50", 2800000], ["Marketing", "Farid Khan", "CC60", 1800000], ["Support", "Gauri Joshi", "CC70", 1500000]],
  }),
  ds({
    id: "DS-FIN-ACTUAL", alias: "actual", sheet: "BudgetVsActual", title: "Budget versus actual spend", category: "Finance and Accounting", tier: "Medium", rowCount: 84, related: ["DS-FIN-BUDGET"],
    description: "7 departments x 12 months: monthly budget and actual spend.",
    topics: ["Actual versus budgeted expenditure"], concepts: ["CA", "FIN", "LG", "CS", "LK"],
    columns: cols([["dept", "Department", "text"], ["month", "Month", "date"], ["budget", "Budget", "currency"], ["actual", "Actual", "currency"]]),
    gen: (r) => { const annual = [2400000, 1200000, 900000, 3600000, 2800000, 1800000, 1500000]; return Array.from({ length: 84 }, (_, k) => { const di = Math.floor(k / 12), m = k % 12; const b = Math.round(annual[di] / 12 / 100) * 100; return [DEPTS[di], D(2025, m + 1, 1), b, Math.round((b * r.money(0.82, 1.2, 0.01)) / 100) * 100]; }); },
  }),
  ds({
    id: "DS-FIN-INVOICES", alias: "invoices", sheet: "Invoices", title: "Customer invoices", category: "Finance and Accounting", tier: "Medium", rowCount: 150, related: ["DS-FIN-PAYMENTS", "DS-SAL-CUSTOMERS"],
    description: "150 invoices with invoice number, customer, invoice and due date, amount and status.",
    topics: ["Invoice tracking"], concepts: ["LG", "DT", "CA", "CS", "TX", "LK"],
    columns: cols([["no", "Invoice No", "id"], ["cust", "Customer ID", "id"], ["date", "Invoice date", "date"], ["due", "Due date", "date"], ["amount", "Amount", "currency"], ["status", "Status", "text"]]),
    gen: (r) => Array.from({ length: 150 }, (_, i) => { const d = D(2025, 1, 5) + Math.floor(i * 1.6); return [`INV-2025-${pad(i + 1, 4)}`, r.pick(customerIds(80)), d, d + r.pick([15, 30, 45]), r.money(2500, 98000, 50), r.weighted(["Paid", "Unpaid"], [7, 3])]; }),
  }),
  ds({
    id: "DS-FIN-PAYMENTS", alias: "payments", sheet: "Payments", title: "Payments received", category: "Finance and Accounting", tier: "Hard", rowCount: 400, related: ["DS-FIN-INVOICES"],
    description: "400 receipts against invoices: some invoices are paid in instalments, some partially, and some payments quote an invoice number that does not exist.",
    topics: ["Payment reconciliation"], concepts: ["CA", "LK", "LG", "CS"], issues: ["unmatched-keys"],
    columns: cols([["id", "Payment ID", "id"], ["invoice", "Invoice No", "id"], ["date", "Paid on", "date"], ["amount", "Amount", "currency"], ["mode", "Mode", "text"]]),
    gen: (r) => {
      const invs = FIN_INV_FOR_PAY();
      const pays: (string | number)[][] = [];
      for (const [no, d, amt] of invs) {
        const kind = r.weighted(["full", "partial", "none"], [66, 14, 20]);
        if (kind === "none") continue;
        const k = r.int(1, 4), total = kind === "full" ? amt : Math.round(amt * r.money(0.4, 0.7, 0.05));
        for (let j = 0; j < k; j++) pays.push([no, d + r.int(3, 70), j === k - 1 ? total - Math.round(total / k) * (k - 1) : Math.round(total / k), r.pick(["UPI", "Bank", "Card", "Cheque"])]);
      }
      const rows = r.shuffle(pays).slice(0, 380);
      while (rows.length < 400) rows.push([`INV-2025-${pad(r.int(900, 999), 4)}`, D(2025, 6, 1) + r.int(0, 200), r.money(1000, 20000, 50), r.pick(["UPI", "Bank"])]);
      return rows.map((p, i) => [`PAY${pad(i + 1, 4)}`, ...p]);
    },
  }),
  ds({
    id: "DS-FIN-LOANS", alias: "loans", sheet: "Loans", title: "Loan portfolio", category: "Finance and Accounting", tier: "Medium", rowCount: 30,
    description: "30 loans with principal, annual interest rate, term in months and start date.",
    topics: ["Loan repayment schedules"], concepts: ["FIN", "LG", "CA", "SF", "DT"],
    columns: cols([["id", "Loan ID", "id"], ["borrower", "Borrower", "text"], ["principal", "Principal", "currency"], ["rate", "Annual rate", "percent"], ["term", "Term (months)", "number"], ["start", "Start date", "date"]]),
    gen: (r) => Array.from({ length: 30 }, (_, i) => [`LN${pad(i + 1, 3)}`, `Borrower ${pad(i + 1, 2)}`, r.money(100000, 2500000, 50000), r.pick([0.07, 0.085, 0.09, 0.105, 0.12]), r.pick([12, 24, 36, 48, 60]), dateIn(r, D(2023, 1, 1), 900)]),
  }),
  ds({
    id: "DS-FIN-LOANSCHED", alias: "sched", sheet: "Schedule", title: "Loan repayment schedule (template)", category: "Finance and Accounting", tier: "Easy", rowCount: 12,
    description: "A 12-instalment schedule template: instalment number and due date are given; opening balance, interest, principal and closing balance are for you to calculate.",
    topics: ["Loan repayment schedules"], concepts: ["FIN", "RF"], note: "Template: calculated columns start empty.",
    columns: cols([["no", "Instalment", "number"], ["due", "Due date", "date"], ["open", "Opening balance", "currency"], ["interest", "Interest", "currency"], ["principal", "Principal repaid", "currency"], ["close", "Closing balance", "currency"]]),
    gen: () => Array.from({ length: 12 }, (_, i) => [i + 1, D(2025, i + 2, 1), null, null, null, null]),
  }),
  ds({
    id: "DS-FIN-CASHFLOW", alias: "cashflow", sheet: "Cashflow", title: "Cash-flow forecast inputs", category: "Finance and Accounting", tier: "Easy", rowCount: 12,
    description: "Twelve months of expected receipts, payments and capital spending.",
    topics: ["Cash flow forecasts"], concepts: ["FIN", "LG", "SM"],
    columns: cols([["month", "Month", "date"], ["receipts", "Receipts", "currency"], ["payments", "Payments", "currency"], ["capex", "Capex", "currency"]]),
    gen: (r) => Array.from({ length: 12 }, (_, i) => [D(2026, i + 1, 1), r.money(520000, 880000, 5000), r.money(480000, 800000, 5000), i % 4 === 2 ? r.money(120000, 260000, 10000) : 0]),
  }),
  ds({
    id: "DS-FIN-PNL", alias: "pnl", sheet: "PnL", title: "Profit and loss line items", category: "Finance and Accounting", tier: "Easy", rowCount: 14,
    description: "Fourteen P&L lines tagged Revenue, COGS, Operating expense or Tax.",
    topics: ["Profit and loss calculations"], concepts: ["CA", "FIN", "RF"],
    columns: cols([["account", "Account", "text"], ["type", "Type", "text"], ["amount", "Amount", "currency"]]),
    gen: () => [["Product sales", "Revenue", 4800000], ["Service income", "Revenue", 1250000], ["Interest income", "Revenue", 60000], ["Raw materials", "COGS", 2100000], ["Direct labour", "COGS", 640000], ["Freight in", "COGS", 120000], ["Salaries", "Operating expense", 760000], ["Rent", "Operating expense", 360000], ["Marketing", "Operating expense", 280000], ["Utilities", "Operating expense", 96000], ["Software", "Operating expense", 144000], ["Depreciation", "Operating expense", 220000], ["Income tax", "Tax", 310000], ["Cess", "Tax", 12000]],
  }),
  ds({
    id: "DS-FIN-TAXSLAB", alias: "taxslab", sheet: "Slabs", title: "Illustrative tax slabs", category: "Finance and Accounting", tier: "Easy", rowCount: 5, related: ["DS-HR-PAYROLL"],
    description: "A made-up slab table (annual income from, rate) for approximate-match practice. Not a statement of any real tax law.",
    topics: ["Payroll calculations"], concepts: ["LK", "FIN"],
    columns: cols([["from", "Income from", "currency"], ["rate", "Rate", "percent"]]),
    gen: () => [[0, 0], [300000, 0.05], [700000, 0.1], [1200000, 0.2], [1800000, 0.3]],
  }),
];

/** invoices recreated (same seed => same data as DS-FIN-INVOICES) so payments can reference real invoice numbers */
function FIN_INV_FOR_PAY(): [string, number, number][] {
  const out: [string, number, number][] = [];
  const inv = FIN_DATASETS.find((d) => d.id === "DS-FIN-INVOICES");
  if (inv) for (const row of inv.rows()) out.push([row[0] as string, row[2] as number, row[4] as number]);
  return out;
}


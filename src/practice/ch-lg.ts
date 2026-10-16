import { defineChallenge } from "./build";
import { countWhere, eq, n, round, s, sumWhere } from "./h";

const IFS_ = [["IF", "IFS", "SWITCH"]];
const CNT = [["COUNTIF", "COUNTIFS", "SUMPRODUCT"]];

export const LG = [
  defineChallenge({
    id: "PC-LG-01", concept: "LG", tier: "Easy", ds: ["DS-EDU-MARKS"], title: "Pass or fail across three subjects", minutes: 8, skill: "IF with MIN",
    context: "A student passes only if every subject mark is at least 40.",
    output: "A Result column reading Pass or Fail for each of the 20 students.",
    hints: ["The lowest of the three marks decides: MIN(maths, science, english).", "IF(test, value if true, value if false)."],
    explanation: "=IF(MIN(C2:E2)>=40,\"Pass\",\"Fail\") passes a student only when even the weakest subject reaches 40.",
    mistakes: ["Testing only one subject", "Using > instead of >=", "Forgetting the quotes around Pass/Fail"],
    tasks: () => [{ kind: "col", header: "Result", label: "Result", text: "In {range} return Pass when all three marks are at least 40, otherwise Fail.", deps: ["maths", "science", "english"], required: IFS_, expect: (x) => (Math.min(n(x.row.maths ?? null), n(x.row.science ?? null), n(x.row.english ?? null)) >= 40 ? "Pass" : "Fail"), formula: '=IF(MIN(@maths,@science,@english)>=40,"Pass","Fail")' }],
  }),
  defineChallenge({
    id: "PC-LG-02", concept: "LG", tier: "Easy", ds: ["DS-FIN-EXPENSES"], title: "Who approves this expense?", minutes: 10, skill: "Nested IF",
    context: "Company policy: above 10,000 needs the Director, above 2,000 the Manager, anything else is approved automatically.",
    output: "An Approver for each of the 25 expenses and the number needing the Director.",
    hints: ["Test the largest threshold first.", "Nest a second IF in the false part of the first."],
    explanation: "=IF(D2>10000,\"Director\",IF(D2>2000,\"Manager\",\"Auto\")) checks the highest limit first; each IF handles one band.",
    mistakes: ["Testing the 2,000 limit first so everything above it becomes Manager", "Using >= when the policy says above", "Missing a closing bracket"],
    tasks: () => [
      { kind: "col", header: "Approver", label: "Approver", text: "In {range} return Director (above 10,000), Manager (above 2,000) or Auto.", deps: ["amount"], required: IFS_, expect: (x) => (n(x.row.amount ?? null) > 10000 ? "Director" : n(x.row.amount ?? null) > 2000 ? "Manager" : "Auto"), formula: '=IF(@amount>10000,"Director",IF(@amount>2000,"Manager","Auto"))' },
      { kind: "cells", title: "Director queue", text: "In {range} count the expenses that need the Director.", deps: ["amount"], cells: [{ label: "Expenses needing the Director", required: CNT, expect: (x) => countWhere(x.T.expenses, (r) => n(r.amount ?? null) > 10000), formula: '=COUNTIF(@@ans0,"Director")' }] },
    ],
  }),
  defineChallenge({
    id: "PC-LG-03", concept: "LG", tier: "Medium", ds: ["DS-EDU-SCHOLAR"], title: "Scholarship eligibility and award", minutes: 18, skill: "AND with IFS",
    context: "A scholarship needs CGPA of at least 8, attendance of at least 75% and family income up to 6,00,000. The award is 50,000 for CGPA 9+, 35,000 for 8.5+, else 25,000.",
    output: "Eligibility and Award for 60 students, plus the number eligible and the total awards.",
    hints: ["AND(test1, test2, test3) is TRUE only if all hold.", "IFS(test1, result1, test2, result2, TRUE, default) picks the first test that holds.", "Award is 0 when the student is not eligible."],
    explanation: "Eligibility combines three conditions with AND. The award uses IFS on CGPA, wrapped in an IF so ineligible students get 0.",
    mistakes: ["OR instead of AND", "Attendance typed as 75 instead of 0.75", "IFS without a final TRUE default (gives #N/A)"],
    tasks: () => [
      { kind: "col", header: "Eligibility", label: "Eligibility", text: "In {range} return Eligible or Not eligible.", deps: ["cgpa", "attend", "income"], required: [["IF", "IFS"], ["AND"]], expect: (x) => (n(x.row.cgpa ?? null) >= 8 && n(x.row.attend ?? null) >= 0.75 && n(x.row.income ?? null) <= 600000 ? "Eligible" : "Not eligible"), formula: '=IF(AND(@cgpa>=8,@attend>=0.75,@income<=600000),"Eligible","Not eligible")' },
      { kind: "col", header: "Award", label: "Award", text: "In {range} return the award (0 when not eligible).", deps: ["cgpa", "attend", "income"], nf: "currency", required: [["IFS", "IF"]], expect: (x) => { const ok = n(x.row.cgpa ?? null) >= 8 && n(x.row.attend ?? null) >= 0.75 && n(x.row.income ?? null) <= 600000; const g = n(x.row.cgpa ?? null); return ok ? (g >= 9 ? 50000 : g >= 8.5 ? 35000 : 25000) : 0; }, formula: '=IF(@ans0="Eligible",IFS(@cgpa>=9,50000,@cgpa>=8.5,35000,TRUE,25000),0)' },
      { kind: "cells", title: "Scholarship totals", text: "In {range} count the eligible students and total the awards.", deps: ["cgpa", "attend", "income"], cells: [
        { label: "Eligible students", required: CNT, expect: (x) => countWhere(x.T.scholar, (r) => n(r.cgpa ?? null) >= 8 && n(r.attend ?? null) >= 0.75 && n(r.income ?? null) <= 600000), formula: '=COUNTIF(@@ans0,"Eligible")' },
        { label: "Total awards", nf: "currency", required: [["SUM"]], expect: (x) => x.T.scholar.reduce((t, r) => { const ok = n(r.cgpa ?? null) >= 8 && n(r.attend ?? null) >= 0.75 && n(r.income ?? null) <= 600000; const g = n(r.cgpa ?? null); return t + (ok ? (g >= 9 ? 50000 : g >= 8.5 ? 35000 : 25000) : 0); }, 0), formula: "=SUM(@@ans1)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-LG-04", concept: "LG", tier: "Medium", ds: ["DS-EDU-SEM"], title: "Semester standing and probation", minutes: 15, skill: "IFS with AND, OR",
    context: "Standing: Distinction (SGPA 9+ and no backlogs), First class (7.5+ and no backlogs), Pass (6+), otherwise Needs support. Probation applies with 2+ backlogs or SGPA under 5.5.",
    output: "A Standing and a Probation flag (Yes/No) for each of the 48 semester records.",
    hints: ["List the strictest condition first in IFS.", "Each IFS test can contain an AND: AND(sgpa>=9, backlogs=0).", "OR(backlogs>=2, sgpa<5.5) for the probation flag."],
    explanation: "IFS evaluates tests in order and returns the first match, so more specific rules come first and TRUE closes the list.",
    mistakes: ["Putting Pass first (everything matches it)", "Forgetting the no-backlog condition", "AND instead of OR for probation"],
    tasks: () => [
      { kind: "col", header: "Standing", label: "Standing", text: "In {range} return Distinction, First class, Pass or Needs support.", deps: ["sgpa", "backlogs"], required: [["IFS", "IF"]], expect: (x) => { const g = n(x.row.sgpa ?? null), b = n(x.row.backlogs ?? null); return g >= 9 && b === 0 ? "Distinction" : g >= 7.5 && b === 0 ? "First class" : g >= 6 ? "Pass" : "Needs support"; }, formula: '=IFS(AND(@sgpa>=9,@backlogs=0),"Distinction",AND(@sgpa>=7.5,@backlogs=0),"First class",@sgpa>=6,"Pass",TRUE,"Needs support")' },
      { kind: "col", header: "Probation", label: "Probation", text: "In {range} return Yes when the student has 2 or more backlogs or an SGPA below 5.5, otherwise No.", deps: ["sgpa", "backlogs"], required: [["IF", "IFS"], ["OR"]], expect: (x) => (n(x.row.backlogs ?? null) >= 2 || n(x.row.sgpa ?? null) < 5.5 ? "Yes" : "No"), formula: '=IF(OR(@backlogs>=2,@sgpa<5.5),"Yes","No")' },
    ],
  }),
  defineChallenge({
    id: "PC-LG-05", concept: "LG", tier: "Medium", ds: ["DS-FIN-INVOICES"], title: "Ageing buckets for invoices", minutes: 18, skill: "IFS driven by an assumption cell",
    context: "Collections reviews invoices as at a chosen date (the assumption cell). Paid invoices are Settled; unpaid ones are bucketed by days overdue.",
    output: "A Bucket (Settled, Not due, 1-30 days, 31-60 days, 60+ days) for 150 invoices, then the count and value of the 60+ bucket.",
    hints: ["Days overdue = as-of date minus Due date. Refer to the assumption cell with an absolute reference.", "Check Paid first, then not due, then the bands in ascending order.", "Change the as-of date to see all buckets update."],
    explanation: "The as-of date lives in one cell, so changing it re-buckets every invoice. IFS tests the bands from the smallest overdue period to the largest.",
    mistakes: ["Typing the date inside the formula", "A relative reference to the as-of cell", "Forgetting that paid invoices are never overdue"],
    tasks: () => [
      { kind: "input", name: "asof", label: "As-of date", value: 45930, nf: "date" },
      { kind: "col", header: "Bucket", label: "Ageing bucket", text: "In {range} return Settled, Not due, 1-30 days, 31-60 days or 60+ days, using the as-of date.", deps: ["status", "due", "@asof"], required: [["IF", "IFS"]], expect: (x) => { if (eq(x.row.status ?? null, "Paid")) return "Settled"; const d = n(x.get("asof")) - n(x.row.due ?? null); return d <= 0 ? "Not due" : d <= 30 ? "1-30 days" : d <= 60 ? "31-60 days" : "60+ days"; }, formula: '=IF(@status="Paid","Settled",IFS(@@asof<=@due,"Not due",@@asof-@due<=30,"1-30 days",@@asof-@due<=60,"31-60 days",TRUE,"60+ days"))' },
      { kind: "cells", title: "Oldest debt", text: "In {range} count the invoices in the 60+ bucket and total their amount.", deps: ["status", "due", "amount", "@asof"], cells: [
        { label: "Invoices 60+ days overdue", required: CNT, expect: (x) => countWhere(x.T.invoices, (r) => !eq(r.status ?? null, "Paid") && n(x.get("asof")) - n(r.due ?? null) > 60), formula: '=COUNTIF(@@ans0,"60+ days")' },
        { label: "Value 60+ days overdue", nf: "currency", required: [["SUMIF", "SUMIFS", "SUMPRODUCT"]], expect: (x) => sumWhere(x.T.invoices, (r) => !eq(r.status ?? null, "Paid") && n(x.get("asof")) - n(r.due ?? null) > 60, "amount"), formula: '=SUMIFS(@@amount,@@ans0,"60+ days")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-LG-06", concept: "LG", tier: "Medium", ds: ["DS-OPS-PROD"], title: "Production batch review", minutes: 15, skill: "IF with ratios and OR",
    context: "A batch needs review when defects exceed 3% of units produced, or it is under target when production is below 90% of plan.",
    output: "A Status for each of the 120 batches (High defects, Under target or On track), and the defect rate.",
    hints: ["Defect rate = Defects / Produced.", "High defects takes priority over Under target.", "Compare Produced with 0.9 * Planned."],
    explanation: "Calculate the defect rate once in its own column, then use it in an IF chain that checks defects before target.",
    mistakes: ["Dividing by Planned instead of Produced", "Checking the target first", "Using 3 instead of 0.03"],
    tasks: () => [
      { kind: "col", header: "Defect rate", label: "Defect rate", text: "In {range} calculate Defects / Produced.", deps: ["defects", "produced"], nf: "percent", tolerance: 1e-9, expect: (x) => (n(x.row.produced ?? null) === 0 ? "#DIV/0!" : n(x.row.defects ?? null) / n(x.row.produced ?? null)), formula: "=@defects/@produced" },
      { kind: "col", header: "Status", label: "Batch status", text: "In {range} return High defects (rate above 3%), else Under target (produced below 90% of planned), else On track.", deps: ["defects", "produced", "planned"], required: IFS_, expect: (x) => (n(x.row.defects ?? null) / n(x.row.produced ?? null) > 0.03 ? "High defects" : n(x.row.produced ?? null) < 0.9 * n(x.row.planned ?? null) ? "Under target" : "On track"), formula: '=IF(@ans0>0.03,"High defects",IF(@produced<0.9*@planned,"Under target","On track"))' },
    ],
  }),
  defineChallenge({
    id: "PC-LG-07", concept: "LG", tier: "Hard", ds: ["DS-INV-MOVES"], title: "Signed stock movements and exception flags", minutes: 25, skill: "IF, AND, OR, ABS on 1,000 rows",
    context: "The stock ledger records IN, OUT and ADJ movements with a quantity. Inventory control needs a signed quantity (OUT reduces stock) and a flag for rows that look wrong.",
    output: "Signed quantity, an exception flag and the net stock change for 1,000 movements.",
    hints: ["Signed quantity is minus Qty for OUT and Qty otherwise.", "IN or OUT rows with a quantity of zero or less are Invalid.", "ADJ rows with an absolute quantity above 5 are Large adjustment; all others are OK.", "SUM of the signed column gives the net change."],
    explanation: "Each rule is a small IF; the exception flag chains two checks with AND, one for IN/OUT and one for ADJ.",
    mistakes: ["Not handling negative ADJ quantities with ABS", "Applying the sign to IN rows too", "Treating ADJ as invalid because its quantity is negative"],
    tasks: () => [
      { kind: "col", header: "Signed qty", label: "Signed quantity", text: "In {range} return -Qty for OUT movements and Qty for IN and ADJ.", deps: ["type", "qty"], required: IFS_, expect: (x) => (eq(x.row.type ?? null, "OUT") ? -n(x.row.qty ?? null) : n(x.row.qty ?? null)), formula: '=IF(@type="OUT",-@qty,@qty)' },
      { kind: "col", header: "Flag", label: "Exception flag", text: "In {range} return Invalid (IN or OUT with Qty of 0 or less), Large adjustment (ADJ with |Qty| above 5) or OK.", deps: ["type", "qty"], required: [["IF", "IFS"], ["AND", "OR"]], expect: (x) => { const t = s(x.row.type ?? null).toUpperCase(), q = n(x.row.qty ?? null); return (t === "IN" || t === "OUT") && q <= 0 ? "Invalid" : t === "ADJ" && Math.abs(q) > 5 ? "Large adjustment" : "OK"; }, formula: '=IF(AND(OR(@type="IN",@type="OUT"),@qty<=0),"Invalid",IF(AND(@type="ADJ",ABS(@qty)>5),"Large adjustment","OK"))' },
      { kind: "cells", title: "Ledger summary", text: "In {range} total the net stock change and count the exceptions (flag is not OK).", deps: ["type", "qty"], cells: [
        { label: "Net stock change", required: [["SUM"]], expect: (x) => x.T.moves.reduce((t, r) => t + (eq(r.type ?? null, "OUT") ? -n(r.qty ?? null) : n(r.qty ?? null)), 0), formula: "=SUM(@@ans0)" },
        { label: "Exception rows", required: CNT, expect: (x) => countWhere(x.T.moves, (r) => { const t = s(r.type ?? null).toUpperCase(), q = n(r.qty ?? null); return ((t === "IN" || t === "OUT") && q <= 0) || (t === "ADJ" && Math.abs(q) > 5); }), formula: '=COUNTIF(@@ans1,"<>OK")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-LG-08", concept: "LG", tier: "Hard", ds: ["DS-SUP-TICKETS", "DS-SUP-SLA"], title: "SLA breach detection", minutes: 30, skill: "Lookup, blank handling and nested IF across two tables",
    context: "Each priority has a resolution target in hours (SLA sheet). A ticket with a Closed time is Met or Breached; one without a Closed time is still Open.",
    output: "The SLA hours, hours taken and a Met / Breached / Open status for 800 tickets, then the number of breaches for Urgent tickets.",
    hints: ["Look up the priority in the SLA table for the target hours.", "Hours taken = (Closed - Opened) x 24, rounded to 1 decimal; leave it blank for open tickets.", "Test for an empty Closed cell first (closed=\"\")."],
    explanation: "Dates are numbers of days, so subtracting and multiplying by 24 gives hours. A lookup brings in the target and an IF compares them, checking for open tickets first.",
    mistakes: ["Subtracting a blank (open) ticket's Closed time", "Comparing days with hours", "Looking up the wrong SLA column"],
    tasks: () => [
      { kind: "col", header: "SLA hours", label: "SLA hours", text: "In {range} look up the resolution target (hours) of each ticket's priority.", deps: ["priority", "sla.priority", "sla.hours"], required: [["VLOOKUP", "XLOOKUP", "INDEX"]], expect: (x) => n(x.T.sla.find((r) => eq(r.priority ?? null, x.row.priority ?? null))?.hours ?? null), formula: "=VLOOKUP(@priority,@@sla.*,2,FALSE)" },
      { kind: "col", header: "Hours taken", label: "Hours taken", text: "In {range} return (Closed - Opened) x 24 rounded to 1 decimal, or blank text when the ticket is still open.", deps: ["opened", "closed"], required: [["ROUND"]], expect: (x) => ((x.row.closed ?? null) === null ? "" : round((n(x.row.closed ?? null) - n(x.row.opened ?? null)) * 24, 1)), tolerance: 1e-9, formula: '=IF(@closed="","",ROUND((@closed-@opened)*24,1))' },
      { kind: "col", header: "SLA status", label: "SLA status", text: "In {range} return Open (no Closed time), Breached (hours taken above the SLA hours) or Met.", deps: ["priority", "opened", "closed", "sla.priority", "sla.hours"], required: [["IF", "IFS"]], expect: (x) => { if ((x.row.closed ?? null) === null) return "Open"; const h = round((n(x.row.closed ?? null) - n(x.row.opened ?? null)) * 24, 1); return h > n(x.T.sla.find((r) => eq(r.priority ?? null, x.row.priority ?? null))?.hours ?? null) ? "Breached" : "Met"; }, formula: '=IF(@closed="","Open",IF(@ans1>@ans0,"Breached","Met"))' },
      { kind: "cells", title: "SLA summary", text: "In {range} count the breached tickets of priority Urgent.", deps: ["priority", "opened", "closed", "sla.priority", "sla.hours"], cells: [{ label: "Urgent tickets breached", required: CNT, expect: (x) => countWhere(x.T.tickets, (r) => eq(r.priority ?? null, "Urgent") && (r.closed ?? null) !== null && round((n(r.closed ?? null) - n(r.opened ?? null)) * 24, 1) > n(x.T.sla.find((q) => eq(q.priority ?? null, "Urgent"))?.hours ?? null)), formula: '=COUNTIFS(@@priority,"Urgent",@@ans2,"Breached")' }] },
    ],
  }),
];

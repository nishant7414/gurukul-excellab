import { defineChallenge } from "./build";
import { countWhere, DAY3, DAYFULL, edate, eomonth, n, networkdays, round, sumWhere, ser, weekday2, ymd } from "./h";

const CNT = [["COUNTIF", "COUNTIFS", "SUMPRODUCT"]];
const ASOF = ser(2025, 12, 31);

export const DT = [
  defineChallenge({
    id: "PC-DT-01", concept: "DT", tier: "Easy", ds: ["DS-SAL-PROMO"], title: "How long does each promotion run?", minutes: 8, skill: "Date subtraction, TEXT weekday",
    context: "Marketing lists the start and end date of every promo code and wants the duration and the weekday it ends.",
    output: "Duration in days (both ends counted), duration in weeks and the weekday name of the end date for 10 promotions.",
    hints: ["Dates are numbers, so End - Start gives days; add 1 to count both the first and last day.", "TEXT(date, \"dddd\") returns the weekday name.", "Weeks = days / 7, rounded to 1 decimal."],
    explanation: "Excel stores dates as serial numbers, so subtraction gives the number of days between them.",
    mistakes: ["Forgetting +1 for an inclusive count", "Formatting the result as a date", "Using \"mmmm\" instead of \"dddd\""],
    tasks: () => [
      { kind: "col", header: "Days", label: "Duration (days)", text: "In {range} calculate the number of days the promotion runs, counting both the start and the end day.", deps: ["start", "end"], expect: (x) => n(x.row.end ?? null) - n(x.row.start ?? null) + 1, formula: "=@end-@start+1" },
      { kind: "col", header: "Weeks", label: "Duration (weeks)", text: "In {range} calculate the duration in weeks, rounded to 1 decimal.", deps: ["start", "end"], required: [["ROUND"]], tolerance: 1e-9, expect: (x) => round((n(x.row.end ?? null) - n(x.row.start ?? null) + 1) / 7, 1), formula: "=ROUND(@ans0/7,1)" },
      { kind: "col", header: "Ends on", label: "End weekday", text: "In {range} return the weekday name of the end date.", deps: ["end"], required: [["TEXT", "WEEKDAY", "CHOOSE"]], expect: (x) => DAYFULL[weekday2(n(x.row.end ?? null)) - 1], formula: '=TEXT(@end,"dddd")' },
    ],
  }),
  defineChallenge({
    id: "PC-DT-02", concept: "DT", tier: "Medium", ds: ["DS-HR-EMP"], title: "Tenure and the next work anniversary", minutes: 15, skill: "INT with date difference, DATE, YEAR, MONTH, DAY",
    context: "HR reports on a chosen as-of date (assumption cell): completed years of service and the date of this year's work anniversary.",
    output: "Completed years and this year's anniversary for 60 employees, plus the number with five or more years.",
    hints: ["Completed years = INT((as-of date - joined) / 365.25).", "Anniversary = DATE(YEAR(as-of), MONTH(joined), DAY(joined)).", "Use an absolute reference to the as-of cell."],
    explanation: "Dividing the day difference by 365.25 and cutting off decimals with INT counts whole years; DATE rebuilds the anniversary in the as-of year.",
    mistakes: ["Rounding instead of INT (counts years not yet completed)", "Using the joined date's year in the anniversary", "Typing today's date in the formula"],
    tasks: () => [
      { kind: "input", name: "asof", label: "As-of date", value: ASOF, nf: "date" },
      { kind: "col", header: "Years", label: "Completed years", text: "In {range} return the completed years of service at the as-of date.", deps: ["joined", "@asof"], required: [["INT", "ROUNDDOWN", "TRUNC"]], expect: (x) => Math.floor((n(x.get("asof")) - n(x.row.joined ?? null)) / 365.25), formula: "=INT((@@asof-@joined)/365.25)" },
      { kind: "col", header: "Anniversary", label: "Anniversary this year", nf: "date", text: "In {range} return the date of the work anniversary in the as-of year.", deps: ["joined", "@asof"], required: [["DATE"]], expect: (x) => { const j = ymd(n(x.row.joined ?? null)), a = ymd(n(x.get("asof"))); return ser(a.y, j.m, j.d); }, formula: "=DATE(YEAR(@@asof),MONTH(@joined),DAY(@joined))" },
      { kind: "cells", title: "Long service", text: "In {range} count employees with five or more completed years.", deps: ["joined"], cells: [{ label: "Employees with 5+ years", required: CNT, expect: (x) => countWhere(x.T.emp, (r) => Math.floor((n(x.get("asof")) - n(r.joined ?? null)) / 365.25) >= 5), formula: '=COUNTIF(@@ans0,">=5")' }] },
    ],
  }),
  defineChallenge({
    id: "PC-DT-03", concept: "DT", tier: "Medium", ds: ["DS-INV-PO"], title: "Supplier lead times and working days", minutes: 15, skill: "NETWORKDAYS, WEEKDAY",
    context: "Procurement measures how long purchase orders take from order date to expected delivery, in calendar and working days.",
    output: "Lead days, working days and a Weekend/Weekday delivery flag for 120 purchase orders.",
    hints: ["Lead days = Expected - Ordered.", "NETWORKDAYS(start, end) counts Monday to Friday, both ends included.", "WEEKDAY(date, 2) numbers Monday as 1 and Sunday as 7."],
    explanation: "WEEKDAY(date,2) returns 6 or 7 on weekends; NETWORKDAYS skips them when counting.",
    mistakes: ["WEEKDAY without the 2 (Sunday is 1)", "Counting working days with plain subtraction", "Mixing up the two dates"],
    tasks: () => [
      { kind: "col", header: "Lead days", label: "Lead days", text: "In {range} calculate Expected - Ordered.", deps: ["ordered", "expected"], expect: (x) => n(x.row.expected ?? null) - n(x.row.ordered ?? null), formula: "=@expected-@ordered" },
      { kind: "col", header: "Working days", label: "Working days", text: "In {range} count the working days from the order date to the expected date (both included).", deps: ["ordered", "expected"], required: [["NETWORKDAYS"]], expect: (x) => networkdays(n(x.row.ordered ?? null), n(x.row.expected ?? null)), formula: "=NETWORKDAYS(@ordered,@expected)" },
      { kind: "col", header: "Delivery day", label: "Delivery day type", text: "In {range} return Weekend when the expected date is a Saturday or Sunday, otherwise Weekday.", deps: ["expected"], required: [["WEEKDAY", "TEXT"]], expect: (x) => (weekday2(n(x.row.expected ?? null)) > 5 ? "Weekend" : "Weekday"), formula: '=IF(WEEKDAY(@expected,2)>5,"Weekend","Weekday")' },
    ],
  }),
  defineChallenge({
    id: "PC-DT-04", concept: "DT", tier: "Medium", ds: ["DS-INV-DELIVERY"], title: "Late deliveries by month end", minutes: 15, skill: "Date arithmetic, EOMONTH, IF",
    context: "Supplier performance reviews compare the promised and actual delivery date and group results by month.",
    output: "Days late, an On time/Late/Early status and the month-end of the promised date for 150 deliveries.",
    hints: ["Days late = Actual - Promised (negative means early).", "EOMONTH(date, 0) returns the last day of that date's month.", "Format the month-end column as a date."],
    explanation: "Day differences give lateness; EOMONTH(promised, 0) gives a single date per month that can be used for grouping.",
    mistakes: ["Subtracting in the wrong order", "Using EOMONTH(date,1) (next month)", "Leaving the number unformatted"],
    tasks: () => [
      { kind: "col", header: "Days late", label: "Days late", text: "In {range} calculate Actual - Promised.", deps: ["promised", "actual"], expect: (x) => n(x.row.actual ?? null) - n(x.row.promised ?? null), formula: "=@actual-@promised" },
      { kind: "col", header: "Status", label: "Delivery status", text: "In {range} return Late (days late above 0), Early (below 0) or On time.", deps: ["promised", "actual"], required: [["IF", "IFS"]], expect: (x) => { const d = n(x.row.actual ?? null) - n(x.row.promised ?? null); return d > 0 ? "Late" : d < 0 ? "Early" : "On time"; }, formula: '=IF(@ans0>0,"Late",IF(@ans0<0,"Early","On time"))' },
      { kind: "col", header: "Month end", label: "Month end of promised date", nf: "date", text: "In {range} return the last day of the month of the promised date.", deps: ["promised"], required: [["EOMONTH"]], expect: (x) => eomonth(n(x.row.promised ?? null), 0), formula: "=EOMONTH(@promised,0)" },
    ],
  }),
  defineChallenge({
    id: "PC-DT-05", concept: "DT", tier: "Medium", ds: ["DS-FIN-LOANS"], title: "Loan maturity and months remaining", minutes: 15, skill: "EDATE, YEAR, MONTH, MAX",
    context: "A lender tracks when each loan matures and how many months remain at the reporting date.",
    output: "First EMI date, maturity date and months remaining (never below 0) for 30 loans.",
    hints: ["EDATE(start, months) moves a date by whole months.", "Months remaining = (maturity year - as-of year) x 12 + maturity month - as-of month.", "MAX(0, ...) stops negative values for closed loans."],
    explanation: "EDATE adds months to a date; comparing the years and months of maturity and the reporting date gives the months remaining.",
    mistakes: ["Adding months as days", "Forgetting to multiply years by 12", "Not capping at 0 for matured loans"],
    tasks: () => [
      { kind: "input", name: "asof", label: "Reporting date", value: ASOF, nf: "date" },
      { kind: "col", header: "First EMI", label: "First EMI date", nf: "date", text: "In {range} return the date one month after the loan start.", deps: ["start"], required: [["EDATE", "EOMONTH", "DATE"]], expect: (x) => edate(n(x.row.start ?? null), 1), formula: "=EDATE(@start,1)" },
      { kind: "col", header: "Maturity", label: "Maturity date", nf: "date", text: "In {range} return the maturity date: start date plus the term in months.", deps: ["start", "term"], required: [["EDATE", "DATE"]], expect: (x) => edate(n(x.row.start ?? null), n(x.row.term ?? null)), formula: "=EDATE(@start,@term)" },
      { kind: "col", header: "Months left", label: "Months remaining", text: "In {range} return the months from the reporting date to maturity (0 if already matured).", deps: ["start", "term", "@asof"], required: [["MAX", "IF"]], expect: (x) => { const m = ymd(edate(n(x.row.start ?? null), n(x.row.term ?? null))), a = ymd(n(x.get("asof"))); return Math.max(0, (m.y - a.y) * 12 + m.m - a.m); }, formula: "=MAX(0,(YEAR(@ans1)-YEAR(@@asof))*12+MONTH(@ans1)-MONTH(@@asof))" },
    ],
  }),
  defineChallenge({
    id: "PC-DT-06", concept: "DT", tier: "Medium", ds: ["DS-OPS-HOTEL"], title: "Nights stayed and weekend arrivals", minutes: 15, skill: "Date subtraction, TEXT, WEEKDAY",
    context: "A hotel values each booking by nights and wants to know how many guests arrive at the weekend.",
    output: "Nights, room revenue, arrival day and a weekend flag for 150 bookings, plus the weekend-arrival count.",
    hints: ["Nights = Check-out - Check-in.", "Room revenue = nights x nightly rate.", "TEXT(date,\"ddd\") shows the short day name; WEEKDAY(date,2)>5 means Saturday or Sunday."],
    explanation: "Subtracting two dates gives nights; WEEKDAY with return type 2 flags weekend arrivals.",
    mistakes: ["Counting the check-out night", "Using WEEKDAY without return type 2", "Multiplying by the wrong column"],
    tasks: () => [
      { kind: "col", header: "Nights", label: "Nights", text: "In {range} calculate Check-out - Check-in.", deps: ["in", "out"], expect: (x) => n(x.row.out ?? null) - n(x.row.in ?? null), formula: "=@out-@in" },
      { kind: "col", header: "Room revenue", label: "Room revenue", text: "In {range} calculate nights x rate.", deps: ["in", "out", "rate"], nf: "currency", expect: (x) => (n(x.row.out ?? null) - n(x.row.in ?? null)) * n(x.row.rate ?? null), formula: "=@ans0*@rate" },
      { kind: "col", header: "Arrival day", label: "Arrival day", text: "In {range} return the 3-letter weekday of the check-in date (Mon, Tue ...).", deps: ["in"], required: [["TEXT", "CHOOSE", "WEEKDAY"]], expect: (x) => DAY3[weekday2(n(x.row.in ?? null)) - 1], formula: '=TEXT(@in,"ddd")' },
      { kind: "col", header: "Weekend?", label: "Weekend flag", text: "In {range} return Weekend for Saturday or Sunday arrivals, otherwise Weekday.", deps: ["in"], required: [["WEEKDAY"]], expect: (x) => (weekday2(n(x.row.in ?? null)) > 5 ? "Weekend" : "Weekday"), formula: '=IF(WEEKDAY(@in,2)>5,"Weekend","Weekday")' },
      { kind: "cells", title: "Weekend summary", text: "In {range} count weekend arrivals and total the room revenue of those bookings.", deps: ["in", "out", "rate"], cells: [
        { label: "Weekend arrivals", required: CNT, expect: (x) => countWhere(x.T.hotel, (r) => weekday2(n(r.in ?? null)) > 5), formula: '=COUNTIF(@@ans3,"Weekend")' },
        { label: "Revenue of weekend arrivals", nf: "currency", required: [["SUMIF", "SUMIFS", "SUMPRODUCT"]], expect: (x) => x.T.hotel.reduce((t, r) => (weekday2(n(r.in ?? null)) > 5 ? t + (n(r.out ?? null) - n(r.in ?? null)) * n(r.rate ?? null) : t), 0), formula: '=SUMIFS(@@ans1,@@ans3,"Weekend")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-DT-07", concept: "DT", tier: "Hard", ds: ["DS-HR-ATTRITION"], title: "Tenure at exit across 600 employees", minutes: 25, skill: "Date logic with blanks, IF, IFS",
    context: "People Analytics measures tenure as the time from joining to exit, or to the reporting date for people still employed. It bands tenure and counts early leavers.",
    output: "Tenure in years (1 decimal), a tenure band and the number of leavers who left within their first year.",
    hints: ["A blank Exit date means the person is still employed; use the reporting date instead: IF(exit=\"\", asof, exit).", "Years = (end date - joined) / 365.25, rounded to 1 decimal.", "Bands: under 1, 1 to under 3, 3 to under 5, 5 or more.", "Leavers have a non-blank Exit; COUNTIFS(exit, \"<>\", tenure, \"<1\")."],
    explanation: "Choose the right end date with IF, convert days to years, band with IFS and count early exits with COUNTIFS on the non-blank Exit column.",
    mistakes: ["Subtracting a blank exit date (gives a huge tenure)", "Counting current staff as leavers", "Inconsistent band edges"],
    tasks: () => [
      { kind: "input", name: "asof", label: "Reporting date", value: ASOF, nf: "date" },
      { kind: "col", header: "Tenure (yrs)", label: "Tenure in years", text: "In {range} return the tenure in years, 1 decimal, up to the exit date or the reporting date.", deps: ["joined", "exit", "@asof"], required: [["IF", "IFS"], ["ROUND"]], tolerance: 1e-9, expect: (x) => round((((x.row.exit ?? null) === null ? n(x.get("asof")) : n(x.row.exit ?? null)) - n(x.row.joined ?? null)) / 365.25, 1), formula: '=ROUND((IF(@exit="",@@asof,@exit)-@joined)/365.25,1)' },
      { kind: "col", header: "Band", label: "Tenure band", text: "In {range} return Under 1 year, 1 to 3 years, 3 to 5 years or 5 years or more.", deps: ["joined", "exit", "@asof"], required: [["IFS", "IF"]], expect: (x) => { const t = round((((x.row.exit ?? null) === null ? n(x.get("asof")) : n(x.row.exit ?? null)) - n(x.row.joined ?? null)) / 365.25, 1); return t < 1 ? "Under 1 year" : t < 3 ? "1 to 3 years" : t < 5 ? "3 to 5 years" : "5 years or more"; }, formula: '=IFS(@ans0<1,"Under 1 year",@ans0<3,"1 to 3 years",@ans0<5,"3 to 5 years",TRUE,"5 years or more")' },
      { kind: "cells", title: "Early leavers", text: "In {range} count the people who left within their first year and those who left after five or more years.", deps: ["joined", "exit"], cells: [
        { label: "Left within the first year", required: [["COUNTIFS", "SUMPRODUCT"]], expect: (x) => countWhere(x.T.attrition, (r) => (r.exit ?? null) !== null && round((n(r.exit ?? null) - n(r.joined ?? null)) / 365.25, 1) < 1), formula: '=COUNTIFS(@@exit,"<>",@@ans0,"<1")' },
        { label: "Left after 5 or more years", required: [["COUNTIFS", "SUMPRODUCT"]], expect: (x) => countWhere(x.T.attrition, (r) => (r.exit ?? null) !== null && round((n(r.exit ?? null) - n(r.joined ?? null)) / 365.25, 1) >= 5), formula: '=COUNTIFS(@@exit,"<>",@@ans0,">=5")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-DT-08", concept: "DT", tier: "Hard", ds: ["DS-EDU-FEEPAY"], title: "Fiscal year and quarter reporting (April-March)", minutes: 25, skill: "MONTH, MOD, INT, SUMIFS with derived date parts",
    context: "The college's financial year runs April to March. The accounts office assigns every fee receipt to a fiscal year and quarter (Q1 = April-June).",
    output: "Fiscal year (the year in which it starts), fiscal quarter and the fees received in the second and third quarters of the 2025 fiscal year.",
    hints: ["Fiscal year = YEAR(date) if the month is April or later, otherwise YEAR(date) - 1.", "Fiscal quarter number = INT(MOD(MONTH(date)-4, 12) / 3) + 1.", "SUMIFS the Amount where fiscal year = 2025 and quarter = \"Q2\"."],
    explanation: "Shifting the month by 4 with MOD makes April the first month of the year, so dividing by 3 yields the quarter. The fiscal year changes in April.",
    mistakes: ["Using calendar quarters", "Forgetting that January-March belong to the previous fiscal year", "MOD with a negative number misunderstanding (Excel returns a non-negative result)"],
    tasks: () => [
      { kind: "col", header: "Fiscal year", label: "Fiscal year", text: "In {range} return the fiscal year (the calendar year in which April-March starts).", deps: ["date"], required: [["IF", "IFS"], ["YEAR"]], expect: (x) => { const d = ymd(n(x.row.date ?? null)); return d.m >= 4 ? d.y : d.y - 1; }, formula: "=IF(MONTH(@date)>=4,YEAR(@date),YEAR(@date)-1)" },
      { kind: "col", header: "Fiscal quarter", label: "Fiscal quarter", text: "In {range} return Q1 to Q4 where Q1 is April-June.", deps: ["date"], required: [["MOD", "CHOOSE", "IFS", "IF"]], expect: (x) => `Q${Math.floor((((ymd(n(x.row.date ?? null)).m - 4) % 12 + 12) % 12) / 3) + 1}`, formula: '="Q"&(INT(MOD(MONTH(@date)-4,12)/3)+1)' },
      { kind: "cells", title: "FY2025 quarters", text: "In {range} total the fees received in fiscal-year 2025 for Q2 (July-September) and Q3 (October-December), and count all FY2025 receipts.", deps: ["date", "amount"], cells: [
        { label: "FY2025 Q2 fees", nf: "currency", required: [["SUMIFS", "SUMPRODUCT"]], expect: (x) => sumWhere(x.T.feepay, (r) => { const d = ymd(n(r.date ?? null)); const fy = d.m >= 4 ? d.y : d.y - 1; return fy === 2025 && Math.floor((((d.m - 4) % 12 + 12) % 12) / 3) + 1 === 2; }, "amount"), formula: '=SUMIFS(@@amount,@@ans0,2025,@@ans1,"Q2")' },
        { label: "FY2025 Q3 fees", nf: "currency", required: [["SUMIFS", "SUMPRODUCT"]], expect: (x) => sumWhere(x.T.feepay, (r) => { const d = ymd(n(r.date ?? null)); const fy = d.m >= 4 ? d.y : d.y - 1; return fy === 2025 && Math.floor((((d.m - 4) % 12 + 12) % 12) / 3) + 1 === 3; }, "amount"), formula: '=SUMIFS(@@amount,@@ans0,2025,@@ans1,"Q3")' },
        { label: "Receipts in FY2025", required: CNT, expect: (x) => countWhere(x.T.feepay, (r) => { const d = ymd(n(r.date ?? null)); return (d.m >= 4 ? d.y : d.y - 1) === 2025; }), formula: "=COUNTIF(@@ans0,2025)" },
      ] },
    ],
  }),
];

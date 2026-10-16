import { defineChallenge } from "./build";
import { countWhere, eq, find, n, round, s, sumWhere } from "./h";
import type { Row } from "./types";
import type { Scalar } from "../engine/types";

type TT = Record<string, Row[]>;
const SUMIF_ = [["SUMIF", "SUMIFS", "SUMPRODUCT"]];
const CNT = [["COUNTIF", "COUNTIFS", "SUMPRODUCT"]];
const LOOK = [["VLOOKUP", "XLOOKUP", "INDEX"]];

const disc = (seg: string) => (seg === "Wholesale" ? 0.1 : seg === "Corporate" ? 0.05 : 0);
const segOf = (T: TT, r: Row) => s(find(T.customers, "id", r.cust ?? null)?.segment ?? null);
const netVal = (T: TT, r: Row) => (eq(r.status ?? null, "Cancelled") ? 0 : round(n(r.qty ?? null) * n(find(T.products, "id", r.product ?? null)?.price ?? null) * (1 - disc(segOf(T, r))), 2));

const attStats = (T: TT, id: Scalar) => { const rs = T.hrattend.filter((a) => eq(a.emp ?? null, id)); return { rec: rs.length, present: rs.reduce((t, a) => t + n(a.present ?? null), 0) }; };


const received = (T: TT, po: Row) => sumWhere(T.grn, (g) => eq(g.po ?? null, po.no ?? null), "qty");
const damaged = (T: TT, po: Row) => sumWhere(T.grn, (g) => eq(g.po ?? null, po.no ?? null), "damaged");

export const CS = [
  defineChallenge({
    id: "PC-CS-01", concept: "CS", tier: "Medium", ds: ["DS-SAL-ORDERS", "DS-SAL-CUSTOMERS", "DS-SAL-PRODUCTS"], title: "Net revenue with segment discounts", minutes: 30, skill: "Two lookups, IFS rules, conditional net value and SUMIFS",
    context: "Orders carry only IDs. Wholesale customers get a 10% discount and Corporate customers 5%; cancelled orders earn nothing. Sales finance needs net revenue by customer segment.",
    output: "Segment, Unit price, Discount and Net value for 150 orders; net revenue per segment and the number of cancelled orders.",
    hints: ["Look up the customer's segment on the Customers sheet and the product's price on the Products sheet.", "IFS maps the segment to its discount; Retail has 0%.", "Net value = 0 for Cancelled orders, otherwise ROUND(qty x price x (1 - discount), 2).", "SUMIFS the net value by segment."],
    explanation: "Three tables are joined by their IDs. A rule table is expressed with IFS and applied before the aggregation.",
    mistakes: ["Applying the discount to cancelled orders", "Looking up the segment in the Products sheet", "Summing the gross value by segment"],
    tasks: () => [
      { kind: "col", header: "Segment", label: "Segment", text: "In {range} look up each order's customer segment.", deps: ["cust", "customers.id", "customers.segment"], required: LOOK, expect: (x) => segOf(x.T, x.row), formula: "=VLOOKUP(@cust,@@customers.*,4,FALSE)" },
      { kind: "col", header: "Unit price", label: "Unit price", text: "In {range} look up the product's unit price.", deps: ["product", "products.id", "products.price"], nf: "currency", required: LOOK, expect: (x) => n(find(x.T.products, "id", x.row.product ?? null)?.price ?? null), formula: "=VLOOKUP(@product,@@products.*,4,FALSE)" },
      { kind: "col", header: "Discount", label: "Discount", text: "In {range} return the segment discount: Wholesale 10%, Corporate 5%, otherwise 0%.", deps: ["cust", "customers.id", "customers.segment"], nf: "percent", required: [["IFS", "IF", "SWITCH", "VLOOKUP"]], expect: (x) => disc(segOf(x.T, x.row)), formula: '=IFS(@ans0="Wholesale",0.1,@ans0="Corporate",0.05,TRUE,0)' },
      { kind: "col", header: "Net value", label: "Net value", text: "In {range} return 0 for Cancelled orders, otherwise qty x price x (1 - discount) rounded to 2 decimals.", deps: ["cust", "product", "qty", "status", "customers.id", "customers.segment", "products.id", "products.price"], nf: "currency", required: [["IF", "IFS"]], tolerance: 1e-9, expect: (x) => netVal(x.T, x.row), formula: '=IF(@status="Cancelled",0,ROUND(@qty*@ans1*(1-@ans2),2))' },
      { kind: "cells", title: "Revenue by segment", text: "In {range} give the net revenue of each segment and the number of cancelled orders.", deps: ["cust", "product", "qty", "status", "customers.id", "customers.segment", "products.id", "products.price"], cells: [
        ...["Retail", "Wholesale", "Corporate"].map((sg) => ({ label: `Net revenue: ${sg}`, nf: "currency" as const, tolerance: 1e-6, required: SUMIF_, expect: (x: { T: TT }) => x.T.orders.reduce((t, r) => (segOf(x.T, r) === sg ? t + netVal(x.T, r) : t), 0), formula: `=SUMIFS(@@ans3,@@ans0,"${sg}")` })),
        { label: "Cancelled orders", required: CNT, expect: (x) => countWhere(x.T.orders, (r) => eq(r.status ?? null, "Cancelled")), formula: '=COUNTIF(@@status,"Cancelled")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-CS-02", concept: "CS", tier: "Medium", ds: ["DS-HR-EMP", "DS-HR-ATTEND", "DS-HR-PAYROLL"], title: "HR data audit: who is missing from attendance or payroll?", minutes: 30, skill: "COUNTIF, SUMIFS and IFERROR lookups across three HR tables",
    context: "The HR master lists 60 employees, but attendance covers only some and payroll only some. Before closing the month HR must find the gaps.",
    output: "Attendance records, days present, basic pay (or No payroll) and an attendance flag for 60 employees; counts of gaps.",
    hints: ["COUNTIF(attendance employee IDs, id) counts the records an employee has.", "SUMIFS adds the Present days of the employee.", "IFERROR(VLOOKUP(...), \"No payroll\") handles employees absent from payroll.", "Average days present per record below 22 is flagged Low."],
    explanation: "Counting and summing by ID shows who is present in each table; IFERROR turns lookup failures into a business status instead of an error.",
    mistakes: ["Letting #N/A flow into the totals", "Dividing by zero for employees with no attendance", "Matching on the name instead of the ID"],
    tasks: () => [
      { kind: "col", header: "Attendance records", label: "Attendance records", text: "In {range} count the attendance rows of each employee.", deps: ["id", "hrattend.emp"], required: CNT, expect: (x) => attStats(x.T, x.row.id ?? null).rec, formula: "=COUNTIF(@@hrattend.emp,@id)" },
      { kind: "col", header: "Days present", label: "Days present", text: "In {range} total the Present days of each employee.", deps: ["id", "hrattend.emp", "hrattend.present"], required: SUMIF_, expect: (x) => attStats(x.T, x.row.id ?? null).present, formula: "=SUMIFS(@@hrattend.present,@@hrattend.emp,@id)" },
      { kind: "col", header: "Basic pay", label: "Basic pay", text: "In {range} look up the basic pay in Payroll, or show No payroll.", deps: ["id", "payroll.emp", "payroll.basic"], nf: "currency", required: [["IFERROR", "IFNA"], ...LOOK], expect: (x) => find(x.T.payroll, "emp", x.row.id ?? null)?.basic ?? "No payroll", formula: '=IFERROR(VLOOKUP(@id,@@payroll.*,2,FALSE),"No payroll")' },
      { kind: "col", header: "Flag", label: "Attendance flag", text: "In {range} return No attendance (no records), Low (average present days per record below 22) or OK.", deps: ["id", "hrattend.emp", "hrattend.present"], required: [["IF", "IFS"]], expect: (x) => { const a = attStats(x.T, x.row.id ?? null); return a.rec === 0 ? "No attendance" : a.present / a.rec < 22 ? "Low" : "OK"; }, formula: '=IF(@ans0=0,"No attendance",IF(@ans1/@ans0<22,"Low","OK"))' },
      { kind: "cells", title: "Audit result", text: "In {range} count employees with no attendance, with no payroll and with a Low attendance flag.", deps: ["id", "hrattend.emp", "hrattend.present", "payroll.emp", "payroll.basic"], cells: [
        { label: "Employees with no attendance", required: CNT, expect: (x) => countWhere(x.T.emp, (r) => attStats(x.T, r.id ?? null).rec === 0), formula: '=COUNTIF(@@ans3,"No attendance")' },
        { label: "Employees with no payroll", required: CNT, expect: (x) => countWhere(x.T.emp, (r) => !find(x.T.payroll, "emp", r.id ?? null)), formula: '=COUNTIF(@@ans2,"No payroll")' },
        { label: "Low attendance", required: CNT, expect: (x) => countWhere(x.T.emp, (r) => { const a = attStats(x.T, r.id ?? null); return a.rec > 0 && a.present / a.rec < 22; }), formula: '=COUNTIF(@@ans3,"Low")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-CS-03", concept: "CS", tier: "Medium", ds: ["DS-EDU-MARKS", "DS-EDU-ATTEND"], title: "Student progress report from marks and attendance", minutes: 25, skill: "SUM, SUMIFS ratio across tables, IFS",
    context: "A student's marks are on one sheet and monthly attendance on another. The report combines both: students below 75% attendance are flagged before their marks are considered.",
    output: "Total, Percentage, Attendance % and Status (Attendance risk, Merit, Pass or Fail) for 20 students; counts and average attendance.",
    hints: ["Percentage = total / 300.", "Attendance % = SUMIFS(present, roll, this roll) / SUMIFS(working, roll, this roll).", "IFS order: attendance risk first, then 75%+ Merit, then 40%+ Pass, else Fail."],
    explanation: "Attendance is aggregated per student with SUMIFS, then a rule table combines it with the marks.",
    mistakes: ["Averaging monthly percentages instead of totals", "Checking marks before attendance", "Dividing by 100 instead of 300"],
    tasks: () => {
      const tot = (r: Row) => n(r.maths ?? null) + n(r.science ?? null) + n(r.english ?? null);
      const att = (T: TT, r: Row) => sumWhere(T.attend, (a) => eq(a.roll ?? null, r.roll ?? null), "present") / sumWhere(T.attend, (a) => eq(a.roll ?? null, r.roll ?? null), "working");
      const status = (T: TT, r: Row) => (att(T, r) < 0.75 ? "Attendance risk" : round(tot(r) / 300, 4) >= 0.75 ? "Merit" : round(tot(r) / 300, 4) >= 0.4 ? "Pass" : "Fail");
      return [
        { kind: "col", header: "Total", label: "Total marks", text: "In {range} add the three subject marks.", deps: ["maths", "science", "english"], required: [["SUM"]], expect: (x) => tot(x.row), formula: "=SUM(@maths:@english)" },
        { kind: "col", header: "Percentage", label: "Percentage", text: "In {range} divide the total by 300, rounded to 4 decimals.", deps: ["maths", "science", "english"], nf: "percent", tolerance: 1e-9, required: [["ROUND"]], expect: (x) => round(tot(x.row) / 300, 4), formula: "=ROUND(@ans0/300,4)" },
        { kind: "col", header: "Attendance %", label: "Attendance %", text: "In {range} divide the student's total present days by the total working days from the Attendance sheet.", deps: ["roll", "attend.roll", "attend.present", "attend.working"], nf: "percent", tolerance: 1e-9, required: SUMIF_, expect: (x) => att(x.T, x.row), formula: "=SUMIFS(@@attend.present,@@attend.roll,@roll)/SUMIFS(@@attend.working,@@attend.roll,@roll)" },
        { kind: "col", header: "Status", label: "Student status", text: "In {range} return Attendance risk (below 75% attendance), else Merit (percentage 75%+), Pass (40%+) or Fail.", deps: ["maths", "science", "english", "roll", "attend.roll", "attend.present", "attend.working"], required: [["IFS", "IF"]], expect: (x) => status(x.T, x.row), formula: '=IFS(@ans2<0.75,"Attendance risk",@ans1>=0.75,"Merit",@ans1>=0.4,"Pass",TRUE,"Fail")' },
        { kind: "cells", title: "Class summary", text: "In {range} count the students at attendance risk and with Merit, and give the average attendance.", deps: ["maths", "science", "english", "roll", "attend.roll", "attend.present", "attend.working"], cells: [
          { label: "Attendance risk", required: CNT, expect: (x) => countWhere(x.T.marks, (r) => status(x.T, r) === "Attendance risk"), formula: '=COUNTIF(@@ans3,"Attendance risk")' },
          { label: "Merit", required: CNT, expect: (x) => countWhere(x.T.marks, (r) => status(x.T, r) === "Merit"), formula: '=COUNTIF(@@ans3,"Merit")' },
          { label: "Average attendance", nf: "percent" as const, tolerance: 1e-9, required: [["AVERAGE"]], expect: (x) => x.T.marks.reduce((t, r) => t + att(x.T, r), 0) / x.T.marks.length, formula: "=AVERAGE(@@ans2)" },
        ] },
      ];
    },
  }),
  defineChallenge({
    id: "PC-CS-04", concept: "CS", tier: "Medium", ds: ["DS-INV-PO", "DS-INV-GRN", "DS-INV-SUPPLIERS"], title: "Purchase order receiving performance", minutes: 30, skill: "Lookup, SUMIFS across tables, status logic, SUMPRODUCT",
    context: "Purchase orders are raised on one sheet, goods received on another (a PO can have several receipts or none) and suppliers on a third. Procurement checks what has arrived.",
    output: "Supplier, Received, Damaged, Fill rate and Status (Not received, Partial, Complete) for 120 POs; open PO count, damaged units and the value not yet received.",
    hints: ["SUMIFS the received quantity by PO number.", "Fill rate = received / ordered quantity, rounded to 4 decimals.", "Status: no receipts = Not received; received below ordered = Partial; otherwise Complete.", "SUMPRODUCT((status=\"Not received\")*qty*cost) values what is outstanding."],
    explanation: "Receipts are aggregated per PO with SUMIFS; the supplier is looked up. A status column drives the final counts and the SUMPRODUCT.",
    mistakes: ["Using VLOOKUP for receipts (only the first row is found)", "Dividing by received instead of ordered", "Treating over-delivery as Partial"],
    tasks: () => [
      { kind: "col", header: "Supplier", label: "Supplier", text: "In {range} look up the supplier's name.", deps: ["supplier", "suppliers.code", "suppliers.name"], required: LOOK, expect: (x) => s(find(x.T.suppliers, "code", x.row.supplier ?? null)?.name ?? null), formula: "=VLOOKUP(@supplier,@@suppliers.*,2,FALSE)" },
      { kind: "col", header: "Received", label: "Received", text: "In {range} total the received quantity of each PO from the GRN sheet.", deps: ["no", "grn.po", "grn.qty"], required: SUMIF_, expect: (x) => received(x.T, x.row), formula: "=SUMIFS(@@grn.qty,@@grn.po,@no)" },
      { kind: "col", header: "Damaged", label: "Damaged", text: "In {range} total the damaged units of each PO.", deps: ["no", "grn.po", "grn.damaged"], required: SUMIF_, expect: (x) => damaged(x.T, x.row), formula: "=SUMIFS(@@grn.damaged,@@grn.po,@no)" },
      { kind: "col", header: "Fill rate", label: "Fill rate", text: "In {range} divide received by ordered quantity, rounded to 4 decimals.", deps: ["qty", "no", "grn.po", "grn.qty"], nf: "percent", tolerance: 1e-9, required: [["ROUND"]], expect: (x) => round(received(x.T, x.row) / n(x.row.qty ?? null), 4), formula: "=ROUND(@ans1/@qty,4)" },
      { kind: "col", header: "Status", label: "PO status", text: "In {range} return Not received, Partial (received below ordered) or Complete.", deps: ["qty", "no", "grn.po", "grn.qty"], required: [["IF", "IFS"]], expect: (x) => { const r = received(x.T, x.row); return r === 0 ? "Not received" : r < n(x.row.qty ?? null) ? "Partial" : "Complete"; }, formula: '=IF(@ans1=0,"Not received",IF(@ans1<@qty,"Partial","Complete"))' },
      { kind: "cells", title: "Receiving summary", text: "In {range} count open POs (Not received), total the damaged units and value the quantity not yet received.", deps: ["qty", "cost", "no", "grn.po", "grn.qty", "grn.damaged"], cells: [
        { label: "POs not received", required: CNT, expect: (x) => countWhere(x.T.po, (p) => received(x.T, p) === 0), formula: '=COUNTIF(@@ans4,"Not received")' },
        { label: "Damaged units", required: [["SUM"]], expect: (x) => x.T.po.reduce((t, p) => t + damaged(x.T, p), 0), formula: "=SUM(@@ans2)" },
        { label: "Value of POs not received", nf: "currency" as const, required: [["SUMPRODUCT"]], expect: (x) => x.T.po.reduce((t, p) => (received(x.T, p) === 0 ? t + n(p.qty ?? null) * n(p.cost ?? null) : t), 0), formula: '=SUMPRODUCT((@@ans4="Not received")*@@qty*@@cost)' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-CS-05", concept: "CS", tier: "Medium", ds: ["DS-SAL-RETURNS", "DS-SAL-ORDERS", "DS-SAL-PRODUCTS"], title: "Do refunds match what was sold?", minutes: 30, skill: "Chained lookups across three tables",
    context: "A return references an order; the order references a product. To check a refund, Finance needs the original order value and the share refunded.",
    output: "Product, Qty, Order value, Refund share and a check flag for 70 returns; approved refunds, refunds for Defective items and the number exceeding the order value.",
    hints: ["Look up the order's product and quantity on the Orders sheet (columns 4 and 5).", "Order value = quantity x the product's price (second lookup on Products).", "Refund share = refund / order value, rounded to 4 decimals.", "Flag: above 100% is Refund exceeds order; exactly 100% Full; else Partial."],
    explanation: "The product ID found by the first lookup becomes the key of the second lookup. Each step is in its own column, so mistakes are easy to trace.",
    mistakes: ["Looking up the order ID in the Products sheet", "Using the return date instead of the order date", "Comparing the refund with the unit price instead of the order value"],
    tasks: () => {
      const ordOf = (T: TT, r: Row) => find(T.orders, "id", r.order ?? null);
      const val = (T: TT, r: Row) => n(ordOf(T, r)?.qty ?? null) * n(find(T.products, "id", ordOf(T, r)?.product ?? null)?.price ?? null);
      const share = (T: TT, r: Row) => round(n(r.refund ?? null) / val(T, r), 4);
      return [
        { kind: "col", header: "Product", label: "Product", text: "In {range} look up the product ID of the returned order.", deps: ["order", "orders.id", "orders.product"], required: LOOK, expect: (x) => ordOf(x.T, x.row)?.product ?? null, formula: "=VLOOKUP(@order,@@orders.*,4,FALSE)" },
        { kind: "col", header: "Qty", label: "Quantity", text: "In {range} look up the quantity of the returned order.", deps: ["order", "orders.id", "orders.qty"], required: LOOK, expect: (x) => ordOf(x.T, x.row)?.qty ?? null, formula: "=VLOOKUP(@order,@@orders.*,5,FALSE)" },
        { kind: "col", header: "Order value", label: "Order value", text: "In {range} multiply the quantity by the product's price from the Products sheet.", deps: ["order", "orders.id", "orders.product", "orders.qty", "products.id", "products.price"], nf: "currency", tolerance: 1e-6, required: LOOK, expect: (x) => val(x.T, x.row), formula: "=@ans1*VLOOKUP(@ans0,@@products.*,4,FALSE)" },
        { kind: "col", header: "Refund share", label: "Refund share", text: "In {range} divide the refund by the order value, rounded to 4 decimals.", deps: ["refund", "order", "orders.id", "orders.product", "orders.qty", "products.id", "products.price"], nf: "percent", tolerance: 1e-9, required: [["ROUND"]], expect: (x) => share(x.T, x.row), formula: "=ROUND(@refund/@ans2,4)" },
        { kind: "col", header: "Check", label: "Refund check", text: "In {range} return Refund exceeds order (above 100%), Full (exactly 100%) or Partial.", deps: ["refund", "order", "orders.id", "orders.product", "orders.qty", "products.id", "products.price"], required: [["IF", "IFS"]], expect: (x) => (share(x.T, x.row) > 1 ? "Refund exceeds order" : share(x.T, x.row) === 1 ? "Full" : "Partial"), formula: '=IF(@ans3>1,"Refund exceeds order",IF(@ans3=1,"Full","Partial"))' },
        { kind: "cells", title: "Refund review", text: "In {range} total the approved refunds, total the refunds for Defective items and count refunds that exceed the order value.", deps: ["refund", "approved", "reason", "order", "orders.id", "orders.product", "orders.qty", "products.id", "products.price"], cells: [
          { label: "Approved refunds", nf: "currency" as const, required: SUMIF_, expect: (x) => sumWhere(x.T.returns, (r) => eq(r.approved ?? null, "Yes"), "refund"), formula: '=SUMIFS(@@refund,@@approved,"Yes")' },
          { label: "Refunds for Defective items", nf: "currency" as const, required: SUMIF_, expect: (x) => sumWhere(x.T.returns, (r) => eq(r.reason ?? null, "Defective"), "refund"), formula: '=SUMIFS(@@refund,@@reason,"Defective")' },
          { label: "Refunds exceeding the order", required: CNT, expect: (x) => countWhere(x.T.returns, (r) => share(x.T, r) > 1), formula: '=COUNTIF(@@ans4,"Refund exceeds order")' },
        ] },
      ];
    },
  }),
  defineChallenge({
    id: "PC-CS-06", concept: "CS", tier: "Hard", ds: ["DS-FIN-INVOICES", "DS-FIN-PAYMENTS", "DS-SAL-CUSTOMERS"], title: "Customer receivables: invoices, payments and cities", minutes: 40, skill: "SUMIFS against a payment table, balances, lookups and conditional totals",
    context: "Invoices are issued on one sheet, payments (several per invoice, some for unknown invoices) arrive on another, and the customer's city sits on a third. Collections needs each invoice's position and the open balance by city.",
    output: "City, Received, Balance and Position (Overpaid, Settled, Unpaid, Part paid) for 150 invoices; open balance for Pune and Kochi and counts.",
    hints: ["The customer ID on the invoice leads to the City on the Customers sheet.", "Received = SUMIFS(payment amount, payment invoice, invoice number).", "Balance = invoice amount - received.", "Open balance by city sums only positive balances: SUMIFS(balance, city, \"Pune\", balance, \">0\")."],
    explanation: "Payments are linked to invoices by the invoice number; the customer's city is brought in by a lookup. Position and city totals follow from the balance.",
    mistakes: ["Counting overpayments as negative open balance", "Matching payments on the customer", "Forgetting that an invoice may have several payments"],
    tasks: () => {
      const city = (T: TT, r: Row) => s(find(T.customers, "id", r.cust ?? null)?.city ?? null);
      const rec = (T: TT, r: Row) => sumWhere(T.payments, (p) => eq(p.invoice ?? null, r.no ?? null), "amount");
      const bal = (T: TT, r: Row) => n(r.amount ?? null) - rec(T, r);
      const pos = (T: TT, r: Row) => (bal(T, r) < 0 ? "Overpaid" : bal(T, r) === 0 ? "Settled" : rec(T, r) === 0 ? "Unpaid" : "Part paid");
      return [
        { kind: "col", header: "City", label: "City", text: "In {range} look up the customer's city.", deps: ["cust", "customers.id", "customers.city"], required: LOOK, expect: (x) => city(x.T, x.row), formula: "=VLOOKUP(@cust,@@customers.*,3,FALSE)" },
        { kind: "col", header: "Received", label: "Received", text: "In {range} total the payments received for each invoice.", deps: ["no", "payments.invoice", "payments.amount"], nf: "currency", required: SUMIF_, expect: (x) => rec(x.T, x.row), formula: "=SUMIFS(@@payments.amount,@@payments.invoice,@no)" },
        { kind: "col", header: "Balance", label: "Balance", text: "In {range} subtract the amount received from the invoice amount.", deps: ["amount", "no", "payments.invoice", "payments.amount"], nf: "currency", tolerance: 1e-6, expect: (x) => bal(x.T, x.row), formula: "=@amount-@ans1" },
        { kind: "col", header: "Position", label: "Position", text: "In {range} return Overpaid (balance below 0), Settled (0), Unpaid (nothing received) or Part paid.", deps: ["amount", "no", "payments.invoice", "payments.amount"], required: [["IF", "IFS"]], expect: (x) => pos(x.T, x.row), formula: '=IF(@ans2<0,"Overpaid",IF(@ans2=0,"Settled",IF(@ans1=0,"Unpaid","Part paid")))' },
        { kind: "cells", title: "Receivables by city", text: "In {range} give the open balance (positive balances only) for Pune and Kochi, the number of overpaid invoices and the number of unpaid invoices.", deps: ["cust", "amount", "no", "customers.id", "customers.city", "payments.invoice", "payments.amount"], cells: [
          ...["Pune", "Kochi"].map((c) => ({ label: `Open balance: ${c}`, nf: "currency" as const, tolerance: 1e-6, required: SUMIF_, expect: (x: { T: TT }) => x.T.invoices.reduce((t, r) => (city(x.T, r) === c && bal(x.T, r) > 0 ? t + bal(x.T, r) : t), 0), formula: `=SUMIFS(@@ans2,@@ans0,"${c}",@@ans2,">0")` })),
          { label: "Overpaid invoices", required: CNT, expect: (x) => countWhere(x.T.invoices, (r) => pos(x.T, r) === "Overpaid"), formula: '=COUNTIF(@@ans3,"Overpaid")' },
          { label: "Unpaid invoices", required: CNT, expect: (x) => countWhere(x.T.invoices, (r) => pos(x.T, r) === "Unpaid"), formula: '=COUNTIF(@@ans3,"Unpaid")' },
        ] },
      ];
    },
  }),
  defineChallenge({
    id: "PC-CS-07", concept: "CS", tier: "Hard", ds: ["DS-EDU-FEEPAY", "DS-EDU-FEES"], title: "Fee receipts: matched students, unknown receipts and coverage", minutes: 35, skill: "IFERROR lookups, SUMIFS, status logic across two tables",
    context: "300 fee receipts reference a roll number. Some roll numbers do not exist in the fee register. Accounts wants each receipt matched to a student and to know whether the student's receipts cover the fees due.",
    output: "Student, Programme, Fee total, Student receipts and Coverage for 300 receipts; counts and cash by match status.",
    hints: ["IFERROR(VLOOKUP(...), \"Unknown student\") for the name; similar for the programme (use \"Unknown\") and fee total (use 0).", "Student receipts = SUMIFS(amount, roll, this roll).", "Coverage: n/a when the student is unknown, Covers fees when receipts >= fee total, else Short."],
    explanation: "Lookups are protected with IFERROR so unknown rolls become a business category; SUMIFS aggregates the receipts of the same student.",
    mistakes: ["Letting #N/A break later columns", "Comparing one receipt (not all receipts) with the fee total", "Treating unknown students as short"],
    tasks: () => {
      const fee = (T: TT, r: Row) => find(T.fees, "roll", r.roll ?? null);
      const sr = (T: TT, r: Row) => sumWhere(T.feepay, (p) => eq(p.roll ?? null, r.roll ?? null), "amount");
      const cov = (T: TT, r: Row) => (!fee(T, r) ? "n/a" : sr(T, r) >= n(fee(T, r)?.total ?? null) ? "Covers fees" : "Short");
      return [
        { kind: "col", header: "Student", label: "Student", text: "In {range} look up the student's name, or Unknown student.", deps: ["roll", "fees.roll", "fees.name"], required: [["IFERROR", "IFNA"], ...LOOK], expect: (x) => s(fee(x.T, x.row)?.name ?? "Unknown student"), formula: '=IFERROR(VLOOKUP(@roll,@@fees.*,2,FALSE),"Unknown student")' },
        { kind: "col", header: "Programme", label: "Programme", text: "In {range} look up the programme, or Unknown.", deps: ["roll", "fees.roll", "fees.programme"], required: [["IFERROR", "IFNA"], ...LOOK], expect: (x) => s(fee(x.T, x.row)?.programme ?? "Unknown"), formula: '=IFERROR(VLOOKUP(@roll,@@fees.*,3,FALSE),"Unknown")' },
        { kind: "col", header: "Fee total", label: "Fee total", text: "In {range} look up the student's total fee, or 0 for unknown students.", deps: ["roll", "fees.roll", "fees.total"], nf: "currency", required: [["IFERROR", "IFNA"], ...LOOK], expect: (x) => n(fee(x.T, x.row)?.total ?? 0), formula: "=IFERROR(VLOOKUP(@roll,@@fees.*,4,FALSE),0)" },
        { kind: "col", header: "Student receipts", label: "Student receipts", text: "In {range} total all receipts of the same roll number.", deps: ["roll", "amount"], nf: "currency", required: SUMIF_, expect: (x) => sr(x.T, x.row), formula: "=SUMIFS(@@amount,@@roll,@roll)" },
        { kind: "col", header: "Coverage", label: "Coverage", text: "In {range} return n/a (unknown student), Covers fees (receipts at least the fee total) or Short.", deps: ["roll", "amount", "fees.roll", "fees.total"], required: [["IF", "IFS"]], expect: (x) => cov(x.T, x.row), formula: '=IF(@ans0="Unknown student","n/a",IF(@ans3>=@ans2,"Covers fees","Short"))' },
        { kind: "cells", title: "Reconciliation", text: "In {range} count the receipts of unknown students, total their cash, total the BCA cash and total the UPI cash of known students.", deps: ["roll", "amount", "mode", "fees.roll", "fees.name", "fees.programme"], cells: [
          { label: "Receipts of unknown students", required: CNT, expect: (x) => countWhere(x.T.feepay, (r) => !fee(x.T, r)), formula: '=COUNTIF(@@ans0,"Unknown student")' },
          { label: "Cash of unknown students", nf: "currency" as const, required: SUMIF_, expect: (x) => sumWhere(x.T.feepay, (r) => !fee(x.T, r), "amount"), formula: '=SUMIFS(@@amount,@@ans0,"Unknown student")' },
          { label: "BCA cash", nf: "currency" as const, required: SUMIF_, expect: (x) => sumWhere(x.T.feepay, (r) => s(fee(x.T, r)?.programme ?? null) === "BCA", "amount"), formula: '=SUMIFS(@@amount,@@ans1,"BCA")' },
          { label: "UPI cash of known students", nf: "currency" as const, required: SUMIF_, expect: (x) => sumWhere(x.T.feepay, (r) => eq(r.mode ?? null, "UPI") && !!fee(x.T, r), "amount"), formula: '=SUMIFS(@@amount,@@mode,"UPI",@@ans0,"<>Unknown student")' },
        ] },
      ];
    },
  }),
  defineChallenge({
    id: "PC-CS-08", concept: "CS", tier: "Hard", ds: ["DS-INV-STOCK", "DS-INV-MOVES", "DS-INV-WAREHOUSES"], title: "Projected stock after recorded movements", minutes: 40, skill: "Multi-condition SUMIFS on 1,000 movements, lookup, status",
    context: "The stock sheet is a snapshot. 1,000 later movements (IN, OUT, ADJ) are recorded by SKU and warehouse. Inventory control wants the projected position of each stock line.",
    output: "City, IN, OUT, ADJ, Projected stock and Flag (Negative, Reorder, OK) for 75 stock lines; counts and the projected value.",
    hints: ["The city comes from the Warehouses sheet (VLOOKUP on the warehouse code).", "SUMIFS the movement quantity with three conditions: SKU, warehouse and type.", "Projected = on hand + IN - OUT + ADJ.", "Flag: below 0 is Negative; below the reorder level is Reorder; else OK."],
    explanation: "Each stock line is identified by SKU plus warehouse, so every SUMIFS uses both. Combining movement types gives the projected stock.",
    mistakes: ["Matching on the SKU only (mixes warehouses)", "Adding OUT instead of subtracting", "Comparing the projected stock with the wrong column"],
    tasks: () => {
      const mv = (T: TT, r: Row, t: string) => sumWhere(T.moves, (m) => eq(m.sku ?? null, r.sku ?? null) && eq(m.wh ?? null, r.wh ?? null) && eq(m.type ?? null, t), "qty");
      const proj = (T: TT, r: Row) => n(r.onhand ?? null) + mv(T, r, "IN") - mv(T, r, "OUT") + mv(T, r, "ADJ");
      const flag = (T: TT, r: Row) => (proj(T, r) < 0 ? "Negative" : proj(T, r) < n(r.reorder ?? null) ? "Reorder" : "OK");
      const deps = ["sku", "wh", "onhand", "reorder", "moves.sku", "moves.wh", "moves.type", "moves.qty"];
      return [
        { kind: "col", header: "City", label: "City", text: "In {range} look up the warehouse city.", deps: ["wh", "wh.code", "wh.city"], required: LOOK, expect: (x) => s(find(x.T.wh, "code", x.row.wh ?? null)?.city ?? null), formula: "=VLOOKUP(@wh,@@wh.*,2,FALSE)" },
        { kind: "col", header: "IN", label: "IN movements", text: "In {range} total the IN movements of the SKU in that warehouse.", deps: ["sku", "wh", "moves.sku", "moves.wh", "moves.type", "moves.qty"], required: SUMIF_, expect: (x) => mv(x.T, x.row, "IN"), formula: '=SUMIFS(@@moves.qty,@@moves.sku,@sku,@@moves.wh,@wh,@@moves.type,"IN")' },
        { kind: "col", header: "OUT", label: "OUT movements", text: "In {range} total the OUT movements.", deps: ["sku", "wh", "moves.sku", "moves.wh", "moves.type", "moves.qty"], required: SUMIF_, expect: (x) => mv(x.T, x.row, "OUT"), formula: '=SUMIFS(@@moves.qty,@@moves.sku,@sku,@@moves.wh,@wh,@@moves.type,"OUT")' },
        { kind: "col", header: "ADJ", label: "ADJ movements", text: "In {range} total the ADJ (adjustment) movements.", deps: ["sku", "wh", "moves.sku", "moves.wh", "moves.type", "moves.qty"], required: SUMIF_, expect: (x) => mv(x.T, x.row, "ADJ"), formula: '=SUMIFS(@@moves.qty,@@moves.sku,@sku,@@moves.wh,@wh,@@moves.type,"ADJ")' },
        { kind: "col", header: "Projected", label: "Projected stock", text: "In {range} calculate on hand + IN - OUT + ADJ.", deps, expect: (x) => proj(x.T, x.row), formula: "=@onhand+@ans1-@ans2+@ans3" },
        { kind: "col", header: "Flag", label: "Stock flag", text: "In {range} return Negative (below 0), Reorder (below the reorder level) or OK.", deps, required: [["IF", "IFS"]], expect: (x) => flag(x.T, x.row), formula: '=IF(@ans4<0,"Negative",IF(@ans4<@reorder,"Reorder","OK"))' },
        { kind: "cells", title: "Projection summary", text: "In {range} count the Negative lines, count the Reorder lines in Pune and value the positive projected stock at cost.", deps: [...deps, "cost", "wh.code", "wh.city"], cells: [
          { label: "Negative lines", required: CNT, expect: (x) => countWhere(x.T.stock, (r) => flag(x.T, r) === "Negative"), formula: '=COUNTIF(@@ans5,"Negative")' },
          { label: "Reorder lines in Pune", required: CNT, expect: (x) => countWhere(x.T.stock, (r) => flag(x.T, r) === "Reorder" && s(find(x.T.wh, "code", r.wh ?? null)?.city ?? null) === "Pune"), formula: '=COUNTIFS(@@ans0,"Pune",@@ans5,"Reorder")' },
          { label: "Value of positive projected stock", nf: "currency" as const, tolerance: 1e-4, required: [["SUMPRODUCT"]], expect: (x) => x.T.stock.reduce((t, r) => (proj(x.T, r) > 0 ? t + proj(x.T, r) * n(r.cost ?? null) : t), 0), formula: "=SUMPRODUCT((@@ans4>0)*@@ans4*@@cost)" },
        ] },
      ];
    },
  }),
  defineChallenge({
    id: "PC-CS-09", concept: "CS", tier: "Hard", ds: ["DS-HR-EMP", "DS-HR-PAYROLL", "DS-HR-RATINGS", "DS-HR-OVERTIME"], title: "Bonus and overtime review across four HR tables", minutes: 45, skill: "IFERROR lookups, AVERAGEIFS, SUMIFS, ROUND and nested IF over four tables",
    context: "The employee master, payroll, yearly ratings and overtime logs are separate sheets. HR computes overtime pay at 1.5 x the hourly rate (basic / 30 / 8) and a 10% bonus for employees with an average rating of 4 or more.",
    output: "Basic, Average rating, Overtime hours, Overtime pay and Bonus for 60 employees, then totals and gap counts.",
    hints: ["Basic pay: IFERROR(VLOOKUP(id, payroll, 2, FALSE), 0).", "Average rating: IFERROR(AVERAGEIFS(rating, employee, id), \"No rating\").", "Overtime pay = ROUND(basic / 30 / 8 x hours x 1.5, 2).", "Bonus = 10% of the master salary when the rating is a number of at least 4, else 0."],
    explanation: "Each helper column isolates one table, so the final bonus formula only uses cells from the same row. Missing data is turned into 0 or a label before it can cause an error.",
    mistakes: ["Letting #DIV/0! (no ratings) reach the bonus formula", "Mixing basic pay with the master salary", "Comparing a text result with a number"],
    tasks: () => {
      const basic = (T: TT, r: Row) => n(find(T.payroll, "emp", r.id ?? null)?.basic ?? 0);
      const rt = (T: TT, r: Row): number | string => { const rs = T.ratings.filter((q) => eq(q.emp ?? null, r.id ?? null)); return rs.length ? rs.reduce((t, q) => t + n(q.rating ?? null), 0) / rs.length : "No rating"; };
      const oth = (T: TT, r: Row) => sumWhere(T.overtime, (o) => eq(o.emp ?? null, r.id ?? null), "hours");
      const otp = (T: TT, r: Row) => round((basic(T, r) / 30 / 8) * oth(T, r) * 1.5, 2);
      const bonus = (T: TT, r: Row) => { const a = rt(T, r); return typeof a === "number" && a >= 4 ? n(r.salary ?? null) * 0.1 : 0; };
      return [
        { kind: "col", header: "Basic", label: "Basic pay", text: "In {range} look up the basic pay in Payroll, or 0.", deps: ["id", "payroll.emp", "payroll.basic"], nf: "currency", required: [["IFERROR", "IFNA"], ...LOOK], expect: (x) => basic(x.T, x.row), formula: "=IFERROR(VLOOKUP(@id,@@payroll.*,2,FALSE),0)" },
        { kind: "col", header: "Avg rating", label: "Average rating", text: "In {range} average the employee's ratings, or No rating.", deps: ["id", "ratings.emp", "ratings.rating"], required: [["IFERROR", "IFNA"], ["AVERAGEIFS", "AVERAGEIF"]], tolerance: 1e-9, expect: (x) => rt(x.T, x.row), formula: '=IFERROR(AVERAGEIFS(@@ratings.rating,@@ratings.emp,@id),"No rating")' },
        { kind: "col", header: "OT hours", label: "Overtime hours", text: "In {range} total the employee's overtime hours.", deps: ["id", "overtime.emp", "overtime.hours"], required: SUMIF_, expect: (x) => oth(x.T, x.row), formula: "=SUMIFS(@@overtime.hours,@@overtime.emp,@id)" },
        { kind: "col", header: "OT pay", label: "Overtime pay", text: "In {range} calculate basic / 30 / 8 x overtime hours x 1.5, rounded to 2 decimals.", deps: ["id", "payroll.emp", "payroll.basic", "overtime.emp", "overtime.hours"], nf: "currency", required: [["ROUND"]], tolerance: 1e-9, expect: (x) => otp(x.T, x.row), formula: "=ROUND(@ans0/30/8*@ans2*1.5,2)" },
        { kind: "col", header: "Bonus", label: "Bonus", text: "In {range} return 10% of the salary when the average rating is a number of at least 4, otherwise 0.", deps: ["id", "salary", "ratings.emp", "ratings.rating"], nf: "currency", required: [["IF", "IFS"]], tolerance: 1e-6, expect: (x) => bonus(x.T, x.row), formula: "=IF(ISNUMBER(@ans1),IF(@ans1>=4,@salary*0.1,0),0)" },
        { kind: "cells", title: "HR review", text: "In {range} total the overtime pay and bonuses, and count employees with no rating and with no payroll record.", deps: ["id", "salary", "payroll.emp", "payroll.basic", "ratings.emp", "ratings.rating", "overtime.emp", "overtime.hours"], cells: [
          { label: "Total overtime pay", nf: "currency" as const, tolerance: 1e-4, required: [["SUM"]], expect: (x) => x.T.emp.reduce((t, r) => t + otp(x.T, r), 0), formula: "=SUM(@@ans3)" },
          { label: "Total bonus", nf: "currency" as const, tolerance: 1e-4, required: [["SUM"]], expect: (x) => x.T.emp.reduce((t, r) => t + bonus(x.T, r), 0), formula: "=SUM(@@ans4)" },
          { label: "Employees with no rating", required: CNT, expect: (x) => countWhere(x.T.emp, (r) => rt(x.T, r) === "No rating"), formula: '=COUNTIF(@@ans1,"No rating")' },
          { label: "Employees with no payroll record", required: CNT, expect: (x) => countWhere(x.T.emp, (r) => !find(x.T.payroll, "emp", r.id ?? null)), formula: "=COUNTIF(@@ans0,0)" },
        ] },
      ];
    },
  }),
  defineChallenge({
    id: "PC-CS-10", concept: "CS", tier: "Hard", ds: ["DS-SAL-TXN", "DS-SAL-PRODUCTS", "DS-SAL-REGTARGET"], title: "Regional target achievement from 1,500 transactions", minutes: 45, skill: "Derived quarter, lookup, SUMIFS on derived columns, achievement ratios",
    context: "Transactions have only a date and a product ID. To compare sales with the regional quarterly targets, every transaction needs a category and a quarter.",
    output: "Category and Quarter for 1,500 transactions, then achievement % (sales / target) per region for Q1, West in Q2 and the Electronics share of West Q1 sales.",
    hints: ["Category: look up the product on the Products sheet (3rd column).", "Quarter: \"Q\"&ROUNDUP(MONTH(date)/3,0).", "Sales by region and quarter: SUMIFS(amount, region, r, quarter, \"Q1\").", "Target: INDEX(Targets column, MATCH(region, Targets regions, 0)); achievement = sales / target."],
    explanation: "Derived helper columns (category and quarter) make the aggregation possible. The target is read from the Targets sheet by matching the region.",
    mistakes: ["Using calendar year instead of quarter in SUMIFS", "Reading the wrong quarter column of the targets", "Dividing the target by the sales"],
    tasks: () => {
      const cat = (T: TT, r: Row) => s(find(T.products, "id", r.product ?? null)?.cat ?? null);
      const qv = (r: Row) => { const m = new Date(Date.UTC(1899, 11, 30) + n(r.date ?? null) * 86400000).getUTCMonth() + 1; return `Q${Math.ceil(m / 3)}`; };
      const sales = (T: TT, rg: string, qt: string) => sumWhere(T.txn, (r) => eq(r.region ?? null, rg) && qv(r) === qt, "amount");
      const target = (T: TT, rg: string, qt: string) => n(find(T.regtarget, "region", rg)?.[qt.toLowerCase()] ?? null);
      const deps = ["date", "region", "amount", "regtarget.region", "regtarget.q1", "regtarget.q2"];
      return [
        { kind: "col", header: "Category", label: "Category", text: "In {range} look up each transaction's product category.", deps: ["product", "products.id", "products.cat"], required: LOOK, expect: (x) => cat(x.T, x.row), formula: "=VLOOKUP(@product,@@products.*,3,FALSE)" },
        { kind: "col", header: "Quarter", label: "Quarter", text: "In {range} return Q1 to Q4 from the transaction date.", deps: ["date"], required: [["MONTH"], ["ROUNDUP", "CEILING", "INT", "CHOOSE"]], expect: (x) => qv(x.row), formula: '="Q"&ROUNDUP(MONTH(@date)/3,0)' },
        { kind: "cells", title: "Target achievement", text: "In {range} give the achievement % (sales / regional target) of each region in Q1, the achievement % of West in Q2 and the Electronics share of West sales in Q1.", deps: [...deps, "product", "products.id", "products.cat"], cells: [
          ...["North", "South", "East", "West"].map((rg) => ({ label: `Q1 achievement: ${rg}`, nf: "percent" as const, tolerance: 1e-9, required: [["SUMIFS", "SUMPRODUCT"], ["INDEX", "VLOOKUP", "XLOOKUP"]], expect: (x: { T: TT }) => sales(x.T, rg, "Q1") / target(x.T, rg, "Q1"), formula: `=SUMIFS(@@amount,@@region,"${rg}",@@ans1,"Q1")/INDEX(@@regtarget.q1,MATCH("${rg}",@@regtarget.region,0))` })),
          { label: "Q2 achievement: West", nf: "percent" as const, tolerance: 1e-9, required: [["SUMIFS", "SUMPRODUCT"], ["INDEX", "VLOOKUP", "XLOOKUP"]], expect: (x) => sales(x.T, "West", "Q2") / target(x.T, "West", "Q2"), formula: '=SUMIFS(@@amount,@@region,"West",@@ans1,"Q2")/INDEX(@@regtarget.q2,MATCH("West",@@regtarget.region,0))' },
          { label: "Electronics share of West Q1 sales", nf: "percent" as const, tolerance: 1e-9, required: [["SUMIFS", "SUMPRODUCT"]], expect: (x) => x.T.txn.reduce((t, r) => (eq(r.region ?? null, "West") && qv(r) === "Q1" && cat(x.T, r) === "Electronics" ? t + n(r.amount ?? null) : t), 0) / sales(x.T, "West", "Q1"), formula: '=SUMIFS(@@amount,@@region,"West",@@ans0,"Electronics",@@ans1,"Q1")/SUMIFS(@@amount,@@region,"West",@@ans1,"Q1")' },
        ] },
      ];
    },
  }),
];

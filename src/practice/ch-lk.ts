import { defineChallenge } from "./build";
import { eq, find, n, s } from "./h";

const LOOKUPS = [["VLOOKUP", "XLOOKUP", "INDEX"]];

export const LK = [
  defineChallenge({
    id: "PC-LK-01", concept: "LK", tier: "Easy", ds: ["DS-SAL-PRODUCTS"], title: "Price from a product catalogue", minutes: 8, skill: "VLOOKUP, exact match",
    context: "A shop assistant types a product ID at the till and needs the unit price straight away.",
    output: "A Unit price for each of the six listed product IDs, found with a lookup formula.",
    hints: ["The Product ID is the first column of the catalogue, so VLOOKUP can find it. Unit price is the 4th column of A:E.", "The last argument must be FALSE for an exact match, and the table range should be locked with $."],
    explanation: "VLOOKUP(id, table, 4, FALSE) searches the first column for the exact ID and returns the 4th column (Unit price).",
    mistakes: ["Leaving out FALSE (approximate match)", "Not locking the table with $", "Counting the wrong column number"],
    tasks: (c) => [{
      kind: "panel", title: "Price lookup", text: "In {range} look up the Unit price for every Product ID listed in {in}.", deps: ["id", "price"],
      inputs: [{ header: "Product ID", values: c.pick("products", 6).map((i) => c.v("products", "id", i)) }],
      answers: [{ header: "Unit price", label: "Unit price", nf: "currency", required: LOOKUPS, expect: (x) => find(x.T.products, "id", x.in[0])?.price ?? null, formula: "=VLOOKUP(@in0,@@*,4,FALSE)" }],
    }],
  }),
  defineChallenge({
    id: "PC-LK-02", concept: "LK", tier: "Easy", ds: ["DS-HR-DIRECTORY"], title: "Department from an employee ID", minutes: 8, skill: "INDEX and MATCH",
    context: "The front desk gets a call about an employee ID and must say which department it belongs to.",
    output: "A Department and a Location for each of the five listed employee IDs, using INDEX with MATCH.",
    hints: ["MATCH finds the position of the ID in the Employee ID column. INDEX then returns the value at that position from another column.", "Use match type 0 for an exact match."],
    explanation: "MATCH(id, A2:A16, 0) gives the row position; INDEX(C2:C16, position) returns the department from the same position.",
    mistakes: ["Using ranges of different sizes in INDEX and MATCH", "Forgetting the 0 in MATCH", "Pointing INDEX at the wrong column"],
    tasks: (c) => [{
      kind: "panel", title: "Directory lookup", text: "In {ranges} find the Department and the Location of each Employee ID listed in {in}. Use INDEX together with MATCH.", deps: ["id", "dept", "loc"],
      inputs: [{ header: "Employee ID", values: c.pick("dir", 5).map((i) => c.v("dir", "id", i)) }],
      answers: [
        { header: "Department", label: "Department", required: [["INDEX"], ["MATCH"]], expect: (x) => s(find(x.T.dir, "id", x.in[0])?.dept ?? null), formula: "=INDEX(@@dept,MATCH(@in0,@@id,0))" },
        { header: "Location", label: "Location", required: [["INDEX"], ["MATCH"]], expect: (x) => s(find(x.T.dir, "id", x.in[0])?.loc ?? null), formula: "=INDEX(@@loc,MATCH(@in0,@@id,0))" },
      ],
    }],
  }),
  defineChallenge({
    id: "PC-LK-03", concept: "LK", tier: "Easy", ds: ["DS-EDU-MARKS"], title: "Student grade from a roll number", minutes: 8, skill: "XLOOKUP",
    context: "A teacher answers a parent's question using only the child's roll number.",
    output: "The student's name, Maths marks and grade for each listed roll number, using XLOOKUP.",
    hints: ["XLOOKUP(what to find, where to look, what to return) needs no column numbers.", "The lookup range and the return range must have the same number of rows."],
    explanation: "XLOOKUP(roll, A2:A21, B2:B21) finds the roll in column A and returns the matching cell from the return column. Change the return range to get another field.",
    mistakes: ["Return range shorter or longer than the lookup range", "Mixing up the lookup range and the return range", "Unlocked ranges when filling down"],
    tasks: (c) => [{
      kind: "panel", title: "Student lookup", text: "In {ranges} return each student's name, Maths marks and Grade for the roll numbers in {in}. Use XLOOKUP.", deps: ["roll", "name", "maths", "grade"],
      inputs: [{ header: "Roll No", values: c.pick("marks", 5).map((i) => c.v("marks", "roll", i)) }],
      answers: [
        { header: "Student", label: "Student name", required: [["XLOOKUP"]], expect: (x) => s(find(x.T.marks, "roll", x.in[0])?.name ?? null), formula: "=XLOOKUP(@in0,@@roll,@@name)" },
        { header: "Maths", label: "Maths marks", required: [["XLOOKUP"]], expect: (x) => find(x.T.marks, "roll", x.in[0])?.maths ?? null, formula: "=XLOOKUP(@in0,@@roll,@@maths)" },
        { header: "Grade", label: "Grade", required: [["XLOOKUP"]], expect: (x) => s(find(x.T.marks, "roll", x.in[0])?.grade ?? null), formula: "=XLOOKUP(@in0,@@roll,@@grade)" },
      ],
    }],
  }),
  defineChallenge({
    id: "PC-LK-04", concept: "LK", tier: "Easy", ds: ["DS-INV-SUPPLIERS"], title: "Supplier category with a safe fallback", minutes: 10, skill: "VLOOKUP with IFERROR",
    context: "The purchasing desk pastes supplier codes from emails. Some codes are mistyped and are not in the catalogue.",
    output: "A category for each listed code, or the text Unknown supplier when the code does not exist.",
    hints: ["A code that is not in the table makes VLOOKUP return #N/A.", "Wrap the lookup in IFERROR(lookup, \"Unknown supplier\")."],
    explanation: "IFERROR(VLOOKUP(code, table, 3, FALSE), \"Unknown supplier\") returns the category when found and the fallback text when VLOOKUP gives #N/A.",
    mistakes: ["Hiding every error instead of only the missing key (IFERROR also hides wrong column numbers)", "Typing the fallback without quotes", "Forgetting FALSE"],
    tasks: (c) => [{
      kind: "panel", title: "Supplier category", text: "In {range} return the Category of every supplier code in {in}; if a code is not in the catalogue show Unknown supplier.", deps: ["code", "cat"],
      inputs: [{ header: "Supplier code", values: [...c.pick("suppliers", 4).map((i) => c.v("suppliers", "code", i)), "S99", "S00"] }],
      answers: [{ header: "Category", label: "Category", required: [["VLOOKUP", "XLOOKUP", "INDEX"], ["IFERROR", "IFNA"]], expect: (x) => s(find(x.T.suppliers, "code", x.in[0])?.cat ?? "Unknown supplier"), formula: '=IFERROR(VLOOKUP(@in0,@@*,3,FALSE),"Unknown supplier")' }],
    }],
  }),
  defineChallenge({
    id: "PC-LK-05", concept: "LK", tier: "Medium", ds: ["DS-SAL-ORDERS", "DS-SAL-PRODUCTS"], title: "Price every order line", minutes: 15, skill: "Lookup across two sheets, then multiply",
    context: "The Orders sheet only stores a Product ID and a quantity. Finance needs the price and the value of each line.",
    output: "Unit price (from the Products sheet) and Line total for all 150 orders.",
    hints: ["Look up the Product ID of each order in the catalogue on the Products sheet; the table is Products!$A$2:$E$26.", "Line total is Qty times the price you just found; point to your price column instead of typing numbers."],
    explanation: "VLOOKUP(product, Products!$A$2:$E$26, 4, FALSE) reads the catalogue price; multiplying by Qty gives the line total.",
    mistakes: ["Forgetting the sheet name before the table range", "Unlocked table range drifting while filling down", "Multiplying by the wrong column"],
    tasks: () => [
      { kind: "col", header: "Unit price", label: "Unit price", text: "In {range} look up the Unit price of each order's Product ID on the Products sheet.", deps: ["product", "products.id", "products.price"], nf: "currency", required: LOOKUPS, expect: (x) => n(find(x.T.products, "id", x.row.product ?? null)?.price ?? null), formula: "=VLOOKUP(@product,@@products.*,4,FALSE)" },
      { kind: "col", header: "Line total", label: "Line total", text: "In {range} calculate Qty x Unit price for each order line.", deps: ["qty", "product", "products.id", "products.price"], nf: "currency", expect: (x) => n(x.row.qty ?? null) * n(find(x.T.products, "id", x.row.product ?? null)?.price ?? null), formula: "=@qty*@ans0" },
    ],
  }),
  defineChallenge({
    id: "PC-LK-06", concept: "LK", tier: "Medium", ds: ["DS-SAL-REPS", "DS-SAL-REGTARGET"], title: "Rep achievement against the regional target", minutes: 20, skill: "Two-way INDEX/MATCH, COUNTIFS, ratio",
    context: "Each region has a quarterly target (Targets sheet). Reps in a region share it equally. Management wants each rep's achievement of their share.",
    output: "Region target, number of reps in that region and quarter, and Achievement % (sales / share) for all 32 rows.",
    hints: ["Find the region's row with MATCH(region, Targets!$A$2:$A$5, 0) and the quarter's column with MATCH(quarter, Targets!$B$1:$E$1, 0), then INDEX into Targets!$B$2:$E$5.", "COUNTIFS counts the rows with the same region and the same quarter.", "Achievement = Sales / (target / reps)."],
    explanation: "The two-way lookup returns the regional quarterly target; COUNTIFS returns how many reps share it; Sales divided by the per-rep share is the achievement.",
    mistakes: ["Matching the quarter against the wrong header range", "Counting reps by region only (not by quarter too)", "Dividing the share by the sales instead of the sales by the share"],
    tasks: () => [
      { kind: "col", header: "Region target", label: "Region target", text: "In {range} return the target for the rep's region and quarter from the Targets sheet.", deps: ["region", "quarter", "regtarget.region", "regtarget.q1", "regtarget.q2", "regtarget.q3", "regtarget.q4"], nf: "currency", required: [["INDEX"], ["MATCH"]], expect: (x) => n(find(x.T.regtarget, "region", x.row.region ?? null)?.[s(x.row.quarter ?? null).toLowerCase()] ?? null), formula: "=INDEX(Targets!$B$2:$E$5,MATCH(@region,Targets!$A$2:$A$5,0),MATCH(@quarter,Targets!$B$1:$E$1,0))" },
      { kind: "col", header: "Reps in region", label: "Reps in region", text: "In {range} count the reps who have the same region and the same quarter (including this one).", deps: ["region", "quarter"], required: [["COUNTIFS"]], expect: (x) => x.T.reps.filter((r) => eq(r.region ?? null, x.row.region ?? null) && eq(r.quarter ?? null, x.row.quarter ?? null)).length, formula: "=COUNTIFS(@@region,@region,@@quarter,@quarter)" },
      { kind: "col", header: "Achievement %", label: "Achievement %", text: "In {range} calculate Sales divided by the rep's equal share of the target (target / reps).", deps: ["sales", "region", "quarter", "regtarget.q1", "regtarget.q2", "regtarget.q3", "regtarget.q4"], nf: "percent", tolerance: 1e-9, expect: (x) => { const t = n(find(x.T.regtarget, "region", x.row.region ?? null)?.[s(x.row.quarter ?? null).toLowerCase()] ?? null); const k = x.T.reps.filter((r) => eq(r.region ?? null, x.row.region ?? null) && eq(r.quarter ?? null, x.row.quarter ?? null)).length; return n(x.row.sales ?? null) / (t / k); }, formula: "=@sales/(@ans0/@ans1)" },
    ],
  }),
  defineChallenge({
    id: "PC-LK-07", concept: "LK", tier: "Medium", ds: ["DS-INV-STOCK", "DS-INV-WAREHOUSES"], title: "Warehouse city and capacity for every stock line", minutes: 15, skill: "VLOOKUP and XLOOKUP across tables",
    context: "The stock sheet only has a warehouse code. The logistics team wants the city and the warehouse capacity next to each line.",
    output: "City and Capacity (pallets) for all 75 stock lines, taken from the Warehouses sheet.",
    hints: ["The warehouse code is the first column of the Warehouses table, so a VLOOKUP works for the city (column 2).", "For the capacity try XLOOKUP(code, Warehouses!$A$2:$A$6, Warehouses!$D$2:$D$6)."],
    explanation: "Each stock line carries a warehouse code. The code is looked up on the Warehouses sheet, returning the City (2nd column) and Capacity (4th column).",
    mistakes: ["Unlocked table ranges", "Return range of a different size to the lookup range in XLOOKUP", "Using the product ID as the lookup key"],
    tasks: () => [
      { kind: "col", header: "City", label: "Warehouse city", text: "In {range} return the City of each line's warehouse.", deps: ["wh", "wh.code", "wh.city"], required: LOOKUPS, expect: (x) => s(find(x.T.wh, "code", x.row.wh ?? null)?.city ?? null), formula: "=VLOOKUP(@wh,@@wh.*,2,FALSE)" },
      { kind: "col", header: "Capacity", label: "Warehouse capacity", text: "In {range} return the Capacity (pallets) of each line's warehouse using XLOOKUP.", deps: ["wh", "wh.code", "wh.capacity"], required: [["XLOOKUP"]], expect: (x) => find(x.T.wh, "code", x.row.wh ?? null)?.capacity ?? null, formula: "=XLOOKUP(@wh,@@wh.code,@@wh.capacity)" },
    ],
  }),
  defineChallenge({
    id: "PC-LK-08", concept: "LK", tier: "Hard", ds: ["DS-MSY-KEYREQ", "DS-MSY-KEYMASTER"], title: "Lookups that fail because of broken keys", minutes: 25, skill: "Clean the key, then look up with a fallback",
    context: "Requests quote an account key as people type it: 7, 0007, ' 0007 ' or an unknown key. The master stores TEXT keys with leading zeros (0001 to 0040), so a plain lookup of 7 fails.",
    output: "A cleaned 4-digit text key, the account name and the tier for each of the 100 requests, or Not found when the key does not exist.",
    hints: ["Repair the key first: TRIM removes spaces; joining \"0000\" in front and taking the RIGHT 4 characters restores the leading zeros.", "Look up the repaired key (column C) in the master table, wrapped in IFERROR so unknown keys read Not found."],
    explanation: "RIGHT(\"0000\"&TRIM(key),4) turns 7, 0007 and ' 0007 ' into the text 0007. The repaired key is then looked up with VLOOKUP exact match inside IFERROR so unmatched requests say Not found.",
    mistakes: ["Looking up the raw key (a number never equals the text 0007)", "Trimming but not restoring the zeros", "Using approximate match", "Letting #N/A show for unknown keys"],
    tasks: () => [
      { kind: "col", header: "Clean key", label: "Clean key", text: "In {range} build a clean 4-character text key from the key as typed (remove spaces and restore leading zeros).", deps: ["key"], required: [["RIGHT", "TEXT"]], expect: (x) => s(x.row.key ?? null).trim().padStart(4, "0"), formula: '=RIGHT("0000"&TRIM(@key),4)' },
      { kind: "col", header: "Account", label: "Account name", text: "In {range} return the account name for the clean key; show Not found when it is not in the master.", deps: ["key", "keymaster.key", "keymaster.name"], required: [LOOKUPS[0], ["IFERROR", "IFNA"]], expect: (x) => s(find(x.T.keymaster, "key", s(x.row.key ?? null).trim().padStart(4, "0"))?.name ?? "Not found"), formula: '=IFERROR(VLOOKUP(@ans0,@@keymaster.*,2,FALSE),"Not found")' },
      { kind: "col", header: "Tier", label: "Tier", text: "In {range} return the tier for the clean key; show Not found when it is not in the master.", deps: ["key", "keymaster.key", "keymaster.tier"], required: [LOOKUPS[0], ["IFERROR", "IFNA"]], expect: (x) => s(find(x.T.keymaster, "key", s(x.row.key ?? null).trim().padStart(4, "0"))?.tier ?? "Not found"), formula: '=IFERROR(VLOOKUP(@ans0,@@keymaster.*,3,FALSE),"Not found")' },
    ],
  }),
  defineChallenge({
    id: "PC-LK-09", concept: "LK", tier: "Medium", ds: ["DS-HR-PAYROLL", "DS-FIN-TAXSLAB"], title: "Tax from an income slab (approximate match)", minutes: 15, skill: "VLOOKUP with TRUE on a sorted table",
    context: "Each employee's annual income falls into a slab. The slab table lists where each rate starts (illustrative rates only).",
    output: "Annual income, slab rate and annual tax for all 40 employees.",
    hints: ["Annual income = Basic pay x (1 + Allowance %) x 12.", "The Slabs sheet is sorted ascending, so VLOOKUP(income, Slabs!$A$2:$B$6, 2, TRUE) returns the last slab that starts at or below the income.", "Annual tax = Annual income x slab rate."],
    explanation: "An approximate-match lookup (TRUE) on a sorted table returns the rate of the highest 'income from' value that does not exceed the income.",
    mistakes: ["Using FALSE (exact match) so most incomes are not found", "Unsorted slab table", "Locking the wrong cells"],
    tasks: () => [
      { kind: "col", header: "Annual income", label: "Annual income", text: "In {range} calculate Basic pay x (1 + Allowance %) x 12.", deps: ["basic", "allow"], nf: "currency", expect: (x) => n(x.row.basic ?? null) * (1 + n(x.row.allow ?? null)) * 12, formula: "=@basic*(1+@allow)*12" },
      { kind: "col", header: "Slab rate", label: "Slab rate", text: "In {range} look up the slab rate for the annual income with an approximate match.", deps: ["basic", "allow"], nf: "percent", required: [["VLOOKUP", "XLOOKUP", "INDEX", "LOOKUP"]], expect: (x) => { const inc = n(x.row.basic ?? null) * (1 + n(x.row.allow ?? null)) * 12; const hit = [...x.T.taxslab].filter((r) => n(r.from ?? null) <= inc).pop(); return n(hit?.rate ?? null); }, formula: "=VLOOKUP(@ans0,@@taxslab.*,2,TRUE)" },
      { kind: "col", header: "Annual tax", label: "Annual tax", text: "In {range} calculate Annual income x Slab rate.", deps: ["basic", "allow"], nf: "currency", expect: (x) => { const inc = n(x.row.basic ?? null) * (1 + n(x.row.allow ?? null)) * 12; const hit = [...x.T.taxslab].filter((r) => n(r.from ?? null) <= inc).pop(); return inc * n(hit?.rate ?? null); }, formula: "=@ans0*@ans1" },
    ],
  }),
  defineChallenge({
    id: "PC-LK-10", concept: "LK", tier: "Medium", ds: ["DS-SAL-REGTARGET"], title: "Two-way lookup: region and quarter", minutes: 12, skill: "INDEX with two MATCH functions",
    context: "A manager asks for the target of a given region in a given quarter. The answer sits where a row and a column meet.",
    output: "The target for each of the six region and quarter requests.",
    hints: ["MATCH(region, A2:A5, 0) gives the row; MATCH(quarter, B1:E1, 0) gives the column.", "INDEX(B2:E5, row, column) returns the cell where they meet."],
    explanation: "INDEX(B2:E5, MATCH(region, A2:A5, 0), MATCH(quarter, B1:E1, 0)) picks the single cell at the crossing of the matched row and column.",
    mistakes: ["Swapping the row and column arguments", "Matching against a range that includes the headers twice", "Missing the 0 for exact match"],
    tasks: (c) => {
      const picks = [0, 1, 2, 3, 1, 2].map((r, k) => ({ r: c.v("regtarget", "region", r), q: ["Q1", "Q2", "Q3", "Q4", "Q4", "Q1"][k] }));
      return [{
        kind: "panel", title: "Target lookup", text: "In {range} return the target for each Region and Quarter pair listed to its left.", deps: ["region", "q1", "q2", "q3", "q4"],
        inputs: [{ header: "Region", values: picks.map((p) => p.r) }, { header: "Quarter", values: picks.map((p) => p.q) }],
        answers: [{ header: "Target", label: "Target", nf: "currency", required: [["INDEX"], ["MATCH"]], expect: (x) => find(x.T.regtarget, "region", x.in[0])?.[s(x.in[1]).toLowerCase()] ?? null, formula: "=INDEX($B$2:$E$5,MATCH(@in0,$A$2:$A$5,0),MATCH(@in1,$B$1:$E$1,0))" }],
      }];
    },
  }),
  defineChallenge({
    id: "PC-LK-11", concept: "LK", tier: "Medium", ds: ["DS-HR-EMP", "DS-HR-ATTEND"], title: "Latest attendance record, or No record", minutes: 15, skill: "XLOOKUP with if_not_found and search from the end",
    context: "Attendance has two monthly rows per employee, and some new joiners have none. HR wants the most recent month's figures next to each employee.",
    output: "Leave taken and Days present from each employee's latest attendance row, or No record when there is none.",
    hints: ["XLOOKUP's 4th argument is the text to show when nothing is found.", "Its 6th argument, search_mode -1, searches from the bottom, so you get the latest of the two rows.", "XLOOKUP(id, ids, values, \"No record\", 0, -1)."],
    explanation: "XLOOKUP(@id, Attendance!emp, Attendance!leave, \"No record\", 0, -1) searches the attendance rows from last to first, so the September row wins over August, and employees with no rows show the fallback.",
    mistakes: ["Omitting the fallback so #N/A shows", "Searching first-to-last (returns the older month)", "Return range of a different size"],
    tasks: () => {
      const latest = (x: { T: Record<string, import("./types").Row[]>; row: import("./types").Row }) => [...x.T.hrattend].reverse().find((r) => eq(r.emp ?? null, x.row.id ?? null));
      return [
        { kind: "col", header: "Latest leave", label: "Latest leave taken", text: "In {range} return the Leave taken from the employee's latest attendance row, or No record.", deps: ["id", "hrattend.emp", "hrattend.leave"], required: [["XLOOKUP"]], expect: (x) => latest(x)?.leave ?? "No record", formula: '=XLOOKUP(@id,@@hrattend.emp,@@hrattend.leave,"No record",0,-1)' },
        { kind: "col", header: "Latest days present", label: "Latest days present", text: "In {range} return Days present from the same latest row, or No record.", deps: ["id", "hrattend.emp", "hrattend.present"], required: [["XLOOKUP"]], expect: (x) => latest(x)?.present ?? "No record", formula: '=XLOOKUP(@id,@@hrattend.emp,@@hrattend.present,"No record",0,-1)' },
      ];
    },
  }),
  defineChallenge({
    id: "PC-LK-12", concept: "LK", tier: "Hard", ds: ["DS-SAL-ORDERS", "DS-SAL-CUSTOMERS", "DS-SAL-PRODUCTS"], title: "Revenue by customer city from three tables", minutes: 30, skill: "Two lookups, a calculation and SUMIFS",
    context: "Orders hold only IDs. To report revenue by customer city you need the customer's city (Customers sheet) and the product price (Products sheet), then a total of delivered orders.",
    output: "City, Unit price and Revenue for 150 orders, then delivered revenue for Pune, Kochi and in total.",
    hints: ["Build the helper columns first: City from Customers, Unit price from Products, Revenue = Qty x price.", "SUMIFS(revenue column, city column, \"Pune\", status column, \"Delivered\") totals one city.", "The total is SUMIFS on status alone."],
    explanation: "Three tables are connected by ID columns: Orders.Customer ID to Customers, Orders.Product ID to Products. Once each order row has a city and a revenue, SUMIFS aggregates them by city and status.",
    mistakes: ["Looking up the customer in the Products sheet", "Summing revenue of cancelled and pending orders", "Typing the city instead of using the City column", "Forgetting to lock lookup ranges"],
    tasks: () => {
      const city = (x: { T: Record<string, import("./types").Row[]>; row: import("./types").Row }) => s(find(x.T.customers, "id", x.row.cust ?? null)?.city ?? null);
      const rev = (x: { T: Record<string, import("./types").Row[]>; row: import("./types").Row }) => n(x.row.qty ?? null) * n(find(x.T.products, "id", x.row.product ?? null)?.price ?? null);
      const total = (x: { T: Record<string, import("./types").Row[]> }, c?: string) => x.T.orders.reduce((t, r) => (eq(r.status ?? null, "Delivered") && (c === undefined || eq(s(find(x.T.customers, "id", r.cust ?? null)?.city ?? null), c)) ? t + n(r.qty ?? null) * n(find(x.T.products, "id", r.product ?? null)?.price ?? null) : t), 0);
      return [
        { kind: "col", header: "City", label: "Customer city", text: "In {range} return the customer's City from the Customers sheet.", deps: ["cust", "customers.id", "customers.city"], required: LOOKUPS, expect: (x) => city(x), formula: "=VLOOKUP(@cust,@@customers.*,3,FALSE)" },
        { kind: "col", header: "Unit price", label: "Unit price", text: "In {range} return the Unit price from the Products sheet.", deps: ["product", "products.id", "products.price"], nf: "currency", required: LOOKUPS, expect: (x) => n(find(x.T.products, "id", x.row.product ?? null)?.price ?? null), formula: "=VLOOKUP(@product,@@products.*,4,FALSE)" },
        { kind: "col", header: "Revenue", label: "Revenue", text: "In {range} calculate Qty x Unit price.", deps: ["qty", "product", "products.id", "products.price"], nf: "currency", expect: (x) => rev(x), formula: "=@qty*@ans1" },
        { kind: "cells", title: "City revenue", text: "In {range} total the Revenue of delivered orders: first for customers in Pune, then Kochi, then all cities.", deps: ["cust", "qty", "product", "status", "customers.id", "customers.city", "products.id", "products.price"], cells: [
          { label: "Delivered revenue: Pune", nf: "currency", required: [["SUMIFS"]], expect: (x) => total(x, "Pune"), formula: '=SUMIFS(@@ans2,@@ans0,"Pune",@@status,"Delivered")' },
          { label: "Delivered revenue: Kochi", nf: "currency", required: [["SUMIFS"]], expect: (x) => total(x, "Kochi"), formula: '=SUMIFS(@@ans2,@@ans0,"Kochi",@@status,"Delivered")' },
          { label: "Delivered revenue: all cities", nf: "currency", required: [["SUMIFS"]], expect: (x) => total(x), formula: '=SUMIFS(@@ans2,@@status,"Delivered")' },
        ] },
      ];
    },
  }),
];

import { copySource, grid, sheetOf, workbookOf } from "../data/source";
import type { Scalar, WorkbookData } from "../engine/types";
import type { Exercise, InputReader } from "../learning/types";
import { ROUND2, col, fillDown, mergeCells, mk, widths } from "./helpers";

export const VL = "Vlookup ";

type CatRow = { id: string; name: string; cat: string; price: number; supplier: string };
function catalog(r: InputReader): Map<string, CatRow> {
  const m = new Map<string, CatRow>();
  for (const [id, name, cat, price, supplier] of r.range(VL, "B3:F62")) m.set(String(id), { id: String(id), name: String(name), cat: String(cat), price: price as number, supplier: String(supplier) });
  return m;
}


/** Source catalogue (B2:F62) + Section A headers/IDs/quantities (J2:O2, J3:J20, N3:N20), at the instructor's addresses. */
function vlSectionA(): WorkbookData {
  const s = copySource(VL, "B2:F62");
  copySource(VL, "J2:O2", { into: s });
  copySource(VL, "J3:J20", { into: s });
  copySource(VL, "N3:N20", { into: s });
  widths(s, { B: 70, C: 190, D: 100, E: 80, F: 150, J: 80, K: 200, L: 120, M: 130, N: 80, O: 100 });
  return workbookOf(s);
}
function vlSectionB(): WorkbookData {
  const s = copySource(VL, "B2:F62");
  copySource(VL, "S2:W17", { into: s });
  widths(s, { B: 70, C: 190, D: 100, E: 80, F: 150, S: 80, T: 200, U: 120, V: 130, W: 80 });
  return workbookOf(s);
}
function vlSectionC(): WorkbookData {
  const s = copySource(VL, "B2:F62");
  copySource(VL, "Y2:AC17", { into: s });
  widths(s, { B: 70, C: 190, D: 100, E: 80, F: 150, Y: 80, Z: 200, AA: 120, AB: 150, AC: 80 });
  return workbookOf(s);
}
const TABLE = "$B$3:$F$62";

const lookupMatrix = (r: InputReader, ids: string, fields: ((c: CatRow) => Scalar)[]): Scalar[][] => {
  const c = catalog(r);
  return col(r, VL, ids).map((id) => fields.map((f) => f(c.get(String(id))!)));
};
const FN = { name: (c: CatRow) => c.name, cat: (c: CatRow) => c.cat, price: (c: CatRow) => c.price };

/* ---------------- generated datasets used in mastery exercises ---------------- */
const stockSheet = () =>
  workbookOf(
    widths(
      sheetOf("Stock", {
        ...grid("A1", [["SKU", "Price", "Supplier", "Item", "Category"]]),
        ...grid("A2", [
          ["SK-101", 120, "Orbit Co", "Desk Lamp", "Home"],
          ["SK-102", 45.5, "Nimbus Ltd", "Notebook", "Stationery"],
          ["SK-103", 310, "Orbit Co", "Office Chair", "Furniture"],
          ["SK-104", 18.25, "Pixel Supply", "Pen Pack", "Stationery"],
          ["SK-105", 999, "Nimbus Ltd", "Monitor Stand", "Electronics"],
          ["SK-106", 75, "Pixel Supply", "Mouse Pad", "Electronics"],
          ["SK-107", 260, "Orbit Co", "Bookshelf", "Furniture"],
          ["SK-108", 12, "Nimbus Ltd", "Sticky Notes", "Stationery"],
        ]),
        ...grid("H1", [["Order SKU", "Item", "Price"]]),
        ...grid("H2", [["SK-103"], ["sk-104"], ["SK-108"], ["SK-101"], ["SK-106"]]),
      }),
      { A: 70, B: 70, C: 110, D: 130, E: 110, H: 90, I: 130, J: 80 },
    ),
  );


/* ----------------------------- L-VL-1: VLOOKUP exact ----------------------------- */
const VL1: Exercise[] = [
  mk({
    id: "EX-VL-1-1", lessonId: "L-VL-1", kind: "guided", origin: "source", conceptIds: ["C-VL-A", "C-VL-B", "C-VL-C", "C-VL-D", "C-VL-E", "C-VL-I"],
    title: "Find one product name with VLOOKUP",
    objective: "Write your first exact-match VLOOKUP that returns a product name from the catalogue.",
    datasetNote: "Catalogue B2:F62 and the Section A lookup list J3:J20 are copied from the instructor's \"Vlookup \" worksheet at the same cell addresses.",
    scenario: "A shop assistant types a ProductID in column J and the sheet must fill in the product name.",
    instructions: [
      "Look at the catalogue on the left (columns B–F). ProductID is in column B.",
      "Click K3. The ProductID to look up is in J3.",
      "Type a VLOOKUP that returns the ProductName (column 2 of the catalogue) for the ID in J3, using an exact match.",
      "Press Enter, then press Check Answer.",
    ],
    workbook: vlSectionA, activeSheet: VL, editable: ["K3"],
    checks: [{
      type: "formula", label: "Product name for J3", sheet: VL, range: "K3", requiredFunctions: [["VLOOKUP"]],
      expected: (r) => lookupMatrix(r, "J3", [FN.name]), perturb: [{ J3: "P011" }, { J3: "P060" }],
    }],
    hints: [
      "VLOOKUP takes four arguments: what to look for, where to look, which column to return, and whether to match exactly.",
      "What to look for is the ID in J3. Where to look is the whole catalogue B3:F62. ProductName is the 2nd column of B:F.",
      "The last argument should be FALSE so that only an exact ProductID matches.",
      "Final shape: =VLOOKUP(J3, $B$3:$F$62, 2, FALSE)",
    ],
    solution: { explanation: "=VLOOKUP(J3,$B$3:$F$62,2,FALSE) searches the first column of B3:F62 (ProductID) for the value in J3 and returns the value from the 2nd column (ProductName). FALSE forces an exact match.", cells: { K3: `=VLOOKUP(J3,${TABLE},2,FALSE)` } },
  }),
  mk({
    id: "EX-VL-1-2", lessonId: "L-VL-1", kind: "independent", origin: "source", conceptIds: ["C-VL-C", "C-VL-D", "C-VL-E", "C-VL-I", "C-VL-J", "C-VL-K"],
    title: "Name, category and unit price for all 18 lookups",
    objective: "Complete the VLOOKUP product name, category and unit price columns and fill them down safely.",
    datasetNote: "Section A of the instructor's \"Vlookup \" worksheet (J3:J20) with its catalogue (B3:F62).",
    instructions: [
      "Fill K3:K20 with the product name, L3:L20 with the category and M3:M20 with the unit price for each ProductID in column J.",
      "Use VLOOKUP with an exact match. Choose the correct column number for each field.",
      "Make sure the table range does not move when you fill the formula down (lock it with $).",
    ],
    workbook: vlSectionA, activeSheet: VL, editable: ["K3:M20"],
    checks: [{
      type: "formula", label: "Section A lookups (name, category, price)", sheet: VL, range: "K3:M20", requiredFunctions: [["VLOOKUP"]],
      expected: (r) => lookupMatrix(r, "J3:J20", [FN.name, FN.cat, FN.price]), perturb: [{ J3: "P001", J10: "P060", J20: "P033" }],
    }],
    hints: [
      "Only the column number changes between the three formulas: ProductName = 2, Category = 3, UnitPrice = 4.",
      "Press F4 while editing the table reference to add the $ signs: $B$3:$F$62.",
      "After writing the first row, select K3:M3 and drag the fill handle down to row 20.",
    ],
    solution: { explanation: "Each column uses the same lookup key and locked table but a different column index: 2 for ProductName, 3 for Category, 4 for UnitPrice. Locking the table with $ stops it sliding down when filled.", cells: mergeCells(fillDown("K", 3, 20, `=VLOOKUP(J{r},${TABLE},2,FALSE)`), fillDown("L", 3, 20, `=VLOOKUP(J{r},${TABLE},3,FALSE)`), fillDown("M", 3, 20, `=VLOOKUP(J{r},${TABLE},4,FALSE)`)) },
  }),
  mk({
    id: "EX-VL-1-3", lessonId: "L-VL-1", kind: "mastery", origin: "generated", conceptIds: ["C-VL-C", "C-VL-D", "C-VL-E"],
    title: "Fresh catalogue: the lookup column is not first",
    objective: "Apply VLOOKUP to a new catalogue where the key is the first column but the wanted fields are in a different order.",
    datasetNote: "New synthetic stock catalogue (not from the instructor's workbook).",
    scenario: "Orders arrive with an SKU. Fill in the item name and the price. Note that Price comes before Item in this table, and one order SKU is typed in lower case.",
    instructions: ["Fill I2:I6 with the Item and J2:J6 with the Price for each order SKU in column H.", "The table is A1:E9 (header in row 1)."],
    workbook: stockSheet, activeSheet: "Stock", editable: ["I2:J6"],
    checks: [{
      type: "formula", label: "Item and price per order", sheet: "Stock", range: "I2:J6", requiredFunctions: [["VLOOKUP"]],
      expected: (r) => {
        const t = r.range("Stock", "A2:E9");
        return col(r, "Stock", "H2:H6").map((s) => { const row = t.find((x) => String(x[0]).toLowerCase() === String(s).toLowerCase())!; return [row[3], row[1]]; });
      },
      perturb: [{ H2: "SK-107", H4: "SK-102" }],
    }],
    hints: ["Count columns from the first column of your table_array: SKU = 1, Price = 2, Supplier = 3, Item = 4, Category = 5.", "VLOOKUP is not case-sensitive, so \"sk-104\" still matches SK-104."],
    solution: { explanation: "Item is column 4 and Price is column 2 of A2:E9, so use 4 and 2. Lock the table with $.", cells: { ...fillDown("I", 2, 6, "=VLOOKUP(H{r},$A$2:$E$9,4,FALSE)"), ...fillDown("J", 2, 6, "=VLOOKUP(H{r},$A$2:$E$9,2,FALSE)") } },
  }),
];

/* ----------------------------- L-VL-2: approximate match & missing IDs ----------------------------- */
const missingIdsWb = (): WorkbookData => {
  const s = copySource(VL, "B2:F62");
  Object.assign(s.cells, grid("J2", [["ProductID", "Product Name"]]), grid("J3", [["P052"], ["P027"], ["P999"], ["P056"], ["P000"], ["P037"]]));
  widths(s, { B: 70, C: 190, D: 100, E: 80, F: 150, J: 80, K: 200 });
  return workbookOf(s);
};
const gradeWb = (): WorkbookData =>
  workbookOf(widths(sheetOf("Grades", { ...grid("A1", [["Score", "Grade"]]), ...grid("A2", [[82], [45], [67], [91], [59], [100], [0], [74]]), ...grid("D1", [["From score", "Grade"]]), ...grid("D2", [[0, "F"], [50, "D"], [60, "C"], [70, "B"], [80, "A"]]) }), { A: 70, B: 70, D: 90, E: 70 }));
const gradeOf = (n: number) => (n >= 80 ? "A" : n >= 70 ? "B" : n >= 60 ? "C" : n >= 50 ? "D" : "F");

const tierSheet = (): WorkbookData => {
  const cat = copySource(VL, "B2:F62", { into: sheetOf("Orders", {}) });
  // shift catalogue to columns J:N on the Orders sheet to keep the orders table on the left
  const s = sheetOf("Orders", {});
  Object.assign(s.cells, grid("A1", [["ProductID", "Qty", "Unit price", "Discount", "Net amount"]]), grid("A2", [["P003", 12], ["P010", 4], ["P020", 25], ["P033", 1], ["P050", 10]]), grid("H1", [["Min qty", "Discount"]]), grid("H2", [[1, 0], [5, 0.05], [10, 0.1], [20, 0.15]]));
  const src = cat.cells;
  for (const [a, v] of Object.entries(src)) {
    const m = /^([A-Z]+)(\d+)$/.exec(a)!;
    const shifted = String.fromCharCode(m[1].charCodeAt(0) + 9) + m[2]; // B..F -> K..O
    s.cells[shifted] = v;
  }
  widths(s, { A: 80, B: 60, C: 90, D: 80, E: 100, H: 70, I: 70, K: 70, L: 190, M: 100, N: 80, O: 140 });
  return workbookOf(s);
};

const VL2: Exercise[] = [
  mk({
    id: "EX-VL-2-1", lessonId: "L-VL-2", kind: "guided", origin: "generated", conceptIds: ["C-VL-L", "C-VL-E"],
    title: "Handle an unknown ProductID",
    objective: "Stop #N/A from appearing when a lookup key is not in the catalogue.",
    datasetNote: "Catalogue from the instructor's workbook. The lookup IDs are generated: P999 and P000 do not exist (every ID in the instructor's sheet does exist).",
    scenario: "Some typed IDs are wrong. Show the product name when found, and the text \"Not found\" otherwise.",
    instructions: ["Fill K3:K8 with the product name for each ProductID in J3:J8.", "If the ID is not in the catalogue, show exactly: Not found", "First try plain VLOOKUP and see the #N/A, then wrap it so the error is handled."],
    workbook: missingIdsWb, activeSheet: VL, editable: ["K3:K8"],
    checks: [{
      type: "formula", label: "Names with missing-ID handling", sheet: VL, range: "K3:K8", requiredFunctions: [["VLOOKUP"], ["IFERROR", "IFNA"]],
      expected: (r) => { const c = catalog(r); return col(r, VL, "J3:J8").map((id) => [c.get(String(id))?.name ?? "Not found"]); },
      perturb: [{ J3: "P001", J5: "P060" }, { J4: "P888" }],
    }],
    hints: ["#N/A means \"not available\": VLOOKUP could not find the key. That is useful information, but not friendly in a report.", "IFERROR(value, value_if_error) returns the second argument when the first is an error.", "=IFERROR(VLOOKUP(J3,$B$3:$F$62,2,FALSE),\"Not found\")"],
    solution: { explanation: "Wrap the exact-match VLOOKUP in IFERROR. IFNA is more precise because it only hides #N/A and still shows other mistakes, such as a wrong column number (#REF!).", cells: fillDown("K", 3, 8, `=IFERROR(VLOOKUP(J{r},${TABLE},2,FALSE),"Not found")`) },
  }),
  mk({
    id: "EX-VL-2-2", lessonId: "L-VL-2", kind: "independent", origin: "generated", conceptIds: ["C-VL-F"],
    title: "Approximate match: score to grade",
    objective: "Use VLOOKUP with approximate match (TRUE) on a sorted band table and understand why sorting matters.",
    datasetNote: "New synthetic grade bands and scores.",
    scenario: "Grade bands are listed by the lowest score for each grade. Approximate match returns the band whose lower limit is the largest value that does not exceed the score.",
    instructions: ["Fill B2:B9 with the grade for each score in A2:A9 using the band table in D1:E6.", "Use VLOOKUP's approximate match (the 4th argument TRUE, or omitted)."],
    workbook: gradeWb, activeSheet: "Grades", editable: ["B2:B9"],
    checks: [{
      type: "formula", label: "Grade per score", sheet: "Grades", range: "B2:B9", requiredFunctions: [["VLOOKUP"]],
      expected: (r) => col(r, "Grades", "A2:A9").map((s) => [gradeOf(s as number)]), perturb: [{ A2: "50", A3: "79", A4: "100" }],
    }],
    hints: ["The band table is sorted ascending by the first column. That is a requirement for approximate match.", "=VLOOKUP(A2,$D$2:$E$6,2,TRUE)", "A score of 79 returns B (the largest lower limit not above 79 is 70), not A."],
    solution: { explanation: "With TRUE, VLOOKUP finds the largest first-column value that is less than or equal to the score. This only works when the first column is sorted ascending; on unsorted data the answer can be wrong without any error message.", cells: fillDown("B", 2, 9, "=VLOOKUP(A{r},$D$2:$E$6,2,TRUE)") },
  }),
  mk({
    id: "EX-VL-2-3", lessonId: "L-VL-2", kind: "mastery", origin: "generated", conceptIds: ["C-VL-E", "C-VL-F", "C-VL-L"],
    title: "Exact price and approximate discount in one order sheet",
    objective: "Combine an exact-match lookup (unit price by ProductID) with an approximate-match lookup (discount by quantity).",
    datasetNote: "Catalogue from the instructor's workbook (moved to K2:O62 on this sheet); orders and discount tiers are generated.",
    scenario: "Net amount = quantity × unit price × (1 − discount). Discounts depend on the quantity tier.",
    instructions: ["C2:C6: unit price by ProductID (exact match, catalogue K3:O62).", "D2:D6: discount by quantity from the tier table H2:I5 (approximate match).", "E2:E6: net amount = B × C × (1 − D), rounded to 2 decimals."],
    workbook: tierSheet, activeSheet: "Orders", editable: ["C2:E6"],
    checks: (() => {
      const tiers = (q: number) => (q >= 20 ? 0.15 : q >= 10 ? 0.1 : q >= 5 ? 0.05 : 0);
      const calc = (r: InputReader) => {
        const cat = new Map(r.range("Orders", "K3:O62").map((x) => [String(x[0]), x[3] as number]));
        return r.range("Orders", "A2:B6").map(([id, q]) => { const p = cat.get(String(id))!; const d = tiers(q as number); return [p, d, ROUND2((q as number) * p * (1 - d))]; });
      };
      const perturb = [{ B2: "5", B3: "20", B4: "1" }];
      return [
        { type: "formula" as const, label: "Unit price and discount", sheet: "Orders", range: "C2:D6", requiredFunctions: [["VLOOKUP"]], expected: (r: InputReader) => calc(r).map((x) => x.slice(0, 2)), perturb },
        { type: "formula" as const, label: "Net amount", sheet: "Orders", range: "E2:E6", tolerance: 0.006, expected: (r: InputReader) => calc(r).map((x) => [x[2]]), perturb },
      ];
    })(),    hints: ["Price: exact match, so the last argument is FALSE. The catalogue's UnitPrice is column 4 of K3:O62.", "Discount: approximate match on H2:I5, so TRUE. Quantity 12 falls in the tier that starts at 10.", "Net: =ROUND(B2*C2*(1-D2),2)"],
    solution: { explanation: "Price uses an exact match (IDs must match exactly). Discount uses an approximate match against ascending tier thresholds. Net amount multiplies quantity by price and by one minus the discount.", cells: mergeCells(fillDown("C", 2, 6, "=VLOOKUP(A{r},$K$3:$O$62,4,FALSE)"), fillDown("D", 2, 6, "=VLOOKUP(B{r},$H$2:$I$5,2,TRUE)"), fillDown("E", 2, 6, "=ROUND(B{r}*C{r}*(1-D{r}),2)")) },
  }),
];

/* ----------------------------- L-VL-3: line amounts ----------------------------- */
const withPrices = (): WorkbookData => {
  const wb = vlSectionA();
  const s = wb.sheets[0];
  const cat = new Map<string, number>();
  for (let r = 3; r <= 62; r++) cat.set(s.cells[`B${r}`], Number(s.cells[`E${r}`]));
  for (let r = 3; r <= 20; r++) s.cells[`M${r}`] = String(cat.get(s.cells[`J${r}`]));
  return wb;
};
const lineAmounts = (r: InputReader) => r.range(VL, "M3:N20").map(([p, q]) => [(p as number) * (q as number)]);
const VL3: Exercise[] = [
  mk({
    id: "EX-VL-3-1", lessonId: "L-VL-3", kind: "guided", origin: "source", conceptIds: ["C-VL-M"],
    title: "Calculate one line amount",
    objective: "Multiply quantity by unit price for the first order line.",
    datasetNote: "Section A of the instructor's \"Vlookup \" worksheet. Unit prices in M3:M20 are pre-filled (values) so you can focus on the multiplication.",
    instructions: ["Click O3.", "Line Amount = Quantity × UnitPrice. Quantity is in N3, UnitPrice in M3.", "Enter the formula and press Check Answer."],
    workbook: withPrices, activeSheet: VL, editable: ["O3"],
    checks: [{ type: "formula", label: "Line amount, row 3", sheet: VL, range: "O3", expected: (r) => lineAmounts(r).slice(0, 1), perturb: [{ M3: "10", N3: "3" }] }],
    hints: ["Start with = then click M3, type *, click N3.", "=M3*N3"],
    solution: { explanation: "Multiplication uses *. Using cell references (instead of typing 3720.67*4) lets the answer update when quantity or price changes.", cells: { O3: "=M3*N3" } },
  }),
  mk({
    id: "EX-VL-3-2", lessonId: "L-VL-3", kind: "independent", origin: "source", conceptIds: ["C-VL-M"],
    title: "Line amounts for all 18 orders",
    objective: "Fill the line-amount formula down the whole column.",
    datasetNote: "As the guided exercise. The instructor's sheet has this formula in O3:O5 only; here you complete O3:O20.",
    instructions: ["Complete O3:O20 with Quantity × UnitPrice.", "Write the formula once and fill it down with the fill handle (relative references)."],
    workbook: withPrices, activeSheet: VL, editable: ["O3:O20"],
    checks: [{ type: "formula", label: "Line amounts", sheet: VL, range: "O3:O20", expected: lineAmounts, perturb: [{ N5: "100", M8: "1" }] }],
    hints: ["Relative references change as you fill down: M3*N3 becomes M4*N4.", "Select O3, then drag the small square at its bottom-right corner down to O20."],
    solution: { explanation: "=M3*N3 filled down. Because the references are relative, each row multiplies its own price and quantity.", cells: fillDown("O", 3, 20, "=M{r}*N{r}") },
  }),
  mk({
    id: "EX-VL-3-3", lessonId: "L-VL-3", kind: "mastery", origin: "source", conceptIds: ["C-VL-M", "C-VL-K", "C-VL-E"],
    title: "Line amount straight from the ProductID, plus a total",
    objective: "Combine a VLOOKUP and a multiplication in one formula and total the column.",
    datasetNote: "Section A of the instructor's worksheet with UnitPrice column M left empty.",
    instructions: ["In O3:O20, calculate the line amount in a single formula: the unit price (VLOOKUP by the ProductID in J) multiplied by the quantity in N.", "In O21, calculate the total of all line amounts."],
    workbook: vlSectionA, activeSheet: VL, editable: ["O3:O21"],
    checks: [
      { type: "formula", label: "Line amounts using VLOOKUP", sheet: VL, range: "O3:O20", requiredFunctions: [["VLOOKUP"]], tolerance: 0.005, expected: (r) => { const c = catalog(r); return r.range(VL, "J3:N20").map((x) => [c.get(String(x[0]))!.price * (x[4] as number)]); }, perturb: [{ J3: "P011", N3: "7" }] },
      { type: "formula", label: "Total line amount", sheet: VL, range: "O21", requiredFunctions: [["SUM"]], tolerance: 0.01, expected: (r) => { const c = catalog(r); return [[r.range(VL, "J3:N20").reduce((t, x) => t + c.get(String(x[0]))!.price * (x[4] as number), 0)]]; }, perturb: [{ N3: "1", J4: "P002" }] },
    ],
    hints: ["Replace the price cell in =M3*N3 with a VLOOKUP: =VLOOKUP(J3,$B$3:$F$62,4,FALSE)*N3", "For the total, SUM the line-amount column: =SUM(O3:O20)"],
    solution: { explanation: "A VLOOKUP can sit inside a larger calculation. The price is fetched and multiplied by the quantity without needing a helper column.", cells: { ...fillDown("O", 3, 20, `=VLOOKUP(J{r},${TABLE},4,FALSE)*N{r}`), O21: "=SUM(O3:O20)" } },
  }),
];

/* ----------------------------- L-VL-4: XLOOKUP ----------------------------- */
const staffWb = (): WorkbookData =>
  workbookOf(widths(sheetOf("Staff", {
    ...grid("A1", [["EmpID", "Name", "Dept", "Salary"]]),
    ...grid("A2", [["E101", "Asha", "Finance", 52000], ["E102", "Brij", "Sales", 41000], ["E103", "Chen", "IT", 67000], ["E104", "Dina", "Sales", 45500], ["E105", "Esha", "HR", 38000], ["E106", "Faiz", "IT", 59000]]),
    ...grid("G1", [["Lookup ID", "Department", "Salary band"]]), ...grid("G2", [["E103"], ["E999"], ["E105"], ["E102"]]),
    ...grid("K1", [["Salary from", "Band"]]), ...grid("K2", [[0, "C"], [40000, "B"], [55000, "A"]]),
  }), { A: 70, B: 70, C: 80, D: 80, G: 80, H: 100, I: 90, K: 90, L: 60 }));
const bandOf = (s: number) => (s >= 55000 ? "A" : s >= 40000 ? "B" : "C");
const VL4: Exercise[] = [
  mk({
    id: "EX-VL-4-1", lessonId: "L-VL-4", kind: "guided", origin: "source", conceptIds: ["C-VL-G", "C-VL-I"],
    title: "Find one product name with XLOOKUP",
    objective: "Write an XLOOKUP that returns a product name.",
    datasetNote: "Section B of the instructor's \"Vlookup \" worksheet (S2:W17) with its catalogue (B2:F62).",
    instructions: ["Click T3 (Product Name (XLOOKUP)).", "Use XLOOKUP to return the ProductName for the ID in S3.", "XLOOKUP has three required arguments: what to find, where to look (one column), and what to return (one column)."],
    workbook: vlSectionB, activeSheet: VL, editable: ["T3"],
    checks: [{ type: "formula", label: "Product name for S3", sheet: VL, range: "T3", requiredFunctions: [["XLOOKUP"]], expected: (r) => { const c = catalog(r); return [[c.get(String(r.get(VL, "S3")))!.name]]; }, perturb: [{ S3: "P060" }] }],
    hints: ["lookup_value is S3. lookup_array is the ProductID column $B$3:$B$62. return_array is the ProductName column $C$3:$C$62.", "=XLOOKUP(S3,$B$3:$B$62,$C$3:$C$62)"],
    solution: { explanation: "XLOOKUP looks in one array and returns from another array at the same position. It matches exactly by default, so it needs no column number and no FALSE argument.", cells: { T3: "=XLOOKUP(S3,$B$3:$B$62,$C$3:$C$62)" } },
  }),
  mk({
    id: "EX-VL-4-2", lessonId: "L-VL-4", kind: "independent", origin: "source", conceptIds: ["C-VL-G", "C-VL-I", "C-VL-J", "C-VL-K"],
    title: "Name, category and price with XLOOKUP",
    objective: "Retrieve three fields for every product in Section B.",
    datasetNote: "Section B of the instructor's worksheet (15 lookups).",
    instructions: ["Fill T3:V17 with name, category and unit price for each ID in column S.", "You may write three formulas per row, or one XLOOKUP that returns several columns at once (it will spill across T:V)."],
    workbook: vlSectionB, activeSheet: VL, editable: ["T3:V17"],
    checks: [{ type: "formula", label: "Section B lookups", sheet: VL, range: "T3:V17", requiredFunctions: [["XLOOKUP"]], expected: (r) => lookupMatrix(r, "S3:S17", [FN.name, FN.cat, FN.price]), perturb: [{ S3: "P001", S9: "P044" }] }],
    hints: ["Change only the return_array: $C$3:$C$62 (name), $D$3:$D$62 (category), $E$3:$E$62 (price).", "Advanced: =XLOOKUP(S3,$B$3:$B$62,$C$3:$E$62) returns all three fields and spills into T3:V3."],
    solution: { explanation: "Three XLOOKUPs differing only in the return array. A single XLOOKUP with a three-column return array also works and spills.", cells: mergeCells(fillDown("T", 3, 17, "=XLOOKUP(S{r},$B$3:$B$62,$C$3:$C$62)"), fillDown("U", 3, 17, "=XLOOKUP(S{r},$B$3:$B$62,$D$3:$D$62)"), fillDown("V", 3, 17, "=XLOOKUP(S{r},$B$3:$B$62,$E$3:$E$62)")) },
  }),
  mk({
    id: "EX-VL-4-3", lessonId: "L-VL-4", kind: "mastery", origin: "generated", conceptIds: ["C-VL-G", "C-VL-L", "C-VL-F"],
    title: "Missing values and approximate matching with XLOOKUP",
    objective: "Use XLOOKUP's if_not_found and match_mode arguments.",
    datasetNote: "New synthetic staff table.",
    instructions: ["H2:H5: department for each ID in G (A:D table). If the ID does not exist show \"Unknown\" using XLOOKUP's own if_not_found argument (no IFERROR).", "I2:I5: salary band for the person's salary using K1:L4: the band whose \"Salary from\" is the closest value not above the salary (match_mode -1). Unknown IDs should show \"n/a\"."],
    workbook: staffWb, activeSheet: "Staff", editable: ["H2:I5"],
    checks: [
      { type: "formula", label: "Department with Unknown", sheet: "Staff", range: "H2:H5", requiredFunctions: [["XLOOKUP"]], forbiddenFunctions: ["IFERROR", "IFNA"], expected: (r) => { const t = r.range("Staff", "A2:D7"); return col(r, "Staff", "G2:G5").map((id) => [t.find((x) => x[0] === id)?.[2] ?? "Unknown"]); }, perturb: [{ G3: "E101" }] },
      { type: "formula", label: "Salary band", sheet: "Staff", range: "I2:I5", requiredFunctions: [["XLOOKUP"]], expected: (r) => { const t = r.range("Staff", "A2:D7"); return col(r, "Staff", "G2:G5").map((id) => { const row = t.find((x) => x[0] === id); return [row ? bandOf(row[3] as number) : "n/a"]; }); }, perturb: [{ G3: "E105" }] },
    ],
    hints: ["=XLOOKUP(G2,$A$2:$A$7,$C$2:$C$7,\"Unknown\")", "For the band, first fetch the salary: XLOOKUP(G2,$A$2:$A$7,$D$2:$D$7). Use that as the lookup_value of a second XLOOKUP on $K$2:$K$4 with match_mode -1.", "Nest them: =XLOOKUP(XLOOKUP(G2,$A$2:$A$7,$D$2:$D$7,0),$K$2:$K$4,$L$2:$L$4,\"n/a\",-1)  — an unknown ID gives salary 0, which falls in band C, so test for the unknown ID separately."],
    solution: { explanation: "if_not_found replaces IFERROR for the lookup itself. match_mode -1 means \"exact match or the next smaller item\", which is how approximate banding works in XLOOKUP and does not require the table to be sorted. For the band, check whether the ID exists first.", cells: { ...fillDown("H", 2, 5, `=XLOOKUP(G{r},$A$2:$A$7,$C$2:$C$7,"Unknown")`), ...fillDown("I", 2, 5, `=IF(H{r}="Unknown","n/a",XLOOKUP(XLOOKUP(G{r},$A$2:$A$7,$D$2:$D$7),$K$2:$K$4,$L$2:$L$4,"n/a",-1))`) } },
  }),
];

/* ----------------------------- L-VL-5: INDEX / MATCH & comparison ----------------------------- */
const leftWb = (): WorkbookData =>
  workbookOf(widths(sheetOf("Directory", {
    ...grid("A1", [["Name", "Code", "Phone"]]),
    ...grid("A2", [["Anil", "K-14", "98100"], ["Bela", "K-22", "98211"], ["Cyrus", "K-31", "98322"], ["Deep", "K-45", "98433"], ["Esha", "K-52", "98544"]]),
    ...grid("F1", [["Code", "Name (left of Code)"]]), ...grid("F2", [["K-31"], ["K-52"], ["K-14"]]),
    ...grid("A10", [["Sales", "Q1", "Q2", "Q3", "Q4"], ["North", 120, 135, 150, 170], ["South", 90, 95, 110, 105], ["East", 70, 88, 91, 99]]),
    ...grid("H10", [["Region", "Quarter", "Sales"], ["South", "Q3", null], ["East", "Q1", null], ["North", "Q4", null]]),
  }), { A: 80, B: 60, C: 70, F: 70, G: 150, H: 80, I: 80, J: 70 }));
const VL5: Exercise[] = [
  mk({
    id: "EX-VL-5-1", lessonId: "L-VL-5", kind: "guided", origin: "source", conceptIds: ["C-VL-H", "C-VL-I"],
    title: "Find one product name with INDEX and MATCH",
    objective: "Combine MATCH (find the position) with INDEX (return the item at that position).",
    datasetNote: "Section C of the instructor's \"Vlookup \" worksheet (Y2:AC17) with its catalogue.",
    instructions: ["Click Z3.", "MATCH finds the row position of the ID in Y3 within the ProductID column.", "INDEX then returns the ProductName at that position.", "Combine them in one formula."],
    workbook: vlSectionC, activeSheet: VL, editable: ["Z3"],
    checks: [{ type: "formula", label: "Product name for Y3", sheet: VL, range: "Z3", requiredFunctions: [["INDEX"], ["MATCH"]], expected: (r) => { const c = catalog(r); return [[c.get(String(r.get(VL, "Y3")))!.name]]; }, perturb: [{ Y3: "P060" }] }],
    hints: ["MATCH(Y3,$B$3:$B$62,0) returns a position such as 9. The 0 means exact match.", "INDEX($C$3:$C$62, position) returns the 9th ProductName.", "=INDEX($C$3:$C$62,MATCH(Y3,$B$3:$B$62,0))"],
    solution: { explanation: "MATCH(…,0) returns the position of the key in the ProductID column; INDEX returns the item in the same position of the ProductName column.", cells: { Z3: "=INDEX($C$3:$C$62,MATCH(Y3,$B$3:$B$62,0))" } },
  }),
  mk({
    id: "EX-VL-5-2", lessonId: "L-VL-5", kind: "independent", origin: "source", conceptIds: ["C-VL-H", "C-VL-I", "C-VL-J", "C-VL-K"],
    title: "Name, category and price with INDEX/MATCH",
    objective: "Retrieve three fields for every product in Section C.",
    datasetNote: "Section C of the instructor's worksheet (15 lookups).",
    instructions: ["Fill Z3:AB17 with name, category and unit price for the IDs in column Y.", "Use INDEX and MATCH.", "Tip: write MATCH once in a helper cell if you like, but the answer cells must use INDEX and MATCH themselves."],
    workbook: vlSectionC, activeSheet: VL, editable: ["Z3:AB17"],
    checks: [{ type: "formula", label: "Section C lookups", sheet: VL, range: "Z3:AB17", requiredFunctions: [["INDEX"], ["MATCH"]], expected: (r) => lookupMatrix(r, "Y3:Y17", [FN.name, FN.cat, FN.price]), perturb: [{ Y3: "P001", Y9: "P044" }] }],
    hints: ["Only the INDEX range changes: $C$3:$C$62, $D$3:$D$62, $E$3:$E$62.", "The MATCH part stays identical: MATCH(Y3,$B$3:$B$62,0)."],
    solution: { explanation: "Same MATCH, different INDEX column for each field.", cells: mergeCells(fillDown("Z", 3, 17, "=INDEX($C$3:$C$62,MATCH(Y{r},$B$3:$B$62,0))"), fillDown("AA", 3, 17, "=INDEX($D$3:$D$62,MATCH(Y{r},$B$3:$B$62,0))"), fillDown("AB", 3, 17, "=INDEX($E$3:$E$62,MATCH(Y{r},$B$3:$B$62,0))")) },
  }),
  mk({
    id: "EX-VL-5-3", lessonId: "L-VL-5", kind: "mastery", origin: "generated", conceptIds: ["C-VL-H", "C-VL-N", "C-VL-G"],
    title: "Compare approaches: left lookup and two-way lookup",
    objective: "Solve two problems that VLOOKUP cannot (or cannot easily) solve.",
    datasetNote: "New synthetic directory and regional sales table.",
    instructions: ["G2:G4: find the Name for each Code in F. The Name column is to the LEFT of Code, so VLOOKUP cannot do this. Use INDEX/MATCH or XLOOKUP. Do not use VLOOKUP.", "J11:J13: two-way lookup. Find the Sales value for the Region and Quarter in H11:I13 from the table A10:E13, using INDEX with two MATCH functions."],
    workbook: leftWb, activeSheet: "Directory", editable: ["G2:G4", "J11:J13"],
    checks: [
      { type: "formula", label: "Left lookup", sheet: "Directory", range: "G2:G4", forbiddenFunctions: ["VLOOKUP", "HLOOKUP"], requiredFunctions: [["XLOOKUP", "INDEX"]], expected: (r) => { const t = r.range("Directory", "A2:B6"); return col(r, "Directory", "F2:F4").map((c) => [t.find((x) => x[1] === c)![0]]); }, perturb: [{ F2: "K-45" }] },
      { type: "formula", label: "Two-way lookup", sheet: "Directory", range: "J11:J13", requiredFunctions: [["INDEX"], ["MATCH"]], expected: (r) => { const hdr = r.range("Directory", "B10:E10")[0]; const rows = r.range("Directory", "A11:E13"); return r.range("Directory", "H11:I13").map(([reg, q]) => [rows.find((x) => x[0] === reg)![hdr.indexOf(q) + 1]]); }, perturb: [{ H11: "North", I11: "Q1" }] },
    ],
    hints: ["VLOOKUP can only return values to the RIGHT of the lookup column. INDEX can return from any column.", "=INDEX($A$2:$A$6,MATCH(F2,$B$2:$B$6,0))", "Two-way: =INDEX($B$11:$E$13,MATCH(H11,$A$11:$A$13,0),MATCH(I11,$B$10:$E$10,0))"],
    solution: { explanation: "INDEX/MATCH separates \"where is it\" from \"what do I return\", so the return column can be on either side, and two MATCH functions give a row and a column position for a two-way lookup. XLOOKUP also handles the left lookup.", cells: { ...fillDown("G", 2, 4, "=INDEX($A$2:$A$6,MATCH(F{r},$B$2:$B$6,0))"), ...fillDown("J", 11, 13, "=INDEX($B$11:$E$13,MATCH(H{r},$A$11:$A$13,0),MATCH(I{r},$B$10:$E$10,0))") } },
  }),
];

export const VLOOKUP_EXERCISES: Exercise[] = [...VL1, ...VL2, ...VL3, ...VL4, ...VL5];


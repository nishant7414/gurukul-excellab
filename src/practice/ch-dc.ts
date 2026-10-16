import { defineChallenge } from "./build";
import { canonCategory, parseMoneyText, parseTextDate } from "../datasets/lib-messy";
import { countWhere, eq, n, proper, s, sumWhere } from "./h";
import type { Row } from "./types";

type TT = Record<string, Row[]>;
const RUPEE = "\u20B9";
const MONEY_F = (ref: string) => `=VALUE(SUBSTITUTE(SUBSTITUTE(TRIM(${ref}),"${RUPEE}",""),",",""))`;
const DATE_F = (ref: string) =>
  `=IF(ISNUMBER(FIND("/",${ref})),DATE(RIGHT(TRIM(${ref}),4),MID(TRIM(${ref}),4,2),LEFT(TRIM(${ref}),2)),DATE(LEFT(TRIM(${ref}),4),MID(TRIM(${ref}),6,2),RIGHT(TRIM(${ref}),2)))`;
const catOf = (raw: string) => canonCategory(raw);
const firstSeen = (rows: Row[], key: string, i: number) => rows.findIndex((r) => eq(r[key] ?? null, rows[i][key] ?? null)) === i;

export const DC = [
  defineChallenge({
    id: "PC-DC-01", concept: "DC", tier: "Easy", ds: ["DS-MSY-CUSTOMERS"], title: "Tidy a hand-typed customer list", minutes: 10, skill: "TRIM and PROPER",
    context: "Customer names were typed by several people: stray spaces, ALL CAPS and all-lower-case entries mixed together.",
    output: "A Clean name column with single spaces and each name in Proper Case, built by formula.",
    hints: ["TRIM removes leading and trailing spaces and reduces runs of spaces between words to one.", "PROPER capitalises the first letter of every word. Combine them: PROPER(TRIM(cell))."],
    explanation: "PROPER(TRIM(B2)) first removes the extra spaces and then standardises the capitalisation.",
    mistakes: ["Using PROPER only (spaces stay)", "Overwriting the raw data instead of adding a column", "Typing the cleaned name"],
    tasks: () => [{ kind: "col", header: "Clean name", label: "Clean name", text: "In {range} return each customer name with single spaces and Proper Case.", deps: ["name"], required: [["TRIM"], ["PROPER"]], expect: (x) => proper(s(x.row.name ?? null)), formula: "=PROPER(TRIM(@name))" }],
  }),
  defineChallenge({
    id: "PC-DC-02", concept: "DC", tier: "Medium", ds: ["DS-MSY-PRODUCTS"], title: "One format for product codes", minutes: 12, skill: "TRIM, RIGHT, concatenation",
    context: "Product codes arrive as P007, p-007, p007, P-007 and ' P 007 '. They must be P007 everywhere before they can be matched to the catalogue.",
    output: "A Clean code column (P followed by three digits) for all 60 lines.",
    hints: ["Whatever the style, the last three characters are the digits.", "RIGHT(TRIM(code),3) gives the digits; prefix them with the letter P using &."],
    explanation: "=\"P\"&RIGHT(TRIM(A2),3) keeps only the three digits and rebuilds the code in the standard layout.",
    mistakes: ["Using LEFT (the digits are at the end)", "Forgetting TRIM so a trailing space shifts the digits", "Replacing characters one pattern at a time"],
    tasks: () => [{ kind: "col", header: "Clean code", label: "Clean code", text: "In {range} return each product code as P followed by three digits.", deps: ["code"], required: [["RIGHT", "MID"]], expect: (x) => { const m = /(\d+)/.exec(s(x.row.code ?? null)); return m ? `P${m[1].padStart(3, "0")}` : "#VALUE!"; }, formula: '="P"&RIGHT(TRIM(@code),3)' }],
  }),
  defineChallenge({
    id: "PC-DC-03", concept: "DC", tier: "Medium", ds: ["DS-MSY-AMOUNTS"], title: "Turn text amounts into numbers", minutes: 15, skill: "SUBSTITUTE, VALUE, TRIM",
    context: "The invoice export wrote amounts as text such as \"\u20B914,490.25\" or \" 8,100.00 \". They cannot be summed until they are real numbers.",
    output: "A numeric Amount, the tax and the total with tax for 50 invoices, plus the sum of all amounts.",
    hints: ["SUBSTITUTE(text, \"\u20B9\", \"\") and SUBSTITUTE(text, \",\", \"\") remove the symbols; TRIM removes spaces.", "VALUE converts the cleaned text into a number.", "Tax = Amount x Tax rate; total = Amount + Tax."],
    explanation: "Nesting SUBSTITUTE inside TRIM inside VALUE removes every non-numeric character and converts the rest to a number that SUM can add.",
    mistakes: ["Removing the comma but not the rupee sign", "Leaving a number as text so SUM returns 0", "Rounding while converting"],
    tasks: () => [
      { kind: "col", header: "Amount (number)", label: "Numeric amount", text: "In {range} convert each text amount into a number.", deps: ["amount"], nf: "currency", required: [["VALUE", "NUMBERVALUE"]], expect: (x) => parseMoneyText(s(x.row.amount ?? null)), tolerance: 1e-6, formula: MONEY_F("@amount") },
      { kind: "col", header: "Tax", label: "Tax", text: "In {range} calculate the tax (numeric amount x tax rate).", deps: ["amount", "tax"], nf: "currency", tolerance: 1e-6, expect: (x) => parseMoneyText(s(x.row.amount ?? null)) * n(x.row.tax ?? null), formula: "=@ans0*@tax" },
      { kind: "cells", title: "Totals", text: "In {range} total the numeric amounts and the tax.", deps: ["amount", "tax"], cells: [
        { label: "Total amount", nf: "currency", tolerance: 1e-6, required: [["SUM"]], expect: (x) => x.T.rawamt.reduce((t, r) => t + parseMoneyText(s(r.amount ?? null)), 0), formula: "=SUM(@@ans0)" },
        { label: "Total tax", nf: "currency", tolerance: 1e-6, required: [["SUM"]], expect: (x) => x.T.rawamt.reduce((t, r) => t + parseMoneyText(s(r.amount ?? null)) * n(r.tax ?? null), 0), formula: "=SUM(@@ans1)" },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-DC-04", concept: "DC", tier: "Medium", ds: ["DS-MSY-DATES"], title: "Convert text dates in two layouts", minutes: 18, skill: "DATE with LEFT, MID, RIGHT; IF and FIND",
    context: "Order dates are text: some are 2025-03-07 (year first) and some 07/03/2025 (day first), a few with spaces. Real dates are needed for sorting and month reports.",
    output: "A real date for every order, its month number, and the total amount for orders placed in or after July.",
    hints: ["A slash tells you the layout: FIND(\"/\", text) works only for the day-first layout.", "Day-first: DATE(RIGHT(t,4), MID(t,4,2), LEFT(t,2)). Year-first: DATE(LEFT(t,4), MID(t,6,2), RIGHT(t,2)). Use TRIM first.", "MONTH(date) gives the month; SUMIFS with \">=7\" totals July onwards."],
    explanation: "Choose the layout with IF/ISNUMBER(FIND), slice the text into year/month/day and rebuild a real date with DATE.",
    mistakes: ["Reading day-first dates as month-first", "Forgetting TRIM so positions shift", "Leaving the result formatted as General"],
    tasks: () => [
      { kind: "col", header: "Order date", label: "Real date", text: "In {range} return a real date (not text) for each order.", deps: ["date"], nf: "date", required: [["DATE", "DATEVALUE"]], expect: (x) => parseTextDate(s(x.row.date ?? null)), formula: DATE_F("@date") },
      { kind: "col", header: "Month", label: "Month number", text: "In {range} return the month number of the real date.", deps: ["date"], required: [["MONTH", "TEXT"]], expect: (x) => { const d = parseTextDate(s(x.row.date ?? null)); return new Date(Date.UTC(1899, 11, 30) + d * 86400000).getUTCMonth() + 1; }, formula: "=MONTH(@ans0)" },
      { kind: "cells", title: "H2 sales", text: "In {range} total the Amount of orders placed in July or later.", deps: ["date", "amount"], cells: [{ label: "Amount, July onwards", nf: "currency", required: SUMS(), expect: (x) => x.T.rawdates.reduce((t, r) => (new Date(Date.UTC(1899, 11, 30) + parseTextDate(s(r.date ?? null)) * 86400000).getUTCMonth() + 1 >= 7 ? t + n(r.amount ?? null) : t), 0), formula: '=SUMIFS(@@amount,@@ans1,">=7")' }] },
    ],
  }),
  defineChallenge({
    id: "PC-DC-05", concept: "DC", tier: "Medium", ds: ["DS-MSY-DUPES"], title: "Find and exclude duplicate export lines", minutes: 18, skill: "COUNTIF with an expanding range",
    context: "A double-click on Export repeated 12 order lines. Totals are inflated until the repeats are excluded.",
    output: "A Keep/Duplicate flag for each line, the number of duplicates and the revenue with duplicates excluded.",
    hints: ["A line is a duplicate when its Order ref already appeared in the rows above it.", "COUNTIF($A$2:A2, A2) counts the occurrences so far; the first occurrence gives 1.", "SUMIFS the Amount where the flag is Keep."],
    explanation: "An expanding range ($A$2:A2, then $A$2:A3 ...) counts how many times a ref has appeared up to the current row. A count above 1 marks a repeat.",
    mistakes: ["Fully absolute range (every row counts as duplicate)", "Fully relative range (never detects repeats)", "Deleting rows instead of flagging them"],
    tasks: () => [
      { kind: "col", header: "Flag", label: "Duplicate flag", text: "In {range} flag each line Keep (first appearance of the order ref) or Duplicate (a repeat).", deps: ["ref"], required: [["COUNTIF", "COUNTIFS", "MATCH", "XMATCH"]], expect: (x) => (firstSeen(x.T.dupes, "ref", x.i) ? "Keep" : "Duplicate"), formula: '=IF(COUNTIF($A$2:A{r},A{r})>1,"Duplicate","Keep")' },
      { kind: "cells", title: "Duplicate impact", text: "In {range} count the duplicate lines and total the amount of the lines to keep.", deps: ["ref", "amount"], cells: [
        { label: "Duplicate lines", required: CNTS(), expect: (x) => x.T.dupes.filter((_r, i) => !firstSeen(x.T.dupes, "ref", i)).length, formula: '=COUNTIF(@@ans0,"Duplicate")' },
        { label: "Revenue excluding duplicates", nf: "currency", required: SUMS(), expect: (x) => x.T.dupes.reduce((t, r, i) => (firstSeen(x.T.dupes, "ref", i) ? t + n(r.amount ?? null) : t), 0), formula: '=SUMIFS(@@amount,@@ans0,"Keep")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-DC-06", concept: "DC", tier: "Medium", ds: ["DS-MSY-SCORES"], title: "Validate satisfaction scores", minutes: 12, skill: "IF, OR and blank tests",
    context: "Scores must be between 1 and 5, but the survey tool also stored 0, 7, 99 and -1, and some entries are blank.",
    output: "A Valid / Invalid / Missing status per response and the average of the valid scores only.",
    hints: ["Test for blank first: score=\"\" (a blank cell equals empty text).", "Then test the range: OR(score<1, score>5).", "AVERAGEIFS(score, status, \"Valid\") ignores the bad rows."],
    explanation: "Nested IF checks missing values first, then out-of-range values; AVERAGEIFS then uses only the Valid rows.",
    mistakes: ["Testing the range before the blank (a blank counts as 0)", "Using AND instead of OR", "Averaging everything including 99"],
    tasks: () => [
      { kind: "col", header: "Status", label: "Score status", text: "In {range} return Missing, Invalid (outside 1-5) or Valid.", deps: ["score"], required: [["IF", "IFS"]], expect: (x) => { const v = x.row.score ?? null; return v === null || v === "" ? "Missing" : n(v) < 1 || n(v) > 5 ? "Invalid" : "Valid"; }, formula: '=IF(@score="","Missing",IF(OR(@score<1,@score>5),"Invalid","Valid"))' },
      { kind: "cells", title: "Quality summary", text: "In {range} count the invalid and missing entries and average the valid scores.", deps: ["score"], cells: [
        { label: "Invalid entries", required: CNTS(), expect: (x) => countWhere(x.T.rawscores, (r) => r.score !== null && (n(r.score ?? null) < 1 || n(r.score ?? null) > 5)), formula: '=COUNTIF(@@ans0,"Invalid")' },
        { label: "Missing entries", required: CNTS(), expect: (x) => countWhere(x.T.rawscores, (r) => r.score === null), formula: '=COUNTIF(@@ans0,"Missing")' },
        { label: "Average of valid scores", tolerance: 1e-9, required: [["AVERAGEIF", "AVERAGEIFS", "SUMPRODUCT"]], expect: (x) => { const v = x.T.rawscores.filter((r) => r.score !== null && n(r.score) >= 1 && n(r.score) <= 5); return sumWhere(v, () => true, "score") / v.length; }, formula: '=AVERAGEIFS(@@score,@@ans0,"Valid")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-DC-07", concept: "DC", tier: "Medium", ds: ["DS-MSY-EMPNAMES"], title: "Reverse \"LAST, First\" names", minutes: 18, skill: "FIND, LEFT, MID, TRIM, PROPER",
    context: "The HR export stores names as RAO,  aarav  or  YADAV,lina - surname first, random capitalisation, uneven spaces.",
    output: "A First Last name in Proper Case for each of the 50 employees.",
    hints: ["FIND(\",\", text) locates the comma. LEFT(text, position-1) is the surname; MID(text, position+1, 100) is the first name.", "Wrap each piece in PROPER(TRIM(...)) and join with &\" \"&."],
    explanation: "Split the text at the comma with LEFT and MID, clean each part with TRIM and PROPER, then put the first name before the surname.",
    mistakes: ["Off-by-one when skipping the comma", "Not trimming the spaces after the comma", "Forgetting the space between the names"],
    tasks: () => [{ kind: "col", header: "Name", label: "First Last name", text: "In {range} return each name as First Last, in Proper Case with single spaces.", deps: ["raw"], required: [["FIND", "SEARCH", "TEXTAFTER", "TEXTBEFORE", "TEXTSPLIT"], ["PROPER"]], expect: (x) => { const t = s(x.row.raw ?? null); const k = t.indexOf(","); return proper(t.slice(k + 1)) + " " + proper(t.slice(0, k)); }, formula: '=PROPER(TRIM(MID(@raw,FIND(",",@raw)+1,100)))&" "&PROPER(TRIM(LEFT(@raw,FIND(",",@raw)-1)))' }],
  }),
  defineChallenge({
    id: "PC-DC-08", concept: "DC", tier: "Medium", ds: ["DS-MSY-PRODUCTS"], title: "Standardise category labels", minutes: 20, skill: "TRIM, LOWER, SWITCH and COUNTIF",
    context: "Categories come as ' ELECTRONICS ', Electronic, Stationary, Home & Kitchen, Fitnes and Groceries. A report by category splits one category into several.",
    output: "A canonical category column (Electronics, Stationery, Home, Fitness, Grocery) and the number of lines in each.",
    hints: ["Clean the label first with LOWER(TRIM(label)).", "SWITCH maps each known wrong spelling to the correct one; the last argument is the default for everything else.", "COUNTIF on the new column counts each canonical category."],
    explanation: "SWITCH(LOWER(TRIM(x)), \"electronic\", \"Electronics\", ..., PROPER(TRIM(x))) fixes the known misspellings and Proper-Cases the rest.",
    mistakes: ["Case-sensitive comparisons", "Forgetting the default value", "Counting the raw column"],
    tasks: () => [
      { kind: "col", header: "Category (clean)", label: "Canonical category", text: "In {range} return the canonical category for each line.", deps: ["cat"], required: [["SWITCH", "IF", "IFS", "VLOOKUP", "XLOOKUP", "SUBSTITUTE"]], expect: (x) => catOf(s(x.row.cat ?? null)), formula: '=SWITCH(LOWER(TRIM(@cat)),"electronic","Electronics","stationary","Stationery","home & kitchen","Home","fitnes","Fitness","groceries","Grocery",PROPER(TRIM(@cat)))' },
      { kind: "cells", title: "Lines per category", text: "In {range} count the lines in each canonical category.", deps: ["cat"], cells: ["Electronics", "Stationery", "Home", "Fitness", "Grocery"].map((cat) => ({ label: cat, required: CNTS(), expect: (x: { T: TT }) => countWhere(x.T.rawprod, (r) => catOf(s(r.cat ?? null)) === cat), formula: `=COUNTIF(@@ans0,"${cat}")` })) },
    ],
  }),
  defineChallenge({
    id: "PC-DC-09", concept: "DC", tier: "Easy", ds: ["DS-MSY-CUSTOMERS"], title: "Normalise e-mail addresses", minutes: 12, skill: "LOWER, TRIM, FIND, MID",
    context: "E-mails are typed in capitals and with spaces. Before mailing or matching, they must be lower-case and the domain extracted.",
    output: "A clean lower-case e-mail and its domain for each customer, and the number of distinct addresses.",
    hints: ["LOWER(TRIM(email)) fixes case and spaces.", "The domain starts after the @: MID(email, FIND(\"@\", email)+1, 100).", "COUNTIF counts the e-mails ending @example.com when you use a wildcard such as \"*@example.com\"."],
    explanation: "Clean first, then extract from the clean value so positions are not shifted by stray spaces.",
    mistakes: ["Extracting the domain from the raw text", "Not trimming", "Using SEARCH with the wrong start position"],
    tasks: () => [
      { kind: "col", header: "Clean email", label: "Clean e-mail", text: "In {range} return each e-mail in lower case without spaces.", deps: ["email"], required: [["LOWER"], ["TRIM"]], expect: (x) => s(x.row.email ?? null).trim().toLowerCase(), formula: "=LOWER(TRIM(@email))" },
      { kind: "col", header: "Domain", label: "E-mail domain", text: "In {range} return the part of the clean e-mail after the @.", deps: ["email"], required: [["FIND", "SEARCH", "TEXTAFTER"]], expect: (x) => s(x.row.email ?? null).trim().toLowerCase().split("@")[1] ?? "", formula: '=MID(@ans0,FIND("@",@ans0)+1,100)' },
      { kind: "cells", title: "Domain check", text: "In {range} count the e-mails whose domain is example.com.", deps: ["email"], cells: [{ label: "example.com addresses", required: CNTS(), expect: (x) => countWhere(x.T.rawcust, (r) => s(r.email ?? null).trim().toLowerCase().endsWith("@example.com")), formula: '=COUNTIF(@@ans1,"example.com")' }] },
    ],
  }),
  defineChallenge({
    id: "PC-DC-10", concept: "DC", tier: "Medium", ds: ["DS-EDU-ENROLL", "DS-EDU-COURSES"], title: "Enrolments pointing at unknown courses", minutes: 15, skill: "COUNTIF across two tables to find orphans",
    context: "Some enrolment rows quote a course code that is not in the course catalogue, which breaks every course report.",
    output: "An OK/Orphan flag for each of the 150 enrolments, the number of orphans and how many of them are Active.",
    hints: ["COUNTIF(catalogue codes, this row's course) is 0 when the code does not exist.", "COUNTIFS on the flag column and the status column counts orphans that are Active."],
    explanation: "A reference check COUNTIF(master, key)=0 identifies rows whose key is missing from the master table.",
    mistakes: ["Checking the catalogue against the enrolments (wrong direction)", "Comparing with =  instead of counting", "Leaving the orphans hidden in totals"],
    tasks: () => [
      { kind: "col", header: "Check", label: "Course check", text: "In {range} return OK when the course code exists in the Courses sheet, otherwise Orphan.", deps: ["course", "courses.code"], required: [["COUNTIF", "COUNTIFS", "MATCH", "VLOOKUP", "XLOOKUP"]], expect: (x) => (x.T.courses.some((r) => eq(r.code ?? null, x.row.course ?? null)) ? "OK" : "Orphan"), formula: '=IF(COUNTIF(@@courses.code,@course)=0,"Orphan","OK")' },
      { kind: "cells", title: "Orphan summary", text: "In {range} count the orphan enrolments and the orphans whose status is Active.", deps: ["course", "status", "courses.code"], cells: [
        { label: "Orphan enrolments", required: CNTS(), expect: (x) => countWhere(x.T.enroll, (r) => !x.T.courses.some((c) => eq(c.code ?? null, r.course ?? null))), formula: '=COUNTIF(@@ans0,"Orphan")' },
        { label: "Orphans that are Active", required: CNTS(), expect: (x) => countWhere(x.T.enroll, (r) => !x.T.courses.some((c) => eq(c.code ?? null, r.course ?? null)) && eq(r.status ?? null, "Active")), formula: '=COUNTIFS(@@ans0,"Orphan",@@status,"Active")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-DC-11", concept: "DC", tier: "Hard", ds: ["DS-MSY-SALES"], title: "Rebuild a usable sales table from a raw export", minutes: 40, skill: "Combining date, number, code and validity cleaning",
    context: "A 1,200-line sales export has text dates in two layouts, text amounts, inconsistent product codes and missing or negative quantities (and some repeated lines). Build the clean columns the analysts need.",
    output: "Clean date, clean amount, clean product code and a quantity status for every line, then the amount of lines with a valid quantity.",
    hints: ["Date: the same IF/FIND/DATE pattern as the date lesson, after TRIM.", "Amount: VALUE(SUBSTITUTE(SUBSTITUTE(TRIM(x),\"\u20B9\",\"\"),\",\",\"\")).", "Code: \"P\"&RIGHT(TRIM(code),3).", "Qty status: blank is Missing, zero or negative is Invalid, otherwise OK."],
    explanation: "Each column is cleaned by its own small formula, then the clean columns feed a SUMIFS that ignores lines with missing or negative quantities.",
    mistakes: ["Cleaning the date after SUMIFS (text dates are not dates)", "Treating a blank quantity as zero in the status", "Mixing the raw and clean columns in one formula"],
    tasks: () => [
      { kind: "col", header: "Date", label: "Clean date", text: "In {range} return a real date for each line.", deps: ["date"], nf: "date", required: [["DATE", "DATEVALUE"]], expect: (x) => parseTextDate(s(x.row.date ?? null)), formula: DATE_F("@date") },
      { kind: "col", header: "Amount", label: "Clean amount", text: "In {range} return the numeric amount of each line.", deps: ["amount"], nf: "currency", tolerance: 1e-6, required: [["VALUE", "NUMBERVALUE"]], expect: (x) => parseMoneyText(s(x.row.amount ?? null)), formula: MONEY_F("@amount") },
      { kind: "col", header: "Product", label: "Clean product code", text: "In {range} return the product code as P plus three digits.", deps: ["code"], expect: (x) => { const m = /(\d+)/.exec(s(x.row.code ?? null)); return m ? `P${m[1].padStart(3, "0")}` : "#VALUE!"; }, formula: '="P"&RIGHT(TRIM(@code),3)' },
      { kind: "col", header: "Qty status", label: "Quantity status", text: "In {range} return Missing (blank), Invalid (zero or negative) or OK.", deps: ["qty"], required: [["IF", "IFS"]], expect: (x) => { const v = x.row.qty ?? null; return v === null || v === "" ? "Missing" : n(v) <= 0 ? "Invalid" : "OK"; }, formula: '=IF(@qty="","Missing",IF(@qty<=0,"Invalid","OK"))' },
      { kind: "cells", title: "Clean totals", text: "In {range} total the clean amount of lines with a valid quantity (status OK) and count the lines to be investigated (not OK).", deps: ["amount", "qty"], cells: [
        { label: "Amount of lines with a valid Qty", nf: "currency", tolerance: 1e-4, required: SUMS(), expect: (x) => x.T.rawsales.reduce((t, r) => (r.qty !== null && n(r.qty) > 0 ? t + parseMoneyText(s(r.amount ?? null)) : t), 0), formula: '=SUMIFS(@@ans1,@@ans3,"OK")' },
        { label: "Lines to investigate", required: CNTS(), expect: (x) => countWhere(x.T.rawsales, (r) => r.qty === null || n(r.qty) <= 0), formula: '=COUNTIF(@@ans3,"<>OK")' },
      ] },
    ],
  }),
  defineChallenge({
    id: "PC-DC-12", concept: "DC", tier: "Hard", ds: ["DS-FIN-PAYMENTS", "DS-FIN-INVOICES"], title: "Payments that match no invoice", minutes: 25, skill: "Reconciliation with COUNTIF, SUMIFS and lookups",
    context: "Finance received 400 payments, but some quote an invoice number that does not exist in the invoice register. Cash is applied only to valid invoices.",
    output: "A Matched/Unmatched flag, the invoice amount for matched payments, and the totals of unmatched cash.",
    hints: ["COUNTIF(invoice numbers, payment's invoice)=0 means the payment is unmatched.", "For matched payments, XLOOKUP or VLOOKUP returns the invoice amount; unmatched ones show 0.", "SUMIFS on the flag column totals the unmatched cash."],
    explanation: "A COUNTIF reference check flags unmatched keys. Lookups should be protected so unmatched rows do not return #N/A.",
    mistakes: ["Letting #N/A flow into SUMs", "Checking invoices against payments instead", "Comparing amounts before the match is established"],
    tasks: () => [
      { kind: "col", header: "Match", label: "Match flag", text: "In {range} return Matched when the invoice exists in the Invoices sheet, otherwise Unmatched.", deps: ["invoice", "invoices.no"], required: [["COUNTIF", "COUNTIFS", "MATCH", "VLOOKUP", "XLOOKUP"]], expect: (x) => (x.T.invoices.some((r) => eq(r.no ?? null, x.row.invoice ?? null)) ? "Matched" : "Unmatched"), formula: '=IF(COUNTIF(@@invoices.no,@invoice)=0,"Unmatched","Matched")' },
      { kind: "col", header: "Invoice amount", label: "Invoice amount of matched payments", text: "In {range} return the invoice amount for matched payments and 0 for unmatched ones.", deps: ["invoice", "invoices.no", "invoices.amount"], nf: "currency", required: [["VLOOKUP", "XLOOKUP", "INDEX", "SUMIF", "SUMIFS"]], expect: (x) => n(x.T.invoices.find((r) => eq(r.no ?? null, x.row.invoice ?? null))?.amount ?? null), formula: '=IF(@ans0="Matched",VLOOKUP(@invoice,@@invoices.*,5,FALSE),0)' },
      { kind: "cells", title: "Reconciliation", text: "In {range} count the unmatched payments and total their cash.", deps: ["invoice", "amount", "invoices.no"], cells: [
        { label: "Unmatched payments", required: CNTS(), expect: (x) => countWhere(x.T.payments, (r) => !x.T.invoices.some((i) => eq(i.no ?? null, r.invoice ?? null))), formula: '=COUNTIF(@@ans0,"Unmatched")' },
        { label: "Unmatched cash", nf: "currency", required: SUMS(), expect: (x) => sumWhere(x.T.payments, (r) => !x.T.invoices.some((i) => eq(i.no ?? null, r.invoice ?? null)), "amount"), formula: '=SUMIFS(@@amount,@@ans0,"Unmatched")' },
      ] },
    ],
  }),
];

function SUMS() { return [["SUMIF", "SUMIFS", "SUMPRODUCT"]]; }
function CNTS() { return [["COUNTIF", "COUNTIFS", "SUMPRODUCT"]]; }

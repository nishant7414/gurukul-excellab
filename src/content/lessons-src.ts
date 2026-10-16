import type { Lesson } from "../learning/types";

const ALL = "Works in all Excel versions.";
const MS365 = "Needs Excel 2021 or Microsoft 365 (also Excel for the web). Older Excel shows #NAME?.";

const L = (l: Omit<Lesson, "track" | "level">): Lesson => ({ track: "classroom", level: "Classroom", ...l });

export const SOURCE_LESSONS: Lesson[] = [
  /* ---------------- Transpose ---------------- */
  L({
    id: "L-TR-1", title: "Tables, ranges and the Balance formula", sourceSheet: "Transpose", minutes: 20, prerequisites: [], difficulty: "Beginner",
    objectives: ["Name the rows, columns, fields and records of a table", "Select a whole table with Ctrl+A", "Calculate Balance = Total Fee − Deposit with a formula"],
    conceptIds: ["C-TR-01", "C-TR-02", "C-TR-05"],
    content: {
      simple: "A table is a block of cells where each row is one record (one student) and each column is one field (Roll No, Total Fee, …). A range such as C3:I7 names the block. Formulas calculate new values from other cells.",
      useCase: "A school office keeps one row per student. The Balance column must update automatically when a deposit is entered.",
      syntax: "=F4-G4",
      example: { title: "Balance for roll no 1", formula: "=F4-G4", result: "10000 − 5000 = 5000", steps: ["Click the Balance cell H4.", "Type = then click F4, type −, click G4.", "Press Enter and fill down so each row uses its own F and G."] },
      mistakes: ["Typing the balance as a number, so it does not change when the deposit changes (the source sheet does this in H4 and H5).", "Pressing Ctrl+A twice and selecting the whole sheet when you wanted only the table."],
      compat: [ALL],
    },
    exerciseIds: ["EX-TR-1-1", "EX-TR-1-2", "EX-TR-1-3"],
  }),
  L({
    id: "L-TR-2", title: "Paste Special → Transpose", sourceSheet: "Transpose", minutes: 20, prerequisites: ["L-TR-1"], difficulty: "Beginner",
    objectives: ["Copy a table and paste it transposed", "Explain how rows and columns swap", "Check that every record and field is still there", "Rebuild calculated cells after a transpose"],
    conceptIds: ["C-TR-03", "C-TR-04", "C-TR-06"],
    content: {
      simple: "Transposing turns rows into columns and columns into rows. In Excel you copy the range, then use Paste Special → Transpose.",
      useCase: "A report has months across the top but a chart needs them down the side.",
      syntax: "Home → Paste ▾ → Paste Special → Transpose (or the TRANSPOSE function)",
      example: { title: "Student table", steps: ["Click inside the table and press Ctrl+A to select the current region.", "Press Ctrl+C.", "Click an empty destination cell.", "Paste Special → Transpose."] },
      mistakes: ["Pasting onto cells that already contain data.", "Expecting formulas to follow the transpose: with default Paste Special the results are pasted as values, so rebuild the Balance formulas afterwards (as the instructor's second copy does).", "Forgetting that the instructor's two typed vs calculated balances differ in their sources (see the audit)."],
      compat: [ALL + " The TRANSPOSE function (live, not static) is covered in the Handling Text Data lesson on FILTER/TOCOL/TOROW/TRANSPOSE."],
    },
    exerciseIds: ["EX-TR-2-1", "EX-TR-2-2", "EX-TR-2-3"],
  }),

  /* ---------------- Excel Forms ---------------- */
  L({
    id: "L-EF-1", title: "Data entry: complete and calculate records", sourceSheet: "Excel Forms", minutes: 20, prerequisites: [], difficulty: "Beginner",
    objectives: ["Enter a record field by field with Tab", "Complete missing fields without overwriting neighbours", "Calculate a balance with a formula"],
    conceptIds: ["C-EF-01", "C-EF-02", "C-EF-03", "C-EF-05"],
    content: {
      simple: "Data entry means typing records into a table. Each field has a type: names are text, fees are numbers. Calculated fields (Balance) should be formulas.",
      useCase: "Registering students: roll numbers are known first, other fields are filled in later.",
      example: { title: "Completing record 13", steps: ["Click D6 and type the name.", "Press Tab to move to the next field.", "After the last field, enter =F6-G6 for Balance."] },
      mistakes: ["Typing in the wrong column.", "Typing the balance instead of calculating it (the source sheet's H5 is typed: 900)."],
      compat: [ALL + " The Data Form dialog from Excel's Form command is not simulated here."],
    },
    exerciseIds: ["EX-EF-1-1", "EX-EF-1-2", "EX-EF-1-3"],
  }),
  L({
    id: "L-EF-2", title: "Text versus numbers, and validating records", sourceSheet: "Excel Forms", minutes: 20, prerequisites: ["L-EF-1"], difficulty: "Intermediate",
    objectives: ["Tell text from numbers by alignment and behaviour", "Convert text numbers to real numbers", "Flag incomplete records with a formula"],
    conceptIds: ["C-EF-04", "C-EF-06"],
    content: {
      simple: "A number typed with a leading apostrophe, or imported from another system, may be stored as text. SUM ignores text, so totals come out too small.",
      useCase: "Fees pasted from a PDF look right but do not add up.",
      syntax: "=VALUE(F5)   =IF(COUNTA(C5:H5)=6,\"Complete\",\"Incomplete\")",
      example: { title: "Fix a text fee", formula: "=VALUE(F5)", result: "1000 as a number", steps: ["Check alignment: numbers are right-aligned by default.", "Retype the value, or convert with VALUE."] },
      mistakes: ["Trusting a total without checking for text cells.", "Counting blanks as filled: use COUNTA for non-empty cells."],
      compat: [ALL],
    },
    exerciseIds: ["EX-EF-2-1", "EX-EF-2-2", "EX-EF-2-3"],
  }),

  /* ---------------- Auto and flash fill ---------------- */
  L({
    id: "L-AF-1", title: "AutoFill: numbers, dates, months and codes", sourceSheet: "Auto and flash fill", minutes: 20, prerequisites: [], difficulty: "Beginner",
    objectives: ["Create a series from two example cells", "Continue dates, month names and codes with numbers inside", "Explain why Excel needs two examples"],
    conceptIds: ["C-AF-01", "C-AF-02"],
    content: {
      simple: "AutoFill extends a pattern. Give Excel one or two example cells, select them and drag the fill handle (the small square at the bottom-right corner), or use Home → Fill → Series.",
      useCase: "Numbering 20 rows, listing consecutive dates, or generating invoice numbers.",
      example: { title: "1, 2, … 20", steps: ["Type 1 in B4 and 2 in B5.", "Select B4:B5 and drag the fill handle down to B23 (or select B4:B23 and press the AutoFill button here).", "Excel works out the step from the two examples."] },
      mistakes: ["Using one cell: a single number is copied, not counted.", "Dragging past the end of the data."],
      compat: [ALL + " In Gurukul ExcelLab you can use the AutoFill button instead of dragging."],
    },
    exerciseIds: ["EX-AF-1-1", "EX-AF-1-2", "EX-AF-1-3"],
  }),
  L({
    id: "L-AF-2", title: "Flash Fill: splitting and combining names", sourceSheet: "Auto and flash fill", minutes: 20, prerequisites: ["L-AF-1"], difficulty: "Intermediate",
    objectives: ["Teach Flash Fill with one example", "Combine and split names", "Explain how Flash Fill differs from a formula", "Check Flash Fill results for stray spaces"],
    conceptIds: ["C-AF-03", "C-AF-04", "C-AF-08", "C-AF-09"],
    content: {
      simple: "Flash Fill watches the example you type and fills the rest of the column with the same pattern. It writes plain values, not formulas, so it does not update when the source changes.",
      useCase: "Turning \"John Smith\" into first and last names without writing formulas.",
      syntax: "Data → Flash Fill (Ctrl+E)",
      example: { title: "First names", steps: ["Type John next to John Smith.", "Select the next cell and press Ctrl+E.", "Check the results: the instructor's own H5 contains \"John \" with a trailing space."] },
      mistakes: ["Assuming Flash Fill output follows later edits.", "Not reviewing the result: the pattern can be wrong for unusual rows."],
      compat: [ALL.replace("all Excel versions", "Excel 2013 and later") + " Gurukul ExcelLab's Flash Fill is a simulation that handles simple patterns."],
    },
    exerciseIds: ["EX-AF-2-1", "EX-AF-2-2", "EX-AF-2-3"],
  }),
  L({
    id: "L-AF-3", title: "Extracting domains, years and months", sourceSheet: "Auto and flash fill", minutes: 20, prerequisites: ["L-AF-2"], difficulty: "Intermediate",
    objectives: ["Extract an email domain with Flash Fill", "Extract the year and month of a date", "Prefer YEAR/MONTH when results must stay correct"],
    conceptIds: ["C-AF-05", "C-AF-06", "C-AF-07", "C-AF-08"],
    content: {
      simple: "The same one-example technique extracts parts of text and dates. For dates, the YEAR and MONTH functions are exact and update automatically.",
      useCase: "Grouping orders by year, or mailing by company domain.",
      syntax: "=YEAR(G14)   =MONTH(G14)",
      example: { title: "Year of a date", formula: "=YEAR(G14)", result: "2023", steps: ["A date is a serial number formatted as a date.", "YEAR returns the year part; MONTH returns 1–12."] },
      mistakes: ["Typing months by hand: the instructor's I16 holds 1 for a date in November (INC-AF-2).", "Mixing text dates and real dates."],
      compat: [ALL],
    },
    exerciseIds: ["EX-AF-3-1", "EX-AF-3-2", "EX-AF-3-3"],
  }),

  /* ---------------- Text to column ---------------- */
  L({
    id: "L-TC-1", title: "Text to Columns: delimiters and destinations", sourceSheet: "Text to column", minutes: 20, prerequisites: [], difficulty: "Beginner",
    objectives: ["Explain what a delimiter is", "Run the three-step wizard", "Choose a safe destination", "Preview the split before finishing"],
    conceptIds: ["C-TC-01", "C-TC-02", "C-TC-03", "C-TC-04"],
    content: {
      simple: "Text to Columns splits the text in one column into several, wherever a delimiter character (comma, semicolon, tab, space…) appears.",
      useCase: "A system exports \"John, Smith, New York\" in one cell; you need name and city in separate columns.",
      syntax: "Data → Text to Columns → Delimited → choose delimiter → destination",
      example: { title: "First, Last, City", steps: ["Select B3:B12.", "Data → Text to Columns, Delimited, tick Comma.", "Check the preview.", "Set the destination to D3 so column B is kept, then Finish."] },
      mistakes: ["Leaving the destination at the default, which overwrites the original column.", "Ticking Space as well as Comma, which breaks \"New York\" in two.", "Quoted text with commas inside: set the text qualifier."],
      compat: [ALL + " Gurukul ExcelLab simulates the Delimited option only."],
    },
    exerciseIds: ["EX-TC-1-1", "EX-TC-1-2", "EX-TC-1-3"],
  }),
  L({
    id: "L-TC-2", title: "Cleaning spaces after a split", sourceSheet: "Text to column", minutes: 15, prerequisites: ["L-TC-1"], difficulty: "Beginner",
    objectives: ["Notice leading spaces after splitting on a comma", "Clean them with TRIM", "Verify the resulting fields"],
    conceptIds: ["C-TC-05", "C-TC-06", "C-TC-07"],
    content: {
      simple: "Splitting \"John, Smith\" on the comma leaves a space at the start of \" Smith\". TRIM removes extra spaces so lookups and comparisons work.",
      useCase: "A VLOOKUP fails because \"Smith\" does not equal \" Smith\".",
      syntax: "=TRIM(text)",
      example: { title: "Clean E3", formula: "=TRIM(E3)", result: "Smith", steps: ["LEN(E3) is one more than the visible letters.", "TRIM returns the text without leading/trailing spaces."] },
      mistakes: ["Forgetting that a space is a character.", "Cleaning in place: keep the raw split and put the TRIM version next to it."],
      compat: [ALL],
    },
    exerciseIds: ["EX-TC-2-1", "EX-TC-2-2", "EX-TC-2-3"],
  }),

  /* ---------------- Handling Text Data ---------------- */
  L({
    id: "L-HT-1", title: "LEFT, MID and RIGHT", sourceSheet: "Handling Text Data", minutes: 20, prerequisites: [], difficulty: "Beginner",
    objectives: ["Extract characters from the start, end and middle of text", "Convert extracted digits to numbers with VALUE"],
    conceptIds: ["C-HT-01", "C-HT-02", "C-HT-03"],
    content: {
      simple: "LEFT takes characters from the start, RIGHT from the end, MID from any position.",
      useCase: "Pull a region code from a product code or the sequence number from a transaction ID.",
      syntax: "=LEFT(text, n)   =RIGHT(text, n)   =MID(text, start, n)",
      example: { title: "Product code A123B", formula: "=LEFT(M6,3)", result: "A12", steps: ["The first three characters of A123B are A, 1, 2."] },
      mistakes: ["MID's start position counts from 1.", "These functions return text: use VALUE if you need a number (RIGHT(\"TXN1001\",2) is \"01\")."],
      compat: [ALL],
    },
    exerciseIds: ["EX-HT-1-1", "EX-HT-1-2", "EX-HT-1-3"],
  }),
  L({
    id: "L-HT-2", title: "TEXTAFTER, TEXTBEFORE and TEXTSPLIT", sourceSheet: "Handling Text Data", minutes: 20, prerequisites: ["L-HT-1"], difficulty: "Intermediate",
    objectives: ["Return text before/after a delimiter", "Split text into several cells with one formula", "Choose an older alternative when needed"],
    conceptIds: ["C-HT-04", "C-HT-05", "C-HT-06"],
    content: {
      simple: "TEXTAFTER and TEXTBEFORE return the text on either side of a delimiter. TEXTSPLIT cuts text into pieces and spills them into neighbouring cells.",
      useCase: "Email: the part after @ is the domain, the part before is the username.",
      syntax: "=TEXTAFTER(text, delimiter)   =TEXTBEFORE(text, delimiter)   =TEXTSPLIT(text, col_delimiter)",
      example: { title: "Domain", formula: '=TEXTAFTER(R6,"@")', result: "example.com", steps: ["Find the first @.", "Return everything after it."] },
      mistakes: ["Typing in a cell the spill needs (#SPILL!).", "Opening the file in an older Excel: these are new functions."],
      compat: [MS365, "Older Excel: use MID/FIND or Text to Columns."],
    },
    exerciseIds: ["EX-HT-2-1", "EX-HT-2-2", "EX-HT-2-3"],
  }),
  L({
    id: "L-HT-3", title: "SEARCH, FIND and SUBSTITUTE", sourceSheet: "Handling Text Data", minutes: 20, prerequisites: ["L-HT-1"], difficulty: "Intermediate",
    objectives: ["Return the position of a character", "State the difference between FIND and SEARCH", "Replace characters with SUBSTITUTE", "Handle the not-found error"],
    conceptIds: ["C-HT-07", "C-HT-08", "C-HT-09"],
    content: {
      simple: "FIND and SEARCH return the position of text inside other text. FIND is case-sensitive; SEARCH is not and allows wildcards. SUBSTITUTE swaps old text for new text.",
      useCase: "Locate the @ in an email before cutting with LEFT/MID.",
      syntax: "=SEARCH(find, within)   =FIND(find, within)   =SUBSTITUTE(text, old, new)",
      example: { title: "Position of @", formula: '=SEARCH("@",R6)', result: "5", steps: ["john is four letters, so @ is the fifth character."] },
      mistakes: ["Both return #VALUE! when the text is missing: wrap in IFERROR.", "Using FIND when case should not matter."],
      compat: [ALL],
    },
    exerciseIds: ["EX-HT-3-1", "EX-HT-3-2", "EX-HT-3-3"],
  }),
  L({
    id: "L-HT-4", title: "TRIM, PROPER, UPPER, LOWER and LEN", sourceSheet: "Handling Text Data", minutes: 20, prerequisites: ["L-HT-1"], difficulty: "Beginner",
    objectives: ["Clean spaces and capitalisation", "Count characters", "Nest text functions"],
    conceptIds: ["C-HT-10", "C-HT-11", "C-HT-12", "C-HT-13", "C-HT-14"],
    content: {
      simple: "TRIM removes extra spaces, PROPER capitalises Each Word, UPPER and LOWER change case, LEN counts characters.",
      useCase: "Customer names typed in many ways need to look the same before sorting or matching.",
      syntax: "=PROPER(TRIM(A2))",
      example: { title: "JoHn Smith", formula: "=PROPER(BA5)", result: "John Smith", steps: ["PROPER lowers every letter except the first of each word."] },
      mistakes: ["LEN counts spaces too (the instructor's AN6 = 10 for \"John Smith\").", "PROPER also capitalises after apostrophes (\"O'Neil\" works; \"d'souza\" becomes \"D'Souza\")."],
      compat: [ALL],
    },
    exerciseIds: ["EX-HT-4-1", "EX-HT-4-2", "EX-HT-4-3"],
  }),
  L({
    id: "L-HT-5", title: "CONCATENATE and TEXT", sourceSheet: "Handling Text Data", minutes: 20, prerequisites: ["L-HT-4"], difficulty: "Intermediate",
    objectives: ["Join text from several cells", "Format dates and numbers as text with TEXT", "Build readable sentences from data"],
    conceptIds: ["C-HT-15", "C-HT-16"],
    content: {
      simple: "CONCATENATE (or the & operator) joins pieces of text. TEXT converts a number or date to text in the layout you choose.",
      useCase: "Labels such as \"Invoice for Asha dated 15-Feb-2023: 1,250.50\".",
      syntax: "=CONCATENATE(a,b,…)   =a&b   =TEXT(value, format)",
      example: { title: "Month name", formula: '=TEXT(AU6,"MMMM")', result: "May", steps: ["Dates are numbers; the format \"MMMM\" asks for the full month name."] },
      mistakes: ["Joining a date directly: you get the serial number. Use TEXT first.", "Forgetting spaces in the separator."],
      compat: [ALL + " CONCAT and TEXTJOIN need Excel 2019+."],
    },
    exerciseIds: ["EX-HT-5-1", "EX-HT-5-2", "EX-HT-5-3"],
  }),
  L({
    id: "L-HT-6", title: "FILTER, TOCOL, TOROW and TRANSPOSE", sourceSheet: "Handling Text Data", minutes: 25, prerequisites: ["L-HT-2"], difficulty: "Advanced",
    objectives: ["Return only rows that match a condition", "Combine conditions", "Reshape blocks into a column, a row or a transpose"],
    conceptIds: ["C-HT-17", "C-HT-18", "C-HT-19", "C-HT-20"],
    content: {
      simple: "These dynamic-array functions return many values from one formula, which spill into the cells around it.",
      useCase: "List only the customers from one country, or flatten a grid into a single column for analysis.",
      syntax: "=FILTER(array, include, [if_empty])   =TOCOL(array)   =TOROW(array)   =TRANSPOSE(array)",
      example: { title: "Customers in India", formula: '=FILTER(B4:B11,G4:G11="India")', result: "Raj Patel, Anita Desai", steps: ["The condition returns TRUE/FALSE for every row.", "FILTER keeps the rows where it is TRUE."] },
      mistakes: ["Leaving cells in the way (#SPILL!).", "Using + for AND (use * to require both conditions)."],
      compat: [MS365],
    },
    exerciseIds: ["EX-HT-6-1", "EX-HT-6-2", "EX-HT-6-3"],
  }),
  L({
    id: "L-HT-7", title: "FILTERXML (concepts only)", sourceSheet: "Handling Text Data", minutes: 15, prerequisites: ["L-HT-2"], difficulty: "Advanced",
    objectives: ["Describe what FILTERXML does", "Write a correctly shaped FILTERXML formula", "Choose a portable alternative"],
    conceptIds: ["C-HT-21"],
    content: {
      simple: "FILTERXML reads XML text and returns the parts that match an XPath address. Gurukul ExcelLab does not evaluate it, so this lesson checks your understanding and the shape of the formula only.",
      useCase: "Pulling values out of the XML text returned by a web service.",
      syntax: "=FILTERXML(xml, xpath)",
      example: { title: "Cities", formula: '=FILTERXML(A1,"//city")', result: "Each <city> element's text (in real Excel for Windows)", steps: ["The first argument is text that contains XML.", "//city selects every city element anywhere in it."] },
      mistakes: ["Using it in a workbook that must open in Excel for the web or Mac.", "Swapping the arguments."],
      compat: ["Not available in Excel for the web or Excel for Mac.", "Gurukul ExcelLab marks this lesson as concept-only; formulas show #UNSUPPORTED! because no result is simulated."],
    },
    exerciseIds: ["EX-HT-7-1", "EX-HT-7-2", "EX-HT-7-3"],
  }),
];

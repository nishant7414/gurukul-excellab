import type { Lesson } from "../learning/types";

const COMPAT_365 = "Works in all Excel versions.";
const COMPAT_XL = "XLOOKUP needs Excel 2021, Excel for Microsoft 365 or Excel for the web. Older Excel shows #NAME?.";

export const VLOOKUP_LESSONS: Lesson[] = [
  {
    id: "L-VL-1", track: "classroom", title: "VLOOKUP: exact-match lookups", level: "Classroom", sourceSheet: "Vlookup ", minutes: 25, prerequisites: [],
    difficulty: "Beginner",
    objectives: ["Explain what each of the four VLOOKUP arguments does", "Select a table array whose first column holds the lookup key", "Choose the right column index number", "Retrieve a name, a category and a price using the same key"],
    conceptIds: ["C-VL-A", "C-VL-B", "C-VL-C", "C-VL-D", "C-VL-E", "C-VL-I", "C-VL-J", "C-VL-K"],
    content: {
      simple: "VLOOKUP looks down the first column of a table for a key (like a ProductID) and then returns a value from another column of the same row.",
      useCase: "A shop has a catalogue of products. When an order lists only the ProductID, VLOOKUP fills in the name, category and price automatically.",
      syntax: "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
      example: {
        title: "Name for the ID in J3",
        formula: "=VLOOKUP(J3,$B$3:$F$62,2,FALSE)",
        result: "The ProductName that belongs to the ID in J3",
        steps: [
          "lookup_value (J3): the key to search for.",
          "table_array ($B$3:$F$62): the catalogue. The key column (ProductID) must be its FIRST column.",
          "col_index_num (2): count columns inside the table array: B=1, C=2, D=3, E=4, F=5. ProductName is column C, so 2.",
          "range_lookup (FALSE): exact match. Use FALSE (or 0) for IDs.",
          "The $ signs lock the table so it does not slide when you fill the formula down.",
        ],
      },
      mistakes: [
        "Counting columns from the sheet instead of from the first column of the table array (C is not 3 here, it is 2).",
        "Forgetting FALSE, which asks for an approximate match and can silently return the wrong row.",
        "Not locking the table with $, so the range moves when the formula is filled down and later rows return #N/A.",
        "Putting the key column anywhere but first in the table array. VLOOKUP cannot look left.",
      ],
      compat: [COMPAT_365],
    },
    exerciseIds: ["EX-VL-1-1", "EX-VL-1-2", "EX-VL-1-3"],
  },
  {
    id: "L-VL-2", track: "classroom", title: "Missing IDs and approximate match", level: "Classroom", sourceSheet: "Vlookup ", minutes: 25, prerequisites: ["L-VL-1"],
    difficulty: "Intermediate",
    objectives: ["Show a friendly message instead of #N/A", "Explain when approximate match (TRUE) is appropriate", "State the sorted-table requirement of approximate match"],
    conceptIds: ["C-VL-F", "C-VL-L", "C-VL-E"],
    content: {
      simple: "An exact lookup returns #N/A when the key is missing. IFERROR or IFNA can show a readable message. Approximate match instead finds the largest value that is not greater than the key, which suits bands such as grades or discount tiers.",
      useCase: "Convert a score into a grade, or an order total into a discount percentage, using a small sorted table of thresholds.",
      syntax: "=IFNA(VLOOKUP(key, table, col, FALSE), \"Not found\")   and   =VLOOKUP(key, table, col, TRUE)",
      example: {
        title: "Grade from a score",
        formula: "=VLOOKUP(B2,$E$2:$F$6,2,TRUE)",
        result: "The grade for the highest threshold that does not exceed the score",
        steps: ["The first column of the table must be sorted ascending.", "A score between two thresholds returns the lower one's result.", "A score below the first threshold returns #N/A."],
      },
      mistakes: ["Using approximate match for IDs (it can return a wrong row without any error).", "Leaving the thresholds unsorted.", "Hiding every error with IFERROR so real mistakes go unnoticed. IFNA only catches #N/A."],
      compat: [COMPAT_365, "IFNA needs Excel 2013 or later."],
    },
    exerciseIds: ["EX-VL-2-1", "EX-VL-2-2", "EX-VL-2-3"],
  },
  {
    id: "L-VL-3", track: "classroom", title: "Line amount = quantity × unit price", level: "Classroom", sourceSheet: "Vlookup ", minutes: 15, prerequisites: ["L-VL-1"],
    difficulty: "Beginner",
    objectives: ["Combine a looked-up price with a quantity", "Fill a formula down a column", "Calculate a total"],
    conceptIds: ["C-VL-M", "C-VL-K", "C-VL-E"],
    content: {
      simple: "The instructor's sheet has a Line Amount column (=M3*N3). Once a price has been looked up, multiplying by the quantity gives the line amount.",
      useCase: "Build an order sheet where each row's amount comes from the catalogue price, not from typing.",
      syntax: "=M3*N3   or   =VLOOKUP(J3,$B$3:$F$62,4,FALSE)*N3",
      example: { title: "Amount for row 3", formula: "=M3*N3", result: "Price in M3 × quantity in N3", steps: ["Reference the price cell and the quantity cell.", "Fill down; relative references move with each row."] },
      mistakes: ["Multiplying the wrong columns.", "Typing the product of two numbers instead of using references."],
      compat: [COMPAT_365],
    },
    exerciseIds: ["EX-VL-3-1", "EX-VL-3-2", "EX-VL-3-3"],
  },
  {
    id: "L-VL-4", track: "classroom", title: "XLOOKUP", level: "Classroom", sourceSheet: "Vlookup ", minutes: 20, prerequisites: ["L-VL-1"],
    difficulty: "Intermediate",
    objectives: ["Write XLOOKUP with a separate lookup and return range", "Handle missing keys with the if_not_found argument", "Compare with VLOOKUP"],
    conceptIds: ["C-VL-G", "C-VL-I", "C-VL-J", "C-VL-K", "C-VL-L", "C-VL-F"],
    content: {
      simple: "XLOOKUP searches one range and returns the matching item from another range. It defaults to an exact match, can look left, and has a built-in not-found argument.",
      useCase: "Replace column-counting VLOOKUPs with a clearer formula that survives inserted columns.",
      syntax: "=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])",
      example: { title: "Name for the ID in S3", formula: "=XLOOKUP(S3,$B$3:$B$62,$C$3:$C$62)", result: "ProductName", steps: ["Lookup array: the ID column.", "Return array: the name column. Both must have the same height.", "Exact match is the default."] },
      mistakes: ["Return and lookup ranges of different sizes.", "Using XLOOKUP in a file that must open in Excel 2016 or earlier."],
      compat: [COMPAT_XL],
    },
    exerciseIds: ["EX-VL-4-1", "EX-VL-4-2", "EX-VL-4-3"],
  },
  {
    id: "L-VL-5", track: "classroom", title: "INDEX and MATCH", level: "Classroom", sourceSheet: "Vlookup ", minutes: 20, prerequisites: ["L-VL-1"],
    difficulty: "Intermediate",
    objectives: ["Use MATCH to find a position and INDEX to return the value at it", "Look up to the left of the key column", "Compare VLOOKUP, XLOOKUP and INDEX/MATCH"],
    conceptIds: ["C-VL-H", "C-VL-I", "C-VL-J", "C-VL-K", "C-VL-N", "C-VL-G"],
    content: {
      simple: "MATCH tells you which row the key is in. INDEX returns the item at that row from any column you choose. Together they work in every Excel version and can look in any direction.",
      useCase: "Look up a value to the left of the key, or build a two-way (row and column) lookup.",
      syntax: "=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))",
      example: { title: "Name for the ID in Y3", formula: "=INDEX($C$3:$C$62,MATCH(Y3,$B$3:$B$62,0))", result: "ProductName", steps: ["MATCH(…,0) returns the position of the ID in B3:B62.", "INDEX returns the item at that position from C3:C62."] },
      mistakes: ["Forgetting the 0 in MATCH (approximate match).", "Using ranges that start on different rows, which shifts the result."],
      compat: [COMPAT_365],
    },
    exerciseIds: ["EX-VL-5-1", "EX-VL-5-2", "EX-VL-5-3"],
  },
];

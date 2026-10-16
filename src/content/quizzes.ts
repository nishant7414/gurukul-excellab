import type { Exercise, McqQuestion } from "../learning/types";
import { mcqExercise } from "./ex-text";

export interface Quiz {
  id: string;
  exerciseId: string;
  title: string;
  blurb: string;
  questionCount: number;
}

const nums = { A1: "10", A2: "20", A3: "30", A4: "40", A5: "50" };
const q = (id: string, prompt: string, options: string[], correct: number, explanation: string, extra: Partial<McqQuestion> = {}): McqQuestion => ({ id, prompt, options, correct, explanation, tag: "knowledge", ...extra });

const QUIZ_DEFS: { id: string; title: string; blurb: string; objective: string; questions: McqQuestion[] }[] = [
  {
    id: "QZ-1", title: "Formula basics and references", blurb: "Order of operations, SUM, MOD and relative / absolute references.", objective: "Check basic formula reading.",
    questions: [
      q("q1", "What does this formula return?", ["14", "20", "9", "23"], 0, "Multiplication happens before addition: 3*4 = 12, then 2 + 12 = 14.", { formula: "=2+3*4", type: "predict", tag: "function-arguments", engine: { formula: "=2+3*4" } }),
      q("q2", "What does this formula return?", ["12", "6", "8", "7"], 0, "SUM(1,2,3) is 6, multiplied by 2 gives 12.", { formula: "=SUM(1,2,3)*2", type: "predict", tag: "function-arguments", engine: { formula: "=SUM(1,2,3)*2" } }),
      q("q3", "What does this formula return?", ["6", "5", "15", "1"], 0, "ABS(-5) is 5 and MOD(10,3) is the remainder 1, so 5 + 1 = 6.", { formula: "=ABS(-5)+MOD(10,3)", type: "predict", tag: "function-arguments", engine: { formula: "=ABS(-5)+MOD(10,3)" } }),
      q("q4", "You fill =D2*G1 down from E2 to E9 and the tax values become 0 from row 3 onward. What is the most likely cause?", ["G1 was not locked, so it became G2, G3 …", "D2 should have been $D$2", "The cells are formatted as text", "Excel cannot fill formulas"], 0, "G1 is a relative reference and moves down as you fill. Use $G$1 to lock it.", { type: "find-error", tag: "absolute-reference" }),
      q("q5", "In =$A2*B$1, what is locked?", ["The column of A and the row of 1", "Both references completely", "Nothing", "Only the sheet name"], 0, "$A locks column A (the row can change); B$1 locks row 1 (the column can change). That is a mixed reference.", { type: "which-function", tag: "absolute-reference" }),
    ],
  },
  {
    id: "QZ-2", title: "Logic and conditional totals", blurb: "IF, AND, COUNTIF, SUMIFS and what they return.", objective: "Check logical and conditional-aggregation reading.",
    questions: [
      q("q1", "What does this formula return?", ["No", "Yes", "TRUE", "#VALUE!"], 0, "AND needs both tests to be true. 2>4 is false, so IF returns the value_if_false, \"No\".", { formula: '=IF(AND(5>3,2>4),"Yes","No")', type: "predict", tag: "function-arguments", engine: { formula: '=IF(AND(5>3,2>4),"Yes","No")' } }),
      q("q2", "A1:A5 hold 10, 20, 30, 40, 50. What does this return?", ["3", "2", "4", "120"], 0, "COUNTIF counts the cells greater than 25: 30, 40 and 50.", { formula: '=COUNTIF(A1:A5,">25")', type: "predict", tag: "function-arguments", engine: { cells: nums, formula: '=COUNTIF(A1:A5,">25")' } }),
      q("q3", "A1:A5 hold 10, 20, 30, 40, 50. What does this return?", ["90", "120", "150", "70"], 0, "The criterion \">=40\" selects 40 and 50, and 40 + 50 = 90.", { formula: '=SUMIF(A1:A5,">=40")', type: "predict", tag: "function-arguments", engine: { cells: nums, formula: '=SUMIF(A1:A5,">=40")' } }),
      q("q4", "Which function should you use to add Units only where Region is North AND Status is Delivered?", ["SUMIFS", "SUMIF", "COUNTIFS", "SUM"], 0, "SUMIFS accepts several (range, criteria) pairs; SUMIF accepts only one condition.", { type: "which-function", tag: "wrong-function" }),
      q("q5", "A student score of exactly 40 should Pass. Which test is right?", ["B2>=40", "B2>40", "B2<40", "B2=40"], 0, ">= includes 40; > excludes it.", { type: "find-error", tag: "function-arguments" }),
    ],
  },
  {
    id: "QZ-3", title: "Text and dates", blurb: "LEFT/RIGHT, TEXTAFTER, TRIM, DATE, EOMONTH, TEXT.", objective: "Check text and date function reading.",
    questions: [
      q("q1", "What does this formula return?", ["Exel", "Excl", "Ecel", "ExEl"], 0, "LEFT(\"Excel\",2) is \"Ex\", RIGHT(\"Excel\",2) is \"el\"; & joins them: \"Exel\".", { formula: '=LEFT("Excel",2)&RIGHT("Excel",2)', type: "predict", tag: "function-arguments", engine: { formula: '=LEFT("Excel",2)&RIGHT("Excel",2)' } }),
      q("q2", "What does this formula return?", ["b-c", "b", "a", "c"], 0, "TEXTAFTER returns everything after the first \"-\".", { formula: '=TEXTAFTER("a-b-c","-")', type: "predict", tag: "delimiter", engine: { formula: '=TEXTAFTER("a-b-c","-")' } }),
      q("q3", "What does this formula return?", ["3", "6", "4", "5"], 0, "TRIM removes the outer spaces and reduces the double space to one: \"a b\" has 3 characters.", { formula: '=LEN(TRIM("  a  b "))', type: "predict", tag: "extra-spaces", engine: { formula: '=LEN(TRIM("  a  b "))' } }),
      q("q4", "What does this formula return?", ["05/03/2024", "03/05/2024", "2024/03/05", "5/3/24"], 0, "dd is the day (05), mm the month (03), yyyy the year.", { formula: '=TEXT(DATE(2024,3,5),"dd/mm/yyyy")', type: "predict", tag: "date-format", engine: { formula: '=TEXT(DATE(2024,3,5),"dd/mm/yyyy")' } }),
      q("q5", "A date typed as 15/01/2024 is left-aligned and =A2+30 gives #VALUE!. What is the problem?", ["The date is stored as text", "30 is too large", "The sheet is protected", "A2 should be $A$2"], 0, "Text dates do not calculate. Convert with DATEVALUE or re-enter the date in your locale's format.", { type: "find-error", tag: "text-number" }),
    ],
  },
  {
    id: "QZ-4", title: "Lookups and error values", blurb: "VLOOKUP, MATCH, IFERROR and what #N/A means.", objective: "Check lookup and error-value reading.",
    questions: [
      q("q1", "A1:B3 hold A,1 / B,2 / C,3. What does this return?", ["2", "B", "#N/A", "1"], 0, "The exact lookup finds \"B\" in column 1 and returns column 2 of that row.", { formula: '=VLOOKUP("B",A1:B3,2,FALSE)', type: "predict", tag: "col-index", engine: { cells: { A1: "A", B1: "1", A2: "B", B2: "2", A3: "C", B3: "3" }, formula: '=VLOOKUP("B",A1:B3,2,FALSE)' } }),
      q("q2", "What does this formula return?", ["n/a", "#DIV/0!", "0", "Error"], 0, "IFERROR replaces any error result with the fallback value.", { formula: '=IFERROR(1/0,"n/a")', type: "predict", tag: "error-value", engine: { formula: '=IFERROR(1/0,"n/a")' } }),
      q("q3", "A1:A5 hold 10, 20, 30, 40, 50. What does this return?", ["3", "30", "2", "#N/A"], 0, "MATCH returns the POSITION of 30 in the list, which is 3 (not the value).", { formula: "=MATCH(30,A1:A5,0)", type: "predict", tag: "function-arguments", engine: { cells: nums, formula: "=MATCH(30,A1:A5,0)" } }),
      q("q4", "A VLOOKUP that worked in row 2 returns #N/A in later rows after you fill it down. What is the most likely cause?", ["The table_array was not locked with $", "The column index is too small", "The workbook is read-only", "FALSE must be replaced by 0"], 0, "Without $ the table slides down with each row and no longer contains the key.", { type: "find-error", tag: "absolute-reference" }),
      q("q5", "Why can VLOOKUP not return a column to the left of the lookup column?", ["It always searches the first column of the table and returns columns to the right", "Excel forbids negative numbers", "It only works on text", "It is a bug fixed in newer versions"], 0, "VLOOKUP's key must be the first column of table_array. INDEX/MATCH or XLOOKUP can look in any direction.", { type: "explain", tag: "lookup-range" }),
    ],
  },
];

export const QUIZ_EXERCISES: Exercise[] = QUIZ_DEFS.map((d) =>
  mcqExercise({ id: `EX-${d.id}`, lessonId: d.id, kind: "independent", title: d.title, objective: d.objective, conceptIds: [], questions: d.questions, hints: ["Read each question carefully, then check the explanation of any question you miss."] }),
);
export const QUIZZES: Quiz[] = QUIZ_DEFS.map((d) => ({ id: d.id, exerciseId: `EX-${d.id}`, title: d.title, blurb: d.blurb, questionCount: d.questions.length }));

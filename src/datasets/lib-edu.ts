import { defineDataset as ds } from "./define";
import { cols } from "./types";
import { D, dateIn, roundTo } from "./rng";
import { personName } from "./masters";

const stuName = (i: number) => personName(i + 50);
const roll = (i: number) => `R${101 + i}`;
const gradeOf = (avg: number) => (avg >= 75 ? "A" : avg >= 60 ? "B" : avg >= 45 ? "C" : "D");

export const EDU_DATASETS = [
  ds({
    id: "DS-EDU-MARKS", alias: "marks", sheet: "Marks", title: "Class 10 test marks", category: "Education", tier: "Easy", rowCount: 20,
    description: "One class's marks in three subjects, with a grade based on the three-subject average.",
    topics: ["Student marks and grades"], concepts: ["SM", "LK", "CA", "LG"],
    columns: cols([["roll", "Roll No", "id"], ["name", "Student", "text"], ["maths", "Maths", "number"], ["science", "Science", "number"], ["english", "English", "number"], ["grade", "Grade", "text"]]),
    gen: (r) => Array.from({ length: 20 }, (_, i) => { const m = r.int(28, 98), s = r.int(25, 98), e = r.int(30, 96); return [roll(i), stuName(i), m, s, e, gradeOf((m + s + e) / 3)]; }),
  }),
  ds({
    id: "DS-EDU-ATTEND", alias: "attend", sheet: "Attendance", title: "Monthly student attendance", category: "Education", tier: "Medium", rowCount: 120,
    description: "24 students x 5 months: working days and days present, with a section per student.",
    topics: ["Student attendance"], concepts: ["CA", "LG", "DT", "CS", "SF"],
    columns: cols([["roll", "Roll No", "id"], ["name", "Student", "text"], ["month", "Month", "date"], ["working", "Working days", "number"], ["present", "Days present", "number"], ["section", "Section", "text"]]),
    gen: (r) => {
      const out: (string | number)[][] = [];
      const habit = Array.from({ length: 24 }, () => r.money(0.62, 0.99, 0.01));
      for (let m = 0; m < 5; m++) for (let i = 0; i < 24; i++) { const wd = r.int(19, 24); out.push([roll(i), stuName(i), D(2025, 8 + m, 1), wd, Math.min(wd, Math.round(wd * Math.min(1, habit[i] + r.money(-0.08, 0.06, 0.01)))), "ABC"[i % 3]]); }
      return out;
    },
  }),
  ds({
    id: "DS-EDU-SEM", alias: "sem", sheet: "Semesters", title: "Semester-wise academic performance", category: "Education", tier: "Medium", rowCount: 48,
    description: "12 students across four semesters: credits taken, semester grade point average and backlogs.",
    topics: ["Semester-wise academic performance"], concepts: ["CA", "FIN", "LG"],
    columns: cols([["roll", "Roll No", "id"], ["name", "Student", "text"], ["sem", "Semester", "number"], ["credits", "Credits", "number"], ["sgpa", "SGPA", "number"], ["backlogs", "Backlogs", "number"]]),
    gen: (r) => Array.from({ length: 48 }, (_, k) => { const i = k % 12, s = Math.floor(k / 12) + 1; return [roll(i), stuName(i), s, r.int(18, 24), roundTo(r.money(5.2, 9.9, 0.01), 2), r.weighted([0, 1, 2], [8, 2, 1])]; }),
  }),
  ds({
    id: "DS-EDU-COURSES", alias: "courses", sheet: "Courses", title: "Course catalogue", category: "Education", tier: "Easy", rowCount: 12, related: ["DS-EDU-ENROLL"],
    description: "Twelve courses with department, credits and fee.",
    topics: ["Course enrollment"], concepts: ["LK", "CS"],
    columns: cols([["code", "Course code", "id"], ["title", "Course title", "text"], ["dept", "Department", "text"], ["credits", "Credits", "number"], ["fee", "Fee", "currency"]]),
    gen: () => [["CS101", "Intro to Programming", "Computer Science", 4, 18000], ["CS201", "Data Structures", "Computer Science", 4, 20000], ["CS305", "Databases", "Computer Science", 3, 19000], ["MA101", "Calculus I", "Mathematics", 4, 15000], ["MA210", "Linear Algebra", "Mathematics", 3, 15500], ["PH101", "Mechanics", "Physics", 3, 16000], ["PH220", "Optics Lab", "Physics", 2, 17500], ["EC110", "Microeconomics", "Economics", 3, 14000], ["EC240", "Econometrics", "Economics", 4, 16500], ["EN105", "Technical Writing", "English", 2, 9000], ["BM120", "Principles of Management", "Business", 3, 13500], ["BM330", "Operations Research", "Business", 4, 18500]],
  }),
  ds({
    id: "DS-EDU-ENROLL", alias: "enroll", sheet: "Enrolments", title: "Course enrolments", category: "Education", tier: "Medium", rowCount: 150, related: ["DS-EDU-COURSES", "DS-EDU-MARKS"],
    description: "150 enrolments of students into courses with enrolment date and status. A few course codes are not in the catalogue.",
    topics: ["Course enrollment"], concepts: ["LK", "CA", "DT", "CS", "DA"], issues: ["unmatched-keys"],
    columns: cols([["id", "Enrolment ID", "id"], ["roll", "Roll No", "id"], ["course", "Course code", "id"], ["date", "Enrolled on", "date"], ["status", "Status", "text"]]),
    gen: (r) => {
      const codes = ["CS101", "CS201", "CS305", "MA101", "MA210", "PH101", "PH220", "EC110", "EC240", "EN105", "BM120", "BM330"];
      return Array.from({ length: 150 }, (_, i) => [`EN${String(i + 1).padStart(4, "0")}`, roll(r.int(0, 19)), i % 47 === 13 ? "XX999" : r.pick(codes), dateIn(r, D(2025, 6, 2), 70), r.weighted(["Active", "Completed", "Dropped"], [10, 5, 2])]);
    },
  }),
  ds({
    id: "DS-EDU-EXAM", alias: "exam", sheet: "ExamResults", title: "Examination results register", category: "Education", tier: "Hard", rowCount: 400, related: ["DS-EDU-MARKS"],
    description: "400 exam sitting records. Marks are blank for absent candidates and a status column explains why.",
    topics: ["Examination results"], concepts: ["CA", "LG", "DA", "DC", "CS"], issues: ["missing-values"],
    columns: cols([["id", "Sitting ID", "id"], ["roll", "Roll No", "id"], ["subject", "Subject", "text"], ["max", "Max marks", "number"], ["marks", "Marks", "number"], ["date", "Exam date", "date"], ["centre", "Centre", "text"], ["status", "Status", "text"]]),
    gen: (r) => Array.from({ length: 400 }, (_, i) => { const absent = r.chance(0.07), subj = r.pick(["Maths", "Physics", "Chemistry", "English", "Computer Science"]); return [`X${String(i + 1).padStart(4, "0")}`, roll(r.int(0, 19)), subj, 100, absent ? null : r.int(18, 99), dateIn(r, D(2025, 11, 3), 14), r.pick(["Hall A", "Hall B", "Hall C", "Lab 1"]), absent ? "Absent" : "Present"]; }),
  }),
  ds({
    id: "DS-EDU-FEES", alias: "fees", sheet: "Fees", title: "Fee collection and balances", category: "Education", tier: "Medium", rowCount: 80, related: ["DS-EDU-FEEPAY"],
    description: "80 students: total fee, amount recorded as paid, due date and last payment date (blank when nothing was paid).",
    topics: ["Fee collection and outstanding balances"], concepts: ["LG", "FIN", "CS", "CA", "DT"], issues: ["missing-values"],
    columns: cols([["roll", "Roll No", "id"], ["name", "Student", "text"], ["programme", "Programme", "text"], ["total", "Total fee", "currency"], ["paid", "Paid", "currency"], ["due", "Due date", "date"], ["last", "Last payment", "date"]]),
    gen: (r) => Array.from({ length: 80 }, (_, i) => { const total = r.pick([48000, 52000, 60000, 72000]); const paid = r.weighted([0, total, total * 0.5, total * 0.75, total * 0.25], [1, 5, 3, 2, 1]); return [`R${201 + i}`, stuName(i + 20), r.pick(["B.Sc", "B.Com", "BCA", "BBA"]), total, paid, D(2025, 9, 30), paid === 0 ? null : dateIn(r, D(2025, 7, 1), 100)]; }),
  }),
  ds({
    id: "DS-EDU-FEEPAY", alias: "feepay", sheet: "FeeReceipts", title: "Fee receipts ledger", category: "Education", tier: "Hard", rowCount: 300, related: ["DS-EDU-FEES"],
    description: "300 receipts, each against a student's roll number. The ledger totals match the Fees sheet except for a few intentional differences.",
    topics: ["Fee collection and outstanding balances"], concepts: ["CA", "CS", "LK"], issues: ["unmatched-keys"],
    columns: cols([["receipt", "Receipt", "id"], ["roll", "Roll No", "id"], ["date", "Paid on", "date"], ["amount", "Amount", "currency"], ["mode", "Mode", "text"]]),
    gen: (r) => Array.from({ length: 300 }, (_, i) => [`RC${String(i + 1).padStart(4, "0")}`, i % 61 === 7 ? "R999" : `R${201 + r.int(0, 79)}`, dateIn(r, D(2025, 7, 1), 100), r.pick([5000, 6000, 12000, 12500, 15000, 18000]), r.pick(["UPI", "Card", "Bank", "Cash"])]),
  }),
  ds({
    id: "DS-EDU-FACULTY", alias: "faculty", sheet: "Faculty", title: "Faculty workload", category: "Education", tier: "Easy", rowCount: 30,
    description: "30 faculty members with lecture hours, lab hours and courses handled per week.",
    topics: ["Faculty workload"], concepts: ["LG", "CA", "FIN", "DA", "SF"],
    columns: cols([["id", "Faculty ID", "id"], ["name", "Name", "text"], ["dept", "Department", "text"], ["desig", "Designation", "text"], ["lecture", "Lecture hrs/wk", "number"], ["lab", "Lab hrs/wk", "number"], ["courses", "Courses", "number"]]),
    gen: (r) => Array.from({ length: 30 }, (_, i) => [`F${String(i + 1).padStart(3, "0")}`, `Dr. ${personName(i + 120)}`, r.pick(["Computer Science", "Mathematics", "Physics", "Economics", "Business"]), r.weighted(["Professor", "Associate Professor", "Assistant Professor"], [2, 4, 6]), r.int(6, 18), r.int(0, 10), r.int(1, 5)]),
  }),
  ds({
    id: "DS-EDU-SCHOLAR", alias: "scholar", sheet: "Scholarship", title: "Scholarship applications", category: "Education", tier: "Medium", rowCount: 60,
    description: "60 applicants with CGPA, attendance, family income and the scheme they applied for.",
    topics: ["Scholarship eligibility"], concepts: ["LG", "CA", "CS"],
    columns: cols([["roll", "Roll No", "id"], ["name", "Student", "text"], ["cgpa", "CGPA", "number"], ["attend", "Attendance %", "percent"], ["income", "Family income", "currency"], ["scheme", "Scheme", "text"]]),
    gen: (r) => Array.from({ length: 60 }, (_, i) => [`R${301 + i}`, stuName(i + 60), roundTo(r.money(5.5, 9.9, 0.1), 1), roundTo(r.money(0.6, 1, 0.01), 2), r.money(120000, 1200000, 10000), r.weighted(["Merit", "Need-based", "Sports"], [5, 4, 1])]),
  }),
];

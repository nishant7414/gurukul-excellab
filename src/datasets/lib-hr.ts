import { defineDataset as ds } from "./define";
import { cols } from "./types";
import { D, dateIn, pad } from "./rng";
import { DEPTS, empIds, personName } from "./masters";

const DESIG: Record<string, string[]> = { Sales: ["Sales Executive", "Account Manager", "Sales Lead"], Finance: ["Accountant", "Analyst", "Finance Manager"], HR: ["HR Executive", "Recruiter", "HR Manager"], IT: ["Developer", "System Admin", "IT Lead"], Operations: ["Coordinator", "Supervisor", "Ops Manager"], Marketing: ["Marketer", "Content Writer", "Brand Manager"], Support: ["Support Agent", "Senior Agent", "Support Lead"] };
const LOC = ["Pune", "Nagpur", "Indore", "Kochi"];
const salaryOf = (dep: string, lvl: number, k: number) => ({ Sales: 32000, Finance: 38000, HR: 34000, IT: 52000, Operations: 30000, Marketing: 36000, Support: 26000 } as Record<string, number>)[dep] + lvl * 14000 + (k % 7) * 1000;

export const HR_DATASETS = [
  ds({
    id: "DS-HR-DIRECTORY", alias: "dir", sheet: "Directory", title: "Employee directory", category: "Human Resources", tier: "Easy", rowCount: 15, related: ["DS-HR-EMP"],
    description: "A short staff directory: employee ID, name, department and location.",
    topics: ["Employee master records using synthetic employee IDs"], concepts: ["LK", "DA", "SF", "CA"],
    columns: cols([["id", "Employee ID", "id"], ["name", "Name", "text"], ["dept", "Department", "text"], ["loc", "Location", "text"]]),
    gen: (r) => empIds(15).map((id, i) => [id, personName(i + 200), DEPTS[i % 7], r.pick(LOC)]),
  }),
  ds({
    id: "DS-HR-EMP", alias: "emp", sheet: "Employees", title: "Employee master", category: "Human Resources", tier: "Medium", rowCount: 60, related: ["DS-HR-ATTEND", "DS-HR-RATINGS", "DS-HR-PAYROLL"],
    description: "60 employees with synthetic IDs, department, designation, joining date, monthly salary and location.",
    topics: ["Employee master records using synthetic employee IDs", "Department-wise headcount"], concepts: ["LK", "CA", "LG", "DT", "DA", "SF", "CS", "TX"],
    columns: cols([["id", "Employee ID", "id"], ["name", "Name", "text"], ["dept", "Department", "text"], ["desig", "Designation", "text"], ["joined", "Joined", "date"], ["salary", "Monthly salary", "currency"], ["loc", "Location", "text"], ["status", "Status", "text"]]),
    gen: (r) => empIds(60).map((id, i) => { const dep = DEPTS[i % 7], lvl = r.weighted([0, 1, 2], [5, 3, 1]); return [id, personName(i + 220), dep, DESIG[dep][lvl], dateIn(r, D(2016, 1, 1), 3300), salaryOf(dep, lvl, i), r.pick(LOC), r.weighted(["Active", "On leave", "Resigned"], [15, 1, 2])]; }),
  }),
  ds({
    id: "DS-HR-ATTEND", alias: "hrattend", sheet: "Attendance", title: "Attendance and leave", category: "Human Resources", tier: "Medium", rowCount: 100, related: ["DS-HR-EMP"],
    description: "Monthly attendance for 50 of the 60 employees over two months: days present, absent and leave taken. Ten employees have no record (new joiners).",
    topics: ["Attendance and leave records"], concepts: ["LK", "CA", "LG", "CS", "DT"], issues: ["unmatched-keys"],
    columns: cols([["emp", "Employee ID", "id"], ["month", "Month", "date"], ["present", "Days present", "number"], ["absent", "Days absent", "number"], ["leave", "Leave taken", "number"], ["holidays", "Paid holidays", "number"]]),
    gen: (r) => [D(2025, 8, 1), D(2025, 9, 1)].flatMap((m) => empIds(50).map((id) => { const a = r.weighted([0, 1, 2, 3], [8, 4, 2, 1]), l = r.weighted([0, 1, 2], [9, 3, 1]); return [id, m, 26 - a - l - 2, a, l, 2]; })),
  }),
  ds({
    id: "DS-HR-PAYROLL", alias: "payroll", sheet: "Payroll", title: "Payroll inputs", category: "Human Resources", tier: "Medium", rowCount: 40, related: ["DS-HR-EMP"],
    description: "40 employees: basic pay, allowance percentage, fixed deductions and days worked in a 30-day month.",
    topics: ["Payroll calculations"], concepts: ["FIN", "LG", "LK", "CS", "RF"],
    columns: cols([["emp", "Employee ID", "id"], ["basic", "Basic pay", "currency"], ["allow", "Allowance %", "percent"], ["deduct", "Deductions", "currency"], ["days", "Days worked", "number"]]),
    gen: (r) => empIds(40).map((id, i) => [id, salaryOf(DEPTS[i % 7], 1, i) * 0.6, r.pick([0.2, 0.25, 0.3, 0.4]), r.pick([1200, 1800, 2400, 3000]), r.weighted([30, 29, 28, 27, 25], [12, 3, 2, 1, 1])]),
  }),
  ds({
    id: "DS-HR-HEADCOUNT", alias: "headcount", sheet: "Headcount", title: "Department headcount by quarter", category: "Human Resources", tier: "Easy", rowCount: 7,
    description: "Seven departments with headcount at the end of each quarter and the approved budgeted headcount.",
    topics: ["Department-wise headcount"], concepts: ["SM", "RF", "LG"],
    columns: cols([["dept", "Department", "text"], ["q1", "Q1", "number"], ["q2", "Q2", "number"], ["q3", "Q3", "number"], ["q4", "Q4", "number"], ["budget", "Budgeted", "number"]]),
    gen: (r) => DEPTS.map((d) => { const b = r.int(8, 40); return [d, b - r.int(0, 3), b - r.int(0, 3), b - r.int(-1, 2), b - r.int(-2, 2), b]; }),
  }),
  ds({
    id: "DS-HR-RECRUIT", alias: "recruit", sheet: "Recruitment", title: "Recruitment pipeline", category: "Human Resources", tier: "Medium", rowCount: 120, related: ["DS-HR-EMP"],
    description: "120 candidates with role, source, current stage and dates. Offer date is blank unless an offer was made.",
    topics: ["Recruitment pipeline"], concepts: ["CA", "DT", "LG", "DA", "CS"], issues: ["missing-values"],
    columns: cols([["id", "Candidate ID", "id"], ["role", "Role", "text"], ["source", "Source", "text"], ["stage", "Stage", "text"], ["applied", "Applied on", "date"], ["offer", "Offer date", "date"]]),
    gen: (r) => Array.from({ length: 120 }, (_, i) => { const stage = r.weighted(["Applied", "Screened", "Interview", "Offer", "Joined", "Rejected"], [3, 3, 3, 2, 2, 6]); const ap = dateIn(r, D(2025, 4, 1), 120); return [`CAN${pad(i + 1, 3)}`, r.pick(["Developer", "Analyst", "Recruiter", "Designer", "Sales Executive"]), r.pick(["Referral", "Job portal", "Campus", "Agency", "Careers page"]), stage, ap, stage === "Offer" || stage === "Joined" ? ap + r.int(14, 40) : null]; }),
  }),
  ds({
    id: "DS-HR-RATINGS", alias: "ratings", sheet: "Ratings", title: "Employee performance ratings", category: "Human Resources", tier: "Medium", rowCount: 80, related: ["DS-HR-EMP"],
    description: "80 performance ratings (1-5) with goals met and review year.",
    topics: ["Employee performance ratings"], concepts: ["CA", "LG", "LK", "DA", "SF"],
    columns: cols([["emp", "Employee ID", "id"], ["dept", "Department", "text"], ["year", "Year", "number"], ["rating", "Rating", "number"], ["goals", "Goals met %", "percent"]]),
    gen: (r) => Array.from({ length: 80 }, (_, i) => [empIds(40)[i % 40], DEPTS[(i % 40) % 7], i < 40 ? 2024 : 2025, r.weighted([1, 2, 3, 4, 5], [1, 3, 8, 5, 2]), r.money(0.4, 1, 0.05)]),
  }),
  ds({
    id: "DS-HR-OVERTIME", alias: "overtime", sheet: "Overtime", title: "Overtime log", category: "Human Resources", tier: "Medium", rowCount: 100, related: ["DS-HR-EMP"],
    description: "100 overtime entries with day type (weekday, weekend, holiday) and hours worked.",
    topics: ["Overtime calculations"], concepts: ["CA", "LG", "FIN", "DT"],
    columns: cols([["emp", "Employee ID", "id"], ["date", "Date", "date"], ["type", "Day type", "text"], ["hours", "Hours", "number"]]),
    gen: (r) => Array.from({ length: 100 }, () => [r.pick(empIds(20)), dateIn(r, D(2025, 9, 1), 29), r.weighted(["Weekday", "Weekend", "Holiday"], [6, 3, 1]), r.pick([1, 1.5, 2, 2.5, 3, 4, 5])]),
  }),
  ds({
    id: "DS-HR-ATTRITION", alias: "attrition", sheet: "Attrition", title: "Employee attrition records", category: "Human Resources", tier: "Hard", rowCount: 600, related: ["DS-HR-EMP"],
    description: "600 employee records over several years; exit date and reason are blank for current staff.",
    topics: ["Attrition analysis"], concepts: ["CA", "DT", "DA", "CS", "LG"], issues: ["missing-values"],
    columns: cols([["id", "Employee ID", "id"], ["dept", "Department", "text"], ["band", "Salary band", "text"], ["rating", "Last rating", "number"], ["joined", "Joined", "date"], ["exit", "Exit date", "date"], ["reason", "Exit reason", "text"], ["manager", "Manager ID", "id"]]),
    gen: (r) => Array.from({ length: 600 }, (_, i) => { const j = dateIn(r, D(2019, 1, 1), 2100); const left = r.chance(0.28) && j < D(2025, 6, 1); const dept = r.pick(DEPTS); const band = r.weighted(["B1", "B2", "B3", "B4"], [5, 4, 2, 1]); return [`A${pad(i + 1, 4)}`, dept, band, r.weighted([1, 2, 3, 4, 5], [2, 3, 8, 5, 2]), j, left ? Math.min(j + r.int(120, 1400), D(2025, 12, 31)) : null, left ? r.weighted(["Better offer", "Relocation", "Personal", "Performance", "Higher studies"], [5, 2, 3, 1, 1]) : null, `M${pad(r.int(1, 25), 3)}`]; }),
  }),
];

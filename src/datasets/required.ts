import type { DataCategory } from "./types";

/** Every dataset topic the product brief lists, by category. The coverage report checks each is covered by a registered dataset. */
export const REQUIRED_TOPICS: Record<Exclude<DataCategory, "Original workbook">, string[]> = {
  Education: ["Student marks and grades", "Student attendance", "Semester-wise academic performance", "Course enrollment", "Examination results", "Fee collection and outstanding balances", "Faculty workload", "Scholarship eligibility"],
  "Sales and E-commerce": ["Product catalog", "Daily sales transactions", "Monthly sales summaries", "Customer orders", "Product returns and refunds", "Discounts and promotional campaigns", "Salesperson performance", "Regional sales targets", "Customer purchase history", "Inventory and reorder levels"],
  "Human Resources": ["Employee master records using synthetic employee IDs", "Attendance and leave records", "Payroll calculations", "Department-wise headcount", "Recruitment pipeline", "Employee performance ratings", "Overtime calculations", "Attrition analysis"],
  "Finance and Accounting": ["Monthly income and expenses", "Department budgets", "Actual versus budgeted expenditure", "Invoice tracking", "Payment reconciliation", "Loan repayment schedules", "Cash flow forecasts", "Profit and loss calculations"],
  "Inventory and Supply Chain": ["Warehouse stock", "Purchase orders", "Supplier catalogs", "Goods received records", "Stock movement", "Reorder alerts", "Delivery performance", "Product expiry tracking", "Multi-warehouse inventory"],
  "Customer Service and Marketing": ["Customer support tickets", "Resolution time and SLA compliance", "Customer satisfaction scores", "Marketing campaign performance", "Lead conversion", "Website traffic", "Customer segmentation", "Retention and churn analysis"],
  "Operations and Other": ["Hotel bookings", "Restaurant orders", "Logistics and shipment tracking", "Project task tracking", "Employee shift schedules", "Electricity consumption", "Survey responses", "Manufacturing production", "Quality inspection records", "Event registrations"],
  "Data Cleaning": ["Leading and trailing spaces", "Inconsistent capitalization", "Extra spaces between words", "Duplicate rows", "Missing values", "Dates stored as text", "Inconsistent date formats", "Numbers stored as text", "Inconsistent product codes", "Inconsistent category labels", "Invalid or out-of-range values", "Lookup keys with leading zeros", "Unmatched records across related tables"],
};

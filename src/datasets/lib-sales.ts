import { defineDataset as ds } from "./define";
import { cols } from "./types";
import { D, dateIn, emailOf, pad, REGIONS, roundTo } from "./rng";
import { customerIds, personName, products } from "./masters";

const REPS = ["Asha Kulkarni", "Bilal Sheikh", "Chitra Nair", "Dev Malhotra", "Esha Rao", "Farid Khan", "Gauri Joshi", "Harsh Vyas"];

export const SALES_DATASETS = [
  ds({
    id: "DS-SAL-PRODUCTS", alias: "products", sheet: "Products", title: "Product catalogue", category: "Sales and E-commerce", tier: "Easy", rowCount: 25, related: ["DS-SAL-ORDERS", "DS-SAL-TXN", "DS-INV-STOCK"],
    description: "25 products in five categories with a unit price and unit cost.",
    topics: ["Product catalog"], concepts: ["LK", "CA", "RF", "DA", "SF", "TX", "CS"],
    columns: cols([["id", "Product ID", "id"], ["name", "Product", "text"], ["cat", "Category", "text"], ["price", "Unit price", "currency"], ["cost", "Unit cost", "currency"]]),
    gen: () => products().map((p) => [p.id, p.name, p.cat, p.price, p.cost]),
  }),
  ds({
    id: "DS-SAL-TXN", alias: "txn", sheet: "Sales", title: "Daily sales transactions", category: "Sales and E-commerce", tier: "Hard", rowCount: 1500, related: ["DS-SAL-PRODUCTS", "DS-SAL-REPS"],
    description: "1,500 sales lines across six months with region, salesperson, quantity, discount and the net amount.",
    topics: ["Daily sales transactions", "Discounts and promotional campaigns"], concepts: ["CA", "DT", "CS", "DA", "FIN"],
    columns: cols([["id", "Txn ID", "id"], ["date", "Date", "date"], ["product", "Product ID", "id"], ["region", "Region", "text"], ["rep", "Salesperson", "text"], ["qty", "Qty", "number"], ["disc", "Discount %", "percent"], ["amount", "Net amount", "currency"]]),
    gen: (r) => { const ps = products(); return Array.from({ length: 1500 }, (_, i) => { const p = r.pick(ps), qty = r.int(1, 12), disc = r.weighted([0, 0.05, 0.1, 0.2], [10, 4, 3, 1]); return [`T${pad(i + 1, 5)}`, D(2025, 1, 1) + Math.floor((i / 1500) * 181) + r.int(0, 1), p.id, r.pick(REGIONS), r.pick(REPS), qty, disc, roundTo(qty * p.price * (1 - disc), 2)]; }); },
  }),
  ds({
    id: "DS-SAL-MONTHLY", alias: "monthly", sheet: "Monthly", title: "Monthly sales summary", category: "Sales and E-commerce", tier: "Easy", rowCount: 12,
    description: "One year of monthly units, revenue and returns.",
    topics: ["Monthly sales summaries"], concepts: ["SM", "RF", "FIN", "DT"],
    columns: cols([["month", "Month", "date"], ["units", "Units sold", "number"], ["revenue", "Revenue", "currency"], ["returns", "Returns", "currency"]]),
    gen: (r) => Array.from({ length: 12 }, (_, i) => { const u = r.int(420, 980); return [D(2025, i + 1, 1), u, u * r.int(310, 360), r.int(2000, 22000)]; }),
  }),
  ds({
    id: "DS-SAL-CUSTOMERS", alias: "customers", sheet: "Customers", title: "Customer master", category: "Sales and E-commerce", tier: "Medium", rowCount: 80, related: ["DS-SAL-ORDERS"],
    description: "80 customers with city, segment and join date. Emails use the reserved example.com domain.",
    topics: ["Customer purchase history"], concepts: ["LK", "TX", "CS", "DA", "CA"],
    columns: cols([["id", "Customer ID", "id"], ["name", "Customer", "text"], ["city", "City", "text"], ["segment", "Segment", "text"], ["joined", "Joined", "date"], ["email", "Email", "text"]]),
    gen: (r) => customerIds(80).map((id, i) => { const nm = personName(i); return [id, nm, r.pick(["Pune", "Nagpur", "Indore", "Kochi", "Jaipur", "Surat"]), r.weighted(["Retail", "Corporate", "Wholesale"], [6, 3, 1]), dateIn(r, D(2022, 1, 1), 1100), emailOf(nm)]; }),
  }),
  ds({
    id: "DS-SAL-ORDERS", alias: "orders", sheet: "Orders", title: "Customer orders", category: "Sales and E-commerce", tier: "Medium", rowCount: 150, related: ["DS-SAL-PRODUCTS", "DS-SAL-CUSTOMERS", "DS-SAL-RETURNS"],
    description: "150 order lines with customer, product, quantity and order status.",
    topics: ["Customer orders"], concepts: ["LK", "CA", "LG", "DT", "CS", "DA", "SF"],
    columns: cols([["id", "Order ID", "id"], ["date", "Order date", "date"], ["cust", "Customer ID", "id"], ["product", "Product ID", "id"], ["qty", "Qty", "number"], ["status", "Status", "text"], ["ship", "Shipped on", "date"]]),
    gen: (r) => { const ps = products(); return Array.from({ length: 150 }, (_, i) => { const date = D(2025, 3, 1) + Math.floor(i * 0.55) + r.int(0, 2); const status = r.weighted(["Delivered", "Shipped", "Pending", "Cancelled"], [10, 3, 2, 1]); return [`O${pad(i + 1, 4)}`, date, r.pick(customerIds(80)), r.pick(ps).id, r.int(1, 8), status, status === "Pending" || status === "Cancelled" ? null : date + r.int(1, 6)]; }); },
  }),
  ds({
    id: "DS-SAL-RETURNS", alias: "returns", sheet: "Returns", title: "Product returns and refunds", category: "Sales and E-commerce", tier: "Medium", rowCount: 70, related: ["DS-SAL-ORDERS"],
    description: "70 return requests with reason, refund amount and approval.",
    topics: ["Product returns and refunds"], concepts: ["CA", "LG", "DA", "FIN"],
    columns: cols([["id", "Return ID", "id"], ["order", "Order ID", "id"], ["date", "Return date", "date"], ["reason", "Reason", "text"], ["refund", "Refund amount", "currency"], ["approved", "Approved", "text"]]),
    gen: (r) => Array.from({ length: 70 }, (_, i) => [`RT${pad(i + 1, 3)}`, `O${pad(r.int(1, 150), 4)}`, dateIn(r, D(2025, 3, 10), 90), r.weighted(["Damaged", "Wrong item", "Changed mind", "Late delivery", "Defective"], [3, 2, 3, 1, 3]), r.money(120, 4800, 10), r.weighted(["Yes", "No"], [8, 2])]),
  }),
  ds({
    id: "DS-SAL-PROMO", alias: "promo", sheet: "Promotions", title: "Discount and promotion codes", category: "Sales and E-commerce", tier: "Easy", rowCount: 10,
    description: "Ten promotion codes with campaign name, discount, validity window and minimum order value.",
    topics: ["Discounts and promotional campaigns"], concepts: ["LK", "LG", "DT", "RF"],
    columns: cols([["code", "Promo code", "id"], ["campaign", "Campaign", "text"], ["disc", "Discount", "percent"], ["start", "Starts", "date"], ["end", "Ends", "date"], ["min", "Minimum order", "currency"]]),
    gen: () => [["NEWYEAR10", "New Year Sale", 0.1, D(2025, 1, 1), D(2025, 1, 15), 1000], ["VALENT15", "Valentine Week", 0.15, D(2025, 2, 7), D(2025, 2, 14), 1500], ["SPRING5", "Spring Refresh", 0.05, D(2025, 3, 1), D(2025, 3, 31), 500], ["EID12", "Festive Offer", 0.12, D(2025, 3, 28), D(2025, 4, 2), 1200], ["SUMMER20", "Summer Clearance", 0.2, D(2025, 5, 1), D(2025, 5, 31), 2500], ["MONSOON8", "Monsoon Deals", 0.08, D(2025, 6, 15), D(2025, 7, 15), 800], ["RAKHI10", "Rakhi Gifts", 0.1, D(2025, 8, 5), D(2025, 8, 12), 900], ["DIWALI25", "Diwali Mega", 0.25, D(2025, 10, 15), D(2025, 11, 5), 3000], ["BLACKFRI18", "Black Friday", 0.18, D(2025, 11, 24), D(2025, 11, 30), 2000], ["YEAREND7", "Year-end Special", 0.07, D(2025, 12, 20), D(2025, 12, 31), 700]],
  }),
  ds({
    id: "DS-SAL-REPS", alias: "reps", sheet: "RepPerformance", title: "Salesperson performance by quarter", category: "Sales and E-commerce", tier: "Medium", rowCount: 32, related: ["DS-SAL-REGTARGET"],
    description: "8 salespeople x 4 quarters: region, sales achieved, calls made and deals closed.",
    topics: ["Salesperson performance"], concepts: ["LK", "CA", "LG", "CS", "SF", "DA"],
    columns: cols([["rep", "Salesperson", "text"], ["region", "Region", "text"], ["quarter", "Quarter", "text"], ["sales", "Sales", "currency"], ["calls", "Calls", "number"], ["deals", "Deals closed", "number"]]),
    gen: (r) => Array.from({ length: 32 }, (_, k) => { const i = k % 8; return [REPS[i], REGIONS[i % 4], `Q${Math.floor(k / 8) + 1}`, r.money(180000, 960000, 1000), r.int(80, 320), r.int(6, 40)]; }),
  }),
  ds({
    id: "DS-SAL-REGTARGET", alias: "regtarget", sheet: "Targets", title: "Regional quarterly sales targets", category: "Sales and E-commerce", tier: "Easy", rowCount: 4, related: ["DS-SAL-REPS"],
    description: "Four regions with a target for each quarter (a two-way table).",
    topics: ["Regional sales targets"], concepts: ["LK", "SM", "RF"],
    columns: cols([["region", "Region", "text"], ["q1", "Q1", "currency"], ["q2", "Q2", "currency"], ["q3", "Q3", "currency"], ["q4", "Q4", "currency"]]),
    gen: () => [["North", 1500000, 1600000, 1700000, 1900000], ["South", 1400000, 1450000, 1600000, 1800000], ["East", 1100000, 1200000, 1250000, 1400000], ["West", 1700000, 1750000, 1900000, 2100000]],
  }),
  ds({
    id: "DS-SAL-HISTORY", alias: "history", sheet: "Purchases", title: "Customer purchase history", category: "Sales and E-commerce", tier: "Medium", rowCount: 200, related: ["DS-SAL-CUSTOMERS"],
    description: "200 purchases by 40 customers with category, channel and amount.",
    topics: ["Customer purchase history"], concepts: ["CA", "DA", "LK", "DT", "SF"],
    columns: cols([["cust", "Customer ID", "id"], ["date", "Date", "date"], ["cat", "Category", "text"], ["channel", "Channel", "text"], ["amount", "Amount", "currency"]]),
    gen: (r) => Array.from({ length: 200 }, () => [`C${pad(r.int(1, 40), 4)}`, dateIn(r, D(2025, 1, 1), 330), r.pick(["Electronics", "Stationery", "Home", "Fitness", "Grocery"]), r.weighted(["Online", "Store", "App"], [5, 3, 4]), r.money(150, 9000, 10)]),
  }),
];

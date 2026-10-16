import { defineDataset as ds } from "./define";
import { cols } from "./types";
import { D, dateIn, pad, roundTo } from "./rng";
import { customerIds } from "./masters";

const AGENTS = ["Agent Ravi", "Agent Sunita", "Agent Pooja", "Agent Imran", "Agent Kiran", "Agent Dolly"];

export const SERVICE_DATASETS = [
  ds({
    id: "DS-SUP-SLA", alias: "sla", sheet: "SLA", title: "SLA targets by priority", category: "Customer Service and Marketing", tier: "Easy", rowCount: 4, related: ["DS-SUP-TICKETS"],
    description: "Four ticket priorities with the number of hours allowed to resolve each.",
    topics: ["Resolution time and SLA compliance"], concepts: ["LK", "LG"],
    columns: cols([["priority", "Priority", "text"], ["hours", "SLA hours", "number"], ["first", "First response (hrs)", "number"]]),
    gen: () => [["Urgent", 4, 0.5], ["High", 24, 2], ["Medium", 72, 8], ["Low", 120, 24]],
  }),
  ds({
    id: "DS-SUP-TICKETS", alias: "tickets", sheet: "Tickets", title: "Customer support tickets", category: "Customer Service and Marketing", tier: "Hard", rowCount: 800, related: ["DS-SUP-SLA", "DS-SUP-CSAT"],
    description: "800 tickets with opened and closed date-times, priority, channel, agent and category. Open tickets have no closed time; CSAT is blank when the customer did not respond.",
    topics: ["Customer support tickets", "Resolution time and SLA compliance", "Customer satisfaction scores"], concepts: ["CA", "LG", "DT", "CS", "DA", "LK"], issues: ["missing-values"],
    columns: cols([["id", "Ticket ID", "id"], ["opened", "Opened", "date"], ["closed", "Closed", "date"], ["priority", "Priority", "text"], ["channel", "Channel", "text"], ["agent", "Agent", "text"], ["cat", "Category", "text"], ["csat", "CSAT (1-5)", "number"]]),
    gen: (r) => Array.from({ length: 800 }, (_, i) => {
      const pr = r.weighted(["Urgent", "High", "Medium", "Low"], [1, 3, 6, 3]);
      const op = D(2025, 6, 1) + Math.floor(i / 5) * 1 + roundTo(r.next(), 3);
      const lim = ({ Urgent: 4, High: 24, Medium: 72, Low: 120 } as Record<string, number>)[pr]!;
      const open = r.chance(0.06);
      const hrs = lim * r.money(0.2, 1.5, 0.01);
      return [`TK${pad(i + 1, 5)}`, op, open ? null : roundTo(op + hrs / 24, 3), pr, r.weighted(["Email", "Chat", "Phone", "Web form"], [4, 4, 2, 2]), r.pick(AGENTS), r.pick(["Billing", "Login", "Delivery", "Product", "Refund"]), open || r.chance(0.35) ? null : r.weighted([1, 2, 3, 4, 5], [1, 1, 2, 5, 4])];
    }),
  }),
  ds({
    id: "DS-SUP-CSAT", alias: "csat", sheet: "Survey", title: "Customer satisfaction survey", category: "Customer Service and Marketing", tier: "Medium", rowCount: 150,
    description: "150 survey responses with a satisfaction score (1-5), a recommend score (0-10) and the channel used.",
    topics: ["Customer satisfaction scores"], concepts: ["CA", "LG", "SM", "DA"],
    columns: cols([["cust", "Customer ID", "id"], ["date", "Date", "date"], ["score", "Satisfaction", "number"], ["nps", "Recommend (0-10)", "number"], ["channel", "Channel", "text"]]),
    gen: (r) => Array.from({ length: 150 }, () => [r.pick(customerIds(80)), dateIn(r, D(2025, 7, 1), 120), r.weighted([1, 2, 3, 4, 5], [1, 2, 3, 5, 4]), r.weighted([0, 2, 4, 6, 7, 8, 9, 10], [1, 1, 2, 3, 4, 5, 5, 4]), r.pick(["Email", "Chat", "Phone"])]),
  }),
  ds({
    id: "DS-MKT-CAMPAIGNS", alias: "campaigns", sheet: "Campaigns", title: "Marketing campaign performance", category: "Customer Service and Marketing", tier: "Medium", rowCount: 40, related: ["DS-MKT-LEADS"],
    description: "40 campaigns with channel, spend, impressions, clicks, leads and revenue attributed.",
    topics: ["Marketing campaign performance"], concepts: ["CA", "FIN", "LG", "LK", "SF", "DA"],
    columns: cols([["id", "Campaign ID", "id"], ["channel", "Channel", "text"], ["spend", "Spend", "currency"], ["impr", "Impressions", "number"], ["clicks", "Clicks", "number"], ["leads", "Leads", "number"], ["revenue", "Revenue", "currency"]]),
    gen: (r) => Array.from({ length: 40 }, (_, i) => { const imp = r.int(20000, 400000), clicks = Math.round(imp * r.money(0.008, 0.05, 0.001)); const leads = Math.round(clicks * r.money(0.03, 0.2, 0.01)); const spend = r.money(15000, 220000, 500); return [`CMP${pad(i + 1, 3)}`, r.pick(["Search", "Social", "Email", "Display", "Influencer"]), spend, imp, clicks, leads, Math.round(leads * r.money(1200, 9000, 100))]; }),
  }),
  ds({
    id: "DS-MKT-LEADS", alias: "leads", sheet: "Leads", title: "Lead conversion log", category: "Customer Service and Marketing", tier: "Hard", rowCount: 700, related: ["DS-MKT-CAMPAIGNS"],
    description: "700 leads with source, campaign, owner, funnel stage, conversion flag and deal value (blank unless converted).",
    topics: ["Lead conversion"], concepts: ["CA", "LK", "LG", "CS", "DA", "DT"], issues: ["missing-values"],
    columns: cols([["id", "Lead ID", "id"], ["created", "Created", "date"], ["source", "Source", "text"], ["campaign", "Campaign ID", "id"], ["owner", "Owner", "text"], ["stage", "Stage", "text"], ["converted", "Converted", "text"], ["value", "Deal value", "currency"]]),
    gen: (r) => Array.from({ length: 700 }, (_, i) => { const conv = r.chance(0.16); const stage = conv ? "Won" : r.weighted(["New", "Contacted", "Qualified", "Proposal", "Lost"], [2, 3, 3, 2, 5]); return [`LD${pad(i + 1, 4)}`, D(2025, 1, 1) + Math.floor(i * 0.3) + r.int(0, 1), r.pick(["Search", "Social", "Email", "Display", "Influencer"]), `CMP${pad(r.int(1, 40), 3)}`, r.pick(["Anil", "Bela", "Chirag", "Divya", "Eshan"]), stage, conv ? "Yes" : "No", conv ? r.money(8000, 160000, 500) : null]; }),
  }),
  ds({
    id: "DS-MKT-TRAFFIC", alias: "traffic", sheet: "Traffic", title: "Website traffic by channel", category: "Customer Service and Marketing", tier: "Medium", rowCount: 120, related: ["DS-MKT-CAMPAIGNS"],
    description: "30 days x 4 traffic channels: sessions, users, bounce rate and conversions.",
    topics: ["Website traffic"], concepts: ["CA", "SM", "DT", "DA", "LG", "SF"],
    columns: cols([["date", "Date", "date"], ["channel", "Channel", "text"], ["sessions", "Sessions", "number"], ["users", "Users", "number"], ["bounce", "Bounce rate", "percent"], ["conv", "Conversions", "number"]]),
    gen: (r) => Array.from({ length: 120 }, (_, k) => { const s = r.int(180, 1800); return [D(2025, 11, 1) + Math.floor(k / 4), ["Organic", "Paid", "Social", "Direct"][k % 4], s, Math.round(s * r.money(0.6, 0.9, 0.01)), r.money(0.25, 0.7, 0.01), Math.round(s * r.money(0.01, 0.06, 0.001))]; }),
  }),
  ds({
    id: "DS-MKT-SEGMENTS", alias: "segments", sheet: "Segments", title: "Customer segmentation (RFM)", category: "Customer Service and Marketing", tier: "Medium", rowCount: 100, related: ["DS-SAL-CUSTOMERS"],
    description: "100 customers with days since last purchase (recency), number of orders (frequency) and total spend (monetary).",
    topics: ["Customer segmentation"], concepts: ["LG", "CA", "DA", "SF", "LK"],
    columns: cols([["id", "Customer ID", "id"], ["recency", "Days since last order", "number"], ["orders", "Orders", "number"], ["spend", "Total spend", "currency"], ["plan", "Plan", "text"]]),
    gen: (r) => Array.from({ length: 100 }, (_, i) => [`C${pad(i + 1, 4)}`, r.int(2, 400), r.weighted([1, 2, 3, 5, 8, 12], [6, 5, 4, 3, 2, 1]), r.money(500, 90000, 100), r.weighted(["Free", "Plus", "Pro"], [6, 3, 1])]),
  }),
  ds({
    id: "DS-MKT-CHURN", alias: "churn", sheet: "Subscriptions", title: "Subscription retention and churn", category: "Customer Service and Marketing", tier: "Hard", rowCount: 500, related: ["DS-MKT-SEGMENTS"],
    description: "500 subscriptions with plan, start date, end date (blank while active), monthly revenue and cancellation reason.",
    topics: ["Retention and churn analysis"], concepts: ["CA", "DT", "LG", "DA", "CS"], issues: ["missing-values"],
    columns: cols([["id", "Customer ID", "id"], ["plan", "Plan", "text"], ["start", "Started", "date"], ["end", "Ended", "date"], ["mrr", "Monthly revenue", "currency"], ["reason", "Reason", "text"]]),
    gen: (r) => Array.from({ length: 500 }, (_, i) => { const s = dateIn(r, D(2023, 1, 1), 900); const plan = r.weighted(["Basic", "Plus", "Pro"], [5, 3, 2]); const left = r.chance(0.34); return [`S${pad(i + 1, 4)}`, plan, s, left ? Math.min(s + r.int(30, 500), D(2025, 12, 31)) : null, ({ Basic: 299, Plus: 599, Pro: 1199 } as Record<string, number>)[plan]!, left ? r.weighted(["Price", "Missing feature", "Switched", "No longer needed"], [4, 3, 2, 2]) : null]; }),
  }),
];

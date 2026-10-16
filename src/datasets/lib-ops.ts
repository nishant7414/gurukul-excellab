import { defineDataset as ds } from "./define";
import { cols } from "./types";
import { CITIES, D, pad, roundTo } from "./rng";
import { empIds } from "./masters";

export const OPS_DATASETS = [
  ds({
    id: "DS-OPS-HOTEL", alias: "hotel", sheet: "Bookings", title: "Hotel bookings", category: "Operations and Other", tier: "Medium", rowCount: 150,
    description: "150 bookings with room type, check-in and check-out dates, nightly rate, channel and status.",
    topics: ["Hotel bookings"], concepts: ["DT", "CA", "LG", "CS", "SF", "DA"],
    columns: cols([["id", "Booking ID", "id"], ["room", "Room type", "text"], ["in", "Check-in", "date"], ["out", "Check-out", "date"], ["rate", "Rate / night", "currency"], ["channel", "Channel", "text"], ["status", "Status", "text"]]),
    gen: (r) => Array.from({ length: 150 }, (_, i) => { const room = r.weighted(["Standard", "Deluxe", "Suite"], [6, 3, 1]); const inn = D(2025, 10, 1) + Math.floor(i * 0.4) + r.int(0, 3); return [`BK${pad(i + 1, 4)}`, room, inn, inn + r.int(1, 6), ({ Standard: 3200, Deluxe: 4800, Suite: 9500 } as Record<string, number>)[room]! + r.pick([0, 0, 300, 500]), r.pick(["Website", "Agent", "Walk-in", "Portal"]), r.weighted(["Confirmed", "Checked out", "Cancelled", "No-show"], [4, 8, 2, 1])]; }),
  }),
  ds({
    id: "DS-OPS-RESTO", alias: "resto", sheet: "RestaurantOrders", title: "Restaurant orders", category: "Operations and Other", tier: "Medium", rowCount: 200,
    description: "200 order lines from a restaurant: table, menu item, category, quantity, price and waiter.",
    topics: ["Restaurant orders"], concepts: ["CA", "LK", "DA", "SF", "CS"],
    columns: cols([["no", "Order No", "id"], ["date", "Date", "date"], ["table", "Table", "number"], ["item", "Item", "text"], ["cat", "Category", "text"], ["qty", "Qty", "number"], ["price", "Price", "currency"], ["waiter", "Waiter", "text"]]),
    gen: (r) => { const menu: [string, string, number][] = [["Paneer Tikka", "Starter", 260], ["Veg Spring Roll", "Starter", 180], ["Dal Makhani", "Main", 290], ["Butter Chicken", "Main", 360], ["Veg Biryani", "Main", 280], ["Garlic Naan", "Bread", 70], ["Tandoori Roti", "Bread", 40], ["Gulab Jamun", "Dessert", 110], ["Ice Cream", "Dessert", 130], ["Masala Chai", "Drinks", 60], ["Fresh Lime Soda", "Drinks", 90]]; return Array.from({ length: 200 }, (_, i) => { const m = r.pick(menu); return [`R${pad(i + 1, 4)}`, D(2025, 11, 1) + Math.floor(i / 7), r.int(1, 14), m[0], m[1], r.int(1, 4), m[2], r.pick(["Anu", "Bharat", "Chandni", "Deepak"])]; }); },
  }),
  ds({
    id: "DS-OPS-SHIP", alias: "ship", sheet: "Shipments", title: "Shipment tracking", category: "Operations and Other", tier: "Medium", rowCount: 180,
    description: "180 shipments: origin, destination, dispatch and delivery dates (blank while in transit), weight and carrier.",
    topics: ["Logistics and shipment tracking", "Delivery performance"], concepts: ["DT", "CA", "LG", "CS", "SF", "DA"], issues: ["missing-values"],
    columns: cols([["id", "Shipment", "id"], ["from", "Origin", "text"], ["to", "Destination", "text"], ["sent", "Dispatched", "date"], ["got", "Delivered", "date"], ["kg", "Weight (kg)", "number"], ["carrier", "Carrier", "text"], ["promised", "Promised days", "number"]]),
    gen: (r) => Array.from({ length: 180 }, (_, i) => { const s = D(2025, 9, 1) + Math.floor(i * 0.6); const promised = r.pick([2, 3, 4, 5]); const transit = r.chance(0.07); return [`SH${pad(i + 1, 4)}`, r.pick(CITIES), r.pick(CITIES), s, transit ? null : s + promised + r.weighted([-1, 0, 1, 2, 4], [2, 6, 4, 2, 1]), roundTo(r.money(0.5, 48, 0.5), 1), r.pick(["FastTrack", "RoadRunner", "BlueDart Lite", "CargoOne"]), promised]; }),
  }),
  ds({
    id: "DS-OPS-TASKS", alias: "tasks", sheet: "Tasks", title: "Project task tracker", category: "Operations and Other", tier: "Medium", rowCount: 60,
    description: "60 tasks across four projects with owner, start and due dates, percent complete and status.",
    topics: ["Project task tracking"], concepts: ["DT", "LG", "CA", "SF", "DA"],
    columns: cols([["id", "Task ID", "id"], ["project", "Project", "text"], ["owner", "Owner", "text"], ["start", "Start", "date"], ["due", "Due", "date"], ["done", "% complete", "percent"], ["priority", "Priority", "text"]]),
    gen: (r) => Array.from({ length: 60 }, (_, i) => { const s = D(2025, 10, 1) + r.int(0, 50); return [`TS${pad(i + 1, 3)}`, r.pick(["Website", "Mobile app", "Migration", "Audit"]), r.pick(["Meena", "Naveen", "Om", "Pallavi", "Qasim"]), s, s + r.int(4, 30), r.pick([0, 0.25, 0.5, 0.75, 1, 1]), r.weighted(["High", "Medium", "Low"], [2, 5, 3])]; }),
  }),
  ds({
    id: "DS-OPS-SHIFTS", alias: "shifts", sheet: "Shifts", title: "Employee shift schedule", category: "Operations and Other", tier: "Medium", rowCount: 80,
    description: "80 shift assignments with start and end times (as Excel times), unpaid break minutes and the shift name.",
    topics: ["Employee shift schedules"], concepts: ["DT", "FIN", "CA", "LG"],
    columns: cols([["emp", "Employee ID", "id"], ["date", "Date", "date"], ["shift", "Shift", "text"], ["start", "Start", "number"], ["end", "End", "number"], ["break", "Break (min)", "number"]]),
    gen: (r) => Array.from({ length: 80 }, (_, i) => { const sh = r.weighted([["Morning", 6, 14], ["Evening", 14, 22], ["Night", 22, 30]] as const, [4, 3, 2]); return [empIds(20)[i % 20], D(2025, 12, 1) + Math.floor(i / 20) * 2 + r.int(0, 1), sh[0], sh[1] / 24, sh[2] / 24, r.pick([30, 45, 60])]; }),
  }),
  ds({
    id: "DS-OPS-ENERGY", alias: "energy", sheet: "Electricity", title: "Electricity consumption", category: "Operations and Other", tier: "Easy", rowCount: 12,
    description: "A year of monthly meter readings: units consumed, tariff per unit and peak demand (kW).",
    topics: ["Electricity consumption"], concepts: ["SM", "RF", "FIN", "CA"],
    columns: cols([["month", "Month", "date"], ["kwh", "Units (kWh)", "number"], ["rate", "Tariff / kWh", "currency"], ["peak", "Peak demand (kW)", "number"]]),
    gen: (r) => Array.from({ length: 12 }, (_, i) => [D(2025, i + 1, 1), r.int(1800, 3900) + (i >= 3 && i <= 6 ? 700 : 0), r.pick([7.5, 8, 8.5]), r.int(12, 34)]),
  }),
  ds({
    id: "DS-OPS-SURVEY", alias: "survey", sheet: "SurveyResponses", title: "Employee survey responses", category: "Operations and Other", tier: "Medium", rowCount: 150,
    description: "150 responses scoring four statements from 1 to 5, with an age band and a recommend flag.",
    topics: ["Survey responses"], concepts: ["CA", "SM", "LG", "DA", "DC"],
    columns: cols([["id", "Response", "id"], ["age", "Age band", "text"], ["q1", "Workload", "number"], ["q2", "Management", "number"], ["q3", "Growth", "number"], ["q4", "Pay", "number"], ["rec", "Recommend", "text"]]),
    gen: (r) => Array.from({ length: 150 }, (_, i) => [`SR${pad(i + 1, 3)}`, r.pick(["18-25", "26-35", "36-45", "46+"]), ...[1, 2, 3, 4].map(() => r.weighted([1, 2, 3, 4, 5], [1, 2, 4, 5, 3])), r.weighted(["Yes", "No"], [7, 3])]),
  }),
  ds({
    id: "DS-OPS-PROD", alias: "prod", sheet: "Production", title: "Manufacturing production log", category: "Operations and Other", tier: "Medium", rowCount: 120,
    description: "120 production runs across 3 lines and 2 shifts: planned and produced units, defects and downtime minutes.",
    topics: ["Manufacturing production"], concepts: ["CA", "LG", "SM", "DA", "SF"],
    columns: cols([["batch", "Batch", "id"], ["date", "Date", "date"], ["line", "Line", "text"], ["shift", "Shift", "text"], ["planned", "Planned", "number"], ["produced", "Produced", "number"], ["defects", "Defects", "number"], ["down", "Downtime (min)", "number"]]),
    gen: (r) => Array.from({ length: 120 }, (_, i) => { const planned = r.pick([500, 600, 800, 1000]); const produced = Math.round(planned * r.money(0.78, 1.04, 0.01)); return [`PB${pad(i + 1, 3)}`, D(2025, 10, 1) + Math.floor(i / 6), ["Line 1", "Line 2", "Line 3"][i % 3], i % 2 ? "Night" : "Day", planned, produced, Math.round(produced * r.money(0.002, 0.05, 0.001)), r.pick([0, 0, 10, 20, 35, 60, 90])]; }),
  }),
  ds({
    id: "DS-OPS-QC", alias: "qc", sheet: "Inspections", title: "Quality inspection records", category: "Operations and Other", tier: "Medium", rowCount: 150, related: ["DS-OPS-PROD"],
    description: "150 inspections of a shaft diameter with a specification window (min and max) and the measured value.",
    topics: ["Quality inspection records"], concepts: ["LG", "CA", "DA", "CS"],
    columns: cols([["id", "Inspection", "id"], ["batch", "Batch", "id"], ["inspector", "Inspector", "text"], ["measure", "Measured (mm)", "number"], ["min", "Spec min", "number"], ["max", "Spec max", "number"]]),
    gen: (r) => Array.from({ length: 150 }, (_, i) => [`QC${pad(i + 1, 4)}`, `PB${pad(r.int(1, 120), 3)}`, r.pick(["Tara", "Uday", "Vera", "Wasim"]), roundTo(r.money(24.7, 25.3, 0.01), 2), 24.8, 25.2]),
  }),
  ds({
    id: "DS-OPS-EVENTS", alias: "events", sheet: "Registrations", title: "Event registrations", category: "Operations and Other", tier: "Medium", rowCount: 100,
    description: "100 registrations for three events with attendee type, registration date, fee and payment status.",
    topics: ["Event registrations"], concepts: ["CA", "DT", "LG", "DA", "SF"],
    columns: cols([["id", "Reg ID", "id"], ["event", "Event", "text"], ["type", "Attendee type", "text"], ["date", "Registered", "date"], ["fee", "Fee", "currency"], ["paid", "Paid", "text"]]),
    gen: (r) => Array.from({ length: 100 }, (_, i) => { const t = r.weighted(["Student", "Professional", "Speaker"], [4, 5, 1]); return [`EV${pad(i + 1, 3)}`, r.pick(["Data Summit", "Excel Day", "Finance Forum"]), t, D(2025, 9, 1) + r.int(0, 60), t === "Student" ? 500 : t === "Speaker" ? 0 : 1500, r.weighted(["Yes", "No"], [8, 2])]; }),
  }),
];

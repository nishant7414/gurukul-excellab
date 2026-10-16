import { defineDataset as ds } from "./define";
import { cols } from "./types";
import { D, FIRST, LAST, pad, roundTo, type Rng } from "./rng";
import { customerIds, personName, products } from "./masters";
import { serialToDate } from "../engine/dates";
import type { Scalar } from "../engine/types";

/* Messy-data generators produce the MESSY rows and the matching CLEAN reference together, so a challenge always has a known right answer. */

const properCase = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
export const cleanName = properCase;
const sp = (r: Rng, s: string) => { const k = r.int(0, 5); const lead = " ".repeat(r.pick([0, 0, 1, 2])), trail = " ".repeat(r.pick([0, 0, 1, 3])); const body = k === 0 ? s.replace(" ", "   ") : k === 1 ? s.toUpperCase() : k === 2 ? s.toLowerCase() : s; return lead + body + trail; };

const CAT_VARIANTS: Record<string, string[]> = {
  Electronics: ["Electronics", "electronics", " ELECTRONICS ", "Electronic"],
  Stationery: ["Stationery", "stationery ", "STATIONERY", "Stationary"],
  Home: ["Home", "home", " HOME", "Home & Kitchen"],
  Fitness: ["Fitness", "fitness", "FITNESS ", "Fitnes"],
  Grocery: ["Grocery", "grocery", " GROCERY", "Groceries"],
};
/** variant -> canonical map used by the category challenge's mapping table */
export const CATEGORY_FIXES: [string, string][] = [["electronic", "Electronics"], ["stationary", "Stationery"], ["home & kitchen", "Home"], ["fitnes", "Fitness"], ["groceries", "Grocery"]];
export const canonCategory = (raw: string): string => { const k = raw.trim().toLowerCase(); const fix = CATEGORY_FIXES.find(([v]) => v === k); return fix ? fix[1] : properCase(k); };

const rawCode = (r: Rng, n: number) => { const t = r.int(0, 4); const num = pad(n, 3); return t === 0 ? `P${num}` : t === 1 ? `p-${num}` : t === 2 ? ` P ${num} ` : t === 3 ? `p${num}` : `P-${num}`; };
export const cleanCode = (raw: string) => { const m = /(\d+)/.exec(raw); return `P${pad(Number(m![1]), 3)}`; };

const fmtDate = (serial: number, style: "iso" | "slash") => { const d = serialToDate(serial); const y = d.getUTCFullYear(), m = pad(d.getUTCMonth() + 1, 2), dd = pad(d.getUTCDate(), 2); return style === "iso" ? `${y}-${m}-${dd}` : `${dd}/${m}/${y}`; };
export const parseTextDate = (s: string): number => { const t = s.trim(); const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t); if (iso) return D(+iso[1], +iso[2], +iso[3]); const sl = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t)!; return D(+sl[3], +sl[2], +sl[1]); };
const inr = (n: number, r: Rng) => { const t = r.int(0, 3); const body = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return t === 0 ? `₹${body}` : t === 1 ? String(n) : t === 2 ? ` ${body} ` : body; };
export const parseMoneyText = (s: string): number => Number(s.replace(/[₹,\s]/g, ""));

export const MESSY_DATASETS = [
  ds({
    id: "DS-MSY-CUSTOMERS", alias: "rawcust", sheet: "RawCustomers", title: "Messy customer list", category: "Data Cleaning", tier: "Easy", rowCount: 25,
    description: "25 customers typed by hand: stray spaces, inconsistent capitalisation and shouting e-mail addresses.",
    topics: ["Leading and trailing spaces", "Inconsistent capitalization", "Extra spaces between words"], concepts: ["DC", "TX"], issues: ["leading-trailing-spaces", "inconsistent-case", "extra-inner-spaces"],
    columns: cols([["id", "Customer ID", "id"], ["name", "Raw name", "text"], ["email", "Raw email", "text"]]),
    pair: (r) => { const base = customerIds(25).map((id, i) => ({ id, nm: personName(i + 300) })); const em = (nm: string) => nm.toLowerCase().replace(" ", ".") + "@example.com"; const messyEmail = (nm: string) => { const e = em(nm), t = r.int(0, 3); return (r.pick(["", " "])) + (t === 0 ? e.toUpperCase() : t === 1 ? e[0].toUpperCase() + e.slice(1) : e) + r.pick(["", " ", "  "]); }; return { messy: base.map((b) => [b.id, sp(r, b.nm), messyEmail(b.nm)]), clean: base.map((b) => [b.id, b.nm, em(b.nm)]) }; },
  }),
  ds({
    id: "DS-MSY-PRODUCTS", alias: "rawprod", sheet: "RawProducts", title: "Messy product list", category: "Data Cleaning", tier: "Medium", rowCount: 60,
    description: "60 product lines with inconsistent product codes (P007, p-007, ' P 007 ') and category labels (case, spaces and misspellings).",
    topics: ["Inconsistent product codes", "Inconsistent category labels"], concepts: ["DC", "TX", "LK"], issues: ["inconsistent-codes", "inconsistent-categories", "leading-trailing-spaces", "inconsistent-case"],
    columns: cols([["code", "Product code", "text"], ["name", "Product", "text"], ["cat", "Category", "text"], ["price", "Price", "currency"]]),
    pair: (r) => { const ps = products(); const items = Array.from({ length: 60 }, (_, i) => ps[i % 25]); const messy = items.map((p, i) => [rawCode(r, Number(p.id.slice(1))), p.name, r.pick(CAT_VARIANTS[p.cat]), p.price + (i >= 25 ? 0 : 0)]); return { messy, clean: items.map((p) => [p.id, p.name, p.cat, p.price]) }; },
  }),
  ds({
    id: "DS-MSY-DATES", alias: "rawdates", sheet: "RawDates", title: "Order dates stored as text", category: "Data Cleaning", tier: "Medium", rowCount: 50,
    description: "50 orders whose dates are text in two layouts (2025-03-07 and 07/03/2025), some with stray spaces. Real date serials are the reference.",
    topics: ["Dates stored as text", "Inconsistent date formats"], concepts: ["DC", "DT"], issues: ["dates-as-text", "mixed-date-formats", "leading-trailing-spaces"],
    columns: cols([["id", "Order", "id"], ["date", "Order date (text)", "text"], ["amount", "Amount", "currency"]]),
    pair: (r) => { const rows = Array.from({ length: 50 }, (_, i) => ({ id: `O${pad(i + 1, 3)}`, d: D(2025, 1, 1) + r.int(0, 330), a: r.money(300, 9000, 10) })); return { messy: rows.map((x, i) => [x.id, (i % 7 === 3 ? " " : "") + fmtDate(x.d, i % 3 === 0 ? "slash" : "iso") + (i % 11 === 5 ? " " : ""), x.a]), clean: rows.map((x) => [x.id, x.d, x.a]) }; },
  }),
  ds({
    id: "DS-MSY-AMOUNTS", alias: "rawamt", sheet: "RawAmounts", title: "Amounts stored as text", category: "Data Cleaning", tier: "Medium", rowCount: 50,
    description: "50 invoice amounts entered as text: with a rupee sign, thousands commas, plain digits or padded with spaces.",
    topics: ["Numbers stored as text"], concepts: ["DC", "TX", "SM"], issues: ["numbers-as-text", "leading-trailing-spaces"],
    columns: cols([["inv", "Invoice", "id"], ["amount", "Amount (text)", "text"], ["tax", "Tax rate", "percent"]]),
    pair: (r) => { const rows = Array.from({ length: 50 }, (_, i) => ({ inv: `INV-${pad(i + 101, 4)}`, a: r.money(1000, 90000, 5) + r.pick([0, 0.5, 0.25]), t: r.pick([0.05, 0.12, 0.18]) })); return { messy: rows.map((x) => [x.inv, inr(x.a, r), x.t]), clean: rows.map((x) => [x.inv, x.a, x.t]) }; },
  }),
  ds({
    id: "DS-MSY-DUPES", alias: "dupes", sheet: "OrderExport", title: "Order export with duplicate rows", category: "Data Cleaning", tier: "Medium", rowCount: 80,
    description: "An order export of 80 lines in which 12 lines are exact repeats of an earlier line (a double-click on Export).",
    topics: ["Duplicate rows"], concepts: ["DC", "CA", "DA"], issues: ["duplicate-rows"],
    columns: cols([["ref", "Order ref", "id"], ["cust", "Customer", "id"], ["product", "Product ID", "id"], ["amount", "Amount", "currency"]]),
    pair: (r) => { const uniq: Scalar[][] = Array.from({ length: 68 }, (_, i) => [`ORD-${pad(i + 1, 4)}`, r.pick(customerIds(30)), `P${pad(r.int(1, 25), 3)}`, r.money(200, 8000, 10)]); const rows = [...uniq]; for (const at of [5, 9, 14, 22, 27, 33, 38, 44, 50, 57, 63, 70]) rows.splice(at, 0, uniq[at - 3]); return { messy: rows.slice(0, 80), clean: uniq }; },
  }),
  ds({
    id: "DS-MSY-SCORES", alias: "rawscores", sheet: "RawScores", title: "Survey scores with invalid entries", category: "Data Cleaning", tier: "Medium", rowCount: 80,
    description: "80 satisfaction scores that should be 1 to 5, but some are 0, 7 or 99, and some are blank.",
    topics: ["Invalid or out-of-range values", "Missing values"], concepts: ["DC", "LG", "CA"], issues: ["out-of-range", "missing-values"],
    columns: cols([["resp", "Response", "id"], ["score", "Score", "number"], ["channel", "Channel", "text"]]),
    pair: (r) => { const bad = new Set([4, 11, 19, 27, 33, 41, 52, 60, 68, 75]); const blank = new Set([7, 23, 45, 58]); const valid = Array.from({ length: 80 }, () => r.weighted([1, 2, 3, 4, 5], [1, 2, 3, 5, 4])); const messy = valid.map((v, i): Scalar[] => [`SR${pad(i + 1, 3)}`, blank.has(i) ? null : bad.has(i) ? r.pick([0, 7, 99, -1]) : v, r.pick(["Email", "Chat", "Phone"])]); return { messy, clean: valid.map((v, i) => [`SR${pad(i + 1, 3)}`, bad.has(i) || blank.has(i) ? null : v, "-"]) }; },
  }),
  ds({
    id: "DS-MSY-KEYMASTER", alias: "keymaster", sheet: "KeyMaster", title: "Account master with zero-padded keys", category: "Data Cleaning", tier: "Easy", rowCount: 40, related: ["DS-MSY-KEYREQ"],
    description: "40 accounts whose key is TEXT with leading zeros (0001 ... 0040).",
    topics: ["Lookup keys with leading zeros"], concepts: ["LK", "DC"], issues: ["leading-zero-keys"],
    columns: cols([["key", "Account key", "text"], ["name", "Account name", "text"], ["tier", "Tier", "text"]]),
    gen: (r) => Array.from({ length: 40 }, (_, i) => [pad(i + 1, 4), `Account ${personName(i + 340)}`, r.pick(["Gold", "Silver", "Bronze"])]),
  }),
  ds({
    id: "DS-MSY-KEYREQ", alias: "keyreq", sheet: "KeyRequests", title: "Lookup requests with broken keys", category: "Data Cleaning", tier: "Hard", rowCount: 100, related: ["DS-MSY-KEYMASTER"],
    description: "100 requests quoting account keys the way people type them: 7, 0007, ' 0007 ' or an unknown key such as 0099. Zero-padded text keys in the master do not match a bare number.",
    topics: ["Lookup keys with leading zeros", "Unmatched records across related tables"], concepts: ["LK", "DC"], issues: ["leading-zero-keys", "unmatched-keys", "leading-trailing-spaces"],
    columns: cols([["req", "Request", "id"], ["key", "Account key (as typed)", "mixed"], ["amount", "Amount", "currency"]]),
    pair: (r) => { const picks = Array.from({ length: 100 }, (_, i) => (i % 9 === 4 ? r.int(41, 120) : r.int(1, 40))); const messy = picks.map((k, i): Scalar[] => [`RQ${pad(i + 1, 3)}`, i % 4 === 0 ? k : i % 4 === 1 ? pad(k, 4) : i % 4 === 2 ? ` ${pad(k, 4)} ` : pad(k, 4), r.money(500, 30000, 50)]); return { messy, clean: picks.map((k, i) => [`RQ${pad(i + 1, 3)}`, k <= 40 ? pad(k, 4) : null, "-"]) }; },
  }),
  ds({
    id: "DS-MSY-EMPNAMES", alias: "rawnames", sheet: "RawNames", title: "Names as 'LAST, First' with stray spaces", category: "Data Cleaning", tier: "Medium", rowCount: 50,
    description: "50 HR export names typed as 'RAO,  aarav ' - reversed, with inconsistent case and spacing.",
    topics: ["Inconsistent capitalization", "Extra spaces between words"], concepts: ["DC", "TX"], issues: ["inconsistent-case", "extra-inner-spaces", "leading-trailing-spaces"],
    columns: cols([["id", "Employee ID", "id"], ["raw", "Name (LAST, First)", "text"]]),
    pair: (r) => { const nm = Array.from({ length: 50 }, (_, i) => [FIRST[(i * 7) % FIRST.length], LAST[(i * 11) % LAST.length]]); return { messy: nm.map(([f, l], i) => { const t = i % 3; const a = t === 0 ? l.toUpperCase() : t === 1 ? l : l.toLowerCase(); const b = t === 0 ? f.toLowerCase() : t === 1 ? f.toUpperCase() : f; return [`E${pad(2001 + i, 4)}`, `${r.pick(["", " "])}${a},${r.pick([" ", "  ", ""])}${b}${r.pick(["", " ", "  "])}`]; }), clean: nm.map(([f, l], i) => [`E${pad(2001 + i, 4)}`, `${f} ${l}`]) }; },
  }),
  ds({
    id: "DS-MSY-SALES", alias: "rawsales", sheet: "RawSales", title: "Messy sales export", category: "Data Cleaning", tier: "Hard", rowCount: 1200, related: ["DS-SAL-PRODUCTS"],
    description: "1,200 sales lines from a system export: product codes in several styles, dates as text in two layouts, categories with typos, amounts as text, missing and negative quantities, and duplicate lines.",
    topics: ["Duplicate rows", "Dates stored as text", "Numbers stored as text", "Inconsistent product codes", "Inconsistent category labels", "Missing values", "Invalid or out-of-range values"], concepts: ["DC", "TX", "DT", "LK", "CA", "CS"],
    issues: ["duplicate-rows", "dates-as-text", "mixed-date-formats", "numbers-as-text", "inconsistent-codes", "inconsistent-categories", "missing-values", "out-of-range", "leading-trailing-spaces"],
    columns: cols([["id", "Line ID", "id"], ["date", "Date (text)", "text"], ["code", "Product code", "text"], ["cat", "Category", "text"], ["qty", "Qty", "number"], ["amount", "Amount (text)", "text"], ["rep", "Salesperson", "text"]]),
    pair: (r) => {
      const ps = products(); const out: Scalar[][] = []; const clean: Scalar[][] = [];
      for (let i = 0; i < 1200; i++) {
        const p = r.pick(ps); const d = D(2025, 1, 1) + Math.floor(i / 6.7); const q = r.int(1, 10); const amt = roundTo(q * p.price, 2);
        const dup = i > 20 && i % 41 === 0; const src = dup ? out[out.length - 1 - r.int(1, 15)] : null;
        if (src) { out.push([...src]); continue; }
        const badQty = i % 53 === 17 ? -q : i % 37 === 9 ? null : q;
        out.push([`L${pad(i + 1, 5)}`, (i % 29 === 3 ? " " : "") + fmtDate(d, i % 3 === 0 ? "slash" : "iso"), rawCode(r, Number(p.id.slice(1))), r.pick(CAT_VARIANTS[p.cat]), badQty, inr(amt, r), r.pick(["Asha", "bilal", " CHITRA ", "Dev", "esha"])]);
        clean.push([`L${pad(i + 1, 5)}`, d, p.id, p.cat, badQty !== null && badQty > 0 ? q : null, amt, "-"]);
      }
      return { messy: out.slice(0, 1200), clean };
    },
  }),
];


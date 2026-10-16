import type { Scalar } from "../engine/types";
import { DATASETS, DATASET_BY_ID } from "./registry";
import { REQUIRED_TOPICS } from "./required";
import type { Dataset, QualityIssue } from "./types";

export interface Finding { dataset: string; level: "error" | "warn"; message: string }

const isText = (v: Scalar): v is string => typeof v === "string";
const col = (d: Dataset, key: string, rows = d.rows()): Scalar[] => { const i = d.columns.findIndex((c) => c.key === key); if (i < 0) throw new Error(`${d.id} has no column ${key}`); return rows.map((r) => r[i] ?? null); };
const strCells = (d: Dataset): { v: string; c: number }[] => d.rows().flatMap((r) => r.map((v, c) => ({ v, c }))).filter((x): x is { v: string; c: number } => isText(x.v));

/** Programmatic detectors: each declared data-quality issue must really be present in the generated rows. */
export const ISSUE_DETECTORS: Partial<Record<QualityIssue, (d: Dataset) => boolean>> = {
  "leading-trailing-spaces": (d) => strCells(d).some((x) => x.v !== x.v.trim()),
  "extra-inner-spaces": (d) => strCells(d).some((x) => /\S {2,}\S/.test(x.v)),
  "inconsistent-case": (d) => strCells(d).some((x) => { const w = x.v.split(/[\s,]+/).filter((s) => s.length > 1 && /^[A-Za-z]+$/.test(s)); return w.some((s) => s === s.toUpperCase()) && w.some((s) => s === s.toLowerCase()); }) || d.columns.some((_c, i) => { const vs = strCells(d).filter((x) => x.c === i).map((x) => x.v.trim()).filter((v) => /[a-z]/i.test(v) && v.length > 3); return vs.some((v) => v === v.toLowerCase()) && vs.some((v) => v !== v.toLowerCase()) || vs.some((v) => v === v.toUpperCase()) && vs.some((v) => v !== v.toUpperCase()); }),
  "duplicate-rows": (d) => { const seen = new Set<string>(); return d.rows().some((r) => { const k = JSON.stringify(r); if (seen.has(k)) return true; seen.add(k); return false; }); },
  "missing-values": (d) => d.rows().some((r) => r.some((v) => v === null || v === "")),
  "dates-as-text": (d) => strCells(d).some((x) => /^\s*(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\s*$/.test(x.v)),
  "mixed-date-formats": (d) => { const iso = strCells(d).some((x) => /^\s*\d{4}-\d{2}-\d{2}\s*$/.test(x.v)); const sl = strCells(d).some((x) => /^\s*\d{2}\/\d{2}\/\d{4}\s*$/.test(x.v)); return iso && sl; },
  "numbers-as-text": (d) => strCells(d).some((x) => /^[\s₹]*[\d,]+(\.\d+)?\s*$/.test(x.v) && /\d/.test(x.v) && !/^\s*[A-Z]/i.test(x.v)),
  "inconsistent-codes": (d) => { const codes = strCells(d).map((x) => x.v).filter((v) => /^\s*[pP][\s-]?\d{3}\s*$/.test(v)); return new Set(codes.map((v) => (/^P\d{3}$/.test(v) ? "canonical" : "variant"))).size > 1; },
  "inconsistent-categories": (d) => { const i = d.columns.findIndex((c) => c.key === "cat"); if (i < 0) return false; const raw = new Set(d.rows().map((r) => String(r[i]))); const norm = new Set([...raw].map((v) => v.trim().toLowerCase())); return raw.size > norm.size || norm.size > 5; },
  "out-of-range": (d) => { const s = d.columns.findIndex((c) => c.key === "score"), q = d.columns.findIndex((c) => c.key === "qty"); return d.rows().some((r) => (s >= 0 && typeof r[s] === "number" && ((r[s] as number) < 1 || (r[s] as number) > 5)) || (q >= 0 && typeof r[q] === "number" && (r[q] as number) < 0)); },
  "leading-zero-keys": (d) => strCells(d).some((x) => /^\s*0\d+\s*$/.test(x.v)),
};

/** Related-table links: each child key column should match its parent key column. `unmatched` = unmatched child keys are expected (and must exist). */
export interface Relation { child: string; childKey: string; parent: string; parentKey: string; unmatched?: boolean; normalise?: (v: Scalar) => Scalar }
const keyNorm = (v: Scalar): Scalar => (v === null ? null : /^\s*\d+\s*$/.test(String(v)) ? String(v).trim().padStart(4, "0") : String(v).trim());
export const RELATIONS: Relation[] = [
  { child: "DS-SAL-ORDERS", childKey: "product", parent: "DS-SAL-PRODUCTS", parentKey: "id" },
  { child: "DS-SAL-ORDERS", childKey: "cust", parent: "DS-SAL-CUSTOMERS", parentKey: "id" },
  { child: "DS-SAL-TXN", childKey: "product", parent: "DS-SAL-PRODUCTS", parentKey: "id" },
  { child: "DS-INV-STOCK", childKey: "sku", parent: "DS-SAL-PRODUCTS", parentKey: "id" },
  { child: "DS-INV-STOCK", childKey: "wh", parent: "DS-INV-WAREHOUSES", parentKey: "code" },
  { child: "DS-INV-PO", childKey: "supplier", parent: "DS-INV-SUPPLIERS", parentKey: "code" },
  { child: "DS-INV-GRN", childKey: "po", parent: "DS-INV-PO", parentKey: "no" },
  { child: "DS-EDU-ENROLL", childKey: "course", parent: "DS-EDU-COURSES", parentKey: "code", unmatched: true },
  { child: "DS-EDU-FEEPAY", childKey: "roll", parent: "DS-EDU-FEES", parentKey: "roll", unmatched: true },
  { child: "DS-HR-ATTEND", childKey: "emp", parent: "DS-HR-EMP", parentKey: "id" },
  { child: "DS-HR-EMP", childKey: "id", parent: "DS-HR-ATTEND", parentKey: "emp", unmatched: true },
  { child: "DS-FIN-PAYMENTS", childKey: "invoice", parent: "DS-FIN-INVOICES", parentKey: "no", unmatched: true },
  { child: "DS-MKT-LEADS", childKey: "campaign", parent: "DS-MKT-CAMPAIGNS", parentKey: "id" },
  { child: "DS-MSY-KEYREQ", childKey: "key", parent: "DS-MSY-KEYMASTER", parentKey: "key", unmatched: true, normalise: keyNorm },
  { child: "DS-FIN-ACTUAL", childKey: "dept", parent: "DS-FIN-BUDGET", parentKey: "dept" },
  { child: "DS-INV-DELIVERY", childKey: "supplier", parent: "DS-INV-SUPPLIERS", parentKey: "code" },
];

export function relationStats(rel: Relation) {
  const child = DATASET_BY_ID.get(rel.child)!, parent = DATASET_BY_ID.get(rel.parent)!;
  const norm = rel.normalise ?? ((v: Scalar) => (v === null ? null : String(v)));
  const keys = new Set(col(parent, rel.parentKey).map(norm));
  const vals = col(child, rel.childKey).map(norm).filter((v) => v !== null);
  const matched = vals.filter((v) => keys.has(v)).length;
  return { total: vals.length, matched, unmatched: vals.length - matched };
}

const typeOk = (v: Scalar, t: string): boolean => v === null || (t === "mixed" ? true : t === "text" || t === "id" ? typeof v === "string" || typeof v === "number" : typeof v === "number");

/** Datasets that are the instructor's own material (workbook sheets and the six first challenges) are kept as they were: only shape and the sensitive-number guard apply. */
const isOriginal = (d: Dataset) => d.origin === "source" || d.id.startsWith("DS-LEGACY-");
const SENSITIVE_NUMBER = (v: string) => /\b\d{10,}\b/.test(v) || /\b\d{4}\s\d{4}\s\d{4}\b/.test(v);

export function validateDataset(d: Dataset): Finding[] {
  const f: Finding[] = [];
  const err = (message: string) => f.push({ dataset: d.id, level: "error", message });
  const warn = (message: string) => f.push({ dataset: d.id, level: "warn", message });
  const rows = d.rows();
  if (isOriginal(d)) {
    if (rows.length !== d.rowCount) err(`declared ${d.rowCount} rows but generated ${rows.length}`);
    for (const r of rows) for (const v of r) if (typeof v === "string" && SENSITIVE_NUMBER(v)) err(`looks like a phone or national ID number: "${v}"`);
    return f;
  }
  if (rows.length !== d.rowCount) err(`declared ${d.rowCount} rows but generated ${rows.length}`);
  const keys = new Set(d.columns.map((c) => c.key));
  if (keys.size !== d.columns.length) err("duplicate column keys");
  if (new Set(d.columns.map((c) => c.header)).size !== d.columns.length) err("duplicate column headers");
  rows.forEach((r, i) => { if (r.length !== d.columns.length) err(`row ${i + 1} has ${r.length} cells for ${d.columns.length} columns`); });
  rows.slice(0, 400).forEach((r, i) => r.forEach((v, c) => { const t = d.columns[c]?.type; if (t && !typeOk(v, t)) err(`row ${i + 1}, column "${d.columns[c].header}": ${typeof v} is not valid for type ${t}`); }));
  if (d.sheet.length > 31 || /[\s[\]:*?/\\]/.test(d.sheet)) err(`sheet name "${d.sheet}" is not usable`);
  if (d.columns.length > 15) warn("more than 15 columns");
  // tier vs actual complexity
  if (d.origin === "generated" && d.category !== "Data Cleaning" || d.category === "Data Cleaning") {
    const n = d.rowCount, c = d.columns.length;
    if (d.tier === "Easy" && (n > 40 || c > 7)) err(`Easy dataset has ${n} rows x ${c} columns`);
    if (d.tier === "Medium" && n > 400) err(`Medium dataset has ${n} rows`);
    if (d.tier === "Hard" && n < 300 && !(d.issues.length >= 3 && d.related.length >= 1)) err(`Hard dataset has only ${n} rows and not enough complexity`);
    if (d.tier === "Medium" && n < 20 && c < 5) warn(`Medium dataset is small (${n} rows x ${c} columns)`);
  }
  // declared quality issues must be present
  for (const issue of d.issues) { const det = ISSUE_DETECTORS[issue]; if (det && !det(d)) err(`declares "${issue}" but it was not detected in the rows`); }
  if (d.issues.length && d.category === "Data Cleaning" && d.clean) {
    if (d.clean().length < 1) err("messy dataset has an empty clean reference");
  } else if (d.category === "Data Cleaning" && !d.clean && !d.related.some((id) => DATASET_BY_ID.get(id)?.clean)) err("messy dataset has no clean reference");
  // sensitive data guard: no long digit runs, no phone/email on real domains, no Aadhaar-like groups
  for (const r of rows.slice(0, 2000)) for (const v of r) if (typeof v === "string") {
    if (/\b\d{10,}\b/.test(v) || /\b\d{4}\s\d{4}\s\d{4}\b/.test(v)) err(`looks like a phone or national ID number: "${v}"`);
    if (/@/.test(v) && !/@(example\.(com|org))\s*$/i.test(v)) err(`e-mail not on a reserved example domain: "${v}"`);
  }
  return f;
}

export function validateRegistry(): Finding[] {
  const f: Finding[] = [];
  const ids = new Set<string>(), aliases = new Set<string>();
  for (const d of DATASETS) {
    if (ids.has(d.id)) f.push({ dataset: d.id, level: "error", message: "duplicate dataset id" });
    if (aliases.has(d.alias)) f.push({ dataset: d.id, level: "error", message: `duplicate alias "${d.alias}"` });
    ids.add(d.id); aliases.add(d.alias);
    for (const rid of d.related) if (!DATASET_BY_ID.has(rid)) f.push({ dataset: d.id, level: "error", message: `related dataset ${rid} does not exist` });
  }
  for (const rel of RELATIONS) {
    const s = relationStats(rel);
    const tag = `${rel.child}.${rel.childKey} -> ${rel.parent}.${rel.parentKey}`;
    if (s.matched === 0) f.push({ dataset: rel.child, level: "error", message: `${tag}: no keys match` });
    if (rel.unmatched && s.unmatched === 0) f.push({ dataset: rel.child, level: "error", message: `${tag}: expected unmatched keys but every key matches` });
    if (!rel.unmatched && s.unmatched > 0) f.push({ dataset: rel.child, level: "error", message: `${tag}: ${s.unmatched} unexpected unmatched keys` });
  }
  return f;
}

/** Brief topics that no dataset covers. */
export function uncoveredTopics(): { category: string; topic: string }[] {
  const have = new Set(DATASETS.flatMap((d) => d.topics));
  return Object.entries(REQUIRED_TOPICS).flatMap(([category, ts]) => ts.filter((t) => !have.has(t)).map((topic) => ({ category, topic })));
}

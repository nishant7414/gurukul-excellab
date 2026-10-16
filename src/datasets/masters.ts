import { FIRST, LAST, makeRng, pad, type Rng } from "./rng";

/* Shared master lists so related datasets (orders -> products -> customers ...) really match. Deterministic and memoised. */
const memo = <T,>(f: () => T) => { let v: T | undefined; return () => (v ??= f()); };

export interface Product { id: string; name: string; cat: string; price: number; cost: number }
const PROD_NAMES: [string, string[]][] = [
  ["Electronics", ["USB Cable", "Wireless Mouse", "Headphones", "Power Bank", "Webcam"]],
  ["Stationery", ["Notebook A5", "Gel Pen Pack", "Desk Organiser", "Highlighter Set", "Sticky Notes"]],
  ["Home", ["Steel Bottle", "Table Lamp", "Storage Box", "Wall Clock", "Coaster Set"]],
  ["Fitness", ["Yoga Mat", "Resistance Band", "Skipping Rope", "Dumbbell 2kg", "Gym Towel"]],
  ["Grocery", ["Basmati Rice 5kg", "Olive Oil 1L", "Green Tea 100g", "Almonds 500g", "Honey 250g"]],
];
export const products = memo((): Product[] => {
  const r = makeRng("master-products");
  const base: Record<string, [number, number]> = { Electronics: [350, 2400], Stationery: [40, 400], Home: [180, 1500], Fitness: [250, 1800], Grocery: [120, 900] };
  let k = 0;
  return PROD_NAMES.flatMap(([cat, names]) => names.map((name) => {
    const [lo, hi] = base[cat];
    const price = r.money(lo, hi, 5) - 0.01;
    return { id: `P${pad(++k, 3)}`, name, cat, price: Math.round(price * 100) / 100, cost: Math.round(price * r.int(55, 75)) / 100 };
  }));
});

export const customerIds = (n: number) => Array.from({ length: n }, (_, i) => `C${pad(i + 1, 4)}`);
export const customerNames = memo(() => { const r = makeRng("master-customers"); const seen = new Set<string>(); const out: string[] = []; while (out.length < 400) { const nm = `${r.pick(FIRST)} ${r.pick(LAST)}`; if (!seen.has(nm)) { seen.add(nm); out.push(nm); } } return out; });
export const personName = (i: number) => customerNames()[i % 400];

export const DEPTS = ["Sales", "Finance", "HR", "IT", "Operations", "Marketing", "Support"] as const;
export const WAREHOUSES = [["WH-N", "Pune", "North Hub"], ["WH-S", "Kochi", "South Hub"], ["WH-E", "Kolkata", "East Hub"], ["WH-W", "Surat", "West Hub"], ["WH-C", "Nagpur", "Central Hub"]] as const;
export const SUPPLIERS: [string, string, string, number][] = [
  ["S01", "Apex Components", "Electronics", 5], ["S02", "Bluebird Paper", "Stationery", 3], ["S03", "Cedar Homeware", "Home", 7], ["S04", "Delta Sports", "Fitness", 6], ["S05", "Evergreen Foods", "Grocery", 2],
  ["S06", "Fusion Circuits", "Electronics", 9], ["S07", "Granite Packaging", "Packaging", 4], ["S08", "Harbor Logistics", "Logistics", 1], ["S09", "Indigo Textiles", "Textiles", 8], ["S10", "Juniper Chemicals", "Chemicals", 10],
  ["S11", "Kestrel Tools", "Hardware", 6], ["S12", "Lotus Organics", "Grocery", 3], ["S13", "Maple Furniture", "Home", 12], ["S14", "Nimbus Cloud Gear", "Electronics", 5], ["S15", "Orchid Print", "Stationery", 4],
];

export const empIds = (n: number) => Array.from({ length: n }, (_, i) => `E${1001 + i}`);
export function pickMany<T>(r: Rng, xs: readonly T[], n: number): T[] { return Array.from({ length: n }, () => r.pick(xs)); }

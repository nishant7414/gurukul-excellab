import { dateToSerial } from "../engine/dates";

/** Small deterministic PRNG (mulberry32). The same seed always gives the same data, so expected answers are reproducible. */
export interface Rng {
  next(): number;
  int(lo: number, hi: number): number;
  pick<T>(xs: readonly T[]): T;
  /** pick by relative weights */
  weighted<T>(xs: readonly T[], w: readonly number[]): T;
  chance(p: number): boolean;
  shuffle<T>(xs: readonly T[]): T[];
  /** n distinct items */
  sample<T>(xs: readonly T[], n: number): T[];
  money(lo: number, hi: number, step?: number): number;
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function makeRng(seed: string | number): Rng {
  let a = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)];
  const shuffle = <T,>(xs: readonly T[]) => { const o = [...xs]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  return {
    next, int, pick, shuffle,
    weighted: (xs, w) => { const t = w.reduce((s, x) => s + x, 0); let r = next() * t; for (let i = 0; i < xs.length; i++) { r -= w[i]; if (r < 0) return xs[i]; } return xs[xs.length - 1]; },
    chance: (p) => next() < p,
    sample: (xs, n) => shuffle(xs).slice(0, n),
    money: (lo, hi, step = 1) => Math.round((lo + next() * (hi - lo)) / step) * step,
  };
}

/* ---- synthetic vocabulary: invented combinations, not real people ---- */
export const FIRST = ["Aarav", "Meera", "Kabir", "Isha", "Rohan", "Tara", "Neel", "Anika", "Vikram", "Diya", "Arjun", "Sana", "Farhan", "Leela", "Dev", "Mira", "Kiran", "Zoya", "Rahul", "Nisha", "Omar", "Lina", "Samir", "Hana", "Yash", "Priya", "Imran", "Jaya", "Tejas", "Ruhi", "Manav", "Esha", "Karan", "Ira", "Nikhil", "Pari", "Vivaan", "Anaya", "Sahil", "Tanvi", "Reyansh", "Kavya", "Ayaan", "Myra", "Veer", "Alia", "Dhruv", "Sia", "Ishaan", "Navya"];
export const LAST = ["Rao", "Kulkarni", "Menon", "Bose", "Khanna", "Iyer", "Naidu", "Shetty", "Joshi", "Pillai", "Verma", "Sethi", "Gill", "Ahuja", "Banerjee", "Chopra", "Desai", "Fernandes", "Gupta", "Hegde", "Kapoor", "Lal", "Mehta", "Nair", "Oberoi", "Patil", "Qureshi", "Reddy", "Saxena", "Trivedi", "Uppal", "Varma", "Wagle", "Yadav", "Zaveri", "Bhat", "Chandra", "Dutta", "Ghosh", "Kohli"];
export const CITIES = ["Pune", "Nagpur", "Indore", "Kochi", "Jaipur", "Surat", "Lucknow", "Mysuru", "Bhopal", "Vizag"];
export const REGIONS = ["North", "South", "East", "West"] as const;

export const fullName = (r: Rng) => `${r.pick(FIRST)} ${r.pick(LAST)}`;
export const pad = (n: number, w: number) => String(n).padStart(w, "0");
export const D = (y: number, m: number, d: number) => dateToSerial(y, m, d);
/** a serial in [from, from+days] */
export const dateIn = (r: Rng, from: number, days: number) => from + r.int(0, days);
/** email on the reserved example.com domain, never a real address */
export const emailOf = (name: string, host = "example.com") => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${host}`;
export const roundTo = (n: number, d = 2) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;

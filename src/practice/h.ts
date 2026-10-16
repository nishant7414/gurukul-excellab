import type { Scalar } from "../engine/types";
import type { Row } from "./types";
import { dateToSerial, serialToDate } from "../engine/dates";

/* Small helpers for writing independent reference calculations ("what Excel should return"), never calling the formula engine. */
export const n = (v: Scalar): number => (typeof v === "number" ? v : v === null || v === "" ? 0 : Number(v));
export const s = (v: Scalar): string => (v === null ? "" : String(v));
/** Excel's "=" comparison: numbers by value, text case-insensitively, no number/text mixing. */
export const eq = (a: Scalar, b: Scalar): boolean => (typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b);
export const find = (rows: Row[], key: string, val: Scalar): Row | undefined => rows.find((r) => eq(r[key] ?? null, val));
export const sum = (xs: Scalar[]) => xs.reduce<number>((t, v) => t + (typeof v === "number" ? v : 0), 0);
export const sumWhere = (rows: Row[], pred: (r: Row) => boolean, key: string) => rows.reduce((t, r) => (pred(r) ? t + n(r[key] ?? null) : t), 0);
export const countWhere = (rows: Row[], pred: (r: Row) => boolean) => rows.reduce((t, r) => (pred(r) ? t + 1 : t), 0);
export const round = (x: number, d = 0) => { const f = 10 ** d; return Math.round((x + Math.sign(x) * Number.EPSILON) * f) / f; };
/** TRIM + PROPER as Excel does it */
export const proper = (t: string) => t.trim().replace(/ +/g, " ").toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
export const trim = (t: string) => t.trim().replace(/ +/g, " ");
export const pct = (a: number, b: number) => (b === 0 ? 0 : a / b);
export const col = <K extends string>(rows: Row[], key: K): Scalar[] => rows.map((r) => r[key] ?? null);

/* date helpers (Excel serials) used to compute expected answers independently of the formula engine */
export const ser = dateToSerial;
export const ymd = (v: number) => { const d = serialToDate(Math.floor(v)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
/** Monday = 1 ... Sunday = 7 (WEEKDAY(x, 2)) */
export const weekday2 = (v: number) => { const w = serialToDate(Math.floor(v)).getUTCDay(); return w === 0 ? 7 : w; };
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const edate = (v: number, k: number) => { const { y, m, d } = ymd(v); const t = y * 12 + (m - 1) + k; const yy = Math.floor(t / 12), mm = (t % 12) + 1; return ser(yy, mm, Math.min(d, daysIn(yy, mm))); };
export const eomonth = (v: number, k: number) => { const { y, m } = ymd(v); const t = y * 12 + (m - 1) + k; const yy = Math.floor(t / 12), mm = (t % 12) + 1; return ser(yy, mm, daysIn(yy, mm)); };
/** NETWORKDAYS without holidays, inclusive of both ends (negative when end < start) */
export const networkdays = (a: number, b: number) => { const [lo, hi, sign] = a <= b ? [a, b, 1] : [b, a, -1]; let c = 0; for (let x = Math.floor(lo); x <= Math.floor(hi); x++) if (weekday2(x) <= 5) c++; return sign * c; };
export const DAY3 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAYFULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

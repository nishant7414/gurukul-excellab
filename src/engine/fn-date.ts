import { flat, reg, toNum, toStr } from "./core";
import { DAYS as _unused, dateToSerial, parseISODate, serialToDate, todaySerial, ymd } from "./dates";
import { XlError, isErr, type Value } from "./types";

void _unused;
const cat = "Date and time" as const;

/** Accepts serial numbers, ISO text (2023-05-01) and US-order text (05/01/2023). */
export function toSerial(v: Value): number {
  if (typeof v === "string") {
    const iso = parseISODate(v);
    if (iso !== null) return iso;
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
    if (us) {
      const s = dateToSerial(+us[3], +us[1], +us[2]);
      const b = ymd(s);
      if (b.m === +us[1] && b.d === +us[2]) return s;
    }
  }
  return toNum(v);
}

reg({ name: "DATE", min: 3, max: 3, category: cat, lift: "all", impl: ([y, m, d]) => {
  let yy = Math.trunc(toNum(y));
  if (yy >= 0 && yy < 1900) yy += 1900;
  return dateToSerial(yy, Math.trunc(toNum(m)), Math.trunc(toNum(d)));
} });
reg({ name: "YEAR", min: 1, max: 1, category: cat, lift: "all", impl: ([v]) => ymd(toSerial(v)).y });
reg({ name: "MONTH", min: 1, max: 1, category: cat, lift: "all", impl: ([v]) => ymd(toSerial(v)).m });
reg({ name: "DAY", min: 1, max: 1, category: cat, lift: "all", impl: ([v]) => ymd(toSerial(v)).d });
reg({ name: "DAYS", min: 2, max: 2, category: cat, lift: "all", impl: ([e, s]) => Math.trunc(toSerial(e)) - Math.trunc(toSerial(s)) });
reg({ name: "TODAY", min: 0, max: 0, category: cat, volatile: true, impl: () => todaySerial() });
reg({ name: "NOW", min: 0, max: 0, category: cat, volatile: true, impl: () => {
  const n = new Date();
  return todaySerial() + (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 86400;
} });
reg({ name: "DATEVALUE", min: 1, max: 1, category: cat, lift: "all", impl: ([v]) => {
  if (typeof v !== "string") throw new XlError("#VALUE!", "DATEVALUE needs date text such as \"2023-05-01\" or \"05/01/2023\" (month first).");
  const s = toSerial(v);
  return Math.floor(s);
} });
reg({ name: "EOMONTH", min: 2, max: 2, category: cat, lift: "all", impl: ([s, m]) => {
  const { y, m: mo } = ymd(toSerial(s));
  return dateToSerial(y, mo + Math.trunc(toNum(m)) + 1, 0);
} });
reg({ name: "EDATE", min: 2, max: 2, category: cat, lift: "all", impl: ([s, m]) => {
  const { y, m: mo, d } = ymd(toSerial(s));
  const target = dateToSerial(y, mo + Math.trunc(toNum(m)), 1);
  const t = ymd(target);
  const last = ymd(dateToSerial(t.y, t.m + 1, 0)).d;
  return dateToSerial(t.y, t.m, Math.min(d, last));
} });
reg({ name: "WEEKDAY", min: 1, max: 2, category: cat, lift: "all", impl: ([v, t]) => {
  const wd = ymd(toSerial(v)).wd; // 0=Sun
  const type = t === null || t === undefined ? 1 : toNum(t);
  if (type === 1) return wd + 1;
  if (type === 2) return ((wd + 6) % 7) + 1;
  if (type === 3) return (wd + 6) % 7;
  throw new XlError("#NUM!", "WEEKDAY supports return_type 1, 2 or 3 in Gurukul ExcelLab.");
} });

function holidaySet(v: Value | undefined): Set<number> {
  const s = new Set<number>();
  if (v === undefined || v === null) return s;
  for (const x of flat(v)) {
    if (isErr(x)) throw x;
    if (x !== null) s.add(Math.floor(toSerial(x)));
  }
  return s;
}
const isWorkday = (serial: number, hol: Set<number>) => {
  const wd = serialToDate(serial).getUTCDay();
  return wd !== 0 && wd !== 6 && !hol.has(serial);
};
reg({ name: "NETWORKDAYS", min: 2, max: 3, category: cat, impl: ([s, e, h]) => {
  let a = Math.floor(toSerial(s)), b = Math.floor(toSerial(e));
  const sign = a <= b ? 1 : -1;
  if (sign < 0) [a, b] = [b, a];
  const hol = holidaySet(h);
  let n = 0;
  for (let d = a; d <= b; d++) if (isWorkday(d, hol)) n++;
  return n * sign;
} });
reg({ name: "DATEDIF", min: 3, max: 3, category: cat, lift: "all", impl: ([s, e, u]) => {
  const a = Math.floor(toSerial(s)), b = Math.floor(toSerial(e));
  if (b < a) throw new XlError("#NUM!", "DATEDIF start date must be on or before the end date.");
  const A = serialToDate(a), B = serialToDate(b);
  const unit = toStr(u).toUpperCase();
  const years = B.getUTCFullYear() - A.getUTCFullYear() - (B.getUTCMonth() < A.getUTCMonth() || (B.getUTCMonth() === A.getUTCMonth() && B.getUTCDate() < A.getUTCDate()) ? 1 : 0);
  const months = (B.getUTCFullYear() - A.getUTCFullYear()) * 12 + B.getUTCMonth() - A.getUTCMonth() - (B.getUTCDate() < A.getUTCDate() ? 1 : 0);
  if (unit === "Y") return years;
  if (unit === "M") return months;
  if (unit === "D") return b - a;
  if (unit === "YM") return ((months % 12) + 12) % 12;
  if (unit === "YD") {
    const mid = dateToSerial(B.getUTCFullYear(), A.getUTCMonth() + 1, A.getUTCDate());
    return b - (mid <= b ? mid : dateToSerial(B.getUTCFullYear() - 1, A.getUTCMonth() + 1, A.getUTCDate()));
  }
  if (unit === "MD") {
    const day = B.getUTCDate() - A.getUTCDate();
    if (day >= 0) return day;
    const prev = new Date(Date.UTC(B.getUTCFullYear(), B.getUTCMonth(), 0)).getUTCDate();
    return prev + day;
  }
  throw new XlError("#NUM!", 'DATEDIF unit must be "Y", "M", "D", "YM", "YD" or "MD".');
} });
reg({ name: "WORKDAY", min: 2, max: 3, category: cat, impl: ([s, n, h]) => {
  let d = Math.floor(toSerial(s));
  let left = Math.trunc(toNum(n));
  const step = left >= 0 ? 1 : -1;
  const hol = holidaySet(h);
  while (left !== 0) {
    d += step;
    if (isWorkday(d, hol)) left -= step;
  }
  return d;
} });

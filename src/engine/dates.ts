// Excel 1900 date system. Serial 1 = 1900-01-01. Excel wrongly treats 1900 as a leap year (serial 60 = "1900-02-29");
// Gurukul ExcelLab reproduces serials >= 61 exactly and treats serials 1..59 as ordinary 1900 days (documented limitation).
const MS_DAY = 86400000;
const EPOCH = Date.UTC(1899, 11, 30);

export function serialToDate(serial: number): Date {
  const s = Math.floor(serial);
  if (s < 60) return new Date(EPOCH + (s + 1) * MS_DAY);
  if (s === 60) return new Date(EPOCH + 60 * MS_DAY); // Excel's phantom 29 Feb 1900 is shown as 28 Feb here
  // serials >= 61 map exactly
  return new Date(EPOCH + s * MS_DAY);
}
export function dateToSerial(y: number, m: number, d: number): number {
  // normalise month overflow like Excel's DATE()
  const t = Date.UTC(y, m - 1, d);
  const days = Math.round((t - EPOCH) / MS_DAY);
  return days <= 60 ? days - 1 : days;
}
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ymd(serial: number) {
  const d = serialToDate(serial);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() };
}
export function todaySerial(): number {
  const n = new Date();
  return dateToSerial(n.getFullYear(), n.getMonth() + 1, n.getDate());
}
export function parseISODate(s: string): number | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const serial = dateToSerial(y, mo, d);
  const back = ymd(serial);
  return back.y === y && back.m === mo && back.d === d ? serial : null;
}

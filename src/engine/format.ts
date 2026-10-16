import { DAYS, MONTHS, serialToDate } from "./dates";
import { isErr, type NumberFormat, type Scalar } from "./types";

export function numToStr(n: number): string {
  if (!isFinite(n)) return String(n);
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-9) return n.toExponential(9).replace(/\.?0+e/, "e").replace("e+", "E+").replace("e-", "E-");
  return String(parseFloat(n.toPrecision(15)));
}

function roundHalfUp(n: number, d: number): number {
  const f = Math.pow(10, d);
  const r = Math.round(Math.abs(n) * f + 1e-9 * Math.abs(n) * f) / f;
  return n < 0 ? -r : r;
}

function groupThousands(s: string) {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Subset of Excel's TEXT() format codes: dates (yyyy, yy, mmmm, mmm, mm, m, dddd, ddd, dd, d, h, mm, ss) and numbers (0 # , . %). */
export function formatWithCode(n: number, code: string): string {
  const isDate = /[ymdhs]/i.test(code.replace(/"[^"]*"/g, ""));
  if (isDate) {
    const d = serialToDate(n);
    const frac = n - Math.floor(n);
    const hours = Math.floor(frac * 24 + 1e-9);
    const minutes = Math.floor(frac * 1440 + 1e-9) % 60;
    const seconds = Math.round(frac * 86400) % 60;
    const hasH = /h/i.test(code);
    let lastWasH = false;
    return code.replace(/"([^"]*)"|yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|AM\/PM/gi, (tok, lit) => {
      if (lit !== undefined) return lit;
      const t = tok.toLowerCase();
      const p2 = (x: number) => String(x).padStart(2, "0");
      switch (t) {
        case "yyyy": return String(d.getUTCFullYear());
        case "yy": return p2(d.getUTCFullYear() % 100);
        case "mmmm": return MONTHS[d.getUTCMonth()];
        case "mmm": return MONTHS[d.getUTCMonth()].slice(0, 3);
        case "mm":
        case "m": {
          if (hasH && lastWasH) return t === "mm" ? p2(minutes) : String(minutes);
          return t === "mm" ? p2(d.getUTCMonth() + 1) : String(d.getUTCMonth() + 1);
        }
        case "dddd": return DAYS[d.getUTCDay()];
        case "ddd": return DAYS[d.getUTCDay()].slice(0, 3);
        case "dd": return p2(d.getUTCDate());
        case "d": return String(d.getUTCDate());
        case "hh": lastWasH = true; return p2(hours);
        case "h": lastWasH = true; return String(hours);
        case "ss": return p2(seconds);
        case "s": return String(seconds);
        case "am/pm": return hours >= 12 ? "PM" : "AM";
      }
      return tok;
    });
  }
  const m = /([#0,]*0?[#0,]*)(\.[0#]+)?/.exec(code.replace(/"[^"]*"/g, (s) => "\u0001".repeat(s.length)));
  if (!m || !/[0#]/.test(m[0])) return code.replace(/"/g, "");
  const start = m.index;
  const end = start + m[0].length;
  const clean = (s: string) => s.replace(/"/g, "").replace(/\\/g, "");
  const prefix = clean(code.slice(0, start));
  const suffix = clean(code.slice(end));
  const pct = (prefix + suffix).includes("%");
  let val = pct ? n * 100 : n;
  const decimals = m[2] ? m[2].length - 1 : 0;
  val = roundHalfUp(val, decimals);
  const neg = val < 0;
  let [ip, fp = ""] = Math.abs(val).toFixed(decimals).split(".");
  const intPattern = m[1];
  const minInt = (intPattern.match(/0/g) ?? []).length;
  ip = ip.padStart(minInt, "0");
  if (minInt === 0 && ip === "0" && (m[2] ?? "").length > 0) ip = "";
  if (intPattern.includes(",")) ip = groupThousands(ip);
  // optional decimals (#) are trimmed
  if (m[2]) {
    const pat = m[2].slice(1);
    let f = fp;
    while (f.length > 0 && pat[f.length - 1] === "#" && f.endsWith("0")) f = f.slice(0, -1);
    fp = f;
  }
  return `${neg ? "-" : ""}${prefix}${ip}${fp ? "." + fp : ""}${suffix}`;
}

export function displayValue(v: Scalar, nf: NumberFormat = "general"): string {
  if (isErr(v)) return v.code;
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "string") return v;
  switch (nf) {
    case "number": return formatWithCode(v, "#,##0.00");
    case "currency": return formatWithCode(v, "₹#,##0.00");
    case "percent": return formatWithCode(v, "0.00%");
    case "date": return formatWithCode(v, "dd-mmm-yyyy");
    case "text": return numToStr(v);
    default: return numToStr(v);
  }
}

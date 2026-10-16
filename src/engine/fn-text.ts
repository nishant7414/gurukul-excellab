import { flat, reg, toBool, toNum, toStr, unwrap, collapse } from "./core";
import { XlError, isErr, type Matrix, type Scalar, type Value } from "./types";
import { formatWithCode } from "./format";
import { parseISODate } from "./dates";

const cat = "Text" as const;

reg({
  name: "LEFT", min: 1, max: 2, category: cat, lift: "all",
  impl: ([t, n]) => {
    const k = n === null || n === undefined ? 1 : Math.trunc(toNum(n));
    if (k < 0) throw new XlError("#VALUE!", "LEFT's num_chars cannot be negative.");
    return toStr(t).slice(0, k);
  },
});
reg({
  name: "RIGHT", min: 1, max: 2, category: cat, lift: "all",
  impl: ([t, n]) => {
    const k = n === null || n === undefined ? 1 : Math.trunc(toNum(n));
    if (k < 0) throw new XlError("#VALUE!", "RIGHT's num_chars cannot be negative.");
    const s = toStr(t);
    return k === 0 ? "" : s.slice(-k);
  },
});
reg({
  name: "MID", min: 3, max: 3, category: cat, lift: "all",
  impl: ([t, st, n]) => {
    const start = Math.trunc(toNum(st));
    const len = Math.trunc(toNum(n));
    if (start < 1 || len < 0) throw new XlError("#VALUE!", "MID's start_num must be at least 1 and num_chars cannot be negative.");
    return toStr(t).substr(start - 1, len);
  },
});
reg({ name: "LEN", min: 1, max: 1, category: cat, lift: "all", impl: ([t]) => toStr(t).length });
reg({ name: "TRIM", min: 1, max: 1, category: cat, lift: "all", impl: ([t]) => toStr(t).replace(/^ +| +$/g, "").replace(/ {2,}/g, " ") });
reg({ name: "UPPER", min: 1, max: 1, category: cat, lift: "all", impl: ([t]) => toStr(t).toUpperCase() });
reg({ name: "LOWER", min: 1, max: 1, category: cat, lift: "all", impl: ([t]) => toStr(t).toLowerCase() });
reg({
  name: "PROPER", min: 1, max: 1, category: cat, lift: "all",
  impl: ([t]) => toStr(t).toLowerCase().replace(/[^\W\d_]+/gu, (w) => w[0].toUpperCase() + w.slice(1)),
});
reg({
  name: "EXACT", min: 2, max: 2, category: cat, lift: "all",
  impl: ([a, b]) => toStr(a) === toStr(b),
});
reg({
  name: "CONCATENATE", min: 1, max: Infinity, category: cat, lift: "all",
  impl: (a) => a.map(toStr).join(""),
});
reg({
  name: "CONCAT", min: 1, max: Infinity, category: cat,
  impl: (a) => a.map((x) => flat(x).map(toStr).join("")).join(""),
});
reg({
  name: "TEXTJOIN", min: 3, max: Infinity, category: cat,
  impl: (a) => {
    const delims = flat(a[0]).map(toStr);
    const ignore = toBool(a[1]);
    const parts: string[] = [];
    for (const x of a.slice(2))
      for (const v of flat(x)) {
        if (isErr(v)) throw v;
        const s = toStr(v);
        if (ignore && s === "") continue;
        parts.push(s);
      }
    let out = "";
    parts.forEach((p, i) => {
      out += p;
      if (i < parts.length - 1) out += delims[i % delims.length] ?? "";
    });
    return out;
  },
});

function wildcardRegex(pat: string, flags: string): RegExp {
  let out = "";
  for (let i = 0; i < pat.length; i++) {
    const c = pat[i];
    if (c === "~" && i + 1 < pat.length) out += pat[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (c === "*") out += "[\\s\\S]*";
    else if (c === "?") out += "[\\s\\S]";
    else out += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(out, flags);
}
export { wildcardRegex };

reg({
  name: "FIND", min: 2, max: 3, category: cat, lift: "all",
  impl: ([f, w, st]) => {
    const needle = toStr(f), hay = toStr(w);
    const start = st === null || st === undefined ? 1 : Math.trunc(toNum(st));
    if (start < 1 || start > hay.length + 1) throw new XlError("#VALUE!", "FIND's start_num is outside the text.");
    const i = hay.indexOf(needle, start - 1);
    if (i < 0) throw new XlError("#VALUE!", `FIND could not find "${needle}" in "${hay}". FIND is case-sensitive and does not allow wildcards.`);
    return i + 1;
  },
});
reg({
  name: "SEARCH", min: 2, max: 3, category: cat, lift: "all",
  impl: ([f, w, st]) => {
    const needle = toStr(f), hay = toStr(w);
    const start = st === null || st === undefined ? 1 : Math.trunc(toNum(st));
    if (start < 1 || start > hay.length + 1) throw new XlError("#VALUE!", "SEARCH's start_num is outside the text.");
    const m = wildcardRegex(needle, "i").exec(hay.slice(start - 1));
    if (!m) throw new XlError("#VALUE!", `SEARCH could not find "${needle}" in "${hay}".`);
    return m.index + start;
  },
});
reg({
  name: "SUBSTITUTE", min: 3, max: 4, category: cat, lift: "all",
  impl: ([t, o, n, inst]) => {
    const text = toStr(t), oldT = toStr(o), newT = toStr(n);
    if (oldT === "") return text;
    if (inst === null || inst === undefined) return text.split(oldT).join(newT);
    const k = Math.trunc(toNum(inst));
    if (k < 1) throw new XlError("#VALUE!", "SUBSTITUTE's instance_num must be at least 1.");
    let idx = -1;
    let from = 0;
    for (let c = 0; c < k; c++) {
      idx = text.indexOf(oldT, from);
      if (idx < 0) return text;
      from = idx + oldT.length;
    }
    return text.slice(0, idx) + newT + text.slice(idx + oldT.length);
  },
});
reg({
  name: "REPLACE", min: 4, max: 4, category: cat, lift: "all",
  impl: ([t, st, n, nt]) => {
    const text = toStr(t);
    const start = Math.trunc(toNum(st));
    const len = Math.trunc(toNum(n));
    if (start < 1 || len < 0) throw new XlError("#VALUE!");
    return text.slice(0, start - 1) + toStr(nt) + text.slice(start - 1 + len);
  },
});
reg({
  name: "TEXT", min: 2, max: 2, category: cat, lift: "all",
  impl: ([v, f]) => {
    const fmt = toStr(f);
    if (typeof v === "string") {
      const iso = parseISODate(v);
      try {
        return formatWithCode(iso ?? toNum(v), fmt);
      } catch {
        return v;
      }
    }
    return formatWithCode(toNum(v as Value), fmt);
  },
});
reg({
  name: "VALUE", min: 1, max: 1, category: cat, lift: "all",
  impl: ([v]) => {
    if (typeof v === "string") {
      const iso = parseISODate(v);
      if (iso !== null) return iso;
      const cleaned = v.trim().replace(/^[$₹€£]/, "").replace(/,/g, "");
      try {
        return toNum(cleaned);
      } catch {
        throw new XlError("#VALUE!", `VALUE could not convert "${v}" to a number.`);
      }
    }
    return toNum(v as Value);
  },
});

/* ---------- TEXTBEFORE / TEXTAFTER / TEXTSPLIT ---------- */
function delimList(d: Value): string[] {
  return flat(d).map(toStr);
}
function occurrences(text: string, delims: string[], ci: boolean) {
  const ds = delims.filter((d) => d !== "").sort((a, b) => b.length - a.length);
  if (!ds.length) return [] as { index: number; len: number }[];
  const re = new RegExp(ds.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), ci ? "gi" : "g");
  const out: { index: number; len: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ index: m.index, len: m[0].length });
  return out;
}
function textBeforeAfter(before: boolean) {
  return (a: Value[]): Value => {
    const text = toStr(a[0]);
    const delims = delimList(a[1]);
    const inst = a[2] === null || a[2] === undefined ? 1 : Math.trunc(toNum(a[2]));
    const ci = a[3] === null || a[3] === undefined ? false : toNum(a[3]) === 1;
    const matchEnd = a[4] === null || a[4] === undefined ? false : toNum(a[4]) === 1;
    const notFound = a.length > 5 && a[5] !== null ? a[5] : new XlError("#N/A", "The delimiter was not found in the text.");
    if (inst === 0) throw new XlError("#VALUE!", "instance_num cannot be 0.");
    if (delims.every((d) => d === "")) return before ? "" : text;
    const occ = occurrences(text, delims, ci);
    if (matchEnd) {
      if (inst > 0) occ.push({ index: text.length, len: 0 });
      else occ.unshift({ index: 0, len: 0 });
    }
    const pick = inst > 0 ? occ[inst - 1] : occ[occ.length + inst];
    if (!pick) {
      if (notFound instanceof XlError) throw notFound;
      return notFound as Scalar;
    }
    return before ? text.slice(0, pick.index) : text.slice(pick.index + pick.len);
  };
}
reg({ name: "TEXTBEFORE", min: 2, max: 6, category: cat, lift: [0], impl: textBeforeAfter(true) });
reg({ name: "TEXTAFTER", min: 2, max: 6, category: cat, lift: [0], impl: textBeforeAfter(false) });
reg({
  name: "TEXTSPLIT", min: 2, max: 6, category: cat,
  impl: (a) => {
    const text = toStr(a[0]);
    const colD = a[1] === null ? [] : delimList(a[1]);
    const rowD = a[2] === null || a[2] === undefined ? [] : delimList(a[2]);
    const ignoreEmpty = a[3] === null || a[3] === undefined ? false : toBool(a[3]);
    const ci = a[4] === null || a[4] === undefined ? false : toNum(a[4]) === 1;
    const pad: Scalar = a[5] === null || a[5] === undefined ? new XlError("#N/A") : unwrap(a[5]);
    if (colD.every((d) => d === "") && rowD.every((d) => d === "")) throw new XlError("#VALUE!", "TEXTSPLIT needs at least one delimiter.");
    const splitBy = (s: string, ds: string[]): string[] => {
      const occ = occurrences(s, ds, ci);
      const parts: string[] = [];
      let last = 0;
      for (const o of occ) {
        parts.push(s.slice(last, o.index));
        last = o.index + o.len;
      }
      parts.push(s.slice(last));
      return ignoreEmpty ? parts.filter((p) => p !== "") : parts;
    };
    const rows = rowD.length ? splitBy(text, rowD) : [text];
    const grid = rows.map((r) => (colD.length ? splitBy(r, colD) : [r]));
    const w = Math.max(...grid.map((r) => r.length));
    const out: Matrix = grid.map((r) => [...r, ...Array(w - r.length).fill(pad)]);
    return collapse(out);
  },
});

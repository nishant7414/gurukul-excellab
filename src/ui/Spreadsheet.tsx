import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

const UniverHost = lazy(() => import("./spreadsheet/UniverHost").then((m) => ({ default: m.UniverHost })));
import { compute, parseInput } from "../engine/workbook";
import { displayValue } from "../engine/format";
import { parseISODate } from "../engine/dates";
import { addr, cellsIn, colToNum, inRange, numToCol, parseAddr, parseRange, rangeToString, type RangeRef } from "../engine/refs";
import { isErr, type CellFormat, type NumberFormat, type SheetData, type WorkbookData } from "../engine/types";
import { applyTextToColumns, autoFillRange, clearFilter, cloneWb, copyRange, filterRows, flashFillAt, getSheet, pasteClip, sortRange, type Clip, type FilterOp, type PasteMode, type T2CPlan } from "../engine/ops";
import type { CellFeedback, ToolId } from "../learning/types";
import { shiftFormula } from "../engine/parser";
import { FilterDialog, TextToColumnsWizard } from "./dialogs";
import { ArrowDownAZ, ArrowDownZA, Bold, ClipboardPaste, Columns3, Copy, Filter, Italic, Plus, Redo2, Scissors, Sparkles, Undo2, WrapText, AlignLeft, AlignCenter, AlignRight, Rows3 } from "lucide-react";

interface Props {
  workbook: WorkbookData;
  onChange: (wb: WorkbookData) => void;
  activeSheet: string;
  onActiveSheet: (name: string) => void;
  /** ranges the user may edit (optionally "Sheet!A1:B2"); empty/undefined means everything */
  editable?: string[];
  editableSheet?: string;
  feedback?: CellFeedback[];
  allowSheetOps?: boolean;
  minRows?: number;
  minCols?: number;
  emphasise?: ToolId[];
  /** scroll the active sheet so this cell is visible on first render */
  focusCell?: string;
  height?: number;
}

const DEFAULT_W = 92;
const ROW_H = 26;
/** worksheets taller than this are drawn in a window (only the visible rows are in the DOM) */
const MAX_ROWS = 3000;
const WINDOW_FROM = 150;
const SCROLL_STEP = ROW_H * 8;
const NF_OPTIONS: { v: NumberFormat; l: string }[] = [
  { v: "general", l: "General" }, { v: "number", l: "Number (1,234.50)" }, { v: "currency", l: "Currency (₹)" }, { v: "percent", l: "Percent" }, { v: "date", l: "Date" }, { v: "text", l: "Text" },
];
const FILLS = ["", "#fff3b0", "#c9f2d6", "#cfe4ff", "#ffd6d6"];

const FB_ICON: Record<string, string> = { correct: "✓", wrong: "✗", error: "✗", missing: "○", hardcoded: "!", "wrong-function": "!", "forbidden-function": "!", "not-general": "!", "locked-changed": "🔒" };

interface CellProps {
  a: string; text: string; cls: string; style?: React.CSSProperties; fb?: CellFeedback; editing: boolean; editText: string;
  onEditText: (t: string) => void; onEditKey: (e: React.KeyboardEvent<HTMLInputElement>) => void; onEditBlur: () => void; showHandle: boolean; onHandleDown: (e: React.PointerEvent) => void;
}
const CellImpl = function Cell({ a, text, cls, style, fb, editing, editText, onEditText, onEditKey, onEditBlur, showHandle, onHandleDown }: CellProps) {
  return (
    <td data-addr={a} className={cls} style={style} title={fb ? `${fb.status.toUpperCase()}: ${fb.message}` : undefined} aria-label={`${a}: ${text}`}>
      {editing ? (
        <input className="cell-input" autoFocus value={editText} onChange={(e) => onEditText(e.target.value)} onKeyDown={onEditKey} onBlur={onEditBlur} spellCheck={false} aria-label={`Editing ${a}`} />
      ) : (
        <span className="cell-text">{text}</span>
      )}
      {fb && !editing && <span className={`fb-icon fb-${fb.status}`} aria-hidden="true">{FB_ICON[fb.status]}</span>}
      {showHandle && !editing && <span className="fill-handle" onPointerDown={onHandleDown} title="Fill handle: drag to AutoFill" role="presentation" />}
    </td>
  );
};
const sameStyle = (a?: React.CSSProperties, b?: React.CSSProperties) => a === b || JSON.stringify(a) === JSON.stringify(b);
// handlers are passed through stable wrappers, so cells re-render only when their own visible state changes
const Cell = memo(CellImpl, (p, n) => p.a === n.a && p.text === n.text && p.cls === n.cls && p.fb === n.fb && p.editing === n.editing && p.editText === n.editText && p.showHandle === n.showHandle && sameStyle(p.style, n.style));

function currentRegion(sh: SheetData, comp: ReturnType<typeof compute>, name: string, a: string): RangeRef {
  const p = parseAddr(a)!;
  const has = (c: number, r: number) => c >= 1 && r >= 1 && comp.cell(name, addr(c, r)).value !== null;
  const seen = new Set<string>();
  const stack = [{ c: p.col, r: p.row }];
  let c1 = p.col, c2 = p.col, r1 = p.row, r2 = p.row;
  while (stack.length) {
    const { c, r } = stack.pop()!;
    const k = `${c},${r}`;
    if (seen.has(k)) continue;
    seen.add(k);
    c1 = Math.min(c1, c); c2 = Math.max(c2, c); r1 = Math.min(r1, r); r2 = Math.max(r2, r);
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if ((dc || dr) && has(c + dc, r + dr) && !seen.has(`${c + dc},${r + dr}`)) stack.push({ c: c + dc, r: r + dr });
  }
  void sh;
  return { c1, r1, c2, r2 };
}

export function canUseUniver(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.MODE === "test" || import.meta.env.VITEST) return false;
  return typeof HTMLCanvasElement !== "undefined";
}

export function Spreadsheet(props: Props) {
  if (!canUseUniver()) return <ClassicSpreadsheet {...props} />;
  return (
    <Suspense fallback={<div className="sheet glass-flat" style={{ height: props.height ?? 520 }} aria-busy="true">Loading spreadsheet…</div>}>
      <UniverHost {...props} />
    </Suspense>
  );
}

function ClassicSpreadsheet({ workbook, onChange, activeSheet, onActiveSheet, editable, editableSheet, feedback, allowSheetOps, minRows = 24, minCols = 10, emphasise = [], focusCell, height = 460 }: Props) {
  const sheet = getSheet(workbook, activeSheet) ?? workbook.sheets[0];
  const comp = useMemo(() => compute(workbook), [workbook]);
  const [anchor, setAnchor] = useState<string>("A1");
  const [focus, setFocus] = useState<string>("A1");
  const [editing, setEditing] = useState<{ a: string; text: string; from: "cell" | "bar" } | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: "info" | "warn" | "ok" } | null>(null);
  const [t2c, setT2c] = useState(false);
  const [filt, setFilt] = useState(false);
  const [extend, setExtend] = useState(false);
  const [pasteMenu, setPasteMenu] = useState(false);
  const [dragFill, setDragFill] = useState<{ src: RangeRef; target: RangeRef | null } | null>(null);
  const hist = useRef<{ past: WorkbookData[]; future: WorkbookData[] }>({ past: [], future: [] });
  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const winRef = useRef<{ windowed: boolean; rows: number[] }>({ windowed: false, rows: [] });
  const selecting = useRef(false);
  const nameBoxRef = useRef<HTMLInputElement>(null);
  const [nameText, setNameText] = useState<string | null>(null);

  const editRanges = useMemo(
    () => (editable ?? []).map((e) => { const r = parseRange(e)!; return { ...r, sheet: (r.sheet ?? editableSheet ?? "").toLowerCase() }; }),
    [editable, editableSheet],
  );
  const canEdit = useCallback((a: string, sh = sheet.name) => editRanges.length === 0 || editRanges.some((r) => r.sheet === sh.toLowerCase() && inRange(a, r)), [editRanges, sheet.name]);

  const pa = parseAddr(anchor)!, pf = parseAddr(focus)!;
  const sel: RangeRef = { c1: Math.min(pa.col, pf.col), r1: Math.min(pa.row, pf.row), c2: Math.max(pa.col, pf.col), r2: Math.max(pa.row, pf.row) };
  const selStr = rangeToString(sel);

  const ext = useMemo(() => {
    let maxR = 0, maxC = 0;
    for (const k of Object.keys(sheet.cells)) { const p = parseAddr(k); if (p) { maxR = Math.max(maxR, p.row); maxC = Math.max(maxC, p.col); } }
    return { rows: Math.min(MAX_ROWS, Math.max(minRows, maxR + 4)), cols: Math.min(60, Math.max(minCols, maxC + 2)) };
  }, [sheet.cells, minRows, minCols, comp.wb.sheets, sheet.name]);

  // include spill extents
  const spillExt = useMemo(() => {
    let rows = ext.rows, cols = ext.cols;
    for (const k of Object.keys(sheet.cells)) {
      const r = comp.cell(sheet.name, k);
      const p = parseAddr(k);
      if (r.spill && p) { rows = Math.max(rows, p.row + r.spill.rows + 1); cols = Math.max(cols, p.col + r.spill.cols); }
    }
    return { rows: Math.min(MAX_ROWS, rows), cols: Math.min(70, cols) };
  }, [ext, sheet.cells, sheet.name, comp]);

  const fbMap = useMemo(() => {
    const m = new Map<string, CellFeedback>();
    for (const f of feedback ?? []) if (f.sheet.toLowerCase() === sheet.name.toLowerCase()) {
      // a range-level feedback (addr like "A1:B2") is shown on its first cell only
      if (!f.addr.includes(":")) m.set(f.addr, f);
    }
    return m;
  }, [feedback, sheet.name]);

  const flash = (text: string, kind: "info" | "warn" | "ok" = "info") => setMsg({ text, kind });

  const commit = useCallback((next: WorkbookData, record = true) => {
    if (record) { hist.current.past.push(workbook); if (hist.current.past.length > 100) hist.current.past.shift(); hist.current.future = []; }
    onChange(next);
  }, [onChange, workbook]);
  const undo = () => { const p = hist.current.past.pop(); if (p) { hist.current.future.push(workbook); onChange(p); flash("Undo"); } };
  const redo = () => { const f = hist.current.future.pop(); if (f) { hist.current.past.push(workbook); onChange(f); flash("Redo"); } };

  const mutate = (fn: (sh: SheetData, wb: WorkbookData) => void, record = true) => {
    const wb = cloneWb(workbook);
    const sh = getSheet(wb, sheet.name)!;
    fn(sh, wb);
    commit(wb, record);
  };

  const select = (a: string, extendSel = false) => { setFocus(a); if (!extendSel) setAnchor(a); };
  const move = (dc: number, dr: number, extendSel = false) => {
    const p = parseAddr(extendSel ? focus : anchor)!;
    const c = Math.max(1, Math.min(spillExt.cols, p.col + dc)), r = Math.max(1, Math.min(spillExt.rows, p.row + dr));
    select(addr(c, r), extendSel);
  };

  useEffect(() => {
    const g = gridRef.current;
    if (!g) return;
    const w = winRef.current;
    const p = parseAddr(focus);
    if (w.windowed && p) {
      // the target row may not be in the DOM yet: scroll by arithmetic first
      const idx = w.rows.indexOf(p.row);
      if (idx >= 0) {
        const top = (idx + 1) * ROW_H; // +1 for the sticky header row
        if (top < g.scrollTop + ROW_H) g.scrollTop = Math.max(0, top - ROW_H);
        else if (top + ROW_H > g.scrollTop + g.clientHeight) g.scrollTop = top + ROW_H - g.clientHeight;
        setScrollTop(Math.floor(g.scrollTop / SCROLL_STEP) * SCROLL_STEP);
      }
    }
    g.querySelector(`[data-addr="${focus}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focus]);
  useEffect(() => { if (gridRef.current) gridRef.current.scrollTop = 0; setScrollTop(0); }, [sheet.name]);
  useEffect(() => {
    if (focusCell) { setAnchor(focusCell); setFocus(focusCell); }
  }, [focusCell, activeSheet]);

  const rawOf = (a: string) => sheet.cells[a] ?? "";
  const activeA = anchor;
  const activeInfo = comp.cell(sheet.name, activeA);

  /* ------------------------------ editing ------------------------------ */
  const startEdit = (a: string, text: string, from: "cell" | "bar" = "cell") => {
    if (!canEdit(a)) { flash("This cell is part of the provided data and is protected. Edit only the highlighted answer cells.", "warn"); return; }
    setEditing({ a, text, from });
  };
  const commitEdit = (text: string, dir: "down" | "right" | "none" | "up" | "left") => {
    if (!editing) return;
    const a = editing.a;
    setEditing(null);
    mutate((sh) => {
      let raw = text;
      const iso = parseISODate(raw);
      if (iso !== null && !raw.startsWith("'")) { raw = String(iso); sh.formats[a] = { ...(sh.formats[a] ?? {}), nf: "date" }; }
      if (raw === "") delete sh.cells[a]; else sh.cells[a] = raw;
    });
    const p = parseAddr(a)!;
    if (dir === "down") select(addr(p.col, p.row + 1));
    else if (dir === "right") select(addr(p.col + 1, p.row));
    else if (dir === "up") select(addr(p.col, Math.max(1, p.row - 1)));
    else if (dir === "left") select(addr(Math.max(1, p.col - 1), p.row));
    else select(a);
    gridRef.current?.focus();
  };
  const cancelEdit = () => { setEditing(null); gridRef.current?.focus(); };

  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!editing) return;
    if (e.key === "Enter") { e.preventDefault(); commitEdit(editing.text, e.shiftKey ? "up" : "down"); }
    else if (e.key === "Tab") { e.preventDefault(); commitEdit(editing.text, e.shiftKey ? "left" : "right"); }
    else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  };

  /* ------------------------------ clipboard & ops ------------------------------ */
  const doCopy = (cut = false) => {
    const c = copyRange(workbook, comp, sheet.name, sel, cut);
    setClip(c);
    try { void navigator.clipboard?.writeText(c.cells.map((r) => r.map((x) => (x.value === null ? "" : isErr(x.value) ? x.value.code : String(x.value))).join("\t")).join("\n")); } catch { /* clipboard may be unavailable */ }
    flash(cut ? `Cut ${selStr}. Select a destination and paste.` : `Copied ${selStr}. Select a destination and paste.`, "info");
  };
  const writeGuarded = (fn: (tmp: SheetData) => string[], label: string) => {
    const tmp = structuredClone(sheet) as SheetData;
    const written = fn(tmp);
    let skipped = 0;
    mutate((sh) => {
      for (const a of written) {
        if (!canEdit(a)) { skipped++; continue; }
        if (tmp.cells[a] === undefined) delete sh.cells[a]; else sh.cells[a] = tmp.cells[a];
        if (tmp.formats[a]) sh.formats[a] = tmp.formats[a]; else delete sh.formats[a];
      }
    });
    flash(skipped ? `${label}: ${skipped} protected cell(s) were not changed.` : label, skipped ? "warn" : "ok");
  };
  const doPaste = (mode: PasteMode) => {
    if (!clip) { flash("Nothing to paste. Copy a range first (Ctrl+C).", "warn"); return; }
    const p = parseAddr(anchor)!;
    writeGuarded((tmp) => pasteClip(tmp, clip, p.col, p.row, mode), mode === "transpose" ? `Pasted transposed at ${anchor} (rows became columns). Formulas were converted to values.` : `Pasted at ${anchor}.`);
    if (clip.cut && mode !== "transpose") {
      mutate((sh) => { for (const a of cellsIn(clip.range)) if (canEdit(a)) delete sh.cells[a]; });
      setClip(null);
    }
    setPasteMenu(false);
  };
  const doClear = () => {
    const wb = cloneWb(workbook); const sh = getSheet(wb, sheet.name)!; let blocked = 0;
    for (const a of cellsIn(sel)) { if (!canEdit(a)) { blocked++; continue; } delete sh.cells[a]; }
    commit(wb);
    if (blocked) flash(`${blocked} protected cell(s) were not cleared.`, "warn");
  };
  const fillDir = (dir: "down" | "right") => {
    const src: RangeRef = dir === "down" ? { ...sel, r2: sel.r1 } : { ...sel, c2: sel.c1 };
    const to = dir === "down" ? { r2: sel.r2 } : { c2: sel.c2 };
    if ((dir === "down" && sel.r1 === sel.r2) || (dir === "right" && sel.c1 === sel.c2)) { flash("Select the source cell and the cells to fill, then use Fill Down / Fill Right.", "warn"); return; }
    writeGuarded((tmp) => {
      // copy the first row/col over the rest, shifting formulas
      const w: string[] = [];
      for (const a of cellsIn(sel)) {
        const p = parseAddr(a)!;
        const sa = dir === "down" ? addr(p.col, sel.r1) : addr(sel.c1, p.row);
        if (sa === a) continue;
        const raw = tmp.cells[sa] ?? "";
        const out = raw.startsWith("=") ? shiftFormula(raw, p.row - parseAddr(sa)!.row, p.col - parseAddr(sa)!.col) : raw;
        if (out === "") delete tmp.cells[a]; else tmp.cells[a] = out;
        w.push(a);
      }
      void src; void to;
      return w;
    }, dir === "down" ? "Filled down." : "Filled right.");
  };

  const applyFormat = (f: Partial<CellFormat>) => mutate((sh) => { for (const a of cellsIn(sel)) { const cur = sh.formats[a] ?? {}; sh.formats[a] = { ...cur, ...f }; } });
  const toggleFormat = (k: "bold" | "italic" | "wrap") => { const cur = sheet.formats[activeA]?.[k]; applyFormat({ [k]: !cur }); };

  /* ------------------------------ fill handle ------------------------------ */
  const onHandleDown = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragFill({ src: sel, target: null });
    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-addr]") as HTMLElement | null;
      if (!el) return;
      const p = parseAddr(el.dataset.addr!)!;
      setDragFill((d) => {
        if (!d) return d;
        const s = d.src;
        const dr = p.row > s.r2 ? p.row - s.r2 : p.row < s.r1 ? p.row - s.r1 : 0;
        const dc = p.col > s.c2 ? p.col - s.c2 : p.col < s.c1 ? p.col - s.c1 : 0;
        if (!dr && !dc) return { ...d, target: null };
        const vertical = Math.abs(dr) >= Math.abs(dc);
        return { ...d, target: vertical ? (dr > 0 ? { c1: s.c1, c2: s.c2, r1: s.r2 + 1, r2: p.row } : { c1: s.c1, c2: s.c2, r1: p.row, r2: s.r1 - 1 }) : (dc > 0 ? { r1: s.r1, r2: s.r2, c1: s.c2 + 1, c2: p.col } : { r1: s.r1, r2: s.r2, c1: p.col, c2: s.c1 - 1 }) };
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      setDragFill((d) => { if (d?.target) window.setTimeout(() => finishFill(d.src, d.target as RangeRef), 0); return null; });
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const finishFill = (src: RangeRef, t: RangeRef) => {
    let pattern = "";
    const to = t.r1 > src.r2 ? { r2: t.r2 } : t.r2 < src.r1 ? { r1: t.r1 } : t.c1 > src.c2 ? { c2: t.c2 } : { c1: t.c1 };
    writeGuarded((tmp) => { const res = autoFillRange(tmp, src, to); pattern = res.pattern; return res.written; }, "AutoFill applied.");
    window.setTimeout(() => flash(`AutoFill: ${pattern}`, "ok"), 0);
    const all: RangeRef = { c1: Math.min(src.c1, t.c1), r1: Math.min(src.r1, t.r1), c2: Math.max(src.c2, t.c2), r2: Math.max(src.r2, t.r2) };
    setAnchor(addr(all.c1, all.r1)); setFocus(addr(all.c2, all.r2));
  };

  /* ------------------------------ keyboard ------------------------------ */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    if (mod) {
      const lk = k.toLowerCase();
      if (lk === "c") { e.preventDefault(); doCopy(false); }
      else if (lk === "x") { e.preventDefault(); doCopy(true); }
      else if (lk === "v") { e.preventDefault(); doPaste("all"); }
      else if (lk === "z") { e.preventDefault(); undo(); }
      else if (lk === "y") { e.preventDefault(); redo(); }
      else if (lk === "b") { e.preventDefault(); toggleFormat("bold"); }
      else if (lk === "i") { e.preventDefault(); toggleFormat("italic"); }
      else if (lk === "d") { e.preventDefault(); fillDir("down"); }
      else if (lk === "r") { e.preventDefault(); fillDir("right"); }
      else if (lk === "a") {
        e.preventDefault();
        const reg = currentRegion(sheet, comp, sheet.name, anchor);
        const isAlready = reg.c1 === sel.c1 && reg.r1 === sel.r1 && reg.c2 === sel.c2 && reg.r2 === sel.r2;
        if (comp.cell(sheet.name, anchor).value !== null && !isAlready) { setAnchor(addr(reg.c1, reg.r1)); setFocus(addr(reg.c2, reg.r2)); flash(`Ctrl+A selected the current region ${rangeToString(reg)}. Press Ctrl+A again to select the whole sheet.`); }
        else { setAnchor("A1"); setFocus(addr(spillExt.cols, spillExt.rows)); flash("Selected the whole sheet."); }
      } else if (k === "Home") { e.preventDefault(); select("A1", e.shiftKey); }
      return;
    }
    switch (k) {
      case "ArrowDown": e.preventDefault(); move(0, 1, e.shiftKey); return;
      case "ArrowUp": e.preventDefault(); move(0, -1, e.shiftKey); return;
      case "ArrowLeft": e.preventDefault(); move(-1, 0, e.shiftKey); return;
      case "ArrowRight": e.preventDefault(); move(1, 0, e.shiftKey); return;
      case "Tab": e.preventDefault(); move(e.shiftKey ? -1 : 1, 0); return;
      case "Enter": e.preventDefault(); startEdit(activeA, rawOf(activeA)); return;
      case "F2": e.preventDefault(); startEdit(activeA, rawOf(activeA)); return;
      case "Delete": case "Backspace": e.preventDefault(); doClear(); return;
      case "Escape": setClip(null); return;
    }
    if (k.length === 1 && !e.altKey) { e.preventDefault(); startEdit(activeA, k); }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (clip) { doPaste("all"); return; }
    if (!text) return;
    const rows = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((r) => r.split("\t"));
    const p = parseAddr(anchor)!;
    writeGuarded((tmp) => { const w: string[] = []; rows.forEach((r, ri) => r.forEach((v, ci) => { const a = addr(p.col + ci, p.row + ri); if (v === "") delete tmp.cells[a]; else tmp.cells[a] = v; w.push(a); })); return w; }, "Pasted text from the clipboard.");
  };

  /* ------------------------------ pointer selection ------------------------------ */
  const onGridPointerDown = (e: React.PointerEvent) => {
    const td = (e.target as HTMLElement).closest("td[data-addr]") as HTMLElement | null;
    if ((e.target as HTMLElement).closest(".cell-input,.fill-handle,.col-resizer")) return;
    if (!td) return;
    const a = td.dataset.addr!;
    // point mode: clicking a cell while typing a formula inserts its reference
    if (editing && editing.text.startsWith("=") && /[=+\-*/(,:<>&^]$/.test(editing.text)) {
      e.preventDefault();
      setEditing({ ...editing, text: editing.text + a });
      return;
    }
    if (editing) commitEdit(editing.text, "none");
    selecting.current = true;
    select(a, e.shiftKey || extend);
    gridRef.current?.focus();
  };
  const onGridPointerOver = (e: React.PointerEvent) => {
    if (!selecting.current || e.pointerType === "touch") return;
    const td = (e.target as HTMLElement).closest("td[data-addr]") as HTMLElement | null;
    if (td) setFocus(td.dataset.addr!);
  };
  useEffect(() => {
    const up = () => { selecting.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const colHeaderClick = (c: number, shift: boolean) => { setAnchor(shift ? anchor : addr(c, 1)); setFocus(addr(c, spillExt.rows)); if (!shift) setAnchor(addr(c, 1)); gridRef.current?.focus(); };
  const rowHeaderClick = (r: number) => { setAnchor(addr(1, r)); setFocus(addr(spillExt.cols, r)); gridRef.current?.focus(); };

  /* ------------------------------ column resize ------------------------------ */
  const startResize = (c: number, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startW = sheet.colWidths[c] ?? DEFAULT_W;
    const mv = (ev: PointerEvent) => {
      const w = Math.max(36, Math.min(500, startW + ev.clientX - startX));
      const wb = cloneWb(workbook); getSheet(wb, sheet.name)!.colWidths[c] = w; onChange(wb);
    };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  /* ------------------------------ tool actions ------------------------------ */
  const doTextToColumns = () => {
    if (sel.c1 !== sel.c2) { flash("Text to Columns works on one column at a time. Select the cells of a single column first.", "warn"); return; }
    setT2c(true);
  };
  const applyT2C = (plan: T2CPlan) => {
    setT2c(false);
    writeGuarded((tmp) => { applyTextToColumns(tmp, plan); const w: string[] = []; for (const a of cellsIn(plan.destination)) w.push(a); return w; }, `Text split into ${plan.width} column(s) starting at ${addr(plan.destination.c1, plan.destination.r1)}.`);
    setAnchor(addr(plan.destination.c1, plan.destination.r1)); setFocus(addr(plan.destination.c2, plan.destination.r2));
  };
  const doFlash = () => {
    const p = parseAddr(anchor)!;
    const res = flashFillAt(sheet, comp, sheet.name, p.col, p.row);
    if ("error" in res) { flash(res.error, "warn"); return; }
    const n = Object.keys(res.filled).length;
    mutate((sh) => { for (const [a, raw] of Object.entries(res.filled)) if (canEdit(a)) sh.cells[a] = raw; });
    flash(`Flash Fill (simulation) filled ${n} cell(s). ${res.pattern}. These are typed values, not formulas.`, "ok");
  };
  /** Keyboard/touch alternative to dragging the fill handle: the leading filled cells of the selection are the pattern; the rest is filled. */
  const doAutoFillSelection = () => {
    const vertical = sel.r2 > sel.r1 || sel.c1 === sel.c2;
    if (sel.r1 === sel.r2 && sel.c1 === sel.c2) { flash("Select the pattern cells and the empty cells below (or to the right) of them, then press AutoFill.", "warn"); return; }
    const filled = (a: string) => rawOf(a) !== "";
    let n = 0;
    if (vertical) while (sel.r1 + n <= sel.r2 && filled(addr(sel.c1, sel.r1 + n))) n++;
    else while (sel.c1 + n <= sel.c2 && filled(addr(sel.c1 + n, sel.r1))) n++;
    const total = vertical ? sel.r2 - sel.r1 + 1 : sel.c2 - sel.c1 + 1;
    if (n === 0 || n >= total) { flash("Start the selection on the cells that hold the pattern (for example 1 and 2) and extend it over the empty cells to fill.", "warn"); return; }
    const src: RangeRef = vertical ? { ...sel, r2: sel.r1 + n - 1 } : { ...sel, c2: sel.c1 + n - 1 };
    const to = vertical ? { r2: sel.r2 } : { c2: sel.c2 };
    let pattern = "";
    writeGuarded((tmp) => { const res = autoFillRange(tmp, src, to); pattern = res.pattern; return res.written; }, "AutoFill applied.");
    window.setTimeout(() => flash(`AutoFill: ${pattern}`, "ok"), 0);
  };
  const doSort = (desc: boolean) => {
    const reg = currentRegion(sheet, comp, sheet.name, anchor);
    const p = parseAddr(anchor)!;
    for (const a of cellsIn(reg)) if (!canEdit(a)) { flash("Sorting would move protected cells, so it is not allowed in this exercise.", "warn"); return; }
    mutate((sh) => sortRange(sh, comp, sheet.name, reg, p.col, desc, true));
    flash(`Sorted ${rangeToString(reg)} by column ${numToCol(p.col)} ${desc ? "Z→A / largest first" : "A→Z / smallest first"} (header row kept).`, "ok");
  };
  const filterHeaders = () => { const reg = currentRegion(sheet, comp, sheet.name, anchor); return { reg, headers: Array.from({ length: reg.c2 - reg.c1 + 1 }, (_, i) => ({ col: reg.c1 + i, label: `${numToCol(reg.c1 + i)} – ${displayValue(comp.value(sheet.name, addr(reg.c1 + i, reg.r1))) || "(blank)"}` })) }; };
  const applyFilter = (col: number, op: FilterOp, value: string) => {
    const { reg } = filterHeaders(); setFilt(false);
    mutate((sh) => filterRows(sh, comp, sheet.name, reg, col, op, value, true), false);
    flash(`Filter applied to column ${numToCol(col)}. Rows that do not match are hidden.`, "ok");
  };
  const clearFilt = () => { setFilt(false); mutate((sh) => clearFilter(sh), false); flash("Filter cleared.", "ok"); };

  /* ------------------------------ sheets ------------------------------ */
  const addSheet = () => { const wb = cloneWb(workbook); let n = wb.sheets.length + 1; while (wb.sheets.some((s) => s.name === `Sheet${n}`)) n++; wb.sheets.push({ name: `Sheet${n}`, cells: {}, formats: {}, colWidths: {}, hiddenRows: [] }); commit(wb); onActiveSheet(`Sheet${n}`); };
  const renameSheet = () => {
    const n = window.prompt("New sheet name", sheet.name)?.trim();
    if (!n || n === sheet.name) return;
    if (workbook.sheets.some((s) => s.name.toLowerCase() === n.toLowerCase())) { flash(`A sheet named "${n}" already exists.`, "warn"); return; }
    if (/[[\]:*?/\\]/.test(n) || n.length > 31) { flash("Sheet names cannot contain [ ] : * ? / \\ and are limited to 31 characters.", "warn"); return; }
    const old = sheet.name; const wb = cloneWb(workbook); getSheet(wb, old)!.name = n;
    // update explicit references to the renamed sheet in formulas
    const q = (s: string) => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(s) ? s : `'${s.replace(/'/g, "''")}'`);
    for (const s of wb.sheets) for (const [k, v] of Object.entries(s.cells)) if (v.startsWith("=")) s.cells[k] = v.split(q(old) + "!").join(q(n) + "!");
    commit(wb); onActiveSheet(n);
  };
  const deleteSheet = () => {
    if (workbook.sheets.length <= 1) { flash("A workbook needs at least one sheet.", "warn"); return; }
    if (!window.confirm(`Delete sheet "${sheet.name}"? Formulas that refer to it will show #REF!.`)) return;
    const wb = cloneWb(workbook); wb.sheets = wb.sheets.filter((s) => s.name !== sheet.name); commit(wb); onActiveSheet(wb.sheets[0].name);
  };

  /* ------------------------------ render ------------------------------ */
  const widthOf = (c: number) => sheet.colWidths[c] ?? DEFAULT_W;
  const fmt = sheet.formats[activeA];
  const hidden = new Set(sheet.hiddenRows);
  const nameBox = nameText ?? selStr;
  const barText = editing ? editing.text : rawOf(activeA);
  const anchorSpilled = activeInfo.spilledFrom && rawOf(activeA) === "";
  const dragT = dragFill?.target;
  const emph = (t: ToolId) => emphasise.includes(t);

  const latest = useRef({ onEditKey, onHandleDown });
  latest.current = { onEditKey, onHandleDown };
  const stableEditKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => latest.current.onEditKey(e), []);
  const stableHandle = useCallback((e: React.PointerEvent) => latest.current.onHandleDown(e), []);
  const stableEditText = useCallback((t: string) => setEditing((ed) => (ed ? { ...ed, text: t } : ed)), []);
  const stableBlur = useCallback(() => { /* blur handled by pointer logic */ }, []);
  const showHandleFor = addr(sel.c2, sel.r2);

  const rowsEls: React.ReactNode[] = [];
  // long sheets are windowed: only the rows near the viewport are rendered, the rest is a spacer of the same height
  const shownRows: number[] = [];
  for (let r = 1; r <= spillExt.rows; r++) if (!hidden.has(r)) shownRows.push(r);
  const windowed = shownRows.length > WINDOW_FROM;
  const w0 = windowed ? Math.max(0, Math.floor(scrollTop / ROW_H) - 24) : 0;
  const w1 = windowed ? Math.min(shownRows.length, Math.ceil((scrollTop + height) / ROW_H) + 24) : shownRows.length;
  winRef.current = { windowed, rows: shownRows };
  if (windowed && w0 > 0) rowsEls.push(<tr key="spacer-top" aria-hidden="true" style={{ height: w0 * ROW_H }}><td colSpan={spillExt.cols + 1} style={{ padding: 0, border: 0 }} /></tr>);
  for (let wi = w0; wi < w1; wi++) {
    const r = shownRows[wi];
    const tds: React.ReactNode[] = [
      <th key="h" scope="row" className={`row-h ${r >= sel.r1 && r <= sel.r2 ? "on" : ""}`} onClick={() => rowHeaderClick(r)}>{r}</th>,
    ];
    for (let c = 1; c <= spillExt.cols; c++) {
      const a = addr(c, r);
      const res = comp.cell(sheet.name, a);
      const f = sheet.formats[a];
      const v = res.value;
      const txt = displayValue(v, f?.nf ?? "general");
      const inSel = c >= sel.c1 && c <= sel.c2 && r >= sel.r1 && r <= sel.r2;
      const isActive = a === anchor;
      const fb = fbMap.get(a);
      const isErrV = isErr(v);
      const align = f?.align ?? (typeof v === "number" ? "right" : isErrV || typeof v === "boolean" ? "center" : "left");
      const locked = editRanges.length > 0 && !canEdit(a);
      const inDrag = dragT && c >= dragT.c1 && c <= dragT.c2 && r >= dragT.r1 && r <= dragT.r2;
      const cls = ["xl-cell", inSel ? "sel" : "", isActive ? "active" : "", locked ? "locked" : editRanges.length ? "answer" : "", res.spilledFrom ? "spilled" : "", isErrV ? "is-err" : "", fb ? `fb fb-${fb.status}` : "", inDrag ? "drag-target" : "", clip && inRange(a, clip.range) && clip.sheet === sheet.name ? "marching" : ""].filter(Boolean).join(" ");
      const style: React.CSSProperties = { textAlign: align, fontWeight: f?.bold ? 700 : undefined, fontStyle: f?.italic ? "italic" : undefined, background: f?.fill || undefined, whiteSpace: f?.wrap ? "normal" : undefined };
      tds.push(
        <Cell key={a} a={a} text={txt} cls={cls} style={style} fb={fb} editing={!!editing && editing.a === a && editing.from === "cell"} editText={editing?.text ?? ""}
          onEditText={stableEditText} onEditKey={stableEditKey} onEditBlur={stableBlur}
          showHandle={a === showHandleFor && !editing} onHandleDown={stableHandle} />,
      );
    }
    rowsEls.push(<tr key={r} style={{ height: f_rowH(r) }}>{tds}</tr>);
  }
  if (windowed && w1 < shownRows.length) rowsEls.push(<tr key="spacer-bottom" aria-hidden="true" style={{ height: (shownRows.length - w1) * ROW_H }}><td colSpan={spillExt.cols + 1} style={{ padding: 0, border: 0 }} /></tr>);
  function f_rowH(_r: number) { return ROW_H; }

  return (
    <div className="sheet glass-flat" aria-label="Spreadsheet">
      <div className="sheet-toolbar" role="toolbar" aria-label="Spreadsheet tools">
        <div className="tb-group">
          <button className="tb-btn" onClick={undo} disabled={!hist.current.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
          <button className="tb-btn" onClick={redo} disabled={!hist.current.future.length} aria-label="Redo" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
        </div>
        <div className="tb-group">
          <button className="tb-btn" onClick={() => doCopy(false)} aria-label="Copy" title="Copy (Ctrl+C)"><Copy size={16} /></button>
          <button className="tb-btn" onClick={() => doCopy(true)} aria-label="Cut" title="Cut (Ctrl+X)"><Scissors size={16} /></button>
          <div className="menu-wrap">
            <button className={`tb-btn ${emph("transpose") ? "emph" : ""}`} onClick={() => setPasteMenu(!pasteMenu)} aria-haspopup="menu" aria-expanded={pasteMenu} title="Paste and Paste Special"><ClipboardPaste size={16} /> Paste ▾</button>
            {pasteMenu && (
              <div className="menu glass" role="menu">
                <button role="menuitem" onClick={() => doPaste("all")}>Paste (Ctrl+V)</button>
                <button role="menuitem" onClick={() => doPaste("values")}>Paste Special → Values</button>
                <button role="menuitem" onClick={() => doPaste("formats")}>Paste Special → Formats</button>
                <button role="menuitem" onClick={() => doPaste("transpose")}>Paste Special → Transpose</button>
              </div>
            )}
          </div>
        </div>
        <div className="tb-group">
          <button className={`tb-btn ${fmt?.bold ? "on" : ""}`} onClick={() => toggleFormat("bold")} aria-label="Bold" aria-pressed={!!fmt?.bold} title="Bold (Ctrl+B)"><Bold size={16} /></button>
          <button className={`tb-btn ${fmt?.italic ? "on" : ""}`} onClick={() => toggleFormat("italic")} aria-label="Italic" aria-pressed={!!fmt?.italic} title="Italic (Ctrl+I)"><Italic size={16} /></button>
          <button className={`tb-btn ${fmt?.wrap ? "on" : ""}`} onClick={() => toggleFormat("wrap")} aria-label="Wrap text" aria-pressed={!!fmt?.wrap} title="Wrap text"><WrapText size={16} /></button>
          <button className="tb-btn" onClick={() => applyFormat({ align: "left" })} aria-label="Align left"><AlignLeft size={16} /></button>
          <button className="tb-btn" onClick={() => applyFormat({ align: "center" })} aria-label="Align centre"><AlignCenter size={16} /></button>
          <button className="tb-btn" onClick={() => applyFormat({ align: "right" })} aria-label="Align right"><AlignRight size={16} /></button>
          <select className="tb-select" aria-label="Number format" value={fmt?.nf ?? "general"} onChange={(e) => applyFormat({ nf: e.target.value as NumberFormat })}>
            {NF_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <span className="swatches" role="group" aria-label="Fill colour">
            {FILLS.map((f) => <button key={f || "none"} className="swatch" style={{ background: f || "transparent" }} onClick={() => applyFormat({ fill: f })} aria-label={f ? `Fill ${f}` : "No fill"} />)}
          </span>
        </div>
        <div className="tb-group">
          <button className="tb-btn" onClick={() => fillDir("down")} title="Fill Down (Ctrl+D)">Fill ↓</button>
          <button className="tb-btn" onClick={() => fillDir("right")} title="Fill Right (Ctrl+R)">Fill →</button>
          <button className={`tb-btn ${emph("autofill") ? "emph" : ""}`} onClick={doAutoFillSelection} title="AutoFill the selected empty cells from the pattern at the start of the selection (keyboard alternative to dragging the fill handle)">AutoFill</button>
          <button className={`tb-btn ${emph("textToColumns") ? "emph" : ""}`} onClick={doTextToColumns} title="Text to Columns (simulation)"><Columns3 size={16} /> Text to Columns</button>
          <button className={`tb-btn ${emph("flashfill") ? "emph" : ""}`} onClick={doFlash} title="Flash Fill (simulation)"><Sparkles size={16} /> Flash Fill</button>
          <button className={`tb-btn ${emph("sort") ? "emph" : ""}`} onClick={() => doSort(false)} aria-label="Sort ascending" title="Sort A to Z"><ArrowDownAZ size={16} /></button>
          <button className={`tb-btn ${emph("sort") ? "emph" : ""}`} onClick={() => doSort(true)} aria-label="Sort descending" title="Sort Z to A"><ArrowDownZA size={16} /></button>
          <button className={`tb-btn ${emph("filter") ? "emph" : ""}`} onClick={() => setFilt(true)} title="Filter"><Filter size={16} /> Filter</button>
          <button className={`tb-btn ${extend ? "on" : ""}`} onClick={() => setExtend(!extend)} aria-pressed={extend} title="Touch: tap cells to extend the selection from the anchor"><Rows3 size={16} /> Extend</button>
        </div>
      </div>

      <div className="formula-row">
        <input ref={nameBoxRef} className="name-box mono" aria-label="Name box" value={nameBox} onChange={(e) => setNameText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { const r = parseRange(nameText ?? ""); if (r) { setAnchor(addr(r.c1, r.r1)); setFocus(addr(r.c2, r.r2)); } else flash("That is not a valid cell or range (try B3 or B3:F62).", "warn"); setNameText(null); gridRef.current?.focus(); } else if (e.key === "Escape") { setNameText(null); gridRef.current?.focus(); } }}
          onBlur={() => setNameText(null)} />
        <span className="fx" aria-hidden="true">fx</span>
        <input className="formula-bar mono" aria-label="Formula bar" value={barText} readOnly={!!anchorSpilled}
          placeholder={anchorSpilled ? `Spilled from ${activeInfo.spilledFrom}` : ""}
          onFocus={() => { if (!editing && !anchorSpilled) startEdit(activeA, rawOf(activeA), "bar"); }}
          onChange={(e) => setEditing((ed) => (ed ? { ...ed, text: e.target.value } : { a: activeA, text: e.target.value, from: "bar" }))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitEdit(editing?.text ?? barText, "down"); } else if (e.key === "Escape") cancelEdit(); }}
          onBlur={() => { if (editing?.from === "bar") commitEdit(editing.text, "none"); }} />
      </div>

      <div className="grid-scroll" ref={gridRef} tabIndex={0} role="grid" aria-label={`Worksheet ${sheet.name}. Use arrow keys to move, type to edit.`} aria-rowcount={spillExt.rows} aria-colcount={spillExt.cols}
        style={{ height }} onScroll={(e) => { const s = Math.floor(e.currentTarget.scrollTop / SCROLL_STEP) * SCROLL_STEP; setScrollTop((p) => (p === s ? p : s)); }} onKeyDown={onKeyDown} onPaste={onPaste} onPointerDown={onGridPointerDown} onPointerOver={onGridPointerOver}>
        <table className="grid">
          <colgroup><col style={{ width: 44 }} />{Array.from({ length: spillExt.cols }, (_, i) => <col key={i} style={{ width: widthOf(i + 1) }} />)}</colgroup>
          <thead>
            <tr>
              <th className="corner" onClick={() => { setAnchor("A1"); setFocus(addr(spillExt.cols, spillExt.rows)); }} aria-label="Select all" />
              {Array.from({ length: spillExt.cols }, (_, i) => (
                <th key={i} scope="col" className={`col-h ${i + 1 >= sel.c1 && i + 1 <= sel.c2 ? "on" : ""}`} onClick={(e) => colHeaderClick(i + 1, e.shiftKey)}>
                  {numToCol(i + 1)}
                  <span className="col-resizer" onPointerDown={(e) => startResize(i + 1, e)} role="separator" aria-label={`Resize column ${numToCol(i + 1)}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rowsEls}</tbody>
        </table>
      </div>

      <div className="sheet-foot">
        <div className="sheet-tabs" role="tablist" aria-label="Worksheets">
          {workbook.sheets.map((s) => (
            <button key={s.name} role="tab" aria-selected={s.name === sheet.name} className={`tab ${s.name === sheet.name ? "on" : ""}`} onClick={() => { onActiveSheet(s.name); setAnchor("A1"); setFocus("A1"); }}>{s.name.trim() === s.name ? s.name : `${s.name}␣`}</button>
          ))}
          {allowSheetOps && (
            <>
              <button className="tab add" onClick={addSheet} aria-label="Add sheet"><Plus size={14} /></button>
              <button className="tab-act" onClick={renameSheet}>Rename</button>
              <button className="tab-act danger" onClick={deleteSheet}>Delete</button>
            </>
          )}
          {hidden.size > 0 && <span className="pill">Filter on · {hidden.size} row(s) hidden</span>}
        </div>
        <div className={`sheet-status ${msg?.kind ?? ""}`} role="status" aria-live="polite">{msg?.text ?? (clip ? `Copied ${rangeToString(clip.range)}` : `Selected ${selStr}${sel.c1 === sel.c2 && sel.r1 === sel.r2 ? "" : ` · ${(sel.c2 - sel.c1 + 1) * (sel.r2 - sel.r1 + 1)} cells`}`)}</div>
      </div>

      {activeInfo && isErr(activeInfo.value) && (
        <div className="err-detail" role="note"><strong>{activeInfo.value.code}</strong> {activeInfo.value.detail ?? ""}</div>
      )}

      {t2c && <TextToColumnsWizard sheet={sheet} sheetName={sheet.name} comp={comp} source={sel} defaultDest={addr(sel.c1, sel.r1)} onApply={applyT2C} onClose={() => setT2c(false)} />}
      {filt && (() => { const { headers } = filterHeaders(); return <FilterDialog headers={headers} onApply={applyFilter} onClear={clearFilt} onClose={() => setFilt(false)} />; })()}
    </div>
  );
}

export { colToNum, parseInput };

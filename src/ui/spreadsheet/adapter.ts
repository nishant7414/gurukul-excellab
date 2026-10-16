import { compute, toRaw } from "../../engine/workbook";
import { isErr, type CellFormat, type NumberFormat, type SheetData, type WorkbookData } from "../../engine/types";
import { addr, inRange, parseAddr, parseRange } from "../../engine/refs";
import { displayValue } from "../../engine/format";

/** Neutral snapshot shape compatible with Univer IWorkbookData. */
export type UniverCell = {
  v?: string | number | boolean;
  f?: string;
  t?: 1 | 2 | 3 | 4;
  s?: {
    bl?: 0 | 1;
    it?: 0 | 1;
    ul?: { s: 0 | 1 };
    ht?: 1 | 2 | 3;
    tb?: 1 | 2 | 3;
    bg?: { rgb: string };
    cl?: { rgb: string };
    n?: { pattern: string };
    ff?: string;
    fs?: number;
  };
};

export type UniverSheet = {
  id: string;
  name: string;
  tabColor: string;
  hidden: 0 | 1;
  freeze: { xSplit: number; ySplit: number; startRow: number; startColumn: number };
  rowCount: number;
  columnCount: number;
  zoomRatio: number;
  scrollTop: number;
  scrollLeft: number;
  defaultColumnWidth: number;
  defaultRowHeight: number;
  mergeData: [];
  cellData: Record<number, Record<number, UniverCell>>;
  rowData: Record<number, { hd?: 0 | 1 }>;
  columnData: Record<number, { w?: number }>;
  rowHeader: { width: number };
  columnHeader: { height: number };
  showGridlines: 1;
  rightToLeft: 0;
};

export type UniverSnapshot = {
  id: string;
  name: string;
  appVersion: string;
  locale: "enUS";
  styles: Record<string, never>;
  sheetOrder: string[];
  sheets: Record<string, UniverSheet>;
  resources?: unknown;
};

const LOCKED_FILL = "#eef0f3";
const ANSWER_FILL = "#fff8d6";
const NF_PATTERN: Record<NumberFormat, string | undefined> = {
  general: undefined,
  number: "#,##0.00",
  currency: '"₹"#,##0.00',
  percent: "0.00%",
  date: "yyyy-mm-dd",
  text: "@",
};

export type EditGuard = { ranges: { sheet: string; c1: number; r1: number; c2: number; r2: number }[]; sheet: string };

export function makeEditGuard(editable?: string[], editableSheet?: string): EditGuard {
  return {
    sheet: (editableSheet ?? "").toLowerCase(),
    ranges: (editable ?? []).map((e) => {
      const r = parseRange(e)!;
      return { ...r, sheet: (r.sheet ?? editableSheet ?? "").toLowerCase() };
    }),
  };
}

export function isEditable(guard: EditGuard, sheet: string, a: string): boolean {
  if (guard.ranges.length === 0) return true;
  return guard.ranges.some((r) => r.sheet === sheet.toLowerCase() && inRange(a, r));
}

function styleOf(fmt: CellFormat | undefined, locked: boolean, answering: boolean): UniverCell["s"] | undefined {
  const fill = fmt?.fill || (answering ? (locked ? LOCKED_FILL : ANSWER_FILL) : undefined);
  const ht = fmt?.align === "left" ? 1 : fmt?.align === "center" ? 2 : fmt?.align === "right" ? 3 : undefined;
  const pattern = fmt?.nf ? NF_PATTERN[fmt.nf] : undefined;
  if (!fmt?.bold && !fmt?.italic && !fmt?.wrap && !fill && ht === undefined && !pattern) return undefined;
  return {
    bl: fmt?.bold ? 1 : 0,
    it: fmt?.italic ? 1 : 0,
    ht,
    tb: fmt?.wrap ? 3 : undefined,
    bg: fill ? { rgb: fill } : undefined,
    n: pattern ? { pattern } : undefined,
  };
}

function patternToNf(pattern?: string): NumberFormat | undefined {
  if (!pattern) return undefined;
  for (const [nf, p] of Object.entries(NF_PATTERN) as [NumberFormat, string | undefined][]) {
    if (p === pattern) return nf;
  }
  return undefined;
}

export function toUniverSnapshot(wb: WorkbookData, guard: EditGuard, id = "gg-workbook"): UniverSnapshot {
  const comp = compute(wb);
  const answering = guard.ranges.length > 0;
  const sheetOrder: string[] = [];
  const sheets: Record<string, UniverSheet> = {};

  wb.sheets.forEach((sh, i) => {
    const sid = `sheet-${i}`;
    sheetOrder.push(sid);
    const cellData: UniverSheet["cellData"] = {};
    let maxR = 40;
    let maxC = 16;
    for (const [a, raw] of Object.entries(sh.cells)) {
      const p = parseAddr(a);
      if (!p) continue;
      maxR = Math.max(maxR, p.row);
      maxC = Math.max(maxC, p.col);
      const row = p.row - 1;
      const col = p.col - 1;
      const locked = answering && !isEditable(guard, sh.name, a);
      const cell: UniverCell = { s: styleOf(sh.formats[a], locked, answering) };
      if (raw.startsWith("=")) {
        cell.f = raw;
        const val = comp.value(sh.name, a);
        if (isErr(val)) {
          cell.v = val.code;
          cell.t = 1;
        } else if (typeof val === "number") {
          cell.v = val;
          cell.t = 2;
        } else if (typeof val === "boolean") {
          cell.v = val;
          cell.t = 3;
        } else if (val !== null) {
          cell.v = val;
          cell.t = 1;
        }
      } else if (raw.startsWith("'")) {
        cell.v = raw.slice(1);
        cell.t = 4;
      } else if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(raw)) {
        cell.v = Number(raw);
        cell.t = 2;
      } else if (raw.toUpperCase() === "TRUE" || raw.toUpperCase() === "FALSE") {
        cell.v = raw.toUpperCase() === "TRUE";
        cell.t = 3;
      } else {
        cell.v = raw;
        cell.t = 1;
      }
      if (!cellData[row]) cellData[row] = {};
      cellData[row][col] = cell;
    }
    for (const [a, fmt] of Object.entries(sh.formats)) {
      const p = parseAddr(a);
      if (!p || sh.cells[a]) continue;
      const row = p.row - 1;
      const col = p.col - 1;
      const locked = answering && !isEditable(guard, sh.name, a);
      const s = styleOf(fmt, locked, answering);
      if (!s) continue;
      if (!cellData[row]) cellData[row] = {};
      cellData[row][col] = { s };
    }
    const columnData: UniverSheet["columnData"] = {};
    for (const [k, w] of Object.entries(sh.colWidths)) columnData[Number(k) - 1] = { w };
    const rowData: UniverSheet["rowData"] = {};
    for (const r of sh.hiddenRows) rowData[r - 1] = { hd: 1 };

    sheets[sid] = {
      id: sid,
      name: sh.name,
      tabColor: "",
      hidden: 0,
      freeze: { xSplit: 0, ySplit: 0, startRow: -1, startColumn: -1 },
      rowCount: Math.min(3000, Math.max(80, maxR + 20)),
      columnCount: Math.min(70, Math.max(18, maxC + 4)),
      zoomRatio: 1,
      scrollTop: 0,
      scrollLeft: 0,
      defaultColumnWidth: 92,
      defaultRowHeight: 24,
      mergeData: [],
      cellData,
      rowData,
      columnData,
      rowHeader: { width: 46 },
      columnHeader: { height: 22 },
      showGridlines: 1,
      rightToLeft: 0,
    };
  });

  return { id, name: "Workbook", appVersion: "1.0.0", locale: "enUS", styles: {}, sheetOrder, sheets, resources: wb.extras };
}

function rawFromUniver(cell: UniverCell): string {
  if (cell.f) return cell.f.startsWith("=") ? cell.f : `=${cell.f}`;
  if (cell.v === undefined || cell.v === null || cell.v === "") return "";
  if (cell.t === 4) return toRaw(String(cell.v));
  if (typeof cell.v === "boolean" || cell.t === 3) return cell.v ? "TRUE" : "FALSE";
  if (typeof cell.v === "number" || cell.t === 2) return String(cell.v);
  return toRaw(String(cell.v));
}

function formatFromUniver(cell: UniverCell): CellFormat | undefined {
  const s = cell.s;
  if (!s) return undefined;
  const fmt: CellFormat = {};
  if (s.bl === 1) fmt.bold = true;
  if (s.it === 1) fmt.italic = true;
  if (s.tb === 3) fmt.wrap = true;
  if (s.ht === 1) fmt.align = "left";
  if (s.ht === 2) fmt.align = "center";
  if (s.ht === 3) fmt.align = "right";
  const fill = s.bg?.rgb;
  if (fill && fill !== LOCKED_FILL && fill !== ANSWER_FILL) fmt.fill = fill;
  const nf = patternToNf(s.n?.pattern);
  if (nf) fmt.nf = nf;
  return Object.keys(fmt).length ? fmt : undefined;
}

export function fromUniverSnapshot(snap: UniverSnapshot, prev?: WorkbookData, guard?: EditGuard): WorkbookData {
  const sheets: SheetData[] = snap.sheetOrder.map((sid) => {
    const sh = snap.sheets[sid];
    const cells: Record<string, string> = {};
    const formats: Record<string, CellFormat> = {};
    const colWidths: Record<number, number> = {};
    const hiddenRows: number[] = [];
    const matrix = sh?.cellData ?? {};
    for (const [rStr, row] of Object.entries(matrix)) {
      const r = Number(rStr);
      for (const [cStr, cell] of Object.entries(row ?? {})) {
        const c = Number(cStr);
        const a = addr(c + 1, r + 1);
        const raw = rawFromUniver(cell);
        if (raw) cells[a] = raw;
        const fmt = formatFromUniver(cell);
        if (fmt) formats[a] = fmt;
      }
    }
    for (const [cStr, col] of Object.entries(sh?.columnData ?? {})) {
      if (col?.w) colWidths[Number(cStr) + 1] = col.w;
    }
    for (const [rStr, row] of Object.entries(sh?.rowData ?? {})) {
      if (row?.hd === 1) hiddenRows.push(Number(rStr) + 1);
    }
    return { name: sh?.name ?? sid, cells, formats, colWidths, hiddenRows };
  });

  const next: WorkbookData = { sheets };
  if (snap.resources !== undefined) next.extras = snap.resources;
  if (!prev || !guard || guard.ranges.length === 0) return next;

  // Locked cells stay as the exercise provided them, even if the UI tried to change them.
  const prevByName = new Map(prev.sheets.map((s) => [s.name.toLowerCase(), s]));
  for (const sh of next.sheets) {
    const old = prevByName.get(sh.name.toLowerCase());
    if (!old) continue;
    for (const a of new Set([...Object.keys(old.cells), ...Object.keys(sh.cells)])) {
      if (isEditable(guard, sh.name, a)) continue;
      if (old.cells[a] === undefined) delete sh.cells[a];
      else sh.cells[a] = old.cells[a];
    }
  }
  return next;
}

export function workbookFingerprint(wb: WorkbookData): string {
  return JSON.stringify(wb.sheets.map((s) => ({ n: s.name, c: s.cells, f: s.formats, w: s.colWidths, h: s.hiddenRows })));
}

export function previewCell(wb: WorkbookData, sheet: string, a: string): string {
  const sh = wb.sheets.find((s) => s.name.toLowerCase() === sheet.toLowerCase());
  if (!sh) return "";
  const raw = sh.cells[a] ?? "";
  if (!raw.startsWith("=")) return raw;
  return displayValue(compute(wb).value(sheet, a), sh.formats[a]?.nf ?? "general");
}

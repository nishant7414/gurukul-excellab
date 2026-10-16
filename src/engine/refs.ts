export function colToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
export function numToCol(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
export interface Addr {
  col: number;
  row: number;
}
export function parseAddr(a: string): Addr | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a.trim());
  if (!m) return null;
  return { col: colToNum(m[1]), row: Number(m[2]) };
}
export const addr = (col: number, row: number) => `${numToCol(col)}${row}`;

export interface RangeRef {
  sheet?: string;
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}
/** Parses "A1", "A1:B3", optionally "Sheet!A1:B3" / "'My Sheet'!A1". */
export function parseRange(s: string): RangeRef | null {
  let sheet: string | undefined;
  let body = s.trim();
  const bang = body.lastIndexOf("!");
  if (bang >= 0) {
    sheet = body.slice(0, bang);
    if (sheet.startsWith("'") && sheet.endsWith("'")) sheet = sheet.slice(1, -1).replace(/''/g, "'");
    body = body.slice(bang + 1);
  }
  const parts = body.split(":");
  const a = parseAddr(parts[0]);
  const b = parts[1] ? parseAddr(parts[1]) : a;
  if (!a || !b) return null;
  return {
    sheet,
    c1: Math.min(a.col, b.col),
    r1: Math.min(a.row, b.row),
    c2: Math.max(a.col, b.col),
    r2: Math.max(a.row, b.row),
  };
}
export function rangeToString(r: RangeRef): string {
  const a = addr(r.c1, r.r1);
  const b = addr(r.c2, r.r2);
  return a === b ? a : `${a}:${b}`;
}
export function* cellsIn(r: RangeRef): Generator<string> {
  for (let row = r.r1; row <= r.r2; row++) for (let col = r.c1; col <= r.c2; col++) yield addr(col, row);
}
export function inRange(a: string, r: RangeRef): boolean {
  const p = parseAddr(a);
  return !!p && p.col >= r.c1 && p.col <= r.c2 && p.row >= r.r1 && p.row <= r.r2;
}
export function quoteSheet(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}

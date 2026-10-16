export type ErrorCode =
  | "#DIV/0!"
  | "#VALUE!"
  | "#REF!"
  | "#NAME?"
  | "#N/A"
  | "#NUM!"
  | "#NULL!"
  | "#SPILL!"
  | "#CIRC!"
  | "#CALC!"
  | "#UNSUPPORTED!";

/** A spreadsheet error value. `detail` is a Gurukul ExcelLab-specific human explanation. */
export class XlError {
  code: ErrorCode;
  detail?: string;
  constructor(code: ErrorCode, detail?: string) {
    this.code = code;
    this.detail = detail;
  }
  toString() {
    return this.code;
  }
}

/** null = blank cell */
export type Scalar = number | string | boolean | null | XlError;
export type Matrix = Scalar[][];
export type Value = Scalar | Matrix;

export const isErr = (v: unknown): v is XlError => v instanceof XlError;
export const isMatrix = (v: unknown): v is Matrix => Array.isArray(v);

export type NumberFormat = "general" | "number" | "currency" | "percent" | "date" | "text";

export interface CellFormat {
  nf?: NumberFormat;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  fill?: string; // css colour from a fixed palette
  wrap?: boolean;
}

export interface SheetData {
  name: string;
  /** raw cell input exactly as typed: "=A1+1", "42", "hello", "'007" */
  cells: Record<string, string>;
  formats: Record<string, CellFormat>;
  colWidths: Record<number, number>;
  hiddenRows: number[];
}

export interface WorkbookData {
  sheets: SheetData[];
}

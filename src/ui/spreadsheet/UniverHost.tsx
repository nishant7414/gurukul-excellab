import { useEffect, useMemo, useRef, useState } from "react";
import { Columns3, Sparkles } from "lucide-react";
import { compute } from "../../engine/workbook";
import { addr, parseAddr } from "../../engine/refs";
import { cloneWb, getSheet } from "../../engine/ops";
import { applyTextToColumns, flashFillAt, type T2CPlan } from "../../engine/ops";
import { isErr } from "../../engine/types";
import type { CellFeedback, ToolId } from "../../learning/types";
import { TextToColumnsWizard } from "../dialogs";
import {
  fromUniverSnapshot,
  isEditable,
  makeEditGuard,
  toUniverSnapshot,
  workbookFingerprint,
  type UniverSnapshot,
} from "./adapter";
import { startUniverSheets } from "./univerApp";
import type { WorkbookData } from "../../engine/types";

type HostProps = {
  workbook: WorkbookData;
  onChange: (wb: WorkbookData) => void;
  activeSheet: string;
  onActiveSheet: (name: string) => void;
  editable?: string[];
  editableSheet?: string;
  feedback?: CellFeedback[];
  allowSheetOps?: boolean;
  emphasise?: ToolId[];
  focusCell?: string;
  height?: number;
};

type Api = ReturnType<typeof startUniverSheets>["univerAPI"];

function isDark(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

export function UniverHost({
  workbook,
  onChange,
  activeSheet,
  onActiveSheet,
  editable,
  editableSheet,
  feedback: _feedback,
  allowSheetOps = false,
  emphasise = [],
  focusCell,
  height = 520,
}: HostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const unitIdRef = useRef("gg-workbook");
  const echoRef = useRef(false);
  const wbRef = useRef(workbook);
  const guard = useMemo(() => makeEditGuard(editable, editableSheet), [editable, editableSheet]);
  const guardRef = useRef(guard);
  const [msg, setMsg] = useState<{ text: string; kind: "info" | "warn" | "ok" } | null>(null);
  const [t2c, setT2c] = useState(false);
  wbRef.current = workbook;
  guardRef.current = guard;

  const flash = (text: string, kind: "info" | "warn" | "ok" = "info") => setMsg({ text, kind });

  const pushWorkbook = (next: WorkbookData) => {
    echoRef.current = true;
    onChange(next);
  };

  const reload = (api: Api, wb: WorkbookData, sheetName: string) => {
    const id = unitIdRef.current;
    try { api.disposeUnit(id); } catch { /* first load */ }
    const snap = toUniverSnapshot(wb, guardRef.current, id);
    const fwb = api.createWorkbook(snap as never);
    try { fwb.setActiveSheet(sheetName); } catch { /* sheet name may have changed */ }
    if (focusCell) {
      const p = parseAddr(focusCell);
      if (p) {
        try { fwb.getActiveSheet().getRange(p.row - 1, p.col - 1).activate(); } catch { /* ignore */ }
      }
    }
  };

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const { univer, univerAPI } = startUniverSheets(el, { allowSheetOps, dark: isDark() });
    apiRef.current = univerAPI;
    reload(univerAPI, wbRef.current, activeSheet);

    const editGuard = univerAPI.addEvent(univerAPI.Event.BeforeSheetEditStart, (params) => {
      const a = addr(params.column + 1, params.row + 1);
      const sheet = params.worksheet.getSheetName();
      if (!isEditable(guardRef.current, sheet, a)) {
        params.cancel = true;
        flash("This cell is part of the provided data and is protected. Edit only the highlighted answer cells.", "warn");
      }
    });

    const valueSub = univerAPI.addEvent(univerAPI.Event.SheetValueChanged, () => {
      if (echoRef.current) { echoRef.current = false; return; }
      const fwb = univerAPI.getActiveWorkbook();
      if (!fwb) return;
      const snap = fwb.save() as unknown as UniverSnapshot;
      const next = fromUniverSnapshot(snap, wbRef.current, guardRef.current);
      if (workbookFingerprint(next) === workbookFingerprint(wbRef.current)) return;
      pushWorkbook(next);
    });

    const sheetSub = univerAPI.addEvent(univerAPI.Event.ActiveSheetChanged, (params) => {
      const name = params.activeSheet?.getSheetName();
      if (name) onActiveSheet(name);
    });

    return () => {
      editGuard.dispose();
      valueSub.dispose();
      sheetSub.dispose();
      univer.dispose();
      apiRef.current = null;
    };
    // mount once; later workbook/sheet updates are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || echoRef.current) { echoRef.current = false; return; }
    reload(api, workbook, activeSheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workbookFingerprint(workbook)]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    try { api.getActiveWorkbook()?.setActiveSheet(activeSheet); } catch { /* ignore */ }
  }, [activeSheet]);

  const selection = () => {
    const range = apiRef.current?.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange();
    if (!range) return null;
    return {
      c1: range.getColumn() + 1,
      r1: range.getRow() + 1,
      c2: range.getLastColumn() + 1,
      r2: range.getLastRow() + 1,
    };
  };

  const applyT2C = (plan: T2CPlan) => {
    setT2c(false);
    const wb = cloneWb(workbook);
    const sh = getSheet(wb, activeSheet);
    if (!sh) return;
    applyTextToColumns(sh, plan);
    pushWorkbook(wb);
    flash(`Text split into ${plan.width} column(s).`, "ok");
  };

  const doFlash = () => {
    const sel = selection();
    if (!sel) { flash("Select the first output cell, then press Flash Fill.", "warn"); return; }
    const res = flashFillAt(getSheet(workbook, activeSheet)!, compute(workbook), activeSheet, sel.c1, sel.r1);
    if ("error" in res) { flash(res.error, "warn"); return; }
    const wb = cloneWb(workbook);
    const sh = getSheet(wb, activeSheet)!;
    let n = 0;
    for (const [a, raw] of Object.entries(res.filled)) {
      if (!isEditable(guard, activeSheet, a)) continue;
      sh.cells[a] = raw;
      n++;
    }
    pushWorkbook(wb);
    flash(`Flash Fill filled ${n} cell(s). ${res.pattern}. These are typed values, not formulas.`, "ok");
  };

  const sheet = getSheet(workbook, activeSheet) ?? workbook.sheets[0];
  const comp = useMemo(() => compute(workbook), [workbook]);
  const sel = selection() ?? { c1: 1, r1: 1, c2: 1, r2: 1 };
  const err = focusCell ? comp.cell(activeSheet, focusCell).value : comp.cell(activeSheet, addr(sel.c1, sel.r1)).value;

  return (
    <div className="xl-workspace sheet glass-flat" aria-label="Spreadsheet">
      <div className="xl-learn-bar" role="toolbar" aria-label="Learning tools">
        <button className={`tb-btn ${emphasise.includes("textToColumns") ? "emph" : ""}`} onClick={() => setT2c(true)} title="Text to Columns (simulation)">
          <Columns3 size={16} /> Text to Columns
        </button>
        <button className={`tb-btn ${emphasise.includes("flashfill") ? "emph" : ""}`} onClick={doFlash} title="Flash Fill (simulation)">
          <Sparkles size={16} /> Flash Fill
        </button>
        <span className={`sheet-status ${msg?.kind ?? ""}`} role="status" aria-live="polite">
          {msg?.text ?? (guard.ranges.length ? "Yellow cells are yours to edit. Grey cells are provided data." : "Use the ribbon, formula bar, and sheet tabs like a desktop spreadsheet.")}
        </span>
      </div>
      <div ref={hostRef} className="univer-host" style={{ height }} />
      {isErr(err) && <div className="err-detail" role="note"><strong>{err.code}</strong> {err.detail ?? ""}</div>}
      {t2c && (
        <TextToColumnsWizard
          sheet={sheet}
          sheetName={sheet.name}
          comp={comp}
          source={sel}
          defaultDest={addr(sel.c1, sel.r1)}
          onApply={applyT2C}
          onClose={() => setT2c(false)}
        />
      )}
    </div>
  );
}

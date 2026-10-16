import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Spreadsheet } from "../ui/Spreadsheet";
import { emptyWorkbook, evaluateFormula } from "../engine/workbook";
import { displayValue } from "../engine/format";
import { functionsUsed } from "../engine/parser";
import { FUNCS, UNSUPPORTED } from "../engine/core";
import { isErr, isMatrix, type WorkbookData } from "../engine/types";
import { importWorkbook, IMPORT_LIMITS, type ImportReport } from "../engine/import";
import { downloadWorkbook, exportWorkbook, type ExportReport } from "../engine/export";
import { actions } from "../state/store";
import { grid } from "../data/source";

function sample(): WorkbookData {
  const wb = emptyWorkbook(["Orders", "Scratch"]);
  Object.assign(wb.sheets[0].cells, grid("A1", [
    ["Order", "Region", "Rep", "Units", "Price", "Status"],
    [1, "North", "Asha", 40, 12.5, "Delivered"], [2, "South", "Ben", 25, 20, "Pending"], [3, "North", "Chen", 60, 8, "Delivered"],
    [4, "East", "Asha", 15, 30, "Delivered"], [5, "West", "Ben", 50, 15, "Cancelled"], [6, "South", "Chen", 35, 12.5, "Delivered"],
  ]), grid("H1", [["Try a formula below, or type one into any cell."]]));
  wb.sheets[0].colWidths = { 1: 60, 2: 70, 3: 60, 4: 60, 5: 60, 6: 90 };
  return wb;
}

export default function Playground() {
  const [wb, setWb] = useState<WorkbookData>(sample);
  const [sheet, setSheet] = useState("Orders");
  const [f, setF] = useState('=SUMIFS(D2:D7,B2:B7,"North")');
  const [out, setOut] = useState<{ text: string; err?: string; fns: string[]; unsupported: string[] } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, setPending] = useState<WorkbookData | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<ExportReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const evaluate = () => {
    const formula = f.trim().startsWith("=") ? f.trim() : "=" + f.trim();
    const fns = functionsUsed(formula);
    const unsupported = fns.filter((n) => !FUNCS.has(n));
    const v = evaluateFormula(wb, sheet, formula);
    if (isErr(v)) setOut({ text: v.code, err: v.detail ?? "", fns, unsupported });
    else if (isMatrix(v)) setOut({ text: v.map((r) => r.map((x) => (isErr(x) ? x.code : displayValue(x))).join("\t")).join("\n"), fns, unsupported });
    else setOut({ text: displayValue(v), fns, unsupported });
  };

  const onFile = async (file: File | undefined) => {
    setImportErr(null); setReport(null); setPending(null);
    if (!file) return;
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const data = isCsv ? await file.text() : await file.arrayBuffer();
    const res = importWorkbook(data, file.name, file.size);
    if (!res.ok) { setImportErr(res.error); return; }
    setReport(res.report); setPending(res.workbook);
    actions.addImport({ fileName: file.name, sheets: res.report.sheets.length, status: "reviewed" });
  };
  const open = () => {
    if (!pending) return;
    setWb(pending); setSheet(pending.sheets[0].name); setOut(null); setPending(null);
  };
  const fnList = useMemo(() => [...FUNCS.keys()].length, []);

  return (
    <div className="page stack">
      <header>
        <h1>Formula Playground</h1>
        <p className="muted">A free spreadsheet to experiment in. Nothing here is graded and the sheet is <strong>not saved</strong> when you leave the page. The engine evaluates {fnList} functions; anything else returns a clear error.</p>
      </header>

      <section className="glass card" aria-labelledby="eval-h">
        <h2 id="eval-h">Quick evaluate</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); evaluate(); }}>
          <label className="row small">Run on sheet <select value={sheet} onChange={(e) => setSheet(e.target.value)}>{wb.sheets.map((s) => <option key={s.name}>{s.name}</option>)}</select></label>
          <input className="mono" style={{ flex: 1, minWidth: 220 }} aria-label="Formula" value={f} onChange={(e) => setF(e.target.value)} spellCheck={false} />
          <button className="btn primary" type="submit">Evaluate</button>
        </form>
        {out && (
          <div role="status" style={{ marginTop: 10 }}>
            <pre className="mono glass-flat" style={{ padding: 10, whiteSpace: "pre-wrap" }}>{out.text}</pre>
            {out.err !== undefined && <div className="callout bad">{out.err || "The formula returned an error."}{out.unsupported.length > 0 && <> {out.unsupported.map((u) => `${u}: ${UNSUPPORTED[u] ?? "not a function Gurukul ExcelLab knows."}`).join(" ")}</>}</div>}
            {out.fns.length > 0 && <p className="small faint">Functions used: {out.fns.join(", ")}</p>}
          </div>
        )}
      </section>

      <section aria-label="Spreadsheet">
        <Spreadsheet workbook={wb} onChange={setWb} activeSheet={sheet} onActiveSheet={setSheet} allowSheetOps height={420} />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => { if (window.confirm("Replace the sheet with the sample data? Your changes in the playground will be lost.")) { setWb(sample()); setSheet("Orders"); setOut(null); setExportNote(null); } }}>Reset to sample data</button>
          <button className="btn" onClick={() => { const { report } = exportWorkbook(wb, "xlsx"); downloadWorkbook(wb, "xlsx"); setExportNote(report); }}><Download size={15} /> Download .xlsx</button>
          <button className="btn" onClick={() => { const { report } = exportWorkbook(wb, "csv"); downloadWorkbook(wb, "csv"); setExportNote(report); }}><Download size={15} /> Download CSV</button>
        </div>
        {exportNote && (
          <div className="callout warn small" role="status" style={{ marginTop: 8 }}>
            Downloaded {exportNote.kind.toUpperCase()} with {exportNote.sheets} sheet(s) and {exportNote.formulas} formula(s). {exportNote.warnings[0]}
            {exportNote.functionsUnsupported.length > 0 && <> Unsupported functions in this file: {exportNote.functionsUnsupported.map((u) => u.name).join(", ")}.</>}
          </div>
        )}
      </section>

      <section className="glass card" aria-labelledby="imp-h">
        <h2 id="imp-h"><Upload size={18} aria-hidden="true" /> Import your own workbook</h2>
        <p className="muted small">Choose a <strong>.xlsx</strong> or <strong>.csv</strong> file (max {IMPORT_LIMITS.bytes / 1048576} MB, {IMPORT_LIMITS.cells.toLocaleString()} cells). It is read inside your browser and is never uploaded. Macros are never loaded: macro-enabled files are refused. You get a review first, then choose whether to open it here.</p>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" aria-label="Choose a workbook to import" onChange={(e) => { void onFile(e.target.files?.[0]); }} />
        {importErr && <div className="callout bad" role="alert" style={{ marginTop: 10 }}>{importErr}</div>}
        {report && (
          <div style={{ marginTop: 10 }} role="status">
            <h3>Review: {report.fileName}</h3>
            <div className="table-wrap"><table className="data"><thead><tr><th>Sheet</th><th>Rows × columns</th><th>Filled cells</th><th>Formulas</th></tr></thead>
              <tbody>{report.sheets.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.rows} × {s.cols}</td><td>{s.cells}</td><td>{s.formulas}</td></tr>)}</tbody></table></div>
            <ul>
              <li>Functions Gurukul ExcelLab can evaluate: {report.functionsSupported.length ? report.functionsSupported.join(", ") : "none used"}.</li>
              {report.functionsUnsupported.length > 0 && <li><strong>Not evaluated:</strong> {report.functionsUnsupported.map((u) => `${u.name} (${u.reason})`).join("; ")}</li>}
              {report.textDateCount > 0 && <li>{report.textDateCount} cell(s) look like dates stored as text, for example {report.textDates.slice(0, 3).map((d) => `${d.sheet}!${d.addr} "${d.value}"`).join(", ")}. Text dates do not calculate.</li>}
              {report.cellsWithEdgeSpaces > 0 && <li>{report.cellsWithEdgeSpaces} text cell(s) have leading or trailing spaces. TRIM can clean them.</li>}
              {report.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
            <button className="btn primary" onClick={open}>Open in the playground</button>
          </div>
        )}
      </section>
    </div>
  );
}

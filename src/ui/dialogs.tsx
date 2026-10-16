import { useMemo, useState } from "react";
import { type FilterOp, type T2COptions, type T2CPlan, planTextToColumns, splitText } from "../engine/ops";
import type { Computed } from "../engine/workbook";
import type { SheetData } from "../engine/types";
import { addr, type RangeRef } from "../engine/refs";
import { displayValue } from "../engine/format";
import { X } from "lucide-react";

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

const DELIMS: { id: string; label: string; char: string }[] = [
  { id: "tab", label: "Tab", char: "\t" },
  { id: "semi", label: "Semicolon", char: ";" },
  { id: "comma", label: "Comma", char: "," },
  { id: "space", label: "Space", char: " " },
];

export function TextToColumnsWizard({ sheet, sheetName, comp, source, defaultDest, onApply, onClose }: {
  sheet: SheetData; sheetName: string; comp: Computed; source: RangeRef; defaultDest: string; onApply: (plan: T2CPlan) => void; onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [checked, setChecked] = useState<Record<string, boolean>>({ comma: true });
  const [other, setOther] = useState("");
  const [consec, setConsec] = useState(false);
  const [qual, setQual] = useState<'"' | "'" | "">('"');
  const [dest, setDest] = useState(defaultDest);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const opts: T2COptions = useMemo(() => ({ delimiters: [...DELIMS.filter((d) => checked[d.id]).map((d) => d.char), ...(other ? [other] : [])], treatConsecutiveAsOne: consec, qualifier: qual }), [checked, other, consec, qual]);
  const srcLabel = `${addr(source.c1, source.r1)}:${addr(source.c2, source.r2)}`;
  const plan = useMemo(() => {
    try {
      return { ok: planTextToColumns(sheet, comp, sheetName, source, dest.trim().toUpperCase(), opts), error: undefined as string | undefined };
    } catch (e) {
      return { ok: undefined as T2CPlan | undefined, error: e instanceof Error ? e.message : "Invalid" };
    }
  }, [sheet, comp, sheetName, source, dest, opts]);
  const previewRows = useMemo(() => {
    const rows: string[][] = [];
    for (let r = source.r1; r <= Math.min(source.r2, source.r1 + 5); r++) {
      const v = comp.value(sheetName, addr(source.c1, r));
      rows.push(v === null ? [] : splitText(displayValue(v), opts));
    }
    return rows;
  }, [comp, sheetName, source, opts]);
  const width = Math.max(1, ...previewRows.map((r) => r.length));
  const noDelims = opts.delimiters.length === 0;

  return (
    <Modal title={`Convert Text to Columns Wizard – step ${step} of 3 (simulation)`} onClose={onClose}
      footer={
        <>
          <button className="btn" disabled={step === 1} onClick={() => setStep(step - 1)}>← Back</button>
          {step < 3 ? <button className="btn primary" onClick={() => setStep(step + 1)}>Next →</button> : (
            <button className="btn primary" disabled={!plan.ok} onClick={() => { if (plan.ok) { if (plan.ok.conflicts.length && !confirmOverwrite) { setConfirmOverwrite(true); return; } onApply(plan.ok); } }}>
              {confirmOverwrite ? "Replace and finish" : "Finish"}
            </button>
          )}
        </>
      }>
      <p className="muted small">This wizard imitates the Text to Columns tool in Excel's Data tab. The result is checked, not the clicks. Source: <code>{srcLabel}</code></p>
      {step === 1 && (
        <section>
          <h4>Step 1 – Original data type</h4>
          <p>Your text uses a <strong>delimiter</strong> (a separator character) between values. Gurukul ExcelLab simulates the <em>Delimited</em> option. Fixed width is not simulated.</p>
          <label className="check"><input type="radio" checked readOnly /> Delimited – characters such as commas or tabs separate each field</label>
          <label className="check muted"><input type="radio" disabled /> Fixed width (not simulated)</label>
        </section>
      )}
      {step === 2 && (
        <section>
          <h4>Step 2 – Choose the delimiter</h4>
          <div className="check-row">
            {DELIMS.map((d) => (
              <label className="check" key={d.id}><input type="checkbox" checked={!!checked[d.id]} onChange={(e) => setChecked({ ...checked, [d.id]: e.target.checked })} /> {d.label}</label>
            ))}
            <label className="check">Other: <input aria-label="Other delimiter" className="input tiny" value={other} onChange={(e) => setOther(e.target.value)} maxLength={4} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={consec} onChange={(e) => setConsec(e.target.checked)} /> Treat consecutive delimiters as one</label>
          <label className="check">Text qualifier:{" "}
            <select aria-label="Text qualifier" className="input" value={qual} onChange={(e) => setQual(e.target.value as typeof qual)}>
              <option value='"'>"</option><option value="'">'</option><option value="">{"{none}"}</option>
            </select>
          </label>
          <h4>Data preview</h4>
          {noDelims ? <p className="warn">Choose at least one delimiter to see the split.</p> : (
            <div className="preview"><table><tbody>{previewRows.map((r, i) => (
              <tr key={i}>{Array.from({ length: width }, (_, c) => <td key={c}><span className="ws">{r[c] !== undefined ? r[c].replace(/ /g, "·") : ""}</span></td>)}</tr>
            ))}</tbody></table></div>
          )}
          <p className="muted small">A <span className="ws">·</span> marks a space so you can see leading spaces that stay inside a value.</p>
        </section>
      )}
      {step === 3 && (
        <section>
          <h4>Step 3 – Destination</h4>
          <label className="field">Destination cell (where the first output column goes)
            <input className="input mono" value={dest} onChange={(e) => { setDest(e.target.value); setConfirmOverwrite(false); }} aria-label="Destination cell" />
          </label>
          {!plan.ok ? <p className="warn" role="alert">{plan.error}</p> : (
            <>
              <p>Output will fill <code>{addr(plan.ok.destination.c1, plan.ok.destination.r1)}:{addr(plan.ok.destination.c2, plan.ok.destination.r2)}</code> ({plan.ok.width} column{plan.ok.width === 1 ? "" : "s"}).</p>
              {plan.ok.conflicts.length > 0 && <p className="warn" role="alert">There is already data in {plan.ok.conflicts.slice(0, 5).join(", ")}{plan.ok.conflicts.length > 5 ? "…" : ""}. Finishing will replace it.</p>}
            </>
          )}
        </section>
      )}
    </Modal>
  );
}

export function FilterDialog({ headers, onApply, onClear, onClose }: { headers: { col: number; label: string }[]; onApply: (col: number, op: FilterOp, value: string) => void; onClear: () => void; onClose: () => void }) {
  const [col, setCol] = useState(headers[0]?.col ?? 1);
  const [op, setOp] = useState<FilterOp>("=");
  const [val, setVal] = useState("");
  return (
    <Modal title="Filter rows" onClose={onClose} footer={<>
      <button className="btn" onClick={onClear}>Clear filter</button>
      <button className="btn primary" onClick={() => onApply(col, op, val)}>Apply filter</button>
    </>}>
      <p className="muted small">Hides the rows that do not meet the condition (the header row stays visible). Rows are hidden, not deleted.</p>
      <label className="field">Column
        <select className="input" value={col} onChange={(e) => setCol(Number(e.target.value))}>{headers.map((h) => <option key={h.col} value={h.col}>{h.label}</option>)}</select>
      </label>
      <label className="field">Condition
        <select className="input" value={op} onChange={(e) => setOp(e.target.value as FilterOp)}>
          <option value="=">equals</option><option value="<>">does not equal</option><option value=">">is greater than</option><option value="<">is less than</option>
          <option value=">=">is at least</option><option value="<=">is at most</option><option value="contains">contains</option><option value="begins">begins with</option><option value="ends">ends with</option>
        </select>
      </label>
      <label className="field">Value<input className="input" value={val} onChange={(e) => setVal(e.target.value)} /></label>
    </Modal>
  );
}

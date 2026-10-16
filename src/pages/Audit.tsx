import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EVIDENCE_LABEL, INCONSISTENCIES, SHEET_AUDITS, type Evidence } from "../data/audit";
import { SOURCE } from "../data/source";
import { conceptCoverage } from "../content/coverage";
import { ALL_EXERCISES } from "../content/registry";
import { applySolution, checkExercise } from "../learning/checker";
import { ownerOf } from "../content/routes";

const EV_CLASS: Record<Evidence, string> = { "worked-formula": "ok", instruction: "ok", dataset: "ok", "heading-only": "warn", implicit: "gen" };
const SEV_CLASS = { inconsistency: "bad", gap: "warn", observation: "" } as const;

interface SelfRow { id: string; passed: boolean; detail: string }

export default function Audit() {
  const cov = useMemo(conceptCoverage, []);
  const checks = useMemo(() => INCONSISTENCIES.filter((i) => i.id !== "INC-FILE-1").map((i) => { let ok = false; try { ok = i.verify(); } catch { ok = false; } return { i, ok }; }), []);
  const [sheet, setSheet] = useState("all");
  const [rows, setRows] = useState<SelfRow[] | null>(null);
  const [running, setRunning] = useState(false);

  const sheets = SOURCE.sheetNames;
  const shown = cov.filter((c) => sheet === "all" || c.concept.sheet === sheet);
  const covered = cov.filter((c) => c.covered).length;
  const byEvidence = (Object.keys(EVIDENCE_LABEL) as Evidence[]).map((e) => ({ e, n: cov.filter((c) => c.concept.evidence === e).length }));
  const verified = checks.filter((c) => c.ok).length;

  const runSelfCheck = () => {
    setRunning(true); setRows(null);
    const list = ALL_EXERCISES.filter((e) => !e.questions);
    const out: SelfRow[] = [];
    let i = 0;
    const step = () => {
      const end = Math.min(list.length, i + 12);
      for (; i < end; i++) {
        const e = list[i];
        const r = checkExercise(e, applySolution(e));
        const untouched = checkExercise(e, e.workbook()).passed;
        out.push({ id: e.id, passed: r.passed && !untouched, detail: r.passed ? (untouched ? "starting workbook already passes" : "") : r.feedback.filter((f) => f.status !== "correct").slice(0, 2).map((f) => `${f.addr}: ${f.message}`).join(" | ") });
      }
      if (i < list.length) setTimeout(step, 0);
      else { setRows(out); setRunning(false); }
    };
    setTimeout(step, 0);
  };

  return (
    <div className="page stack">
      <header>
        <h1>Workbook Coverage Audit</h1>
        <p className="muted">What the instructor's workbook contains, what Gurukul ExcelLab teaches from it, and where the workbook is inconsistent or silent.</p>
      </header>

      <div className="grid-cards" role="list" aria-label="Coverage summary">
        <div className="glass stat" role="listitem"><div className="n">{covered}<span className="muted" style={{ fontSize: "1rem" }}> / {cov.length}</span></div><div className="muted small">source concepts with a lesson and practice{covered < cov.length ? " (not all are covered yet)" : ""}</div></div>
        <div className="glass stat" role="listitem"><div className="n">{verified}<span className="muted" style={{ fontSize: "1rem" }}> / {checks.length}</span></div><div className="muted small">inconsistency findings re-verified against the extracted data just now</div></div>
        {byEvidence.map((b) => <div key={b.e} className="glass stat" role="listitem"><div className="n">{b.n}</div><div className="muted small">{EVIDENCE_LABEL[b.e]}</div></div>)}
      </div>

      <section className="glass card" aria-labelledby="sheets-h">
        <h2 id="sheets-h">Sheet-by-sheet</h2>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Sheet</th><th>Content</th><th>Datasets</th><th>Uncertainty and gaps</th><th>Not reproduced exactly</th><th>Review status</th></tr></thead>
          <tbody>{SHEET_AUDITS.map((s) => (
            <tr key={s.name}>
              <td><code>{JSON.stringify(s.name)}</code></td>
              <td>{s.hasContent ? "Yes" : "No identifiable learning content"}</td>
              <td>{s.datasets.length ? <ul>{s.datasets.map((d) => <li key={d}>{d}</li>)}</ul> : "—"}</td>
              <td>{s.uncertainty.length ? <ul>{s.uncertainty.map((d) => <li key={d}>{d}</li>)}</ul> : "—"}</td>
              <td>{s.unsupported.length ? <ul>{s.unsupported.map((d) => <li key={d}>{d}</li>)}</ul> : "—"}</td>
              <td><span className={`pill ${s.reviewStatus === "Analyzed" ? "ok" : "warn"}`}>{s.reviewStatus}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>

      <section className="glass card" aria-labelledby="inc-h">
        <h2 id="inc-h">Inconsistencies, gaps and observations</h2>
        <ul className="plain">
          {checks.map(({ i, ok }) => (
            <li key={i.id} className="glass-flat card" style={{ marginBottom: 8 }}>
              <div className="row"><span className={`pill ${SEV_CLASS[i.severity]}`}>{i.severity}</span><code>{i.id}</code><span className="muted small">{i.sheet === "(file)" ? "file" : `sheet ${JSON.stringify(i.sheet)}`} · {i.cells}</span>
                <span className={`pill ${ok ? "ok" : "bad"}`}>{ok ? "re-verified against extracted data" : "NOT reproducible from the extracted data"}</span></div>
              <p style={{ margin: "6px 0 0" }}>{i.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass card" aria-labelledby="con-h">
        <div className="row between"><h2 id="con-h">Concept coverage</h2>
          <label className="row small">Sheet <select value={sheet} onChange={(e) => setSheet(e.target.value)} aria-label="Filter concepts by sheet"><option value="all">All sheets</option>{sheets.map((s) => <option key={s} value={s}>{JSON.stringify(s)}</option>)}</select></label></div>
        <p className="small muted">Evidence tells you how directly the workbook supports a concept: a worked formula, an instruction, example data, a heading with nothing else, or something only implied. Headings and implied concepts are taught from generated practice, and are labelled that way.</p>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>ID</th><th>Concept</th><th>Sheet</th><th>Evidence</th><th>Where</th><th>Lesson</th><th>Exercises</th></tr></thead>
          <tbody>{shown.map(({ concept: c, lesson, exercises, covered: ok }) => (
            <tr key={c.id}>
              <td><code>{c.id}</code></td>
              <td>{c.name}{c.note && <div className="small muted">{c.note}</div>}</td>
              <td><code>{JSON.stringify(c.sheet)}</code></td>
              <td><span className={`pill ${EV_CLASS[c.evidence]}`} title={EVIDENCE_LABEL[c.evidence]}>{c.evidence}</span></td>
              <td className="small">{c.cells}</td>
              <td>{lesson ? <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link> : <span className="pill warn">planned</span>}</td>
              <td>{ok ? exercises.map((e) => <Link key={e.id} to={ownerOf(e).to} className="pill" style={{ marginRight: 4 }}>{e.id.replace("EX-", "")}</Link>) : <span className="pill warn">none</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>

      <section className="glass card" aria-labelledby="self-h">
        <h2 id="self-h">Exercise self-check</h2>
        <p className="muted small">Runs every spreadsheet exercise's reference solution through the real answer checker, and confirms the untouched starting sheet does not already pass. This verifies that each exercise can be completed and is not trivially passed. It does not test the on-screen editing.</p>
        <button className="btn" onClick={runSelfCheck} disabled={running}>{running ? "Running…" : rows ? "Run again" : "Run self-check"}</button>
        {rows && (
          <div role="status" style={{ marginTop: 10 }}>
            <p><strong>{rows.filter((r) => r.passed).length} of {rows.length}</strong> spreadsheet exercises are completable and non-trivial. Concept-question exercises are checked separately by the test suite.</p>
            {rows.filter((r) => !r.passed).map((r) => <div key={r.id} className="callout bad"><code>{r.id}</code> {r.detail}</div>)}
          </div>
        )}
      </section>
    </div>
  );
}

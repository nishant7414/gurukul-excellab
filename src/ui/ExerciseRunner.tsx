import { useEffect, useMemo, useRef, useState } from "react";
import type { CellFeedback, CheckResult, Exercise, MistakeTag } from "../learning/types";
import { TAG_LABEL } from "../learning/types";
import { applySolution, checkExercise } from "../learning/checker";
import { actions, useStore } from "../state/store";
import { Spreadsheet } from "./Spreadsheet";
import type { WorkbookData } from "../engine/types";
import { applyDelta, cellCount, DELTA_FROM_CELLS, diffWorkbook, type WorkbookDelta } from "../state/delta";
import { Lightbulb, RotateCcw, Eye, CheckCircle2, Download } from "lucide-react";
import { downloadWorkbook } from "../engine/export";
import { GoogleSheetsEmbed } from "./GoogleSheetsEmbed";
import { resolveGoogleSheet } from "../sheets/catalog";

const KIND_LABEL = { guided: "Guided practice", independent: "Independent practice", mastery: "Mastery challenge" } as const;

function mcqResult(ex: Exercise, answers: Record<string, number>): CheckResult {
  const qs = ex.questions ?? [];
  const feedback: CellFeedback[] = [];
  const tags = new Set<MistakeTag>();
  let correct = 0;
  for (const q of qs) {
    const a = answers[q.id];
    const ok = a === q.correct;
    if (ok) correct++;
    else tags.add(q.tag ?? "knowledge");
    feedback.push({ sheet: "", addr: q.id, status: ok ? "correct" : "wrong", checkLabel: q.prompt, message: ok ? "Correct." : a === undefined ? "Not answered." : `You chose "${q.options[a]}". ${q.explanation}`, expected: q.options[q.correct], actual: a === undefined ? undefined : q.options[a], tag: ok ? undefined : (q.tag ?? "knowledge") });
  }
  return { passed: correct === qs.length && qs.length > 0, correct, total: qs.length, feedback, tags: [...tags], summary: `${correct} of ${qs.length} questions correct.` };
}

export function ExerciseRunner({ exercise: ex, topic, onNext }: { exercise: Exercise; topic: string; onNext?: () => void }) {
  const progress = useStore((s) => s.exercises[ex.id]);
  // the starting workbook is built once; big tables are saved as a delta against it instead of a full copy
  const base = useMemo(() => (ex.questions ? null : ex.workbook()), [ex]);
  const bigSheet = !!base && cellCount(base) > DELTA_FROM_CELLS;
  const deltaOf = (w: WorkbookData): WorkbookDelta | undefined => (bigSheet && base ? diffWorkbook(base, w) : undefined);
  const [wb, setWb] = useState<WorkbookData>(() => (progress?.delta && base ? applyDelta(base, progress.delta) : progress?.workbook ?? base ?? ex.workbook()));
  const [sheet, setSheet] = useState(ex.activeSheet);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [hints, setHints] = useState(progress?.hintsUsed ?? 0);
  const [showSol, setShowSol] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>(progress?.answers ?? {});
  const [lastPass, setLastPass] = useState(false);
  const loaded = useRef(false);

  useEffect(() => { loaded.current = true; }, []);
  // persist the workbook as the learner works (demo mode: localStorage)
  useEffect(() => {
    if (!ex.questions && loaded.current) { const t = window.setTimeout(() => actions.saveWorkbook(ex.id, wb, deltaOf(wb)), 250); return () => window.clearTimeout(t); }
  }, [wb, ex]);

  const isQuiz = !!ex.questions;
  const passed = progress?.passed ?? false;
  const feedback = result?.feedback ?? [];
  const sheetOverrides = useStore((s) => s.settings.googleSheets);
  const google = useMemo(() => (isQuiz ? null : resolveGoogleSheet(ex.id, sheetOverrides)), [ex.id, isQuiz, sheetOverrides]);
  const [practiceOpen, setPracticeOpen] = useState(() => import.meta.env.MODE === "test" || Boolean(import.meta.env.VITEST));

  const check = () => {
    const res = isQuiz ? mcqResult(ex, answers) : checkExercise(ex, wb);
    setResult(res);
    setLastPass(res.passed);
    actions.submit(ex, res, isQuiz ? null : wb, topic, isQuiz ? answers : undefined, isQuiz ? undefined : deltaOf(wb));
  };
  const reset = () => {
    if (!window.confirm("Reset this exercise to its starting data? Your saved answer will be discarded. Your attempt history is kept.")) return;
    actions.resetExercise(ex.id); setWb(base ?? ex.workbook()); setSheet(ex.activeSheet); setResult(null); setAnswers({}); setShowSol(false);
  };
  const revealSolution = () => {
    if (!showSol && !window.confirm("Viewing the solution means this exercise will be marked as assisted and cannot count toward mastery. Show it anyway?")) return;
    if (!showSol) actions.viewSolution(ex.id);
    setShowSol(!showSol);
  };
  const solutionCells = useMemo(() => Object.entries(ex.solution.cells), [ex]);

  return (
    <div className="runner">
      <aside className="stack">
        <div className="glass card">
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="pill">{KIND_LABEL[ex.kind]}</span>
            <span className={`pill ${ex.origin === "source" ? "src" : "gen"}`} title={ex.datasetNote}>{ex.origin === "source" ? "Source workbook data" : "Generated practice"}</span>
            {ex.simulationNote && <span className="pill sim">Simulation</span>}
            {passed && <span className={`pill ${progress?.assisted ? "warn" : "ok"}`}><CheckCircle2 size={12} /> {progress?.assisted ? "Passed with solution" : "Passed"}</span>}
          </div>
          <h3>{ex.title}</h3>
          <p className="muted">{ex.objective}</p>
          {ex.scenario && <p><em>{ex.scenario}</em></p>}
          <ol className="steps">{ex.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {ex.outputSpec && <p className="small"><strong>Expected output:</strong> {ex.outputSpec}</p>}
          {ex.criteria && ex.criteria.length > 0 && (
            <details className="small"><summary>How this is checked</summary><ul style={{ paddingLeft: 18 }}>{ex.criteria.map((c, i) => <li key={i}>{c}</li>)}</ul></details>
          )}
          <p className="small faint">{ex.datasetNote}{google ? ` · Workbook: ${google.assignment.title ?? "Google Sheets"}` : ""}</p>
          {ex.simulationNote && <div className="callout warn small">{ex.simulationNote}</div>}
        </div>

        <div className="glass card">
          <div className="row">
            <button className="btn primary" onClick={check}>Check Answer</button>
            <button className="btn" onClick={() => { const n = Math.min(ex.hints.length, hints + 1); setHints(n); actions.useHint(ex.id, n); }} disabled={hints >= ex.hints.length}><Lightbulb size={15} /> Hint ({hints}/{ex.hints.length})</button>
            <button className="btn" onClick={revealSolution}><Eye size={15} /> {showSol ? "Hide solution" : "Show solution"}</button>
            <button className="btn ghost" onClick={reset}><RotateCcw size={15} /> Reset</button>
            {!isQuiz && <button className="btn ghost" onClick={() => downloadWorkbook(wb, "xlsx")}><Download size={15} /> Download .xlsx</button>}
          </div>
          {hints > 0 && <ol className="steps" aria-label="Hints">{ex.hints.slice(0, hints).map((h, i) => <li key={i}>{h}</li>)}</ol>}
          {showSol && (
            <div className="callout warn" style={{ marginTop: 10 }}>
              <strong>Solution</strong>
              <p>{ex.solution.explanation}</p>
              {!isQuiz && (
                <>
                  <ul className="small mono" style={{ paddingLeft: 18 }}>{solutionCells.slice(0, 8).map(([a, f]) => <li key={a}>{a}: {f}</li>)}{solutionCells.length > 8 && <li>… and {solutionCells.length - 8} more cells following the same pattern</li>}</ul>
                  <button className="btn" onClick={() => { setWb(applySolution(ex, wb)); setResult(null); }}>Load solution into the sheet</button>
                </>
              )}
            </div>
          )}
        </div>

        {result && (
          <div className="glass card" role="status" aria-live="polite">
            <h4>{result.passed ? "✓ Correct" : "Not yet"}: {result.summary}</h4>
            {result.passed && lastPass && (
              <div className="callout ok">
                {progress?.assisted ? "Passed, but because you viewed the solution this attempt does not count as mastery." : ex.kind === "mastery" && hints === 0 ? "Mastered: you passed the mastery challenge without the solution." : "Well done."}
                {onNext && <div style={{ marginTop: 8 }}><button className="btn primary" onClick={onNext}>Next →</button></div>}
              </div>
            )}
            {result.tags.length > 0 && <p className="small">Mistake types: {result.tags.map((t) => TAG_LABEL[t]).join(" · ")}</p>}
            <ul className="fb-list">
              {(() => {
                const missing = feedback.filter((f) => f.status === "missing");
                return missing.length > 1 ? <li className="bad"><strong>{missing.length} answer cells are still empty:</strong> <span className="small mono">{missing.slice(0, 12).map((m) => m.addr).join(", ")}{missing.length > 12 ? ", …" : ""}</span></li> : null;
              })()}
              {feedback.filter((f) => f.status !== "correct" && !(f.status === "missing" && feedback.filter((g) => g.status === "missing").length > 1)).slice(0, 8).map((f, i) => (
                <li key={i} className={f.status === "hardcoded" || f.status === "wrong-function" || f.status === "not-general" || f.status === "forbidden-function" ? "warn" : "bad"}>
                  <strong>{f.sheet ? `${f.addr}` : ""}</strong> {f.message}
                  {f.formula && <div className="small mono">Your formula: {f.formula}</div>}
                  {f.actual !== undefined && <div className="small">Your result: <code>{f.actual || "(blank)"}</code>{f.expected !== undefined && <> · Expected: <code>{f.expected || "(blank)"}</code></>}</div>}
                  {f.hint && <div className="small muted">Tip: {f.hint}</div>}
                </li>
              ))}
              {result.passed && <li className="correct">{result.correct} of {result.total} checks passed.</li>}
            </ul>
          </div>
        )}
        {progress && progress.attempts > 0 && <p className="small faint">Attempts: {progress.attempts} · Best: {progress.bestCorrect}/{progress.lastTotal}</p>}
      </aside>

      <section>
        {isQuiz ? (
          <div className="glass card stack">
            {ex.questions!.map((q, qi) => {
              const fb = result?.feedback.find((f) => f.addr === q.id);
              return (
                <fieldset key={q.id} style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend><strong>{qi + 1}. {q.prompt}</strong></legend>
                  {q.formula && <pre className="mono glass-flat" style={{ padding: 8, overflow: "auto" }}>{q.formula}</pre>}
                  {q.options.map((o, oi) => (
                    <button key={oi} className={`opt ${answers[q.id] === oi ? "sel" : ""} ${fb ? (oi === q.correct ? "right" : answers[q.id] === oi ? "wrong" : "") : ""}`} aria-pressed={answers[q.id] === oi}
                      onClick={() => setAnswers({ ...answers, [q.id]: oi })}>{o}</button>
                  ))}
                  {fb && <p className={`small ${fb.status === "correct" ? "" : "muted"}`}>{fb.status === "correct" ? "✓ " : "✗ "}{q.explanation}</p>}
                </fieldset>
              );
            })}
          </div>
        ) : (
          <div className="stack">
            {google && (
              <GoogleSheetsEmbed
                title={google.assignment.title ?? `${ex.title} — Google Sheets`}
                description={google.assignment.description ?? ex.objective}
                spreadsheetUrl={google.assignment.spreadsheetUrl}
                embedUrl={google.assignment.embedUrl}
                fallbackUrl={google.assignment.fallbackUrl}
                mode={google.assignment.mode ?? "embedded-view"}
                height={640}
                workbookName={ex.title}
                exerciseId={ex.id}
                sourceNote={
                  google.source === "sample"
                    ? "This preview is Google's public sample until a workbook is assigned in Settings. Formulas and saving happen in Google Sheets, not in this preview."
                    : "The preview is read-only. Use Open in Google Sheets or Make my own copy for the real editor."
                }
              />
            )}
            <details className="glass card" open={practiceOpen} onToggle={(e) => setPracticeOpen((e.target as HTMLDetailsElement).open)}>
              <summary><strong>Check Answer workspace</strong> — Gurukul ExcelLab sheet used for scoring</summary>
              <p className="small faint" style={{ margin: "8px 0" }}>Yellow cells are yours to edit; grey cells are provided data. Check Answer reads this sheet, not the Google preview.</p>
              <Spreadsheet workbook={wb} onChange={setWb} activeSheet={sheet} onActiveSheet={setSheet} editable={ex.editable} editableSheet={ex.activeSheet}
                feedback={feedback} emphasise={ex.tools} allowSheetOps={false} height={560} />
            </details>
          </div>
        )}
      </section>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CellFeedback, CheckResult, Exercise, MistakeTag } from "../learning/types";
import { TAG_LABEL } from "../learning/types";
import { applySolution, checkExercise, workbookUnchanged } from "../learning/checker";
import { GOOGLE_CANNOT_CHECK } from "../learning/messages";
import { actions, practiceKey, practiceOwner, useStore } from "../state/store";
import type { WorkbookData } from "../engine/types";
import { applyDelta, cellCount, DELTA_FROM_CELLS, diffWorkbook, type WorkbookDelta } from "../state/delta";
import { Lightbulb, RotateCcw, Eye, CheckCircle2 } from "lucide-react";
import { GoogleSheetsEmbed } from "./GoogleSheetsEmbed";
import { LocalSpreadsheetLab } from "./LocalSpreadsheetLab";
import { bindExercise } from "../sheets/registry";
import { inspectSheetsUrl } from "../sheets/urls";

const KIND_LABEL = { guided: "Guided", independent: "Independent", mastery: "Mastery" } as const;

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
  const scorePercent = qs.length ? Math.round((100 * correct) / qs.length) : 0;
  return { passed: correct === qs.length && qs.length > 0, correct, total: qs.length, scorePercent, feedback, tags: [...tags], summary: `${correct} of ${qs.length} questions correct.` };
}

export function ExerciseRunner({
  exercise: ex,
  topic,
  breadcrumb,
  onNext,
}: {
  exercise: Exercise;
  topic: string;
  breadcrumb?: ReactNode;
  onNext?: () => void;
}) {
  const progress = useStore((s) => s.exercises[ex.id]);
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
  useEffect(() => {
    if (!ex.questions && loaded.current) { const t = window.setTimeout(() => actions.saveWorkbook(ex.id, wb, deltaOf(wb)), 250); return () => window.clearTimeout(t); }
  }, [wb, ex]);

  const isQuiz = !!ex.questions;
  const passed = progress?.passed ?? false;
  const feedback = result?.feedback ?? [];
  const sheetOverrides = useStore((s) => s.settings.googleSheets);
  const binding = useMemo(() => (isQuiz ? null : bindExercise(ex, sheetOverrides)), [ex, isQuiz, sheetOverrides]);
  const practiceRec = useStore((s) => (isQuiz ? undefined : s.practiceWorkbooks[practiceKey(practiceOwner(s), ex.id)]));
  const googleOpenUrl = useMemo(() => {
    if (isQuiz) return null;
    const practice = practiceRec?.url ? inspectSheetsUrl(practiceRec.url) : null;
    if (practice?.ok) return practice.openUrl;
    const assigned = binding?.google?.spreadsheetUrl ? inspectSheetsUrl(binding.google.spreadsheetUrl) : null;
    if (assigned?.ok) return assigned.openUrl;
    return null;
  }, [binding, isQuiz, practiceRec]);

  const check = () => {
    let res = isQuiz ? mcqResult(ex, answers) : checkExercise(ex, wb);
    if (!isQuiz && (binding?.google || practiceRec) && workbookUnchanged(ex, wb)) {
      res = { ...res, notices: [...(res.notices ?? []), GOOGLE_CANNOT_CHECK] };
    }
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
  const startStep = ex.instructions[0];

  return (
    <div className="practice-page">
      <header className="practice-header">
        {breadcrumb && <nav className="crumbs practice-crumbs" aria-label="Breadcrumb">{breadcrumb}</nav>}
        <div className="row practice-meta">
          <span className="pill pill-quiet">{KIND_LABEL[ex.kind]}</span>
          {ex.simulationNote && <span className="pill sim">Simulation</span>}
          {binding?.status === "configured" && <span className="pill ok">Google workbook linked</span>}
          {binding?.status === "invalid" && <span className="pill bad">Google link needs fixing</span>}
          {passed && <span className={`pill ${progress?.assisted ? "warn" : "ok"}`}><CheckCircle2 size={12} aria-hidden="true" /> {progress?.assisted ? "Passed with solution" : "Complete"}</span>}
        </div>
        <h2 className="practice-title">{ex.title}</h2>
        <p className="practice-objective">{ex.objective}</p>
      </header>

      {!isQuiz && (
        <div className="task-card glass card">
          <h3 className="task-card-label">Your task</h3>
          {ex.scenario && <p className="muted small">{ex.scenario}</p>}
          {startStep && <p className="task-lead">{startStep}</p>}
          {ex.instructions.length > 1 && (
            <details className="task-details">
              <summary>All steps ({ex.instructions.length})</summary>
              <ol className="steps">{ex.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </details>
          )}
          {ex.outputSpec && (
            <details className="task-details small">
              <summary>Expected output</summary>
              <p>{ex.outputSpec}</p>
            </details>
          )}
          {ex.criteria && ex.criteria.length > 0 && (
            <details className="task-details small">
              <summary>How this is checked</summary>
              <ul className="plain-list">{ex.criteria.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </details>
          )}
          {ex.simulationNote && <p className="callout warn small">{ex.simulationNote}</p>}
        </div>
      )}

      <div className="practice-action-bar" role="toolbar" aria-label="Practice actions">
        <button className="btn primary" type="button" onClick={check}>Check Answer</button>
        {!isQuiz && (
          <>
            <button className="btn" type="button" onClick={() => { const n = Math.min(ex.hints.length, hints + 1); setHints(n); actions.useHint(ex.id, n); }} disabled={hints >= ex.hints.length}>
              <Lightbulb size={15} aria-hidden="true" /> Hint ({hints}/{ex.hints.length})
            </button>
            <button className="btn" type="button" onClick={revealSolution}><Eye size={15} aria-hidden="true" /> {showSol ? "Hide solution" : "Show solution"}</button>
            <button className="btn ghost" type="button" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Reset workspace</button>
          </>
        )}
      </div>

      {hints > 0 && !isQuiz && (
        <div className="glass card card-tight">
          <ol className="steps" aria-label="Hints">{ex.hints.slice(0, hints).map((h, i) => <li key={i}>{h}</li>)}</ol>
        </div>
      )}

      {showSol && (
        <div className="glass card card-tight callout warn">
          <strong>Solution</strong>
          <p className="small">{ex.solution.explanation}</p>
          {!isQuiz && (
            <>
              <ul className="small mono plain-list">{solutionCells.slice(0, 8).map(([a, f]) => <li key={a}>{a}: {f}</li>)}{solutionCells.length > 8 && <li>… and {solutionCells.length - 8} more cells</li>}</ul>
              <button className="btn btn-sm" type="button" onClick={() => { setWb(applySolution(ex, wb)); setResult(null); }}>Load solution into the sheet</button>
            </>
          )}
        </div>
      )}

      <section className="practice-workspace" aria-label="Spreadsheet workspace">
        {isQuiz ? (
          <div className="glass card stack">
            {ex.questions!.map((q, qi) => {
              const fb = result?.feedback.find((f) => f.addr === q.id);
              return (
                <fieldset key={q.id} className="quiz-field">
                  <legend><strong>{qi + 1}. {q.prompt}</strong></legend>
                  {q.formula && <pre className="mono glass-flat quiz-formula">{q.formula}</pre>}
                  {q.options.map((o, oi) => (
                    <button key={oi} type="button" className={`opt ${answers[q.id] === oi ? "sel" : ""} ${fb ? (oi === q.correct ? "right" : answers[q.id] === oi ? "wrong" : "") : ""}`} aria-pressed={answers[q.id] === oi}
                      onClick={() => setAnswers({ ...answers, [q.id]: oi })}>{o}</button>
                  ))}
                  {fb && <p className={`small ${fb.status === "correct" ? "" : "muted"}`}>{fb.status === "correct" ? "✓ " : "✗ "}{q.explanation}</p>}
                </fieldset>
              );
            })}
          </div>
        ) : (
          <>
            <LocalSpreadsheetLab
              workbook={wb}
              onChange={setWb}
              activeSheet={sheet}
              onActiveSheet={setSheet}
              editable={ex.editable}
              editableSheet={ex.activeSheet}
              feedback={feedback}
              emphasise={ex.tools}
              allowSheetOps
              height={640}
              googleOpenUrl={googleOpenUrl}
              exportOptions={{
                title: ex.title,
                exerciseId: ex.id,
                objective: ex.objective,
                instructions: ex.instructions,
                includeInstructionsSheet: true,
              }}
            />
            {binding?.google && (
              <details className="glass card card-tight google-preview-details">
                <summary>Google Sheets preview (optional)</summary>
                <GoogleSheetsEmbed
                  title={binding.google.title ?? ex.title}
                  description={binding.google.description ?? ex.objective}
                  spreadsheetUrl={binding.google.spreadsheetUrl}
                  embedUrl={binding.google.embedUrl}
                  fallbackUrl={binding.google.fallbackUrl}
                  mode={binding.google.mode ?? "embedded-view"}
                  height={480}
                  workbookName={ex.title}
                  exerciseId={ex.id}
                  compact
                />
              </details>
            )}
          </>
        )}
      </section>

      {result && (
        <div className="glass card feedback-panel" role="status" aria-live="polite">
          <h3 className="feedback-title">{result.passed ? "✓ Correct" : "Not yet"}: {result.summary}</h3>
          <p className="small faint">Score: {result.scorePercent}% · {result.correct}/{result.total} checks</p>
          {result.notices?.map((n) => <div key={n} className="callout warn small" role="status">{n}</div>)}
          {result.passed && lastPass && (
            <div className="callout ok">
              {progress?.assisted ? "Passed with the solution visible — this does not count toward mastery." : ex.kind === "mastery" && hints === 0 ? "Mastered without hints or the solution." : "Well done."}
              {onNext && <div style={{ marginTop: 8 }}><button className="btn primary" type="button" onClick={onNext}>Next →</button></div>}
            </div>
          )}
          {result.tags.length > 0 && <p className="small">Focus areas: {result.tags.map((t) => TAG_LABEL[t]).join(" · ")}</p>}
          <ul className="fb-list">
            {(() => {
              const missing = feedback.filter((f) => f.status === "missing");
              return missing.length > 1 ? <li className="bad"><strong>{missing.length} cells still empty:</strong> <span className="small mono">{missing.slice(0, 12).map((m) => m.addr).join(", ")}{missing.length > 12 ? ", …" : ""}</span></li> : null;
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

      {progress && progress.attempts > 0 && (
        <p className="small faint practice-attempts">Attempts: {progress.attempts} · Best: {progress.bestCorrect}/{progress.lastTotal}{progress.lastTotal ? ` (${Math.round((100 * progress.bestCorrect) / progress.lastTotal)}%)` : ""}</p>
      )}
    </div>
  );
}

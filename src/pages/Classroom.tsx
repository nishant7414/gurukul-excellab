import { Link } from "react-router-dom";
import { ALL_LESSONS, CLASSROOM_SHEETS } from "../content/lessons";
import { ALL_EXERCISES } from "../content/registry";
import { CONCEPTS } from "../data/audit";
import { useStore } from "../state/store";
import { lessonProgress } from "../state/progress";

const MASTERY = new Set(ALL_EXERCISES.filter((e) => e.kind === "mastery").map((e) => e.id));

export default function Classroom() {
  const st = useStore((s) => s);
  return (
    <div className="page stack">
      <header>
        <h1>My Classroom</h1>
        <p className="muted">The instructor's workbook, one source sheet at a time. Each lesson has a guided, an independent and a mastery exercise. Concepts the workbook only implies, or that we added for practice, are labelled.</p>
      </header>
      {CLASSROOM_SHEETS.map((sh) => {
        const lessons = ALL_LESSONS.filter((l) => l.track === "classroom" && l.sourceSheet === sh.sheet);
        const concepts = CONCEPTS.filter((c) => c.sheet === sh.sheet);
        const withLesson = concepts.filter((c) => c.lessonId && ALL_LESSONS.some((l) => l.id === c.lessonId));
        return (
          <section key={sh.sheet} className="glass card">
            <div className="row between"><h2>{sh.title}</h2><span className="pill">{withLesson.length}/{concepts.length} concepts have a lesson</span></div>
            <p className="muted">{sh.blurb}</p>
            {lessons.length === 0 ? <div className="callout warn">Lessons for this sheet are <strong>planned</strong> and not yet built. Its concepts are listed in the <Link to="/audit">Workbook Coverage Audit</Link>.</div> : (
              <div className="grid-cards">
                {lessons.map((l) => {
                  const p = lessonProgress(l, st, MASTERY);
                  return (
                    <Link key={l.id} to={`/lesson/${l.id}`} className="glass-flat card" style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="row between"><strong>{l.title}</strong>{p.mastered ? <span className="pill ok">Mastered</span> : p.complete ? <span className="pill ok">Complete</span> : p.started ? <span className="pill warn">In progress</span> : <span className="pill">Not started</span>}</div>
                      <p className="small muted">{l.objectives[0]}</p>
                      <div className="progress" aria-label={`${p.percent}% complete`}><div style={{ width: `${p.percent}%` }} /></div>
                      <p className="small faint">{p.passed}/{p.total} exercises passed · {l.difficulty} · ~{l.minutes} min</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

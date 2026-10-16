import { Link } from "react-router-dom";
import { ArrowRight, Flame, ListChecks, NotebookPen, Target } from "lucide-react";
import { useStore } from "../state/store";
import { activitySeries, lessonProgress, MASTERY_IDS, mistakeTags, nextLesson, overall, streakDays } from "../state/progress";
import { conceptCoverage } from "../content/coverage";

export default function Dashboard() {
  const st = useStore((s) => s);
  const o = overall(st);
  const next = nextLesson(st);
  const nextP = next ? lessonProgress(next, st, MASTERY_IDS) : null;
  const streak = streakDays(st);
  const series = activitySeries(st, 28);
  const tags = mistakeTags(st).filter((t) => t.unresolved > 0).slice(0, 3);
  const unresolved = st.mistakes.filter((m) => !m.resolved).length;
  const attemptedAny = st.attempts.length > 0;
  const cov = conceptCoverage();
  const covered = cov.filter((c) => c.covered).length;
  const maxDay = Math.max(1, ...series.map((d) => d.attempts));

  return (
    <div className="page stack">
      <header>
        <h1>Welcome back, {st.displayName}!</h1>
        <p className="muted">Practise real spreadsheet skills in a working spreadsheet. Every answer is checked by calculating it, not by matching text.</p>
      </header>

      {!attemptedAny && (
        <section className="glass card" aria-labelledby="start-h">
          <h2 id="start-h">Start here</h2>
          <ol className="steps">
            <li>Open the first exercise, a VLOOKUP on the instructor's product catalogue.</li>
            <li>Type your formula into the highlighted cell. Grey cells are given data and are locked.</li>
            <li>Press <strong>Check Answer</strong>. You get cell-by-cell feedback, and hints and a full solution when you need them.</li>
          </ol>
          <div className="row"><Link className="btn primary" to="/lesson/L-VL-1?ex=EX-VL-1-1">Start the first VLOOKUP exercise <ArrowRight size={16} aria-hidden="true" /></Link><Link className="btn" to="/classroom">Browse My Classroom</Link></div>
        </section>
      )}

      <div className="grid-cards" role="list" aria-label="Progress summary">
        <div className="glass stat" role="listitem"><div className="n">{o.exercisesPassed}<span className="muted" style={{ fontSize: "1rem" }}> / {o.exercisesTotal}</span></div><div className="muted small">lesson exercises passed ({o.percent}%)</div></div>
        <div className="glass stat" role="listitem"><div className="n">{o.lessonsComplete}<span className="muted" style={{ fontSize: "1rem" }}> / {o.lessonsTotal}</span></div><div className="muted small">lessons complete · {o.lessonsMastered} mastered</div></div>
        <div className="glass stat" role="listitem"><div className="n"><Flame size={22} aria-hidden="true" /> {streak}</div><div className="muted small">day streak (days with at least one attempt)</div></div>
        <div className="glass stat" role="listitem"><div className="n">{unresolved}</div><div className="muted small">unresolved mistakes · <Link to="/mistakes">open notebook</Link></div></div>
      </div>

      <div className="grid-2">
        <section className="glass card" aria-labelledby="next-h">
          <h2 id="next-h"><Target size={18} aria-hidden="true" /> Next up</h2>
          {next && nextP ? (
            <>
              <p><strong>{next.title}</strong></p>
              <p className="muted small">{next.objectives[0]}</p>
              <div className="progress" aria-label={`${nextP.percent}% of this lesson's exercises passed`}><div style={{ width: `${nextP.percent}%` }} /></div>
              <p className="small faint">{nextP.passed}/{nextP.total} exercises passed · ~{next.minutes} min · {next.track === "classroom" ? "From the source workbook" : "Additional curriculum"}</p>
              <Link className="btn primary" to={`/lesson/${next.id}`}>{nextP.started ? "Continue" : "Start"} lesson</Link>
            </>
          ) : <p>All {o.lessonsTotal} available lessons are complete. More modules are planned; see the <Link to="/roadmap">Learning Roadmap</Link>.</p>}
        </section>

        <section className="glass card" aria-labelledby="weak-h">
          <h2 id="weak-h"><NotebookPen size={18} aria-hidden="true" /> Where you slip most</h2>
          {tags.length === 0 ? <p className="muted">{attemptedAny ? "No unresolved mistakes. Nice." : "Your most common mistake types will appear here after you check some answers."}</p> : (
            <ul>{tags.map((t) => <li key={t.tag}><strong>{t.label}</strong> <span className="muted small">({t.unresolved} open, {t.total} total)</span></li>)}</ul>
          )}
          <Link className="btn" to="/mistakes">Open Mistake Notebook</Link>
        </section>
      </div>

      <section className="glass card" aria-labelledby="act-h">
        <h2 id="act-h">Last 28 days</h2>
        {!attemptedAny ? <p className="muted">No activity yet.</p> : (
          <>
            <div className="heat" style={{ gridTemplateColumns: "repeat(14, 1fr)" }} role="img" aria-label={`Attempts per day over the last 28 days: ${series.map((d) => `${d.day} ${d.attempts}`).join(", ")}`}>
              {series.map((d) => <div key={d.day} className={d.attempts === 0 ? "" : d.attempts / maxDay > 0.66 ? "l3" : d.attempts / maxDay > 0.33 ? "l2" : "l1"} title={`${d.day}: ${d.attempts} attempt(s), ${d.passes} newly passed`} />)}
            </div>
            <p className="small faint">Darker = more attempts. Hover a square for the date.</p>
          </>
        )}
      </section>

      <section className="glass card" aria-labelledby="cov-h">
        <h2 id="cov-h"><ListChecks size={18} aria-hidden="true" /> Source workbook coverage</h2>
        <p>{covered} of {cov.length} concepts found in the instructor's workbook have a lesson with practice. {covered < cov.length ? "The rest are listed as planned." : ""} <Link to="/audit">See the Workbook Coverage Audit</Link>.</p>
        <p className="small faint">Progress is saved only in this browser. Demo sign-in is not a secure account. Challenges passed: {o.challengesPassed}/{o.challengesTotal} · Quizzes attempted: {o.quizzesAttempted}/{o.quizzesTotal}.</p>
      </section>
    </div>
  );
}

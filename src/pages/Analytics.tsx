import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { activitySeries, lessonProgress, MASTERY_IDS, mistakeTags, overall } from "../state/progress";
import { ALL_LESSONS } from "../content/lessons";
import { MODULES } from "../content/modules";

export default function Analytics() {
  const st = useStore((s) => s);
  const o = overall(st);
  const series = activitySeries(st, 14);
  const maxA = Math.max(1, ...series.map((d) => d.attempts));
  const tags = mistakeTags(st);
  const attempts = st.attempts;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const ex = Object.entries(st.exercises);
  const passedEx = ex.filter(([, p]) => p.passed).length;
  const assisted = ex.filter(([, p]) => p.passed && p.assisted).length;
  const hints = ex.reduce((n, [, p]) => n + p.hintsUsed, 0);
  const peek = ex.filter(([, p]) => p.solutionViewed).length;
  const modules = MODULES.map((m) => {
    const ls = ALL_LESSONS.filter((l) => m.lessonIds.includes(l.id));
    const ps = ls.map((l) => lessonProgress(l, st, MASTERY_IDS));
    const total = ps.reduce((n, p) => n + p.total, 0), passed = ps.reduce((n, p) => n + p.passed, 0);
    return { m, total, passed, pct: total ? Math.floor((passed / total) * 100) : 0 };
  });
  const perLesson = ALL_LESSONS.map((l) => {
    const a = attempts.filter((x) => l.exerciseIds.includes(x.exerciseId));
    return { l, n: a.length, ok: a.filter((x) => x.passed).length };
  }).filter((x) => x.n > 0).sort((a, b) => a.ok / a.n - b.ok / b.n);

  if (attempts.length === 0) {
    return (
      <div className="page stack">
        <header><h1>Progress Analytics</h1></header>
        <div className="glass card"><p>No attempts yet, so there is nothing to analyse. Every number on this page is calculated from your real saved attempts, and none is invented.</p><Link className="btn primary" to="/classroom">Go to My Classroom</Link></div>
      </div>
    );
  }
  return (
    <div className="page stack">
      <header><h1>Progress Analytics</h1><p className="muted">Calculated from your {attempts.length} saved attempt{attempts.length === 1 ? "" : "s"} in this browser.</p></header>

      <div className="grid-cards">
        <div className="glass stat"><div className="n">{o.percent}%</div><div className="muted small">of lesson exercises passed ({o.exercisesPassed} of {o.exercisesTotal})</div></div>
        <div className="glass stat"><div className="n">{attempts.length ? Math.round((passedAttempts / attempts.length) * 100) : 0}%</div><div className="muted small">of attempts passed ({passedAttempts} of {attempts.length})</div></div>
        <div className="glass stat"><div className="n">{o.lessonsMastered}</div><div className="muted small">lessons mastered (mastery exercise passed without viewing the solution)</div></div>
        <div className="glass stat"><div className="n">{assisted}</div><div className="muted small">of {passedEx} passed exercises were passed after viewing the solution (assisted)</div></div>
        <div className="glass stat"><div className="n">{hints}</div><div className="muted small">hints used · {peek} solution{peek === 1 ? "" : "s"} viewed</div></div>
      </div>

      <section className="glass card" aria-labelledby="a-h">
        <h2 id="a-h">Attempts per day (last 14 days)</h2>
        <div role="img" aria-label={series.map((d) => `${d.day}: ${d.attempts}`).join("; ")}>
          {series.map((d) => (
            <div key={d.day} className="bar"><span className="lab">{d.day.slice(5)}</span><div className="track" aria-hidden="true"><div style={{ width: `${(d.attempts / maxA) * 100}%` }} /></div><span className="small muted">{d.attempts} attempt{d.attempts === 1 ? "" : "s"}{d.passes ? `, ${d.passes} newly passed` : ""}</span></div>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="glass card" aria-labelledby="m-h">
          <h2 id="m-h">Progress by module</h2>
          {modules.map(({ m, total, passed, pct }) => (
            <div key={m.id} className="bar"><span className="lab">{m.title}</span>
              {total ? <><div className="track" aria-hidden="true"><div style={{ width: `${pct}%` }} /></div><span className="small muted">{passed}/{total}</span></> : <span className="pill warn">planned</span>}</div>
          ))}
        </section>
        <section className="glass card" aria-labelledby="t-h">
          <h2 id="t-h">Mistake types</h2>
          {tags.length === 0 ? <p className="muted">No mistakes recorded.</p> : tags.slice(0, 8).map((t) => (
            <div key={t.tag} className="bar"><span className="lab">{t.label}</span><div className="track" aria-hidden="true"><div style={{ width: `${(t.total / tags[0].total) * 100}%` }} /></div><span className="small muted">{t.total}</span></div>
          ))}
        </section>
      </div>

      <section className="glass card" aria-labelledby="w-h">
        <h2 id="w-h">Lessons by pass rate (lowest first)</h2>
        <div className="table-wrap"><table className="data"><thead><tr><th>Lesson</th><th>Attempts</th><th>Passed attempts</th><th>Pass rate</th></tr></thead>
          <tbody>{perLesson.map(({ l, n, ok }) => <tr key={l.id}><td><Link to={`/lesson/${l.id}`}>{l.title}</Link></td><td>{n}</td><td>{ok}</td><td>{Math.round((ok / n) * 100)}%</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

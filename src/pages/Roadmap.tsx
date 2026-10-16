import { Link } from "react-router-dom";
import { MODULES, type Module } from "../content/modules";
import { ALL_LESSONS } from "../content/lessons";
import { useStore } from "../state/store";
import { lessonProgress, MASTERY_IDS } from "../state/progress";
import { CATALOG, statsFor } from "../practice/catalog";
import { PRACTICE_CONCEPTS } from "../practice/concepts";

const LEVELS: Module["level"][] = ["Level 1: Beginner", "Level 2: Intermediate", "Level 3: Advanced", "Level 4: Job-ready"];

export default function Roadmap() {
  const st = useStore((s) => s);
  const practiceOf = (m: Module) => { const cs = PRACTICE_CONCEPTS.filter((c) => c.moduleId === m.id).map((c) => c.id); return CATALOG.filter((e) => cs.includes(e.concept)); };
  const built = MODULES.filter((m) => m.lessonIds.length > 0 || practiceOf(m).length > 0).length;
  return (
    <div className="page stack">
      <header>
        <h1>Learning Roadmap</h1>
        <p className="muted">{built} of {MODULES.length} modules have lessons or practice challenges. The rest are <strong>planned</strong>: they are listed so you can see where the course is going, but they have neither yet. Modules marked <span className="pill src">source</span> come from the instructor's workbook; the others are additional practice written for Gurukul ExcelLab.</p>
      </header>
      {LEVELS.map((lvl) => (
        <section key={lvl} aria-labelledby={`lvl-${lvl}`}>
          <h2 id={`lvl-${lvl}`}>{lvl}</h2>
          <div className="grid-cards">
            {MODULES.filter((m) => m.level === lvl).map((m) => {
              const ls = ALL_LESSONS.filter((l) => m.lessonIds.includes(l.id));
              const ps = ls.map((l) => lessonProgress(l, st, MASTERY_IDS));
              const total = ps.reduce((n, p) => n + p.total, 0), passed = ps.reduce((n, p) => n + p.passed, 0);
              const pct = total ? Math.floor((passed / total) * 100) : 0;
              const pr = practiceOf(m);
              const prDone = pr.filter((e) => statsFor(e, st).passed).length;
              const prConcepts = [...new Set(pr.map((e) => e.concept))];
              const available = ls.length > 0 || pr.length > 0;
              return (
                <article key={m.id} className="glass card" style={available ? undefined : { opacity: 0.85 }}>
                  <div className="row between"><strong>{m.id} · {m.title}</strong>{ls.length ? <span className="pill ok">Available</span> : pr.length ? <span className="pill warn">Practice only</span> : <span className="pill warn">Planned</span>}</div>
                  <div className="row small">{m.fromSource ? <span className="pill src">source</span> : <span className="pill gen">additional</span>}</div>
                  <p className="small muted">{m.summary}</p>
                  {ls.length > 0 ? (
                    <>
                      <div className="progress" aria-label={`${pct}% of exercises passed`}><div style={{ width: `${pct}%` }} /></div>
                      <p className="small faint">{passed}/{total} exercises passed</p>
                      <ul className="small">{ls.map((l, i) => <li key={l.id}><Link to={`/lesson/${l.id}`}>{l.title}</Link> {ps[i].mastered ? <span className="pill ok">mastered</span> : ps[i].complete ? <span className="pill ok">complete</span> : null}</li>)}</ul>
                    </>
                  ) : <p className="small">{m.note ?? "No lessons yet."}</p>}
                  {pr.length > 0 && (
                    <p className="small"><Link to={prConcepts.length === 1 ? `/challenges?concept=${prConcepts[0]}` : "/challenges"}>{pr.length} practice challenge{pr.length === 1 ? "" : "s"}</Link> on datasets · {prDone} passed</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EXERCISE_BY_ID } from "../content/registry";
import { useStore } from "../state/store";
import { ExerciseRunner } from "../ui/ExerciseRunner";
import { QUIZZES } from "../content/quizzes";
import { CATALOG, CATALOG_BY_ID, NO_FILTERS, anotherDataset, conceptProgress, filterCatalog, statsFor, statsOf, type CatalogEntry, type Filters } from "../practice/catalog";
import { PRACTICE_CONCEPTS } from "../practice/concepts";
import { CATEGORIES, type Tier } from "../datasets/types";
import { DATASET_BY_ID } from "../datasets/registry";

const PAGE = 24;
const TIERS: Tier[] = ["Easy", "Medium", "Hard"];
const TIER_HELP: Record<Tier, string> = { Easy: "about 10-30 rows, one clear task", Medium: "about 50-300 rows, several tables or some mess", Hard: "hundreds to thousands of rows, messy or multi-table, business rules" };
const fmt = (n: number) => n.toLocaleString("en-US");
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "never");

function StatusPill({ e }: { e: CatalogEntry }) {
  const p = useStore((s) => s.exercises[e.exerciseId]);
  const st = statsOf(p);
  if (st.status === "completed") return <span className="pill ok">{st.assisted ? "Completed (assisted)" : "Completed"}</span>;
  if (st.status === "in-progress") return <span className="pill warn">In progress</span>;
  return <span className="pill">New</span>;
}

function Card({ e }: { e: CatalogEntry }) {
  return (
    <Link to={`/challenges/${e.id}`} className="glass card" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="row between"><strong>{e.title}</strong><StatusPill e={e} /></div>
      <div className="row small">
        <span className="pill" title={TIER_HELP[e.tier]}>{e.tier}</span>
        <span className="pill">{e.conceptTitle}</span>
        <span className="pill">~{e.minutes} min</span>
        {e.source === "original" ? <span className="pill src" title="One of the six challenges that shipped first, unchanged">Original</span> : <span className="pill gen">Additional</span>}
        {e.multiTable && <span className="pill">{e.datasetIds.length} tables</span>}
        {e.simulated && <span className="pill sim">Simulation</span>}
      </div>
      <p className="small muted">{e.skill}</p>
      <p className="small faint">Dataset: {e.primary.title} · {fmt(e.rows)} rows × {e.cols} columns{e.multiTable ? ` (+ ${e.datasetIds.length - 1} related table${e.datasetIds.length > 2 ? "s" : ""})` : ""}</p>
    </Link>
  );
}

function readFilters(sp: URLSearchParams): Filters {
  const pick = <T extends string>(k: string, ok: readonly T[], d: T): T => (ok.includes(sp.get(k) as T) ? (sp.get(k) as T) : d);
  return {
    tier: pick<Filters["tier"]>("tier", ["all", ...TIERS], "all"),
    concept: pick<string>("concept", ["all", ...PRACTICE_CONCEPTS.map((c) => c.id)], "all"),
    category: pick<string>("category", ["all", ...CATEGORIES], "all"),
    completion: pick<Filters["completion"]>("done", ["all", "completed", "incomplete"], "all"),
    source: pick<Filters["source"]>("source", ["all", "original", "additional"], "all"),
    text: sp.get("q") ?? "",
  };
}

export function Challenges() {
  const state = useStore((s) => s);
  const [sp, setSp] = useSearchParams();
  const f = readFilters(sp);
  const [shown, setShown] = useState(PAGE);
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (!v || v === "all") next.delete(k); else next.set(k, v);
    setSp(next, { replace: true });
    setShown(PAGE);
  };
  const list = useMemo(() => filterCatalog(CATALOG, f, state), [f.tier, f.concept, f.category, f.completion, f.source, f.text, state.exercises]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = CATALOG.filter((e) => statsFor(e, state).passed).length;
  const filtered = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);
  const concepts = useMemo(() => conceptProgress(state), [state.exercises]); // eslint-disable-line react-hooks/exhaustive-deps
  const mastered = concepts.filter((c) => c.mastered);
  const used = (id: string) => CATALOG.some((e) => e.concept === id);

  return (
    <div className="page stack">
      <header>
        <h1>Challenges</h1>
        <p className="muted">Job-style tasks on realistic, <strong>synthetic</strong> practice data. {CATALOG.length} challenges · {done} completed.</p>
      </header>

      <section className="glass card stack" aria-label="Filters">
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <label className="small">Difficulty<br />
            <select value={f.tier} onChange={(e) => set("tier", e.target.value)} aria-label="Difficulty"><option value="all">All</option>{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
          <label className="small">Concept<br />
            <select value={f.concept} onChange={(e) => set("concept", e.target.value)} aria-label="Concept"><option value="all">All</option>{PRACTICE_CONCEPTS.filter((c) => used(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          <label className="small">Dataset category<br />
            <select value={f.category} onChange={(e) => set("category", e.target.value)} aria-label="Dataset category"><option value="all">All</option>{CATEGORIES.filter((c) => CATALOG.some((e) => e.datasetIds.some((d) => DATASET_BY_ID.get(d)?.category === c))).map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className="small">Status<br />
            <select value={f.completion} onChange={(e) => set("done", e.target.value)} aria-label="Status"><option value="all">All</option><option value="incomplete">Not completed</option><option value="completed">Completed</option></select></label>
          <label className="small">Source<br />
            <select value={f.source} onChange={(e) => set("source", e.target.value)} aria-label="Source"><option value="all">Original and additional</option><option value="original">Original (first six)</option><option value="additional">Additional</option></select></label>
          <label className="small">Search<br />
            <input type="search" value={f.text} onChange={(e) => set("q", e.target.value)} placeholder="title, skill or dataset" aria-label="Search challenges" /></label>
          {filtered && <button className="btn ghost" onClick={() => { setSp(new URLSearchParams(), { replace: true }); setShown(PAGE); }}>Clear filters</button>}
        </div>
        <p className="small faint">Easy: {TIER_HELP.Easy}. Medium: {TIER_HELP.Medium}. Hard: {TIER_HELP.Hard}.</p>
      </section>

      {concepts.length > 0 && (
        <details className="glass card">
          <summary><strong>Concept progress</strong> <span className="small muted">{mastered.length} of {concepts.length} concepts mastered</span></summary>
          <p className="small muted">A concept counts as mastered when at least {Math.round(0.8 * 100)}% of its challenges (and at least 3) are passed without viewing the solution. Hints do not affect this.</p>
          <div className="table-wrap"><table className="data"><thead><tr><th>Concept</th><th>Passed</th><th>Passed without the solution</th><th>Status</th></tr></thead><tbody>
            {concepts.map((c) => <tr key={c.concept}><td><Link to={`/challenges?concept=${c.concept}`}>{c.title}</Link></td><td>{c.passed}/{c.total}</td><td>{c.unassisted}/{c.total}</td><td>{c.mastered ? <span className="pill ok">Mastered</span> : c.passed ? <span className="pill warn">In progress</span> : <span className="pill">Not started</span>}</td></tr>)}
          </tbody></table></div>
        </details>
      )}

      <p className="small muted" role="status">{list.length} of {CATALOG.length} challenges shown.</p>
      {list.length === 0 ? <div className="callout">No challenge matches these filters. <button className="btn" onClick={() => setSp(new URLSearchParams(), { replace: true })}>Clear filters</button></div> : (
        <div className="grid-cards">{list.slice(0, shown).map((e) => <Card key={e.id} e={e} />)}</div>
      )}
      {list.length > shown && <p><button className="btn" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button></p>}
    </div>
  );
}

export function ChallengeRun() {
  const { id = "" } = useParams();
  const e = CATALOG_BY_ID.get(id);
  const ex = e && EXERCISE_BY_ID.get(e.exerciseId);
  const state = useStore((s) => s);
  if (!e || !ex) return <div className="page"><h1>Challenge not found</h1><p><Link to="/challenges">Back to Challenges</Link></p></div>;
  const st = statsFor(e, state);
  const sets = e.datasetIds.map((d) => DATASET_BY_ID.get(d)!);
  const alt = anotherDataset(e, state);
  const same = CATALOG.filter((x) => x.concept === e.concept);
  const next = same[(same.findIndex((x) => x.id === e.id) + 1) % same.length];
  return (
    <div className="page stack">
      <header>
        <div className="crumbs"><Link to="/challenges">Challenges</Link> › <Link to={`/challenges?concept=${e.concept}`}>{e.conceptTitle}</Link> › {e.title}</div>
        <h1>{e.title}</h1>
        <div className="row">
          <span className="pill" title={TIER_HELP[e.tier]}>{e.tier}</span><span className="pill">~{e.minutes} min</span>
          {e.source === "original" ? <span className="pill src">Original challenge</span> : <span className="pill gen">Generated synthetic data</span>}
          {e.simulated && <span className="pill sim">Simulation</span>}
          <StatusPill e={e} />
        </div>
      </header>

      <section className="glass card" aria-label="Dataset and progress">
        <div className="row" style={{ alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "2 1 320px" }}>
            <strong>Dataset{sets.length > 1 ? "s" : ""}</strong>
            <ul className="small" style={{ paddingLeft: 18 }}>
              {sets.map((d, i) => <li key={d.id}><strong>{d.title}</strong>{i === 0 && sets.length > 1 ? " (opens first)" : ""} · {d.category} · {fmt(d.rowCount)} rows × {d.columns.length} columns · {d.origin === "source" ? "from the instructor's workbook" : "synthetic"}<br /><span className="muted">{d.description}</span></li>)}
            </ul>
            <p className="small faint">Challenge {e.id} · dataset id {e.datasetIds.join(", ")}. {e.skill}.</p>
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <strong>Your progress on this challenge</strong>
            <ul className="small" style={{ paddingLeft: 18 }}>
              <li>Attempts: {st.attempts}</li>
              <li>Passed: {st.passed ? (st.assisted ? "yes, after viewing the solution" : "yes") : "not yet"}</li>
              <li>Best score: {st.attempts ? `${st.bestCorrect} of ${st.total} checks` : "none yet"}</li>
              <li>Hints used: {st.hintsUsed}</li>
              <li>Last attempted: {when(st.lastAt)}</li>
            </ul>
          </div>
        </div>
        {alt.length > 0 && (
          <div className="small" style={{ marginTop: 8 }}>
            <strong>Try another dataset</strong> <span className="muted">(the same concept on different data; your saved work and progress here are not changed):</span>
            <ul style={{ paddingLeft: 18 }}>{alt.map((a) => <li key={a.id}><Link to={`/challenges/${a.id}`}>{a.title}</Link> <span className="muted">· {a.primary.title} · {fmt(a.rows)} × {a.cols} · {a.tier}</span></li>)}</ul>
          </div>
        )}
      </section>

      <ExerciseRunner
        key={ex.id}
        exercise={ex}
        topic={`Challenge: ${e.title}`}
        breadcrumb={<><Link to="/challenges">Challenges</Link> / <span>{e.title}</span></>}
      />
      {next && next.id !== e.id && <p><Link className="btn" to={`/challenges/${next.id}`}>Next in {e.conceptTitle}: {next.title}</Link></p>}
    </div>
  );
}

export function Quizzes() {
  const attempts = useStore((s) => s.attempts);
  const progress = useStore((s) => s.exercises);
  return (
    <div className="page stack">
      <header>
        <h1>Quizzes</h1>
        <p className="muted">Short concept checks: predict a result, spot the error, choose the right function. Where a question asks for a result, Gurukul ExcelLab's engine computed the answer in the test-suite. A quiz counts as passed when every question is right; your best score is kept.</p>
      </header>
      <div className="grid-cards">
        {QUIZZES.map((z) => {
          const a = attempts.filter((x) => x.exerciseId === z.exerciseId);
          const best = a.reduce((m, x) => Math.max(m, x.correct), 0);
          const p = progress[z.exerciseId];
          return (
            <Link key={z.id} to={`/quizzes/${z.id}`} className="glass card" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="row between"><strong>{z.title}</strong>{p?.passed ? <span className="pill ok">Passed</span> : a.length ? <span className="pill warn">Best {best}/{z.questionCount}</span> : <span className="pill">Not taken</span>}</div>
              <p className="small muted">{z.blurb}</p>
              <p className="small faint">{z.questionCount} questions · {a.length} attempt{a.length === 1 ? "" : "s"}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function QuizRun() {
  const { id = "" } = useParams();
  const z = QUIZZES.find((x) => x.id === id);
  const ex = z && EXERCISE_BY_ID.get(z.exerciseId);
  if (!z || !ex) return <div className="page"><h1>Quiz not found</h1><p><Link to="/quizzes">Back to Quizzes</Link></p></div>;
  return (
    <div className="page stack">
      <header><div className="crumbs"><Link to="/quizzes">Quizzes</Link> › {z.title}</div><h1>{z.title}</h1></header>
      <ExerciseRunner
        key={ex.id}
        exercise={ex}
        topic={`Quiz: ${z.title}`}
        breadcrumb={<><Link to="/quizzes">Quizzes</Link> / <span>{z.title}</span></>}
      />
    </div>
  );
}

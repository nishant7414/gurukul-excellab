import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildCoverageReport, deepPlan, formatReport, type DeepResult, type Status } from "../practice/coverage";

const pill = (s: Status) => <span className={`pill ${s === "Complete" ? "ok" : s === "Partial" ? "warn" : "bad"}`}>{s}</span>;
const List = ({ title, items, empty = "none" }: { title: string; items: string[]; empty?: string }) => (
  <div>
    <strong>{title}:</strong> {items.length ? <span className="pill warn">{items.length}</span> : <span className="pill ok">{empty}</span>}
    {items.length > 0 && <ul className="small" style={{ paddingLeft: 18, maxHeight: 200, overflow: "auto" }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
  </div>
);

export default function Coverage() {
  const [deep, setDeep] = useState<DeepResult | undefined>();
  const [running, setRunning] = useState<{ done: number; total: number; label: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const cancel = useRef(false);
  const r = useMemo(() => buildCoverageReport({ deepResult: deep }), [deep]);

  const runDeep = () => {
    cancel.current = false;
    const plan = deepPlan();
    let i = 0;
    const tick = () => {
      if (cancel.current) { setRunning(null); return; }
      const end = Math.min(plan.total, i + 2);
      let label = "";
      for (; i < end; i++) label = plan.step(i);
      setRunning({ done: i, total: plan.total, label });
      if (i < plan.total) setTimeout(tick, 0);
      else { setDeep(plan.finish()); setRunning(null); }
    };
    setRunning({ done: 0, total: plan.total, label: "starting" });
    setTimeout(tick, 0);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(formatReport(r)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };

  return (
    <div className="page stack">
      <header>
        <h1>Practice Coverage Report</h1>
        <p className="muted">Counted live from the dataset library and the challenge list as this page loads. Nothing here is typed in by hand except the plain-language limitations. "Complete" only means a concept reached its minimum number of working challenges.</p>
        <div className="row">
          <button className="btn primary" onClick={runDeep} disabled={!!running}>{deep ? "Run the full checks again" : "Run the full checks"}</button>
          {running && <button className="btn" onClick={() => { cancel.current = true; }}>Stop</button>}
          <button className="btn" onClick={copy}>{copied ? "Copied" : "Copy report as text"}</button>
        </div>
        {running && <p role="status" className="small">Checking {running.done} of {running.total}: {running.label}</p>}
        {!deep && !running && <div className="callout warn small">The full checks (generating every dataset and running every reference solution through the checker) have not been run on this page. The numbers below are still real, but "validation" is reported as Partial until you run them. The test-suite and <code>npx tsx scripts/coverage-report.ts</code> run the same checks.</div>}
      </header>

      <section className="glass card stack" aria-label="Phase status">
        <h2>Phase status</h2>
        <div className="table-wrap"><table className="data"><thead><tr><th>Phase</th><th>Status</th><th>Evidence</th></tr></thead><tbody>
          {r.phases.map((p) => <tr key={p.phase}><td>{p.phase}</td><td>{pill(p.status)}</td><td className="small">{p.evidence}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="glass card stack" aria-label="Concepts">
        <h2>Challenges by concept</h2>
        <p className="small muted">{r.challenges.total} challenges: {r.challenges.additional} additional and {r.challenges.original} original (CH-1 to CH-6, unchanged). Targets count the additional challenges only. By difficulty: Easy {r.challenges.byTier.Easy}, Medium {r.challenges.byTier.Medium}, Hard {r.challenges.byTier.Hard}. Multi-table: {r.challenges.multiTable}. Using a simulated tool: {r.challenges.simulated}.</p>
        <div className="table-wrap"><table className="data"><thead><tr><th>Concept</th><th>Module</th><th>Target</th><th>Actual</th><th>Easy</th><th>Medium</th><th>Hard</th><th>Original</th><th>Status</th></tr></thead><tbody>
          {r.concepts.map((c) => (
            <tr key={c.id}><td>{c.actual > 0 ? <Link to={`/challenges?concept=${c.id}`}>{c.title}</Link> : c.title}{c.note && <div className="small faint">{c.note}</div>}</td><td>{c.moduleId}</td><td>{c.target}</td><td>{c.actual}</td><td>{c.tiers.Easy}</td><td>{c.tiers.Medium}</td><td>{c.tiers.Hard}</td><td>{c.original}</td><td>{pill(c.status)}</td></tr>
          ))}
        </tbody></table></div>
      </section>

      <section className="glass card stack" aria-label="Modules">
        <h2>Roadmap modules</h2>
        <div className="table-wrap"><table className="data"><thead><tr><th>Module</th><th>Lessons</th><th>Practice challenges</th><th>State</th></tr></thead><tbody>
          {r.modules.map((m) => <tr key={m.id}><td>{m.id} · {m.title}</td><td>{m.lessons}</td><td>{m.challenges}</td><td><span className={`pill ${m.status === "Lessons and practice" ? "ok" : m.status.startsWith("Planned") ? "bad" : "warn"}`}>{m.status}</span></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="glass card stack" aria-label="Datasets">
        <h2>Datasets</h2>
        <p className="small muted">{r.datasets.total} datasets ({r.datasets.generated - r.datasets.legacy} newly generated, {r.datasets.fromSource} instructor-workbook sheets, {r.datasets.legacy} original challenge tables) · {r.datasets.totalRows.toLocaleString("en-US")} rows · largest {r.datasets.largest.id} ({r.datasets.largest.rows.toLocaleString("en-US")} rows). Easy {r.datasets.byTier.Easy}, Medium {r.datasets.byTier.Medium}, Hard {r.datasets.byTier.Hard}. <Link to="/datasets">Open the dataset library</Link>.</p>
        <div className="table-wrap"><table className="data"><thead><tr><th>Category</th><th>Datasets</th><th>Easy</th><th>Medium</th><th>Hard</th><th>Brief topics covered</th></tr></thead><tbody>
          {r.datasets.byCategory.map((c) => <tr key={c.category}><td>{c.category}</td><td>{c.datasets}</td><td>{c.easy}</td><td>{c.medium}</td><td>{c.hard}</td><td>{c.category === "Original workbook" ? "n/a" : `${c.topicsCovered} of ${c.topicsRequired}`}</td></tr>)}
        </tbody></table></div>
        <List title="Brief topics with no dataset" items={r.uncoveredTopics.map((t) => `${t.category}: ${t.topic}`)} />
        <List title={`Generated datasets that no challenge uses yet`} items={r.challenges.datasetsUnused} />
      </section>

      <section className="glass card stack" aria-label="Warnings">
        <h2>Warnings</h2>
        <List title="Broken references" items={r.brokenRefs} />
        <List title="Tier-rule violations (a challenge easier than its data)" items={r.tierViolations} />
        <List title="Consecutive challenges on the same dataset" items={r.consecutiveSameDataset} />
        <List title="Possible duplicate challenges" items={r.duplicateWarnings} />
        <List title="Datasets reused by four or more challenges (allowed; listed for review)" items={r.heavilyReused} />
      </section>

      <section className="glass card stack" aria-label="Deep validation">
        <h2>Full checks</h2>
        {r.deepResult ? (
          <>
            <p className="small muted">{r.deepResult.datasetsChecked} datasets and {r.deepResult.challengesChecked} challenges checked in {(r.deepResult.msTaken / 1000).toFixed(1)} s in this browser.</p>
            <List title="Dataset errors" items={r.deepResult.datasetErrors} />
            <List title="Dataset warnings" items={r.deepResult.datasetWarnings} />
            <List title="Reference solutions that fail, or an untouched sheet that already passes" items={r.deepResult.failedSolutions} />
            <List title="Challenges with no value or formula check" items={r.deepResult.unverifiable} />
            <List title="Simulation flag mismatches" items={r.deepResult.simulatedMismatch} />
          </>
        ) : <p className="small">Not run yet.</p>}
      </section>

      <section className="glass card stack" aria-label="Original material">
        <h2>Original material preserved</h2>
        <p>{r.originalPreserved.ok ? <span className="pill ok">Preserved</span> : <span className="pill bad">Problem</span>} {r.originalPreserved.sheets}. {r.originalPreserved.challenges}.</p>
        {r.originalPreserved.notes.map((n) => <div key={n} className="callout bad small">{n}</div>)}
      </section>

      <section className="glass card stack" aria-label="Limitations">
        <h2>What the checker cannot do</h2>
        <ul className="small">{r.limitations.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
    </div>
  );
}

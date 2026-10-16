import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shuffle } from "lucide-react";
import { ALL_EXERCISES } from "../content/registry";
import { ownerOf } from "../content/routes";
import { useStore } from "../state/store";
import type { Difficulty, Exercise, ExerciseKind } from "../learning/types";
import { CATALOG_BY_EXERCISE } from "../practice/catalog";
/** reads the catalogue flag for challenges so the list does not build every challenge workbook just to render a badge */
const isSimulated = (e: Exercise) => CATALOG_BY_EXERCISE.get(e.id)?.simulated ?? !!e.simulationNote;

type Status = "all" | "new" | "attempted" | "passed";
const KIND: Record<ExerciseKind, string> = { guided: "Guided", independent: "Independent", mastery: "Mastery" };

export default function Practice() {
  const progress = useStore((s) => s.exercises);
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [kind, setKind] = useState<ExerciseKind | "all">("all");
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [origin, setOrigin] = useState<"all" | "source" | "generated">("all");
  const [type, setType] = useState<"all" | "sheet" | "questions">("all");

  const statusOf = (id: string): Exclude<Status, "all"> => (progress[id]?.passed ? "passed" : (progress[id]?.attempts ?? 0) > 0 ? "attempted" : "new");
  const list = useMemo(() => ALL_EXERCISES.filter((e) =>
    (status === "all" || statusOf(e.id) === status) && (kind === "all" || e.kind === kind) && (diff === "all" || e.difficulty === diff) && (origin === "all" || e.origin === origin)
    && (type === "all" || (type === "questions") === !!e.questions) && (!q.trim() || (e.title + " " + e.objective + " " + e.id).toLowerCase().includes(q.trim().toLowerCase())),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [q, status, kind, diff, origin, type, progress]);

  const pick = () => {
    const pool = list.filter((e) => statusOf(e.id) !== "passed");
    const e = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))];
    if (e) nav(ownerOf(e).to);
  };

  return (
    <div className="page stack">
      <header>
        <h1>Practice Lab</h1>
        <p className="muted">All {ALL_EXERCISES.length} exercises in one place. Filter by status, type or difficulty, or let Gurukul ExcelLab pick one you have not passed yet.</p>
      </header>
      <section className="glass card" aria-label="Filters">
        <div className="row">
          <input type="search" aria-label="Search exercises" placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="row small">Status <select value={status} onChange={(e) => setStatus(e.target.value as Status)}><option value="all">All</option><option value="new">Not started</option><option value="attempted">Attempted, not passed</option><option value="passed">Passed</option></select></label>
          <label className="row small">Kind <select value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind | "all")}><option value="all">All</option>{(Object.keys(KIND) as ExerciseKind[]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}</select></label>
          <label className="row small">Difficulty <select value={diff} onChange={(e) => setDiff(e.target.value as Difficulty | "all")}><option value="all">All</option>{["Beginner", "Intermediate", "Advanced", "Job-ready"].map((d) => <option key={d}>{d}</option>)}</select></label>
          <label className="row small">Data <select value={origin} onChange={(e) => setOrigin(e.target.value as "all" | "source" | "generated")}><option value="all">All</option><option value="source">From the source workbook</option><option value="generated">Generated</option></select></label>
          <label className="row small">Type <select value={type} onChange={(e) => setType(e.target.value as "all" | "sheet" | "questions")}><option value="all">All</option><option value="sheet">Spreadsheet</option><option value="questions">Concept questions</option></select></label>
          <button className="btn primary" onClick={pick} disabled={list.length === 0}><Shuffle size={16} aria-hidden="true" /> Surprise me</button>
        </div>
        <p className="small faint" role="status">{list.length} exercise{list.length === 1 ? "" : "s"} match.</p>
      </section>
      <div className="table-wrap glass card"><table className="data">
        <thead><tr><th>Exercise</th><th>Where</th><th>Kind</th><th>Difficulty</th><th>Data</th><th>Status</th></tr></thead>
        <tbody>{list.map((e) => {
          const o = ownerOf(e); const st = statusOf(e.id);
          return (
            <tr key={e.id}>
              <td><Link to={o.to}>{e.title}</Link>{e.questions && <span className="pill" style={{ marginLeft: 6 }}>questions</span>}{isSimulated(e) && <span className="pill gen" style={{ marginLeft: 6 }} title="Uses a simulated tool (see the exercise for details)">simulated</span>}<div className="small faint">{e.id}</div></td>
              <td className="small">{o.kind}: {o.title}</td><td>{KIND[e.kind]}</td><td>{e.difficulty}</td>
              <td><span className={`pill ${e.origin === "source" ? "src" : "gen"}`}>{e.origin === "source" ? "source" : "generated"}</span></td>
              <td><span className={`pill ${st === "passed" ? "ok" : st === "attempted" ? "warn" : ""}`}>{st === "new" ? "Not started" : st === "attempted" ? "Attempted" : progress[e.id]?.assisted ? "Passed (assisted)" : "Passed"}</span></td>
            </tr>
          );
        })}</tbody>
      </table></div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES, type Dataset, type Tier } from "../datasets/types";
import { DATASETS, DATASET_BY_ID } from "../datasets/registry";
import { CATALOG } from "../practice/catalog";
import { displayValue } from "../engine/format";

const PREVIEW = 20;
const fmt = (n: number) => n.toLocaleString("en-US");
const kind = (d: Dataset) => (d.origin === "source" ? "Instructor's workbook" : d.id.startsWith("DS-LEGACY-") ? "Original challenge" : "Generated");

function Detail({ d }: { d: Dataset }) {
  // rows are only generated when the learner asks to see them
  const [rows, setRows] = useState<ReturnType<Dataset["rows"]> | null>(null);
  const [n, setN] = useState(PREVIEW);
  const users = CATALOG.filter((e) => e.datasetIds.includes(d.id));
  return (
    <div className="glass card stack" aria-label={`Dataset ${d.id}`}>
      <div className="row between"><h2>{d.title}</h2><span className="pill">{d.tier}</span></div>
      <p className="muted">{d.description}</p>
      <p className="small faint">{d.id} · {d.category} · {fmt(d.rowCount)} rows × {d.columns.length} columns · {kind(d)}{d.note ? ` · ${d.note}` : ""}</p>
      {d.topics.length > 0 && <p className="small">Topics: {d.topics.join(", ")}</p>}
      {d.issues.length > 0 && <p className="small">Built-in data problems to find: {d.issues.join(", ")}. This is a practice table, so the problems are deliberate.</p>}
      {d.related.length > 0 && <p className="small">Related datasets: {d.related.map((r, i) => <span key={r}>{i ? ", " : ""}{DATASET_BY_ID.get(r)?.title ?? r}</span>)}</p>}
      <p className="small">Used by {users.length} challenge{users.length === 1 ? "" : "s"}{users.length > 0 && ": "}{users.slice(0, 12).map((e, i) => <span key={e.id}>{i ? ", " : ""}<Link to={`/challenges/${e.id}`}>{e.id}</Link></span>)}{users.length > 12 && ` and ${users.length - 12} more`}</p>
      <div className="table-wrap"><table className="data"><thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead><tbody>
        {d.columns.map((c) => <tr key={c.key}><td>{c.header}</td><td>{c.type}</td><td className="small faint">{c.note ?? ""}</td></tr>)}
      </tbody></table></div>
      {!rows ? <p><button className="btn" onClick={() => setRows(d.rows())}>Preview the first {PREVIEW} rows</button> <span className="small faint">(rows are generated only when you ask; all values are synthetic)</span></p> : (
        <>
          <div className="table-wrap"><table className="data"><thead><tr>{d.columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr></thead><tbody>
            {rows.slice(0, n).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="small">{v === null ? "" : typeof v === "object" && "code" in v ? v.code : typeof v === "number" ? displayValue(v) : String(v)}</td>)}</tr>)}
          </tbody></table></div>
          <p className="small faint">Showing {Math.min(n, rows.length)} of {fmt(rows.length)} rows.{n < rows.length && <> <button className="btn" onClick={() => setN(n + 50)}>Show 50 more</button></>}</p>
        </>
      )}
    </div>
  );
}

export default function Datasets() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [org, setOrg] = useState<"all" | "generated" | "original">("all");
  const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => DATASETS.filter((d) =>
    (cat === "all" || d.category === cat) && (tier === "all" || d.tier === tier) && (org === "all" || (org === "generated") === (d.origin === "generated" && !d.id.startsWith("DS-LEGACY-")))
    && (!q.trim() || `${d.title} ${d.id} ${d.topics.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())),
  ), [q, cat, tier, org]);
  const usage = useMemo(() => { const m = new Map<string, number>(); for (const e of CATALOG) for (const d of e.datasetIds) m.set(d, (m.get(d) ?? 0) + 1); return m; }, []);
  const sel = open ? DATASET_BY_ID.get(open) : undefined;

  return (
    <div className="page stack">
      <header>
        <h1>Dataset Library</h1>
        <p className="muted">{DATASETS.length} practice datasets. Everything generated here is <strong>synthetic</strong>: invented people, products and amounts, with no real personal information, phone numbers or national ID numbers. The instructor's workbook sheets and the first six challenge tables are kept exactly as they were.</p>
      </header>
      <section className="glass card" aria-label="Filters">
        <div className="row" style={{ flexWrap: "wrap" }}>
          <input type="search" aria-label="Search datasets" placeholder="Search datasets" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="row small">Category <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="row small">Tier <select value={tier} onChange={(e) => setTier(e.target.value as Tier | "all")}><option value="all">All</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
          <label className="row small">Source <select value={org} onChange={(e) => setOrg(e.target.value as "all" | "generated" | "original")}><option value="all">All</option><option value="generated">Generated</option><option value="original">Original material</option></select></label>
        </div>
        <p className="small faint" role="status">{list.length} of {DATASETS.length} datasets shown.</p>
      </section>
      <div className="table-wrap glass card"><table className="data">
        <thead><tr><th>Dataset</th><th>Category</th><th>Tier</th><th>Size</th><th>Source</th><th>Challenges</th></tr></thead>
        <tbody>{list.map((d) => (
          <tr key={d.id} aria-selected={open === d.id}>
            <td><button className="btn ghost" onClick={() => setOpen(open === d.id ? null : d.id)}>{d.title}</button><div className="small faint">{d.id}</div></td>
            <td className="small">{d.category}</td><td>{d.tier}</td><td className="small">{fmt(d.rowCount)} × {d.columns.length}</td><td className="small">{kind(d)}</td><td>{usage.get(d.id) ?? 0}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {sel && <Detail key={sel.id} d={sel} />}
    </div>
  );
}

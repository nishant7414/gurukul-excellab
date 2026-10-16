import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { TAG_LABEL, type MistakeTag } from "../learning/types";
import { EXERCISE_BY_ID } from "../content/registry";
import { ownerOf } from "../content/routes";
import { mistakeTags } from "../state/progress";

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function Mistakes() {
  const mistakes = useStore((s) => s.mistakes);
  const st = useStore((s) => s);
  const [view, setView] = useState<"open" | "resolved" | "all">("open");
  const [tag, setTag] = useState<MistakeTag | "all">("all");
  const tags = useMemo(() => mistakeTags(st), [st]);
  const list = mistakes.filter((m) => (view === "all" || (view === "open") === !m.resolved) && (tag === "all" || m.tag === tag));
  const open = mistakes.filter((m) => !m.resolved).length;

  return (
    <div className="page stack">
      <header>
        <h1>Mistake Notebook</h1>
        <p className="muted">Every failed check is saved here with what you entered, what was expected and why. A mistake is marked <strong>resolved only when you pass that exercise on a later attempt</strong>; it is never ticked off by hand.</p>
      </header>

      {mistakes.length === 0 ? (
        <div className="glass card"><p>Nothing here yet. When a check fails, the reason is recorded here so you can learn from it.</p><Link className="btn primary" to="/lesson/L-VL-1?ex=EX-VL-1-1">Try the first VLOOKUP exercise</Link></div>
      ) : (
        <>
          <section className="glass card" aria-labelledby="tags-h">
            <h2 id="tags-h">Patterns</h2>
            <div>{tags.map((t) => <div key={t.tag} className="bar"><span className="lab">{t.label}</span><div className="track" aria-hidden="true"><div style={{ width: `${Math.round((t.total / tags[0].total) * 100)}%` }} /></div><span className="small muted">{t.total} ({t.unresolved} open)</span></div>)}</div>
          </section>

          <div className="row" role="group" aria-label="Filters">
            <div className="tabs" role="tablist" aria-label="Status">
              {(["open", "resolved", "all"] as const).map((v) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{v === "open" ? `Open (${open})` : v === "resolved" ? `Resolved (${mistakes.length - open})` : `All (${mistakes.length})`}</button>)}
            </div>
            <label className="row small">Type <select value={tag} onChange={(e) => setTag(e.target.value as MistakeTag | "all")}><option value="all">All types</option>{tags.map((t) => <option key={t.tag} value={t.tag}>{TAG_LABEL[t.tag]}</option>)}</select></label>
          </div>

          {list.length === 0 ? <div className="callout ok">{view === "open" ? "No open mistakes with this filter." : "Nothing matches this filter."}</div> : (
            <ul className="plain stack">
              {list.map((m) => {
                const ex = EXERCISE_BY_ID.get(m.exerciseId);
                return (
                  <li key={m.id} className="glass card">
                    <div className="row between">
                      <strong>{ex?.title ?? m.exerciseId}</strong>
                      <span className={`pill ${m.resolved ? "ok" : "bad"}`}>{m.resolved ? `Resolved ${m.resolvedAt ? fmt(m.resolvedAt) : ""}` : "Open"}</span>
                    </div>
                    <div className="row small muted"><span className="pill">{TAG_LABEL[m.tag]}</span><span>{m.topic}</span><span>last seen {fmt(m.at)}</span><span>{m.attempts} failed attempt{m.attempts === 1 ? "" : "s"}</span></div>
                    <div className="grid-2" style={{ marginTop: 8 }}>
                      <div><h4>What you entered</h4><pre className="mono glass-flat" style={{ padding: 8, whiteSpace: "pre-wrap" }}>{m.attempted || "(blank)"}</pre></div>
                      <div><h4>What was expected</h4><pre className="mono glass-flat" style={{ padding: 8, whiteSpace: "pre-wrap" }}>{m.expected || "(see the exercise)"}</pre></div>
                    </div>
                    <p><strong>Why:</strong> {m.explanation}</p>
                    {ex && <Link className="btn" to={ownerOf(ex).to}>{m.resolved ? "Practise again" : "Retry this exercise"}</Link>}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

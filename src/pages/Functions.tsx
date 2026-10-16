import { useMemo, useState } from "react";
import { FUNCS, UNSUPPORTED } from "../engine/core";
import { FN_CASES, fixtureWorkbook } from "../engine/cases";
import { evaluateFormula } from "../engine/workbook";
import { displayValue } from "../engine/format";
import { isErr, isMatrix } from "../engine/types";
import { functionsUsed } from "../engine/parser";
import { SOURCE } from "../data/source";
import { ALL_EXERCISES } from "../content/registry";
import { PRACTICE_BY_ID } from "../practice/registry";

const show = (v: ReturnType<typeof evaluateFormula>) => (isMatrix(v) ? v.map((r) => r.map((x) => (isErr(x) ? x.code : displayValue(x))).join(" | ")).join(" / ") : isErr(v) ? v.code : displayValue(v));

export default function Functions() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const data = useMemo(() => {
    const inSource = new Set<string>();
    for (const sh of SOURCE.sheets) for (const c of sh.cells) if (c.f) functionsUsed("=" + c.f).forEach((f) => inSource.add(f));
    const inLessons = new Set<string>();
    for (const e of ALL_EXERCISES.filter((x) => !PRACTICE_BY_ID.has(x.lessonId))) for (const raw of Object.values(e.solution.cells)) if (raw.startsWith("=")) functionsUsed(raw).forEach((f) => inLessons.add(f));
    const wb = fixtureWorkbook();
    const rows = [...FUNCS.values()].sort((a, b) => a.name.localeCompare(b.name)).map((f) => {
      const cases = FN_CASES.filter((c) => c.fn === f.name);
      const ex = cases[0];
      return { f, tests: cases.length, example: ex ? { formula: ex.formula, result: show(evaluateFormula(wb, "S", ex.formula)) } : null, source: inSource.has(f.name), lesson: inLessons.has(f.name) };
    });
    return rows;
  }, []);
  const cats = [...new Set(data.map((d) => d.f.category))].sort();
  const list = data.filter((d) => (cat === "all" || d.f.category === cat) && (!q.trim() || d.f.name.toLowerCase().includes(q.trim().toLowerCase())));
  const untested = data.filter((d) => d.tests === 0).length;

  return (
    <div className="page stack">
      <header>
        <h1>Function Library</h1>
        <p className="muted">The {data.length} functions Gurukul ExcelLab's engine evaluates, and the {Object.keys(UNSUPPORTED).length} real Excel functions it does not. Examples are computed by the engine as this page loads.</p>
        {untested > 0 && <div className="callout warn">{untested} function{untested === 1 ? " has" : "s have"} no dedicated test example yet and are marked "no example test".</div>}
      </header>
      <section className="glass card">
        <div className="row">
          <input type="search" aria-label="Search functions" placeholder="Search functions…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="row small">Category <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
          <span className="small faint" role="status">{list.length} shown</span>
        </div>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Function</th><th>Category</th><th>Arguments</th><th>Engine test example</th><th>In the source workbook</th><th>Used in a lesson</th></tr></thead>
          <tbody>{list.map(({ f, tests, example, source, lesson }) => (
            <tr key={f.name}>
              <td><code>{f.name}</code></td><td className="small">{f.category}</td>
              <td className="small">{f.min}{f.max === Infinity ? "+" : f.max === f.min ? "" : `–${f.max}`}</td>
              <td>{example ? <><code className="small">{example.formula}</code> <span className="muted small">→ {example.result}</span><div className="small faint">{tests} test case{tests === 1 ? "" : "s"}</div></> : <span className="pill warn">no example test</span>}</td>
              <td>{source ? <span className="pill src">yes</span> : <span className="muted small">no</span>}</td>
              <td>{lesson ? <span className="pill ok">yes</span> : <span className="muted small">no</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      <section className="glass card" aria-labelledby="un-h">
        <h2 id="un-h">Not evaluated by Gurukul ExcelLab</h2>
        <p className="muted small">These return an <code>#UNSUPPORTED!</code> error that says so. They never return an invented value.</p>
        <div className="table-wrap"><table className="data"><thead><tr><th>Function</th><th>Why</th></tr></thead>
          <tbody>{Object.entries(UNSUPPORTED).map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td className="small">{v}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

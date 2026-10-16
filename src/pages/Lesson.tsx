import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { LESSON_BY_ID } from "../content/lessons";
import { EXERCISE_BY_ID } from "../content/registry";
import { ExerciseRunner } from "../ui/ExerciseRunner";
import { getState, useStore } from "../state/store";
import { PRACTICE_CONCEPTS } from "../practice/concepts";
import { CATALOG } from "../practice/catalog";

const lessonStarted = (id: string) => (LESSON_BY_ID.get(id)?.exerciseIds ?? []).some((e) => (getState().exercises[e]?.attempts ?? 0) > 0);
import { CONCEPTS } from "../data/audit";

export default function LessonPage() {
  const { id = "" } = useParams();
  const lesson = LESSON_BY_ID.get(id);
  const [params] = useSearchParams();
  const [idx, setIdx] = useState(() => Math.max(0, (LESSON_BY_ID.get(id)?.exerciseIds ?? []).indexOf(params.get("ex") ?? "")));
  const progress = useStore((s) => s.exercises);
  const [startOpen] = useState(() => !lessonStarted(id));
  if (!lesson) return <div className="page"><h1>Lesson not found</h1><p>No lesson has the id <code>{id}</code>. <Link to="/classroom">Back to My Classroom</Link></p></div>;
  const exs = lesson.exerciseIds.map((e) => EXERCISE_BY_ID.get(e)!).filter(Boolean);
  const ex = exs[Math.min(idx, exs.length - 1)];
  const c = lesson.content;
  const concepts = CONCEPTS.filter((k) => lesson.conceptIds.includes(k.id));
  const practice = PRACTICE_CONCEPTS.filter((k) => k.lessonIds.includes(lesson.id) && CATALOG.some((e) => e.concept === k.id));
  const label = { guided: "Guided", independent: "Independent", mastery: "Mastery" } as const;

  return (
    <div className="page stack">
      <header>
        <div className="crumbs"><Link to="/classroom">My Classroom</Link> › {lesson.sourceSheet ? `Source sheet: ${lesson.sourceSheet.trim()}` : lesson.level}</div>
        <h1>{lesson.title}</h1>
        <div className="row"><span className="pill">{lesson.difficulty}</span><span className="pill">~{lesson.minutes} min</span><span className={`pill ${lesson.track === "classroom" ? "src" : "gen"}`}>{lesson.track === "classroom" ? "From the source workbook" : "Additional curriculum (generated)"}</span></div>
      </header>

      <details className="glass card" open={startOpen}>
        <summary><strong>Lesson: what, why, how</strong></summary>
        <div className="grid-2" style={{ marginTop: 10 }}>
          <div>
            <h4>In plain words</h4><p>{c.simple}</p>
            <h4>Where you would use it</h4><p>{c.useCase}</p>
            {c.syntax && <><h4>Syntax</h4><pre className="mono glass-flat" style={{ padding: 10, overflow: "auto" }}>{c.syntax}</pre></>}
            <h4>You will be able to</h4><ul>{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
          </div>
          <div>
            {c.example && <><h4>Worked example: {c.example.title}</h4>{c.example.formula && <pre className="mono glass-flat" style={{ padding: 10, overflow: "auto" }}>{c.example.formula}</pre>}{c.example.result && <p className="muted">{c.example.result}</p>}<ol className="steps">{c.example.steps.map((s) => <li key={s}>{s}</li>)}</ol></>}
            <h4>Common mistakes</h4><ul>{c.mistakes.map((s) => <li key={s}>{s}</li>)}</ul>
            <h4>Compatibility</h4><ul>{c.compat.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
        {concepts.length > 0 && <p className="small faint">Source concepts covered: {concepts.map((k) => k.name).join(" · ")} (<Link to="/audit">see coverage audit</Link>)</p>}
      </details>

      {practice.length > 0 && (
        <p className="small">More practice on realistic datasets: {practice.map((k, i) => <span key={k.id}>{i > 0 ? " · " : ""}<Link to={`/challenges?concept=${k.id}`}>{k.title} ({CATALOG.filter((e) => e.concept === k.id).length} challenges)</Link></span>)}</p>
      )}
      <div className="tabs" role="tablist" aria-label="Exercises">
        {exs.map((e, i) => (
          <button key={e.id} role="tab" aria-selected={i === idx} onClick={() => setIdx(i)}>
            {i + 1}. {label[e.kind]} {progress[e.id]?.passed ? "✓" : ""}
          </button>
        ))}
      </div>
      {ex && <ExerciseRunner key={ex.id} exercise={ex} topic={lesson.title} onNext={idx < exs.length - 1 ? () => setIdx(idx + 1) : undefined} />}
    </div>
  );
}

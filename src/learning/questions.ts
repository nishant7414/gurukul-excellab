import type { CellFeedback, CheckResult, Exercise, McqQuestion, MistakeTag } from "./types";

/** Grade multiple-choice style exercises. `answers` maps question id -> chosen option index. */
export function gradeQuestions(qs: McqQuestion[], answers: Record<string, number>): CheckResult {
  const feedback: CellFeedback[] = [];
  const tags = new Set<MistakeTag>();
  let correct = 0;
  for (const q of qs) {
    const a = answers[q.id];
    const ok = a === q.correct;
    if (ok) correct++;
    else tags.add(q.tag ?? "knowledge");
    feedback.push({
      sheet: "", addr: q.id, status: ok ? "correct" : a === undefined ? "missing" : "wrong", checkLabel: q.prompt,
      actual: a === undefined ? "(no answer)" : q.options[a], expected: q.options[q.correct],
      message: ok ? "Correct." : a === undefined ? "Not answered." : "Not quite.", hint: q.explanation, tag: ok ? undefined : (q.tag ?? "knowledge"),
    });
  }
  const passed = correct === qs.length && qs.length > 0;
  const scorePercent = qs.length ? Math.round((100 * correct) / qs.length) : 0;
  return { passed, correct, total: qs.length, scorePercent, feedback, tags: [...tags], summary: passed ? `All ${qs.length} questions correct.` : `${correct} of ${qs.length} questions correct.` };
}

export const isQuestionExercise = (e: Exercise) => !!e.questions && e.questions.length > 0;

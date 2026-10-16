import type { Lesson } from "../learning/types";
import type { AppState } from "./store";

export interface LessonProgress {
  total: number;
  passed: number;
  /** complete = every exercise passed */
  complete: boolean;
  /** mastered = the mastery exercise passed without the solution being viewed */
  mastered: boolean;
  started: boolean;
  percent: number;
}

export function lessonProgress(lesson: Lesson, s: AppState, masteryIds: Set<string>): LessonProgress {
  const total = lesson.exerciseIds.length;
  let passed = 0, started = false, mastered = false;
  for (const id of lesson.exerciseIds) {
    const p = s.exercises[id];
    if (p?.attempts) started = true;
    if (p?.passed) {
      passed++;
      if (masteryIds.has(id) && !p.assisted) mastered = true;
    }
  }
  return { total, passed, complete: total > 0 && passed === total, mastered, started, percent: total ? Math.round((passed / total) * 100) : 0 };
}

export function streakDays(s: AppState, today = new Date()): number {
  let n = 0;
  const d = new Date(today);
  const key = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  // today may have no activity yet; the streak then counts back from yesterday
  if (!s.activity[key(d)]) d.setDate(d.getDate() - 1);
  while (s.activity[key(d)]?.attempts) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------------- derived views used by the dashboard, roadmap and analytics ---------------- */
import { ALL_LESSONS } from "../content/lessons";
import { ALL_EXERCISES, EXERCISE_BY_ID } from "../content/registry";
import { CHALLENGES } from "../content/ex-challenges";
import { QUIZZES } from "../content/quizzes";
import { TAG_LABEL, type MistakeTag } from "../learning/types";

export const MASTERY_IDS = new Set(ALL_EXERCISES.filter((e) => e.kind === "mastery").map((e) => e.id));

export interface Overall {
  lessonsTotal: number;
  lessonsComplete: number;
  lessonsMastered: number;
  exercisesTotal: number;
  exercisesPassed: number;
  /** floor, never 100 unless every lesson exercise is passed */
  percent: number;
  challengesPassed: number;
  challengesTotal: number;
  quizzesAttempted: number;
  quizzesTotal: number;
}

export function overall(s: AppState): Overall {
  const lp = ALL_LESSONS.map((l) => lessonProgress(l, s, MASTERY_IDS));
  const exercisesTotal = ALL_LESSONS.reduce((n, l) => n + l.exerciseIds.length, 0);
  const exercisesPassed = ALL_LESSONS.reduce((n, l) => n + l.exerciseIds.filter((id) => s.exercises[id]?.passed).length, 0);
  return {
    lessonsTotal: ALL_LESSONS.length, lessonsComplete: lp.filter((p) => p.complete).length, lessonsMastered: lp.filter((p) => p.mastered).length,
    exercisesTotal, exercisesPassed, percent: exercisesTotal ? Math.floor((exercisesPassed / exercisesTotal) * 100) : 0,
    challengesPassed: CHALLENGES.filter((c) => s.exercises[c.exerciseId]?.passed).length, challengesTotal: CHALLENGES.length,
    quizzesAttempted: QUIZZES.filter((q) => (s.exercises[q.exerciseId]?.attempts ?? 0) > 0).length, quizzesTotal: QUIZZES.length,
  };
}

/** The suggested next lesson: the first lesson (classroom order, then additional) that is not complete and whose prerequisites are complete. */
export function nextLesson(s: AppState): Lesson | null {
  const done = new Set(ALL_LESSONS.filter((l) => lessonProgress(l, s, MASTERY_IDS).complete).map((l) => l.id));
  const open = ALL_LESSONS.filter((l) => !done.has(l.id));
  const inProgress = open.find((l) => lessonProgress(l, s, MASTERY_IDS).started && l.prerequisites.every((p) => done.has(p)));
  return inProgress ?? open.find((l) => l.prerequisites.every((p) => done.has(p))) ?? open[0] ?? null;
}

export interface TagStat { tag: MistakeTag; label: string; total: number; unresolved: number }
export function mistakeTags(s: AppState): TagStat[] {
  const m = new Map<MistakeTag, TagStat>();
  for (const x of s.mistakes) {
    const t = m.get(x.tag) ?? { tag: x.tag, label: TAG_LABEL[x.tag], total: 0, unresolved: 0 };
    t.total += x.attempts;
    if (!x.resolved) t.unresolved++;
    m.set(x.tag, t);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/** Per-day attempts for the last `days` days, oldest first. */
export function activitySeries(s: AppState, days = 14, today = new Date()): { day: string; attempts: number; passes: number }[] {
  const out: { day: string; attempts: number; passes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ day: k, attempts: s.activity[k]?.attempts ?? 0, passes: s.activity[k]?.passes ?? 0 });
  }
  return out;
}

export function exerciseTitle(id: string): string {
  return EXERCISE_BY_ID.get(id)?.title ?? id;
}

import type { Exercise } from "../learning/types";
import { LESSON_BY_ID } from "./lessons";
import { CHALLENGES } from "./ex-challenges";
import { QUIZZES } from "./quizzes";
import { PRACTICE_BY_ID } from "../practice/registry";

export type ExerciseOwner = { kind: "lesson" | "challenge" | "quiz"; title: string; to: string };

/** Where an exercise lives in the app, so any page can link straight to it. */
export function ownerOf(ex: Exercise): ExerciseOwner {
  const lesson = LESSON_BY_ID.get(ex.lessonId);
  if (lesson) return { kind: "lesson", title: lesson.title, to: `/lesson/${lesson.id}?ex=${ex.id}` };
  const ch = CHALLENGES.find((c) => c.id === ex.lessonId);
  if (ch) return { kind: "challenge", title: ch.title, to: `/challenges/${ch.id}` };
  const pc = PRACTICE_BY_ID.get(ex.lessonId);
  if (pc) return { kind: "challenge", title: pc.title, to: `/challenges/${pc.id}` };
  const qz = QUIZZES.find((q) => q.id === ex.lessonId);
  if (qz) return { kind: "quiz", title: qz.title, to: `/quizzes/${qz.id}` };
  return { kind: "lesson", title: ex.lessonId, to: "/classroom" };
}

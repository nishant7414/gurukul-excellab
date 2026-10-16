import { useSyncExternalStore } from "react";
import type { WorkbookData } from "../engine/types";
import type { WorkbookDelta } from "./delta";
import type { CheckResult, Exercise, MistakeTag } from "../learning/types";
import { TAG_LABEL } from "../learning/types";

const KEY = "excelgym.state.v1";

export interface ExerciseProgress {
  attempts: number;
  passed: boolean;
  passedAt?: string;
  /** passed after the solution had been revealed */
  assisted: boolean;
  hintsUsed: number;
  solutionViewed: boolean;
  bestCorrect: number;
  lastTotal: number;
  workbook?: WorkbookData;
  /** large tables: only the learner's changes, relative to the starting workbook */
  delta?: WorkbookDelta;
  /** ISO time of the most recent submission */
  lastAt?: string;
  answers?: Record<string, number>;
  /** attempts counted since the last pass */
  lastResultSummary?: string;
}
export interface AttemptRec {
  id: string;
  exerciseId: string;
  at: string;
  passed: boolean;
  correct: number;
  total: number;
  tags: MistakeTag[];
  summary: string;
}
export interface MistakeRec {
  id: string;
  exerciseId: string;
  lessonId: string;
  topic: string;
  tag: MistakeTag;
  at: string;
  attempted: string;
  expected: string;
  explanation: string;
  attempts: number;
  resolved: boolean;
  resolvedAt?: string;
}
export interface QuizResult {
  id: string;
  quizId: string;
  at: string;
  score: number;
  total: number;
  missed: string[];
}
export interface ImportRecord {
  id: string;
  fileName: string;
  at: string;
  sheets: number;
  status: string;
}
/** Frontend-only demo identity. Never store a password here. This is not secure authentication. */
export interface DemoAuth {
  signedIn: boolean;
  email: string | null;
}

export interface AppState {
  version: 1;
  userId: string;
  displayName: string;
  createdAt: string;
  /** Demo UI gate only. Persisted as signedIn + email; anyone can edit localStorage. Not real auth. */
  auth: DemoAuth;
  exercises: Record<string, ExerciseProgress>;
  attempts: AttemptRec[];
  mistakes: MistakeRec[];
  quizzes: QuizResult[];
  activity: Record<string, { attempts: number; passes: number }>;
  imports: ImportRecord[];
  settings: { theme: "light" | "dark" | "system"; sidebarCollapsed: boolean; onboarded: boolean };
}

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function fresh(): AppState {
  return {
    version: 1, userId: "local-" + uid(), displayName: "Learner", createdAt: new Date().toISOString(),
    auth: { signedIn: false, email: null },
    exercises: {}, attempts: [], mistakes: [], quizzes: [], activity: {}, imports: [],
    settings: { theme: "system", sidebarCollapsed: false, onboarded: false },
  };
}

let state: AppState = load();
export let persistError = null as string | null;
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return fresh();
    const rawAuth = parsed.auth && typeof parsed.auth === "object" ? parsed.auth as Partial<DemoAuth> & { password?: unknown } : {};
    return {
      ...fresh(),
      ...parsed,
      settings: { ...fresh().settings, ...parsed.settings },
      auth: {
        signedIn: !!rawAuth.signedIn,
        email: typeof rawAuth.email === "string" ? rawAuth.email : null,
      },
    };
  } catch {
    return fresh();
  }
}
function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    persistError = null;
  } catch (e) {
    persistError = `Progress could not be saved in this browser (${e instanceof Error ? e.message : "storage error"}).`;
  }
  listeners.forEach((l) => l());
}
function update(f: (s: AppState) => AppState) {
  state = f(state);
  emit();
}

export const getState = () => state;
export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => sel(state),
  );
}
let errSnapshot = persistError;
export function usePersistError() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => (errSnapshot = persistError),
  );
}
void errSnapshot;

const blankProgress = (): ExerciseProgress => ({ attempts: 0, passed: false, assisted: false, hintsUsed: 0, solutionViewed: false, bestCorrect: 0, lastTotal: 0 });
const prog = (s: AppState, id: string) => s.exercises[id] ?? blankProgress();

export const actions = {
  saveWorkbook(exId: string, wb: WorkbookData, delta?: WorkbookDelta) {
    update((s) => ({ ...s, exercises: { ...s.exercises, [exId]: { ...prog(s, exId), workbook: delta ? undefined : wb, delta } } }));
  },
  resetExercise(exId: string) {
    update((s) => {
      const p = prog(s, exId);
      return { ...s, exercises: { ...s.exercises, [exId]: { ...p, workbook: undefined, delta: undefined, answers: undefined } } };
    });
  },
  useHint(exId: string, count: number) {
    update((s) => {
      const p = prog(s, exId);
      return { ...s, exercises: { ...s.exercises, [exId]: { ...p, hintsUsed: Math.max(p.hintsUsed, count) } } };
    });
  },
  viewSolution(exId: string) {
    update((s) => ({ ...s, exercises: { ...s.exercises, [exId]: { ...prog(s, exId), solutionViewed: true } } }));
  },
  /** Record one submission. Progress changes only when the attempt passes. */
  submit(ex: Exercise, result: CheckResult, wb: WorkbookData | null, topic: string, answers?: Record<string, number>, delta?: WorkbookDelta) {
    update((s) => {
      const now = new Date().toISOString();
      const p = prog(s, ex.id);
      const wasPassed = p.passed;
      const next: ExerciseProgress = {
        ...p, attempts: p.attempts + 1, bestCorrect: Math.max(p.bestCorrect, result.correct), lastTotal: result.total,
        workbook: delta ? undefined : (wb ?? p.workbook), delta: delta ?? (wb ? undefined : p.delta), lastAt: now, answers: answers ?? p.answers, lastResultSummary: result.summary,
      };
      if (result.passed && !wasPassed) {
        next.passed = true;
        next.passedAt = now;
        next.assisted = p.solutionViewed;
      }
      const attempt: AttemptRec = { id: uid(), exerciseId: ex.id, at: now, passed: result.passed, correct: result.correct, total: result.total, tags: result.tags, summary: result.summary };
      let mistakes = s.mistakes;
      if (!result.passed) {
        mistakes = [...mistakes];
        for (const tag of result.tags.length ? result.tags : (["other"] as MistakeTag[])) {
          const fb = result.feedback.find((f) => f.tag === tag && f.status !== "correct");
          const idx = mistakes.findIndex((m) => m.exerciseId === ex.id && m.tag === tag && !m.resolved);
          const attempted = fb ? `${fb.sheet === "" ? "" : ""}${fb.addr}: ${fb.formula ?? fb.actual ?? ""}${fb.formula && fb.actual ? " → " + fb.actual : ""}` : "";
          const rec: MistakeRec = idx >= 0 ? { ...mistakes[idx], at: now, attempts: mistakes[idx].attempts + 1, attempted: attempted || mistakes[idx].attempted } : {
            id: uid(), exerciseId: ex.id, lessonId: ex.lessonId, topic, tag, at: now, attempted, expected: fb?.expected ?? "", explanation: fb ? `${fb.message}${fb.hint ? " " + fb.hint : ""}` : TAG_LABEL[tag], attempts: 1, resolved: false,
          };
          if (idx >= 0) mistakes[idx] = rec;
          else mistakes.unshift(rec);
        }
      } else {
        // a successful retry resolves earlier mistakes for this exercise (and only then)
        mistakes = mistakes.map((m) => (m.exerciseId === ex.id && !m.resolved ? { ...m, resolved: true, resolvedAt: now } : m));
      }
      const day = todayKey();
      const act = s.activity[day] ?? { attempts: 0, passes: 0 };
      return {
        ...s, mistakes, attempts: [attempt, ...s.attempts].slice(0, 2000),
        exercises: { ...s.exercises, [ex.id]: next },
        activity: { ...s.activity, [day]: { attempts: act.attempts + 1, passes: act.passes + (result.passed && !wasPassed ? 1 : 0) } },
        settings: { ...s.settings, onboarded: true },
      };
    });
  },
  recordQuiz(r: Omit<QuizResult, "id" | "at">) {
    update((s) => ({ ...s, quizzes: [{ ...r, id: uid(), at: new Date().toISOString() }, ...s.quizzes] }));
  },
  addImport(rec: Omit<ImportRecord, "id" | "at">) {
    update((s) => ({ ...s, imports: [{ ...rec, id: uid(), at: new Date().toISOString() }, ...s.imports] }));
  },
  setTheme(theme: AppState["settings"]["theme"]) {
    update((s) => ({ ...s, settings: { ...s.settings, theme } }));
  },
  setSidebar(collapsed: boolean) {
    update((s) => ({ ...s, settings: { ...s.settings, sidebarCollapsed: collapsed } }));
  },
  setName(name: string) {
    update((s) => ({ ...s, displayName: name.trim() || "Learner" }));
  },
  /** Record a successful demo sign-in. Never pass or persist a password. */
  signIn(email: string, displayName: string) {
    update((s) => ({
      ...s,
      auth: { signedIn: true, email },
      displayName,
      settings: { ...s.settings, onboarded: true },
    }));
  },
  /** Clear the demo gate only. Learning progress is left untouched. */
  signOut() {
    update((s) => ({ ...s, auth: { signedIn: false, email: null } }));
  },
  completeOnboarding() {
    update((s) => ({ ...s, settings: { ...s.settings, onboarded: true } }));
  },
  resetAll() {
    state = fresh();
    emit();
  },
  exportJson() {
    const { auth, ...rest } = state;
    return JSON.stringify({ ...rest, auth: { signedIn: auth.signedIn, email: auth.email } }, null, 2);
  },
};

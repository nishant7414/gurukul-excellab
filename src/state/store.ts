import { useSyncExternalStore } from "react";
import type { WorkbookData } from "../engine/types";
import type { WorkbookDelta } from "./delta";
import type { CheckResult, Exercise, MistakeTag } from "../learning/types";
import { TAG_LABEL } from "../learning/types";
import type { GoogleSheetAssignment } from "../sheets/catalog";
import {
  applyExportToRoot,
  buildExport,
  emptyProfile,
  emptyRoot,
  isNewerRoot,
  loadRoot,
  parsePersistedRoot,
  parseProgressExport,
  profileOwnerFromAuth,
  saveRoot,
  SCHEMA,
  STORAGE_KEY,
  type PersistedRoot,
  type ProfileData,
  type ProgressExport,
} from "./persist";

function profileHasWork(p: ProfileData): boolean {
  return p.attempts.length > 0
    || Object.values(p.exercises).some((e) => (e.attempts ?? 0) > 0 || e.passed)
    || Object.keys(p.practiceWorkbooks).length > 0;
}

function rekeyPractice(recs: Record<string, PracticeWorkbook>, owner: string): Record<string, PracticeWorkbook> {
  const out: Record<string, PracticeWorkbook> = {};
  for (const rec of Object.values(recs)) {
    out[practiceKey(owner, rec.exerciseId)] = { ...rec, owner };
  }
  return out;
}
import { broadcastState, startStateSync } from "./sync";

export interface PracticeWorkbook {
  exerciseId: string;
  owner: string;
  url: string;
  at: string;
}

export function practiceOwner(s: { auth: DemoAuth; userId: string; owner?: string }): string {
  return (s.auth.email ?? s.owner ?? s.userId).toLowerCase();
}
export function practiceKey(owner: string, exerciseId: string): string {
  return `${owner}::${exerciseId}`;
}

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
/** Frontend-only GG ID gate. Never store a password here. This is not secure authentication. */
export interface DemoAuth {
  signedIn: boolean;
  email: string | null;
}

export type PersistStatus = "idle" | "loading" | "saving" | "saved" | "error";

export interface AppState {
  version: 2;
  schema: 2;
  updatedAt: string;
  writeSeq: number;
  owner: string;
  userId: string;
  displayName: string;
  createdAt: string;
  /** GG ID gate only. Persisted as signedIn + email; anyone can edit localStorage. Not real auth. */
  auth: DemoAuth;
  exercises: Record<string, ExerciseProgress>;
  attempts: AttemptRec[];
  mistakes: MistakeRec[];
  quizzes: QuizResult[];
  activity: Record<string, { attempts: number; passes: number }>;
  imports: ImportRecord[];
  /** Per-profile Google Sheets practice URLs saved in this browser. Not server-side and not Google-secured. */
  practiceWorkbooks: Record<string, PracticeWorkbook>;
  settings: {
    theme: "light" | "dark" | "system";
    sidebarCollapsed: boolean;
    onboarded: boolean;
    googleSheets: Record<string, GoogleSheetAssignment>;
  };
  persistStatus: PersistStatus;
  persistMessage?: string;
}

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function snapshotProfile(s: AppState): ProfileData {
  return {
    owner: s.owner,
    userId: s.userId,
    displayName: s.displayName,
    createdAt: s.createdAt,
    exercises: s.exercises,
    attempts: s.attempts,
    mistakes: s.mistakes,
    quizzes: s.quizzes,
    activity: s.activity,
    imports: s.imports,
    practiceWorkbooks: s.practiceWorkbooks,
    onboarded: s.settings.onboarded,
  };
}

function flatten(root: PersistedRoot, persistStatus: PersistStatus = "idle", persistMessage?: string): AppState {
  const owner = root.activeOwner;
  const p = root.profiles[owner] ?? emptyProfile(owner);
  return {
    version: 2,
    schema: SCHEMA,
    updatedAt: root.updatedAt,
    writeSeq: root.writeSeq,
    owner,
    userId: p.userId,
    displayName: p.displayName,
    createdAt: p.createdAt,
    auth: root.auth,
    exercises: p.exercises,
    attempts: p.attempts,
    mistakes: p.mistakes,
    quizzes: p.quizzes,
    activity: p.activity,
    imports: p.imports,
    practiceWorkbooks: p.practiceWorkbooks,
    settings: {
      theme: root.settings.theme,
      sidebarCollapsed: root.settings.sidebarCollapsed,
      onboarded: p.onboarded,
      googleSheets: root.settings.googleSheets,
    },
    persistStatus,
    persistMessage,
  };
}

let root: PersistedRoot = loadRoot();
let state: AppState = flatten(root);
export let persistError = null as string | null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist(nextRoot: PersistedRoot, status: PersistStatus = "saved") {
  root = nextRoot;
  try {
    saveRoot(root);
    persistError = null;
    state = flatten(root, status);
    if (typeof window !== "undefined") broadcastState(JSON.stringify(root));
  } catch (e) {
    persistError = `Progress could not be saved in this browser (${e instanceof Error ? e.message : "storage error"}).`;
    state = flatten(root, "error", persistError);
  }
  notify();
}

function update(f: (s: AppState) => AppState) {
  const next = f(state);
  const nextRoot: PersistedRoot = {
    version: 2,
    schema: SCHEMA,
    updatedAt: new Date().toISOString(),
    writeSeq: root.writeSeq + 1,
    activeOwner: next.owner,
    auth: next.auth,
    profiles: { ...root.profiles, [next.owner]: snapshotProfile(next) },
    settings: {
      theme: next.settings.theme,
      sidebarCollapsed: next.settings.sidebarCollapsed,
      googleSheets: next.settings.googleSheets,
    },
  };
  persist(nextRoot);
}

export const getState = () => state;
export function getRoot(): PersistedRoot {
  return root;
}
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

export function usePersistStatus() {
  const status = useStore((s) => s.persistStatus);
  const message = useStore((s) => s.persistMessage);
  const updatedAt = useStore((s) => s.updatedAt);
  return { status, message, updatedAt };
}

function applyRemoteRaw(raw: string): boolean {
  try {
    const incoming = parsePersistedRoot(JSON.parse(raw));
    if (!incoming) return false;
    if (!isNewerRoot(incoming, root)) return false;
    root = incoming;
    persistError = null;
    state = flatten(root, "saved");
    notify();
    return true;
  } catch {
    return false;
  }
}

if (typeof window !== "undefined") {
  startStateSync({ storageKey: STORAGE_KEY, applyRaw: applyRemoteRaw });
}

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
          const attempted = fb ? `${fb.addr}: ${fb.formula ?? fb.actual ?? ""}${fb.formula && fb.actual ? " → " + fb.actual : ""}` : "";
          const rec: MistakeRec = idx >= 0 ? { ...mistakes[idx], at: now, attempts: mistakes[idx].attempts + 1, attempted: attempted || mistakes[idx].attempted } : {
            id: uid(), exerciseId: ex.id, lessonId: ex.lessonId, topic, tag, at: now, attempted, expected: fb?.expected ?? "", explanation: fb ? `${fb.message}${fb.hint ? " " + fb.hint : ""}` : TAG_LABEL[tag], attempts: 1, resolved: false,
          };
          if (idx >= 0) mistakes[idx] = rec;
          else mistakes.unshift(rec);
        }
      } else {
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
  setGoogleSheet(exerciseId: string, assignment: GoogleSheetAssignment | null) {
    update((s) => {
      const next = { ...s.settings.googleSheets };
      if (!assignment || !assignment.spreadsheetUrl.trim()) delete next[exerciseId];
      else next[exerciseId] = assignment;
      return { ...s, settings: { ...s.settings, googleSheets: next } };
    });
  },
  setPracticeWorkbook(exerciseId: string, url: string) {
    update((s) => {
      const owner = practiceOwner(s);
      return {
        ...s,
        practiceWorkbooks: {
          ...s.practiceWorkbooks,
          [practiceKey(owner, exerciseId)]: { exerciseId, owner, url, at: new Date().toISOString() },
        },
      };
    });
  },
  clearPracticeWorkbook(exerciseId: string) {
    update((s) => {
      const next = { ...s.practiceWorkbooks };
      delete next[practiceKey(practiceOwner(s), exerciseId)];
      return { ...s, practiceWorkbooks: next };
    });
  },
  setSidebar(collapsed: boolean) {
    update((s) => ({ ...s, settings: { ...s.settings, sidebarCollapsed: collapsed } }));
  },
  setName(name: string) {
    update((s) => ({ ...s, displayName: name.trim() || "Learner" }));
  },
  /** Record a successful GG ID sign-in. Never pass or persist a password. Switches to that profile's local data. */
  signIn(email: string, displayName: string) {
    const owner = email.toLowerCase();
    const current = snapshotProfile(state);
    const existing = root.profiles[owner];
    const destEmpty = !existing || !profileHasWork(existing);
    const adoptGuest = !state.auth.signedIn && destEmpty && profileHasWork(current) && current.owner !== owner;
    const kept: PersistedRoot = {
      ...root,
      profiles: { ...root.profiles, [state.owner]: current },
      updatedAt: new Date().toISOString(),
      writeSeq: root.writeSeq + 1,
    };
    if (adoptGuest) {
      kept.profiles[owner] = {
        ...current,
        owner,
        displayName: displayName || current.displayName,
        practiceWorkbooks: rekeyPractice(current.practiceWorkbooks, owner),
      };
      delete kept.profiles[current.owner];
    } else if (existing) {
      kept.profiles[owner] = { ...existing, displayName: displayName || existing.displayName };
    } else {
      kept.profiles[owner] = emptyProfile(owner, { userId: `local-${uid()}`, displayName, createdAt: new Date().toISOString() });
    }
    kept.activeOwner = owner;
    kept.auth = { signedIn: true, email };
    persist(kept);
  },
  /** Clear the GG ID gate only. The current profile stays loaded so the same person can sign back in; a different GG ID loads a different profile. */
  signOut() {
    update((s) => ({ ...s, auth: { signedIn: false, email: null } }));
  },
  completeOnboarding() {
    update((s) => ({ ...s, settings: { ...s.settings, onboarded: true } }));
  },
  resetAll() {
    const next = emptyRoot();
    next.writeSeq = root.writeSeq + 1;
    persist(next);
  },
  resetCurrentProfile() {
    const owner = state.owner;
    const blank = emptyProfile(owner, { userId: state.userId, displayName: state.displayName, createdAt: state.createdAt });
    persist({
      ...root,
      updatedAt: new Date().toISOString(),
      writeSeq: root.writeSeq + 1,
      profiles: { ...root.profiles, [owner]: blank },
      auth: state.auth,
      activeOwner: owner,
    });
  },
  exportJson() {
    return JSON.stringify(buildExport(root, state.owner), null, 2);
  },
  parseImport(raw: string) {
    return parseProgressExport(raw);
  },
  importProgress(data: ProgressExport, replaceGoogleSheets = true) {
    persist(applyExportToRoot(root, data, replaceGoogleSheets));
  },
};

export { STORAGE_KEY, SCHEMA, profileOwnerFromAuth };
export type { ProgressExport };

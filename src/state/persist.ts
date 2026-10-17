import type { GoogleSheetAssignment } from "../sheets/catalog";
import { inspectSheetsUrl } from "../sheets/urls";
import type { AttemptRec, DemoAuth, ExerciseProgress, ImportRecord, MistakeRec, PracticeWorkbook, QuizResult } from "./store";

export const SCHEMA = 2;
export const STORAGE_KEY = "excelgym.state.v2";
export const LEGACY_KEY = "excelgym.state.v1";
export const EXPORT_KIND = "gurukul-excellab-progress";
export const EXPORT_NOTICE =
  "This file is a local Gurukul ExcelLab backup from one browser. It is not cross-device sync and a GG ID is not secure identity.";

export interface ProfileData {
  owner: string;
  userId: string;
  displayName: string;
  createdAt: string;
  exercises: Record<string, ExerciseProgress>;
  attempts: AttemptRec[];
  mistakes: MistakeRec[];
  quizzes: QuizResult[];
  activity: Record<string, { attempts: number; passes: number }>;
  imports: ImportRecord[];
  practiceWorkbooks: Record<string, PracticeWorkbook>;
  onboarded: boolean;
}

export interface SharedSettings {
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  googleSheets: Record<string, GoogleSheetAssignment>;
}

export interface PersistedRoot {
  version: 2;
  schema: 2;
  updatedAt: string;
  writeSeq: number;
  activeOwner: string;
  auth: DemoAuth;
  profiles: Record<string, ProfileData>;
  settings: SharedSettings;
}

export interface ProgressExport {
  kind: typeof EXPORT_KIND;
  schema: 2;
  exportedAt: string;
  owner: string;
  notice: string;
  profile: ProfileData;
  googleSheets: Record<string, GoogleSheetAssignment>;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function profileOwnerFromAuth(auth: DemoAuth, userId: string): string {
  return (auth.email ?? userId).toLowerCase();
}

export function emptyProfile(owner: string, extras?: Partial<ProfileData>): ProfileData {
  return {
    owner,
    userId: extras?.userId ?? `local-${owner}`,
    displayName: extras?.displayName ?? "Learner",
    createdAt: extras?.createdAt ?? new Date().toISOString(),
    exercises: extras?.exercises ?? {},
    attempts: extras?.attempts ?? [],
    mistakes: extras?.mistakes ?? [],
    quizzes: extras?.quizzes ?? [],
    activity: extras?.activity ?? {},
    imports: extras?.imports ?? [],
    practiceWorkbooks: extras?.practiceWorkbooks ?? {},
    onboarded: extras?.onboarded ?? false,
  };
}

export function emptyRoot(now = new Date().toISOString()): PersistedRoot {
  const userId = `local-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const owner = userId.toLowerCase();
  return {
    version: 2,
    schema: SCHEMA,
    updatedAt: now,
    writeSeq: 0,
    activeOwner: owner,
    auth: { signedIn: false, email: null },
    profiles: { [owner]: emptyProfile(owner, { userId, createdAt: now }) },
    settings: { theme: "system", sidebarCollapsed: false, googleSheets: {} },
  };
}

function sanitizeAuth(raw: unknown): DemoAuth {
  const a = isObj(raw) ? raw : {};
  return {
    signedIn: !!a.signedIn,
    email: isStr(a.email) ? a.email : null,
  };
}

function sanitizeAssignment(raw: unknown): GoogleSheetAssignment | null {
  if (!isObj(raw) || !isStr(raw.spreadsheetUrl)) return null;
  const spreadsheetUrl = raw.spreadsheetUrl.trim();
  if (!spreadsheetUrl) return null;
  const checked = inspectSheetsUrl(spreadsheetUrl);
  if (!checked.ok) return null;
  const embedUrl = isStr(raw.embedUrl) && raw.embedUrl.trim() ? raw.embedUrl.trim() : undefined;
  if (embedUrl && !inspectSheetsUrl(embedUrl).ok) return null;
  const fallbackUrl = isStr(raw.fallbackUrl) && raw.fallbackUrl.trim() ? raw.fallbackUrl.trim() : undefined;
  if (fallbackUrl && !inspectSheetsUrl(fallbackUrl).ok) return null;
  return {
    title: isStr(raw.title) ? raw.title : undefined,
    description: isStr(raw.description) ? raw.description : undefined,
    spreadsheetUrl,
    embedUrl,
    fallbackUrl,
    mode: raw.mode === "open-in-sheets" ? "open-in-sheets" : "embedded-view",
  };
}

function sanitizeGoogleSheets(raw: unknown): Record<string, GoogleSheetAssignment> {
  if (!isObj(raw)) return {};
  const out: Record<string, GoogleSheetAssignment> = {};
  for (const [id, v] of Object.entries(raw)) {
    const a = sanitizeAssignment(v);
    if (a) out[id] = a;
  }
  return out;
}

function sanitizeProgress(raw: unknown): Record<string, ExerciseProgress> {
  if (!isObj(raw)) return {};
  const out: Record<string, ExerciseProgress> = {};
  for (const [id, v] of Object.entries(raw)) {
    if (!isObj(v)) continue;
    out[id] = {
      attempts: isNum(v.attempts) ? v.attempts : 0,
      passed: !!v.passed,
      passedAt: isStr(v.passedAt) ? v.passedAt : undefined,
      assisted: !!v.assisted,
      hintsUsed: isNum(v.hintsUsed) ? v.hintsUsed : 0,
      solutionViewed: !!v.solutionViewed,
      bestCorrect: isNum(v.bestCorrect) ? v.bestCorrect : 0,
      lastTotal: isNum(v.lastTotal) ? v.lastTotal : 0,
      workbook: isObj(v.workbook) ? v.workbook as unknown as ExerciseProgress["workbook"] : undefined,
      delta: isObj(v.delta) ? v.delta as unknown as ExerciseProgress["delta"] : undefined,
      lastAt: isStr(v.lastAt) ? v.lastAt : undefined,
      answers: isObj(v.answers) ? v.answers as Record<string, number> : undefined,
      lastResultSummary: isStr(v.lastResultSummary) ? v.lastResultSummary : undefined,
    };
  }
  return out;
}

function sanitizePractice(raw: unknown, fallbackOwner: string): Record<string, PracticeWorkbook> {
  if (!isObj(raw)) return {};
  const out: Record<string, PracticeWorkbook> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isObj(v) || !isStr(v.exerciseId) || !isStr(v.url)) continue;
    const url = inspectSheetsUrl(v.url);
    if (!url.ok) continue;
    const owner = (isStr(v.owner) ? v.owner : fallbackOwner).toLowerCase();
    out[k] = { exerciseId: v.exerciseId, owner, url: url.openUrl, at: isStr(v.at) ? v.at : new Date().toISOString() };
  }
  return out;
}

function sanitizeProfile(raw: unknown, fallbackOwner: string): ProfileData | null {
  if (!isObj(raw)) return null;
  const owner = (isStr(raw.owner) ? raw.owner : fallbackOwner).toLowerCase();
  return {
    owner,
    userId: isStr(raw.userId) ? raw.userId : `local-${owner}`,
    displayName: isStr(raw.displayName) && raw.displayName.trim() ? raw.displayName.trim().slice(0, 40) : "Learner",
    createdAt: isStr(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
    exercises: sanitizeProgress(raw.exercises),
    attempts: Array.isArray(raw.attempts) ? raw.attempts.filter(isObj) as unknown as AttemptRec[] : [],
    mistakes: Array.isArray(raw.mistakes) ? raw.mistakes.filter(isObj) as unknown as MistakeRec[] : [],
    quizzes: Array.isArray(raw.quizzes) ? raw.quizzes.filter(isObj) as unknown as QuizResult[] : [],
    activity: isObj(raw.activity) ? raw.activity as ProfileData["activity"] : {},
    imports: Array.isArray(raw.imports) ? raw.imports.filter(isObj) as unknown as ImportRecord[] : [],
    practiceWorkbooks: sanitizePractice(raw.practiceWorkbooks, owner),
    onboarded: !!raw.onboarded,
  };
}

export function isNewerRoot(incoming: Pick<PersistedRoot, "writeSeq" | "updatedAt">, current: Pick<PersistedRoot, "writeSeq" | "updatedAt">): boolean {
  if (incoming.writeSeq > current.writeSeq) return true;
  if (incoming.writeSeq < current.writeSeq) return false;
  return incoming.updatedAt > current.updatedAt;
}

export function parsePersistedRoot(raw: unknown): PersistedRoot | null {
  if (!isObj(raw)) return null;
  if (raw.version === 1 || (raw.version === undefined && isObj(raw.exercises))) return migrateV1(raw);
  if (raw.version !== 2 && raw.schema !== 2) return null;
  const auth = sanitizeAuth(raw.auth);
  const settingsRaw = isObj(raw.settings) ? raw.settings : {};
  const profilesIn = isObj(raw.profiles) ? raw.profiles : null;
  const profiles: Record<string, ProfileData> = {};
  if (profilesIn) {
    for (const [k, v] of Object.entries(profilesIn)) {
      const p = sanitizeProfile(v, k);
      if (p) profiles[p.owner] = p;
    }
  }
  const fallbackOwner = profileOwnerFromAuth(auth, isStr(raw.userId) ? raw.userId : "local-guest");
  if (!Object.keys(profiles).length) {
    const migrated = migrateV1(raw);
    return migrated;
  }
  const activeOwner = (isStr(raw.activeOwner) ? raw.activeOwner : fallbackOwner).toLowerCase();
  if (!profiles[activeOwner]) profiles[activeOwner] = emptyProfile(activeOwner);
  return {
    version: 2,
    schema: SCHEMA,
    updatedAt: isStr(raw.updatedAt) ? raw.updatedAt : new Date().toISOString(),
    writeSeq: isNum(raw.writeSeq) ? raw.writeSeq : 0,
    activeOwner,
    auth,
    profiles,
    settings: {
      theme: settingsRaw.theme === "light" || settingsRaw.theme === "dark" || settingsRaw.theme === "system" ? settingsRaw.theme : "system",
      sidebarCollapsed: !!settingsRaw.sidebarCollapsed,
      googleSheets: sanitizeGoogleSheets(settingsRaw.googleSheets),
    },
  };
}

export function migrateV1(raw: Record<string, unknown>): PersistedRoot {
  const auth = sanitizeAuth(raw.auth);
  const userId = isStr(raw.userId) ? raw.userId : `local-${Date.now().toString(36)}`;
  const owner = profileOwnerFromAuth(auth, userId);
  const settingsRaw = isObj(raw.settings) ? raw.settings : {};
  const allPractice = sanitizePractice(raw.practiceWorkbooks, owner);
  const mine: Record<string, PracticeWorkbook> = {};
  for (const [k, rec] of Object.entries(allPractice)) {
    if (rec.owner === owner) mine[k] = rec;
  }
  const profile = emptyProfile(owner, {
    userId,
    displayName: isStr(raw.displayName) && raw.displayName.trim() ? raw.displayName.trim().slice(0, 40) : "Learner",
    createdAt: isStr(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
    exercises: sanitizeProgress(raw.exercises),
    attempts: Array.isArray(raw.attempts) ? raw.attempts.filter(isObj) as unknown as AttemptRec[] : [],
    mistakes: Array.isArray(raw.mistakes) ? raw.mistakes.filter(isObj) as unknown as MistakeRec[] : [],
    quizzes: Array.isArray(raw.quizzes) ? raw.quizzes.filter(isObj) as unknown as QuizResult[] : [],
    activity: isObj(raw.activity) ? raw.activity as ProfileData["activity"] : {},
    imports: Array.isArray(raw.imports) ? raw.imports.filter(isObj) as unknown as ImportRecord[] : [],
    practiceWorkbooks: mine,
    onboarded: isObj(settingsRaw) ? !!settingsRaw.onboarded : false,
  });
  return {
    version: 2,
    schema: SCHEMA,
    updatedAt: new Date().toISOString(),
    writeSeq: 1,
    activeOwner: owner,
    auth,
    profiles: { [owner]: profile },
    settings: {
      theme: settingsRaw.theme === "light" || settingsRaw.theme === "dark" || settingsRaw.theme === "system" ? settingsRaw.theme : "system",
      sidebarCollapsed: !!settingsRaw.sidebarCollapsed,
      googleSheets: sanitizeGoogleSheets(settingsRaw.googleSheets),
    },
  };
}

export function loadRoot(): PersistedRoot {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = parsePersistedRoot(JSON.parse(current));
      if (parsed) return parsed;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = parsePersistedRoot(JSON.parse(legacy));
      if (parsed) return parsed;
    }
  } catch {
    /* malformed storage is discarded */
  }
  return emptyRoot();
}

export function saveRoot(root: PersistedRoot): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
}

export function buildExport(root: PersistedRoot, owner = root.activeOwner): ProgressExport {
  const profile = root.profiles[owner] ?? emptyProfile(owner);
  return {
    kind: EXPORT_KIND,
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    owner,
    notice: EXPORT_NOTICE,
    profile,
    googleSheets: root.settings.googleSheets,
  };
}

export type ImportResult = { ok: true; data: ProgressExport } | { ok: false; error: string };

export function parseProgressExport(raw: unknown): ImportResult {
  if (isStr(raw)) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ok: false, error: "That file is not valid JSON." };
    }
  }
  if (!isObj(raw)) return { ok: false, error: "That file does not contain a progress object." };

  if (raw.kind === EXPORT_KIND) {
    if (raw.schema !== 2) return { ok: false, error: "This progress file uses an unsupported schema." };
    const owner = isStr(raw.owner) ? raw.owner.toLowerCase() : "";
    const profile = sanitizeProfile(raw.profile, owner);
    if (!owner || !profile) return { ok: false, error: "The progress profile in that file is missing or malformed." };
    return {
      ok: true,
      data: {
        kind: EXPORT_KIND,
        schema: 2,
        exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : new Date().toISOString(),
        owner,
        notice: isStr(raw.notice) ? raw.notice : EXPORT_NOTICE,
        profile: { ...profile, owner },
        googleSheets: sanitizeGoogleSheets(raw.googleSheets),
      },
    };
  }

  if (raw.version === 1 || raw.version === 2 || isObj(raw.exercises)) {
    const migrated = parsePersistedRoot(raw);
    if (!migrated) return { ok: false, error: "That JSON looks like old progress but could not be read." };
    return { ok: true, data: buildExport(migrated) };
  }

  return { ok: false, error: "That file is not a Gurukul ExcelLab progress export." };
}

export function applyExportToRoot(root: PersistedRoot, data: ProgressExport, replaceGoogleSheets: boolean): PersistedRoot {
  const owner = root.activeOwner;
  const incoming = { ...data.profile, owner };
  return {
    ...root,
    updatedAt: new Date().toISOString(),
    writeSeq: root.writeSeq + 1,
    profiles: { ...root.profiles, [owner]: incoming },
    settings: {
      ...root.settings,
      googleSheets: replaceGoogleSheets ? { ...root.settings.googleSheets, ...data.googleSheets } : root.settings.googleSheets,
    },
  };
}


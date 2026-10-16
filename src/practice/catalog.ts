import { CHALLENGES, CHALLENGE_EXERCISES } from "../content/ex-challenges";
import { DATASET_BY_ID } from "../datasets/registry";
import type { Dataset, Tier } from "../datasets/types";
import type { AppState, ExerciseProgress } from "../state/store";
import { CONCEPT_BY_ID, PRACTICE_CONCEPTS } from "./concepts";
import { PRACTICE } from "./registry";

/**
 * One list for every challenge in the app: the six original challenges (CH-1..CH-6, unchanged) and the dataset-driven practice
 * challenges (PC-*). Only metadata is read here; dataset rows are generated when a challenge is opened.
 */
export type ChallengeSource = "original" | "additional";

export interface CatalogEntry {
  id: string;
  title: string;
  exerciseId: string;
  concept: string;
  conceptTitle: string;
  tier: Tier;
  datasetIds: string[];
  /** primary dataset (its sheet is the one that opens first) */
  primary: Dataset;
  rows: number;
  cols: number;
  minutes: number;
  skill: string;
  multiTable: boolean;
  /** relies on a sheet tool that is a simulation (sort/filter dialogs, dynamic arrays) */
  simulated: boolean;
  source: ChallengeSource;
  /** the six original challenges keep their own dataset records */
  legacy: boolean;
}

const LEGACY_CONCEPT = ["LK", "DC", "LG", "CA", "RF", "DA"];

function legacyEntries(): CatalogEntry[] {
  return CHALLENGES.map((c, i) => {
    const primary = DATASET_BY_ID.get(`DS-LEGACY-CH-${i + 1}`)!;
    const concept = LEGACY_CONCEPT[i];
    return {
      id: c.id, title: c.title, exerciseId: c.exerciseId, concept, conceptTitle: CONCEPT_BY_ID.get(concept)?.title ?? concept,
      tier: primary.tier, datasetIds: [primary.id], primary, rows: primary.rowCount, cols: primary.columns.length, minutes: c.minutes, skill: c.skills.join(", "),
      multiTable: false, simulated: !!CHALLENGE_EXERCISES.find((x) => x.id === c.exerciseId)?.simulationNote, source: "original", legacy: true,
    };
  });
}

function additionalEntries(): CatalogEntry[] {
  return PRACTICE.map((c) => {
    const primary = DATASET_BY_ID.get(c.datasetIds[0])!;
    return {
      id: c.id, title: c.title, exerciseId: c.exerciseId, concept: c.concept, conceptTitle: CONCEPT_BY_ID.get(c.concept)?.title ?? c.concept,
      tier: c.tier, datasetIds: c.datasetIds, primary, rows: primary.rowCount, cols: primary.columns.length, minutes: c.minutes, skill: c.skill,
      multiTable: c.multiTable, simulated: c.simulated, source: "additional", legacy: false,
    };
  });
}

export const CATALOG: CatalogEntry[] = [...legacyEntries(), ...additionalEntries()];
export const CATALOG_BY_ID = new Map(CATALOG.map((e) => [e.id, e]));
export const CATALOG_BY_EXERCISE = new Map(CATALOG.map((e) => [e.exerciseId, e]));

export const TIER_ORDER: Record<Tier, number> = { Easy: 0, Medium: 1, Hard: 2 };

/* ------------------------------ progress views ------------------------------ */
export type Status = "new" | "in-progress" | "completed";

export interface ChallengeStats {
  status: Status;
  attempts: number;
  passed: boolean;
  /** passed after the solution was shown */
  assisted: boolean;
  bestCorrect: number;
  total: number;
  hintsUsed: number;
  lastAt?: string;
}

export function statsOf(p: ExerciseProgress | undefined): ChallengeStats {
  const attempts = p?.attempts ?? 0;
  return {
    status: p?.passed ? "completed" : attempts > 0 ? "in-progress" : "new",
    attempts, passed: !!p?.passed, assisted: !!p?.assisted, bestCorrect: p?.bestCorrect ?? 0, total: p?.lastTotal ?? 0, hintsUsed: p?.hintsUsed ?? 0, lastAt: p?.lastAt,
  };
}

export const statsFor = (e: CatalogEntry, s: Pick<AppState, "exercises">): ChallengeStats => statsOf(s.exercises[e.exerciseId]);

export interface ConceptProgress {
  concept: string;
  title: string;
  total: number;
  passed: number;
  /** passed without the solution being shown */
  unassisted: number;
  /** mastered = at least 80% of the concept's challenges passed without the solution (and at least 3 passed) */
  mastered: boolean;
}

export const MASTERY_SHARE = 0.8;

export function conceptProgress(s: Pick<AppState, "exercises">): ConceptProgress[] {
  return PRACTICE_CONCEPTS.map((c) => {
    const list = CATALOG.filter((e) => e.concept === c.id);
    const stats = list.map((e) => statsFor(e, s));
    const passed = stats.filter((x) => x.passed).length;
    const unassisted = stats.filter((x) => x.passed && !x.assisted).length;
    return { concept: c.id, title: c.title, total: list.length, passed, unassisted, mastered: list.length > 0 && unassisted >= 3 && unassisted / list.length >= MASTERY_SHARE };
  }).filter((c) => c.total > 0);
}

/* ------------------------------ try another dataset ------------------------------ */
/**
 * The same concept practised on a different dataset. This only chooses where to go next: it never touches saved work or progress.
 * Deterministic: candidates that do not share a dataset with the current challenge are ranked (not yet completed first, then
 * nearest difficulty, then catalogue order starting after the current challenge), so the same state always gives the same answer.
 */
export function anotherDataset(current: CatalogEntry, s: Pick<AppState, "exercises">, count = 3): CatalogEntry[] {
  const same = CATALOG.filter((e) => e.concept === current.concept);
  const at = same.findIndex((e) => e.id === current.id);
  const used = new Set(current.datasetIds);
  const cand = same.filter((e) => e.id !== current.id && !e.datasetIds.some((d) => used.has(d)));
  return cand
    .map((e) => ({ e, order: (same.indexOf(e) - at + same.length) % same.length }))
    .sort((a, b) => {
      const da = statsFor(a.e, s).passed ? 1 : 0, db = statsFor(b.e, s).passed ? 1 : 0;
      return da - db || Math.abs(TIER_ORDER[a.e.tier] - TIER_ORDER[current.tier]) - Math.abs(TIER_ORDER[b.e.tier] - TIER_ORDER[current.tier]) || a.order - b.order;
    })
    .slice(0, count)
    .map((x) => x.e);
}

/* ------------------------------ filtering ------------------------------ */
export interface Filters {
  tier: Tier | "all";
  concept: string | "all";
  category: string | "all";
  completion: "all" | "completed" | "incomplete";
  source: "all" | ChallengeSource;
  text: string;
}
export const NO_FILTERS: Filters = { tier: "all", concept: "all", category: "all", completion: "all", source: "all", text: "" };

export function filterCatalog(list: CatalogEntry[], f: Filters, s: Pick<AppState, "exercises">): CatalogEntry[] {
  const t = f.text.trim().toLowerCase();
  return list.filter((e) => {
    if (f.tier !== "all" && e.tier !== f.tier) return false;
    if (f.concept !== "all" && e.concept !== f.concept) return false;
    if (f.category !== "all" && !e.datasetIds.some((d) => DATASET_BY_ID.get(d)?.category === f.category)) return false;
    if (f.source !== "all" && e.source !== f.source) return false;
    if (f.completion !== "all") {
      const done = statsFor(e, s).passed;
      if (f.completion === "completed" ? !done : done) return false;
    }
    if (t && !`${e.title} ${e.skill} ${e.primary.title} ${e.conceptTitle}`.toLowerCase().includes(t)) return false;
    return true;
  });
}

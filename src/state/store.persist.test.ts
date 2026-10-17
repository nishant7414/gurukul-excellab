// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { EXERCISE_BY_ID } from "../content/registry";
import { applySolution, checkExercise } from "../learning/checker";
import { EXPORT_KIND, STORAGE_KEY, type PersistedRoot } from "./persist";
import { actions, getRoot, getState } from "./store";

beforeEach(() => {
  localStorage.clear();
  actions.resetAll();
});

describe("local progress persistence", () => {
  it("reloads the same profile after a simulated refresh", () => {
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.signIn("ada@example.com", "Ada");
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "t");
    expect(getState().exercises[ex.id]?.passed).toBe(true);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as PersistedRoot;
    expect(parsed.schema).toBe(2);
    expect(parsed.profiles["ada@example.com"]?.exercises[ex.id]?.passed).toBe(true);
  });

  it("exports and imports with confirmation-shaped validation", () => {
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.signIn("ada@example.com", "Ada");
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "t");
    const json = actions.exportJson();
    const parsed = actions.parseImport(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.kind).toBe(EXPORT_KIND);
    actions.resetCurrentProfile();
    expect(getState().exercises[ex.id]?.passed).toBeFalsy();
    actions.importProgress(parsed.data);
    expect(getState().exercises[ex.id]?.passed).toBe(true);
  });

  it("rejects a malformed import", () => {
    const bad = actions.parseImport("{\"nope\":true}");
    expect(bad.ok).toBe(false);
  });
});

describe("unsigned progress adoption", () => {
  it("moves unsigned local work onto the first GG ID and does not copy it to a second ID", () => {
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "t");
    expect(getState().attempts.length).toBeGreaterThan(0);
    actions.signIn("ada@example.com", "Ada");
    expect(getState().owner).toBe("ada@example.com");
    expect(getState().exercises[ex.id]?.passed).toBe(true);
    actions.signIn("ben@example.com", "Ben");
    expect(getState().exercises[ex.id]?.passed).toBeFalsy();
    actions.signIn("ada@example.com", "Ada");
    expect(getState().exercises[ex.id]?.passed).toBe(true);
  });
});

describe("reset is not undone by an older snapshot", () => {
  it("keeps a reset when a previous tab write is replayed", () => {
    actions.signIn("ada@example.com", "Ada");
    const previous = JSON.parse(JSON.stringify(getRoot())) as PersistedRoot;
    actions.resetAll();
    expect(getState().auth.signedIn).toBe(false);
    window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: JSON.stringify(previous),
      storageArea: localStorage,
    }));
    expect(getState().auth.signedIn).toBe(false);
  });
});

describe("multi-tab sync", () => {
  it("applies a newer snapshot from another tab and ignores an older one", () => {
    actions.signIn("ada@example.com", "Ada");
    const current = getRoot();
    const newer: PersistedRoot = {
      ...JSON.parse(JSON.stringify(current)),
      writeSeq: current.writeSeq + 5,
      updatedAt: "2099-01-01T00:00:00.000Z",
    };
    newer.profiles[newer.activeOwner] = {
      ...newer.profiles[newer.activeOwner]!,
      displayName: "From other tab",
    };
    const raw = JSON.stringify(newer);
    localStorage.setItem(STORAGE_KEY, raw);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: raw, storageArea: localStorage }));
    expect(getState().displayName).toBe("From other tab");

    const older: PersistedRoot = { ...newer, writeSeq: 0, updatedAt: "2000-01-01T00:00:00.000Z" };
    older.profiles[older.activeOwner] = { ...older.profiles[older.activeOwner]!, displayName: "Stale" };
    const stale = JSON.stringify(older);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: stale, storageArea: localStorage }));
    expect(getState().displayName).toBe("From other tab");
  });
});

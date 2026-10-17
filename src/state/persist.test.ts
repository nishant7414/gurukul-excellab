import { describe, expect, it } from "vitest";
import {
  applyExportToRoot,
  buildExport,
  emptyRoot,
  EXPORT_KIND,
  isNewerRoot,
  migrateV1,
  parsePersistedRoot,
  parseProgressExport,
} from "./persist";

describe("schema migration", () => {
  it("migrates a v1 blob onto a named profile", () => {
    const v1 = {
      version: 1,
      userId: "local-old",
      displayName: "GG Student",
      createdAt: "2026-01-01T00:00:00.000Z",
      auth: { signedIn: true, email: "ggstudent@example.com" },
      exercises: { "EX-A2-1": { attempts: 2, passed: true, assisted: false, hintsUsed: 0, solutionViewed: false, bestCorrect: 1, lastTotal: 1 } },
      attempts: [{ id: "a", exerciseId: "EX-A2-1", at: "2026-01-01T00:00:00.000Z", passed: true, correct: 1, total: 1, tags: [], summary: "ok" }],
      mistakes: [],
      quizzes: [],
      activity: { "2026-01-01": { attempts: 2, passes: 1 } },
      imports: [],
      practiceWorkbooks: {
        "ggstudent@example.com::EX-VL-1-1": {
          exerciseId: "EX-VL-1-1",
          owner: "ggstudent@example.com",
          url: "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxPracticeCopy99/edit",
          at: "2026-01-01T00:00:00.000Z",
        },
      },
      settings: { theme: "dark", sidebarCollapsed: true, onboarded: true, googleSheets: {} },
    };
    const root = migrateV1(v1);
    expect(root.version).toBe(2);
    expect(root.schema).toBe(2);
    expect(root.activeOwner).toBe("ggstudent@example.com");
    expect(root.profiles["ggstudent@example.com"]?.exercises["EX-A2-1"]?.passed).toBe(true);
    expect(root.settings.theme).toBe("dark");
    expect(Object.keys(root.profiles["ggstudent@example.com"]!.practiceWorkbooks).length).toBe(1);
  });

  it("discards malformed storage instead of throwing", () => {
    expect(parsePersistedRoot(null)).toBeNull();
    expect(parsePersistedRoot("nope")).toBeNull();
    expect(parsePersistedRoot({ version: 99 })).toBeNull();
    const recovered = parsePersistedRoot({ version: 2, schema: 2, profiles: { "a@x.com": { owner: "a@x.com", exercises: "bad" } }, auth: { signedIn: true, email: "a@x.com" } });
    expect(recovered?.profiles["a@x.com"]?.exercises).toEqual({});
  });
});

describe("newer-write protection", () => {
  it("does not apply an older writeSeq over a newer one", () => {
    expect(isNewerRoot({ writeSeq: 2, updatedAt: "2026-01-02T00:00:00.000Z" }, { writeSeq: 3, updatedAt: "2026-01-01T00:00:00.000Z" })).toBe(false);
    expect(isNewerRoot({ writeSeq: 3, updatedAt: "2026-01-01T00:00:00.000Z" }, { writeSeq: 3, updatedAt: "2026-01-02T00:00:00.000Z" })).toBe(false);
    expect(isNewerRoot({ writeSeq: 4, updatedAt: "2026-01-01T00:00:00.000Z" }, { writeSeq: 3, updatedAt: "2026-01-02T00:00:00.000Z" })).toBe(true);
  });
});

describe("export and import validation", () => {
  it("builds a typed export and rejects junk", () => {
    const root = emptyRoot();
    const exp = buildExport(root);
    expect(exp.kind).toBe(EXPORT_KIND);
    expect(exp.schema).toBe(2);
    expect(parseProgressExport(JSON.stringify(exp)).ok).toBe(true);
    expect(parseProgressExport("{").ok).toBe(false);
    expect(parseProgressExport({ hello: "world" }).ok).toBe(false);
    expect(parseProgressExport({ kind: EXPORT_KIND, schema: 9, owner: "a", profile: {} }).ok).toBe(false);
  });

  it("accepts a legacy v1 export shape", () => {
    const parsed = parseProgressExport({
      version: 1,
      userId: "local-1",
      displayName: "Ada",
      auth: { signedIn: true, email: "ada@example.com" },
      exercises: {},
      attempts: [],
      mistakes: [],
      quizzes: [],
      activity: {},
      imports: [],
      settings: { theme: "system", sidebarCollapsed: false, googleSheets: {} },
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.owner).toBe("ada@example.com");
  });

  it("imports into the active profile only", () => {
    const root = emptyRoot();
    const other = parseProgressExport({
      kind: EXPORT_KIND,
      schema: 2,
      owner: "other@example.com",
      profile: {
        owner: "other@example.com",
        userId: "local-o",
        displayName: "Other",
        createdAt: "2026-01-01T00:00:00.000Z",
        exercises: { "EX-A2-1": { attempts: 1, passed: true, assisted: false, hintsUsed: 0, solutionViewed: false, bestCorrect: 1, lastTotal: 1 } },
        attempts: [],
        mistakes: [],
        quizzes: [],
        activity: {},
        imports: [],
        practiceWorkbooks: {},
        onboarded: true,
      },
      googleSheets: {},
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    const next = applyExportToRoot(root, other.data, false);
    expect(next.profiles[root.activeOwner]?.exercises["EX-A2-1"]?.passed).toBe(true);
    expect(next.activeOwner).toBe(root.activeOwner);
  });
});

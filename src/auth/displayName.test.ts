// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { initialsFromName } from "../brand";
import { displayNameFromEmail } from "./displayName";
import { verifyDemoLogin } from "./accounts";
import { actions, getState, STORAGE_KEY } from "../state/store";
import { EXERCISE_BY_ID } from "../content/registry";
import { applySolution, checkExercise } from "../learning/checker";

describe("displayNameFromEmail", () => {
  it("turns dots, underscores and hyphens into title-cased words", () => {
    expect(displayNameFromEmail("nishant.kumar@example.com")).toBe("Nishant Kumar");
    expect(displayNameFromEmail("nishant_kumar@example.com")).toBe("Nishant Kumar");
    expect(displayNameFromEmail("nishant-kumar@example.com")).toBe("Nishant Kumar");
  });
  it("keeps trailing digits on a single token", () => {
    expect(displayNameFromEmail("nishant7414@example.com")).toBe("Nishant7414");
  });
  it("title-cases a single local part", () => {
    expect(displayNameFromEmail("ggstudent@example.com")).toBe("Ggstudent");
  });
  it("trims whitespace and ignores the domain", () => {
    expect(displayNameFromEmail("  nishant.kumar@Gunvatta.example  ")).toBe("Nishant Kumar");
  });
  it("handles empty or punctuation-only prefixes safely", () => {
    expect(displayNameFromEmail("@example.com")).toBe("Learner");
    expect(displayNameFromEmail("...---@example.com")).toBe("Learner");
    expect(displayNameFromEmail("")).toBe("Learner");
  });
});

describe("initialsFromName", () => {
  it("uses the first letter of the first two words", () => {
    expect(initialsFromName("Nishant Kumar")).toBe("NK");
    expect(initialsFromName("GG Student")).toBe("GS");
  });
  it("falls back to two letters of a single word", () => {
    expect(initialsFromName("Ggstudent")).toBe("GG");
  });
});

describe("verifyDemoLogin", () => {
  it("accepts any email with the shared demo password and derives the name", () => {
    expect(verifyDemoLogin("  nishant.kumar@example.com  ", "QCI@123")).toEqual({
      ok: true, email: "nishant.kumar@example.com", displayName: "Nishant Kumar",
    });
  });
  it("uses the display-name override for the placeholder demo address", () => {
    const ok = verifyDemoLogin("  GGSTUDENT@EXAMPLE.COM  ", "QCI@123");
    expect(ok).toEqual({ ok: true, email: "GGSTUDENT@EXAMPLE.COM", displayName: "GG Student" });
  });
  it("rejects a wrong password without exposing the secret", () => {
    const bad = verifyDemoLogin("ggstudent@example.com", "wrong");
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.toLowerCase()).not.toContain("qci@123");
      expect(bad.error.toLowerCase()).not.toContain("qci123");
    }
  });
});

describe("demo auth store", () => {
  beforeEach(() => { localStorage.clear(); actions.resetAll(); });

  it("keeps the same GG ID's progress across sign-out and never stores a password", () => {
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.signIn("ggstudent@example.com", "GG Student");
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "t");
    const attempts = getState().attempts.length;
    expect(attempts).toBeGreaterThan(0);
    expect(getState().displayName).toBe("GG Student");
    const signedInRaw = localStorage.getItem(STORAGE_KEY) ?? "";
    expect(signedInRaw).toContain("ggstudent@example.com");
    expect(signedInRaw).not.toMatch(/QCI@123/);
    expect(signedInRaw).not.toMatch(/"password"/);
    actions.signOut();
    expect(getState().auth.signedIn).toBe(false);
    expect(getState().attempts.length).toBe(attempts);
    expect(localStorage.getItem(STORAGE_KEY) ?? "").not.toMatch(/QCI@123/);
  });

  it("keeps two GG IDs on the same browser from sharing progress", () => {
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.signIn("alpha@example.com", "Alpha");
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "t");
    expect(getState().exercises[ex.id]?.passed).toBe(true);
    actions.signIn("beta@example.com", "Beta");
    expect(getState().auth.email).toBe("beta@example.com");
    expect(getState().exercises[ex.id]?.passed).toBeFalsy();
    expect(getState().attempts.length).toBe(0);
    actions.signIn("alpha@example.com", "Alpha");
    expect(getState().exercises[ex.id]?.passed).toBe(true);
    expect(getState().attempts.length).toBeGreaterThan(0);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, matchPath } from "react-router-dom";
import * as XLSX from "xlsx";
import { AppRoutes, ROUTE_PATTERNS } from "../App";
import { NAV } from "./Shell";
import { actions, getState } from "../state/store";
import { EXERCISE_BY_ID } from "../content/registry";
import { LESSON_BY_ID } from "../content/lessons";
import { CATALOG, CATALOG_BY_ID } from "../practice/catalog";
import { DATASETS } from "../datasets/registry";
import { QUIZZES } from "../content/quizzes";
import { applySolution, checkExercise } from "../learning/checker";

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  window.confirm = () => true;
  window.matchMedia = window.matchMedia ?? ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as unknown as MediaQueryList);
});
beforeEach(() => {
  localStorage.clear();
  actions.resetAll();
  actions.signIn("ggstudent@example.com", "GG Student");
});
afterEach(() => cleanup());

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);

function linkProblems(): string[] {
  const bad: string[] = [];
  for (const a of Array.from(document.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href")!;
    if (!href.startsWith("/")) continue;
    const [pathOnly] = href.split("?");
    const m = ROUTE_PATTERNS.map((p) => matchPath(p, pathOnly)).find(Boolean);
    if (!m) { bad.push(`${href}: no such route`); continue; }
    const id = m.params.id;
    if (pathOnly.startsWith("/lesson/") && !LESSON_BY_ID.has(id!)) bad.push(`${href}: no such lesson`);
    if (pathOnly.startsWith("/challenges/") && !CATALOG_BY_ID.has(id!)) bad.push(`${href}: no such challenge`);
    if (pathOnly.startsWith("/quizzes/") && !QUIZZES.some((c) => c.id === id)) bad.push(`${href}: no such quiz`);
    const ex = new URLSearchParams(href.split("?")[1] ?? "").get("ex");
    if (ex && !EXERCISE_BY_ID.has(ex)) bad.push(`${href}: no such exercise`);
  }
  return bad;
}

describe("every navigation page", () => {
  for (const n of NAV) {
    it(`${n.label} renders real content with no dead links`, () => {
      at(n.to);
      const h1 = screen.getAllByRole("heading", { level: 1 })[0];
      expect(h1.textContent!.length).toBeGreaterThan(3);
      expect(document.body.textContent).not.toMatch(/Planned, not yet built/);
      expect(document.body.textContent).not.toMatch(/Page not found/);
      expect(linkProblems()).toEqual([]);
    });
  }
  it("the Shell menu links to exactly the fourteen pages", () => {
    expect(NAV.length).toBe(14);
    for (const n of NAV) expect(ROUTE_PATTERNS).toContain(n.to);
  });
  it("an unknown address says so", () => {
    at("/nothing-here");
    expect(document.body.textContent).toContain("Page not found");
  });
});

describe("detail pages have no dead links", () => {
  for (const p of ["/lesson/L-VL-1", "/lesson/A-04", "/challenges/CH-1", "/challenges/PC-LK-01", "/challenges/PC-CS-08", "/challenges?concept=CS", "/quizzes/QZ-1", "/lesson/nope"]) {
    it(p, () => { at(p); expect(linkProblems()).toEqual([]); });
  }
  it("every lesson page renders its three exercise tabs", () => {
    for (const id of LESSON_BY_ID.keys()) {
      cleanup();
      at(`/lesson/${id}`);
      expect(within(screen.getByRole("tablist", { name: "Exercises" })).getAllByRole("tab").length, id).toBe(3);
    }
  });
});

describe("dashboard honesty", () => {
  it("a new learner sees onboarding and 0 progress, not invented numbers", () => {
    at("/");
    expect(document.body.textContent).toContain("Start here");
    expect(document.body.textContent).toMatch(/0\s*\/\s*\d+lesson exercises passed \(0%\)/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome back, GG Student!");
    expect(document.body.textContent).toContain("Gurukul ExcelLab");
    expect(document.body.textContent).not.toMatch(/\bLearner\b/);
  });
  it("uses the name derived from the signed-in email", () => {
    actions.signIn("nishant.kumar@example.com", "Nishant Kumar");
    at("/");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome back, Nishant Kumar!");
    expect(screen.getByRole("button", { name: /account menu for Nishant Kumar/i }).textContent).toMatch(/NK/);
  });
});

describe("demo login", () => {
  beforeEach(() => { actions.resetAll(); });

  it("is the first screen for a signed-out visitor", () => {
    at("/");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Gurukul ExcelLab");
    expect(document.body.textContent).toContain("Powered by Gunvatta Gurukul");
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeTruthy();
    expect(document.body.textContent).toContain("not real authentication");
  });

  it("rejects empty fields and unknown credentials, then opens the dashboard for the demo account", async () => {
    const user = userEvent.setup();
    at("/");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(document.body.textContent).toContain("Enter your GG ID or email");
    await user.type(screen.getByLabelText(/gg id \/ email/i), "nobody@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "nope");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/not recognised/i));
    expect(getState().auth.signedIn).toBe(false);
    expect(JSON.stringify(getState())).not.toMatch(/QCI@123/);
    await user.clear(screen.getByLabelText(/gg id \/ email/i));
    await user.type(screen.getByLabelText(/gg id \/ email/i), "nishant.kumar@example.com");
    await user.clear(screen.getByLabelText(/^password$/i));
    await user.type(screen.getByLabelText(/^password$/i), "QCI@123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() => expect(getState().auth.signedIn).toBe(true));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Welcome back, Nishant Kumar!");
    expect(screen.getByRole("button", { name: /account menu for Nishant Kumar/i }).textContent).toMatch(/NK/);
    expect(JSON.stringify(getState())).not.toMatch(/QCI@123/);
    expect(localStorage.getItem("excelgym.state.v1") ?? "").not.toMatch(/QCI@123/);
  });

  it("sign-out returns to login and leaves learning progress in place", async () => {
    const user = userEvent.setup();
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.signIn("ggstudent@example.com", "GG Student");
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "t");
    const attempts = getState().attempts.length;
    at("/");
    await user.click(screen.getByRole("button", { name: /account menu for GG Student/i }));
    await user.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(getState().auth.signedIn).toBe(false);
    expect(getState().attempts.length).toBe(attempts);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Gurukul ExcelLab");
  });
});

describe("Workbook Coverage Audit", () => {
  it("shows the inspected file, flags the name difference, and re-verifies every finding", () => {
    at("/audit");
    expect(document.body.textContent).toContain("Data Entry.xlsx");
    expect(document.body.textContent).toContain("Data Entry(1).xlsx");
    expect(document.body.textContent).not.toContain("NOT reproducible");
    expect(document.body.textContent).not.toMatch(/\b\d{12}\b/); // the Aadhar-style number is never shown
    expect(screen.getAllByText(/re-verified against extracted data/).length).toBeGreaterThan(15);
  });
  it("self-check runs and reports every spreadsheet exercise as completable", async () => {
    const user = userEvent.setup();
    at("/audit");
    await user.click(screen.getByRole("button", { name: /run self-check/i }));
    await waitFor(() => expect(screen.getByText(/spreadsheet exercises are completable/)).toBeTruthy(), { timeout: 55000 });
    const msg = screen.getByText(/spreadsheet exercises are completable/).parentElement!.textContent!;
    const [, a, b] = /(\d+) of (\d+) spreadsheet/.exec(msg)!;
    expect(a).toBe(b);
  }, 60000);
});

describe("Function Library", () => {
  it("lists the functions with engine-computed examples and the unsupported ones", () => {
    at("/functions");
    expect(screen.getByText("VLOOKUP")).toBeTruthy();
    expect(screen.getByText("FILTERXML")).toBeTruthy();
    expect(document.body.textContent).toContain("never return an invented value");
  });
});

describe("Quizzes and the Mistake Notebook", () => {
  it("a wrong quiz answer lands in the notebook; a later pass resolves it", async () => {
    const user = userEvent.setup();
    const ex = EXERCISE_BY_ID.get("EX-QZ-1")!;
    const view = at("/quizzes/QZ-1");
    // answer every question wrongly (pick an option that is not the right one)
    for (const q of ex.questions!) {
      const wrong = q.options.findIndex((_, i) => i !== q.correct);
      await user.click(screen.getByRole("button", { name: q.options[wrong] }));
    }
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(document.body.textContent).toContain("Not yet");
    expect(getState().mistakes.some((m) => !m.resolved && m.exerciseId === "EX-QZ-1")).toBe(true);
    view.unmount();

    at("/mistakes");
    expect(screen.getAllByText(/Open \(\d+\)/).length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain(ex.title);
    cleanup();

    // now answer correctly
    at("/quizzes/QZ-1");
    for (const [i, q] of ex.questions!.entries()) await user.click(within(screen.getAllByRole("group")[i]).getByRole("button", { name: q.options[q.correct] }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(getState().exercises["EX-QZ-1"].passed).toBe(true);
    expect(getState().mistakes.filter((m) => m.exerciseId === "EX-QZ-1").every((m) => m.resolved)).toBe(true);
  }, 30000);
});

describe("Analytics", () => {
  it("has an honest empty state, then real numbers after an attempt", () => {
    at("/analytics");
    expect(document.body.textContent).toContain("No attempts yet");
    cleanup();
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "Summary functions");
    at("/analytics");
    expect(document.body.textContent).toContain("1 saved attempt");
    expect(document.body.textContent).toMatch(/100%\s*of attempts passed/);
  });
});

describe("Settings", () => {
  it("states demo mode and that cloud sync is not configured", () => {
    at("/settings");
    expect(document.body.textContent).toContain("Demo mode");
    expect(document.body.textContent).toContain("not configured and not verified");
    expect(document.body.textContent).toContain("not real authentication");
  });
  it("reset needs the typed confirmation", async () => {
    const user = userEvent.setup();
    const ex = EXERCISE_BY_ID.get("EX-A2-1")!;
    actions.submit(ex, checkExercise(ex, applySolution(ex)), applySolution(ex), "t");
    at("/settings");
    const btn = screen.getByRole("button", { name: /delete all progress/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await user.type(screen.getByLabelText(/type reset/i), "RESET");
    expect(btn.disabled).toBe(false);
    await user.click(btn);
    expect(getState().attempts.length).toBe(0);
  });
});

describe("Playground import", () => {
  const xlsxFile = (name: string) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["Name", "Joined"], ["  Asha ", "01/15/2023"], ["Ben", "02/20/2023"]]);
    XLSX.utils.book_append_sheet(wb, ws, "People");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    return new File([buf], name);
  };
  it("reviews a workbook before opening it, then shows its data in the sheet", async () => {
    const user = userEvent.setup();
    at("/playground");
    const input = screen.getByLabelText(/choose a workbook to import/i);
    await user.upload(input, xlsxFile("people.xlsx"));
    await waitFor(() => expect(document.body.textContent).toContain("Review: people.xlsx"));
    expect(document.body.textContent).toMatch(/2 cell\(s\) look like dates stored as text/);
    expect(document.body.textContent).toMatch(/1 text cell\(s\) have leading or trailing spaces/);
    expect(getState().imports.length).toBe(1);
    await user.click(screen.getByRole("button", { name: /open in the playground/i }));
    expect(document.querySelector('td[data-addr="A1"]')?.textContent).toBe("Name");
    expect(document.querySelector('td[data-addr="A3"]')?.textContent).toBe("Ben");
  });
  it("refuses a macro-enabled file with a clear message", async () => {
    const user = userEvent.setup({ applyAccept: false });
    at("/playground");
    await user.upload(screen.getByLabelText(/choose a workbook to import/i), xlsxFile("evil.xlsm"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/not accepted/));
    expect(getState().imports.length).toBe(0);
  });
});

describe("Playground", () => {
  it("evaluates a formula and explains an unsupported function", async () => {
    const user = userEvent.setup();
    at("/playground");
    await user.click(screen.getByRole("button", { name: /^evaluate$/i }));
    expect(document.body.textContent).toContain("Functions used: SUMIFS");
    const f = screen.getByLabelText("Formula");
    await user.clear(f);
    await user.type(f, '=FILTERXML("<a/>","//a")');
    await user.click(screen.getByRole("button", { name: /^evaluate$/i }));
    expect(document.body.textContent).toContain("#UNSUPPORTED!");
  });
});

describe("challenge selection and dataset-driven practice", () => {
  it("lists every challenge with dataset, size, difficulty and status, 24 at a time", async () => {
    const user = userEvent.setup();
    at("/challenges");
    expect(document.body.textContent).toContain(`${CATALOG.length} challenges`);
    const cards = () => document.querySelectorAll(".grid-cards a.card");
    expect(cards().length).toBe(24);
    expect(document.body.textContent).toMatch(/Dataset: .* · [\d,]+ rows × \d+ columns/);
    expect(document.body.textContent).toContain("New");
    await user.click(screen.getByRole("button", { name: /show 24 more/i }));
    expect(cards().length).toBe(48);
  });
  it("filters by difficulty, concept, category, status and source, and clears the filters", async () => {
    const user = userEvent.setup();
    at("/challenges");
    await user.selectOptions(screen.getByLabelText("Difficulty"), "Hard");
    const shown = () => Number(/(\d+) of \d+ challenges shown/.exec(screen.getByRole("status").textContent!)![1]);
    expect(shown()).toBe(CATALOG.filter((e) => e.tier === "Hard").length);
    await user.selectOptions(screen.getByLabelText("Concept"), "CS");
    expect(shown()).toBe(CATALOG.filter((e) => e.tier === "Hard" && e.concept === "CS").length);
    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(shown()).toBe(CATALOG.length);
    await user.selectOptions(screen.getByLabelText("Source"), "original");
    expect(shown()).toBe(6);
    await user.selectOptions(screen.getByLabelText("Source"), "additional");
    expect(shown()).toBe(CATALOG.length - 6);
    await user.selectOptions(screen.getByLabelText("Status"), "completed");
    expect(shown()).toBe(0);
    expect(document.body.textContent).toContain("No challenge matches these filters");
  });
  it("opens a concept from a link (?concept=)", () => {
    at("/challenges?concept=DC");
    expect(screen.getByRole("status").textContent).toContain(`${CATALOG.filter((e) => e.concept === "DC").length} of`);
  });
  it("a challenge page names its dataset, saves attempts and progress, and 'Try another dataset' changes nothing", async () => {
    const user = userEvent.setup();
    const e = CATALOG_BY_ID.get("PC-RF-01")!;
    at(`/challenges/${e.id}`);
    expect(document.body.textContent).toContain(e.primary.title);
    expect(document.body.textContent).toContain("Attempts: 0");
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    await waitFor(() => expect(getState().exercises[e.exerciseId]?.attempts).toBe(1));
    expect(getState().exercises[e.exerciseId].passed).toBe(false);
    await user.click(screen.getByRole("button", { name: /show solution/i }));
    await user.click(screen.getByRole("button", { name: /load solution into the sheet/i }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    await waitFor(() => expect(getState().exercises[e.exerciseId]?.passed).toBe(true));
    const before = JSON.stringify(getState().exercises);
    const link = screen.getAllByRole("link").find((a) => a.getAttribute("href")?.startsWith("/challenges/PC-") && a.getAttribute("href") !== `/challenges/${e.id}` && a.closest("section[aria-label='Dataset and progress']"));
    expect(link).toBeTruthy();
    cleanup();
    at(link!.getAttribute("href")!);
    expect(JSON.stringify(getState().exercises)).toBe(before);
    expect(getState().exercises[e.exerciseId].passed).toBe(true);
  }, 60000);
  it("the dataset library lists every dataset and previews rows only on request", async () => {
    const user = userEvent.setup();
    at("/datasets");
    expect(document.body.textContent).toContain(`${DATASETS.length} of ${DATASETS.length} datasets shown`);
    await user.click(screen.getByRole("button", { name: "Class 10 test marks" }));
    expect(screen.queryByText(/Showing 20 of/)).toBeNull();
    await user.click(screen.getByRole("button", { name: /preview the first 20 rows/i }));
    expect(screen.getByText(/Showing 20 of/)).toBeTruthy();
  });
  it("the coverage page reports unsupported topics as Missing and offers the full checks", () => {
    at("/coverage");
    expect(document.body.textContent).toContain("PivotTables");
    expect(document.body.textContent).toMatch(/Missing/);
    expect(screen.getByRole("button", { name: /run the full checks/i })).toBeTruthy();
    expect(document.body.textContent).toContain("have not been run");
  });
});
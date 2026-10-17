// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";
import { actions } from "../state/store";
import { ALL_EXERCISES } from "../content/registry";
import { LOCAL_PERSIST_NOTICE } from "../learning/messages";

afterEach(() => cleanup());
beforeEach(() => {
  localStorage.clear();
  actions.resetAll();
  actions.signIn("ggstudent@example.com", "GG Student");
});

describe("Settings workbook audit", () => {
  it("shows configuration status and local-only persistence", () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    const practical = ALL_EXERCISES.filter((e) => !e.questions).length;
    expect(document.body.textContent).toContain(`Local-only ${practical}`);
    expect(document.body.textContent).toContain("Configured 0");
    expect(document.body.textContent).toMatch(/configuration audit/i);
    expect(document.body.textContent).toContain(LOCAL_PERSIST_NOTICE);
    expect(screen.getByRole("button", { name: /export my progress/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /import progress/i })).toBeTruthy();
  });
});

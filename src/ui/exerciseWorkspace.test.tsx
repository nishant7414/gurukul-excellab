// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

function run(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EXERCISE_BY_ID } from "../content/registry";
import { GOOGLE_CANNOT_CHECK } from "../learning/messages";
import { GOOGLE_NOT_CONNECTED_LESSON } from "../sheets/messages";
import { actions } from "../state/store";
import { ExerciseRunner } from "./ExerciseRunner";
import { GOOGLE_SAMPLE_SHEET } from "../sheets/catalog";

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  window.confirm = () => true;
});
afterEach(() => cleanup());
beforeEach(() => {
  localStorage.clear();
  actions.resetAll();
  actions.signIn("student@example.com", "Student");
});

describe("lesson workspace workbook honesty", () => {
  it("does not embed Google's Class Data sample when no workbook is assigned", () => {
    run(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.body.textContent).not.toContain(GOOGLE_SAMPLE_SHEET.spreadsheetUrl);
    expect(screen.getByRole("button", { name: /check answer/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /open in google sheets/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /download for excel/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /find one product name with vlookup/i, level: 2 })).toBeTruthy();
    expect(screen.getByRole("grid")).toBeTruthy();
  });

  it("Check Answer and Reset use the live local spreadsheet", async () => {
    const user = userEvent.setup();
    run(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    const cell = document.querySelector('td[data-addr="K3"]') as HTMLElement;
    await user.click(cell);
    await user.keyboard("typed-live{Enter}");
    expect((document.querySelector('td[data-addr="K3"]') as HTMLElement).textContent).toContain("typed-live");
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(document.body.textContent).toContain("Not yet");
    window.confirm = () => true;
    await user.click(screen.getByRole("button", { name: /reset workspace/i }));
    expect((document.querySelector('td[data-addr="K3"]') as HTMLElement).textContent ?? "").not.toContain("typed-live");
  });

  it("opens the configured Google Sheets URL from Settings when the toolbar button is clicked", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const url = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxTemplateSheet99/edit";
    actions.setGoogleSheet("EX-VL-1-1", { title: "Assigned", spreadsheetUrl: url });
    run(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    const toolbar = screen.getByRole("toolbar", { name: /export and external spreadsheet/i });
    await userEvent.setup().click(toolbar.querySelector(".btn-lab-google") as HTMLElement);
    expect(open).toHaveBeenCalledWith(expect.stringContaining("1abcdefghijklmnopqrstuvwxTemplateSheet99"), "_blank", "noopener,noreferrer");
  });

  it("does not open Google when no workbook is configured", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    run(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    const toolbar = screen.getByRole("toolbar", { name: /export and external spreadsheet/i });
    await userEvent.setup().click(toolbar.querySelector(".btn-lab-google") as HTMLElement);
    expect(open).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(GOOGLE_NOT_CONNECTED_LESSON);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("uses different URLs for different exercises when configured", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const url1 = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxLessonOneWB99/edit";
    const url2 = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxLessonTwoWB99/edit";
    actions.setGoogleSheet("EX-VL-1-1", { spreadsheetUrl: url1 });
    actions.setGoogleSheet("EX-VL-1-2", { spreadsheetUrl: url2 });

    run(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    const bar1 = screen.getByRole("toolbar", { name: /export and external spreadsheet/i });
    await userEvent.setup().click(bar1.querySelector(".btn-lab-google") as HTMLElement);
    expect(open).toHaveBeenLastCalledWith(expect.stringContaining("1abcdefghijklmnopqrstuvwxLessonOneWB99"), "_blank", "noopener,noreferrer");

    cleanup();
    open.mockClear();
    run(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-2")!} topic="VLOOKUP" />);
    const bar2 = screen.getByRole("toolbar", { name: /export and external spreadsheet/i });
    await userEvent.setup().click(bar2.querySelector(".btn-lab-google") as HTMLElement);
    expect(open).toHaveBeenLastCalledWith(expect.stringContaining("1abcdefghijklmnopqrstuvwxLessonTwoWB99"), "_blank", "noopener,noreferrer");
  });

  it("tells the student that Google cells cannot be graded when the local sheet is untouched", async () => {
    const user = userEvent.setup();
    actions.setGoogleSheet("EX-VL-1-1", {
      title: "Assigned",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxTemplateSheet99/edit",
    });
    run(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    await user.click(screen.getByText("Google Sheets preview (optional)"));
    expect(screen.getByTitle(/read-only google sheets preview/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(document.body.textContent).toContain(GOOGLE_CANNOT_CHECK);
    expect(document.body.textContent).toContain("Not yet");
  });
});

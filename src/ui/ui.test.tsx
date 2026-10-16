// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseRunner } from "./ExerciseRunner";
import { EXERCISE_BY_ID } from "../content/registry";
import { actions, getState } from "../state/store";

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  window.confirm = () => true;
});
beforeEach(() => { localStorage.clear(); actions.resetAll(); });
afterEach(() => cleanup());

const cell = (a: string) => document.querySelector(`td[data-addr="${a}"]`) as HTMLElement;
const text = (a: string) => cell(a).textContent ?? "";

async function typeInto(user: ReturnType<typeof userEvent.setup>, a: string, value: string, key = "{Enter}") {
  await user.click(cell(a));
  await user.keyboard(value + key);
}

describe("ExerciseRunner: first end-to-end VLOOKUP workflow", () => {
  it("rejects the untouched sheet, lets the learner type, fill down, pass, and survives a remount", async () => {
    const user = userEvent.setup();
    const ex = EXERCISE_BY_ID.get("EX-VL-1-2")!;
    const { unmount } = render(<ExerciseRunner exercise={ex} topic="VLOOKUP" />);

    // untouched -> not yet
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(document.body.textContent).toContain("Not yet");
    expect(getState().mistakes.some((m) => !m.resolved)).toBe(true);

    // type first-row formulas; Tab moves right
    await typeInto(user, "K3", "=VLOOKUP(J3,$B$3:$F$62,2,FALSE)", "{Tab}");
    await user.keyboard("=VLOOKUP(J3,$B$3:$F$62,3,FALSE){Tab}");
    await user.keyboard("=VLOOKUP(J3,$B$3:$F$62,4,FALSE){Enter}");
    expect(text("K3")).not.toBe("");
    expect(text("K3").startsWith("#")).toBe(false);
    expect(text("L3")).not.toBe("");

    // select K3:M20 using the name box, then Fill Down
    const nameBox = screen.getByLabelText("Name box");
    await user.click(nameBox);
    await user.clear(nameBox);
    await user.type(nameBox, "K3:M20{Enter}");
    await user.click(screen.getByRole("button", { name: /fill ↓/i }));
    expect(text("K20")).not.toBe("");
    expect(text("M20")).not.toBe("");
    expect(text("K20").startsWith("#")).toBe(false);

    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(document.body.textContent).toContain("Correct");
    expect(getState().exercises["EX-VL-1-2"].passed).toBe(true);
    // the earlier mistakes are resolved only because a later attempt succeeded
    expect(getState().mistakes.every((m) => m.resolved)).toBe(true);

    // persistence: new mount reads the saved workbook
    await new Promise((r) => setTimeout(r, 400));
    unmount();
    render(<ExerciseRunner exercise={ex} topic="VLOOKUP" />);
    expect(text("K20")).not.toBe("");
    expect(document.body.textContent).toContain("Passed");
  });

  it("protects provided cells and explains why", async () => {
    const user = userEvent.setup();
    render(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    const before = text("B3");
    await user.click(cell("B3"));
    await user.keyboard("hacked{Enter}");
    expect(text("B3")).toBe(before);
    expect(document.body.textContent).toContain("protected");
  });

  it("rejects a hard-coded answer typed into the answer cell", async () => {
    const user = userEvent.setup();
    render(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    await typeInto(user, "K3", "Turbo T-Shirt");
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(document.body.textContent).toContain("Not yet");
    expect(getState().exercises["EX-VL-1-1"]?.passed).toBeFalsy();
  });

  it("show-solution marks the exercise assisted", async () => {
    const user = userEvent.setup();
    render(<ExerciseRunner exercise={EXERCISE_BY_ID.get("EX-VL-1-1")!} topic="VLOOKUP" />);
    await user.click(screen.getByRole("button", { name: /show solution/i }));
    expect(getState().exercises["EX-VL-1-1"].solutionViewed).toBe(true);
    await user.click(screen.getByRole("button", { name: /load solution/i }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(getState().exercises["EX-VL-1-1"].passed).toBe(true);
    expect(getState().exercises["EX-VL-1-1"].assisted).toBe(true);
    void within;
  });
});

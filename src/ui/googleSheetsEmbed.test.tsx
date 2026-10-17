// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GoogleSheetsEmbed, EDITING_NOTICE } from "./GoogleSheetsEmbed";
import { GOOGLE_SAMPLE_SHEET } from "../sheets/catalog";
import { actions, getState } from "../state/store";
import { inspectSheetsUrl } from "../sheets/urls";

afterEach(() => cleanup());
beforeEach(() => { localStorage.clear(); actions.resetAll(); actions.signIn("student@example.com", "Student"); });

describe("GoogleSheetsEmbed", () => {
  it("renders a read-only published preview and does not claim in-page editing", () => {
    render(
      <GoogleSheetsEmbed
        title="Class data"
        description="Public sample"
        spreadsheetUrl={GOOGLE_SAMPLE_SHEET.spreadsheetUrl}
        embedUrl={GOOGLE_SAMPLE_SHEET.embedUrl}
      />,
    );
    const frame = screen.getByTitle(/read-only google sheets preview/i) as HTMLIFrameElement;
    expect(frame.src).toContain("docs.google.com/spreadsheets");
    expect(frame.src).toContain("/preview");
    expect(screen.getByRole("button", { name: /open in google sheets/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /make my own copy/i })).toBeTruthy();
    expect(document.body.textContent).toContain(EDITING_NOTICE);
    expect(document.body.textContent).toMatch(/read-only on this page/i);
  });

  it("explains a missing URL instead of rendering an iframe", () => {
    render(<GoogleSheetsEmbed title="Unset" />);
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.body.textContent).toMatch(/no google sheets url/i);
  });

  it("rejects a non-Sheets URL", () => {
    render(<GoogleSheetsEmbed title="Bad" spreadsheetUrl="https://example.com/not-sheets" />);
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.body.textContent).toMatch(/only docs\.google\.com/i);
  });

  it("does not embed when mode is open-in-sheets", () => {
    render(
      <GoogleSheetsEmbed
        title="Edit copy"
        mode="open-in-sheets"
        spreadsheetUrl={GOOGLE_SAMPLE_SHEET.spreadsheetUrl}
      />,
    );
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.body.textContent).toContain(EDITING_NOTICE);
  });

  it("records a student practice workbook against the current GG ID", async () => {
    const user = userEvent.setup();
    render(
      <GoogleSheetsEmbed
        title="Lesson"
        exerciseId="EX-VL-1-1"
        spreadsheetUrl={GOOGLE_SAMPLE_SHEET.spreadsheetUrl}
      />,
    );
    const mine = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxPracticeCopy99/edit";
    await user.type(screen.getByLabelText(/my practice workbook url/i), mine);
    await user.click(screen.getByRole("button", { name: /save my practice workbook/i }));
    const rec = Object.values(getState().practiceWorkbooks)[0];
    expect(rec.exerciseId).toBe("EX-VL-1-1");
    expect(rec.owner).toBe("student@example.com");
    expect(rec.url).toContain("1abcdefghijklmnopqrstuvwxPracticeCopy99");
    expect(screen.getByRole("button", { name: /open my practice workbook/i })).toBeTruthy();
  });
});

describe("Sheets copy URL", () => {
  it("builds Google's official /copy link from a share URL", () => {
    const r = inspectSheetsUrl(GOOGLE_SAMPLE_SHEET.spreadsheetUrl);
    expect(r.ok && r.copyUrl).toBe("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/copy");
  });
});

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoogleSheetsEmbed } from "./GoogleSheetsEmbed";
import { GOOGLE_SAMPLE_SHEET } from "../sheets/catalog";

afterEach(() => cleanup());

describe("GoogleSheetsEmbed", () => {
  it("renders the official sample in an iframe", () => {
    render(
      <GoogleSheetsEmbed
        title="Class data"
        description="Public sample"
        spreadsheetUrl={GOOGLE_SAMPLE_SHEET.spreadsheetUrl}
        embedUrl={GOOGLE_SAMPLE_SHEET.embedUrl}
      />,
    );
    const frame = screen.getByTitle("Class data") as HTMLIFrameElement;
    expect(frame.tagName).toBe("IFRAME");
    expect(frame.src).toContain("docs.google.com/spreadsheets");
    expect(frame.src).toContain("/preview");
    expect(screen.getByRole("button", { name: /open in google sheets/i })).toBeTruthy();
    expect(document.body.textContent).toMatch(/read-only/i);
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
    expect(document.body.textContent).toMatch(/editing happens in google sheets/i);
  });
});

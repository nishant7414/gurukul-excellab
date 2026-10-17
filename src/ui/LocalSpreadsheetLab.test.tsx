// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

function lab(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyWorkbook } from "../engine/workbook";
import * as exportApi from "../engine/export";
import { GOOGLE_NOT_CONNECTED_LESSON } from "../sheets/messages";
import { LocalSpreadsheetLab } from "./LocalSpreadsheetLab";

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => cleanup());
beforeEach(() => {
  vi.restoreAllMocks();
});

function starter() {
  const wb = emptyWorkbook(["Orders"]);
  wb.sheets[0].cells = { A1: "Qty", A2: "10", A3: "20", B2: "=SUM(A2:A3)" };
  return wb;
}

const exportMeta = { title: "North orders", exerciseId: "EX-TEST-1" };

describe("LocalSpreadsheetLab", () => {
  it("shows Open in Google Sheets and Download for Excel on every practical workspace", () => {
    lab(
      <LocalSpreadsheetLab
        workbook={starter()}
        onChange={() => {}}
        activeSheet="Orders"
        onActiveSheet={() => {}}
        exportOptions={exportMeta}
      />,
    );
    expect(screen.getByRole("grid", { name: /worksheet orders/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /open in google sheets/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /download for excel/i })).toBeTruthy();
  });

  it("opens the configured Google Sheets URL for this challenge only", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const url = "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxTemplateSheet99/edit";
    lab(
      <LocalSpreadsheetLab
        workbook={starter()}
        onChange={() => {}}
        activeSheet="Orders"
        onActiveSheet={() => {}}
        googleLink={{ state: "ready", openUrl: url, source: "settings" }}
      />,
    );
    expect(screen.getByText(/google workbook ready/i)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: /open in google sheets/i }));
    expect(open).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not open the Google homepage when no workbook is configured", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    lab(
      <LocalSpreadsheetLab
        workbook={starter()}
        onChange={() => {}}
        activeSheet="Orders"
        onActiveSheet={() => {}}
        googleLink={{ state: "unconfigured" }}
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /open in google sheets/i }));
    expect(open).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(GOOGLE_NOT_CONNECTED_LESSON);
    expect(screen.getByRole("link", { name: /connect in settings/i })).toBeTruthy();
  });

  it("Download for Excel still writes an xlsx of the current workbook", async () => {
    const dl = vi.spyOn(exportApi, "downloadWorkbook").mockImplementation(() => {});
    const wb = starter();
    lab(
      <LocalSpreadsheetLab
        workbook={wb}
        onChange={() => {}}
        activeSheet="Orders"
        onActiveSheet={() => {}}
        exportOptions={exportMeta}
      />,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /download for excel/i }));
    expect(dl).toHaveBeenCalledWith(wb, expect.objectContaining({ kind: "xlsx", exerciseId: "EX-TEST-1" }));
  });

  it("lets the student edit a cell in the live grid", async () => {
    const user = userEvent.setup();
    let current = starter();
    const { rerender } = lab(
      <LocalSpreadsheetLab
        workbook={current}
        onChange={(next) => { current = next; }}
        activeSheet="Orders"
        onActiveSheet={() => {}}
      />,
    );
    const cell = document.querySelector('td[data-addr="A2"]') as HTMLElement;
    await user.click(cell);
    await user.keyboard("15{Enter}");
    rerender(
      <LocalSpreadsheetLab
        workbook={current}
        onChange={(next) => { current = next; }}
        activeSheet="Orders"
        onActiveSheet={() => {}}
      />,
    );
    expect(current.sheets[0].cells.A2).toBe("15");
  });
});

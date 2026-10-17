import { describe, expect, it } from "vitest";
import { inspectEmbedUrl, inspectSheetsUrl } from "./urls";
import { GOOGLE_SAMPLE_SHEET, resolveGoogleSheet } from "./catalog";

describe("inspectSheetsUrl", () => {
  it("accepts a share/edit URL and builds a preview embed", () => {
    const r = inspectSheetsUrl("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing&gid=0#gid=0");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spreadsheetId).toBe("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
    expect(r.embedUrl).toContain("/preview");
    expect(r.embedUrl).toContain("gid=0");
    expect(r.openUrl).toContain("/edit");
    expect(r.copyUrl).toBe("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/copy");
  });

  it("accepts a published pubhtml URL", () => {
    const r = inspectSheetsUrl("https://docs.google.com/spreadsheets/d/e/2PACX-1vSamplePublishedIdValueHere/pubhtml?gid=0");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe("published");
    expect(r.embedUrl).toContain("widget=true");
  });

  it("rejects missing, non-https, and non-Sheets URLs", () => {
    expect(inspectSheetsUrl("").ok).toBe(false);
    expect(inspectSheetsUrl("http://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit").ok).toBe(false);
    expect(inspectSheetsUrl("https://example.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit").ok).toBe(false);
    expect(inspectSheetsUrl("https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit").ok).toBe(false);
    expect(inspectSheetsUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("uses a separate embed URL when one is supplied", () => {
    const r = inspectEmbedUrl(
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
    );
    expect(r.ok && r.embedUrl).toContain("/preview");
  });
});

describe("resolveGoogleSheet", () => {
  it("uses the official sample when nothing is configured", () => {
    const r = resolveGoogleSheet("EX-MISSING");
    expect(r.source).toBe("sample");
    expect(r.assignment.spreadsheetUrl).toBe(GOOGLE_SAMPLE_SHEET.spreadsheetUrl);
    expect(r.embed.ok).toBe(true);
  });

  it("prefers a Settings override", () => {
    const r = resolveGoogleSheet("EX-VL-1-1", {
      "EX-VL-1-1": { title: "Mine", spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit" },
    });
    expect(r.source).toBe("settings");
    expect(r.assignment.title).toBe("Mine");
  });
});

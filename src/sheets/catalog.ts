import { inspectEmbedUrl, inspectSheetsUrl, type SheetsUrlOk } from "./urls";

export type SheetsMode = "embedded-view" | "open-in-sheets";

export interface GoogleSheetAssignment {
  title?: string;
  description?: string;
  spreadsheetUrl: string;
  embedUrl?: string;
  fallbackUrl?: string;
  mode?: SheetsMode;
}

/** Google's public API sample workbook. Safe to embed as a genuine Sheets preview. */
export const GOOGLE_SAMPLE_SHEET: GoogleSheetAssignment = {
  title: "Google sample workbook",
  description: "A public Google Sheets document. It is not this exercise's Gurukul dataset. Replace the URL in Settings with a published workbook for this lesson.",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing",
  embedUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
  mode: "embedded-view",
};

/**
 * Per-exercise Google Sheets assignments shipped with the app.
 * Add an entry here, or paste a URL in Settings (saved in this browser only).
 */
export const GOOGLE_SHEET_DEFAULTS: Record<string, GoogleSheetAssignment> = {
  // "EX-VL-1-1": { title: "VLOOKUP catalogue", spreadsheetUrl: "https://docs.google.com/spreadsheets/d/YOUR_ID/edit?usp=sharing" },
};

export interface ResolvedSheet {
  assignment: GoogleSheetAssignment;
  source: "settings" | "catalog";
  open: SheetsUrlOk | { ok: false; error: string };
  embed: SheetsUrlOk | { ok: false; error: string };
  fallback: SheetsUrlOk | { ok: false; error: string } | null;
}

/**
 * Resolve a configured Google workbook for an exercise.
 * Returns null when nothing is assigned — never substitutes Google's Class Data sample.
 */
export function resolveGoogleSheet(exerciseId: string, overrides?: Record<string, GoogleSheetAssignment>): ResolvedSheet | null {
  const assignment = overrides?.[exerciseId] ?? GOOGLE_SHEET_DEFAULTS[exerciseId];
  if (!assignment) return null;
  const source: ResolvedSheet["source"] = overrides?.[exerciseId] ? "settings" : "catalog";
  const open = inspectSheetsUrl(assignment.spreadsheetUrl);
  const embed = inspectEmbedUrl(assignment.embedUrl, assignment.spreadsheetUrl);
  const fallback = assignment.fallbackUrl ? inspectSheetsUrl(assignment.fallbackUrl) : null;
  return { assignment, source, open, embed, fallback };
}

import type { GoogleSheetAssignment } from "./catalog";
import { resolveAssignedSheet } from "./registry";
import { inspectSheetsUrl } from "./urls";

export type GoogleOpenLink =
  | { state: "ready"; openUrl: string; spreadsheetId?: string; source: "practice" | "settings" | "catalog" }
  | { state: "invalid"; error: string }
  | { state: "unconfigured" };

/**
 * Resolve which Google Sheets document to open for this exercise.
 * Priority: student's saved practice copy → Settings/catalog assignment.
 * Never falls back to sheets.google.com or an unrelated sample.
 */
export function resolveGoogleOpenLink(
  exerciseId: string,
  practiceUrl: string | undefined,
  overrides?: Record<string, GoogleSheetAssignment>,
): GoogleOpenLink {
  if (practiceUrl?.trim()) {
    const practice = inspectSheetsUrl(practiceUrl);
    if (practice.ok) {
      return { state: "ready", openUrl: practice.openUrl, spreadsheetId: practice.spreadsheetId, source: "practice" };
    }
  }

  const assigned = resolveAssignedSheet(exerciseId, overrides);
  if (!assigned) return { state: "unconfigured" };

  if (assigned.open.ok) {
    return {
      state: "ready",
      openUrl: assigned.open.openUrl,
      spreadsheetId: assigned.open.spreadsheetId,
      source: assigned.source,
    };
  }

  if (assigned.fallback?.ok) {
    return {
      state: "ready",
      openUrl: assigned.fallback.openUrl,
      spreadsheetId: assigned.fallback.spreadsheetId,
      source: assigned.source,
    };
  }

  const err = !assigned.open.ok ? assigned.open.error : assigned.fallback && !assigned.fallback.ok ? assigned.fallback.error : "Invalid Google Sheets URL";
  return { state: "invalid", error: err };
}

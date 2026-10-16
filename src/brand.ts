/** User-facing brand. Internal keys (localStorage, package name) stay as excelgym so existing saved progress is not broken. */
export const APP_NAME = "Gurukul ExcelLab";
export const INSTITUTION = "Gunvatta Gurukul";
export const TAGLINE = "Learn. Practice. Master.";
export const APP_DESCRIPTION = "A hands-on Excel learning platform built around practical exercises, real-world datasets, and progressive challenges.";
export const MONOGRAM = "GG";
/** Official institutional mark in /public. Do not replace with a generated or text logo. */
export const LOGO_ORIGINAL_SRC = "/gunvatta-gurukul-logo.png";
/** Same official artwork with excess side whitespace trimmed for layout. */
export const LOGO_SRC = "/gunvatta-gurukul-logo-trim.png?v=3";
export const EMBLEM_SRC = "/favicon.png?v=3";
export const LOGO_ALT = "Gunvatta Gurukul official logo";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  const one = parts[0] ?? "";
  return (one.slice(0, 2) || MONOGRAM).toUpperCase();
}

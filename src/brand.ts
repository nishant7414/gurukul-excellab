/** User-facing brand. Internal keys (localStorage, package name) stay as excelgym so existing saved progress is not broken. */
export const APP_NAME = "Gurukul ExcelLab";
export const INSTITUTION = "Gunvatta Gurukul";
export const TAGLINE = "Learn. Practice. Master.";
export const APP_DESCRIPTION = "A hands-on Excel learning platform built around practical exercises, real-world datasets, and progressive challenges.";
export const MONOGRAM = "GG";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  const one = parts[0] ?? "";
  return (one.slice(0, 2) || MONOGRAM).toUpperCase();
}

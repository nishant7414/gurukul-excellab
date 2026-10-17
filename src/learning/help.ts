import { LOCAL_CHECK_SOURCE, LOCAL_PERSIST_NOTICE, MANUAL_REVIEW_NOTICE, PROFILE_NOT_SECURE } from "./messages";
import { LOCAL_SHEET_CHECK, LOCAL_SHEET_ENGINE, LOCAL_SHEET_LIMITS } from "../ui/spreadsheet/capabilities";

/** Long-form help shown in Settings — not repeated on lesson pages. */
export const HELP_GOOGLE_WORKBOOKS =
  "Practical challenges use a local practice workbook in your browser. An optional Google Sheets link can be added in Settings for each exercise. Opening Google Sheets does not upload or sync your local edits. Check Answer always uses the workbook on this page.";

export const HELP_MISSING_GOOGLE =
  "When no Google workbook is assigned, Open in Google Sheets opens sheets.google.com so you can start a new file or import a download. The challenge dataset remains on this page.";

export const HELP_SECTIONS: { id: string; title: string; paragraphs: string[] }[] = [
  {
    id: "checking",
    title: "How Check Answer works",
    paragraphs: [LOCAL_CHECK_SOURCE, LOCAL_SHEET_CHECK],
  },
  {
    id: "storage",
    title: "Progress and data on this device",
    paragraphs: [LOCAL_PERSIST_NOTICE, PROFILE_NOT_SECURE],
  },
  {
    id: "spreadsheet",
    title: "In-browser spreadsheet",
    paragraphs: [LOCAL_SHEET_ENGINE, LOCAL_SHEET_LIMITS],
  },
  {
    id: "google",
    title: "Google Sheets",
    paragraphs: [HELP_GOOGLE_WORKBOOKS, HELP_MISSING_GOOGLE],
  },
  {
    id: "manual",
    title: "Manual review",
    paragraphs: [MANUAL_REVIEW_NOTICE],
  },
];

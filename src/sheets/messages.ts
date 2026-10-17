export { GOOGLE_CANNOT_CHECK, LOCAL_CHECK_SOURCE } from "../learning/messages";

export const MISSING_WORKBOOK =
  "No Google Sheets workbook is assigned to this challenge. Check Answer uses the local Gurukul ExcelLab sheet and dataset. Add a share or Publish-to-web link in Settings if you want a Google preview.";

/** Generic destination when a challenge has no configured Google workbook URL. */
export const GOOGLE_SHEETS_HOME = "https://sheets.google.com/";

export const GOOGLE_NOT_CONFIGURED_TITLE = "No Google Sheets workbook for this challenge";

export const GOOGLE_NOT_CONFIGURED_BODY =
  "This challenge uses a local Gurukul ExcelLab dataset. A Google Sheets workbook has not been assigned yet. You can keep practising in the spreadsheet on this page. This website cannot create a Google Sheet or upload your work to Google Drive.";

export const GOOGLE_CSV_IMPORT_HINT =
  "Download a CSV of this challenge's current first worksheet, then in Google Sheets use File → Import. CSV cannot store formulas as formulas. Add a share or Publish-to-web link in Settings if you want Open in Google Sheets to open a real workbook.";

export const GOOGLE_INVALID_URL_PREFIX =
  "A Google Sheets link is saved for this challenge, but it could not be used:";

export const SAMPLE_PLAYGROUND_NOTE =
  "This is Google's public Class Data sample, used only in the Formula Playground as a genuine published preview. It is not a Gurukul lesson dataset.";

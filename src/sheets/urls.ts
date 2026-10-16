/** Official Google Sheets hosts only. Arbitrary URLs are rejected. */
const HOSTS = new Set(["docs.google.com"]);

export type SheetsUrlKind = "edit" | "preview" | "published" | "embed";

export type SheetsUrlOk = {
  ok: true;
  kind: SheetsUrlKind;
  spreadsheetId?: string;
  publishedId?: string;
  gid?: string;
  openUrl: string;
  embedUrl: string;
};

export type SheetsUrlResult = SheetsUrlOk | { ok: false; error: string };

function clean(raw: string): string {
  return raw.trim();
}

export function inspectSheetsUrl(raw: string | undefined | null): SheetsUrlResult {
  const value = clean(raw ?? "");
  if (!value) return { ok: false, error: "No Google Sheets URL is configured." };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "That is not a valid URL." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Only https Google Sheets URLs are allowed." };
  if (!HOSTS.has(url.hostname.toLowerCase())) return { ok: false, error: "Only docs.google.com spreadsheet URLs are allowed." };

  const path = url.pathname.replace(/\/+/g, "/");
  const gid = url.searchParams.get("gid") ?? (url.hash.match(/gid=(\d+)/)?.[1]);

  const published = /\/spreadsheets\/d\/e\/([^/]+)\/(pubhtml|pub)/i.exec(path);
  if (published) {
    const publishedId = published[1];
    if (!/^2PACX-[A-Za-z0-9_-]+$/.test(publishedId) && !/^[A-Za-z0-9_-]{20,}$/.test(publishedId)) {
      return { ok: false, error: "The published spreadsheet id is not recognised." };
    }
    const embed = new URL(`https://docs.google.com/spreadsheets/d/e/${publishedId}/pubhtml`);
    embed.searchParams.set("widget", "true");
    embed.searchParams.set("headers", "false");
    if (gid) embed.searchParams.set("gid", gid);
    return {
      ok: true,
      kind: "published",
      publishedId,
      gid: gid ?? undefined,
      openUrl: `https://docs.google.com/spreadsheets/d/e/${publishedId}/pubhtml`,
      embedUrl: embed.toString(),
    };
  }

  const file = /\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)(?:\/([a-z]+))?/i.exec(path);
  if (!file) return { ok: false, error: "That Google URL is not a spreadsheet. Use a Sheets share, preview, or Publish-to-web link." };

  const spreadsheetId = file[1];
  if (spreadsheetId.length < 20) return { ok: false, error: "The spreadsheet id is too short to be a Google Sheets document." };
  const action = (file[2] ?? "edit").toLowerCase();
  if (!["edit", "view", "preview", "htmlembed", "embed", "pubhtml", "htmlview", "copy"].includes(action)) {
    return { ok: false, error: "That Sheets path is not an embeddable or shareable workbook link." };
  }

  const open = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  open.searchParams.set("usp", "sharing");
  if (gid) open.searchParams.set("gid", gid);

  const embed = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/${action === "htmlembed" || action === "embed" ? "htmlembed" : "preview"}`);
  if (gid) embed.searchParams.set("gid", gid);

  const kind: SheetsUrlKind = action === "preview" ? "preview" : action === "htmlembed" || action === "embed" ? "embed" : action === "pubhtml" ? "published" : "edit";
  return { ok: true, kind, spreadsheetId, gid: gid ?? undefined, openUrl: open.toString(), embedUrl: embed.toString() };
}

export function inspectEmbedUrl(raw: string | undefined | null, fallbackFrom?: string): SheetsUrlResult {
  const primary = clean(raw ?? "");
  if (primary) return inspectSheetsUrl(primary);
  return inspectSheetsUrl(fallbackFrom);
}

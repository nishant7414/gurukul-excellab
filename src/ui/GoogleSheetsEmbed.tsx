import { useEffect, useRef, useState } from "react";
import { CopyPlus, ExternalLink, Maximize2 } from "lucide-react";
import { inspectEmbedUrl, inspectSheetsUrl } from "../sheets/urls";
import type { SheetsMode } from "../sheets/catalog";
import { actions, practiceKey, practiceOwner, useStore } from "../state/store";

export const EDITING_NOTICE =
  "Google Sheets editing is not available in the embedded view. Open your practice workbook in Google Sheets to use the full spreadsheet editor. Your lesson and progress remain in Gurukul ExcelLab.";

export interface GoogleSheetsEmbedProps {
  title?: string;
  description?: string;
  spreadsheetUrl?: string;
  embedUrl?: string;
  fallbackUrl?: string;
  mode?: SheetsMode;
  height?: number;
  sourceNote?: string;
  workbookName?: string;
  exerciseId?: string;
  /** Less chrome when nested under optional lesson preview. */
  compact?: boolean;
}

function openSheets(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function GoogleSheetsEmbed({
  title = "Google Sheets",
  description,
  spreadsheetUrl,
  embedUrl,
  fallbackUrl,
  mode = "embedded-view",
  height = 640,
  sourceNote,
  workbookName,
  exerciseId,
  compact = false,
}: GoogleSheetsEmbedProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [paste, setPaste] = useState("");
  const [pasteErr, setPasteErr] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState("");
  const [frameNote, setFrameNote] = useState<string | null>(null);
  const practice = useStore((s) => (exerciseId ? s.practiceWorkbooks[practiceKey(practiceOwner(s), exerciseId)] : undefined));

  const open = inspectSheetsUrl(spreadsheetUrl);
  const embed = inspectEmbedUrl(embedUrl, spreadsheetUrl);
  const fallback = fallbackUrl ? inspectSheetsUrl(fallbackUrl) : null;
  const openHref = open.ok ? open.openUrl : fallback?.ok ? fallback.openUrl : null;
  const copyHref = open.ok ? open.copyUrl : undefined;
  const practiceHref = practice ? inspectSheetsUrl(practice.url) : null;
  const showIframe = mode === "embedded-view" && embed.ok;
  const embedSrc = embed.ok ? embed.embedUrl : "";
  const loading = showIframe && loadedSrc !== embedSrc;

  useEffect(() => {
    if (!showIframe || !embedSrc) return;
    const t = window.setTimeout(() => {
      setLoadedSrc((cur) => cur || embedSrc);
    }, 12000);
    return () => window.clearTimeout(t);
  }, [showIframe, embedSrc]);

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
  };

  const savePractice = () => {
    if (!exerciseId) return;
    const checked = inspectSheetsUrl(paste);
    if (!checked.ok) { setPasteErr(checked.error); return; }
    if (!checked.spreadsheetId) { setPasteErr("Paste the URL of your own copy, not a published preview."); return; }
    if (open.ok && checked.spreadsheetId && checked.spreadsheetId === open.spreadsheetId) {
      setPasteErr("That is still the shared template. After Google creates your copy, paste the new URL from the address bar.");
      return;
    }
    actions.setPracticeWorkbook(exerciseId, checked.openUrl);
    setPaste("");
    setPasteErr(null);
  };

  return (
    <section className={`gs-embed glass-flat${compact ? " gs-embed-compact" : ""}`} aria-label={title}>
      {!compact && (
        <header className="gs-head">
          <div>
            <div className="row" style={{ marginBottom: 4 }}>
              <span className="pill">{showIframe ? "Published preview" : "Google Sheets"}</span>
              <span className="pill">Read-only on this page</span>
              {workbookName && <span className="pill">{workbookName}</span>}
            </div>
            <h3>{title}</h3>
            {description && <p className="muted small">{description}</p>}
            {sourceNote && <p className="small faint">{sourceNote}</p>}
          </div>
        </header>
      )}

      {!compact && (
        <div className="callout warn" role="status">
          <p>{EDITING_NOTICE}</p>
        </div>
      )}

      <div className="row" style={{ margin: "10px 0" }}>
        {practiceHref?.ok && (
          <button type="button" className="btn primary" onClick={() => openSheets(practiceHref.openUrl)}>
            <ExternalLink size={15} aria-hidden="true" /> Open my practice workbook
          </button>
        )}
        {openHref && (
          <button type="button" className={practiceHref?.ok ? "btn" : "btn primary"} onClick={() => openSheets(openHref)}>
            <ExternalLink size={15} aria-hidden="true" /> Open in Google Sheets
          </button>
        )}
        {copyHref && (
          <button type="button" className="btn" onClick={() => openSheets(copyHref)}>
            <CopyPlus size={15} aria-hidden="true" /> Make my own copy
          </button>
        )}
        {showIframe && (
          <button type="button" className="btn ghost" onClick={fullscreen}>
            <Maximize2 size={15} aria-hidden="true" /> Open Full Screen
          </button>
        )}
      </div>

      {exerciseId && (
        <form className="stack" style={{ gap: 8, marginBottom: 10 }} onSubmit={(e) => { e.preventDefault(); savePractice(); }}>
          <label>
            After you make a copy, paste your workbook URL so Gurukul ExcelLab can reopen it.
            <input type="url" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…/edit" aria-label="My practice workbook URL" />
          </label>
          <div className="row">
            <button className="btn" type="submit">Save my practice workbook</button>
            {practice && <button className="btn ghost" type="button" onClick={() => actions.clearPracticeWorkbook(exerciseId)}>Forget saved workbook</button>}
          </div>
          {pasteErr && <p className="small" role="alert">{pasteErr}</p>}
          {practice && !compact && <p className="small faint">Saved on this device for your GG ID only.</p>}
        </form>
      )}

      {showIframe ? (
        <div ref={wrapRef} className="gs-frame" style={{ minHeight: height }}>
          {loading && <div className="gs-loading" role="status">Loading the published Google Sheets preview…</div>}
          <iframe
            title={`${title} (read-only Google Sheets preview)`}
            src={embedSrc}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
            onLoad={() => { setLoadedSrc(embedSrc); setFrameNote(null); }}
            onError={() => {
              setLoadedSrc(embedSrc);
              setFrameNote("The published preview did not load. Use Open in Google Sheets. Lesson instructions stay available on this page.");
            }}
          />
        </div>
      ) : (
        <div className="callout" role="status">
          {!spreadsheetUrl && !embedUrl
            ? "No Google Sheets URL is configured for this exercise. Add a share or Publish-to-web link in Settings."
            : embed.ok
              ? "This exercise is set to open in Google Sheets rather than show a published preview."
              : embed.error}
        </div>
      )}

      {frameNote && <p className="small" role="status">{frameNote}</p>}
      {!compact && (
        <details className="small faint">
          <summary>About Google previews</summary>
          <p>Published embeds are read-only and may not show the formula bar. Use Open in Google Sheets for the full editor. Gurukul ExcelLab cannot read cells inside the preview.</p>
        </details>
      )}
    </section>
  );
}

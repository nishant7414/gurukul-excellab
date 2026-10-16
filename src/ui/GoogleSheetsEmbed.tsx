import { useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize2 } from "lucide-react";
import { inspectEmbedUrl, inspectSheetsUrl } from "../sheets/urls";
import type { SheetsMode } from "../sheets/catalog";

export interface GoogleSheetsEmbedProps {
  title?: string;
  description?: string;
  spreadsheetUrl?: string;
  embedUrl?: string;
  fallbackUrl?: string;
  mode?: SheetsMode;
  height?: number;
  sourceNote?: string;
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
}: GoogleSheetsEmbedProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const open = inspectSheetsUrl(spreadsheetUrl);
  const embed = inspectEmbedUrl(embedUrl, spreadsheetUrl);
  const fallback = fallbackUrl ? inspectSheetsUrl(fallbackUrl) : null;
  const openHref = open.ok ? open.openUrl : fallback?.ok ? fallback.openUrl : null;
  const showIframe = mode === "embedded-view" && embed.ok;

  useEffect(() => {
    setLoading(true);
  }, [embed.ok ? embed.embedUrl : ""]);

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
    else if (openHref) openSheets(openHref);
  };

  return (
    <section className="gs-embed glass-flat" aria-label={title}>
      <header className="gs-head">
        <div>
          <div className="row" style={{ marginBottom: 4 }}>
            <span className="pill">{mode === "embedded-view" ? "Embedded view" : "Open in Google Sheets"}</span>
            {mode === "embedded-view" && <span className="pill">Read-only preview</span>}
          </div>
          <h3>{title}</h3>
          {description && <p className="muted small">{description}</p>}
          {sourceNote && <p className="small faint">{sourceNote}</p>}
        </div>
        <div className="row">
          {openHref && (
            <button type="button" className="btn primary" onClick={() => openSheets(openHref)}>
              <ExternalLink size={15} aria-hidden="true" /> Open in Google Sheets
            </button>
          )}
          {showIframe && (
            <button type="button" className="btn" onClick={fullscreen}>
              <Maximize2 size={15} aria-hidden="true" /> Open Full Screen
            </button>
          )}
        </div>
      </header>

      {mode === "embedded-view" && (
        <p className="small faint">
          A published or shared preview is generally read-only. This page cannot edit Google cells, save student work in Google, or bypass sharing permissions.
        </p>
      )}
      {mode === "open-in-sheets" && (
        <p className="small">
          Editing happens in Google Sheets. Sign in if Google asks. For graded work, make your own copy so the original template is not changed by every student.
        </p>
      )}

      {showIframe ? (
        <div ref={wrapRef} className="gs-frame" style={{ minHeight: height }}>
          {loading && <div className="gs-loading" role="status">Loading Google Sheets…</div>}
          <iframe
            title={title}
            src={embed.ok ? embed.embedUrl : undefined}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
            onLoad={() => setLoading(false)}
          />
        </div>
      ) : (
        <div className="callout warn" role="status">
          {!spreadsheetUrl && !embedUrl
            ? "No Google Sheets URL is configured for this exercise. Add a share or Publish-to-web link in Settings."
            : embed.ok
              ? "This exercise is set to open in Google Sheets rather than embed a preview."
              : embed.error}
          {openHref && <div style={{ marginTop: 8 }}><button type="button" className="btn primary" onClick={() => openSheets(openHref)}>Open in Google Sheets</button></div>}
        </div>
      )}

      <p className="small faint">
        If Google shows a sign-in or access request, the document is not published for embedding. Use Open in Google Sheets. This website cannot see inside the iframe, so a blank frame is not always a broken link.
      </p>
    </section>
  );
}

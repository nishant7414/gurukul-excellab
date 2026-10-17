import { useMemo, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { actions, usePersistStatus, useStore } from "../state/store";
import { ALL_EXERCISES } from "../content/registry";
import { inspectSheetsUrl } from "../sheets/urls";
import { GOOGLE_SHEET_DEFAULTS } from "../sheets/catalog";
import { auditWorkbookConfig } from "../sheets/registry";
import { LOCAL_PERSIST_NOTICE, PROFILE_NOT_SECURE } from "../learning/messages";
import { EXPORT_NOTICE } from "../state/persist";
import { HELP_SECTIONS } from "../learning/help";

type AuditFilter = "all" | "local-only" | "configured" | "invalid" | "quiz";

export default function Settings() {
  const s = useStore((x) => x);
  const persist = usePersistStatus();
  const [name, setName] = useState(s.displayName);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [confirmProfile, setConfirmProfile] = useState("");
  const sheetExercises = useMemo(() => ALL_EXERCISES.filter((e) => !e.questions), []);
  const googleSheets = useStore((x) => x.settings.googleSheets);
  const [sheetId, setSheetId] = useState(sheetExercises[0]?.id ?? "");
  const currentAssign = googleSheets[sheetId] ?? GOOGLE_SHEET_DEFAULTS[sheetId];
  const [sheetUrl, setSheetUrl] = useState(currentAssign?.spreadsheetUrl ?? "");
  const [embedUrl, setEmbedUrl] = useState(currentAssign?.embedUrl ?? "");
  const [fallbackUrl, setFallbackUrl] = useState(currentAssign?.fallbackUrl ?? "");
  const [sheetTitle, setSheetTitle] = useState(currentAssign?.title ?? "");
  const [sheetSaved, setSheetSaved] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("all");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audit = useMemo(() => auditWorkbookConfig(googleSheets), [googleSheets]);
  const liveUrl = inspectSheetsUrl(sheetUrl);
  const liveEmbed = embedUrl.trim() ? inspectSheetsUrl(embedUrl) : null;
  const liveEdit = fallbackUrl.trim() ? inspectSheetsUrl(fallbackUrl) : null;

  const pickSheet = (id: string) => {
    setSheetId(id);
    const a = googleSheets[id] ?? GOOGLE_SHEET_DEFAULTS[id];
    setSheetUrl(a?.spreadsheetUrl ?? "");
    setEmbedUrl(a?.embedUrl ?? "");
    setFallbackUrl(a?.fallbackUrl ?? "");
    setSheetTitle(a?.title ?? "");
  };
  const saveSheet = () => {
    const check = inspectSheetsUrl(sheetUrl);
    if (!check.ok) { window.alert(check.error); return; }
    if (embedUrl.trim()) {
      const emb = inspectSheetsUrl(embedUrl);
      if (!emb.ok) { window.alert(emb.error); return; }
    }
    if (fallbackUrl.trim()) {
      const fb = inspectSheetsUrl(fallbackUrl);
      if (!fb.ok) { window.alert(fb.error); return; }
    }
    actions.setGoogleSheet(sheetId, { title: sheetTitle.trim() || undefined, spreadsheetUrl: sheetUrl.trim(), embedUrl: embedUrl.trim() || undefined, fallbackUrl: fallbackUrl.trim() || undefined, mode: "embedded-view" });
    setSheetSaved(true);
    setTimeout(() => setSheetSaved(false), 1500);
  };

  const download = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gurukul-excellab-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onImportFile = async (file: File | undefined) => {
    setImportErr(null);
    setImportMsg(null);
    if (!file) return;
    const text = await file.text();
    const parsed = actions.parseImport(text);
    if (!parsed.ok) { setImportErr(parsed.error); return; }
    const replace = window.confirm("Replace this GG ID's local progress and saved workbook links with the file? Other local profiles on this browser are left alone. This cannot be undone.");
    if (!replace) { setImportMsg("Import cancelled. Existing local progress was kept."); return; }
    actions.importProgress(parsed.data, true);
    setImportMsg(`Imported progress for this local profile (${parsed.data.profile.attempts.length} attempt(s)). ${EXPORT_NOTICE}`);
  };

  const rows = audit.bindings.filter((b) => auditFilter === "all" || b.status === auditFilter);
  const persistLabel = persist.status === "saving" ? "Saving…" : persist.status === "error" ? persist.message ?? "Save failed" : persist.status === "saved" ? "Saved in this browser" : "Local browser storage";

  return (
    <div className="page stack">
      <header><h1>Settings</h1></header>

      <section className="glass card" aria-labelledby="prof-h">
        <h2 id="prof-h">Profile</h2>
        <p className="muted small">Signed in as <strong>{s.displayName}</strong>{s.auth.email ? <> ({s.auth.email})</> : null}. The name was taken from the GG ID used at sign-in. You can change how it is shown here.</p>
        <p className="small faint">{PROFILE_NOT_SECURE}</p>
        <form className="row" onSubmit={(e) => { e.preventDefault(); actions.setName(name); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
          <label className="row">Display name <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
          <button className="btn" type="submit">Save</button>
          {saved && <span role="status" className="pill ok">Saved</span>}
        </form>
      </section>

      <section className="glass card" aria-labelledby="th-h">
        <h2 id="th-h">Appearance</h2>
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend className="muted small">Theme</legend>
          <div className="row">
            {(["system", "light", "dark"] as const).map((t) => (
              <label key={t} className="row"><input type="radio" name="theme" checked={s.settings.theme === t} onChange={() => actions.setTheme(t)} /> {t === "system" ? "Match my device" : t[0].toUpperCase() + t.slice(1)}</label>
            ))}
          </div>
        </fieldset>
        <p className="small faint">Animations are turned off automatically when your device asks for reduced motion.</p>
      </section>

      <section className="glass card" aria-labelledby="gs-h">
        <h2 id="gs-h">Google Sheets workbooks</h2>
        <p className="muted small">Assign a real Google Sheets document to a lesson or challenge. URLs stay in this browser. Gurukul ExcelLab has no Google API key and cannot embed the full editor. A valid URL is not proof that the file is shared with students.</p>
        <ol className="steps small">
          <li>Open the template in Google Sheets. Use <strong>File → Share → Publish to web → Embed</strong> for a read-only preview, or <strong>Share</strong> with “Anyone with the link can view”.</li>
          <li>Paste the share link below. Students open the real editor with <strong>Open in Google Sheets</strong> or <strong>Make my own copy</strong> (Google’s official <code>/copy</code> page).</li>
          <li>Do not give every student edit access to the original. Each student should keep a personal copy.</li>
        </ol>
        <p className="small faint">Unassigned practical challenges stay on their local Gurukul dataset. Google’s public Class Data sample is not attached to lessons.</p>
        <div className="row" style={{ margin: "10px 0" }}>
          <span className="pill">Local-only {audit.localOnly}</span>
          <span className="pill ok">Configured {audit.configured}</span>
          <span className="pill bad">Invalid {audit.invalid}</span>
          <span className="pill">Quizzes {audit.quizzes}</span>
          <span className="pill">Unused mappings {audit.unused.length}</span>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <label className="row">Exercise
            <select value={sheetId} onChange={(e) => pickSheet(e.target.value)} aria-label="Exercise for Google Sheets URL">
              {sheetExercises.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.id})</option>)}
            </select>
          </label>
          <label>Display title <input type="text" value={sheetTitle} onChange={(e) => setSheetTitle(e.target.value)} placeholder="Optional" /></label>
          <label>Spreadsheet URL <input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…/edit?usp=sharing" /></label>
          <label>Published embed URL (optional) <input type="url" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/e/…/pubhtml or /preview" /></label>
          <label>Copy-template / editable URL (optional) <input type="url" value={fallbackUrl} onChange={(e) => setFallbackUrl(e.target.value)} /></label>
          <div className="row">
            {sheetUrl.trim() ? (liveUrl.ok ? <span className="pill ok">Editable workbook link looks valid</span> : <span className="pill bad">Invalid URL</span>) : <span className="pill warn">Missing workbook</span>}
            {liveEmbed?.ok && <span className="pill">Read-only preview URL</span>}
            {liveEdit?.ok && <span className="pill">Separate editable URL</span>}
            <span className="pill">Local-only persistence</span>
          </div>
          <div className="row">
            <button className="btn primary" type="button" onClick={saveSheet}>Save workbook URL</button>
            <button className="btn ghost" type="button" onClick={() => { actions.setGoogleSheet(sheetId, null); setSheetUrl(""); setEmbedUrl(""); setFallbackUrl(""); setSheetTitle(""); }}>Clear this exercise</button>
            {sheetSaved && <span role="status" className="pill ok">Saved</span>}
          </div>
        </div>
        <h3 style={{ marginTop: 18 }}>Configuration audit</h3>
        <p className="small faint">Every challenge has an explicit status. “Missing” means no Google URL is assigned; the local dataset still works. Duplicate spreadsheet IDs are listed when more than one exercise points at the same file.</p>
        {audit.duplicates.length > 0 && <p className="small">Duplicate spreadsheet IDs: {audit.duplicates.map((d) => `${d.spreadsheetId} (${d.exerciseIds.join(", ")})`).join(" · ")}</p>}
        {audit.unused.length > 0 && <p className="small">Unused mappings: {audit.unused.join(", ")}</p>}
        <div className="tabs" role="tablist" aria-label="Workbook audit filter">
          {(["all", "local-only", "configured", "invalid", "quiz"] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={auditFilter === f} onClick={() => setAuditFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Exercise</th><th>Status</th><th>Local dataset</th><th>Google</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 80).map((b) => (
                <tr key={b.exerciseId}>
                  <td><button type="button" className="btn ghost" onClick={() => pickSheet(b.exerciseId)}>{b.title}<br /><span className="small faint">{b.workbookId}</span></button></td>
                  <td><span className={`pill ${b.status === "configured" ? "ok" : b.status === "invalid" ? "bad" : b.status === "local-only" ? "warn" : ""}`}>{b.status}</span></td>
                  <td className="small">{b.datasetTitles.join(", ") || b.datasetNote}</td>
                  <td className="small">{b.google ? (b.open?.ok ? "URL format valid (access not verified)" : b.open && !b.open.ok ? b.open.error : "—") : "Not assigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 80 && <p className="small faint">Showing 80 of {rows.length}. Filter to narrow the list.</p>}
      </section>

      <section className="glass card" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <p className="small">This profile: {Object.keys(s.exercises).length} exercise record(s), {s.attempts.length} attempt(s), {s.mistakes.length} mistake(s), {Object.keys(s.practiceWorkbooks).length} saved workbook link(s).</p>
        <p className="small faint" role="status">{persistLabel}. {LOCAL_PERSIST_NOTICE}</p>
        <div className="row">
          <button className="btn" onClick={download}><Download size={16} aria-hidden="true" /> Export my progress (JSON)</button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}><Upload size={16} aria-hidden="true" /> Import progress</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Import progress JSON" onChange={(e) => { void onImportFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {importErr && <p className="small" role="alert">{importErr}</p>}
        {importMsg && <p className="small" role="status">{importMsg}</p>}
      </section>

      <section className="glass card" aria-labelledby="help-h">
        <h2 id="help-h">Help &amp; about</h2>
        <p className="muted small">Technical notes about checking answers, local storage, and spreadsheet limits. These details are not shown on lesson pages.</p>
        <div className="stack help-sections">
          {HELP_SECTIONS.map((sec) => (
            <details key={sec.id} className="help-block">
              <summary><strong>{sec.title}</strong></summary>
              {sec.paragraphs.map((p, i) => <p key={i} className="small">{p}</p>)}
            </details>
          ))}
        </div>
      </section>

      <section className="glass card" aria-labelledby="rs-h">
        <h2 id="rs-h">Reset</h2>
        <p className="muted small">Reset this GG ID’s local progress, or delete every local profile stored in this browser. Type the confirmation word to enable the button.</p>
        <div className="row">
          <input type="text" aria-label="Confirm RESET PROFILE" value={confirmProfile} onChange={(e) => setConfirmProfile(e.target.value)} placeholder="RESET PROFILE" />
          <button className="btn danger" disabled={confirmProfile !== "RESET PROFILE"} onClick={() => { actions.resetCurrentProfile(); setConfirmProfile(""); }}><Trash2 size={16} aria-hidden="true" /> Reset this profile</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <input type="text" aria-label="Type RESET to confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESET" />
          <button className="btn danger" disabled={confirm !== "RESET"} onClick={() => { actions.resetAll(); setConfirm(""); }}><Trash2 size={16} aria-hidden="true" /> Delete all progress</button>
        </div>
      </section>
    </div>
  );
}

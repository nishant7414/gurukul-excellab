import { useMemo, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { actions, useStore } from "../state/store";
import { ALL_EXERCISES } from "../content/registry";
import { inspectSheetsUrl } from "../sheets/urls";
import { GOOGLE_SHEET_DEFAULTS, GOOGLE_SAMPLE_SHEET } from "../sheets/catalog";

export default function Settings() {
  const s = useStore((x) => x);
  const [name, setName] = useState(s.displayName);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");
  const sheetExercises = useMemo(() => ALL_EXERCISES.filter((e) => !e.questions), []);
  const googleSheets = useStore((x) => x.settings.googleSheets);
  const [sheetId, setSheetId] = useState(sheetExercises[0]?.id ?? "");
  const currentAssign = googleSheets[sheetId] ?? GOOGLE_SHEET_DEFAULTS[sheetId];
  const [sheetUrl, setSheetUrl] = useState(currentAssign?.spreadsheetUrl ?? "");
  const [embedUrl, setEmbedUrl] = useState(currentAssign?.embedUrl ?? "");
  const [fallbackUrl, setFallbackUrl] = useState(currentAssign?.fallbackUrl ?? "");
  const [sheetTitle, setSheetTitle] = useState(currentAssign?.title ?? "");
  const [sheetSaved, setSheetSaved] = useState(false);
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

  return (
    <div className="page stack">
      <header><h1>Settings</h1></header>

      <section className="glass card" aria-labelledby="prof-h">
        <h2 id="prof-h">Profile</h2>
        <p className="muted small">Signed in as <strong>{s.displayName}</strong>{s.auth.email ? <> ({s.auth.email})</> : null}. The name was taken from the GG ID used at sign-in. You can change how it is shown here.</p>
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
        <p className="muted small">Assign a real Google Sheets document to a lesson or challenge. URLs stay in this browser. Gurukul ExcelLab has no Google API key and cannot embed the full editor.</p>
        <ol className="steps small">
          <li>Open the template in Google Sheets. Use <strong>File → Share → Publish to web → Embed</strong> for a read-only preview, or <strong>Share</strong> with “Anyone with the link can view”.</li>
          <li>Paste the share link below. Students open the real editor with <strong>Open in Google Sheets</strong> or <strong>Make my own copy</strong> (Google’s official <code>/copy</code> page).</li>
          <li>Do not give every student edit access to the original. Each student should keep a personal copy.</li>
        </ol>
        <p className="small faint">Until you assign a workbook, exercises show Google&apos;s public sample: {GOOGLE_SAMPLE_SHEET.spreadsheetUrl}</p>
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
            <button className="btn primary" type="button" onClick={saveSheet}>Save workbook URL</button>
            <button className="btn ghost" type="button" onClick={() => { actions.setGoogleSheet(sheetId, null); setSheetUrl(""); setEmbedUrl(""); setFallbackUrl(""); setSheetTitle(""); }}>Clear this exercise</button>
            {sheetSaved && <span role="status" className="pill ok">Saved</span>}
          </div>
        </div>
      </section>

      <section className="glass card" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <p className="small">Saved so far: {Object.keys(s.exercises).length} exercise record(s), {s.attempts.length} attempt(s), {s.mistakes.length} mistake(s), {s.imports.length} import review(s).</p>
        <div className="row"><button className="btn" onClick={download}><Download size={16} aria-hidden="true" /> Export my progress (JSON)</button></div>
      </section>

      <section className="glass card" aria-labelledby="rs-h">
        <h2 id="rs-h">Reset</h2>
        <p className="muted small">Deletes all progress, answers and mistakes from this browser and signs you out. This cannot be undone. Type <code>RESET</code> to enable the button.</p>
        <div className="row"><input type="text" aria-label="Type RESET to confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESET" />
          <button className="btn danger" disabled={confirm !== "RESET"} onClick={() => { actions.resetAll(); setConfirm(""); }}><Trash2 size={16} aria-hidden="true" /> Delete all progress</button></div>
      </section>
    </div>
  );
}

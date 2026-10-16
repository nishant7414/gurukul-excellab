import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { actions, useStore } from "../state/store";

export default function Settings() {
  const s = useStore((x) => x);
  const [name, setName] = useState(s.displayName);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");

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

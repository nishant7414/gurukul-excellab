import { useId, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { verifyDemoLogin } from "../auth/accounts";
import { APP_NAME, INSTITUTION, TAGLINE } from "../brand";
import { GunvattaGurukulLogo } from "../ui/GunvattaGurukulLogo";
import { actions } from "../state/store";

const CHECK_MS = 280;

/**
 * Frontend-only demo gate. Credentials are checked in the browser against
 * the shared demo password. This is not authentication and can be bypassed.
 */
export default function Login() {
  const emailId = useId();
  const passwordId = useId();
  const errId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormErr("");
    const nextEmailErr = email.trim() ? "" : "Enter your GG ID or email.";
    const nextPwErr = password ? "" : "Enter your password.";
    setEmailErr(nextEmailErr);
    setPasswordErr(nextPwErr);
    if (nextEmailErr || nextPwErr) return;

    setBusy(true);
    window.setTimeout(() => {
      const result = verifyDemoLogin(email, password);
      setBusy(false);
      if (!result.ok) {
        setFormErr(result.error);
        return;
      }
      setPassword("");
      actions.signIn(result.email, result.displayName);
    }, CHECK_MS);
  };

  return (
    <div className="login-page">
      <a className="skip" href="#login-form">Skip to sign-in form</a>
      <div className="login-stack">
        <div className="login-letterhead">
          <GunvattaGurukulLogo size="login" />
        </div>
        <div className="login-card glass">
          <div className="login-body">
        <div className="login-brand">
          <h1>{APP_NAME}</h1>
          <p className="muted">Powered by {INSTITUTION}</p>
          <p className="small faint">{TAGLINE}</p>
        </div>
        <p>Welcome back! Sign in with your GG ID to continue learning.</p>
        <form id="login-form" className="stack login-form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor={emailId}>GG ID / Email</label>
            <input
              id={emailId}
              className="input"
              type="text"
              name="email"
              autoComplete="username"
              inputMode="email"
              spellCheck={false}
              value={email}
              disabled={busy}
              aria-invalid={!!emailErr || undefined}
              aria-describedby={emailErr ? `${emailId}-err` : undefined}
              onChange={(ev) => { setEmail(ev.target.value); setEmailErr(""); setFormErr(""); }}
            />
            {emailErr && <p id={`${emailId}-err`} className="field-err" role="alert">{emailErr}</p>}
          </div>
          <div className="field">
            <label htmlFor={passwordId}>Password</label>
            <div className="pw-wrap">
              <input
                id={passwordId}
                className="input"
                type={showPw ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                value={password}
                disabled={busy}
                aria-invalid={!!passwordErr || undefined}
                aria-describedby={passwordErr ? `${passwordId}-err` : undefined}
                onChange={(ev) => { setPassword(ev.target.value); setPasswordErr(""); setFormErr(""); }}
              />
              <button
                type="button"
                className="btn ghost pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-pressed={showPw}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {passwordErr && <p id={`${passwordId}-err`} className="field-err" role="alert">{passwordErr}</p>}
          </div>
          {formErr && <p id={errId} className="field-err" role="alert">{formErr}</p>}
          <button className="btn primary" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        </div>
        </div>
      </div>
    </div>
  );
}

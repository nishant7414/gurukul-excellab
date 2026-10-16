import { displayNameFromEmail } from "./displayName";

/**
 * Frontend-only demo login. This is not authentication: anyone can read this file
 * or skip the login screen in the browser. Passwords are never stored after a successful sign-in.
 *
 * Any non-empty GG ID / email signs in when the shared demo password matches.
 * Add rows to DISPLAY_NAME_OVERRIDES when a specific address should show a chosen name.
 */
export const DEMO_PASSWORD = "QCI@123";

export const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  "ggstudent@example.com": "GG Student",
};

export type LoginResult =
  | { ok: true; email: string; displayName: string }
  | { ok: false; error: string };

export function verifyDemoLogin(rawEmail: string, password: string): LoginResult {
  const email = rawEmail.trim();
  if (!email) return { ok: false, error: "Enter your GG ID or email." };
  if (!password) return { ok: false, error: "Enter your password." };
  if (password !== DEMO_PASSWORD) {
    return { ok: false, error: "That password is not recognised. Check it and try again." };
  }
  const override = DISPLAY_NAME_OVERRIDES[email.toLowerCase()];
  return { ok: true, email, displayName: override ?? displayNameFromEmail(email) };
}

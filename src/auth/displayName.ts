/**
 * Friendly name from a login email's local part.
 * Dots, underscores and hyphens become spaces; each word is capitalised.
 * The domain is never included.
 */
export function displayNameFromEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  const local = (at >= 0 ? trimmed.slice(0, at) : trimmed).trim();
  const spaced = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) return "Learner";
  return spaced.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
}

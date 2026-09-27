/** Tosker discovery handle, not a Clerk authentication identifier.
 * New provisioning and explicit owner edits share a lowercase discovery namespace. */
const reserved = new Set(["admin", "administrator", "support", "tosker", "system", "moderator", "help", "settings", "profile", "notifications", "root", "api"]);
export function usernameBase(value: string) {
  let base = value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,24).replace(/-+$/g,"");
  if (!base) base="member";
  if (base.length<3 || reserved.has(base)) base=`${base}-member`;
  return base;
}
export function isProvisionedUsername(value: string) {
  return /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/.test(value) && !reserved.has(value);
}

export function normalizeUsernameEdit(value: unknown) {
  if (typeof value !== "string" || value.length > 80) throw new Error("Use 3–24 letters, numbers or hyphens.");
  const username = value.trim().replace(/^@/, "").toLowerCase();
  if (!isProvisionedUsername(username)) throw new Error("Use 3–24 letters, numbers or hyphens; start and end with a letter or number. This name may be reserved.");
  return username;
}

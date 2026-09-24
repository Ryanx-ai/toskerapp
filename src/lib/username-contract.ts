/** Tosker discovery handle, not a Clerk authentication identifier.
 * Existing handles are immutable. This policy only governs new provisioning. */
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

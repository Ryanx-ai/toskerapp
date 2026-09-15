export const TID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export function isCanonicalTid(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z0-9]{7}$/.test(value);
}
/** Normalize lookup only, never silently change a stored identity. */
export function normalizeTidLookup(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed=value.trim();
  return /^[a-zA-Z0-9]{7}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

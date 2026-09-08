/** Stable, non-semantic geometry: never infer personal attributes from a name. */
export function identityHash(seed: string) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);
  return hash >>> 0;
}
export const IDENTITY_PALETTES = [
  ["#243c42", "#a5d8c4", "#efd0a1"], ["#433046", "#e9acd1", "#f0d8b0"],
  ["#263c53", "#a8cee9", "#d9c5ea"], ["#483a25", "#e6ca8f", "#bce1ce"],
  ["#39334c", "#c7b5e4", "#f1c2a4"], ["#32413c", "#c4d8ac", "#f2c2c5"],
] as const;
export function identityPalette(seed: string) { return IDENTITY_PALETTES[identityHash(seed) % IDENTITY_PALETTES.length]; }
export function roomShorthand(name: string) {
  const words = name.normalize("NFKC").trim().split(/\s+/).filter(Boolean);
  const graphemes = (value: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map((part) => part.segment);
  const parts = words.length > 1 ? words.slice(0, 3).map((word) => graphemes(word)[0]) : graphemes(words[0] ?? "Room").slice(0, 3);
  return parts.join("").toLocaleUpperCase("en-US");
}
export function approvedAvatarUrl(value?: string | null) {
  if (!value) return null;
  if (/^\/(?!\/)[a-zA-Z0-9_/-]+\.(?:png|webp|jpe?g|svg)$/i.test(value)) return value;
  try { const url = new URL(value); return url.protocol === "https:" && ["img.clerk.com", "images.clerk.dev"].includes(url.hostname) && !url.username && !url.password ? url.href : null; } catch { return null; }
}

/** Shared validation vocabulary, not a client-side authorization decision. */
export const PROFILE_AUDIENCES = ["self", "friends", "shared_context"] as const;
export type ProfileAudience = (typeof PROFILE_AUDIENCES)[number];
export const IDENTITY_ACCENTS = ["neutral", "gold", "rose", "sage", "sky"] as const;
export type IdentityAccent = (typeof IDENTITY_ACCENTS)[number];
export const IDENTITY_BANNERS = ["glow", "weave", "plain"] as const;
export type IdentityBanner = (typeof IDENTITY_BANNERS)[number];
export const IDENTITY_FRAMES = ["none", "ring"] as const;
export type IdentityFrame = (typeof IDENTITY_FRAMES)[number];
export const INTERFACE_ACCENTS = ["tosker", "iris", "tide"] as const;
export type InterfaceAccent = (typeof INTERFACE_ACCENTS)[number];
/** Curated, opaque colors; no user CSS or arbitrary token overrides. */
export const interfacePalette = {
  tosker: { fill: "#b82560", highlight: "#e9acd0" },
  iris: { fill: "#6552a6", highlight: "#c6b7f1" },
  tide: { fill: "#236b77", highlight: "#98d5db" },
} satisfies Record<InterfaceAccent, { fill: string; highlight: string }>;
export const audienceLabels: Record<ProfileAudience, string> = {
  self: "Only me", friends: "Friends", shared_context: "Friends and Room members",
};
/** UTF-16 units match native maxLength and the existing 80-unit name contract. */
export function normalizeProfileText(value: unknown, max: number, required = false) {
  if (typeof value !== "string") throw new Error("Use plain text.");
  const normalized = value.normalize("NFC").trim();
  if ((required && !normalized) || normalized.length > max || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value)) throw new Error(`Use ${required ? "1–" : "up to "}${max} characters without control characters.`);
  return normalized;
}

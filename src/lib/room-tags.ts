export const DEFAULT_ROOM_TAGS = ["TRIP", "EVENT", "WORK", "GAMING", "FAMILY", "Just Chilling"];
export function normalizeRoomTags(input: string[]) {
  if (!Array.isArray(input) || input.length > 5) throw new Error("Choose up to five tags.");
  const tags = input.map((tag) => {
    if (typeof tag !== "string") throw new Error("Invalid tag.");
    const clean = tag.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!clean || clean.length > 24 || /[\p{Cc}\p{Cf}<>]/u.test(clean)) throw new Error("Tags must contain 1–24 visible characters.");
    return clean;
  });
  return tags.filter((tag, index) => tags.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === index);
}

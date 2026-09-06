export const HALL_REACTIONS = [
  { key: "heart", emoji: "❤️", label: "Love" },
  { key: "like", emoji: "👍", label: "Like" },
  { key: "celebrate", emoji: "🎉", label: "Celebrate" },
] as const;
export type HallReaction = (typeof HALL_REACTIONS)[number]["key"];

// Reserved for reviewed, same-origin files. No remote URL fetching or data URLs.
// An authenticated upload/storage adapter must populate this boundary later.
export function safeHallImagePath(path: string | null | undefined) {
  return path && /^\/hall-media\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp|avif)$/.test(path) ? path : null;
}

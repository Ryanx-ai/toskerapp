import "server-only";
import emojiData from "@/data/emoji.json";
const emojiSet = new Set(emojiData.map(([emoji]) => emoji));
export function validateEmoji(emoji: string) {
  if (typeof emoji !== "string" || !emojiSet.has(emoji)) throw new Error("Choose a standard emoji.");
}

export type ReactionSummary = { emoji: string; count: number; mine: boolean; participants: string[] };
export const QUICK_EMOJI = [
  ["❤️", "red heart"], ["👍", "thumbs up"], ["😂", "face with tears of joy"],
  ["🎉", "party popper"], ["🔥", "fire"], ["👀", "eyes"],
] as const;

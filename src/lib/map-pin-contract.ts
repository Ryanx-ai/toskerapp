import type { PlaceCandidate } from "./trip-contract";

export const MAP_PIN_STATES = [
  { key: "favourite", label: "Favourite", icon: "♥" },
  { key: "want-to-go", label: "Want to go", icon: "⚑" },
  { key: "been-here", label: "Been here", icon: "✓" },
  { key: "saved", label: "Saved", icon: "⌖" },
] as const;
export type MapPinState = typeof MAP_PIN_STATES[number]["key"];
export type MapPin = PlaceCandidate & {
  id: string; conversationId: string; scope: string; state: MapPinState; revision: number;
  creatorId: string; createdAt: string; updatedAt: string;
  contextName: string; contextKind: "sandbox" | "personal" | "room" | "subroom";
  people: string[]; hidden: boolean; preferenceRevision: number;
};
export type MapPinPage = { pins: MapPin[]; next: string | null };
export type PinCommand =
  | { type: "create"; candidate: PlaceCandidate; state: MapPinState }
  | { type: "state"; pinId: string; expectedRevision: number; state: MapPinState }
  | { type: "nuke"; pinId: string; expectedRevision: number }
  | { type: "hide"; pinId: string; expectedRevision: number; expectedPreferenceRevision: number; hidden: boolean };
export type PinMutation = { scope: string; requestId: string; command: PinCommand };
export const pinState = (state: MapPinState) => MAP_PIN_STATES.find(s => s.key === state)!;

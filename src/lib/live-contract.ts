import { isConversationId } from "./realtime-contract";

export const liveChannel = (conversationId: string) => `tosker:live:${conversationId}`;
export const LIVE_MAX_PARTICIPANTS = 100;
export const LIVE_RECOVERY_MS = 30_000;
export const REALTIME_SIGNOUT = "tosker:realtime-signout";
export type LiveParticipant = { userId: string; displayName: string; avatarUrl: string | null };
export type LivePhase = "not-joined" | "joining" | "connected" | "reconnecting" | "disconnected";
export type LiveSnapshot = {
  phase: LivePhase;
  participants: LiveParticipant[];
  ready: boolean;
  message: string;
};

export function validLiveRosterRequest(value: unknown): value is { conversationId: string; userIds: string[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return Object.keys(input).every(key => key === "conversationId" || key === "userIds") &&
    isConversationId(input.conversationId) && Array.isArray(input.userIds) &&
    input.userIds.length <= LIVE_MAX_PARTICIPANTS && input.userIds.every(isConversationId);
}

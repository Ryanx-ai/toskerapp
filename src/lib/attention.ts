import type { ConversationPreference } from "./conversation-preferences";
type Activity = { type: string; conversationId: string | null; readAt: string | null; destinationReadAt: string | null; muted?: boolean };

export function deriveAttention(activity: Activity[], preferences: ConversationPreference[] = []) {
  const conversations: Record<string, number> = {};
  let requests = 0, notifications = 0;
  for (const item of activity) {
    if (!item.readAt && !item.muted) notifications++;
    if (item.destinationReadAt) continue;
    if (item.type === "connection_request") requests++;
    if (item.conversationId && ["message", "hall_note", "hall_pin"].includes(item.type)) conversations[item.conversationId] = (conversations[item.conversationId] ?? 0) + 1;
  }
  for (const pref of preferences) {
    const manual = Number(Boolean(pref.manualChatUnreadId)) + Number(Boolean(pref.manualHallUnreadId));
    if (manual) conversations[pref.conversationId] = (conversations[pref.conversationId] ?? 0) + manual;
  }
  return { conversations, requests, notifications };
}

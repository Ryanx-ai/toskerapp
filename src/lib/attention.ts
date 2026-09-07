type Activity = { type: string; conversationId: string | null; readAt: string | null; destinationReadAt: string | null };

export function deriveAttention(activity: Activity[]) {
  const conversations: Record<string, number> = {};
  let requests = 0, notifications = 0;
  for (const item of activity) {
    if (!item.readAt) notifications++;
    if (item.destinationReadAt) continue;
    if (item.type === "connection_request") requests++;
    if (item.conversationId && ["message", "hall_note", "hall_pin"].includes(item.type)) conversations[item.conversationId] = (conversations[item.conversationId] ?? 0) + 1;
  }
  return { conversations, requests, notifications };
}

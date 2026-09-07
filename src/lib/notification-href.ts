export function notificationHref(item: { conversationKind: string | null; roomSlug: string | null; subroomId: string | null; conversationId: string | null; type: string }) {
  const base = item.conversationKind === "room" && item.roomSlug
    ? `/room/${item.roomSlug}${item.subroomId ? `/subroom/${item.subroomId}` : ""}`
    : item.conversationKind === "personal" && item.conversationId ? `/personal/chat-${item.conversationId}`
    : item.conversationKind === "sandbox" ? "/personal/my-room" : "/friends";
  return item.type.startsWith("hall_") && base !== "/friends" ? `${base}/hall` : base;
}

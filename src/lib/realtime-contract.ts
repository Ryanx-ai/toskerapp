/** Channel names contain opaque database IDs, never names or message content. */
export const conversationChannel = (id: string) => `tosker:conversation:${id}`;
export const typingChannel = (id: string) => `tosker:typing:${id}`;
export const userChannel = (id: string) => `tosker:user:${id}`;
export const USER_ACTIVITY = "activity.changed";
export const CHAT_REFRESH = "tosker:chat-refresh";
export const HALL_REFRESH = "tosker:hall-refresh";
export const ACTIVITY_REFRESH = "tosker:activity-refresh";
export const TYPING_CHANGED = "typing.changed";
export const TYPING_TTL = 5000;
export const MESSAGE_CHANGED = "message.changed";
export const REALTIME_TOKEN_TTL = 10 * 60 * 1000;

export function isConversationId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

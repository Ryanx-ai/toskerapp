/** UI-only request to revisit the same canonical URL target; no activity mutation. */
export const MESSAGE_LOCATION_REQUEST = "tosker:message-location-request";
export type MessageLocationRequest = { conversationId: string; messageId: string };

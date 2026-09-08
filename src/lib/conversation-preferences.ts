export type ConversationPreference = {
  conversationId: string;
  muted: boolean;
  inheritedMute: boolean;
  manualChatUnreadId: string | null;
  manualHallUnreadId: string | null;
};
export const EMPTY_PREFERENCE = { muted: false, inheritedMute: false, manualChatUnreadId: null, manualHallUnreadId: null };

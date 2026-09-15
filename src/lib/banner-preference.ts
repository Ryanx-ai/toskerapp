/** In-app presentation only. Never changes durable unread or notification storage. */
export const BANNER_PREFERENCES = ["all", "direct_mentions", "quiet"] as const;
export type BannerPreference = (typeof BANNER_PREFERENCES)[number];
export function allowsActivityBanner(mode: BannerPreference, activity: { muted?: boolean; isMention?: boolean; type: string; conversationKind?: string | null }) {
  if (mode === "quiet" || activity.muted) return false;
  return mode === "all" || Boolean(activity.isMention || (activity.type === "message" && activity.conversationKind === "personal"));
}

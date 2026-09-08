"use client";

import type { refreshWorkspaceNavigationAction } from "@/server/accounts/actions";
import type { listNotificationsAction } from "@/server/shared-state/actions";
import type { ConversationPreference } from "@/lib/conversation-preferences";

type Snapshot = {
  userId: string | null;
  navigation: Awaited<ReturnType<typeof refreshWorkspaceNavigationAction>> | null;
  activity: Awaited<ReturnType<typeof listNotificationsAction>>;
  preferences: ConversationPreference[];
  navigationBasis?: object;
};
const empty: Snapshot = { userId: null, navigation: null, activity: [], preferences: [] };
let current = empty;
const listeners = new Set<() => void>();

/** A single actor's in-memory canonical response cache, never an unread authority.
 * Survives client navigation; reload/reconnect always refetches Neon. No storage. */
export const workspaceSnapshot = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  get(userId?: string) { return current.userId === userId ? current : empty; },
  server() { return empty; },
  publish(snapshot: Snapshot) { current = snapshot; listeners.forEach((listener) => listener()); },
};

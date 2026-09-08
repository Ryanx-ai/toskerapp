import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase } from "@/server/db/client";
import { conversationReads, conversations } from "@/server/db/schema";
import { hallScope, lockHallScope } from "@/server/hall/service";
import { isConversationId } from "@/lib/realtime-contract";
import type { ConversationPreference } from "@/lib/conversation-preferences";

export type PreferenceMutation = { kind: "mute"; muted: boolean } | { kind: "unread"; surface: "chat" | "hall" };
export async function changeConversationPreference(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, change: PreferenceMutation) {
  if (!isConversationId(conversationId) || !change || (change.kind !== "mute" && change.kind !== "unread") || (change.kind === "mute" && typeof change.muted !== "boolean") || (change.kind === "unread" && !["chat", "hall"].includes(change.surface))) throw new Error("Invalid preference.");
  const values = change.kind === "mute" ? { muted: change.muted } : change.surface === "chat" ? { manualChatUnreadId: crypto.randomUUID() } : { manualHallUnreadId: crypto.randomUUID() };
  await db.transaction(async (tx) => {
    await lockHallScope(tx, actor, conversationId);
    await tx.insert(conversationReads).values({ conversationId, userId: actor.userId, ...values }).onConflictDoUpdate({ target: [conversationReads.conversationId, conversationReads.userId], set: values });
  });
}

export async function clearManualUnread(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, surface: "chat" | "hall", observedId?: string | null) {
  if (!observedId) return;
  if (!isConversationId(observedId) || !["chat", "hall"].includes(surface)) throw new Error("Invalid read boundary.");
  await db.transaction(async (tx) => {
    await lockHallScope(tx, actor, conversationId);
    const column = surface === "chat" ? conversationReads.manualChatUnreadId : conversationReads.manualHallUnreadId;
    // Compare-and-clear exactly what this client viewed, never a later manual marker.
    await tx.update(conversationReads).set(surface === "chat" ? { manualChatUnreadId: null } : { manualHallUnreadId: null })
      .where(and(eq(conversationReads.userId, actor.userId), eq(conversationReads.conversationId, conversationId), eq(column, observedId)));
  });
}

export async function listConversationPreferences(db: ToskerDatabase, actor: AuthenticatedActor): Promise<ConversationPreference[]> {
  // Include child conversations inheriting a parent mute even with no own row.
  const ownMute = sql<boolean>`coalesce(${conversationReads.muted}, false)`;
  const parentMute = sql<boolean>`exists(select 1 from conversations parent join conversation_reads pref on pref.conversation_id = parent.id and pref.user_id = ${actor.userId} where parent.room_id = ${conversations.roomId} and parent.is_primary = true and parent.subroom_id is null and pref.muted = true and ${conversations.subroomId} is not null)`;
  const rows = await db.select({ conversationId: conversations.id, muted: ownMute, inheritedMute: parentMute,
    manualChatUnreadId: conversationReads.manualChatUnreadId, manualHallUnreadId: conversationReads.manualHallUnreadId,
  }).from(conversations).leftJoin(conversationReads, and(eq(conversationReads.conversationId, conversations.id), eq(conversationReads.userId, actor.userId)))
    .where(sql`${conversationReads.userId} = ${actor.userId} or ${parentMute}`);
  const allowed = await Promise.all(rows.map(async (row) => {
    try { await hallScope(db, actor, row.conversationId); return row; }
    catch (error) { if (error instanceof AuthorizationDeniedError) return null; throw error; }
  }));
  return allowed.filter((row): row is ConversationPreference => Boolean(row));
}

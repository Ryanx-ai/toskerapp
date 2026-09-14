import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerReader } from "@/server/db/client";
import { conversations, sidebarPins, users } from "@/server/db/schema";
import { isConversationId } from "@/lib/realtime-contract";
import { lockHallScope } from "@/server/hall/service";

/** Read filters stale access before returning even an ID. No title/body projection. */
export async function readSidebarPins(db: ToskerReader, userId: string) {
  const rows = await db.select({ id: sidebarPins.conversationId }).from(sidebarPins).innerJoin(conversations, eq(conversations.id, sidebarPins.conversationId))
    .where(and(eq(sidebarPins.userId, userId), sql`${conversations.subroomId} is null and (${conversations.kind} = 'personal' or (${conversations.kind} = 'room' and ${conversations.isPrimary} = true))
      and exists(select 1 from conversation_participants p where p.conversation_id = ${conversations.id} and p.user_id = ${userId})
      and (${conversations.roomId} is null or exists(select 1 from room_memberships m where m.room_id = ${conversations.roomId} and m.user_id = ${userId}))`))
    .orderBy(asc(sidebarPins.position), asc(sidebarPins.conversationId)).limit(100);
  return rows.map((row) => row.id);
}

export type SidebarPinChange = { kind: "pin"; pinned: boolean } | { kind: "move"; targetId: string; expectedIds: string[] };
export async function changeSidebarPin(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, change: SidebarPinChange) {
  if (!isConversationId(conversationId) || !change || (change.kind !== "pin" && change.kind !== "move") || (change.kind === "pin" && typeof change.pinned !== "boolean") || (change.kind === "move" && (!isConversationId(change.targetId) || !Array.isArray(change.expectedIds) || change.expectedIds.length > 100 || !change.expectedIds.every(isConversationId)))) throw new Error("Invalid sidebar preference.");
  return db.transaction(async (tx) => {
    // Serialize only this account's organization, never another viewer's order.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, actor.userId)).for("update");
    await lockHallScope(tx, actor, conversationId);
    const [target] = await tx.select({ kind: conversations.kind, primary: conversations.isPrimary, child: conversations.subroomId }).from(conversations).where(eq(conversations.id, conversationId));
    if (!target || target.child || (target.kind !== "personal" && !(target.kind === "room" && target.primary))) throw new AuthorizationDeniedError("Only top-level Chats and Rooms can be pinned.");
    const current = await readSidebarPins(tx, actor.userId);
    const ordered = [...current];
    if (change.kind === "pin") {
      const at = ordered.indexOf(conversationId);
      if (change.pinned && at < 0) { if (ordered.length >= 100) throw new Error("Unpin a conversation before adding another."); ordered.push(conversationId); }
      if (!change.pinned && at >= 0) ordered.splice(at, 1);
    } else {
      if (JSON.stringify(current) !== JSON.stringify(change.expectedIds)) return { ids: current, conflict: true };
      const from = ordered.indexOf(conversationId), to = ordered.indexOf(change.targetId);
      if (from < 0 || to < 0) throw new AuthorizationDeniedError("Pinned conversation unavailable.");
      // Revalidate the drop target under the same current Room authority lock.
      await lockHallScope(tx, actor, change.targetId);
      ordered.splice(from, 1); ordered.splice(to, 0, conversationId);
    }
    // Normalization also removes inaccessible stale pins; no conversation mutation.
    await tx.delete(sidebarPins).where(eq(sidebarPins.userId, actor.userId));
    if (ordered.length) await tx.insert(sidebarPins).values(ordered.map((id, position) => ({ userId: actor.userId, conversationId: id, position })));
    return { ids: ordered, conflict: false };
  });
}

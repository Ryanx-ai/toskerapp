import "server-only";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError, requireRoomMember, requireRoomOwner } from "@/server/auth/authorize";
import type { ToskerDatabase } from "@/server/db/client";
import { conversationParticipants, conversations, invites, roomMemberships, rooms, roomTags, subroomAccess, subrooms } from "@/server/db/schema";
import { normalizeRoomTags } from "@/lib/room-tags";
import { lockActorTokens } from "@/server/realtime/access-lock";
import { revokeActorRealtime } from "@/server/realtime/provider";

export async function updateRoom(db: ToskerDatabase, actor: AuthenticatedActor, input: { roomId: string; name: string; tags: string[] }) {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new Error("Enter a Room name up to 80 characters.");
  const tags = normalizeRoomTags(input.tags);
  await db.transaction(async (tx) => {
    await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, input.roomId)).for("update");
    await requireRoomOwner(tx, actor, input.roomId);
    await tx.update(rooms).set({ name, updatedAt: new Date() }).where(eq(rooms.id, input.roomId));
    await tx.update(conversations).set({ title: name }).where(and(eq(conversations.roomId, input.roomId), eq(conversations.isPrimary, true)));
    await tx.delete(roomTags).where(eq(roomTags.roomId, input.roomId));
    if (tags.length) await tx.insert(roomTags).values(tags.map((value) => ({ roomId: input.roomId, value })));
  });
}

export async function revokeRoomInvite(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, inviteId: string) {
  await db.transaction(async (tx) => {
    await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, roomId)).for("update");
    await requireRoomOwner(tx, actor, roomId);
    const [invite] = await tx.update(invites).set({ status: "revoked", updatedAt: new Date() })
      .where(and(eq(invites.id, inviteId), eq(invites.roomId, roomId))).returning({ id: invites.id });
    if (!invite) throw new AuthorizationDeniedError("Invitation unavailable in this Room.");
  });
}

export async function withdrawRoomMember(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, userId: string, revoke = revokeActorRealtime) {
  await db.transaction(async (tx) => {
    await lockActorTokens(tx, userId);
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
    if (!room) throw new AuthorizationDeniedError("Room unavailable.");
    if (actor.userId !== userId) await requireRoomOwner(tx, actor, roomId);
    else await requireRoomMember(tx, actor, roomId);
    const [member] = await tx.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.userId, userId)));
    if (room.ownerId === userId || member?.role === "owner") throw new AuthorizationDeniedError("The Room owner cannot leave or be removed.");
    // An owner retry is safe even if an earlier success response was lost.
    const roomConversations = await tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.roomId, roomId));
    const children = await tx.select({ id: subrooms.id }).from(subrooms).where(eq(subrooms.roomId, roomId));
    await tx.update(invites).set({ status: "revoked", updatedAt: new Date() }).where(and(eq(invites.roomId, roomId), or(eq(invites.recipientUserId, userId), eq(invites.inviterId, userId))));
    if (roomConversations.length) await tx.delete(conversationParticipants).where(and(inArray(conversationParticipants.conversationId, roomConversations.map((row) => row.id)), eq(conversationParticipants.userId, userId)));
    if (children.length) await tx.delete(subroomAccess).where(and(inArray(subroomAccess.subroomId, children.map((row) => row.id)), eq(subroomAccess.userId, userId)));
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.userId, userId)));
    // Block new tokens until both provider invalidation and the DB commit finish.
    // If Ably is unavailable, roll back and report failure; do not claim removal.
    await revoke(userId);
  });
}

export async function joinRoomInvite(db: ToskerDatabase, actor: AuthenticatedActor, token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) throw new Error("Invalid invitation.");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [found] = await db.select({ roomId: invites.roomId }).from(invites).where(eq(invites.tokenHash, tokenHash));
  if (!found) throw new Error("This invitation is invalid or expired.");
  return db.transaction(async (tx) => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, found.roomId)).for("update");
    const [invite] = await tx.select().from(invites).where(eq(invites.tokenHash, tokenHash));
    if (!room || !invite || !["pending", "accepted"].includes(invite.status) || (invite.expiresAt && invite.expiresAt <= new Date())) throw new Error("This invitation is invalid or expired.");
    if (invite.status === "accepted" && invite.recipientUserId !== actor.userId) throw new Error("This invitation has already been accepted.");
    if (invite.status === "pending") await tx.update(invites).set({ status: "accepted", recipientUserId: actor.userId, acceptedAt: new Date(), updatedAt: new Date() }).where(eq(invites.id, invite.id));
    await tx.insert(roomMemberships).values({ roomId: room.id, userId: actor.userId, role: "member" }).onConflictDoNothing();
    const children = await tx.select({ id: subrooms.id }).from(subrooms).leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, actor.userId)))
      .where(and(eq(subrooms.roomId, room.id), or(eq(subrooms.visibility, "everyone"), eq(subroomAccess.userId, actor.userId), room.ownerId === actor.userId ? eq(subrooms.visibility, "owners") : undefined)));
    if (children.length) await tx.insert(subroomAccess).values(children.map(({ id }) => ({ subroomId: id, userId: actor.userId }))).onConflictDoNothing();
    const chats = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.roomId, room.id), children.length ? or(isNull(conversations.subroomId), inArray(conversations.subroomId, children.map(({ id }) => id))) : isNull(conversations.subroomId)));
    if (chats.length) await tx.insert(conversationParticipants).values(chats.map(({ id }) => ({ conversationId: id, userId: actor.userId }))).onConflictDoNothing();
    return { roomSlug: room.slug };
  });
}

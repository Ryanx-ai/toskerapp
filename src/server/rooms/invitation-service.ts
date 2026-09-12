import "server-only";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError, requireRoomMember, requireRoomOwner } from "@/server/auth/authorize";
import type { ToskerDatabase } from "@/server/db/client";
import { connections, connectionNicknames, invites, notifications, profiles, roomMemberships, rooms } from "@/server/db/schema";
import { decryptInvite, encryptInvite, inviteHash, inviteToken } from "./invite-crypto";
import { grantRoomMembership } from "./lifecycle";

export const SHARE_HOURS = [1, 24, 168] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (value: string) => { if (typeof value !== "string" || !uuid.test(value)) throw new Error("Invalid invitation target."); };
const live = () => and(eq(invites.status, "pending"), or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date())));

/** Counter commits independently so failed attempts still consume their quota. */
export async function inviteLimit(db: ToskerDatabase, actor: AuthenticatedActor, operation: "lookup" | "direct" | "share", units = 1) {
  const maximum = operation === "lookup" ? 30 : operation === "direct" ? 30 : 6;
  const duration = operation === "direct" ? 3600 : 60;
  const result = await db.execute(sql`insert into invite_rate_limits (user_id, operation, window_start, attempts)
    values (${actor.userId}, ${operation}, clock_timestamp(), ${units})
    on conflict (user_id, operation) do update set
      attempts = case when invite_rate_limits.window_start <= clock_timestamp() - ${duration} * interval '1 second' then ${units} else invite_rate_limits.attempts + ${units} end,
      window_start = case when invite_rate_limits.window_start <= clock_timestamp() - ${duration} * interval '1 second' then clock_timestamp() else invite_rate_limits.window_start end
    where invite_rate_limits.window_start <= clock_timestamp() - ${duration} * interval '1 second' or invite_rate_limits.attempts + ${units} <= ${maximum}
    returning attempts`);
  if (!result.rows.length) throw new Error("Too many invitation attempts. Please try again later.");
}

export async function invitationCandidates(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, query: string, mode: "friends" | "username") {
  validId(roomId);
  await requireRoomMember(db, actor, roomId);
  if (typeof query !== "string" || query.length > 80 || !["friends", "username"].includes(mode)) throw new Error("Invalid search.");
  const term = query.trim().replace(/^@/, "").toLowerCase();
  await inviteLimit(db, actor, "lookup");
  const personFields = { userId: profiles.userId, displayName: profiles.displayName, username: profiles.username, avatarUrl: profiles.avatarUrl };
  const rows = mode === "username"
    ? /^[a-z0-9_.-]{2,32}$/.test(term) ? await db.select({ ...personFields, nickname: sql<string | null>`null` }).from(profiles).where(and(eq(profiles.username, term), sql`${profiles.userId} <> ${actor.userId}`)).limit(1) : []
    : await db.select({ ...personFields, nickname: connectionNicknames.nickname }).from(connections)
      .innerJoin(profiles, sql`${profiles.userId} = case when ${connections.requesterId} = ${actor.userId} then ${connections.addresseeId} else ${connections.requesterId} end`)
      .leftJoin(connectionNicknames, and(eq(connectionNicknames.connectionId, connections.id), eq(connectionNicknames.userId, actor.userId)))
      .where(and(eq(connections.status, "accepted"), or(eq(connections.requesterId, actor.userId), eq(connections.addresseeId, actor.userId)),
        term ? sql`position(${term} in lower(concat_ws(' ', ${profiles.displayName}, ${profiles.username}, ${connectionNicknames.nickname}))) > 0` : undefined))
      .orderBy(profiles.username).limit(50);
  const members = await db.select({ userId: roomMemberships.userId }).from(roomMemberships).where(eq(roomMemberships.roomId, roomId));
  const pending = await db.select({ userId: invites.recipientUserId }).from(invites).where(and(eq(invites.roomId, roomId), eq(invites.kind, "direct"), live()));
  return rows.map((row) => ({ ...row, state: members.some((member) => member.userId === row.userId) ? "member" as const : pending.some((invite) => invite.userId === row.userId) ? "invited" as const : "eligible" as const }));
}

export async function sendDirectInvitations(db: ToskerDatabase, actor: AuthenticatedActor, input: { roomId: string; mode: "friends" | "username"; userIds?: string[]; username?: string }) {
  validId(input.roomId);
  await requireRoomMember(db, actor, input.roomId);
  if (!["friends", "username"].includes(input.mode)) throw new Error("Invalid invitation mode.");
  let targets: string[];
  if (input.mode === "username") {
    if (typeof input.username !== "string" || input.username.length > 80) throw new Error("Enter an exact username.");
    const username = input.username.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_.-]{2,32}$/.test(username)) throw new Error("Enter an exact username.");
    await inviteLimit(db, actor, "direct");
    const [person] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.username, username)).limit(1);
    if (!person || person.id === actor.userId) throw new Error("That person cannot be invited.");
    targets = [person.id];
  } else {
    if (!Array.isArray(input.userIds) || input.userIds.length < 1 || input.userIds.length > 10) throw new Error("Choose up to ten Friends.");
    targets = [...new Set(input.userIds)]; targets.forEach(validId);
    if (targets.includes(actor.userId)) throw new Error("You are already in this Room.");
    await inviteLimit(db, actor, "direct", targets.length);
  }
  return db.transaction(async (tx) => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, input.roomId)).for("update");
    if (!room) throw new AuthorizationDeniedError("Room unavailable.");
    await requireRoomMember(tx, actor, room.id);
    if (input.mode === "friends") {
      const accepted = await tx.select().from(connections).where(and(eq(connections.status, "accepted"), or(eq(connections.requesterId, actor.userId), eq(connections.addresseeId, actor.userId)))).for("share");
      const allowed = new Set(accepted.map((row) => row.requesterId === actor.userId ? row.addresseeId : row.requesterId));
      if (targets.some((id) => !allowed.has(id))) throw new AuthorizationDeniedError("Choose accepted Friends.");
    }
    await tx.update(invites).set({ status: "expired", updatedAt: new Date() }).where(and(eq(invites.roomId, room.id), eq(invites.kind, "direct"), eq(invites.status, "pending"), sql`${invites.expiresAt} <= clock_timestamp()`));
    const results: Array<{ userId: string; state: "member" | "invited"; invitationId?: string }> = [];
    for (const userId of targets) {
      const [member] = await tx.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, room.id), eq(roomMemberships.userId, userId)));
      if (member) { results.push({ userId, state: "member" }); continue; }
      const [pending] = await tx.select().from(invites).where(and(eq(invites.roomId, room.id), eq(invites.kind, "direct"), eq(invites.recipientUserId, userId), eq(invites.status, "pending")));
      if (pending) { results.push({ userId, state: "invited", invitationId: pending.id }); continue; }
      const [invite] = await tx.insert(invites).values({ kind: "direct", roomId: room.id, inviterId: actor.userId, recipientUserId: userId, tokenHash: inviteHash(inviteToken()), expiresAt: new Date(Date.now() + 7 * 86400000) }).returning({ id: invites.id });
      await tx.insert(notifications).values({ userId, actorId: actor.userId, roomId: room.id, invitationId: invite.id, type: "room_invitation" });
      results.push({ userId, state: "invited", invitationId: invite.id });
    }
    return results;
  });
}

export async function respondToInvitation(db: ToskerDatabase, actor: AuthenticatedActor, id: string, accept: boolean) {
  validId(id); if (typeof accept !== "boolean") throw new Error("Invalid response.");
  const [found] = await db.select({ roomId: invites.roomId }).from(invites).where(and(eq(invites.id, id), eq(invites.kind, "direct"), eq(invites.recipientUserId, actor.userId)));
  if (!found) throw new AuthorizationDeniedError("Invitation unavailable.");
  return db.transaction(async (tx) => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, found.roomId)).for("update");
    const [invite] = await tx.select().from(invites).where(eq(invites.id, id));
    if (!room || !invite || invite.recipientUserId !== actor.userId || invite.kind !== "direct") throw new AuthorizationDeniedError("Invitation unavailable.");
    if (invite.status === "accepted" && accept) {
      await requireRoomMember(tx, actor, room.id);
      return { roomId: room.id, roomSlug: room.slug, inviterId: invite.inviterId };
    }
    if (invite.status === "declined" && !accept) return { roomId: room.id, roomSlug: room.slug, inviterId: invite.inviterId };
    if (invite.status !== "pending" || (invite.expiresAt && invite.expiresAt <= new Date())) throw new Error("Invitation unavailable or expired.");
    await requireRoomMember(tx, { ...actor, userId: invite.inviterId }, room.id);
    if (accept) await grantRoomMembership(tx, actor, room);
    await tx.update(invites).set({ status: accept ? "accepted" : "declined", acceptedAt: accept ? new Date() : null, updatedAt: new Date() }).where(eq(invites.id, id));
    await tx.update(notifications).set({ readAt: new Date(), destinationReadAt: new Date() }).where(and(eq(notifications.invitationId, id), eq(notifications.userId, actor.userId)));
    return { roomId: room.id, roomSlug: room.slug, inviterId: invite.inviterId };
  });
}

export async function generateShareInvitation(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, hours: number) {
  validId(roomId); if (!SHARE_HOURS.some((allowed) => allowed === hours)) throw new Error("Choose a supported expiry.");
  await requireRoomOwner(db, actor, roomId);
  await inviteLimit(db, actor, "share");
  const id = crypto.randomUUID(), token = inviteToken(), encryptedToken = encryptInvite(token, roomId, id);
  const expiresAt = new Date(Date.now() + hours * 3600000);
  await db.transaction(async (tx) => {
    await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
    await requireRoomOwner(tx, actor, roomId);
    await tx.update(invites).set({ status: "revoked", encryptedToken: null, updatedAt: new Date() }).where(and(eq(invites.roomId, roomId), eq(invites.status, "pending"), or(eq(invites.kind, "share"), and(eq(invites.kind, "legacy"), isNull(invites.recipientUserId)))));
    await tx.insert(invites).values({ id, roomId, kind: "share", inviterId: actor.userId, tokenHash: inviteHash(token), encryptedToken, expiresAt });
  });
  return { id, token, expiresAt: expiresAt.toISOString() };
}

export async function cancelInvitation(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, id: string) {
  validId(roomId); validId(id);
  return db.transaction(async (tx) => {
    await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
    const membership = await requireRoomMember(tx, actor, roomId);
    const [invite] = await tx.select().from(invites).where(and(eq(invites.id, id), eq(invites.roomId, roomId)));
    if (!invite || (invite.kind !== "direct" || invite.inviterId !== actor.userId) && membership.role !== "owner") throw new AuthorizationDeniedError("Invitation unavailable.");
    if (invite.status !== "pending") return invite.recipientUserId;
    await tx.update(invites).set({ status: "revoked", encryptedToken: null, updatedAt: new Date() }).where(eq(invites.id, id));
    return invite.recipientUserId;
  });
}

export async function invitationManagement(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string) {
  validId(roomId);
  return db.transaction(async (tx) => {
    // Prevent access withdrawal between authority check and bearer-token disclosure.
    await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("share");
    const member = await requireRoomMember(tx, actor, roomId);
    const direct = await tx.select({ id: invites.id, userId: invites.recipientUserId, name: profiles.displayName, username: profiles.username, inviterId: invites.inviterId, expiresAt: invites.expiresAt }).from(invites)
      .leftJoin(profiles, eq(profiles.userId, invites.recipientUserId)).where(and(eq(invites.roomId, roomId), eq(invites.kind, "direct"), live(), member.role === "owner" ? undefined : eq(invites.inviterId, actor.userId))).orderBy(invites.createdAt).limit(100);
    const [share] = member.role === "owner" ? await tx.select().from(invites).where(and(eq(invites.roomId, roomId), eq(invites.kind, "share"), live())).limit(1) : [];
    return { owner: member.role === "owner", direct: direct.map((row) => ({ ...row, expiresAt: row.expiresAt?.toISOString() ?? null })), share: share && share.encryptedToken ? { id: share.id, token: decryptInvite(share.encryptedToken, roomId, share.id), expiresAt: share.expiresAt!.toISOString() } : null };
  });
}

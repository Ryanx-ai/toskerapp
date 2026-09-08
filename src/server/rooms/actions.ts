"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, ilike, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentActor } from "@/server/auth/clerk";
import { requireRoomMember, requireRoomOwner } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import {
  conversationParticipants,
  conversations,
  invites,
  profiles,
  roomCapabilities,
  roomMemberships,
  rooms,
  roomTags,
  subroomAccess,
  subrooms,
} from "@/server/db/schema";

import { normalizeRoomTags } from "@/lib/room-tags";
import { joinRoomInvite, revokeRoomInvite, updateRoom, withdrawRoomMember } from "./lifecycle";
import { publishUserActivity } from "@/server/realtime/provider";
const allowedCapabilities = new Set(["Poll", "Schedule", "Map", "Board"]);

function roomSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "room";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInviteToken() {
  return randomBytes(32).toString("base64url");
}

export type CreateRoomInput = {
  name: string;
  tags: string[];
  capabilities: string[];
  recipientHint?: string | null;
};

export async function createRoomAction(input: CreateRoomInput) {
  const actor = await requireCurrentActor();
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new Error("Enter a Room name up to 80 characters.");
  const tags = normalizeRoomTags(input.tags);
  const capabilities = [...new Set(input.capabilities)].filter((item) => allowedCapabilities.has(item));
  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const db = getDatabase();

  const created = await db.transaction(async (tx) => {
    const [room] = await tx
      .insert(rooms)
      .values({ ownerId: actor.userId, name, slug: roomSlug(name) })
      .returning({ id: rooms.id, slug: rooms.slug, name: rooms.name });
    await tx.insert(roomMemberships).values({
      roomId: room.id,
      userId: actor.userId,
      role: "owner",
    });
    if (tags.length) {
      await tx.insert(roomTags).values(tags.map((value) => ({ roomId: room.id, value })));
    }
    if (capabilities.length) {
      await tx.insert(roomCapabilities).values(
        capabilities.map((capabilityKey) => ({
          roomId: room.id,
          capabilityKey,
          installedById: actor.userId,
        })),
      );
    }
    const [conversation] = await tx
      .insert(conversations)
      .values({ kind: "room", roomId: room.id, isPrimary: true, title: name })
      .returning({ id: conversations.id });
    await tx.insert(conversationParticipants).values({
      conversationId: conversation.id,
      userId: actor.userId,
    });
    await tx.insert(invites).values({
      roomId: room.id,
      inviterId: actor.userId,
      tokenHash,
      recipientHint: input.recipientHint?.trim().slice(0, 120) || null,
      expiresAt,
    });
    return room;
  });

  revalidatePath("/app");
  return { ...created, tags: tags.length ? tags : ["ROOM"], inviteToken: token };
}

export async function createRoomInviteAction(roomSlug: string) {
  const actor = await requireCurrentActor();
  const db = getDatabase(), token = createInviteToken();
  await db.transaction(async (tx) => {
    const [room] = await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.slug, roomSlug)).for("update");
    if (!room) throw new Error("Room not found.");
    await requireRoomMember(tx, actor, room.id);
    await tx.insert(invites).values({ roomId: room.id, inviterId: actor.userId, tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) });
  });
  return { inviteToken: token };
}

export async function getInviteDetails(token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const db = getDatabase();
  const [invite] = await db
    .select({
      id: invites.id,
      status: invites.status,
      expiresAt: invites.expiresAt,
      roomId: rooms.id,
      roomSlug: rooms.slug,
      roomName: rooms.name,
      ownerName: profiles.displayName,
    })
    .from(invites)
    .innerJoin(rooms, eq(rooms.id, invites.roomId))
    .innerJoin(profiles, eq(profiles.userId, rooms.ownerId))
    .where(eq(invites.tokenHash, hashInviteToken(token)))
    .limit(1);
  if (!invite || invite.status === "revoked" || invite.status === "expired") return null;
  if (invite.expiresAt && invite.expiresAt <= new Date()) return null;
  const [tag] = await db
    .select({ value: roomTags.value })
    .from(roomTags)
    .where(eq(roomTags.roomId, invite.roomId))
    .limit(1);
  return { ...invite, tag: tag?.value ?? "ROOM" };
}

export async function acceptRoomInviteAction(token: string) {
  const actor = await requireCurrentActor();
  const joined = await joinRoomInvite(getDatabase(), actor, token);
  revalidatePath("/app");
  revalidatePath(`/room/${joined.roomSlug}`);
  await publishUserActivity(actor.userId);
  return joined;
}

export async function listSubroomsAction(roomSlug: string) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.slug, roomSlug)).limit(1);
  if (!room) throw new Error("Room not found.");
  const membership = await requireRoomMember(db, actor, room.id);
  const visibility = membership.role === "owner"
    ? or(eq(subrooms.visibility, "everyone"), eq(subrooms.visibility, "owners"), eq(subroomAccess.userId, actor.userId))
    : or(eq(subrooms.visibility, "everyone"), eq(subroomAccess.userId, actor.userId));
  return db.select({ id: subrooms.id, name: subrooms.name, position: subrooms.position, visibility: subrooms.visibility })
    .from(subrooms).leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, actor.userId)))
    .where(and(eq(subrooms.roomId, room.id), visibility))
    .orderBy(subrooms.position, subrooms.createdAt);
}

export async function createSubroomAction(input: { roomSlug: string; name: string; visibility: "everyone" | "selected" | "owners"; userIds?: string[] }) {
  const actor = await requireCurrentActor();
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 60) throw new Error("Enter a Subroom name up to 60 characters.");
  if (!["everyone", "selected", "owners"].includes(input.visibility)) throw new Error("Invalid Subroom visibility.");
  const db = getDatabase();
  const [room] = await db.select({ id: rooms.id, slug: rooms.slug }).from(rooms).where(eq(rooms.slug, input.roomSlug)).limit(1);
  if (!room) throw new Error("Room not found.");
  const created = await db.transaction(async (tx) => {
  await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, room.id)).for("update");
  await requireRoomOwner(tx, actor, room.id);
  const memberIds = await tx.select({ userId: roomMemberships.userId }).from(roomMemberships).where(eq(roomMemberships.roomId, room.id));
  const allowed = new Set(memberIds.map((item) => item.userId));
  if (input.visibility === "selected" && (input.userIds ?? []).some((id) => !allowed.has(id))) throw new Error("Choose current Room members.");
  const selected = [...new Set((input.userIds ?? []).filter((id) => allowed.has(id)))];
    const [subroom] = await tx.insert(subrooms).values({ roomId: room.id, name, createdBy: actor.userId, visibility: input.visibility, position: 0 }).returning({ id: subrooms.id, name: subrooms.name, visibility: subrooms.visibility });
    const access = input.visibility === "everyone" ? memberIds.map((item) => item.userId) : input.visibility === "owners" ? [actor.userId] : [...new Set([actor.userId, ...selected])];
    if (access.length) await tx.insert(subroomAccess).values(access.map((userId) => ({ subroomId: subroom.id, userId }))).onConflictDoNothing();
    const [conversation] = await tx.insert(conversations).values({ kind: "room", roomId: room.id, subroomId: subroom.id, title: name }).returning({ id: conversations.id });
    await tx.insert(conversationParticipants).values(access.map((userId) => ({ conversationId: conversation.id, userId }))).onConflictDoNothing();
    revalidatePath(`/room/${room.slug}`);
    return { ...subroom, conversationId: conversation.id };
  });
  await refreshRoom(room.id);
  return created;
}

export async function findRoomMembersAction(roomSlug: string, query: string) {
  const actor = await requireCurrentActor(), db = getDatabase();
  const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.slug, roomSlug));
  if (!room) throw new Error("Room unavailable.");
  await requireRoomOwner(db, actor, room.id);
  const term = query.trim().slice(0, 80);
  if (term.length < 2) return [];
  return db.select({ userId: profiles.userId, displayName: profiles.displayName, username: profiles.username })
    .from(roomMemberships).innerJoin(profiles, eq(profiles.userId, roomMemberships.userId))
    .where(and(eq(roomMemberships.roomId, room.id), ne(profiles.userId, actor.userId), or(ilike(profiles.displayName, `%${term}%`), ilike(profiles.username, `%${term}%`)))).limit(12);
}

export async function roomDetailsAction(roomSlug: string) {
  const actor = await requireCurrentActor(), db = getDatabase();
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, roomSlug));
  if (!room) throw new Error("Room unavailable.");
  const membership = await requireRoomMember(db, actor, room.id);
  const members = await db.select({ userId: roomMemberships.userId, role: roomMemberships.role, name: profiles.displayName })
    .from(roomMemberships).innerJoin(profiles, eq(profiles.userId, roomMemberships.userId)).where(eq(roomMemberships.roomId, room.id));
  const tags = await db.select({ value: roomTags.value }).from(roomTags).where(eq(roomTags.roomId, room.id));
  const invitationRows = membership.role === "owner" ? await db.select({ id: invites.id, status: invites.status, expiresAt: invites.expiresAt, createdAt: invites.createdAt })
    .from(invites).where(eq(invites.roomId, room.id)).orderBy(invites.createdAt).limit(100) : [];
  return { id: room.id, name: room.name, slug: room.slug, role: membership.role, members, tags: tags.map(({ value }) => value),
    invites: invitationRows.map((invite) => ({ ...invite, status: invite.expiresAt && invite.expiresAt <= new Date() && invite.status === "pending" ? "expired" : invite.status, createdAt: invite.createdAt.toISOString(), expiresAt: invite.expiresAt?.toISOString() ?? null })) };
}

async function refreshRoom(roomId: string, extra: string[] = []) {
  const members = await getDatabase().select({ userId: roomMemberships.userId }).from(roomMemberships).where(eq(roomMemberships.roomId, roomId));
  revalidatePath("/app");
  await Promise.all([...new Set([...members.map(({ userId }) => userId), ...extra])].map((userId) => publishUserActivity(userId)));
}

export async function updateRoomAction(input: { roomId: string; name: string; tags: string[] }) {
  await updateRoom(getDatabase(), await requireCurrentActor(), input);
  await refreshRoom(input.roomId);
}

export async function revokeRoomInviteAction(roomId: string, inviteId: string) {
  await revokeRoomInvite(getDatabase(), await requireCurrentActor(), roomId, inviteId);
}

export async function withdrawRoomMemberAction(roomId: string, userId: string) {
  await withdrawRoomMember(getDatabase(), await requireCurrentActor(), roomId, userId);
  await refreshRoom(roomId, [userId]);
}

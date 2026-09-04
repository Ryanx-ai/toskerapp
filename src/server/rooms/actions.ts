"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
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

const allowedTags = new Set(["TRIP", "EVENT", "WORK", "GAMING", "FAMILY", "ROOM"]);
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
  const tags = [...new Set(input.tags)].filter((tag) => allowedTags.has(tag)).slice(0, 5);
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

  revalidatePath("/");
  return { ...created, tags: tags.length ? tags : ["ROOM"], inviteToken: token };
}

export async function createRoomInviteAction(roomSlug: string) {
  const actor = await requireCurrentActor();
  const db = getDatabase();
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.slug, roomSlug))
    .limit(1);
  if (!room) throw new Error("Room not found.");
  await requireRoomMember(db, actor, room.id);
  const token = createInviteToken();
  await db.insert(invites).values({
    roomId: room.id,
    inviterId: actor.userId,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
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
  const db = getDatabase();
  const [invite] = await db
    .select({ id: invites.id, roomId: invites.roomId, status: invites.status, recipientUserId: invites.recipientUserId, expiresAt: invites.expiresAt, roomSlug: rooms.slug })
    .from(invites)
    .innerJoin(rooms, eq(rooms.id, invites.roomId))
    .where(eq(invites.tokenHash, hashInviteToken(token)))
    .limit(1);
  if (!invite || invite.status === "revoked" || invite.status === "expired" || (invite.expiresAt && invite.expiresAt <= new Date())) {
    throw new Error("This invitation is invalid or expired.");
  }
  if (invite.status === "accepted" && invite.recipientUserId !== actor.userId) {
    throw new Error("This invitation has already been accepted.");
  }

  await db.transaction(async (tx) => {
    if (invite.status === "pending") {
      const [claimed] = await tx
        .update(invites)
        .set({
          status: "accepted",
          recipientUserId: actor.userId,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(invites.id, invite.id), eq(invites.status, "pending")))
        .returning({ id: invites.id });
      if (!claimed) {
        const [winner] = await tx
          .select({ recipientUserId: invites.recipientUserId })
          .from(invites)
          .where(eq(invites.id, invite.id))
          .limit(1);
        if (winner?.recipientUserId !== actor.userId) {
          throw new Error("This invitation has already been accepted.");
        }
      }
    }
    await tx.insert(roomMemberships).values({ roomId: invite.roomId, userId: actor.userId, role: "member" }).onConflictDoNothing();
    // Public Subrooms grant access to newly joined members; selected/owners
    // Subrooms remain restricted to their explicit access list.
    const publicSubrooms = await tx
      .select({ id: subrooms.id })
      .from(subrooms)
      .where(and(eq(subrooms.roomId, invite.roomId), eq(subrooms.visibility, "everyone")));
    if (publicSubrooms.length) {
      await tx.insert(subroomAccess).values(publicSubrooms.map(({ id }) => ({ subroomId: id, userId: actor.userId }))).onConflictDoNothing();
    }
    const accessibleSubrooms = await tx
      .select({ id: subrooms.id })
      .from(subrooms)
      .leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, actor.userId)))
      .where(and(eq(subrooms.roomId, invite.roomId), or(eq(subrooms.visibility, "everyone"), eq(subroomAccess.userId, actor.userId))));
    const roomConversations = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(
        eq(conversations.roomId, invite.roomId),
        accessibleSubrooms.length
          ? or(isNull(conversations.subroomId), inArray(conversations.subroomId, accessibleSubrooms.map(({ id }) => id)))
          : isNull(conversations.subroomId),
      ));
    if (roomConversations.length) {
      await tx.insert(conversationParticipants).values(roomConversations.map(({ id }) => ({ conversationId: id, userId: actor.userId }))).onConflictDoNothing();
    }
  });
  revalidatePath("/");
  revalidatePath(`/room/${invite.roomSlug}`);
  return { roomSlug: invite.roomSlug };
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
  const db = getDatabase();
  const [room] = await db.select({ id: rooms.id, slug: rooms.slug }).from(rooms).where(eq(rooms.slug, input.roomSlug)).limit(1);
  if (!room) throw new Error("Room not found.");
  await requireRoomOwner(db, actor, room.id);
  const memberIds = await db.select({ userId: roomMemberships.userId }).from(roomMemberships).where(eq(roomMemberships.roomId, room.id));
  const allowed = new Set(memberIds.map((item) => item.userId));
  const selected = [...new Set((input.userIds ?? []).filter((id) => allowed.has(id)))];
  return db.transaction(async (tx) => {
    const [subroom] = await tx.insert(subrooms).values({ roomId: room.id, name, createdBy: actor.userId, visibility: input.visibility, position: 0 }).returning({ id: subrooms.id, name: subrooms.name, visibility: subrooms.visibility });
    const access = input.visibility === "everyone" ? memberIds.map((item) => item.userId) : input.visibility === "owners" ? [actor.userId] : [...new Set([actor.userId, ...selected])];
    if (access.length) await tx.insert(subroomAccess).values(access.map((userId) => ({ subroomId: subroom.id, userId }))).onConflictDoNothing();
    const [conversation] = await tx.insert(conversations).values({ kind: "room", roomId: room.id, subroomId: subroom.id, title: name }).returning({ id: conversations.id });
    await tx.insert(conversationParticipants).values(access.map((userId) => ({ conversationId: conversation.id, userId }))).onConflictDoNothing();
    revalidatePath(`/room/${room.slug}`);
    return { ...subroom, conversationId: conversation.id };
  });
}

"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireCurrentActor } from "@/server/auth/clerk";
import { requireRoomMember } from "@/server/auth/authorize";
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
    const roomConversations = await tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.roomId, invite.roomId));
    if (roomConversations.length) {
      await tx.insert(conversationParticipants).values(roomConversations.map(({ id }) => ({ conversationId: id, userId: actor.userId }))).onConflictDoNothing();
    }
  });
  revalidatePath("/");
  revalidatePath(`/room/${invite.roomSlug}`);
  return { roomSlug: invite.roomSlug };
}

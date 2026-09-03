import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/server/db/client";
import {
  conversationParticipants,
  conversations,
  profiles,
  roomMemberships,
  roomCapabilities,
  rooms,
  roomTags,
  users,
} from "@/server/db/schema";

const tidAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomSegment(length: number) {
  return [...randomBytes(length)]
    .map((byte) => tidAlphabet[byte % tidAlphabet.length])
    .join("");
}

function createTid() {
  return `TID-${randomSegment(4)}-${randomSegment(4)}`;
}

function normalizeUsername(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);

  return normalized || `tosker-${randomSegment(6).toLowerCase()}`;
}

export type BootstrapIdentity = {
  provider: "clerk";
  subject: string;
  displayName: string;
  usernameHint?: string | null;
  avatarUrl?: string | null;
};

export type CanonicalIdentity = {
  userId: string;
  displayName: string;
  username: string;
  tid: string;
  avatarUrl: string | null;
  sandboxConversationId: string;
  rooms: Array<{
    id: string;
    slug: string;
    name: string;
    role: "owner" | "member";
    tag: string;
    conversationId: string;
    capabilities: string[];
  }>;
  personalConversations: Array<{
    conversationId: string;
    slug: string;
    displayName: string;
    username: string;
    tid: string;
  }>;
};

export async function ensureToskerAccount(
  identity: BootstrapIdentity,
): Promise<CanonicalIdentity> {
  const db = getDatabase();

  const account = await db.transaction(async (tx) => {
    let [user] = await tx
      .select({ id: users.id, tid: users.tid })
      .from(users)
      .where(
        and(
          eq(users.authProvider, identity.provider),
          eq(users.authSubject, identity.subject),
        ),
      )
      .limit(1);

    for (let attempt = 0; !user && attempt < 5; attempt += 1) {
      [user] = await tx
        .insert(users)
        .values({
          authProvider: identity.provider,
          authSubject: identity.subject,
          tid: createTid(),
        })
        .onConflictDoNothing()
        .returning({ id: users.id, tid: users.tid });

      if (!user) {
        [user] = await tx
          .select({ id: users.id, tid: users.tid })
          .from(users)
          .where(
            and(
              eq(users.authProvider, identity.provider),
              eq(users.authSubject, identity.subject),
            ),
          )
          .limit(1);
      }
    }

    if (!user) {
      throw new Error("Unable to establish a unique Tosker identity.");
    }

    let [profile] = await tx
      .select({
        displayName: profiles.displayName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
      })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    if (!profile) {
      const usernameBase = normalizeUsername(
        identity.usernameHint || identity.displayName,
      );

      for (let attempt = 0; !profile && attempt < 5; attempt += 1) {
        const username =
          attempt === 0
            ? usernameBase
            : `${usernameBase.slice(0, 18)}-${randomSegment(4).toLowerCase()}`;
        [profile] = await tx
          .insert(profiles)
          .values({
            userId: user.id,
            displayName: identity.displayName,
            username,
            avatarUrl: identity.avatarUrl,
            status: "Tosker member",
          })
          .onConflictDoNothing()
          .returning({
            displayName: profiles.displayName,
            username: profiles.username,
            avatarUrl: profiles.avatarUrl,
          });
      }
    }

    if (!profile) {
      [profile] = await tx
        .select({
          displayName: profiles.displayName,
          username: profiles.username,
          avatarUrl: profiles.avatarUrl,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);
    }

    if (!profile) {
      throw new Error("Unable to establish a Tosker profile.");
    }

    await tx
      .insert(conversations)
      .values({
        kind: "sandbox",
        ownerId: user.id,
        title: `${profile.displayName}'s Sandbox`,
      })
      .onConflictDoNothing();

    const [sandbox] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.kind, "sandbox"),
          eq(conversations.ownerId, user.id),
        ),
      )
      .limit(1);

    if (!sandbox) {
      throw new Error("Unable to establish the permanent Sandbox.");
    }

    await tx
      .insert(conversationParticipants)
      .values({ conversationId: sandbox.id, userId: user.id })
      .onConflictDoNothing();

    return {
      userId: user.id,
      displayName: profile.displayName,
      username: profile.username,
      tid: user.tid,
      avatarUrl: profile.avatarUrl,
      sandboxConversationId: sandbox.id,
    };
  });

  const memberships = await db
    .select({
      id: rooms.id,
      slug: rooms.slug,
      name: rooms.name,
      role: roomMemberships.role,
      conversationId: conversations.id,
    })
    .from(roomMemberships)
    .innerJoin(rooms, eq(rooms.id, roomMemberships.roomId))
    .innerJoin(
      conversations,
      and(eq(conversations.roomId, rooms.id), eq(conversations.isPrimary, true)),
    )
    .where(eq(roomMemberships.userId, account.userId));
  const tags = memberships.length
    ? await db
        .select({ roomId: roomTags.roomId, value: roomTags.value })
        .from(roomTags)
        .where(inArray(roomTags.roomId, memberships.map((room) => room.id)))
    : [];
  const capabilities = memberships.length
    ? await db.select({ roomId: roomCapabilities.roomId, value: roomCapabilities.capabilityKey }).from(roomCapabilities).where(inArray(roomCapabilities.roomId, memberships.map((room) => room.id)))
    : [];
  const personalRows = await db
    .select({ conversationId: conversations.id })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .where(and(eq(conversationParticipants.userId, account.userId), eq(conversations.kind, "personal")));
  const personalConversations = await Promise.all(personalRows.map(async ({ conversationId }) => {
    const [other] = await db
      .select({ displayName: profiles.displayName, username: profiles.username, tid: users.tid })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(conversationParticipants.conversationId, conversationId), sql`${conversationParticipants.userId} <> ${account.userId}`))
      .limit(1);
    return other ? { conversationId, slug: `chat-${conversationId}`, ...other } : null;
  }));

  return {
    ...account,
    rooms: memberships.map((room) => ({
      ...room,
      tag: tags.find((tag) => tag.roomId === room.id)?.value ?? "ROOM",
      capabilities: capabilities.filter((item) => item.roomId === room.id).map((item) => item.value),
    })),
    personalConversations: personalConversations.filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}

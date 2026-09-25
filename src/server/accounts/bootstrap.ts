import "server-only";
import { roomSidebarTag } from "@/lib/room-tags";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";

import { getDatabase } from "@/server/db/client";
import { readSidebarPins } from "@/server/conversations/sidebar-pins";
import { readOwnProfile, type OwnProfile } from "@/server/profiles/own-read";
import { readPersonalNavigation } from "./personal-navigation";
import { establishToskerUser } from "./tid";
import { usernameBase as normalizeUsername } from "@/lib/username-contract";
import {
  conversationParticipants,
  conversations,
  profiles,
  roomMemberships,
  roomCapabilities,
  rooms,
  roomTags,
  subroomAccess,
  subrooms,
} from "@/server/db/schema";

const tidAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomSegment(length: number) {
  return [...randomBytes(length)]
    .map((byte) => tidAlphabet[byte % tidAlphabet.length])
    .join("");
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
  ownProfile: OwnProfile;
  sidebarPinnedIds: string[];
  displayName: string;
  username: string;
  tid: string;
  avatarUrl: string | null;
  presenceStatus: "online" | "idle" | "away" | "meeting";
  sandboxConversationId: string;
  rooms: Array<{
    id: string;
    slug: string;
    name: string;
    role: "owner" | "member";
    tag: string;
    conversationId: string;
    capabilities: string[];
    subrooms: Array<{ id: string; name: string; visibility: "everyone" | "selected" | "owners"; conversationId: string }>;
  }>;
  personalConversations: Array<{
    userId: string;
    avatarUrl: string | null;
    conversationId: string;
    slug: string;
    displayName: string;
    username: string;
    tid: string;
    nickname: string | null;
    presenceStatus: "online" | "idle" | "away" | "meeting" | null;
  }>;
};

export async function ensureToskerAccount(
  identity: BootstrapIdentity,
): Promise<CanonicalIdentity> {
  const db = getDatabase();

  const account = await db.transaction(async (tx) => {
    const user = await establishToskerUser(tx, identity);

    let [profile] = await tx
      .select({
        displayName: profiles.displayName,
        username: profiles.username,
        avatarUrl: profiles.avatarUrl,
        presenceStatus: profiles.presenceStatus,
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
            presenceStatus: profiles.presenceStatus,
          });
      }
    }

    if (!profile) {
      [profile] = await tx
        .select({
          displayName: profiles.displayName,
          username: profiles.username,
          avatarUrl: profiles.avatarUrl,
          presenceStatus: profiles.presenceStatus,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);
    }

    if (!profile) {
      throw new Error("Unable to establish a Tosker profile.");
    }

    // Only verified provider-owned photos are synchronized here. A future Tosker
    // uploaded path is not overwritten by Clerk's generated initials image.
    const providerPhoto = !profile.avatarUrl || /^https:\/\/(?:img\.clerk\.com|images\.clerk\.dev)\//.test(profile.avatarUrl);
    if (identity.avatarUrl !== undefined && providerPhoto && profile.avatarUrl !== identity.avatarUrl) {
      await tx.update(profiles).set({ avatarUrl: identity.avatarUrl }).where(eq(profiles.userId, user.id));
      profile = { ...profile, avatarUrl: identity.avatarUrl };
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
      presenceStatus: profile.presenceStatus,
      sandboxConversationId: sandbox.id,
    };
  });

  const [ownProfile, navigation] = await Promise.all([readOwnProfile(db, account.userId), getWorkspaceNavigation(account.userId)]);
  return { ...account, displayName: ownProfile.displayName, presenceStatus: ownProfile.presenceStatus, ownProfile, ...navigation };
}

/** Read-only navigation snapshot, reused after private activity invalidations. */
export async function getWorkspaceNavigation(userId: string): Promise<Pick<CanonicalIdentity, "rooms" | "personalConversations" | "sidebarPinnedIds">> {
  const db = getDatabase();
  const account = { userId };
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
  // Independent, actor-scoped reads run together after membership is established.
  // No shared cache and no change to authorization predicates or write ordering.
  const [tags, capabilities, subroomRows, personalConversations, sidebarPinnedIds] = await Promise.all([
    memberships.length
    ? db
        .select({ roomId: roomTags.roomId, value: roomTags.value })
        .from(roomTags)
        .where(inArray(roomTags.roomId, memberships.map((room) => room.id)))
    : [],
    memberships.length
    ? db.select({ roomId: roomCapabilities.roomId, value: roomCapabilities.capabilityKey }).from(roomCapabilities).where(inArray(roomCapabilities.roomId, memberships.map((room) => room.id)))
    : [],
    memberships.length ? db.select({ roomId: subrooms.roomId, id: subrooms.id, name: subrooms.name, visibility: subrooms.visibility, conversationId: conversations.id })
    .from(subrooms).innerJoin(conversations, eq(conversations.subroomId, subrooms.id)).leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, account.userId)))
    .where(and(inArray(subrooms.roomId, memberships.map((room) => room.id)), or(eq(subrooms.visibility, "everyone"), eq(subroomAccess.userId, account.userId))))
    .orderBy(subrooms.position, subrooms.createdAt, subrooms.id) : [],
    readPersonalNavigation(db, account.userId),
    readSidebarPins(db, userId),
  ]);

  return {
    sidebarPinnedIds,
    rooms: memberships.map((room) => ({
      ...room,
      tag: roomSidebarTag(tags.filter((tag) => tag.roomId === room.id).map(tag => tag.value)),
      capabilities: capabilities.filter((item) => item.roomId === room.id).map((item) => item.value),
      subrooms: subroomRows.filter((item) => item.roomId === room.id).map((item) => ({ id: item.id, name: item.name, visibility: item.visibility, conversationId: item.conversationId })),
    })),
    personalConversations: personalConversations.filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}

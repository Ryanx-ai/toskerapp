import "server-only";

import { and, eq, or } from "drizzle-orm";

import { getDatabase } from "@/server/db/client";
import { conversationParticipants, conversations, roomMemberships, rooms, subroomAccess, subrooms, users } from "@/server/db/schema";

export async function canAccessRoom(authSubject: string, slug: string) {
  const [allowed] = await getDatabase().select({ id: rooms.id }).from(rooms)
    .innerJoin(roomMemberships, eq(roomMemberships.roomId, rooms.id))
    .innerJoin(users, eq(users.id, roomMemberships.userId))
    .where(and(eq(rooms.slug, slug), eq(users.authProvider, "clerk"), eq(users.authSubject, authSubject))).limit(1);
  return Boolean(allowed);
}

export async function canAccessPersonalConversation(authSubject: string, slug: string) {
  if (slug === "my-room") return true;
  const conversationId = slug.startsWith("chat-") ? slug.slice(5) : "";
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return false;
  const [allowed] = await getDatabase().select({ id: conversations.id }).from(conversations)
    .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .where(and(eq(conversations.id, conversationId), eq(conversations.kind, "personal"), eq(users.authProvider, "clerk"), eq(users.authSubject, authSubject))).limit(1);
  return Boolean(allowed);
}

export async function canAccessSubroom(authSubject: string, roomSlug: string, subroomId: string) {
  const db = getDatabase();
  const [user] = await db.select({ id: users.id }).from(users).where(and(eq(users.authProvider, "clerk"), eq(users.authSubject, authSubject))).limit(1);
  if (!user) return false;
  const [access] = await db.select({ id: subrooms.id }).from(subrooms)
    .innerJoin(rooms, eq(rooms.id, subrooms.roomId))
    .innerJoin(roomMemberships, and(eq(roomMemberships.roomId, rooms.id), eq(roomMemberships.userId, user.id)))
    .leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, user.id)))
    .where(and(eq(rooms.slug, roomSlug), eq(subrooms.id, subroomId), or(eq(subrooms.visibility, "everyone"), eq(subroomAccess.userId, user.id), and(eq(subrooms.visibility, "owners"), eq(roomMemberships.role, "owner")))))
    .limit(1);
  return Boolean(access);
}

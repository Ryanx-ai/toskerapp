import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/server/db/client";
import { conversationParticipants, conversations, roomMemberships, rooms, users } from "@/server/db/schema";

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

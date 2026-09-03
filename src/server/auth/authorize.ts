import "server-only";

import { and, eq } from "drizzle-orm";

import type { AuthenticatedActor } from "./actor";
import type { ToskerDatabase } from "@/server/db/client";
import {
  conversationParticipants,
  roomMemberships,
  rooms,
} from "@/server/db/schema";

export class AuthorizationDeniedError extends Error {
  readonly code = "AUTHORIZATION_DENIED";
}

export async function requireRoomMember(
  db: ToskerDatabase,
  actor: AuthenticatedActor,
  roomId: string,
) {
  const [membership] = await db
    .select({ role: roomMemberships.role })
    .from(roomMemberships)
    .where(
      and(
        eq(roomMemberships.roomId, roomId),
        eq(roomMemberships.userId, actor.userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new AuthorizationDeniedError("Room membership is required.");
  }

  return membership;
}

export async function requireRoomOwner(
  db: ToskerDatabase,
  actor: AuthenticatedActor,
  roomId: string,
) {
  const [ownership] = await db
    .select({ roomId: rooms.id })
    .from(rooms)
    .innerJoin(
      roomMemberships,
      and(
        eq(roomMemberships.roomId, rooms.id),
        eq(roomMemberships.userId, actor.userId),
        eq(roomMemberships.role, "owner"),
      ),
    )
    .where(and(eq(rooms.id, roomId), eq(rooms.ownerId, actor.userId)))
    .limit(1);

  if (!ownership) {
    throw new AuthorizationDeniedError("Room ownership is required.");
  }

  return ownership;
}

export async function requireConversationParticipant(
  db: ToskerDatabase,
  actor: AuthenticatedActor,
  conversationId: string,
) {
  const [participant] = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, actor.userId),
      ),
    )
    .limit(1);

  if (!participant) {
    throw new AuthorizationDeniedError(
      "Conversation participation is required.",
    );
  }

  return participant;
}

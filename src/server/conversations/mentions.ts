import "server-only";
import { and, asc, eq, ilike, inArray, isNotNull, isNull, or } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase, ToskerReader } from "@/server/db/client";
import { conversations, conversationParticipants, profiles, roomMemberships, subroomAccess, subrooms } from "@/server/db/schema";
import { hallScope } from "@/server/hall/service";
import { validMentionSpans, type MentionSpan } from "@/lib/mentions";
import { isConversationId } from "@/lib/realtime-contract";

async function scopedMembers(db: ToskerReader, conversationId: string, query?: string, ids?: string[]) {
  const pattern = query ? `%${query.replace(/[\\%_]/g, "\\$&")}%` : undefined;
  return db.select({ userId: profiles.userId, name: profiles.displayName, username: profiles.username }).from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .innerJoin(roomMemberships, and(eq(roomMemberships.roomId, conversations.roomId), eq(roomMemberships.userId, conversationParticipants.userId)))
    .innerJoin(profiles, eq(profiles.userId, conversationParticipants.userId))
    .leftJoin(subrooms, eq(subrooms.id, conversations.subroomId))
    .leftJoin(subroomAccess, and(eq(subroomAccess.subroomId, subrooms.id), eq(subroomAccess.userId, conversationParticipants.userId)))
    .where(and(eq(conversations.id, conversationId), eq(conversations.kind, "room"),
      or(isNull(conversations.subroomId), eq(subrooms.visibility, "everyone"), isNotNull(subroomAccess.userId), and(eq(subrooms.visibility, "owners"), eq(roomMemberships.role, "owner"))),
      pattern ? or(ilike(profiles.displayName, pattern), ilike(profiles.username, pattern)) : undefined,
      ids ? inArray(profiles.userId, ids) : undefined))
    .orderBy(asc(profiles.displayName), asc(profiles.userId)).limit(ids ? 10 : 8);
}

export async function mentionSuggestions(db: ToskerDatabase, actor: AuthenticatedActor, conversationId: string, query: string) {
  if (!isConversationId(conversationId) || typeof query !== "string" || query.length > 80) throw new Error("Invalid mention query.");
  await hallScope(db, actor, conversationId);
  return scopedMembers(db, conversationId, query.trim().replace(/^@/, ""));
}

/** Send calls within its Room-locked transaction; stale autocomplete cannot grant access. */
export async function validateMentionTargets(db: ToskerReader, conversationId: string, body: string, spans: MentionSpan[]) {
  if (!validMentionSpans(body, spans)) throw new Error("Invalid mentions.");
  if (!spans.length) return [];
  const ids = [...new Set(spans.map((span) => span.userId))];
  const allowed = await scopedMembers(db, conversationId, undefined, ids);
  if (allowed.length !== ids.length) throw new Error("Mention target no longer available in this conversation.");
  if (spans.some((span) => { const member = allowed.find((entry) => entry.userId === span.userId)!; return span.label !== `@${member.username ?? member.name}`; })) throw new Error("Mention identity changed. Select the member again.");
  return [...spans].sort((a, b) => a.start - b.start);
}

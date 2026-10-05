import "server-only";
import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerTransaction } from "@/server/db/client";
import { conversations } from "@/server/db/schema";
import { isConversationId } from "@/lib/realtime-contract";
import { lockTripScope } from "@/server/trips/scope";

/** `c` must be the conversation alias. Parameterized actor; same predicate for sources and projections. */
export function authorizedContext(viewer: SQL): SQL {
  return sql`(
    (c.kind='sandbox' and c.owner_id=${viewer} and c.room_id is null and c.subroom_id is null)
    or (c.kind='personal' and c.room_id is null and c.subroom_id is null
      and exists(select 1 from conversation_participants cp where cp.conversation_id=c.id and cp.user_id=${viewer})
      and (select count(*) from conversation_participants cp where cp.conversation_id=c.id)=2
      and c.direct_key=(select string_agg(cp.user_id::text,':' order by cp.user_id::text) from conversation_participants cp where cp.conversation_id=c.id)
      and exists(select 1 from connections cn where cn.pair_key=c.direct_key and cn.status='accepted'))
    or (c.kind='room' and exists(select 1 from room_memberships rm where rm.room_id=c.room_id and rm.user_id=${viewer}
      and ((c.subroom_id is null and c.is_primary) or exists(select 1 from subrooms s where s.id=c.subroom_id and s.room_id=c.room_id
        and (s.visibility='everyone' or (s.visibility='owners' and rm.role='owner') or exists(select 1 from subroom_access sa where sa.subroom_id=s.id and sa.user_id=${viewer}))))))
  )`;
}

export async function lockPinScope(tx: ToskerTransaction, actor: AuthenticatedActor, scope: string, mode: "share" | "update") {
  if (typeof scope !== "string" || scope.length > 150) throw new AuthorizationDeniedError();
  if (scope.startsWith("sandbox--")) {
    const id = scope.slice(9); if (!isConversationId(id)) throw new AuthorizationDeniedError();
    const [chat] = await tx.select().from(conversations).where(and(eq(conversations.id,id),eq(conversations.kind,"sandbox"),eq(conversations.ownerId,actor.userId))).for(mode);
    if (!chat || chat.roomId || chat.subroomId) throw new AuthorizationDeniedError();
    return { conversationId:id, sandbox:true };
  }
  const source = await lockTripScope(tx,actor,scope,mode);
  // Serialize source Pin counts/receipts without conflating Pin and trip-plan revisions.
  await tx.select({id:conversations.id}).from(conversations).where(eq(conversations.id,source.conversationId)).for(mode);
  return { conversationId:source.conversationId, sandbox:false };
}
export const authorizePinScope = (db: ToskerDatabase, actor: AuthenticatedActor, scope: string) => db.transaction(tx => lockPinScope(tx,actor,scope,"share"));

/** Resolve a source from an opaque ID only after current authorization; never return a private name here. */
export async function scopeForConversation(tx: ToskerTransaction, actor: AuthenticatedActor, id: string) {
  if (!isConversationId(id)) throw new AuthorizationDeniedError();
  const result = await tx.execute(sql`select c.kind,c.id,c.subroom_id,r.slug from conversations c left join rooms r on r.id=c.room_id where c.id=${id}::uuid and ${authorizedContext(sql`${actor.userId}::uuid`)}`);
  const c = result.rows[0]; if (!c) throw new AuthorizationDeniedError();
  return c.kind === "sandbox" ? `sandbox--${c.id}` : c.kind === "personal" ? `personal--${c.id}` : `${c.slug}${c.subroom_id ? `--${c.subroom_id}` : ""}`;
}

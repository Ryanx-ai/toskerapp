import "server-only";
import { eq, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import type { ToskerDatabase } from "@/server/db/client";
import { profiles, inviteRateLimits } from "@/server/db/schema";
import { lockTripScope } from "@/server/trips/scope";
import { getRealtimeServer } from "@/server/realtime/provider";
import { conversationChannel } from "@/lib/realtime-contract";
import { MAP_PING, PING_TTL, pingPlacement, type MapPing } from "@/lib/maps/ping-contract";

export class PingRateError extends Error {}
export async function sendMapPing(db:ToskerDatabase,actor:AuthenticatedActor,slug:string,input:unknown) {
  if(!pingPlacement(input))throw new Error("Invalid ping.");
  return db.transaction(async tx=>{
    const scope=await lockTripScope(tx,actor,slug,"share");
    if(scope.sandboxConversationId)throw new AuthorizationDeniedError(); // Sandbox never publishes.
    const [profile]=await tx.select({name:profiles.displayName}).from(profiles).where(eq(profiles.userId,actor.userId));
    if(!profile)throw new AuthorizationDeniedError();
    const [limit]=await tx.insert(inviteRateLimits).values({userId:actor.userId,operation:"map-ping",windowStart:new Date(),attempts:1}).onConflictDoUpdate({target:[inviteRateLimits.userId,inviteRateLimits.operation],set:{
      windowStart:sql`case when ${inviteRateLimits.windowStart} < now() - interval '1 minute' then now() else ${inviteRateLimits.windowStart} end`,
      attempts:sql`case when ${inviteRateLimits.windowStart} < now() - interval '1 minute' then 1 else ${inviteRateLimits.attempts} + 1 end`,
    }}).returning({attempts:inviteRateLimits.attempts});
    if(limit.attempts>6)throw new PingRateError();
    const ping:MapPing={id:input.id,kind:input.kind,latitude:input.latitude,longitude:input.longitude,senderId:actor.userId,senderName:profile.name.slice(0,80),expiresAt:Date.now()+PING_TTL};
    // Lock spans publication: membership withdrawal/revocation serializes here.
    // Ephemeral excludes Ably history/recovery; never insert content into Neon.
    await getRealtimeServer().channels.get(conversationChannel(scope.conversationId)).publish({id:ping.id,name:MAP_PING,data:ping,extras:{ephemeral:true}});
    return ping;
  });
}

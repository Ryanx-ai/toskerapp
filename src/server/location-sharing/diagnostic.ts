import "server-only";
import { Realtime } from "ably";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { profiles } from "@/server/db/schema";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import { assertRealtimeSession } from "@/server/realtime/session";
import { userChannel } from "@/lib/realtime-contract";

/** TEMPORARY P0: isolated QA own-feed, non-location version/nonce only. */
export async function regionalDiagnostic(actor: AuthenticatedActor, sessionId: string) {
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_")) throw new AuthorizationDeniedError();
  await assertRealtimeSession(actor,sessionId);
  const rows=await getDatabase().select({username:profiles.username}).from(profiles).where(eq(profiles.userId,actor.userId));
  if(rows.length!==1||!["tosker-user-a-clerk-test","tosker-user-b-clerk-test"].includes(rows[0].username??""))throw new AuthorizationDeniedError();
  const client=new Realtime({key:process.env.ABLY_API_KEY,logLevel:0,realtimeRequestTimeout:5000,httpRequestTimeout:5000});
  const nonce=randomUUID(),seen=new Set<string>();
  try {
    const channel=client.channels.get(userChannel(actor.userId));
    await channel.subscribe(message=>{if(message.data?.nonce===nonce&&message.name?.startsWith("p0.region."))seen.add(message.name);});
    const ephemeral=(phase:string)=>channel.publish({name:`p0.region.server.ephemeral.${phase}`,data:{version:1,nonce},extras:{ephemeral:true}});
    await ephemeral("immediate");
    await new Promise(resolve=>setTimeout(resolve,2000));
    await ephemeral("warm");
    await channel.publish({name:"p0.region.server.normal",data:{version:1,nonce}});
    await ephemeral("after-control");
    await new Promise(resolve=>setTimeout(resolve,2000));
    return {region:process.env.VERCEL_REGION??"local",observed:[...seen].sort(),payload:"version-and-nonce-only"};
  } finally {client.close();}
}

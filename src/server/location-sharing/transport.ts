import "server-only";
import { randomUUID } from "node:crypto";
import type { LocationSnapshot } from "@/lib/shared-location-contract";
/** Same provider/credential; one bounded, uncached, ephemeral request. */
export async function publishSnapshotEvent(channel:string,name:string,data:LocationSnapshot|{id:string;conversationId:string;userId:string}) {
  const key=process.env.ABLY_API_KEY;
  if(!key)throw new Error("Realtime is not configured.");
  const response=await fetch(`https://main.realtime.ably.net/channels/${encodeURIComponent(channel)}/messages?ephemeral=true`,{
    method:"POST",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(5000),
    headers:{Authorization:`Basic ${Buffer.from(key).toString("base64")}`,"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify({id:randomUUID(),name,data,extras:{ephemeral:true}}),
  });
  if(response.status!==201){await response.body?.cancel();throw new Error("Snapshot delivery could not be confirmed.");}
  const ack=await response.json();
  console.info("[location-dispatch]",{stage:"direct-rest-ack",status:response.status,channelMatches:ack.channel===channel,ackFields:Object.keys(ack)});
}

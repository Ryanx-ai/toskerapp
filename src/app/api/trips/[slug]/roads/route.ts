import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import { readTrip } from "@/server/trips/service";
import { routingPlaces } from "@/lib/trip-contract";
import { roadKey, supportedRoadPoints } from "@/lib/maps/road-contract";
import { isConversationId } from "@/lib/realtime-contract";
import { getRoadProvider, reserveRoadRequest } from "@/server/maps/road-provider";
import { PlaceProviderError } from "@/server/maps/provider";
import { privateOriginPoint } from "@/lib/maps/private-origin";

export async function POST(request:Request, context:{params:Promise<{slug:string}>}){
  const reply=(body:unknown,status=200,providerMs?:number)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",...(providerMs===undefined?{}:{"Server-Timing":`provider;dur=${Math.round(providerMs)}`})}});
  try{
    if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Request origin unavailable."},403);
    const actor=await requireCurrentActor(), db=getDatabase(), {slug}=await context.params;
    const text=await request.text();if(text.length>512)return reply({error:"Invalid route calculation."},400);
    const {routeId,mode,origin}=JSON.parse(text);
    const privatePoint=origin===undefined?null:privateOriginPoint(origin);
    if(origin!==undefined&&!privatePoint)return reply({error:"Explicit consent and a supported current location are required."},400);
    if(!isConversationId(routeId)||(mode!=="drive"&&mode!=="walk"))return reply({error:"Choose a route and travel mode."},400);
    const plan=await readTrip(db,actor,slug);
    if(!plan.routes.some(r=>r.id===routeId&&!r.archived))return reply({error:"Route unavailable."},404);
    const saved=routingPlaces(plan,routeId);
    const places=privatePoint&&saved[0]?[privatePoint,saved[0]]:saved;
    if((privatePoint&&!saved[0])||!supportedRoadPoints(places))return reply({error:"Choose 2–8 Singapore or southern Johor places, or a private origin and first stop."},400);
    await reserveRoadRequest(db,actor.userId,places.length);
    const providerStarted=performance.now();
    const geometry=await getRoadProvider().route(places,mode,request.signal);
    const providerMs=performance.now()-providerStarted;
    const latest=await readTrip(db,actor,slug); // Reauthorize after provider I/O, including Subroom visibility.
    const latestSaved=routingPlaces(latest,routeId),latestPoints=privatePoint&&latestSaved[0]?[privatePoint,latestSaved[0]]:latestSaved;
    if(!latest.routes.some(r=>r.id===routeId&&!r.archived)||roadKey(latestPoints,mode)!==geometry.key)return reply({error:"Route changed. Retry roads for the latest order."},409);
    return reply({geometry},200,providerMs);
  }catch(error){
    if(error instanceof AuthenticationRequiredError||error instanceof AuthorizationDeniedError)return reply({error:"Your Room access is no longer available."},403);
    if(error instanceof PlaceProviderError)return reply({error:error.message},error.code==="rate"?429:503);
    return reply({error:"Route calculation unavailable. Saved places are unchanged."},503);
  }
}

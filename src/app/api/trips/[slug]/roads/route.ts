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

export async function POST(request:Request, context:{params:Promise<{slug:string}>}){
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
  try{
    if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Request origin unavailable."},403);
    const actor=await requireCurrentActor(), db=getDatabase(), {slug}=await context.params;
    const text=await request.text();if(text.length>256)return reply({error:"Invalid road preview."},400);
    const {routeId,mode}=JSON.parse(text);
    if(!isConversationId(routeId)||(mode!=="drive"&&mode!=="walk"))return reply({error:"Choose a route and travel mode."},400);
    const plan=await readTrip(db,actor,slug);
    if(!plan.routes.some(r=>r.id===routeId&&!r.archived))return reply({error:"Route unavailable."},404);
    const places=routingPlaces(plan,routeId);
    if(!supportedRoadPoints(places))return reply({error:"Road preview supports 2–8 Singapore places. Planning remains available."},400);
    await reserveRoadRequest(db,actor.userId,places.length);
    const geometry=await getRoadProvider().route(places,mode,request.signal);
    const latest=await readTrip(db,actor,slug); // Reauthorize after provider I/O, including Subroom visibility.
    if(!latest.routes.some(r=>r.id===routeId&&!r.archived)||roadKey(routingPlaces(latest,routeId),mode)!==geometry.key)return reply({error:"Route changed. Retry roads for the latest order."},409);
    return reply({geometry});
  }catch(error){
    if(error instanceof AuthenticationRequiredError||error instanceof AuthorizationDeniedError)return reply({error:"Your Room access is no longer available."},403);
    if(error instanceof PlaceProviderError)return reply({error:error.message},error.code==="rate"?429:503);
    return reply({error:"Road preview unavailable. Saved places are unchanged."},503);
  }
}

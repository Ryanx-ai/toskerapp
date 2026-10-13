import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import { authorizePinScope } from "@/server/map-pins/scope";
import { getPlaceProvider, reservePlaceRequest, PlaceProviderError } from "@/server/maps/provider";
import { validWorldPoint } from "@/lib/maps/place-projection";
import { localArea } from "@/server/maps/area";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization"};
export async function POST(request:Request,context:{params:Promise<{slug:string}>}) {
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
  try {
    if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Access denied"},403);
    const actor=await requireCurrentActor(),db=getDatabase(),{slug}=await context.params;
    await authorizePinScope(db,actor,slug);
    const text=await request.text();if(text.length>300)return reply({error:"Invalid lookup"},400);
    const input=JSON.parse(text);
    if(input.consent!=="area-lookup-v1"||!validWorldPoint(input.latitude,input.longitude))return reply({error:"Area lookup requires consent"},400);
    let label=await localArea(input.latitude,input.longitude),source="ura";
    if(!label){await reservePlaceRequest(db,actor.userId);label=await getPlaceProvider().area(input.latitude,input.longitude,request.signal);source="geoapify";}
    await authorizePinScope(db,actor,slug);
    return reply({label,source});
  }catch(error){return reply({error:"Area unavailable. Your location remains private."},error instanceof AuthenticationRequiredError||error instanceof AuthorizationDeniedError?403:error instanceof PlaceProviderError&&error.code==="rate"?429:503);}
}

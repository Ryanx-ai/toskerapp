import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { getDatabase } from "@/server/db/client";
import { sendMapPing, PingRateError } from "@/server/maps/pings";
import { pingPlacement } from "@/lib/maps/ping-contract";

export async function POST(request:Request,context:{params:Promise<{slug:string}>}) {
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
  try{
    if(request.headers.get("origin")!==new URL(request.url).origin)return reply({error:"Request origin unavailable."},403);
    const actor=await requireCurrentActor(),{slug}=await context.params;
    const text=await request.text();if(text.length>512)return reply({error:"Invalid ping."},400);
    let input;try{input=JSON.parse(text);}catch{return reply({error:"Invalid ping."},400);}
    if(input.locateEnabled!==true||!pingPlacement(input))return reply({error:"Turn Locate on and choose a point for your ping."},400);
    return reply({ping:await sendMapPing(getDatabase(),actor,slug,input)});
  }catch(error){
    if(error instanceof AuthenticationRequiredError||error instanceof AuthorizationDeniedError)return reply({error:"Your access to this Map is no longer available."},403);
    if(error instanceof PingRateError)return reply({error:"Give your pings a moment. Try again shortly."},429);
    return reply({error:"Ping could not be sent. Nothing was saved."},503);
  }
}

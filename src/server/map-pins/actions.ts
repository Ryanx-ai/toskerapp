"use server";
import { getDatabase } from "@/server/db/client";
import { requireCurrentActor } from "@/server/auth/clerk";
import { AuthenticationRequiredError } from "@/server/auth/actor";
import { AuthorizationDeniedError } from "@/server/auth/authorize";
import { TripError } from "@/server/trips/service";
import { authorizeTripScope } from "@/server/trips/scope";
import { publishTripChanged, publishUserActivity } from "@/server/realtime/provider";
import { verifyCandidate } from "@/server/maps/candidate-token";
import type { PinCommand, MapPinState } from "@/lib/map-pin-contract";
import { mutatePin, readPins, pinAudience } from "./service";
import { addPinToRoute, pinRouteChoices, type PinTransfer } from "./transfer";

function failure(error:unknown) {
  if (error instanceof AuthenticationRequiredError || error instanceof AuthorizationDeniedError) return {ok:false as const,code:"denied" as const,message:"This Map Pin is no longer available to you."};
  if (error instanceof TripError) return {ok:false as const,code:error.code,message:error.message};
  return {ok:false as const,code:"unavailable" as const,message:"This change could not be confirmed. Refresh or retry the same change."};
}
export async function readPinsAction(scope:string,cursor?:string) {
  try { return {ok:true as const,value:await readPins(getDatabase(),await requireCurrentActor(),scope,cursor)}; } catch(e) { return failure(e); }
}
type ClientPinCommand = Exclude<PinCommand,{type:"create"}> | {type:"create";token:string;state:MapPinState};
export async function mutatePinAction(input:{scope:string;requestId:string;command:ClientPinCommand}) {
  try {
    const actor = await requireCurrentActor(), db = getDatabase();
    if (!input?.command || JSON.stringify(input).length>16000) throw new TripError("invalid","Invalid Pin change.");
    const command = input.command.type === "create" ? {type:"create" as const,state:input.command.state,candidate:verifyCandidate(input.command.token,actor.userId,input.scope)} : input.command;
    const value = await mutatePin(db,actor,{...input,command});
    const audience = await pinAudience(db,actor,input.scope);
    if (command.type === "hide") await publishUserActivity(actor.userId);
    else await Promise.all([publishTripChanged(audience.conversationId),...audience.userIds.map(id=>publishUserActivity(id))]);
    return {ok:true as const,value};
  } catch(e) { return failure(e); }
}
export async function pinRouteChoicesAction() {
  try { return {ok:true as const,value:await pinRouteChoices(getDatabase(),await requireCurrentActor())}; } catch(e) { return failure(e); }
}
export async function addPinToRouteAction(input:PinTransfer) {
  try {
    const actor = await requireCurrentActor(),db = getDatabase();
    const value = await addPinToRoute(db,actor,input);
    const target = await authorizeTripScope(db,actor,input.targetScope);
    await publishTripChanged(target.conversationId);
    return {ok:true as const,value};
  } catch(e) { return failure(e); }
}

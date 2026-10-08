import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { ToskerDatabase } from "@/server/db/client";
import { conversations, rooms, roomMemberships, subrooms, subroomAccess } from "@/server/db/schema";
import { readPersonalNavigation } from "@/server/accounts/personal-navigation";
import { authorizeTripScope } from "./scope";

/** Actor-scoped discovery only. Mutations independently lock and authorize both contexts. */
export async function tripCopyDestinations(db:ToskerDatabase,actor:AuthenticatedActor,source:string) {
  await authorizeTripScope(db,actor,source);
  const [sandbox,personal,roomRows,subRows]=await Promise.all([
    db.select({id:conversations.id}).from(conversations).where(and(eq(conversations.kind,"sandbox"),eq(conversations.ownerId,actor.userId),isNull(conversations.roomId),isNull(conversations.subroomId))),
    readPersonalNavigation(db,actor.userId),
    db.select({slug:rooms.slug,name:rooms.name}).from(rooms).innerJoin(roomMemberships,and(eq(roomMemberships.roomId,rooms.id),eq(roomMemberships.userId,actor.userId))),
    db.select({slug:rooms.slug,roomName:rooms.name,id:subrooms.id,name:subrooms.name}).from(subrooms).innerJoin(rooms,eq(rooms.id,subrooms.roomId)).innerJoin(roomMemberships,and(eq(roomMemberships.roomId,rooms.id),eq(roomMemberships.userId,actor.userId))).leftJoin(subroomAccess,and(eq(subroomAccess.subroomId,subrooms.id),eq(subroomAccess.userId,actor.userId))).where(or(eq(subrooms.visibility,"everyone"),and(eq(subrooms.visibility,"owners"),eq(roomMemberships.role,"owner")),eq(subroomAccess.userId,actor.userId))),
  ]);
  return [
    ...sandbox.map(r=>({scope:`sandbox--${r.id}`,label:"Your Sandbox",href:"/personal/my-room/map"})),
    ...personal.filter(r=>r.mapAvailable).map(r=>({scope:`personal--${r.conversationId}`,label:`Chat · ${r.nickname||r.displayName}`,href:`/personal/chat-${r.conversationId}/map`})),
    ...roomRows.map(r=>({scope:r.slug,label:`Room · ${r.name}`,href:`/room/${r.slug}/map`})),
    ...subRows.map(r=>({scope:`${r.slug}--${r.id}`,label:`Subroom · ${r.roomName} / ${r.name}`,href:`/room/${r.slug}/subroom/${r.id}/map`})),
  ].filter(r=>r.scope!==source).sort((a,b)=>a.label.localeCompare(b.label));
}

import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { AuthorizationDeniedError, requireRoomMember, requireRoomOwner } from "@/server/auth/authorize";
import type { ToskerDatabase, ToskerReader } from "@/server/db/client";
import { profiles, roomMemberships, roomIdentityResets, rooms } from "@/server/db/schema";
import { normalizeProfileText } from "@/lib/profile-contract";
import { isConversationId } from "@/lib/realtime-contract";

export class RoomIdentityConflictError extends Error {}
export async function readOwnRoomIdentity(db: ToskerReader, actor: AuthenticatedActor, roomId: string) {
  if (!isConversationId(roomId)) throw new AuthorizationDeniedError("Room unavailable.");
  const [row] = await db.select({ roomName: rooms.name, globalName: profiles.displayName, nickname: roomMemberships.nickname, revision: roomMemberships.nicknameRevision })
    .from(roomMemberships).innerJoin(rooms,eq(rooms.id,roomMemberships.roomId)).innerJoin(profiles,eq(profiles.userId,roomMemberships.userId))
    .where(and(eq(roomMemberships.roomId,roomId),eq(roomMemberships.userId,actor.userId))).limit(1);
  if (!row) throw new AuthorizationDeniedError("Room membership is required.");
  return row;
}
async function change(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, targetId: string, nickname: string | null, expectedRevision: string, ownerReset: boolean) {
  if (![roomId,targetId,expectedRevision].every(isConversationId)) throw new Error("Invalid Room identity.");
  return db.transaction(async tx => {
    // Membership withdrawal takes the exclusive version of this Room lock.
    await tx.select({id:rooms.id}).from(rooms).where(eq(rooms.id,roomId)).for("share");
    if (ownerReset) await requireRoomOwner(tx,actor,roomId); else await requireRoomMember(tx,actor,roomId);
    const [saved] = await tx.update(roomMemberships).set({nickname,nicknameRevision:randomUUID()})
      .where(and(eq(roomMemberships.roomId,roomId),eq(roomMemberships.userId,targetId),eq(roomMemberships.nicknameRevision,expectedRevision)))
      .returning({nickname:roomMemberships.nickname,revision:roomMemberships.nicknameRevision});
    // Random membership revision also rejects an old draft after leave + rejoin.
    if(!saved) throw new RoomIdentityConflictError("Room identity changed. Reload before trying again.");
    if(ownerReset) await tx.insert(roomIdentityResets).values({roomId,actorId:actor.userId,targetUserId:targetId});
    return saved;
  });
}
export async function setOwnRoomNickname(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, nickname: string, expectedRevision: string) {
  return change(db,actor,roomId,actor.userId,normalizeProfileText(nickname,60)||null,expectedRevision,false);
}
export async function resetMemberRoomNickname(db: ToskerDatabase, actor: AuthenticatedActor, roomId: string, targetId: string, expectedRevision: string) {
  if(targetId===actor.userId) throw new Error("Use your own Room identity editor.");
  return change(db,actor,roomId,targetId,null,expectedRevision,true);
}

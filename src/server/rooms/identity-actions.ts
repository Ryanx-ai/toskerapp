"use server";
import { after } from "next/server";
import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { publishRoomIdentityMetadata } from "@/server/profiles/metadata";
import { readOwnRoomIdentity, resetMemberRoomNickname, RoomIdentityConflictError, setOwnRoomNickname } from "./identity";

export async function readOwnRoomIdentityAction(roomId: string) {
  return readOwnRoomIdentity(getDatabase(),await requireCurrentActor(),roomId);
}
export async function setOwnRoomNicknameAction(roomId: string, nickname: string, revision: string) {
  try {
    const saved=await setOwnRoomNickname(getDatabase(),await requireCurrentActor(),roomId,nickname,revision);
    after(()=>publishRoomIdentityMetadata(roomId));
    return {ok:true as const,...saved};
  } catch(error) { if(error instanceof RoomIdentityConflictError) return {ok:false as const}; throw error; }
}
export async function resetMemberRoomNicknameAction(roomId: string, targetId: string, revision: string) {
  try {
    await resetMemberRoomNickname(getDatabase(),await requireCurrentActor(),roomId,targetId,revision);
    after(()=>publishRoomIdentityMetadata(roomId));
    return {ok:true as const};
  } catch(error) { if(error instanceof RoomIdentityConflictError) return {ok:false as const}; throw error; }
}

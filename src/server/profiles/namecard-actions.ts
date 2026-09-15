"use server";

import { requireCurrentActor } from "@/server/auth/clerk";
import { getDatabase } from "@/server/db/client";
import { readNamecard } from "./namecard";

export async function getNamecardAction(userId: string, roomId?: string) {
  return readNamecard(getDatabase(), await requireCurrentActor(), userId, roomId);
}

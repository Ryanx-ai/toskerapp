/** Exact transient banner QA cleanup; never deletes a Room, user or unrelated history. */
import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {rooms,messages,notifications,hallItems} from "../src/server/db/schema";
const db=getDatabase(), roomId="f7220000-2026-4000-8000-000000000001", conversationId="f7220000-2026-4000-8000-00000000000b";
const bodies=["MS7.2 banner QA quiet","MS7.2 banner QA all","MS7.2 banner QA direct"];
async function main(){
  const [room]=await db.select().from(rooms).where(eq(rooms.id,roomId));
  assert(room?.slug==="ms722-frame-qa"&&room.ownerId==="0ee1e5a5-6d7a-4541-a6ca-ca69788997ef");
  const rows=await db.select().from(messages).where(and(eq(messages.conversationId,conversationId),inArray(messages.body,bodies)));
  assert(rows.every(row=>row.authorId==="d7a58753-9877-45b2-9fc7-cca188559fed"));
  assert(rows.length<=3&&new Set(rows.map(row=>row.body)).size===rows.length,"Unexpected duplicates; investigate before cleanup");
  const ids=rows.map(row=>row.id);
  console.log({mode:process.argv[2]??"inspect",messages:rows.map(row=>({id:row.id,body:row.body}))});
  if(process.argv[2]==="cleanup"&&ids.length){
    assert.equal((await db.select().from(hallItems).where(inArray(hallItems.sourceMessageId,ids))).length,0);
    assert.equal((await db.select().from(messages).where(inArray(messages.replyToId,ids))).length,0);
    await db.transaction(async tx=>{await tx.delete(notifications).where(inArray(notifications.messageId,ids));await tx.delete(messages).where(inArray(messages.id,ids));});
    console.log(`Removed exactly ${ids.length} scoped QA messages and their notifications. No application undo; Rooms/users/other history preserved.`);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());

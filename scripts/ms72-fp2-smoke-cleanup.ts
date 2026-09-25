/** Exact FP2 smoke receipts, already retracted through author UI. No prefix deletion. */
import assert from "node:assert/strict";
import {inArray} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {messages,notifications,hallItems} from "../src/server/db/schema";
const db=getDatabase();
const expected=new Map([
  ["974e7076-a2c4-4ae5-9bc1-370a3d41d8ff",["be192eac-38c6-4d46-a6d2-bea19fa324fa","2026-09-24T23:21:13.932Z"]],
  ["c3a9889d-2646-487f-bebd-fd5cb4d9099c",["be192eac-38c6-4d46-a6d2-bea19fa324fa","2026-09-24T23:27:38.004Z"]],
  ["6a4e4f49-0079-4260-9a85-270a4a5f89ef",["f7220000-2026-4000-8000-00000000000b","2026-09-24T23:56:20.162Z"]],
  ["01010ef3-b8b0-4901-b2f9-f04c4985ecbe",["f7220000-2026-4000-8000-00000000000d","2026-09-24T23:57:09.692Z"]],
]);
async function main(){
  const mode=process.argv[2]??"inspect";assert(["inspect","cleanup"].includes(mode));
  await db.transaction(async tx=>{
    const ids=[...expected.keys()],rows=await tx.select().from(messages).where(inArray(messages.id,ids)).for("update");
    if(!rows.length){console.log("Exact FP2 receipts already absent; no mutation");return;}
    assert.equal(rows.length,4,"Partial state: inspect before cleanup");
    for(const row of rows){
      const [conversationId,createdAt]=expected.get(row.id)!;
      assert.equal(row.authorId,"0ee1e5a5-6d7a-4541-a6ca-ca69788997ef");assert.equal(row.conversationId,conversationId);
      assert.equal(row.createdAt.toISOString(),createdAt);assert.equal(row.body,"");assert(row.deletedAt,"Author Nuke must be complete");
    }
    assert.equal((await tx.select().from(messages).where(inArray(messages.replyToId,ids))).length,0);
    assert.equal((await tx.select().from(notifications).where(inArray(notifications.messageId,ids))).length,0);
    assert.equal((await tx.select().from(hallItems).where(inArray(hallItems.sourceMessageId,ids))).length,0);
    console.log({mode,verifiedEmptyQaReceipts:rows.length});
    if(mode==="cleanup"){
      await tx.delete(messages).where(inArray(messages.id,ids));
      console.log("Removed exactly four already-nuked empty QA receipts. No user, live message, Room, Hall item or unrelated history deleted. No application undo.");
    }
  });
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());

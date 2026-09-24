/** Exact receipts left by the successful Sept25 local browser smoke. Never a prefix delete. */
import assert from "node:assert/strict";
import { inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { messages, notifications, hallItems } from "../src/server/db/schema";
const db=getDatabase();
const expected=new Map([
  ["8e371be2-2cd7-4673-b5b0-7ce6507dc251",["be192eac-38c6-4d46-a6d2-bea19fa324fa","2026-09-24T17:24:12.070Z"]],
  ["e7414180-308e-4944-a423-c96996026303",["f7220000-2026-4000-8000-00000000000b","2026-09-24T17:24:42.592Z"]],
  ["85b9aecb-3342-4a6a-a1e5-91b51c38a2d5",["f7220000-2026-4000-8000-00000000000d","2026-09-24T17:25:33.934Z"]],
]);
async function main() {
  const mode=process.argv[2]??"inspect"; assert(["inspect","cleanup"].includes(mode));
  await db.transaction(async tx=>{
    const ids=[...expected.keys()];
    const rows=await tx.select().from(messages).where(inArray(messages.id,ids)).for("update");
    if(!rows.length) {console.log("Exact FP1 smoke receipts already absent; no mutation");return;}
    assert.equal(rows.length,3,"Partial cleanup: inspect first");
    for(const row of rows) {
      const [conversationId,createdAt]=expected.get(row.id)!;
      assert.equal(row.authorId,"0ee1e5a5-6d7a-4541-a6ca-ca69788997ef");
      assert.equal(row.conversationId,conversationId);assert.equal(row.createdAt.toISOString(),createdAt);
      assert.equal(row.body,"");assert(row.deletedAt,"Browser Nuke must have completed");
    }
    assert.equal((await tx.select().from(messages).where(inArray(messages.replyToId,ids))).length,0);
    assert.equal((await tx.select().from(notifications).where(inArray(notifications.messageId,ids))).length,0);
    assert.equal((await tx.select().from(hallItems).where(inArray(hallItems.sourceMessageId,ids))).length,0);
    console.log({mode,verifiedNukedQaReceipts:rows.length});
    if(mode==="cleanup") {await tx.delete(messages).where(inArray(messages.id,ids));console.log("Removed exactly three empty QA send receipts. No user, Room, live message, Hall item or unrelated history deleted. No application undo.");}
  });
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());

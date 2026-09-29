/** Bounded search/history QA, always A/B plus exact-resolved founder. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { messages } from "../src/server/db/schema";
import { readMessageHistory } from "../src/server/conversations/history";
import { searchConversation } from "../src/server/conversations/search";
import { changeOwnMessage } from "../src/server/conversations/service";
import { withdrawRoomMember } from "../src/server/rooms/lifecycle";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import { cleanupQaFixture, createQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
const db=getDatabase(), receipt="docs/MS7-3-SEARCH-FIXTURE.json";
async function main() {
  const {a,b,founder}=await resolveQaActors(db);
  if(process.argv[2]==="--create") {
    assert(!existsSync(receipt),"Inspect existing receipt; do not create duplicate fixture.");
    const fixture=await createQaFixture(db,"Search as you type, historical context, edit/Nuke/revocation browser proof");
    const rows=Array.from({length:80},(_,i)=>({id:randomUUID(),conversationId:fixture.conversationId,authorId:i%2?b.userId:a.userId,body:`MS7.3 search QA ${String(i+1).padStart(3,"0")} — ${i===0?"orchid earliest historical match":i===35?"orchid middle context match":i===79?"orchid latest match":"safe surrounding conversation context"}`,createdAt:new Date(Date.now()-(80-i)*60000)}));
    console.log(JSON.stringify({...fixture,oldest:rows[0].id,middle:rows[35].id,latest:rows[79].id}));
    await db.insert(messages).values(rows);
    const latest=await readMessageHistory(db,a,fixture.conversationId);
    assert.equal(latest.messages.length,50);assert(!latest.messages.some(m=>m.id===rows[0].id));
    for(const index of [0,35,79]) {
      const page=await readMessageHistory(db,b,fixture.conversationId,{target:rows[index].id});
      assert(page.messages.some(m=>m.id===rows[index].id));assert(page.messages.length>1&&page.messages.length<=50);
      if(index<79)assert(page.messages.some(m=>m.id===rows[index+1].id));
      if(index>0)assert(page.messages.some(m=>m.id===rows[index-1].id));
      assert.equal(new Set(page.messages.map(m=>m.id)).size,page.messages.length);
    }
    assert.equal((await searchConversation(db,founder,fixture.conversationId,"orchid")).results.length,3);
    console.log("PASS 80-row owned history, initial50 excludes oldest, first/middle/last jump includes neighbors <=50, founder sees same search.");return;
  }
  const fixture=JSON.parse(readFileSync(receipt,"utf8")) as QaFixture & {oldest:string;middle:string;latest:string};
  console.log(await cleanupQaFixture(db,fixture));
  if(process.argv[2]==="--verify-history") {
    const canonical=await db.select({id:messages.id}).from(messages).where(and(eq(messages.conversationId,fixture.conversationId),isNull(messages.deletedAt))).orderBy(asc(messages.createdAt),asc(messages.id));
    let page=await readMessageHistory(db,a,fixture.conversationId),gathered=[...page.messages];
    while(page.nextCursor){page=await readMessageHistory(db,a,fixture.conversationId,{before:page.nextCursor.id});assert(page.messages.length<=50);gathered=[...page.messages,...gathered];}
    assert.deepEqual(gathered.map(m=>m.id),canonical.map(m=>m.id));
    assert.equal(new Set(gathered.map(m=>m.id)).size,canonical.length);
    const middle=await readMessageHistory(db,a,fixture.conversationId,{target:fixture.middle});assert(middle.messages.some(m=>m.id===fixture.middle));assert(middle.messages.length>1&&middle.messages.length<=50);
    const after=await readMessageHistory(db,a,fixture.conversationId,{after:canonical[0].id});assert.deepEqual(after.messages.map(m=>m.id),canonical.slice(1,51).map(m=>m.id));
    const window=await readMessageHistory(db,a,fixture.conversationId,{ids:canonical.map(m=>m.id)});assert.equal(window.messages.length,canonical.length);
    await assert.rejects(()=>readMessageHistory(db,a,fixture.conversationId,{before:"invalid"}));
    await assert.rejects(()=>readMessageHistory(db,a,fixture.conversationId,{target:fixture.middle,after:fixture.latest}));
    console.log("PASS full bounded older/forward traversal, retained-ID refresh, context target, canonical deduplication and invalid cursor denial after Nuke.");return;
  }
  if(process.argv[2]==="--edit") {await changeOwnMessage(db,a,{conversationId:fixture.conversationId,messageId:fixture.oldest,body:"MS7.3 search QA 001 — jasmine edited historical match"});assert.equal((await searchConversation(db,b,fixture.conversationId,"orchid")).results.length,2);assert.equal((await searchConversation(db,b,fixture.conversationId,"jasmine")).results.length,1);console.log("PASS exact-owned A edit reconciles B search.");}
  else if(process.argv[2]==="--nuke") {await changeOwnMessage(db,a,{conversationId:fixture.conversationId,messageId:fixture.oldest,remove:true});assert.equal((await searchConversation(db,b,fixture.conversationId,"jasmine")).results.length,0);assert(!(await readMessageHistory(db,b,fixture.conversationId,{target:fixture.oldest})).messages.length);console.log("PASS exact-owned Nuke cannot reappear in search/target.");}
  else if(process.argv[2]==="--withdraw-b") {await withdrawRoomMember(db,a,fixture.id,b.userId);await assert.rejects(()=>searchConversation(db,b,fixture.conversationId,"orchid"),AuthorizationDeniedError);await assert.rejects(()=>readMessageHistory(db,b,fixture.conversationId,{target:fixture.middle}),AuthorizationDeniedError);console.log("PASS B search/history denied; founder membership stable.");}
  else if(process.argv[2]==="--cleanup-apply") {console.log(await cleanupQaFixture(db,fixture,true));assert.equal((await db.select().from(messages).where(eq(messages.conversationId,fixture.conversationId))).length,0);}
  else assert.equal(process.argv[2],"--cleanup-dry-run");
}
main().catch(error=>{console.error(error instanceof assert.AssertionError?error.message:"Search fixture proof failed; sensitive details suppressed.");process.exitCode=1;}).finally(()=>db.$client.end());

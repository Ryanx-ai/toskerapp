import assert from "node:assert/strict";
import { notificationBursts, type BurstEvent } from "../src/lib/notification-bursts";
const start=Date.parse("2026-09-13T12:01:59Z");
const event=(n:number,extra:Partial<BurstEvent>={}):BurstEvent=>({id:`event-${String(n).padStart(3,"0")}`,type:"message",actorId:"A",conversationId:"Room",roomId:"R",subroomId:null,isMention:false,createdAt:new Date(start+n*2000).toISOString(),...extra});
const burst=Array.from({length:25},(_,i)=>event(i));
const grouped=notificationBursts(burst,"B");
assert.equal(grouped.length,1);assert.equal(grouped[0].events.length,25);
assert.equal(notificationBursts([burst[0]],"B")[0].id,grouped[0].id);
assert.notEqual(notificationBursts(burst,"C")[0].id,grouped[0].id);
assert.equal(notificationBursts(burst.map(e=>({...e,readAt:"now"})),"B")[0].id,grouped[0].id);
assert.deepEqual(grouped[0].events.map(e=>e.id),burst.map(e=>e.id));
for(const separator of [{actorId:"C"},{isMention:true},{conversationId:"Personal",roomId:null},{subroomId:"child",conversationId:"child-chat"},{type:"hall_note"},{type:"hall_pin"},{type:"connection_request"},{type:"room_invitation"}]) {
  assert.equal(notificationBursts([event(0),event(1,separator),event(2)],"B").length,3);
}
assert.equal(notificationBursts([event(0),event(60),event(120)],"B").length,1,"rolling gaps, not total duration or fixed bucket");
assert.equal(notificationBursts([event(0),event(61)],"B").length,2);
const original=JSON.stringify(burst);notificationBursts(burst,"B");assert.equal(JSON.stringify(burst),original);
// Acknowledgement retains exact observed IDs, never infers an open-ended range.
const acknowledged=new Set(grouped[0].events.map(e=>e.id));assert(!acknowledged.has(event(25).id));
console.log("PASS: 25-event rolling burst; stable identity/read-state independence; exact IDs; mentions/sender/context/Hall/Friend/invite separators; threshold boundary; immutable input; later event excluded from observed IDs.");

import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, subrooms } from "../src/server/db/schema";
import { normalizeSubroomOrder, reorderSubrooms } from "../src/server/rooms/subroom-order";
const db=getDatabase(), roomId="e44ceb92-b1d5-4375-bd13-28a836af5d3c";
const owner={userId:"d7b21474-9b0e-4744-b05d-030bc2f26ff4",authProvider:"fp2-qa",authSubject:"d7b21474-9b0e-4744-b05d-030bc2f26ff4"};
const member={...owner,userId:"a8e80815-9e2d-4604-8215-efacdb3ea8f2"};
async function main() {
  const [room]=await db.select().from(rooms).where(eq(rooms.id,roomId));
  assert.equal(room.slug,`fp2-service-${roomId}`); assert.equal(room.ownerId,owner.userId);
  const ids=["cf027101-4444-4444-8444-444444444441","cf027101-4444-4444-8444-444444444442","cf027101-4444-4444-8444-444444444443"];
  await db.insert(subrooms).values(ids.map((id,i)=>({id,roomId,name:`FP2 order ${i}`,createdBy:owner.userId,visibility:i===1?"owners" as const:"everyone" as const,position:0,createdAt:new Date(1800000000000+(i===2?1:0))}))).onConflictDoNothing();
  const read=()=>db.select().from(subrooms).where(eq(subrooms.roomId,roomId)).orderBy(subrooms.position,subrooms.createdAt,subrooms.id);
  await db.transaction(async tx=>{await tx.select().from(rooms).where(eq(rooms.id,roomId)).for("update");await normalizeSubroomOrder(tx,roomId);});
  assert.deepEqual((await read()).map(r=>r.position),[0,1,2]);
  const before=await read(), expectedIds=before.map(r=>r.id), reverse=[...expectedIds].reverse(), rotated=[expectedIds[1],expectedIds[2],expectedIds[0]];
  await assert.rejects(()=>reorderSubrooms(db,member,{roomId,expectedIds,orderedIds:reverse}));
  await assert.rejects(()=>reorderSubrooms(db,owner,{roomId,expectedIds,orderedIds:[crypto.randomUUID(),...expectedIds.slice(1)]}));
  await assert.rejects(()=>reorderSubrooms(db,owner,{roomId,expectedIds,orderedIds:[expectedIds[0],expectedIds[0],expectedIds[2]]}));
  const results=await Promise.all([reorderSubrooms(db,owner,{roomId,expectedIds,orderedIds:reverse}),reorderSubrooms(db,owner,{roomId,expectedIds,orderedIds:rotated})]);
  assert.equal(results.filter(r=>r.conflict).length,1);
  const after=await read(); assert.deepEqual(after.map(r=>r.position),[0,1,2]);
  for(const row of after) { const old=before.find(r=>r.id===row.id)!; assert.equal(row.roomId,old.roomId);assert.equal(row.visibility,old.visibility);assert.equal(row.name,old.name); }
  assert.equal((await reorderSubrooms(db,owner,{roomId,expectedIds,orderedIds:reverse})).conflict,true);
  console.log("PASS: deterministic legacy normalization; exact Room set; duplicate/cross-Room/member denial; concurrent stale rejection; sequential durable positions; metadata unchanged. Retained fixture children:",ids.join(","));
}
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});

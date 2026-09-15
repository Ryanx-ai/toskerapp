import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {eq} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {users} from "../src/server/db/schema";
import {establishToskerUser,generateTid} from "../src/server/accounts/tid";
import {isCanonicalTid,normalizeTidLookup} from "../src/lib/tid-contract";
const db=getDatabase(),rollback=new Error("TID synthetic rollback"),provider=`ms72-tid-${randomUUID()}`;
async function main(){
  for(let i=0;i<1000;i++)assert(isCanonicalTid(generateTid()));
  for(const value of ["AAAAAAA","0000000","7K2M9QX"])assert(isCanonicalTid(value));
  assert.equal(normalizeTidLookup(" 7k2m9qx "),"7K2M9QX");
  for(const value of ["","ABC123","ABC12345","7K2-M9Q","7K2_M9Q","7K2 M9Q","７K2M9QX","ßK2M9Q","7K2M9Q.",null])assert.equal(normalizeTidLookup(value),null);
  assert(!isCanonicalTid("7k2m9qx"));
  try {await db.transaction(async tx=>{
    const identity={provider,subject:randomUUID()};
    const first=await establishToskerUser(tx,identity);assert(isCanonicalTid(first.tid));
    let calls=0;assert.deepEqual(await establishToskerUser(tx,identity,()=>{calls++;return generateTid();}),first);assert.equal(calls,0);
    const second=await establishToskerUser(tx,{provider,subject:randomUUID()},()=>{calls++;return calls===1?first.tid:generateTid();});
    assert.equal(calls,2);assert.notEqual(second.tid,first.tid);assert.notEqual(second.id,first.id);
    calls=0;await assert.rejects(establishToskerUser(tx,{provider,subject:randomUUID()},()=>{calls++;return first.tid;}));assert.equal(calls,5);
    await assert.rejects(establishToskerUser(tx,{provider,subject:randomUUID()},()=>"BAD-TID"));
    assert.equal((await tx.select().from(users).where(eq(users.authProvider,provider))).length,2);
    console.log("PASS full seven-character crypto generation/lookup validation, DB collision retries and five-attempt exhaustion, canonical actor reuse; no existing IDs changed");
    throw rollback;
  });}catch(error){if(error!==rollback)throw error;}
  assert.equal((await db.select().from(users).where(eq(users.authProvider,provider))).length,0);console.log("PASS synthetic TID identities rolled back");
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());

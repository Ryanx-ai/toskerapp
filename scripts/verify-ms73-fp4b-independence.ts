import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { createQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { mutatePin, readPins } from "../src/server/map-pins/service";
import { addPinToRoute } from "../src/server/map-pins/transfer";
import { mutateTrip, readTrip, readTripComments } from "../src/server/trips/service";
const db=getDatabase(),rollback=new Error("rollback");
const timeout=setTimeout(()=>{console.error("STOP: bounded rollback-only independence test timed out; no acceptance claimed");process.exit(1);},180000);
db.$client.on("error",()=>{console.error("STOP: test database connection lost; no acceptance claimed");process.exit(1);});
async function main(){
  try{await db.transaction(async tx=>{
    await tx.execute(sql`set local statement_timeout='25s'`);
    if(!(await tx.execute(sql`select to_regclass('public.map_pins') as pins`)).rows[0].pins)for(const statement of readMigrationFiles({migrationsFolder:"drizzle"})[26].sql)await tx.execute(sql.raw(statement));
    const testDb=tx as unknown as ToskerDatabase,{a,b}=await resolveQaActors(tx),fixture=await createQaFixture(testDb,"FP4B focused rollback-only Route independence");
    const candidate={title:"Safe QA NUS",latitude:1.2966,longitude:103.7764,source:"search" as const,provider:"qa",providerId:"fp4b-nus",address:"Synthetic QA only",attribution:"QA",license:"QA"};
    const pin=(await mutatePin(testDb,a,{scope:fixture.slug,requestId:randomUUID(),command:{type:"create",candidate,state:"want-to-go"}})).resultId;
    const change=async(command:Parameters<typeof mutateTrip>[2]["command"])=>mutateTrip(testDb,a,{roomSlug:fixture.slug,requestId:randomUUID(),expectedRevision:(await readTrip(testDb,a,fixture.slug)).revision,command});
    const r1=(await change({type:"create-route",name:"Pin route 1",color:"gold"})).resultId!,r2=(await change({type:"create-route",name:"Pin route 2",color:"sky"})).resultId!;
    const input={sourceScope:fixture.slug,targetScope:fixture.slug,pinId:pin,expectedPinRevision:1,routeId:r1,expectedTripRevision:(await readTrip(testDb,a,fixture.slug)).revision,requestId:randomUUID()};
    const c1=await addPinToRoute(testDb,a,input);
    assert((await addPinToRoute(testDb,a,input)).replayed);
    const c2=await addPinToRoute(testDb,b,{...input,routeId:r2,expectedTripRevision:(await readTrip(testDb,b,fixture.slug)).revision,requestId:randomUUID()});
    assert.notEqual(c1.resultId,c2.resultId);assert.notEqual(c2.resultId,pin);
    await change({type:"comment",placeId:c2.resultId,body:"Independent safe QA comment"});
    await change({type:"star-place",placeId:c2.resultId,starred:true});
    await change({type:"skip-place",placeId:c2.resultId,skipped:true});
    await change({type:"nuke-route",routeId:r1});
    assert((await readPins(testDb,b,fixture.slug)).pins.some(p=>p.id===pin));
    assert((await readTrip(testDb,b,fixture.slug)).places.some(p=>p.id===c2.resultId));
    await mutatePin(testDb,b,{scope:fixture.slug,requestId:randomUUID(),command:{type:"nuke",pinId:pin,expectedRevision:1}});
    assert(!(await readPins(testDb,a,fixture.slug)).pins.some(p=>p.id===pin));
    const survivor=(await readTrip(testDb,a,fixture.slug)).places.find(p=>p.id===c2.resultId);assert(survivor?.starred&&survivor.skipped);
    assert.equal((await readTripComments(testDb,a,fixture.slug,c2.resultId)).comments.length,1);
    assert((await addPinToRoute(testDb,a,input)).replayed);
    await assert.rejects(()=>addPinToRoute(testDb,a,{...input,pinId:randomUUID(),requestId:randomUUID()}));
    console.log("PASS B4 one Pin/two independent Route Cards; A/B copy, idempotency, Route Nuke keeps Pin/other card; Pin Nuke keeps card/comment/star/Skip; forged ID rejection");
    throw rollback;
  });}catch(e){if(e!==rollback)throw e;}
  console.log("PASS independence transaction/fixtures/schema completely rolled back");
}
main().catch(e=>{console.error(JSON.stringify({failure:"independence not accepted",kind:e instanceof Error?e.name:"unknown",code:e?.cause?.code??e?.code??null}));process.exitCode=1;}).finally(async()=>{await db.$client.end();clearTimeout(timeout);});

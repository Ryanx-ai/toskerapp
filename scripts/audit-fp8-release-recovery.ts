/** Read-only FP8 retained-data fingerprint and cleanup verification. Never restores data. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase(),path=".git/fp8-recovery/retained-cleanup-baseline.json";
const fixture=JSON.parse(readFileSync(".git/fp8-recovery/fixture.json","utf8")).fixture;
const mode=process.argv[2];assert(["--before","--after"].includes(mode));
async function main(){await db.transaction(async tx=>{
  await tx.execute(sql`set transaction isolation level repeatable read read only`);
  await tx.execute(sql`set local statement_timeout='20s'`);
  await resolveQaActors(tx);
  const tables=await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
  const data:Record<string,Record<string,unknown>[]>={};
  for(const {tablename} of tables.rows){assert(/^[a-z_]+$/.test(String(tablename)));data[String(tablename)]=(await tx.execute(sql.raw(`select to_jsonb(t) as row from public.${tablename} t`))).rows.map(r=>r.row as Record<string,unknown>);}
  const previous=mode==="--after"?JSON.parse(readFileSync(path,"utf8")):null;
  const plans=data.trip_plans.filter(r=>r.room_id===fixture.id),planIds=plans.map(r=>r.id);
  const ownedIds:string[]=previous?.ownedIds??[fixture.id,fixture.conversationId,...planIds,...data.trip_routes.filter(r=>planIds.includes(r.plan_id)).map(r=>r.id),...data.trip_places.filter(r=>planIds.includes(r.plan_id)).map(r=>r.id)];
  assert.equal(data.map_pins.filter(r=>r.conversation_id===fixture.conversationId).length,0,"Unexpected Map Pin inside disposable Room: inspect before cleanup");
  const hashes=Object.fromEntries(Object.entries(data).map(([table,rows])=>{
    const retained=rows.filter(r=>!Object.values(r).some(v=>typeof v==="string"&&ownedIds.includes(v))).map(r=>JSON.stringify(r)).sort();
    return [table,{count:retained.length,sha256:createHash("sha256").update(JSON.stringify(retained)).digest("hex")}];
  }));
  const missingDefaults=data.trip_places.filter(r=>r.source==="pin"&&!r.provider_id&&!/^Checkpoint [1-9][0-9]*$/.test(String(r.default_title))).length;assert.equal(missingDefaults,0);
  const placeIds=new Set(data.trip_places.map(r=>r.id));assert.equal(data.trip_comments.filter(r=>!placeIds.has(r.place_id)).length,0);
  if(mode==="--before"){
    assert(!existsSync(path),"Existing cleanup baseline: recover it, never overwrite");assert(data.rooms.some(r=>r.id===fixture.id));
    writeFileSync(path,JSON.stringify({at:new Date().toISOString(),ownedIds,hashes},null,2),{mode:0o600,flag:"wx"});
  }else{
    assert(!data.rooms.some(r=>r.id===fixture.id));assert.deepEqual(hashes,previous.hashes,"Non-fixture data changed: inspect, never restore automatically");
    writeFileSync(".git/fp8-recovery/cleanup-verified.json",JSON.stringify({passed:true,at:new Date().toISOString(),deletedRoom:fixture.slug,retainedTables:Object.keys(hashes).length,missingDefaults,orphanComments:0,inventory:{rooms:data.rooms.length,plans:data.trip_plans.length,routes:data.trip_routes.length,places:data.trip_places.length,comments:data.trip_comments.length,receipts:data.trip_mutation_receipts.length,mapPins:data.map_pins.length}},null,2),{mode:0o600});
  }
  console.log({mode,passed:true,readOnly:true,retainedTables:Object.keys(hashes).length,missingDefaults,orphanComments:0,mapPins:data.map_pins.length});
});}
main().catch(e=>{console.error({failure:"FP8 recovery audit",kind:e.name,message:e instanceof assert.AssertionError?e.message.split("\n")[0]:"Database details suppressed"});process.exitCode=1;}).finally(()=>db.$client.end());

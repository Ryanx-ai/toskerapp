/** Exact owned namespace cleanup only, after canonical acceptance. Default inspect. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {createHash,randomUUID} from "node:crypto";
import {sql} from "drizzle-orm";
import {getDatabase,type ToskerDatabase} from "../src/server/db/client";
import {cleanupQaFixture,resolveQaActors} from "./lib/ms73-fixtures";
const db=getDatabase();
async function main(){
  const mode=process.argv[2];assert(["--inspect","--apply"].includes(mode));
  const receipt=JSON.parse(readFileSync(".git/fp5-recovery/browser-schema.json","utf8")),{fixture}=JSON.parse(readFileSync(".git/fp5-recovery/browser-fixture.json","utf8"));
  assert(/^fp5_rehearsal_[a-f0-9]{32}$/.test(receipt.schema));assert.equal(receipt.purpose,"FP5 isolated browser QA; public remains27");
  const baseline=JSON.parse(readFileSync(".git/fp5-recovery/before-prepare-browser-730ac6e0-9b1e-483d-be33-ec1d46e3d78f.json","utf8")).data;
  await db.transaction(async tx=>{
    const existing=await tx.execute(sql`select nspname from pg_namespace where nspname=${receipt.schema}`);assert.equal(existing.rows.length,1,"No blind replay of cleanup");
    const dependencies=await tx.execute(sql`select count(*)::int as n from pg_depend d cross join lateral pg_identify_object(d.refclassid,d.refobjid,d.refobjsubid) target cross join lateral pg_identify_object(d.classid,d.objid,d.objsubid) source where target.schema=${receipt.schema} and source.schema is not null and source.schema<>${receipt.schema} and source.schema<>'pg_toast'`);assert.equal(dependencies.rows[0].n,0,"External dependency; STOP before cascade");
    const tables=await tx.execute(sql`select tablename from pg_tables where schemaname=${receipt.schema} order by tablename`);
    assert.deepEqual(tables.rows.map(r=>r.tablename),Object.keys(baseline).map(t=>t==="map_provider_usage"?"fp5_unused_provider_usage_copy":t).sort());
    await tx.execute(sql.raw(`set local search_path=${receipt.schema},public`));
    await cleanupQaFixture(tx as unknown as ToskerDatabase,fixture,false);
    const {founder}=await resolveQaActors(tx),data:Record<string,unknown[]>={};
    for(const row of tables.rows){const t=String(row.tablename);assert(/^[a-z_][a-z0-9_]*$/.test(t),"Validated shadow table identifier required");const result=await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) as rows from ${receipt.schema}.${t} t`));data[t]=result.rows[0].rows as unknown[];}
    for(const t of["profiles","messages","hall_items","trip_places","trip_comments","map_pins","rooms"]){
      const key=t==="profiles"?"user_id":"id";
      for(const old of baseline[t]){assert(old[key],`${t} explicit primary key required`);const current=(data[t] as Record<string,unknown>[]).find(r=>r[key]===old[key]);assert(current,`${t} retained row missing`);const projected=Object.fromEntries(Object.keys(old).map(k=>[k,current[k]]));assert.deepEqual(projected,old,`${t} retained row changed; preserve shadow and inspect`);}
    }
    const founderOld=baseline.users.find((r:{id:string})=>r.id===founder.userId),founderNow=(data.users as {id:string}[]).find(r=>r.id===founder.userId);assert.deepEqual(founderNow,founderOld,"Founder account changed; preserve shadow");
    if(mode==="--apply"){
      const backup=`.git/fp5-recovery/shadow-cleanup-${randomUUID()}.json`;writeFileSync(backup,JSON.stringify({schema:receipt.schema,at:new Date().toISOString(),data}),{mode:0o600,flag:"wx"});
      console.log(JSON.stringify({backup,sha256:createHash("sha256").update(readFileSync(backup)).digest("hex")}));
      await tx.execute(sql.raw(`drop schema ${receipt.schema} cascade`));
    }
    console.log(JSON.stringify({action:mode,ownedShadow:receipt.schema,externalDependencies:0,retainedCopyUnchanged:true,publicUntouched:true}));
  });
}
main().catch(e=>{console.error(JSON.stringify({failure:"FP5 exact shadow cleanup stopped",kind:e?.name,assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:undefined}));process.exitCode=1;}).finally(()=>db.$client.end());

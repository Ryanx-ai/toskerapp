/** Read-only FP4 recovery; original protected fingerprints are never replaced. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import dotenv from "dotenv";
import {neon} from "@neondatabase/serverless";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {reviewEnvironment} from "./ms74-fp3-review-runtime.mjs";
const baseline=JSON.parse(readFileSync(".git/ms74-fp4/preservation-fingerprints-1793009205896.json"));
const definition=JSON.parse(readFileSync("drizzle/meta/0032_snapshot.json"));
const fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json"));
const names=Object.keys(baseline.fingerprints),migrations=readMigrationFiles({migrationsFolder:"drizzle"});
assert(names.every(n=>/^[a-z_]+$/.test(n)));
const env={...dotenv.parse(readFileSync(".env.local")),...dotenv.parse(readFileSync(".env.development.local"))};
const hash=x=>createHash("sha256").update(JSON.stringify(x)??"undefined").digest("hex");
const result={pass:false,at:new Date().toISOString(),readOnly:true,checks:[],differences:[]};
const afterMigration=process.argv.includes('--after-migration');
if(afterMigration){const proof=JSON.parse(readFileSync('.git/ms74-fp4/migration/main-apply-1793078746083.json'));assert(proof.pass&&proof.mode==='--apply');assert.equal(proof.migrationHash,migrations.at(-1).hash);}
try{
 const q=neon(env.DATABASE_URL);
 const all=await q.transaction([...names.map(n=>q.query(`select to_jsonb(t) as row from public.${n} t`)),q`select hash,created_at from drizzle.__drizzle_migrations order by created_at`,q`select count(*)::int n from location_latest`],{readOnly:true,isolationLevel:"RepeatableRead"});
 assert.equal(all.at(-1)[0].n,0,"Active retained payloads: stop broad preservation capture");
 const history=all.at(-2);assert.equal(history.length,afterMigration?34:33);history.forEach((r,i)=>{assert.equal(r.hash,migrations[i].hash);assert.equal(Number(r.created_at),migrations[i].folderMillis);});
 const data=Object.fromEntries(names.map((n,i)=>[n,all[i].map(r=>r.row)]));
 const founders=data.users.filter(u=>u.tid==="8V3X7P1");assert.equal(founders.length,1);
 const qa=data.profiles.filter(p=>["tosker-user-a-clerk-test","tosker-user-b-clerk-test"].includes(p.username)).map(p=>p.user_id);
 const plans=data.trip_plans.filter(p=>p.room_id===fixture.roomId).map(p=>p.id);
 const owned=new Set([fixture.roomId,fixture.conversationId,fixture.selectedId,fixture.selectedChatId,fixture.everyoneId,fixture.everyoneChatId,...plans,...data.trip_routes.filter(r=>plans.includes(r.plan_id)).map(r=>r.id)]);
 for(const name of names){
  const def=Object.values(definition.tables).find(t=>t.name===name);assert(def);
  const primary=[...Object.values(def.columns).filter(c=>c.primaryKey).map(c=>c.name),...Object.values(def.compositePrimaryKeys).flatMap(k=>k.columns)];assert(primary.length);
  const retained=data[name].filter(r=>!Object.values(r).some(v=>typeof v==="string"&&owned.has(v))&&!(name==="conversation_reads"&&qa.includes(r.user_id)));
  const actual=Object.fromEntries(retained.map(r=>[hash(JSON.stringify(primary.map(k=>r[k]))),hash(r)]));
  const before=baseline.fingerprints[name];
  const added=Object.keys(actual).filter(k=>!(k in before)).length,removed=Object.keys(before).filter(k=>!(k in actual)).length,changed=Object.keys(actual).filter(k=>k in before&&before[k]!==actual[k]).length;
  if(added||removed||changed)result.differences.push({table:name,added,removed,changed});
 }
 assert.equal(result.differences.length,0,"Retained changes require provenance reconciliation; never restore the baseline");
 result.checks.push(`${history.length} retained migration hashes/timestamps match; exact founder resolves; protected FP4 fingerprints unchanged under original exclusions`);
 const review=neon(reviewEnvironment().DATABASE_URL);
 const rows=await review.transaction([review`select hash,created_at from drizzle.__drizzle_migrations order by created_at`,review`select (select count(*)::int from location_latest) payloads,(select count(*)::int from location_shares where expires_at>clock_timestamp()) active,(select count(*)::int from location_cleanup_workers) workers`],{readOnly:true,isolationLevel:"RepeatableRead"});
 assert.equal(rows[0].length,34);rows[0].forEach((r,i)=>{assert.equal(r.hash,migrations[i].hash);assert.equal(Number(r.created_at),migrations[i].folderMillis);});assert.deepEqual(rows[1][0],{payloads:0,active:0,workers:0});
 result.checks.push("34 isolated migration hashes/timestamps match; zero payloads, active shares and workers");result.pass=true;
}catch(e){result.error=e.name;process.exitCode=1;}
const path=`.git/ms74-fp4/recovery-${Date.now()}.json`;writeFileSync(path,JSON.stringify(result,null,2),{flag:"wx",mode:0o600});console.log(JSON.stringify({...result,path}));

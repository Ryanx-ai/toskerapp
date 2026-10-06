/** Preserve one real provider allowance across shadow and canonical environments. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {sql} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
const db=getDatabase();
async function main(){
  const {schema}=JSON.parse(readFileSync(".git/fp5-recovery/browser-schema.json","utf8"));
  assert(/^fp5_rehearsal_[a-f0-9]{32}$/.test(schema));
  await db.transaction(async tx=>{
    const current=await tx.execute(sql`select current_schema() as name`);assert.equal(current.rows[0].name,schema);
    const old=await tx.execute(sql`select to_regclass(${`${schema}.map_provider_usage`}) as name`);
    if(old.rows[0].name){
      // Rename, never erase: the unused copied counters remain recoverable. With
      // no shadow table under the normal name, search_path resolves PUBLIC budget.
      await tx.execute(sql.raw(`alter table ${schema}.map_provider_usage rename to fp5_unused_provider_usage_copy`));
    }
    const resolved=await tx.execute(sql`select n.nspname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=to_regclass('map_provider_usage')`);
    assert.equal(resolved.rows[0].name,"public");
    const counters=await tx.execute(sql`select scope,"window",used from public.map_provider_usage where scope in ('geoapify:day','geoapify:roads:day') order by scope`);
    console.log(JSON.stringify({budgetNamespace:"public",counters:counters.rows,reset:false}));
  });
}
main().catch(()=>{console.error("STOP: FP5 shared provider-budget verification failed");process.exitCode=1;}).finally(()=>db.$client.end());

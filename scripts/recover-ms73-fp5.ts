/** Read-only restart inventory; never resets, seeds, migrates or repairs data. */
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {sql} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
const db=getDatabase();
async function main(){
  const {schema}=JSON.parse(readFileSync(".git/fp5-recovery/browser-schema.json","utf8"));
  assert(/^fp5_rehearsal_[a-f0-9]{32}$/.test(schema));
  const backup=".git/fp5-recovery/before-prepare-browser-730ac6e0-9b1e-483d-be33-ec1d46e3d78f.json";
  assert.equal(statSync(backup).mode&0o777,0o600);
  assert.equal(createHash("sha256").update(readFileSync(backup)).digest("hex"),"52d86d6d015de2a21658ca929a345cd9c78c288d25f2a8a33187b8e2717c85d8");
  await db.transaction(async tx=>{
    await tx.execute(sql`set transaction read only`);
    const history=await tx.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    assert([27,28].includes(Number(history.rows[0].n)));
    const columns=await tx.execute(sql`select count(*)::int as n from information_schema.columns where table_schema='public' and ((table_name='trip_places' and column_name='icon') or (table_name='trip_plans' and column_name='sandbox_conversation_id'))`);
    assert.equal(columns.rows[0].n,history.rows[0].n===27?0:2);
    const founder=await tx.execute(sql`select id from public.users where tid='8V3X7P1'`);assert.equal(founder.rows.length,1);
    const pins=await tx.execute(sql`select state,revision from public.map_pins where id='009e5547-5a05-4ae7-a511-11f46c7599b0'`);assert.equal(pins.rows.length,1);
    const protectedTables=["profiles","messages","hall_items","map_pins"];
    const original=JSON.parse(readFileSync(backup,"utf8")).data;
    const unchanged=[];
    for(const table of protectedTables){
      const result=await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as rows from public.${table} t`));
      const serialize=(rows:unknown[])=>rows.map(row=>JSON.stringify(row)).sort();
      assert.deepEqual(serialize(result.rows[0].rows as unknown[]),serialize(original[table]),`${table}: retained content differs; inspect, never restore`);unchanged.push(table);
    }
    const shadow=await tx.execute(sql.raw(`select (select count(*)::int from ${schema}.trip_plans) as plans,(select count(*)::int from ${schema}.trip_routes) as routes,(select count(*)::int from ${schema}.trip_places) as cards,(select count(*)::int from ${schema}.trip_comments) as comments,(select count(*)::int from ${schema}.trip_mutation_receipts) as receipts,(select count(*)::int from ${schema}.trip_plans p join ${schema}.conversations c on c.id=p.sandbox_conversation_id where c.kind='sandbox' and c.owner_id is not null) as owned_sandbox_plans`));
    const budget=await tx.execute(sql`select scope,"window",used from public.map_provider_usage where scope in ('geoapify:day','geoapify:roads:day') order by scope`);
    console.log(JSON.stringify({readOnly:true,publicMigrations:history.rows[0].n,fp5Applied:history.rows[0].n===28,backupVerified:true,founderUnique:true,retainedPin:pins.rows[0],retainedTablesUnchanged:unchanged,shadow:shadow.rows[0],providerCounters:budget.rows}));
  });
}
main().catch(error=>{console.error(JSON.stringify({failure:"FP5 recovery stopped; inspect without restoring",kind:error?.name,assertion:error instanceof assert.AssertionError?error.message.split("\n")[0]:undefined}));process.exitCode=1;}).finally(()=>db.$client.end());

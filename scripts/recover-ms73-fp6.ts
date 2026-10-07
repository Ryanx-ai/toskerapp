/** Read-only FP6 release inventory. Never restores older retained data or logs its contents. */
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {sql} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
const db=getDatabase();
async function main(){
  const path=".git/fp5-recovery/before-prepare-browser-730ac6e0-9b1e-483d-be33-ec1d46e3d78f.json";
  assert.equal(statSync(path).mode&0o777,0o600);assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"),"52d86d6d015de2a21658ca929a345cd9c78c288d25f2a8a33187b8e2717c85d8");
  const baseline=JSON.parse(readFileSync(path,"utf8")).data;
  await db.transaction(async tx=>{
    await tx.execute(sql`set transaction read only`);
    const founder=await tx.execute(sql`select id from users where tid='8V3X7P1'`);assert.equal(founder.rows.length,1);
    const guards=await tx.execute(sql`select tgname,tgenabled from pg_trigger where not tgisinternal and (tgname like '%\_fp3_guard' or tgname='trip_places_fp3_projection')`);
    assert.equal(guards.rows.length,7);assert(guards.rows.every(r=>r.tgenabled==='O'));
    const invariants=await tx.execute(sql`select
      (select count(*)::int from trip_places p left join trip_routes r on r.id=p.route_id and r.plan_id=p.plan_id where r.id is null) as orphan_cards,
      (select count(*)::int from trip_places p full join trip_route_places m on m.place_id=p.id where p.id is null or m.place_id is null or p.route_id<>m.route_id or p.plan_id<>m.plan_id or p.position<>m.position or p.is_stop<>m.is_stop) as mirror_mismatch,
      (select count(*)::int from (select route_id,position from trip_places group by route_id,position having count(*)>1) d) as duplicate_positions`);
    assert(Object.values(invariants.rows[0]).every(n=>n===0));
    const retained=await tx.execute(sql`select r.slug from rooms r join room_memberships m on m.room_id=r.id join users u on u.id=m.user_id where u.tid='8V3X7P1' and r.slug in ('ms73-founder-review-904a9dea','ms73-qa-bfff9475')`);assert.equal(retained.rows.length,2);
    const unchanged=[];
    for(const table of["profiles","messages","hall_items","map_pins"]){
      const result=await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as rows from public.${table} t`));
      const normalized=(rows:unknown[])=>rows.map(row=>JSON.stringify(row)).sort();
      assert.deepEqual(normalized(result.rows[0].rows as unknown[]),normalized(baseline[table]),`${table}: inspect legitimate changes; NEVER restore old counts`);unchanged.push(table);
    }
    const counts=await tx.execute(sql`select (select count(*)::int from rooms) as rooms,(select count(*)::int from trip_plans) as plans,(select count(*)::int from trip_routes) as routes,(select count(*)::int from trip_places) as cards,(select count(*)::int from trip_comments) as comments,(select count(*)::int from trip_mutation_receipts) as receipts`);
    const counters=await tx.execute(sql`select scope,"window",used from map_provider_usage where scope in ('geoapify:day','geoapify:roads:day') order by scope`);
    console.log({readOnly:true,founderUnique:true,protectedRooms:retained.rows,enabledOwnershipGuards:guards.rows.length,invariants:invariants.rows[0],protectedTablesUnchanged:unchanged,counts:counts.rows[0],counters:counters.rows});
  });
}
main().catch(e=>{console.error({failure:"FP6 recovery inventory",assertion:e instanceof assert.AssertionError?e.message.split("\n")[0]:"Details suppressed; no restoration attempted"});process.exitCode=1;}).finally(()=>db.$client.end());

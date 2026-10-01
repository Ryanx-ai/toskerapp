import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { ToskerTransaction } from "../../src/server/db/client";
export const tripTables=["trip_plans","trip_routes","trip_places","trip_route_places","trip_comments","trip_mutation_receipts"] as const;
type Row=Record<string,unknown>;
export type TripBackup=Record<typeof tripTables[number],Row[]>;
export async function tripBackup(tx:ToskerTransaction):Promise<TripBackup>{
  const result={} as TripBackup;
  for(const table of tripTables){const r=await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as rows from ${table} t`));result[table]=r.rows[0].rows as Row[];}
  return result;
}
export function derivedId(prefix:string,id:unknown,route:unknown){const h=createHash("md5").update(`${prefix}:${id}:${route}`).digest("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export function verifyBackfill(before:TripBackup,after:TripBackup){
  assert.equal(after.trip_places.length,before.trip_route_places.length,"One card per old membership");
  const routes=new Map(before.trip_routes.map(r=>[r.id,r]));
  const mappings: {legacyId:unknown;routeId:unknown;cardId:unknown}[]=[];
  for(const p of before.trip_places){
    const links=before.trip_route_places.filter(m=>m.place_id===p.id).sort((a,b)=>{const ar=routes.get(a.route_id)!,br=routes.get(b.route_id)!;return Number(ar.position)-Number(br.position)||String(ar.created_at).localeCompare(String(br.created_at))||String(ar.id).localeCompare(String(br.id));});
    assert(links.length,"No implicit orphan disposition");
    links.forEach((m,index)=>{
      const id=index?derivedId("tosker-fp3-card",p.id,m.route_id):p.id,card=after.trip_places.find(c=>c.id===id);
      assert(card,"Deterministic card exists");
      assert.deepEqual(card,{...p,id,route_id:m.route_id,position:m.position,is_stop:m.is_stop},"Every original field preserved");
      mappings.push({legacyId:p.id,routeId:m.route_id,cardId:id});
      for(const comment of before.trip_comments.filter(c=>c.place_id===p.id)){
        const commentId=index?derivedId("tosker-fp3-comment",comment.id,m.route_id):comment.id;
        assert.deepEqual(after.trip_comments.find(c=>c.id===commentId),{...comment,id:commentId,place_id:id},"Comment author/time/body preserved");
      }
    });
  }
  assert.equal(after.trip_comments.length,mappings.reduce((n,m)=>n+before.trip_comments.filter(c=>c.place_id===m.legacyId).length,0));
  assert.deepEqual(after.trip_routes,before.trip_routes,"Routes unchanged");
  assert.deepEqual(after.trip_mutation_receipts,before.trip_mutation_receipts,"Old receipts unchanged");
  for(const p of before.trip_plans){const next=after.trip_plans.find(v=>v.id===p.id);assert(next);assert.deepEqual({...next,updated_at:p.updated_at,revision:p.revision},p);assert.equal(next.revision,Number(p.revision)+1);}
  for(const card of after.trip_places)assert.deepEqual(after.trip_route_places.find(m=>m.place_id===card.id),{plan_id:card.plan_id,route_id:card.route_id,place_id:card.id,position:card.position,is_stop:card.is_stop});
  return mappings;
}

/** Read-only FP3 preservation capture/verification. Never replace a baseline. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), path = ".git/ms74-fp3/protected-baseline.json";
const mode = process.argv[2];
assert(["--capture", "--verify"].includes(mode));
async function main() {
  await db.transaction(async tx => {
    await tx.execute(sql`set transaction isolation level repeatable read read only`);
    const actors = await resolveQaActors(tx);
    const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
    assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
    const names = await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const { tablename } of names.rows) {
      assert(/^[a-z_]+$/.test(String(tablename)));
      data[String(tablename)] = (await tx.execute(sql.raw(`select to_jsonb(t) as row from public.${tablename} t`))).rows.map(r => r.row as Record<string, unknown>);
    }
    const room = data.rooms.find(r => r.id === fixture.roomId);
    assert(room && room.slug === fixture.slug && room.owner_id === actors.a.userId && room.created_at === fixture.createdAt.replace("Z", "+00:00"));
    const reviewSlugs = [fixture.slug, "ms73-founder-review-904a9dea", "ms73-qa-bfff9475"];
    for (const slug of reviewSlugs) {
      const target = data.rooms.find(r => r.slug === slug); assert(target);
      assert(data.room_memberships.some(r => r.room_id === target.id && r.user_id === actors.founder.userId));
    }
    // Only this exact reusable QA fixture is excluded, not historical MS7.3 Rooms.
    const plans = data.trip_plans.filter(r => r.room_id === fixture.roomId).map(r => r.id);
    const owned = new Set([fixture.roomId, fixture.conversationId, fixture.selectedId, fixture.selectedChatId, fixture.everyoneId, fixture.everyoneChatId, ...plans, ...data.trip_routes.filter(r => plans.includes(r.plan_id)).map(r => r.id)]);
    const retained = Object.fromEntries(Object.entries(data).filter(([table]) => table !== "map_provider_usage").map(([table, rows]) => [table, rows.filter(r => !Object.values(r).some(v => typeof v === "string" && owned.has(v)) && !(table === "conversation_reads" && [actors.a.userId, actors.b.userId].includes(String(r.user_id))))]));
    const hashes = Object.fromEntries(Object.entries(retained).map(([table, rows]) => [table, {count: rows.length, sha256: createHash("sha256").update(JSON.stringify(rows.map(r => JSON.stringify(r)).sort())).digest("hex")} ]));
    if (mode === "--capture") {
      mkdirSync(".git/ms74-fp3", {recursive:true, mode:0o700});
      // Exact rows stay private to Git metadata for field-level drift attribution.
      writeFileSync(path, JSON.stringify({at:new Date().toISOString(), hashes, data:retained}), {flag:"wx", mode:0o600});
    } else {
      const old = JSON.parse(readFileSync(path,"utf8"));
      const changed = Object.keys(hashes).filter(t => JSON.stringify(hashes[t]) !== JSON.stringify(old.hashes[t]));
      const differences = changed.map(table => ({table, before:old.hashes[table]?.count, after:hashes[table].count, fields:[...new Set(retained[table].flatMap(row => {
        const previous = old.data[table].find((r:Record<string,unknown>) => row.id ? r.id===row.id : JSON.stringify(Object.entries(r).filter(([k])=>k.endsWith("_id")))===JSON.stringify(Object.entries(row).filter(([k])=>k.endsWith("_id"))));
        return Object.keys(row).filter(key=>JSON.stringify(row[key])!==JSON.stringify(previous?.[key]));
      }))]}));
      console.log(JSON.stringify({baselineAt:old.at, differences, baselineRewritten:false}));
      assert.equal(changed.length,0,"Protected state changed: inspect, never restore/rebaseline");
    }
    console.log(JSON.stringify({gate:"FP3 preservation",mode,pass:true,readOnly:true,protectedTables:Object.keys(hashes).length,reviewSlugs,exactFounderVerified:true}));
  });
}
main().catch(error=>{console.error(JSON.stringify({pass:false,kind:error?.name,detail:error instanceof assert.AssertionError?error.message.split("\n")[0]:"Details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());

/** Read-only comparison against the verified pre-MS7.4 FP8 baseline. No restore. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";

const db = getDatabase();
async function main() {
  const baseline = JSON.parse(readFileSync(".git/fp8-recovery/retained-cleanup-baseline.json", "utf8"));
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  await db.transaction(async tx => {
    await tx.execute(sql`set transaction isolation level repeatable read read only`);
    await tx.execute(sql`set local statement_timeout='20s'`);
    const actors = await resolveQaActors(tx);
    const tables = await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const { tablename } of tables.rows) { assert(/^[a-z_]+$/.test(String(tablename))); data[String(tablename)] = (await tx.execute(sql.raw(`select to_jsonb(t) as row from public.${tablename} t`))).rows.map(r => r.row as Record<string, unknown>); }
    const room = data.rooms.find(r => r.id === fixture.roomId);
    assert(room && room.slug === fixture.slug && room.owner_id === actors.a.userId && room.created_at === fixture.createdAt.replace("Z", "+00:00"), "Exact fixture ownership required");
    const members = data.room_memberships.filter(r => r.room_id === fixture.roomId);
    assert(members.some(m => m.user_id === actors.founder.userId));
    assert(members.every(m => [actors.a.userId, actors.b.userId, actors.founder.userId].includes(String(m.user_id))));
    const plans = data.trip_plans.filter(r => r.room_id === fixture.roomId).map(r => r.id);
    const routes = data.trip_routes.filter(r => plans.includes(r.plan_id)).map(r => r.id);
    const owned = new Set([...baseline.ownedIds, fixture.roomId, fixture.conversationId, fixture.selectedId, fixture.selectedChatId, fixture.everyoneId, fixture.everyoneChatId, ...plans, ...routes]);
    // No dynamic broad name/prefix exclusion: only IDs proven by this receipt.
    const hashes = Object.fromEntries(Object.entries(data).map(([table, rows]) => {
      const retained = rows.filter(r => !Object.values(r).some(v => typeof v === "string" && owned.has(v))).map(r => JSON.stringify(r)).sort();
      return [table, { count: retained.length, sha256: createHash("sha256").update(JSON.stringify(retained)).digest("hex") }];
    }));
    const changed = Object.keys(hashes).filter(table => JSON.stringify(hashes[table]) !== JSON.stringify(baseline.hashes[table]));
    const receipt = { pass: changed.length === 0, readOnly: true, tables: Object.keys(hashes).length, changedTables: changed, ownedFixture: fixture.slug, founderMember: true, at: new Date().toISOString() };
    writeFileSync(".git/ms74-recovery/retained-audit.json", JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt));
    assert.equal(changed.length, 0, "Retained tables differ; inspect, never restore automatically");
  });
}
main().catch(error => { console.error(JSON.stringify({ pass: false, error: error instanceof assert.AssertionError ? error.message.split("\n")[0] : error.name })); process.exitCode = 1; }).finally(() => db.$client.end());

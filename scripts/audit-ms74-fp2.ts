/** Read-only protected-data audit. Historical drift is explicit, never reset. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), path = ".git/ms74-fp2/protected-baseline.json";
const mode = process.argv[2];
assert(["--capture", "--verify"].includes(mode));
async function main() {
  await db.transaction(async tx => {
    await tx.execute(sql`set transaction isolation level repeatable read read only`);
    const actors = await resolveQaActors(tx);
    const historical = JSON.parse(readFileSync(".git/fp8-recovery/retained-cleanup-baseline.json", "utf8"));
    const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
    assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
    const tables = await tx.execute(sql`select tablename from pg_tables where schemaname='public' order by tablename`);
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const { tablename } of tables.rows) {
      assert(/^[a-z_]+$/.test(String(tablename)));
      data[String(tablename)] = (await tx.execute(sql.raw(`select to_jsonb(t) as row from public.${tablename} t`))).rows.map(r => r.row as Record<string, unknown>);
    }
    const ownedRoom = data.rooms.find(r => r.id === fixture.roomId);
    assert(ownedRoom && ownedRoom.slug === fixture.slug && ownedRoom.owner_id === actors.a.userId && ownedRoom.created_at === fixture.createdAt.replace("Z", "+00:00"));
    const plans = data.trip_plans.filter(r => r.room_id === fixture.roomId).map(r => r.id);
    const owned = new Set([...historical.ownedIds, fixture.roomId, fixture.conversationId, fixture.selectedId, fixture.selectedChatId, fixture.everyoneId, fixture.everyoneChatId, ...plans, ...data.trip_routes.filter(r => plans.includes(r.plan_id)).map(r => r.id)]);
    const retained = Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.filter(r => !Object.values(r).some(v => typeof v === "string" && owned.has(v)))]));
    const hashes = Object.fromEntries(Object.entries(retained).map(([table, rows]) => [table, { count: rows.length, sha256: createHash("sha256").update(JSON.stringify(rows.map(r => JSON.stringify(r)).sort())).digest("hex") }]));
    const historicalChanges = Object.keys(hashes).filter(t => JSON.stringify(hashes[t]) !== JSON.stringify(historical.hashes[t]));
    const known = ["conversation_reads", "notifications", "trip_mutation_receipts", "trip_places", "trip_plans", "map_provider_usage"];
    assert(historicalChanges.every(t => known.includes(t)), "Unexpected protected table drift from FP8: inspect; never restore");
    const recentTrip = retained.trip_mutation_receipts.filter(r => new Date(String(r.created_at)).getTime() > Date.parse("2026-10-12T00:00:00Z"));
    assert.equal(recentTrip.length, 1, "Inspect new retained Map mutation; do not overwrite");
    assert.equal(recentTrip[0].actor_id, actors.founder.userId);
    assert(new Date(String(recentTrip[0].created_at)).getTime() < Date.parse("2026-10-12T05:38:00Z"));
    const reviewSlugs = [fixture.slug, "ms73-founder-review-904a9dea", "ms73-qa-bfff9475"];
    for (const slug of reviewSlugs) {
      const room = data.rooms.find(r => r.slug === slug); assert(room);
      assert(data.room_memberships.some(r => r.room_id === room.id && r.user_id === actors.founder.userId));
    }
    // QA reads outside the owned Room are allowed, but all other users' markers
    // and all retained content are hashed in the current release baseline.
    const protectedHashes: Record<string, { sha256: string; count: number }> = { ...hashes, conversation_reads: {
      sha256: createHash("sha256").update(JSON.stringify(retained.conversation_reads.filter(r => ![actors.a.userId, actors.b.userId].includes(String(r.user_id))).map(r => JSON.stringify(r)).sort())).digest("hex"), count: retained.conversation_reads.filter(r => ![actors.a.userId, actors.b.userId].includes(String(r.user_id))).length,
    } };
    delete protectedHashes.map_provider_usage;
    if (mode === "--capture") {
      assert(!existsSync(path), "Never replace an existing preservation baseline");
      mkdirSync(".git/ms74-fp2", { recursive: true, mode: 0o700 });
      writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), historicalChanges, protectedHashes }, null, 2), { mode: 0o600, flag: "wx" });
    } else {
      const baseline = JSON.parse(readFileSync(path, "utf8"));
      const changed = Object.keys(protectedHashes).filter(t => JSON.stringify(protectedHashes[t]) !== JSON.stringify(baseline.protectedHashes[t]));
      if (changed.length) {
        const oldSnapshot = JSON.parse(readFileSync(".git/fp8-recovery/before-apply-01c044b5-7286-41dd-8fc2-fa0973dd57b5.json", "utf8"));
        const readChanges = retained.conversation_reads.filter(r => ![actors.a.userId, actors.b.userId].includes(String(r.user_id))).flatMap(r => {
          const old = oldSnapshot.data.conversation_reads.find((v: Record<string, unknown>) => v.user_id === r.user_id && v.conversation_id === r.conversation_id);
          const fields = Object.keys(r).filter(key => r[key] !== old?.[key]);
          if (!fields.length) return [];
          const context = data.conversations.find(v => v.id === r.conversation_id);
          return [{ actor: r.user_id === actors.founder.userId ? "Founder" : "Other", conversationId: r.conversation_id, kind: context?.kind, fieldsVsHistorical: fields, lastReadAt: r.last_read_at, afterAcceptanceCapture: new Date(String(r.last_read_at)).getTime() > Date.parse(baseline.at) }];
        });
        console.log(JSON.stringify({ changedProtectedTables: changed, baselineAt: baseline.at, counts: changed.map(table => ({ table, before: baseline.protectedHashes[table]?.count, after: protectedHashes[table].count })), readChanges, baselineRewritten: false }));
      }
      assert.deepEqual(changed, [], "Protected data changed since FP2 acceptance capture: inspect, never restore");
    }
    console.log(JSON.stringify({ gate: "FP2 protected data", mode, pass: true, readOnly: true, protectedTables: Object.keys(protectedHashes).length, historicalChanges, knownFounderMapMutationPreserved: true, retainedReviewRooms: reviewSlugs, allIncludeExactFounder: true, providerUsage: data.map_provider_usage.filter(r => ["geoapify:day", "geoapify:roads:day"].includes(String(r.scope))) }));
  });
}
main().catch(e => { console.error({ pass: false, kind: e.name, detail: e instanceof assert.AssertionError ? e.message.split("\n")[0] : "Database details suppressed" }); process.exitCode = 1; }).finally(() => db.$client.end());

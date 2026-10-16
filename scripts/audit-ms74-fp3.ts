/** Read-only FP3 preservation capture/verification. Never replace a baseline. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), path = ".git/ms74-fp3/protected-baseline.json";
const mode = process.argv[2];
assert(["--capture", "--verify", "--verify-qualified"].includes(mode));
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
      if (tablename === "location_latest") {
        assert.equal(Number((await tx.execute(sql`select count(*) count from location_latest`)).rows[0].count), 0, "Stop QA and clean exact payloads before preservation audit; never capture location rows");
      }
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
    if (mode === "--verify-qualified") {
      // Attribute only the previously recorded exact founder Sandbox read drift.
      // Normalize an in-memory comparison copy, never the database or baseline.
      const old = JSON.parse(readFileSync(path, "utf8"));
      const drift = JSON.parse(readFileSync(".git/ms74-fp3/read-drift.json", "utf8"));
      let normalized = 0;
      for (const row of retained.conversation_reads) {
        const before = old.data.conversation_reads.find((r: Record<string, unknown>) => r.user_id === row.user_id && r.conversation_id === row.conversation_id);
        if (!before || JSON.stringify(before.last_read_at) === JSON.stringify(row.last_read_at)) continue;
        assert.equal(row.user_id, actors.founder.userId);
        assert(data.conversations.some(c => c.id === row.conversation_id && c.kind === "sandbox" && c.owner_id === actors.founder.userId));
        assert.equal(Date.parse(String(before.last_read_at)), Date.parse(drift.before));
        assert.equal(Date.parse(String(row.last_read_at)), Date.parse(drift.after));
        row.last_read_at = before.last_read_at; normalized++;
      }
      assert.equal(normalized, 1, "Qualified read drift changed; inspect without rebaselining");
      // Normal QA location rate rows are bounded metadata, not founder content.
      // Do not clear them or reset any provider/global capacity counters.
      const qaRate = (r: Record<string, unknown>) => [actors.a.userId, actors.b.userId].includes(String(r.user_id)) && ["location-consent", "location-snapshot"].includes(String(r.operation));
      assert(!old.data.invite_rate_limits.some(qaRate), "Unexpected original QA rate rows");
      retained.invite_rate_limits = retained.invite_rate_limits.filter(r => !qaRate(r));
      // Founder explicitly confirmed these two pre-run manual-test entries on
      // 17 October. Preserve their exact rows; qualify only this known delta.
      const manual = retained.invite_rate_limits.filter(r => r.user_id === actors.founder.userId && ["location-consent", "location-snapshot"].includes(String(r.operation)));
      assert.equal(manual.length, 2);
      for (const row of manual) {
        assert.equal(row.attempts, 1);
        const expected = row.operation === "location-consent" ? "2026-10-14T00:33:03.023Z" : "2026-10-14T00:33:04.773Z";
        assert.equal(Date.parse(String(row.window_start)), Date.parse(expected));
        assert(!old.data.invite_rate_limits.some((r: Record<string, unknown>) => r.user_id === row.user_id && r.operation === row.operation));
      }
      retained.invite_rate_limits = retained.invite_rate_limits.filter(r => !manual.includes(r));
    }
    const hashes = Object.fromEntries(Object.entries(retained).map(([table, rows]) => [table, {count: rows.length, sha256: createHash("sha256").update(JSON.stringify(rows.map(r => JSON.stringify(r)).sort())).digest("hex")} ]));
    if (mode === "--capture") {
      mkdirSync(".git/ms74-fp3", {recursive:true, mode:0o700});
      // Exact rows stay private to Git metadata for field-level drift attribution.
      writeFileSync(path, JSON.stringify({at:new Date().toISOString(), hashes, data:retained}), {flag:"wx", mode:0o600});
    } else {
      const old = JSON.parse(readFileSync(path,"utf8"));
      const added=Object.keys(hashes).filter(t=>!(t in old.hashes));
      const allowed = ["location_shares","location_latest","location_cleanup_workers", ...(mode === "--verify-qualified" ? ["location_cleanup_health","location_cleanup_budget","location_cleanup_reservations"] : [])];
      assert(added.every(t=>allowed.includes(t)),"Unexpected new public table");
      // Additive consent schema was rehearsed/applied separately. A release
      // audit requires no retained non-QA consent; original baseline is immutable.
      if(added.includes("location_shares"))assert.equal(retained.location_shares.length,0,"Unexpected retained sharing consent");
      for (const table of ["location_latest", "location_cleanup_workers"]) if (added.includes(table)) assert.equal(data[table].length, 0, "Local QA must be stopped and cleaned before closeout");
      const changed = Object.keys(old.hashes).filter(t => JSON.stringify(hashes[t]) !== JSON.stringify(old.hashes[t]));
      const differences = changed.map(table => ({table, before:old.hashes[table]?.count, after:hashes[table].count, fields:[...new Set(retained[table].flatMap(row => {
        const previous = old.data[table].find((r:Record<string,unknown>) => row.id ? r.id===row.id : JSON.stringify(Object.entries(r).filter(([k])=>k.endsWith("_id")))===JSON.stringify(Object.entries(row).filter(([k])=>k.endsWith("_id"))));
        return Object.keys(row).filter(key=>JSON.stringify(row[key])!==JSON.stringify(previous?.[key]));
      }))]}));
      console.log(JSON.stringify({baselineAt:old.at, differences, baselineRewritten:false}));
      assert.equal(changed.length,0,"Protected state changed: inspect, never restore/rebaseline");
      if (mode === "--verify-qualified") {
        const receipt = { at: new Date().toISOString(), pass: true, baselineAt: old.at, baselineRewritten: false,
          protectedHistoricalTables: Object.keys(old.hashes).length, priorExactReadDriftUnchanged: true,
          qualifiedQaLocationRateMetadata: true, founderConfirmedManualRateRowsPreserved: 2, newCleanupTables: added, exactFounderMembershipsPreserved: true,
          limitation: "Preserves original audit's exact owned-fixture exclusions; not a pristine full-database hash" };
        writeFileSync(`.git/ms74-fp3/qualified-preservation-${Date.now()}.json`, JSON.stringify(receipt), { mode: 0o600 });
        console.log(JSON.stringify(receipt));
      }
    }
    console.log(JSON.stringify({gate:"FP3 preservation",mode,pass:true,readOnly:true,protectedTables:Object.keys(hashes).length,reviewSlugs,exactFounderVerified:true}));
  });
}
main().catch(error=>{console.error(JSON.stringify({pass:false,kind:error?.name,detail:error instanceof assert.AssertionError?error.message.split("\n")[0]:"Details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());

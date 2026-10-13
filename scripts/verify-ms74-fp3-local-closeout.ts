/** Read-only attribution of the already qualified baseline drift; never rebaseline. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { LOCAL_LOCATION_WORKER_FILE } from "../src/server/location-sharing/local-qa";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase();
async function main() {
  assert(!existsSync(LOCAL_LOCATION_WORKER_FILE));
  const baseline = JSON.parse(readFileSync(".git/ms74-fp3/protected-baseline.json", "utf8"));
  const drift = JSON.parse(readFileSync(".git/ms74-fp3/read-drift.json", "utf8"));
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  const result = await db.transaction(async tx => {
    await tx.execute(sql`set transaction isolation level repeatable read read only`);
    const actors = await resolveQaActors(tx);
    const counts = (await tx.execute(sql`select (select count(*) from location_latest)::int payloads,
      (select count(*) from location_cleanup_workers)::int workers,
      (select count(*) from location_shares)::int consents,
      (select count(*) from invite_rate_limits where user_id in (${actors.a.userId}::uuid,${actors.b.userId}::uuid)
        and operation in ('location-consent','location-snapshot'))::int rates`)).rows[0];
    assert(Object.values(counts).every(value => value === 0));
    const owned = [fixture.conversationId, fixture.selectedChatId, fixture.everyoneChatId];
    const reads = (await tx.execute(sql`select to_jsonb(r) row from conversation_reads r`)).rows.map(r => r.row as Record<string, unknown>)
      .filter(r => ![actors.a.userId, actors.b.userId].includes(String(r.user_id)) && !owned.includes(r.conversation_id));
    const before = baseline.data.conversation_reads as Record<string, unknown>[];
    assert.equal(reads.length, before.length);
    const changes = reads.flatMap(row => {
      const previous = before.find(r => r.user_id === row.user_id && r.conversation_id === row.conversation_id); assert(previous);
      const fields = [...new Set([...Object.keys(row), ...Object.keys(previous)])].filter(key => JSON.stringify(row[key]) !== JSON.stringify(previous[key]));
      return fields.length ? [{ row, previous, fields }] : [];
    });
    assert.equal(changes.length, 1); const change = changes[0];
    assert.equal(change.row.user_id, actors.founder.userId); assert.deepEqual(change.fields, ["last_read_at"]);
    const context = (await tx.execute(sql`select 1 from conversations where id=${change.row.conversation_id}::uuid and kind='sandbox' and owner_id=${actors.founder.userId}::uuid`)).rows;
    assert.equal(context.length, 1);
    assert.equal(Date.parse(String(change.previous.last_read_at)), Date.parse(drift.before));
    assert.equal(Date.parse(String(change.row.last_read_at)), Date.parse(drift.after));
    const retained = [fixture.slug, "ms73-founder-review-904a9dea", "ms73-qa-bfff9475"];
    for (const slug of retained) assert.equal((await tx.execute(sql`select 1 from rooms r join room_memberships m on m.room_id=r.id where r.slug=${slug} and m.user_id=${actors.founder.userId}::uuid`)).rows.length, 1);
    return { localCloseoutPassed: true, strictPreservationPassed: false, priorQualifiedReadDriftUnchanged: true, baselineRewritten: false,
      activeWorkers: 0, activePayloads: 0, activeConsents: 0, qaLocationRateRows: 0, exactFounderMembershipsPreserved: true, retainedRooms: retained };
  });
  writeFileSync(".git/ms74-fp3/latest-local-closeout.json", JSON.stringify({ ...result, at: new Date().toISOString() }), { mode: 0o600 }); console.log(JSON.stringify(result));
}
main().catch(() => { console.error(JSON.stringify({ localCloseoutPassed: false, privateDetailsSuppressed: true })); process.exitCode = 1; }).finally(() => db.$client.end());

/** Exact-owned, coordinate-free hosted rescue test. Never sweeps from laptop. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase, type ToskerTransaction } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), file = ".git/ms74-fp3/hosted-rescue-test.json", mode = process.argv[2];
assert(["prepare", "verify", "cleanup"].includes(mode));
async function retained(tx: ToskerTransaction) {
  const tables = (await tx.execute(sql`select tablename from pg_tables where schemaname='public' and tablename not like 'location_%' order by tablename`)).rows;
  const rows: Record<string, unknown> = {};
  for (const { tablename } of tables) {
    assert(/^[a-z_]+$/.test(String(tablename)));
    rows[String(tablename)] = (await tx.execute(sql.raw(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from public.${tablename} t`))).rows[0].rows;
  }
  return rows;
}
async function main() {
  if (mode === "prepare") {
    assert(!existsSync(file), "Inspect prior receipt; never overwrite ownership");
    const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
    assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
    const expired = randomUUID(), future = randomUUID(), session = `cleanup-test-${randomUUID()}`;
    await db.transaction(async tx => {
      const { a, b, founder } = await resolveQaActors(tx);
      const owner = (await tx.execute(sql`select 1 from rooms r join conversations c on c.room_id=r.id
        join room_memberships m on m.room_id=r.id where r.slug=${fixture.slug} and r.owner_id=${a.userId}::uuid
        and c.id=${fixture.conversationId}::uuid and m.user_id=${founder.userId}::uuid`)).rows;
      assert.equal(owner.length, 1);
      const counts = (await tx.execute(sql`select (select count(*) from location_shares)::int shares,
        (select count(*) from location_latest)::int payloads,(select count(*) from location_cleanup_reservations)::int reservations,
        (select count(*) from location_cleanup_workers)::int workers`)).rows[0];
      assert(Object.values(counts).every(n => n === 0));
      const before = await retained(tx);
      await tx.execute(sql`insert into location_cleanup_reservations(id,created_at,expires_at,armed) values
        (${expired}::uuid,now()-interval '6 minutes',now()-interval '1 minute',true),
        (${future}::uuid,now(),now()+interval '5 minutes',true)`);
      await tx.execute(sql`insert into location_shares(user_id,id,conversation_id,session_id,precision,created_at,expires_at) values
        (${a.userId}::uuid,${expired}::uuid,${fixture.conversationId}::uuid,${session},'area',now()-interval '6 minutes',now()-interval '1 minute'),
        (${b.userId}::uuid,${future}::uuid,${fixture.conversationId}::uuid,${session},'area',now(),now()+interval '5 minutes')`);
      // Durable intent before COMMIT: an interrupted run retains exact cleanup ownership.
      writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), expired, future, session,
        actors: [a.userId, b.userId], conversation: fixture.conversationId, before, state: "prepared" }), { flag: "wx", mode: 0o600 });
    });
    console.log(JSON.stringify({ hostedRescueFixturePrepared: true, coordinatePayloads: 0, founderMembershipVerified: true }));
    return;
  }
  const receipt = JSON.parse(readFileSync(file, "utf8"));
  await db.transaction(async tx => {
    const { a, b } = await resolveQaActors(tx);
    assert.deepEqual(receipt.actors, [a.userId, b.userId]);
    assert.deepEqual(await retained(tx), receipt.before, "Unexpected retained-data change; STOP");
    const rows = (await tx.execute(sql`select user_id,id,conversation_id,session_id from location_shares`)).rows;
    assert(rows.every(r => receipt.actors.includes(r.user_id) && [receipt.expired,receipt.future].includes(r.id)
      && r.session_id===receipt.session && r.conversation_id===receipt.conversation));
    assert.equal(Number((await tx.execute(sql`select count(*) n from location_latest`)).rows[0].n), 0);
    if (mode === "verify") {
      assert.equal(rows.length, 1); assert.equal(rows[0].id, receipt.future);
      const reservations = (await tx.execute(sql`select id from location_cleanup_reservations`)).rows;
      assert.equal(reservations.length, 1); assert.equal(reservations[0].id, receipt.future);
      const health = (await tx.execute(sql`select rescue_at from location_cleanup_health where slot=1`)).rows[0];
      assert(health && new Date(String(health.rescue_at)).getTime() > Date.parse(receipt.at));
      receipt.verifiedAt = new Date().toISOString(); receipt.state = "verified";
      console.log(JSON.stringify({ hostedRescuePassed: true, expiredConsentDeleted: true, expiredReservationDeleted: true,
        unexpiredConsentPreserved: true, retainedRowsUnchanged: true, coordinatesUsed: false }));
    } else {
      // Exact run-owned synthetic rows only, including after a failed test.
      await tx.execute(sql`delete from location_shares where id in (${receipt.expired}::uuid,${receipt.future}::uuid)
        and session_id=${receipt.session} and user_id in (${a.userId}::uuid,${b.userId}::uuid)`);
      await tx.execute(sql`delete from location_cleanup_reservations where id in (${receipt.expired}::uuid,${receipt.future}::uuid)`);
      receipt.state = "cleaned"; receipt.cleanedAt = new Date().toISOString();
      console.log(JSON.stringify({ exactSyntheticRowsCleaned: true, retainedRowsUnchanged: true }));
    }
  });
  writeFileSync(file, JSON.stringify(receipt), { mode: 0o600 });
}
main().catch(() => { console.error(JSON.stringify({ hostedRescueTestPassed: false, privateDetailsSuppressed: true })); process.exitCode=1; })
  .finally(() => db.$client.end());

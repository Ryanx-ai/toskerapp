/** Sep25 founder-approved repair of ONLY the two post-transition founder TIDs.
 * No provider, schema, migration, history or other identity mutation.
 * Default is read-only. Explicit apply is idempotent, never regenerates a valid ID.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { generateTid } from "../src/server/accounts/tid";
import { isCanonicalTid } from "../src/lib/tid-contract";

const targets = ["d3d151d1-6ff3-459a-9027-bde698ed3288", "415077dd-5f7d-4917-8c6e-ac772dc80e75"];
const db = getDatabase();
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
async function main() {
  assert([undefined, "inspect", "apply"].includes(process.argv[2]));
  const apply = process.argv[2] === "apply";
  await db.transaction(async tx => {
    if (apply) await tx.execute(sql`LOCK TABLE users IN EXCLUSIVE MODE`);
    const { rows: tables } = await tx.execute<{ tablename: string }>(sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    const { rows: fks } = await tx.execute<{ target_column: string }>(sql`SELECT b.attname AS target_column FROM pg_constraint c JOIN pg_attribute b ON b.attrelid=c.confrelid AND b.attnum=ANY(c.confkey) WHERE c.contype='f' AND c.confrelid='users'::regclass`);
    assert(fks.every(fk => fk.target_column === "id"));
    const { rows: accounts } = await tx.execute<{ id: string; tid: string; profile: boolean; sandboxes: number }>(sql`SELECT u.id,u.tid, EXISTS(SELECT 1 FROM profiles p WHERE p.user_id=u.id) AS profile,(SELECT count(*)::int FROM conversations c WHERE c.owner_id=u.id AND c.kind='sandbox') AS sandboxes FROM users u ORDER BY u.id`);
    const selected = accounts.filter(a => targets.includes(a.id));
    assert.equal(selected.length, 2);
    assert(selected.every(a => a.profile && a.sandboxes === 1));
    assert(accounts.filter(a => !targets.includes(a.id)).every(a => isCanonicalTid(a.tid)), "Unexpected legacy account; separate review required");
    const fingerprint = async () => {
      const values: Record<string, string> = {};
      for (const { tablename } of tables) {
        // Preserve other users' TIDs too, not merely their non-TID data.
        const expression = tablename === "users" ? `CASE WHEN t.id IN (${targets.map(id => `'${id}'::uuid`).join(",")}) THEN to_jsonb(t)-'tid' ELSE to_jsonb(t) END` : "to_jsonb(t)";
        const { rows } = await tx.execute(sql.raw(`SELECT ${expression} AS row FROM ${quote(tablename)} t ORDER BY (${expression})::text`));
        values[tablename] = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
      }
      return values;
    };
    const before = await fingerprint();
    let changed = 0;
    const used = new Set(accounts.map(a => a.tid));
    if (apply) for (const account of selected.filter(a => !isCanonicalTid(a.tid))) {
      let next = generateTid();
      for (let attempt = 0; used.has(next) && attempt < 100; attempt++) next = generateTid();
      assert(!used.has(next), "Collision budget exhausted");
      used.add(next);
      const result = await tx.execute(sql`UPDATE users SET tid=${next} WHERE id=${account.id}::uuid AND tid=${account.tid} RETURNING id`);
      assert.equal(result.rows.length, 1);
      changed++;
    }
    assert.deepEqual(await fingerprint(), before, "Unapproved data changed; rollback");
    const { rows: result } = await tx.execute<{ id: string; tid: string }>(sql`SELECT id,tid FROM users WHERE id IN (${sql.join(targets.map(id => sql`${id}::uuid`), sql`,`)}) ORDER BY id`);
    if (apply) assert(result.every(a => isCanonicalTid(a.tid)));
    console.log({ mode: apply ? "approved-two-account-repair" : "read-only", changed, accounts: result, foreignKeysToUUID: fks.length, tablesFingerprinted: tables.length, allUnapprovedDataUnchanged: true });
  }, { isolationLevel: "repeatable read" });
}
main().catch(() => { console.error("FP3 scoped TID repair failed; transaction rolled back. No credentials logged."); process.exitCode = 1; }).finally(() => db.$client.end());

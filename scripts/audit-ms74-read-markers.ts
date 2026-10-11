/** Read-only attribution of the retained audit difference. Never restores rows. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase();
async function main() {
  const baseline = JSON.parse(readFileSync(".git/fp8-recovery/retained-cleanup-baseline.json", "utf8"));
  const snapshot = JSON.parse(readFileSync(".git/fp8-recovery/before-apply-01c044b5-7286-41dd-8fc2-fa0973dd57b5.json", "utf8"));
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010");
  type Row = Record<string, unknown>;
  const old: Row[] = snapshot.data.conversation_reads.filter((r: Row) => !Object.values(r).some(v => baseline.ownedIds.includes(v)));
  const digest = createHash("sha256").update(JSON.stringify(old.map(r => JSON.stringify(r)).sort())).digest("hex");
  assert.equal(digest, baseline.hashes.conversation_reads.sha256, "Historical rows must exactly reproduce verified baseline");
  await db.transaction(async tx => {
    await tx.execute(sql`set transaction isolation level repeatable read read only`);
    await tx.execute(sql`set local statement_timeout='20s'`);
    const actors = await resolveQaActors(tx);
    const pair = [actors.a.userId, actors.b.userId].sort().join(":");
    const personal = await tx.execute(sql`select id from conversations where kind='personal' and direct_key=${pair}`);
    assert.equal(personal.rows.length, 1);
    const owned = [...baseline.ownedIds, fixture.conversationId, fixture.selectedChatId, fixture.everyoneChatId];
    const current = (await tx.execute(sql`select to_jsonb(t) as row from conversation_reads t`)).rows.map(r => r.row as Row).filter(r => !owned.includes(r.conversation_id));
    const key = (r: Row) => `${r.user_id}:${r.conversation_id}`;
    const before = new Map(old.map(r => [key(r), r])), after = new Map(current.map(r => [key(r), r]));
    const changes = [...new Set([...before.keys(), ...after.keys()])].flatMap(k => {
      const a = before.get(k), b = after.get(k);
      if (JSON.stringify(a) === JSON.stringify(b)) return [];
      const row = b ?? a!;
      return [{ actor: row.user_id === actors.a.userId ? "QA A" : row.user_id === actors.b.userId ? "QA B" : row.user_id === actors.founder.userId ? "Founder" : "Other", conversationId: row.conversation_id,
        kind: !a ? "added" : !b ? "removed" : "updated", fields: [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter(f => a?.[f] !== b?.[f]) }];
    });
    const explainedQaReadEffects = changes.length === 2 && changes.every(c => ["QA A", "QA B"].includes(c.actor) && c.conversationId === personal.rows[0].id && c.kind === "updated" && c.fields.length === 1 && c.fields[0] === "last_read_at");
    const result = { readOnly: true, baselineRowsReproduced: true, changes, explainedQaReadEffects, founderRowsUnchanged: !changes.some(c => c.actor === "Founder"), baselineRewritten: false, at: new Date().toISOString() };
    writeFileSync(".git/ms74-recovery/read-marker-attribution.json", JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
    assert(explainedQaReadEffects, "Unexpected retained change: stop; do not restore");
  });
}
main().catch(e => { console.error({ pass: false, kind: e.name }); process.exitCode = 1; }).finally(() => db.$client.end());

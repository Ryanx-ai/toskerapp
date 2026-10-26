// Read-only historical reconciliation. Never rewrites a baseline or database row.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const digest = value => createHash('sha256').update(JSON.stringify(value) ?? 'undefined').digest('hex');
async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const historical = JSON.parse(readFileSync('.git/ms74-fp3/protected-baseline.json', 'utf8'));
  const fixture = JSON.parse(readFileSync('.git/ms74-recovery/fixture.json', 'utf8'));
  const names = Object.keys(historical.data);
  const schema = JSON.parse(readFileSync('drizzle/meta/0032_snapshot.json', 'utf8'));
  assert(names.every(name => /^[a-z_]+$/.test(name)));
  const results = await sql.transaction([
    ...names.map(name => sql.query(`select to_jsonb(t) as row from public.${name} t`)),
    sql`select count(*)::int n from location_latest`,
  ], { readOnly: true, isolationLevel: 'RepeatableRead' });
  assert.equal(results.at(-1)[0].n, 0, 'Do not capture active location payloads');
  const data = Object.fromEntries(names.map((name, i) => [name, results[i].map(r => r.row)]));
  const founders = data.users.filter(u => u.tid === '8V3X7P1');
  assert.equal(founders.length, 1, 'Founder must resolve uniquely');
  const founder = founders[0];
  const qa = data.profiles.filter(p => ['tosker-user-a-clerk-test', 'tosker-user-b-clerk-test'].includes(p.username)).map(p => p.user_id);
  const actor = id => id === founder.id ? 'founder' : qa.includes(id) ? 'existing-QA' : id ? 'other-retained-user' : 'not-recorded';
  const plans = data.trip_plans.filter(r => r.room_id === fixture.roomId).map(r => r.id);
  const owned = new Set([fixture.roomId, fixture.conversationId, fixture.selectedId, fixture.selectedChatId, fixture.everyoneId, fixture.everyoneChatId, ...plans, ...data.trip_routes.filter(r => plans.includes(r.plan_id)).map(r => r.id)]);
  const retained = Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.filter(r => !Object.values(r).some(v => typeof v === 'string' && owned.has(v)) && !(table === 'conversation_reads' && qa.includes(r.user_id)))]));
  const differences = [];
  const fingerprints = {};
  for (const table of names) {
    const definition = Object.values(schema.tables).find(t => t.name === table);
    assert(definition, 'Unknown table');
    const primary = [...Object.values(definition.columns).filter(c => c.primaryKey).map(c => c.name), ...Object.values(definition.compositePrimaryKeys).flatMap(k => k.columns)];
    assert(primary.length, 'Missing primary key');
    const key = row => JSON.stringify(primary.map(field => row[field]));
    fingerprints[table] = Object.fromEntries(retained[table].map(row => [digest(key(row)), digest(row)]));
    const before = new Map(historical.data[table].map(r => [key(r), r]));
    const after = new Map(retained[table].map(r => [key(r), r]));
    assert.equal(before.size, historical.data[table].length, `Ambiguous historical key: ${table}`);
    assert.equal(after.size, retained[table].length, `Ambiguous current key: ${table}`);
    const changed = [...after].filter(([k, r]) => !before.has(k) || digest(before.get(k)) !== digest(r));
    const removed = [...before.keys()].filter(k => !after.has(k)).length;
    if (!changed.length && !removed) continue;
    differences.push({ table, removed, records: changed.map(([k, r]) => {
      const prior = before.get(k);
      const result = {
        added: !prior,
        fields: prior ? Object.keys(r).filter(f => digest(r[f]) !== digest(prior[f])) : [],
        actor: actor(r.actor_id ?? r.author_id ?? r.inviter_id ?? r.user_id),
        timestamps: Object.fromEntries(['created_at', 'updated_at', 'last_read_at', 'window_start', 'read_at', 'destination_read_at'].filter(f => r[f] != null).map(f => [f, r[f]])),
      };
      if (r.room_id) {
        const room = data.rooms.find(room => room.id === r.room_id);
        result.roomExists = !!room;
        result.roomOwner = actor(room?.owner_id);
        result.actorCurrentlyMember = data.room_memberships.some(m => m.room_id === r.room_id && m.user_id === (r.actor_id ?? r.author_id ?? r.inviter_id ?? r.user_id));
      }
      if (table === 'notifications') result.recipient = actor(r.user_id);
      if (table === 'trip_places') {
        const plan = data.trip_plans.find(p => p.id === r.plan_id);
        const route = data.trip_routes.find(route => route.id === r.route_id);
        result.routeInSamePlan = !!route && route.plan_id === r.plan_id;
        result.planExists = !!plan;
        result.receipts = data.trip_mutation_receipts.filter(receipt => receipt.plan_id === r.plan_id && receipt.result_id === r.id).map(receipt => ({ actor: actor(receipt.actor_id), createdAt: receipt.created_at, revision: receipt.revision }));
      }
      return result;
    }) });
  }
  const report = { at: new Date().toISOString(), readOnly: true, historicalBaselineAt: historical.at, historicalBaselineRewritten: false, founderResolvedExactly: true, locationPayloads: 0, differences,
    limitation: 'Current membership and mutation receipts corroborate provenance, not the identity of the human behind an authenticated session. Read/mute metadata has no independent actor audit.' };
  mkdirSync('.git/ms74-fp4', { recursive: true, mode: 0o700 });
  const stamp = Date.now();
  writeFileSync(`.git/ms74-fp4/provenance-${stamp}.json`, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  // Separate current fingerprint, not a replacement/qualification of FP3.
  // No raw content, row identifiers, coordinates or credential values persisted.
  writeFileSync(`.git/ms74-fp4/preservation-fingerprints-${stamp}.json`, JSON.stringify({ at: report.at, originalExclusionsPreserved: true, historicalBaselineRewritten: false, fingerprints }), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report));
}
main().catch(error => { console.error(JSON.stringify({ pass: false, kind: error.name, detail: error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Details suppressed' })); process.exitCode = 1; });

/** Exact QA contexts, real sessions, rollback-only access probes. No provider. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { connections, conversations, locationLatest, locationShares, roomMemberships, subroomAccess } from "../src/server/db/schema";
import { durableLocationService } from "../src/server/location-sharing/durable-service";
import { parseCleanupMessage } from "../src/server/location-sharing/cleanup-policy";
import { AuthenticationRequiredError, type AuthenticatedActor } from "../src/server/auth/actor";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const sessions: string[] = [], leases: string[] = [], cases: string[] = [];
const obligations: string[] = [];
let step = "ownership";
async function session(actor: AuthenticatedActor, id: string) {
  const s = await clerk.sessions.getSession(id);
  if (s.userId !== actor.authSubject || s.status !== "active" || s.expireAt <= Date.now()) throw new AuthenticationRequiredError();
}
function serviceFor(database: ToskerDatabase) {
  return durableLocationService(database, { session, notify: async () => {}, capacity: () => true, readBudget: async () => {},
    publisher: async(input, options) => {
      const message = parseCleanupMessage(input);
      if(message.kind === "readiness") await database.execute(sql`update location_cleanup_health set ready_ack_at=clock_timestamp()
        where slot=1 and ready_nonce=${message.nonce}::uuid`);
      else obligations.push(options.idempotencyKey);
    },
  });
}
const point = { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, signal = new AbortController().signal;
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  assert.equal((await db.execute(sql`select 1 from rooms r join room_memberships m on m.room_id=r.id
    where r.id=${fixture.roomId}::uuid and r.owner_id=${actors.a.userId}::uuid and r.slug=${fixture.slug}
    and m.user_id=${actors.founder.userId}::uuid`)).rows.length, 1);
  assert.equal(Number((await db.execute(sql`select count(*) n from invite_rate_limits where user_id in (${actors.a.userId}::uuid,${actors.b.userId}::uuid)
    and operation in ('location-consent','location-snapshot')`)).rows[0].n), 0);
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0);
  for (const actor of [actors.a, actors.b]) {
    sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
    writeFileSync(".git/ms74-fp3/durable-contexts-intent.json",JSON.stringify({sessions,at:new Date().toISOString()}),{mode:0o600});
  }
  const service = serviceFor(db);
  const begin = async (role: 0 | 1, context: string, precision: "area" | "precise") => {
    const value = await service.begin(role ? actors.b : actors.a, sessions[role], context, precision, signal); leases.push(value.id); return value;
  };
  const mark = () => { cases.push(step); console.log(JSON.stringify({ passed: step })); };
  step = "selected Subroom does not disclose to unselected B";
  const selected = await begin(0, fixture.selectedChatId, "precise");
  await service.send(actors.a, sessions[0], selected.id, point, 0, randomUUID(), signal);
  await assert.rejects(() => service.read(actors.b, sessions[1], fixture.selectedChatId));
  assert.equal((await service.read(actors.b, sessions[1], fixture.conversationId)).peers.length, 0);
  await service.stop(actors.a, sessions[0], selected.id); mark();
  step = "everyone Subroom delivery remains isolated from parent";
  const open = await begin(1, fixture.everyoneChatId, "area");
  await service.send(actors.b, sessions[1], open.id, point, 0, randomUUID(), signal);
  assert.equal((await service.read(actors.a, sessions[0], fixture.everyoneChatId)).peers.length, 1);
  assert.equal((await service.read(actors.a, sessions[0], fixture.conversationId)).peers.length, 0);
  await service.stop(actors.b, sessions[1], open.id); mark();
  step = "Personal delivery and relationship revocation";
  const pair = [actors.a.userId, actors.b.userId].sort().join(":");
  const [chat] = await db.select().from(conversations).where(and(eq(conversations.kind, "personal"), eq(conversations.directKey, pair)));
  const [connection] = await db.select().from(connections).where(and(eq(connections.pairKey, pair), eq(connections.status, "accepted")));
  assert(chat && connection);
  const precise = await begin(0, chat.id, "precise");
  await service.send(actors.a, sessions[0], precise.id, point, 0, randomUUID(), signal);
  assert.deepEqual((await service.read(actors.b, sessions[1], chat.id)).peers[0].snapshot.point, point);
  const rollback = new Error("rollback exact QA access probe");
  await assert.rejects(() => db.transaction(async tx => {
    await tx.delete(connections).where(eq(connections.id, connection.id));
    const isolated = serviceFor(tx as unknown as ToskerDatabase);
    await assert.rejects(() => isolated.read(actors.b, sessions[1], chat.id));
    await assert.rejects(() => isolated.send(actors.a, sessions[0], precise.id, point, 1, randomUUID(), signal));
    throw rollback;
  }), error => error === rollback);
  assert.equal((await service.read(actors.b, sessions[1], chat.id)).peers.length, 1); mark();
  step = "precision downgrade replaces row; old Stop cannot delete new consent";
  const broad = await begin(0, chat.id, "area");
  await assert.rejects(() => service.send(actors.a, sessions[0], precise.id, point, 1, randomUUID(), signal));
  await service.send(actors.a, sessions[0], broad.id, point, 0, randomUUID(), signal);
  await service.stop(actors.a, sessions[0], precise.id);
  const view = await service.read(actors.b, sessions[1], chat.id);
  assert.equal(view.peers.length, 1); assert.equal(view.peers[0].snapshot.precision, "area"); assert.equal(view.peers[0].snapshot.point, undefined);
  assert.equal((await db.select().from(locationLatest).where(eq(locationLatest.leaseId, precise.id))).length, 0);
  await service.stop(actors.a, sessions[0], broad.id); mark();
  step = "rollback-only selected grant withdrawal denies both reader and source";
  await assert.rejects(() => db.transaction(async tx => {
    await tx.insert(subroomAccess).values({ subroomId: fixture.selectedId, userId: actors.b.userId }).onConflictDoNothing();
    const isolated = serviceFor(tx as unknown as ToskerDatabase);
    const value = await isolated.begin(actors.b, sessions[1], fixture.selectedChatId, "area", signal);
    await isolated.send(actors.b, sessions[1], value.id, point, 0, randomUUID(), signal);
    assert.equal((await isolated.read(actors.a, sessions[0], fixture.selectedChatId)).peers.length, 1);
    await tx.delete(subroomAccess).where(and(eq(subroomAccess.subroomId, fixture.selectedId), eq(subroomAccess.userId, actors.b.userId)));
    await assert.rejects(() => isolated.read(actors.b, sessions[1], fixture.selectedChatId));
    assert.equal((await isolated.read(actors.a, sessions[0], fixture.selectedChatId)).peers.length, 0);
    assert.equal((await tx.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, fixture.roomId), eq(roomMemberships.userId, actors.founder.userId)))).length, 1);
    throw rollback;
  }), error => error === rollback); mark();
  step = "Sandbox never admits or returns peer locations";
  const [sandbox] = await db.select().from(conversations).where(and(eq(conversations.kind,"sandbox"),eq(conversations.ownerId,actors.a.userId)));
  assert(sandbox); await assert.rejects(service.begin(actors.a,sessions[0],sandbox.id,"area",signal));
  await assert.rejects(service.read(actors.a,sessions[0],sandbox.id)); mark();
  step = "Room source and viewer membership revocation";
  const roomLease = await begin(1,fixture.conversationId,"precise");
  await service.send(actors.b,sessions[1],roomLease.id,point,0,randomUUID(),signal);
  await assert.rejects(db.transaction(async tx=>{
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId,fixture.roomId),eq(roomMemberships.userId,actors.b.userId)));
    const isolated=serviceFor(tx as unknown as ToskerDatabase);
    await assert.rejects(isolated.read(actors.b,sessions[1],fixture.conversationId));
    assert.equal((await isolated.read(actors.a,sessions[0],fixture.conversationId)).peers.length,0);
    assert.equal((await tx.select().from(roomMemberships).where(and(eq(roomMemberships.roomId,fixture.roomId),eq(roomMemberships.userId,actors.founder.userId)))).length,1);
    throw rollback;
  }),error=>error===rollback); mark();
  step = "Real source session revocation removes next view and denies old JWT session";
  await clerk.sessions.revokeSession(sessions[1]);
  assert.equal((await service.read(actors.a,sessions[0],fixture.conversationId)).peers.length,0);
  await assert.rejects(service.read(actors.b,sessions[1],fixture.conversationId));
  await assert.rejects(service.send(actors.b,sessions[1],roomLease.id,point,1,randomUUID(),signal)); mark();
  writeFileSync(".git/ms74-fp3/durable-contexts.json", JSON.stringify({ passed: true, at: new Date().toISOString(), cases, accessChangesRolledBack: true,
    cleanupPublisherInjected:true,hostedApplicationAcceptance:false,providerCalls: 0 }), { mode: 0o600 });
}
main().catch(error => { console.error(JSON.stringify({ passed: false, step, kind: error?.name })); process.exitCode = 1; }).finally(async () => {
  try {
    if (leases.length) await db.delete(locationShares).where(inArray(locationShares.id, leases));
    for(const id of obligations) await db.execute(sql`delete from location_cleanup_reservations where id=${id}::uuid`);
    const actors=await resolveQaActors(db);
    await db.execute(sql`delete from invite_rate_limits where user_id in (${actors.a.userId}::uuid,${actors.b.userId}::uuid) and operation in ('location-consent','location-snapshot')`);
  } finally {
    for(const id of sessions){const existing=await clerk.sessions.getSession(id);if(existing.status==="active")await clerk.sessions.revokeSession(id);}
    await db.$client.end(); console.log("Exact test cleanup complete.");
  }
});

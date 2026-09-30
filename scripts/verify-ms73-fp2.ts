import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, profiles, connections, conversations, conversationParticipants, roomMemberships, tripPlans, tripComments, tripPlaces } from "../src/server/db/schema";
import { mutateTrip, readTrip, readTripComments, TripError } from "../src/server/trips/service";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import { createQaFixture, cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";
import type { TripCommand } from "../src/lib/trip-contract";
const db = getDatabase();
let fixture: QaFixture | undefined;
const ownedUsers: { id: string; authSubject: string }[] = [];
const pin = { title: "FP2 canonical safe point", latitude: 1.2837, longitude: 103.8607, source: "pin" as const, provider: null, providerId: null, address: "Synthetic QA — not a verified venue", attribution: "", license: "" };
async function main() {
  const { a, b, founder } = await resolveQaActors(db);
  const founderBefore = await db.select().from(profiles).where(eq(profiles.userId, founder.userId));
  fixture = await createQaFixture(db, "FP2 comments/retry/revocation/Nuke + browser acceptance");
  console.log("RECEIPT", JSON.stringify(fixture));
  const f = fixture;
  const change = async (command: TripCommand, actor = a, scope = f.slug) => mutateTrip(db, actor, { roomSlug: scope, requestId: randomUUID(), expectedRevision: (await readTrip(db, actor, scope)).revision, command });
  const placeId = (await change({ type: "add", candidate: pin, routeId: null })).resultId!;
  const input = { roomSlug: f.slug, requestId: randomUUID(), expectedRevision: (await readTrip(db, a, f.slug)).revision, command: { type: "comment" as const, placeId, body: "FP2 retry-safe A comment" } };
  await mutateTrip(db, a, input); assert((await mutateTrip(db, a, input)).replayed);
  assert.equal((await readTripComments(db, b, f.slug, placeId)).comments.length, 1);
  await assert.rejects(() => mutateTrip(db, a, { ...input, command: { ...input.command, body: "Different payload" } }));
  await change({ type: "comment", placeId, body: "B comment\nSecond line" }, b);
  assert.equal((await readTrip(db, founder, f.slug)).places[0].commentCount, 2);
  assert.equal((await readTripComments(db, founder, f.slug, placeId)).comments[1].authorId, b.userId);
  await assert.rejects(() => change({ type: "comment", placeId, body: "x".repeat(1001) }));
  await assert.rejects(() => change({ type: "edit-place", placeId, title: "Renamed", note: "" }));
  await change({ type: "edit-place", placeId, title: pin.title, note: "Context belongs here" });
  // B loses only this run's owned Room membership; founder remains unchanged.
  await db.delete(roomMemberships).where(and(eq(roomMemberships.roomId, f.id), eq(roomMemberships.userId, b.userId)));
  await assert.rejects(() => readTripComments(db, b, f.slug, placeId), AuthorizationDeniedError);
  await assert.rejects(() => change({ type: "comment", placeId, body: "Denied" }, b), AuthorizationDeniedError);
  await db.insert(roomMemberships).values({ roomId: f.id, userId: b.userId, role: "member" });
  await change({ type: "nuke-place", placeId }, b);
  assert.equal((await db.select().from(tripComments).where(eq(tripComments.placeId, placeId))).length, 0);
  await assert.rejects(() => readTripComments(db, a, f.slug, placeId));
  console.log("PASS comments A/B/founder read, exact retry, payload mismatch, bounds, canonical names, revocation and Nuke cascade");

  // Isolated server QA actors: no Clerk account, no founder or retained Personal Chat mutation.
  for (let i = 0; i < 2; i++) {
    const authSubject = `ms73-fp2-${randomUUID()}`;
    const [u] = await db.insert(users).values({ authProvider: "qa-fp2", authSubject, tid: randomUUID().slice(0, 7).toUpperCase() }).returning();
    ownedUsers.push({ id: u.id, authSubject });
    await db.insert(profiles).values({ userId: u.id, displayName: `FP2 isolated ${i}`, username: authSubject });
  }
  const actors = ownedUsers.map(u => ({ userId: u.id, authSubject: u.authSubject, authProvider: "qa-fp2" }));
  const pairKey = ownedUsers.map(u => u.id).sort().join(":");
  const [connection] = await db.insert(connections).values({ requesterId: actors[0].userId, addresseeId: actors[1].userId, pairKey, status: "accepted" }).returning();
  const [personal] = await db.insert(conversations).values({ kind: "personal", directKey: pairKey, isPrimary: true }).returning();
  await db.insert(conversationParticipants).values(actors.map(actor => ({ conversationId: personal.id, userId: actor.userId })));
  const scope = `personal--${personal.id}`;
  const p = (await change({ type: "add", candidate: pin, routeId: null }, actors[0], scope)).resultId!;
  await change({ type: "comment", placeId: p, body: "Private pair only" }, actors[1], scope);
  assert.equal((await readTripComments(db, actors[0], scope, p)).comments.length, 1);
  await assert.rejects(() => readTrip(db, founder, scope), AuthorizationDeniedError);
  await assert.rejects(() => readTripComments(db, a, scope, p), AuthorizationDeniedError);
  await assert.rejects(() => readTrip(db, actors[0], `personal--${f.conversationId}`), AuthorizationDeniedError);
  await assert.rejects(() => readTripComments(db, a, f.slug, p));
  await db.update(connections).set({ status: "pending" }).where(eq(connections.id, connection.id));
  await assert.rejects(() => readTrip(db, actors[0], scope), AuthorizationDeniedError);
  await db.update(connections).set({ status: "accepted" }).where(eq(connections.id, connection.id));
  await db.delete(conversationParticipants).where(and(eq(conversationParticipants.conversationId, personal.id), eq(conversationParticipants.userId, actors[1].userId)));
  await assert.rejects(() => readTrip(db, actors[0], scope), AuthorizationDeniedError);
  await db.delete(conversations).where(and(eq(conversations.id, personal.id), eq(conversations.directKey, pairKey)));
  assert.equal((await db.select().from(tripPlaces).where(eq(tripPlaces.id, p))).length, 0);
  assert.equal((await db.select().from(tripComments).where(eq(tripComments.placeId, p))).length, 0);
  for (const u of ownedUsers) await db.delete(users).where(and(eq(users.id, u.id), eq(users.authSubject, u.authSubject), eq(users.authProvider, "qa-fp2")));
  ownedUsers.length = 0;
  console.log("PASS Personal pair-only ownership, relationship loss, participant loss, cross-context denial and lifecycle cascade");
  assert.deepEqual(await db.select().from(profiles).where(eq(profiles.userId, founder.userId)), founderBefore);
  if (process.argv.includes("--retain-browser")) {
    for (let i = 0; i < 5; i++) await change({ type: "add", candidate: { ...pin, title: i === 2 ? "FP2 deliberately long Singapore planning place name for reveal" : `FP2 safe point ${i+1}`, latitude: pin.latitude + i * .002, longitude: pin.longitude - i * .001 }, routeId: null });
    console.log("BROWSER_READY", JSON.stringify(f));
  } else { console.log(await cleanupQaFixture(db, f, true)); fixture = undefined; assert.equal((await db.select().from(tripPlans).where(eq(tripPlans.roomId, f.id))).length, 0); }
}
main().catch(e => { console.error(e instanceof assert.AssertionError || e instanceof TripError ? e.message : "Sanitized FP2 verification failure"); console.log("Retained owned fixtures", fixture, ownedUsers); process.exitCode = 1; }).finally(() => db.$client.end());

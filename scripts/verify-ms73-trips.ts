import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, profiles, rooms, roomMemberships, conversations, tripPlans, tripPlaces, tripRoutes, tripRoutePlaces, tripMutationReceipts } from "../src/server/db/schema";
import { readTrip, mutateTrip, TripError } from "../src/server/trips/service";
import { AuthorizationDeniedError } from "../src/server/auth/authorize";
import { withdrawRoomMember, grantRoomMembership } from "../src/server/rooms/lifecycle";
import { sendDirectInvitations } from "../src/server/rooms/invitation-service";
import { quickOrder, type PlaceCandidate, type TripCommand } from "../src/lib/trip-contract";
import { createQaFixture, cleanupQaFixture, resolveQaActors, type QaFixture } from "./lib/ms73-fixtures";

const db = getDatabase();
const owned: QaFixture[] = [];
const pin = (title: string, latitude = 1.2837, longitude = 103.8607): PlaceCandidate => ({ title, latitude, longitude, source: "pin", provider: null, providerId: null, address: "Safe synthetic QA pin", attribution: "", license: "" });
async function main() {
  const { a, b, founder } = await resolveQaActors(db);
  const beforeFounder = await db.select().from(profiles).where(eq(profiles.userId, founder.userId));
  const beforeIdentity = await db.select().from(users).where(eq(users.id, founder.userId));
  const beforeRooms = await db.select().from(rooms);
  const beforePlans = await db.select().from(tripPlans);
  const fixture = await createQaFixture(db, "Revision, receipt, auth and lifecycle service proof"); owned.push(fixture);
  const other = await createQaFixture(db, "Cross-Room place/route injection proof"); owned.push(other);
  console.log("Created two exact-owned disposable Rooms; both include exact-resolved founder 8V3X7P1.");
  const slug = fixture.slug;
  const outsider = (await db.select().from(users)).find(user => ![a.userId,b.userId,founder.userId].includes(user.id));
  assert(outsider);
  const outsiderActor = { userId: outsider.id, authProvider: outsider.authProvider, authSubject: outsider.authSubject };
  await assert.rejects(() => readTrip(db, outsiderActor, slug), AuthorizationDeniedError);
  await assert.rejects(() => mutateTrip(db, outsiderActor, { roomSlug: slug, requestId: randomUUID(), expectedRevision: 0, command: { type: "create-route", name: "Unauthorized", color: "gold" } }), AuthorizationDeniedError);
  const call = async (command: TripCommand, actor = a, revision?: number) => mutateTrip(db, actor, { roomSlug: slug, requestId: randomUUID(), expectedRevision: revision ?? (await readTrip(db, actor, slug)).revision, command });
  const snapshot = () => readTrip(db, a, slug);
  const empty = await snapshot(); assert.equal(empty.revision, 0);
  assert.equal((await db.select().from(tripPlans).where(eq(tripPlans.roomId, fixture.id))).length, 0, "Reading must not create a plan");
  const command: TripCommand = { type: "add", candidate: pin("QA Marina preview confirmation"), routeId: null };
  const input = { roomSlug: slug, requestId: randomUUID(), expectedRevision: 0, command };
  const saved = await mutateTrip(db, a, input);
  const retry = await mutateTrip(db, a, input); assert(retry.replayed); assert.equal(saved.resultId, retry.resultId);
  await assert.rejects(() => mutateTrip(db, a, { ...input, command: { ...command, candidate: pin("Changed payload") } }), (e: unknown) => e instanceof TripError && e.code === "retry-mismatch");
  let current = await readTrip(db, b, slug); assert.equal(current.places.length, 1); assert.equal(current.memberships.length, 1); assert.equal(current.routes.length, 1);
  assert.deepEqual(await readTrip(db, founder, slug), current, "Founder sees exact shared state");
  const first = current.places[0].id, route = current.routes[0].id;
  const same = await call(command); assert.equal(same.resultId, first); assert.equal((await snapshot()).places.length, 1);
  const rev = (await snapshot()).revision;
  const race = await Promise.allSettled([
    call({ type: "add", candidate: pin("QA A concurrent", 1.30, 103.80), routeId: route }, a, rev),
    call({ type: "add", candidate: pin("QA B concurrent", 1.31, 103.81), routeId: route }, b, rev),
  ]);
  assert.equal(race.filter(r => r.status === "fulfilled").length, 1);
  assert(race.some(r => r.status === "rejected" && r.reason instanceof TripError && r.reason.code === "conflict"));
  assert.equal((await snapshot()).places.length, 2);
  await call({ type: "add", candidate: pin("QA Third", 1.32, 103.82), routeId: route }, b);
  current = await snapshot();
  const ids = current.memberships.filter(m => m.routeId === route).sort((a,b) => a.position-b.position).map(m => m.placeId);
  const day2 = await call({ type: "create-route", name: "Day 2", color: "sky" }); assert(day2.resultId);
  await call({ type: "membership", routeId: day2.resultId, placeId: first, included: true });
  await call({ type: "order", routeId: route, placeIds: [...ids].reverse() }, b);
  current = await snapshot(); assert.deepEqual(current.memberships.filter(m => m.routeId === route).sort((a,b) => a.position-b.position).map(m => m.placeId), [...ids].reverse());
  assert.equal(current.memberships.filter(m => m.routeId === day2.resultId)[0].position, 0);
  const orderRev = current.revision;
  console.log("PASS initial snapshot, retry, duplicate, A/B save race and route isolation.");
  const orderRace = await Promise.allSettled([call({ type: "order", routeId: route, placeIds: ids }, a, orderRev), call({ type: "order", routeId: route, placeIds: [...ids].reverse() }, b, orderRev)]);
  assert.equal(orderRace.filter(r => r.status === "fulfilled").length, 1);
  await call({ type: "archive-place", placeId: first, archived: true });
  assert((await readTrip(db, b, slug)).places.find(p => p.id === first)?.archived);
  await call({ type: "archive-place", placeId: first, archived: false }, b);
  assert(!(await snapshot()).places.find(p => p.id === first)?.archived);
  assert.equal((await snapshot()).memberships.filter(m => m.placeId === first).length, 2, "Archive preserves both route memberships");
  await call({ type: "edit-place", placeId: first, title: "QA edited by B", note: "Safe shared note" }, b);
  assert.equal((await snapshot()).places.find(p => p.id === first)?.note, "Safe shared note");
  await call({ type: "stop", routeId: route, placeId: first, isStop: false });
  assert.equal((await snapshot()).memberships.find(m => m.placeId === first && m.routeId === route)?.isStop, false);
  await call({ type: "archive-route", routeId: day2.resultId, archived: true });
  await call({ type: "archive-route", routeId: day2.resultId, archived: false });
  const foreign = await mutateTrip(db, a, { roomSlug: other.slug, requestId: randomUUID(), expectedRevision: 0, command: { type: "add", candidate: pin("Other Room QA"), routeId: null } }); assert(foreign.resultId);
  const beforeReject = await snapshot();
  await assert.rejects(() => call({ type: "edit-place", placeId: foreign.resultId!, title: "Cross-room attack", note: "" }));
  await assert.rejects(() => call({ type: "membership", routeId: route, placeId: foreign.resultId!, included: true }));
  await assert.rejects(() => call({ type: "order", routeId: route, placeIds: [first, first] }));
  await assert.rejects(() => call({ type: "add", candidate: pin("Invalid", Number.NaN), routeId: null }));
  await assert.rejects(() => call({ type: "add", candidate: pin("Rollback", 1.4, 103.9), routeId: randomUUID() }));
  assert.deepEqual(await snapshot(), beforeReject, "Failed changes roll back data and revision");
  // Composite SQL FK, independent of service validation.
  const [p] = await db.select().from(tripPlans).where(eq(tripPlans.roomId, fixture.id));
  await assert.rejects(() => db.insert(tripRoutePlaces).values({ planId: p.id, routeId: route, placeId: foreign.resultId!, position: 10 }));
  const proposal = quickOrder((await snapshot()).places, first); assert.equal(proposal[0], first); assert.equal(new Set(proposal).size, ids.length); assert.deepEqual(proposal, quickOrder((await snapshot()).places, first));
  console.log("PASS archive/restore, edits, Stop state, cross-Room injection, rollback and deterministic suggestion.");
  // Actual current-member withdrawal service; production revocation boundary retained.
  const bReceiptInput = { roomSlug: slug, requestId: randomUUID(), expectedRevision: (await snapshot()).revision, command: { type: "edit-place" as const, placeId: first, title: "QA before withdrawal", note: "" } };
  await mutateTrip(db, b, bReceiptInput);
  await withdrawRoomMember(db, a, fixture.id, b.userId);
  await assert.rejects(() => readTrip(db, b, slug), AuthorizationDeniedError);
  await assert.rejects(() => mutateTrip(db, b, bReceiptInput), AuthorizationDeniedError, "Receipt replay cannot bypass removed-member denial");
  assert.equal((await readTrip(db, founder, slug)).places.length, 3);
  await db.transaction(async tx => {
    const [room] = await tx.select().from(rooms).where(eq(rooms.id, fixture.id)).for("update");
    assert(room.slug === fixture.slug && room.ownerId === a.userId); await grantRoomMembership(tx, b, room);
  });
  assert.equal((await readTrip(db, b, slug)).places.length, 3);
  // Withdrawal racing a write: write either precedes revocation or is denied.
  const raceInput = { ...bReceiptInput, requestId: randomUUID(), expectedRevision: (await snapshot()).revision };
  const withdrawalRace = await Promise.allSettled([mutateTrip(db, b, raceInput), withdrawRoomMember(db, a, fixture.id, b.userId)]);
  assert.equal(withdrawalRace[1].status, "fulfilled");
  if (withdrawalRace[0].status === "rejected") assert(withdrawalRace[0].reason instanceof AuthorizationDeniedError);
  await assert.rejects(() => readTrip(db, b, slug), AuthorizationDeniedError);
  assert.equal((await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, fixture.id), eq(roomMemberships.userId, founder.userId)))).length, 1);
  const invitations = await sendDirectInvitations(db, a, { roomId: fixture.id, mode: "username", username: "tosker-user-b-clerk-test" });
  assert.equal(invitations[0].state, "invited");
  await assert.rejects(() => readTrip(db, b, slug), AuthorizationDeniedError, "A pending invitation does not grant Map access");
  await assert.rejects(() => mutateTrip(db, b, bReceiptInput), AuthorizationDeniedError);
  const ownedPlans = await db.select({ id: tripPlans.id }).from(tripPlans).where(inArray(tripPlans.roomId, owned.map(f => f.id)));
  for (const fixture of owned) { console.log(await cleanupQaFixture(db, fixture)); console.log(await cleanupQaFixture(db, fixture, true)); }
  owned.length = 0;
  assert.deepEqual((await db.select().from(tripPlans)).sort((a,b) => a.id.localeCompare(b.id)), beforePlans.sort((a,b) => a.id.localeCompare(b.id)), "Retained review plans are preserved");
  for (const table of [tripPlaces, tripRoutes, tripRoutePlaces, tripMutationReceipts]) assert.equal((await db.select().from(table).where(inArray(table.planId, ownedPlans.map(p => p.id)))).length, 0, "Owned Room cascade leaves no Map orphans");
  assert.deepEqual(await db.select().from(profiles).where(eq(profiles.userId, founder.userId)), beforeFounder);
  assert.deepEqual(await db.select().from(users).where(eq(users.id, founder.userId)), beforeIdentity);
  assert.deepEqual((await db.select().from(rooms)).sort((a,b) => a.id.localeCompare(b.id)), beforeRooms.sort((a,b) => a.id.localeCompare(b.id)));
  assert.equal((await db.select().from(conversations).where(inArray(conversations.roomId, [fixture.id, other.id]))).length, 0);
  console.log("PASS shared snapshot, A/B writes, founder visibility/preservation, retries, duplicate save, revision conflict, order isolation, archive/restore, Stop, cross-plan FK, rollback, withdrawal/replay/race, exact-owned cleanup and cascades.");
}
main().catch(error => {
  console.error("MS7.3 service proof failed:", error instanceof assert.AssertionError ? error.message : error instanceof TripError ? error.message : "Sanitized service/database failure; inspect the failing boundary without printing credentials.");
  console.log("Owned fixtures retained for inspection (no automatic failure cleanup):", owned);
  process.exitCode = 1;
}).finally(() => db.$client.end());

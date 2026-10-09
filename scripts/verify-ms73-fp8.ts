/** Rollback-only FP8 naming/lifecycle plus pure validated-road trace checks. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { createQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { mutateTrip, readTrip } from "../src/server/trips/service";
import { prepareRouteTrace, traceAt } from "../src/lib/maps/route-trace";
import { roadKey, type RoadGeometry } from "../src/lib/maps/road-contract";
import type { TripCommand } from "../src/lib/trip-contract";
const db = getDatabase(), rollback = new Error("FP8 rollback");
async function main() {
  const points = [{ id: "1", latitude: 1.3, longitude: 103.8 }, { id: "2", latitude: 1.31, longitude: 103.81 }, { id: "3", latitude: 1.32, longitude: 103.82 }];
  const road: RoadGeometry = { key: roadKey(points, "drive"), mode: "drive", attribution: "QA", segments: [[[103.8, 1.3], [103.81, 1.3], [103.81, 1.31]], [[103.81, 1.31], [103.82, 1.31], [103.82, 1.32]]], estimate: { metres: 4000, seconds: 800, guidance: [], legs: points.slice(1).map((p, i) => ({ fromId: points[i].id, toId: p.id, metres: 2000, seconds: 400 })) } };
  const trace = prepareRouteTrace(road, points, "drive")!; assert(trace);
  assert.deepEqual(traceAt(trace, 0), []); assert.deepEqual(traceAt(trace, 1), road.segments);
  assert.deepEqual(traceAt(trace, .25)[0][0], road.segments[0][0]);
  assert.equal(prepareRouteTrace(road, points, "walk"), null);
  assert.equal(prepareRouteTrace(road, [...points].reverse(), "drive"), null);
  assert.equal(prepareRouteTrace(road, points, "drive", ["2"]), null);
  assert.equal(prepareRouteTrace({ ...road, segments: [road.segments[1], road.segments[0]], key: "stale" }, points, "drive"), null);
  try { await db.transaction(async tx => {
    const d = tx as unknown as ToskerDatabase, { a, b, founder } = await resolveQaActors(tx);
    const f = await createQaFixture(d, "FP8 rollback checkpoint defaults and fresh Route lifecycle");
    const read = () => readTrip(d, a, f.slug);
    const change = async (command: TripCommand) => mutateTrip(d, a, { roomSlug: f.slug, expectedRevision: (await read()).revision, requestId: randomUUID(), command });
    const candidate = { title: "Checkpoint", latitude: 1.3, longitude: 103.8, source: "pin" as const, provider: null, providerId: null, address: "QA exact point", attribution: "QA", license: "QA" };
    const id = (await change({ type: "add", routeId: null, candidate })).resultId!;
    const first = await read(), routeId = first.routes[0].id, original = first.places[0];
    assert.equal(original.defaultTitle, "Checkpoint 1");
    await change({ type: "rename-checkpoint", placeId: id, title: "Manual meeting place" });
    const second = (await change({ type: "add", routeId, candidate: { ...candidate, latitude: 1.31 } })).resultId!;
    assert.equal((await read()).places.find(p => p.id === second)?.defaultTitle, "Checkpoint 2");
    await change({ type: "lock-position", routeId, position: 0, locked: false });
    await change({ type: "order", routeId, placeIds: [second, id] });
    const reset = { roomSlug: f.slug, expectedRevision: (await read()).revision, requestId: randomUUID(), command: { type: "reset-checkpoint-name" as const, placeId: id } };
    await mutateTrip(d, a, reset); assert.equal((await mutateTrip(d, a, reset)).replayed, true);
    assert.deepEqual((await read()).places.find(p => p.id === id), original, "Revert preserves identity/address/coordinates/tags and restores only title");
    await assert.rejects(() => mutateTrip(d, b, { ...reset, requestId: randomUUID() }), /changed/);
    const poi = (await change({ type: "add", routeId, candidate: { ...candidate, latitude: 1.32, source: "search", title: "QA POI", provider: "qa", providerId: "fp8-poi" } })).resultId!;
    await assert.rejects(() => change({ type: "reset-checkpoint-name", placeId: poi }), /Only manual/);
    await change({ type: "comment", placeId: id, body: "QA disposable comment" });
    assert.deepEqual(await readTrip(d, b, f.slug), await readTrip(d, founder, f.slug));
    await change({ type: "nuke-route", routeId });
    assert.equal((await read()).places.length, 0); assert.equal((await read()).routes.length, 0);
    await change({ type: "add", routeId: null, candidate });
    assert.equal((await read()).places[0].defaultTitle, "Checkpoint 1"); assert.notEqual((await read()).routes[0].id, routeId);
    throw rollback;
  }); } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS FP8 stable default, rename/reorder/revert, idempotency/stale denial, POI immutability, founder A/B, Nuke/fresh first add; ordered finite validated road trace. All database test writes rolled back; zero provider calls.");
}
main().catch(error => { console.error({ failure: "FP8 verification", kind: error?.name, assertion: error instanceof assert.AssertionError ? error.message.split("\n")[0] : undefined }); process.exitCode = 1; }).finally(() => db.$client.end());

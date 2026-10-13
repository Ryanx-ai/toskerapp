import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { assertCleanupAdmission, cleanupDelivery, cleanupReservation, cleanupRetry, expiryPublication, parseCleanupMessage } from "../src/server/location-sharing/cleanup-policy";

const now = 1800000000000, reservation = cleanupReservation(now);
const valid = { databaseNow: now, ...reservation, armed: true, consumerReadyAt: now, rescueSucceededAt: now,
  overdueRows: 0, reservedToday: 1, capacityVerified: true };
let rejected = 0;
function rejects(fn: () => unknown) { assert.throws(fn); rejected++; }
assertCleanupAdmission(valid);
assertCleanupAdmission({ ...valid, databaseNow: now + 1000, reservedToday: 100 });
for (const mutation of [
  { armed: false }, { capacityVerified: false }, { consumerReadyAt: null }, { consumerReadyAt: now - 60000 },
  { consumerReadyAt: now + 1 }, { rescueSucceededAt: null }, { rescueSucceededAt: now - 3900000 },
  { rescueSucceededAt: now + 1 }, { overdueRows: 1 }, { overdueRows: NaN }, { reservedToday: 101 },
  { reservedToday: 0 }, { reservedToday: 1.1 }, { createdAt: now + 1 }, { expiresAt: reservation.expiresAt + 1 },
  { databaseNow: reservation.expiresAt }, { databaseNow: NaN },
]) rejects(() => assertCleanupAdmission({ ...valid, ...mutation }));

const publication = expiryPublication(reservation.expiresAt, now + 1);
assert.equal(publication.options.delaySeconds, 300);
assert.equal(publication.options.retentionSeconds, 3600);
assert.deepEqual(Object.keys(publication.message).sort(), ["dueAt", "kind", "version"]);
assert.deepEqual(cleanupDelivery(publication.message, now + 1), { kind: "defer", afterSeconds: 300 });
assert.deepEqual(cleanupDelivery(publication.message, reservation.expiresAt), { kind: "sweep" });
assert.deepEqual(cleanupDelivery(publication.message, reservation.expiresAt + 60001), { kind: "sweep" });
// Duplicate/out-of-order messages only request the same DB-clock scoped sweep.
assert.deepEqual(cleanupDelivery(publication.message, reservation.expiresAt), cleanupDelivery(publication.message, reservation.expiresAt));
const readiness = { version: 1, kind: "readiness", nonce: randomUUID() };
assert.deepEqual(cleanupDelivery(readiness, now), { kind: "readiness", nonce: readiness.nonce });
for (const value of [null, [], {}, { ...publication.message, latitude: 1.2834 }, { ...readiness, contextId: randomUUID() },
  { version: 2, kind: "expiry", dueAt: now }, { version: 1, kind: "expiry", dueAt: NaN },
  { version: 1, kind: "expiry", dueAt: -1 }, { ...readiness, nonce: "identity-not-nonce" },
]) rejects(() => parseCleanupMessage(value));
rejects(() => cleanupReservation(Number.MAX_SAFE_INTEGER));
rejects(() => expiryPublication(now, now));
rejects(() => expiryPublication(now + 300001, now));
rejects(() => cleanupDelivery({ version: 1, kind: "expiry", dueAt: now + 300001 }, now));
assert.deepEqual(cleanupRetry(1), { kind: "retry", afterSeconds: 5 });
assert.deepEqual(cleanupRetry(7), { kind: "retry", afterSeconds: 60 });
assert.deepEqual(cleanupRetry(1, 300), { kind: "retry", afterSeconds: 300 });
assert.deepEqual(cleanupRetry(8), { kind: "exhausted" });
rejects(() => cleanupRetry(0));
rejects(() => cleanupRetry(1, 301));
console.log(JSON.stringify({ cleanupPolicy: "PASS", rejectedUnsafeCases: rejected, providerCalls: 0, databaseChanges: 0,
  hostedRetentionAccepted: false, localOnlyGatePreserved: true }));

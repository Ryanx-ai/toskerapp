import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CleanupDeferred, CleanupUnavailable, consumeCleanup, LOCATION_CLEANUP_TOPIC, retryCleanup, type CleanupStore } from "../src/server/location-sharing/cleanup-consumer";
const now = 1800000000000;
let sweeps=0, failures=0, acknowledgments=0;
const nonce=randomUUID();
const store: CleanupStore = {
  async now() { return now; }, async failure() { failures++; },
  async acknowledge(value) { assert.equal(value,nonce); acknowledgments++; },
  async sweep() { sweeps++; return { expiredConsents: 0, expiredObligations: 0 }; },
};
async function main() {
  await consumeCleanup(store,{version:1,kind:"readiness",nonce},LOCATION_CLEANUP_TOPIC);
  assert.equal(acknowledgments,1); assert.equal(sweeps,0);
  await assert.rejects(consumeCleanup(store,{version:1,kind:"expiry",dueAt:now+10000},LOCATION_CLEANUP_TOPIC),CleanupDeferred);
  assert.equal(failures,0); assert.equal(sweeps,0);
  for(let i=0;i<2;i++) await consumeCleanup(store,{version:1,kind:"expiry",dueAt:now},LOCATION_CLEANUP_TOPIC);
  assert.equal(sweeps,2);
  await assert.rejects(consumeCleanup(store,{version:1,kind:"expiry",dueAt:now,latitude:1},LOCATION_CLEANUP_TOPIC),CleanupUnavailable);
  await assert.rejects(consumeCleanup(store,{version:1,kind:"expiry",dueAt:now},"wrong-topic"),CleanupUnavailable);
  await assert.rejects(consumeCleanup({...store,async sweep(){throw new Error("PRIVATE DATABASE DETAILS");}},
    {version:1,kind:"expiry",dueAt:now},LOCATION_CLEANUP_TOPIC),error => error instanceof CleanupUnavailable && !error.message.includes("PRIVATE"));
  assert.equal(failures,3);
  assert.deepEqual(retryCleanup(new CleanupDeferred(10),1),{afterSeconds:10});
  assert.deepEqual(retryCleanup(new CleanupUnavailable(),1),{afterSeconds:5});
  assert.deepEqual(retryCleanup(new CleanupUnavailable(),8),{acknowledge:true});
  console.log(JSON.stringify({cleanupConsumer:"PASS",earlyDeliveryDeferred:true,unsafeInputsRejected:true,rawErrorsSuppressed:true,
    boundedRetries:true,providerCalls:0,hostedAcceptance:false}));
}
void main();

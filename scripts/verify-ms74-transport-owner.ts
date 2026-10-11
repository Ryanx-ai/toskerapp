import assert from "node:assert/strict";
import type { BaseRealtime } from "ably/modular";
import { WorkspaceRealtimeOwner, type RealtimeScope } from "../src/lib/workspace-realtime-owner";

const pause = () => new Promise(resolve => setTimeout(resolve, 20));
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }
const originalFetch = globalThis.fetch;
const requested: string[] = [];
let delay: Promise<void> | undefined;
globalThis.fetch = async (_url, init) => {
  requested.push(JSON.parse(String(init?.body)).conversationId);
  await delay;
  return Response.json({ clientId: "actor-a", token: "test-only-not-a-provider-token" });
};
function harness() {
  const counts = { created: 0, authorizations: 0, connected: 0, closed: 0, setup: [] as string[], cleanup: [] as string[] };
  let authorize!: () => Promise<unknown>;
  const owner = new WorkspaceRealtimeOwner(async (_scope, token) => {
    counts.created++;
    authorize = async () => { counts.authorizations++; return token(); };
    return { auth: { authorize }, connect: () => { counts.connected++; }, close: () => { counts.closed++; } } as unknown as BaseRealtime;
  });
  const scope = (conversationId: string): RealtimeScope => ({ userId: "actor-a", sessionId: "session-a", conversationId, token: async () => "test-session", denied: () => {} });
  const setup = (name: string, cleanup?: Promise<void>) => () => {
    counts.setup.push(name);
    return async () => { counts.cleanup.push(name); await cleanup; };
  };
  return { owner, counts, scope, setup, renew: () => authorize() };
}
async function main() { try {
  const h = harness();
  let release = h.owner.acquire(h.scope("room-a"), h.setup("first")); await pause();
  release(); release = h.owner.acquire(h.scope("room-a"), h.setup("same")); await pause();
  assert.equal(h.counts.created, 1); assert.equal(h.counts.authorizations, 1);
  assert.deepEqual(h.counts.cleanup, ["first"]);
  const cleanup = deferred(); release();
  release = h.owner.acquire(h.scope("room-a"), h.setup("slow", cleanup.promise)); await pause(); release();
  h.owner.acquire(h.scope("room-b"), h.setup("next")); await pause();
  assert(!h.counts.setup.includes("next"), "New scope waits for old presence/channel drain");
  assert.equal(h.counts.authorizations, 1, "No new token until old channels drain");
  cleanup.resolve(); await pause(); assert(h.counts.setup.includes("next"));
  assert.equal(h.counts.created, 1); assert.equal(h.counts.authorizations, 2);
  await h.renew(); assert.equal(requested.at(-1), "room-b", "Renewal uses current exact context");
  h.owner.retire(); await pause(); await assert.rejects(h.renew());
  h.owner.acquire(h.scope("room-c"), h.setup("retired")); await pause(); assert(!h.counts.setup.includes("retired"));

  const late = harness(), pending = deferred(); delay = pending.promise;
  const cancel = late.owner.acquire(late.scope("old"), late.setup("old")); await pause(); cancel();
  late.owner.acquire(late.scope("new"), late.setup("new"));
  delay = undefined; pending.resolve(); await pause();
  assert.deepEqual(late.counts.setup, ["new"], "Late old authorization never attaches");
  assert.equal(late.counts.created, 1); late.owner.retire();

  for (const field of ["userId", "sessionId"] as const) {
    const change = harness(); change.owner.acquire(change.scope("one"), change.setup("one")); await pause();
    change.owner.acquire({ ...change.scope("two"), [field]: "changed" }, change.setup("two")); await pause();
    assert.deepEqual(change.counts.setup, ["one"]); assert.equal(change.counts.created, 1); assert(change.counts.closed > 0);
  }
  const burst = harness();
  for (let i = 0; i < 20; i++) burst.owner.acquire(burst.scope(String(i)), burst.setup(String(i)));
  await pause(); assert.deepEqual(burst.counts.setup, ["19"]); assert.equal(burst.counts.created, 1); burst.owner.retire();
  const failed = harness();
  failed.owner.acquire(failed.scope("one"), () => async () => { throw new Error("detach failed"); }); await pause();
  failed.owner.acquire(failed.scope("two"), failed.setup("two")); await pause();
  assert(failed.owner.getSnapshot()); assert.deepEqual(failed.counts.setup, [], "Failed cleanup cannot attach a new scope");
  let denied = false;
  const outage = harness();
  outage.owner.acquire({ ...outage.scope("one"), token: async () => { throw new Error("network"); }, denied: () => { denied = true; } }, outage.setup("one")); await pause();
  assert(outage.owner.getSnapshot()); assert(!denied, "A network failure is not membership revocation");
  console.log(JSON.stringify({ pass: true, cases: ["same-context SDK reuse", "serialized cleanup", "scope reauthorization", "exact-context renewal", "retirement", "late auth cancellation", "actor fence", "session fence", "rapid navigation coalescing", "failed cleanup fence", "network failure recovery"], providerCalls: 0 }));
} finally { globalThis.fetch = originalFetch; } }
main().catch(error => { console.error(error); process.exitCode = 1; });

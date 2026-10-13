import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { LocationView } from "../src/lib/location-view";
import { validLocationView, type LocationCurrentView } from "../src/lib/shared-location-contract";
const context = randomUUID(), user = randomUUID();
const value = (): LocationCurrentView => ({ serverNow: 1000000, validForMs: 5000, peers: [{ snapshot: { id: randomUUID(), userId: user, conversationId: context, precision: "precise", expiresAt: 1300000, sentAt: 1000000, revision: 1, label: "Synthetic public landmark", source: "ura", point: { latitude: 1.2834, longitude: 103.8607, accuracy: 50 } }, identity: { userId: user, displayName: "QA", avatarUrl: null } }] });
class Clock {
  time = 0; next = 0; timers = new Map<number, { fn: () => void; at: number }>();
  now = () => this.time;
  set = (fn: () => void, ms: number) => { const id = ++this.next; this.timers.set(id, { fn, at: this.time + ms }); return id; };
  clear = (id: unknown) => { this.timers.delete(id as number); };
  advance(ms: number) {
    const end = this.time + ms;
    for (;;) {
      const next = [...this.timers].sort((a, b) => a[1].at - b[1].at).find(([, timer]) => timer.at <= end);
      if (!next) break;
      this.time = next[1].at; this.timers.delete(next[0]); next[1].fn();
    }
    this.time = end;
  }
}
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
async function main() {
  assert(validLocationView(value(), context));
  for (const modify of [
    (v: LocationCurrentView) => { v.peers[0].snapshot.precision = "area"; },
    (v: LocationCurrentView) => { v.peers[0].snapshot.conversationId = randomUUID(); },
    (v: LocationCurrentView) => { v.peers[0].identity.userId = randomUUID(); },
    (v: LocationCurrentView) => { v.peers[0].snapshot.revision = 0; },
    (v: LocationCurrentView) => { v.validForMs = 5001; },
    (v: LocationCurrentView) => { v.peers.push(v.peers[0]); },
    (v: LocationCurrentView) => { v.peers[0].snapshot.expiresAt = v.serverNow; },
  ]) { const v = value(); modify(v); assert(!validLocationView(v, context)); }
  const clock = new Clock(); let peers: LocationCurrentView["peers"] = [], reads = 0;
  const requests: { resolve: (v: unknown) => void; reject: () => void; signal: AbortSignal }[] = [];
  const view = new LocationView(context, signal => { reads++; return new Promise((resolve, reject) => requests.push({ resolve, reject: () => reject(new Error("offline")), signal })); }, next => { peers = next; }, clock);
  view.refresh(); assert.equal(reads, 0);
  view.setReady(true); assert.equal(reads, 1);
  clock.advance(1000); requests[0].resolve(value()); await tick(); assert.equal(peers.length, 1);
  clock.advance(2000); assert.equal(reads, 2);
  clock.advance(1999); assert.equal(peers.length, 1);
  clock.advance(1); assert.equal(peers.length, 0); // first request start + 5s, not receipt + 5s
  clock.advance(3000); requests[1].resolve(value()); await tick(); assert.equal(peers.length, 0); // deadline-aborted response
  view.clear(); assert.equal(peers.length, 0); const count = reads; clock.advance(20000); assert.equal(reads, count);
  view.setReady(true); const stale = requests.at(-1)!; view.clear(); view.setReady(true); const fresh = requests.at(-1)!;
  fresh.resolve(value()); await tick(); assert.equal(peers.length, 1);
  stale.resolve({ ...value(), peers: [] }); await tick(); assert.equal(peers.length, 1); // prior generation cannot replace
  view.refresh(); view.refresh(); view.refresh(); assert.equal(reads, count + 3); // coalesced
  requests.at(-1)!.reject(); await tick(); assert.equal(peers.length, 0);
  view.clear(); assert.equal(clock.timers.size, 0);
  const latencyClock = new Clock(); let shown = 0, started = 0, finish: (v: unknown) => void = () => {};
  const slower = new LocationView(context, () => { started++; return new Promise(resolve => { finish = resolve; }); }, next => { shown = next.length; }, latencyClock);
  slower.setReady(true); latencyClock.advance(2200); finish(value()); await tick(); assert.equal(shown, 1);
  latencyClock.advance(349); assert.equal(started, 1);
  latencyClock.advance(1); assert.equal(started, 2); // request starts at2550, not3000
  latencyClock.advance(2200); finish(value()); await tick(); assert.equal(shown, 1);
  latencyClock.advance(250); assert.equal(shown, 1); // replacement authorized before old5s fence
  slower.clear(); assert.equal(shown, 0); assert.equal(latencyClock.timers.size, 0);
  console.log(JSON.stringify({ passed: true, cases: ["strict context/precision/revision/identity validation", "readiness required", "request-start deadline", "no late resurrection", "hidden/disconnected clears", "generation isolation", "coalesced invalidations", "error clears", "latency-aware renewal without stale display", "all timers disposed"], providerCalls: 0 }));
}
void main();

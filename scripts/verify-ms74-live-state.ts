import assert from "node:assert/strict";
import { LiveSession, type LivePort } from "../src/lib/live-session";
import { validLiveRosterRequest } from "../src/lib/live-contract";

const id = "00000000-0000-4000-8000-000000000001";
const pause = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));
function fake() {
  let connected = true, entered = false, changed = () => {}, connection = () => {};
  let delay: Promise<void> | undefined;
  const counts = { enters: 0, leaves: 0, detaches: 0, authorizations: 0, observes: 0, profiles: 0, closes: 0 };
  const port: LivePort = {
    connected: () => connected,
    authorize: async () => { counts.authorizations++; },
    observe: async listener => { changed = listener; counts.observes++; },
    unobserve: () => { changed = () => {}; },
    enter: async () => { counts.enters++; await delay; entered = true; changed(); },
    leave: async () => { counts.leaves++; entered = false; changed(); },
    detach: async () => { counts.detaches++; entered = false; },
    members: async () => entered ? [{ clientId: id }, { clientId: id }, { clientId: "forged" }] : [],
    profiles: async ids => { counts.profiles++; return ids.map(userId => ({ userId, displayName: "QA", avatarUrl: null })); },
    onConnection: listener => { connection = listener; return () => { connection = () => {}; }; },
    closeUnsafeConnection: () => { counts.closes++; connected = false; },
  };
  return { port, counts, entered: () => entered, delay: (promise: Promise<void>) => { delay = promise; }, network: (value: boolean) => { connected = value; connection(); } };
}

async function main() {
  assert(validLiveRosterRequest({ conversationId: id, userIds: [id] }));
  for (const bad of [null, { conversationId: id, userIds: ["bad"] }, { conversationId: id, userIds: Array(101).fill(id) }, { conversationId: id, userIds: [], userId: id }]) assert(!validLiveRosterRequest(bad));
  const f = fake(), live = new LiveSession(80), unbind = live.bind(f.port), deactivate = live.activate();
  await pause(); assert.equal(f.counts.enters, 0, "Open is observation only"); assert(live.getSnapshot().ready);
  live.join(); live.join(); await pause(); assert.equal(f.counts.enters, 1); assert.equal(live.getSnapshot().phase, "connected");
  assert.equal(live.getSnapshot().participants.length, 1, "Tabs deduplicate and forged IDs are omitted");
  const idle = { ...f.counts }; await pause(); assert.deepEqual(f.counts, idle, "No idle polling");
  live.leave(); await pause(); assert(!f.entered()); assert.equal(live.getSnapshot().phase, "not-joined");
  await pause(1000); live.join(); await pause(); live.setVisible(false); await pause(); assert(!f.entered());
  live.setVisible(true); await pause(); assert(!f.entered(), "Foreground never autojoins");
  await pause(1000); live.join(); await pause(); f.network(false); assert.equal(live.getSnapshot().phase, "reconnecting");
  await pause(15); f.network(true); await pause(); assert.equal(live.getSnapshot().phase, "connected");
  f.network(false); await pause(); f.network(true); await pause(); assert(!f.entered(), "Expired intent cannot autojoin");
  deactivate(); unbind();

  const race = fake(), late = new LiveSession(); let finish!: () => void;
  race.delay(new Promise<void>(resolve => { finish = resolve; }));
  const endBind = late.bind(race.port), endActive = late.activate(); await pause();
  late.join(); await pause(10); late.leave(); finish(); await pause(); assert(!race.entered(), "Late enter after leave is removed");
  assert.equal(late.getSnapshot().phase, "not-joined");
  await pause(1000); late.join(); await pause(); late.revoke(); await pause(); late.join(); await pause(); assert(!race.entered(), "Revocation disables rejoin");
  endActive(); endBind();
  console.log(JSON.stringify({ pass: true, cases: ["strict request", "observe without join", "duplicate join", "deduplicated identity", "idle no polling", "leave", "background/foreground", "reconnect", "recovery expiry", "late join cancellation", "revocation"] }));
}
main().catch(() => { console.error("MS7.4 state acceptance failed"); process.exitCode = 1; });

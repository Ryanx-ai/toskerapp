/** B-side SDK observer for CUA-driven A-side UI acceptance. No browser APIs. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Realtime } from "ably";
import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { issueConversationToken } from "../src/server/realtime/auth";
import { liveChannel } from "../src/lib/live-contract";

const db = getDatabase();
let client: Realtime | undefined;
let cleanupSession: (() => Promise<unknown>) | undefined;
async function main() {
  const actors = await resolveQaActors(db);
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010");
  assert.equal(fixture.status, "committed");
  const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId));
  assert(room && room.slug === fixture.slug && room.ownerId === actors.a.userId);
  const members = await db.select().from(roomMemberships).where(eq(roomMemberships.roomId, room.id));
  assert(members.some(member => member.userId === actors.founder.userId));
  const canonical = process.argv.includes("--canonical");
  const actor = process.argv.includes("--actor-a") ? actors.a : actors.b;
  let freshToken = () => issueConversationToken(db, actor, fixture.conversationId);
  let consent = async () => {};
  if (canonical) {
    assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"), "Existing isolated Development QA identity only");
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const session = await clerk.sessions.createSession({ userId: actor.authSubject });
    cleanupSession = () => clerk.sessions.revokeSession(session.id);
    const request = async (path: string, body: object, expected = 200) => {
      const credential = await clerk.sessions.getToken(session.id);
      const response = await fetch(`https://toskerapp.vercel.app${path}`, { method: "POST", headers: { Authorization: `Bearer ${credential.jwt}`, Origin: "https://toskerapp.vercel.app", "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, expected, `Canonical ${path} status`);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      return response.json();
    };
    if (actor === actors.b) for (const path of ["/api/live/join", "/api/realtime/token"]) await request(path, { conversationId: fixture.selectedChatId }, 403);
    freshToken = () => request("/api/realtime/token", { conversationId: fixture.conversationId });
    consent = async () => { const result = await request("/api/live/join", { conversationId: fixture.conversationId }); assert.equal(result.authorized, true); };
    console.log(JSON.stringify({ canonicalApi: true, scopedSubroomJoinAndToken: actor === actors.b ? 403 : "not-tested", noStore: true }));
  }
  const token = await freshToken();
  const capability = JSON.parse(token.capability);
  assert.deepEqual([...capability[liveChannel(fixture.conversationId)]].sort(), ["presence", "subscribe"]);
  assert(!Object.keys(capability).some(key => key.includes("*")));
  client = new Realtime({ token: token.token, authCallback: (_params, callback) => { void freshToken().then(value => callback(null, value.token), () => callback("QA token refresh failed", null)); }, clientId: actor.userId, logLevel: 0, autoConnect: true });
  const channel = client.channels.get(liveChannel(fixture.conversationId));
  let events = 0, aEntries = 0, aLeaves = 0;
  await channel.presence.subscribe(message => {
    events++;
    if (message.clientId === actors.a.userId) { if (message.action === "enter") aEntries++; if (message.action === "leave") aLeaves++; }
  });
  const snapshot = async () => {
    const roster = await channel.presence.get();
    console.log(JSON.stringify({ peer: actor === actors.a ? "A" : "B", aPresent: roster.some(member => member.clientId === actors.a.userId), bPresent: roster.some(member => member.clientId === actors.b.userId), aConnections: roster.filter(member => member.clientId === actors.a.userId).length, members: roster.length, events, aEntries, aLeaves }));
  };
  console.log("QA peer ready: snapshot / enter / leave / exit. Automatic close after 15 minutes.");
  await snapshot();
  const input = createInterface({ input: process.stdin });
  const expiry = setTimeout(() => input.close(), 15 * 60 * 1000);
  try {
    for await (const command of input) {
      if (command === "exit") break;
      if (command === "enter") { await consent(); await client.auth.authorize(); await channel.presence.enter(); }
      else if (command === "leave") await channel.presence.leave();
      else assert.equal(command, "snapshot", "Unknown QA command");
      await snapshot();
    }
  } finally { clearTimeout(expiry); input.close(); await channel.presence.leave(); await channel.detach(); }
}
main().catch(error => { console.error(JSON.stringify({ pass: false, kind: error?.name ?? "Error", code: error?.code, statusCode: error?.statusCode, reason: String(error?.message ?? "").replace(/https?:\/\/\S+/g, "[url]").replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]") })); process.exitCode = 1; }).finally(async () => { client?.close(); try { await cleanupSession?.(); } finally { await db.$client.end(); } });

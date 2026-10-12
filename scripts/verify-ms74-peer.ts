/** B-side SDK observer for CUA-driven A-side UI acceptance. No browser APIs. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Realtime } from "ably";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { issueConversationToken } from "../src/server/realtime/auth";
import { liveChannel } from "../src/lib/live-contract";

const db = getDatabase();
let client: Realtime | undefined;
async function main() {
  const actors = await resolveQaActors(db);
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010");
  assert.equal(fixture.status, "committed");
  const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId));
  assert(room && room.slug === fixture.slug && room.ownerId === actors.a.userId);
  const members = await db.select().from(roomMemberships).where(eq(roomMemberships.roomId, room.id));
  assert(members.some(member => member.userId === actors.founder.userId));
  const token = await issueConversationToken(db, actors.b, fixture.conversationId);
  client = new Realtime({ token: token.token, clientId: actors.b.userId, logLevel: 0, autoConnect: true });
  const channel = client.channels.get(liveChannel(fixture.conversationId));
  let events = 0, aEntries = 0, aLeaves = 0;
  await channel.presence.subscribe(message => {
    events++;
    if (message.clientId === actors.a.userId) { if (message.action === "enter") aEntries++; if (message.action === "leave") aLeaves++; }
  });
  const snapshot = async () => {
    const roster = await channel.presence.get();
    console.log(JSON.stringify({ peer: "B", aPresent: roster.some(member => member.clientId === actors.a.userId), bPresent: roster.some(member => member.clientId === actors.b.userId), aConnections: roster.filter(member => member.clientId === actors.a.userId).length, members: roster.length, events, aEntries, aLeaves }));
  };
  console.log("QA peer ready: snapshot / enter / leave / exit. Automatic close after 15 minutes.");
  await snapshot();
  const input = createInterface({ input: process.stdin });
  const expiry = setTimeout(() => input.close(), 15 * 60 * 1000);
  try {
    for await (const command of input) {
      if (command === "exit") break;
      if (command === "enter") { const fresh = await issueConversationToken(db, actors.b, fixture.conversationId); await client.auth.authorize(undefined, { token: fresh.token }); await channel.presence.enter(); }
      else if (command === "leave") await channel.presence.leave();
      else assert.equal(command, "snapshot", "Unknown QA command");
      await snapshot();
    }
  } finally { clearTimeout(expiry); input.close(); await channel.presence.leave(); await channel.detach(); }
}
main().catch(error => { console.error(JSON.stringify({ pass: false, kind: error?.name ?? "Error" })); process.exitCode = 1; }).finally(async () => { client?.close(); await db.$client.end(); });

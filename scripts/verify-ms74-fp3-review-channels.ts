/** Review-only provider token admission. Never print tokens or identity values. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../src/server/db/client";
import { isIsolatedReview } from "../src/server/accounts/isolated-review";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { issueConversationToken } from "../src/server/realtime/auth";
import { userChannel, conversationChannel, typingChannel } from "../src/lib/realtime-contract";
import { liveChannel } from "../src/lib/live-contract";

const db = getDatabase();
async function main() {
  assert(isIsolatedReview());
  const fixture = JSON.parse(readFileSync(".git/ms74-fp3/review-fixture.json", "utf8"));
  assert.equal(fixture.status, "committed");
  assert.equal(fixture.project, "falling-mode-50310792");
  assert.equal(fixture.sourceUuidDisjoint, true);
  const actors = await resolveQaActors(db);
  let issued = 0;
  for (const [actor, context] of [
    [actors.a, fixture.conversationId], [actors.b, fixture.conversationId],
    [actors.founder, fixture.conversationId], [actors.a, fixture.selectedChatId],
    [actors.b, fixture.personalId], [actors.a, fixture.sandboxIds[0]],
  ] as const) {
    const token = await issueConversationToken(db, actor, context);
    assert.equal(token.clientId, actor.userId);
    assert.deepEqual(JSON.parse(token.capability), {
      [userChannel(actor.userId)]: ["subscribe"],
      [conversationChannel(context)]: ["subscribe"],
      [typingChannel(context)]: ["publish", "subscribe"],
      [liveChannel(context)]: ["presence", "subscribe"],
    });
    assert(!token.capability.includes("*"));
    issued++;
  }
  for (const context of [fixture.selectedChatId, fixture.sandboxIds[0], randomUUID()]) {
    await assert.rejects(() => issueConversationToken(db, actors.b, context));
  }
  const result = { reviewChannels: "PASS", issued, forbiddenContextsDenied: 3,
    canonicalIdsDisjoint: true, noWildcards: true, noPermissionChange: true,
    tokenValuesPersisted: false, at: new Date().toISOString() };
  writeFileSync(".git/ms74-fp3/review-channels.json", JSON.stringify(result), { mode: 0o600 });
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(JSON.stringify({ reviewChannels: "FAIL", type: error?.name })); process.exitCode = 1; })
  .finally(() => db.$client.end());

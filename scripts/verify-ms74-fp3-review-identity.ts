import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { users, profiles } from "../src/server/db/schema";
import { ensureToskerAccount } from "../src/server/accounts/bootstrap";
import { isIsolatedReview, isolatedReviewIdentity } from "../src/server/accounts/isolated-review";

const db = getDatabase();
async function main() {
  assert(isIsolatedReview());
  assert.equal(isIsolatedReview({ NODE_ENV: "production" }), false);
  const expected = { ...process.env };
  for (const changed of [{ VERCEL:"1" },{ VERCEL:"" },{ NEON_PROJECT_ID:"other" },
    { DATABASE_URL:"postgresql://example:example@example.com/not-review" },{ TOSKER_ISOLATED_REVIEW:"true" }]) {
    assert.throws(() => isIsolatedReview({ ...expected, ...changed }));
  }
  const before = (await db.execute(sql`select row_to_json(p) as profile from profiles p order by p.user_id`)).rows;
  const actors = await db.select().from(users);
  assert.equal(actors.length, 3);
  for (const actor of actors) {
    const identity = await isolatedReviewIdentity(actor.authSubject);
    assert(identity);
    assert.equal(Object.hasOwn(identity, "avatarUrl"), false);
    const first = await ensureToskerAccount(identity);
    const again = await ensureToskerAccount(identity);
    assert.equal(first.userId, actor.id);
    assert.equal(first.userId, again.userId);
    assert.equal(first.tid, actor.tid);
    assert.equal(first.avatarUrl, null);
    if (actor.tid === "8V3X7P1") assert.equal(first.displayName, "Founder Review");
  }
  await assert.rejects(() => isolatedReviewIdentity(`user_unseeded_${randomUUID()}`));
  const after = (await db.execute(sql`select row_to_json(p) as profile from profiles p order by p.user_id`)).rows;
  assert.deepEqual(after, before);
  const founder = await db.select().from(users).where(eq(users.tid, "8V3X7P1"));
  assert.equal(founder.length, 1);
  assert.equal((await db.select().from(profiles)).length, 3);
  console.log(JSON.stringify({ reviewIdentity:"PASS", preseededActors:3, negativeEnvironmentCases:5,
    unknownIdentityDenied:true, profileStateUnchanged:true, noProviderProfileLookup:true,
    founderSynthetic:true, normalDeploymentPathUnchanged:true }));
}
main().catch(error => { console.error(JSON.stringify({ reviewIdentity:"FAIL", type:error?.name })); process.exitCode=1; })
  .finally(() => db.$client.end());

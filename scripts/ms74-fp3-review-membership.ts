/** Exact-owned isolated QA B membership toggle for real browser revocation checks. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { isIsolatedReview } from "../src/server/accounts/isolated-review";
import { withdrawRoomMember } from "../src/server/rooms/lifecycle";
import { resolveQaActors } from "./lib/ms73-fixtures";

const db = getDatabase(), path = ".git/ms74-fp3/review-membership-test.json";
async function main() {
  assert(isIsolatedReview());
  const mode = process.argv[2]; assert(mode === "--remove-b" || mode === "--restore-b");
  const fixture = JSON.parse(readFileSync(".git/ms74-fp3/review-fixture.json", "utf8"));
  assert.equal(fixture.project, "falling-mode-50310792"); assert.equal(fixture.status, "committed");
  const { a, b, founder } = await resolveQaActors(db);
  assert.equal(fixture.ownerId, a.userId); assert(fixture.qaUserIds.includes(b.userId));
  assert.notEqual(b.userId, founder.userId);
  async function guard() {
    const rows = (await db.execute(sql`select r.id from rooms r join room_memberships m on m.room_id=r.id
      where r.id=${fixture.roomId}::uuid and r.slug=${fixture.slug} and r.owner_id=${a.userId}::uuid
      and r.created_at=${fixture.createdAt}::timestamptz and m.user_id=${founder.userId}::uuid`)).rows;
    assert.equal(rows.length, 1, "Exact owned fixture/founder membership required.");
  }
  await guard();
  if (mode === "--remove-b") {
    assert(!existsSync(path), "Recovery receipt exists; inspect/restore instead of overwriting.");
    const membership = (await db.execute(sql`select row_to_json(m) as row from room_memberships m where room_id=${fixture.roomId}::uuid and user_id=${b.userId}::uuid`)).rows.map(r => r.row);
    const participants = (await db.execute(sql`select row_to_json(p) as row from conversation_participants p join conversations c on c.id=p.conversation_id where c.room_id=${fixture.roomId}::uuid and p.user_id=${b.userId}::uuid`)).rows.map(r => r.row);
    const access = (await db.execute(sql`select row_to_json(a) as row from subroom_access a join subrooms s on s.id=a.subroom_id where s.room_id=${fixture.roomId}::uuid and a.user_id=${b.userId}::uuid`)).rows.map(r => r.row);
    assert.equal(membership.length, 1); assert.equal(participants.length, 2); assert.equal(access.length, 1);
    assert.equal((await db.execute(sql`select id from invites where room_id=${fixture.roomId}::uuid`)).rows.length, 0);
    const receipt = { project:fixture.project, roomId:fixture.roomId, userId:b.userId, status:"prepared", membership, participants, access };
    writeFileSync(path, JSON.stringify(receipt), { mode:0o600, flag:"wx" });
    // Actual authorization, location retirement, token revocation and notification path.
    await withdrawRoomMember(db, a, fixture.roomId, b.userId);
    receipt.status = "removed"; writeFileSync(path, JSON.stringify(receipt), { mode:0o600 });
    await guard();
    console.log(JSON.stringify({ reviewMembership:"removed", actor:"isolated QA B", actualLifecycle:true, founderMembershipStable:true, restoreRequired:true }));
  } else {
    const receipt = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(receipt.project, fixture.project); assert.equal(receipt.roomId, fixture.roomId); assert.equal(receipt.userId,b.userId);
    assert.equal(receipt.status,"removed");
    for (const rows of [receipt.membership,receipt.participants,receipt.access]) assert(rows.every((r: { user_id:string }) => r.user_id===b.userId));
    assert.equal(receipt.membership.length,1); assert.equal(receipt.membership[0].room_id,fixture.roomId); assert.equal(receipt.membership[0].role,"member");
    assert.deepEqual(receipt.participants.map((r: { conversation_id:string })=>r.conversation_id).sort(),[fixture.conversationId,fixture.everyoneChatId].sort());
    assert.equal(receipt.access.length,1); assert.equal(receipt.access[0].subroom_id,fixture.everyoneId);
    await db.transaction(async tx => {
      assert.equal((await tx.execute(sql`select user_id from room_memberships where room_id=${fixture.roomId}::uuid and user_id=${b.userId}::uuid`)).rows.length,0);
      await tx.execute(sql`insert into room_memberships select * from json_populate_recordset(null::room_memberships,${JSON.stringify(receipt.membership)}::json)`);
      await tx.execute(sql`insert into conversation_participants select * from json_populate_recordset(null::conversation_participants,${JSON.stringify(receipt.participants)}::json)`);
      await tx.execute(sql`insert into subroom_access select * from json_populate_recordset(null::subroom_access,${JSON.stringify(receipt.access)}::json)`);
    });
    receipt.status="restored"; writeFileSync(path, JSON.stringify(receipt), { mode:0o600 });
    await guard();
    console.log(JSON.stringify({ reviewMembership:"restored", originalRowsRestored:true, founderMembershipStable:true, noLocationRestored:true }));
  }
}
main().catch(error=>{console.error(JSON.stringify({ reviewMembership:"FAIL", type:error?.name, recoveryReceipt:path }));process.exitCode=1;}).finally(()=>db.$client.end());

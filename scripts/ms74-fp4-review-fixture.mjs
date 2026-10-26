/** Exact-owned FP4 fixtures in the pre-existing isolated review project only.
 * Resolve existing synthetic actors and founder TID; never copy retained data. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { reviewEnvironment, REVIEW_PROJECT } from "./ms74-fp3-review-runtime.mjs";

assert.equal(process.argv[2], "--create-owned");
const directory = ".git/ms74-fp4", receiptPath = `${directory}/review-fixture.json`;
assert(!existsSync(receiptPath), "Receipt exists: recover exact fixture, never recreate automatically.");
const env = reviewEnvironment(), sql = neon(env.DATABASE_URL);
const [founders, qa] = await sql.transaction([
  sql`select id from users where tid='8V3X7P1' limit 2`,
  sql`select u.id,p.username from users u join profiles p on p.user_id=u.id
      where p.username in ('tosker-user-a-clerk-test','tosker-user-b-clerk-test')`,
], { readOnly: true, isolationLevel: "RepeatableRead" });
assert.equal(founders.length, 1, "STOP: founder exact TID is not unique.");
assert.equal(qa.length, 2);
const a = qa.find(r => r.username === "tosker-user-a-clerk-test");
const b = qa.find(r => r.username === "tosker-user-b-clerk-test");
assert(a && b); assert.equal(new Set([a.id,b.id,founders[0].id]).size, 3);
const receipt = {
  run: "ms74-fp4-20261026", project: REVIEW_PROJECT, status: "prepared",
  roomId: randomUUID(), conversationId: randomUUID(), selectedId: randomUUID(), selectedChatId: randomUUID(),
  everyoneId: randomUUID(), everyoneChatId: randomUUID(),
  slug: `ms74-fp4-review-${randomUUID().slice(0,8)}`, name: "MS7.4 FP4 — Map-first Founder Review",
  ownerId: a.id, founderId: founders[0].id, qaUserIds: [a.id,b.id],
  createdAt: new Date().toISOString(), retained: true,
  purpose: "FP4 isolated Map/Chat/Board acceptance and Founder Walk; synthetic content only",
};
mkdirSync(directory, { recursive: true, mode: 0o700 });
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { flag: "wx", mode: 0o600 });
const statements = [sql`insert into rooms(id,slug,name,owner_id,created_at)
  values(${receipt.roomId},${receipt.slug},${receipt.name},${a.id},${receipt.createdAt})`];
for (const id of [a.id,b.id,receipt.founderId]) {
  statements.push(sql`insert into room_memberships(room_id,user_id,role)
    values(${receipt.roomId},${id},${id===a.id ? "owner" : "member"})`);
}
for (const [id,title,visibility,position] of [[receipt.selectedId,"Selected QA","selected",0],[receipt.everyoneId,"Open QA","everyone",1]]) {
  statements.push(sql`insert into subrooms(id,room_id,name,created_by,visibility,position)
    values(${id},${receipt.roomId},${title},${a.id},${visibility},${position})`);
}
statements.push(sql`insert into conversations(id,kind,room_id,is_primary,title)
  values(${receipt.conversationId},'room',${receipt.roomId},true,${receipt.name})`);
for (const [sub,chat,title] of [[receipt.selectedId,receipt.selectedChatId,"Selected QA"],[receipt.everyoneId,receipt.everyoneChatId,"Open QA"]]) {
  statements.push(sql`insert into conversations(id,kind,room_id,subroom_id,title) values(${chat},'room',${receipt.roomId},${sub},${title})`);
}
for (const id of [a.id,b.id,receipt.founderId]) {
  for (const chat of [receipt.conversationId,receipt.everyoneChatId,...(id===b.id ? [] : [receipt.selectedChatId])]) {
    statements.push(sql`insert into conversation_participants(conversation_id,user_id) values(${chat},${id})`);
  }
  for (const sub of [receipt.everyoneId,...(id===b.id ? [] : [receipt.selectedId])]) {
    statements.push(sql`insert into subroom_access(subroom_id,user_id) values(${sub},${id})`);
  }
}
statements.push(sql`insert into room_capabilities(room_id,capability_key,installed_by_id) values(${receipt.roomId},'trip',${a.id})`);
await sql.transaction(statements);
const [check] = await sql`select count(*)::int as members,
  count(*) filter(where u.tid='8V3X7P1')::int as founders
  from room_memberships rm join users u on u.id=rm.user_id where rm.room_id=${receipt.roomId}`;
assert.deepEqual(check, { members:3, founders:1 });
receipt.status = "committed";
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ isolatedOnly:true, project:REVIEW_PROJECT, slug:receipt.slug,
  members:3, founderExactTid:true, founderSelectedSubroom:true, existingAccountsOnly:true,
  retainedRecordsModified:false, disposable:false }));

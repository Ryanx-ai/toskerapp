// Fresh synthetic review fixture. The retained DB is queried read-only for
// identity linkage/UUID disjointness only; no profile/content export exists.
import assert from "node:assert/strict";
import { randomUUID, randomInt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { reviewEnvironment } from "./ms74-fp3-review-runtime.mjs";

const receiptPath = ".git/ms74-fp3/review-fixture.json";
assert.equal(process.argv[2], "--create-synthetic", "Explicit fixture creation argument required.");
assert(!existsSync(receiptPath), "Fixture receipt exists; inspect, never recreate automatically.");
const env = reviewEnvironment(), sql = neon(env.DATABASE_URL);
const retainedEnv = dotenv.parse(readFileSync(".env.development.local"));
const retained = neon(retainedEnv.DATABASE_URL);
const [founders, qa, sourceIds] = await retained.transaction([
  retained`select id,auth_provider,auth_subject,tid from users where tid='8V3X7P1' limit 2`,
  retained`select u.id,u.auth_provider,u.auth_subject,p.username from users u join profiles p on p.user_id=u.id
    where p.username in ('tosker-user-a-clerk-test','tosker-user-b-clerk-test')`,
  retained`select id from users union select id from conversations union select id from rooms union select id from subrooms`,
], { readOnly: true, isolationLevel: "RepeatableRead" });
assert.equal(founders.length, 1, "Founder exact TID must resolve uniquely.");
assert.equal(qa.length, 2);
const original = [qa.find(r => r.username === "tosker-user-a-clerk-test"), qa.find(r => r.username === "tosker-user-b-clerk-test"), founders[0]];
assert(original.every(r => r?.auth_provider === "clerk" && /^user_/.test(r.auth_subject)));
assert.equal(new Set(original.map(r => r.auth_subject)).size, 3);
const occupied = new Set(sourceIds.map(r => r.id));
const fresh = () => { const id = randomUUID(); assert(!occupied.has(id)); occupied.add(id); return id; };
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const tid = () => Array.from({ length: 7 }, () => alphabet[randomInt(alphabet.length)]).join("");
const actors = original.map((r, i) => ({ id: fresh(), subject: r.auth_subject,
  tid: i === 2 ? "8V3X7P1" : tid(), sandbox: fresh(),
  username: i === 2 ? "fp3-isolated-founder-review" : `tosker-user-${i ? "b" : "a"}-clerk-test`,
  name: i === 2 ? "Founder Review" : `Review Participant ${i ? "B" : "A"}` }));
assert.equal(new Set(actors.map(a => a.tid)).size, 3);
const [a, b, founder] = actors;
const receipt = { run: "ms74-fp3-review-20261016", status: "prepared", project: "falling-mode-50310792",
  roomId: fresh(), conversationId: fresh(), selectedId: fresh(), selectedChatId: fresh(),
  everyoneId: fresh(), everyoneChatId: fresh(), personalId: fresh(),
  slug: `ms74-fp3-review-${randomUUID().slice(0,8)}`, name: "MS7.4 FP3 Isolated Founder Review",
  ownerId: a.id, founderId: founder.id, qaUserIds: [a.id,b.id],
  sandboxIds: actors.map(actor => actor.sandbox), retained: true,
  purpose: "Synthetic isolated FP3 browser/privacy acceptance and Founder Walk; no retained content",
  createdAt: new Date().toISOString(), sourceUuidDisjoint: true, minimalIdentityOnly: true };
const [{ n }] = await sql`select count(*)::int as n from users`;
assert.equal(n, 0, "Review identities must start empty.");
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600, flag: "wx" });
const pairKey = [a.id,b.id].sort().join(":");
const statements = [];
for (const actor of actors) {
  statements.push(sql`insert into users(id,auth_provider,auth_subject,tid) values(${actor.id},'clerk',${actor.subject},${actor.tid})`);
  statements.push(sql`insert into profiles(user_id,display_name,username,avatar_url,status) values(${actor.id},${actor.name},${actor.username},null,'Synthetic review only')`);
  statements.push(sql`insert into conversations(id,kind,owner_id,title) values(${actor.sandbox},'sandbox',${actor.id},${actor.name + "'s Sandbox"})`);
  statements.push(sql`insert into conversation_participants(conversation_id,user_id) values(${actor.sandbox},${actor.id})`);
}
statements.push(sql`insert into rooms(id,slug,name,owner_id,created_at) values(${receipt.roomId},${receipt.slug},${receipt.name},${a.id},${receipt.createdAt})`);
for (const actor of actors) statements.push(sql`insert into room_memberships(room_id,user_id,role) values(${receipt.roomId},${actor.id},${actor.id === a.id ? "owner" : "member"})`);
for (const [id,name,visibility,position] of [[receipt.selectedId,"Selected review","selected",0],[receipt.everyoneId,"Open review","everyone",1]]) {
  statements.push(sql`insert into subrooms(id,room_id,name,created_by,visibility,position) values(${id},${receipt.roomId},${name},${a.id},${visibility},${position})`);
}
statements.push(sql`insert into conversations(id,kind,room_id,is_primary,title) values(${receipt.conversationId},'room',${receipt.roomId},true,${receipt.name})`);
for (const [subId,chatId,title] of [[receipt.selectedId,receipt.selectedChatId,"Selected review"],[receipt.everyoneId,receipt.everyoneChatId,"Open review"]]) {
  statements.push(sql`insert into conversations(id,kind,room_id,subroom_id,title) values(${chatId},'room',${receipt.roomId},${subId},${title})`);
}
for (const actor of actors) {
  for (const chat of [receipt.conversationId,receipt.everyoneChatId,...(actor.id === b.id ? [] : [receipt.selectedChatId])]) {
    statements.push(sql`insert into conversation_participants(conversation_id,user_id) values(${chat},${actor.id})`);
  }
  for (const sub of [receipt.everyoneId,...(actor.id === b.id ? [] : [receipt.selectedId])]) {
    statements.push(sql`insert into subroom_access(subroom_id,user_id) values(${sub},${actor.id})`);
  }
}
statements.push(sql`insert into connections(requester_id,addressee_id,pair_key,status) values(${a.id},${b.id},${pairKey},'accepted')`);
statements.push(sql`insert into conversations(id,kind,direct_key,title) values(${receipt.personalId},'personal',${pairKey},'Synthetic A/B chat')`);
for (const actor of [a,b]) statements.push(sql`insert into conversation_participants(conversation_id,user_id) values(${receipt.personalId},${actor.id})`);
statements.push(sql`insert into room_capabilities(room_id,capability_key,installed_by_id) values(${receipt.roomId},'trip',${a.id})`);
await sql.transaction(statements);
const checks = await sql`select (select count(*) from users)::int as users,
  (select count(*) from profiles where avatar_url is not null)::int as avatars,
  (select count(*) from messages)::int as messages,
  (select count(*) from room_memberships rm join users u on u.id=rm.user_id where u.tid='8V3X7P1')::int as founder_memberships`;
assert.deepEqual(checks[0], { users:3, avatars:0, messages:0, founder_memberships:1 });
receipt.status = "committed";
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ fixture: receipt.slug, syntheticActors: 3, founderExactTid: true,
  noClerkAccountCreated: true, freshDisjointDatabaseIds: true, noRetainedProfileOrContentCopied: true,
  roomMemberCount: 3, founderPresentInSelectedSubroom: true, isolatedOnly: true }));

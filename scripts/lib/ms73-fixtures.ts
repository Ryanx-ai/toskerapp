/** MS7.3-only fixture ownership boundary. Never import into application code. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedActor } from "../../src/server/auth/actor";
import type { ToskerDatabase, ToskerTransaction } from "../../src/server/db/client";
import { users, profiles, rooms, roomMemberships, conversations, conversationParticipants, messages, hallItems, tripPlans, tripMutationReceipts } from "../../src/server/db/schema";

export const FOUNDER_TID = "8V3X7P1";
export const MS73_RUN = "ms73-20260929";
export type QaFixture = { run: typeof MS73_RUN; id: string; slug: string; name: string; ownerId: string; createdAt: string; conversationId: string; retained: boolean; purpose: string };

export async function resolveQaActors(db: Pick<ToskerDatabase, "select">) {
  const founderRows = await db.select().from(users).where(eq(users.tid, FOUNDER_TID)).limit(2);
  assert.equal(founderRows.length, 1, `STOP: founder TID ${FOUNDER_TID} must resolve uniquely. No fixture or account will be created.`);
  const resolve = async (username: string): Promise<AuthenticatedActor> => {
    const rows = await db.select({ user: users }).from(users).innerJoin(profiles, eq(profiles.userId, users.id)).where(eq(profiles.username, username)).limit(2);
    assert.equal(rows.length, 1, "STOP: retained isolated QA actor must resolve uniquely.");
    return { userId: rows[0].user.id, authProvider: rows[0].user.authProvider, authSubject: rows[0].user.authSubject };
  };
  const a = await resolve("tosker-user-a-clerk-test"), b = await resolve("tosker-user-b-clerk-test");
  const founder = founderRows[0];
  assert.equal(new Set([a.userId, b.userId, founder.id]).size, 3);
  return { a, b, founder: { userId: founder.id, authProvider: founder.authProvider, authSubject: founder.authSubject } };
}

export async function createQaFixture(db: ToskerDatabase, purpose: string, retained = false): Promise<QaFixture> {
  assert(purpose.length > 0 && purpose.length <= 120);
  return db.transaction(async tx => {
    // Resolve in the SAME transaction, before inserting anything. No fallback UUID/account creation.
    const actors = await resolveQaActors(tx);
    if (retained) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('ms73-founder-review-fixture', 0))`);
      const existing = await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.name, "MS7.3 Founder Review — Singapore Trip")).limit(1);
      assert.equal(existing.length, 0, "Founder Review Room already exists. Inspect its ownership receipt; do not create another.");
    }
    const suffix = randomUUID().slice(0, 8);
    const name = retained ? "MS7.3 Founder Review — Singapore Trip" : `MS7.3 QA — ${suffix}`;
    const slug = `${retained ? "ms73-founder-review" : "ms73-qa"}-${suffix}`;
    const [room] = await tx.insert(rooms).values({ name, slug, ownerId: actors.a.userId }).returning();
    const memberIds = [actors.a.userId, actors.b.userId, actors.founder.userId];
    await tx.insert(roomMemberships).values(memberIds.map(userId => ({ roomId: room.id, userId, role: userId === actors.a.userId ? "owner" as const : "member" as const })));
    const [chat] = await tx.insert(conversations).values({ kind: "room", roomId: room.id, isPrimary: true, title: name }).returning();
    await tx.insert(conversationParticipants).values(memberIds.map(userId => ({ conversationId: chat.id, userId })));
    return { run: MS73_RUN, id: room.id, slug, name, ownerId: room.ownerId, createdAt: room.createdAt.toISOString(), conversationId: chat.id, retained, purpose };
  });
}

async function inspectOwned(tx: ToskerTransaction, fixture: QaFixture) {
  assert.equal(fixture.run, MS73_RUN);
  const actors = await resolveQaActors(tx);
  const [room] = await tx.select().from(rooms).where(eq(rooms.id, fixture.id)).for("update");
  assert(room && room.slug === fixture.slug && room.name === fixture.name && room.ownerId === actors.a.userId && room.ownerId === fixture.ownerId && room.createdAt.toISOString() === fixture.createdAt, "STOP: fixture ownership mismatch");
  const members = await tx.select().from(roomMemberships).where(eq(roomMemberships.roomId, room.id));
  assert(members.some(m => m.userId === actors.founder.userId), "STOP: founder membership missing");
  assert(members.every(m => [actors.a.userId, actors.b.userId, actors.founder.userId].includes(m.userId)), "STOP: unexpected participant; inspect before cleanup");
  const chats = await tx.select().from(conversations).where(eq(conversations.roomId, room.id));
  assert.equal(chats.length, 1); assert.equal(chats[0].id, fixture.conversationId);
  // A founder contribution is retained data, even inside a disposable fixture.
  const ids = chats.map(c => c.id);
  const authored = await tx.select({ authorId: messages.authorId }).from(messages).where(inArray(messages.conversationId, ids));
  const board = await tx.select({ authorId: hallItems.authorId }).from(hallItems).where(inArray(hallItems.conversationId, ids));
  assert([...authored, ...board].every(row => [actors.a.userId, actors.b.userId].includes(row.authorId)), "STOP: non-QA authored content; manual review required");
  const tripEdits = await tx.select({ actorId: tripMutationReceipts.actorId }).from(tripMutationReceipts).innerJoin(tripPlans, eq(tripPlans.id, tripMutationReceipts.planId)).where(eq(tripPlans.roomId, room.id));
  assert(tripEdits.every(row => [actors.a.userId, actors.b.userId].includes(row.actorId)), "STOP: non-QA Map contribution; manual review required");
  return { room, members, actors };
}

export async function cleanupQaFixture(db: ToskerDatabase, fixture: QaFixture, apply = false) {
  assert(!fixture.retained && /^ms73-qa-[a-f0-9]{8}$/.test(fixture.slug), "Founder Review Rooms are NEVER automatically cleaned");
  return db.transaction(async tx => {
    await inspectOwned(tx, fixture);
    if (apply) await tx.delete(rooms).where(and(eq(rooms.id, fixture.id), eq(rooms.slug, fixture.slug)));
    return { dryRun: !apply, room: fixture.slug, founderRemovedOnlyWithOwnedRoom: apply };
  });
}

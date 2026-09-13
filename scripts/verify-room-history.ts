/** Isolated retained-history regression. No migrations, providers or existing content changes.
 * NODE_OPTIONS=--conditions=react-server dotenv -e .env.local -- tsx scripts/verify-room-history.ts
 * --hold keeps the final authorized fixture available for browser reads until Enter.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { conversationParticipants, conversations, hallItems, hallReactions, invites, messages, notifications, roomMemberships, rooms, subroomAccess, subrooms, users } from "../src/server/db/schema";
import { AuthorizationDeniedError, requireRoomMember } from "../src/server/auth/authorize";
import { readMessageHistory } from "../src/server/conversations/history";
import { searchConversation } from "../src/server/conversations/search";
import { setMessageReaction } from "../src/server/conversations/service";
import { addHallComment, hallScope, listHallComments, requireHallNote, setCommentReaction, setHallReaction } from "../src/server/hall/service";
import { createHallNote, pinChatMessage } from "../src/server/hall/lifecycle";
import { joinRoomInvite, revokeRoomInvite, withdrawRoomMember } from "../src/server/rooms/lifecycle";
import { inviteHash } from "../src/server/rooms/invite-crypto";
import { acknowledgeDestination, hallNotificationRecipients } from "../src/server/attention/service";
import { listConversationPreferences } from "../src/server/conversations/preferences";
import { deriveAttention } from "../src/lib/attention";
import type { AuthenticatedActor } from "../src/server/auth/actor";

const db = getDatabase(), roomId = randomUUID(), slug = `qa-room-history-${roomId}`;
const scopes = ["parent", "everyone", "selected", "owners"].map((name) => ({ name, chat: randomUUID(), child: name === "parent" ? null : randomUUID(), note: randomUUID(), comment: randomUUID(), source: randomUUID(), reply: randomUUID() }));
const [parent, everyone, selected, owners] = scopes;
let checks = 0;
const pass = (name: string) => { checks++; console.log(`PASS ${name}`); };
async function main() {
  const records = await db.select().from(users).where(inArray(users.id, ["0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", "d7a58753-9877-45b2-9fc7-cca188559fed"]));
  const actor = (id: string): AuthenticatedActor => { const user = records.find((entry) => entry.id === id); assert.ok(user, "Existing isolated Clerk QA identity required"); return { userId: user.id, authProvider: user.authProvider, authSubject: user.authSubject }; };
  const a = actor("0ee1e5a5-6d7a-4541-a6ca-ca69788997ef"), b = actor("d7a58753-9877-45b2-9fc7-cca188559fed");
  const activity = () => db.select().from(notifications).where(and(eq(notifications.userId, b.userId), inArray(notifications.conversationId, scopes.map((scope) => scope.chat))));
  const makeInvite = async (expired = false) => {
    const id = randomUUID(), token = randomBytes(32).toString("base64url");
    await db.insert(invites).values({ id, roomId, inviterId: a.userId, recipientUserId: b.userId, tokenHash: inviteHash(token), expiresAt: new Date(Date.now() + (expired ? -3600000 : 3600000)) });
    return { id, token };
  };
  const deny = async (scope: typeof parent, label: string) => {
    await assert.rejects(() => readMessageHistory(db, b, scope.chat), AuthorizationDeniedError);
    await assert.rejects(() => readMessageHistory(db, b, scope.chat, { target: scope.source }), AuthorizationDeniedError);
    await assert.rejects(() => searchConversation(db, b, scope.chat, "retained"), AuthorizationDeniedError);
    await assert.rejects(() => hallScope(db, b, scope.chat), AuthorizationDeniedError);
    await assert.rejects(() => listHallComments(db, b, scope.chat, scope.note), AuthorizationDeniedError);
    pass(`${label}: Chat/latest metadata, source, Search, Hall/comments denied`);
  };
  const visible = async (scope: typeof parent) => {
    const first = await readMessageHistory(db, b, scope.chat);
    assert.ok(first.messages.some((message) => message.id === scope.reply && message.replyTo?.includes("retained")), "Historical reply source");
    const found = await searchConversation(db, b, scope.chat, `retained ${scope.name}`);
    assert.ok(found.results.some((message) => message.id === scope.source));
    const target = await readMessageHistory(db, b, scope.chat, { target: scope.source });
    assert.ok(target.messages.some((message) => message.id === scope.source && message.reactionSummary.some((reaction) => reaction.emoji === "👍" && reaction.count === 1 && !reaction.mine)));
    const board = await db.select().from(hallItems).where(and(await hallScope(db, b, scope.chat), isNull(hallItems.archivedAt)));
    assert.ok(board.some((item) => item.id === scope.note));
    assert.ok(board.some((item) => item.kind === "pinned_message" && item.sourceMessageId === scope.source));
    assert.ok(!board.some((item) => scopes.some((other) => other !== scope && other.note === item.id)), "Hall isolation");
    await requireHallNote(db, b, scope.chat, scope.note);
    assert.equal((await db.select().from(hallReactions).where(eq(hallReactions.itemId, scope.note))).length, 1);
    const comments = await listHallComments(db, b, scope.chat, scope.note);
    assert.ok(comments.comments.some((comment) => comment.id === scope.comment && comment.reactions.some((reaction) => reaction.emoji === "👍" && reaction.count === 1)));
    pass(`${scope.name}: retained Chat/reply/Search/reactions and scoped Hall/note/comment/reaction/pin`);
  };
  const setSelected = async (allowed: boolean) => {
    // Existing access model; no access-management feature is introduced by this test.
    await db.transaction(async (tx) => {
      await tx.select().from(rooms).where(eq(rooms.id, roomId)).for("update");
      if (allowed) {
        await tx.insert(subroomAccess).values({ subroomId: selected.child!, userId: b.userId }).onConflictDoNothing();
        await tx.insert(conversationParticipants).values({ conversationId: selected.chat, userId: b.userId }).onConflictDoNothing();
      } else {
        await tx.delete(subroomAccess).where(and(eq(subroomAccess.subroomId, selected.child!), eq(subroomAccess.userId, b.userId)));
        await tx.delete(conversationParticipants).where(and(eq(conversationParticipants.conversationId, selected.chat), eq(conversationParticipants.userId, b.userId)));
      }
    });
  };
  try {
    await db.insert(rooms).values({ id: roomId, slug, name: "Temporary retained history QA", ownerId: a.userId });
    await db.insert(roomMemberships).values({ roomId, userId: a.userId, role: "owner" });
    for (const scope of scopes) {
      if (scope.child) await db.insert(subrooms).values({ id: scope.child, roomId, name: `History ${scope.name}`, visibility: scope.name as "everyone" | "selected" | "owners", createdBy: a.userId, position: scopes.indexOf(scope) - 1 });
      await db.insert(conversations).values({ id: scope.chat, roomId, subroomId: scope.child, kind: "room", isPrimary: !scope.child, title: `History ${scope.name}` });
      await db.insert(conversationParticipants).values({ conversationId: scope.chat, userId: a.userId });
      if (scope.child) await db.insert(subroomAccess).values({ subroomId: scope.child, userId: a.userId });
      // Controlled historical fixture dates, all strictly before the later membership.
      await db.insert(messages).values({ id: scope.source, conversationId: scope.chat, authorId: a.userId, body: `retained ${scope.name} source before B joined`, createdAt: new Date(Date.now() - 86400000) });
      await db.insert(messages).values({ id: scope.reply, conversationId: scope.chat, authorId: a.userId, body: `Historical ${scope.name} reply`, replyToId: scope.source, createdAt: new Date(Date.now() - 3600000) });
      if (scope === parent) await db.insert(messages).values(Array.from({ length: 52 }, (_, i) => ({ conversationId: scope.chat, authorId: a.userId, body: `Historical page row ${i}`, createdAt: new Date(Date.now() - 7200000 + i * 1000) })));
      await setMessageReaction(db, a, { conversationId: scope.chat, messageId: scope.source, emoji: "👍", active: true });
      await createHallNote(db, a, { id: scope.note, conversationId: scope.chat, title: `Retained ${scope.name} note`, body: "Created before B joined; shared retained context." });
      await addHallComment(db, a, { id: scope.comment, conversationId: scope.chat, itemId: scope.note, body: "Retained comment before B joined" });
      await setHallReaction(db, a, { conversationId: scope.chat, itemId: scope.note, reaction: "heart", active: true });
      await setCommentReaction(db, a, { conversationId: scope.chat, itemId: scope.note, commentId: scope.comment, emoji: "👍", active: true });
      await pinChatMessage(db, a, { conversationId: scope.chat, messageId: scope.source });
    }
    const invite = await makeInvite();
    await deny(parent, "Pending invitation alone");
    const expired = await makeInvite(true);
    await assert.rejects(() => joinRoomInvite(db, b, expired.token));
    const revoked = await makeInvite(); await revokeRoomInvite(db, a, roomId, revoked.id);
    await assert.rejects(() => joinRoomInvite(db, b, revoked.token));
    await deny(everyone, "Expired/revoked invitations");
    await joinRoomInvite(db, b, invite.token);
    const [membership] = await db.select().from(roomMemberships).where(and(eq(roomMemberships.roomId, roomId), eq(roomMemberships.userId, b.userId)));
    const [latestNote] = await db.select().from(hallItems).where(eq(hallItems.id, owners.note));
    assert.ok(membership.joinedAt > latestNote.createdAt, "B genuinely joined after all fixture content");
    await visible(parent); await visible(everyone); await deny(selected, "Unauthorized selected"); await deny(owners, "Non-owner");
    const first = await readMessageHistory(db, b, parent.chat);
    assert.equal(first.messages.length, 50); assert.ok(first.nextCursor);
    const older = await readMessageHistory(db, b, parent.chat, { before: first.nextCursor.id });
    assert.equal(older.messages.length, 4); assert.ok(older.messages.some((message) => message.id === parent.source));
    assert.equal(older.nextCursor, null);
    pass("54 historical parent messages across normal pagination");
    assert.equal((await readMessageHistory(db, b, parent.chat, { target: selected.source })).messages.length, 0);
    assert.equal((await readMessageHistory(db, b, parent.chat, { ids: [selected.source] })).messages.length, 0);
    assert.equal((await searchConversation(db, b, parent.chat, "retained", selected.source)).results.length, 0);
    await assert.rejects(() => requireHallNote(db, b, parent.chat, selected.note), AuthorizationDeniedError);
    await assert.rejects(() => requireRoomMember(db, b, randomUUID()), AuthorizationDeniedError);
    await assert.rejects(() => readMessageHistory(db, b, randomUUID()), AuthorizationDeniedError);
    pass("Forged Room/conversation/source/cursor/Hall item isolation");
    assert.equal((await activity()).length, 0, "Joining never replays historical notifications");
    assert.equal(Object.keys(deriveAttention([], await listConversationPreferences(db, b)).conversations).filter((id) => scopes.some((scope) => scope.chat === id)).length, 0);
    await setSelected(true); await visible(selected); assert.equal((await activity()).length, 0);
    pass("Later selected access exposes older history without historical unread/notifications");
    const newNote = randomUUID();
    await createHallNote(db, a, { id: newNote, conversationId: selected.chat, title: "Post-access activity", body: "Only new activity should be unread" });
    const fresh = await activity(); assert.equal(fresh.length, 1); assert.equal(fresh[0].conversationId, selected.chat); assert.equal(fresh[0].destinationReadAt, null);
    await acknowledgeDestination(db, b, [fresh[0].id], selected.chat);
    assert.ok((await activity())[0].destinationReadAt);
    await setSelected(false); await deny(selected, "Revoked selected access");
    assert.ok(!(await hallNotificationRecipients(db, selected.chat, a.userId)).some((member) => member.userId === b.userId));
    assert.ok(!(await hallNotificationRecipients(db, owners.chat, a.userId)).some((member) => member.userId === b.userId));
    pass("Only post-access Hall activity is unread; acknowledgement and restricted recipients");
    // Provider revocation was independently accepted in FP2. Stub ONLY that dependency
    // so this data-access regression cannot disconnect B's other real conversations.
    await withdrawRoomMember(db, a, roomId, b.userId, async () => {});
    await deny(parent, "Owner removed member"); await deny(everyone, "Removed member child");
    await assert.rejects(() => joinRoomInvite(db, b, invite.token));
    const rejoin = await makeInvite(); await joinRoomInvite(db, b, rejoin.token);
    await visible(parent); await visible(everyone); await deny(selected, "Rejoin does not resurrect selected access");
    assert.equal((await activity()).length, 1, "Rejoin creates no historical communication notifications");
    await withdrawRoomMember(db, b, roomId, b.userId, async () => {}); await deny(parent, "Voluntary former member");
    await joinRoomInvite(db, b, (await makeInvite()).token); await visible(parent); await visible(everyone);
    pass("Removal / leave / legitimate rejoin preserves retained history and current access");
    if (process.argv.includes("--hold")) {
      console.log(JSON.stringify({ browserFixture: { roomId, slug, scopes }, checks, state: "B joined; parent/everyone allowed; selected/owners denied; press Enter to clean up" }));
      process.stdin.resume(); await new Promise<void>((resolve) => process.stdin.once("data", () => resolve())); process.stdin.pause();
    }
    console.log(`PASS Room history service acceptance: ${checks} groups`);
  } finally {
    // Exact newly-created Room only; FK cascades remove its own QA content/invites.
    await db.delete(rooms).where(and(eq(rooms.id, roomId), eq(rooms.slug, slug), eq(rooms.ownerId, a.userId)));
    const [{ remaining }] = await db.select({ remaining: count() }).from(conversations).where(eq(conversations.roomId, roomId));
    assert.equal(remaining, 0, "Scoped fixture cleanup");
    console.log("PASS exact QA Room/content cleanup; existing users and Rooms preserved");
  }
}
main().then(() => process.exit(0)).catch((error: unknown) => { console.error(error instanceof Error ? error.stack : "Room history regression failed"); process.exit(1); });

/** Synthetic rollback-only acceptance; no live user, message or provider mutation. */
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { users, profiles, rooms, roomMemberships, roomIdentityResets, connections, connectionNicknames, conversations, conversationParticipants, messages, messageReactions, notifications, hallItems, hallComments, hallCommentReactions, conversationReads, subrooms } from "../src/server/db/schema";
import { readOwnRoomIdentity, setOwnRoomNickname, resetMemberRoomNickname, RoomIdentityConflictError } from "../src/server/rooms/identity";
import { readNamecard } from "../src/server/profiles/namecard";
import { readMessageHistory } from "../src/server/conversations/history";
import { searchConversation } from "../src/server/conversations/search";
import { mentionSuggestions } from "../src/server/conversations/mentions";
import { listHallComments } from "../src/server/hall/service";
import { contextualName } from "../src/server/profiles/context-name";
const db=getDatabase(), rollback=new Error("MS7.2 Room identity rollback");
async function main() {
  const actors=Array.from({length:3},()=>{ const userId=randomUUID(); return {userId,authProvider:"ms72-room-qa",authSubject:userId}; });
  const [a,b,c]=actors;
  try { await db.transaction(async tx=>{
    const serviceDb=tx as unknown as ToskerDatabase;
    await tx.insert(users).values(actors.map(actor=>({...{id:actor.userId,authProvider:actor.authProvider,authSubject:actor.authSubject},tid:Array.from({length:7},()=>"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[randomInt(36)]).join("")})));
    await tx.insert(profiles).values(actors.map((actor,i)=>({userId:actor.userId,displayName:`Global ${i}`,username:`qa-${actor.userId}`})));
    const [room]=await tx.insert(rooms).values({ownerId:a.userId,name:"Room identity QA",slug:`ms72-${randomUUID()}`}).returning();
    await tx.insert(roomMemberships).values([{roomId:room.id,userId:a.userId,role:"owner"},{roomId:room.id,userId:b.userId,role:"member"}]);
    const [child]=await tx.insert(subrooms).values({roomId:room.id,name:"Child identity QA",createdBy:a.userId,visibility:"everyone"}).returning();
    const [parent,sub,personal]=await tx.insert(conversations).values([{kind:"room",roomId:room.id},{kind:"room",roomId:room.id,subroomId:child.id},{kind:"personal",directKey:[a.userId,b.userId].sort().join(":")}]).returning();
    await tx.insert(conversationParticipants).values([parent,sub,personal].flatMap(chat=>[a,b].map(actor=>({conversationId:chat.id,userId:actor.userId}))));
    const [friend]=await tx.insert(connections).values({requesterId:a.userId,addresseeId:b.userId,pairKey:[a.userId,b.userId].sort().join(":"),status:"accepted"}).returning();
    await tx.insert(connectionNicknames).values({connectionId:friend.id,userId:a.userId,nickname:"A's private alias for B"});
    for(const chat of [parent,sub,personal]) {
      const [source]=await tx.insert(messages).values({conversationId:chat.id,authorId:b.userId,body:"identity needle"}).returning();
      await tx.insert(messages).values({conversationId:chat.id,authorId:a.userId,body:"reply needle",replyToId:source.id});
      await tx.insert(messageReactions).values({messageId:source.id,userId:b.userId,emoji:"👍"});
    }
    const [note]=await tx.insert(hallItems).values({kind:"note",conversationId:parent.id,roomId:room.id,authorId:b.userId,title:"Identity note"}).returning();
    const [comment]=await tx.insert(hallComments).values({itemId:note.id,authorId:b.userId,body:"comment"}).returning();
    await tx.insert(hallCommentReactions).values({commentId:comment.id,userId:b.userId,emoji:"👍"});
    const beforeMessages=await tx.select().from(messages).where(inArray(messages.conversationId,[parent.id,sub.id,personal.id]));
    const beforeHall=await tx.select().from(hallItems).where(eq(hallItems.id,note.id));
    const original=await readOwnRoomIdentity(tx,b,room.id);
    assert.equal(original.nickname,null);
    let saved=await setOwnRoomNickname(serviceDb,b,room.id,"  Cafe\u0301 العربية 👩‍👩‍👧‍👦  ",original.revision);
    const nickname="Café العربية 👩‍👩‍👧‍👦";
    assert.equal(saved.nickname,nickname);
    await assert.rejects(setOwnRoomNickname(serviceDb,b,room.id,"stale",original.revision),RoomIdentityConflictError);
    for(const bad of ["x".repeat(61),"bad\u202ename","bad\nname"]) await assert.rejects(setOwnRoomNickname(serviceDb,b,room.id,bad,saved.revision));
    await assert.rejects(setOwnRoomNickname(serviceDb,c,room.id,"forged",saved.revision));
    await assert.rejects(resetMemberRoomNickname(serviceDb,b,room.id,a.userId,(await readOwnRoomIdentity(tx,a,room.id)).revision));
    await assert.rejects(resetMemberRoomNickname(serviceDb,c,room.id,b.userId,saved.revision));
    await assert.rejects(readNamecard(tx,c,b.userId,room.id));
    await assert.rejects(readMessageHistory(serviceDb,c,parent.id));
    const card=await readNamecard(tx,a,b.userId,room.id);
    assert.equal(card.roomNickname,nickname); assert.equal(card.displayName,"Global 1"); assert.equal(card.nickname,"A's private alias for B");
    assert.equal((await readNamecard(tx,a,b.userId)).roomNickname,null);
    for(const chat of [parent,sub,personal]) {
      const expected=chat.id===personal.id?"A's private alias for B":nickname;
      const history=await readMessageHistory(serviceDb,a,chat.id);
      assert.equal(history.messages.find(m=>m.authorId===b.userId)?.author,expected);
      assert.equal(history.messages.find(m=>m.replyToId)?.replyAuthor,expected);
      assert.equal(history.messages.find(m=>m.authorId===b.userId)?.reactionSummary[0].participants[0],expected);
      assert.equal((await searchConversation(serviceDb,a,chat.id,"needle")).results.find(m=>m.authorId===b.userId)?.author,expected);
      if(chat!==personal) assert.equal((await mentionSuggestions(serviceDb,a,chat.id,"Café"))[0].name,nickname);
    }
    const comments=await listHallComments(serviceDb,a,parent.id,note.id);
    assert.equal(comments.comments[0].author,nickname); assert.equal(comments.comments[0].reactions[0].participants[0],nickname);
    // The shared presentation primitive also backs Hall sources and notification labels.
    const [label]=await tx.select({name:contextualName(a.userId,sql`${room.id}::uuid`,sql`${profiles.userId}`,sql`${profiles.displayName}`)}).from(profiles).where(eq(profiles.userId,b.userId));
    assert.equal(label.name,nickname);
    console.log("PASS self-only updates; owner-only reset; outsider/stale/invalid rejected; Room/child history/reply/reaction/search/mentions/Hall/Namecard contextual labels; Personal alias stays private");
    saved=await resetMemberRoomNickname(serviceDb,a,room.id,b.userId,saved.revision);
    assert.equal(saved.nickname,null);
    const reset=await tx.select().from(roomIdentityResets).where(eq(roomIdentityResets.roomId,room.id));
    assert.equal(reset.length,1); assert.equal(reset[0].actorId,a.userId); assert.equal(reset[0].targetUserId,b.userId);
    assert.deepEqual(Object.keys(reset[0]).sort(),["actorId","createdAt","id","roomId","targetUserId"].sort());
    saved=await setOwnRoomNickname(serviceDb,b,room.id,"New choice",saved.revision);
    await tx.delete(roomMemberships).where(and(eq(roomMemberships.roomId,room.id),eq(roomMemberships.userId,b.userId)));
    assert.equal((await readMessageHistory(serviceDb,a,parent.id)).messages.find(m=>m.authorId===b.userId)?.author,"Global 1");
    await tx.insert(roomMemberships).values({roomId:room.id,userId:b.userId,role:"member"});
    assert.equal((await readOwnRoomIdentity(tx,b,room.id)).nickname,null);
    await assert.rejects(setOwnRoomNickname(serviceDb,b,room.id,"old membership draft",saved.revision),RoomIdentityConflictError);
    assert.deepEqual(await tx.select().from(messages).where(inArray(messages.conversationId,[parent.id,sub.id,personal.id])),beforeMessages);
    assert.deepEqual(await tx.select().from(hallItems).where(eq(hallItems.id,note.id)),beforeHall);
    for(const [table,column] of [[notifications,notifications.userId],[conversationReads,conversationReads.userId]] as const) assert.equal((await tx.select().from(table).where(inArray(column,actors.map(a=>a.userId)))).length,0);
    console.log("PASS reset-only accountability, new member choice, leave clears nickname, rejoin rejects old epoch; authored data/history/attention unchanged");
    throw rollback;
  }); } catch(error) { if(error!==rollback) throw error; }
  assert.equal((await db.select().from(users).where(inArray(users.id,actors.map(a=>a.userId)))).length,0);
  console.log("PASS all synthetic identities and fixtures rolled back");
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$client.end());

import { count, eq } from "drizzle-orm";

import { AuthorizationDeniedError, requireConversationParticipant } from "../src/server/auth/authorize";
import { getDatabase } from "../src/server/db/client";
import { conversationParticipants, conversations, messages, users } from "../src/server/db/schema";

const db = getDatabase();
const subject = `ms5-chat-denial-${crypto.randomUUID()}`;

async function main() {
  const [shared] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.kind, "room")).limit(1);
  if (!shared) throw new Error("A shared Room conversation is required for this check.");
  const [outsider] = await db.insert(users).values({ authProvider: "verification", authSubject: subject, tid: `TID-CHECK-${crypto.randomUUID().slice(0, 4).toUpperCase()}` }).returning({ id: users.id });
  try {
    let denied = false;
    try {
      await requireConversationParticipant(db, { userId: outsider.id, authProvider: "verification", authSubject: subject }, shared.id);
    } catch (error) {
      denied = error instanceof AuthorizationDeniedError;
    }
    const [{ participantCount }] = await db.select({ participantCount: count() }).from(conversationParticipants).where(eq(conversationParticipants.conversationId, shared.id));
    const [{ messageCount }] = await db.select({ messageCount: count() }).from(messages).where(eq(messages.conversationId, shared.id));
    const pairs = await db.select({ directKey: conversations.directKey }).from(conversations).where(eq(conversations.kind, "personal"));
    const keys = pairs.map(({ directKey }) => directKey).filter(Boolean);
    const noDuplicatePairs = keys.length === new Set(keys).size;
    if (!denied || participantCount < 2 || messageCount < 1 || !noDuplicatePairs) throw new Error("Persistent chat verification failed.");
    console.log(JSON.stringify({ chat: "ok", unauthorizedReadDenied: denied, participantCount, messageCount, noDuplicatePairs }));
  } finally {
    await db.delete(users).where(eq(users.id, outsider.id));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Chat verification failed.");
  process.exitCode = 1;
});

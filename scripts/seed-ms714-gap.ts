import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, users, messages } from "../src/server/db/schema";
import { hallScope } from "../src/server/hall/service";
import { publishMessageChanged } from "../src/server/realtime/provider";

// Exact disposable history fixture only. Simulates a multi-page missed event gap,
// not evidence of 55 browser sends or notification creation.
async function main() {
  assert.equal(process.env.MS714_APPEND_GAP, "1");
  const db = getDatabase(), roomId = "26ba8c8f-a478-4550-bb68-e50a28c539d4", conversationId = "7a03d40e-6da6-4322-8af3-418987567f2c";
  const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.slug, "ms714-history-26ba8c8f")));
  assert(room);
  const [b] = await db.select().from(users).where(eq(users.id, "d7a58753-9877-45b2-9fc7-cca188559fed")); assert(b);
  await hallScope(db, { userId: b.id, authProvider: b.authProvider, authSubject: b.authSubject }, conversationId);
  const stamp = Date.now();
  await db.insert(messages).values(Array.from({ length: 55 }, (_, index) => ({ id: crypto.randomUUID(), conversationId, authorId: b.id, body: `MS714 offline gap ${stamp} ${index}`, createdAt: new Date(stamp + index) })));
  await publishMessageChanged(conversationId);
  console.log("PASS: exact authorized QA fixture received 55 canonical gap records and a provider invalidation; this is data seeding, not browser-send acceptance.");
}
main().then(() => process.exit(0)).catch(() => { console.error("FAIL: guarded gap fixture"); process.exit(1); });

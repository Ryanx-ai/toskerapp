/** Local HTTP boundary checks; no accepted location writes/provider lookups. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const origin = "http://localhost:3000", cases: string[] = [];
let sessionId: string | undefined, stage = "setup";
async function main() {
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  sessionId = (await clerk.sessions.createSession({ userId: actors.b.authSubject })).id;
  const token = (await clerk.sessions.getToken(sessionId)).jwt;
  async function check(name: string, body: unknown, expected: number, options: { origin?: string; anonymous?: boolean; raw?: boolean } = {}) {
    stage = name;
    const response = await fetch(origin + "/api/location-sharing", { method: "POST", headers: { Origin: options.origin ?? origin, "Content-Type": "application/json", ...(!options.anonymous ? { Authorization: `Bearer ${token}` } : {}) }, body: options.raw ? String(body) : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, expected);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(response.headers.get("vary") ?? "", /Authorization/i);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const value = await response.json(); assert.deepEqual(Object.keys(value), ["error"]);
    assert.equal(typeof value.error, "string"); assert(value.error.length < 200);
    assert(!JSON.stringify(value).includes(fixture.conversationId));
    cases.push(name);
  }
  const current = { action: "current", conversationId: fixture.conversationId };
  await check("anonymous denied", current, 401, { anonymous: true });
  await check("foreign origin denied", current, 403, { origin: "https://example.invalid" });
  await check("malformed JSON denied", "{", 400, { raw: true });
  await check("oversized input denied", "x".repeat(1001), 400, { raw: true });
  await check("unknown field denied", { ...current, extra: true }, 400);
  await check("invalid context denied", { action: "current", conversationId: "invalid" }, 400);
  await check("precise consent cannot reuse broad consent", { action: "begin", conversationId: fixture.conversationId, precision: "precise", consent: "area-latest-v2" }, 400);
  await check("non-synthetic sample denied", { action: "send", id: randomUUID(), point: { latitude: 0, longitude: 0, accuracy: 50 }, expectedRevision: 0, requestId: randomUUID() }, 400);
  await check("selected Subroom unauthorized viewer denied", { action: "current", conversationId: fixture.selectedChatId }, 403);
  await clerk.sessions.revokeSession(sessionId);
  await check("revoked session denied even with existing JWT", current, 401);
  const result = { passed: true, cases, errorPayloadsGeneric: true, privateNoStore: true, acceptedLocationWrites: 0, providerLookups: 0 };
  writeFileSync(".git/ms74-fp3/latest-api-privacy.json", JSON.stringify(result), { mode: 0o600 }); console.log(JSON.stringify(result));
}
main().catch(() => { console.error(JSON.stringify({ passed: false, stage, privateDetailsSuppressed: true })); process.exitCode = 1; })
  .finally(async () => { if (sessionId) await clerk.sessions.revokeSession(sessionId).catch(() => {}); await db.$client.end(); });

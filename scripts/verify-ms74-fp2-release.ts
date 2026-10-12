/** Exact-release API gate. Isolated QA sessions, no retained content writes. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { liveChannel } from "../src/lib/live-contract";
const deployment = JSON.parse(readFileSync(".git/ms74-fp2/deployment-staged.json", "utf8"));
const canonical = process.argv.includes("--canonical");
const origin = canonical ? "https://toskerapp.vercel.app" : `https://${deployment.url}`;
assert.equal(deployment.projectId, "prj_cxYhH8ypeFmuPOiEBC0gf0Rbzmau");
assert.equal(deployment.gitSource.sha, "3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161");
const cli = "/Users/ryanc/.npm/_npx/69f9afb961c37556/node_modules/.bin/vercel";
const db = getDatabase();
let phase = "resolve";
async function main() {
  assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  const actors = await resolveQaActors(db), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  const checks: { actor: string; path: string; status: number }[] = [];
  for (const role of ["a", "b"] as const) {
    phase = `${role} isolated session`;
    const session = await clerk.sessions.createSession({ userId: actors[role].authSubject });
    try {
      const request = async (path: string, body: object | undefined, expected = 200) => {
        phase = `${role} ${path}`;
        const token = await clerk.sessions.getToken(session.id);
        const config = [`header = ${JSON.stringify(`Authorization: Bearer ${token.jwt}`)}`, `header = ${JSON.stringify(`Origin: ${origin}`)}`, 'header = "Content-Type: application/json"', `request = "${body ? "POST" : "GET"}"`, ...(body ? [`data = ${JSON.stringify(JSON.stringify(body))}`] : [])].join("\n");
        const response = spawnSync(cli, ["curl", path, "--deployment", origin, "--scope", "pangea6", "--", "--config", "-", "--silent", "--show-error", "--max-time", "25", "--write-out", "\n%{http_code}"], { input: config, encoding: "utf8", timeout: 40000 });
        assert.equal(response.status, 0, "HTTP invocation failed; private output suppressed");
        const lines = response.stdout.trim().split("\n"), status = Number(lines.pop());
        assert.equal(status, expected, `Expected HTTP ${expected}, got ${status}`);
        checks.push({ actor: role.toUpperCase(), path, status });
        return JSON.parse(lines.join("\n"));
      };
      assert.equal((await request("/api/live/join", { conversationId: fixture.conversationId })).authorized, true);
      const token = await request("/api/realtime/token", { conversationId: fixture.conversationId });
      const capabilities = JSON.parse(token.capability);
      assert.deepEqual([...capabilities[liveChannel(fixture.conversationId)]].sort(), ["presence", "subscribe"]);
      assert(!Object.keys(capabilities).some(key => key.includes("*")));
      const roster = await request("/api/live/roster", { conversationId: fixture.conversationId, userIds: [actors.a.userId, actors.b.userId] });
      assert.equal(roster.participants.length, 2);
      assert(roster.participants.every((p: object) => Object.keys(p).sort().join(",") === "avatarUrl,displayName,userId"));
      const history = await request(`/api/conversations/${fixture.conversationId}/messages`, undefined);
      assert(history.messages.length > 0);
      if (role === "b") {
        for (const path of ["/api/live/join", "/api/realtime/token"]) await request(path, { conversationId: fixture.selectedChatId }, 403);
      } else {
        const search = await request(`/api/trips/${fixture.slug}/places`, { kind: "search", query: "Marina Bay Sands" });
        assert(search.candidates?.length > 0 && search.candidates.every((c: { candidate: { provider: string } }) => c.candidate.provider === "geoapify"));
      }
    } finally { await clerk.sessions.revokeSession(session.id); }
  }
  const receipt = { pass: true, origin, expectedSha: deployment.gitSource.sha, at: new Date().toISOString(), checks, isolatedSessionsRevoked: true, retainedContentWrites: 0, providerRequests: 1, exactLivePresenceSubscribeOnly: true, noClientWildcard: true, minimalRoster: true };
  writeFileSync(`.git/ms74-fp2/${canonical ? "canonical" : "staged"}-api.json`, JSON.stringify(receipt, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(receipt));
}
main().catch(e => { console.error({ pass: false, phase, kind: e.name, detail: e instanceof assert.AssertionError ? e.message.split("\n")[0] : "Private request details suppressed" }); process.exitCode = 1; }).finally(() => db.$client.end());

/** Bounded API-only rotation gate. No browser automation, content mutation or raw secrets. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createClerkClient } from "@clerk/backend";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { readTrip } from "../src/server/trips/service";
import { routingPlaces } from "../src/lib/trip-contract";

const target = process.argv[2];
assert(["https://tosker-1u8qny4nf-pangea6.vercel.app", "https://toskerapp.vercel.app"].includes(target));
const slug = "ms73-founder-review-904a9dea";
const cli = "/Users/ryanc/.npm/_npx/69f9afb961c37556/node_modules/.bin/vercel";
let phase = "resolve";
async function main() {
  assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"), "Only the existing Development Clerk instance is allowed");
  const actors = await resolveQaActors(getDatabase());
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  // Provider-issued isolated QA session; no founder session or cookie impersonation.
  phase = "create isolated QA API session";
  const session = await clerk.sessions.createSession({ userId: actors.a.authSubject });
  try {
    const roadOnly = process.argv.includes("--road-only");
    const plan = roadOnly ? await readTrip(getDatabase(), actors.a, slug) : null;
    const route = plan?.routes.find(r => !r.archived && routingPlaces(plan, r.id).length >= 2 && routingPlaces(plan, r.id).length <= 8);
    if (roadOnly) assert(route, "No suitable retained route; do not create one");
    const inputs = roadOnly ? [{ routeId: route!.id, mode: "walk" }] : [{ kind: "search", query: "Marina Bay Sands" }, { kind: "pin", latitude: 1.2834, longitude: 103.8607 }];
    for (const input of inputs) {
      phase = "kind" in input ? input.kind! : "road";
      const token = await clerk.sessions.getToken(session.id);
      const config = [`header = ${JSON.stringify(`Authorization: Bearer ${token.jwt}`)}`, `header = ${JSON.stringify(`Origin: ${target}`)}`, 'header = "Content-Type: application/json"', 'request = "POST"', `data = ${JSON.stringify(JSON.stringify(input))}`].join("\n");
      const response = spawnSync(cli, ["curl", `/api/trips/${slug}/${roadOnly ? "roads" : "places"}`, "--deployment", target, "--scope", "pangea6", "--", "--config", "-", "--silent", "--show-error", "--max-time", "25", "--write-out", "\n%{http_code}"], { input: config, encoding: "utf8", timeout: 40000 });
      // Never print CLI output, URL-bearing errors, provider bodies, candidate tokens or session IDs.
      assert.equal(response.status, 0, "HTTP command failed; output suppressed");
      const parts = response.stdout.trim().split("\n");
      const status = Number(parts.pop());
      assert.equal(status, 200, `Application ${phase} returned ${status}`);
      const data = JSON.parse(parts.join("\n"));
      if (roadOnly) {
        assert(data.geometry?.segments?.some((segment: unknown[]) => segment.length > 1), "Road geometry missing");
        console.log(JSON.stringify({ target, test: "road", status, geometryPresent: true, contentWrites: 0 }));
        continue;
      }
      assert(data.candidates?.length > 0, "No candidates returned");
      assert(data.candidates.every((item: { candidate: { provider: string } }) => item.candidate.provider === "geoapify"), "Provider evidence missing");
      if ("kind" in input && input.kind === "pin") assert(data.candidates[0].candidate.address, "Reverse lookup did not return address context");
      console.log(JSON.stringify({ target, test: phase, status, candidates: data.candidates.length, provider: "geoapify", contentWrites: 0 }));
    }
  } finally {
    try { await clerk.sessions.revokeSession(session.id); }
    catch { phase = "revoke owned QA API session"; throw new Error("Session cleanup failed"); }
  }
}
main().catch(error => {
  console.error(JSON.stringify({ pass: false, phase, error: error instanceof assert.AssertionError ? error.message : "request failed; details suppressed" }));
  process.exitCode = 1;
});

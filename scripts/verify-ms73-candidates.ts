import assert from "node:assert/strict";
import { signCandidate, verifyCandidate } from "../src/server/maps/candidate-token";
import { getPlaceProvider } from "../src/server/maps/provider";
import { createQaFixture, cleanupQaFixture, type QaFixture } from "./lib/ms73-fixtures";
import type { ToskerDatabase } from "../src/server/db/client";
import type { PlaceCandidate } from "../src/lib/trip-contract";

async function main() {
  for (const matches of [[], [{ id: "first" }, { id: "second" }]]) {
    let inserts = 0;
    const fake = { transaction: async (run: (tx: unknown) => Promise<unknown>) => run({ select: () => ({ from: () => ({ where: () => ({ limit: async () => matches }) }) }), insert: () => { inserts++; throw new Error("No insert allowed"); } }) };
    await assert.rejects(() => createQaFixture(fake as unknown as ToskerDatabase, "missing/ambiguous founder test"), /founder TID/);
    assert.equal(inserts, 0);
  }
  for (const retained of [true, false]) await assert.rejects(() => cleanupQaFixture({} as ToskerDatabase, { retained, slug: "ms73-founder-review-904a9dea" } as QaFixture, true), /NEVER automatically/);
  const candidate: PlaceCandidate = { title: "QA point", latitude: 1.2845, longitude: 103.858, source: "pin", provider: null, providerId: null, address: "", attribution: "", license: "" };
  const token = signCandidate(candidate, "qa-a", "owned-qa-room");
  assert.deepEqual(verifyCandidate(token, "qa-a", "owned-qa-room"), candidate);
  assert.throws(() => verifyCandidate(token, "qa-b", "owned-qa-room"));
  assert.throws(() => verifyCandidate(token, "qa-a", "unrelated-room"));
  assert.throws(() => verifyCandidate(token.slice(0, -5) + "wrong", "qa-a", "owned-qa-room"));
  const now = Date.now;
  try { Date.now = () => now() + 31 * 60 * 1000; assert.throws(() => verifyCandidate(token, "qa-a", "owned-qa-room")); } finally { Date.now = now; }
  const originalFetch = globalThis.fetch;
  const observed: { path: string; filter: string | null; bias: string | null; lat: string | null; lon: string | null }[] = [];
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "api.geoapify.com");
    observed.push({ path: url.pathname, filter: url.searchParams.get("filter"), bias: url.searchParams.get("bias"), lat: url.searchParams.get("lat"), lon: url.searchParams.get("lon") });
    return Response.json({ results: [
      { lat: 1.275689, lon: 103.842433, country_code: "sg", name: "QA address", formatted: "Public QA address", place_id: "qa-openaddresses", datasource: { attribution: "© OpenAddresses contributors", license: "BSD-3-Clause" }, unwanted: "RAW PAYLOAD NOT ALLOWED" },
      { lat: 2, lon: 104, country_code: "my", name: "Out of filter", datasource: { attribution: "source", license: "license" } },
      { lat: 1.3, lon: 103.8, country_code: "sg", name: "Unknown rights" },
    ] });
  };
  try {
    const provider = getPlaceProvider(), result = await provider.search("QA public address", new AbortController().signal);
    assert.equal(result.length, 1); assert.equal(result[0].license, "BSD-3-Clause"); assert(result[0].attribution.includes("OpenAddresses"));
    assert(!JSON.stringify(result).includes("RAW PAYLOAD"));
    assert.equal(observed[0].filter, "countrycode:sg"); assert.equal(observed[0].bias, "proximity:103.8198,1.3521");
    await provider.reverse(candidate.latitude, candidate.longitude, new AbortController().signal);
    assert.equal(observed[1].lat, "1.2845"); assert.equal(observed[1].lon, "103.858");
    globalThis.fetch = async () => { throw new Error("Simulated transport error containing a private URL"); };
    await assert.rejects(() => provider.search("QA query", new AbortController().signal), error => error instanceof Error && !error.message.includes("private URL") && error.message.includes("could not finish"));
  } finally { globalThis.fetch = originalFetch; }
  console.log("PASS zero/ambiguous founder abort before insert; retained Room cleanup prohibition; signed candidate actor/Room/tamper/expiry; provider subset/provenance/filter and sanitized failure. No provider requests made.");
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Candidate proof failed (sensitive details suppressed)"); process.exitCode = 1; });

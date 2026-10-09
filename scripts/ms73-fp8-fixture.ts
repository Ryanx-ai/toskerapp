/** New exact-owned FP8 fixture; never replay FP7 receipts or touch retained founder Rooms. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { getDatabase, type ToskerDatabase } from "../src/server/db/client";
import { createQaFixture, cleanupQaFixture, resolveQaActors } from "./lib/ms73-fixtures";
import { mutateTrip, readTrip } from "../src/server/trips/service";
const db = getDatabase(), path = ".git/fp8-recovery/fixture.json";
async function main() {
  const mode = process.argv[2]; assert(["--create", "--inspect", "--cleanup"].includes(mode));
  if (mode !== "--create") {
    const receipt = JSON.parse(readFileSync(path, "utf8")); console.log(await cleanupQaFixture(db, receipt.fixture, mode === "--cleanup")); return;
  }
  assert(!existsSync(path), "Existing FP8 receipt: recover it, never reseed"); mkdirSync(".git/fp8-recovery", { recursive: true, mode: 0o700 });
  const receipt = await db.transaction(async tx => {
    const d = tx as unknown as ToskerDatabase, { a } = await resolveQaActors(tx);
    const fixture = await createQaFixture(d, "FP8 disposable UI, private Ping, naming, replay, fresh short/long Route acceptance");
    let routeId: string | null = null;
    for (const [latitude, longitude] of [[1.3, 103.8], [1.306, 103.814], [1.2837, 103.8607]]) {
      await mutateTrip(d, a, { roomSlug: fixture.slug, expectedRevision: (await readTrip(d, a, fixture.slug)).revision, requestId: randomUUID(), command: { type: "add", routeId, candidate: { title: "Checkpoint", latitude, longitude, source: "pin", provider: null, providerId: null, address: "Synthetic FP8 QA point — not a verified venue", attribution: "QA fixture", license: "QA" } } });
      routeId = (await readTrip(d, a, fixture.slug)).routes[0].id;
    }
    return { fixture, routeId };
  });
  writeFileSync(path, JSON.stringify(receipt, null, 2), { mode: 0o600, flag: "wx" });
  console.log({ room: receipt.fixture.slug, founderIncluded: true, providerCalls: 0, disposable: true });
}
main().catch(error => { console.error({ failure: "FP8 fixture stopped", kind: error?.name, assertion: error instanceof assert.AssertionError ? error.message.split("\n")[0] : undefined }); process.exitCode = 1; }).finally(() => db.$client.end());

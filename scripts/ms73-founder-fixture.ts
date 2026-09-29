import assert from "node:assert/strict";
import { getDatabase } from "../src/server/db/client";
import { createQaFixture } from "./lib/ms73-fixtures";
const db = getDatabase();
async function main() {
  assert.equal(process.argv[2], "--create-founder-review", "Explicit retained-fixture creation required");
  const receipt = await createQaFixture(db, "Retained A/B Map + Location Cards + Routes + Board + Chat Founder Walk", true);
  console.log(JSON.stringify(receipt, null, 2));
  console.log("Founder resolved by exact TID and included. NEVER automatically clean this Room.");
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Founder fixture setup failed; no account fallback attempted."); process.exitCode = 1; }).finally(() => db.$client.end());

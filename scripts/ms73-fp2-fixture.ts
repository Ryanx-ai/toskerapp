import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getDatabase } from "../src/server/db/client";
import { cleanupQaFixture, type QaFixture } from "./lib/ms73-fixtures";
const db=getDatabase();
async function main(){
  assert(["--inspect","--cleanup-apply"].includes(process.argv[2]));
  const receipt=JSON.parse(readFileSync("docs/MS7-3-FP2-BROWSER-FIXTURE.json","utf8")) as QaFixture;
  assert.equal(receipt.purpose,"FP2 comments/retry/revocation/Nuke + browser acceptance");
  console.log(await cleanupQaFixture(db,receipt,process.argv[2]==="--cleanup-apply"));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:"Sanitized fixture inspection failure; retain and inspect");process.exitCode=1;}).finally(()=>db.$client.end());

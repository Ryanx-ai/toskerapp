/** Real protected Production HTTP denial boundaries; no location writes. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { protectedPost } from "./lib/ms74-protected-http";
const target=JSON.parse(readFileSync(".git/ms74-fp3/durable-app-stage.json","utf8"));
assert.equal(target.readyState,"READY");assert.equal(target.projectId,"prj_cxYhH8ypeFmuPOiEBC0gf0Rbzmau");assert.equal(target.canonical,false);
const db=getDatabase(),clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
let sessionId:string|undefined,stage="setup";const cases:string[]=[];
async function main(){
  const actors=await resolveQaActors(db),fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  sessionId=(await clerk.sessions.createSession({userId:actors.b.authSubject})).id;
  writeFileSync(".git/ms74-fp3/durable-api-privacy-intent.json",JSON.stringify({sessionId,origin:target.origin}),{mode:0o600});
  const token=(await clerk.sessions.getToken(sessionId)).jwt;
  async function check(name:string,body:object,expected:number,anonymous=false,origin=target.origin){
    stage=name;
    const {response}=await protectedPost(target.origin,"/api/location-sharing",anonymous?"":token,body,origin);
    assert.equal(response.status,expected);assert.match(response.headers.get("cache-control")??"",/no-store/);
    assert.match(response.headers.get("vary")??"",/Authorization/i);assert.equal(response.headers.get("x-content-type-options"),"nosniff");
    const value=await response.json();assert.deepEqual(Object.keys(value),["error"]);assert.equal(typeof value.error,"string");
    assert(value.error.length<200&&!JSON.stringify(value).includes(fixture.conversationId));cases.push(name);
  }
  const current={action:"current",conversationId:fixture.conversationId};
  await check("anonymous denied",current,401,true);
  await check("cross origin denied",current,403,false,"https://example.invalid");
  await check("array denied",[],400);
  await check("oversized input denied",{action:"current",conversationId:"x".repeat(1001)},400);
  await check("unknown field denied",{...current,extra:true},400);
  await check("invalid context denied",{action:"current",conversationId:"invalid"},400);
  await check("precise consent cannot reuse broad consent",{action:"begin",conversationId:fixture.conversationId,precision:"precise",consent:"area-latest-v2"},400);
  await check("unowned lease denied before projection",{action:"send",id:randomUUID(),point:{latitude:1.2834,longitude:103.8607,accuracy:50},expectedRevision:0,requestId:randomUUID()},403);
  await check("selected Subroom unauthorized viewer denied",{action:"current",conversationId:fixture.selectedChatId},403);
  await clerk.sessions.revokeSession(sessionId);
  await check("revoked session denied with still-valid JWT",current,401);
  const result={passed:true,cases,acceptedLocationWrites:0,providerLookups:0,protectedStage:true,sha:target.sha};
  writeFileSync(".git/ms74-fp3/durable-api-privacy.json",JSON.stringify(result),{mode:0o600});console.log(JSON.stringify(result));
}
main().catch(()=>{console.error(JSON.stringify({passed:false,stage,privateDetailsSuppressed:true}));process.exitCode=1;})
  .finally(async()=>{if(sessionId)await clerk.sessions.revokeSession(sessionId).catch(()=>{});await db.$client.end();});

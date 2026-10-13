/** Read-only compatibility smoke against the exact previously verified FP2A. */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFileSync,writeFileSync} from "node:fs";
import {createClerkClient} from "@clerk/backend";
import {Realtime} from "ably";
import {eq} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {rooms,roomMemberships} from "../src/server/db/schema";
import {resolveQaActors} from "./lib/ms73-fixtures";
import {liveChannel} from "../src/lib/live-contract";
const canonical=process.argv.includes("--canonical");
const origin=canonical?"https://toskerapp.vercel.app":"https://tosker-jx4c5rym4-pangea6.vercel.app";
const db=getDatabase(),cli="/Users/ryanc/.npm/_npx/69f9afb961c37556/node_modules/.bin/vercel";
let phase="ownership";
async function main(){
  const actors=await resolveQaActors(db),fixture=JSON.parse(readFileSync(".git/ms74-recovery/fixture.json","utf8"));
  assert.equal(fixture.run,"ms74-fp1-20261010");assert.equal(fixture.status,"committed");
  const [room]=await db.select().from(rooms).where(eq(rooms.id,fixture.roomId));
  assert(room&&room.ownerId===actors.a.userId&&room.slug===fixture.slug&&room.createdAt.toISOString()===fixture.createdAt);
  assert((await db.select().from(roomMemberships).where(eq(roomMemberships.roomId,room.id))).some(m=>m.userId===actors.founder.userId));
  const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
  assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  const sessions:string[]=[],clients:Realtime[]=[],checks:string[]=[];
  const request=async(role:number,path:string,body?:object,expected=200)=>{
    phase=`${role===0?"A":"B"} ${path}`;
    const token=await clerk.sessions.getToken(sessions[role]);
    const response=await new Promise<string>((resolve,reject)=>{
      const child=spawn(cli,["curl",path,"--deployment",origin,"--scope","pangea6","--","--config","-","--silent","--max-time","25","--write-out","\n%{http_code}"],{stdio:["pipe","pipe","pipe"]});
      let out="";child.stdout.on("data",value=>out+=value);child.stderr.resume();
      child.on("error",()=>reject(new Error("Request unavailable")));child.on("close",code=>code===0?resolve(out):reject(new Error("Request failed")));
      const row=(k:string,v:string)=>`${k} = ${JSON.stringify(v)}\n`;
      child.stdin.end(row("request",body?"POST":"GET")+row("header",`Authorization: Bearer ${token.jwt}`)+row("header",`Origin: ${origin}`)+row("header","Content-Type: application/json")+(body?row("data",JSON.stringify(body)):""));
    });
    const split=response.lastIndexOf("\n");assert.equal(Number(response.slice(split+1)),expected);
    return expected===200?JSON.parse(response.slice(0,split)):undefined;
  };
  try {
    for(const actor of [actors.a,actors.b])sessions.push((await clerk.sessions.createSession({userId:actor.authSubject})).id);
    for(const [i,actor] of [actors.a,actors.b].entries()){
      assert.equal((await request(i,"/api/live/join",{conversationId:fixture.conversationId})).authorized,true);
      const token=await request(i,"/api/realtime/token",{conversationId:fixture.conversationId});
      const cap=JSON.parse(token.capability);assert(!Object.keys(cap).some(k=>k.includes("*")));
      assert.deepEqual([...cap[liveChannel(fixture.conversationId)]].sort(),["presence","subscribe"]);
      const client=new Realtime({token:token.token,clientId:actor.userId,logLevel:0});clients.push(client);
      await client.channels.get(liveChannel(fixture.conversationId)).presence.enter();
      assert((await request(i,`/api/conversations/${fixture.conversationId}/messages`)).messages.length>0);
      const roster=await request(i,"/api/live/roster",{conversationId:fixture.conversationId,userIds:[actors.a.userId,actors.b.userId]});assert.equal(roster.participants.length,2);
    }
    const peers=await clients[1].channels.get(liveChannel(fixture.conversationId)).presence.get();
    assert([actors.a.userId,actors.b.userId].every(id=>peers.some(p=>p.clientId===id)));checks.push("A/B real scoped presence and retained Chat/roster reads");
    for(const path of ["/api/live/join","/api/realtime/token"])await request(1,path,{conversationId:fixture.selectedChatId},403);
    checks.push("selected Subroom denial; no wildcard capability");
    await request(0,"/api/location-sharing",{action:"begin",conversationId:fixture.conversationId,precision:"area",consent:"area-snapshot-v1"},404);
    checks.push("FP2A has no location sharing endpoint");
    if(process.argv.includes("--provider")){
      const search=await request(0,`/api/trips/${fixture.slug}/places`,{kind:"search",query:"Marina Bay Sands"});assert(search.candidates?.some((c:{candidate:{provider:string}})=>c.candidate.provider==="geoapify"));
      checks.push("existing server provider credential works; one bounded query, no save");
    }
    phase="A Leave preserves B after peer propagation";
    await clients[0].channels.get(liveChannel(fixture.conversationId)).presence.leave();
    await new Promise(resolve=>setTimeout(resolve,1000));
    const remaining=await clients[1].channels.get(liveChannel(fixture.conversationId)).presence.get();
    assert(remaining.some(p=>p.clientId===actors.b.userId)&&!remaining.some(p=>p.clientId===actors.a.userId));checks.push("A Leave preserves B");
  } finally {
    for(const client of clients){await client.channels.get(liveChannel(fixture.conversationId)).presence.leave().catch(()=>{});client.close();}
    for(const id of sessions)await clerk.sessions.revokeSession(id);
  }
  const receipt={pass:true,origin,expectedSha:"3e06bf9e5c9ec09ee0c3dedb82e5e7088cc41161",at:new Date().toISOString(),checks,retainedContentWrites:0,providerRequests:process.argv.includes("--provider")?1:0,sessionsRevoked:true};
  writeFileSync(`.git/ms74-fp3/p0-rollback-${canonical?"canonical":"preflight"}.json`,JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));
}
main().catch(error=>{console.error(JSON.stringify({pass:false,phase,kind:error?.name,detail:error instanceof assert.AssertionError?error.message.split("\n")[0]:"Private details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());

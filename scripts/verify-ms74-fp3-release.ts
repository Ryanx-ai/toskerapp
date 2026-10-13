/** Bounded canonical SDK/API smoke. Synthetic public landmark; isolated QA only. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { Realtime, Rest } from "ably";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { rooms, roomMemberships } from "../src/server/db/schema";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { liveChannel } from "../src/lib/live-contract";
import { userChannel, conversationChannel } from "../src/lib/realtime-contract";
import { LOCATION_SNAPSHOT, LOCATION_RETIRED, validLocationSnapshot } from "../src/lib/shared-location-contract";

const db = getDatabase(), origin = process.env.FP3_VERIFY_ORIGIN ?? "https://toskerapp.vercel.app";
const deployment = JSON.parse(readFileSync(process.env.FP3_DEPLOYMENT_RECEIPT ?? ".git/ms74-fp3/deployment.json", "utf8"));
assert(["http://localhost:3000", "https://toskerapp.vercel.app", `https://${deployment.url}`].includes(origin));
const expectedSha = deployment.sha;
let phase = "ownership";
async function main() {
  assert.equal(deployment.sha, expectedSha); assert.equal(deployment.readyState, "READY");
  assert.equal(deployment.projectId, "prj_cxYhH8ypeFmuPOiEBC0gf0Rbzmau");
  if(origin==="https://toskerapp.vercel.app") assert(deployment.alias.includes("toskerapp.vercel.app"));
  assert(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal(fixture.run, "ms74-fp1-20261010"); assert.equal(fixture.status, "committed");
  const [room] = await db.select().from(rooms).where(eq(rooms.id, fixture.roomId));
  assert(room && room.ownerId === actors.a.userId && room.slug === fixture.slug && room.createdAt.toISOString() === fixture.createdAt);
  assert((await db.select().from(roomMemberships).where(eq(roomMemberships.roomId, room.id))).some(m => m.userId === actors.founder.userId));
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const sessions: string[] = [], clients: Realtime[] = [], checks: string[] = [];
  let activeLease: string | undefined;
  const request = async (role: number, path: string, body?: object, expected = 200) => {
    phase = `${role === 0 ? "A" : "B"} ${path}`;
    const token = await clerk.sessions.getToken(sessions[role]);
    const response = process.env.FP3_VERCEL_CURL ? await new Promise<Response>((resolve,reject)=>{
      // Credentials travel on stdin, never command arguments or persisted files.
      const child=spawn(process.env.FP3_VERCEL_CURL!,["curl",path,"--deployment",origin,"--scope","pangea6","--","--config","-","--silent","--max-time","25","--include"],{stdio:["pipe","pipe","pipe"]});
      let output=""; child.stdout.on("data",chunk=>output+=chunk); child.stderr.resume();
      child.on("error",()=>reject(new Error("Protected request unavailable")));
      child.on("close",code=>{
        if(code!==0)return reject(new Error("Protected request failed"));
        const boundary=output.indexOf("\r\n\r\n");
        const lines=output.slice(0,boundary).split("\r\n");
        const status=Number(lines.shift()?.split(" ")[1]);
        const headers=new Headers(); for(const line of lines){const split=line.indexOf(":");if(split>0)headers.append(line.slice(0,split),line.slice(split+1).trim());}
        resolve(new Response(output.slice(boundary+4),{status,headers}));
      });
      const entry=(name:string,value:string)=>`${name} = ${JSON.stringify(value)}\n`;
      child.stdin.end(entry("request",body?"POST":"GET")+entry("header",`Authorization: Bearer ${token.jwt}`)+entry("header",`Origin: ${origin}`)+entry("header","Content-Type: application/json")+(body?entry("data",JSON.stringify(body)):""));
    }) : await fetch(origin + path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token.jwt}`, Origin: origin, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    assert.equal(response.status, expected, `Expected ${expected}, received ${response.status}`);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    return response.json();
  };
  const location = (role: number, body: object, expected = 200) => request(role, "/api/location-sharing", body, expected);
  const wait = async (predicate: () => boolean, label: string) => {
    const deadline = Date.now() + 12000;
    while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
    assert(predicate(), label);
  };
  try {
    for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
    for (const [i, actor] of [actors.a, actors.b].entries()) {
      assert.equal((await request(i, "/api/live/join", { conversationId: fixture.conversationId })).authorized, true);
      const token = await request(i, "/api/realtime/token", { conversationId: fixture.conversationId });
      const capabilities = JSON.parse(token.capability);
      assert.deepEqual([...capabilities[liveChannel(fixture.conversationId)]].sort(), ["presence", "subscribe"]);
      assert(!Object.keys(capabilities).some(k => k.includes("*")));
      const client = new Realtime({ token: token.token, clientId: actor.userId, logLevel: 0 }); clients.push(client);
      await client.channels.get(liveChannel(fixture.conversationId)).presence.enter();
    }
    const presence = await clients[1].channels.get(liveChannel(fixture.conversationId)).presence.get();
    assert([actors.a.userId, actors.b.userId].every(id => presence.some(p => p.clientId === id)));
    checks.push("canonical A/B scoped realtime presence; no wildcard grants");
    for (const path of ["/api/live/join", "/api/realtime/token"]) await request(1, path, { conversationId: fixture.selectedChatId }, 403);
    await location(1, { action: "begin", conversationId: fixture.selectedChatId, precision: "area", consent: "area-snapshot-v1" }, 403);
    checks.push("selected Subroom B denial for Join/token/location");
    const feed = clients[1].channels.get(userChannel(actors.b.userId));
    const snapshots: Array<Record<string, unknown>> = [], retired: Array<Record<string, unknown>> = [];
    const observed: Array<{name: string | undefined; type: string; keys: string[]}> = [];
    await feed.subscribe(message => { observed.push({name:message.name,type:typeof message.data,keys:message.data && typeof message.data === "object" ? Object.keys(message.data) : []}); });
    await feed.subscribe(LOCATION_SNAPSHOT, message => snapshots.push(message.data));
    await clients[1].channels.get(conversationChannel(fixture.conversationId)).subscribe(LOCATION_RETIRED, message => retired.push(message.data));
    assert.equal(feed.state,"attached");
    if(process.argv.includes("--transport-probe")) {
      phase="diagnostic non-sensitive ephemeral transport";
      const publisher=new Rest({key:process.env.ABLY_API_KEY,logLevel:0,httpRequestTimeout:5000});
      await publisher.channels.get(userChannel(actors.b.userId)).publish({name:"release.probe",data:{version:1},extras:{ephemeral:true}});
      await wait(()=>observed.some(m=>m.name==="release.probe"),"Existing local key reaches canonical-token subscriber");
      console.log(JSON.stringify({transportProbe:true,canonicalTokenAndExistingLocalPublisherSameApplication:true}));
      return;
    }
    const point = { latitude: 1.2834, longitude: 103.8607, accuracy: 50 };
    for (const precision of ["area", "precise"] as const) {
      const lease = await location(0, { action: "begin", conversationId: fixture.conversationId, precision, consent: `${precision === "area" ? "area" : "precise"}-snapshot-v1` });
      activeLease = lease.id; assert.equal(lease.audienceCount, 2);
      const sent = await location(0, { action: "send", id: lease.id, point });
      assert(validLocationSnapshot(sent)); assert.equal(sent.source, "ura"); assert.equal(sent.label, "Singapore Central");
      if (precision === "area") assert.equal(sent.point, undefined); else assert.deepEqual(sent.point, point);
      if(process.argv.includes("--delivery-probe")) {
        phase="diagnostic identical ephemeral message shape";
        const publisher=new Rest({key:process.env.ABLY_API_KEY,logLevel:0,httpRequestTimeout:5000});
        await publisher.channels.get(userChannel(actors.b.userId)).publish({id:randomUUID(),name:LOCATION_SNAPSHOT,data:sent,extras:{ephemeral:true}});
        await wait(()=>snapshots.some(s=>s.id===lease.id),"Direct authorized synthetic delivery");
        console.log(JSON.stringify({deliveryProbe:true,identicalMessageShapeDelivered:true,source:"local server SDK",observedTypes:observed.map(m=>({name:m.name,type:m.type}))}));
        return;
      }
      try { await wait(() => snapshots.some(s => s.id === lease.id), "B receives ephemeral snapshot"); }
      catch(error) { console.log(JSON.stringify({diagnostic:"snapshot receipt",connection:clients[1].connection.state,feed:feed.state,observed,snapshotCount:snapshots.length,matchingIds:snapshots.map(s=>s.id===lease.id)})); throw error; }
      const peer = snapshots.find(s => s.id === lease.id)!;
      assert(validLocationSnapshot(peer)); assert.equal(peer.precision, precision);
      assert.equal((await location(1, { action: "validate", id: lease.id, conversationId: fixture.conversationId })).precision, precision);
      await location(1, { action: "send", id: lease.id, point }, 403);
      const refresh = await location(0, { action: "send", id: lease.id, point }); assert.equal(refresh.expiresAt, lease.expiresAt);
      await location(0, { action: "stop", id: lease.id }); activeLease = undefined;
      await wait(() => retired.some(s => s.id === lease.id), "B receives retirement");
      await location(1, { action: "validate", id: lease.id, conversationId: fixture.conversationId }, 403);
      checks.push(`${precision}: explicit consent, B delivery, fixed refresh expiry, forged sender denied, Stop invalidates`);
    }
    assert((await request(0, `/api/conversations/${fixture.conversationId}/messages`)).messages.length > 0);
    if(!process.argv.includes("--skip-provider")) {
    const search = await request(0, `/api/trips/${fixture.slug}/places`, { kind: "search", query: "Tokyo Tower" });
    assert(search.candidates?.some((c: { candidate: { provider: string; longitude: number } }) => c.candidate.provider === "geoapify" && c.candidate.longitude > 130));
    checks.push("retained Chat readable; canonical worldwide server-provider search; no automatic save");
    }
    await clients[0].channels.get(liveChannel(fixture.conversationId)).presence.leave();
    const remaining = await clients[1].channels.get(liveChannel(fixture.conversationId)).presence.get();
    assert(remaining.some(p => p.clientId === actors.b.userId)); assert(!remaining.some(p => p.clientId === actors.a.userId));
    checks.push("A Leave preserves B presence");
  } finally {
    if (activeLease) await location(0, { action: "stop", id: activeLease }).catch(() => {});
    for (const client of clients) { await client.channels.get(liveChannel(fixture.conversationId)).presence.leave().catch(() => {}); client.close(); }
    for (const id of sessions) await clerk.sessions.revokeSession(id);
  }
  const receipt = { pass: true, origin, expectedSha, at: new Date().toISOString(), checks, providerRequests: process.argv.includes("--skip-provider")?0:1, syntheticOnly: true, retainedContentWrites: 0, isolatedSessionsRevoked: true };
  const target=origin==="http://localhost:3000"?"local-production":origin==="https://toskerapp.vercel.app"?"canonical":"staged";
  writeFileSync(`.git/ms74-fp3/${target}-api.json`, JSON.stringify(receipt, null, 2), { mode: 0o600 }); console.log(JSON.stringify(receipt));
}
main().catch(error => {
  const result={ pass:false, phase, kind:error?.name, detail:error instanceof assert.AssertionError ? error.message.split("\n")[0] : "Private details suppressed", at:new Date().toISOString() };
  writeFileSync(".git/ms74-fp3/canonical-failure.json",JSON.stringify(result,null,2),{mode:0o600});
  console.error(result); process.exitCode=1;
}).finally(() => db.$client.end());

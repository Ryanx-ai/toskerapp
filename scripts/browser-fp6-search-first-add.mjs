/** Provider-independent UI acceptance. Only exact isolated A Sandbox/owned FP6 Room may mutate. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {and,eq} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client.ts";
import {conversations} from "../src/server/db/schema.ts";
import {readTrip,mutateTrip} from "../src/server/trips/service.ts";
import {signCandidate} from "../src/server/maps/candidate-token.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const db=getDatabase(),{a}=await resolveQaActors(db),[sandbox]=await db.select().from(conversations).where(and(eq(conversations.kind,"sandbox"),eq(conversations.ownerId,a.userId)));
assert(sandbox);const scope=`sandbox--${sandbox.id}`,before=await readTrip(db,a,scope);assert.equal(before.routes.length,0,"Stop: QA Sandbox is not empty");
const browser=await chromium.connectOverCDP(process.env.FP6_CDP),page=browser.contexts()[0].pages()[0];
const button=name=>page.getByRole("button",{name,exact:true}),search=()=>page.getByRole("textbox",{name:"Search places",exact:true});
const calls=[],failed=[],created=[];let loseAck=false,ackLost=false;
const candidate=title=>({title,source:"search",provider:"qa",providerId:`fp6-offline-${title}`,latitude:1.2837,longitude:103.8607,address:"Synthetic acceptance result · Singapore",attribution:"QA only",license:"QA"});
await page.route("**/api/trips/*/roads",r=>r.fulfill({status:503,json:{error:"QA road firewall: no external call"}}));
await page.route("**/api/trips/*/places",async r=>{
  const body=r.request().postDataJSON(),target=decodeURIComponent(new URL(r.request().url()).pathname.split("/")[3]);assert([scope,fixture.slug].includes(target));
  calls.push({kind:body.kind,query:body.query,at:Date.now()});
  if(body.kind==="context"){await r.continue();return;}
  const title=body.query==="JB"?"Johor Bahru QA":body.query==="older"?"Obsolete QA result":"Marina Bay Sands QA result";
  if(body.query==="older")await new Promise(resolve=>setTimeout(resolve,1800));
  const c=candidate(title);await r.fulfill({json:{candidates:[{candidate:c,token:signCandidate(c,a.userId,target)}]}}).catch(()=>{});
});
page.on("requestfailed",r=>{if(r.url().includes("/places"))failed.push(r.postDataJSON()?.query);});
await page.route("http://localhost:3000/**",async r=>{
  const req=r.request();if(loseAck&&!ackLost&&req.method()==="POST"&&req.headers()["next-action"]&&req.postData()?.includes('"type":"add"')){await r.fetch();ackLost=true;await r.abort("failed");return;}await r.fallback();
});
try{
  await page.setViewportSize({width:1440,height:900});await page.goto(`http://localhost:3000/room/${fixture.slug}`);await ensureFp6QaLogin(page);await page.goto(`http://localhost:3000/room/${fixture.slug}`);await page.locator('[data-place-id]').first().waitFor();
  const started=Date.now();await search().fill("MBS");await page.getByRole("button",{name:/QA Marina Bay Sands.*In this context/}).waitFor();const localMs=Date.now()-started;
  assert(localMs<450,`Local suggestions took ${localMs}ms`);assert.equal(await search().inputValue(),"MBS");await page.getByText(/Searching for Marina Bay Sands/).waitFor();
  await search().fill("");await search().pressSequentially("Jewel",{delay:35});await page.waitForTimeout(250);assert.equal(calls.length,0);await page.waitForTimeout(500);assert.equal(calls.filter(c=>c.kind==="search").length,1);
  await search().fill("older");await page.waitForTimeout(1300);await search().fill("JB");await page.getByText(/Searching for Johor Bahru/).waitFor();await page.getByRole("button",{name:/Johor Bahru QA/}).waitFor();await page.waitForTimeout(1900);
  assert.equal(await page.getByRole("button",{name:/Obsolete QA result/}).count(),0);assert(failed.includes("older"));assert.equal(calls.filter(c=>c.query==="JB").length,1);
  assert.equal(await button("Add to Route").count(),0);console.log({search:"PASS",localSuggestionMs:localMs,debouncedRequests:1,cancelledStale:true,duplicateInflight:false,explicitSelection:true});
  await page.getByRole("link",{name:"tosker.user.a+clerk_test's Sandbox",exact:true}).click();await page.getByRole("heading",{name:"tosker.user.a+clerk_test's Sandbox",exact:true}).waitFor();await page.getByText("Search or pin a place. Your first add creates Route 1.",{exact:true}).waitFor();
  await search().fill("MBS");await page.getByRole("button",{name:/Marina Bay Sands QA result/}).click();await page.getByRole("region",{name:"Place preview",exact:true}).waitFor();
  assert.equal((await readTrip(db,a,scope)).routes.length,0);await page.getByText("Route 1 will be created when you add.",{exact:true}).waitFor();
  loseAck=true;await button("Add to Route").evaluate(e=>{e.click();e.click();});await button("Retry same change").waitFor({timeout:25000});assert(ackLost);
  const first=await readTrip(db,a,scope);assert.equal(first.routes.length,1);assert.equal(first.places.length,1);assert.equal(first.routes[0].name,"Route 1");created.push(first.routes[0].id);
  writeFileSync(".git/fp6-recovery/first-add.json",JSON.stringify({scope,routeId:first.routes[0].id,placeId:first.places[0].id,owner:a.userId,disposable:true}),{mode:0o600});
  await button("Retry same change").click();await page.locator('[data-place-id]').first().waitFor();const replay=await readTrip(db,a,scope);assert.equal(replay.revision,first.revision);assert.equal(replay.places.length,1);
  console.log("PASS actual empty Sandbox -> preview -> explicit Add; atomic Route1; double click and lost acknowledgement retry create one card only");
  // Exact newly-created QA route only. No retained Sandbox/profile/conversation deletion.
  await mutateTrip(db,a,{roomSlug:scope,expectedRevision:replay.revision,requestId:randomUUID(),command:{type:"nuke-route",routeId:first.routes[0].id}});created.length=0;
  const base=await readTrip(db,a,scope),input={roomSlug:scope,expectedRevision:base.revision,command:{type:"add",routeId:null,candidate:candidate("Concurrent QA")}};
  const races=await Promise.allSettled([mutateTrip(db,a,{...input,requestId:randomUUID()}),mutateTrip(db,a,{...input,requestId:randomUUID()})]);assert.equal(races.filter(r=>r.status==="fulfilled").length,1);
  const winner=await readTrip(db,a,scope);assert.equal(winner.routes.length,1);assert.equal(winner.places.length,1);created.push(winner.routes[0].id);
  await mutateTrip(db,a,{roomSlug:scope,expectedRevision:winner.revision,requestId:randomUUID(),command:{type:"nuke-route",routeId:winner.routes[0].id}});created.length=0;assert.equal((await readTrip(db,a,scope)).routes.length,0);
  console.log("PASS concurrent first Add serializes to one Route1/card; exact new QA routes removed, parent Sandbox retained");
}catch(e){await page.screenshot({path:".git/fp6-recovery/search-failure.png"});console.error({failure:"FP6 search/first Add",message:String(e.message).slice(0,1000),ownedRoutesRetained:created});process.exitCode=1;}
finally{await page.unrouteAll({behavior:"wait"});await browser.close();await db.$client.end();}

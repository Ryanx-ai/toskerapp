/** Current-wave isolated A/B, synthetic GPS, bounded budget; never hosted/founder browser. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {fp4Budget} from "./lib/ms74-fp4-budget.mjs";
import {neon} from "@neondatabase/serverless";
import {spawn} from "node:child_process";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {loginFp4} from "./lib/ms74-fp4-browser.mjs";
import {installLiveMetrics} from "./lib/ms74-browser.mjs";
const env=reviewEnvironment(),sql=neon(env.DATABASE_URL),origin="http://localhost:3000";
const mode=process.argv[2]??"all";assert(["all","expiry","session","membership","contexts"].includes(mode));
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(fixture.project,REVIEW_PROJECT);assert.equal(fixture.run,"ms74-fp4-20261026");
const approval=JSON.parse(readFileSync(".git/ms74-fp4/capacity-approval.json","utf8"));assert(Date.now()<Date.parse(approval.expiresAt));
const reserve=mode==="all"?500:mode==="expiry"?350:150;
const budget=await fp4Budget({reads:reserve,consents:4,minutes:15}),{day,used}=budget;
const directory=".git/ms74-fp4/browser",receipt=`${directory}/privacy-${Date.now()}.json`;
const evidence={pass:false,mode,day,budgetBefore:budget,at:new Date().toISOString(),isolated:true,synthetic:true,mockedBasemap:true,requests:{begin:0,current:0,send:0,stop:0},responseStatuses:{},cases:[],errors:[],cleanupErrors:0};
const save=()=>writeFileSync(receipt,JSON.stringify(evidence,null,2),{mode:0o600});const record=(name,values={})=>{evidence.cases.push({name,...values});save();console.log(JSON.stringify({gate:name,...values}));};
const counts=async()=> (await sql`select (select count(*)::int from location_latest) payloads,(select count(*)::int from location_shares where expires_at>clock_timestamp()) active,(select count(*)::int from location_cleanup_workers where ends_at>clock_timestamp()) workers`)[0];
assert.deepEqual(await counts(),{payloads:0,active:0,workers:1});
const [worker]=await sql`select ends_at>clock_timestamp()+interval '10 minutes' as enough from location_cleanup_workers`;
assert(worker?.enough,"Start only when the supervised worker has enough time for sign-in, consent and cleanup");
const browser=await chromium.launch({headless:true}),contexts=[],pages=[];let step="normal sign-in";
const memberTag=`browser-${Date.now()}`;let memberRemoved=false;
const membership=action=>new Promise((resolve,reject)=>{const c=spawn(process.execPath,["--conditions=react-server","--import","tsx","scripts/ms74-fp3-review-membership.ts",action,memberTag,"--fp4"],{env,stdio:["ignore","pipe","pipe"]});c.on("error",reject);c.on("exit",code=>code===0?resolve():reject(Error("Membership helper failed; inspect exact receipt")));});
const locate=p=>p.getByRole("button",{name:"Locate",exact:true}),marker=p=>p.locator('[aria-label*="shared a temporary position"]'),peers=p=>p.getByRole("list",{name:"Shared location snapshots"});
const response=(p,action)=>p.waitForResponse(r=>new URL(r.url()).pathname==="/api/location-sharing"&&r.request().postDataJSON()?.action===action,{timeout:45000});
async function share(p,precision){assert.equal(await locate(p).getAttribute("aria-pressed"),"false");await locate(p).click();await p.getByRole("heading",{name:"Share your location with this conversation?",exact:true}).waitFor();assert(await p.getByRole("radio",{name:"Broad area only (default)",exact:true}).isChecked());if(precision==="precise")await p.getByRole("radio",{name:"Precise position on peers’ Maps",exact:true}).check();const sent=response(p,"send");await p.getByRole("button",{name:precision==="precise"?"Share precise position":"Share broad area",exact:true}).click();assert.equal((await sent).status(),200);}
async function stop(p){const ack=response(p,"stop");await locate(p).click();assert.equal((await ack).status(),200);assert.equal(await locate(p).getAttribute("aria-pressed"),"false");}
async function removal(p,action){await p.evaluate(()=>{window.__fp4RemovalStart=performance.now();window.__fp4Removal=new Promise(resolve=>{const ob=new MutationObserver(()=>{if(!document.querySelector('[aria-label*="shared a temporary position"]')){ob.disconnect();resolve(performance.now()-window.__fp4RemovalStart);}});ob.observe(document.body,{childList:true,subtree:true});});});await action();await marker(p).waitFor({state:"detached",timeout:10000});return Math.round(await p.evaluate(()=>window.__fp4Removal));}
try{
 for(const actor of ["a","b"]){const c=await browser.newContext({viewport:{width:1440,height:1000},geolocation:{latitude:1.2834,longitude:103.8607,accuracy:50},permissions:["geolocation"]});contexts.push(c);await installLiveMetrics(c);
  await c.route("**/*geoapify.com/**",r=>new URL(r.request().url()).pathname.endsWith("style.json")?r.fulfill({json:{version:8,sources:{},layers:[{id:"qa",type:"background",paint:{"background-color":"#dce8e4"}}]}}):r.abort());
  await c.route("**/api/location-sharing",r=>{const action=r.request().postDataJSON()?.action;if(!(action in evidence.requests))return r.continue();if((action==="begin"&&used.begin+evidence.requests.begin>=20)||(action==="current"&&used.current+evidence.requests.current>=800))return r.abort();evidence.requests[action]++;save();return r.continue();});
  const p=await c.newPage();pages.push(p);p.on("pageerror",e=>evidence.errors.push(e.name));p.on("response",r=>{if(new URL(r.url()).pathname==="/api/location-sharing"){const key=`${r.request().postDataJSON()?.action}:${r.status()}`;evidence.responseStatuses[key]=(evidence.responseStatuses[key]??0)+1;}});await loginFp4(p,actor,fixture,origin);assert.equal(await locate(p).getAttribute("aria-pressed"),"false");assert.equal(await p.getByRole("button",{name:"Share location",exact:true}).count(),0);
 }
 const [a,b]=pages;record("Normal isolated A/B sign-in; single Locate; explicit synthetic GPS; bounded requests");
 if(mode==="all"){
 step="broad delivery and companion continuity";await share(a,"area");await peers(b).waitFor({timeout:30000});assert.equal(await marker(b).count(),0);
 const area=await sql`select latitude is null and longitude is null and accuracy is null as coarse from location_latest`;assert(area.length===1&&area[0].coarse);
 await a.locator('[data-surface-trigger="chat"]').click();const chat=a.locator('[data-workspace-pane="chat"]');await chat.getByText("Loading messages…",{exact:true}).waitFor({state:"hidden"});await chat.getByPlaceholder("Message…",{exact:true}).fill("Synthetic unsent FP4 continuity check");
 await a.locator('[data-surface-trigger="hall"]').click();await a.locator('[data-surface-trigger="chat"]').click();assert.equal(await chat.getByPlaceholder("Message…",{exact:true}).inputValue(),"Synthetic unsent FP4 continuity check");await a.getByRole("button",{name:"Close Chat companion",exact:true}).click();assert(await peers(b).isVisible());
 await stop(a);await peers(b).waitFor({state:"detached",timeout:10000});record("A→B broad contains no precise fields; Chat/Board toggles retain consent and draft; Stop clears");
 step="precise reverse delivery and Stop";await share(b,"precise");await marker(a).waitFor({timeout:30000});const stoppedMs=await removal(a,()=>stop(b));assert(stoppedMs<=5000);record("B→A precise explicit consent; Locate OFF removes peer",{ms:stoppedMs});
 step="receiver reload/reconnect";await share(a,"precise");await marker(b).waitFor({timeout:30000});await b.reload({waitUntil:"domcontentloaded"});await marker(b).waitFor({timeout:30000});
 const networkMs=await removal(b,async()=>{await contexts[1].setOffline(true);await b.evaluate(()=>window.__liveQa.cut());});assert(networkMs<=5000);
 await contexts[1].setOffline(false);await b.evaluate(()=>{window.__liveQa.restore();window.dispatchEvent(new Event("online"));});await marker(b).waitFor({timeout:30000});await stop(a);await marker(b).waitFor({state:"detached",timeout:10000});record("Authorized receiver reload/reconnect; network loss clears marker; no resurrection after Stop",{networkMs});
 }
 if(mode==="all"||mode==="expiry"){
 step="expiry share";await share(b,"precise");step="expiry receiver";await marker(a).waitFor({timeout:30000});step="expiry timestamp";const expiryRows=await sql`select expires_at from location_shares where conversation_id=${fixture.conversationId}::uuid and expires_at>clock_timestamp()`;assert.equal(expiryRows.length,1);const expiry=Date.parse(expiryRows[0].expires_at);assert(expiry>Date.now()&&expiry<Date.now()+300001);step="five-minute expiry";
 while(Date.now()<expiry+8000){const remaining=Math.max(0,Math.ceil((expiry-Date.now())/1000));const present=await marker(a).count()>0;if(!present&&remaining>5)evidence.earlyFailClosedRemoval=true;console.log(JSON.stringify({gate:"Waiting for database-clock expiry; early peer removal is not physical expiry",remainingSeconds:remaining,peerPresent:present}));await new Promise(r=>setTimeout(r,Math.min(30000,expiry+8000-Date.now())));}
 assert.equal(await marker(a).count(),0);await new Promise((resolve,reject)=>{const deadline=Date.now()+15000;const poll=async()=>{try{if((await counts()).payloads===0)return resolve();if(Date.now()>deadline)return reject(Error("Physical expiry deadline"));setTimeout(poll,1000);}catch(e){reject(e);}};void poll();});
 const expiryState={payloads:(await counts()).payloads,peerMarkers:await marker(a).count(),locatePressed:await locate(b).getAttribute("aria-pressed"),privateOrigins:await b.locator('[data-private-origin]').count()};
 record("Observed expiry state; sender assertions remain separate",expiryState);
 assert.equal(expiryState.payloads,0);step="private Locate expiry";assert.equal(expiryState.locatePressed,"false");step="private origin expiry";assert.equal(expiryState.privateOrigins,0);record("No peer after actual five-minute expiry and supervised physical deletion; stale private fix/origin also expires",{continuousPeerVisibilityCertified:!evidence.earlyFailClosedRemoval});
 await locate(b).click();await b.getByRole("heading",{name:"Share your location with this conversation?",exact:true}).waitFor();assert(await b.getByRole("radio",{name:"Broad area only (default)",exact:true}).isChecked());await b.getByRole("button",{name:"Keep private",exact:true}).click();assert.equal((await counts()).active,0);await locate(b).click();record("Renewal requires fresh consent; broad default; Keep private creates no active share");
 }
 if(mode==="session"){
  step="session logout";await share(a,"precise");await marker(b).waitFor({timeout:30000});let result;
  const ms=await removal(b,async()=>{result=await a.evaluate(async conversationId=>{const token=await window.Clerk.session.getToken(),headers={"Content-Type":"application/json",Authorization:`Bearer ${token}`};const out=await fetch("/api/realtime/logout",{method:"POST",headers});const old=await fetch("/api/location-sharing",{method:"POST",headers,body:JSON.stringify({action:"current",conversationId})});return {logout:out.status,oldToken:old.status};},fixture.conversationId);});
  assert.equal(result.logout,200);assert([401,403].includes(result.oldToken));assert(ms<=5000);record("Session logout revokes old token and removes peer",{...result,ms});
 }
 if(mode==="membership"){
  step="membership revoke";await share(b,"precise");await marker(a).waitFor({timeout:30000});memberRemoved=true;
  const ms=await removal(a,()=>membership("--remove-b"));assert.equal((await counts()).payloads,0);
  await b.reload({waitUntil:"domcontentloaded"});assert.equal(await locate(b).count(),0);
  await membership("--restore-b");memberRemoved=false;record("Actual Room member withdrawal removes location and denies Room; original QA rows restored; founder stable",{operationAndRemovalMs:ms,boundedTimingNotCertified:ms>5000});
 }
 if(mode==="contexts"){
  const go=async(p,path)=>{await p.goto(`${origin}${path}`,{waitUntil:"domcontentloaded"});await p.locator('[data-map-state="ready"]').waitFor({timeout:60000});await locate(p).waitFor();};
  step="selected Subroom isolation";await go(a,`/room/${fixture.slug}/subroom/${fixture.selectedId}/map`);await share(a,"precise");const r=await response(b,"current");assert.equal(r.status(),200);assert.equal((await r.json()).peers.length,0);
  await b.goto(`${origin}/room/${fixture.slug}/subroom/${fixture.selectedId}/map`,{waitUntil:"domcontentloaded"});await b.getByText("404",{exact:true}).waitFor();assert.equal(await locate(b).count(),0);await stop(a);record("Selected Subroom share is absent from Room and unauthorized B receives404");
  step="Sandbox private";await go(a,"/personal/my-room/map");const before=evidence.requests.begin;await locate(a).click();await a.locator('[aria-label="You, accuracy about 50 metres. Visible only to you."]').waitFor();assert.equal(await a.getByRole("heading",{name:"Share your location with this conversation?",exact:true}).count(),0);assert.equal(evidence.requests.begin,before);await locate(a).click();assert.equal(await a.locator('[data-private-origin]').count(),0);record("Sandbox synthetic Locate stays private, no consent/publication, OFF removes origin");
 }
 assert.deepEqual(evidence.errors,[]);evidence.pass=true;
}catch(e){evidence.failedStep=step;evidence.failureType=e.name;evidence.failureLine=e.stack?.match(/browser-ms74-fp4-location\.mjs:(\d+):\d+/)?.[1];process.exitCode=1;console.error(JSON.stringify({failedStep:step,failureType:e.name,line:evidence.failureLine}));}
finally{
 if(memberRemoved){try{const saved=JSON.parse(readFileSync(`.git/ms74-fp4/review-membership-test-${memberTag}.json`,"utf8"));if(saved.status==="removed")await membership("--restore-b");else if(saved.status!=="restored")throw Error("Inspect prepared membership receipt");}catch{evidence.cleanupErrors++;}}
 for(const c of contexts)await c.setOffline(false).catch(()=>{});
 // Keep request accounting installed through teardown; Stop/logout are never budget-blocked.
 for(const p of pages){if(await locate(p).getAttribute("aria-pressed").catch(()=>null)==="true")await stop(p).catch(()=>{});await p.evaluate(async()=>{if(window.Clerk?.session?.status==="active"){const r=await fetch("/api/realtime/logout",{method:"POST"});if(![200,401,403].includes(r.status))throw Error("QA logout failed");await window.Clerk.signOut();}}).catch(()=>evidence.cleanupErrors++);}
 await browser.close();evidence.finalCounts=await counts();evidence.budgetAfter=await fp4Budget();if(evidence.cleanupErrors||evidence.finalCounts.payloads||evidence.finalCounts.active){evidence.pass=false;process.exitCode=1;}save();console.log(JSON.stringify({...evidence,receipt}));
}

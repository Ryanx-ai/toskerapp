/** Fresh real roads, selected reviewed provider identities, exact disposable QA ownership. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {and,eq} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client.ts";
import {conversations} from "../src/server/db/schema.ts";
import {readTrip,mutateTrip} from "../src/server/trips/service.ts";
import {resolveQaActors} from "./lib/ms73-fixtures.ts";
import {routingPlaces} from "../src/lib/trip-contract.ts";
import {roadDistance,roadDuration} from "../src/lib/maps/road-contract.ts";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {ensureFp6QaLogin} from "./lib/fp6-browser.mjs";
const {fixture}=JSON.parse(readFileSync('.git/fp6-recovery/fixture.json','utf8'));assert(!fixture.retained);
const searches=JSON.parse(readFileSync('.git/fp6-recovery/release-search.json','utf8'));
const choose=(query,title,address)=>{const group=searches.find(s=>s.query===query);const matches=group.candidates.filter(x=>x.candidate.title===title&&x.candidate.address===address);assert.equal(matches.length,1);return {query,group,selected:matches[0]};};
// Explicit choices reviewed against fresh provider results; never select result index zero.
const mbs=choose('MBS','Marina Bay Sands','Marina Bay Sands, 10 Bayfront Avenue, Singapore 018956, Singapore');
const bt=choose('Bukit Timah Nature Reserve','Bukit Timah Nature Reserve','Bukit Timah Nature Reserve, Main Road, Singapore 589333, Singapore');
const jewel=choose('Jewel Changi Airport','Jewel Changi Airport','Jewel Changi Airport, 78 T1 Boulevard, Singapore 819666, Singapore');
const west=choose('Jurong East MRT','Jurong East','Jurong East, West Region, Singapore');
const north=choose('Woodlands MRT','Woodlands','Woodlands, North Region, Singapore');
const jb=choose('JB','Johor Bahru','Johor Bahru, Johor, Malaysia');
const casino=choose('MBS','Marina Bay Sands Casino','Marina Bay Sands Casino, Bayfront Avenue, Singapore 018956, Singapore');
const db=getDatabase(),{a}=await resolveQaActors(db),[sandbox]=await db.select().from(conversations).where(and(eq(conversations.kind,'sandbox'),eq(conversations.ownerId,a.userId)));
assert(sandbox);const scope=`sandbox--${sandbox.id}`,receiptPath='.git/fp6-recovery/release-truth.json';
const receipt=existsSync(receiptPath)?JSON.parse(readFileSync(receiptPath,'utf8')):{scope,owner:a.userId,fixtureSlug:fixture.slug,createdRoutes:[],roadCalls:[],checks:[]};
assert.equal(receipt.owner,a.userId);assert.equal(receipt.scope,scope);assert.equal(receipt.fixtureSlug,fixture.slug);assert(!receipt.complete);
assert((await readTrip(db,a,scope)).routes.every(r=>receipt.createdRoutes.some(x=>x.scope===scope&&x.id===r.id)),'Unreceipted Sandbox data: stop');
const save=()=>writeFileSync(receiptPath,JSON.stringify(receipt,null,2),{mode:0o600});save();
const browser=await chromium.launch({args:['--use-angle=swiftshader']}),origin='http://localhost:3000';
const ac=await browser.newContext({viewport:{width:1440,height:900},geolocation:{latitude:1.286,longitude:103.854,accuracy:10},permissions:['geolocation']}),bc=await browser.newContext({viewport:{width:1440,height:900}});
const page=await ac.newPage(),peer=await bc.newPage(),errors=[],outbound=[];let cachedSearch=null,armed=false,cachedRoad=null;
for(const p of [page,peer]){p.on('pageerror',()=>errors.push('pageerror'));p.on('request',r=>{if(r.url().startsWith(origin))outbound.push({peer:p===peer,path:new URL(r.url()).pathname,body:r.postData()??''});});}
await peer.route('**/api/trips/*/roads',r=>r.fulfill({status:503,json:{error:'QA peer stays in Order'}}));
await page.route('**/api/trips/*/roads',async r=>{if(cachedRoad){const body=cachedRoad;cachedRoad=null;await r.fulfill({json:body});return;}if(!armed){await r.fulfill({status:503,json:{error:'QA unexpected road request blocked'}});return;}armed=false;await r.continue();});
await page.route('**/api/trips/*/places',async r=>{if(cachedSearch&&r.request().postDataJSON()?.kind==='search'){assert.equal(r.request().postDataJSON().query,cachedSearch.query);await r.fulfill({json:cachedSearch.group});}else await r.continue();});
const button=(p,name)=>p.getByRole('button',{name,exact:true});
const mode=()=>page.getByRole('combobox',{name:'Travel mode',exact:true});
async function ready(p,path){await p.goto(origin+path);await p.getByRole('textbox',{name:'Search places',exact:true}).waitFor();await p.waitForFunction(()=>document.querySelector('[data-trip-revision]')&&!document.querySelector('[aria-label="Search places"]')?.disabled);await p.locator('[data-map-state="ready"]').waitFor({timeout:30000});}
async function addReviewed(choice){
  cachedSearch=choice;const count=await page.locator('[data-place-id]').count();
  await page.getByRole('textbox',{name:'Search places',exact:true}).fill(choice.query);
  const result=page.locator('[aria-label="Place search results"]').getByRole('button').filter({hasText:choice.selected.candidate.address});await result.waitFor();await result.click();
  await page.getByRole('region',{name:'Place preview',exact:true}).waitFor();assert.equal(await page.locator('[data-place-id]').count(),count);
  await button(page,'Add to Route').click();await page.waitForFunction(n=>document.querySelectorAll('[data-place-id]').length===n,count+1);
  await button(page,'Close place preview').click();await page.getByRole('textbox',{name:'Search places',exact:true}).fill('');cachedSearch=null;
}
async function roadCase(label,travel,expected,privateLeg=false){
  const prior=receipt.roadCalls.find(c=>c.label===label);if(prior){assert.equal(prior.status,200,'Prior provider failure must be investigated');cachedRoad=prior.body;}else{await page.waitForTimeout(22000);armed=true;} // Real rate-limit headroom, no virtual time/counter change.
  const pending=page.waitForResponse(r=>r.url().endsWith('/roads'),{timeout:40000});
  if(privateLeg)await button(page,'Allow private route').click();else await mode().selectOption(travel);
  const response=await pending,body=await response.json();if(!prior)receipt.roadCalls.push({label,status:response.status(),body});save();
  assert.equal(response.status(),200,JSON.stringify(body));const g=body.geometry;assert.equal(g.mode,travel);assert(g.attribution);
  assert(g.estimate.metres>0&&g.estimate.seconds>0);assert(g.segments.flat().length>2);assert.equal(g.estimate.legs.length,expected.length-1);
  if(!privateLeg){assert.equal(g.key,JSON.stringify([travel,...expected.map(p=>[p.id,p.latitude,p.longitude])]));assert.deepEqual(g.estimate.legs.map(l=>[l.fromId,l.toId]),expected.slice(1).map((p,i)=>[expected[i].id,p.id]));}
  assert(Math.abs(g.estimate.legs.reduce((n,l)=>n+l.metres,0)-g.estimate.metres)<1);assert(Math.abs(g.estimate.legs.reduce((n,l)=>n+l.seconds,0)-g.estimate.seconds)<1);
  const distance=roadDistance(g.estimate.metres),duration=roadDuration(g.estimate.seconds);
  if(privateLeg){await page.getByLabel('Your private origin',{exact:true}).getByText(`YOUR LEG · ${distance} · ${duration}`,{exact:true}).waitFor();}
  else{
    const summary=page.getByLabel('Route summary',{exact:true});await summary.locator('summary').getByText(new RegExp(distance.replace('.','\\.'))).waitFor();assert((await summary.textContent()).includes(duration));
    await summary.locator('summary').click();const lines=await page.getByRole('list',{name:'Route segments',exact:true}).locator('li').allTextContents();
    g.estimate.legs.forEach((l,i)=>{assert(lines[i].includes(`${expected[i].title} → ${expected[i+1].title}`));assert(lines[i].includes(roadDistance(l.metres)));assert(lines[i].includes(roadDuration(l.seconds)));});await summary.locator('summary').click();
    await button(page,'Fit trip').click();await page.waitForTimeout(900);assert.deepEqual(await page.locator('[data-shared-leg-tag]').allTextContents(),g.estimate.legs.map(l=>`${roadDistance(l.metres)} · ${roadDuration(l.seconds)}`));
  }
  assert((await page.locator('.maplibregl-ctrl-attrib').textContent()).includes('Geoapify'));
  await page.screenshot({path:`.git/fp6-recovery/truth-${label}.png`});
  console.log({case:label,mode:travel,metres:g.estimate.metres,seconds:g.estimate.seconds,legs:g.estimate.legs.length,geometryPoints:g.segments.flat().length,summaryAndLegs:true,reusedExistingRealResponse:!!prior});
}
try{
  for(const [p,actor] of [[page,'a'],[peer,'b']]){await p.goto(origin+`/room/${fixture.slug}`);await ensureFp6QaLogin(p,actor);await ready(p,`/room/${fixture.slug}`);}
  await ready(page,'/personal/my-room');assert(await page.locator('.composer').isVisible());
  const before=await readTrip(db,a,scope);let plan;
  if(before.routes.length===0){
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/places')&&r.request().postDataJSON()?.kind==='search');await page.getByRole('textbox',{name:'Search places',exact:true}).fill('MBS');const response=await responsePromise;assert.equal(response.status(),200);
  const result=page.locator('[aria-label="Place search results"]').getByRole('button').filter({hasText:mbs.selected.candidate.address});await result.click();await page.getByRole('region',{name:'Place preview',exact:true}).waitFor();assert.equal((await readTrip(db,a,scope)).routes.length,0);
  await button(page,'Add to Route').click();await page.locator('[data-place-id]').waitFor();plan=await readTrip(db,a,scope);assert.equal(plan.routes.length,1);assert.equal(plan.places.length,1);assert.equal(plan.routes[0].name,'Route 1');assert.equal(plan.places[0].latitude,mbs.selected.candidate.latitude);receipt.createdRoutes.push({scope,id:plan.routes[0].id});save();
  }else{assert.equal(before.routes.length,1);assert.equal(before.places.length,1);assert.equal(before.routes[0].name,'Route 1');assert.equal(before.places[0].latitude,mbs.selected.candidate.latitude);}
  await ready(page,'/personal/my-room');assert.equal(await page.locator('[data-place-id]').count(),1);receipt.checks.push('fresh MBS explicit preview / atomic Route1 / owner / reload');save();console.log('PASS fresh Sandbox MBS → explicit preview → first Add → one Route1/card → reload');
  for(const [label,travel,choices] of [['bt-mbs','drive',[bt,mbs]],['west-north-jewel','drive',[west,north,jewel]],['sg-jb','drive',[mbs,jb]],['short-walk','walk',[casino,mbs]]]){
    if(receipt.checks.some(c=>c.startsWith(`${label}:`)))continue;
    await mode().selectOption('planning');const prior=await readTrip(db,a,fixture.slug);let route=prior.routes.find(r=>r.name===`FP6 truth ${label}`);
    if(route)assert(receipt.createdRoutes.some(r=>r.id===route.id&&r.scope===fixture.slug));else{await mutateTrip(db,a,{roomSlug:fixture.slug,expectedRevision:prior.revision,requestId:randomUUID(),command:{type:'create-route',name:`FP6 truth ${label}`,color:'gold'}});const next=await readTrip(db,a,fixture.slug);route=next.routes.find(r=>!prior.routes.some(p=>p.id===r.id));assert(route);receipt.createdRoutes.push({scope:fixture.slug,id:route.id});save();}
    await ready(page,`/room/${fixture.slug}`);await button(page,route.name).click();
    const existing=routingPlaces(await readTrip(db,a,fixture.slug),route.id);assert.deepEqual(existing.map(p=>[p.title,p.latitude,p.longitude]),choices.slice(0,existing.length).map(c=>[c.selected.candidate.title,c.selected.candidate.latitude,c.selected.candidate.longitude]));for(const choice of choices.slice(existing.length))await addReviewed(choice);
    plan=await readTrip(db,a,fixture.slug);const points=routingPlaces(plan,route.id);assert.deepEqual(points.map(p=>[p.title,p.latitude,p.longitude]),choices.map(c=>[c.selected.candidate.title,c.selected.candidate.latitude,c.selected.candidate.longitude]));
    await roadCase(label,travel,points);await mode().selectOption('planning');await page.waitForFunction(()=>document.querySelectorAll('[data-shared-leg-tag]').length===0);assert(!(await page.getByLabel('Route summary',{exact:true}).textContent()).includes('~'));
    receipt.checks.push(`${label}: selected identity/order/geometry/metrics/labels/Order clear`);save();
  }
  await ready(page,'/personal/my-room');await mode().selectOption('drive');const beforeLocate=outbound.length,savedBefore=JSON.stringify(await readTrip(db,a,scope));
  await button(page,'Locate me').click();await page.getByLabel('Your private origin',{exact:true}).waitFor();await page.waitForTimeout(1500);assert(!outbound.slice(beforeLocate).some(r=>r.body.includes('1.286')||r.body.includes('103.854')));
  await button(page,'Route from here').click();await page.getByRole('region',{name:'Route from your location consent',exact:true}).waitFor();await button(page,'Keep location local').click();assert(!outbound.slice(beforeLocate).some(r=>r.path.endsWith('/roads')));
  await button(page,'Route from here').click();plan=await readTrip(db,a,scope);await roadCase('consented-private-origin','drive',[{id:'qa-origin'},plan.places[0]],true);
  assert.equal(JSON.stringify(await readTrip(db,a,scope)),savedBefore);assert.equal(await peer.getByLabel('Your private origin',{exact:true}).count(),0);assert(!outbound.filter(r=>r.peer).some(r=>r.body.includes('1.286')||r.body.includes('103.854')));
  assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('103.854')));assert.equal(outbound.slice(beforeLocate).filter(r=>r.body.includes('103.854')).length,1);
  await button(page,'Clear my location').click();await page.getByLabel('Your private origin',{exact:true}).waitFor({state:'hidden'});assert.equal(await page.locator('[data-private-leg-tag]').count(),0);await mode().selectOption('planning');
  receipt.checks.push('emulated origin: Locate/decline zero disclosure, explicit consent, private metrics, no plan/storage/peer persistence, OFF clears');assert.equal(errors.length,0);receipt.complete=true;save();console.log('PASS bounded real matrix, private consent/privacy, no browser exceptions');
}catch(e){save();await page.screenshot({path:'.git/fp6-recovery/release-truth-failure.png'}).catch(()=>{});console.error({failure:'FP6 real truth',message:String(e.stack).slice(0,1800),realCalls:receipt.roadCalls.length});process.exitCode=1;}
finally{await mode().selectOption('planning').catch(()=>{});await browser.close();await db.$client.end();}

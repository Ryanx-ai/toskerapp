/** Bounded release smoke. Existing exact-owned fixtures, durable call receipts, no reseeding. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from '/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {getDatabase} from '../src/server/db/client.ts';
import {readTrip} from '../src/server/trips/service.ts';
import {resolveQaActors,cleanupQaFixture} from './lib/ms73-fixtures.ts';
import {routingPlaces} from '../src/lib/trip-contract.ts';
import {roadDistance,roadDuration} from '../src/lib/maps/road-contract.ts';
import {ensureFp6QaLogin} from './lib/fp6-browser.mjs';
const live=process.argv.includes('--canonical'),origin=live?'https://toskerapp.vercel.app':'http://localhost:3000';
const fixtures=JSON.parse(readFileSync('.git/fp7-recovery/fixtures.json','utf8'));
const file=`.git/fp7-recovery/${live?'canonical':'release-truth'}.json`;
const receipt=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{checks:[],roads:{}};
assert(!receipt.complete,'Completed smoke: do not replay');
const save=()=>writeFileSync(file,JSON.stringify(receipt,null,2),{mode:0o600});
const db=getDatabase(),actors=await resolveQaActors(db);
for(const f of [fixtures.source,fixtures.destination])await cleanupQaFixture(db,f,false);
const read=(f=fixtures.source)=>readTrip(db,actors.a,f.slug);
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ca=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',geolocation:{latitude:1.286,longitude:103.854,accuracy:10},permissions:['geolocation']});
const cb=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const a=await ca.newPage(),b=await cb.newPage();
let armed=false;const errors=[],tiles=[],outbound=[];
const button=(p,n)=>p.getByRole('button',{name:n,exact:true}),mode=()=>a.getByRole('combobox',{name:'Travel mode',exact:true});
for(const p of [a,b]){
  p.on('pageerror',()=>errors.push('pageerror'));
  p.on('response',r=>{if(new URL(r.url()).hostname==='maps.geoapify.com')tiles.push(r.status());});
  p.on('request',r=>{if(r.url().startsWith(origin))outbound.push({peer:p===b,path:new URL(r.url()).pathname,body:r.postData()??''});});
  // Only one explicitly armed request may reach the unchanged provider adapter.
  await p.route('**/api/trips/*/roads',r=>{if(p===a&&armed&&!live){armed=false;return r.continue();}return r.fulfill({status:503,json:{error:'QA road allowance not armed; use Order'}});});
}
async function open(p,f=fixtures.source){await p.goto(`${origin}/room/${f.slug}/map`,{waitUntil:'domcontentloaded'});await p.locator('[data-trip-revision]').waitFor({timeout:60000});await p.locator('[data-map-state="ready"]').waitFor({timeout:45000});}
async function road(label,trigger,points){
  assert(!receipt.roads[label],'Call already started: reconcile receipt, never blindly repeat');
  receipt.roads[label]={started:true};save();armed=true;
  const pending=a.waitForResponse(r=>r.url().endsWith('/roads'),{timeout:60000});await trigger();const response=await pending,body=await response.json();
  receipt.roads[label]={started:true,status:response.status(),geometry:body.geometry,error:body.error};save();
  assert.equal(response.status(),200,'Provider road request failed; inspect sanitized receipt');
  const g=body.geometry;assert.equal(g.key,JSON.stringify(['drive',...points.map(p=>[p.id,p.latitude,p.longitude])]));
  assert(g.segments.flat().length>points.length&&g.estimate.metres>0&&g.estimate.seconds>0);assert.equal(g.estimate.legs.length,points.length-1);
  console.log({realRoad:label,metres:g.estimate.metres,seconds:g.estimate.seconds,vertices:g.segments.flat().length,legs:g.estimate.legs.length});return g;
}
async function chooserBounds(){
  for(const [width,height] of [[320,740],[390,844],[430,900],[768,900],[1440,900],[1728,1000],[844,390]]){
    await a.setViewportSize({width,height});
    const places=a.getByRole('button',{name:/^Places \(/});if(await places.isVisible())await places.click();
    for(const kind of ['copy','share']){
      if(kind==='copy'){await button(a,'Place actions for Marina Bay Sands').click();await button(a,'Copy to route').click();}
      else await button(a,'Share route').click();
      const dialog=a.getByRole('dialog'),select=a.getByRole('combobox',{name:kind==='copy'?'Destination route':'Destination',exact:true});await select.waitFor();
      await select.focus();assert(await select.evaluate(e=>e===document.activeElement));
      assert(await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}),'Dialog bounds');
      const cancel=button(a,'Cancel');await cancel.scrollIntoViewIfNeeded();assert(await cancel.evaluate(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.width>=44&&r.bottom<=innerHeight+1;}),'Cancel touch/visibility');
      if(width===320){await a.screenshot({path:`.git/fp7-recovery/${kind}-320.png`});}
      await a.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
      assert(await a.evaluate(()=>document.activeElement!==document.body),'Escape focus restored');
    }
  }
  await a.setViewportSize({width:320,height:740});await button(a,'Share route').click();await a.getByLabel('Destination',{exact:true}).waitFor();
  const large=await a.addStyleTag({content:'.creation-panel * {font-size:20px!important}'});
  await a.getByRole('dialog').locator('h2').evaluate(e=>e.textContent='Share a long holiday route across Singapore and Johor Bahru with friends');
  assert(!await a.getByRole('dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),'Long name enlarged dialog overflow');await button(a,'Cancel').scrollIntoViewIfNeeded();
  await a.screenshot({path:'.git/fp7-recovery/share-enlarged-320.png'});await a.keyboard.press('Escape');await large.evaluate(e=>e.remove());await a.setViewportSize({width:1440,height:900});
  receipt.checks.push('Copy/Share all six widths+short landscape, touch/keyboard/Escape, enlarged long heading');save();
}
try{
  for(const [p,actor] of [[a,'a'],[b,'b']]){await p.goto(`${origin}/room/${fixtures.source.slug}/map`);await ensureFp6QaLogin(p,actor);await open(p);await button(p,'Route 1').click();}
  if(!live){
    if(!receipt.choosers){await chooserBounds();receipt.choosers=true;save();}
    if(!receipt.privateDone){
      await button(a,'Day 2').click();await mode().selectOption('drive');const plan=await read(),point=routingPlaces(plan,fixtures.secondRouteId)[0],before=outbound.length;
      await button(a,'Locate me').click();await a.locator('[data-private-origin]').waitFor();assert.equal(await b.locator('[data-private-origin]').count(),0);
      await button(a,'Route from here').click();await button(a,'Keep location local').click();assert(!outbound.slice(before).some(r=>r.body.includes('103.854')));
      await button(a,'Route from here').click();const g=await road('private-origin',()=>button(a,'Allow private route').click(),[{id:'private-origin',latitude:1.286,longitude:103.854},point]);
      await a.locator('[data-private-origin]').getByText(`YOUR LEG · ${roadDistance(g.estimate.metres)} · ${roadDuration(g.estimate.seconds)}`,{exact:true}).waitFor();
      await button(a,'Fit trip').click();await a.screenshot({path:'.git/fp7-recovery/real-private-origin.png'});
      assert.deepEqual(await read(),plan);assert(!await a.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('103.854')));assert(!outbound.some(r=>r.peer&&r.body.includes('103.854')));
      await button(a,'Clear my location').click();assert.equal(await a.locator('[data-private-origin]').count(),0);await mode().selectOption('planning');receipt.privateDone=true;receipt.checks.push('Real consented origin road, private card/metrics/fit, no DB/storage/peer state, OFF clears');save();
    }
    await button(a,'Route 1').click();
    if(!receipt.copied){const prior=await read(fixtures.destination);assert(!prior.routes.some(r=>r.name==='Route 1'),'Unreceipted destination Route; reconcile');await button(a,'Share route').click();await a.getByLabel('Destination',{exact:true}).selectOption(fixtures.destination.slug);await button(a,'Create route copy').click();await a.getByRole('link',{name:'Open copied route',exact:true}).waitFor({timeout:60000});const after=await read(fixtures.destination),added=after.routes.filter(r=>!prior.routes.some(old=>old.id===r.id));assert.equal(added.length,1);receipt.copied=added[0].id;save();await a.getByRole('link',{name:'Open copied route',exact:true}).click();}
    else await open(a,fixtures.destination);
    await button(a,'Route 1').click();const destination=await read(fixtures.destination),points=routingPlaces(destination,receipt.copied);assert.equal(points.length,3);
    const g=await road('copied-route',()=>mode().selectOption('drive'),points);await a.getByLabel('Route summary',{exact:true}).locator('summary').getByText(new RegExp(roadDistance(g.estimate.metres).replace('.','\\.'))).waitFor();await button(a,'Fit trip').click();await a.screenshot({path:'.git/fp7-recovery/real-copied-route.png'});await mode().selectOption('planning');
    await open(b,fixtures.destination);await button(b,'Route 1').click();assert.equal(await b.locator('[data-place-id]').count(),3);assert(points.every(p=>p.commentCount===0));receipt.checks.push('Real copied three-stop Drive has destination IDs, fresh geometry/metrics; B reload sees independent cards');
  }else{
    const marker=a.locator('.maplibregl-map').getByRole('button',{name:/^Select .*1: Marina Bay Sands$/});await marker.focus();await a.keyboard.press('Enter');await a.locator('[data-map-inspector]').waitFor();
    const old=routingPlaces(await read(),fixtures.routeId).find(p=>p.title==='Marina Bay Sands');assert.equal(old?.icon,'favourite');
    const rev=await b.locator('[data-trip-revision]').getAttribute('data-trip-revision');await button(a,'Home').click();await b.waitForFunction(v=>document.querySelector('[data-trip-revision]')?.dataset.tripRevision!==v,rev,{timeout:60000});await b.reload();await b.locator('.maplibregl-map').getByRole('button',{name:/^Select (starred )?home 1: Marina Bay Sands$/}).waitFor({timeout:60000});
    await button(a,'Favourite').click();await a.keyboard.press('Escape');await b.reload();await b.locator('.maplibregl-map').getByRole('button',{name:/^Select (starred )?favourite 1: Marina Bay Sands$/}).waitFor({timeout:60000});
    await button(a,'Locate me').click();await a.locator('[data-private-origin]').waitFor();assert.equal(await b.locator('[data-private-origin]').count(),0);await a.reload();assert.equal(await a.locator('[data-private-origin]').count(),0);
    const local=JSON.parse(readFileSync('.git/fp7-recovery/release-truth.json','utf8'));assert(local.complete);
    for(const p of [a,b]){await open(p,fixtures.destination);await button(p,'Route 1').click();assert.equal(await p.locator('[data-place-id]').count(),3);assert.equal(await button(p,'Saved places').count(),0);}
    receipt.checks.push('Canonical normal A/B auth; direct Home/Favourite mutation+peer/reload; origin private+reload cleared; independently copied Route retained');
    await a.screenshot({path:'.git/fp7-recovery/canonical-map.png'});
    const secrets=['DATABASE_URL','CLERK_SECRET_KEY','ABLY_API_KEY','ROOM_INVITE_ENCRYPTION_KEY','GEOAPIFY_SEARCH_KEY'].map(k=>{assert(process.env[k]?.length>=12);return process.env[k];});
    const urls=await a.evaluate(()=>[...new Set(performance.getEntriesByType('resource').map(r=>r.name).filter(u=>u.startsWith(location.origin+'/_next/static/')&&/\.js(?:\?|$)/.test(u)))]);assert(urls.length>=10&&urls.length<100);
    for(const url of urls){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});assert(response.ok);const body=await response.text();assert(!secrets.some(s=>[s,JSON.stringify(s).slice(1,-1),encodeURIComponent(s)].some(v=>body.includes(v))),'Client secret match; suppressed');}receipt.checks.push(`${urls.length} canonical client assets secret scan PASS`);
  }
  assert.equal(errors.length,0);assert(tiles.some(s=>s===200)&&!tiles.some(s=>s>=400),'Browser map credential access');assert((await a.locator('.maplibregl-ctrl-attrib').textContent()).includes('OpenStreetMap'));
  receipt.checks.push('Real basemap and attribution, zero page exceptions');receipt.complete=true;save();console.log({smoke:live?'canonical':'local release',result:'PASS',realRoadCalls:Object.keys(receipt.roads).length,checks:receipt.checks});
}catch(e){save();await a.screenshot({path:`.git/fp7-recovery/${live?'canonical':'release'}-failure.png`}).catch(()=>{});console.error({failure:'FP7 release smoke',message:String(e.message).replace(/https?:\/\/\S+/g,'[URL suppressed]').slice(0,1000)});process.exitCode=1;}
finally{await mode().selectOption('planning').catch(()=>{});await browser.close();await db.$client.end();}

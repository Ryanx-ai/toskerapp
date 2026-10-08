/** Final unchanged-build spot-check. Reuses captured real geometry; no new provider roads. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from '/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {ensureFp6QaLogin} from './lib/fp6-browser.mjs';
const receipt=JSON.parse(readFileSync('.git/fp6-recovery/release-truth.json','utf8'));assert(receipt.complete);
const road=receipt.roadCalls.find(c=>c.label==='bt-mbs').body;
const privateRoad=receipt.roadCalls.find(c=>c.label==='consented-private-origin').body.geometry;
const privateKey=JSON.parse(privateRoad.key);assert.deepEqual(privateKey[1],['private-origin',1.286,103.854]);assert.deepEqual(privateKey[2].slice(1),[1.2836965,103.8607226]);assert.deepEqual(privateRoad.estimate.legs.map(l=>[l.fromId,l.toId]),[[privateKey[1][0],privateKey[2][0]]]);
const browser=await chromium.launch({args:['--use-angle=swiftshader']}),page=await browser.newPage({viewport:{width:1440,height:900}});
const button=name=>page.getByRole('button',{name,exact:true});
await page.route('**/api/trips/*/roads',r=>r.fulfill({json:r.request().postDataJSON()?.origin?{geometry:privateRoad}:road}));
try{
  await page.goto(`http://localhost:3000/room/${receipt.fixtureSlug}`,{waitUntil:'domcontentloaded'});await ensureFp6QaLogin(page);await page.goto(`http://localhost:3000/room/${receipt.fixtureSlug}`,{waitUntil:'domcontentloaded'});
  await button('FP6 truth bt-mbs').click();await page.getByLabel('Travel mode',{exact:true}).selectOption('drive');await page.locator('[data-shared-leg-tag]').waitFor();
  for(const [width,height] of [[1440,900],[320,740],[768,1024],[844,390]]){
    await page.setViewportSize({width,height});await button('Fit trip').click();await page.waitForTimeout(350);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const marker=button('Select destination 2: Marina Bay Sands');await marker.focus();await page.keyboard.press('Enter');const inspector=page.locator('[data-map-inspector]');await inspector.waitFor();
    const box=await inspector.boundingBox();assert(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=width+1&&box.y+box.height<=height+1);
    assert(await page.evaluate(()=>{const e=document.activeElement;if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}));
    await page.screenshot({path:`.git/fp6-recovery/release-spot-${width}.png`});await page.keyboard.press('Escape');await inspector.waitFor({state:'hidden'});assert((await page.locator('.maplibregl-ctrl-attrib').textContent()).includes('OpenStreetMap'));
    console.log({viewport:`${width}x${height}`,overflow:false,inspectorBounded:true,keyboardFocusVisible:true,attribution:true});
  }
  await page.setViewportSize({width:1440,height:900});const before=await page.locator('.maplibregl-map').boundingBox();await button('Collapse locations').click();await page.waitForTimeout(350);const after=await page.locator('.maplibregl-map').boundingBox();assert(after.height>before.height);await button('Expand locations').click();
  await page.goto('http://localhost:3000/personal/my-room');await page.locator('[data-place-id]').waitFor();await page.locator('[data-map-state="ready"]').waitFor();await page.context().grantPermissions(['geolocation'],{origin:'http://localhost:3000'});await page.context().setGeolocation({latitude:1.286,longitude:103.854,accuracy:10});await page.getByLabel('Travel mode',{exact:true}).selectOption('drive');await button('Locate me').click();await button('Route from here').click();await button('Allow private route').click();
  const privateTag=page.locator('.maplibregl-marker').filter({hasText:/YOUR LEG/});await privateTag.waitFor({state:'attached'});assert((await privateTag.textContent()).includes('2.1 km'));await button('Fit trip').click();await page.waitForTimeout(900);await page.screenshot({path:'.git/fp6-recovery/release-private-render.png'});await button('Clear my location').click();await privateTag.waitFor({state:'detached'});
  console.log('PASS final responsive/focus/collapse/attribution spot; private origin identity/key exact; zero additional real roads');
}catch(e){console.error({failure:'release spot',message:String(e.stack).slice(0,1200)});process.exitCode=1;}
finally{await page.getByLabel('Travel mode',{exact:true}).selectOption('planning').catch(()=>{});await browser.close();}

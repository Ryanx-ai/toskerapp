/** Bounded canonical smoke. Uses only the exact owned fixture; Review is read-only. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const origin=process.env.FP4B_ORIGIN??"http://localhost:3000";
assert(["http://localhost:3000","https://toskerapp.vercel.app"].includes(origin));
const {fixture,routes}=JSON.parse(readFileSync(".git/fp4b-recovery/browser-fixture.json","utf8"));
const review=JSON.parse(readFileSync("docs/MS7-3-QA-FIXTURES.json","utf8")).retained[0];
const browser=await chromium.launch({args:["--use-angle=swiftshader"]});
const a=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
const b=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
const errors=[],providerStatuses=[];
for(const p of[a,b]){p.on("pageerror",()=>errors.push("pageerror"));p.on("response",r=>{if(new URL(r.url()).hostname==="maps.geoapify.com")providerStatuses.push(r.status());});}
async function login(p,letter){
  await p.goto(origin+"/app");await p.getByRole("button",{name:"Sign in",exact:true}).click();await p.getByLabel("Email address",{exact:true}).fill(`tosker.user.${letter}+clerk_test@example.com`);await p.getByRole("button",{name:"Continue",exact:true}).click();
  await p.waitForFunction(()=>document.querySelector('input[type=password],input[autocomplete="one-time-code"]'));
  if(await p.locator('input[type=password]').count()){await p.getByText("Use another method",{exact:true}).click();await p.getByRole("button",{name:`Email code to tosker.user.${letter}+clerk_test@example.com`,exact:true}).click();}
  await p.locator('input[autocomplete="one-time-code"]').pressSequentially("424242",{delay:80});await p.locator(".messaging-app").waitFor({timeout:45000});
}
async function ready(p,path){await p.goto(origin+path);await p.getByRole("textbox",{name:"Search places",exact:true}).waitFor();await p.waitForFunction(()=>!document.querySelector('input[aria-label="Search places"]').disabled&&!document.body.innerText.includes('Refreshing authorized Pins'));}
const dialog=p=>p.locator('dialog[open]');
async function chip(p,state,context){const section=p.locator('section[aria-label="Map Pins"],section[aria-label="Your Map Pins"]');await section.locator('details').first().evaluate(e=>e.open=true);let c=section.getByRole('button',{name:`Open ${state} Pin: Marina Bay Sands`,exact:true});if(context)c=c.filter({hasText:context});return c;}
try{
  await login(a,"a");await login(b,"b");
  await ready(a,`/room/${review.slug}/map`);
  const marker=a.getByRole('button',{name:'Want to go Map Pin: Marina Bay Sands',exact:true});await marker.waitFor();
  const box=await marker.boundingBox();assert(box.width>=44&&box.height>=44);
  await marker.focus();await a.keyboard.press('Enter');await dialog(a).getByText(`From ${review.name}`,{exact:true}).waitFor();
  await a.setViewportSize({width:844,height:390});const nuke=dialog(a).getByRole('button',{name:'Nuke Pin',exact:true});await nuke.focus();
  assert(await nuke.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'short-landscape keyboard reach');
  await a.screenshot({path:'.git/fp4b-recovery/review-short-landscape.png'});await a.keyboard.press('Escape');
  await a.setViewportSize({width:1440,height:900});await ready(a,`/room/${review.slug}/map`);await (await chip(a,'Want to go')).waitFor();
  await a.screenshot({path:'.git/fp4b-recovery/founder-review-pins.png'});
  console.log('PASS retained Review, distinct accessible 44px Map Pin, keyboard marker/detail, landscape action reach');
  if(!process.env.FP4B_REVIEW_ONLY){
    const room=`/room/${fixture.slug}/map`,sandbox='/personal/my-room/map';await ready(a,room);await ready(b,sandbox);
    await a.getByRole('textbox',{name:'Search places',exact:true}).fill('Marina Bay Sands Singapore');
    const results=a.locator('[aria-label="Place search results"]');await results.waitFor({timeout:45000});
    const candidate=results.getByRole('button').filter({hasText:'10 Bayfront Avenue'}).filter({hasText:'018956'});assert.equal(await candidate.count(),1,'unambiguous explicitly named candidate');
    await candidate.click();const preview=a.locator('section[aria-label="Place preview"]');await preview.waitFor();assert((await preview.innerText()).includes('Not saved yet'));
    await preview.getByLabel('Pin state',{exact:true}).selectOption('want-to-go');await preview.getByRole('button',{name:'Pin to Map',exact:true}).click();await dialog(a).locator('[aria-label="Map Pin details"]').waitFor();
    await (await chip(b,'Want to go',fixture.name)).waitFor({timeout:45000});await a.keyboard.press('Escape');
    await (await chip(b,'Want to go',fixture.name)).click();await dialog(b).getByLabel('Pin state',{exact:true}).selectOption('saved');await dialog(b).getByRole('button',{name:'Save state',exact:true}).click();await (await chip(a,'Saved')).waitFor({timeout:45000});await b.keyboard.press('Escape');
    await (await chip(a,'Saved')).click();await dialog(a).getByRole('button',{name:'Add to Route',exact:true}).click();const target=dialog(a).getByLabel('Target Route',{exact:true});await target.locator(`option[value="${routes[1]}"]`).waitFor({state:'attached'});await target.selectOption(routes[1]);await dialog(a).getByRole('button',{name:'Confirm Add to Route',exact:true}).click();await dialog(a).waitFor({state:'hidden'});
    await a.getByRole('button',{name:'Pin QA route 2',exact:true}).click();assert((await a.locator('[data-place-id]').first().innerText()).includes('Marina Bay Sands'));
    await ready(a,sandbox);await (await chip(a,'Saved',fixture.name)).click();await dialog(a).getByRole('button',{name:'Remove from my Sandbox',exact:true}).click();await dialog(a).waitFor({state:'hidden'});await (await chip(a,'Saved',fixture.name)).waitFor({state:'hidden'});await (await chip(b,'Saved',fixture.name)).waitFor();
    await ready(a,room);await (await chip(a,'Saved')).click();await dialog(a).getByRole('button',{name:'Nuke Pin',exact:true}).click();await dialog(a).getByRole('button',{name:'Confirm Nuke Pin',exact:true}).click();await dialog(a).waitFor({state:'hidden'});await (await chip(b,'Saved',fixture.name)).waitFor({state:'hidden',timeout:45000});
    await ready(b,room);await b.getByRole('button',{name:'Pin QA route 2',exact:true}).click();assert((await b.locator('[data-place-id]').first().innerText()).includes('Marina Bay Sands'));assert.equal(await (await chip(b,'Saved')).count(),0);
    console.log('PASS canonical A/B explicit search/preview/create, state, Route copy/dedupe, private Hide, source Nuke and surviving Route/reload');
  }
  assert(providerStatuses.some(s=>s===200));assert(!providerStatuses.some(s=>s>=400),'provider errors (URLs suppressed)');assert.equal(errors.length,0);
  if(origin==='https://toskerapp.vercel.app'){
    const names=['DATABASE_URL','CLERK_SECRET_KEY','ABLY_API_KEY','ROOM_INVITE_ENCRYPTION_KEY','GEOAPIFY_SEARCH_KEY'];const secrets=names.map(k=>{assert(process.env[k]?.length>=12,`Missing ${k}`);return process.env[k];});
    const urls=await a.evaluate(()=>[...new Set(performance.getEntriesByType('resource').map(r=>r.name).filter(u=>u.startsWith(location.origin+'/_next/static/')&&/\.js(?:\?|$)/.test(u)))]);assert(urls.length>=10&&urls.length<100);
    for(const url of urls){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});assert(response.ok);const body=await response.text();assert(!secrets.some(s=>[s,JSON.stringify(s).slice(1,-1),encodeURIComponent(s)].some(v=>body.includes(v))),'secret match: values suppressed');}
    console.log(`PASS ${urls.length} canonical client assets/server-secret scan; no credentials sent to browser`);
  }
  console.log('PASS provider tiles/attribution, zero page exceptions');
}catch(error){for(const[p,n]of[[a,'a'],[b,'b']])await p.screenshot({path:`.git/fp4b-recovery/release-failure-${n}.png`,timeout:5000}).catch(()=>{});throw error;}finally{await browser.close();}

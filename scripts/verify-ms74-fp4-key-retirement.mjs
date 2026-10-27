/** Bounded before/after legacy-key retirement verification. Values stay in
 * memory; no key UI scraping, credential writes or raw provider error output. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'dotenv';
import {neon} from '@neondatabase/serverless';
import {chromium} from '/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {acquireFp4QaActors} from './lib/ms74-fp4-browser-lock.mjs';
const phase=process.argv[2];assert(['before','after'].includes(phase));acquireFp4QaActors();
const current=parse(readFileSync('.env.development.local')),old=parse(readFileSync('.env.development.local.backup.20261012-213251'));
assert(!!current.GEOAPIFY_SEARCH_KEY&&!!old.GEOAPIFY_SEARCH_KEY);assert(current.GEOAPIFY_SEARCH_KEY!==old.GEOAPIFY_SEARCH_KEY,'Expected separate replacement');
const fixture=JSON.parse(readFileSync('.git/ms74-recovery/fixture.json'));assert.equal(fixture.run,'ms74-fp1-20261010');assert.equal(fixture.status,'committed');
assert.equal(new URL(current.DATABASE_URL).hostname,'ep-odd-glade-au6iboa7-pooler.c-10.us-east-1.aws.neon.tech');
const q=neon(current.DATABASE_URL),[founders,owned,payloads]=await q.transaction([
 q`select u.id from users u join room_memberships m on m.user_id=u.id where u.tid='8V3X7P1' and m.room_id=${fixture.roomId}::uuid`,
 q`select r.id from rooms r join profiles p on p.user_id=r.owner_id where r.id=${fixture.roomId}::uuid and r.slug=${fixture.slug} and p.username='tosker-user-a-clerk-test'`,
 q`select count(*)::int n from location_latest`,
],{readOnly:true});assert.equal(founders.length,1);assert.equal(owned.length,1);assert.equal(payloads[0].n,0);
const result={pass:false,phase,at:new Date().toISOString(),canonical:'https://toskerapp.vercel.app',canonicalSha:'a166934b6d348dd84ab9c78f35a73e9ce6f661b1',checks:[]};
const file=`.git/ms74-fp4/key-retirement-${phase}-${Date.now()}.json`;
const browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage();let step='normal QA sign-in';
await context.route('**/*geoapify.com/**',r=>r.abort());
await context.route('**/api/location-sharing',r=>r.fulfill({status:503,json:{error:'Sharing not tested in provider check'}}));
try{
 if(phase==='after'){
  step='retired credential rejection';const u=new URL('https://api.geoapify.com/v1/geocode/search');u.searchParams.set('text','Marina Bay Sands Singapore');u.searchParams.set('limit','1');u.searchParams.set('apiKey',old.GEOAPIFY_SEARCH_KEY);
  const r=await fetch(u,{signal:AbortSignal.timeout(20000)});assert([401,403].includes(r.status),'Legacy key must be rejected');result.checks.push({legacyRejected:true,status:r.status});
 }else{
  step='replacement connectivity';const u=new URL('https://api.geoapify.com/v1/geocode/search');u.searchParams.set('text','Marina Bay Sands Singapore');u.searchParams.set('limit','1');u.searchParams.set('apiKey',current.GEOAPIFY_SEARCH_KEY);
  const r=await fetch(u,{signal:AbortSignal.timeout(20000)});assert(r.status===200,'Replacement provider request failed');assert((await r.json()).features?.length>0);result.checks.push({replacementResponds:true,status:r.status});
 }
 step='normal canonical QA sign-in';await page.goto(`${result.canonical}/app`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.Clerk?.loaded,{}, {timeout:60000});
 await page.getByRole('button',{name:'Sign in',exact:true}).click();const email='tosker.user.a+clerk_test@example.com';
 await page.getByRole('textbox',{name:'Email address',exact:true}).fill(email);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('link',{name:'Use another method',exact:true}).click();
 await Promise.all([page.waitForResponse(r=>r.url().includes('/prepare_first_factor')&&r.status()===200),page.getByRole('button',{name:`Email code to ${email}`,exact:true}).click()]);
 await page.getByRole('textbox',{name:'Enter verification code',exact:true}).fill('424242');await page.getByRole('button',{name:'Open your Namecard',exact:true}).waitFor({timeout:60000});
 step='canonical public-landmark provider response';const response=await page.evaluate(async slug=>{const r=await fetch(`/api/trips/${encodeURIComponent(slug)}/places`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'search',query:'Marina Bay Sands Singapore'})});const d=await r.json();return {status:r.status,count:d.candidates?.length??0};},fixture.slug);
 assert.equal(response.status,200);assert(response.count>0);result.checks.push({canonicalProvider:response,contentWrites:0,gpsAcquired:false});result.pass=true;
}catch(e){result.failedStep=step;result.failureType=e.name;process.exitCode=1;}
finally{result.legacyFingerprint=createHash('sha256').update(old.GEOAPIFY_SEARCH_KEY).digest('hex');writeFileSync(file,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});await page.evaluate(async()=>{if(window.Clerk?.session?.status==='active'){await fetch('/api/realtime/logout',{method:'POST',signal:AbortSignal.timeout(8000)}).catch(()=>{});await Promise.race([window.Clerk.signOut(),new Promise(r=>setTimeout(r,8000))]);}}).catch(()=>{});await context.close().catch(()=>{});await browser.close().catch(()=>{});console.log(JSON.stringify({pass:result.pass,phase,checks:result.checks,failedStep:result.failedStep,receipt:file,credentialsPrinted:false}));}

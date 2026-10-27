/** Three public-place previews + two bounded roads, isolated normal QA sign-in.
 * No GPS, sharing, saved-place mutations or provider setting changes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {reviewEnvironment,REVIEW_PROJECT} from './ms74-fp3-review-runtime.mjs';
import {loginFp4} from './lib/ms74-fp4-browser.mjs';
reviewEnvironment();const fixture=JSON.parse(readFileSync('.git/ms74-fp4/review-fixture.json'));assert.equal(fixture.project,REVIEW_PROJECT);
const stamp=Date.now(),file=`.git/ms74-fp4/browser/geography-${stamp}.json`,origin='http://localhost:3000';
const evidence={pass:false,cases:[],errors:[],tiles:0,providerRequests:0,searches:0,roads:0,blocked:false,contentWrites:0,gps:false};
const save=()=>writeFileSync(file,JSON.stringify(evidence,null,2),{mode:0o600});save();
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();let step='sign-in';
context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(60000);
await context.route('**/api/location-sharing',r=>r.fulfill({status:503,json:{error:'Sharing disabled for non-sharing QA'}}));
await context.route('**/*geoapify.com/**',r=>{if(new URL(r.request().url()).hostname!=='maps.geoapify.com'||r.request().method()!=='GET'||evidence.providerRequests>=230){evidence.blocked=true;return r.abort();}evidence.providerRequests++;return r.continue();});
await context.route('**/api/trips/**',r=>{const req=r.request(),u=new URL(req.url());if(req.method()!=='POST')return r.continue();if(u.pathname.endsWith('/places')){const body=req.postDataJSON();if(body?.kind!=='search'||evidence.searches>=3){evidence.blocked=true;return r.abort();}evidence.searches++;}else if(u.pathname.endsWith('/roads')){if(evidence.roads>=2){evidence.blocked=true;return r.abort();}evidence.roads++;}else{evidence.contentWrites++;return r.abort();}return r.continue();});
page.on('pageerror',e=>{evidence.errors.push(e.name);save();});page.on('response',r=>{const u=new URL(r.url());if(u.hostname==='maps.geoapify.com'&&/\.(pbf|mvt)$/.test(u.pathname)&&r.status()===200)evidence.tiles++;if(u.pathname.endsWith('/places')||u.pathname.endsWith('/roads'))evidence.lastApi={endpoint:u.pathname.endsWith('/places')?'places':'roads',status:r.status()};save();});
try{
 await loginFp4(page,'a',fixture,origin);await page.getByRole('button',{name:'Marina QA',exact:true}).click();
 const revision=await page.locator('[data-trip-revision]').getAttribute('data-trip-revision');
 for(const [label,query,match] of [['Singapore','Marina Bay Sands Singapore',/Marina Bay Sands/i],['Johor','Johor Bahru City Square',/City Square/i],['Global','Eiffel Tower Paris',/Eiffel|Tour Eiffel/i]]){
  step=`${label} search preview`;evidence.step=step;save();const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/places')&&r.request().postDataJSON()?.kind==='search',{timeout:45000});
  await page.getByRole('textbox',{name:'Search places',exact:true}).fill(query);const result=await response;assert.equal(result.status(),200);
  const body=await result.json();assert(body.candidates?.length>0);const matching=body.candidates.find(r=>match.test(r.candidate.title));assert(matching,'Expected public landmark not returned; record quality instead of saving another result');
  const preview=page.getByRole('region',{name:'Place preview',exact:true});assert.equal(await preview.count(),0);assert.equal(await page.locator('[data-trip-revision]').getAttribute('data-trip-revision'),revision);
  step=`${label} select result`;evidence.step=step;save();
  await page.getByRole('list',{name:'Place search results',exact:true}).getByRole('button').filter({hasText:matching.candidate.title}).first().click();
  step=`${label} await preview`;evidence.step=step;save();await preview.waitFor();assert(await preview.getByRole('button',{name:'Add to Route',exact:true}).isEnabled());
  await page.screenshot({path:`.git/ms74-fp4/browser/geography-${stamp}-${label}.png`});
  evidence.cases.push({label,status:result.status(),results:body.candidates.length,title:matching.candidate.title,address:matching.candidate.address,selectionPreviewOnly:true});
  await preview.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('[data-trip-revision]').getAttribute('data-trip-revision'),revision);await page.getByRole('textbox',{name:'Search places',exact:true}).fill('');
 }
 for(const mode of ['walk','drive']){
  step=`${mode} actual routing`;const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/roads')&&r.request().postDataJSON()?.mode===mode,{timeout:65000});
  await page.getByRole('combobox',{name:'Travel mode',exact:true}).selectOption(mode);const result=await response;assert.equal(result.status(),200);const body=await result.json();assert.equal(body.geometry?.mode,mode);assert(body.geometry?.estimate?.metres>0&&body.geometry?.estimate?.seconds>0);
  await page.locator('details[aria-label="Route summary"] summary').filter({hasText:/km| m/}).waitFor();
  await page.screenshot({path:`.git/ms74-fp4/browser/geography-${stamp}-${mode}.png`});
  evidence.cases.push({mode,status:result.status(),metres:body.geometry.estimate.metres,seconds:body.geometry.estimate.seconds,legs:body.geometry.estimate.legs?.length??0});
 }
 await page.getByRole('combobox',{name:'Travel mode',exact:true}).selectOption('planning');assert.equal(await page.locator('[data-trip-revision]').getAttribute('data-trip-revision'),revision);
 assert(evidence.tiles>0);assert(!evidence.blocked);assert.equal(evidence.contentWrites,0);assert.deepEqual(evidence.errors,[]);evidence.pass=true;
}catch(e){evidence.failedStep=step;evidence.failureType=e.name;evidence.failureLine=e.stack?.match(/browser-ms74-fp4-geography\.mjs:(\d+)/)?.[1];process.exitCode=1;save();await page.screenshot({path:file.replace('.json','-failure.png')}).catch(()=>{});}
finally{save();await page.evaluate(async()=>{if(window.Clerk?.session?.status==='active'){await fetch('/api/realtime/logout',{method:'POST',signal:AbortSignal.timeout(8000)}).catch(()=>{});await Promise.race([window.Clerk.signOut(),new Promise(r=>setTimeout(r,8000))]);}}).catch(()=>{});await context.close().catch(()=>{});await browser.close().catch(()=>{});save();console.log(JSON.stringify({...evidence,receipt:file}));}

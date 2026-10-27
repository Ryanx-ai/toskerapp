/** Offline UI regression: synthetic search response, no provider/GPS/content writes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {reviewEnvironment} from './ms74-fp3-review-runtime.mjs';
import {fp4Context,loginFp4} from './lib/ms74-fp4-browser.mjs';
reviewEnvironment();const fixture=JSON.parse(readFileSync('.git/ms74-fp4/review-fixture.json'));
const stamp=Date.now(),file=`.git/ms74-fp4/browser/search-layout-${stamp}.json`,evidence={pass:false,offline:true,cases:[],contentWrites:0};
const browser=await chromium.launch({headless:true}),context=await fp4Context(browser),page=await context.newPage();context.setDefaultTimeout(12000);
await context.route('**/api/trips/**',r=>{if(r.request().method()!=='POST')return r.continue();if(new URL(r.request().url()).pathname.endsWith('/places')&&r.request().postDataJSON()?.kind==='search')return r.fulfill({json:{candidates:[1,2,3].map(i=>({token:`offline-layout-only-${i}`,candidate:{title:`Synthetic layout result ${i}`,address:'Synthetic QA — not a venue',latitude:1.2834,longitude:103.8607,source:'search',provider:'geoapify',providerId:null,attribution:'Offline QA',license:''}}))}});evidence.contentWrites++;return r.abort();});
try{
 await loginFp4(page,'a',fixture,'http://localhost:3000');const revision=await page.locator('[data-trip-revision]').getAttribute('data-trip-revision');
 for(const [width,height] of [[1440,1000],[320,740],[390,844],[430,932],[768,1024],[1728,1117],[844,390]]){
  await page.setViewportSize({width,height});await page.getByRole('textbox',{name:'Search places',exact:true}).fill(`Layout ${width}`);
  const result=page.getByRole('list',{name:'Place search results',exact:true}).getByRole('button').first();await result.waitFor({state:'attached'});
  const geometry=await result.evaluate(el=>{const rect=el.getBoundingClientRect(),panel=el.closest('[data-map-overlay]'),p=panel.getBoundingClientRect(),hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return{result:{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right},panel:{top:p.top,bottom:p.bottom,overflow:getComputedStyle(panel).overflow},hit:!!hit&&el.contains(hit),overflow:document.documentElement.scrollWidth>innerWidth+1};});
  evidence.cases.push({width,height,geometry});assert(geometry.hit&&!geometry.overflow,'Search result must be unobscured and reachable');
  await result.focus();assert(await result.evaluate(el=>el===document.activeElement));await result.press('Enter');
  const preview=page.getByRole('region',{name:'Place preview',exact:true});await preview.waitFor();assert(await preview.getByRole('button',{name:'Add to Route',exact:true}).isEnabled());
  assert.equal(await page.locator('[data-trip-revision]').getAttribute('data-trip-revision'),revision);
  await page.screenshot({path:file.replace('.json',`-${width}.png`)});await preview.getByRole('button',{name:'Cancel',exact:true}).click();
 }
 assert.equal(evidence.contentWrites,0);evidence.pass=true;
}catch(e){evidence.failureType=e.name;evidence.failureLine=e.stack?.match(/search-layout\.mjs:(\d+)/)?.[1];process.exitCode=1;await page.screenshot({path:file.replace('.json','-failure.png')}).catch(()=>{});}
finally{writeFileSync(file,JSON.stringify(evidence,null,2),{mode:0o600});await context.close();await browser.close();console.log(JSON.stringify({...evidence,receipt:file}));}

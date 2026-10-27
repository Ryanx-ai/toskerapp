/** Focused enlarged-text / keyboard / reduced-motion acceptance, isolated only. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {fp4Context,loginFp4} from "./lib/ms74-fp4-browser.mjs";
reviewEnvironment();const fixture=JSON.parse(readFileSync('.git/ms74-fp4/review-fixture.json','utf8'));assert.equal(fixture.project,REVIEW_PROJECT);
const stamp=Date.now(),path=`.git/ms74-fp4/browser/a11y-${stamp}.json`,evidence={pass:false,cases:[],errors:[],providerCalls:0,sharingCalls:0,textMethod:'200% computed text-size override; not browser zoom or native Dynamic Type'};
const browser=await chromium.launch({headless:true}),context=await fp4Context(browser),page=await context.newPage();let step='sign-in';
page.on('pageerror',e=>evidence.errors.push(e.name));await page.emulateMedia({reducedMotion:'reduce'});
async function geometry(){return page.evaluate(()=>{const selectors=['[data-surface-trigger="chat"]','[data-surface-trigger="hall"]','[aria-label="Return to Map from Chat"]','[aria-label="Return to Map from Board"]'];return{overflow:document.documentElement.scrollWidth>innerWidth+1,controls:selectors.flatMap(selector=>{const e=document.querySelector(selector);if(!e||!e.checkVisibility())return[];const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return[{selector,width:r.width,height:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,uncovered:!!hit&&e.contains(hit)}];})};});}
try{
 await loginFp4(page,'a',fixture,'http://localhost:3000');assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
 for(const width of [375,1440]){
  step=`keyboard ${width}`;await page.setViewportSize({width,height:900});
  for(const [surface,name] of [['chat','Chat'],['hall','Board']]){
   const trigger=page.locator(`[data-surface-trigger="${surface}"]`);await trigger.focus();
   await page.keyboard.press('Shift');
   const triggerFocus=await trigger.evaluate(e=>{const s=getComputedStyle(e);return{focused:document.activeElement===e,outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});
   evidence.cases.push({width,surface,triggerFocus});assert(triggerFocus.focused&&triggerFocus.outline!=='none'&&triggerFocus.width>=2);
   await page.keyboard.press('Enter');await page.locator(`[data-workspace-pane="${surface}"]`).waitFor();
   await page.waitForFunction(surface=>document.activeElement===document.querySelector(`[data-workspace-pane="${surface}"]`),surface);
   const focus=await page.locator(`[data-workspace-pane="${surface}"]`).evaluate(e=>{const s=getComputedStyle(e);return{focused:document.activeElement===e,outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});
   evidence.cases.push({width,surface,paneFocus:focus});assert(focus.focused&&focus.outline!=='none'&&focus.width>=2);
   const minimize=page.getByRole('button',{name:`Minimize ${name}`,exact:true});await minimize.focus();await page.keyboard.press('Enter');await page.locator(`[data-workspace-pane="${surface}"]`).waitFor({state:'hidden'});assert(await trigger.evaluate(e=>document.activeElement===e));
  }
  evidence.cases.push({width,keyboardToggleCollapseFocus:true,reducedMotion:true});
 }
 step='double text';await page.setViewportSize({width:390,height:900});
 // Snapshot sizes first so nested inheritance cannot compound the override.
 await page.evaluate(()=>{const elements=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement),sizes=elements.map(e=>parseFloat(getComputedStyle(e).fontSize));elements.forEach((e,i)=>{if(Number.isFinite(sizes[i]))e.style.setProperty('font-size',`${sizes[i]*2}px`,'important');});});
 for(const [surface,name] of [['chat','Chat'],['hall','Board']]){
  step=`double text ${name}`;await page.locator(`[data-surface-trigger="${surface}"]`).click();await page.locator(`[data-workspace-pane="${surface}"]`).waitFor();
  const measured=await geometry();evidence.cases.push({surface,doubleText:measured});assert(!measured.overflow);assert(measured.controls.every(c=>c.inside&&c.uncovered&&c.width>=44&&c.height>=44));
  await page.screenshot({path:`.git/ms74-fp4/browser/a11y-${stamp}-${surface}-390.png`});await page.getByRole('button',{name:`Return to Map from ${name}`,exact:true}).click();
 }
 assert.deepEqual(evidence.errors,[]);evidence.pass=true;
}catch(e){evidence.failedStep=step;evidence.failureType=e.name;process.exitCode=1;await page.screenshot({path:`.git/ms74-fp4/browser/a11y-${stamp}-failure.png`}).catch(()=>{});}
finally{await page.evaluate(async()=>{if(window.Clerk?.session?.status==='active'){await fetch('/api/realtime/logout',{method:'POST'});await window.Clerk.signOut();}}).catch(()=>{});await context.close();await browser.close();writeFileSync(path,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt:path}));}

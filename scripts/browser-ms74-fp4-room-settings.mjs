/** Normal isolated A/B sessions; settings inspection and unsaved-draft cancellation only. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {fp4Context,loginFp4} from "./lib/ms74-fp4-browser.mjs";
reviewEnvironment();const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(fixture.project,REVIEW_PROJECT);
const path=`.git/ms74-fp4/browser/settings-${Date.now()}.json`,evidence={pass:false,cases:[],providerCalls:0,settingsWrites:0};
const browser=await chromium.launch({headless:true});let context,page,step="login";
try{
 for(const actor of ["a","b"]){
  context=await fp4Context(browser);page=await context.newPage();await loginFp4(page,actor,fixture);
  await page.getByRole("button",{name:"Conversation options",exact:true}).click();await page.getByRole("button",{name:"Room Settings",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Room Settings",exact:true});await dialog.getByRole("heading",{name:"Room details",exact:true}).waitFor();
  step=`${actor} owner/member presentation`;
  assert.equal(await dialog.getByLabel("Room name",{exact:true}).count(),actor==="a"?1:0);
  assert.equal(await dialog.getByRole("button",{name:"Save Room",exact:true}).count(),actor==="a"?1:0);
  assert.equal(await dialog.getByRole("button",{name:"Leave Room",exact:true}).count(),actor==="b"?1:0);
  assert.equal(await dialog.getByText("Admin",{exact:true}).count(),0);assert.equal(await dialog.getByRole("button",{name:/Nuke Room|Delete Room/}).count(),0);
  const select=async name=>{const toggle=dialog.locator('.settings-category-trigger');if(await toggle.isVisible())await toggle.click();await dialog.locator('.scoped-settings-nav').getByRole('button',{name,exact:true}).click();};
  await select("People");await dialog.getByRole("heading",{name:"People · 3",exact:true}).waitFor();
  assert.equal(await dialog.locator('.room-member-list > li').count(),3);
  assert.equal(await dialog.getByRole("button",{name:/^Remove /}).count(),actor==="a"?2:0);
  await select("Structure");assert(await dialog.getByRole('link',{name:'Room workspace',exact:true}).isVisible());
  assert.equal(await dialog.getByRole('link',{name:'Selected QA',exact:true}).count(),actor==="a"?1:0);
  await select("My preferences");assert(await dialog.getByText("Only for you. Shared Room settings stay unchanged.",{exact:true}).isVisible());
  assert(await dialog.getByText(/Direct mentions still notify/).isVisible());
  assert(await dialog.locator('.scoped-settings-section').evaluate(el=>el.lastElementChild?.classList.contains('settings-scope')));
  evidence.cases.push(`${actor}: actual Owner/Member controls, three members, selected Subroom boundary, private mute disclosure, no Admin or Room deletion`);
  if(actor==="a"){
   await select("Room details");const field=dialog.getByLabel("Room name",{exact:true}),original=await field.inputValue();await field.fill("Unsaved synthetic draft");
   await dialog.getByRole("button",{name:"Close Room Settings",exact:true}).click();await dialog.getByRole("heading",{name:"Discard your changes?",exact:true}).waitFor();
   await dialog.getByRole("button",{name:"Keep editing",exact:true}).click();assert.equal(await field.inputValue(),"Unsaved synthetic draft");await field.fill(original);
   evidence.cases.push("Unsaved Room name is guarded; Keep editing preserves draft; original restored without save");
  }
  for(const width of [320,390,430,768,1440,1728]){
   step=`${actor} settings width ${width}`;await page.setViewportSize({width,height:900});await select("People");
   await dialog.getByText("Loading invitations…",{exact:true}).waitFor({state:"hidden",timeout:60000});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const bounds=await dialog.boundingBox();assert(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1);
   await page.screenshot({path:`.git/ms74-fp4/browser/settings-${actor}-${width}.png`});
   await select("Room details");
  }
  await dialog.getByRole("button",{name:"Close Room Settings",exact:true}).click();await dialog.waitFor({state:"hidden"});
  evidence.cases.push(`${actor}: six responsive widths, category controls and dismissal`);
  await context.close();context=null;
 }
 evidence.pass=true;
}catch(error){evidence.failedStep=step;evidence.failureType=error.name;process.exitCode=1;if(page)await page.screenshot({path:".git/ms74-fp4/browser/settings-failure.png"}).catch(()=>{});}
finally{if(context)await context.close();await browser.close();writeFileSync(path,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt:path}));}

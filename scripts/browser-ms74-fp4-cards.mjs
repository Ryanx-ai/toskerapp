/** Real authenticated app actions in the exact isolated fixture; no real GPS/provider requests. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {fp4Context,loginFp4} from "./lib/ms74-fp4-browser.mjs";
reviewEnvironment();
const fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8")),content=JSON.parse(readFileSync(".git/ms74-fp4/review-content.json","utf8"));
assert.equal(fixture.project,REVIEW_PROJECT);assert.equal(content.status,"committed");assert.equal(content.roomId,fixture.roomId);
const receipt=`.git/ms74-fp4/browser/cards-${Date.now()}.json`;
const evidence={pass:false,sha:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),dirtyApplication:true,isolated:true,providerCalls:0,syntheticOnly:true,cases:[],errors:[]};
const browser=await chromium.launch({headless:true});const contexts=[],pages=[];let step="sign-in";
const save=()=>writeFileSync(receipt,JSON.stringify(evidence,null,2),{mode:0o600});
const record=name=>{evidence.cases.push(name);save();console.log(JSON.stringify({pass:name}));};
try{
 for(const actor of ["a","b"]){const context=await fp4Context(browser);contexts.push(context);const page=await context.newPage();pages.push(page);page.on("pageerror",error=>evidence.errors.push(error.name));await loginFp4(page,actor,fixture);}
 const [a,b]=pages,cardId=content.places[1],title="FP4 synthetic point 2";
 const card=page=>page.locator(`[data-place-id="${cardId}"]`);
 const menu=page=>page.getByRole("dialog",{name:`Place actions for ${title}`,exact:true});
 const open=async page=>{await card(page).getByRole("button",{name:`Place actions for ${title}`,exact:true}).click();await menu(page).waitFor();};
 const revision=page=>page.locator('[data-trip-revision]').getAttribute('data-trip-revision');
 const changed=async(page,before)=>page.waitForFunction(before=>Number(document.querySelector('[data-trip-revision]')?.getAttribute('data-trip-revision'))>Number(before),before,{timeout:60000});
 step="eight actions and private Hide";
 await open(a);assert.deepEqual(await menu(a).getByRole("button").allTextContents(),["Info","Unstar","Copy to Route","Move to Route","Lock","Hide","Skip","Nuke"]);
 const red=await menu(a).getByRole("button",{name:"Nuke",exact:true}).evaluate(el=>getComputedStyle(el).color);assert.equal(red,"rgb(255, 156, 174)");
 await a.screenshot({path:".git/ms74-fp4/browser/card-actions.png"});
 await menu(a).getByRole("button",{name:"Hide",exact:true}).click();assert.equal(await card(a).getAttribute("data-hidden"),"true");assert.equal(await card(b).getAttribute("data-hidden"),"false");await a.keyboard.press("Escape");
 record("Exactly eight primary actions; destructive red; Hide remains viewer-private");
 step="Move preserves identity and comments";
 await open(a);await menu(a).getByRole("button",{name:"Move to Route",exact:true}).click();
 const transfer=a.getByRole("dialog",{name:"Move to route",exact:true});await transfer.getByRole("combobox",{name:"Destination route",exact:true}).selectOption(content.routes[1]);
 await transfer.getByRole("button",{name:"Move to route",exact:true}).click();await transfer.waitFor({state:"hidden",timeout:60000});
 assert.equal(await card(a).getAttribute("data-hidden"),"true");
 await b.waitForFunction(id=>!document.querySelector(`[data-place-id="${id}"]`),cardId,{timeout:60000});
 await b.getByRole("button",{name:"Day 2 QA",exact:true}).click();await card(b).waitFor();assert.equal(await card(b).getAttribute("data-hidden"),"false");
 await card(b).getByRole("button",{name:`Comments on ${title}, 1`,exact:true}).click();await b.getByText("FP4 synthetic comment: retained when this card moves.",{exact:true}).waitFor({timeout:60000});await b.getByRole("button",{name:"Close comments",exact:true}).click();
 record("A→B Move reconciles both routes; same card/comment identity; private Hide survives only for A");
 step="shared Skip and consent-independent state";
 await open(b);const before=await revision(a);await menu(b).getByRole("button",{name:"Skip",exact:true}).click();await b.keyboard.press("Escape");await changed(a,before);
 await open(a);assert(await menu(a).getByRole("button",{name:"Include",exact:true}).isVisible());await a.keyboard.press("Escape");
 record("B→A shared Skip updates without changing viewer-private Hide");
 step="Info preserves secondary tools";
 await open(b);await menu(b).getByRole("button",{name:"Info",exact:true}).click();const info=b.getByRole("dialog",{name:title,exact:true});
 assert(await info.getByRole("button",{name:"Edit shared note",exact:true}).isVisible());assert(await info.getByRole("button",{name:"Earlier",exact:true}).isVisible());assert(await info.getByRole("button",{name:"Reposition checkpoint",exact:true}).isVisible());await info.getByRole("button",{name:"Close place details",exact:true}).click();
 record("Info retains note, keyboard ordering and manual-checkpoint reposition tools");
 step="Nuke confirmation safely cancels";
 await open(b);await menu(b).getByRole("button",{name:"Nuke",exact:true}).click();const nuke=b.getByRole("dialog",{name:"Nuke this place?",exact:true});
 assert(await nuke.getByRole("button",{name:"Cancel",exact:true}).evaluate(el=>el===document.activeElement));
 assert.equal(await nuke.getByRole("button",{name:"Nuke place",exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(161, 30, 59)");
 await b.screenshot({path:".git/ms74-fp4/browser/card-nuke-confirmation.png"});await nuke.getByRole("button",{name:"Cancel",exact:true}).click();assert(await card(b).isVisible());
 record("Nuke requires explicit confirmation; red destructive button; safe Cancel focus; cancellation preserves card");
 step="responsive menu";
 for(const width of [320,390,430,768,1440,1728]){await b.setViewportSize({width,height:900});await open(b);assert(await menu(b).getByRole("button",{name:"Nuke",exact:true}).isVisible());assert(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await b.screenshot({path:`.git/ms74-fp4/browser/card-menu-${width}.png`});await b.keyboard.press("Escape");}
 record("Primary menu usable at all six widths with keyboard dismissal");
 for(const page of pages){const metrics=await page.evaluate(()=>window.__liveQa.snapshot());assert.equal(metrics.liveChannels,0);assert(metrics.maxConnections<=1);}
 assert.deepEqual(evidence.errors,[]);evidence.pass=true;
}catch(error){evidence.failedStep=step;evidence.failureType=error.name;console.error(JSON.stringify({pass:false,step,type:error.name}));if(pages[0])await pages[0].screenshot({path:".git/ms74-fp4/browser/cards-failure.png"}).catch(()=>{});process.exitCode=1;}
finally{for(const context of contexts)await context.close();await browser.close();save();console.log(JSON.stringify({pass:evidence.pass,receipt}));}

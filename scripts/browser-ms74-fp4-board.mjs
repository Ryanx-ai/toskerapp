/** Populated Board/Chat composition in exact-owned isolated FP4 Room. */
import assert from "node:assert/strict";
import {existsSync,readFileSync,writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {neon} from "@neondatabase/serverless";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {fp4Context,loginFp4} from "./lib/ms74-fp4-browser.mjs";
const env=reviewEnvironment(),sql=neon(env.DATABASE_URL),fixture=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(fixture.project,REVIEW_PROJECT);
const founders=await sql`select u.id from users u join room_memberships m on m.user_id=u.id where u.tid='8V3X7P1' and m.room_id=${fixture.roomId}::uuid`;assert.equal(founders.length,1);
const recordPath=".git/ms74-fp4/board-content.json";assert(!existsSync(recordPath),"Recover existing note receipt instead of duplicate creation");
const owned={status:"prepared",roomId:fixture.roomId,title:`FP4 shared planning note ${randomUUID().slice(0,8)}`,id:null,retained:true};writeFileSync(recordPath,JSON.stringify(owned,null,2),{flag:"wx",mode:0o600});
const receipt=`.git/ms74-fp4/browser/board-${Date.now()}.json`,evidence={pass:false,cases:[],errors:[],providerCalls:0};
const browser=await chromium.launch({headless:true}),contexts=[],pages=[];let step="normal sign-in";
const board=p=>p.locator('[data-workspace-pane="hall"]');
try{
 for(const actor of ["a","b"]){const c=await fp4Context(browser);contexts.push(c);const p=await c.newPage();pages.push(p);p.on("pageerror",e=>evidence.errors.push(e.name));await loginFp4(p,actor,fixture,"http://localhost:3000");await p.locator('[data-surface-trigger="hall"]').click();await board(p).getByRole("button",{name:"New Note",exact:true}).waitFor();}
 const [a,b]=pages;step="normal shared note creation";await board(a).getByRole("button",{name:"New Note",exact:true}).click();await a.getByRole("textbox",{name:"Title",exact:true}).fill(owned.title);await a.getByRole("textbox",{name:"Note",exact:true}).fill("Synthetic FP4 Founder Review content. Map, Board and Chat continuity only; no real itinerary or personal data.");await a.getByRole("button",{name:"Add note",exact:true}).click();
 const noteA=board(a).locator('.hall-object').filter({has:a.getByRole("heading",{name:owned.title,exact:true})});await noteA.waitFor({timeout:60000});owned.id=await noteA.getAttribute("data-hall-id");assert(owned.id);owned.status="committed";writeFileSync(recordPath,JSON.stringify(owned,null,2),{mode:0o600});
 await board(b).getByRole("heading",{name:owned.title,exact:true}).waitFor({timeout:60000});evidence.cases.push("A creates synthetic Board note; B receives without reload; exact note retained for Founder Review");
 step="populated Board state and Chat draft";const canvas=await a.locator('.maplibregl-canvas').elementHandle();await a.locator('[data-surface-trigger="chat"]').click();const chat=a.locator('[data-workspace-pane="chat"]'),draft=chat.getByPlaceholder("Message…",{exact:true});await draft.fill("Unsent FP4 companion draft");
 await a.locator('[data-surface-trigger="hall"]').click();assert(await noteA.isVisible());await a.getByRole("button",{name:"Open Board alone",exact:true}).click();assert.equal(await a.locator('[data-workspace-pane="map"]').getAttribute("inert"),"");await a.getByRole("button",{name:"Minimize Board",exact:true}).click();await a.getByRole("button",{name:"Close Board companion",exact:true}).click();assert(await canvas.evaluate(el=>el.isConnected));await a.locator('[data-surface-trigger="chat"]').click();assert.equal(await draft.inputValue(),"Unsent FP4 companion draft");await a.getByRole("button",{name:"Close Chat companion",exact:true}).click();evidence.cases.push("Populated Board expand/minimize/close preserves Map canvas and unsent Chat draft");
 step="responsive populated Board";await a.locator('[data-surface-trigger="hall"]').click();
 for(const width of [320,390,430,768,1440,1728]){await a.setViewportSize({width,height:900});assert(await noteA.isVisible());assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await a.screenshot({path:`.git/ms74-fp4/browser/board-${width}.png`});}
 evidence.cases.push("Populated Board fits six widths without document overflow");
 step="reload and deep link";await b.reload({waitUntil:"domcontentloaded"});await b.locator('[data-surface-trigger="hall"]').waitFor({timeout:60000});if(!await board(b).isVisible())await b.locator('[data-surface-trigger="hall"]').click();await board(b).getByRole("heading",{name:owned.title,exact:true}).waitFor({timeout:60000});
 await b.goto(`http://localhost:3000/room/${fixture.slug}/hall`,{waitUntil:"domcontentloaded"});await board(b).getByRole("heading",{name:owned.title,exact:true}).waitFor({timeout:60000});await b.goBack({waitUntil:"domcontentloaded"});await b.locator('[data-surface-trigger="hall"]').waitFor({timeout:60000});evidence.cases.push("Board content survives reload; legacy Board URL and browser Back remain authorized");
 assert.deepEqual(evidence.errors,[]);evidence.pass=true;
}catch(e){evidence.failedStep=step;evidence.failureType=e.name;evidence.failureLine=e.stack?.match(/browser-ms74-fp4-board\.mjs:(\d+):\d+/)?.[1];process.exitCode=1;}
finally{for(const p of pages)await p.evaluate(async()=>{if(window.Clerk?.session?.status==="active"){await fetch("/api/realtime/logout",{method:"POST"});await window.Clerk.signOut();}}).catch(()=>{});for(const c of contexts)await c.close();await browser.close();writeFileSync(receipt,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt,ownedNoteStatus:owned.status}));}

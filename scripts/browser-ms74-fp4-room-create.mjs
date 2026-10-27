/** Normal UI creation/invitation in a newly owned isolated disposable QA Room.
 * No provider/GPS calls. Founder identity resolves before creation; explicit
 * membership is granted only to the exact newly created Room before acceptance.
 * Keep its private ownership receipt for separately guarded cleanup. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync,writeFileSync} from "node:fs";
import {neon} from "@neondatabase/serverless";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import {reviewEnvironment,REVIEW_PROJECT} from "./ms74-fp3-review-runtime.mjs";
import {fp4Context,loginFp4} from "./lib/ms74-fp4-browser.mjs";
const q=neon(reviewEnvironment().DATABASE_URL),origin="http://localhost:3000";
const base=JSON.parse(readFileSync(".git/ms74-fp4/review-fixture.json","utf8"));assert.equal(base.project,REVIEW_PROJECT);
const [founders,actors]=await q.transaction([q`select id from users where tid='8V3X7P1' limit 2`,q`select u.id,p.username from users u join profiles p on p.user_id=u.id where p.username in ('tosker-user-a-clerk-test','tosker-user-b-clerk-test')`],{readOnly:true});
assert.equal(founders.length,1);assert.equal(actors.length,2);
const aid=actors.find(x=>x.username==='tosker-user-a-clerk-test').id,bid=actors.find(x=>x.username==='tosker-user-b-clerk-test').id,fid=founders[0].id;
assert.equal(aid,base.ownerId);assert.equal(fid,base.founderId);assert.notEqual(bid,fid);
const recover=process.argv[2];assert(!recover||/^\.git\/ms74-fp4\/disposable-room-[0-9a-f-]{36}\.json$/.test(recover));
const run=recover?JSON.parse(readFileSync(recover,'utf8')).run:randomUUID(),ownedPath=recover??`.git/ms74-fp4/disposable-room-${run}.json`,receipt=`.git/ms74-fp4/browser/room-create-${Date.now()}.json`;
const owned=recover?JSON.parse(readFileSync(ownedPath,'utf8')):{run,project:REVIEW_PROJECT,status:"prepared",name:`FP4 disposable lifecycle ${run.slice(0,8)}`,ownerId:aid,founderId:fid,qaUserIds:[aid,bid],createdAfter:new Date().toISOString(),disposable:true,purpose:"Normal creation, invitation and Chat acceptance; cleanup after exact-ownership audit"};
assert.equal(owned.project,REVIEW_PROJECT);assert.equal(owned.ownerId,aid);assert.equal(owned.founderId,fid);assert.equal(owned.name,`FP4 disposable lifecycle ${run.slice(0,8)}`);assert(owned.disposable);
if(recover)assert(['created','founder-member'].includes(owned.status),'Recover only the recorded setup or invitation-read failure');else writeFileSync(ownedPath,JSON.stringify(owned,null,2),{flag:"wx",mode:0o600});
const evidence={pass:false,cases:[],pageErrors:[],providerCalls:0,sharingCalls:0,cleanupScheduled:true};
const browser=await chromium.launch({headless:true}),contexts=[],pages=[];let step="sign-in";
try{
 for(const actor of ['a','b']){const c=await fp4Context(browser);contexts.push(c);const p=await c.newPage();pages.push(p);p.on('pageerror',e=>evidence.pageErrors.push(e.name));await loginFp4(p,actor,base,origin);}
 const [a,b]=pages;step="normal Room creation";
 if(!recover){
 await a.getByRole('button',{name:'Start a chat or create a Room',exact:true}).click();
 await a.getByRole('button',{name:/Create a Room/}).click();await a.getByRole('textbox',{name:'Room name',exact:true}).fill(owned.name);
 await a.getByRole('button',{name:'Next',exact:true}).click();await a.getByRole('heading',{name:'Trip details',exact:true}).waitFor();
 await a.getByPlaceholder('JB Supper Run',{exact:true}).fill('Synthetic QA');await a.getByRole('button',{name:'Create Room',exact:true}).click();
 await a.getByRole('heading',{name:"Room's ready",exact:true}).waitFor({timeout:60000});
 }
 const rows=await q`select r.id,r.slug,r.created_at::text as created_at,c.id as conversation_id from rooms r join conversations c on c.room_id=r.id and c.is_primary=true where r.name=${owned.name} and r.owner_id=${aid}::uuid and r.created_at>=${owned.createdAfter}::timestamptz`;
 if(recover){assert.equal(rows.length,1);assert.equal(rows[0].id,owned.roomId);assert.equal(rows[0].conversation_id,owned.conversationId);assert(Math.abs(Date.parse(rows[0].created_at)-Date.parse(owned.createdAt))<=1);owned.originalParsedCreatedAt=owned.createdAt;}
 assert.equal(rows.length,1);Object.assign(owned,{roomId:rows[0].id,slug:rows[0].slug,createdAt:rows[0].created_at,conversationId:rows[0].conversation_id});if(!recover)owned.status='created';writeFileSync(ownedPath,JSON.stringify(owned,null,2),{mode:0o600});
 if(owned.status==='created'){
 const grant=await q.transaction([
  q`insert into room_memberships(room_id,user_id,role) select r.id,u.id,'member' from rooms r join users u on u.tid='8V3X7P1' where r.id=${owned.roomId}::uuid and r.owner_id=${aid}::uuid and r.name=${owned.name} and r.created_at=${owned.createdAt}::timestamptz and u.id=${fid}::uuid returning user_id`,
  q`insert into conversation_participants(conversation_id,user_id) select c.id,m.user_id from conversations c join room_memberships m on m.room_id=c.room_id where c.id=${owned.conversationId}::uuid and c.room_id=${owned.roomId}::uuid and m.user_id=${fid}::uuid returning user_id`,
 ]);assert(grant.every(x=>x.length===1));owned.status='founder-member';writeFileSync(ownedPath,JSON.stringify(owned,null,2),{mode:0o600});
 }
 const membership=await q`select user_id from room_memberships where room_id=${owned.roomId}::uuid`;assert.deepEqual(membership.map(x=>x.user_id).sort(),[aid,fid].sort());
 if(recover)await a.goto(`${origin}/room/${owned.slug}`,{waitUntil:'domcontentloaded'});else await a.getByRole('button',{name:'Open Room',exact:true}).click();await a.waitForURL(`${origin}/room/${owned.slug}`);await a.locator('[data-map-state="ready"]').waitFor({timeout:60000});
 assert.equal(await a.locator('[data-surface-trigger="map"]').count(),0);assert.equal(await a.locator('[data-surface-trigger="live"]').count(),0);assert.equal(await a.locator('[data-surface-trigger="chat"]').getAttribute('aria-pressed'),'false');
 evidence.cases.push('Normal two-step Room creation opens Map, no Map/Live tabs; exact-TID founder granted explicit membership before acceptance');
 step="normal share invitation";await a.getByRole('button',{name:'Conversation options',exact:true}).click();await a.getByRole('button',{name:'Room Settings',exact:true}).click();
 const settings=a.getByRole('dialog',{name:'Room Settings',exact:true});await settings.getByRole('heading',{name:'Room details',exact:true}).waitFor();await settings.locator('.scoped-settings-nav').getByRole('button',{name:'People',exact:true}).click();
 step='invitation state loaded';await settings.getByText('No active share invite.',{exact:true}).waitFor({timeout:60000});step='invitation duration';await settings.getByRole('combobox',{name:/^Valid for/}).selectOption('1');step='generate invitation';await settings.getByRole('button',{name:'Generate invite',exact:true}).click();
 const link=settings.getByRole('textbox',{name:'Invitation link',exact:true});await link.waitFor({timeout:60000});const url=await link.inputValue();assert(url.startsWith(`${origin}/join/`));
 await b.goto(url,{waitUntil:'domcontentloaded'});await b.getByRole('button',{name:'Join Room',exact:true}).click();await b.waitForURL(`${origin}/room/${owned.slug}`,{timeout:60000});await b.locator('[data-map-state="ready"]').waitFor({timeout:60000});
 const members=await q`select user_id,role from room_memberships where room_id=${owned.roomId}::uuid`;assert.deepEqual(members.map(x=>x.user_id).sort(),[aid,bid,fid].sort());assert.equal(members.find(x=>x.user_id===aid).role,'owner');assert.equal(members.find(x=>x.user_id===bid).role,'member');
 await settings.getByRole('button',{name:'Revoke link',exact:true}).click();await settings.getByText('No active share invite.',{exact:true}).waitFor({timeout:60000});await settings.getByRole('button',{name:'Close Room Settings',exact:true}).click();
 evidence.cases.push('One-hour owned invitation joins normal QA B; Owner/Member roles and founder membership correct; share link revoked afterward');
 step="fresh Room Chat delivery";
 for(const p of [a,b])await p.locator('[data-surface-trigger="chat"]').click();
 const message=`Synthetic lifecycle check ${run.slice(0,8)}`;await a.locator('[data-workspace-pane="chat"]').getByPlaceholder('Message…',{exact:true}).fill(message);await a.locator('[data-workspace-pane="chat"]').getByRole('button',{name:'Send message',exact:true}).click();
 await b.locator('[data-workspace-pane="chat"]').getByText(message,{exact:true}).waitFor({timeout:60000});
 await b.reload({waitUntil:'domcontentloaded'});await b.locator('[data-surface-trigger="chat"]').waitFor({timeout:60000});if(await b.locator('[data-surface-trigger="chat"]').getAttribute('aria-pressed')!=='true')await b.locator('[data-surface-trigger="chat"]').click();await b.locator('[data-workspace-pane="chat"]').getByText(message,{exact:true}).waitFor({timeout:60000});
 evidence.cases.push('Fresh Room A→B Chat delivery and authorized reload persist without changing Map-first default');
 assert.deepEqual(evidence.pageErrors,[]);evidence.pass=true;owned.status='accepted-disposable';writeFileSync(ownedPath,JSON.stringify(owned,null,2),{mode:0o600});
}catch(e){evidence.failedStep=step;evidence.failureType=e.name;evidence.failureLine=e.stack?.match(/browser-ms74-fp4-room-create\.mjs:(\d+):\d+/)?.[1];process.exitCode=1;const p=pages[0];if(p){evidence.alerts=await p.getByRole('alert').allTextContents().catch(()=>[]);evidence.dialogHeadings=await p.getByRole('dialog').getByRole('heading').allTextContents().catch(()=>[]);await p.screenshot({path:receipt.replace('.json','-failure.png'),mask:[p.locator('.invite-layout')]}).catch(()=>{});}}
finally{for(const p of pages)await p.evaluate(async()=>{if(window.Clerk?.session?.status==='active'){await fetch('/api/realtime/logout',{method:'POST'});await window.Clerk.signOut();}}).catch(()=>{});for(const c of contexts)await c.close();await browser.close();writeFileSync(receipt,JSON.stringify(evidence,null,2),{mode:0o600});console.log(JSON.stringify({...evidence,receipt,ownershipReceipt:ownedPath,status:owned.status}));}

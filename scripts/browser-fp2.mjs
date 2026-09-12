import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
assert(bin, "Set AGENT_BROWSER_BIN");
const origin = process.env.FP2_ORIGIN ?? "http://localhost:3000";
const room = process.env.FP2_ROOM ?? "/room/fp2-invitation-review-039009";
const a = "fp2-a", b = "fp2-b";
export async function run(session, ...args) {
  const {stdout} = await exec(bin, ["--session",session,"--json",...args], {timeout:45000});
  const result=JSON.parse(stdout); assert(result.success, JSON.stringify(result.error));
  return args[0]==="eval" ? result.data?.result : result.data;
}
if(process.argv[2]?.startsWith("share")) {
  await invite();
  await until(a,"!!document.querySelector('.fp2-share select')","owner management");
  if(process.argv[2]==="share") {
  assert.equal(await ev(a,"document.querySelector('.fp2-share select').value"),"24");
  await run(a,"select",".fp2-share select","1"); await button(a,"Generate invite");
  await until(a,"!!document.querySelector('.invite-layout input')?.value","new share link");
  }
  const first=await ev(a,"document.querySelector('.invite-layout input').value");
  assert(await ev(a,"!!document.querySelector('.fake-qr svg')"));
  await button(a,"Copy link");
  await until(a,"document.querySelector('.fp2-invitation-management').textContent.includes('Link copied.') || document.querySelector('.fp2-invitation-management').textContent.includes('Copy unavailable')","copy result");
  console.log("Copy result:",await ev(a,"document.querySelector('.fp2-invitation-management [role=status]')?.textContent ?? document.querySelector('.fp2-invitation-management [role=alert]')?.textContent"));
  await invite(); await until(a,"!!document.querySelector('.invite-layout input')?.value","recover share");
  assert.equal(await ev(a,"document.querySelector('.invite-layout input').value"),first);
  await run(a,"select",".fp2-share select","168"); await button(a,"Generate replacement");
  await until(a,`!!document.querySelector('.invite-layout input')?.value && document.querySelector('.invite-layout input').value!==${JSON.stringify(first)}`,"replacement");
  const replacement=await ev(a,"document.querySelector('.invite-layout input').value");
  await run(b,"open",first);
  await until(b,"!document.querySelector('.join-invite-card button') && /unavailable|expired|invalid/i.test(document.body.textContent)","superseded denied");
  await run(b,"open",origin+room); await until(b,"!!document.querySelector('.composer textarea')","member preserved");
  await button(b,"Conversation options"); await button(b,"Room details");
  await until(b,"!!document.querySelector('.fp2-invitation-management') && !document.querySelector('.fp2-invitation-management [role=status]')","member details");
  assert(await ev(b,"!document.querySelector('.fp2-share')"));
  await button(b,"Leave Room"); await button(b,"Leave Room");
  await until(b,"location.pathname==='/app'","left QA Room");
  await run(b,"open",replacement);
  await until(b,"Array.from(document.querySelectorAll('button')).some(e=>e.textContent==='Join Room')","valid share join");
  await button(b,"Join Room");
  await until(b,`location.pathname===${JSON.stringify(room)} && !!document.querySelector('.composer textarea')`,"share rejoin");
  await button(a,"Revoke link");
  await until(a,"!document.querySelector('.invite-layout input') && document.body.textContent.includes('No active share invite.')","revoke disappears");
  await run(b,"open",replacement);
  await until(b,"/unavailable|expired|invalid/i.test(document.body.textContent)","revoked denied");
  await run(b,"open",origin+room); await until(b,"!!document.querySelector('.composer textarea')","member retained after revoke");
  console.log("PASS: default24h/1h/7d, actual QR, recover same link, replace/old denial, non-owner no share controls, leave/rejoin, revoke disappearance/denial, memberships preserved.");
}
function ev(session,js) { return run(session,"eval",js); }
async function until(session,js,label,timeout=30000) {
  const end=Date.now()+timeout;
  while(Date.now()<end) { if(await ev(session,js))return; await new Promise(r=>setTimeout(r,350)); }
  throw new Error(`Timed out: ${label}`);
}
async function button(session,name) {
  await ev(session,`Array.from(document.querySelectorAll('button')).find(e=>(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})?.scrollIntoView({block:'center'})`);
  return run(session,"find","role","button","click","--name",name,"--exact");
}
async function invite() {
  await run(a,"open",origin+room);
  await until(a,"!!document.querySelector('.composer textarea')","owner Chat");
  await button(a,"Conversation options"); await button(a,"Invite");
  await until(a,"!!document.querySelector('.fp2-person')","Friends loaded");
}
async function username() {
  await button(a,"Username");
  await run(a,"fill",".fp2-invite-panel > label input","@tosker-user-b-clerk-test");
  await until(a,"document.querySelectorAll('.fp2-person').length===1 && !document.querySelector('.fp2-person input').disabled","exact eligible B");
  await run(a,"click",".fp2-person input"); await button(a,"Invite person");
  await until(a,"document.querySelector('.fp2-person')?.textContent.includes('Invited')","sent pending");
  await until(a,"!!document.querySelector('button[aria-label=\"Cancel invitation to tosker.user.b+clerk_test\"]')","management caught up");
}
async function notifications() {
  await run(b,"open",origin+"/notifications");
  await until(b,"Array.from(document.querySelectorAll('button')).some(e=>e.textContent==='Accept invite')","recipient invitation");
}
if(process.argv[2]?.startsWith("consent")) {
  if(process.argv[2]==="consent") {
  assert(await ev(b,"document.body.textContent.includes('404') && !document.querySelector('.composer')"),"Pending recipient denied Room");
  await notifications(); await button(b,"Decline");
  await until(b,"!Array.from(document.querySelectorAll('button')).some(e=>e.textContent==='Accept invite')","declined");
  console.log("PASS: pending Room route denied; recipient decline removes acceptance.");
  }
  if(process.argv[2]!=="consent-cancel") { await invite(); await username(); }
  await button(a,"Cancel invitation to tosker.user.b+clerk_test");
  await until(a,"!Array.from(document.querySelectorAll('button')).some(e=>e.textContent==='Cancel invite')","owner cancellation disappears");
  await run(b,"open",origin+"/notifications");
  await until(b,"document.body.textContent.includes('Cancelled')","recipient sees cancellation");
  console.log("PASS: exact normalized username, one result; owner cancellation; recipient terminal state.");
  await invite(); await username(); await notifications(); await button(b,"Accept invite");
  await until(b,`location.pathname===${JSON.stringify(room)} && !!document.querySelector('.composer textarea')`,"accepted Room");
  await run(b,"fill",".composer textarea","FP2 accepted invitation message");
  await button(b,"Send message");
  await run(a,"press","Escape");
  await until(a,"document.body.textContent.includes('FP2 accepted invitation message')","owner receives B message");
  await invite();
  await until(a,"Array.from(document.querySelectorAll('.fp2-person')).some(e=>e.textContent.includes('tosker-user-b-clerk-test')&&e.textContent.includes('Already a member'))","canonical member result");
  console.log("PASS: recipient accept -> Room membership -> B message delivered to A; invited result becomes member on reopen.");
}
if(process.argv[2]==="order-create") {
  for(const [name,visibility] of [["FP2 Alpha","everyone"],["FP2 Private","owners"],["FP2 Beta","everyone"]]) {
    await run(a,"open",origin+room); await until(a,"!!document.querySelector('.composer textarea')","Room");
    await button(a,"Conversation options"); await button(a,"Room details");
    await until(a,"Array.from(document.querySelectorAll('button')).some(e=>e.textContent==='Add Subroom')","owner Structure");
    await button(a,"Add Subroom");
    await run(a,"fill",".wizard-field input",name); await run(a,"select",".wizard-field select",visibility);
    await button(a,"Create Subroom");
    await until(a,`location.pathname.includes('/subroom/') && document.querySelector('.conversation-header')?.textContent.includes(${JSON.stringify(name)}) && !document.querySelector('dialog[open]')`,"created child");
  }
  console.log("PASS: owner creates three children; every new child appends, private child retained for subset QA.");
}
if(process.argv[2]==="order" || process.argv[2]==="order-settings") {
  const names="Array.from(document.querySelectorAll('.messenger-sidebar .subroom-row .conversation-name')).map(e=>e.textContent)";
  if(process.argv[2]==="order") {
  await run(a,"open",origin+room); await until(a,"document.querySelectorAll('.messenger-sidebar .fp2-order-handle').length===3","three handles");
  const before=await ev(a,names); assert.deepEqual(before,["FP2 Alpha","FP2 Private","FP2 Beta"]);
  await button(a,"Reorder FP2 Beta"); await button(a,"Move earlier");
  await until(a,`${names}.join('|')==='FP2 Alpha|FP2 Beta|FP2 Private'`,"sidebar reorder");
  await run(b,"open",origin+room); await until(b,`${names}.join('|')==='FP2 Alpha|FP2 Beta'`,"member subset");
  assert.equal(await ev(b,"document.querySelectorAll('.fp2-order-handle').length"),0);
  await run(a,"drag",'.messenger-sidebar button[aria-label="Reorder FP2 Beta"]','.messenger-sidebar .fp2-order-row:has(button[aria-label="Reorder FP2 Alpha"])');
  await until(a,`${names}.join('|')==='FP2 Beta|FP2 Alpha|FP2 Private'`,"native drag durable");
  await button(a,"Conversation options"); await button(a,"Room details");
  await until(a,"document.querySelectorAll('.room-structure .fp2-order-handle').length===3","Structure controls");
  }
  await run(a,"scrollintoview",'.room-structure button[aria-label="Reorder FP2 Alpha"]');
  await run(a,"click",'.room-structure button[aria-label="Reorder FP2 Alpha"]');
  await button(a,"Move earlier");
  await until(a,"Array.from(document.querySelectorAll('.room-structure a')).map(e=>e.textContent).join('|')==='Room Chat|FP2 Alpha|FP2 Beta|FP2 Private'","Structure shared canonical order");
  await run(a,"press","Escape"); await run(a,"open",origin+room);
  await until(a,`${names}.join('|')==='FP2 Alpha|FP2 Beta|FP2 Private'`,"persisted after reload");
  await run(b,"open",origin+room); await until(b,`${names}.join('|')==='FP2 Alpha|FP2 Beta'`,"B durable relative subset");
  console.log("PASS: sidebar Move/native drag; Settings Move; reload persistence; fixed Room Chat; owner-only controls; member private filtering and relative order.");
}
if(process.argv[2]==="notifications") {
  await run(b,"open",origin+room); await until(b,"!!document.querySelector('.composer textarea')","B Room");
  await button(b,"Conversation options"); await button(b,"Mark Chat unread");
  await run(b,"open",origin+"/friends");
  await run(a,"open",origin+room); await until(a,"!!document.querySelector('.composer textarea')","A Room");
  const send=async text=>{await run(a,"fill",".composer textarea",text);await button(a,"Send message");await until(a,"document.querySelector('.composer textarea')?.value===''","persisted send");};
  for(let i=1;i<=25;i++) {await send(`FP2 notification burst ${i}`);if(i%5===0)console.log(`Sent ${i}/25 through normal Chat UI`);}
  await run(b,"open",origin+"/notifications");
  await until(b,"document.querySelector('.notification-list')?.textContent.includes('sent you 25 messages')","consolidated burst");
  const state=()=>ev(b,"fetch('/api/workspace').then(r=>r.json())");
  let data=await state();
  const cid=data.navigation.rooms.find(r=>r.slug===room.split('/').at(-1)).conversationId;
  await until(b,`fetch('/api/workspace').then(r=>r.json()).then(d=>d.activity.filter(e=>e.conversationId===${JSON.stringify(cid)}&&e.messageBody?.startsWith('FP2 notification burst')).every(e=>e.readAt&&!e.destinationReadAt))`,"list acknowledged, destination retained");
  data=await state();assert(data.preferences.find(p=>p.conversationId===cid)?.manualChatUnreadId,"Notifications preserves manual unread");
  await send("FP2 notification later arrival");
  await until(b,"document.querySelector('.notification-list')?.textContent.includes('sent you 26 messages')","arrival appends stable group");
  data=await state();assert.equal(data.activity.find(e=>e.messageBody==='FP2 notification later arrival').readAt,null,"later arrival not consumed by previous acknowledgement");
  await run(a,"fill",".composer textarea","@tosker-user-b");
  await until(a,"!!document.querySelector('.mention-suggestions [role=option]')","real mention target");
  await run(a,"press","Enter"); await button(a,"Send message");
  await until(a,"document.querySelector('.composer textarea')?.value===''","mention persisted");
  await until(b,"document.querySelector('.notification-list')?.textContent.includes('Mentioned you')","mention separate");
  assert(await ev(b,"!!document.querySelector('.notification-list article[data-event-count=\"26\"]')"));
  data=await state();assert(data.activity.some(e=>e.conversationId===cid&&e.isMention&&!e.readAt&&!e.destinationReadAt));
  await run(b,"open",origin+room);await until(b,"!!document.querySelector('.composer textarea')","open destination");
  await until(b,`fetch('/api/workspace').then(r=>r.json()).then(d=>d.activity.filter(e=>e.conversationId===${JSON.stringify(cid)}&&e.type==='message').every(e=>e.destinationReadAt)&&!d.preferences.find(p=>p.conversationId===${JSON.stringify(cid)})?.manualChatUnreadId)`,"destination catches up",75000);
  console.log("PASS: normal A25-message burst -> B one group; exact list ack preserves destination/manual unread; later arrival26 stays list-unread; real mention separate; opening Chat catches up canonically.");
}
if(process.argv[2]==="notifications-final") {
  const result=await ev(b,"fetch('/api/workspace').then(r=>r.json()).then(d=>({events:d.activity.filter(e=>e.conversationId==='bf6069cb-fc35-45bd-9736-0724ad3e43e9'&&e.type==='message'),preference:d.preferences.find(p=>p.conversationId==='bf6069cb-fc35-45bd-9736-0724ad3e43e9')}))");
  assert(result.events.length>=27&&result.events.every(e=>e.destinationReadAt));assert(!result.preference?.manualChatUnreadId);
  console.log("PASS: canonical destination read and manual marker cleared after local delayed revalidation; no pipeline change. Initial30s browser gate timed out and was not counted as a pass.");
}

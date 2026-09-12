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
export function ev(session,js) { return run(session,"eval",js); }
export async function until(session,js,label,timeout=30000) {
  const end=Date.now()+timeout;
  while(Date.now()<end) { if(await ev(session,js))return; await new Promise(r=>setTimeout(r,350)); }
  throw new Error(`Timed out: ${label}`);
}
export async function button(session,name) {
  await until(session,`(()=>{const modal=document.querySelector('dialog[open]');return [...document.querySelectorAll('button')].some(e=>e.checkVisibility()&&(!modal||modal.contains(e))&&(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})})()`,`visible ${name}`,10000);
  // Only a test locator: avoid fragile body nth-child paths when toast/scripts change.
  const marker=`fp2-${Date.now()}`;
  const selector=await ev(session,`(()=>{const modal=document.querySelector('dialog[open]');const button=Array.from(document.querySelectorAll('button')).find(e=>e.checkVisibility()&&(!modal||modal.contains(e))&&(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)});if(!button)return null;button.dataset.fp2Target=${JSON.stringify(marker)};return '[data-fp2-target="'+button.dataset.fp2Target+'"]'})()`);
  assert(selector,`Visible button: ${name}`);
  await run(session,"scrollintoview",selector);
  return run(session,"click",selector);
}
// This host's native automation evaluation can change focus after a key event.
// Observe the real keyup boundary before the next automation read; log no text keys.
async function keyState(session,key) {
  await ev(session,`(()=>{window.__fp2KeyState=null;const observe=e=>{if(e.key!==${JSON.stringify(key.split("+").at(-1))})return;window.__fp2KeyState={tip:!!document.querySelector('.fp2-deferred-info:popover-open'),menu:!!document.querySelector('.interaction-popover:popover-open'),focus:document.activeElement?.getAttribute('aria-label')};window.removeEventListener('keyup',observe,true)};window.addEventListener('keyup',observe,true);return true})()`);
  await run(session,"press",key);
  return ev(session,"window.__fp2KeyState");
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
if(process.argv[2]?.startsWith("layout")) {
  if(process.argv[2]==="layout") {
  await run(a,"set","viewport","1440","900"); await invite();
  await until(a,"!!document.querySelector('.fp2-share select')","share controls");
  if(!await ev(a,"!!document.querySelector('.invite-layout input')")) {await button(a,"Generate invite");await until(a,"!!document.querySelector('.invite-layout input')","QR fixture");}
  for(const width of (process.env.FP2_WIDTHS ?? "320,390,430,768,1440").split(",").filter(Boolean).map(Number)) {
    await run(a,"set","viewport",String(width),"900");
    await run(a,"scrollintoview",".fp2-invite-panel > label input");
    assert(await ev(a,"(()=>{const p=document.querySelector('.fp2-invite-panel'),r=p.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&p.scrollWidth<=p.clientWidth+1})()"),`Invite width ${width}`);
    await button(a,"Username"); await run(a,"fill",".fp2-invite-panel > label input","tosker-user-b-clerk-test");
    await until(a,"document.querySelectorAll('.fp2-person').length===1","username row");
    assert(await ev(a,"document.querySelector('.fp2-invite-panel').scrollWidth<=document.querySelector('.fp2-invite-panel').clientWidth+1"));
    await run(a,"scrollintoview",".fp2-share select");
    assert(await ev(a,"(()=>{const r=document.querySelector('.fp2-share select').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()"));
    await run(a,"screenshot",`/tmp/fp2-invite-${width}.png`);
    await button(a,"Friends");
    console.log(`PASS: Invite/Friends/Username/share/QR/expiry at ${width}px, no horizontal overflow.`);
  }
  await run(a,"press","Escape");
  } else { await run(a,"open",origin+room);await until(a,"!!document.querySelector('.composer textarea')","built Room"); }
  for(const width of (process.env.FP2_WIDTHS ?? "320,390,430,768,1440").split(",").filter(Boolean).map(Number)) {
    await run(a,"set","viewport",String(width),"900");
    await button(a,"Conversation options"); await button(a,"Room details");
    await until(a,"document.querySelectorAll('.room-structure .fp2-order-handle').length===3","Structure");
    await run(a,"scrollintoview",".room-structure");
    assert(await ev(a,"(()=>{const p=document.querySelector('.room-details-panel');return p.scrollWidth<=p.clientWidth+1&&p.getBoundingClientRect().right<=innerWidth+1})()"));
    await run(a,"screenshot",`/tmp/fp2-structure-${width}.png`);
    await run(a,"press","Escape");
    assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"));
    if(width<=430) {await button(a,"Conversation options"); await button(a,"Call — deferred");}
    else await button(a,"Call — deferred");
    await until(a,"!!document.querySelector('.fp2-deferred-info:popover-open')","deferred explanation");
    assert(await ev(a,"(()=>{const p=document.querySelector('.fp2-deferred-info:popover-open'),r=p.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&p.textContent.includes('authorized media sessions')})()"));
    await run(a,"screenshot",`/tmp/fp2-deferred-${width}.png`);
    const escaped=await keyState(a,"Escape");
    assert(!escaped.tip&&escaped.focus==='Call — deferred',JSON.stringify(escaped));
    if(width<=430) {assert(escaped.menu);await run(a,"press","Escape");}
    console.log(`PASS: People/Structure/header/deferred info ${width}px; Escape/focus; no horizontal clipping.`);
  }
  await run(a,"set","viewport","1440","900");
  await button(a,"Call — deferred"); await run(a,"press","Escape"); const tabbed=await keyState(a,"Tab");
  assert(tabbed.focus==='Video — deferred'&&tabbed.tip,JSON.stringify(tabbed));
  const returned=await keyState(a,"Shift+Tab");assert(returned.focus==='Call — deferred'&&returned.tip,JSON.stringify(returned));
  await run(a,"press","Escape");
  await button(a,"Files & images — deferred");await until(a,"document.querySelector('.fp2-deferred-info:popover-open')?.textContent.includes('MS7.6 P-001')","files explanation");
  assert(await ev(a,"document.querySelectorAll('input[type=file]').length===0"));await run(a,"press","Escape");
  await run(a,"scrollintoview",'.message-scroll article:last-of-type button[aria-label="More message actions"]');
  await run(a,"click",'.message-scroll article:last-of-type button[aria-label="More message actions"]');
  await button(a,"Translate — deferred");await until(a,"document.querySelector('.fp2-deferred-info:popover-open')?.textContent.includes('provider/on-device privacy')","Translate disclosure");
  const translated=await keyState(a,"Escape");assert(translated.focus==='Translate — deferred'&&!translated.tip,JSON.stringify(translated));await run(a,"press","Escape");
  await run(a,"open",origin+room+"/hall");await until(a,"!!document.querySelector('.new-hall-card')","Hall");
  await run(a,"click",".new-hall-card");await button(a,"Files & images — deferred");
  await until(a,"!!document.querySelector('.fp2-deferred-info:popover-open')","Hall files disclosure");await run(a,"press","Escape");await run(a,"press","Escape");
  await run(a,"open",origin+"/personal/my-room");await until(a,"!!document.querySelector('.composer textarea')","Sandbox");
  assert(await ev(a,"!document.querySelector('button[aria-label=\"Call — deferred\"]')&&!document.querySelector('button[aria-label=\"Video — deferred\"]')&&!!document.querySelector('button[aria-label=\"Files & images — deferred\"]')"));
  console.log("PASS: keyboard focus explains Video; Escape restores; Files/Translate/Hall debt copy; no file input; Sandbox excludes Call/Video. Emulation, not physical-device certification.");
}
if(process.argv[2]==="contexts") {
  await run(a,"open",origin+room);await until(a,"!!document.querySelector('.composer textarea')","Room");
  const personal=await ev(a,"[...document.querySelectorAll('.messenger-sidebar a[href^=\"/personal/\"]')].find(e=>e.getAttribute('href')!=='/personal/my-room')?.getAttribute('href')");
  const child=await ev(a,"document.querySelector('.messenger-sidebar a[href*=\"/subroom/\"]')?.getAttribute('href')");
  assert(personal&&child,"Existing authorized Personal and Subroom paths");
  for(const path of [personal,child]) {
    await run(a,"open",origin+path);await until(a,"!!document.querySelector('.composer textarea')","context Chat");
    for(const name of ["Call — deferred","Video — deferred","Files & images — deferred"]) {
      await button(a,name);await until(a,"!!document.querySelector('.fp2-deferred-info:popover-open')","context info");await run(a,"press","Escape");
    }
    assert(await ev(a,"document.querySelectorAll('input[type=file]').length===0"));
  }
  console.log("PASS: existing authorized Personal/Subroom Call/Video/Files explanations; no picker or message mutation.");
}

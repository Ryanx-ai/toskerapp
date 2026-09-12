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
async function until(session,js,label) {
  const end=Date.now()+30000;
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

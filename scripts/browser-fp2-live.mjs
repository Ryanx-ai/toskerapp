import assert from "node:assert/strict";
import { run, ev, until, button } from "./browser-fp2.mjs";
const origin="https://toskerapp.vercel.app", a="fp2-a",b="fp2-b",mode=process.argv[2];
const room=process.env.FP2_ROOM;
async function open(session,path){await run(session,"open",origin+path);await until(session,"!!document.querySelector('.composer textarea')","authenticated Chat",60000);}
async function details(){await button(a,"Conversation options");await button(a,"Room details");await until(a,"!!document.querySelector('.room-structure')","Structure");}
async function send(session,text){await run(session,"fill",".composer textarea",text);await button(session,"Send message");await until(session,"document.querySelector('.composer textarea')?.value===''","canonical send");}
if(mode==="live-create"){
  await run(a,"open",origin+"/app");await until(a,"!!document.querySelector('button[aria-label=\"Start a chat or create a Room\"]')","A identity",60000);
  await button(a,"Start a chat or create a Room");await run(a,"click",'.creation-choices button:nth-child(2)');
  await run(a,"fill",'input[aria-label="Room name"]',"FP2 Live Review");await button(a,"Next");await button(a,"Create Room");
  await until(a,"!!document.querySelector('.room-ready')","created Room");await button(a,"Open Room");
  await until(a,"location.pathname.startsWith('/room/')&&!!document.querySelector('.composer textarea')","new Room");
  console.log("LIVE FIXTURE",await ev(a,"location.pathname"));
} else {
  assert(room?.startsWith("/room/fp2-live-review-"),"Use exact live fixture path, never an existing founder Room");
  if(mode==="live-invite"){
    await open(a,room);await button(a,"Conversation options");await button(a,"Invite");await until(a,"!!document.querySelector('.fp2-person')","Friends");
    assert(await ev(a,"(()=>{const e=[...document.querySelectorAll('.fp2-person')].find(e=>e.textContent.includes('tosker-user-b-clerk-test'))?.querySelector('input');if(!e)return false;e.dataset.fp2Friend='b';return true})()"));
    await run(a,"click",'input[data-fp2-friend="b"]');await button(a,"Invite person");
    await until(a,"document.querySelector('.fp2-person')?.textContent.includes('Invited')","sent");
    await run(b,"open",origin+"/notifications");await until(b,"document.querySelector('.notification-list')?.textContent.includes('FP2 Live Review')","B invitation",60000);
    await button(b,"Accept invite");await until(b,`location.pathname===${JSON.stringify(room)}&&!!document.querySelector('.composer textarea')`,"consented membership");
    await send(b,"FP2 live accepted message");await run(a,"press","Escape");await until(a,"document.body.textContent.includes('FP2 live accepted message')","cross-user delivery",60000);
    console.log("PASS live: Friend invite -> recipient acceptance -> Room membership -> B message visible to A.");
  }
  if(mode==="live-share"){
    await open(a,room);await details();await until(a,"!!document.querySelector('.fp2-share select')","owner share");await button(a,"Generate invite");
    await until(a,"!!document.querySelector('.invite-layout input')?.value","share token");const link=await ev(a,"document.querySelector('.invite-layout input').value");
    assert(await ev(a,"!!document.querySelector('.fake-qr svg')"));
    await open(b,room);await button(b,"Conversation options");await button(b,"Room details");await until(b,"!!document.querySelector('.room-details-panel')","member details");
    assert(await ev(b,"!document.querySelector('.fp2-share')"));await button(b,"Leave Room");await button(b,"Leave Room");await until(b,"location.pathname==='/app'","left");
    await run(b,"open",link);await until(b,"!!document.querySelector('.join-invite-card button')","valid share");await button(b,"Join Room");await until(b,`location.pathname===${JSON.stringify(room)}&&!!document.querySelector('.composer textarea')`,"share joined");
    console.log("PASS live: owner QR/recoverable share; member cannot manage; leave -> bearer join.");
  }
  if(mode==="live-order"){
    for(const name of ["Live Alpha","Live Beta"]){await open(a,room);await details();await button(a,"Add Subroom");await run(a,"fill",".wizard-field input",name);await button(a,"Create Subroom");await until(a,"location.pathname.includes('/subroom/')&&!document.querySelector('dialog[open]')","created child");}
    await open(a,room);await button(a,"Reorder Live Beta");await button(a,"Move earlier");
    const ordered="Array.from(document.querySelectorAll('.messenger-sidebar .subroom-row .conversation-name')).map(e=>e.textContent).join('|')==='Live Beta|Live Alpha'";
    await until(a,ordered,"owner order");await open(b,room);await until(b,ordered,"member shared order");assert.equal(await ev(b,"document.querySelectorAll('.fp2-order-handle').length"),0);
    console.log("PASS live: two appended children; owner shared order; B same relative order/no controls.");
  }
  if(mode==="live-attention"){
    await run(b,"open",origin+"/friends");await open(a,room);await send(a,"FP2 live burst one");await send(a,"FP2 live burst two");
    await run(b,"open",origin+"/notifications");await until(b,"!!document.querySelector('.notification-list article[data-event-count=\"2\"]')","two-message group",60000);
    await run(a,"fill",".composer textarea","@tosker-user-b");await until(a,"!!document.querySelector('.mention-suggestions [role=option]')","mention");await run(a,"press","Enter");await button(a,"Send message");
    await until(b,"document.querySelector('.notification-list')?.textContent.includes('Mentioned you')","separate mention",60000);
    assert(await ev(b,"!!document.querySelector('.notification-list article[data-event-count=\"2\"]')"));
    console.log("PASS live: ordinary messages grouped; selected direct mention remains separate.");
  }
}

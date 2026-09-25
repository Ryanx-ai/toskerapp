import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.MS72_A??'fp2-fresh',b=process.env.MS72_B??'fp2-b',o=process.env.MS72_ORIGIN??'http://localhost:3000';
const room=process.env.FP4_ROOM;assert(room?.startsWith('/room/fp4-review-'));
const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';
const pins="[...document.querySelectorAll('.messenger-sidebar .sidebar-pin-row.is-pinned')].map(e=>e.dataset.pinId)";
const row=path=>`.sidebar-pin-row:has(a[href="${path}"])`;
async function open(s,path=room){await run(s,'open',o+path);await until(s,"!!document.querySelector('.composer textarea')",'Chat');}
async function organize(path){await run(a,'click',row(path)+' > .sidebar-pin-control');}
for(const s of [a,b]){await run(s,'set','viewport','1440','900');await open(s);}
const original=await ev(a,pins),other=await ev(b,pins);
const ids=await ev(a,`[${[room,personal].map(p=>`document.querySelector(${JSON.stringify(row(p))}).dataset.pinId`).join(',')}]`);
assert(ids.every(id=>!original.includes(id)),'Use unpinned fixture targets; do not overwrite existing order');
try{
 for(const path of [room,personal]){await organize(path);await button(a,'Pin to top');await until(a,`document.querySelector(${JSON.stringify(row(path))}).classList.contains('is-pinned')`,'pin');}
 await ev(a,"(()=>{window.__fp4Drag=[];for(const type of ['dragstart','dragenter','dragover','drop','dragend'])document.addEventListener(type,e=>{if(window.__fp4Drag.length<40)window.__fp4Drag.push({type,target:e.target.className,types:[...(e.dataTransfer?.types??[])]})});return true})()");
 const coords=await ev(a,`[${[personal,room].map(p=>`(()=>{const r=document.querySelector(${JSON.stringify(row(p)+' a')}).getBoundingClientRect();return [r.left+70,r.top+r.height/2]})()`).join(',')}]`);
 // Real pointer events over the row body, not synthetic dispatch or the drag handle.
 await run(a,'mouse','move',String(Math.round(coords[0][0])),String(Math.round(coords[0][1])));await run(a,'mouse','down');
 for(let i=1;i<=12;i++)await run(a,'mouse','move',String(Math.round(coords[0][0])),String(Math.round(coords[0][1]+(coords[1][1]-coords[0][1])*i/12)));
 // Chromium emits dragenter before dragover when crossing the final nested text node.
 await run(a,'mouse','move',String(Math.round(coords[1][0]+2)),String(Math.round(coords[1][1])));
 await run(a,'mouse','move',String(Math.round(coords[1][0])),String(Math.round(coords[1][1])));
 await run(a,'mouse','up');
 console.log('POINTER_DRAG',await ev(a,'window.__fp4Drag'));
 const expected=[...original,ids[1],ids[0]];
 await until(a,`JSON.stringify(${pins})===${JSON.stringify(JSON.stringify(expected))}`,'full-row drag saved');
 await open(a);assert.deepEqual(await ev(a,pins),expected);await open(b);assert.deepEqual(await ev(b,pins),other);
 await organize(room);await button(a,'Move earlier');await until(a,`JSON.stringify(${pins})===${JSON.stringify(JSON.stringify([...original,...ids]))}`,'keyboard alternative saved');
 console.log('PASS real full-row pointer drag / durable reload / B isolation / Move earlier alternative');
}finally{
 for(const path of [personal,room]){if(await ev(a,`document.querySelector(${JSON.stringify(row(path))})?.classList.contains('is-pinned')`)){await organize(path);await button(a,'Unpin');await until(a,`!document.querySelector(${JSON.stringify(row(path))})?.classList.contains('is-pinned')`,'unpin restored');}}
 assert.deepEqual(await ev(a,pins),original);
}
await organize(room);await button(a,'Mute');await until(a,`!!document.querySelector(${JSON.stringify(row(room)+' [aria-label="Muted"]')})`,'visible mute');
await open(b);await run(b,'click',row(room)+' > .sidebar-pin-control');assert(await ev(b,"[...document.querySelectorAll('.interaction-popover:popover-open button')].some(e=>e.textContent==='Mute')"));await run(b,'press','Escape');
await organize(room);await button(a,'Unmute');await until(a,`!document.querySelector(${JSON.stringify(row(room)+' [aria-label="Muted"]')})`,'unmuted');
await organize(room);await button(a,'Mark Chat unread');await until(a,"location.pathname==='/app'&&location.search==='?view=list'&&!document.querySelector('.conversation-header')",'unread does not self-clear');
await until(a,`!!document.querySelector(${JSON.stringify(row(room)+' .attention-mark')})`,'visible unread');await open(a);
await button(a,'Organize your Sandbox');assert(await ev(a,"!/Pin to top|Mute|Leave Room/.test(document.querySelector('.interaction-popover:popover-open').textContent)"));await run(a,'press','Escape');
console.log('PASS private mute and icon / mark unread visual and list recovery / Sandbox anchor');

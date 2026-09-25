import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.MS72_A??'fp2-fresh',b=process.env.MS72_B??'fp2-b',origin=process.env.MS72_ORIGIN??'http://localhost:3000',cap=process.env.FP3_CAPTURES;
const room='/room/fp3-review-4f3080',child=room+'/subroom/f738df3d-110e-4185-90fe-0922ff7e8ac1',personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';assert(cap);
const pins="[...document.querySelectorAll('.messenger-sidebar .sidebar-pin-row.is-pinned')].map(e=>e.dataset.pinId)",menu="document.querySelector('.interaction-popover:popover-open')";
async function open(s,path){const start=Date.now();await run(s,'open',origin+path);await until(s,"!!document.querySelector('.composer textarea')&&!/Loading messages|Messages couldn't be loaded|Connecting to live updates/.test(document.body.innerText)",'loaded Chat',45000);console.log('MEASURE settled route + browser-command overhead ms',s,path,Date.now()-start);}
if(!process.env.FP3_NAV_RESUME){
for(const s of[a,b]){await run(s,'set','viewport','1440','900');await open(s,room);}
const baseA=await ev(a,pins),baseB=await ev(b,pins);
await button(a,'Organize FP3 Review');await button(a,'Pin to top');await until(a,`${pins}.length===${baseA.length+1}`,'pin saved');
await open(a,room);assert.equal((await ev(a,pins)).length,baseA.length+1);await open(b,room);assert.deepEqual(await ev(b,pins),baseB);
if(baseA.length){await button(a,'Organize FP3 Review');await button(a,'Move earlier');await until(a,`JSON.stringify(${pins})!==${JSON.stringify(JSON.stringify([...baseA,(await ev(a,pins)).at(-1)]))}`,'move saved');}
await button(a,'Organize FP3 Review');await button(a,'Unpin');await until(a,`${pins}.length===${baseA.length}`,'unpin saved');assert.deepEqual(await ev(a,pins),baseA);
await button(a,'Organize FP3 Review');await button(a,'Mute');await until(a,`!${menu}`,'mute saved');await button(a,'Actions for FP3 Side Trip');await until(a,`${menu}?.textContent.includes('Muted by Room')`,'inherited mute');await run(a,'press','Escape');
await button(b,'Organize FP3 Review');assert(await ev(b,`${menu}.textContent.includes('Mute')&&!${menu}.textContent.includes('Unmute')`));await run(b,'press','Escape');
await button(a,'Organize FP3 Review');await button(a,'Unmute');await until(a,`!${menu}`,'unmute saved');
await button(a,'Organize FP3 Review');await button(a,'Mark Chat unread');await until(a,"location.pathname==='/app'",'unread exit');await open(a,room);
await button(b,'Organize FP3 Review');await button(b,'Room Settings');await until(b,"!!document.querySelector('.room-own-identity')",'member settings');assert(!await ev(b,"!!document.querySelector('.scoped-settings-form input')"));await button(b,'Leave Room');await until(b,"!!document.querySelector('.room-confirmation')",'leave confirm');await button(b,'Cancel');await button(b,'Close Room Settings');
console.log('PASS private pins/reload/B isolation/restoration, inherited mute/restoration, mark-unread exit, member no owner editor, Leave cancel');
}
if(process.env.FP3_NAV_RESUME!=='geometry'){
await open(a,room);
await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:first-child');await until(a,"!!document.querySelector('.friends-search input')",'search');await run(a,'fill','.friends-search input','QXRY2RK');await until(a,"document.querySelector('.creation-panel')?.textContent.includes('tosker.user.b')",'exact B search');
await button(a,'Chat');await until(a,`location.pathname===${JSON.stringify(personal)}&&!document.querySelector('dialog[open]')`,'canonical Personal reuse');
await button(a,'Collapse sidebar');await run(a,'focus','button[aria-label="Expand sidebar"]');await run(a,'press','Enter');await until(a,"!!document.querySelector('button[aria-label=\"Collapse sidebar\"]')",'Enter recovery');await run(a,'focus','button[aria-label="Collapse sidebar"]');await run(a,'press','Space');await until(a,"!!document.querySelector('button[aria-label=\"Expand sidebar\"]')",'Space collapse');await run(a,'reload');await until(a,"!!document.querySelector('.composer textarea')",'reload');assert(await ev(a,"!!document.querySelector('button[aria-label=\"Expand sidebar\"]')"));await button(a,'Expand sidebar');
console.log('PASS real Create Chat search/canonical reuse, keyboard Enter/Space collapse, preference reload and explicit recovery');
}
for(const [w,h]of[[320,844],[390,844],[430,932],[768,1024],[1440,900],[1728,1117],[844,390]].filter(([w])=>!process.env.FP3_ONLY_WIDTH||w===Number(process.env.FP3_ONLY_WIDTH))){
 await run(a,'set','viewport',String(w),String(h));
 for(const [label,path]of[['personal',personal],['room',room],['subroom',child],['sandbox','/personal/my-room']]){
  await open(a,path);assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"),'page overflow');
  const r=await ev(a,"(()=>{const r=document.querySelector('.composer').getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom}})()");assert(r.l>=-1&&r.r<=w+1&&r.t>=0&&r.b<=h+1,JSON.stringify({w,label,r}));
  if(label!=='sandbox')await run(a,'screenshot',`${cap}/${label}-${w}.png`);
 }
 console.log('PASS Chat/composer four scopes bounds',w,h);
}
await run(a,'set','viewport','1440','900');console.log('errors',await run(a,'errors'));

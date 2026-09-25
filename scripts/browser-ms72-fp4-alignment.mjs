import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.FP4_A??'fp2-fresh',o=process.env.FP4_ORIGIN??'http://localhost:3000',out=process.env.FP4_CAPTURES;
assert(out);const room=process.env.FP4_ROOM;assert(room?.startsWith('/room/fp4-review-'));
const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';
async function open(path,ready){const start=Date.now();await run(a,'open',o+path);await until(a,ready,path,45000);console.log('SETTLED_MS',path,Date.now()-start);}
async function bounded(selector,checkScroll=true){assert(await ev(a,`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1&&(${!checkScroll}||e.scrollWidth<=e.clientWidth+2)})()`),'bounds '+selector);}
for(const [w,h] of [[320,844],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]].filter(([w])=>!process.env.FP4_WIDTHS||process.env.FP4_WIDTHS.split(',').includes(String(w)))){
 await run(a,'set','viewport',String(w),String(h));
 await open('/app',"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')");
 assert(await ev(a,"document.querySelector('.conversation-header').textContent.includes('Sandbox')"),'default Sandbox');
 assert(await ev(a,"!document.querySelector('.surface-add,.fp2-header-deferred')"),'no fake header Add/calls');
 await bounded('.messaging-app');await run(a,'screenshot',`${out}/sandbox-${w}.png`);
 if(w<=640){await run(a,'click','.mobile-back');await until(a,"location.search==='?view=list'&&!document.querySelector('.conversation-header')",'mobile list recovery');await bounded('.messenger-sidebar');}
 await open('/app?view=list',"!!document.querySelector('.create-trigger')");
 await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:first-child');await run(a,'focus','.friends-search input');
 await bounded('dialog[open] > section');assert.equal(await ev(a,"getComputedStyle(document.querySelector('.friends-search input')).outlineStyle"),'none');
 await run(a,'screenshot',`${out}/create-chat-${w}.png`);await button(a,'Close');
 await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:last-child');await run(a,'fill','input[aria-label="Room name"]','FP4 preview only');await button(a,'Next');await bounded('dialog[open] > section');await run(a,'screenshot',`${out}/create-room-${w}.png`);await button(a,'Close');
 await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-content')",'own card');await bounded('.contextual-namecard');
 assert(await ev(a,"!document.querySelector('.contextual-namecard .eyebrow')&&!document.querySelector('.contextual-namecard a[href=\"/profile\"]')"),'lean own card');
 assert(await ev(a,"document.querySelector('.namecard-banner').getBoundingClientRect().height>=128"),'real banner');
 await run(a,'screenshot',`${out}/self-namecard-${w}.png`);await run(a,'press','Escape');await until(a,"!document.querySelector('dialog[open]')",'Escape closes');
 assert(await ev(a,"document.activeElement?.getAttribute('aria-label')==='Open your Namecard'"),'focus restored');
 for(const [path,ready] of [['/settings',"!!document.querySelector('input[name=namecardBio]')"],['/profile',"!!document.querySelector('.profile-surface .namecard')"],['/notifications',"!!document.querySelector('.notification-list')&&!document.querySelector('.notification-load-state')"]]){
  await open(path,ready);await bounded('.messaging-app');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'),'page overflow');
  if(path==='/settings'){await bounded('.scoped-settings-shell');assert.equal(await ev(a,"document.querySelector('input[name=namecardBio]').placeholder"),'Tell people a little about you');}
  await run(a,'screenshot',`${out}/${path.slice(1)}-${w}.png`);
 }
 for(const path of [personal,room,room+'/hall']){
  await open(path,path.endsWith('/hall')?"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')":"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')");
  await bounded('.messaging-app');await bounded('.conversation-header');
  if(path===room)assert(await ev(a,"document.querySelector('.surface-upcoming')?.textContent.includes('Coming next')"));
  await run(a,'screenshot',`${out}/${path===personal?'personal':path.endsWith('/hall')?'hall':'room'}-${w}.png`);
 }
 // Collapsed rail deliberately lets hover tooltips escape; hidden pseudo-elements count in scrollWidth.
 if(w>640){await button(a,'Collapse sidebar');await bounded('.messenger-sidebar',false);await run(a,'screenshot',`${out}/collapsed-${w}.png`);await button(a,'Expand sidebar');}
 console.log('PASS FP4 matrix',w,h);
}
await run(a,'set','viewport','1440','900');console.log('BROWSER_ERRORS',await run(a,'errors'));

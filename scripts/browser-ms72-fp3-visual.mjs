import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.FP3_A ?? 'fp2-fresh',origin=process.env.FP3_ORIGIN ?? 'http://localhost:3000';
const captures=process.env.FP3_CAPTURES;assert(captures);
const dimensions=[[320,844],[390,844],[430,932],[768,900],[1440,900],[1728,1117]];
async function shot(label){await run(a,'screenshot',`${captures}/${label}.png`);}
async function bounds(selector){assert(await ev(a,`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1})()`),selector+' bounded');}
for(const [w,h] of dimensions){
 await run(a,'set','viewport',String(w),String(h));
 await run(a,'open',origin+'/app');await until(a,"!!document.querySelector('.fp3-shell')",'workspace');
 await bounds('.messaging-app');
 if(w>640 && await ev(a,"document.querySelector('.messaging-app').classList.contains('sidebar-collapsed')"))await button(a,'Expand sidebar');
 await shot(`shell-${w}`);
 await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:first-child');
 await until(a,"!!document.querySelector('.friends-search input')",'chat search');
 await run(a,'focus','.friends-search input');
 assert.equal(await ev(a,"getComputedStyle(document.querySelector('.friends-search input')).outlineStyle"),'none');
 assert.equal(await ev(a,"getComputedStyle(document.querySelector('.friends-search')).outlineStyle"),'solid');
 await bounds('dialog[open] > section');await shot(`create-chat-${w}`);await button(a,'Close');
 await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:last-child');
 await run(a,'fill','input[aria-label="Room name"]','FP3 Trip preview');await button(a,'Next');
 await bounds('dialog[open] > section');await shot(`create-room-${w}`);
 assert.equal(await ev(a,"document.querySelectorAll('.option-grid.tags').length"),0);await button(a,'Close');
 if(w>640){await button(a,'Collapse sidebar');await bounds('.messenger-sidebar');await shot(`collapsed-${w}`);await button(a,'Expand sidebar');}
 for(const route of ['profile','settings','notifications']){
   await run(a,'open',origin+'/'+route);await until(a,"!!document.querySelector('.fp3-shell')",route);
   await bounds('.messaging-app');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow');
   await shot(`${route}-${w}`);
 }
 console.log('PASS geometry/creation focus',w,h);
}
await run(a,'set','viewport','1440','900');
console.log('Errors',await run(a,'errors'));

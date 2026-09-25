import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const s=process.env.MS72_A??'fp1-a',origin=process.env.MS72_ORIGIN??'http://localhost:3000',out=process.env.FP2_CAPTURES;
assert(out,'FP2_CAPTURES required');
let extra=false,blocked=false;
try{
  await run(s,'tab','new','--label','fp2-load','about:blank');extra=true;
  await run(s,'network','route',origin+'/api/workspace','--abort');blocked=true;
  await run(s,'open',origin+'/notifications');
  await until(s,"document.querySelector('.notification-load-state')?.getAttribute('role')==='alert'",'notification initial failure');
  assert(!await ev(s,"document.querySelector('.two-line-empty')"));
  await run(s,'network','unroute',origin+'/api/workspace');blocked=false;
  await button(s,'Retry');await until(s,"!document.querySelector('.notification-load-state')&&document.querySelector('.notification-list')?.children.length>0",'notification retry');
  await run(s,'screenshot',out+'/notifications-recovered.png');
  console.log('PASS initial failure never says caught up; real Retry loads canonical notifications');
}finally{if(blocked)await run(s,'network','unroute',origin+'/api/workspace');if(extra)await run(s,'tab','close','fp2-load');await run(s,'tab','t1');}
await run(s,'open',origin+'/settings?section=appearance');await until(s,"!!document.querySelector('input[name=interfaceAccent]')",'Appearance');
const initial=await ev(s,"document.querySelector('input:checked').value");
const target='input[name=interfaceAccent][value='+(initial==='iris'?'tide':'iris')+']';
await run(s,'focus',target);await run(s,'press','Space');
assert(await ev(s,`document.querySelector(${JSON.stringify(target)}).checked`));
assert(await ev(s,`getComputedStyle(document.querySelector(${JSON.stringify(target)}).closest('label')).outlineStyle!=='none'`));
await button(s,'Close');await button(s,'Keep editing');assert(await ev(s,`document.querySelector(${JSON.stringify(target)}).checked`));await button(s,'Close');await button(s,'Discard');
await until(s,"!document.querySelector('dialog[open]')",'discard closed');
console.log('PASS keyboard radio/focus and Keep editing/Discard without saved mutation');
for(const [w,h] of [[320,740],[390,844],[430,932],[768,1024],[1440,900],[1728,1117]]){
  await run(s,'set','viewport',String(w),String(h));await run(s,'open',origin+'/notifications');await until(s,"document.querySelector('.notification-list')?.children.length>0",'notifications');
  const fits=await ev(s,"document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('.notification-list article')].every(e=>e.getBoundingClientRect().right<=innerWidth+1)");assert(fits,'Notification fit '+w);await run(s,'screenshot',out+'/notifications-'+w+'.png');
}
console.log('PASS Notifications six-width loaded geometry; no semantic mutations beyond normal view acknowledgment');

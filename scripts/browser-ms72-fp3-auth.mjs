import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const s=process.env.FP3_AUTH_SESSION??'fp3-auth',origin=process.env.FP3_ORIGIN??'http://localhost:3000',cap=process.env.FP3_CAPTURES;assert(cap);
await run(s,'open',origin+'/app');await until(s,"[...document.querySelectorAll('button')].some(b=>b.textContent==='Create account')",'signed-out auth');
for(const [w,h] of [[320,844],[390,844],[430,932],[768,900],[1440,900],[1728,1117]]){
 await run(s,'set','viewport',String(w),String(h));await button(s,'Create account');
 await until(s,"!!document.querySelector('input[name=emailAddress]')",'Clerk signup form');
 await run(s,'fill','input[name=emailAddress]','fp3-no-submit@example.com');
 await run(s,'mouse','move','4',String(Math.floor(h/2)));await run(s,'mouse','down');await run(s,'mouse','up');
 console.log('outside URL',w,await run(s,'get','url'));await run(s,'press','Escape');
 assert.equal(await ev(s,"document.querySelector('input[name=emailAddress]')?.value"),'fp3-no-submit@example.com');
 const rect=await ev(s,"(()=>{const r=document.querySelector('.auth-dialog').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()");assert(rect[0]>=0&&rect[1]>=0&&rect[2]<=w+1&&rect[3]<=h+1);
 await run(s,'screenshot',`${cap}/auth-${w}.png`);await button(s,'Close authentication');
 assert.equal(await ev(s,"document.querySelectorAll('dialog[open]').length"),0);
 await button(s,'Sign in');await until(s,"!!document.querySelector('.auth-dialog input')",'reopened signin');
 assert.equal(await ev(s,"document.querySelectorAll('dialog[open]').length"),1);await button(s,'Close authentication');
 console.log('PASS auth explicit-close / outside+Escape preserve / reopen / bounds',w);
}
console.log('auth errors',await run(s,'errors'));

import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.MS72_A??'fp2-fresh',b=process.env.MS72_B??'fp2-b',o=process.env.MS72_ORIGIN??'http://localhost:3000';
const room=process.env.FP4_ROOM,child=process.env.FP4_CHILD;assert(room?.startsWith('/room/fp4-review-')&&child);
const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa',draft='FP4 unsent navigation check';
async function ready(s){await until(s,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')",'settled Chat',45000);}
async function open(s,path){await run(s,'open',o+path);await until(s,`location.pathname===${JSON.stringify(path)}`,'route committed');await ready(s);}
if(!process.env.FP4_NAV_RESUME){
await open(a,personal);await run(a,'click','.header-identity-zone > .namecard-trigger');await until(a,"!!document.querySelector('.namecard-content')",'peer card');
await run(a,'click','.namecard-private summary');await button(a,'Private nickname');
const original=await ev(a,"document.querySelector('.scoped-settings-form input').value");
try{
 await run(a,'fill','.scoped-settings-form input','FP4 private nickname QA');await button(a,'Save nickname');
 await until(a,"document.querySelector('.contextual-namecard h2')?.textContent==='FP4 private nickname QA'",'nickname saved / returned');
 await until(a,"document.querySelector('.namecard-private').open&&document.activeElement?.classList.contains('namecard-nickname')",'disclosure and focus return');
 await open(b,personal);assert(!await ev(b,"document.body.textContent.includes('FP4 private nickname QA')"),'private alias isolation');
}finally{
 if(!await ev(a,"!!document.querySelector('.scoped-settings-form input')"))await button(a,'Private nickname');
 await run(a,'fill','.scoped-settings-form input',original||'x');if(!original)await run(a,'press','Backspace');
 await button(a,'Save nickname');await until(a,"!!document.querySelector('.namecard-content')",'alias restored');await run(a,'press','Escape');
}
console.log('PASS private nickname save / B isolation / exact restoration / visible focus recovery');
await open(a,room);assert(['',draft].includes(await ev(a,"document.querySelector('.composer textarea').value")),'requires empty or this exact QA draft');
await run(a,'fill','.composer textarea',draft);await run(a,'click','.surface-tabs a[href$="/hall"]');await until(a,"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')",'Hall');
await run(a,'click','.surface-tabs a:not([href$="/hall"])');await ready(a);assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),draft);
await run(a,'click','.room-context-trigger');await run(a,'click',`.room-context-menu a[href="${room}/subroom/${child}"]`);await until(a,`location.pathname===${JSON.stringify(room+'/subroom/'+child)}`,'child route committed');await ready(a);
assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),'','parent draft does not leak into child');
await run(a,'click','.room-context-trigger');await run(a,'click',`.room-context-menu a[href="${room}"]`);await until(a,`location.pathname===${JSON.stringify(room)}`,'parent route committed');await ready(a);assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),draft);
await run(a,'open',o+room);await ready(a);assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),draft);
}else{assert.equal(await ev(a,'location.pathname'),room);await ready(a);assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),draft);}
await run(a,'tab','new','--label','fp4-background',o+'/app');await ready(a);await run(a,'tab','close','fp4-background');await run(a,'tab','t1');assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),draft);
console.log('PASS Chat/Hall/context switch / reload/background / per-conversation draft isolation');
try{
 // Deterministic transport rejection only; do not mutate React state or database data.
 await ev(a,"(()=>{window.__fp4OriginalFetch=window.fetch;window.fetch=(input,init)=>String(input).includes('/messages?')?Promise.reject(new TypeError('FP4 simulated offline history')):window.__fp4OriginalFetch(input,init);document.dispatchEvent(new Event('visibilitychange'));return true})()");
 await until(a,"document.querySelector('.chat-load-state')?.textContent.includes(\"couldn't be loaded\")",'explicit failed history',45000);
 assert(await ev(a,"!!document.querySelector('.messenger-sidebar')&&!!document.querySelector('.conversation-header')"),'stable failure shell');
 assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),draft);
}finally{await ev(a,"(()=>{if(window.__fp4OriginalFetch){window.fetch=window.__fp4OriginalFetch;delete window.__fp4OriginalFetch;}return true})()");}
await button(a,'Retry');await ready(a);assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),draft);
await run(a,'fill','.composer textarea','x');await run(a,'press','Backspace');await run(a,'open',o+room);await ready(a);assert.equal(await ev(a,"document.querySelector('.composer textarea').value"),'');
await run(a,'open',o+'/');await ready(a);assert(await ev(a,"location.pathname==='/app'&&document.querySelector('.composer textarea').getAttribute('aria-label').includes('tosker.user.a+clerk_test')"),'root and own Sandbox identity');
console.log('PASS failed history retains shell/draft / retry recovery / exact draft cleanup / root selects existing own Sandbox');

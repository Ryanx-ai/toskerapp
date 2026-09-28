import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.TOPBAR_SESSION??'topbar-a',origin=process.env.TOPBAR_ORIGIN??'http://localhost:3000';
const out='/Users/ryanc/.codex/artifacts/tosker-topbar-20260928';
const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa',room='/room/ms5-shared-room-750b4c';
async function open(path){await run(a,'open',origin+path);await until(a,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')",path,45000);}
async function geometry(w){
 const result=await ev(a,`(()=>{const h=document.querySelector('.conversation-header'),b=h.querySelector('.conversation-topbar'),t=h.querySelector('.surface-tabs'),i=b.querySelector('.header-identity-zone'),s=b.querySelector('.context-search-trigger'),c=b.querySelector('.core-header-controls');const r=e=>e.getBoundingClientRect();return {inset:r(i).top-r(b).top,gap:r(t.querySelector('a')).top-r(b).bottom,center:Math.abs(r(s).left+r(s).width/2-r(b).left-r(b).width/2),collisions:r(i).right>r(s).left+1||r(s).right>r(c).left+1,overflow:document.documentElement.scrollWidth>innerWidth+1,shelfBelow:r(t).top>=r(b).bottom-1,topLayer:getComputedStyle(b).boxShadow!=='none'&&getComputedStyle(b).backgroundColor!==getComputedStyle(h).backgroundColor,oneSearch:h.querySelectorAll('.context-search-trigger').length===1,searchWidth:r(s).width}})()`);
 assert(result.inset>=11&&result.gap>=7&&result.shelfBelow&&result.topLayer&&result.oneSearch&&!result.collisions&&!result.overflow,JSON.stringify(result));
 if(w>1100){assert(result.center<1,JSON.stringify(result));assert(result.searchWidth>=300);}
 if(w===768)assert(result.searchWidth>=120&&result.searchWidth<=160);
 if(w<=430)assert.equal(result.searchWidth,44);
}
for(const w of(process.env.TOPBAR_WIDTHS??'320,390,430,768,1440,1728').split(',').filter(Boolean).map(Number)){
 await run(a,'set','viewport',String(w),'900');await open(room);
 if(w>640&&await ev(a,"!!document.querySelector('.sidebar-collapsed')"))await button(a,'Expand sidebar');
 const child=await ev(a,"document.querySelector('.conversation-row[href*=subroom]').getAttribute('href')");
 for(const [name,path,scope]of[['sandbox','/personal/my-room','Find in your Sandbox'],['personal',personal,'Find in this chat'],['room',room,'Find in this Room'],['subroom',child,'Find in this Subroom']]){
  await open(path);await geometry(w);assert.equal(await ev(a,"document.querySelector('.context-search-trigger').getAttribute('aria-label')"),scope);
  await run(a,'screenshot',`${out}/${a}-${w}-${name}.png`);
  await run(a,'focus','.context-search-trigger');await run(a,'press','Enter');await until(a,"!!document.querySelector('.conversation-search input')",'keyboard search');
  await button(a,'Close search');await button(a,'Conversation options');assert(await ev(a,"(()=>{let r=document.querySelector('.interaction-popover').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()"));await run(a,'press','Escape');
  await run(a,'click','.surface-tabs a:nth-child(2)');await until(a,"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')",'Hall tab',45000);await geometry(w);assert.equal(await ev(a,"document.querySelector('.surface-tabs a[aria-current=page]').textContent.trim()"),'Hall');
  await run(a,'click','.surface-tabs a:first-child');await until(a,"!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')",'Chat tab',45000);
  if(w>640){await button(a,'Collapse sidebar');await geometry(w);await run(a,'screenshot',`${out}/${a}-${w}-${name}-collapsed.png`);await button(a,'Expand sidebar');}
 }
 await open(personal);await run(a,'click','.context-search-trigger');await run(a,'fill','.conversation-search input','Persistent');await button(a,'Search');await until(a,"document.querySelectorAll('.conversation-search-result').length===2",'authorized retained search',45000);await button(a,'Close search');
 await run(a,'set','media','dark','reduced-motion');await geometry(w);assert.equal(await ev(a,"getComputedStyle(document.querySelector('.conversation-topbar')).animationName"),'none');await run(a,'set','media','dark');
 console.log('PASS two-plane header/scoped search/tabs/menus/keyboard/reduced motion/sidebar',a,w);
}
if(process.env.TOPBAR_EXTRAS==='1'){
 await run(a,'set','viewport','1440','900');await open(personal);
 assert(!await ev(a,"!!document.querySelector('.header-muted')"),'original test preference unmuted');
 try{
  await button(a,'Conversation options');await button(a,'Mute');await until(a,"!!document.querySelector('.header-muted')",'muted identity');
  for(const w of[320,390,430,768,1440,1728]){await run(a,'set','viewport',String(w),'900');await geometry(w);assert(await ev(a,"document.querySelector('.header-title-line').contains(document.querySelector('.header-muted'))"));await run(a,'screenshot',`${out}/${a}-${w}-muted.png`);}
 }finally{await button(a,'Conversation options');await button(a,'Unmute');await until(a,"!document.querySelector('.header-muted')",'restore mute');}
 for(const w of[320,768,1440,1728]){
  await run(a,'set','viewport',String(w),'900');await run(a,'open',origin+'/app?view=list');await until(a,"!!document.querySelector('.workspace-topbar')",'list topbar');
  const value=await ev(a,"(()=>{const h=document.querySelector('.workspace-topbar'),s=h.querySelector('.context-search-trigger'),c=h.querySelector('.quiet-action');const r=e=>e.getBoundingClientRect();return {collides:r(s).right>r(c).left+1,center:Math.abs(r(s).left+r(s).width/2-r(h).left-r(h).width/2),overflow:document.documentElement.scrollWidth>innerWidth+1}})()");assert(!value.collides&&!value.overflow,JSON.stringify(value));if(w>1100)assert(value.center<1);
  await run(a,'screenshot',`${out}/${a}-${w}-utility.png`);
 }
 console.log('PASS mute six widths restored; utility topbar geometry');
}
console.log('BROWSER_ERRORS',await run(a,'errors'));

import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.LOCK_SESSION??'lock-a',o=process.env.LOCK_ORIGIN??'http://localhost:3000';
const out=process.env.LOCK_CAPTURES??'/Users/ryanc/.codex/artifacts/tosker-ms72-lock-20260928';
const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';
const room='/room/ms5-shared-room-750b4c',q=JSON.stringify;
async function open(path,ready="!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')") {
 await run(a,'open',o+path);await until(a,`location.pathname===${q(path.split('?')[0])}&&(${ready})`,path,45000);
}
async function shot(name){await run(a,'screenshot',`${out}/${name}.png`);}
async function bounds(selector){assert(await ev(a,`(()=>{let e=document.querySelector(${q(selector)});if(!e)return false;let r=e.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})()`),selector+' viewport bounds');}
async function header(){
 assert(await ev(a,`(()=>{const h=document.querySelector('.conversation-header'),i=h.querySelector('.header-identity-zone'),t=h.querySelector('.surface-tabs'),s=h.querySelector('.context-search-trigger'),c=h.querySelector('.core-header-controls');const r=e=>e.getBoundingClientRect();return r(i).top-r(h).top>=12&&r(t).top-r(i).bottom>=7&&r(h).bottom-r(t).bottom>=7&&r(i).right<=r(s).left+1&&r(s).right<=r(c).left+1&&h.querySelectorAll('.context-search-trigger').length===1&&!h.querySelector('[aria-label="Search conversation"]')})()`),'balanced header / no collisions / one search');
 await bounds('.conversation-header');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'));
}
if(process.argv[2]==='visual'){
 const w=Number(process.env.LOCK_WIDTH??1440);await run(a,'set','viewport',String(w),'900');
 await open(room);const child=await ev(a,"document.querySelector('.conversation-row[href*=subroom]')?.getAttribute('href')");assert(child);
 for(const [name,path] of [['personal',personal],['room',room],['subroom',child],['sandbox','/personal/my-room']]) {
  await open(path);await header();await shot(`${w}-${name}`);
  await run(a,'click','.context-search-trigger');await until(a,"!!document.querySelector('.conversation-search input')",'search');await bounds('.conversation-search');
  assert(await ev(a,"document.querySelector('.search-context').textContent.startsWith('Chat messages in ')"));await shot(`${w}-${name}-search`);await button(a,'Close search');
  await button(a,'Conversation options');await bounds('.interaction-popover');await shot(`${w}-${name}-menu`);await run(a,'press','Escape');
 }
 await open(personal+'/hall',"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')");await header();await shot(`${w}-hall`);
 for(const [name,path,ready] of [['friends','/friends',"!!document.querySelector('.friend-list')"],['notifications','/notifications',"!!document.querySelector('.notification-list')&&!document.querySelector('.notification-load-state')"],['profile','/profile',"!!document.querySelector('.profile-surface .namecard')"],['settings','/settings',"!!document.querySelector('input[name=username]')"]]) {
  await open(path,ready);await bounds(name==='settings'?'.scoped-settings-shell':'.messaging-app');await shot(`${w}-${name}`);
  if(name==='settings') {for(let i=2;i<=8;i++) {if(w<=640)await run(a,'click','.settings-category-trigger');await run(a,'click',`.scoped-settings-nav button:nth-child(${i})`);await bounds('.scoped-settings-shell');await shot(`${w}-settings-${i}`);}await button(a,'Close Settings');}
 }
 await open('/app?view=list',"!!document.querySelector('.messenger-sidebar')");
 await shot(`${w}-sidebar`);
 if(w>640){
  if(await ev(a,"!!document.querySelector('.sidebar-collapsed')"))await button(a,'Expand sidebar');
  const before=await ev(a,"document.querySelector('.collapse-button').getBoundingClientRect().toJSON()");
  await button(a,'Collapse sidebar');await bounds('.collapse-button');await shot(`${w}-collapsed`);
  const after=await ev(a,"document.querySelector('.collapse-button').getBoundingClientRect().toJSON()");assert.equal(before.x,after.x);assert.equal(before.y,after.y);
  await button(a,'Expand sidebar');
 }
 await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-change-photo')",'own avatar');await bounds('.contextual-namecard');await run(a,'hover','.namecard-change-photo');await shot(`${w}-own-namecard`);
 await button(a,'Change photo');await bounds('.photo-deferred');assert(await ev(a,"document.querySelector('.photo-deferred').textContent.includes('MS7.6')&&!document.querySelector('input[type=file]')"));await shot(`${w}-photo-deferred`);await button(a,'Got it');await until(a,"document.activeElement?.classList.contains('namecard-change-photo')",'avatar focus restored');await button(a,'Close Namecard');
 await open(personal);await run(a,'click','.header-identity-zone .namecard-trigger');await until(a,"!!document.querySelector('.namecard-content')",'peer Namecard');assert(!await ev(a,"!!document.querySelector('.namecard-change-photo')"));await shot(`${w}-peer-namecard`);await button(a,'Close Namecard');
 console.log('PASS visual geometry / scoped search / menus / utilities / all Settings / sidebar / self-only avatar',w,await run(a,'errors'));
}
if(process.argv[2]==='interactions'){
 await run(a,'set','viewport','1440','900');await open(personal);
 if(await ev(a,"!!document.querySelector('.sidebar-collapsed')"))await button(a,'Expand sidebar');
 const label='.profile-nameplate small .reveal-name';await until(a,`document.querySelector(${q(label)}).dataset.overflow==='true'`,'subtitle overflow');
 assert.equal(await ev(a,`document.querySelector(${q(label)}).title`),'Tosker member');
 const width=await ev(a,`document.querySelector(${q(label)}).clientWidth`);
 await run(a,'hover',label);await until(a,`getComputedStyle(document.querySelector(${q(label+' > span')})).transform!=='none'`,'hover reveal');
 assert.equal(await ev(a,`document.querySelector(${q(label)}).clientWidth`),width);
 await run(a,'hover','.conversation-header');await until(a,`getComputedStyle(document.querySelector(${q(label+' > span')})).transform==='none'`,'leave reset');
 await run(a,'focus',label);await until(a,`getComputedStyle(document.querySelector(${q(label+' > span')})).transform!=='none'`,'focus reveal');await shot('subtitle-focus');
 await run(a,'set','media','dark','reduced-motion');assert.equal(await ev(a,`getComputedStyle(document.querySelector(${q(label)})).overflowX`),'auto');assert.equal(await ev(a,`getComputedStyle(document.querySelector(${q(label+' > span')})).transform`),'none');await run(a,'set','media','dark');
 await run(a,'focus','.collapse-button');await run(a,'press','Enter');await until(a,"!!document.querySelector('.sidebar-collapsed')",'keyboard collapse');await run(a,'press','Enter');await until(a,"!document.querySelector('.sidebar-collapsed')",'same focused control expands');
 await run(a,'fill','.unified-search input','MS5 Shared');assert.equal(await ev(a,"document.querySelectorAll('.conversation-row').length"),1);await run(a,'fill','.unified-search input','Persistent hello');assert.equal(await ev(a,"document.querySelectorAll('.conversation-row').length"),0);await run(a,'fill','.unified-search input','');
 await run(a,'hover','.context-search-trigger');await until(a,"!!document.querySelector('.workspace-tooltip:popover-open')",'top tooltip');
 assert(await ev(a,"(()=>{const t=document.querySelector('.workspace-tooltip').getBoundingClientRect(),b=document.querySelector('.context-search-trigger').getBoundingClientRect();return t.bottom<=b.top||t.top>=b.bottom||t.right<=b.left||t.left>=b.right})()"),'tooltip never overlays trigger');
 await run(a,'click','.context-search-trigger');await until(a,"!!document.querySelector('.conversation-search input')",'hovered search still clickable');await run(a,'fill','.conversation-search input','Persistent');await button(a,'Search');await until(a,"document.querySelectorAll('.conversation-search-result').length===2",'existing authorized messages');await shot('search-results');await button(a,'Close search');
 await open('/app?view=list',"!!document.querySelector('.workspace-topbar')");await run(a,'click','.context-search-trigger');await until(a,"!!document.querySelector('.context-search-help')",'no-context explanation');assert(!await ev(a,"!!document.querySelector('.conversation-search input')"));await button(a,'Got it');
 const pins="[...document.querySelectorAll('.sidebar-pin-row.is-pinned')].map(e=>e.dataset.pinId)",row=path=>`.sidebar-pin-row:has(a[href="${path}"])`;
 const original=await ev(a,pins),ids=await ev(a,`[${[room,personal].map(p=>`document.querySelector(${q(row(p))}).dataset.pinId`).join(',')}]`);assert(ids.every(id=>!original.includes(id)),'retain original order; require unpinned test targets');
 try {
  for(const path of[room,personal]){await run(a,'click',row(path)+' > .sidebar-pin-control');await button(a,'Pin to top');await until(a,`document.querySelector(${q(row(path))}).classList.contains('is-pinned')`,'pin');}
  await run(a,'click',row(personal)+' > .sidebar-pin-control');await button(a,'Move earlier');await until(a,`JSON.stringify(${pins})===${q(JSON.stringify([...original,ids[1],ids[0]]))}`,'reorder');
  await open('/app?view=list',"!!document.querySelector('.messenger-sidebar')");assert.deepEqual(await ev(a,pins),[...original,ids[1],ids[0]]);
 } finally {for(const path of[room,personal]){if(await ev(a,`document.querySelector(${q(row(path))})?.classList.contains('is-pinned')`)){await run(a,'click',row(path)+' > .sidebar-pin-control');await button(a,'Unpin');await until(a,`!document.querySelector(${q(row(path))}).classList.contains('is-pinned')`,'restore pin');}}}
 assert.deepEqual(await ev(a,pins),original);
 await open(personal);assert(!await ev(a,"!!document.querySelector('.header-muted')"),'original unmuted test chat');await button(a,'Conversation options');await button(a,'Mute');await until(a,"!!document.querySelector('.header-title-line .header-muted')",'mute identity');await button(a,'Conversation options');await button(a,'Unmute');await until(a,"!document.querySelector('.header-muted')",'restore mute');
 await button(a,'Conversation options');await button(a,'Mark Chat unread');await until(a,"location.search==='?view=list'",'mark unread exits read context');await until(a,`!!document.querySelector(${q(row(personal)+' .attention-mark')})`,'unread badge');await open(personal);
 await open('/settings',"!!document.querySelector('input[name=username]')");assert.equal(await ev(a,"document.querySelector('input[name=username]').value"),'tosker-user-a-clerk-test');assert(await ev(a,"document.querySelector('.owner-profile-identifiers').textContent.includes('ENNE7O7')"));await button(a,'Close Settings');
 console.log('PASS shared subtitle hover/focus/reset/reduced motion; keyboard collapse; tooltip noncollision; separate search scopes/results; pin/reorder/reload/restore; mute/unread; stable username/TID');
}
if(['chat-hall','hall-resume'].includes(process.argv[2])){
 const label=process.env.LOCK_LABEL;assert(/^MS72-LOCK-[a-z0-9-]+$/.test(label),'Explicit unique fixture marker required');
 if(process.argv[2]==='chat-hall'){
 await run(a,'set','viewport','1440','900');await open('/personal/my-room');
 assert(!await ev(a,`document.querySelector('.conversation-surface').textContent.includes(${q(label)})`),'inspect any prior attempt, never blindly duplicate');
 await run(a,'fill','.composer textarea',label+' **bold** *italic* <img src=x>');await button(a,'Send message');
 await until(a,`[...document.querySelectorAll('.message-row')].some(e=>e.textContent.includes(${q(label)}))`,'formatted message persisted',45000);
 const id=await ev(a,`[...document.querySelectorAll('.message-row')].find(e=>e.textContent.includes(${q(label)})).id`);console.log('LOCK_MESSAGE_RECEIPT',id);
 await until(a,`!!document.querySelector('#${id} .message-bubble strong')`,'formatted render');assert.equal(await ev(a,`document.querySelector('#${id} .message-bubble strong').textContent`),'bold');assert.equal(await ev(a,`document.querySelector('#${id} .message-bubble em').textContent`),'italic');assert(!await ev(a,`!!document.querySelector('#${id} .message-bubble img')`));
 await open('/personal/my-room');assert(await ev(a,`!!document.getElementById(${q(id)})`));await run(a,'click','.context-search-trigger');await run(a,'fill','.conversation-search input',label);await button(a,'Search');await until(a,"document.querySelectorAll('.conversation-search-result').length===1",'formatted message search');assert(!await ev(a,"document.querySelector('.conversation-search-result p').textContent.includes('**')"));await button(a,'Close search');await shot('formatted-sandbox');
 await run(a,'click',`#${id} [aria-label="More message actions"]`);await button(a,'Nuke message');await button(a,'Nuke message');await until(a,`!document.getElementById(${q(id)})`,'exact test message nuked');
 await open('/personal/my-room/hall',"!!document.querySelector('.new-hall-card')&&!document.querySelector('.hall-load-status')");assert(!await ev(a,`document.querySelector('.hall-surface').textContent.includes(${q(label)})`));
 await button(a,'New Note');await run(a,'fill','input[aria-label=Title]',label);await run(a,'fill','textarea[aria-label=Note]','Bounded lock-patch keyboard regression');await button(a,'Add note');await until(a,`[...document.querySelectorAll('.hall-object h3')].some(e=>e.textContent===${q(label)})`,'note created');
 }
 await open('/personal/my-room/hall',`[...document.querySelectorAll('.hall-object h3')].some(e=>e.textContent===${q(label)})`);
 const note=await ev(a,`[...document.querySelectorAll('.hall-object')].find(e=>e.querySelector('h3')?.textContent===${q(label)}).dataset.hallId`),card=`[data-hall-id="${note}"]`,ta=card+' textarea';console.log('LOCK_NOTE',note);
 await run(a,'click',card+' .hall-comments-toggle');await until(a,`!!document.querySelector(${q(ta)})`,'comment field');await run(a,'fill',ta,'   ');await run(a,'press','Enter');assert.equal(await ev(a,`document.querySelectorAll(${q(card+' .hall-comment')}).length`),0);
 await run(a,'fill',ta,'First line');await run(a,'press','Shift+Enter');await run(a,'type',ta,'Second line');assert((await ev(a,`document.querySelector(${q(ta)}).value`)).includes('\n'));await run(a,'press','Enter');await until(a,`document.querySelectorAll(${q(card+' .hall-comment')}).length===1&&!document.querySelector(${q(ta)}).disabled`,'Enter exactly once');await shot('hall-enter-shift-enter');
 await open('/personal/my-room/hall',`!!document.querySelector(${q(card)})`);await run(a,'click',card+' .hall-comments-toggle');await until(a,`document.querySelectorAll(${q(card+' .hall-comment')}).length===1`,'comment survives reload');await run(a,'click',card+' .hall-card-more');await button(a,'Nuke');await button(a,'Nuke');await until(a,`!document.querySelector(${q(card)})`,'test note/comments removed');
 console.log('PASS persisted safe formatted Chat/search/Nuke; Hall whitespace/Shift+Enter/Enter/reload/Nuke. Remove only the logged empty message receipt after guard.');
}
if(process.argv[2]==='final'){
 for(const w of (process.env.LOCK_WIDTHS??'320,390,430,768,1440,1728').split(',').map(Number)){
  await run(a,'set','viewport',String(w),'900');await open(room);
  const child=await ev(a,"document.querySelector('.conversation-row[href*=subroom]').getAttribute('href')");
  for(const [name,path]of[['personal',personal],['room',room],['subroom',child],['sandbox','/personal/my-room']]){await open(path);await header();await shot(`final-${w}-${name}`);if(name==='subroom'&&w>640)assert(await ev(a,"document.querySelectorAll('.fp2-order-row').length>0&&[...document.querySelectorAll('.fp2-order-row')].every(e=>{const r=e.getBoundingClientRect(),b=e.querySelector('.fp2-order-handle').getBoundingClientRect();return Math.abs(r.top+r.height/2-b.top-b.height/2)<1})"),'Subroom control vertically centered');}
  for(const [name,path,ready]of[['hall',personal+'/hall',"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')"],['profile','/profile',"!!document.querySelector('.profile-surface .namecard')"],['friends','/friends',"!!document.querySelector('.friend-list')"],['notifications','/notifications',"!!document.querySelector('.notification-list')&&!document.querySelector('.notification-load-state')"],['settings','/settings',"!!document.querySelector('input[name=username]')"]]){await open(path,ready);await bounds(name==='settings'?'.scoped-settings-shell':'.messaging-app');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'));await shot(`final-${w}-${name}`);if(name==='settings')await button(a,'Close Settings');}
  await open('/app?view=list',"!!document.querySelector('.messenger-sidebar')");await shot(`final-${w}-sidebar`);
  await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-change-photo')",'own card');await run(a,'focus','.namecard-change-photo');await shot(`final-${w}-namecard`);await button(a,'Close Namecard');
  console.log('PASS final rendered resweep',w);
 }
 console.log('FINAL_BROWSER_ERRORS',await run(a,'errors'));
}
if(['utilities','utility-settings'].includes(process.argv[2])){
 for(const w of(process.env.LOCK_WIDTHS??'320,1440').split(',').map(Number)){
  await run(a,'set','viewport',String(w),'900');
  if(process.argv[2]==='utilities'){
  for(const path of['/help','/explore','/explore/create','/marketplace','/studio','/create']){await run(a,'open',o+path);await until(a,"!!document.querySelector('.messaging-app')&&!document.querySelector('.workspace-loading-frame')",'utility loaded');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'));await shot(`utility-${w}-${path.replaceAll('/','-')}`);}
  await open('/app?view=list',"!!document.querySelector('.messenger-sidebar')");await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:first-child');await bounds('.creation-panel');await shot(`utility-${w}-create-chat`);await run(a,'press','Escape');
  await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:last-child');await run(a,'fill','input[aria-label="Room name"]','Visual review only');await button(a,'Next');await bounds('.creation-panel');await shot(`utility-${w}-room-tags`);await run(a,'press','Escape');
  }
  await open(personal);await button(a,'Conversation options');await button(a,'Chat Settings');await until(a,"!!document.querySelector('.scoped-settings-shell')",'Chat Settings');for(let i=1;i<=5;i++){if(w<=640)await run(a,'click','.settings-category-trigger');await run(a,'click',`.scoped-settings-nav button:nth-child(${i})`);await bounds('.scoped-settings-shell');await shot(`utility-${w}-chat-settings-${i}`);}await button(a,'Close Chat Settings');
 }
 console.log('PASS',process.argv[2],'at widths',process.env.LOCK_WIDTHS??'320,1440');
}
if(process.argv[2]==='smoke'){
 await run(a,'set','viewport','1440','900');await open('/app');await header();assert(await ev(a,"document.querySelector('.conversation-header').textContent.includes('Sandbox')"));
 await open(personal);await header();await run(a,'click','.context-search-trigger');await until(a,"!!document.querySelector('.conversation-search input')",'search');await run(a,'fill','.conversation-search input','Persistent');await button(a,'Search');await until(a,"document.querySelectorAll('.conversation-search-result').length===2",'authorized search result');await shot('live-search-'+a);await button(a,'Close search');
 await open(room);const child=await ev(a,"document.querySelector('.conversation-row[href*=subroom]').getAttribute('href')");await header();await open(child);await header();await open(child+'/hall',"!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')");await header();
 await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-change-photo')",'own media action');await button(a,'Change photo');assert(await ev(a,"document.querySelector('.photo-deferred').textContent.includes('MS7.6')"));await button(a,'Got it');await button(a,'Close Namecard');
 await open('/settings',"!!document.querySelector('input[name=username]')");assert(await ev(a,"document.querySelector('input[name=username]').value.startsWith('tosker-user-')"));await button(a,'Close Settings');
 await run(a,'set','viewport','320','900');await open(personal);await header();await shot('live-320-'+a);await run(a,'click','.context-search-trigger');await bounds('.conversation-search');await button(a,'Close search');
 await run(a,'set','viewport','1440','900');await open('/personal/my-room');console.log('PASS canonical small smoke',a,await run(a,'errors'));
}
if(process.argv[2]==='avatar-access'){
 await run(a,'set','viewport','1440','900');await open('/personal/my-room');await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-change-photo')",'own card');
 await run(a,'focus','.namecard-change-photo');await run(a,'press','Shift+Tab');await run(a,'press','Tab');
 await until(a,"document.querySelector('.namecard-change-photo').matches(':focus-visible')&&getComputedStyle(document.querySelector('.namecard-change-photo > span:last-child')).opacity==='1'",'keyboard photo label');await shot('avatar-keyboard');await run(a,'press','Enter');await until(a,"!!document.querySelector('.photo-deferred')",'keyboard photo information');await button(a,'Got it');await button(a,'Close Namecard');
 await run(a,'set','device','iPhone 12');await open('/app?view=list',"!!document.querySelector('.messenger-sidebar')");await button(a,'Open your Namecard');await until(a,"!!document.querySelector('.namecard-change-photo')",'touch own card');
 const {cdpUrl}=await run(a,'get','cdp-url');const endpoint=new URL(cdpUrl);assert.equal(endpoint.hostname,'127.0.0.1');
 const pages=await(await fetch(`http://${endpoint.host}/json/list`)).json();const target=pages.find(p=>p.type==='page'&&p.url.startsWith(o+'/'));assert(target);
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.once('open',resolve));
 let seq=0;const cdp=(method,params)=>new Promise((resolve,reject)=>{const id=++seq;const receive=raw=>{const m=JSON.parse(raw);if(m.id===id){ws.off('message',receive);if(m.error)reject(new Error(m.error.message));else resolve(m.result);}};ws.on('message',receive);ws.send(JSON.stringify({id,method,params}));});
 // Keep this CDP session attached: Chromium resets its emulation on detach.
 try {
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await cdp('Emulation.setEmitTouchEventsForMouse',{enabled:true,configuration:'mobile'});
 assert(await ev(a,"matchMedia('(hover:none)').matches"),'actual touch emulation');assert.equal(await ev(a,"getComputedStyle(document.querySelector('.namecard-change-photo > span:last-child')).opacity"),'1');await shot('avatar-touch');
 const point=await ev(a,"(()=>{const r=document.querySelector('.namecard-change-photo').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await until(a,"!!document.querySelector('.photo-deferred')",'touch photo information');console.log('PASS keyboard and emulated-touch explicit photo affordance');
 } finally { ws.close(); }
}

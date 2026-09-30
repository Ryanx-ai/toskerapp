import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {run,ev,until,button as clickButton} from './browser-fp2.mjs';
async function button(s,name){await until(s,`[...document.querySelectorAll('button')].some(e=>e.checkVisibility()&&!e.disabled&&(e.getAttribute('aria-label')||e.textContent).trim()===${JSON.stringify(name)})`,'enabled '+name);return clickButton(s,name);}
const a=process.env.FP1_A??'ms73-fp1-a',b=process.env.FP1_B??'ms73-fp1-b',origin=process.env.FP1_ORIGIN??'http://localhost:3000';
const fixture=JSON.parse(readFileSync('docs/MS7-3-FP1-BROWSER-FIXTURE.json','utf8'));
const path='/room/'+fixture.slug,out=process.env.FP1_CAPTURES??'/tmp/tosker-ms73-fp1';mkdirSync(out,{recursive:true});
const count='document.querySelectorAll("[data-place-id]").length';
const ids='[...document.querySelectorAll("[data-place-id]")].map(e=>e.dataset.placeId)';
const revision='Number(document.querySelector("[data-trip-revision]")?.dataset.tripRevision)';
async function open(s,url=path){await run(s,'open',origin+url);await until(s,'!!document.querySelector(".surface-tabs")','workspace',45000);}
async function changed(s,rev){await until(s,revision+'>'+rev,'saved revision',45000);}
async function menu(s,index=0){const selector=`[data-place-id]:nth-child(${index+1}) button[aria-haspopup=dialog]`;await run(s,'scrollintoview',selector);await until(s,`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect(),p=document.querySelector('[aria-label="Saved trip places"]').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right})()`,'card action in scroll viewport');await run(s,'click',selector);await until(s,'!!document.querySelector(".interaction-popover:popover-open")','place menu');}
async function close(s){await run(s,'press','Escape');}
async function shot(s,name){await run(s,'screenshot',out+'/'+name+'.png');}
async function fit(s){assert(await ev(s,'document.documentElement.scrollWidth<=innerWidth+1'),'no document overflow');}

if(process.argv[2]==='fp1-core'){
  for(const s of [a,b]){await run(s,'set','viewport','1440','960');await open(s);await until(s,count+'===5','five places',45000);}
  assert.deepEqual(await ev(a,'[...document.querySelectorAll(".surface-tabs .active")].map(e=>e.textContent)'),['Map','Chat']);
  assert.equal(await ev(a,'document.querySelectorAll(".composer").length'),1);
  const first=(await ev(a,ids))[0];let rev=await ev(a,revision);
  await menu(a);await button(a,'Star');await changed(a,rev);await close(a);
  await until(b,`document.querySelector('[data-place-id="${first}"]')?.dataset.starred==='true'`,'peer shared Star',45000);
  await menu(a);await button(a,'Hide from my map');await close(a);
  assert.equal(await ev(a,`document.querySelector('[data-place-id="${first}"]').dataset.hidden`),'true');
  assert.equal(await ev(b,`document.querySelector('[data-place-id="${first}"]').dataset.hidden`),'false');
  assert.equal(await ev(a,revision),rev+1,'Eye does not write shared state');
  await menu(a);await button(a,'Show on my map');await button(a,'Get info');
  await until(a,'!!document.querySelector("dialog[open]")','place info');await shot(a,'get-info');await button(a,'Copy address');await until(a,'document.querySelector("dialog[open]")?.textContent.includes("Copied")','address copy');await close(a);
  rev=await ev(a,revision);await menu(a);await button(a,'Move later');await changed(a,rev);await close(a);
  await until(b,`document.querySelectorAll('[data-place-id]')[1]?.dataset.placeId==='${first}'`,'peer reorder',45000);
  await button(a,'Quick order');await shot(a,'quick-order');rev=await ev(a,revision);await button(a,'Apply suggested order');await changed(a,rev);rev=await ev(a,revision);await button(a,'Undo Quick order');await changed(a,rev);
  await button(a,'Route');await run(a,'fill','form[aria-label="Route editor"] input','Day 2');await button(a,'Save route');await until(a,count+'===0','empty second route');
  await run(a,'click','[aria-label="Choose active route"] [data-active=false] button:first-child');await until(a,count+'===5','back to first route');
  await menu(a);await run(a,'check','fieldset label:last-child input');await close(a);
  await button(a,'Route actions for Day 2');await button(a,'Show');await close(a);await shot(a,'ghost-star');
}
if(['fp1-core','fp1-tail'].includes(process.argv[2])){
  if(process.argv[2]==='fp1-tail')for(const s of [a,b]){await run(s,'set','viewport','1440','960');await open(s);await until(s,count+'===5','five places',45000);}
  if(await ev(a,`!!document.querySelector('button[aria-label="Route actions for Day 1"]')`)){await button(a,'Route actions for Day 1');await button(a,'Rename');await until(a,'!!document.querySelector(\'form[aria-label="Route editor"] input\')','route editor');await run(a,'fill','form[aria-label="Route editor"] input','Marina day');await run(a,'select','form[aria-label="Route editor"] select','rose');await button(a,'Save route');}await until(a,`document.querySelector('[aria-label="Choose active route"]')?.textContent.includes('Marina day')`,'route rename');
  let rev;
  const last=(await ev(a,ids)).at(-1);rev=await ev(a,revision);await menu(a,4);await button(a,'Nuke');await shot(a,'nuke-confirm');await button(a,'Nuke place');await changed(a,rev);await until(b,`!document.querySelector('[data-place-id="${last}"]')`,'peer Nuke',45000);
  await open(b);await until(b,count+'===4','Nuke survives reload');
  await shot(a,'map-chat');await button(a,'Chat');assert.equal(await ev(a,'document.querySelectorAll(".composer").length'),0);await shot(a,'map-only');await button(a,'Chat');
}
if(['fp1-core','fp1-tail','fp1-surfaces'].includes(process.argv[2])){
  for(const [label,selector,suffix] of [['Board','.hall-surface','hall'],['Live','.live-preview','live']]){await run(a,'click',`.surface-tabs a[href$="/${suffix}"]`);await until(a,`!!document.querySelector('${selector}')`,'surface '+label,45000);assert.equal(await ev(a,'document.querySelectorAll(".composer").length'),1);await shot(a,label.toLowerCase()+'-chat');}
  await button(a,'Mic');await button(a,'PTT');await button(a,'Camera');assert(await ev(a,'document.querySelector(".live-preview-status").textContent.includes("Preview only")'));
  await run(a,'click','.surface-tabs a.active');await until(a,'!!document.querySelector(".composer")&&!document.querySelector(".planning-workspace")','Chat only');await shot(a,'chat-only');
  await run(a,'click','.surface-tabs a[href$="/map"]');await until(a,count+'===4','return Map',45000);
  console.log('PASS A/B default Map+Chat, Star shared/Eye private, info/copy, peer reorder, Quick preview/apply/undo, second route/ghost, rename/color, confirmed Nuke/peer/reload, five surface states, synthetic controls');
}
if(process.argv[2]==='fp1-visual'){
  await open(a);await until(a,count+'>0','places',45000);
  for(const [w,h] of [[320,844],[390,844],[430,932],[768,1024],[1440,960],[1728,1080],[844,390]]){
    await run(a,'set','viewport',String(w),String(h));await fit(a);await shot(a,`map-${w}-${h}`);
    assert.equal(await ev(a,'document.querySelectorAll(".composer").length'),w>=1100?1:0,'one-window below desktop threshold');
    if(w<=768){assert.equal(await ev(a,`document.querySelector('[aria-label="Trip places"]').checkVisibility()`),false);await run(a,'click','[aria-label="Map view"] button:last-child');await shot(a,`places-${w}-${h}`);assert.equal(await ev(a,'document.querySelector(".maplibregl-canvas").checkVisibility()'),false);await run(a,'click','[aria-label="Map view"] button:first-child');}
    console.log('PASS viewport',w,h,JSON.stringify(await ev(a,`(()=>{const e=document.querySelector('[aria-label="Trip places"]');return {cardsWidth:e.clientWidth,overflow:e.scrollWidth>e.clientWidth+1}})()`)));
  }
  await run(a,'set','viewport','1440','960');await button(a,'Open your Namecard');await until(a,'!!document.querySelector(".namecard-content")','own card');await shot(a,'namecard-own-1440');await close(a);
  await open(a,'/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa');await run(a,'click','.header-identity-zone > .namecard-trigger');await until(a,'!!document.querySelector(".namecard-common")','other card');await shot(a,'namecard-other-1440');
  for(const w of [320,390,430,768,1728]){await run(a,'set','viewport',String(w),'844');await fit(a);await shot(a,`namecard-other-${w}`);}await close(a);
  console.log('PASS responsive captures, own/other Namecards; visual review still required');
}
if(process.argv[2]==='fp1-search-pin'){
  for(const s of [a,b]){await run(s,'set','viewport','1440','960');await open(s);await until(s,count+'===4','four saved places',45000);}
  await run(a,'fill','[aria-label="Search places"]','Marina Bay Sands');await until(a,`document.querySelectorAll('[aria-label="Place search results"] button').length>0`,'Singapore results',30000);
  assert.equal(await ev(a,count),4);assert.equal(await ev(a,`!!document.querySelector('[aria-label="Place preview"]')`),false);
  await run(a,'click','[aria-label="Place search results"] button:first-child');await until(a,`!!document.querySelector('[aria-label="Place preview"]')`,'private preview');assert.equal(await ev(b,count),4);await shot(a,'search-preview');await button(a,'Add to trip');await until(a,count+'===5','confirmed search place',45000);await until(b,count+'===5','peer search place',45000);
  assert.deepEqual(await ev(a,ids),await ev(b,ids));
  await button(a,'Pin');await run(a,'scrollintoview','.maplibregl-canvas');const point=await ev(a,'(()=>{const r=document.querySelector(".maplibregl-canvas").getBoundingClientRect();return {x:Math.round(r.x+r.width*.55),y:Math.round(r.y+r.height*.4)}})()');await run(a,'mouse','move',String(point.x),String(point.y));await run(a,'mouse','down');await run(a,'mouse','up');await until(a,`!!document.querySelector('[aria-label="Place preview"]')`,'pin preview');assert.equal(await ev(a,count),5);assert.equal(await ev(b,count),5);await button(a,'Confirm pin');await until(a,count+'===6','confirmed pin',45000);await until(b,count+'===6','peer confirmed pin',45000);assert.deepEqual(await ev(a,ids),await ev(b,ids));
  const before=await ev(a,ids);await run(a,'scrollintoview','[data-place-id]:first-child');await run(a,'drag','[data-place-id]:first-child','[data-place-id]:nth-child(2)');await until(a,`document.querySelector('[data-place-id]').dataset.placeId==='${before[1]}'`,'native drag saved',45000);await until(b,`document.querySelector('[data-place-id]').dataset.placeId==='${before[1]}'`,'peer drag',45000);
  console.log('PASS real Singapore search, private selection/preview, explicit Add, signed direct-pin confirmation, same canonical A/B IDs and native drag');
}
if(process.argv[2]==='fp1-road-stale'){
  await until(a,'document.body.textContent.includes("Road preview · not navigation")','existing road preview');
  let rev=await ev(a,revision);await menu(a);await button(a,'Move later');await changed(a,rev);await close(a);await until(a,'document.body.textContent.includes("Roads out of date")','stale road hidden');
  const before=await ev(a,ids);await ev(a,`(()=>{window.__fp1Fetch=fetch;window.fetch=(u,i)=>String(u).endsWith('/roads')?Promise.resolve(Response.json({error:'QA simulated road outage'},{status:503})):window.__fp1Fetch(u,i);return true})()`);
  try{await button(a,'Roads');await until(a,'document.body.textContent.includes("QA simulated road outage")','road outage');assert.deepEqual(await ev(a,ids),before);}finally{await ev(a,'(()=>{window.fetch=window.__fp1Fetch;delete window.__fp1Fetch;return true})()');}
  console.log('PASS explicit road result invalidates on shared reorder; provider failure preserves canonical cards/order without automatic retry');
}
if(process.argv[2]==='fp1-chat'){
  for(const s of [a,b]){await run(s,'set','viewport','1440','960');await open(s);await until(s,'!!document.querySelector(".composer textarea")','companion',45000);}
  const message='FP1 safe QA — shared Map and Chat acceptance.';await run(a,'fill','.composer textarea',message);await button(a,'Send message');for(const s of[a,b])await until(s,`document.querySelector('.planning-chat')?.textContent.includes(${JSON.stringify(message)})`,'peer Chat message',45000);
  const draft='FP1 unsent draft';await run(a,'fill','.composer textarea',draft);await button(a,'Chat');assert.equal(await ev(a,'document.querySelectorAll(".composer").length'),0);await run(a,'click','.surface-tabs a[href$="/hall"]');await until(a,'!!document.querySelector(".hall-surface")','Board');assert.equal(await ev(a,'document.querySelectorAll(".composer").length'),0,'closed companion stays closed across navigation');await button(a,'Chat');await until(a,`document.querySelector('.composer textarea')?.value===${JSON.stringify(draft)}`,'draft survives');assert.equal(await ev(a,'document.querySelectorAll(".maplibregl-canvas").length'),0);
  await button(a,'New Note');await run(a,'fill','[aria-label="Title"]','FP1 safe QA checklist');await run(a,'fill','[aria-label="Note"]','Disposable acceptance content: shared cards, Chat, Board and synthetic Live.');await button(a,'Add note');await run(b,'click','.surface-tabs a[href$="/hall"]');await until(b,'document.querySelector(".hall-surface")?.textContent.includes("FP1 safe QA checklist")','peer Board note',45000);
}
if(['fp1-chat','fp1-chat-tail'].includes(process.argv[2])){
  const draft='FP1 unsent draft';await until(a,'!document.querySelector("dialog[open]")','Board editor closed');await run(a,'click','.surface-tabs a[href$="/live"]');await until(a,'!!document.querySelector(".live-preview")','Live');assert.equal(await ev(a,'document.querySelector(".composer textarea").value'),draft);await run(a,'click','.surface-tabs a[href$="/map"]');await until(a,`document.querySelector('.composer textarea')?.value===${JSON.stringify(draft)}`,'Map same draft',45000);await run(a,'fill','.composer textarea','');
  await run(a,'click','.context-search input');await until(a,`document.activeElement===document.querySelector('.context-search input')`,'search focus');await run(a,'type','.context-search input','shared Map');await until(a,'!!document.querySelector(".context-search-dropdown [role=option]")','Chat search result',30000);await run(a,'press','ArrowDown');await run(a,'press','Enter');await until(a,'!!document.querySelector(".planning-chat .message-source-highlight")','same companion jump',30000);assert.equal(await ev(a,'document.querySelectorAll(".maplibregl-canvas").length'),1);await shot(a,'map-context-search');console.log('PASS peer Chat/Board writes, one composer, closed companion preference and draft across primary surfaces, context-search jump preserves Map');
}
if(process.argv[2]==='fp1-retry'){
  for(const s of[a,b]){await run(s,'set','viewport','1440','960');await open(s);await until(s,count+'===6','six canonical cards',45000);}
  for(const after of [false,true]){
    const before=await ev(a,ids),rev=await ev(a,revision),starred=await ev(a,`document.querySelector('[data-place-id]').dataset.starred==='true'`);
    await ev(a,`(()=>{window.__fp1Fetch=fetch;window.__fp1Intercepted=0;window.fetch=async(u,i)=>{if(i?.method==='POST'&&String(i.body).includes('"command"')&&!window.__fp1Intercepted++){${after?'const r=await window.__fp1Fetch(u,i);await r.arrayBuffer();':''}throw new TypeError('QA simulated acknowledgement failure');}return window.__fp1Fetch(u,i)};return true})()`);
    try{await menu(a);await button(a,starred?'Unstar':'Star');await close(a);await until(a,`[...document.querySelectorAll('button')].some(e=>e.textContent==='Retry same change')`,'bounded retry',45000);}finally{await ev(a,'(()=>{window.fetch=window.__fp1Fetch;delete window.__fp1Fetch;return true})()');}
    await button(a,'Retry same change');await changed(a,rev);assert.equal(await ev(a,revision),rev+1);assert.deepEqual(await ev(a,ids),before);await until(b,`document.querySelector('[data-place-id]').dataset.starred==='${!starred}'`,'peer final Star',45000);
  }
  console.log('PASS pre-commit failure and real committed/lost-ack retry: one revision each, stable canonical IDs, peer shared state');
}

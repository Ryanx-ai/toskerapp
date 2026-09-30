import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { run, ev, until, button } from './browser-fp2.mjs';
const a=process.env.MS73_A??'ms73-fp1-a',b=process.env.MS73_B??'ms73-fp1-b';
const origin=process.env.MS73_ORIGIN??'http://localhost:3000';
const fixture=JSON.parse(readFileSync('docs/MS7-3-FP2-BROWSER-FIXTURE.json','utf8'));
const path='/room/'+fixture.slug+'/map',out='/tmp/tosker-ms73-fp2-fixed';
const count='document.querySelectorAll("[data-place-id]").length';
async function ready(s){await until(s,count+'===5','five owned QA cards',45000); await until(s,'document.querySelector("[data-map-state]")?.dataset.mapState==="ready"','basemap',45000);}
if(process.argv[2]==='fp2-shared') {
  for(const s of[a,b]){await run(s,'open',origin+path);await run(s,'set','viewport','1440','960');await ready(s);}
  for(const s of[a,b])await run(s,'click','[data-place-id]:first-child button[aria-label^="Comments on"]');
  await until(a,'!!document.querySelector("textarea[id^=trip-comment]")','comment sheet');
  await until(a,'!document.querySelector("dialog[open]")?.textContent.includes("Loading…")','comment load');
  const initial=await ev(a,'document.querySelectorAll("[data-comment-id]").length');
  const text='FP2 browser A '+Date.now();
  await run(a,'fill','textarea[id^=trip-comment]',text);await run(a,'press','Shift+Enter');
  assert.equal(await ev(a,'document.querySelectorAll("[data-comment-id]").length'),initial);
  await run(a,'type','textarea[id^=trip-comment]','Second line');await run(a,'press','Enter');
  await until(b,`document.querySelector('dialog[open]')?.textContent.includes(${JSON.stringify(text)})`,'peer comment realtime',45000);
  await until(a,'document.querySelector("textarea[id^=trip-comment]")?.value===""','acknowledged draft');
  await run(b,'fill','textarea[id^=trip-comment]','FP2 browser B reply');await button(b,'Post location comment');
  await until(a,`document.querySelectorAll("[data-comment-id]").length===${initial+2}`,'A sees B reply',45000);
  await run(a,'screenshot',out+'/comments-ab.png');
  for(const s of[a,b]){await run(s,'press','Escape');await run(s,'open',origin+path);await ready(s);}
  assert.equal(await ev(a,'document.querySelector("[data-place-id] button[aria-label^=\\"Comments on\\"]").textContent.trim()'),String(initial+2));
  await run(a,'click','[data-place-id]:first-child button[aria-pressed]');
  assert.equal(await ev(a,'document.querySelector("[data-place-id] button[aria-pressed]").getAttribute("aria-pressed")'),'true');
  await run(a,'press','Escape');
  assert.equal(await ev(a,'document.querySelector("[data-place-id] button[aria-pressed]").getAttribute("aria-pressed")'),'false');
  await button(a,'Share route');await until(a,'document.querySelector("dialog[open]")?.textContent.includes("Deferred")','honest deferred share');await run(a,'press','Escape');
  console.log('PASS A/B comments realtime, multiline/Enter, reload persistence, private deselection and truthful Share deferred');
}
if(process.argv[2]==='fp2-widths') {
  await run(a,'open',origin+path);await ready(a);
  for(const [w,h] of [[320,740],[390,844],[430,932],[768,1024],[1440,960],[1728,1117],[844,390]]) {
    await run(a,'set','viewport',String(w),String(h));
    const layout=await ev(a,'({overflow:document.documentElement.scrollWidth>innerWidth,header:document.querySelector(".conversation-header").getBoundingClientRect().height,tabs:[...document.querySelectorAll(".surface-tabs a,.surface-tabs button")].map(e=>({name:e.textContent,width:e.getBoundingClientRect().width,visible:e.checkVisibility()})),font:getComputedStyle(document.body).fontFamily})');
    assert(!layout.overflow,JSON.stringify({w,...layout}));assert(layout.tabs.every(t=>t.visible&&t.width>=40));
    await run(a,'screenshot',`${out}/map-${w}-${h}.png`);console.log('WIDTH',w,h,JSON.stringify(layout));
    if(w<=768){await run(a,'click','[aria-label="Map view"] button:last-child');await run(a,'screenshot',`${out}/places-${w}.png`);await run(a,'click','[aria-label="Map view"] button:first-child');}
  }
  await run(a,'set','viewport','1440','960');
}
if(process.argv[2]==='fp2-roads-location') {
  await run(a,'open',origin+'/room/ms73-founder-review-904a9dea/map');
  await until(a,count+'===2','retained reference cards',45000);
  await until(a,'document.querySelector("[data-map-state]")?.dataset.mapState==="ready"','map',45000);
  await run(a,'set','viewport','1440','960');
  const ids=await ev(a,'[...document.querySelectorAll("[data-place-id]")].map(e=>e.dataset.placeId)');
  for(const mode of ['walk','drive']) {
    await run(a,'select','select[aria-label="Travel mode"]',mode);await button(a,'Refresh roads');
    await until(a,`document.body.textContent.includes(${JSON.stringify((mode==='walk'?'Walking':'Driving')+' preview · not navigation')})`,'real '+mode+' geometry',45000);
    await run(a,'screenshot',out+'/real-'+mode+'.png');
  }
  // Controlled transport failure: never hits the provider or exposes provider URLs.
  await ev(a,'(()=>{window.__fp2Fetch=window.fetch;window.fetch=(url,options)=>String(url).endsWith("/roads")?Promise.resolve(new Response(JSON.stringify({error:"QA bounded outage"}),{status:503,headers:{"content-type":"application/json"}})):window.__fp2Fetch(url,options);return true})()');
  await button(a,'Refresh roads');await until(a,'document.body.textContent.includes("QA bounded outage")','outage');
  await run(a,'screenshot',out+'/roads-outage.png');
  assert.deepEqual(await ev(a,'[...document.querySelectorAll("[data-place-id]")].map(e=>e.dataset.placeId)'),ids);
  await ev(a,'(()=>{window.fetch=window.__fp2Fetch;window.__fp2GeoCalls=0;Object.defineProperty(navigator.geolocation,"getCurrentPosition",{configurable:true,value:(ok,fail)=>{window.__fp2GeoCalls++;fail({code:1});}});return true})()');
  assert.equal(await ev(a,'window.__fp2GeoCalls'),0);await button(a,'My location');
  await until(a,'document.body.textContent.includes("Location permission denied")','permission denial');
  await ev(a,'(()=>{Object.defineProperty(navigator.geolocation,"getCurrentPosition",{configurable:true,value:(ok)=>{window.__fp2GeoCalls++;ok({coords:{latitude:1.29,longitude:103.86,accuracy:40}});}});return true})()');
  await button(a,'My location');await until(a,'!!document.querySelector("[aria-label^=\\"Your location, accuracy\\"]")','local synthetic marker');
  assert.equal(await ev(a,'window.__fp2GeoCalls'),2);
  await run(a,'screenshot',out+'/local-location.png');await button(a,'Clear my location');
  await until(a,'!document.querySelector("[aria-label^=\\"Your location, accuracy\\"]")','local marker cleared');
  assert.deepEqual(await ev(a,'[...document.querySelectorAll("[data-place-id]")].map(e=>e.dataset.placeId)'),ids);
  await run(a,'open',origin+path);
  console.log('PASS real Walk/Drive provider geometry, controlled outage preserves cards, one-shot denied/synthetic accuracy/clear, no retained reference edits');
}
if(process.argv[2]==='fp2-surfaces') {
  const personal='/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';
  for(const [name,p,selector] of [['board','/room/'+fixture.slug+'/hall','.hall-surface'],['live','/room/'+fixture.slug+'/live','.live-preview'],['personal',personal,'.composer'],['personal-map',personal+'/map','[aria-label="Trip Map"]'],['personal-live',personal+'/live','.live-preview'],['sandbox','/personal/my-room','.composer'],['friends','/friends','.messaging-app'],['settings','/settings','.messaging-app'],['notifications','/notifications','.messaging-app'],['profile','/profile','.messaging-app']]) {
    await run(a,'open',origin+p);await until(a,`!!document.querySelector(${JSON.stringify(selector)})`,name,45000);
    await until(a,'!document.querySelector(".hall-load-status,.chat-load-state")','surface data ready',45000);
    for(const w of [320,390,430,768,1440,1728]) {
      await run(a,'set','viewport',String(w),w<641?'844':'960');
      assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'),name+' overflow '+w);
      if(w===320||w===1440)await run(a,'screenshot',`${out}/${name}-${w}.png`);
    }
    if(name==='personal-map')assert.equal(await ev(a,count),0,'retained isolated pair has no plan writes');
    console.log('PASS six widths',name);
  }
  await run(a,'open',origin+path);await ready(a);await run(a,'set','viewport','1440','960');
  await button(a,'Open your Namecard');await until(a,'!!document.querySelector(".namecard-content")&&!document.querySelector("dialog[open]")?.textContent.includes("Loading identity")','loaded Namecard',30000);await run(a,'screenshot',out+'/namecard-1440.png');await run(a,'set','viewport','320','844');await run(a,'screenshot',out+'/namecard-320.png');await run(a,'press','Escape');await run(a,'set','viewport','1440','960');
}
if(process.argv[2]==='fp2-search-navigation') {
  const room='/room/ms73-founder-review-904a9dea';
  await run(a,'set','viewport','1440','960');await run(a,'open',origin+room+'/map');
  await until(a,'document.querySelector("[data-map-state]")?.dataset.mapState==="ready"','retained map',45000);
  await until(a,'!!document.querySelector(".composer textarea")&&!document.querySelector(".chat-load-state")','companion ready',45000);
  const draft=await ev(a,'document.querySelector(".composer textarea").value');
  await run(a,'fill','.composer textarea','FP2 unsent navigation check');
  await ev(a,'window.__fp2Canvas=document.querySelector(".maplibregl-canvas")');
  await run(a,'fill','.context-search input','Founder Review');
  await until(a,'document.querySelectorAll(".context-search-dropdown .conversation-search-result").length>0','Chat-only context results',30000);
  await run(a,'press','ArrowDown');await run(a,'press','Enter');await until(a,'!!document.querySelector(".message-source-highlight")','existing companion target',30000);
  assert.equal(await ev(a,'location.pathname'),room+'/map');assert(await ev(a,'window.__fp2Canvas===document.querySelector(".maplibregl-canvas")'));
  for(const surface of ['hall','live','map']) {
    await run(a,'click',`.surface-tabs a[href$="/${surface}"]`);await until(a,`location.pathname===${JSON.stringify(room+'/'+surface)} && !!document.querySelector('.composer textarea')`,'same companion on '+surface);
    assert.equal(await ev(a,'document.querySelector(".composer textarea").value'),'FP2 unsent navigation check');assert.equal(await ev(a,'document.querySelectorAll(".composer").length'),1);
  }
  await run(a,'fill','.composer textarea',draft);await run(a,'set','media','dark','reduced-motion');
  await until(a,'document.querySelectorAll("[data-place-id]").length===2 && document.querySelector("[data-map-state]")?.dataset.mapState==="ready"','Map snapshot mounted',45000);
  assert(await ev(a,'matchMedia("(prefers-reduced-motion: reduce)").matches'));
  await run(a,'fill','[aria-label="Search places"]','Marina Bay Sands');
  await until(a,'document.querySelectorAll("[aria-label=\\"Place search results\\"] button").length>0','Singapore search',30000);
  assert.equal(await ev(a,count),2);assert(!await ev(a,'!!document.querySelector("[aria-label=\\"Place preview\\"]")'));
  await run(a,'click','[aria-label="Place search results"] button:first-child');await until(a,'!!document.querySelector("dialog[open]")','private preview');await button(a,'Cancel');assert.equal(await ev(a,count),2);
  await run(a,'set','media','dark');console.log('PASS contextual Chat search preserves Map, same composer/draft across Board/Live/Map, reduced motion, Singapore explicit preview/cancel without save');
}
if(process.argv[2]==='fp2-comment-retry') {
  await run(a,'open',origin+path);await ready(a);await run(a,'click','[data-place-id]:first-child button[aria-label^="Comments on"]');
  await until(a,'!document.querySelector("dialog[open]")?.textContent.includes("Loading…")','loaded comments');
  const before=await ev(a,'document.querySelectorAll("[data-comment-id]").length');
  await run(a,'fill','textarea[id^=trip-comment]','FP2 committed lost acknowledgement');
  await ev(a,'(()=>{window.__fp2Fetch=fetch;window.__fp2Dropped=false;window.fetch=async(u,i)=>{if(i?.method==="POST"&&String(i.body).includes("comment")&&!window.__fp2Dropped){window.__fp2Dropped=true;const response=await window.__fp2Fetch(u,i);await response.arrayBuffer();throw new TypeError("QA lost acknowledgement");}return window.__fp2Fetch(u,i)};return true})()');
  await button(a,'Post location comment');await until(a,'document.querySelector("dialog[open]")?.textContent.includes("Retry same comment")','retry affordance',45000);
  await ev(a,'window.fetch=window.__fp2Fetch');await button(a,'Retry same comment');
  await until(a,`document.querySelectorAll('[data-comment-id]').length===${before+1} && document.querySelector('textarea[id^=trip-comment]').value===''`,'single durable comment + draft cleared',45000);
  await run(a,'fill','textarea[id^=trip-comment]','IME must not send');
  await ev(a,'(()=>{const t=document.querySelector("textarea[id^=trip-comment]");t.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}));t.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,isComposing:true}));t.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true}));return true})()');
  assert.equal(await ev(a,'document.querySelectorAll("[data-comment-id]").length'),before+1);await run(a,'fill','textarea[id^=trip-comment]','');await run(a,'press','Escape');
  console.log('PASS real committed/lost-ack retry produces one comment, clears acknowledged draft; composition Enter does not submit');
}
if(process.argv[2]==='fp2-final-details') {
  await run(a,'open',origin+path);await run(a,'set','viewport','1440','960');await ready(a);
  await run(a,'click','[data-place-id]:first-child button[aria-label^="Comments on"]');
  await until(a,'document.querySelectorAll("[data-comment-id]").length>0','loaded comments');
  assert.equal(await ev(a,'getComputedStyle(document.querySelector("dialog h2")).fontSize'),'18px');
  for(const w of [320,390,430,768,1440,1728]){await run(a,'set','viewport',String(w),'844');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'));if(w===320||w===1440)await run(a,'screenshot',`${out}/comments-final-${w}.png`);}
  await run(a,'press','Escape');await run(a,'set','viewport','1440','960');await button(a,'Open your Namecard');
  await until(a,'!!document.querySelector(".namecard-content")','loaded Namecard');
  for(const w of [320,390,430,768,1440,1728]){await run(a,'set','viewport',String(w),'844');assert(await ev(a,'document.documentElement.scrollWidth<=innerWidth+1'));if(w===320||w===1440)await run(a,'screenshot',`${out}/namecard-final-${w}.png`);}
  await run(a,'press','Escape');await run(a,'set','viewport','1440','960');
  await run(a,'open',origin+'/room/ms5-shared-room-750b4c/subroom/6c6da449-1959-4c58-b7af-274c837ae1dd/map');
  await until(a,'!!document.querySelector("[aria-label=\\"Trip Map\\"]")','authorized independent Subroom map',45000);
  await until(a,'document.querySelector("[aria-label=\\"Trip Map\\"]")?.dataset.tripRevision!==undefined','Subroom snapshot',45000);
  assert.equal(await ev(a,count),0);await run(a,'screenshot',out+'/subroom-map.png');
  console.log('PASS compact loaded comments/Namecard six widths and authorized independent Subroom empty Map; retained data unmodified');
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { run, ev, until, button } from "./browser-fp2.mjs";
const fixture=JSON.parse(readFileSync("docs/MS7-3-FP3-FIXTURE.json","utf8"));
const origin=process.env.FP3_ORIGIN??"http://localhost:3000", a=process.env.FP3_A??"ms73-fp3-a";
const base=`${origin}/room/${fixture.slug}`, input=".chat-search-bar input", results=".chat-search-bar [role=option]";
async function ready(){await until(a,"!!document.querySelector('.chat-search-bar') && document.querySelectorAll('.message-row').length>0","Chat loaded",45000);}
async function query(text){
  if(!await ev(a,`document.querySelector('${input}')?.checkVisibility()`))await button(a,"Find in this Room");
  await run(a,"fill",input,text);
  await until(a,`document.querySelectorAll('${results}').length===${text==='orchid'?3:1}`,"canonical search results");
}
if(process.argv[2]==="fp3-search") {
  await run(a,"set","viewport","1440","900");await run(a,"open",base+"?surface=chat");await ready();
  assert(await ev(a,"document.querySelector('.context-search-compact').checkVisibility()&&!document.querySelector('.context-search-field').checkVisibility()"));
  await query("orchid earliest");await run(a,"press","ArrowDown");await run(a,"press","Enter");
  await until(a,`!!document.querySelector('#message-${fixture.oldest}.message-source-highlight')`,"old source highlight");
  assert(await ev(a,"document.querySelectorAll('.message-row').length>1 && document.querySelectorAll('.context-search-dropdown').length===0"));
  await query("orchid");await run(a,"press","Escape");
  assert(await ev(a,"document.querySelector('.context-search-compact').checkVisibility()"));
  await query("orchid");await button(a,"Clear message search");
  assert(await ev(a,`document.querySelector('${input}').value===''&&!document.querySelector('.context-search-dropdown')&&document.querySelector('.context-search-compact').checkVisibility()`));
  console.log("PASS compact expansion, canonical old-message jump with surrounding history, Escape and Clear collapse.");
  for(const suffix of ["/map","/hall","/live"]) {
    await run(a,"open",base+suffix);await until(a,"!!document.querySelector('.surface-tabs')","planning surface");
    if(!await ev(a,"!!document.querySelector('.planning-chat')"))await button(a,"Chat");
    await ready();assert(await ev(a,"document.querySelectorAll('.context-search').length===1&&!!document.querySelector('.planning-chat .chat-search-bar input')&&!document.querySelector('.conversation-header .context-search')"));
    await ev(a,"window.__fp3Canvas=document.querySelector('.maplibregl-canvas')");
    await query("orchid earliest");await run(a,"press","Enter");
    await until(a,`!!document.querySelector('#message-${fixture.oldest}.message-source-highlight')`,"companion source highlight");
    assert.equal(await ev(a,"location.pathname"),`/room/${fixture.slug}${suffix}`);
    assert(await ev(a,"window.__fp3Canvas===document.querySelector('.maplibregl-canvas')"));
    console.log("PASS one Chat-owned search and history jump preserves planning surface",suffix);
  }
}
if(process.argv[2]==="fp3-search-layout") {
  for(const width of [320,390,430,768,1440,1728]) {
    await run(a,"set","viewport",String(width),width<640?"844":"1000");await run(a,"open",base+"?surface=chat");await ready();
    await query("orchid");
    assert(await ev(a,"document.documentElement.scrollWidth<=innerWidth+1"));
    assert(await ev(a,"(()=>{const r=document.querySelector('.context-search-dropdown').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight})()"));
    assert(await ev(a,"document.querySelector('.context-search-dropdown').getBoundingClientRect().top>document.querySelector('.context-search-field').getBoundingClientRect().bottom"),"Results must never cover focused search field");
    await run(a,"screenshot",`/tmp/tosker-fp3-search-${width}.png`);await run(a,"press","Escape");
    console.log("PASS search bounds/no page overflow/compact escape",width);
  }
}

import {execFile} from "node:child_process";
import {promisify} from "node:util";
import assert from "node:assert/strict";
const exec=promisify(execFile),bin=process.env.AGENT_BROWSER_BIN;
if(!bin)throw new Error("Set AGENT_BROWSER_BIN.");
async function run(...args){const {stdout}=await exec(bin,["--session","ms71-b","--json",...args],{timeout:45000});const out=JSON.parse(stdout);assert(out.success);return args[0]==="eval"?out.data?.result:out.data;}
const ev=js=>run("eval",js);
async function until(js,label){const end=Date.now()+60000;while(Date.now()<end){if(await ev(js))return;await new Promise(r=>setTimeout(r,350));}throw new Error(`Timed out: ${label}`);}
async function foreground() {
  if (!await ev("document.hidden")) return;
  const { tabs } = await run("tab", "list"), current = tabs.find(tab => tab.active);
  assert(current, "Retain the actual current browser tab");
  const label = `ms719-focus-${Date.now()}`;
  await run("tab", "new", "--label", label, "about:blank");
  await run("tab", current.tabId); await run("tab", "close", label);
  await until("!document.hidden", "native foreground transition completes");
  console.log("Harness: native temporary-tab switch/close restored foreground; no visibility override.");
}
for(const width of [320,390]){
  await run("set","viewport",`${width}`,"844");await run("open","http://localhost:3000/notifications");await until("!!document.querySelector('.notification-list article')","canonical notifications");
  const metrics=await ev("(()=>{const s=x=>getComputedStyle(document.querySelector(x));return {overflow:document.documentElement.scrollWidth>innerWidth,title:s('.notification-list strong').fontSize,body:s('.notification-list p').fontSize,meta:s('.notification-list time').fontSize,filterOverflow:document.querySelector('.notifications-workspace > nav').scrollWidth>document.querySelector('.notifications-workspace > nav').clientWidth}})()");
  assert.deepEqual(metrics,{overflow:false,title:"14px",body:"13px",meta:"12px",filterOverflow:false});
  await run("find","role","button","click","--name","Mentions","--exact");
  assert(await ev("Array.from(document.querySelectorAll('.notification-list strong')).every(e=>e.textContent==='Mentioned you')"));
  await run("screenshot",`/tmp/tosker-ms719-notifications-${width}.png`);
}
await run("set","viewport","1440","900");await run("open","http://localhost:3000/room/ms719-integrated-1788885047459-80440f");await until("!!document.querySelector('.composer textarea')","Chat");
// Native Tab traversal from normal route entry; no DOM focus shortcut.
let found=false;
for(let i=0;i<100;i++){await run("press","Tab");if(await ev("document.activeElement?.getAttribute('aria-label')==='Search conversation'")){found=true;break;}}
assert(found,"Search is keyboard reachable");
assert(await ev("document.activeElement.matches(':focus-visible')"));
await run("press","Enter");await until("document.activeElement?.type==='search'","Search input focused");
for(let i=0;i<8;i++){await run("press","Tab");assert(await ev("document.querySelector('dialog')?.matches(':modal')&&(!!document.activeElement.closest('dialog[open]')||document.activeElement===document.body)"),"Native modal never exposes background controls");}
await run("press","Escape");await until("!document.querySelector('dialog[open]')&&document.activeElement?.getAttribute('aria-label')==='Search conversation'","Escape restores Search trigger");
await run("press","Tab");assert.equal(await ev("document.activeElement?.getAttribute('aria-label')"),"Conversation options");await run("press","Space");await until("!!document.querySelector('.communication-options')","Options opens with Space");
await run("press","End");assert.match(await ev("document.activeElement.textContent"),/Mark Chat unread/);await run("press","Home");await run("press","Escape");await until("document.activeElement?.getAttribute('aria-label')==='Conversation options'&&!document.querySelector('.interaction-popover')","Options Escape restores focus");
await run("press","Space");await until("!!document.querySelector('.communication-options')","options for unread");await run("press","End");await run("press","Enter");await until("location.pathname==='/app'","manual unread saved");
await run("open","http://localhost:3000/room/ms719-integrated-1788885047459-80440f?message=667f8507-7f3e-4c69-9fcc-95f3c8d344c8");
await foreground();
await until("document.querySelector('.composer-error')?.textContent.includes('That message couldn’t be opened')&&!!document.querySelector('.surface-tabs a:first-child .attention-mark')&&!!document.querySelector('.message-row')","denied source preserves manual unread and renders recoverable context");
await run("click",".history-latest button:first-child");await until("!document.querySelector('.composer-error')&&!document.querySelector('.surface-tabs a:first-child .attention-mark')&&!document.querySelector('.history-latest')","explicit Latest recovers and consumes unread");
console.log("PASS: 320/390 Notifications readable typography, wrapping, real Mentions category; native Tab/Enter Search, modal focus containment/Escape restore, Space/options/Home/End/Escape; denied source preserves manual unread, explicit Latest clears error and consumes. No destructive actions or messages sent. Physical assistive/touch limitations remain.");

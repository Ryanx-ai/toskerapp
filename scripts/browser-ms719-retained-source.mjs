import {execFile} from "node:child_process";
import {promisify} from "node:util";
import assert from "node:assert/strict";
const exec=promisify(execFile),bin=process.env.AGENT_BROWSER_BIN;
if(!bin)throw new Error("Set AGENT_BROWSER_BIN.");
async function run(...args){const {stdout}=await exec(bin,["--session","ms71-a","--json",...args],{timeout:45000});const out=JSON.parse(stdout);assert(out.success);return args[0]==="eval"?out.data?.result:out.data;}
const ev=js=>run("eval",js);
async function until(js,label){const end=Date.now()+60000;while(Date.now()<end){if(await ev(js))return;await new Promise(r=>setTimeout(r,300));}throw new Error(`Timed out: ${label}`);}
async function click(selector){await run("scrollintoview",selector);await until(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e?.getBoundingClientRect();return e&&!e.disabled&&r.top>=0&&r.bottom<=innerHeight})()`,"visible control");await run("click",selector);}
const root="/room/ms7-1-qa-japan-trip-2027-6f6ae6";
await run("set","viewport","1440","900");await run("open",`http://localhost:3000${root}`);await until("!!document.querySelector('.conversation-header')","workspace");
const sandbox=await ev("Array.from(document.querySelectorAll('a')).find(e=>e.getAttribute('aria-label')?.endsWith(\"'s Sandbox\"))?.getAttribute('href')");assert(sandbox);
for(const [context,path] of [["Personal","/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa"],["Room",root],["Subroom",`${root}/subroom/4dabe4eb-acf4-4e5c-aac9-c12eb0614dd4`],["Sandbox",sandbox]]){
  await run("open",`http://localhost:3000${path}`);await until("!!document.querySelector('.composer textarea')&&!document.querySelector('.chat-load-state')","Chat loaded");
  assert.equal(await ev("document.querySelector('.composer textarea').value"),"","Preserve unrelated drafts");
  const body=`MS719 retained-source ${context} ${Date.now()}`;await run("fill",".composer textarea",body);await click(".send-button");await until("document.querySelector('.composer textarea').value===''","send accepted");
  const id=await ev(`Array.from(document.querySelectorAll('.message-row')).find(e=>e.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(body)}).id`);
  await click(`#${id} [aria-label="More message actions"]`);await until("!!document.querySelector('.message-action-list')","message menu");await run("find","role","button","click","--name","Pin to Hall","--exact");await until("!document.querySelector('.interaction-popover')","pin saved");
  await run("open",`http://localhost:3000${path}/hall`);await until("!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')","Hall loaded");
  const hallId=await ev(`Array.from(document.querySelectorAll('.hall-local-pinned-message')).find(e=>e.querySelector('p')?.textContent===${JSON.stringify(body)})?.dataset.hallId`);assert(hallId);
  await click(`[data-hall-id="${hallId}"] .hall-card-more`);await until("!!document.querySelector('.hall-context a')","source action");
  assert.equal(await ev("document.querySelector('.hall-context a').textContent"),"Open in Chat");await click(".hall-context a");
  await until(`document.activeElement?.id===${JSON.stringify(id)}&&!!document.querySelector('.message-source-highlight')`,"source focus/highlight");assert.equal(await ev(`document.querySelector('#${id} .message-bubble > p').textContent`),body);
  await run("open",`http://localhost:3000${path}/hall`);await until(`!!document.querySelector('[data-hall-id="${hallId}"]')&&!document.querySelector('.hall-load-status')`,"pin persists");await click(`[data-hall-id="${hallId}"] .hall-card-more`);await run("find","role","button","click","--name","Unpin from Hall","--exact");await until(`!document.querySelector('[data-hall-id="${hallId}"]')`,"unpin accepted");
  await run("open",`http://localhost:3000${path}`);await until(`!!document.querySelector('#${id}')`,"original retained");assert.equal(await ev(`document.querySelector('#${id} .message-bubble > p').textContent`),body);
  console.log(`PASS: ${context} Chat→Hall pin, persisted reference, authorized source focus/highlight, unpin preserves original. QA message ${id.slice(8)} retained for exact cleanup.`);
}

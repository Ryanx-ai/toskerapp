import {execFile} from "node:child_process";
import {promisify} from "node:util";
import assert from "node:assert/strict";
const exec=promisify(execFile),bin=process.env.AGENT_BROWSER_BIN;
if(!bin)throw new Error("Set AGENT_BROWSER_BIN.");
async function run(...args){const {stdout}=await exec(bin,["--session","ms71-a","--json",...args],{timeout:30000});const out=JSON.parse(stdout);assert(out.success);return args[0]==="eval"?out.data?.result:out.data;}
const ev=js=>run("eval",js);
async function until(js,label){const end=Date.now()+45000;while(Date.now()<end){if(await ev(js))return;await new Promise(r=>setTimeout(r,300));}throw new Error(`Timed out: ${label}`);}
async function clear(){await ev("(()=>{const e=document.querySelector('.composer textarea');e.focus();e.select();return true})()");await run("press","Backspace");await until("document.querySelector('.composer textarea').value===''","test draft cleared");}
await run("open","http://localhost:3000/room/ms714-history-26ba8c8f");await until("document.querySelectorAll('.message-row').length>0","Chat loaded");
assert.equal(await ev("document.querySelector('.composer textarea').value"),"","Preserve unrelated drafts");
await run("fill",".composer textarea","@");await until("document.querySelectorAll('.mention-suggestions [role=option]').length===2","initial picker");
await run("press","Escape");assert(!await ev("!!document.querySelector('.mention-suggestions')"));await clear();
await run("type",".composer textarea","@");await until("document.querySelectorAll('.mention-suggestions [role=option]').length===2","retyped @ reopens after Escape");await run("press","Escape");await clear();
for(let i=0;i<10;i++){
  await run("type",".composer textarea","@");await until("document.querySelectorAll('.mention-suggestions [role=option]').length===2","authorized choices");
  await run("press","ArrowDown");await run("press","Enter");
  await until(`(()=>{const e=document.querySelector('.composer textarea');return e.value===${JSON.stringify("@tosker-user-b-clerk-test ")} .repeat(${i+1})&&e.selectionStart===e.value.length&&!document.querySelector('.mention-suggestions')})()`,"selection/caret settled");
}
await run("type",".composer textarea","@");await until("document.querySelectorAll('.mention-suggestions [role=option]').length===2","eleventh option");const before=await ev("document.querySelector('.composer textarea').value");
await run("press","Enter");await until("document.body.innerText.includes('Use up to 10 mentions')","explicit limit");assert.equal(await ev("document.querySelector('.composer textarea').value"),before);
await run("press","Escape");await clear();assert(!await ev("document.body.innerText.includes('Use up to 10 mentions')"));
await run("type",".composer textarea","Line one");await run("press","Shift+Enter");await run("type",".composer textarea","Line two");assert.equal(await ev("document.querySelector('.composer textarea').value"),"Line one\nLine two");await clear();
console.log("PASS: Escape/clear/retype @; ten explicit targets with stable caret; eleventh rejected without text mutation; limit feedback clears; Shift+Enter preserves multiline; no messages sent.");

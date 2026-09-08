import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN, s = "ms71-a";
if (!bin) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(...args) { const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 45000 }); const out = JSON.parse(stdout); assert(out.success); return args[0] === "eval" ? out.data?.result : out.data; }
const ev = js => run("eval", js);
async function until(js, label) { const end = Date.now() + 60000; while (Date.now() < end) { if (await ev(js)) return; await new Promise(r => setTimeout(r, 400)); } throw new Error(`Timed out: ${label}`); }
const click = name => run("find", "role", "button", "click", "--name", name, "--exact");
const room = "/room/ms714-history-26ba8c8f";
const fits = selector => ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1;})()`);
for (const [width, height] of [[320,740],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900],[1728,1117]]) {
  await run("set", "viewport", String(width), String(height));
  await run("open", `http://localhost:3000${room}`);
  await until("document.querySelectorAll('.message-row').length>0&&!!document.querySelector('.composer textarea')", "Chat loaded");
  assert(await ev("document.documentElement.scrollWidth<=innerWidth+1"), `${width} page overflow`);
  for (const selector of [".conversation-header", ".surface-tabs", ".composer", ".composer textarea"]) assert(await fits(selector), `${width} ${selector} clipped`);
  const sizes = await ev("({body:getComputedStyle(document.querySelector('.message-bubble > p')).fontSize,input:getComputedStyle(document.querySelector('.composer textarea')).fontSize})");
  assert(parseFloat(sizes.body)>=15 && parseFloat(sizes.input)>=(width<=600?16:15), `${width} functional scale`);
  assert.equal(await ev("document.querySelector('.composer textarea').value"), "", "Preserve unrelated draft");
  await run("fill", ".composer textarea", "@");
  await until("document.querySelectorAll('.mention-suggestions [role=option]').length===2", "A/B suggestions");
  assert(await fits(".mention-suggestions"), `${width} mention picker clipped`);
  await run("press", "Escape"); await run("fill", ".composer textarea", " "); await run("press", "Backspace");
  await click("Search conversation"); await until("!!document.querySelector('.conversation-search input')", "search opens");
  assert(await fits(".conversation-search"), `${width} search clipped`);
  await run("press", "Escape");
  await run("click", `.surface-tabs a[href="${room}/hall"]`);
  await until("!!document.querySelector('.hall-surface')&&!document.querySelector('.hall-load-status')", "Hall loaded");
  assert(await ev("document.documentElement.scrollWidth<=innerWidth+1"), `${width} Hall overflow`);
  await click("New Note"); await until("!!document.querySelector('dialog[open] input')", "note modal");
  assert(await fits("dialog[open]"), `${width} note modal clipped`);
  await click("Close");
  await until("!document.querySelector('dialog[open]')", "note cancelled without mutation");
  console.log(`PASS: ${width}×${height} Chat/Hall, computed type, composer, @ picker, Search and New Note modal; no horizontal clipping.`);
}
await run("set", "viewport", "1440", "900");

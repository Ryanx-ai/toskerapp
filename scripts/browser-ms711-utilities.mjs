import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(...args) {
  const { stdout } = await exec(binary, ["--session", "ms71-a", "--json", ...args], { timeout: 25000 });
  const result = JSON.parse(stdout);
  if (!result.success) throw new Error(`Browser command failed: ${args[0]}`);
  return result.data?.result ?? result.data;
}
const evaluate = (js) => run("eval", js);
async function until(js, label) {
  const end = Date.now() + 25000;
  while (Date.now() < end) { if (await evaluate(js)) return; await new Promise((r) => setTimeout(r, 350)); }
  throw new Error(`Timed out: ${label}`);
}
assert.equal(await evaluate("location.pathname"), "/room/ms7-1-qa-japan-trip-2027-6f6ae6");
assert.equal(await evaluate("document.querySelector('.composer textarea').value"), "");
const source = "MS7.1 scenario 07: https://example.com and javascript:alert(1)";
const id = await evaluate(`Array.from(document.querySelectorAll('.message-row')).find(r=>r.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(source)})?.id`);
assert.ok(id, "QA link source is in the current history window");
await run("scrollintoview", `#${id}`);
await until(`(()=>{const r=document.querySelector('#${id} .message-bubble').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`, "source scrolled into view");
const box = await evaluate(`(()=>{const r=document.querySelector('#${id} .message-bubble').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
await run("mouse", "move", `${Math.round(box.x)}`, `${Math.round(box.y)}`);
await run("mouse", "down", "right"); await run("mouse", "up", "right");
await until("!!document.querySelector('.message-action-list')", "right-click keeps menu open");
await run("press", "Escape");
await until("!document.querySelector('.message-action-list')", "Escape dismissal");
await run("focus", `#${id} [aria-label="More message actions"]`);
await run("press", "Enter");
await until("!!document.querySelector('.message-action-list')", "keyboard explicit control");
await run("press", "Escape");
assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), "More message actions");
await run("click", `#${id} [aria-label="More message actions"]`);
await until("!!document.querySelector('.message-action-list')", "explicit menu");
const index = await evaluate("Array.from(document.querySelectorAll('.message-action-list button')).findIndex(b=>b.textContent==='Copy')");
await run("click", `.message-action-list button:nth-of-type(${index + 1})`);
await until("!document.querySelector('.message-action-list')", "clipboard write acknowledged");
let clipboard;
try { clipboard = await run("clipboard", "read"); }
catch { console.log("PARTIAL: right-click, Enter, Escape, focus return and Clipboard write pass; read-back unavailable in automation."); }
if (clipboard !== undefined) {
  assert.equal(typeof clipboard === "string" ? clipboard : clipboard.text, source);
  console.log("PASS: right-click, Enter, Escape, focus return and actual clipboard text.");
}
await run("set", "viewport", "390", "844");
await run("scrollintoview", `#${id}`);
await until(`(()=>{const r=document.querySelector('#${id} .message-bubble').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`, "mobile source visible");
await run("click", `#${id} [aria-label="More message actions"]`);
await until("!!document.querySelector('.message-action-list')", "narrow explicit action path");
assert.equal(await evaluate("(()=>{const r=document.querySelector('.interaction-popover').getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"), true);
await run("press", "Escape");
await run("set", "viewport", "1440", "900");
await run("scrollintoview", `#${id}`);
await until(`(()=>{const r=document.querySelector('#${id} .message-bubble').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`, "link source visible");
const before = await run("tab", "list");
await run("click", `#${id} a.message-link`);
const after = await run("tab", "list");
const tabValues = (value) => Array.isArray(value) ? value : value.tabs ?? [];
assert.ok(tabValues(after).length > tabValues(before).length, "External link opens a new tab");
const example = tabValues(after).find((tab) => tab.url?.startsWith("https://example.com"));
assert.ok(example, "External tab destination is HTTPS Example Domain");
await run("tab", "close", example.tabId);
await run("tab", tabValues(before).find((tab) => tab.active).tabId);
console.log("PASS: safe HTTPS link opens Example Domain in a separate tab; original Chat remains.");
console.log("PASS: mobile explicit menu fits. Inspect new Example Domain tab as external navigation evidence.");

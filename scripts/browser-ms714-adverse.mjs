import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
if (!bin) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(s, ...args) { const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 30000 }); const out = JSON.parse(stdout); assert(out.success); return args[0] === "eval" ? out.data?.result : out.data; }
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) { const end = Date.now() + 45000; while (Date.now() < end) { if (await ev(s, js)) return; await new Promise((r) => setTimeout(r, 300)); } throw new Error(`Timed out: ${label}`); }
const path = "/room/ms714-history-26ba8c8f", route = "**/api/conversations/*/messages?*";
const rowIds = "Array.from(document.querySelectorAll('.message-row')).map(e=>e.id)";
for (const s of ["ms71-a", "ms71-b"]) {
  await run(s, "open", `http://localhost:3000${path}`);
  await until(s, "document.querySelectorAll('.message-row').length===50&&!document.querySelector('.chat-load-state')", "loaded Chat");
  assert(["", ...(s === "ms71-a" ? ["MS714 recovery draft"] : [])].includes(await ev(s, "document.querySelector('.composer textarea').value")), "Preserve unrelated drafts");
}
try {
  await run("ms71-a", "fill", ".composer textarea", "MS714 recovery draft");
  await ev("ms71-a", "document.querySelector('.message-scroll').scrollTop=0");
  const before = await ev("ms71-a", rowIds);
  await run("ms71-a", "set", "offline", "on");
  await run("ms71-a", "click", ".history-page-controls button");
  await until("ms71-a", "document.body.innerText.includes('History couldn’t be loaded')", "history failure feedback");
  assert.deepEqual(await ev("ms71-a", rowIds), before, "Failure retains window");
  assert.equal(await ev("ms71-a", "document.querySelector('.composer textarea').value"), "MS714 recovery draft");
  await run("ms71-a", "set", "offline", "off");
  await run("ms71-a", "click", ".history-page-controls button");
  await until("ms71-a", "document.querySelectorAll('.message-row').length===100&&!document.querySelector('.history-page-controls button:disabled')", "history retry");
  assert.equal(await ev("ms71-a", "document.body.innerText.includes('History couldn’t be loaded')"), false);
  const source = await ev("ms71-a", "(()=>{const e=Array.from(document.querySelectorAll('.message-row')).find(e=>!e.classList.contains('mine')&&!e.classList.contains('message-deleted'));return {id:e.id,body:e.querySelector('.message-bubble > p').textContent}})()");
  await run("ms71-a", "scrollintoview", `#${source.id}`);
  await run("ms71-a", "click", `#${source.id} [aria-label="Reply"]`);
  await until("ms71-a", "!!document.querySelector('.reply-context')", "older reply selected");
  await run("ms71-a", "click", `.surface-tabs a[href="${path}/hall"]`);
  await until("ms71-a", "!!document.querySelector('.hall-surface')", "Hall navigation");
  await run("ms71-a", "click", `.surface-tabs a[href="${path}"]`);
  await until("ms71-a", "document.querySelector('.composer textarea')?.value==='MS714 recovery draft'&&!!document.querySelector('.reply-context')", "draft and older reply retained");
  await run("ms71-a", "reload");
  await until("ms71-a", "document.querySelector('.composer textarea')?.value==='MS714 recovery draft'&&!!document.querySelector('.reply-context')&&!document.querySelector('.chat-load-state')", "reload retains older reply");
  await run("ms71-a", "set", "offline", "on");
  await run("ms71-a", "click", ".send-button");
  await until("ms71-a", "document.body.innerText.includes('Delivery couldn')", "failed send");
  assert.equal(await ev("ms71-a", "document.querySelector('.composer textarea').value"), "MS714 recovery draft");
  assert(await ev("ms71-a", "!!document.querySelector('.reply-context')"));
  await run("ms71-a", "set", "offline", "off");
  await run("ms71-a", "click", ".send-button");
  await until("ms71-a", "document.querySelector('.composer textarea').value===''", "retry acknowledgement");
  for (const s of ["ms71-a", "ms71-b"]) await until(s, `Array.from(document.querySelectorAll('.message-row')).filter(e=>e.querySelector('.message-bubble > p')?.textContent==='MS714 recovery draft'&&e.querySelector('blockquote')?.textContent===${JSON.stringify(source.body)}).length===1`, "one durable reply to older source");
  console.log("PASS: failed older GET preserves window/draft, retry recovers; older reply survives Chat/Hall/reload, offline send retains draft/quote, retry delivers exactly once to A/B.");
} finally {
  await run("ms71-a", "network", "unroute", route).catch(() => undefined);
  await run("ms71-a", "set", "offline", "off").catch(() => undefined);
}

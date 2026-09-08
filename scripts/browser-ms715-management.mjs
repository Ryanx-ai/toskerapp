import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
if (!bin) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(s, ...args) { const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 45000 }); const out = JSON.parse(stdout); assert(out.success); return args[0] === "eval" ? out.data?.result : out.data; }
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) { const end = Date.now() + 60000; while (Date.now() < end) { if (await ev(s, js)) return; await new Promise((r) => setTimeout(r, 400)); } throw new Error(`Timed out: ${label}`); }
const a = "ms71-a", b = "ms71-b", path = "/room/ms714-history-26ba8c8f", cid = "7a03d40e-6da6-4322-8af3-418987567f2c";
const pref = `fetch('/api/workspace').then(r=>r.json()).then(v=>v.preferences.find(p=>p.conversationId==='${cid}'))`;
const click = (s, name) => run(s, "find", "role", "button", "click", "--name", name, "--exact");
for (const s of [a,b]) { await run(s, "open", `http://localhost:3000${path}`); await until(s, "document.querySelectorAll('.message-row').length>0", "loaded Chat"); }
await click(a, "Conversation options"); await click(a, "Mute");
await until(a, "!!document.querySelector('[aria-label=Muted]')", "muted state");
assert((await ev(a,pref)).muted); assert(!(await ev(b,pref))?.muted);
await run(a,"reload"); await until(a,"!!document.querySelector('[aria-label=Muted]')","mute survives reload");
await click(a,"Conversation options"); await click(a,"Mark Chat unread");
await until(a,"location.pathname==='/app'","manual unread exits destination");
assert((await ev(a,pref)).manualChatUnreadId);
await run(a,"reload"); await until(a,`!!document.querySelector('.conversation-row[href="${path}"] .attention-mark')`,"manual unread rail survives reload");
await run(a,"click",`.conversation-row[href="${path}"]`);
await until(a,"document.querySelectorAll('.message-row').length>0","return Chat");
await until(a,`!document.querySelector('.conversation-row[href="${path}"] .attention-mark')`,"consumption clears marker");
assert.equal((await ev(a,pref)).manualChatUnreadId,null);
await click(a,"Conversation options"); await click(a,"Unmute");
await until(a,"!document.querySelector('[aria-label=Muted]')&&!document.querySelector('.communication-options')","unmute");
await click(a,"Search conversation"); await run(a,"fill",".conversation-search input","history 0101"); await run(a,"press","Enter");
await until(a,"document.querySelectorAll('.conversation-search-result').length===1","search result");
await run(a,"click",".conversation-search-result");
await until(a,"document.querySelector('.message-source-highlight')?.textContent.includes('history 0101')","old target loads/highlights");
assert.equal(await ev(a,"document.querySelectorAll('.message-row').length"),50);
await run(a,"set","viewport","390","844"); await click(a,"Search conversation");
await run(a,"fill",".conversation-search input","no-ms715-result-found"); await run(a,"press","Enter");
await until(a,"document.querySelector('.conversation-search-results')?.textContent.includes('No messages found')","mobile no results");
assert(await ev(a,"document.querySelector('.conversation-search').getBoundingClientRect().right<=innerWidth&&document.querySelector('.conversation-search').getBoundingClientRect().left>=0"));
await run(a,"press","Escape");
assert.equal(await ev(a,"document.activeElement?.getAttribute('aria-label')"),"Search conversation");
await run(a,"set","viewport","1440","900");
console.log("PASS: A-only persistent mute/unmute; manual unread rail/reload/consumption; B preference isolation; real older search→50-row target/highlight; mobile empty state and Escape focus restoration.");

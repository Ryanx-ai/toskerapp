import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
if (!bin) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(s, ...args) { const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 30000 }); const out = JSON.parse(stdout); assert(out.success); return args[0] === "eval" ? out.data?.result : out.data; }
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) { const end = Date.now() + 45000; while (Date.now() < end) { if (await ev(s, js)) return; await new Promise((r) => setTimeout(r, 250)); } throw new Error(`Timed out: ${label}`); }
const path = "/room/ms714-history-26ba8c8f";
const expectedHistory = Number(process.env.MS714_EXPECTED_HISTORY ?? 525);
assert(Number.isInteger(expectedHistory) && expectedHistory >= 525, "Use the verified existing fixture count");
const ids = () => ev("ms71-a", "Array.from(document.querySelectorAll('.message-row')).map(e=>e.id)");
for (const s of ["ms71-a", "ms71-b"]) {
  await run(s, "open", `http://localhost:3000${path}`);
  await until(s, "document.querySelectorAll('.message-row').length===50&&document.querySelector('.conversation-surface')?.dataset.realtime==='connected'", "loaded connected latest page");
  assert.equal(await ev(s, "document.querySelector('.composer textarea').value"), "", "Preserve an existing draft");
  assert.equal(await ev(s, "!!document.querySelector('.history-latest')"), false, "Initial load stays at latest");
}
const seen = new Set(await ids());
for (let page = 0; page < Math.ceil((expectedHistory - 50) / 50); page++) {
  await ev("ms71-a", "document.querySelector('.message-scroll').scrollTop=0");
  await until("ms71-a", "document.querySelector('.history-page-controls button')&&!document.querySelector('.history-page-controls button').disabled", "older available");
  const before = await ids();
  const anchor = await ev("ms71-a", "(()=>{const e=document.querySelector('.message-row');return {id:e.id,top:e.getBoundingClientRect().top}})()");
  await run("ms71-a", "click", ".history-page-controls button");
  await until("ms71-a", `document.querySelector('.message-row')?.id!==${JSON.stringify(before[0])}&&!document.querySelector('.history-page-controls button:disabled')`, "older page rendered");
  const after = await ids(); after.forEach((id) => seen.add(id));
  assert.equal(after.length, Math.min(200, 100 + page * 50));
  assert.equal(new Set(after).size, after.length, "No duplicate IDs");
  const delta = await ev("ms71-a", `document.getElementById(${JSON.stringify(anchor.id)}).getBoundingClientRect().top-${anchor.top}`);
  assert(Math.abs(delta) <= 2, `Anchor moved ${delta}px`);
  assert(after.includes(before[0]), "Visible anchor stays mounted");
}
assert.equal(seen.size, expectedHistory, "Entire verified history traversed in a bounded DOM");
assert.equal(await ev("ms71-a", "!!document.querySelector('.history-page-controls button')"), false, "No dead older control at history start");
const held = await ids();
const position = await ev("ms71-a", "document.querySelector('.message-scroll').scrollTop");
const body = `MS714 history arrival ${Date.now().toString(36)}`;
await run("ms71-b", "fill", ".composer textarea", body);
await run("ms71-b", "click", ".send-button");
await until("ms71-b", "document.querySelector('.composer textarea').value===''", "sender accepted");
await until("ms71-a", "document.querySelector('.history-latest')?.textContent.includes('New messages')", "new activity while reading older history");
assert.deepEqual(await ids(), held, "New arrival does not replace the reading window");
assert(Math.abs(await ev("ms71-a", "document.querySelector('.message-scroll').scrollTop") - position) <= 2);
await run("ms71-a", "click", ".history-latest button:last-child");
await until("ms71-a", `document.querySelector('.message-row')?.id!==${JSON.stringify(held[0])}`, "newer page moves bounded window");
assert.equal((await ids()).length, 200);
await run("ms71-a", "click", ".history-latest button:first-child");
await until("ms71-a", `!document.querySelector('.history-latest')&&Array.from(document.querySelectorAll('.message-bubble > p')).some(e=>e.textContent===${JSON.stringify(body)})`, "return latest includes arrival");
assert.equal((await ids()).length, 50);
assert(await ev("ms71-a", "(()=>{const e=document.querySelector('.message-scroll');return e.scrollHeight-e.scrollTop-e.clientHeight<3})()"));
console.log(`PASS: ${expectedHistory}-row browser history, 50-row pages, 200-node cap, stable anchors/no duplicates, oldest boundary, incoming activity holds reading position, forward page and Latest recover canonical arrival.`);

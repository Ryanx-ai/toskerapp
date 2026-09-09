import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
if (!bin) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(s, ...args) { const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 30000 }); const out = JSON.parse(stdout); assert(out.success); return args[0] === "eval" ? out.data?.result : out.data; }
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) { const end = Date.now() + 45000; while (Date.now() < end) { if (await ev(s, js)) return; await new Promise((r) => setTimeout(r, 250)); } throw new Error(`Timed out: ${label}`); }
const origin = process.env.MS714_ORIGIN ?? "http://localhost:3000";
assert(["http://localhost:3000", "https://toskerapp.vercel.app"].includes(origin));
const room = process.env.MS714_ROOM ?? "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
assert(/^\/room\/(?:ms7-1-qa-japan-trip-2027-6f6ae6|ms719-integrated-\d+-[0-9a-f]+)$/.test(room), "Known QA context only");
const childId = process.env.MS714_CHILD ?? "4dabe4eb-acf4-4e5c-aac9-c12eb0614dd4";
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(childId));
const samples = [];
for (const [context, path] of [["Personal", "/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa"], ["Room", room], ["Subroom", `${room}/subroom/${childId}`]]) {
  for (const s of ["ms71-a", "ms71-b"]) {
    await run(s, "open", `${origin}${path}`);
    await until(s, "document.querySelector('.conversation-surface')?.dataset.realtime==='connected'&&!document.querySelector('.chat-load-state')", "connected loaded Chat");
    assert.equal(await ev(s, "document.querySelector('.composer textarea').value"), "", "Preserve existing draft");
  }
  for (let index = 0; index < 3; index++) {
    const body = `MS714 latency ${context} ${Date.now().toString(36)} ${index}`;
    for (const s of ["ms71-a", "ms71-b"]) await ev(s, "performance.getEntriesByType('mark').filter(e=>e.name.startsWith('tosker:')).forEach(e=>performance.clearMarks(e.name))");
    await ev("ms71-b", `(()=>{window.__ms714Visible=0;window.__ms714Observer?.disconnect();window.__ms714Observer=new MutationObserver(()=>{if(Array.from(document.querySelectorAll('.message-bubble > p')).some(e=>e.textContent===${JSON.stringify(body)})){requestAnimationFrame(()=>{window.__ms714Visible=Date.now()});window.__ms714Observer.disconnect()}});window.__ms714Observer.observe(document.querySelector('.message-scroll'),{subtree:true,childList:true,characterData:true})})()`);
    await run("ms71-a", "fill", ".composer textarea", body);
    await run("ms71-a", "click", ".send-button");
    await until("ms71-a", "performance.getEntriesByName('tosker:send-returned').length>0", "send acknowledgement");
    await until("ms71-b", "window.__ms714Visible>0", "recipient rendered");
    const sender = await ev("ms71-a", "({start:performance.getEntriesByName('tosker:send-start').at(-1).detail,end:performance.getEntriesByName('tosker:send-returned').at(-1).detail})");
    const recipient = await ev("ms71-b", `({visible:window.__ms714Visible,signal:performance.getEntriesByName('tosker:signal').find(e=>e.detail.traceId===${JSON.stringify(sender.start.traceId)})?.detail,read:performance.getEntriesByName('tosker:read-returned').filter(e=>e.detail.at<=window.__ms714Visible).at(-1)?.detail})`);
    assert(recipient.signal, "A real Ably signal is required, not just fallback polling");
    // Server and browser wall clocks differ on Vercel: the raw trace delta
    // may be negative and must not be presented as a transport duration.
    const sample = { context, sample: index + 1, ackMs: sender.end.durationMs, authMs: sender.end.authMs, authorizationMs: sender.end.authorizationMs, transactionMs: sender.end.transactionMs, publishMs: sender.end.publishMs, serverMs: sender.end.totalMs, commitToSignalMs: origin === "http://localhost:3000" ? recipient.signal.commitToSignalMs : undefined, signalToVisibleMs: recipient.visible - recipient.signal.at, canonicalReadMs: recipient.read?.durationMs, sendToVisibleMs: recipient.visible - sender.start.at };
    samples.push(sample); console.log(JSON.stringify(sample));
  }
}
for (const context of ["Personal", "Room", "Subroom"]) {
  const rows = samples.filter((s) => s.context === context);
  const median = (key) => rows.map((s) => s[key]).sort((a, b) => a - b)[1];
  console.log(JSON.stringify({ context, summary: process.env.MS714_PHASE ?? "baseline", samples: 3, medianAckMs: median("ackMs"), medianVisibleMs: median("sendToVisibleMs"), medianReadMs: median("canonicalReadMs"), medianServerMs: median("serverMs") }));
}

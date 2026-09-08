import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), bin = process.env.AGENT_BROWSER_BIN;
if (!bin) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(s, ...args) { const { stdout } = await exec(bin, ["--session", s, "--json", ...args], { timeout: 30000 }); const out = JSON.parse(stdout); assert(out.success); return args[0] === "eval" ? out.data?.result : out.data; }
const ev = (s, js) => run(s, "eval", js);
async function until(s, js, label) { const end = Date.now() + 45000; while (Date.now() < end) { if (await ev(s, js)) return; await new Promise((r) => setTimeout(r, 300)); } throw new Error(`Timed out: ${label}`); }
await run("ms71-a", "open", "http://localhost:3000/room/ms714-history-26ba8c8f");
await until("ms71-a", "document.querySelectorAll('.message-row').length===50&&document.querySelector('.conversation-surface')?.dataset.realtime==='connected'", "latest connected");
const original = await ev("ms71-a", "Array.from(document.querySelectorAll('.message-row')).map(e=>e.id)");
// Seed-only child intentionally has no navigation access row; verify its direct API scope.
const child = "8f2bbbb8-f0dd-4d8f-adcf-8bb81379fbb4";
assert.match(child, /^[a-f0-9-]{36}$/);
assert.equal(await ev("ms71-b", `fetch('/api/conversations/${child}/messages').then(r=>r.status)`), 403, "B cannot read private child history");
const base = "/api/conversations/7a03d40e-6da6-4322-8af3-418987567f2c/messages";
assert.equal(await ev("ms71-a", `fetch('${base}?before=invalid').then(r=>r.status)`), 400);
assert.equal(await ev("ms71-a", `fetch('${base}').then(r=>r.headers.get('cache-control'))`), "no-store, private");
const gapsBefore = await ev("ms71-a", "Array.from(document.querySelectorAll('.message-bubble > p')).filter(e=>e.textContent.startsWith('MS714 offline gap')).length");
assert.equal(gapsBefore, 0, "Run once against the clean gap fixture");
try {
  await run("ms71-a", "set", "offline", "on");
  const result = await exec("npx", ["dotenv", "-e", ".env.local", "--", "tsx", "scripts/seed-ms714-gap.ts"], { env: { ...process.env, MS714_APPEND_GAP: "1", NODE_OPTIONS: "--conditions=react-server" }, timeout: 45000 });
  assert(result.stdout.includes("PASS:"));
  assert.deepEqual(await ev("ms71-a", "Array.from(document.querySelectorAll('.message-row')).map(e=>e.id)"), original, "Offline window retained");
  await run("ms71-a", "set", "offline", "off");
  await until("ms71-a", "Array.from(document.querySelectorAll('.message-bubble > p')).filter(e=>e.textContent.startsWith('MS714 offline gap')).length===55", "all gap records reconciled");
  const rows = await ev("ms71-a", "Array.from(document.querySelectorAll('.message-row')).map(e=>e.id)");
  assert.equal(new Set(rows).size, rows.length); assert(rows.length <= 200); assert(rows.includes(original.at(-1)));
  assert(await ev("ms71-a", "(()=>{const e=document.querySelector('.message-scroll');return e.scrollHeight-e.clientHeight-e.scrollTop<3})()"));
  console.log("PASS: authenticated GET/private child denial/cache/invalid cursor; disconnect plus 55 seeded missed records reconciles without reload, duplicates, lost bridge or DOM growth beyond 200.");
} finally { await run("ms71-a", "set", "offline", "off").catch(() => undefined); }

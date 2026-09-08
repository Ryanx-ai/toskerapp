import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile), binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN.");
async function run(session, ...args) {
  const { stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 25000 });
  const result = JSON.parse(stdout);
  if (!result.success) throw new Error(`Browser command failed: ${args[0]}`);
  return result.data?.result ?? result.data;
}
const evaluate = (session, js) => run(session, "eval", js);
async function until(session, js, label) {
  const end = Date.now() + 25000;
  while (Date.now() < end) { if (await evaluate(session, js)) return; await new Promise((r) => setTimeout(r, 350)); }
  throw new Error(`Timed out: ${label}`);
}
const paths = ["/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa", "/room/ms7-1-qa-japan-trip-2027-6f6ae6"];
for (const path of paths) {
  await run("ms71-a", "open", `http://localhost:3000${path}`);
  await until("ms71-a", "document.querySelector('.conversation-surface')?.dataset.realtime==='connected'", "A connected");
  assert.equal(await evaluate("ms71-a", "document.querySelector('.composer textarea').value"), "", "Preserve unsent work");
  await run("ms71-b", "open", `http://localhost:3000${path}/hall`);
  await until("ms71-b", "!!document.querySelector('.hall-surface')", "B viewing Hall");
  const body = `MS711 attention ${Date.now().toString(36)}`;
  await run("ms71-a", "fill", ".composer textarea", body);
  await run("ms71-a", "click", ".send-button");
  const chatMark = `.surface-tabs a[href="${path}"] .attention-mark`;
  const hallMark = `.surface-tabs a[href="${path}/hall"] .attention-mark`;
  await until("ms71-b", `!!document.querySelector(${JSON.stringify(chatMark)})`, "inactive Chat attention");
  assert.equal(await evaluate("ms71-b", `!!document.querySelector(${JSON.stringify(hallMark)})`), false, "Chat does not create Hall unread");
  await run("ms71-b", "click", `.surface-tabs a[href="${path}"]`);
  await until("ms71-b", `Array.from(document.querySelectorAll('.message-bubble > p')).filter(p=>p.textContent===${JSON.stringify(body)}).length===1 && !document.querySelector(${JSON.stringify(chatMark)})`, "view clears only Chat attention");
  await until("ms71-a", "document.querySelector('.composer textarea').value===''", "send ack");
  assert.equal(await evaluate("ms71-a", `!!document.querySelector(${JSON.stringify(chatMark)})`), false, "No self unread");
  console.log(`PASS: ${path.startsWith("/personal") ? "Personal" : "Room"} inactive Chat attention while B views Hall; Hall stays clear; opening Chat clears attention and displays one message; no self unread.`);
}

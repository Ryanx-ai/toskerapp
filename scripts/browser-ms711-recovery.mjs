import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile);
const binary = process.env.AGENT_BROWSER_BIN;
if (!binary) throw new Error("Set AGENT_BROWSER_BIN to the installed browser CLI.");
const roomPath = "/room/ms7-1-qa-japan-trip-2027-6f6ae6";
const text = "MS711 scenario03 this should survive";
async function run(session, ...args) {
  const { stdout } = await exec(binary, ["--session", session, "--json", ...args], { timeout: 25000 });
  const result = JSON.parse(stdout);
  if (!result.success) throw new Error(`Browser command failed: ${args[0]}`);
  return result.data?.result ?? result.data;
}
const evaluate = (session, expression) => run(session, "eval", expression);
async function until(session, expression, label) {
  const deadline = Date.now() + 22000;
  while (Date.now() < deadline) {
    if (await evaluate(session, expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out: ${label}`);
}
const countExpression = `Array.from(document.querySelectorAll('.message-bubble > p')).filter(p=>p.textContent===${JSON.stringify(text)}).length`;
try {
  await run("ms71-b", "open", `http://localhost:3000${roomPath}`);
  await until("ms71-b", "!!document.querySelector('.composer textarea')", "authenticated Chat");
  assert.equal(await evaluate("ms71-b", "document.querySelector('.composer textarea').value"), text, "Chat/Hall navigation retains draft");
  assert.ok(await evaluate("ms71-b", "!!document.querySelector('.reply-context')"), "Reply retained on navigation");
  await run("ms71-b", "reload");
  await until("ms71-b", `document.querySelector('.composer textarea')?.value===${JSON.stringify(text)}`, "draft after reload");
  assert.ok(await evaluate("ms71-b", "!!document.querySelector('.reply-context')"), "Reply retained on reload");
  console.log("PASS: Chat/Hall navigation and reload retain draft + reply.");
  await run("ms71-b", "set", "offline", "on");
  await run("ms71-b", "click", ".send-button");
  await until("ms71-b", "document.body.innerText.includes('Delivery couldn')", "failed-send feedback");
  assert.equal(await evaluate("ms71-b", "document.querySelector('.composer textarea').value"), text);
  assert.equal(await evaluate("ms71-b", countExpression), 0, "Failed optimistic message removed");
  assert.ok(await evaluate("ms71-b", "!!document.querySelector('.reply-context')"));
  console.log("PASS: offline send retains text/reply and removes optimistic ghost.");
  await run("ms71-b", "set", "offline", "off");
  await run("ms71-b", "click", ".send-button");
  await until("ms71-b", "document.querySelector('.composer textarea')?.value===''", "send acknowledged");
  for (const session of ["ms71-a", "ms71-b"]) {
    await until(session, `${countExpression}===1`, "one received message");
    assert.ok(await evaluate(session, `Array.from(document.querySelectorAll('.message-row')).find(r=>r.querySelector('.message-bubble > p')?.textContent===${JSON.stringify(text)})?.querySelector('blockquote')?.textContent.includes('MS7.1 scenario 07')`));
    await run(session, "reload");
    await until(session, `${countExpression}===1`, "one canonical message after reload");
  }
  console.log("PASS: retry delivered once to A/B with correct quote; both reloads retain one message.");
} finally {
  await run("ms71-b", "set", "offline", "off").catch(() => undefined);
}

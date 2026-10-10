import assert from "node:assert/strict";
import { fetchMessageHistory } from "../src/lib/message-history";
import { CONVERSATION_ACCESS_LOST } from "../src/lib/realtime-contract";

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const events: Event[] = [];
Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: (event: Event) => { events.push(event); return true; } } });
async function main() { try {
  for (const status of [401, 503]) {
    globalThis.fetch = async () => Response.json({ error: "Unavailable" }, { status });
    await assert.rejects(() => fetchMessageHistory("00000000-0000-4000-8000-000000000001"));
    assert.equal(events.length, 0, "Authentication/availability failures cannot revoke context membership");
  }
  globalThis.fetch = async () => Response.json({ error: "Denied" }, { status: 403 });
  await assert.rejects(() => fetchMessageHistory("00000000-0000-4000-8000-000000000001"));
  assert.equal(events.length, 1); assert.equal(events[0].type, CONVERSATION_ACCESS_LOST);
  console.log("PASS expired-session/no-data vs authenticated context denial; no network or DB writes");
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
} }
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : error.name); process.exitCode = 1; });

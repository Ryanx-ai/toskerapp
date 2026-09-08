import assert from "node:assert/strict";
import { messageTextParts } from "../src/lib/message-links";

const cases: Array<[string, string[]]> = [
  ["", []],
  ["hello world", []],
  ["https://example.com", ["https://example.com/"]],
  ["HTTP://example.com/a?x=1&y=2#here", ["http://example.com/a?x=1&y=2#here"]],
  ["See (https://example.com/a). Next: https://example.org!", ["https://example.com/a", "https://example.org/"]],
  ["https://example.com/wiki/Thing_(one)", ["https://example.com/wiki/Thing_(one)"]],
  ["[https://example.com/a]", ["https://example.com/a"]],
  ["https://example.com/path\nline two 🐿️ https://example.org", ["https://example.com/path", "https://example.org/"]],
  ["javascript:alert(1) data:text/html,<script>alert(1)</script> ftp://example.com file:///etc/passwd", []],
  ["javascript:https://example.com nothttps://example.com", []],
  ["https:// https:/// https://[broken", []],
  ["https://user:password@example.com", []],
  ["https://example.com/<script>alert(1)</script>", ["https://example.com/"]],
  ["https://example.com/?x=%3Cscript%3E", ["https://example.com/?x=%3Cscript%3E"]],
  ["x".repeat(8000), []],
];

for (const [body, expected] of cases) {
  const parts = messageTextParts(body);
  assert.equal(parts.map((part) => part.text).join(""), body, "Never change the displayed message text");
  assert.deepEqual(parts.flatMap((part) => part.href ? [part.href] : []), expected);
  for (const part of parts) if (part.href) assert.ok(["https:", "http:"].includes(new URL(part.href).protocol));
}
console.log(`PASS: ${cases.length} safe-link cases; original text preserved, only http/https linked.`);

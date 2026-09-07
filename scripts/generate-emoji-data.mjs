// Mechanical Unicode data conversion; no artwork, dependencies, or runtime fetch.
import { writeFile } from "node:fs/promises";
const source = "https://unicode.org/Public/17.0.0/emoji/emoji-test.txt";
const response = await fetch(source);
if (!response.ok) throw new Error(`Unicode download failed: ${response.status}`);
const text = await response.text();
let group = "";
const entries = [];
for (const line of text.split("\n")) {
  if (line.startsWith("# group: ")) group = line.slice(9);
  const match = line.match(/^([0-9A-F ]+)\s*; fully-qualified\s*# \S+ E[0-9.]+ (.+)$/);
  if (match) entries.push([String.fromCodePoint(...match[1].trim().split(/\s+/).map((point) => parseInt(point, 16))), match[2], group]);
}
if (entries.length < 3000) throw new Error("Incomplete Unicode dataset");
const license = await fetch("https://www.unicode.org/license.txt");
if (!license.ok) throw new Error("Unicode license unavailable");
await writeFile(new URL("../src/data/emoji.json", import.meta.url), JSON.stringify(entries) + "\n");
await writeFile(new URL("../docs/UNICODE-LICENSE.txt", import.meta.url), await license.text());
console.log(`Generated ${entries.length} fully-qualified Unicode 17.0 emoji from ${source}`);

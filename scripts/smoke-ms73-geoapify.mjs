import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import dotenv from "dotenv";

// Explicit, manual Development smoke only. No application import or automatic run.
// Never print URLs, headers, environment values, error objects or raw responses.
if (process.argv[2] !== "--run-approved-development-smoke") {
  console.error("No requests made. Pass --run-approved-development-smoke for the approved ten-request evaluation.");
  process.exit(1);
}
const key = dotenv.parse(readFileSync(".env.development.local")).GEOAPIFY_SEARCH_KEY;
if (!key || key.trim() !== key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) {
  console.error("STOP: Development search credential missing or malformed (value suppressed).");
  process.exit(1);
}
const cases = [
  ...["Marina Bay Sands, Singapore", "Jewel Changi Airport, Singapore", "Singapore Zoo, Singapore", "Ngee Ann Polytechnic, Singapore", "Maxwell Food Centre, Singapore", "Bukit Timah Nature Reserve, Singapore", "1 Tanjong Pagar Plaza, Singapore 082001", "018953, Singapore"].map(query => ({ kind: "search", query })),
  { kind: "reverse", latitude: 1.2845, longitude: 103.8580, query: "Manually selected public point near Bayfront waterfront; not a claimed entrance" },
  { kind: "reverse", latitude: 1.3440, longitude: 103.8140, query: "Manually selected public point near MacRitchie; no assumed place identity" },
];
const report = { provider: "geoapify", purpose: "MS7.3 Development evaluation, not a benchmark", startedAt: new Date().toISOString(), maxRequests: 10, maxEstimatedCredits: 10, retryCount: 0, requestsMade: 0, completed: false, results: [] };
const pick = (object, names) => Object.fromEntries(names.filter(name => object?.[name] !== undefined).map(name => [name, object[name]]));
let stopped = false;
for (const test of cases) {
  const url = new URL(`https://api.geoapify.com/v1/geocode/${test.kind === "search" ? "search" : "reverse"}`);
  url.search = new URLSearchParams({ apiKey: key, format: "json", lang: "en", limit: test.kind === "search" ? "3" : "1", ...(test.kind === "search" ? { text: test.query, filter: "countrycode:sg", bias: "proximity:103.8198,1.3521" } : { lat: String(test.latitude), lon: String(test.longitude) }) }).toString();
  const entry = { ...test, status: null, filter: test.kind === "search" ? "countrycode:sg" : null, results: [] };
  report.requestsMade += 1;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "error", cache: "no-store" });
    entry.status = response.status;
    if (!response.ok) {
      entry.error = "Provider HTTP failure; body and URL intentionally suppressed. Stop without retry.";
      stopped = true;
    } else {
      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error("shape");
      entry.results = data.results.slice(0, test.kind === "search" ? 3 : 1).map(value => ({
        ...pick(value, ["name", "formatted", "address_line1", "address_line2", "housenumber", "street", "city", "suburb", "postcode", "country_code", "lat", "lon", "result_type", "category", "distance", "place_id"]),
        datasource: pick(value.datasource, ["sourcename", "attribution", "license", "url"]),
        rank: pick(value.rank, ["confidence", "match_type"]),
      }));
      if (JSON.stringify(entry).includes(key)) throw new Error("redaction");
      if (entry.results.some(value => !Number.isFinite(value.lat) || !Number.isFinite(value.lon) || Math.abs(value.lat) > 90 || Math.abs(value.lon) > 180 || value.country_code !== "sg")) {
        entry.error = "Unexpected coordinate or non-Singapore result; stop for review.";
        stopped = true;
      }
    }
  } catch {
    entry.results = [];
    entry.error = "Transport, timeout, or response validation failed; details suppressed. Stop without retry.";
    stopped = true;
  }
  report.results.push(entry);
  console.log(JSON.stringify({ kind: test.kind, query: test.query, status: entry.status, resultCount: entry.results.length, top: entry.results[0] ? pick(entry.results[0], ["formatted", "lat", "lon", "result_type"]) : null, error: entry.error }));
  if (stopped) break;
  await delay(1100);
}
report.completed = !stopped && report.requestsMade === cases.length;
report.finishedAt = new Date().toISOString();
const destination = join(mkdtempSync(join(tmpdir(), "tosker-geoapify-smoke-")), "results.json");
const serialized = JSON.stringify(report, null, 2);
if (serialized.includes(key)) {
  console.error("STOP: redaction validation failed; artifact not written.");
  process.exit(1);
}
writeFileSync(destination, serialized, { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({ completed: report.completed, requestsMade: report.requestsMade, estimatedCreditsUpperBound: report.requestsMade, artifact: destination, accountUsageVerified: false, qualityAcceptance: "requires review" }));
process.exitCode = report.completed ? 0 : 1;

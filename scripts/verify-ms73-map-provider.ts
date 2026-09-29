import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getBrowserMapProvider, SINGAPORE_CENTER } from "../src/lib/maps/browser-provider";

assert.equal(getBrowserMapProvider(""), null);
assert.equal(getBrowserMapProvider("bad key"), null);
assert.equal(getBrowserMapProvider("../unsafe"), null);
const provider = getBrowserMapProvider("development_test_key_only");
assert(provider);
assert.equal(provider.id, "geoapify");
assert.equal(new URL(provider.styleUrl).hostname, "maps.geoapify.com");
assert(provider.attribution.includes("Geoapify") && provider.attribution.includes("OpenMapTiles") && provider.attribution.includes("OpenStreetMap"));
assert.deepEqual(SINGAPORE_CENTER, [103.8198, 1.3521]);
const browser = readFileSync("src/components/trip-map-canvas.tsx", "utf8");
assert.match(browser, /await import\("maplibre-gl"\)/);
assert.match(browser, /current\?\.remove\(\)/);
assert.match(browser, /observer\?\.disconnect\(\)/);
assert.match(browser, /refreshExpiredTiles: false/);
assert.match(browser, /attempt < 2/);
assert.doesNotMatch(browser, /GeolocateControl|geolocation|console\.(error|log)/);
assert.doesNotMatch(readFileSync("src/lib/maps/browser-provider.ts", "utf8"), /GEOAPIFY_SEARCH_KEY/);
const { version } = JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf8"));
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  assert.deepEqual(readFileSync(`public/maplibre/${version}/${file}`), readFileSync(`node_modules/maplibre-gl/dist/${file}`));
}
console.log("PASS public provider boundary, configuration validation, required attribution, exact worker assets and lifecycle/source guards (not browser proof)");

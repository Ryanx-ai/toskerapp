/** Synthetic hook/Activity integration, no browser, GPS, database or provider I/O.
 * QA-only runtime: npm install --prefix .git/fp2-qa-runtime --ignore-scripts --no-audit --no-fund react@19.2.8 react-test-renderer@19.2.8
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mock } from 'node:test';
import { build } from 'esbuild';

const runtime = resolve('.git/fp2-qa-runtime');
const requireQA = createRequire(`${runtime}/package.json`);
const React = requireQA('react');
const { create, act } = requireQA('react-test-renderer');
await build({ stdin: { contents: 'export {useLocalMapLocation} from "./src/components/use-local-map-location"; export {useTripRoadPreview} from "./src/components/use-trip-road-preview"; export {usePrivateOriginRoute} from "./src/components/use-private-origin-route"; export {roadKey} from "./src/lib/maps/road-contract";', resolveDir: process.cwd(), loader: 'ts' }, outfile: `${runtime}/hooks.cjs`, bundle: true, platform: 'node', format: 'cjs', external: ['react'], logLevel: 'silent' });
const { useLocalMapLocation, useTripRoadPreview, usePrivateOriginRoute, roadKey } = requireQA('./hooks.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const documentMock = new EventTarget();
const permission = new EventTarget();
permission.state = 'granted';
const readings = [], calls = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  permissions: { query: async () => permission },
  geolocation: { getCurrentPosition: (ok, fail, options) => readings.push({ ok, fail, options }) },
} });
globalThis.document = documentMock;
mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100000 });
const first = { latitude: 1.28, longitude: 103.85, accuracy: 10 };
const second = { latitude: 1.29, longitude: 103.86, accuracy: 20 };
let local, shared, privateLeg;
let points = [{ id: 'one', latitude: 1.28, longitude: 103.85 }, { id: 'two', latitude: 1.29, longitude: 103.86 }];
let route = 'qa-route', consent = false, failProvider = false, delayed;
globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  calls.push({ url, body, signal: options.signal });
  if (delayed) return new Promise(resolveResponse => { delayed.resolve = resolveResponse; });
  return { ok: !failProvider, status: failProvider ? 503 : 200, json: async () => failProvider ? { error: 'Synthetic provider unavailable' } : { geometry: { key: roadKey(points, 'walk'), mode: 'walk', coordinates: [], distanceMeters: 100, durationSeconds: 60 } } };
};
function LocalProbe() { local = useLocalMapLocation(); return null; }
function RoadProbe() {
  shared = useTripRoadPreview('qa-scope', route, points, 'walk', true, () => {});
  privateLeg = usePrivateOriginRoute('qa-scope', route, points, 'walk', consent, false, 0, () => {});
  return null;
}
let tree;
const render = async (component, mode = 'visible') => act(async () => {
  const node = React.createElement(React.Activity, { mode }, React.createElement(component));
  if (tree) tree.update(node); else tree = create(node);
});
const tick = async ms => act(async () => { mock.timers.tick(ms); });
const fix = async coords => act(async () => { readings.at(-1).ok({ coords }); });
const locate = async () => act(async () => { local.locate(); });
const results = [];
try {
  await render(LocalProbe);
  await locate(); await fix(first);
  const expiry = local.expiresAt;
  assert.deepEqual(local.origin, first);
  await tick(1000); await locate(); await fix(second);
  assert.deepEqual(local.origin, first); assert.deepEqual(local.location, second); assert.equal(local.expiresAt, expiry);
  assert.equal(readings.at(-1).options.maximumAge, 0);
  results.push('fixed origin / manual marker refresh / original expiry');
  await locate(); const stale = readings.at(-1);
  await act(async () => local.clear());
  await act(async () => stale.ok({ coords: second }));
  assert.equal(local.location, null); assert.equal(local.busy, false);
  results.push('Locate Off rejects stale GPS callback');
  await locate(); const suspended = readings.at(-1);
  await render(LocalProbe, 'hidden');
  await act(async () => suspended.ok({ coords: first }));
  await render(LocalProbe); assert.equal(local.location, null); assert.equal(local.busy, false);
  results.push('Activity cancellation / busy recovery');
  for (const code of [1, 2, 3]) {
    await locate(); await act(async () => readings.at(-1).fail({ code }));
    assert.equal(local.busy, false); assert.match(local.status, /denied|unavailable|timed out/);
  }
  results.push('denied / unavailable / timeout remain recoverable');
  await locate(); await fix(first); await render(LocalProbe, 'hidden');
  await tick(300001); await render(LocalProbe); await tick(0);
  assert.equal(local.location, null); assert.match(local.status, /expired/);
  await locate(); await fix(second);
  await act(async () => { permission.state = 'denied'; permission.dispatchEvent(new Event('change')); });
  assert.equal(local.origin, null);
  results.push('hidden absolute expiry / permission revocation');
  await act(async () => tree.unmount()); tree = null;
  await render(RoadProbe); await tick(650);
  assert.equal(calls.length, 1); assert.equal(calls[0].body.origin, undefined); assert.ok(shared.current);
  await render(RoadProbe, 'hidden'); await render(RoadProbe); await tick(30000);
  assert.equal(calls.length, 1);
  results.push('shared settled road restored without request / no private call without consent');
  consent = true; await render(RoadProbe); await tick(650);
  assert.equal(calls.length, 2); assert.deepEqual(calls[1].body.origin, { latitude: first.latitude, longitude: first.longitude, consent: 'geoapify-current-origin-v1' });
  assert.ok(privateLeg.road);
  await render(RoadProbe, 'hidden'); await render(RoadProbe); await tick(30000); assert.equal(calls.length, 2);
  results.push('explicit consent / private settled road restored without request');
  // The component derives consent from context/origin/first-stop identity. A
  // changed stop revokes that input; shared roads may recalculate, private may not.
  consent = false; points = [points[0], { ...points[1], longitude: 103.87 }];
  await render(RoadProbe); await tick(650);
  assert.equal(calls.length, 3); assert.equal(calls[2].body.origin, undefined); assert.equal(privateLeg.road, undefined);
  failProvider = true; await act(async () => shared.retry()); await tick(62000);
  assert.match(shared.error, /Synthetic/);
  const failureCount = calls.length;
  await render(RoadProbe, 'hidden'); await render(RoadProbe); await tick(62000);
  assert.equal(calls.length, failureCount);
  results.push('changed first stop clears private input / settled failure does not retry on restore');
  failProvider = false; delayed = {}; await act(async () => shared.retry()); await tick(62000);
  const obsolete = calls.at(-1); assert.ok(delayed.resolve);
  route = 'new-qa-route'; await render(RoadProbe);
  assert.equal(obsolete.signal.aborted, true);
  await act(async () => delayed.resolve({ ok: true, status: 200, json: async () => ({ geometry: { key: roadKey(points, 'walk'), mode: 'walk' } }) }));
  assert.equal(shared.current, undefined);
  results.push('superseded provider response aborted and not restored');
  console.log(JSON.stringify({ gate: 'FP2A actual React hook / Activity lifecycle', result: 'pass', cases: results, mockedRequests: calls.length, providerRequests: 0, realCoordinates: false }));
} finally {
  if (tree) await act(async () => tree.unmount());
  mock.timers.reset();
}

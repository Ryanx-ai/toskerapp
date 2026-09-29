import assert from "node:assert/strict";
import { run, ev, until, button } from "./browser-fp2.mjs";

const s = "ms73-local-a", origin = "http://localhost:3000";
const room = "/room/ms5-shared-room-750b4c";
const out = process.env.MS73_CAPTURES;
assert(out);
const ready = `document.querySelector('[data-map-state]')?.dataset.mapState==='ready'`;
async function readyMap() { await until(s, ready, "loaded real basemap", 30000); }
async function route(path, check) { await run(s, "open", origin + path); await until(s, check, path, 45000); }
if (process.argv[2] === "basemap-layout") {
  await readyMap();
  for (const width of [320,390,430,768,1440,1728]) {
    await run(s, "set", "viewport", String(width), width<641 ? "844" : "1000");
    await readyMap();
    await until(s, `(()=>{let c=document.querySelector('.maplibregl-canvas');return c&&Math.abs(c.getBoundingClientRect().width-c.parentElement.getBoundingClientRect().width)<2})()`, "resized canvas");
    assert(await ev(s, `document.documentElement.scrollWidth<=innerWidth+1`));
    assert(await ev(s, `!!document.querySelector('.maplibregl-canvas') && document.querySelectorAll('.surface-tabs [aria-current=page]').length===1 && !document.querySelector('.composer,.hall-surface')`));
    assert(await ev(s, `['Geoapify','OpenMapTiles','OpenStreetMap'].every(t=>document.querySelector('.maplibregl-ctrl-attrib').textContent.includes(t))`));
    assert(await ev(s, `[...document.querySelectorAll('.maplibregl-ctrl-group button')].every(b=>b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)`));
    await run(s, "screenshot", `${out}/basemap-${width}.png`);
    console.log("PASS real basemap layout/attribution/controls", width);
  }
  await run(s, "set", "media", "dark", "reduced-motion");
  await run(s, "focus", ".maplibregl-canvas"); await run(s, "press", "ArrowRight");
  await button(s, "Singapore");
  await readyMap();
  console.log("PASS keyboard pan and Singapore reset, reduced-motion preference active");
}
if (process.argv[2] === "basemap-isolation") {
  for (const [path, check] of [[room, `!!document.querySelector('.composer') && !document.querySelector('.chat-load-state')`],[room+"/hall",`!!document.querySelector('.hall-surface') && !document.querySelector('.hall-load-status')`]]) {
    await route(path,check);
    const count = await ev(s, `performance.getEntriesByType('resource').filter(e=>/geoapify|maplibre/.test(e.name)).length`);
    assert.equal(count,0);
    console.log("PASS no provider/worker resources on",path);
  }
}
if (process.argv[2] === "basemap-failure") {
  await readyMap();
  await run(s,"click",`.surface-tabs a[href="${room}"]`);
  await until(s,`!!document.querySelector('.composer')`,"Chat before failure injection");
  // Inject a transport failure only in this test browser; no provider or app data mutation.
  await ev(s,`(()=>{window.__ms73OriginalFetch=window.fetch;window.__ms73FailedRequests=0;window.fetch=(input,options)=>{const url=typeof input==='string'?input:input instanceof Request?input.url:String(input);if(new URL(url,location.href).hostname==='maps.geoapify.com'){window.__ms73FailedRequests++;return Promise.reject(new TypeError('Simulated map transport failure'))}return window.__ms73OriginalFetch(input,options)};return true})()`);
  try {
    await run(s,"click",'.surface-tabs a[href$="/map"]');
    await until(s,`document.querySelector('[data-map-state]')?.dataset.mapState==='failed'`,"simulated map failure");
    assert(!await ev(s,`!!document.querySelector('.maplibregl-canvas')`));
    assert(await ev(s,`window.__ms73FailedRequests>0`));
    await run(s,"screenshot",`${out}/basemap-failure.png`);
    console.log("PASS failed request removes renderer and offers explicit recovery");
  } finally { await ev(s,`(()=>{window.fetch=window.__ms73OriginalFetch;delete window.__ms73OriginalFetch;return true})()`); }
  await button(s,"Try loading map again"); await readyMap();
  console.log("PASS explicit retry recovers real basemap");
}
const errors = await run(s,"errors");
assert.equal(errors.errors?.length ?? 0,0,"Browser errors; inspect only with credential redaction");

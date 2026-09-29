import assert from 'node:assert/strict';
import { run, ev, until, button } from './browser-fp2.mjs';

// Read-only product walkthrough. Long-list stress uses removable DOM-only copies, not database fixtures.
const origin = process.env.MS73_ORIGIN ?? 'http://localhost:3000';
const out = process.env.MS73_CAPTURES;
assert(out, 'MS73_CAPTURES required');
const a = 'ms73-local-a', b = 'ms73-local-b';
const room = '/room/ms5-shared-room-750b4c';
const personal = '/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa';
async function open(s, path, ready) {
  await run(s, 'open', origin + path);
  await until(s, ready, path, 45000);
}
async function fit(s) {
  assert(await ev(s, 'document.documentElement.scrollWidth<=innerWidth+1'), 'no page overflow');
}
if (process.argv[2] === 'map') {
  await open(a, room + '/map', `!!document.querySelector('[aria-label="Room Map"]')`);
  for (const width of [320, 390, 430, 768, 1440, 1728]) {
    await run(a, 'set', 'viewport', String(width), width < 641 ? '844' : '1000');
    await fit(a);
    assert.equal(await ev(a, 'document.querySelectorAll(".surface-tabs [aria-current=page]").length'), 1);
    assert.equal(await ev(a, 'document.querySelector(".surface-tabs [aria-current=page]").textContent'), 'Map');
    assert(await ev(a, `!document.querySelector('.composer,.hall-surface') && document.querySelector('input[aria-label="Search places"]').disabled`));
    const bounds = await ev(a, `(()=>{let m=document.querySelector('[aria-label="Room Map"]');let c=document.querySelector('#location-cards-heading');return {width:innerWidth,map:m.getBoundingClientRect().toJSON(),cards:c.getBoundingClientRect().toJSON(),overflow:m.scrollWidth>m.clientWidth+1}})()`);
    assert(!bounds.overflow, 'Map has no horizontal overflow');
    await run(a, 'screenshot', `${out}/map-${width}.png`);
    console.log('PASS Map layout', JSON.stringify(bounds));
  }
  const providers = await ev(a, `performance.getEntriesByType('resource').filter(e=>/geoapify|mapbox|maplibre|tile.openstreetmap/.test(e.name)).map(e=>new URL(e.name).hostname)`);
  assert.deepEqual(providers, [], 'no unapproved provider request');
  console.log('BROWSER_ERRORS', JSON.stringify(await run(a, 'errors')));
}
if (process.argv[2] === 'surfaces') {
  await run(a, 'set', 'viewport', '1440', '1000');
  for (const [path, current, hasMap, ready] of [
    [room, 'Chat', true, `!!document.querySelector('.composer') && !document.querySelector('.chat-load-state')`],
    [room + '/hall', 'Board', true, `!!document.querySelector('.hall-surface') && !document.querySelector('.hall-load-status')`],
    [personal, 'Chat', false, `!!document.querySelector('.composer') && !document.querySelector('.chat-load-state')`],
    [personal + '/hall', 'Board', false, `!!document.querySelector('.hall-surface') && !document.querySelector('.hall-load-status')`],
    [room + '/subroom/6c6da449-1959-4c58-b7af-274c837ae1dd', 'Chat', false, `!!document.querySelector('.composer') && !document.querySelector('.chat-load-state')`],
    ['/personal/my-room', 'Chat', false, `!!document.querySelector('.composer') && !document.querySelector('.chat-load-state')`],
  ]) {
    await open(a, path, ready); await fit(a);
    assert.equal(await ev(a, `document.querySelector('.surface-tabs [aria-current=page]')?.textContent`), current);
    assert.equal(await ev(a, `!!document.querySelector('.surface-tabs a[href$="/map"]')`), hasMap);
    assert(!await ev(a, `/\bHall\b/.test(document.querySelector('.surface-tabs').textContent)`));
    console.log('PASS primary surface', path, current);
  }
  await open(b, room + '/map', `!!document.querySelector('[aria-label="Room Map"]')`);
  console.log('PASS retained B Room membership Map access');
  for (const path of ['/room/ms73-nonexistent/map', personal + '/map', room + '/subroom/6c6da449-1959-4c58-b7af-274c837ae1dd/map']) {
    await open(b, path, `document.body.innerText.includes('404')`);
    assert(!await ev(b, `!!document.querySelector('[aria-label="Room Map"]')`));
    console.log('PASS invalid Map route denied', path);
  }
}
if (process.argv[2] === 'nameplate') {
  for (const [width, collapsed] of [[320,false],[390,false],[430,false],[768,false],[768,true],[1440,false],[1440,true],[1728,false]]) {
    await run(a, 'set', 'viewport', String(width), '844');
    await open(a, '/app?view=list', `!!document.querySelector('.messenger-sidebar')`);
    const isCollapsed = await ev(a, `document.querySelector('.messaging-app').classList.contains('sidebar-collapsed')`);
    if (width > 640 && collapsed !== isCollapsed) await button(a, isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    if (width <= 640 && isCollapsed) { // Stored desktop preference is harmless on mobile; reset for the next desktop case.
      await run(a,'set','viewport','768','844'); await button(a,'Expand sidebar'); await run(a,'set','viewport',String(width),'844');
    }
    await fit(a);
    await ev(a, `(()=>{let list=document.querySelector('.conversation-list'),row=list.firstElementChild;for(let i=0;i<25;i++){let copy=row.cloneNode(true);copy.dataset.ms73Stress='true';copy.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));list.append(copy)}list.lastElementChild.querySelector('a').focus();return true})()`);
    await until(a, `(()=>{let target=document.activeElement.getBoundingClientRect(), plate=document.querySelector('.sidebar-bottom').getBoundingClientRect();return target.bottom<=plate.top-7 && target.top>=document.querySelector('.conversation-list').getBoundingClientRect().top})()`, 'focused last row clears floating plate');
    assert(await ev(a, `(()=>{let p=document.querySelector('.sidebar-bottom').getBoundingClientRect();return p.left>=0&&p.right<=innerWidth&&p.bottom<=innerHeight&&p.height>0})()`));
    await run(a, 'screenshot', `${out}/nameplate-${width}-${collapsed?'collapsed':'expanded'}.png`);
    console.log('PASS synthetic long-list focus clearance', width, collapsed);
    await ev(a, `document.querySelectorAll('[data-ms73-stress]').forEach(e=>e.remove())`);
  }
  await open(a, '/app?view=list', `!!document.querySelector('.messenger-sidebar')`);
}
if (process.argv[2] === 'navigation') {
  await run(a, 'set', 'viewport', '1440', '900');
  await run(a, 'set', 'media', 'dark', 'reduced-motion');
  await open(a, room, `!!document.querySelector('.composer textarea') && !document.querySelector('.chat-load-state')`);
  const originalDraft = await ev(a, `document.querySelector('.composer textarea').value`);
  const draft = 'MS7.3 unsent navigation check';
  try {
    await run(a, 'fill', '.composer textarea', draft);
    await run(a, 'click', '.surface-tabs a[href$="/map"]');
    await until(a, `!!document.querySelector('[aria-label="Room Map"]')`, 'Map via tab');
    await button(a, 'Conversation options');
    assert(!await ev(a, `document.querySelector('.interaction-popover')?.innerText.includes('unread')`), 'Map cannot mark Chat unread');
    await run(a, 'press', 'Escape');
    await run(a, 'click', '.surface-tabs a[href$="/hall"]');
    await until(a, `!!document.querySelector('.hall-surface') && !document.querySelector('.hall-load-status')`, 'Board via tab');
    await run(a, 'click', `.surface-tabs a[href="${room}"]`);
    await until(a, `!!document.querySelector('.composer textarea')`, 'Chat via tab');
    assert.equal(await ev(a, `document.querySelector('.composer textarea').value`), draft, 'draft survives primary surface navigation');
    assert(await ev(a, `matchMedia('(prefers-reduced-motion: reduce)').matches`));
    assert.equal(await ev(a, `getComputedStyle(document.querySelector('.profile-nameplate')).transitionDuration`), '0s');
    console.log('PASS client tab navigation, unsent draft retention, Map unread exclusion, reduced motion');
  } finally {
    if (!await ev(a, `!!document.querySelector('.composer textarea')`)) await open(a, room, `!!document.querySelector('.composer textarea')`);
    await run(a, 'fill', '.composer textarea', originalDraft);
    await run(a, 'set', 'media', 'dark');
  }
}

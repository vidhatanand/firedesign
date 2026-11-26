// node --test scripts/test/sheet-modeless.test.mjs : a sheet with data-modeless is an inspector beside a live page, in
// Chromium, Firefox and WebKit (an engine that is not installed is skipped).
//   It opens with show(): no scrim, no scroll lock, no focus trap, and the page behind it stays clickable. Focus moves
//   quietly to the title, Tab leaves, Escape closes it from inside, and focus goes back to the trigger. Opening it again
//   while it is open keeps focus and plays nothing. Below 640px it is a bottom sheet that stops short of the top and is
//   drawn down to close. A modal sheet next to it is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/fire/fire.css"></head>
<body>
<div class="fd-stack" style="min-height: 200vh">
  <button class="fd-btn" id="first" type="button" data-fd-dialog-open="side" data-n="1">First</button>
  <button class="fd-btn" id="second" type="button" data-fd-dialog-open="side" data-n="2">Second</button>
  <button class="fd-btn" id="left" type="button" data-fd-dialog-open="side-left">Left</button>
  <button class="fd-btn" id="modal" type="button" data-fd-dialog-open="side-modal">Modal</button>
  <button class="fd-btn" id="outside" type="button">Outside</button>
</div>
<dialog class="fd-sheet" id="side" data-modeless data-side="right" data-size="md">
  <div class="fd-sheet-head"><div class="fd-sheet-bar"><h2 class="fd-sheet-title">Run</h2>
    <button class="fd-btn fd-sheet-close" type="button" data-variant="ghost" data-size="sm" data-icon-only data-fd-dialog-close aria-label="Close">x</button></div></div>
  <div class="fd-sheet-body"><input class="fd-input" id="field" aria-label="Note"><button class="fd-btn" id="menu-trigger" type="button" data-fd-menu="side-menu">Actions</button>
    <div class="fd-menu" id="side-menu" popover="manual" role="menu"><button class="fd-menu-item" type="button" role="menuitem">Copy</button></div>
    <p style="height: 120vh">Detail</p></div>
  <div class="fd-sheet-foot"><button class="fd-btn" id="foot" type="button" data-variant="primary">Run again</button></div>
</dialog>
<dialog class="fd-sheet" id="side-left" data-modeless data-side="left">
  <div class="fd-sheet-head"><div class="fd-sheet-bar"><h2 class="fd-sheet-title">Filters</h2></div></div>
  <div class="fd-sheet-body"><p>Status</p></div>
</dialog>
<dialog class="fd-sheet" id="side-modal" data-side="right">
  <div class="fd-sheet-head"><div class="fd-sheet-bar"><h2 class="fd-sheet-title">Review</h2></div></div>
  <div class="fd-sheet-body"><p>Decide</p></div>
</dialog>
<script type="module">
  import '/fire/fire.js';
  window.log = [];
  for (const id of ['side', 'side-left', 'side-modal']) for (const type of ['fd:open', 'fd:close']) document.getElementById(id).addEventListener(type, () => log.push(id + ':' + type));
  window.clicks = 0;
  document.getElementById('outside').addEventListener('click', () => clicks++);
  window.ready = true;
</script></body></html>`;

const pw = await import('playwright-core');
const ENGINES = ['chromium', 'firefox', 'webkit'].filter((name) => fs.existsSync(pw[name].executablePath()));

async function withPage(engine, viewport, fn) {
  const browser = await pw[engine].launch();
  try {
    const page = await (await browser.newContext({ viewport })).newPage();
    await page.route('http://fire.localhost/**', (route) => {
      const rel = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
      if (rel === 'index.html') return route.fulfill({ contentType: 'text/html', body: PAGE });
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto('http://fire.localhost/index.html');
    await page.waitForFunction(() => window.ready === true);
    await page.evaluate(() => document.fonts.ready);
    await fn(page);
  } finally { await browser.close(); }
}
const settle = (page) => page.waitForTimeout(700);
const active = (page) => page.evaluate(() => (document.activeElement?.matches('.fd-sheet-title') ? 'title' : document.activeElement?.id || document.activeElement?.tagName));
const state = (page, id) => page.evaluate((i) => {
  const d = document.getElementById(i);
  const r = d.getBoundingClientRect();
  return { open: d.open, modal: d.matches(':modal'), lock: document.documentElement.hasAttribute('data-fd-modal-lock'), inert: document.body.hasAttribute('inert') || !!document.querySelector('[inert]'),
    position: getComputedStyle(d).position, z: getComputedStyle(d).zIndex, left: r.left, right: innerWidth - r.right, top: r.top, bottom: innerHeight - r.bottom, width: r.width, height: r.height, vh: innerHeight };
}, id);

for (const engine of ENGINES) {
  test(`${engine}: a modeless sheet opens without a scrim, a lock or a trap`, async () => {
    await withPage(engine, { width: 1440, height: 900 }, async (page) => {
      await page.click('#first');
      await settle(page);
      const s = await state(page, 'side');
      assert.equal(s.open, true);
      assert.equal(s.modal, false, 'opened with show(), not showModal()');
      assert.equal(s.lock, false, 'the page does not get the scroll lock');
      assert.equal(s.inert, false, 'nothing is made inert');
      assert.equal(s.position, 'fixed');
      assert.equal(s.z, '50', 'the overlay layer');
      assert.ok(s.right > 0 && s.right < 20 && s.width < 440, 'right side, 8px from the edge');
      assert.equal(await active(page), 'title', 'focus is on the title');
      assert.deepEqual(await page.evaluate(() => log), ['side:fd:open']);
      // The page stays scrollable and clickable.
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(200);
      assert.ok(await page.evaluate(() => scrollY) > 0, 'the page scrolls');
      await page.click('#outside');
      assert.equal(await page.evaluate(() => clicks), 1, 'a click on the page reaches the page');
      assert.equal((await state(page, 'side')).open, true, 'an outside click does not close it');
    });
  });

  test(`${engine}: Tab leaves, Escape closes from inside and focus returns to the trigger`, async () => {
    await withPage(engine, { width: 1440, height: 900 }, async (page) => {
      await page.focus('#first');
      await page.keyboard.press('Enter');
      await settle(page);
      assert.equal(await active(page), 'title');
      let left = false;
      for (let i = 0; i < 12 && !left; i++) {
        await page.keyboard.press('Tab');
        left = await page.evaluate(() => !document.getElementById('side').contains(document.activeElement));
      }
      assert.ok(left, 'Tab moves out of the sheet');
      await page.keyboard.press('Escape');
      assert.equal((await state(page, 'side')).open, true, 'Escape outside the sheet leaves it open');
      await page.focus('#field');
      await page.keyboard.press('Escape');
      await settle(page);
      assert.equal((await state(page, 'side')).open, false, 'Escape inside closes it');
      assert.equal(await active(page), 'first', 'focus returns to the trigger');
      assert.deepEqual(await page.evaluate(() => log), ['side:fd:open', 'side:fd:close']);
    });
  });

  test(`${engine}: Escape closes an open menu first, then the sheet`, async () => {
    await withPage(engine, { width: 1440, height: 900 }, async (page) => {
      await page.click('#first');
      await settle(page);
      await page.click('#menu-trigger');
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.getElementById('side-menu').matches(':popover-open')), true);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.getElementById('side-menu').matches(':popover-open')), false, 'the menu closed');
      assert.equal((await state(page, 'side')).open, true, 'the sheet is still open');
      await page.focus('#field');
      await page.keyboard.press('Escape');
      await settle(page);
      assert.equal((await state(page, 'side')).open, false);
    });
  });

  test(`${engine}: opening it again keeps focus and plays nothing, and the new trigger gets focus back`, async () => {
    await withPage(engine, { width: 1440, height: 900 }, async (page) => {
      await page.click('#first');
      await settle(page);
      await page.focus('#second');
      await page.evaluate(() => document.getElementById('second').click());
      await page.waitForTimeout(50);
      assert.equal(await active(page), 'second', 'focus stays where the person is working');
      assert.equal(await page.evaluate(() => document.getElementById('side').getAnimations().length), 0, 'no slide-in again');
      assert.deepEqual(await page.evaluate(() => log), ['side:fd:open'], 'no second fd:open');
      await page.focus('#field');
      await page.keyboard.press('Escape');
      await settle(page);
      assert.equal(await active(page), 'second', 'focus returns to the trigger that last asked');
    });
  });

  test(`${engine}: closing does not take focus from the page`, async () => {
    await withPage(engine, { width: 1440, height: 900 }, async (page) => {
      await page.click('#first');
      await settle(page);
      await page.focus('#outside');
      await page.evaluate(async () => (await import('/fire/js/overlays.js')).closeDialog('side'));
      await settle(page);
      assert.equal(await active(page), 'outside');
    });
  });

  test(`${engine}: the left side, and a modal sheet is unchanged`, async () => {
    await withPage(engine, { width: 1440, height: 900 }, async (page) => {
      await page.click('#left');
      await settle(page);
      const l = await state(page, 'side-left');
      assert.ok(l.open && !l.modal && l.left > 0 && l.left < 20, 'left side, 8px from the edge');
      await page.click('#outside');
      assert.equal(await page.evaluate(() => clicks), 1, 'the page behind the left sheet is live');
      await page.evaluate(async () => (await import('/fire/js/overlays.js')).closeDialog('side-left'));
      await settle(page);
      await page.click('#modal');
      await settle(page);
      const m = await state(page, 'side-modal');
      assert.ok(m.open && m.modal && m.lock, 'the modal sheet still blocks the page');
    });
  });

  test(`${engine}: on a phone it is a bottom sheet that stops short and is drawn down to close`, async () => {
    await withPage(engine, { width: 375, height: 667 }, async (page) => {
      await page.click('#first');
      await settle(page);
      const s = await state(page, 'side');
      assert.ok(s.open && !s.modal && !s.lock);
      assert.equal(Math.round(s.bottom), 0, 'flush with the bottom');
      assert.ok(s.top > s.vh * 0.35, `the page above stays usable (top ${s.top} of ${s.vh})`);
      assert.ok(s.height < s.vh * 0.6);
      const box = await page.evaluate(() => { const r = document.querySelector('#side .fd-sheet-head').getBoundingClientRect(); return { x: r.left + 40, y: r.top + 20 }; });
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(box.x, box.y + i * 30);
      await page.mouse.up();
      await settle(page);
      assert.equal((await state(page, 'side')).open, false, 'a pull down closes it');
    });
  });
}

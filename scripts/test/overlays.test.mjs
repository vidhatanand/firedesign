// node --test scripts/test/overlays.test.mjs
// Fire 0.13, the modeless sheet (`fd-sheet[data-modeless]`): a drawer that leaves the page usable. Runs in Chromium,
// WebKit and Firefox where playwright-core has them, against the specimen on docs/overlays.html#modeless and the
// overview template.
//  1. It opens with show(): not :modal, no ::backdrop, no modal lock; the page behind takes clicks, the wheel and keys.
//  2. Opening it again from another row swaps: no second slide, fd:open again with { trigger, swap, wait }, aria-busy
//     while wait() holds, aria-expanded moves to the new row, and focus goes back to that row.
//  3. Focus: the title takes it quietly; Tab on the trigger goes in, Tab past the end goes on after the trigger,
//     Shift+Tab from the start returns to the trigger. Escape closes it only with focus inside.
//  4. fd:open / fd:close; one sheet per side; a modal dialog opened from inside gives focus back into the sheet.
//  5. At 375 it is a bottom sheet at half the screen that drags closed, and the page above it scrolls.
//  6. Inside the app shell it sits over the sidebar and the top bar and under a modal dialog.
//  7. The modal sheet is unchanged: :modal, the lock, the scrim, focus kept inside, Escape and a backdrop click close it.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, firefox } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

function serve(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(file, (error, body) => {
        if (error) { res.statusCode = 404; res.end(); return; }
        res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
        res.end(body);
      });
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}

const engines = [];
for (const [name, type] of [['chromium', chromium], ['webkit', webkit], ['firefox', firefox]]) {
  try { const browser = await type.launch(); engines.push({ name, browser }); } catch { /* not installed */ }
}
const server = await serve(ROOT);
const urlOf = (file) => `http://127.0.0.1:${server.address().port}/${file}`;
test.after(async () => { server.close(); for (const e of engines) await e.browser.close(); });

const ROW = (id) => `[data-fd-sheet-open="run-sheet"][data-value="${id}"]`;

async function open(engine, { width = 1440, height = 900, reduced = false, file = 'docs/overlays.html' } = {}) {
  const page = await engine.browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: false });
  await page.goto(urlOf(file), { waitUntil: 'load' });
  await page.evaluate(async () => { window.fire = await import('/fire/fire.js'); });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.log = [];
    for (const id of ['run-sheet', 'runs-filters', 'run-stop', 'sheet-log']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('fd:open', (e) => window.log.push(['open', id, e.detail?.trigger?.dataset?.value ?? null, !!e.detail?.swap]));
      el.addEventListener('fd:close', (e) => window.log.push(['close', id, e.detail?.value ?? null]));
    }
  });
  return page;
}
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const state = (page, id = 'run-sheet') => page.evaluate((i) => {
  const s = document.getElementById(i);
  const a = document.activeElement;
  return {
    open: s.open, modal: s.matches(':modal'), lock: document.documentElement.hasAttribute('data-fd-modal-lock'),
    focus: a === document.body ? 'body' : (a.closest('dialog')?.id ? `${a.closest('dialog').id}:` : '') + (a.dataset.value || a.className.split(' ')[0] || a.tagName),
    expanded: [...document.querySelectorAll(`[data-fd-sheet-open="${i}"]`)].filter((t) => t.getAttribute('aria-expanded') === 'true').map((t) => t.dataset.value || t.textContent.trim()),
  };
}, id);

for (const engine of engines) {
  /* ---------- 1. modeless ---------- */
  test(`${engine.name}: a modeless sheet opens without a scrim, a lock or a trap; the page behind takes clicks and the wheel`, async () => {
    const page = await open(engine);
    await page.locator(ROW('run_8f2a91')).scrollIntoViewIfNeeded();
    await page.locator(ROW('run_8f2a91')).click();
    await settle(page);
    const s = await state(page);
    assert.deepEqual({ open: s.open, modal: s.modal, lock: s.lock }, { open: true, modal: false, lock: false });
    assert.equal(s.focus, 'run-sheet:fd-sheet-title', 'the title holds focus');
    const look = await page.evaluate(() => {
      const sheet = document.getElementById('run-sheet');
      const r = sheet.getBoundingClientRect();
      const row = document.querySelector('[data-value="run_7c1d04"][data-fd-sheet-open]').getBoundingClientRect();
      const hit = document.elementFromPoint(row.left + 20, row.top + row.height / 2);
      return {
        right: Math.round(innerWidth - r.right), top: Math.round(r.top), width: Math.round(r.width),
        z: getComputedStyle(sheet).zIndex, position: getComputedStyle(sheet).position,
        rowReachable: !!hit?.closest('[data-value="run_7c1d04"]'),
        overflow: getComputedStyle(document.documentElement).overflow,
        title: document.getElementById(sheet.getAttribute('aria-labelledby'))?.textContent.trim(),
        role: sheet.getAttribute('role') ?? 'dialog', ariaModal: sheet.getAttribute('aria-modal'),
      };
    });
    assert.equal(look.position, 'fixed');
    assert.equal(look.right, 8, 'it floats 8px from the right edge');
    assert.equal(look.top, 8);
    assert.equal(look.width, 420, 'data-size md: 420px');
    assert.ok(Number(look.z) > 40, `it sits over the sidebar (z-index ${look.z})`);
    assert.ok(look.rowReachable, 'the row beside it is not covered by anything');
    assert.notEqual(look.overflow, 'hidden', 'the page is not locked');
    assert.equal(look.title, 'run_8f2a91', 'labelled by its title');
    assert.equal(look.ariaModal, null, 'no aria-modal');
    // The wheel scrolls the page.
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, 300);
    await settle(page, 300);
    assert.ok((await page.evaluate(() => scrollY)) > before, 'the page scrolls under the wheel');
    // A click outside leaves it open, and a control in the page works.
    await page.locator('[data-fd-sheet-open="runs-filters"]').scrollIntoViewIfNeeded();
    await page.mouse.click(400, 20);
    await settle(page, 200);
    assert.equal((await state(page)).open, true, 'a click outside does not close it');
    await page.close();
  });

  /* ---------- 2. swap ---------- */
  test(`${engine.name}: opening it from another row swaps the content without a second slide`, async () => {
    const page = await open(engine);
    await page.locator(ROW('run_8f2a91')).scrollIntoViewIfNeeded();
    await page.locator(ROW('run_8f2a91')).click();
    // The first open slides in: the sheet has a running transition on translate.
    const first = await page.evaluate(() => document.getElementById('run-sheet').getAnimations().filter((a) => a.transitionProperty === 'translate').length);
    await settle(page, 700);
    await page.locator(ROW('run_5a3f17')).click();
    const swap = await page.evaluate(() => ({
      slides: document.getElementById('run-sheet').getAnimations().filter((a) => a.transitionProperty === 'translate').length,
      busy: document.getElementById('run-sheet').getAttribute('aria-busy'),
      translate: getComputedStyle(document.getElementById('run-sheet')).translate,
    }));
    assert.ok(first > 0, 'the first open slides (so this test can tell)');
    assert.equal(swap.slides, 0, 'a swap does not slide');
    assert.ok(swap.translate === 'none' || /^0px( 0px)?$/.test(swap.translate), `it stays in place (${swap.translate})`);
    assert.equal(swap.busy, 'true', 'busy while the page loads the run');
    await settle(page);
    const s = await state(page);
    assert.deepEqual(s.expanded, ['run_5a3f17'], 'aria-expanded moves to the row shown');
    assert.equal(await page.evaluate(() => document.getElementById('run-sheet').getAttribute('aria-busy')), null, 'not busy once loaded');
    assert.equal(await page.evaluate(() => document.querySelector('[data-run-id]').textContent), 'run_5a3f17', 'the content swapped');
    assert.deepEqual(await page.evaluate(() => window.log), [['open', 'run-sheet', 'run_8f2a91', false], ['open', 'run-sheet', 'run_5a3f17', true]]);
    // The row that opened it last is where focus returns.
    await page.keyboard.press('Escape');
    await settle(page);
    const after = await state(page);
    assert.equal(after.open, false);
    assert.equal(after.focus, 'run_5a3f17', 'focus returns to the last trigger');
    assert.deepEqual(after.expanded, []);
    assert.deepEqual((await page.evaluate(() => window.log)).at(-1), ['close', 'run-sheet', 'dismiss']);
    await page.close();
  });

  /* ---------- 3. focus ---------- */
  test(`${engine.name}: Tab moves through the sheet as if it followed its trigger; Escape closes only from inside`, async () => {
    const page = await open(engine);
    const row = page.locator(ROW('run_6b9e22'));
    await row.scrollIntoViewIfNeeded();
    await row.focus();
    await page.keyboard.press('Enter');
    await settle(page);
    assert.equal((await state(page)).focus, 'run-sheet:fd-sheet-title');
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
    assert.equal(ring, 'none', 'the title has no ring');
    // Shift+Tab from the title: back to the row.
    await page.keyboard.press('Shift+Tab');
    assert.equal((await state(page)).focus, 'run_6b9e22');
    // Tab on the row that opened it: into the sheet.
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#run-sheet')), true, 'Tab on the trigger enters the sheet');
    // Tab past the last control: on to what follows the trigger.
    await page.evaluate(() => { const list = [...document.querySelectorAll('#run-sheet button')].filter((b) => !b.hidden && b.getClientRects().length); list.at(-1).focus(); });
    await page.keyboard.press('Tab');
    assert.equal((await state(page)).focus, 'run_5a3f17', 'Tab leaves the sheet for the row after its trigger');
    // Escape in the page does nothing to the sheet.
    await page.keyboard.press('Escape');
    await settle(page, 200);
    assert.equal((await state(page)).open, true, 'Escape with focus in the page leaves it open');
    // Escape inside closes it and focus returns to the trigger.
    await page.evaluate(() => document.querySelector('#run-sheet .fd-sheet-close').focus());
    await page.keyboard.press('Escape');
    await settle(page);
    const s = await state(page);
    assert.equal(s.open, false);
    assert.equal(s.focus, 'run_6b9e22');
    await page.close();
  });

  test(`${engine.name}: the close button returns focus; closing from code leaves focus in the page`, async () => {
    const page = await open(engine);
    await page.locator(ROW('run_7c1d04')).scrollIntoViewIfNeeded();
    await page.locator(ROW('run_7c1d04')).click();
    await settle(page);
    await page.locator('#run-sheet .fd-sheet-close').click();
    await settle(page);
    assert.equal((await state(page)).focus, 'run_7c1d04');
    await page.locator(ROW('run_4e8c90')).click();
    await settle(page);
    await page.locator('[data-fd-sheet-open="runs-filters"]').focus();
    await page.evaluate(() => window.fire.overlays.closeDialog('run-sheet'));
    await settle(page);
    const s = await state(page);
    assert.equal(s.open, false);
    assert.equal(s.focus, 'fd-btn', 'focus stays where the person had it');
    await page.close();
  });

  /* ---------- 4. several sheets, a modal from inside ---------- */
  test(`${engine.name}: one modeless sheet per side; a modal dialog from inside gives focus back to the sheet`, async () => {
    const page = await open(engine);
    await page.locator(ROW('run_8f2a91')).scrollIntoViewIfNeeded();
    await page.locator(ROW('run_8f2a91')).click();
    await settle(page);
    await page.locator('[data-fd-sheet-open="runs-filters"]').click();
    await settle(page);
    assert.deepEqual(await page.evaluate(() => [document.getElementById('run-sheet').open, document.getElementById('runs-filters').open]), [true, true], 'a left and a right sheet stay open together');
    // The filters sheet narrows the list while it is open.
    await page.locator('#runs-filters label', { hasText: 'Completed' }).click();
    assert.equal(await page.locator('[data-runs] .fd-list-row:not([hidden])').count(), 4);
    await page.evaluate(() => window.fire.overlays.closeDialog('runs-filters'));
    await settle(page);
    // A second modeless sheet on the same side replaces the first.
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<dialog class="fd-sheet" id="t-right" data-modeless><div class="fd-sheet-head"><div class="fd-sheet-bar"><h2 class="fd-sheet-title">Key detail</h2></div></div><div class="fd-sheet-body"><p>Production crawler</p></div></dialog>');
      window.fire.init(document.getElementById('t-right'));
      window.fire.overlays.openDialog('t-right');
    });
    await settle(page);
    assert.deepEqual(await page.evaluate(() => [document.getElementById('run-sheet').open, document.getElementById('t-right').open]), [false, true]);
    assert.deepEqual((await page.evaluate(() => window.log)).filter((e) => e[1] === 'run-sheet').at(-1), ['close', 'run-sheet', 'replaced']);
    await page.evaluate(() => window.fire.overlays.closeDialog('t-right'));
    await settle(page);
    // A modal from inside.
    await page.locator(ROW('run_8f2a91')).click();
    await settle(page);
    await page.locator('#run-sheet [data-run-stop]').click();
    await settle(page);
    const modal = await page.evaluate(() => ({ modal: document.getElementById('run-stop').matches(':modal'), lock: document.documentElement.hasAttribute('data-fd-modal-lock') }));
    assert.deepEqual(modal, { modal: true, lock: true });
    await page.keyboard.press('Escape');
    await settle(page);
    const s = await state(page);
    assert.equal(s.open, true, 'the modeless sheet is still open');
    assert.equal(s.focus, 'run-sheet:fd-btn', 'focus is back on the button inside the sheet');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-fd-modal-lock')), false);
    await page.close();
  });

  /* ---------- 5. phone ---------- */
  test(`${engine.name}: at 375 it is a bottom sheet at half the screen that drags closed; the page above scrolls`, async () => {
    const page = await open(engine, { width: 375, height: 812 });
    await page.locator(ROW('run_8f2a91')).scrollIntoViewIfNeeded();
    await page.locator(ROW('run_8f2a91')).click();
    await settle(page);
    const box = await page.evaluate(() => { const r = document.getElementById('run-sheet').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, width: r.width, left: r.left }; });
    assert.equal(Math.round(box.bottom), 812, 'flush with the bottom');
    assert.equal(Math.round(box.width), 375, 'full width');
    assert.equal(Math.round(box.height), 406, 'half the screen');
    // The page above takes the wheel.
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(180, 200);
    await page.mouse.wheel(0, 200);
    await settle(page, 300);
    assert.ok((await page.evaluate(() => scrollY)) > before, 'the page above scrolls');
    assert.equal((await state(page)).open, true);
    // Its body scrolls by itself and does not drag the sheet.
    await page.mouse.move(180, box.top + 260);
    await page.mouse.down();
    await page.mouse.move(180, box.top + 300, { steps: 4 });
    assert.equal(await page.evaluate(() => document.getElementById('run-sheet').hasAttribute('data-dragging')), false, 'a press in the body does not drag');
    await page.mouse.up();
    // Drag the head down: it closes.
    await page.mouse.move(120, box.top + 14);
    await page.mouse.down();
    await page.mouse.move(120, box.top + 60, { steps: 4 });
    const mid = await page.evaluate(() => ({ dragging: document.getElementById('run-sheet').hasAttribute('data-dragging'), drag: document.getElementById('run-sheet').style.getPropertyValue('--_o-drag') }));
    assert.equal(mid.dragging, true);
    assert.equal(mid.drag, '46px');
    await page.mouse.move(120, box.top + 260, { steps: 6 });
    await page.mouse.up();
    await settle(page);
    assert.equal((await state(page)).open, false, 'dragged closed');
    assert.deepEqual((await page.evaluate(() => window.log)).at(-1), ['close', 'run-sheet', 'dismiss']);
    await page.close();
  });

  test(`${engine.name}: with reduced motion it appears and closes without sliding`, async () => {
    const page = await open(engine, { width: 375, height: 812, reduced: true });
    await page.locator(ROW('run_8f2a91')).scrollIntoViewIfNeeded();
    await page.locator(ROW('run_8f2a91')).click();
    const opening = await page.evaluate(() => {
      const sheet = document.getElementById('run-sheet');
      return { still: getComputedStyle(sheet).transitionDuration.split(',').every((d) => parseFloat(d) === 0), modal: sheet.matches(':modal'), running: sheet.getAnimations().filter((a) => a.playState === 'running').length };
    });
    assert.deepEqual(opening, { still: true, modal: false, running: 0 }, 'every transition is 0s and nothing runs');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('run-sheet')).display), 'none', 'gone at once');
    await page.close();
  });

  /* ---------- 6. app shell ---------- */
  test(`${engine.name}: inside the app shell it sits over the sidebar and the top bar, under a modal`, async () => {
    const page = await open(engine, { file: 'templates/overview.html' });
    await page.addInitScript(() => { try { localStorage.setItem('ember-whats-new-seen', '1'); } catch { /* none */ } });
    await page.evaluate(() => {
      // A child of <body>, outside the shell: the shell's page is its own stacking context while page transitions are on.
      document.body.insertAdjacentHTML('beforeend', '<dialog class="fd-sheet" id="t-left" data-modeless data-side="left"><div class="fd-sheet-head"><div class="fd-sheet-bar"><h2 class="fd-sheet-title">Run detail</h2></div></div><div class="fd-sheet-body"><p>run_8f2a91</p></div></dialog>');
      for (const d of document.querySelectorAll('dialog[open]:not(#t-left)')) d.close();
      window.fire.init(document.getElementById('t-left'));
      window.fire.overlays.openDialog('t-left');
    });
    await settle(page);
    const hits = await page.evaluate(() => {
      const sheet = document.getElementById('t-left');
      const r = sheet.getBoundingClientRect();
      const side = document.querySelector('.fd-sidebar').getBoundingClientRect();
      const bar = document.querySelector('.fd-topbar').getBoundingClientRect();
      const at = (x, y) => document.elementFromPoint(x, y);
      return {
        overSidebar: sheet.contains(at(side.left + 40, side.top + 200)),
        overTopbar: sheet.contains(at(Math.min(r.right - 20, bar.left + 40), bar.top + 20)),
        sidebarBesideIt: !sheet.contains(at(r.right + 20, 300)),
        top: Math.round(r.top),
      };
    });
    assert.deepEqual(hits, { overSidebar: true, overTopbar: true, sidebarBesideIt: true, top: 8 });
    // A modal dialog lands above it.
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<dialog class="fd-dialog" id="t-modal"><div class="fd-dialog-head"><h2 class="fd-dialog-title">Stop run_8f2a91?</h2></div></dialog>');
      window.fire.overlays.openDialog('t-modal');
    });
    await settle(page);
    const top = await page.evaluate(() => { const r = document.getElementById('t-modal').getBoundingClientRect(); return !!document.elementFromPoint(r.left + 10, r.top + 10)?.closest('#t-modal'); });
    assert.equal(top, true, 'the modal dialog is above the modeless sheet');
    await page.close();
  });

  /* ---------- 7. the modal sheet ---------- */
  test(`${engine.name}: the modal sheet behaves as before`, async () => {
    const page = await open(engine);
    await page.locator('[data-fd-dialog-open="sheet-log"]').scrollIntoViewIfNeeded();
    await page.locator('[data-fd-dialog-open="sheet-log"]').click();
    await settle(page);
    const s = await page.evaluate(() => {
      const d = document.getElementById('sheet-log');
      return { modal: d.matches(':modal'), lock: document.documentElement.hasAttribute('data-fd-modal-lock'), overflow: getComputedStyle(document.documentElement).overflow, backdrop: getComputedStyle(d, '::backdrop').backdropFilter, expanded: document.querySelector('[data-fd-dialog-open="sheet-log"]').getAttribute('aria-expanded'), z: getComputedStyle(d).zIndex };
    });
    assert.equal(s.modal, true);
    assert.equal(s.lock, true);
    assert.equal(s.overflow, 'hidden');
    assert.match(s.backdrop, /blur/);
    assert.equal(s.expanded, null, 'a modal sheet trigger gets no aria-expanded');
    // Tab stays inside.
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#sheet-log') || document.activeElement === document.body), true, 'Tab stays in the modal sheet');
    // Escape hides a tooltip first when focus sits on a button that has one; the next Escape closes the sheet.
    await page.keyboard.press('Escape');
    if (await page.evaluate(() => document.getElementById('sheet-log').open)) await page.keyboard.press('Escape');
    await settle(page);
    assert.equal(await page.evaluate(() => [document.getElementById('sheet-log').open, document.documentElement.hasAttribute('data-fd-modal-lock')].join()), 'false,false');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.fdDialogOpen), 'sheet-log', 'focus returns to the trigger');
    // A backdrop click closes it.
    await page.locator('[data-fd-dialog-open="sheet-log"]').click();
    await settle(page);
    await page.mouse.click(200, 400);
    await settle(page);
    assert.equal(await page.evaluate(() => document.getElementById('sheet-log').open), false, 'a backdrop click closes it');
    assert.deepEqual((await page.evaluate(() => window.log)).filter((e) => e[1] === 'sheet-log').map((e) => e[0]), ['open', 'close', 'open', 'close']);
    await page.close();
  });
}

// data-size="half" (0.13): half the window, never narrower than lg; under 640px every sheet is the bottom sheet.
for (const engine of engines.slice(0, 1)) {
  test(`${engine.name}: a half-width sheet is half the window, at least lg wide, and a bottom sheet on a phone`, async () => {
    for (const [width, expected] of [[1440, 720], [1000, 560], [375, 375]]) {
      const page = await open(engine, { width, reduced: true });
      await page.click('[data-fd-dialog-open="sheet-decision"]');
      await page.waitForTimeout(200);
      const box = await page.evaluate(() => { const el = document.getElementById('sheet-decision'); const r = el.getBoundingClientRect(); return { open: el.open, size: el.dataset.size, w: Math.round(r.width), bottom: Math.round(innerHeight - r.bottom), right: Math.round(innerWidth - r.right), foot: !!el.querySelector('.fd-sheet-foot'), title: !!el.querySelector('.fd-sheet-title') }; });
      assert.equal(box.open, true);
      assert.equal(box.size, 'half');
      assert.equal(box.w, expected, `width at ${width}`);
      if (width === 375) assert.equal(box.bottom, 0, 'it sits on the bottom edge on a phone');
      else assert.ok(box.right <= 16, 'it sits at the right edge');
      assert.ok(box.title && box.foot, 'a title and a foot for its actions');
      await page.close();
    }
  });
}

// node --test scripts/test/focus.test.mjs
// Fire 0.10, quiet focus and the fieldset reset. Behaviour runs in Chromium (and in WebKit and Firefox where
// playwright-core has them) against docs/overlays.html, docs/forms.html and the Lit starter's production build.
//  1. focusQuiet(el): focus moved by script to a heading, a title or a region draws no ring; a control keeps its ring.
//  2. Fire's dialogs: no field, the title takes focus with no ring; a field takes it with the ring.
//  3. The Lit starter's router: after a keyboard navigation the new page's heading is focused with no ring.
//     (Skipped when starters/lit-vite has no node_modules: run `npm ci` there once.)
//  4. A fieldset takes no space of its own, and a Fire control in a disabled fieldset looks as it does with its own
//     `disabled`, pixel for pixel, for every specimen on docs/forms.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, firefox } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STARTER = path.join(ROOT, 'starters/lit-vite');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };

function serve(root, { spa = false } = {}) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (file.endsWith(path.sep)) file += 'index.html';
      fs.readFile(file, (error, body) => {
        if (error && spa && !path.extname(file)) { file = path.join(root, 'index.html'); body = fs.readFileSync(file); error = null; }
        if (error) { res.statusCode = 404; res.end(); return; }
        res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
        res.end(body);
      });
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}
const urlOf = (server, file = '') => `http://127.0.0.1:${server.address().port}/${file}`;

const engines = [];
for (const [name, type] of [['chromium', chromium], ['webkit', webkit], ['firefox', firefox]]) {
  try { const browser = await type.launch(); engines.push({ name, browser }); } catch { /* not installed */ }
}
const server = await serve(ROOT);
test.after(async () => { server.close(); for (const e of engines) await e.browser.close(); });

const ring = (page) => page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
const settle = (page) => page.waitForTimeout(450);
async function open(engine, file, setup) {
  const page = await engine.browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(urlOf(server, file), { waitUntil: 'load' });
  await page.evaluate(async () => { window.fire = await import('/fire/fire.js'); });
  await page.waitForTimeout(600); // the page's own init has run
  if (setup) await setup(page);
  return page;
}

/* ---------- 1. the helper ---------- */
for (const engine of engines) {
  test(`${engine.name}: focusQuiet draws no ring on a heading, keeps it on a control`, async () => {
    const page = await open(engine, 'docs/overlays.html', (p) => p.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<div id="fq"><h2 id="fq-h">Title</h2><main id="fq-main"><p>Region</p></main><button id="fq-b" type="button">Go</button><a id="fq-a" href="#x">Link</a><input id="fq-i"><div id="fq-ce" contenteditable="true">x</div><div id="fq-tb" role="textbox" tabindex="0">y</div></div>');
    }));
    await page.keyboard.press('Shift'); // the last input was the keyboard: the case that draws the ring
    const quiet = async (id) => { await page.evaluate((i) => window.fire.focusQuiet(document.getElementById(i)), id); await settle(page); return page.evaluate(() => ({ id: document.activeElement.id, ring: getComputedStyle(document.activeElement).boxShadow, mark: document.activeElement.getAttribute('data-fd-focus'), tab: document.activeElement.getAttribute('tabindex') })); };
    for (const id of ['fq-h', 'fq-main']) {
      const r = await quiet(id);
      assert.equal(r.id, id, `${id} holds focus`);
      assert.equal(r.ring, 'none', `${id}: no ring`);
      assert.equal(r.mark, 'quiet');
      assert.equal(r.tab, '-1', 'made focusable with tabindex -1');
    }
    await page.evaluate(() => document.getElementById('fq-b').focus());
    assert.equal(await page.evaluate(() => document.getElementById('fq-h').hasAttribute('data-fd-focus')), false, 'the mark goes when focus leaves');
    // A control is focused exactly as a plain focus() would: with a ring wherever the engine draws one for that
    // (Chromium after a key press; Firefox and WebKit decide for themselves), and never marked quiet.
    for (const id of ['fq-b', 'fq-a', 'fq-i', 'fq-ce', 'fq-tb']) {
      await page.keyboard.press('Shift');
      await page.evaluate((i) => document.getElementById(i).focus(), id);
      await settle(page);
      const plain = await ring(page);
      await page.evaluate(() => document.getElementById('fq-h').focus());
      await page.keyboard.press('Shift');
      const r = await quiet(id);
      assert.equal(r.id, id);
      assert.equal(r.ring, plain, `${id}: a control keeps whatever ring focus() gives it`);
      if (engine.name === 'chromium') assert.notEqual(r.ring, 'none', `${id}: a control keeps its ring`);
      assert.equal(r.mark, null, `${id}: a control is never marked`);
    }
    await page.close();
  });

  test(`${engine.name}: a button focused by Tab shows the ring`, async () => {
    const page = await open(engine, 'docs/overlays.html');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await settle(page);
    const info = await page.evaluate(() => ({ tag: document.activeElement.tagName, ring: getComputedStyle(document.activeElement).boxShadow }));
    if (engine.name === 'webkit' && info.tag === 'BODY') { await page.keyboard.press('Alt+Tab'); } // Safari's Tab skips buttons
    const now = await page.evaluate(() => ({ tag: document.activeElement.tagName, ring: getComputedStyle(document.activeElement).boxShadow }));
    assert.notEqual(now.tag, 'BODY', 'Tab reaches a control');
    assert.notEqual(now.ring, 'none');
    await page.close();
  });
}

test('chromium: a plain focus() on a heading after a key press does draw the ring (so the test above can fail)', async () => {
  const engine = engines.find((e) => e.name === 'chromium');
  const page = await open(engine, 'docs/overlays.html', (p) => p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<h2 id="plain" tabindex="-1">Title</h2>'); }));
  await page.keyboard.press('Shift');
  await page.evaluate(() => document.getElementById('plain').focus());
  await settle(page);
  assert.notEqual(await ring(page), 'none');
  await page.close();
});

/* ---------- 2. dialogs ---------- */
for (const engine of engines) {
  test(`${engine.name}: a dialog with no field focuses its title with no ring; with a field, the field with the ring`, async () => {
    const page = await open(engine, 'docs/overlays.html');
    await page.keyboard.press('Shift');
    await page.evaluate(() => window.fire.overlays.openDialog('dlg-revoke'));
    await settle(page);
    let r = await page.evaluate(() => ({ cls: document.activeElement.className, tag: document.activeElement.tagName, ring: getComputedStyle(document.activeElement).boxShadow }));
    assert.match(r.cls, /fd-dialog-title/, 'the title holds focus');
    assert.equal(r.ring, 'none');
    await page.evaluate(() => window.fire.overlays.closeDialog('dlg-revoke'));
    await settle(page);
    await page.keyboard.press('Shift');
    await page.evaluate(() => window.fire.overlays.openDialog('dlg-create-key'));
    await settle(page);
    r = await page.evaluate(() => ({ id: document.activeElement.id, ring: getComputedStyle(document.activeElement).boxShadow }));
    assert.equal(r.id, 'ck-name', 'the field holds focus');
    assert.notEqual(r.ring, 'none');
    await page.close();
  });
}

/* ---------- 3. the Lit starter's router ---------- */
const haveStarter = fs.existsSync(path.join(STARTER, 'node_modules/lit'));
test('the Lit starter: after a keyboard navigation the heading is focused with no ring', { skip: !haveStarter && 'run npm ci in starters/lit-vite' }, async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-focus-'));
  try {
    const built = spawnSync('npm', ['run', 'build', '--', '--outDir', out, '--emptyOutDir'], { cwd: STARTER, encoding: 'utf8' });
    assert.equal(built.status, 0, built.stdout + built.stderr);
    const app = await serve(out, { spa: true });
    try {
      for (const engine of engines) {
        const page = await engine.browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
        // The overview opens a first-visit dialog after a moment; it would cover the link this test presses.
        await page.addInitScript(() => { try { localStorage.setItem('ember-whats-new-seen', '1'); } catch { /* no storage */ } });
        await page.goto(urlOf(app, 'overview'), { waitUntil: 'load' });
        await page.waitForSelector('screen-overview h1');
        const link = page.locator('a.fd-nav-item[href$="/logs"]').first();
        await link.focus();
        await page.keyboard.press('Shift');
        await page.keyboard.press('Enter');
        await page.waitForSelector('screen-logs h1');
        await settle(page);
        const r = await page.evaluate(() => ({ tag: document.activeElement.tagName, inScreen: !!document.activeElement.closest('screen-logs'), ring: getComputedStyle(document.activeElement).boxShadow }));
        assert.deepEqual({ tag: r.tag, inScreen: r.inScreen, ring: r.ring }, { tag: 'H1', inScreen: true, ring: 'none' }, engine.name);
        await page.keyboard.press('Shift');
        await link.focus(); // the same page, a control, focused by script after a key: the ring is still there
        await settle(page);
        if (engine.name === 'chromium') assert.notEqual(await ring(page), 'none', 'the nav link keeps its ring'); // Firefox and WebKit decide for script focus themselves
        await page.close();
      }
    } finally { app.close(); }
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

/* ---------- 4. the fieldset reset and a disabled group ---------- */
for (const engine of engines) {
  test(`${engine.name}: a fieldset has no border, padding or minimum width of its own`, async () => {
    const page = await open(engine, 'docs/forms.html', (p) => p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<fieldset id="fs"><legend id="lg">Group</legend><input class="fd-input"></fieldset>'); }));
    const s = await page.evaluate(() => { const f = getComputedStyle(document.getElementById('fs')); const l = getComputedStyle(document.getElementById('lg')); return { margin: f.margin, padding: f.padding, border: f.borderTopWidth + f.borderLeftWidth, min: f.minInlineSize, legendPad: l.padding }; });
    assert.deepEqual(s, { margin: '0px', padding: '0px', border: '0px0px', min: '0px', legendPad: '0px' });
    await page.close();
  });
}

test('chromium: every Fire control in a disabled fieldset looks as it does with its own disabled (docs/forms.html, pixel for pixel)', async () => {
  const engine = engines.find((e) => e.name === 'chromium');
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const shoot = async (mode) => {
    const page = await open(engine, 'docs/forms.html');
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} fieldset[data-t]{display:contents}' });
    const count = await page.evaluate((m) => {
      const specimens = [...document.querySelectorAll('.doc-specimen')];
      for (const sp of specimens) {
        if (sp.closest('#reason')) continue;
        if (m === 'attribute') for (const c of sp.querySelectorAll('button, input, select, textarea')) c.disabled = true;
        else if (m === 'fieldset') { const fs = document.createElement('fieldset'); fs.dataset.t = ''; fs.disabled = true; fs.append(...sp.childNodes); sp.append(fs); }
      }
      return specimens.length;
    }, mode);
    const shots = [];
    for (let i = 0; i < count; i++) {
      const el = page.locator('.doc-specimen').nth(i);
      if (await page.evaluate((n) => !!document.querySelectorAll('.doc-specimen')[n].closest('#reason'), i)) { shots.push(null); continue; }
      await el.scrollIntoViewIfNeeded();
      shots.push(PNG.sync.read(await el.screenshot()));
    }
    await page.close();
    return shots;
  };
  const a = await shoot('attribute');
  const b = await shoot('fieldset');
  const enabled = await shoot('enabled');
  const different = [];
  let compared = 0;
  a.forEach((x, i) => {
    const y = b[i];
    if (!x || !y) return;
    compared++;
    if (x.width !== y.width || x.height !== y.height) { different.push(`specimen ${i}: size`); return; }
    const n = pixelmatch(x.data, y.data, null, x.width, x.height, { threshold: 0.1 });
    if (n) different.push(`specimen ${i}: ${n} px`);
  });
  const dimmed = a.filter((x, i) => x && enabled[i] && (x.width !== enabled[i].width || x.height !== enabled[i].height || pixelmatch(x.data, enabled[i].data, null, x.width, x.height, { threshold: 0.1 }) > 0)).length;
  assert.ok(dimmed > 20, `the comparison can tell: ${dimmed} specimens look different when disabled`);
  assert.ok(compared > 40, `compared ${compared} specimens`);
  assert.deepEqual(different, [], `specimens that differ: ${different.join(', ')}`);
});

test('docs/forms.html shows a disabled group: its controls cannot be focused and look disabled', async () => {
  const engine = engines.find((e) => e.name === 'chromium');
  const page = await open(engine, 'docs/forms.html');
  const r = await page.evaluate(() => {
    const fs = document.querySelector('#reason fieldset[disabled]');
    const input = fs.querySelector('input.fd-input');
    const cs = (el) => getComputedStyle(el);
    input.focus();
    return { legend: !!fs.querySelector(':scope > legend'), border: cs(fs).borderTopWidth, matches: [...fs.querySelectorAll('button, input, select')].every((c) => c.matches(':disabled')), focused: document.activeElement === input, bg: cs(input).backgroundColor, base: cs(document.querySelector('#fl-slug')).backgroundColor };
  });
  assert.equal(r.legend, true);
  assert.equal(r.border, '0px');
  assert.equal(r.matches, true);
  assert.equal(r.focused, false);
  assert.notEqual(r.bg, r.base, 'the disabled fill differs from an enabled input');
  await page.close();
});

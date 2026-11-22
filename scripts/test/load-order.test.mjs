// node --test scripts/test/ : the order a page loads Fire in. boot.js, the blocking script, comes after the stylesheets:
// it waits for them, so no body exists to be styled without them. Otherwise Chromium can style a page before Fire's
// CSS applies (a navigation within a tab) and buttons fade in from link blue.
//   - every template and docs page, and the setup in GUIDE.md and README.md, has that order
//   - in Chromium, Firefox and WebKit, while a stylesheet or one of its @imports is still loading there is no body,
//     and when there is one the saved theme is already on <html>
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as playwright from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

/** What is wrong with a head's order, or null. */
function wrong(head) {
  const boot = head.search(/<script src="[^"]*\bboot\.js"/);
  if (boot < 0) return 'no boot.js';
  return [...head.matchAll(/<link\b[^>]*\brel="stylesheet"/g)].some((link) => link.index > boot) ? 'boot.js is before a stylesheet' : null;
}
/** The setup a document shows: its first HTML block that loads boot.js. */
function setup(file) {
  const block = [...read(file).matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1]).find((text) => text.includes('boot.js'));
  assert.ok(block, `${file} shows no setup`);
  return block;
}

test('load order: every template and docs page loads boot.js after its stylesheets', () => {
  const pages = ['templates', 'docs'].flatMap((dir) => fs.readdirSync(path.join(ROOT, dir), { recursive: true }).map((f) => `${dir}/${f}`))
    .filter((file) => file.endsWith('.html'))
    .map((file) => [file, read(file).split('</head>')[0]])
    .filter(([, head]) => /<link[^>]*fire\.css/.test(head));   // not the emails: they load no Fire
  assert.ok(pages.length >= 70, `${pages.length} pages found`);
  assert.deepEqual(pages.map(([file, head]) => [file, wrong(head)]).filter(([, problem]) => problem), []);
});

test('load order: the setup in GUIDE.md and README.md loads boot.js after the stylesheet', () => {
  for (const file of ['GUIDE.md', 'README.md']) assert.equal(wrong(setup(file)), null, file);
});

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: no body exists until Fire's CSS and its @imports have loaded, and then the saved theme is already set`, async () => {
    const guide = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><title>setup</title>\n${setup('GUIDE.md')}</head>`
      + '<body><main class="fd-page"><a class="fd-btn" href="#">Read the docs</a></main></body></html>';
    let held;   // the stylesheet whose response waits
    let waiting = [];
    let booted = false;
    const server = createServer(async (req, res) => {
      const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (url === '/__setup.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(guide); return; }
      const file = path.join(ROOT, url);
      try {
        if (!file.startsWith(ROOT)) throw new Error('outside');
        const body = await readFile(file);
        const send = () => { res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body); };
        if (url.endsWith('/fire/boot.js')) booted = true;
        if (url === held) waiting.push(send); else send();
      } catch { res.writeHead(404); res.end(); }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const browser = await playwright[engine].launch();
    try {
      for (const url of ['/__setup.html', '/templates/auth.html']) for (const css of ['/fire/fire.css', '/fire/components/button.css']) {
        held = css; waiting = []; booted = false;
        const context = await browser.newContext();
        await context.addInitScript(() => {
          try { localStorage.setItem('fd-theme', 'dark'); } catch { return; }   // about:blank has no storage
          const seen = new MutationObserver(() => {
            if (!document.body) return;
            window.__themeWithBody = document.documentElement.getAttribute('data-theme');
            seen.disconnect();
          });
          seen.observe(document, { childList: true, subtree: true });
        });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${server.address().port}${url}`, { waitUntil: 'commit' });
        for (let i = 0; i < 200 && !(waiting.length && booted); i++) await page.waitForTimeout(50);
        assert.ok(waiting.length && booted, `${url}: ${css} and boot.js were requested`);
        await page.waitForTimeout(300);   // time for the parser to go on, if nothing holds it
        assert.equal(await page.evaluate(() => !!document.body), false, `${url}: a body exists while ${css} loads`);
        held = null;
        for (const send of waiting) send();
        await page.waitForLoadState('load');
        assert.equal(await page.evaluate(() => window.__themeWithBody), 'dark', `${url}: the saved theme with the body`);
        await context.close();
      }
    } finally {
      await browser.close();
      server.closeAllConnections();
      server.close();
    }
  });
}

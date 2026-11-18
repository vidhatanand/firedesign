// node --test scripts/test/transitions.test.mjs
// fire/js/transitions.js: transition() with and without document.startViewTransition, reduced motion, the motion
// dial and the kinds; init()'s page events (a link's override, the direction, "none"); and the stylesheet's shape
// (names, kinds, tokens, no raw units, reduced motion). There is no DOM in Node: a small fake of the parts the
// module touches stands in for it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mod = await import(pathToFileURL(path.join(ROOT, 'fire/js/transitions.js')).href);
const { transition, init, motionAllowed, TRANSITION_KINDS } = mod;

/* ---------- a fake document ---------- */
function fakeRoot(attrs = {}) {
  const map = new Map(Object.entries(attrs));
  return {
    getAttribute: (n) => (map.has(n) ? map.get(n) : null),
    setAttribute: (n, v) => { map.set(n, String(v)); },
    removeAttribute: (n) => { map.delete(n); },
    get dataset() { return { fdTransition: map.get('data-fd-transition') }; },
    attrs: map,
  };
}

/** Installs globals; `view` controls startViewTransition (a function, or null for none). Returns a restore function. */
function install({ reduce = false, motion = '1', view = 'default', rootAttrs = {} } = {}) {
  const saved = Object.fromEntries(['document', 'matchMedia', 'getComputedStyle'].map((k) => [k, globalThis[k]]));
  const root = fakeRoot(rootAttrs);
  const calls = [];
  const doc = { documentElement: root };
  if (view === 'default') {
    doc.startViewTransition = (callback) => {
      const run = Promise.resolve().then(() => callback());
      let finish;
      const finished = new Promise((resolve) => { finish = resolve; });
      const vt = { updateCallbackDone: run, ready: Promise.resolve(), finished, skipTransition() {}, finish };
      calls.push(vt);
      return vt;
    };
  } else if (typeof view === 'function') doc.startViewTransition = view;
  globalThis.document = doc;
  globalThis.matchMedia = () => ({ matches: reduce });
  globalThis.getComputedStyle = () => ({ getPropertyValue: (name) => (name === '--fd-motion' ? motion : '') });
  return { root, calls, restore() { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } } };
}

/* ---------- transition() ---------- */
test('without startViewTransition, update runs at once and the promise resolves when it is done', async () => {
  const env = install({ view: null });
  try {
    let ran = false;
    const done = transition(async () => { ran = true; await new Promise((r) => setTimeout(r, 5)); ran = 'finished'; });
    assert.equal(ran, true, 'update is called synchronously');
    await done;
    assert.equal(ran, 'finished');
  } finally { env.restore(); }
});

test('without startViewTransition, a rejection from update reaches the caller', async () => {
  const env = install({ view: null });
  try { await assert.rejects(transition(() => { throw new Error('boom'); }), /boom/); } finally { env.restore(); }
});

test('with startViewTransition, update runs inside it and the promise resolves once the DOM update is done', async () => {
  const env = install();
  try {
    const order = [];
    const done = transition(async () => { order.push('update'); await new Promise((r) => setTimeout(r, 5)); order.push('updated'); });
    assert.equal(env.calls.length, 1);
    assert.deepEqual(order, [], 'the browser decides when update runs');
    await done;
    assert.deepEqual(order, ['update', 'updated']);
    env.calls[0].finish();
    await new Promise((r) => setTimeout(r, 0));
  } finally { env.restore(); }
});

test('with startViewTransition, a rejection from update reaches the caller', async () => {
  const env = install({ view: (cb) => ({ updateCallbackDone: Promise.resolve().then(cb), ready: Promise.resolve(), finished: new Promise(() => {}) }) });
  try { await assert.rejects(transition(() => { throw new Error('nope'); }), /nope/); } finally { env.restore(); }
});

test('reduced motion: update is called and no view transition starts', async () => {
  const env = install({ reduce: true });
  try {
    let ran = 0;
    await transition(() => { ran += 1; });
    assert.equal(ran, 1);
    assert.equal(env.calls.length, 0);
    assert.equal(motionAllowed(), false);
  } finally { env.restore(); }
});

test('the motion dial at "none" (--fd-motion 0) skips the transition too', async () => {
  const env = install({ motion: '0' });
  try {
    await transition(() => {});
    assert.equal(env.calls.length, 0);
    assert.equal(motionAllowed(), false);
  } finally { env.restore(); }
  const slow = install({ motion: '1.75' });
  try { assert.equal(motionAllowed(), true); } finally { slow.restore(); }
});

test('kind "none", and a page whose default is "none", run update without a transition', async () => {
  let env = install();
  try { await transition(() => {}, { kind: 'none' }); assert.equal(env.calls.length, 0); } finally { env.restore(); }
  env = install({ rootAttrs: { 'data-fd-transition': 'none' } });
  try {
    await transition(() => {});
    assert.equal(env.calls.length, 0, 'the page default none');
    await transition(() => {}, { kind: 'fade' });
    assert.equal(env.calls.length, 1, 'a call can still ask for a kind');
    env.calls[0].finish();
    await new Promise((r) => setTimeout(r, 0));
  } finally { env.restore(); }
});

test('kind and direction are on <html> while the transition runs and put back after', async () => {
  const env = install({ rootAttrs: { 'data-fd-transition': 'fade' } });
  try {
    const done = transition(() => {}, { kind: 'slide', direction: 'back' });
    assert.equal(env.root.getAttribute('data-fd-transition'), 'slide');
    assert.equal(env.root.getAttribute('data-fd-direction'), 'back');
    await done;
    env.calls[0].finish();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(env.root.getAttribute('data-fd-transition'), 'fade', 'the page default comes back');
    assert.equal(env.root.getAttribute('data-fd-direction'), null, 'no direction left behind');
  } finally { env.restore(); }
});

test('a page without the attribute has it only while the transition runs (fade by default)', async () => {
  const env = install();
  try {
    assert.equal(env.root.getAttribute('data-fd-transition'), null, 'absent before');
    const done = transition(() => {});
    assert.equal(env.root.getAttribute('data-fd-transition'), 'fade', 'present during');
    await done;
    env.calls[0].finish();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(env.root.getAttribute('data-fd-transition'), null, 'absent after');
  } finally { env.restore(); }
});

test('a page that already has the attribute keeps it, and the transition uses its kind', async () => {
  const env = install({ rootAttrs: { 'data-fd-transition': 'slide' } });
  try {
    const done = transition(() => {});
    assert.equal(env.root.getAttribute('data-fd-transition'), 'slide');
    await done;
    env.calls[0].finish();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(env.root.getAttribute('data-fd-transition'), 'slide');
  } finally { env.restore(); }
});

test('a bad kind or direction is ignored', async () => {
  const env = install();
  try {
    const done = transition(() => {}, { kind: 'spin', direction: 'sideways' });
    assert.equal(env.root.getAttribute('data-fd-transition'), 'fade', 'falls back to fade');
    assert.equal(env.root.getAttribute('data-fd-direction'), null);
    await done;
    env.calls[0].finish();
    await new Promise((r) => setTimeout(r, 0));
  } finally { env.restore(); }
});

test('a newer transition keeps its attributes when an older one ends', async () => {
  const env = install();
  try {
    await transition(() => {}, { kind: 'fade', direction: 'forward' });
    await transition(() => {}, { kind: 'slide', direction: 'back' });
    env.calls[0].finish();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(env.root.getAttribute('data-fd-transition'), 'slide', 'the older one does not clear the newer one');
    env.calls[1].finish();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(env.root.getAttribute('data-fd-transition'), null);
  } finally { env.restore(); }
});

test('the kinds are fade, slide, none', () => assert.deepEqual([...TRANSITION_KINDS], ['fade', 'slide', 'none']));

/* ---------- init(): the page events ---------- */
function pageEnv({ rootAttrs = {}, reduce = false, motion = '1' } = {}) {
  const env = install({ rootAttrs, reduce, motion });
  const store = new Map();
  const saved = { window: globalThis.window, sessionStorage: globalThis.sessionStorage, navigation: globalThis.navigation, Element: globalThis.Element };
  const handlers = { click: [], pageswap: [], pagereveal: [] };
  globalThis.Element = class {};
  globalThis.sessionStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  globalThis.window = { addEventListener: (t, fn) => handlers[t].push(fn) };
  globalThis.document.addEventListener = (t, fn) => handlers[t].push(fn);
  return {
    ...env, store, handlers,
    restore() { env.restore(); for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } },
  };
}
const link = (kind, extra = {}) => {
  const a = Object.assign(new globalThis.Element(), { target: '', getAttribute: (n) => (n === 'data-fd-transition' ? kind : null), ...extra });
  a.closest = () => a;
  return a;
};
const click = (target, extra = {}) => ({ defaultPrevented: false, button: 0, target, ...extra });
const viewEvent = () => { const view = { skipped: false, skipTransition() { this.skipped = true; }, finished: new Promise(() => {}) }; return { view, event: { viewTransition: view } }; };

test('init() listens once', () => {
  const env = pageEnv();
  try {
    init(); init();
    assert.equal(env.handlers.click.length, 1);
    assert.equal(env.handlers.pageswap.length, 1);
    assert.equal(env.handlers.pagereveal.length, 1);
  } finally { env.restore(); }
});

test('a link\'s kind travels through sessionStorage and decides the next page\'s transition', () => {
  const env = pageEnv();
  try {
    init();
    env.handlers.click[0](click(link('slide')));
    env.handlers.pageswap[0]({ viewTransition: null });
    assert.match(env.store.get('fd-transition'), /"kind":"slide"/);
    const { view, event } = viewEvent();
    env.handlers.pagereveal[0](event);
    assert.equal(env.root.getAttribute('data-fd-transition'), 'slide');
    assert.equal(env.root.getAttribute('data-fd-direction'), 'forward');
    assert.equal(view.skipped, false);
    assert.equal(env.store.has('fd-transition'), false, 'used once');
  } finally { env.restore(); }
});

test('a link with "none" skips on both sides; the page default "none" skips on reveal', () => {
  let env = pageEnv();
  try {
    init();
    env.handlers.click[0](click(link('none')));
    const swap = viewEvent();
    env.handlers.pageswap[0](swap.event);
    assert.equal(swap.view.skipped, true);
    const reveal = viewEvent();
    env.handlers.pagereveal[0](reveal.event);
    assert.equal(reveal.view.skipped, true);
  } finally { env.restore(); }
  env = pageEnv({ rootAttrs: { 'data-fd-transition': 'none' } });
  try {
    init();
    const reveal = viewEvent();
    env.handlers.pagereveal[0](reveal.event);
    assert.equal(reveal.view.skipped, true);
  } finally { env.restore(); }
});

test('clicks that are not plain link clicks leave no override', () => {
  const env = pageEnv();
  try {
    init();
    env.handlers.click[0](click(link('slide'), { metaKey: true }));
    env.handlers.pageswap[0]({ viewTransition: null });
    assert.equal(env.store.has('fd-transition'), false);
    env.handlers.click[0](click(link('slide', { target: '_blank' })));
    env.handlers.pageswap[0]({ viewTransition: null });
    assert.equal(env.store.has('fd-transition'), false);
  } finally { env.restore(); }
});

test('a stale override is ignored', () => {
  const env = pageEnv();
  try {
    init();
    env.store.set('fd-transition', JSON.stringify({ kind: 'slide', at: Date.now() - 60000 }));
    const { event } = viewEvent();
    env.handlers.pagereveal[0](event);
    assert.equal(env.root.getAttribute('data-fd-transition'), 'fade');
  } finally { env.restore(); }
});

test('going back to an earlier history entry reads as "back"; anything else as "forward"', () => {
  const env = pageEnv();
  try {
    init();
    globalThis.navigation = { activation: { navigationType: 'traverse', from: { index: 3 }, entry: { index: 2 } } };
    env.handlers.pagereveal[0](viewEvent().event);
    assert.equal(env.root.getAttribute('data-fd-direction'), 'back');
    globalThis.navigation = { activation: { navigationType: 'traverse', from: { index: 2 }, entry: { index: 3 } } };
    env.handlers.pagereveal[0](viewEvent().event);
    assert.equal(env.root.getAttribute('data-fd-direction'), 'forward');
    globalThis.navigation = { activation: { navigationType: 'push', from: { index: 3 }, entry: { index: 2 } } };
    env.handlers.pagereveal[0](viewEvent().event);
    assert.equal(env.root.getAttribute('data-fd-direction'), 'forward');
    delete globalThis.navigation;
    env.handlers.pagereveal[0](viewEvent().event);
    assert.equal(env.root.getAttribute('data-fd-direction'), 'forward', 'no Navigation API: forward');
  } finally { delete globalThis.navigation; env.restore(); }
});

test('reduced motion skips the page transition', () => {
  const env = pageEnv({ reduce: true });
  try {
    init();
    const { view, event } = viewEvent();
    env.handlers.pagereveal[0](event);
    assert.equal(view.skipped, true);
  } finally { env.restore(); }
});

test('a page reveal without a transition does nothing', () => {
  const env = pageEnv();
  try { init(); env.handlers.pagereveal[0]({ viewTransition: null }); assert.equal(env.root.getAttribute('data-fd-direction'), null); } finally { env.restore(); }
});

/* ---------- the stylesheet ---------- */
const css = fs.readFileSync(path.join(ROOT, 'fire/components/transitions.css'), 'utf8');
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('transitions.css has no cross-document opt-in; fire/transitions.css (not imported by fire.css) has it, under no-preference', () => {
  assert.ok(!/@view-transition/.test(code));
  const optIn = fs.readFileSync(path.join(ROOT, 'fire/transitions.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(optIn, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*@view-transition \{ navigation: auto; \}\s*\}/);
  assert.ok(!fs.readFileSync(path.join(ROOT, 'fire/fire.css'), 'utf8').includes('"./transitions.css"'));
  for (const m of code.matchAll(/^\s+(:root\[data-fd-transition\]:not\(\[data-fd-transition="none"\]\) )?([^{\n]*)\{ view-transition-name/gm)) assert.ok(m[1], `unguarded name: ${m[2]}`);
  assert.ok(!/(^|\n)\s*[.\[][^{]*\{\s*view-transition-name/.test(code.replace(/:root\[data-fd-transition\][^{]*\{[^}]*\}/g, '')), 'every name sits under :root[data-fd-transition]');
  const imports = [...fs.readFileSync(path.join(ROOT, 'fire/fire.css'), 'utf8').matchAll(/@import "\.\/([^"]+)"/g)].map((m) => m[1]);
  assert.equal(imports.indexOf('components/transitions.css'), imports.indexOf('layout.css') - 1);
});

test('transitions.css: the chrome and the one content region are named, and the root does not animate', () => {
  for (const name of ['fd-sidebar', 'fd-topbar', 'fd-tabbar', 'fd-doc-top', 'fd-doc-nav', 'fd-site-header', 'fd-fab', 'fd-content']) {
    assert.match(code, new RegExp(`view-transition-name: ${name}( !important)?;`), name);
  }
  assert.match(code, /::view-transition-old\(root\) \{ display: none; \}/);
  assert.match(code, /::view-transition-group\(root\) \{ animation-duration: 0s; \}/);
  assert.match(code, /::view-transition-new\(root\) \{ animation: none/);
  for (const sel of ['.fd-main > .fd-page', '.fd-doc-main', '[class~="fd-site"] main']) assert.ok(code.includes(sel), sel);
  assert.ok(code.includes('[data-contained]'), 'specimens are never named');
});

test('transitions.css: the three kinds, the direction and the right-to-left mirror', () => {
  assert.match(code, /\[data-fd-transition="slide"\]/);
  assert.match(code, /\[data-fd-transition="none"\]/);
  assert.match(code, /\[data-fd-direction="back"\] \{ --_tr-dir: -1; \}/);
  assert.match(code, /:root:dir\(rtl\) \{ --_tr-flip: -1; \}/);
  assert.match(code, /fd-vt-fade-out var\(--fd-transition-out\) var\(--fd-transition-ease-out\)/);
  assert.match(code, /fd-vt-fade-in var\(--fd-transition-in\) var\(--fd-transition-ease-in\)/);
});

test('transitions.css: durations come from the motion tokens, and units appear only in the :root token block', () => {
  const root = code.match(/:root \{[^}]*\}/)[0];
  assert.match(root, /--fd-transition-out: var\(--fd-dur-3\)/);
  assert.match(root, /--fd-transition-in: var\(--fd-dur-4\)/);
  assert.match(root, /--fd-transition-ease-out: var\(--fd-ease-out\)/);
  assert.match(root, /--fd-transition-ease-in: var\(--fd-ease-emphasized\)/);
  const rest = code.replace(root, '');
  assert.deepEqual(rest.match(/(?<![\w.#-])\d*\.?\d+(px|rem|ms)\b/g)?.filter((v) => !/^0/.test(v)) ?? [], []);
  assert.ok(!/style=|<script/.test(code));
});

test('transitions.js: no inline style, no inline script, exports as documented', () => {
  const src = fs.readFileSync(path.join(ROOT, 'fire/js/transitions.js'), 'utf8');
  assert.ok(!/\.style\b|style=|innerHTML|eval\(|new Function/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
  assert.deepEqual(Object.keys(mod).sort(), ['TRANSITION_KINDS', 'init', 'motionAllowed', 'transition']);
});

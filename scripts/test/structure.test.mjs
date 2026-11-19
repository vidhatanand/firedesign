// Structure rules (0.10): scripts/lib/structure.mjs on plain trees, the lint rules through fixtures in .html, Lit, .tsx and
// .vue, build-catalog's checks of the facts on the cards, CLASSES.md carrying them, and Fire's own corpus at no finding.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { structureRules, checkTree } from '../lib/structure.mjs';
import { lintText, prepareCatalog, expandInputs, RULES } from '../lint-markup.mjs';
import { structureFactErrors, skeletonErrors } from '../build-catalog.mjs';
import { render } from '../build-classes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FX = path.join(ROOT, 'scripts/test/fixtures/structure');
const realCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
const real = prepareCatalog(realCatalog);

// A small catalogue: one component per fact.
const comp = (id, root, parts) => ({ id, name: id, root, classes: parts.map((p) => p.class), card: { parts: parts.map((p) => ({ role: 'r', ...p })) } });
const catalog = {
  components: [
    comp('callout', 'fd-callout', [{ class: 'fd-callout' }, { class: 'fd-callout-icon', required: true, or: ['fd-icon'], parent: ['fd-callout'] }, { class: 'fd-callout-content' }]),
    comp('select', 'fd-select', [{ class: 'fd-select', contains: ['select'] }]),
    comp('checkbox', 'fd-checkbox', [{ class: 'fd-checkbox', element: ['label'] }]),
    comp('menu', 'fd-menu', [{ class: 'fd-menu', attrs: { hidden: false } }, { class: 'fd-menu-item', inside: ['fd-menu'] }]),
    comp('tabs', 'fd-tabs', [{ class: 'fd-tabs', attrs: { role: 'tablist', 'aria-label': true } }]),
    comp('form-section', 'fd-form-section', [{ class: 'fd-form-section', parent: ['fd-form'] }]),
    comp('field', 'fd-field', [{ class: 'fd-field', notInside: ['fd-field'] }]),
  ],
  elements: [{ tagName: 'fd-icon' }],
  nativeWrappers: { table: ['fd-prose'], select: ['fd-select'], input: [], textarea: [], fieldset: [] },
};
const rules = structureRules(catalog);
const n = (tag, classes = [], children = [], more = {}) => ({ tag, classes, children, dynamic: false, ...more,
  attrs: { ...(classes.length ? { class: classes.join(' ') } : {}), ...(more.attrs || {}) } });
const doc = (...children) => ({ tag: '#document', classes: [], attrs: {}, children: [n('body', [], children)], dynamic: false });
const frag = (...children) => ({ tag: '#fragment', classes: [], attrs: {}, children, dynamic: false });
const found = (root, opts) => checkTree(root, rules, opts).map((f) => f.rule);

test('required: missing, present, filled by `or`, and not reported where a hole or a component could hold it', () => {
  assert.deepEqual(found(doc(n('div', ['fd-callout'], [n('div', ['fd-callout-content'])]))), ['missing-part']);
  assert.deepEqual(found(doc(n('div', ['fd-callout'], [n('i', ['fd-callout-icon']), n('div', ['fd-callout-content'])]))), []);
  assert.deepEqual(found(doc(n('div', ['fd-callout'], [n('svg', ['fd-icon'])]))), []);
  assert.deepEqual(found(doc(n('div', ['fd-callout'], [n('div', ['fd-callout-content'])], { dynamic: true }))), []);
  assert.deepEqual(found(doc(n('div', ['fd-callout'], [n('Icon'), n('div', ['fd-callout-content'])]))), []);
  // a hole deeper inside (in the text) does not hide the missing icon: it would sit in the callout itself
  assert.deepEqual(found(doc(n('div', ['fd-callout'], [n('div', ['fd-callout-content'], [], { dynamic: true })]))), ['missing-part']);
});

test('element and contains: the class on the wrong tag, on the native element it wraps, and the child it must hold', () => {
  assert.deepEqual(found(doc(n('div', ['fd-checkbox']))), ['wrong-element']);
  assert.deepEqual(found(doc(n('label', ['fd-checkbox']))), []);
  assert.deepEqual(found(doc(n('Checkbox', ['fd-checkbox']))), [], 'a component renders some tag the lint cannot see');
  assert.deepEqual(found(doc(n('select', ['fd-select'], [n('option')]))), ['wrong-element']);
  assert.deepEqual(found(doc(n('label', ['fd-select'], [n('span')]))), ['missing-child']);
  assert.deepEqual(found(doc(n('label', ['fd-select'], [n('select')]))), []);
  assert.deepEqual(found(doc(n('label', ['fd-select'], [], { dynamic: true }))), []);
  assert.deepEqual(found(doc(n('label', ['fd-select'], [n('slot')]))), []);
});

test('parent, inside and notInside: checked only where the parent or ancestor is visible', () => {
  assert.deepEqual(found(doc(n('div', ['fd-grid'], [n('section', ['fd-form-section'])]))), ['wrong-parent']);
  assert.deepEqual(found(doc(n('form', ['fd-form'], [n('section', ['fd-form-section'])]))), []);
  assert.deepEqual(found(doc(n('section', ['fd-form-section']))), ['wrong-parent'], 'a page: the body is its parent');
  assert.deepEqual(found(frag(n('section', ['fd-form-section']))), [], 'a fragment root: its parent is unknown');
  assert.deepEqual(found(doc(n('Layout', [], [n('section', ['fd-form-section'])]))), [], 'slot content: a component places it');
  assert.deepEqual(found(doc(n('div', [], [n('button', ['fd-menu-item'])]))), ['wrong-parent']);
  assert.deepEqual(found(doc(n('div', ['fd-menu'], [n('div', [], [n('button', ['fd-menu-item'])])]))), []);
  assert.deepEqual(found(frag(n('div', [], [n('button', ['fd-menu-item'])]))), [], 'the menu may be outside the fragment');
  assert.deepEqual(found(frag(n('div', ['fd-field'], [n('div', [], [n('div', ['fd-field'])])]))), ['wrong-parent']);
  assert.deepEqual(found(doc(n('div', ['fd-field']))), []);
});

test('attrs: required, a fixed value, forbidden; holes and spreads; data-static-demo is exempt', () => {
  assert.deepEqual(found(doc(n('div', ['fd-menu'], [], { attrs: { hidden: true } }))), ['forbidden-attribute']);
  assert.deepEqual(found(doc(n('div', ['fd-menu'], [], { attrs: { popover: true } }))), []);
  assert.deepEqual(found(doc(n('div', ['fd-menu'], [], { attrs: { hidden: null } }))), [], 'an expression may be false');
  assert.deepEqual(found(doc(n('div', ['fd-menu'], [], { attrs: { hidden: true, 'data-static-demo': true } }))), []);
  assert.deepEqual(found(doc(n('div', ['fd-tabs']))), ['missing-attribute', 'missing-attribute']);
  assert.deepEqual(found(doc(n('div', ['fd-tabs'], [], { attrs: { role: 'group', 'aria-label': 'x' } }))), ['missing-attribute']);
  assert.deepEqual(found(doc(n('div', ['fd-tabs'], [], { attrs: { role: 'tablist', 'aria-label': 'x' } }))), []);
  assert.deepEqual(found(doc(n('div', ['fd-tabs'], [], { dynamicAttrs: true }))), [], 'a spread may bring them');
});

test('bare-control: a native control with no class, outside the Fire classes that style it, in markup that uses Fire', () => {
  assert.deepEqual(found(doc(n('div', ['fd-card'], [n('table'), n('fieldset'), n('input'), n('input', [], [], { attrs: { type: 'checkbox' } })]))), ['bare-control', 'bare-control', 'bare-control']);
  assert.deepEqual(found(doc(n('div', ['fd-prose'], [n('table')]))), []);
  assert.deepEqual(found(doc(n('table', [], [], { attrs: { class: 'doc-table' } }))), [], 'its own class: someone styles it');
  assert.deepEqual(found(doc(n('table'))), [], 'no Fire anywhere: not a Fire page');
  assert.deepEqual(found(frag(n('table')), { usesFire: true }), [], 'a fragment with no Fire around it: the wrapper may be above');
  assert.deepEqual(found(frag(n('div', ['fd-card'], [n('table')]))), ['bare-control']);
  assert.equal(checkTree(doc(n('div', ['fd-card'], [n('table')])), rules)[0].severity, 'warning');
});

test('findings carry the node, a message naming the component, and a fix with markup', () => {
  const [f] = checkTree(doc(n('div', ['fd-callout'], [], { ref: 7 })), rules);
  assert.equal(f.node.ref, 7);
  assert.match(f.message, /callout/);
  assert.match(f.fix, /<div class="fd-callout"><div class="fd-callout-icon">/);
});

/* ------------------------------------------------------------------ the lint, through the fixtures */

const EXPECTED = ['missing-part', 'wrong-parent', 'wrong-element', 'forbidden-attribute', 'bare-control', 'bare-control', 'wrong-parent'];
const STRUCTURE = new Set(['missing-part', 'wrong-element', 'wrong-parent', 'missing-attribute', 'forbidden-attribute', 'missing-child', 'bare-control']);

test('the lint lists the structure rules', () => {
  for (const r of STRUCTURE) assert.ok(RULES.includes(r), r);
});

for (const ext of ['html', 'ts', 'tsx', 'vue']) {
  test(`fixtures (.${ext}): the five mistakes each give their rule; the right form gives nothing`, () => {
    const wrong = path.join(FX, `wrong.${ext}`);
    const got = lintText(wrong, fs.readFileSync(wrong, 'utf8'), real);
    assert.deepEqual(got.map((f) => f.rule), EXPECTED);
    assert.deepEqual(got.map((f) => f.severity), ['error', 'error', 'error', 'error', 'warning', 'warning', 'error']);
    for (const f of got) assert.ok(f.line > 1 && f.col >= 1 && /\(/.test(f.message) || f.rule === 'bare-control', `${f.rule}: ${f.message}`);
    assert.match(got[0].fix, /fd-callout-icon/);
    assert.match(got[2].fix, /<label class="fd-select"><select>/);
    assert.match(got[3].fix, /popover/);
    const right = path.join(FX, `right.${ext}`);
    assert.deepEqual(lintText(right, fs.readFileSync(right, 'utf8'), real), []);
  });
}

test('the lint: Vue <template v-if> is transparent, JSX expressions and Lit holes are their own fragments', () => {
  const vue = '<template><div class="fd-callout" role="note"><template v-if="x"><i class="fd-callout-icon" data-icon="info"></i></template><div class="fd-callout-content">a</div></div></template>';
  assert.deepEqual(lintText('a.vue', vue, real).filter((f) => STRUCTURE.has(f.rule)), []);
  const lit = 'html`<div class="fd-grid">${html`<section class="fd-form-section"></section>`}</div>`';
  assert.deepEqual(lintText('a.ts', lit, real).filter((f) => STRUCTURE.has(f.rule)), [], 'the inner template does not know its parent');
  const jsx = 'const a = <div className="fd-callout" role="note">{icon && <i className="fd-callout-icon"/>}<div className="fd-callout-content">a</div></div>;';
  assert.deepEqual(lintText('a.tsx', jsx, real).filter((f) => STRUCTURE.has(f.rule)), []);
  const jsxFragment = 'const a = <><section className="fd-form-section"><div className="fd-form-section-head">a</div></section></>;';
  assert.deepEqual(lintText('a.tsx', jsxFragment, real).filter((f) => STRUCTURE.has(f.rule)), [], 'a <>…</> fragment does not hide or set a parent');
  const spread = 'const a = <div className="fd-menu" {...props} hidden={open}>x</div>;';
  assert.deepEqual(lintText('a.tsx', spread, real).filter((f) => STRUCTURE.has(f.rule)), []);
});

/* ------------------------------------------------------------------ the catalogue */

test('build-catalog: the card schema takes the structure fields and rejects unknown ones', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/cards/card.schema.json'), 'utf8'));
  const partsOf = new Ajv2020({ allErrors: true, strict: true }).compile({ type: 'object', additionalProperties: false, properties: { parts: schema.properties.parts }, $defs: schema.$defs });
  const ok = { parts: [{ class: 'fd-x', role: 'The x.', required: true, or: ['fd-y'], element: ['label'], parent: ['fd-a'], inside: ['fd-b'], notInside: ['fd-c'], attrs: { hidden: false, popover: true, role: 'menu' }, contains: ['select'], skeleton: '<div class="fd-x"></div>' }] };
  assert.ok(partsOf(ok), JSON.stringify(partsOf.errors));
  for (const bad of [{ childOf: ['fd-a'] }, { required: false }, { element: ['Label'] }, { parent: ['x-a'] }, { attrs: { hidden: 1 } }, { parent: [] }]) {
    assert.equal(partsOf({ parts: [{ class: 'fd-x', role: 'The x.', ...bad }] }), false, JSON.stringify(bad));
  }
});

test('build-catalog: the facts name Fire classes, `or` needs required, a skeleton sits on the root and passes its own rules', () => {
  const component = { id: 'x', root: 'fd-x' };
  const card = (parts) => ({ id: 'x', parts });
  const classes = { 'fd-x': 'x', 'fd-x-a': 'x', 'fd-form': 'form' };
  assert.deepEqual(structureFactErrors(card([{ class: 'fd-x-a', parent: ['fd-x'] }]), component, classes), []);
  assert.equal(structureFactErrors(card([{ class: 'fd-x-a', parent: ['fd-nope'] }]), component, classes).length, 1);
  assert.equal(structureFactErrors(card([{ class: 'fd-x-a', or: ['fd-x'] }]), component, classes).length, 1);
  assert.equal(structureFactErrors(card([{ class: 'fd-x', required: true }]), component, classes).length, 1);
  assert.equal(structureFactErrors(card([{ class: 'fd-x-a', skeleton: '<div class="fd-x"></div>' }]), component, classes).length, 1);
  const withSkeleton = (skeleton) => [{ ...component, card: { parts: [{ class: 'fd-x', role: 'r', skeleton }, { class: 'fd-x-a', role: 'r', required: true }] } }];
  assert.deepEqual(skeletonErrors(withSkeleton('<div class="fd-x"><span class="fd-x-a"></span></div>')), []);
  assert.match(skeletonErrors(withSkeleton('<div class="fd-x"></div>'))[0], /missing-part/);
  assert.match(skeletonErrors(withSkeleton('<div class="fd-y"></div>'))[0], /does not carry fd-x/);
});

test('the catalogue carries the facts and the native wrappers; every skeleton passes', () => {
  const parts = realCatalog.components.flatMap((c) => c.card?.parts || []);
  const withFacts = realCatalog.components.filter((c) => (c.card?.parts || []).some((p) => ['required', 'element', 'parent', 'inside', 'notInside', 'attrs', 'contains'].some((k) => k in p)));
  assert.ok(withFacts.length >= 50, `${withFacts.length} components with facts`);
  const icon = parts.find((p) => p.class === 'fd-callout-icon');
  assert.deepEqual([icon.required, icon.parent], [true, ['fd-callout']]);
  assert.deepEqual(parts.find((p) => p.class === 'fd-menu').attrs, { hidden: false });
  assert.deepEqual(parts.find((p) => p.class === 'fd-select').contains, ['select']);
  assert.ok(realCatalog.nativeWrappers.table.includes('fd-prose') && realCatalog.nativeWrappers.select.includes('fd-select'));
  assert.deepEqual(skeletonErrors(realCatalog.components, realCatalog.elements), []);
});

test('CLASSES.md shows the facts on the parts, the root and the skeleton', () => {
  const md = render(realCatalog);
  assert.match(md, /`fd-callout-icon` \(required, or `fd-icon`, child of `fd-callout`\)/);
  assert.match(md, /- Root: `fd-menu` \(never `hidden`\)/);
  assert.match(md, /- Root: `fd-checkbox` \(on `<label>`, holds a `<input>`\)/);
  assert.match(md, /- Write: `<label class="fd-select"><select>…<\/select><\/label>`/);
  assert.equal(md, fs.readFileSync(path.join(ROOT, 'docs/_ref/CLASSES.md'), 'utf8'), 'CLASSES.md is current');
});

/* ------------------------------------------------------------------ Fire's own corpus */

test("Fire's docs, templates, starters and wrappers: no structure finding", () => {
  const files = expandInputs(['docs/*.html', 'templates/*.html', 'starters/lit-vite/src', 'starters/lit-vite/index.html',
    'starters/vue-vite/src', 'starters/vue-vite/index.html', 'starters/next/app', 'wrappers'], ROOT);
  assert.ok(files.length > 120, `${files.length} files`);
  const findings = files.flatMap((f) => lintText(path.relative(ROOT, f), fs.readFileSync(f, 'utf8'), real)).filter((f) => STRUCTURE.has(f.rule));
  assert.deepEqual(findings.map((f) => `${f.file}:${f.line} ${f.rule} ${f.message}`), []);
});

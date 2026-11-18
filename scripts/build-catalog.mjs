#!/usr/bin/env node
// Builds contract/catalog.json: Fire's components, classes, attribute values, elements, events, icons, tokens and
// templates, read from the source, plus the judgement in contract/cards/*.json.
//
//   node scripts/build-catalog.mjs                  write contract/catalog.json (fails if a component has no card)
//   node scripts/build-catalog.mjs --allow-missing  write it anyway, and write contract/cards/_missing.json
//   node scripts/build-catalog.mjs --check          exit 1 when the committed files differ from a fresh build
//
// Facts come from: docs/_ref/VOCABULARY.md (what a component is), fire/*.css and fire/components/*.css (classes,
// attribute values), fire/js/*.js headers (events), contract/custom-elements.json (elements), fire/js/icons.js,
// fire/tokens.css, templates/index.html and docs/*.html (anchors). Judgement the sources do not hold is in
// scripts/lib/catalog-assign.mjs. Output is sorted and stable.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { ROOT, read, stripCss, topFiles, loadIconNames, attributeSheets, collectAttrValues, scriptAttrValues, scriptClasses, cssCommentValues } from './lib/source.mjs';
import { parseVocabulary } from './lib/vocabulary.mjs';
import { readModuleEvents, summariseEvents } from './lib/events.mjs';
import { EXTRA_ROOTS, PART_OF, ID_ALIASES, PATTERNS, FAMILY_PAGES, FAMILY_MODULES, EVENT_SUBJECTS, LAYOUT_PRIMITIVES, LISTENED_EVENTS, ELEMENT_COMPONENT, GROUPS, NAMES, EVENT_EXTRA, FREE_ATTRIBUTES, DEFAULT_VALUES } from './lib/catalog-assign.mjs';

const OUT = path.join(ROOT, 'contract/catalog.json');
const CARDS = path.join(ROOT, 'contract/cards');
const MISSING = path.join(CARDS, '_missing.json');
const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
const titleCase = (id) => id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const entities = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&middot;/g, '·').replace(/\s+/g, ' ').trim();

// ---------- sources ----------
/** Every fd- class a style rule selects, in fire/base.css, fire/layout.css and fire/components/*.css. */
function cssClasses() {
  const files = [path.join(ROOT, 'fire/base.css'), path.join(ROOT, 'fire/layout.css'), ...topFiles('fire/components', ['.css'])];
  const set = new Set();
  for (const f of files) {
    for (const rule of stripCss(read(f)).matchAll(/([^{}]+)\{/g)) {
      if (rule[1].trim().startsWith('@')) continue;
      for (const m of rule[1].matchAll(/\.(fd-[a-z0-9]+(?:-[a-z0-9]+)*)/g)) set.add(m[1]);
    }
  }
  return [...set].sort();
}

/** docs/*.html sections (`<section class="doc-section" id>`): which fd- classes each one's markup uses, and how often. */
function docSections() {
  const sections = [];
  for (const file of topFiles('docs', ['.html'])) {
    const text = read(file);
    const starts = [...text.matchAll(/<section class="doc-section"[^>]*\sid="([^"]+)"/g)];
    starts.forEach((m, i) => {
      const body = text.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : text.length);
      const counts = {};
      for (const c of body.matchAll(/(?<![\w-])class="([^"]*)"/g)) for (const t of c[1].split(/\s+/)) if (t.startsWith('fd-') && !t.includes('${')) counts[t] = (counts[t] || 0) + 1;
      sections.push({ page: path.basename(file), anchor: `docs/${path.basename(file)}#${m[1]}`, counts });
    });
  }
  return sections;
}

function readTemplates() {
  const text = read(path.join(ROOT, 'templates/index.html'));
  const out = [];
  for (const chunk of text.split(/<a class="fd-card"/).slice(1)) {
    const card = chunk.slice(0, chunk.indexOf('</a>'));
    const href = card.match(/href="([^"]+\.html)"/)?.[1];
    const title = card.match(/<span class="fd-title">([^<]*)</)?.[1];
    const job = card.match(/<p class="fd-card-text">([^<]*)</)?.[1];
    if (href && title && job) out.push({ path: `templates/${href}`, title: entities(title), job: entities(job) });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function readTokens() {
  const text = stripCss(read(path.join(ROOT, 'fire/tokens.css')));
  return [...new Set([...text.matchAll(/(--fd-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))].sort();
}

/** Elements from contract/custom-elements.json (a Custom Elements Manifest), reduced to what the catalogue needs. */
function readElements() {
  const file = path.join(ROOT, 'contract/custom-elements.json');
  if (!fs.existsSync(file)) return [];
  const manifest = JSON.parse(read(file));
  const out = [];
  for (const mod of manifest.modules || []) {
    for (const d of mod.declarations || []) {
      if (!d.tagName) continue;
      const attr = (a) => ({ name: a.name, type: a.type?.text ?? '', default: a.default ?? '', description: a.description ?? '' });
      const members = (d.members || []).filter((m) => m.kind === 'field' && m.privacy !== 'private' && m.privacy !== 'protected' && !m.static && !m.name.startsWith('_'));
      out.push({
        tagName: d.tagName,
        description: d.description ?? '',
        attributes: (d.attributes || []).map(attr).sort((a, b) => a.name.localeCompare(b.name)),
        properties: members.map((m) => ({ name: m.name, type: m.type?.text ?? '', attribute: m.attribute ?? '', description: m.description ?? '' })).sort((a, b) => a.name.localeCompare(b.name)),
        events: (d.events || []).map((e) => ({ name: e.name, type: e.type?.text ?? '', description: e.description ?? '' })).sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }
  return out.sort((a, b) => a.tagName.localeCompare(b.tagName));
}

// ---------- the build ----------
export async function buildCatalog({ allowMissing = false } = {}) {
  const errors = [];
  const vocab = parseVocabulary();
  const classes = cssClasses();
  const classSet = new Set(classes);

  // Component roots: the vocabulary's, plus the ones the CSS defines beyond it; a PART_OF key stops being a root.
  const roots = new Map([...vocab.roots].map(([r, v]) => [r, v.family]));
  for (const r of LAYOUT_PRIMITIVES) roots.set(r, 'Layout');
  for (const [r, family] of Object.entries(EXTRA_ROOTS)) roots.set(r, family);
  for (const key of Object.keys(PART_OF)) roots.delete(key);
  // Names that resolve to a root: roots themselves, the vocabulary's parts and the table's parts.
  const owner = new Map([...roots.keys()].map((r) => [r, r]));
  for (const [part, root] of vocab.parts) if (!owner.has(part) && roots.has(root)) owner.set(part, root);
  for (const [part, root] of Object.entries(PART_OF)) owner.set(part, root);
  for (const r of roots.keys()) if (!classSet.has(r)) errors.push(`component root ${r} has no CSS rule`);

  // Groups: the named roots join the group's root; whatever they owned follows.
  const merged = new Map();
  for (const g of GROUPS) {
    if (!classSet.has(g.root)) errors.push(`group ${g.id}: root ${g.root} has no CSS rule`);
    for (const m of g.members) { if (!roots.has(m) && !owner.has(m)) errors.push(`group ${g.id}: ${m} is not a component root`); merged.set(m, g.root); roots.delete(m); owner.set(m, g.root); }
    roots.set(g.root, g.family); owner.set(g.root, g.root); merged.delete(g.root);
  }
  for (const [k, v] of owner) if (merged.has(v)) owner.set(k, merged.get(v));
  for (const [r, root] of owner) if (!roots.has(root)) errors.push(`${r} belongs to ${root}, which is not a component root`);

  const keys = [...owner.keys()].sort((a, b) => b.length - a.length);
  const resolve = (cls) => {
    for (const k of keys) if (cls === k || cls.startsWith(k + '-')) return owner.get(k);
    return null;
  };
  const byRoot = new Map();
  const idOf = (root) => ID_ALIASES[root] || root.slice(3);
  for (const root of [...roots.keys()].sort()) {
    const g = GROUPS.find((x) => x.root === root);
    byRoot.set(root, { id: g?.id || idOf(root), name: g?.name || NAMES[root] || titleCase(idOf(root)), family: roots.get(root), kind: roots.get(root) === 'Layout' && !g ? 'layout' : PATTERNS.has(root) ? 'pattern' : 'component', root, classes: [] });
  }
  const ids = new Set();
  for (const c of byRoot.values()) { if (ids.has(c.id)) errors.push(`two components share the id ${c.id}`); ids.add(c.id); }
  const classToId = {};
  for (const cls of classes) {
    const root = resolve(cls);
    if (!root) { errors.push(`class ${cls} fits no component: add it to EXTRA_ROOTS or PART_OF in scripts/lib/catalog-assign.mjs`); continue; }
    byRoot.get(root).classes.push(cls);
    classToId[cls] = byRoot.get(root).id;
  }

  // Hook classes: scripts and module headers use them, CSS never styles them. They join the component of their longest prefix.
  const hooks = [...scriptClasses()].filter((c) => !classSet.has(c)).sort();
  const unplacedHooks = [];
  for (const cls of hooks) {
    const root = resolve(cls);
    if (!root) { unplacedHooks.push(cls); continue; }
    byRoot.get(root).classes.push(cls);
    classToId[cls] = byRoot.get(root).id;
  }
  for (const c of byRoot.values()) c.classes.sort();

  // Attribute values the styles define in selectors that involve the component's classes.
  const known = collectAttrValues(attributeSheets({ docs: false }), { scope: 'compound' });
  const globalAttributes = {};
  for (const [k, set] of [...known].sort()) if (k.startsWith('*|')) globalAttributes[k.slice(2)] = [...set].sort();
  for (const c of byRoot.values()) {
    const attrs = {};
    for (const cls of c.classes) {
      for (const [k, set] of known) if (k.startsWith(cls + '|')) { const a = k.slice(cls.length + 1); (attrs[a] ??= new Set()); set.forEach((v) => attrs[a].add(v)); }
      for (const k of known.flags.keys()) if (k.startsWith(cls + '|')) { const a = k.slice(cls.length + 1); attrs[a] ??= new Set(); }
    }
    c.attributes = Object.fromEntries(Object.entries(attrs).map(([a, s]) => [a, new Set(s)]));
  }
  // More sources of allowed values: the layout attributes (any element), the vocabulary, the literals Fire's scripts
  // read or compare, and the defaults the docs state for an unstyled value.
  const byClass = (cls) => byRoot.get(resolve(cls));
  for (const c of byRoot.values()) for (const [a, vals] of Object.entries(globalAttributes)) if (c.attributes[a]) vals.forEach((v) => c.attributes[a].add(v));
  for (const { root, attr, values } of vocab.attrValues) {
    const c = byClass(root);
    if (c) { c.attributes[attr] ??= new Set(); values.forEach((v) => c.attributes[attr].add(v)); }
  }
  const scripts = scriptAttrValues();
  for (const c of byRoot.values()) {
    const mods = ['core', ...(c.id === 'icon' ? ['icons'] : []), ...(FAMILY_MODULES[c.family] || [])];
    for (const a of Object.keys(c.attributes)) for (const mod of mods) scripts.get(mod)?.get(a)?.forEach((v) => c.attributes[a].add(v));
  }
  // Values a component sheet's header documents, for the components that sheet defines.
  const classCount = new Map();   // class -> file -> rules; a class's home sheet is the one with most rules (fd-btn appears in code.css too)
  for (const f of [path.join(ROOT, 'fire/base.css'), ...topFiles('fire/components', ['.css'])]) {
    for (const rule of stripCss(read(f)).matchAll(/([^{}]+)\{/g)) for (const m of rule[1].matchAll(/\.(fd-[a-z0-9]+(?:-[a-z0-9]+)*)/g)) { const k = m[1]; if (!classCount.has(k)) classCount.set(k, new Map()); classCount.get(k).set(path.basename(f), (classCount.get(k).get(path.basename(f)) || 0) + 1); }
  }
  const classFile = new Map([...classCount].map(([k, files]) => [k, new Set([[...files].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]])]));
  const sheetValues = cssCommentValues();
  for (const c of byRoot.values()) {
    const files = new Set(c.classes.flatMap((cls) => [...(classFile.get(cls) || [])]));
    for (const f of files) for (const [a, vals] of sheetValues.get(f) || []) if (c.attributes[a]) vals.forEach((v) => c.attributes[a].add(v));
  }
  for (const [id, attrs] of Object.entries(DEFAULT_VALUES)) {
    const c = [...byRoot.values()].find((x) => x.id === id);
    if (!c) { errors.push(`DEFAULT_VALUES: no component ${id}`); continue; }
    for (const [a, vals] of Object.entries(attrs)) { c.attributes[a] ??= new Set(); vals.forEach((v) => c.attributes[a].add(v)); }
  }
  for (const [id, names] of Object.entries(FREE_ATTRIBUTES)) {
    const c = [...byRoot.values()].find((x) => x.id === id);
    if (!c) { errors.push(`FREE_ATTRIBUTES: no component ${id}`); continue; }
    for (const a of names) c.attributes[a] = new Set(['*']);
  }
  for (const c of byRoot.values()) c.attributes = sortKeys(Object.fromEntries(Object.entries(c.attributes).map(([a, set]) => [a, set.has('*') ? ['*'] : [...set].sort()])));

  // Events: from each module's header, to the components of the families that module serves.
  const moduleEvents = readModuleEvents();
  const events = summariseEvents(moduleEvents);
  const compEvents = new Map([...byRoot.values()].map((c) => [c.id, new Set()]));
  for (const [mod, mentions] of Object.entries(moduleEvents)) {
    const subjects = EVENT_SUBJECTS[mod] || {};
    for (const { event, classes: mentioned, line, text } of mentions) {
      if (!events[event] || LISTENED_EVENTS.has(event)) continue;
      const targets = new Set(mentioned.map(resolve).filter(Boolean));
      // Words after the event name ("combobox, tag input, otp"), outside braces and parentheses.
      const words = text.replace(/\{[^}]*\}|\([^)]*\)/g, ' ');
      if (line.startsWith('fd:') || mod === 'forms') for (const [word, root] of Object.entries(subjects.words || {})) if (new RegExp(`(?<![\\w-])${word}(?![\\w-])`).test(words)) targets.add(resolve(root));
      for (const root of targets) {
        const c = byRoot.get(root);
        if (c && (FAMILY_MODULES[c.family] || []).includes(mod)) compEvents.get(c.id).add(event);
      }
    }
  }

  for (const [id, list] of Object.entries(EVENT_EXTRA)) for (const e of list) if (events[e] && compEvents.has(id)) compEvents.get(id).add(e);

  // Elements: a component whose class is an element's tag name has that element.
  const elements = readElements();
  const tags = new Set(elements.map((e) => e.tagName));
  for (const c of byRoot.values()) {
    // The explicit map wins: a class can share an element's name without being its component (fd-code is inline code).
    const tag = [...tags].find((t) => ELEMENT_COMPONENT[t] === c.id) || c.classes.find((cls) => tags.has(cls) && !ELEMENT_COMPONENT[cls]);
    c.element = tag || null;
    c.events = [...compEvents.get(c.id)].sort();
  }

  // Docs anchor: the section of the family's own page that uses the root most, else the section that uses it most.
  const sections = docSections();
  const anchorOf = (c) => {
    const pick = (list, key) => list.map((s) => ({ s, n: s.counts[key] || 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)[0]?.s.anchor;
    const own = sections.filter((s) => (FAMILY_PAGES[c.family] || []).includes(s.page));
    return pick(own, c.root) || pick(sections, c.root) || pick(own, c.classes.find((k) => own.some((s) => s.counts[k]))) || null;
  };
  for (const c of byRoot.values()) c.docs = anchorOf(c);
  const anchors = new Set(sections.map((s) => s.anchor));

  // Cards.
  const cardSchema = JSON.parse(read(path.join(CARDS, 'card.schema.json')));
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(cardSchema);
  const cards = new Map();
  for (const f of fs.readdirSync(CARDS).filter((n) => n.endsWith('.json') && n !== 'card.schema.json' && n !== '_missing.json').sort()) {
    const card = JSON.parse(read(path.join(CARDS, f)));
    if (!validate(card)) { errors.push(`${f}: ${validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')}`); continue; }
    if (card.id !== f.replace(/\.json$/, '')) errors.push(`${f}: id "${card.id}" does not match the file name`);
    cards.set(card.id, card);
  }
  const components = [...byRoot.values()].sort((a, b) => a.id.localeCompare(b.id));
  const missing = [];
  for (const id of cards.keys()) if (!ids.has(id)) errors.push(`cards/${id}.json: no component has the id "${id}"`);
  for (const c of components) {
    const card = cards.get(c.id);
    if (!card) { missing.push({ id: c.id, family: c.family, docs: c.docs }); continue; }
    for (const r of card.related) if (!ids.has(r)) errors.push(`cards/${c.id}.json: related "${r}" is not a component`);
    for (const p of card.parts) if (!c.classes.includes(p.class)) errors.push(`cards/${c.id}.json: part ${p.class} is not a class of ${c.id}`);
    for (const v of card.variants) {
      const values = c.attributes[v.attribute];
      if (!values) errors.push(`cards/${c.id}.json: variant attribute ${v.attribute} is not defined for ${c.id}`);
      else if (values.length && !values.includes(v.value)) errors.push(`cards/${c.id}.json: variant ${v.attribute}="${v.value}" is not a value the styles define (${values.join(' | ')})`);
    }
    if (!anchors.has(card.example)) errors.push(`cards/${c.id}.json: example ${card.example} is not a docs section`);
    c.card = card;
  }
  if (missing.length && !allowMissing) errors.push(`${missing.length} components have no card (run with --allow-missing to build without them); first: ${missing.slice(0, 5).map((m) => m.id).join(', ')}`);

  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
  const catalog = {
    fire: pkg.version.replace(/-.*$/, ''),
    components: components.map((c) => ({ id: c.id, name: c.name, family: c.family, kind: c.kind, root: c.root, classes: c.classes, attributes: c.attributes, element: c.element, events: c.events, docs: c.docs, ...(c.card ? { card: c.card } : {}) })),
    classes: sortKeys(classToId),
    elements,
    events,
    globalAttributes,
    icons: [...(await loadIconNames())].sort(),
    tokens: readTokens(),
    templates: readTemplates(),
  };
  return { catalog, missing, errors, unplacedHooks };
}

const serialise = (o) => JSON.stringify(o, null, 2) + '\n';

async function main() {
  const args = new Set(process.argv.slice(2));
  const allowMissing = args.has('--allow-missing');
  const { catalog, missing, errors, unplacedHooks } = await buildCatalog({ allowMissing });
  if (errors.length) {
    console.error(`build-catalog: ${errors.length} error${errors.length > 1 ? 's' : ''}`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  if (unplacedHooks.length) console.log(`build-catalog: classes scripts mention that fit no component (not added): ${unplacedHooks.join(' ')}`);
  const files = [[OUT, serialise(catalog)]];
  if (allowMissing) files.push([MISSING, serialise({ note: 'Components that still need a card (generated by build-catalog.mjs --allow-missing).', count: missing.length, components: missing })]);
  if (args.has('--check')) {
    const stale = files.filter(([f, text]) => !fs.existsSync(f) || read(f) !== text).map(([f]) => path.relative(ROOT, f));
    if (stale.length) { console.error(`build-catalog: stale: ${stale.join(', ')}; run node scripts/build-catalog.mjs${allowMissing ? ' --allow-missing' : ''}`); process.exit(1); }
    console.log('build-catalog: up to date');
    return;
  }
  for (const [f, text] of files) fs.writeFileSync(f, text);
  console.log(`build-catalog: ${catalog.components.length} components, ${Object.keys(catalog.classes).length} classes${allowMissing ? `, ${missing.length} without a card` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); process.exit(2); });

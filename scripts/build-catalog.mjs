#!/usr/bin/env node
// Builds contract/catalog.json: Fire's components, classes, attribute values, elements, events, icons, tokens and
// templates, read from the source, plus the judgement in contract/cards/*.json.
//
//   node scripts/build-catalog.mjs                  write contract/catalog.json (fails if a component has no card)
//   node scripts/build-catalog.mjs --allow-missing  write it anyway, and write contract/cards/_missing.json
//   node scripts/build-catalog.mjs --check          exit 1 when the committed files differ from a fresh build
//
// Facts come from: docs/_ref/VOCABULARY.md (what a component is), fire/*.css and fire/components/*.css (classes,
// attribute values), fire/js/*.js (events, and values written next to a class: scripts/lib/evidence.mjs),
// contract/custom-elements.json (elements), fire/js/icons.js, fire/tokens.css, templates/index.html and docs/*.html
// (anchors). Judgement the sources do not hold is in scripts/lib/catalog-assign.mjs. Output is sorted and stable.
// A card variant the catalogue does not list is an error; with --allow-missing it is listed in _missing.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { ROOT, read, stripCss, topFiles, loadIconNames, attributeSheets, collectAttrValues, scriptClasses } from './lib/source.mjs';
import { sourceEvidence, scriptWrites, scriptValues } from './lib/evidence.mjs';
import { parseVocabulary } from './lib/vocabulary.mjs';
import { readModuleEvents, summariseEvents } from './lib/events.mjs';
import { EXTRA_ROOTS, PART_OF, ID_ALIASES, PATTERNS, FAMILY_PAGES, FAMILY_MODULES, EVENT_SUBJECTS, LAYOUT_PRIMITIVES, LISTENED_EVENTS, ELEMENT_COMPONENT, GROUPS, NAMES, EVENT_EXTRA, FREE_ATTRIBUTES, DEFAULT_VALUES, STATE_ATTRIBUTES, LAYOUT_ATTRIBUTES, MODULES, SECTION_FAMILIES } from './lib/catalog-assign.mjs';

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
      const heading = entities((body.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/)?.[1] || '').replace(/<[^>]+>/g, '')).toLowerCase();
      sections.push({ page: path.basename(file), id: m[1], anchor: `docs/${path.basename(file)}#${m[1]}`, heading, counts });
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
    byRoot.set(root, { id: g?.id || idOf(root), name: g?.name || NAMES[root] || titleCase(idOf(root)), family: roots.get(root), kind: roots.get(root) === 'Layout' && !g ? 'layout' : PATTERNS.has(root) ? 'pattern' : SECTION_FAMILIES.has(roots.get(root)) ? 'section' : 'component', root, classes: [] });
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

  // Elements: a component whose class is an element's tag name has that element.
  const elements = readElements();
  const tags = new Set(elements.map((e) => e.tagName));
  for (const c of byRoot.values()) {
    // The explicit map wins: a class can share an element's name without being its component (fd-code is inline code).
    c.element = [...tags].find((t) => ELEMENT_COMPONENT[t] === c.id) || c.classes.find((cls) => tags.has(cls) && !ELEMENT_COMPONENT[cls]) || null;
  }

  // Attribute values. A value belongs to a component only with evidence tied to it (see scripts/lib/evidence.mjs):
  // a style rule whose compound selector holds one of its classes, a VOCABULARY entry next to it, a comment or script
  // line that writes it on one of its classes or its tag, or a documented default (DEFAULT_VALUES). Evidence on the
  // root class or the element is the component's (`attributes`, what a person picks); evidence on another of its
  // classes is that part's (`partAttributes`); what Fire's scripts set as state is `stateAttributes`.
  const byId = new Map([...byRoot.values()].map((c) => [c.id, c]));
  const tagOf = new Map([...byRoot.values()].filter((c) => c.element).map((c) => [c.element, c]));
  const store = new Map([...byRoot.values()].map((c) => [c.id, new Map()]));   // id -> context ('' or a class) -> attr -> Set
  const unplacedEvidence = new Set();
  // A name is ".fd-x" (a class), "<fd-x" (an element's tag) or "fd-x" (either: a class first).
  const placeName = (written) => {
    const kind = written[0] === '.' || written[0] === '<' ? written[0] : '';
    const name = kind ? written.slice(1) : written;
    const asClass = () => byId.get(classToId[name]) || (resolve(name) && byRoot.get(resolve(name)));
    const c = kind === '<' ? tagOf.get(name) || asClass() : kind === '.' ? asClass() : asClass() || tagOf.get(name);
    if (!c) return null;
    const isTag = kind === '<' || (!kind && !classToId[name] && tagOf.has(name));
    return { c, ctx: name === c.root || (isTag && name === c.element) ? '' : name };
  };
  const note = (name, attr, value, why) => {
    const at = placeName(name);
    if (!at) { unplacedEvidence.add(`${name} ${attr}${value ? `="${value}"` : ''} (${why})`); return; }
    const ctxs = store.get(at.c.id);
    if (!ctxs.has(at.ctx)) ctxs.set(at.ctx, new Map());
    const attrs = ctxs.get(at.ctx);
    if (!attrs.has(attr)) attrs.set(attr, new Set());
    attrs.get(attr).add(value);
  };
  const known = collectAttrValues(attributeSheets({ docs: false }), { scope: 'compound' });
  const globalAttributes = {};
  for (const [k, set] of [...known].sort()) if (k.startsWith('*|')) globalAttributes[k.slice(2)] = [...set].sort();
  globalAttributes['data-fd-surface'] = ['app', 'email', 'phone', 'website'];   // a declaration, no CSS: where the page or the element is used (lint-markup surface-mismatch)
  for (const [k, set] of known) { const [cls, attr] = k.split('|'); if (cls !== '*') for (const v of set) note('.' + cls, attr, v, 'css'); }
  for (const k of known.flags.keys()) { const [cls, attr] = k.split('|'); if (cls !== '*') note('.' + cls, attr, '', 'css'); }
  for (const { root, attr, values } of vocab.attrValues) for (const v of values) note('.' + root, attr, v, 'VOCABULARY.md');
  const rootOfId = new Map([...byRoot.values()].map((c) => [c.id, c.root]));
  const evidence = sourceEvidence({ ids: rootOfId, isRoot: (name) => byRoot.has(name) });
  const { compared, modules } = scriptValues();
  for (const e of evidence) if (!e.enumerates && e.value && compared.get(e.file)?.get(e.attr)?.has(e.value)) e.enumerates = true;   // its own script handles that literal
  for (const e of evidence) if (e.enumerates) for (const name of e.names) note(name, e.attr, e.value, e.file);
  const compOf = (key, table) => {
    const c = key.startsWith('fd-') ? placeName('.' + key) : byId.has(key) ? { c: byId.get(key), ctx: '' } : null;
    if (!c) errors.push(`${table}: no component or class ${key}`);
    return c;
  };
  for (const [key, attrs] of Object.entries(DEFAULT_VALUES)) {
    if (!compOf(key, 'DEFAULT_VALUES')) continue;
    for (const [a, vals] of Object.entries(attrs)) for (const v of vals) note('.' + (key.startsWith('fd-') ? key : rootOfId.get(key)), a, v, 'DEFAULT_VALUES');
  }
  for (const [id, names] of Object.entries(LAYOUT_ATTRIBUTES)) {
    if (!compOf(id, 'LAYOUT_ATTRIBUTES')) continue;
    for (const a of names) { if (!globalAttributes[a]) { errors.push(`LAYOUT_ATTRIBUTES: ${a} is not a layout attribute`); continue; } for (const v of globalAttributes[a]) note('.' + rootOfId.get(id), a, v, 'layout'); }
  }

  // An example value (one value in a specimen or a script's markup) joins an attribute other evidence enumerates for
  // the same component; on its own it would turn a free attribute (data-name="domains") into a list of one.
  const enumerated = (c, attr) => [...store.get(c.id).values()].some((attrs) => attrs.has(attr));
  for (const e of evidence) if (!e.enumerates) for (const name of e.names) { const at = placeName(name); if (at && enumerated(at.c, e.attr)) note(name, e.attr, e.value, e.file); }

  // Split each component's evidence into its own attributes, its parts' attributes and the state its scripts set.
  const writes = scriptWrites();
  const stateOf = new Map([...byRoot.values()].map((c) => [c.id, []]));   // id -> [{ ctx: null (any) | class, attr, values }]
  for (const [key, attrs] of Object.entries(STATE_ATTRIBUTES)) {
    const at = compOf(key, 'STATE_ATTRIBUTES');
    if (!at) continue;
    for (const [a, vals] of Object.entries(attrs)) {
      if (!writes.has(a)) { errors.push(`STATE_ATTRIBUTES: ${key} ${a}: no Fire script writes ${a}`); continue; }
      for (const v of vals) if (!writes.get(a).has(v) && !modules.get(a)?.has(v)) errors.push(`STATE_ATTRIBUTES: ${key} ${a}="${v}": no Fire script that writes ${a} names that value`);
      const ctxs = store.get(at.c.id);
      if (![...ctxs].some(([ctx, m]) => m.has(a) && (!key.startsWith('fd-') || ctx === at.ctx)) && !vals.length) errors.push(`STATE_ATTRIBUTES: ${key} ${a}: no evidence of it and no values listed`);
      stateOf.get(at.c.id).push({ ctx: key.startsWith('fd-') ? at.ctx : null, attr: a, values: vals });
    }
  }
  const sorted = (set) => (set.has('*') ? ['*'] : [...set].sort());
  for (const c of byRoot.values()) {
    const ctxs = store.get(c.id);
    const state = new Map();
    for (const { ctx, attr, values } of stateOf.get(c.id)) {
      if (!state.has(attr)) state.set(attr, new Set());
      values.forEach((v) => state.get(attr).add(v));
      for (const [k, attrs] of ctxs) if ((ctx === null || k === ctx) && attrs.has(attr)) { attrs.get(attr).forEach((v) => state.get(attr).add(v)); attrs.delete(attr); }
    }
    for (const a of FREE_ATTRIBUTES[c.id] || []) {
      let placed = false;
      for (const attrs of [...ctxs.values(), state]) if (attrs.has(a)) { attrs.set(a, new Set(['*'])); placed = true; }
      if (!placed) { if (!ctxs.has('')) ctxs.set('', new Map()); ctxs.get('').set(a, new Set(['*'])); }
    }
    const obj = (m) => sortKeys(Object.fromEntries([...m].map(([a, set]) => [a, sorted(set)])));
    c.attributes = obj(ctxs.get('') || new Map());
    c.partAttributes = sortKeys(Object.fromEntries([...ctxs].filter(([k, m]) => k && m.size).map(([k, m]) => [k, obj(m)])));
    c.stateAttributes = obj(state);
  }

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

  for (const c of byRoot.values()) c.events = [...compEvents.get(c.id)].sort();

  // Docs anchor (a card's hand-written `example` wins, below): on the family's own pages, a section whose id is the
  // component's (or its plural), else one whose heading is its name (or plural), each using one of its classes; else
  // the section of the family's own page that uses the root most, else the section that uses it most.
  const sections = docSections();
  const anchorOf = (c) => {
    const uses = (s) => c.classes.some((k) => s.counts[k]);
    const own = sections.filter((s) => (FAMILY_PAGES[c.family] || []).includes(s.page));
    const idNames = new Set([c.id, `${c.id}s`, c.root.slice(3), `${c.root.slice(3)}s`]);
    const byId = own.find((s) => idNames.has(s.id) && uses(s));
    if (byId) return byId.anchor;
    const name = c.name.toLowerCase();
    const byHeading = own.find((s) => uses(s) && (s.heading === name || s.heading === `${name}s`));
    if (byHeading) return byHeading.anchor;
    const pick = (list, key) => list.map((s) => ({ s, n: s.counts[key] || 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)[0]?.s.anchor;
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
  const cardProblems = [];   // variants that name a value the catalogue does not list: errors, or listed in _missing.json with --allow-missing
  const moduleIds = new Set(MODULES.map((m) => m.id));
  for (const id of cards.keys()) if (!ids.has(id) && !moduleIds.has(id)) errors.push(`cards/${id}.json: no component or module has the id "${id}"`);
  for (const id of moduleIds) if (ids.has(id)) errors.push(`module ${id} shares its id with a component`);
  for (const c of components) {
    const card = cards.get(c.id);
    if (!card) { missing.push({ id: c.id, family: c.family, docs: c.docs }); continue; }
    if (card.relation) {   // contract/cards/card.schema.json `relation`: it must name another component (scripts/gate.mjs reads it)
      const target = card.relation.variantOf ?? card.relation.distinctFrom;
      if (!ids.has(target)) errors.push(`cards/${c.id}.json: relation names "${target}", which is not a component`);
      else if (target === c.id) errors.push(`cards/${c.id}.json: relation names the component itself`);
    }
    for (const r of card.related) if (!ids.has(r)) errors.push(`cards/${c.id}.json: related "${r}" is not a component`);
    for (const p of card.parts) if (!c.classes.includes(p.class)) errors.push(`cards/${c.id}.json: part ${p.class} is not a class of ${c.id}`);
    // A variant is an author choice: a value of the component's own attributes or of one of its parts'.
    for (const v of card.variants) {
      const lists = [c.attributes[v.attribute], ...Object.values(c.partAttributes).map((p) => p[v.attribute])].filter(Boolean);
      const values = [...new Set(lists.flat())];
      const where = `cards/${c.id}.json: variant ${v.attribute}="${v.value}"`;
      if (!lists.length) cardProblems.push(c.stateAttributes[v.attribute] ? `${where}: ${v.attribute} is state Fire's scripts set, not a variant` : `${where}: ${v.attribute} is not defined for ${c.id}`);
      else if (!values.includes('*') && !values.includes(v.value)) cardProblems.push(`${where} is not a value the catalogue lists (${values.map((x) => x || '(bare)').join(' | ')})`);
    }
    if (!anchors.has(card.example)) errors.push(`cards/${c.id}.json: example ${card.example} is not a docs section`);
    else c.docs = card.example;
    c.card = card;
  }
  if (cardProblems.length && !allowMissing) errors.push(...cardProblems);
  if (missing.length && !allowMissing) errors.push(`${missing.length} components have no card (run with --allow-missing to build without them); first: ${missing.slice(0, 5).map((m) => m.id).join(', ')}`);

  // Modules: JS-only parts (MODULES in scripts/lib/catalog-assign.mjs), each with a card. Exports come from the source.
  const jsModules = [];
  for (const m of MODULES) {
    const file = path.join(ROOT, m.module);
    if (!fs.existsSync(file)) { errors.push(`module ${m.id}: ${m.module} does not exist`); continue; }
    const src = read(file);
    const exp = new Set();
    for (const x of src.matchAll(/^export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) exp.add(x[1]);
    for (const x of src.matchAll(/^export\s*\{([^}]*)\}/gm)) for (const n of x[1].split(',')) { const name = n.trim().split(/\s+as\s+/).pop(); if (name) exp.add(name); }
    const card = cards.get(m.id);
    if (!card) { errors.push(`module ${m.id}: no card (contract/cards/${m.id}.json)`); continue; }
    for (const r of card.related) if (!ids.has(r)) errors.push(`cards/${m.id}.json: related "${r}" is not a component`);
    if (!anchors.has(card.example)) errors.push(`cards/${m.id}.json: example ${card.example} is not a docs section`);
    if (!card.provenance.includes(m.module)) errors.push(`cards/${m.id}.json: provenance must name ${m.module}`);
    jsModules.push({ id: m.id, name: m.name, module: m.module, exports: [...exp].sort(), docs: card.example, card });
  }
  jsModules.sort((a, b) => a.id.localeCompare(b.id));

  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
  const catalog = {
    fire: pkg.version.replace(/-.*$/, ''),
    components: components.map((c) => ({ id: c.id, name: c.name, family: c.family, kind: c.kind, root: c.root, classes: c.classes, attributes: c.attributes, partAttributes: c.partAttributes, stateAttributes: c.stateAttributes, element: c.element, events: c.events, docs: c.docs, ...(c.card ? { card: c.card } : {}) })),
    modules: jsModules,
    classes: sortKeys(classToId),
    elements,
    events,
    globalAttributes,
    icons: [...(await loadIconNames())].sort(),
    tokens: readTokens(),
    templates: readTemplates(),
  };
  return { catalog, missing, cardProblems, errors, unplacedHooks, unplacedEvidence: [...unplacedEvidence].sort() };
}

const serialise = (o) => JSON.stringify(o, null, 2) + '\n';

async function main() {
  const args = new Set(process.argv.slice(2));
  const allowMissing = args.has('--allow-missing');
  const { catalog, missing, cardProblems, errors, unplacedHooks } = await buildCatalog({ allowMissing });
  if (errors.length) {
    console.error(`build-catalog: ${errors.length} error${errors.length > 1 ? 's' : ''}`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  if (cardProblems.length) console.log(`build-catalog: ${cardProblems.length} card variant${cardProblems.length > 1 ? 's' : ''} the catalogue does not list (see contract/cards/_missing.json):\n  ${cardProblems.join('\n  ')}`);
  if (unplacedHooks.length) console.log(`build-catalog: classes scripts mention that fit no component (not added): ${unplacedHooks.join(' ')}`);
  const files = [[OUT, serialise(catalog)]];
  if (allowMissing) files.push([MISSING, serialise({ note: 'Components that still need a card, and card variants that name a value the catalogue does not list (generated by build-catalog.mjs --allow-missing).', count: missing.length, components: missing, variants: cardProblems })]);
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

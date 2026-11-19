#!/usr/bin/env node
// build-slim-map: writes contract/slim-map.json, what `fire slim` (scripts/slim.mjs) knows about Fire's own sources.
//   node scripts/build-slim-map.mjs           write the file
//   node scripts/build-slim-map.mjs --check   fail when the file is stale
// Read from fire/fire.css (the cascade order), fire/fire.js (the behaviour modules and the exports), fire/js/*.js,
// the stylesheets, contract/catalog.json and wrappers/react/elements.js. Nothing in it is written by hand:
//   css         per stylesheet in fire.css order: its top-level rule count and size (slim refuses a map whose counts
//               no longer match the files)
//   modules     per behaviour module of fire.js: its file, the modules it imports, the components whose classes its
//               code and its helpers' code (string literals and templates, never comments, never selectors) can put
//               on the page at run time, the data-* attributes its code names and those it writes, and two string literals found in no other
//               module (the check looks for them in a production bundle)
//   components  per component: the stylesheets with rules that name one of its classes (with the rule indexes,
//               "12" or "12.3" inside a group), its home (the stylesheet with most of them) and its behaviour module:
//               Fire pairs components/<x>.css with js/<x>.js, so a component whose home is overlays.css belongs to
//               overlays.js. A home with no module of its name (button.css, base.css, skeleton.css) gives the modules
//               that query one of its classes on the page (a selector handed to a query on root or document) and
//               document that class in their header, if any.
//               Other modules that select a class do it inside their own parts (a filter item's icon, a docs menu);
//               counting them would keep the docs kit for every app with a menu.
//   attributes  data-fd-* attribute -> the modules whose code selects it (`[data-fd-x`) or reads dataset.fdX most
//               often, among those whose header documents it when any does
//   exports     every name fire.js exports -> the module it comes from (core, icons, transitions, or a namespace)
//   wrappers    React wrapper components -> the custom element they render
// Run build-catalog first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSource, HOLE } from './lint-markup.mjs';
import { splitCss, selectorsOf, needs, named } from './lib/slim-css.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'contract/slim-map.json');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** The fd- class tokens a module's string literals can put on the page: { classes, prefixes } (a prefix is `fd-chip-`
 *  before a ${…} hole). A class in a selector (`.fd-x`, [class~="fd-x"]) only looks for markup and is not counted:
 *  a component is on the page because the product's markup or some module's markup has it. */
function classTokens(strings) {
  const classes = new Set(), prefixes = new Set();
  for (const { s } of strings) {
    for (const m of s.matchAll(/(?<![\w-])fd-[a-z0-9][\w-]*/g)) {
      if (s[m.index - 1] === '.' || /\[class\s*[~|^$*]?=\s*["']?$/.test(s.slice(Math.max(0, m.index - 12), m.index))) continue;
      if (s[m.index + m[0].length] === HOLE) prefixes.add(m[0]); else classes.add(m[0].replace(/-+$/, ''));
    }
  }
  return { classes, prefixes };
}

/** The data-* attributes a module's code writes (setAttribute('data-x'), dataset.x = …, data-x= in markup it builds),
 *  and `type-sets` when it imports the type sets (fire slim keeps every dial value such a module could set). */
function writes(code, strings, src) {
  const out = new Set();
  const dash = (k) => 'data-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  for (const m of code.matchAll(/(?:setAttribute|toggleAttribute)\(\s*['"](data-[\w-]+)['"]/g)) out.add(m[1]);
  for (const m of code.matchAll(/dataset(?:\.(\w+)|\[['"](\w+)['"]\])\s*=(?!=)/g)) out.add(dash(m[1] || m[2]));
  for (const { s } of strings) if (s.includes('<')) for (const m of s.matchAll(/\s(data-[\w-]+)=/g)) out.add(m[1]);
  if (/from '\.\/typefaces\.js'/.test(src)) out.add('type-sets');
  return [...out].sort();
}

export function build({ check = false } = {}) {
  const catalog = JSON.parse(read('contract/catalog.json'));
  const classOf = new Map(Object.entries(catalog.classes));
  for (const c of catalog.components) if (c.element) classOf.set(c.element, c.id);
  const all = [...classOf.keys()];
  const expand = ({ classes, prefixes }) => {
    const ids = new Set();
    for (const k of classes) if (classOf.get(k)) ids.add(classOf.get(k));
    for (const p of prefixes) for (const k of all) if (k.startsWith(p) && classOf.get(k)) ids.add(classOf.get(k));
    return ids;
  };

  // The cascade: fire.css's imports, in order.
  const order = [...read('fire/fire.css').matchAll(/@import "\.\/([^"]+)"/g)].map((m) => m[1]);
  const css = {}, components = {};
  const comp = (id) => (components[id] ??= { css: {}, owned: {}, modules: [] });
  for (const file of order) {
    const text = read(`fire/${file}`);
    const nodes = splitCss(text);
    css[file] = { rules: nodes.length, bytes: Buffer.byteLength(text) };
    const walk = (list, prefix) => list.forEach((node, i) => {
      const at = prefix + i;
      if (node.children) return walk(node.children, `${at}.`);
      if (node.type !== 'rule') return;
      const ids = new Set();
      for (const s of selectorsOf(node.prelude)) {
        const n = named(needs(s));
        const own = new Set([...n.classes, ...n.tags].map((k) => classOf.get(k)).filter(Boolean));
        for (const id of own) ids.add(id);
        if (own.size === 1) { const [id] = own; comp(id).owned[file] = (comp(id).owned[file] || 0) + 1; }
      }
      for (const id of ids) (comp(id).css[file] ??= []).push(at);
    });
    walk(nodes, '');
  }

  // The behaviour modules, from fire.js.
  const entry = read('fire/fire.js');
  const names = /const modules = \{([^}]+)\}/.exec(entry)[1].split(',').map((s) => s.trim());
  const sources = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'fire/js')).filter((f) => f.endsWith('.js'))) sources[f.slice(0, -3)] = read(`fire/js/${f}`);
  const literals = (src) => scanSource(src, 'lit').strings;
  const counts = new Map();
  for (const src of Object.values(sources)) for (const s of new Set(literals(src).map((x) => x.s))) counts.set(s, (counts.get(s) || 0) + 1);
  const modules = {}, handlers = {}, documents = {}, selects = {};
  // Attributes core.js, icons.js or fire.js itself handles are handled in every slim entry.
  const always = new Set([...scanSource(entry, 'lit').strings.flatMap((x) => [...x.s.matchAll(/\[(data-fd-[\w-]*[a-z0-9])/g)].map((m) => m[1]))]);
  for (const name of ['core', 'icons', ...names]) {
    const src = sources[name];
    const strings = literals(src);
    const header = /^\/\*[\s\S]*?\*\//.exec(src)?.[0] || '';
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    const attrs = new Set([...strings.flatMap((x) => [...x.s.matchAll(/data-[a-z][\w-]*[a-z0-9]/g)].map((m) => m[0]))]);
    const camel = (a) => 'data-' + a.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
    for (const m of code.matchAll(/dataset\.(fd[A-Z]\w*)/g)) attrs.add(camel(m[1]));
    const signature = [...new Set(strings.map((x) => x.s))].filter((s) => /^[\w ,.:;()[\]/-]{18,90}$/.test(s) && / /.test(s) && counts.get(s) === 1).slice(0, 2);
    modules[name] = {
      file: `fire/js/${name}.js`,
      imports: [...src.matchAll(/^import [^;]*? from '\.\/([\w-]+)\.js'/gm)].map((m) => m[1]).filter((m, i, a) => a.indexOf(m) === i),
      components: [...expand(classTokens(strings))].sort(),
      attributes: [...attrs].sort(),
      writes: writes(code, strings, src),
      signature,
    };
    const handled = [...strings.flatMap((x) => [...x.s.matchAll(/\[(data-fd-[\w-]*[a-z0-9])/g)].map((m) => m[1]))];
    for (const m of code.matchAll(/dataset\.(fd[A-Z]\w*)/g)) handled.push(camel(m[1]));
    if (name === 'core' || name === 'icons') { handled.forEach((a) => always.add(a)); continue; }
    for (const a of attrs) if (a.startsWith('data-fd-')) (handlers[a] ??= { selects: {}, any: new Set() }).any.add(name);
    for (const a of handled) { const h = (handlers[a] ??= { selects: {}, any: new Set() }); h.selects[name] = (h.selects[name] || 0) + 1; }
    for (const m of header.matchAll(/(?<![\w-])(fd-[a-z0-9][\w-]*|data-fd-[\w-]*[a-z0-9])/g)) (documents[m[1]] ??= new Set()).add(name);
    // Page-level queries: a selector string handed to a query on root or document (collect(root, '.fd-dots'),
    // root.querySelectorAll('.fd-x'), $$('.fd-x', root), on(document, 'click', '.fd-x', …)).
    const Q = '(?:root|document|doc|scope)', S = '[\'"`]([^\'"`]*)[\'"`]';
    for (const re of [new RegExp(`\\(\\s*${Q}\\s*,\\s*(?:['"][\\w:-]+['"]\\s*,\\s*)?${S}`, 'g'), new RegExp(`\\(\\s*${S}\\s*,\\s*${Q}\\s*[,)]`, 'g'),
      new RegExp(`${Q}\\.(?:querySelector(?:All)?|matches|closest)\\(\\s*${S}`, 'g')]) {
      for (const m of code.matchAll(re)) for (const k of m[1].matchAll(/\.(fd-[a-z0-9][\w-]*)/g)) if (classOf.get(k[1])) (selects[k[1]] ??= new Set()).add(name);
    }
  }
  // Behaviour module of each component: the module paired with its home stylesheet, else (no module of that name)
  // the modules that query and document one of its classes.
  const classesOf = {};
  for (const [k, id] of classOf) if (id) (classesOf[id] ??= []).push(k);
  for (const [id, c] of Object.entries(components)) {
    const home = Object.entries(c.owned).sort((a, b) => b[1] - a[1])[0]?.[0] ?? Object.keys(c.css)[0];
    c.home = home;
    const paired = home && /^components\/([\w-]+)\.css$/.exec(home)?.[1];
    if (paired && modules[paired] && names.includes(paired)) c.modules = [paired];
    else c.modules = [...new Set(classesOf[id].flatMap((k) => [...(selects[k] || [])].filter((m) => documents[k]?.has(m))))];
  }
  const attributes = {};
  for (const [a, h] of Object.entries(handlers)) {
    // The modules that select it most (a module that selects it once does so inside its own parts), among those
    // whose header documents it when any does; with no selector, every module that names it.
    let by = Object.keys(h.selects).length ? Object.keys(h.selects) : [...h.any];
    const doc = by.filter((m) => documents[a]?.has(m));
    if (doc.length) by = doc;
    const top = Math.max(...by.map((m) => h.selects[m] || 0));
    attributes[a] = always.has(a) ? [] : by.filter((m) => (h.selects[m] || 0) === top).sort((x, y) => names.indexOf(x) - names.indexOf(y));
  }
  // fire.js's own listener (copy buttons) is part of every slim entry.
  const exportsMap = { init: 'fire' };
  for (const m of sources.core.matchAll(/^export (?:const|function|async function) (\$\$?|\w+)/gm)) exportsMap[m[1]] = 'core';
  for (const m of entry.matchAll(/^export \{([^}]+)\} from '\.\/js\/([\w-]+)\.js'/gm)) for (const n of m[1].split(',')) exportsMap[n.trim()] = m[2];
  for (const n of /^export \{ ([^}]+) \};$/m.exec(entry)[1].split(',')) exportsMap[n.trim()] = n.trim();
  const wrappers = {};
  for (const m of read('wrappers/react/elements.js').matchAll(/export const (Fire\w+) = createComponent\(\{[^}]*?tagName: '(fd-[\w-]+)'/g)) wrappers[m[1]] = m[2];

  // A module's helpers (initial.js, palettes.js, typefaces.js…: imported, not behaviour modules of their own) build
  // markup on its behalf: what their code names counts as the module's.
  const helperIds = (name, seen = new Set()) => {
    for (const i of [...sources[name].matchAll(/^import [^;]*? from '\.\/([\w-]+)\.js'/gm)].map((m) => m[1])) {
      if (names.includes(i) || i === 'core' || i === 'icons' || seen.has(i)) continue;
      seen.add(i);
      for (const id of expand(classTokens(literals(sources[i])))) seen.add(`#${id}`);
      helperIds(i, seen);
    }
    return [...seen].filter((x) => x.startsWith('#')).map((x) => x.slice(1));
  };
  for (const name of names) modules[name].components = [...new Set([...modules[name].components, ...helperIds(name)])].sort();
  const map = {
    fire: catalog.fire,
    generated: 'by scripts/build-slim-map.mjs from Fire\'s own sources; do not edit',
    order, css, modules: Object.fromEntries(names.map((n) => [n, modules[n]])), helpers: { core: modules.core, icons: modules.icons },
    components: Object.fromEntries(Object.keys(components).sort().map((id) => [id, { home: components[id].home, modules: components[id].modules, css: components[id].css }])),
    attributes: Object.fromEntries(Object.keys(attributes).sort().map((a) => [a, attributes[a]])),
    exports: exportsMap, wrappers,
  };
  const text = JSON.stringify(map, null, 1) + '\n';
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (check) {
    if (have !== text) { console.error('build-slim-map: contract/slim-map.json is stale: run node scripts/build-slim-map.mjs'); return 1; }
    console.log('build-slim-map: up to date');
    return 0;
  }
  if (have !== text) fs.writeFileSync(OUT, text);
  console.log(`build-slim-map: contract/slim-map.json (${Object.keys(map.components).length} components, ${names.length} modules)`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = build({ check: process.argv.includes('--check') });

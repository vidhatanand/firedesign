#!/usr/bin/env node
// fire find: search Fire by what a part is for.
//   node scripts/find.mjs "approve a request" [--surface app|website|phone|email] [--data record|list|series|form|text]
//                         [--kind component|pattern|section|template|module] [--json] [--limit 5]
// --json results carry id, kind, family, surfaces, score, why, job, use, instead, docs and picture (a path, relative to the package root, to the PNG of the part; modules have none).
// Each result prints its surfaces. With --surface, a line says when parts for other surfaces match the query clearly
// better (to stderr with --json, so stdout stays the array; each JSON result carries `surfaces`).
// Reads contract/index.json (node scripts/build-index.mjs builds it). No dependencies, no network.
//
// Score, per entry, summed over the query's words (stemmed, stop words dropped). A word counts at full weight; a word
// reached through the synonym table counts at 0.6. Every word is weighted by how rare it is in the index (idf).
//   name or id equals the word            10      aka phrase equals the whole query     12
//   a word of an aka phrase                5      query appears inside job/use-when      6 (phrase bonus)
//   a word of the name or id               6      a word of the job                      3
//   a word of the use-when sentence        2      a word of the family                   1
// Entries must match at least half the query's words (--surface, --data and --kind filter first).
// Ties (within 5%) go to the larger unit: template, then section, then pattern, then component, then layout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const INDEX = path.join(HERE, '..', 'contract', 'index.json');

const STOP = new Set('a an the of to for in on at by with and or from into is are be it its this that these those my your our me i we you what which how do does can should want need make get set some any all show see when where there then than as up out about via just use using'.split(' '));

// Words an agent says that Fire says differently. Each row is one meaning; any word in a row reaches the others.
const SYNONYMS = [
  ['approve', 'decide', 'confirm', 'allow', 'permit', 'accept', 'authorize', 'authorise'],
  ['toggle', 'switch', 'flip'],
  ['snackbar', 'toast', 'notification', 'flash'],
  ['modal', 'dialog', 'popup', 'lightbox', 'overlay'],
  ['dropdown', 'select', 'combobox', 'menu'],
  ['pick', 'choose', 'select', 'picker'],
  ['two', 'three', 'four', 'five', 'few', 'several'],
  ['approve', 'approval', 'approver'],
  ['notify', 'notification', 'toast', 'announce'],
  ['multiline', 'textarea', 'paragraph'],
  ['delete', 'remove', 'destroy', 'destructive', 'erase', 'drop'],
  ['login', 'signin', 'authenticate', 'auth', 'sign', 'signup'],
  ['signup', 'register', 'auth'],
  ['chart', 'graph', 'plot', 'trend', 'visualization'],
  ['sparkline', 'trend', 'minichart'],
  ['table', 'grid', 'datagrid', 'spreadsheet', 'rows'],
  ['tab', 'tabs'],
  ['spinner', 'loader', 'loading', 'busy', 'wait'],
  ['progress', 'progressbar', 'completion'],
  ['tooltip', 'hint', 'hover'],
  ['sidebar', 'drawer', 'sidenav', 'rail'],
  ['breadcrumb', 'crumbs', 'path', 'trail'],
  ['badge', 'pill', 'label', 'chip', 'tag'],
  ['alert', 'banner', 'warning', 'callout'],
  ['copy', 'clipboard'],
  ['upload', 'attach', 'dropzone', 'drop'],
  ['search', 'find', 'lookup', 'query'],
  ['filter', 'narrow', 'refine', 'facet'],
  ['pagination', 'paginate', 'pager', 'page'],
  ['skeleton', 'placeholder', 'shimmer'],
  ['empty', 'blank', 'nothing', 'zero'],
  ['stepper', 'wizard', 'steps', 'step'],
  ['avatar', 'profile', 'userpic'],
  ['status', 'state', 'health'],
  ['slider', 'range', 'scrubber'],
  ['textbox', 'input', 'textfield', 'field'],
  ['checkbox', 'tick', 'check'],
  ['radio', 'option'],
  ['key', 'secret', 'token', 'password', 'credential'],
  ['kpi', 'metric', 'stat', 'number', 'figure'],
  ['dashboard', 'overview', 'home'],
  ['setting', 'preference', 'config', 'configure'],
  ['list', 'rows', 'collection'],
  ['code', 'snippet', 'codeblock'],
  ['json', 'payload', 'response'],
  ['agent', 'assistant', 'bot', 'ai'],
  ['log', 'logs', 'stream', 'tail', 'console'],
  ['history', 'activity', 'audit', 'timeline'],
  ['date', 'calendar', 'daterange'],
  ['phone', 'mobile'],
  ['error', 'failure', 'problem', 'mistake'],
  ['faq', 'accordion', 'collapse', 'expand', 'disclosure'],
  ['pricing', 'plan', 'billing', 'subscription'],
  ['navigation', 'nav', 'navbar', 'menubar', 'topbar', 'header'],
  ['undo', 'revert'],
  ['hero', 'banner', 'masthead'],
  ['login', 'sign-in'],
];

const SURFACE_ORDER = ['app', 'website', 'phone', 'email'];
const surfaceList = (list) => [...list].sort((a, b) => SURFACE_ORDER.indexOf(a) - SURFACE_ORDER.indexOf(b));

const KIND_RANK = { template: 0, section: 0.5, pattern: 1, component: 2, layout: 3, module: 4 };
const WEIGHT = { id: 10, aka: 5, akaPhrase: 12, name: 6, job: 3, use: 2, family: 1, phrase: 6, syn: 0.6 };

export function stem(w) {
  w = w.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.length <= 3) return w;
  const rules = [['ies', 'y'], ['sses', 'ss'], ['al', ''], ['ing', ''], ['ed', ''], ['es', ''], ['s', ''], ['ly', '']];
  const fin = (r) => (r.length > 4 && r.endsWith('e') ? r.slice(0, -1) : r);
  for (const [suf, rep] of rules) {
    if (w.endsWith(suf) && w.length - suf.length + rep.length >= 3) {
      if (suf === 's' && (w.endsWith('ss') || w.endsWith('us') || w.endsWith('is'))) continue;
      if (suf === 'al' && w.length < 7) continue;
      if (suf === 'es' && !/(s|x|z|ch|sh)es$/.test(w)) continue;
      let r = w.slice(0, w.length - suf.length) + rep;
      if (suf === 'ing' || suf === 'ed') { if (/(.)\1$/.test(r) && !/(ss|ll)$/.test(r)) r = r.slice(0, -1); }
      return fin(r);
    }
  }
  return fin(w);
}

export const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// Phrases that are one word to an agent.
const PHRASES = [[/multi[- ]?line/g, 'multiline'], [/sign[- ]?(in|on)\b/g, 'signin'], [/log[- ]?in\b/g, 'login'], [/drag (and|&) drop/g, 'dropzone'], [/drop[- ]?down/g, 'dropdown']];
const norm = (s) => PHRASES.reduce((t, [re, to]) => t.replace(re, to), String(s || '').toLowerCase());
const toks = (s) => words(norm(s)).filter((w) => !STOP.has(w)).map(stem).filter(Boolean);

const synMap = new Map();
for (const row of SYNONYMS) for (const a of row) {
  const k = stem(a);
  if (!synMap.has(k)) synMap.set(k, new Set());
  for (const b of row) if (stem(b) !== k) synMap.get(k).add(stem(b));
}

export function load(file = INDEX) {
  const idx = JSON.parse(fs.readFileSync(file, 'utf8'));
  // the picture rule is written once at the top of the index; every result carries the path it gives
  const rule = idx.pictures;
  if (rule) for (const e of idx.entries) if (!rule.none.includes(e.kind)) e.picture = rule.path.replace('{kind}', e.kind).replace('{id}', e.id);
  const docs = idx.entries.map((e) => ({
    e,
    id: toks(e.id.replace(/-/g, ' ')), name: toks(e.name),
    aka: e.aka.map((a) => ({ text: words(a).join(' '), t: toks(a) })),
    job: toks(e.job), use: toks(e.use), family: toks(e.family),
    jobText: words(e.job).join(' '), useText: words(e.use).join(' '),
  }));
  const df = new Map();
  for (const d of docs) for (const t of new Set([...d.id, ...d.name, ...d.aka.flatMap((a) => a.t), ...d.job, ...d.use])) df.set(t, (df.get(t) || 0) + 1);
  return { idx, docs, df, n: docs.length };
}

export function search(db, query, opts = {}) {
  const { surface, data, kind, limit = 5 } = opts;
  const qw = words(norm(query));
  const q = [...new Set(toks(query))];
  const qPhrase = qw.filter((w) => !STOP.has(w)).join(' ');
  const qFull = qw.join(' ');
  if (!q.length) return [];
  const idf = (t) => 1 + Math.log(db.n / (1 + (db.df.get(t) || 0))) / 1.5;
  const out = [];
  for (const d of db.docs) {
    const e = d.e;
    if (surface && !e.surfaces.includes(surface)) continue;
    if (data && !e.data.includes(data)) continue;
    if (kind && !(e.kind === kind || (kind === 'component' && e.kind === 'layout'))) continue;
    let score = 0, matched = 0;
    const why = [];
    const add = (pts, label) => { score += pts; why.push(label); };
    for (const t of q) {
      const variants = [[t, 1], ...[...(synMap.get(t) || [])].map((s) => [s, WEIGHT.syn])];
      let best = 0, bestWhy = null;
      for (const [v, m] of variants) {
        const w = idf(v) * m;
        const hit = (pts, label) => { if (pts * w > best) { best = pts * w; bestWhy = m < 1 ? `${label} "${v}" (synonym of "${t}")` : `${label} "${v}"`; } };
        if (d.id.includes(v) && d.id.length === 1) hit(WEIGHT.id, 'id');
        else if (d.id.includes(v)) hit(WEIGHT.name, 'id');
        if (d.name.includes(v)) hit(d.name.length === 1 ? WEIGHT.id : WEIGHT.name, 'name');
        for (const a of d.aka) if (a.t.includes(v)) hit(a.t.length === 1 ? WEIGHT.id - 2 : WEIGHT.aka, 'aka');
        if (d.job.includes(v)) hit(WEIGHT.job, 'job');
        if (d.use.includes(v)) hit(WEIGHT.use, 'use-when');
        if (d.family.includes(v)) hit(WEIGHT.family, 'family');
      }
      if (best) { score += best; matched++; why.push(bestWhy); }
    }
    if (!matched) continue;
    if (matched < Math.ceil(q.length / 2)) continue;
    // Whole-query matches
    if (d.aka.some((a) => a.text === qFull || a.text === qPhrase)) add(WEIGHT.akaPhrase, `aka equals "${qPhrase}"`);
    else if (q.length > 1) {
      const a = d.aka.find((a) => a.text.includes(qPhrase) || qPhrase.includes(a.text) && a.t.length > 1);
      if (a) add(WEIGHT.phrase, `aka "${a.text}"`);
    }
    if (q.length > 1 && (d.jobText.includes(qPhrase) || d.useText.includes(qPhrase))) add(WEIGHT.phrase, 'phrase in job or use-when');
    if (d.id.join(' ') === q.join(' ') || d.name.join(' ') === q.join(' ')) add(WEIGHT.akaPhrase, 'name equals the query');
    for (let i = 0; i + 1 < qw.length; i++) {
      if (STOP.has(qw[i]) || STOP.has(qw[i + 1])) continue;
      const bi = `${qw[i]} ${qw[i + 1]}`;
      if (d.jobText.includes(bi) || d.useText.includes(bi) || d.aka.some((a) => a.text.includes(bi))) add(3, `"${bi}"`);
    }
    // Coverage: matching all words beats matching one.
    score *= 0.6 + 0.4 * (matched / q.length);
    out.push({ ...e, score: Math.round(score * 100) / 100, why: [...new Set(why)].join('; ') });
  }
  out.sort((a, b) => {
    const top = Math.max(a.score, b.score);
    if (Math.abs(a.score - b.score) > top * 0.05) return b.score - a.score;
    return KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.score - a.score || a.id.localeCompare(b.id);
  });
  return out.slice(0, limit);
}

// With --surface: parts that match the query clearly better than anything on that surface but belong to other surfaces.
// "Better" is a score a fifth above the best match on the surface (any match at all when the surface has none).
// Returns at most `max` entries, best first; [] without --surface or when the surface already has the best answer.
export function betterElsewhere(db, query, opts = {}, onSurface = null, max = 3) {
  if (!opts.surface) return [];
  const here = onSurface || search(db, query, { ...opts, limit: 5 });
  const floor = here.length ? here[0].score * 1.2 : 0;
  const all = search(db, query, { ...opts, surface: undefined, limit: db.n });
  return all.filter((r) => !r.surfaces.includes(opts.surface) && r.score > floor).slice(0, max);
}
export const betterNote = (surface, list, hasHere = true) => list.length
  ? `${list.length} ${hasHere ? 'better ' : ''}match${list.length === 1 ? '' : 'es'} ${list.length === 1 ? 'exists' : 'exist'} for other surfaces: ${list.map((r) => `${r.id} [${r.kind}] (${surfaceList(r.surfaces).join(', ')})`).join('; ')}. Drop --surface ${surface} to see them.`
  : '';

function main(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (['--surface', '--data', '--kind', '--limit'].includes(a)) args[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) { console.error(`fire find: unknown option ${a}`); return 2; }
    else args._.push(a);
  }
  const query = args._.join(' ').trim();
  if (args.help || !query) {
    console.log('usage: fire find "<what you need>" [--surface app|website|phone|email] [--data record|list|series|form|text]\n                [--kind component|pattern|section|template|module] [--json] [--limit 5]');
    return query || args.help ? 0 : 2;
  }
  const enums = { surface: ['app', 'website', 'phone', 'email'], data: ['record', 'list', 'series', 'form', 'text', 'none'], kind: ['component', 'pattern', 'section', 'template', 'module'] };
  for (const k of Object.keys(enums)) if (args[k] && !enums[k].includes(args[k])) { console.error(`fire find: --${k} is one of ${enums[k].join(', ')}`); return 2; }
  const limit = args.limit === undefined ? 5 : Number(args.limit);
  if (!Number.isInteger(limit) || limit < 1) { console.error('fire find: --limit is a positive whole number'); return 2; }
  if (!fs.existsSync(INDEX)) { console.error('fire find: contract/index.json is missing; run node scripts/build-index.mjs'); return 2; }
  const db = load();
  const opts = { surface: args.surface, data: args.data, kind: args.kind };
  const res = search(db, query, { ...opts, limit });
  // The note needs the unfiltered ranking against the best match on the surface (not only the first `limit`).
  const elsewhere = betterElsewhere(db, query, opts, res.length ? res : []);
  const note = betterNote(args.surface, elsewhere, res.length > 0);
  if (args.json) {
    console.log(JSON.stringify(res.map(({ id, kind, family, surfaces, score, why, job, use, not, docs, picture }) => ({ id, kind, family, surfaces: surfaceList(surfaces), score, why, job, use, instead: not, docs, ...(picture ? { picture } : {}) })), null, 2));
    if (note) console.error(note);   // stdout stays the plain array
    return 0;
  }
  if (!res.length) { console.log(`No match for "${query}". Try other words (what it does, not what it is called), or drop a filter.`); if (note) console.log(note); return 1; }
  for (const r of res) {
    console.log(`${r.id}  [${r.kind}]  ${surfaceList(r.surfaces).join(' · ')}  ${r.score}`);
    console.log(`  matched: ${r.why}`);
    console.log(`  use when: ${r.use}`);
    if (r.not.length) console.log(`  instead of: see ${r.not.join(', ')} when it does not fit`);
    console.log(`  docs: ${r.docs}`);
    if (r.picture) console.log(`  picture: ${r.picture}`);
  }
  if (note) console.log(note);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));

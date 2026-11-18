#!/usr/bin/env node
// The near-duplicate gate: every component, pattern and template is compared with its peers, and two entries that do the
// same job in nearly the same way fail unless one card says how they differ.
//
//   node scripts/gate.mjs                 recompute the fingerprints, write contract/fingerprints.json, run the rules
//   node scripts/gate.mjs --check         recompute and compare with contract/fingerprints.json, then run the rules (CI)
//   node scripts/gate.mjs --no-look       skip rendering: structural fingerprints and job text only; the look
//                                         hashes already stored are used as they are (a new entry has none and is flagged)
//   node scripts/gate.mjs --calibrate     print the distribution of every score and the thresholds' margins
//   node scripts/gate.mjs --probe <file.html> [--as templates/<name>.html]
//                                         compare an unpublished page with every template (a candidate, before you add it)
//
// WHAT IS COMPARED (three pools; entries are only ever compared with entries of the same pool)
//   templates   the 24 files in templates/ (job: the catalogue's templates[].job)
//   specimens   every docs .doc-specimen with at least MIN_NODES Fire nodes (the pattern-sized ones; a lone button is not a
//               pattern). Two specimens of the same component are one component showing its variants and are never
//               compared: same docs page and first word of the section id (pipeline, pipeline-small, pipeline-vertical), or a shared top-level component.
//   components  the 142 catalogue entries (job: the card's job). Their markup is the specimens above; here the job
//               sentence itself is compared, as a bag of content words.
// A pair is FLAGGED when any of these holds:
//   structure >= STRUCT   fingerprint.mjs structuralSimilarity (templates, specimens)
//   look      <= LOOK     fingerprint.mjs lookDistance, the mean over 1440 and 375 (templates, specimens); only when both
//                         hashes have at least MIN_BITS set bits at both widths (a nearly empty picture says nothing)
//   job       >= JOB      content-word Jaccard of the two job sentences (components)
// A flagged pair PASSES when either side declares the other through `relation` (see below). Otherwise the gate fails
// and says which two to look at, and what to do: reuse the first, or declare the relation.
//
// RELATION  { "variantOf" | "distinctFrom": "<other id>", "because": "one sentence on when you would use this instead" }
//   Components and patterns: the optional `relation` field of contract/cards/<id>.json. Specimens belong to the component
//   whose card `example` points at their docs section. Templates have no component card: they declare the same object in
//   contract/cards/templates/<slug>.json ({ "id": "<slug>", "relation": { … } }), <slug> being the file name without .html.
//   variantOf: this is a form of the other one (use the other unless the reason holds); distinctFrom: they look alike and
//   are not the same thing. The gate treats both alike; the words are for the reader. `because` is checked for length only.
//
// THE THRESHOLDS are measured, not guessed: `--calibrate` prints the highest structural similarity, the lowest look
// distance and the highest job similarity among today's non-exempt pairs, and the thresholds sit between those and the
// near-copy (scripts/test/gate.test.mjs builds one from templates/logs.html and checks that it fails).
//
// LOOK FINGERPRINTS are rendered in Chromium (playwright-core) at 1440 and 375 wide, light theme, default palette,
// animations off, and hashed (scripts/fingerprint.mjs). Fonts, anti-aliasing and the scripted demos (the support
// chat types) move a hash by a few percent between runs, so --check accepts a stored hash within DRIFT of the recomputed
// one; a layout change moves it by far more, and the normal run rewrites the file.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { ROOT, read } from './lib/source.mjs';
import { bitCount, parseTree, structuralFingerprint, structuralSimilarity, dHash, hashDistance, lookDistance } from './fingerprint.mjs';

export const THRESHOLDS = { STRUCT: 0.7, LOOK: 0.06, JOB: 0.6, DRIFT: 0.12, MIN_NODES: 8, MIN_BITS: 24 };
const OUT = path.join(ROOT, 'contract/fingerprints.json');
const VIEWPORTS = [['w1440', 1440, 900], ['w375', 375, 812]];
const RELATION_KEYS = ['variantOf', 'distinctFrom'];

// ---------------------------------------------------------------- entries

const STOP = new Set('a an the of to and or for in on with so is it its that this from by as at be are can into one more your you their them without while when who what how'.split(' '));
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');
export const jobTokens = (job) => new Set((job.toLowerCase().match(/[a-z]+/g) || []).filter((w) => !STOP.has(w) && w.length > 2).map(stem));
export function jobSimilarity(a, b) {
  const x = jobTokens(a), y = jobTokens(b);
  let n = 0;
  for (const w of x) if (y.has(w)) n++;
  return x.size + y.size - n ? n / (x.size + y.size - n) : 0;
}

/** Template entries: { id: slug, job, file, html }. */
export function templateEntries(catalog) {
  return catalog.templates.map((t) => ({ id: path.basename(t.path, '.html'), job: t.job, file: t.path, html: read(path.join(ROOT, t.path)) }));
}

/** Specimen entries from every docs page: { id: "page#section/n", page, section, ordinal, tree }. n counts within the section. */
export function specimenEntries() {
  const out = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'docs')).filter((n) => n.endsWith('.html')).sort()) {
    const tree = parseTree(read(path.join(ROOT, 'docs', f)));
    let ordinal = 0;
    const perSection = {};
    const walk = (el, section) => {
      const cl = (el.attrs.class || '').split(/\s+/);
      if (cl.includes('doc-section')) section = el.attrs.id || section;
      if (cl.includes('doc-specimen')) {
        const n = perSection[section] = (perSection[section] ?? -1) + 1;
        out.push({ id: `${f}#${section}/${n}`, page: f, section, ordinal: ordinal++, tree: el });
        return;
      }
      el.kids.forEach((k) => walk(k, section));
    };
    walk(tree, null);
  }
  return out;
}

const topLabels = (fp) => Object.keys(fp.features).filter((k) => k.startsWith('d:') && k.endsWith('@0')).map((k) => k.slice(2, -2));
/** True when two specimens are one component's variants and must not be compared. */
export function sameFamily(a, b) {
  if (a.page === b.page && a.section.split('-')[0] === b.section.split('-')[0]) return true;
  const A = topLabels(a.fp), B = topLabels(b.fp);
  return A.some((x) => B.includes(x));
}

// ---------------------------------------------------------------- fingerprints

export function structuralFingerprints(catalog) {
  const t = {}, s = {};
  for (const e of templateEntries(catalog)) { const fp = structuralFingerprint(e.html, catalog); t[e.id] = { job: e.job, nodes: fp.nodes, features: sortKeys(fp.features) }; }
  for (const e of specimenEntries()) {
    const fp = structuralFingerprint(e.tree, catalog);
    if (fp.nodes >= THRESHOLDS.MIN_NODES) s[e.id] = { nodes: fp.nodes, features: sortKeys(fp.features) };
  }
  return { templates: t, specimens: s };
}
const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
/** A static server over the worktree on a free port; `overrides` maps a URL path to markup served instead of the file. */
export async function serve(overrides = {}) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (overrides[u] != null) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(overrides[u]); }
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}.fd-ascii{visibility:hidden!important}'   // the ASCII art animates with the clock: it would make the hash depend on when it was taken;
async function openPage(browser, origin, url, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'light', reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('fd-theme', 'light'); } catch {} });
  await page.goto(origin + url, { waitUntil: 'load' });
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle').catch(() => {});
  // wait for scripts to finish building the page: the first moment two frames 200 ms apart are the same, at most 12 tries
  let prev = null;
  for (let i = 0; i < 12; i++) {
    const cur = (await page.screenshot({ type: 'png' })).toString('base64');
    if (cur === prev) break;
    prev = cur; await page.waitForTimeout(200);
  }
  return { page, close: () => ctx.close() };
}

/**
 * Look hashes. `wanted`: { templates: [{id, url}], specimens: [entry] }. Returns { templates: {id: {w1440, w375}}, specimens: {…} }.
 * `overrides` serves unpublished markup at a URL (used by --probe and the tests).
 */
export async function lookFingerprints(wanted, overrides = {}) {
  const { chromium } = await import('playwright-core');
  const srv = await serve(overrides);
  const browser = await chromium.launch();
  const out = { templates: {}, specimens: {} };
  try {
    const jobs = [];
    for (const [key, w, h] of VIEWPORTS) {
      for (const t of wanted.templates) jobs.push(async () => {
        const { page, close } = await openPage(browser, srv.origin, '/' + t.url, w, h);
        (out.templates[t.id] ||= {})[key] = dHash(await page.screenshot({ fullPage: true }));
        await close();
      });
      const byPage = {};
      for (const s of wanted.specimens) (byPage[s.page] ||= []).push(s);
      for (const [pg, list] of Object.entries(byPage)) jobs.push(async () => {
        const { page, close } = await openPage(browser, srv.origin, `/docs/${pg}`, w, h);
        const boxes = page.locator('.doc-specimen');
        for (const s of list) {
          const box = boxes.nth(s.ordinal);
          await box.scrollIntoViewIfNeeded();
          (out.specimens[s.id] ||= {})[key] = dHash(await box.screenshot());
        }
        await close();
      });
    }
    let next = 0;   // four pages at a time
    await Promise.all(Array.from({ length: 4 }, async () => { while (next < jobs.length) await jobs[next++](); }));
  } finally { await browser.close(); await srv.close(); }
  return out;
}

export async function computeAll({ look = true } = {}) {
  const catalog = JSON.parse(read(path.join(ROOT, 'contract/catalog.json')));
  const st = structuralFingerprints(catalog);
  let lk = { templates: {}, specimens: {} };
  if (look) {
    const specs = specimenEntries().filter((e) => st.specimens[e.id]);
    lk = await lookFingerprints({ templates: templateEntries(catalog).map((t) => ({ id: t.id, url: t.file })), specimens: specs });
  }
  return { catalog, st, lk };
}

// ---------------------------------------------------------------- rules

/** A look is compared only when both viewport hashes carry enough set bits: two nearly empty pictures always look alike. */
const informative = (look, T) => !!look?.w1440 && !!look?.w375 && bitCount(look.w1440) >= T.MIN_BITS && bitCount(look.w375) >= T.MIN_BITS;

/** Cards: components (contract/cards/<id>.json) and templates (contract/cards/templates/<slug>.json). */
export function readRelations() {
  const rel = { components: {}, templates: {}, examples: {} };
  const dir = path.join(ROOT, 'contract/cards');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'card.schema.json' && n !== '_missing.json')) {
    const c = JSON.parse(read(path.join(dir, f)));
    if (c.relation) rel.components[c.id] = c.relation;
    if (c.example) rel.examples[c.example.replace(/^docs\//, '')] = c.id;
  }
  const tdir = path.join(dir, 'templates');
  if (fs.existsSync(tdir)) for (const f of fs.readdirSync(tdir).filter((n) => n.endsWith('.json'))) {
    const c = JSON.parse(read(path.join(tdir, f)));
    if (c.relation) rel.templates[c.id] = c.relation;
  }
  return rel;
}
const relationTarget = (r) => r && RELATION_KEYS.map((k) => r[k]).find(Boolean);
const relationOk = (r) => r && RELATION_KEYS.filter((k) => r[k]).length === 1 && typeof r.because === 'string' && r.because.length >= 20 && /[.!?]$/.test(r.because.trim());

/** The component id that owns a specimen: the card whose `example` is its docs section. */
function ownerOf(spec, relations) {
  const [page, rest] = spec.id.split('#');
  return relations.examples[`${page}#${rest.split('/')[0]}`] || null;
}

/**
 * Apply the rules. `fp`: { templates: {id: {job, features, nodes}}, specimens: {…} }; `look`: same shape with hashes.
 * Returns { violations: [string], pairs: [{pool, a, b, struct, look, job}], problems: [string] }.
 */
export function evaluate({ catalog, st, lk, relations, thresholds = THRESHOLDS }) {
  const T = thresholds, violations = [], problems = [], pairs = [];
  // every entry has a job
  for (const c of catalog.components) if (!c.card?.job) problems.push(`${c.id}: no job (needs a card)`);
  for (const t of catalog.templates) if (!t.job) problems.push(`${t.path}: no job`);

  const declared = (pool, a, b) => {
    const ra = pool === 'templates' ? relations.templates[a.id] : relations.components[a.owner];
    const rb = pool === 'templates' ? relations.templates[b.id] : relations.components[b.owner];
    const ta = pool === 'templates' ? a.id : a.owner, tb = pool === 'templates' ? b.id : b.owner;
    return (relationOk(ra) && relationTarget(ra) === tb) || (relationOk(rb) && relationTarget(rb) === ta);
  };
  const compare = (pool, entries, extra) => {
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (extra?.skip?.(a, b)) continue;
      const s = structuralSimilarity(a, b);
      const l = informative(a.look, T) && informative(b.look, T) ? lookDistance(a.look, b.look) : null;
      const reasons = [];
      if (s >= T.STRUCT) reasons.push(`structure ${s.toFixed(2)} >= ${T.STRUCT}`);
      if (l != null && l <= T.LOOK) reasons.push(`look distance ${l.toFixed(3)} <= ${T.LOOK}`);
      pairs.push({ pool, a: a.id, b: b.id, struct: s, look: l });
      if (reasons.length && !declared(pool, a, b)) violations.push(`${pool}: ${a.id} and ${b.id} are near-duplicates (${reasons.join('; ')}). ${hint(pool, a, b)}`);
    }
  };
  const hint = (pool, a, b) => pool === 'templates'
    ? `Use one of them, or add contract/cards/templates/${b.id}.json with {"id": "${b.id}", "relation": {"variantOf"|"distinctFrom": "${a.id}", "because": "…"}}.`
    : `Use one, or give the card of ${b.owner || 'the second one'} a relation naming ${a.owner || 'the first'} (needs a card whose "example" is the docs section).`;

  compare('templates', Object.entries(st.templates).map(([id, f]) => ({ id, features: f.features, look: lk.templates[id] })));
  compare('specimens', Object.entries(st.specimens).map(([id, f]) => {
    const e = { id, features: f.features, look: lk.specimens[id], owner: null };
    e.owner = ownerOf(e, relations);
    e.page = id.split('#')[0]; e.section = id.split('#')[1].split('/')[0];
    return e;
  }), { skip: (a, b) => sameFamily({ ...a, fp: a }, { ...b, fp: b }) || (a.owner && a.owner === b.owner) });
  // components: the job sentences
  const comps = catalog.components.filter((c) => c.card?.job);
  for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
    const a = comps[i], b = comps[j];
    const jb = jobSimilarity(a.card.job, b.card.job);
    pairs.push({ pool: 'components', a: a.id, b: b.id, job: jb });
    if (jb < T.JOB) continue;
    const ok = (relationOk(a.card.relation) && relationTarget(a.card.relation) === b.id) || (relationOk(b.card.relation) && relationTarget(b.card.relation) === a.id);
    if (!ok) violations.push(`components: ${a.id} and ${b.id} have near-identical jobs (similarity ${jb.toFixed(2)} >= ${T.JOB}): "${a.card.job}" / "${b.card.job}". Merge them, or give one card relation: { "variantOf"|"distinctFrom": "<other>", "because": "when you would use this instead." }.`);
  }
  // relations must name real entries and carry a reason
  for (const [id, r] of Object.entries(relations.components)) {
    if (!relationOk(r)) problems.push(`cards/${id}.json: relation needs exactly one of variantOf / distinctFrom and a "because" sentence of at least 20 characters`);
    else if (!catalog.components.some((c) => c.id === relationTarget(r))) problems.push(`cards/${id}.json: relation names "${relationTarget(r)}", which is not a component`);
    else if (relationTarget(r) === id) problems.push(`cards/${id}.json: relation names itself`);
  }
  for (const [id, r] of Object.entries(relations.templates)) {
    if (!relationOk(r)) problems.push(`cards/templates/${id}.json: relation needs exactly one of variantOf / distinctFrom and a "because" sentence of at least 20 characters`);
    else if (!catalog.templates.some((t) => path.basename(t.path, '.html') === relationTarget(r))) problems.push(`cards/templates/${id}.json: relation names "${relationTarget(r)}", which is not a template`);
  }
  return { violations, problems, pairs };
}

// ---------------------------------------------------------------- stored file

export function storedShape({ catalog, st, lk }) {
  const mk = (pool) => Object.fromEntries(Object.entries(st[pool]).map(([id, f]) => [id, { ...(f.job ? { job: f.job } : {}), nodes: f.nodes, look: lk[pool][id] || null, features: f.features }]));
  return { fire: catalog.fire, thresholds: THRESHOLDS, look: { viewports: { w1440: 1440, w375: 375 }, theme: 'light', hash: 'dHash 17x16, 256 bits' }, templates: mk('templates'), specimens: mk('specimens') };
}

function diffStored(stored, fresh) {
  const out = [];
  for (const pool of ['templates', 'specimens']) {
    const a = stored[pool] || {}, b = fresh[pool];
    for (const id of Object.keys(b)) if (!a[id]) out.push(`${pool}/${id}: not in fingerprints.json`);
    for (const id of Object.keys(a)) if (!b[id]) out.push(`${pool}/${id}: in fingerprints.json but no longer exists`);
    for (const id of Object.keys(b)) {
      if (!a[id]) continue;
      if (JSON.stringify(a[id].features) !== JSON.stringify(b[id].features)) out.push(`${pool}/${id}: structure changed`);
      for (const k of ['w1440', 'w375']) {
        const x = a[id].look?.[k], y = b[id].look?.[k];
        if (!y) continue;   // not rendered this run
        if (!x) out.push(`${pool}/${id}: no stored look hash`);
        else if (hashDistance(x, y) > THRESHOLDS.DRIFT) out.push(`${pool}/${id}: look changed at ${k} (${hashDistance(x, y).toFixed(3)} > drift ${THRESHOLDS.DRIFT})`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- calibration and CLI

function calibrate(res) {
  const rows = (pool, key, dir) => res.pairs.filter((p) => p.pool === pool && p[key] != null).sort((x, y) => dir * (y[key] - x[key]));
  const show = (title, list, key, n = 5) => { console.log(`\n${title}`); list.slice(0, n).forEach((p) => console.log(`  ${p[key].toFixed(3)}  ${p.a}  ${p.b}`)); };
  for (const pool of ['templates', 'specimens']) {
    show(`${pool}: highest structural similarity (threshold ${THRESHOLDS.STRUCT})`, rows(pool, 'struct', 1), 'struct');
    show(`${pool}: lowest look distance (threshold ${THRESHOLDS.LOOK})`, rows(pool, 'look', -1), 'look');
  }
  show(`components: highest job similarity (threshold ${THRESHOLDS.JOB})`, rows('components', 'job', 1), 'job');
}

async function main() {
  const args = process.argv.slice(2);
  const has = (f) => args.includes(f);
  const arg = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
  const look = !has('--no-look');
  const check = has('--check');
  const relations = readRelations();

  if (arg('--probe')) {
    const file = arg('--probe');
    const html = read(path.resolve(file));
    const catalog = JSON.parse(read(path.join(ROOT, 'contract/catalog.json')));
    const fp = structuralFingerprint(html, catalog);
    const rows = templateEntries(catalog).map((t) => ({ id: t.id, s: structuralSimilarity(fp, structuralFingerprint(t.html, catalog)) })).sort((a, b) => b.s - a.s);
    let looks = {};
    if (look) {
      const virtual = arg('--as') || 'templates/__probe.html';
      const r = await lookFingerprints({ templates: [{ id: '__probe', url: virtual }], specimens: [] }, { ['/' + virtual]: html });
      const stored = fs.existsSync(OUT) ? JSON.parse(read(OUT)) : null;
      for (const t of rows) if (stored?.templates[t.id]?.look) looks[t.id] = lookDistance(r.templates.__probe, stored.templates[t.id].look);
    }
    console.log(`probe ${file}: ${fp.nodes} Fire nodes`);
    for (const r of rows.slice(0, 5)) console.log(`  ${r.id.padEnd(18)} structure ${r.s.toFixed(2)}${looks[r.id] != null ? `  look ${looks[r.id].toFixed(3)}` : ''}${r.s >= THRESHOLDS.STRUCT || (looks[r.id] ?? 1) <= THRESHOLDS.LOOK ? '   <- would be flagged' : ''}`);
    process.exit(rows[0].s >= THRESHOLDS.STRUCT || Object.values(looks).some((d) => d <= THRESHOLDS.LOOK) ? 1 : 0);
  }

  const fresh = await computeAll({ look });
  // with --no-look, keep the stored hashes for entries that still exist
  let stored = fs.existsSync(OUT) ? JSON.parse(read(OUT)) : null;
  if (!look) for (const pool of ['templates', 'specimens']) for (const id of Object.keys(fresh.st[pool])) if (stored?.[pool]?.[id]?.look) fresh.lk[pool][id] = stored[pool][id].look;
  const res = evaluate({ catalog: fresh.catalog, st: fresh.st, lk: fresh.lk, relations });
  if (has('--calibrate')) calibrate(res);

  let stale = [];
  const shape = storedShape(fresh);
  if (check) {
    if (!stored) stale = ['contract/fingerprints.json does not exist'];
    else {
      stale = diffStored(stored, shape);
      if (stored.fire !== shape.fire) stale.push(`fire version ${stored.fire} stored, ${shape.fire} now`);
    }
  } else if (look) {
    fs.writeFileSync(OUT, JSON.stringify(shape, null, 1) + '\n');
  } else {
    stale = [];   // structural-only run writes nothing
  }
  for (const m of [...res.problems, ...res.violations, ...stale.slice(0, 12)]) console.error(`gate: ${m}`);
  if (stale.length > 12) console.error(`gate: …and ${stale.length - 12} more stale entries`);
  if (stale.length) console.error('gate: contract/fingerprints.json is stale: run `node scripts/gate.mjs` and review the diff.');
  const bad = res.problems.length + res.violations.length + stale.length;
  console.log(`gate: ${Object.keys(shape.templates).length} templates, ${Object.keys(shape.specimens).length} specimens, ${fresh.catalog.components.length} components; ${bad ? `${bad} problem${bad > 1 ? 's' : ''}` : 'no near-duplicates'}${check ? ' (check)' : look ? ' (written)' : ' (no look)'}`);
  process.exit(bad ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });

// node scripts/build-index.mjs [--check]
// Builds contract/index.json: one compact entry per component, pattern, layout and template, small enough for an
// agent to read whole. Reads contract/catalog.json (run build-catalog first); writes nothing else. Deterministic.
// Entry: id, kind, name, family, job, aka[], surfaces[], data[], use (first use-when), not [{when-less ids}] (the
// "instead" ids of avoid-when that name a component or template), docs (docs/<page>.html#<section>, or a template path).
// A template has no card, so its aka, surfaces and data come from TEMPLATE_META below (the judgement a template card
// would hold), its job from templates/index.html, its use from its job, and its docs from its path.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'contract/index.json');

// What a template card would need: aka (other names), surfaces, data, a use-when sentence, avoid-when with instead.
// Here only aka, surfaces and data; use is the template's job.
export const TEMPLATE_META = {
  agent: { aka: ['agent chat', 'assistant page', 'chat with agent', 'ai chat'], surfaces: ['app'], data: ['text', 'list'] },
  'api-keys': { aka: ['keys page', 'tokens', 'secrets', 'credentials'], surfaces: ['app'], data: ['list', 'form'] },
  'auth-centered': { aka: ['sign in', 'login', 'consent', 'result page', 'centered card'], surfaces: ['app', 'website'], data: ['form'] },
  auth: { aka: ['sign in', 'login', 'sign up', 'register', 'magic link', 'social login', 'auth page'], surfaces: ['app', 'website'], data: ['form'] },
  blank: { aka: ['empty page', 'starter', 'skeleton page', 'new page'], surfaces: ['app', 'website'], data: ['none'] },
  catalog: { aka: ['directory', 'marketplace', 'browse', 'gallery of providers'], surfaces: ['app', 'website'], data: ['list'] },
  'docs-api': { aka: ['api reference', 'endpoint docs', 'reference page'], surfaces: ['website'], data: ['record', 'text'] },
  'docs-changelog': { aka: ['release notes', 'whats new', 'changelog page'], surfaces: ['website'], data: ['list', 'text'] },
  'docs-guide': { aka: ['tutorial', 'how-to', 'long-form article', 'guide page'], surfaces: ['website'], data: ['text'] },
  'docs-home': { aka: ['documentation home', 'docs landing', 'help home'], surfaces: ['website'], data: ['list', 'text'] },
  form: { aka: ['create form', 'edit form', 'long form', 'settings form', 'wizard page'], surfaces: ['app'], data: ['form'] },
  install: { aka: ['setup guide', 'quickstart', 'getting started', 'integration steps'], surfaces: ['app', 'website'], data: ['text', 'form'] },
  logs: { aka: ['request log', 'activity log', 'audit log', 'event list', 'history'], surfaces: ['app'], data: ['list', 'record'] },
  monitoring: { aka: ['watchlist', 'monitors', 'alerts', 'change tracking'], surfaces: ['app'], data: ['list', 'series'] },
  'not-found': { aka: ['404', 'error page', 'offline', 'maintenance', 'locked page', 'empty state page'], surfaces: ['app', 'website'], data: ['none'] },
  onboarding: { aka: ['first run', 'welcome', 'setup wizard', 'stepper', 'getting started'], surfaces: ['app'], data: ['form'] },
  overview: { aka: ['dashboard', 'home', 'landing after sign-in', 'start page'], surfaces: ['app'], data: ['series', 'list', 'record'] },
  parse: { aka: ['upload documents', 'file review', 'import', 'dropzone page'], surfaces: ['app'], data: ['list', 'form'] },
  playground: { aka: ['api explorer', 'try it', 'request builder', 'sandbox'], surfaces: ['app'], data: ['form', 'text'] },
  provider: { aka: ['detail page', 'integration detail', 'product page'], surfaces: ['app', 'website'], data: ['record', 'form'] },
  settings: { aka: ['preferences', 'account settings', 'billing', 'team settings', 'profile'], surfaces: ['app'], data: ['form', 'record'] },
  'shell-static': { aka: ['server rendered shell', 'no javascript shell', 'static app shell'], surfaces: ['app'], data: ['none'] },
  support: { aka: ['help centre', 'help center', 'inbox', 'contact support', 'tickets'], surfaces: ['app', 'website'], data: ['list', 'text'] },
  usage: { aka: ['credits', 'quota', 'consumption', 'metrics page', 'analytics', 'billing usage'], surfaces: ['app'], data: ['series', 'list'] },
};

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export function buildIndex(catalog) {
  const ids = new Set(catalog.components.map((c) => c.id));
  const tpl = new Set(catalog.templates.map((t) => path.basename(t.path, '.html')));
  const entries = [];
  for (const c of catalog.components) {
    const k = c.card;
    if (!k) throw new Error(`component ${c.id} has no card`);
    const not = [...new Set(k.avoidWhen.map((a) => a.instead).filter((i) => ids.has(i) || tpl.has(i)))];
    entries.push({
      id: c.id, kind: c.kind, name: c.name, family: c.family, job: clean(k.job), aka: k.aka,
      surfaces: k.surfaces, data: k.data, use: clean(k.useWhen[0]), not, docs: c.docs || k.example,
    });
  }
  for (const t of catalog.templates) {
    const id = path.basename(t.path, '.html');
    const m = TEMPLATE_META[id];
    if (!m) throw new Error(`template ${id} has no TEMPLATE_META entry in scripts/build-index.mjs`);
    entries.push({
      id, kind: 'template', name: t.title, family: 'Templates', job: clean(t.job), aka: m.aka,
      surfaces: m.surfaces, data: m.data, use: clean(t.job), not: [], docs: t.path,
    });
  }
  // A template and a component may share an id (form): keep the kind in the sort so output is stable.
  entries.sort((a, b) => a.id.localeCompare(b.id) || a.kind.localeCompare(b.kind));
  return { fire: catalog.fire, count: entries.length, entries };
}

export function render(index) {
  const head = `{"fire":${JSON.stringify(index.fire)},"count":${index.count},"entries":[\n`;
  return head + index.entries.map((e) => '  ' + JSON.stringify(e)).join(',\n') + '\n]}\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'contract/catalog.json'), 'utf8'));
  const text = render(buildIndex(catalog));
  const tokens = Math.round(text.length / 4);
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (have !== text) { console.error('contract/index.json is stale: run node scripts/build-index.mjs'); process.exit(1); }
    console.log(`contract/index.json is current (${text.length} chars, about ${tokens} tokens)`);
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`contract/index.json: ${JSON.parse(text).count} entries, ${text.length} chars, about ${tokens} tokens`);
  }
}

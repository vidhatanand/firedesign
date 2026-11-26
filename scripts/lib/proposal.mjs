/*
 * proposal: the text of a Fire proposal, and the checks that keep it complete and public-safe.
 *
 * A proposal asks Fire for something it lacks (a component, a variant, a token, a pattern) or reports a fault (a bug,
 * an accessibility fault). It is a Markdown file whose first line, `# <Kind label>: <text>`, becomes the title of an
 * issue on Fire's public repository, and whose rest is the issue body. `scripts/propose.mjs` scaffolds, checks and
 * files it; the issue forms in .github/ISSUE_TEMPLATE/ are generated from the same templates (formFiles), so the two
 * never drift.
 *
 * Placeholders are HTML comments, lines that start with `TODO:`, table cells left as the template wrote them, and
 * text in angle brackets such as `<name>`. `check` reports each one that was not replaced.
 *
 * Exports: KINDS, SURFACES, template(kind, { version, surface }), formFiles(), check(text, options), bodyOf(text).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lintText as lintMarkup, prepareCatalog } from '../lint-markup.mjs';
import { lintText as lintCss, parseCss, prepareContract } from '../lint-css.mjs';

export const FIRE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SURFACES = ['app', 'website', 'phone', 'email'];

// family: what the body holds. ask = component or pattern (a card), extend = variant or token, fault = bug or accessibility.
export const KINDS = {
  component: { label: 'New component', labels: ['enhancement'], family: 'ask', what: 'what it does, in a few words' },
  variant: { label: 'New variant, size or state', labels: ['enhancement'], family: 'extend', what: 'what it does, in a few words' },
  token: { label: 'New token', labels: ['enhancement'], family: 'extend', what: 'what it is for, in a few words' },
  pattern: { label: 'New pattern', labels: ['enhancement'], family: 'ask', what: 'what it does, in a few words' },
  bug: { label: 'Bug', labels: ['bug'], family: 'fault', what: 'what goes wrong, in a few words' },
  accessibility: { label: 'Accessibility', labels: ['accessibility'], family: 'fault', what: 'what goes wrong, in a few words' },
};
const KIND_BY_LABEL = new Map(Object.entries(KINDS).map(([k, v]) => [v.label.toLowerCase(), k]));

/* ------------------------------------------------------------------ templates */

const VERSION_HOLE = '<!-- the Fire version you use, x.y.z -->';
const SURFACE_HOLE = '<!-- app, website, phone or email -->';
const SEARCH_ROW = '| `fire find "…"` | | |';

// Meta rows: [key, the value the template writes]. A row still holding that value is unfilled.
function metaRows(kind) {
  const fam = KINDS[kind].family;
  if (fam === 'ask') return [['Built as', '`x-<name>`'], ['Proposed name', '`fd-<name>`']];
  if (kind === 'variant') return [['Component', '`fd-<name>`'], ['Proposed', '`data-<attribute>="<value>"`']];
  if (kind === 'token') return [['Component', '`fd-<name>`, or none'], ['Proposed', '`--fd-<name>`']];
  return [['Component', '`fd-<name>`']];
}
const WHERE_ROWS = [['Browser and version', ''], ['Width', ''], ['Light or dark', ''], ['Input', '<!-- mouse, keyboard, touch or screen reader -->']];

const table = (rows) => ['| | |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join('\n');
const fence = (lang) => '```' + lang + '\n```';

const SEARCHED = `## What I searched
<!-- Every query and page, the nearest Fire entry each gave, and one sentence on why it does not fit. At least two. -->

| Query or page | Nearest Fire entry | Why it does not fit |
|---|---|---|
${SEARCH_ROW}`;

const CHECKED = `## What I checked
<!-- Delete what you did not check. -->

- Light and dark
- 1440 and 375 wide, nothing overflowing at 320
- Keyboard
- Reduced motion
- Empty, loading, error and disabled states`;

const BUILDING = `## What I was building
<!-- Two sentences: the kind of screen and the person's task. General words only: no product, company or person. -->`;

// The body of a proposal of this kind. version and surface are filled in when known; otherwise they stay placeholders.
export function template(kind, { version = null, surface = null } = {}) {
  const k = KINDS[kind];
  if (!k) throw new Error(`unknown kind "${kind}"`);
  const head = `# ${k.label}: <${k.what}>\n\n` + table([
    ['Kind', k.label],
    ['Fire version', version || VERSION_HOLE],
    ['Surface', SURFACES.includes(surface) ? surface : SURFACE_HOLE],
    ...metaRows(kind),
  ]);
  if (k.family === 'fault') {
    return `${head}

## What happens
<!-- What you see, in one or two sentences. -->

## What should happen
<!-- What you expected instead, and why: the docs page or the rule it breaks. -->

## To reproduce
<!-- The smallest complete markup that shows it, with demo data (Fire's demo product is Ember). Then the steps, if a click or a key is needed. -->

${fence('html')}

## Where
<!-- Fill every row. -->

${table(WHERE_ROWS)}

## Fix
<!-- Optional: the change that fixes it, as a css or js block. -->
`;
  }
  const ask = k.family === 'ask';
  const missing = ask ? '<!-- The thing, named by what it does. -->' : '<!-- What the component cannot do today, named by what the change does. -->';
  const markupHint = ask
    ? '<!-- One complete example with x- names and demo data (Fire\'s demo product is Ember). -->'
    : kind === 'token'
      ? '<!-- One complete example of a component that uses the token, with demo data (Fire\'s demo product is Ember). -->'
      : '<!-- One complete example: the fd- component with your x- class where the attribute would go, and demo data (Fire\'s demo product is Ember). -->';
  const cssHint = kind === 'token'
    ? '<!-- The rules from fire-local.css: the value as an --x- token, and a rule that uses it. Fire tokens only. -->'
    : '<!-- The rules from fire-local.css: x- classes, Fire tokens only. -->';
  const card = ask ? `### Card
<!-- Fire's card format (contract/cards/README.md), with the id Fire would use. -->

${fence('json')}

` : '';
  return `${head}

${BUILDING}

## What is missing
${missing}

${SEARCHED}

## ${ask ? 'The component' : 'The change'}

${card}### Markup
${markupHint}

${fence('html')}

### CSS
${cssHint}

${fence('css')}

### Behaviour
<!-- Optional: the script, or what the component does on each key and event. -->

${CHECKED}

## Where else it applies
<!-- Other kinds of screen that would use it. -->
`;
}

/* ------------------------------------------------------------------ issue forms */

const FORMS = [
  { file: 'proposal.md', name: 'Component or extension request', about: 'Fire lacks a component, variant, token or pattern you need. Scaffold it with `fire propose new` and file it with `fire propose send`.', kind: 'component' },
  { file: 'bug.md', name: 'Bug or accessibility fault', about: 'A Fire component does the wrong thing, or fails a person using a keyboard, a screen reader or reduced motion.', kind: 'bug' },
];

// The issue forms, as { 'path from Fire's root': text }. They do not carry a version, so they change only with the templates.
export function formFiles() {
  const out = {};
  for (const f of FORMS) {
    const k = KINDS[f.kind];
    const body = template(f.kind).split('\n').slice(1).join('\n').replace(/^\n+/, '');
    out[`.github/ISSUE_TEMPLATE/${f.file}`] = `---\nname: ${f.name}\nabout: ${f.about}\ntitle: "${k.label}: "\nlabels: ${k.labels.join(', ')}\n---\n\n${body}`;
  }
  out['.github/ISSUE_TEMPLATE/config.yml'] = 'blank_issues_enabled: true\n';
  return out;
}

/* ------------------------------------------------------------------ parsing */

const COMMENT = /<!--[\s\S]*?-->/g;
const blankComments = (s) => s.replace(COMMENT, (m) => m.replace(/[^\n]/g, ' '));
const HOLE_RE = /<[a-z][a-z ,.'-]*>/;   // <name>, <what it does, in a few words>

function parse(text) {
  const lines = text.split('\n');
  const inFence = new Array(lines.length).fill(false);
  const blocks = [];   // { lang, start (line index of the opening fence), lines: [..], end }
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(`{3,})\s*([\w-]*)/.exec(lines[i]);
    if (open) {
      inFence[i] = true;
      if (m && m[1].length >= open.ticks && !m[2]) { open.end = i; blocks.push(open); open = null; } else open.lines.push(lines[i]);
    } else if (m) { inFence[i] = true; open = { lang: m[2].toLowerCase(), start: i, ticks: m[1].length, lines: [] }; }
  }
  if (open) { open.end = lines.length; blocks.push(open); }
  // headings outside code blocks and outside comments
  const plain = blankComments(text).split('\n');
  const heads = [];
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(plain[i]);
    if (m) heads.push({ level: m[1].length, name: m[2], line: i });
  }
  const sections = new Map();   // name (lower case) → { name, level, line, end }
  for (let h = 0; h < heads.length; h++) {
    const cur = heads[h];
    let end = lines.length;
    for (let j = h + 1; j < heads.length; j++) if (heads[j].level <= cur.level) { end = heads[j].line; break; }
    let own = end;   // where its own text stops: the next heading of any level
    if (heads[h + 1] && heads[h + 1].line < own) own = heads[h + 1].line;
    const key = cur.name.toLowerCase();
    if (!sections.has(key)) sections.set(key, { ...cur, end, own });
  }
  return { lines, inFence, blocks, heads, sections };
}

function tableRows(lines, from, to) {
  const rows = [];
  for (let i = from; i < to; i++) {
    const t = lines[i].trim();
    if (!t.startsWith('|')) continue;
    if (/^\|[\s:|-]+\|$/.test(t) && t.includes('-')) continue;   // the separator
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim());
    rows.push({ line: i, cells, raw: t });
  }
  return rows;
}

const unfilled = (cell, hole) => {
  const c = cell.replace(COMMENT, '').trim();
  return !c || /^TODO:/i.test(c) || (hole !== undefined && c === hole) || HOLE_RE.test(c);
};

// What a section holds once placeholders are taken out.
function contentOf(doc, sec, drop = []) {
  const text = blankComments(doc.lines.slice(sec.line + 1, sec.own).join('\n')).split('\n');
  return text.filter((l, i) => {
    const t = l.trim();
    if (!t || /^TODO:/i.test(t) || /^`{3,}[\w-]*$/.test(t)) return false;
    if (/^\|[\s:|-]+\|$/.test(t)) return false;
    if (drop.includes(t)) return false;
    if (t.startsWith('|')) {   // a table row whose value cells are all empty
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (cells.slice(1).every((c) => !c)) return false;
    }
    return true;
  });
}

const blockIn = (doc, sec, langs) => sec && doc.blocks.find((b) => b.start > sec.line && b.start < sec.end && langs.includes(b.lang));

/* ------------------------------------------------------------------ private details */

const GENERIC = new Set(['app', 'web', 'site', 'client', 'server', 'frontend', 'ui', 'fire', 'fire-design', 'firedesign']);
const ALLOWED_MAIL = /@(?:example\.com|example\.org|users\.noreply\.github\.com)$/i;
const PUBLIC_HOSTS = /^(?:(?:[\w-]+\.)*github\.com|developer\.mozilla\.org|www\.w3\.org|(?:[\w-]+\.)*example\.(?:com|org))$/i;
const SOURCE_EXT = 'tsx?|jsx?|mjs|cjs|mts|cts|vue|svelte|astro|css|scss|sass|less|html?|py|rb|go|rs|swift|kt|java|php|cs|dart|ex|exs';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }

// The names that must not appear: the working directory's package name, its "fire": { "private": [...] }, and the
// repository folder's name. options.repoRoot overrides the git lookup (null: none).
export function privateNames(cwd, options = {}) {
  const names = [];
  const pkg = readJson(path.join(cwd, 'package.json'));
  const add = (n) => {
    const s = String(n || '').trim();
    if (s.length >= 2 && !GENERIC.has(s.toLowerCase())) names.push(s);
  };
  if (pkg && typeof pkg.name === 'string') add(pkg.name.split('/').pop());
  if (pkg && Array.isArray(pkg.fire?.private)) for (const n of pkg.fire.private) add(n);
  let top = options.repoRoot;
  if (top === undefined) {
    const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
    top = r.status === 0 ? r.stdout.trim() : null;
  }
  if (top) add(path.basename(top));
  return [...new Set(names)];
}

function scanPrivate(text, names, report) {
  const lines = text.split('\n');
  const each = (re, fn) => {
    for (let i = 0; i < lines.length; i++) for (const m of lines[i].matchAll(re)) fn(m, i + 1, lines[i]);
  };
  each(/(?<![\w.:/~-])(?:\/(?:Users|home|private|tmp|var\/folders)\/|~\/|[A-Za-z]:[\\/](?=[\w ])|file:\/\/)/g, (m, line) =>
    report('error', 'private-path', line, `Remove the local path (${m[0]}…): it shows how your machine is laid out. Name the file by what it is.`));
  each(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi, (m, line) => {
    if (!ALLOWED_MAIL.test(m[0])) report('error', 'private-email', line, `Remove the email address ${m[0]}, or use one at example.com.`);
  });
  const hosts = [];
  each(/(?<![\w.-])(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|(?:[a-z0-9-]+\.)+(?:local|internal|test|localhost))(?![\w.-])/gi, (m, line) => {
    hosts.push(m[0].toLowerCase());
    report('error', 'private-host', line, `Remove the address ${m[0]}: it is a machine on your network. Use example.com in examples.`);
  });
  for (const n of names) {
    const re = new RegExp(`(?<![A-Za-z0-9])${escapeRe(n)}(?![A-Za-z0-9])`, 'gi');
    each(re, (m, line) => report('error', 'private-name', line, `Remove "${m[0]}": it names your project. Describe the screen in general words, and use Ember for demo data.`));
  }
  const SECRET = /\bsk-[A-Za-z0-9_-]{16,}|\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bxox[abposr]-[A-Za-z0-9-]{10,}|\bAKIA[0-9A-Z]{16}\b|\bBearer\s+[A-Za-z0-9._~+/=-]{20,}|-----BEGIN [A-Z ]*-----|\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
  each(SECRET, (m, line) => report('error', 'secret', line, `Remove what looks like a key or token (${m[0].slice(0, 8)}…), and revoke it if it is real. Show a masked demo value such as sk-…4f2a.`));
  each(/https?:\/\/([^\s/)>\]"'`:?#]+)[^\s)>\]"'`]*/gi, (m, line) => {
    const host = m[1].toLowerCase();
    if (PUBLIC_HOSTS.test(host) || hosts.includes(host) || /^(?:localhost|127\.|\[::1\]|10\.|192\.168\.)/.test(host)) return;
    report('warning', 'url', line, `Is ${m[0].replace(/[.,;:!?]+$/, '')} public and meant to be shared? If not, remove it.`);
  });
  each(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g, (m, line) => {
    if (!/^https:\/\//i.test(m[1])) report('warning', 'local-image', line, 'A picture cannot be sent from a file: remove the link, and add the picture to the issue in the browser, with demo data only.');
  });
  each(new RegExp(`(?<![\\w/.:-])(?:[\\w.@-]+/)*[\\w.-]+\\.(?:${SOURCE_EXT}):\\d+(?::\\d+)?\\b`, 'g'), (m, line, l) => {
    const before = l.slice(0, m.index);
    if (/https?:\/\/\S*$/.test(before)) return;
    report('warning', 'file-reference', line, `Remove ${m[0]}: where it is used stays in your project. Say what the screen is instead.`);
  });
}

/* ------------------------------------------------------------------ CSS selectors */

// Splits a selector list at top-level commas, and a selector into compounds at top-level combinators.
function splitTop(s, seps) {
  const out = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (depth === 0 && seps.test(c)) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
const ownClasses = (compound) => [...compound.replace(/\([^)]*\)/g, '').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
const allClasses = (sel) => [...sel.replace(/\[[^\]]*\]/g, '').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);

function checkSelectors(tree, at, report) {
  const visit = (node, parentOk) => {
    for (const ch of node.children || []) {
      if (ch.kind === 'at') { visit(ch, parentOk); continue; }
      if (ch.kind !== 'rule') { visit(ch, parentOk); continue; }
      const line = at(ch.preludeAt);
      let ok = true;
      for (const sel of splitTop(ch.prelude, /,/)) {
        if (/^(from|to|\d+%)$/i.test(sel)) continue;   // keyframe steps
        for (const cls of allClasses(sel)) {
          if (!cls.startsWith('x-') && !cls.startsWith('fd-')) report('error', 'css-class', line, `Rename .${cls} to .x-${cls}: a proposal's own classes start with x-.`);
        }
        const compounds = splitTop(sel, /[\s>+~]/);
        const subject = compounds[compounds.length - 1] || '';
        const own = ownClasses(subject);
        const subjectOk = own.some((c) => c.startsWith('x-')) || (!own.length && /&/.test(subject) && parentOk);
        const fd = own.filter((c) => c.startsWith('fd-'));
        if (!subjectOk && fd.length) {
          ok = false;
          report('error', 'css-fd-class', line, `"${sel}" styles .${fd[0]}, Fire's own class. Put an x- class on the element and style that; .${fd[0]} may stay as its context (.${fd[0]} .x-… or .${fd[0]}.x-…).`);
        }
      }
      visit(ch, ok);
    }
  };
  visit(tree, false);
}

/* ------------------------------------------------------------------ check */

const cache = new Map();
function fireData(fireRoot) {
  if (cache.has(fireRoot)) return cache.get(fireRoot);
  const rd = (p) => readJson(path.join(fireRoot, p));
  const catalog = rd('contract/catalog.json');
  const contract = rd('contract/fire-contract.json');
  const d = {
    version: rd('package.json')?.version || null,
    schema: rd('contract/cards/card.schema.json'),
    catalog: catalog ? prepareCatalog(catalog) : null,
    contract: contract ? prepareContract(contract) : null,
  };
  cache.set(fireRoot, d);
  return d;
}

const REQUIRED = {
  ask: ['What I was building', 'What is missing', 'What I searched', 'The component', 'Card', 'Markup', 'CSS', 'What I checked'],
  extend: ['What I was building', 'What is missing', 'What I searched', 'The change', 'Markup', 'CSS', 'What I checked'],
  fault: ['What happens', 'What should happen', 'To reproduce', 'Where'],
};
// Sections whose content another rule checks.
const OWN_RULE = new Set(['what i searched', 'card', 'markup', 'css', 'to reproduce', 'the component', 'the change', 'where']);

function checkCard(json, schema, report, line) {
  let card;
  try { card = JSON.parse(json); } catch (e) { report('error', 'card', line, `The card is not valid JSON (${e.message}). Fix it so Fire can read it.`); return; }
  if (!card || typeof card !== 'object' || Array.isArray(card)) { report('error', 'card', line, 'The card must be one JSON object in Fire\'s card format (contract/cards/README.md).'); return; }
  const props = schema?.properties || {};
  const need = ['id', 'job', 'purpose', 'useWhen', 'avoidWhen', 'aka', 'surfaces', 'data', 'states'];
  const missing = need.filter((k) => !(k in card));
  if (missing.length) report('error', 'card', line, `Add ${missing.map((k) => `"${k}"`).join(', ')} to the card (contract/cards/README.md says what each holds).`);
  const str = (k, p) => {
    if (!(k in card)) return;
    const v = card[k];
    if (typeof v !== 'string') return report('error', 'card', line, `"${k}" must be a string.`);
    if (p?.minLength && v.length < p.minLength) report('error', 'card', line, `"${k}" is too short: write at least ${p.minLength} characters.`);
    if (p?.maxLength && v.length > p.maxLength) report('error', 'card', line, `"${k}" is ${v.length} characters: keep it to ${p.maxLength}.`);
    if (p?.pattern && !new RegExp(p.pattern).test(v)) {
      report('error', 'card', line, k === 'job' ? '"job" is one sentence that starts with a capital letter and ends with a full stop.' : k === 'id' ? '"id" is lower case letters, digits and hyphens, without fd-: "run-duration".' : `"${k}" does not have the format ${p.pattern}.`);
    }
  };
  str('id', props.id || { pattern: '^[a-z][a-z0-9-]*$' });
  str('job', props.job || { maxLength: 140, pattern: '^[A-Z][^\\n]*\\.$' });
  str('purpose', props.purpose || { maxLength: 500 });
  const list = (k, min, itemOk, what) => {
    if (!(k in card)) return;
    const v = card[k];
    if (!Array.isArray(v)) return report('error', 'card', line, `"${k}" must be a list.`);
    if (v.length < min) return report('error', 'card', line, `"${k}" needs at least ${min === 1 ? 'one entry' : `${min} entries`}.`);
    const bad = v.filter((x) => !itemOk(x));
    if (bad.length) report('error', 'card', line, `"${k}": ${what} (${JSON.stringify(bad[0])} is not).`);
  };
  const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
  const en = (k, fallback) => props[k]?.items?.enum || fallback;
  list('useWhen', 1, isStr, 'each entry is a sentence');
  list('aka', 0, isStr, 'each entry is a name');
  list('avoidWhen', 0, (x) => x && isStr(x.when) && isStr(x.instead), 'each entry has "when" and "instead"');
  list('states', 0, (x) => x && isStr(x.name) && isStr(x.how), 'each entry has "name" and "how"');
  const surfaces = en('surfaces', SURFACES);
  list('surfaces', 1, (x) => surfaces.includes(x), `each entry is one of ${surfaces.join(', ')}`);
  const data = en('data', ['record', 'list', 'series', 'form', 'text', 'none']);
  list('data', 1, (x) => data.includes(x), `each entry is one of ${data.join(', ')}`);
  return card;
}

/*
 * check(text, options) → { errors, warnings, findings: [{ severity, rule, line, message }], title, kind, labels }
 * options: cwd (the product's folder: its package.json names what is private; default process.cwd()), fireRoot,
 * repoRoot (the repository's top folder, or null; default: git), file (a name for lint messages).
 */
export function check(text, options = {}) {
  const cwd = options.cwd || process.cwd();
  const fire = fireData(options.fireRoot || FIRE_ROOT);
  const findings = [];
  const report = (severity, rule, line, message) => findings.push({ severity, rule, line, message });
  text = text.replace(/\r\n/g, '\n');
  const doc = parse(text);

  // title
  const first = doc.lines[0] || '';
  let kind = null, title = null;
  const tm = /^#\s+([^:]+):\s*(.*?)\s*$/.exec(first);
  if (tm && KIND_BY_LABEL.has(tm[1].trim().toLowerCase())) {
    kind = KIND_BY_LABEL.get(tm[1].trim().toLowerCase());
    title = `${KINDS[kind].label}: ${tm[2]}`;
    const t = tm[2];
    if (!t || HOLE_RE.test(t) || /^TODO:/i.test(t)) report('error', 'title', 1, `Replace the placeholder in the title with ${KINDS[kind].family === 'fault' ? 'what goes wrong' : 'what it does'}, in a few words.`);
    else if (t.length < 8 || t.length > 80) report('error', 'title', 1, `The title's text is ${t.length} characters: write 8 to 80, saying ${KINDS[kind].family === 'fault' ? 'what goes wrong' : 'what it does'}.`);
  } else {
    report('error', 'title', 1, `Start the file with "# <kind>: <what it does>", where the kind is one of: ${Object.values(KINDS).map((k) => k.label).join('; ')}.`);
  }

  const firstSection = doc.heads.find((h) => h.level >= 2);
  const metaEnd = firstSection ? firstSection.line : doc.lines.length;
  const meta = new Map(tableRows(doc.lines, 1, metaEnd).filter((r) => r.cells.length >= 2 && r.cells[0]).map((r) => [r.cells[0].toLowerCase(), r]));
  if (!kind && meta.get('kind')) kind = KIND_BY_LABEL.get(meta.get('kind').cells[1].toLowerCase()) || null;

  if (kind) {
    const k = KINDS[kind];
    const fam = k.family;

    // meta
    const rows = [['Kind', undefined], ['Fire version', VERSION_HOLE], ['Surface', SURFACE_HOLE], ...metaRows(kind)];
    for (const [key, hole] of rows) {
      const r = meta.get(key.toLowerCase());
      if (!r) { report('error', 'meta', 2, `Add the row "| ${key} | … |" to the table under the title.`); continue; }
      const v = r.cells[1] || '';
      const plainV = v.replace(/`/g, '').trim();
      const line = r.line + 1;
      if (unfilled(v, hole)) { report('error', 'meta', line, `Fill in "${key}" in the table under the title.`); continue; }
      if (key === 'Kind' && plainV !== k.label) report('error', 'meta', line, `"Kind" says "${plainV}" but the title says "${k.label}": make them the same.`);
      if (key === 'Fire version' && !/^\d+\.\d+\.\d+$/.test(plainV)) report('error', 'meta', line, `"Fire version" is the version you use, as x.y.z (${fire.version || '0.13.0'}).`);
      if (key === 'Surface' && !plainV.split(/\s*,\s*/).every((s) => SURFACES.includes(s))) report('error', 'meta', line, `"Surface" is one of ${SURFACES.join(', ')}.`);
      if (key === 'Built as' && !/^x-[a-z0-9-]+$/.test(plainV)) report('error', 'meta', line, '"Built as" is the x- class you built it with: `x-run-duration`.');
      if (key === 'Proposed name' && !/^fd-[a-z0-9-]+$/.test(plainV)) report('error', 'meta', line, '"Proposed name" is the fd- class Fire would use: `fd-run-duration`.');
      if (key === 'Component' && kind === 'variant' && !/\bfd-[a-z0-9-]+/.test(plainV)) report('error', 'meta', line, '"Component" is the fd- component the variant extends: `fd-meter`.');
      if (key === 'Proposed' && kind === 'variant' && !/\bdata-[a-z0-9-]+/.test(plainV)) report('error', 'meta', line, '"Proposed" is the attribute and value: `data-size="compact"`.');
      if (key === 'Proposed' && kind === 'token' && !/^--fd-[a-z0-9-]+$/.test(plainV)) report('error', 'meta', line, '"Proposed" is the token\'s name: `--fd-size-bar`.');
    }

    // sections
    for (const name of REQUIRED[fam]) {
      const sec = doc.sections.get(name.toLowerCase());
      if (!sec) { report('error', 'section-missing', metaEnd + 1, `Add the section "${name}" (fire propose new writes every section).`); continue; }
      if (OWN_RULE.has(name.toLowerCase())) continue;
      if (!contentOf(doc, sec).length) report('error', 'section-empty', sec.line + 1, `Write the section "${name}": replace the comment with your text.`);
    }

    // what I searched
    if (fam !== 'fault') {
      const sec = doc.sections.get('what i searched');
      if (sec) {
        const rows = tableRows(doc.lines, sec.line + 1, sec.own).slice(1);   // without the header row
        const filled = rows.filter((r) => r.raw !== SEARCH_ROW && r.cells.some((c) => c.replace(COMMENT, '').trim()));
        for (const r of rows) {
          if (r.cells.length < 3 || r.cells.slice(0, 3).some((c) => unfilled(c)) || r.raw === SEARCH_ROW) {
            report('error', 'searched', r.line + 1, 'Fill all three cells of this row (the query or page, the nearest Fire entry, why it does not fit), or delete the row.');
          }
        }
        if (filled.length < 2) report('error', 'searched', sec.line + 1, `List at least two searches under "What I searched" (${filled.length} now): each query or page, the nearest Fire entry, and why it does not fit.`);
      }
    }

    // card
    if (fam === 'ask') {
      const sec = doc.sections.get('card');
      if (sec) {
        const b = blockIn(doc, sec, ['json']);
        if (!b || !b.lines.join('').trim()) report('error', 'card', (b ? b.start : sec.line) + 1, 'Write the card in the json block, in Fire\'s card format (contract/cards/README.md).');
        else {
          const card = checkCard(b.lines.join('\n'), fire.schema, report, b.start + 1);
          const proposed = meta.get('proposed name')?.cells[1]?.replace(/`/g, '').trim();
          if (card && typeof card.id === 'string' && /^fd-[a-z0-9-]+$/.test(proposed || '') && `fd-${card.id}` !== proposed) {
            report('warning', 'card', b.start + 1, `The card's id "${card.id}" and the proposed name ${proposed} differ: the id is the name without fd-.`);
          }
        }
      }
    }

    // markup
    const mSec = doc.sections.get(fam === 'fault' ? 'to reproduce' : 'markup');
    if (mSec) {
      const b = blockIn(doc, mSec, ['html']);
      if (!b || !b.lines.join('').trim()) report('error', 'markup', (b ? b.start : mSec.line) + 1, fam === 'fault' ? 'Put the smallest markup that shows the fault in the html block.' : 'Put one complete example in the html block, with x- classes and Ember\'s demo data.');
      else if (fire.catalog) {
        const surface = meta.get('surface')?.cells[1]?.replace(/`/g, '').trim();
        const opts = SURFACES.includes(surface) ? { surface } : { noSurface: true };
        for (const f of lintMarkup('proposal.html', b.lines.join('\n'), fire.catalog, 'html', opts)) {
          report(f.severity, 'markup-lint', b.start + 1 + f.line, `${f.rule}: ${f.message}${f.fix ? `; ${f.fix}` : ''}.`.replace(/([.?!])\.$/, '$1'));
        }
      }
    }

    // css
    if (fam !== 'fault') {
      const sec = doc.sections.get('css');
      if (sec) {
        const b = blockIn(doc, sec, ['css']);
        const css = b ? b.lines.join('\n') : '';
        if (!css.trim()) report('error', 'css', (b ? b.start : sec.line) + 1, 'Put the rules from fire-local.css in the css block.');
        else {
          const starts = [0];
          for (let i = 0; i < css.length; i++) if (css[i] === '\n') starts.push(i + 1);
          const at = (p) => { let l = 0; while (l + 1 < starts.length && starts[l + 1] <= p) l++; return b.start + 2 + l; };
          const tree = parseCss(css);
          checkSelectors(tree, at, report);
          const own = new Set();
          const walk = (n) => {
            for (const d of n.decls || []) if (d.prop.startsWith('--fd-')) {
              own.add(at(d.propAt));
              report('error', 'css-fd-token', at(d.propAt), `Rename ${d.prop} to --x-${d.prop.slice(5)}: --fd- names are Fire's, and a proposal declares its own tokens under x-.`);
            }
            for (const c of n.children || []) walk(c);
          };
          walk(tree);
          if (fire.contract) {
            for (const f of lintCss('proposal.css', css, fire.contract, { prefixes: ['x'] })) {
              if (['no-fd-class-restyle', 'no-important'].includes(f.rule)) continue;   // css-fd-class says it
              const line = b.start + 1 + f.line;
              if (['reserved-prefix', 'token-override'].includes(f.rule) && own.has(line)) continue;   // css-fd-token says it
              report(f.severity, 'css-lint', line, `${f.rule}: ${f.message}${f.fix ? `; ${f.fix}` : ''}.`.replace(/([.?!])\.$/, '$1'));
            }
          }
        }
      }
    }

    // where (faults)
    if (fam === 'fault') {
      const sec = doc.sections.get('where');
      if (sec) {
        const rows = new Map(tableRows(doc.lines, sec.line + 1, sec.own).map((r) => [r.cells[0]?.toLowerCase(), r]));
        const content = contentOf(doc, sec);
        if (!content.length) report('error', 'section-empty', sec.line + 1, 'Fill in "Where": the browser and version, the width, light or dark, and the input.');
        else {
          for (const [key, hole] of WHERE_ROWS) {
            const r = rows.get(key.toLowerCase());
            if (rows.size && (!r || unfilled(r.cells[1] || '', hole))) report('error', 'section-empty', (r ? r.line : sec.line) + 1, `Fill in "${key}" under "Where".`);
          }
        }
      }
    }
  }

  // anything left as TODO: outside code blocks
  doc.lines.forEach((l, i) => {
    if (!doc.inFence[i] && /^\s*(?:[-*]\s+)?TODO:/.test(blankComments(l)) && !findings.some((f) => f.line === i + 1)) {
      report('error', 'section-empty', i + 1, 'Replace this TODO: line with your text, or delete it.');
    }
  });

  scanPrivate(text, privateNames(cwd, options), report);

  findings.sort((a, b) => a.line - b.line || (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  const errors = findings.filter((f) => f.severity === 'error').length;
  return { errors, warnings: findings.length - errors, findings, title, kind, labels: kind ? [...KINDS[kind].labels] : [] };
}

// The issue body: the file without its title line and without HTML comments (outside code blocks), and without an
// `Issue:` line.
export function bodyOf(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').slice(1);
  const out = [];
  let fenceOpen = false, chunk = [];
  const flush = () => {
    if (!chunk.length) return;
    // a comment goes; so does a line that held only comments
    for (const l of chunk.join('\n').replace(COMMENT, '\u0000').split('\n')) {
      if (l.includes('\u0000') && !l.replace(/\u0000/g, '').trim()) continue;
      out.push(l.replace(/\u0000/g, ''));
    }
    chunk = [];
  };
  for (const l of lines) {
    if (/^\s*`{3,}/.test(l)) { flush(); fenceOpen = !fenceOpen; out.push(l); continue; }
    if (fenceOpen) { out.push(l); continue; }
    if (/^Issue:\s+\S+\s*$/.test(l)) continue;
    chunk.push(l);
  }
  flush();
  return out.map((l) => l.replace(/\s+$/, '')).join('\n')
    .replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n*$/, '\n');
}

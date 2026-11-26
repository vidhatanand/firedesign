// node --test scripts/test/propose.test.mjs : fire propose scaffolds a proposal, checks it is complete and public-safe,
// and files it with gh. gh is always a fake runner here: no test talks to GitHub.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KINDS, template, check, bodyOf, formFiles } from '../lib/proposal.mjs';
import { newProposal, send, main, formsCurrent } from '../propose.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const PRIVATE = new Set(['private-path', 'private-email', 'private-host', 'private-name', 'secret', 'url', 'local-image', 'file-reference']);

// A product folder outside any repository, with a package.json that names what is private.
function product(pkg = { name: '@acme/kestrel-console', fire: { surface: 'app', private: ['Project Osprey'] } }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-propose-test-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  return dir;
}
const CWD = product();
const opts = { cwd: CWD, repoRoot: null };
const quiet = () => { const out = [], err = []; return { out, err, log: { out: (s) => out.push(s), err: (s) => err.push(s) } }; };
const rules = (r, severity = 'error') => [...new Set(r.findings.filter((f) => f.severity === severity).map((f) => f.rule))].sort();

/* ------------------------------------------------------------------ fixtures: one complete proposal per kind */

const J = '```';
const SEARCHED = `## What I searched

| Query or page | Nearest Fire entry | Why it does not fit |
|---|---|---|
| \`fire find "run duration bar"\` | meter | A meter shows use against a limit, and a run has no limit. |
| \`fire find "time per step"\` | timeline | The timeline lists events in order and does not show how long each took. |
| Charts page | bars | Bars rank separate items; the steps are parts of one run. |`;

const CHECKED = `## What I checked

- Light and dark
- 1440 and 375 wide, nothing overflowing at 320
- Keyboard`;

const COMPONENT = `# New component: A bar that shows how long each step of a run took

| | |
|---|---|
| Kind | New component |
| Fire version | ${VERSION} |
| Surface | app |
| Built as | \`x-run-duration\` |
| Proposed name | \`fd-run-duration\` |

## What I was building
A run detail page in a deploy console. The person wants to see which step of a run took the longest.

## What is missing
One bar split into a segment per step, each as wide as its share of the run's time, with the step names and times under it.

${SEARCHED}

## The component

### Card

${J}json
{
  "id": "run-duration",
  "job": "See how long each step of a run took.",
  "purpose": "One bar split into a segment per step, each as wide as its share of the run's time. The step names and durations sit under the bar; the step still running is striped.",
  "useWhen": ["A run, a build or a deploy has steps and the person looks for the slow one."],
  "avoidWhen": [{ "when": "Use against a limit, such as a quota.", "instead": "meter" }],
  "aka": ["waterfall", "step timing", "duration bar"],
  "surfaces": ["app"],
  "data": ["series"],
  "states": [{ "name": "running", "how": "data-state=\\"running\\" on the step that is still going" }]
}
${J}

### Markup

${J}html
<figure class="x-run-duration">
  <ol class="x-run-duration-steps">
    <li class="x-run-duration-step" data-fd-vars="--x-share: 12">Install 23 s</li>
    <li class="x-run-duration-step" data-fd-vars="--x-share: 70">Build 2 min 14 s</li>
    <li class="x-run-duration-step" data-fd-vars="--x-share: 18" data-state="running">Deploy 35 s</li>
  </ol>
  <figcaption class="x-run-duration-total">Run 4182 on ember-api: 3 min 12 s</figcaption>
</figure>
${J}

### CSS

${J}css
/* Proposed to Fire: pending */
.x-run-duration { display: grid; gap: var(--fd-space-2); }
.x-run-duration-steps { display: flex; gap: var(--fd-space-1); margin: 0; padding: 0; list-style: none; }
.x-run-duration-step { flex: var(--x-share) 1 0; padding-block-start: var(--fd-space-3); border-radius: var(--fd-radius-sm); background: var(--fd-accent); color: var(--fd-text-2); }
.x-run-duration-step[data-state="running"] { background: var(--fd-warning-solid); }
.fd-card .x-run-duration { margin-block-start: var(--fd-space-3); }
${J}

### Behaviour
None: the widths come from the data.

${CHECKED}

## Where else it applies
A build log page, and the page of an agent run with tool calls.
`;

const PATTERN = COMPONENT
  .replace('# New component: A bar that shows how long each step of a run took', '# New pattern: A run summary with its steps and their times')
  .replace('| Kind | New component |', '| Kind | New pattern |');

const VARIANT = `# New variant, size or state: A compact meter for table cells with a label

| | |
|---|---|
| Kind | New variant, size or state |
| Fire version | ${VERSION} |
| Surface | app |
| Component | \`fd-meter\` |
| Proposed | \`data-size="xs"\` |

## What I was building
A table of API keys with how much of each key's monthly quota is used. Each row is short.

## What is missing
A meter one line high that fits beside the key's name in a dense table row.

${SEARCHED}

## The change

### Markup

${J}html
<div class="fd-meter x-meter-xs" data-value="1520" data-max="3000"><div class="fd-meter-track"><div class="fd-meter-fill"></div></div></div>
${J}

### CSS

${J}css
.fd-meter.x-meter-xs { --x-meter-h: var(--fd-space-1); }
.fd-meter.x-meter-xs .x-meter-note { padding-block: var(--fd-space-0-5); }
${J}

${CHECKED}
`;

const TOKEN = `# New token: A width for the side panel of a log viewer

| | |
|---|---|
| Kind | New token |
| Fire version | ${VERSION} |
| Surface | app |
| Component | none |
| Proposed | \`--fd-size-log-panel\` |

## What I was building
A log viewer for Ember's deploys, with the log on the left and the selected line's fields on the right.

## What is missing
A width for that side panel between the sizes Fire has.

${SEARCHED}

## The change

### Markup

${J}html
<aside class="x-log-panel"><h2 class="x-log-panel-title">Line 212</h2></aside>
${J}

### CSS

${J}css
:root { --x-size-log-panel: calc(var(--fd-size-md) * 1.5); }
.x-log-panel { inline-size: var(--x-size-log-panel); padding: var(--fd-space-4); }
${J}

${CHECKED}
`;

const BUG = `# Bug: The meter's fill keeps its colour after the value drops

| | |
|---|---|
| Kind | Bug |
| Fire version | ${VERSION} |
| Surface | app |
| Component | \`fd-meter\` |

## What happens
After data-value falls from 2940 to 1520, the fill stays the danger colour.

## What should happen
The fill goes back to the accent colour below 80%, as the meter's section in the docs says.

## To reproduce

${J}html
<div class="fd-meter" data-value="2940" data-max="3000"><div class="fd-meter-track"><div class="fd-meter-fill"></div></div></div>
${J}

Then set data-value to 1520 in the inspector.

## Where

| | |
|---|---|
| Browser and version | Firefox 134 |
| Width | 1440 |
| Light or dark | Dark |
| Input | Mouse |
`;

const ACCESSIBILITY = BUG
  .replace("# Bug: The meter's fill keeps its colour after the value drops", '# Accessibility: The meter does not announce its new value')
  .replace('| Kind | Bug |', '| Kind | Accessibility |')
  .replace('| Input | Mouse |', '| Input | Screen reader (VoiceOver) |');

const FIXTURES = { component: COMPONENT, variant: VARIANT, token: TOKEN, pattern: PATTERN, bug: BUG, accessibility: ACCESSIBILITY };

/* ------------------------------------------------------------------ new */

test('new writes each kind, with Fire\'s version and the surface; check rejects it only for placeholders', () => {
  for (const kind of Object.keys(KINDS)) {
    const q = quiet();
    const r = newProposal(`try-${kind}`, { kind, cwd: CWD, log: q.log });
    assert.equal(r.code, 0, q.err.join('\n'));
    const text = fs.readFileSync(r.file, 'utf8');
    assert.match(text, new RegExp(`^# ${KINDS[kind].label}: `));
    assert.match(text, new RegExp(`\\| Fire version \\| ${VERSION.replace(/\./g, '\\.')} \\|`));
    assert.match(text, /\| Surface \| app \|/);
    const c = check(text, opts);
    assert.ok(c.errors > 0, `${kind}: a fresh file has errors`);
    assert.deepEqual(c.findings.filter((f) => PRIVATE.has(f.rule)), [], `${kind}: no private-detail findings`);
    assert.ok(rules(c).includes('title') && rules(c).includes('section-empty'), `${kind}: ${rules(c)}`);
    assert.equal(c.kind, kind);
    assert.deepEqual(c.labels, KINDS[kind].labels);
  }
});

test('new refuses to overwrite, and leaves the surface placeholder when the package has none', () => {
  const dir = product({ name: 'ember-demo' });
  const q = quiet();
  assert.equal(newProposal('a-bar', { cwd: dir, log: q.log }).code, 0);
  const text = fs.readFileSync(path.join(dir, 'docs/fire/proposals/a-bar.md'), 'utf8');
  assert.match(text, /\| Surface \| <!--/);
  assert.equal(newProposal('a-bar', { cwd: dir, log: q.log }).code, 1);
  assert.match(q.err.join('\n'), /not overwritten/);
  assert.equal(newProposal('A Bar', { cwd: dir, log: q.log }).code, 2);
  assert.equal(newProposal('b', { cwd: dir, kind: 'widget', log: q.log }).code, 2);
  assert.equal(newProposal('c', { cwd: dir, dir: 'notes', log: q.log }).code, 0);
  assert.ok(fs.existsSync(path.join(dir, 'notes/c.md')));
});

/* ------------------------------------------------------------------ check: complete proposals */

test('a complete proposal of each kind has no errors', () => {
  for (const [kind, text] of Object.entries(FIXTURES)) {
    const c = check(text, opts);
    assert.deepEqual(c.findings.filter((f) => f.severity === 'error'), [], `${kind}`);
    assert.equal(c.kind, kind);
    assert.deepEqual(c.labels, KINDS[kind].labels);
  }
  assert.equal(check(COMPONENT, opts).title, 'New component: A bar that shows how long each step of a run took');
});

test('the markup lint does not report a proposal\'s own x- classes', () => {
  const c = check(COMPONENT, opts);
  assert.deepEqual(c.findings.filter((f) => f.rule === 'markup-lint'), []);
  // an fd- class Fire does not have is reported, at its line in the file
  const bad = COMPONENT.replace('<figure class="x-run-duration">', '<figure class="x-run-duration fd-run-duration">');
  const f = check(bad, opts).findings.find((x) => x.rule === 'markup-lint');
  assert.ok(f, 'an unknown fd- class is reported');
  assert.match(f.message, /unknown-class/);
  assert.equal(bad.split('\n')[f.line - 1].includes('fd-run-duration'), true);
});

/* ------------------------------------------------------------------ check: one test per rule */

// Each case changes one thing in a complete proposal; the rule it names is the only error.
const only = (rule, text, severity = 'error') => {
  const c = check(text, opts);
  if (severity === 'error') assert.deepEqual(rules(c), [rule], c.findings.map((f) => `${f.line} ${f.rule} ${f.message}`).join('\n'));
  else {
    assert.deepEqual(rules(c), [], c.findings.map((f) => `${f.line} ${f.rule} ${f.message}`).join('\n'));
    assert.deepEqual(rules(c, 'warning'), [rule]);
  }
  return c;
};
const inMissing = (line, base = COMPONENT) => base.replace('## What is missing\n', `## What is missing\n${line}\n`);

test('title: a known prefix, 8 to 80 characters, not the placeholder', () => {
  only('title', COMPONENT.replace(/^# New component: [^\n]+/, '# New component: <what it does, in a few words>'));
  only('title', COMPONENT.replace(/^# New component: [^\n]+/, '# New component: Bar'));
  only('title', COMPONENT.replace(/^# New component: [^\n]+/, `# New component: ${'a'.repeat(81)}`));
  only('title', COMPONENT.replace(/^# New component:/, '# Widget:'));
});

test('meta: the table rows for the kind are there and filled', () => {
  only('meta', COMPONENT.replace(`| Fire version | ${VERSION} |`, '| Fire version | latest |'));
  only('meta', COMPONENT.replace('| Built as | `x-run-duration` |\n', ''));
  only('meta', COMPONENT.replace('| Proposed name | `fd-run-duration` |', '| Proposed name | `fd-<name>` |'));
  only('meta', COMPONENT.replace('| Kind | New component |', '| Kind | New pattern |'));
  only('meta', VARIANT.replace('| Proposed | `data-size="xs"` |', '| Proposed | smaller |'));
  only('meta', TOKEN.replace('| Proposed | `--fd-size-log-panel` |', '| Proposed | `--x-size-log-panel` |'));
  only('meta', BUG.replace('| Surface | app |', '| Surface | desktop |'));
});

test('section-missing: a required section is absent', () => {
  only('section-missing', COMPONENT.replace(/## What I was building\n[^\n]+\n\n/, ''));
  only('section-missing', BUG.replace(/## What should happen\n[^\n]+\n\n/, ''));
});

test('section-empty: a section holds only its comment, a TODO: line or empty rows', () => {
  only('section-empty', COMPONENT.replace(/## What is missing\n[^\n]+\n/, '## What is missing\n<!-- The thing, named by what it does. -->\n'));
  only('section-empty', COMPONENT.replace(/## What is missing\n[^\n]+\n/, '## What is missing\nTODO: write this\n'));
  only('section-empty', BUG.replace('| Width | 1440 |', '| Width | |'));
});

test('searched: at least two filled rows, each with all three cells', () => {
  const one = COMPONENT.replace(/\| `fire find "time per step"`[^\n]+\n\| Charts page[^\n]+\n/, '');
  only('searched', one);
  only('searched', COMPONENT.replace('| Charts page | bars | Bars rank separate items; the steps are parts of one run. |', '| Charts page | bars | |'));
  only('searched', COMPONENT.replace('| Charts page |', '| `fire find "…"` | | |\n| Charts page |'));
});

test('card: the json block parses and has the fields in Fire\'s card format', () => {
  only('card', COMPONENT.replace('"surfaces": ["app"],', '"surfaces": ["desktop"],'));
  only('card', COMPONENT.replace('"job": "See how long each step of a run took.",', '"job": "see how long each step took",'));
  only('card', COMPONENT.replace('  "aka": ["waterfall", "step timing", "duration bar"],\n', ''));
  only('card', COMPONENT.replace('"data": ["series"],', '"data": [],'));
  only('card', COMPONENT.replace('"id": "run-duration",', '"id": "run-duration"'));
  only('card', COMPONENT.replace(/```json\n[\s\S]*?\n```/, '```json\n```'));
  // not required: example, provenance, since, parts, variants
  const c = check(COMPONENT, opts);
  assert.equal(c.errors, 0);
});

test('markup: the html block is not empty', () => {
  only('markup', COMPONENT.replace(/```html\n[\s\S]*?\n```/, '```html\n```'));
  only('markup', BUG.replace(/```html\n[\s\S]*?\n```/, '```html\n```'));
});

test('markup-lint: Fire\'s markup lint runs on the html block', () => {
  const c = only('markup-lint', COMPONENT.replace('<figure class="x-run-duration">', '<figure class="x-run-duration" style="color: red">'));
  assert.match(c.findings.find((f) => f.rule === 'markup-lint').message, /no-style/);
});

test('css: the css block is not empty', () => {
  only('css', COMPONENT.replace(/```css\n[\s\S]*?\n```/, '```css\n```'));
});

test('css-class: every class a proposal styles starts with x-', () => {
  only('css-class', COMPONENT.replace('.x-run-duration { display: grid;', '.run-duration { display: grid;'));
});

test('css-fd-class: an fd- class is context, never the thing styled', () => {
  only('css-fd-class', COMPONENT.replace('.fd-card .x-run-duration {', '.x-run-duration .fd-card {'));
  only('css-fd-class', COMPONENT.replace('.fd-card .x-run-duration {', '.fd-card {'));
  // context is fine: an ancestor, or the same element with an x- class
  assert.equal(check(VARIANT, opts).errors, 0);
});

test('css-fd-token: a proposal declares no --fd- custom property', () => {
  only('css-fd-token', TOKEN.replace(':root { --x-size-log-panel:', ':root { --fd-size-log-panel:').replace('var(--x-size-log-panel)', 'var(--fd-size-md)'));
});

test('css-lint: Fire\'s CSS lint runs on the css block', () => {
  const c = only('css-lint', COMPONENT.replace('background: var(--fd-warning-solid);', 'background: #f5a623;'));
  assert.match(c.findings.find((f) => f.rule === 'css-lint').message, /no-raw-color/);
  only('css-lint', COMPONENT.replace('var(--fd-warning-solid)', 'var(--fd-warning-strong)'));
});

test('private-path: local paths and file addresses', () => {
  for (const p of ['/Users/sam/code/ember/src/run.ts', '/home/sam/ember', 'at /private/var/x', 'in /tmp/build', '/var/folders/ab/cd', '~/code/ember', 'C:\\Users\\sam\\ember', 'file:///etc/hosts']) {
    only('private-path', inMissing(`It was in ${p} on my machine.`));
  }
  // a URL path is not a local path
  assert.equal(check(inMissing('See https://github.com/ember/tmp/x and https://developer.mozilla.org/en-US/docs/Web/HTML.'), opts).errors, 0);
});

test('private-email: an email address, except example.com, example.org and GitHub noreply', () => {
  only('private-email', inMissing('Ask sam.lee@quarry.invalid about it.'));
  assert.equal(check(inMissing('Send to ops@example.com, ops@example.org or 1+sam@users.noreply.github.com. Installed fire-design@0.13.0.'), opts).errors, 0);
});

test('private-host: local and private-range addresses', () => {
  for (const h of ['localhost:4747', '127.0.0.1', '[::1]', '10.0.4.12', '192.168.1.20', '172.20.0.3', 'build.local', 'api.internal', 'ember.test', 'app.localhost']) {
    only('private-host', inMissing(`It was served from ${h} during the work.`));
  }
  assert.equal(check(inMissing('The test file propose.test.mjs is fine.'), opts).errors, 0);
});

test('private-name: the package name, "fire": { "private" }, and the repository folder', () => {
  only('private-name', inMissing('This is for Kestrel-Console.'));
  only('private-name', inMissing('Part of project osprey.'));
  // generic package names are not names
  const generic = product({ name: '@acme/web' });
  assert.equal(check(inMissing('The web page and the app.'), { cwd: generic, repoRoot: null }).errors, 0);
  // the repository folder, from git
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-propose-test-'));
  const top = path.join(repo, 'harrier-dashboard');
  fs.mkdirSync(top);
  fs.writeFileSync(path.join(top, 'package.json'), JSON.stringify({ name: 'ui' }));
  const git = spawnSync('git', ['init', '-q'], { cwd: top });
  if (git.status === 0) {
    const c = check(inMissing('Built for harrier-dashboard.'), { cwd: top });
    assert.deepEqual(rules(c), ['private-name']);
  }
  assert.deepEqual(rules(check(inMissing('Built for harrier-dashboard.'), { cwd: generic, repoRoot: top })), ['private-name']);
});

test('secret: token-shaped strings', () => {
  for (const s of ['sk-live-4f2a9c81b7d0e6f35a12', 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2', 'github_pat_' + '11ABCDEFG0123456789_abcdefghij', 'xoxb-1234567890-abcdefghij', 'AKIA' + 'IOSFODNN7EXAMPLE', 'Bearer abcdefghijklmnopqrstuvwxyz012345', '-----BEGIN RSA PRIVATE KEY-----',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U']) {
    only('secret', inMissing(`The key was ${s} in the example.`));
  }
  assert.equal(check(inMissing('The masked key sk-…4f2a is fine.'), opts).errors, 0);
});

test('url (warning): an address that is not public by default', () => {
  only('url', inMissing('Our staging is at https://deploys.quarry.invalid/runs.'), 'warning');
  assert.equal(check(inMissing('See https://www.w3.org/WAI/ARIA/apg/ and https://docs.example.com/runs.'), opts).warnings, 0);
});

test('local-image (warning): a picture linked from a file', () => {
  only('local-image', inMissing('![The run page](screenshots/run.png)'), 'warning');
  assert.equal(check(inMissing('![The run page](https://github.com/user-attachments/assets/1a2b)'), opts).warnings, 0);
});

test('file-reference (warning): a path with a line number', () => {
  only('file-reference', inMissing('It is used in src/screens/run-detail.tsx:42.'), 'warning');
});

/* ------------------------------------------------------------------ the body */

test('the body has no title line and no HTML comments, outside code blocks', () => {
  const text = template('component', { version: VERSION, surface: 'app' });
  const body = bodyOf(text);
  assert.ok(!body.startsWith('# New component'));
  assert.ok(!body.includes('<!--'));
  assert.match(body, /^\| \| \|/);
  const withCode = '# Bug: x\n\n```html\n<!-- kept: it is markup -->\n```\n<!-- a\nmultiline\ncomment -->\nText\n';
  assert.equal(bodyOf(withCode), '```html\n<!-- kept: it is markup -->\n```\nText\n');
});

/* ------------------------------------------------------------------ send, with a fake gh */

function fakeGh({ existing = [], createFails = null, listFails = null } = {}) {
  const calls = [];
  const run = (cmd, args) => {
    const call = { cmd, args: [...args] };
    const bf = args.indexOf('--body-file');
    if (bf >= 0) call.body = fs.readFileSync(args[bf + 1], 'utf8');
    calls.push(call);
    if (args[0] === 'issue' && args[1] === 'list') return listFails || { status: 0, stdout: JSON.stringify(existing), stderr: '' };
    if (args[0] === 'issue' && args[1] === 'create') {
      if (createFails && args.includes('--label')) return createFails;
      return { status: 0, stdout: 'Creating issue in ember/fire\n\nhttps://github.com/ember/fire/issues/42\n', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: 'unexpected' };
  };
  return { run, calls, writes: () => calls.filter((c) => c.args[1] === 'create') };
}
function proposalFile(text = COMPONENT) {
  const file = path.join(CWD, `send-${Math.random().toString(36).slice(2)}.md`);
  fs.writeFileSync(file, text);
  return file;
}
const sendOpts = (gh, extra = {}) => ({ run: gh.run, repo: 'ember/fire', cwd: CWD, repoRoot: null, log: quiet().log, ...extra });

test('send stops on check errors and runs nothing', () => {
  const gh = fakeGh();
  const q = quiet();
  const r = send(proposalFile(template('component', { version: VERSION })), sendOpts(gh, { log: q.log }));
  assert.equal(r.code, 1);
  assert.equal(gh.calls.length, 0);
  assert.match(q.err.join('\n'), /Nothing was sent/);
});

test('send stops on an issue with the same title, open or closed', () => {
  const gh = fakeGh({ existing: [{ number: 7, title: 'new component: a bar that shows how long each step of a run took', state: 'CLOSED', url: 'https://github.com/ember/fire/issues/7' }] });
  const q = quiet();
  const r = send(proposalFile(), sendOpts(gh, { log: q.log }));
  assert.equal(r.code, 1);
  assert.equal(gh.writes().length, 0);
  assert.match(q.err.join('\n'), /#7 \(closed\)/);
  const list = gh.calls[0].args;
  assert.deepEqual(list.slice(0, 6), ['issue', 'list', '--repo', 'ember/fire', '--state', 'all']);
  assert.equal(list[list.indexOf('--search') + 1], 'New component: A bar that shows how long each step of a run took in:title');
});

test('send --dry-run prints the issue and calls nothing that writes', () => {
  const gh = fakeGh();
  const q = quiet();
  const file = proposalFile();
  const r = send(file, sendOpts(gh, { dryRun: true, log: q.log }));
  assert.equal(r.code, 0);
  assert.equal(gh.writes().length, 0);
  assert.ok(gh.calls.every((c) => c.args[1] === 'list'));
  const out = q.out.join('\n');
  assert.match(out, /title: New component: A bar/);
  assert.match(out, /labels: enhancement/);
  assert.match(out, /repository: ember\/fire/);
  assert.equal(fs.readFileSync(file, 'utf8'), COMPONENT);
});

test('send files the issue: title, body without title and comments, labels; appends Issue: and refuses a second send', () => {
  const gh = fakeGh();
  const q = quiet();
  const text = COMPONENT.replace('## What is missing\n', '## What is missing\n<!-- a note to myself -->\n');
  const file = proposalFile(text);
  const r = send(file, sendOpts(gh, { log: q.log }));
  assert.equal(r.code, 0, q.err.join('\n'));
  const [create] = gh.writes();
  const a = create.args;
  assert.equal(create.cmd, 'gh');
  assert.equal(a[a.indexOf('--title') + 1], 'New component: A bar that shows how long each step of a run took');
  assert.deepEqual(a.filter((x, i) => a[i - 1] === '--label'), ['enhancement']);
  assert.ok(!create.body.includes('# New component'));
  assert.ok(!create.body.includes('<!--'));
  assert.match(create.body, /## What is missing\nOne bar split/);
  const after = fs.readFileSync(file, 'utf8');
  assert.match(after, /\nIssue: https:\/\/github\.com\/ember\/fire\/issues\/42\n$/);
  assert.match(q.out.join('\n'), /\/\* Proposed to Fire: https:\/\/github\.com\/ember\/fire\/issues\/42 \*\//);
  // a second send refuses before it calls gh
  const gh2 = fakeGh();
  const q2 = quiet();
  assert.equal(send(file, sendOpts(gh2, { log: q2.log })).code, 1);
  assert.equal(gh2.calls.length, 0);
  assert.match(q2.err.join('\n'), /already filed/);
});

test('send passes the label for each kind', () => {
  for (const [kind, text] of Object.entries(FIXTURES)) {
    const gh = fakeGh();
    assert.equal(send(proposalFile(text), sendOpts(gh)).code, 0, kind);
    const a = gh.writes()[0].args;
    assert.deepEqual(a.filter((x, i) => a[i - 1] === '--label'), KINDS[kind].labels, kind);
  }
});

test('send retries once without labels when the label does not exist', () => {
  const gh = fakeGh({ createFails: { status: 1, stdout: '', stderr: "could not add label: 'accessibility' not found" } });
  const q = quiet();
  assert.equal(send(proposalFile(ACCESSIBILITY), sendOpts(gh, { log: q.log })).code, 0);
  const creates = gh.writes();
  assert.equal(creates.length, 2);
  assert.ok(creates[0].args.includes('--label'));
  assert.ok(!creates[1].args.includes('--label'));
});

test('send says so when gh is missing or not signed in, and exits 2', () => {
  const missing = fakeGh({ listFails: { status: null, error: Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' }) } });
  const q = quiet();
  assert.equal(send(proposalFile(), sendOpts(missing, { log: q.log })).code, 2);
  assert.match(q.err.join('\n'), /not installed/);
  const out = fakeGh({ listFails: { status: 4, stdout: '', stderr: 'To get started with GitHub CLI, please run:  gh auth login' } });
  const q2 = quiet();
  assert.equal(send(proposalFile(), sendOpts(out, { log: q2.log })).code, 2);
  assert.match(q2.err.join('\n'), /not signed in/);
  assert.equal(out.writes().length, 0);
});

test('send reads the repository from Fire\'s package.json, and fails clearly without one', () => {
  const fire = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-propose-test-'));
  fs.mkdirSync(path.join(fire, 'contract/cards'), { recursive: true });
  for (const f of ['contract/catalog.json', 'contract/fire-contract.json', 'contract/cards/card.schema.json']) fs.copyFileSync(path.join(ROOT, f), path.join(fire, f));
  fs.writeFileSync(path.join(fire, 'package.json'), JSON.stringify({ name: 'fire-design', version: VERSION }));
  const q = quiet();
  assert.equal(send(proposalFile(), sendOpts(fakeGh(), { repo: null, fireRoot: fire, log: q.log })).code, 2);
  assert.match(q.err.join('\n'), /no repository\.url/);
  fs.writeFileSync(path.join(fire, 'package.json'), JSON.stringify({ name: 'fire-design', version: VERSION, repository: { type: 'git', url: 'git+https://github.com/ember/fire.git' } }));
  const gh = fakeGh();
  assert.equal(send(proposalFile(), sendOpts(gh, { repo: null, fireRoot: fire, dryRun: true })).code, 0);
  assert.equal(gh.calls[0].args[3], 'ember/fire');
});

/* ------------------------------------------------------------------ forms and the CLI */

test('the issue forms are current', () => {
  assert.deepEqual(formsCurrent(ROOT), [], 'run node scripts/propose.mjs forms');
  const forms = formFiles();
  assert.match(forms['.github/ISSUE_TEMPLATE/proposal.md'], /^---\nname: Component or extension request\n[\s\S]*labels: enhancement\n---\n/);
  assert.match(forms['.github/ISSUE_TEMPLATE/bug.md'], /^---\nname: Bug or accessibility fault\n[\s\S]*labels: bug\n---\n/);
  assert.equal(forms['.github/ISSUE_TEMPLATE/config.yml'], 'blank_issues_enabled: true\n');
  assert.ok(forms['.github/ISSUE_TEMPLATE/proposal.md'].includes(template('component').split('\n').slice(2).join('\n')));
});

test('fire propose with no arguments prints usage; check prints findings and exits 1', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/fire.mjs'), 'propose'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stderr + r.stdout, /usage: fire propose new <slug>/);
  const bad = proposalFile(COMPONENT.replace(/^# New component: [^\n]+/, '# New component: Bar'));
  const c = spawnSync(process.execPath, [path.join(ROOT, 'scripts/fire.mjs'), 'propose', 'check', bad], { encoding: 'utf8', cwd: CWD });
  assert.equal(c.status, 1);
  assert.match(c.stdout, /:1 {2}error {2}title {2}The title's text is 3 characters/);
  const j = spawnSync(process.execPath, [path.join(ROOT, 'scripts/propose.mjs'), 'check', proposalFile(), '--json'], { encoding: 'utf8', cwd: CWD });
  assert.equal(j.status, 0, j.stdout);
  const out = JSON.parse(j.stdout);
  assert.deepEqual(Object.keys(out).sort(), ['errors', 'findings', 'kind', 'labels', 'title', 'warnings']);
  const q = quiet();
  assert.equal(main(['frobnicate'], { log: q.log }), 2);
});

/* ------------------------------------------------------------------ review fixes */

test('the CSS and markup lints run when check is given the proposal\'s .md name', () => {
  const md = { ...opts, file: 'docs/fire/proposals/run-duration.md' };
  const css = check(COMPONENT.replace('.x-run-duration { display: grid;', '.x-run-duration { inline-size: 312px; color: #ff0000; display: grid;'), md);
  const lint = css.findings.filter((f) => f.rule === 'css-lint');
  assert.ok(lint.some((f) => f.severity === 'error' && /no-raw-color/.test(f.message)), 'a raw colour is a css-lint error');
  assert.ok(lint.some((f) => f.severity === 'warning' && /no-raw-size/.test(f.message)), 'a raw size is a css-lint warning');
  const html = check(COMPONENT.replace('<figure class="x-run-duration">', '<figure class="x-run-duration" style="color: red">'), md);
  assert.ok(html.findings.some((f) => f.rule === 'markup-lint' && /no-style/.test(f.message)));
});

test('the body keeps blank lines as written; a comment-only line goes with one adjacent blank line', () => {
  const body = bodyOf(COMPONENT);
  assert.match(body, /\| Proposed name \| `fd-run-duration` \|\n\n## What I was building\n/);
  assert.match(body, /took the longest\.\n\n## What is missing\n/);
  assert.match(body, /## What I searched\n\n\| Query or page/);
  assert.match(body, /\n\n## The component\n\n### Card\n\n```json\n/);
  assert.equal(bodyOf('# T\n\nText\n\n<!-- a comment -->\n\nMore\n<!-- b -->\n\n\n\nLast\n\n'), 'Text\n\nMore\n\nLast\n');
  assert.ok(!/\n\n\n/.test(bodyOf(template('bug', { version: VERSION }))));
});

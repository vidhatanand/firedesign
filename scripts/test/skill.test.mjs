// The Fire skill (skills/fire): its generated lists are current and complete, every file it names exists, the package
// holds what it reads, where.mjs chooses the right Fire, and the instructions it rests on agree with each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { screens, parts } from '../build-skill.mjs';
import { where, describe } from '../../skills/fire/where.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const text = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(text(rel));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

test('skill: screens.md and parts.md are current', () => {
  assert.equal(text('skills/fire/screens.md'), screens(), 'run node scripts/build-skill.mjs');
  assert.equal(text('skills/fire/parts.md'), parts(), 'run node scripts/build-skill.mjs');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-skill.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('skill: screens.md has every reference screen once, with a file, a picture and a card that exist', () => {
  const md = text('skills/fire/screens.md');
  const ids = [...md.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  const templates = fs.readdirSync(path.join(ROOT, 'templates')).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => f.slice(0, -5)).sort();
  assert.deepEqual([...ids].sort(), templates, 'one entry per file in templates/');
  for (const m of md.matchAll(/^- \*\*Open:\*\* `([^`]+)` · picture `([^`]+)` · card `([^`]+)`$/gm)) {
    for (const rel of m.slice(1)) assert.ok(exists(rel), `${rel} exists`);
  }
  assert.equal([...md.matchAll(/^- \*\*Open:\*\*/gm)].length, templates.length);
  // "Not when" sends a reader to a screen or a part that exists, written as an id.
  const known = new Set([...templates, ...json('contract/index.json').entries.map((e) => e.id)]);
  for (const m of md.matchAll(/→ `([^`]+)`/g)) assert.ok(known.has(m[1]), `"${m[1]}" is a screen or a part`);
  // The app's screens come first: they are what most agents are building.
  assert.ok(md.indexOf('## In the app') < md.indexOf('## Public website'));
  assert.ok(md.indexOf('### logs') > md.indexOf('## In the app') && md.indexOf('### logs') < md.indexOf('## Opened from a link'));
  assert.ok(md.indexOf('### site-home') > md.indexOf('## Public website'));
  assert.ok(md.indexOf('### docs-guide') > md.indexOf('## Documentation'));
});

test('skill: parts.md has one line for every part that is not a template', () => {
  const md = text('skills/fire/parts.md');
  const listed = [...md.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]).sort();
  const index = json('contract/index.json').entries.filter((e) => e.kind !== 'template').map((e) => e.id).sort();
  assert.deepEqual(listed, index);
  assert.match(md, /^- `sheet` \(app, website, phone\): /m);
  assert.match(md, /^- `[\w-]+` \(pattern; /m);
});

test('skill: SKILL.md has the front matter a skill needs and names only files that exist', () => {
  const md = text('skills/fire/SKILL.md');
  const front = md.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(front, 'front matter');
  assert.match(front[1], /^name: fire$/m);
  const description = front[1].match(/^description: (.+)$/m)?.[1] || '';
  assert.ok(description.length > 80 && description.length <= 1024, `description is ${description.length} characters`);
  for (const word of ['reference screen', 'fd-', 'propos']) assert.ok(description.includes(word), `the description says "${word}"`);
  for (const file of ['skills/fire/SKILL.md', 'skills/fire/contributing.md']) {
    for (const m of text(file).matchAll(/\$FIRE\/([\w./-]+)/g)) {
      const rel = m[1].replace(/[.,]$/, '');
      assert.ok(exists(rel), `${file} names $FIRE/${rel}`);
    }
  }
  for (const beside of ['where.mjs', 'contributing.md', 'screens.md', 'parts.md']) assert.ok(md.includes(beside) && exists(`skills/fire/${beside}`), beside);
  // The order is the point of the skill: the reference screen is chosen before any part or markup.
  assert.ok(md.indexOf('## 2. Choose the reference screen') < md.indexOf('## 3. Choose the parts'));
  assert.ok(md.split('\n').length < 160, 'short enough to be read whole');
});

test('skill: the commands it tells an agent to run exist', () => {
  const fire = text('scripts/fire.mjs');
  for (const cmd of ['find', 'lint', 'lint-css', 'review', 'propose']) assert.match(fire, new RegExp(`['"]?${cmd}['"]?: '`), `fire ${cmd}`);
  const all = text('skills/fire/SKILL.md') + text('skills/fire/contributing.md');
  for (const m of all.matchAll(/npx fire ([a-z-]+)/g)) assert.match(fire, new RegExp(`['"]?${m[1]}['"]?: '`), `fire ${m[1]}`);
});

test('skill: the package holds the skill and everything it reads', () => {
  const pkg = json('package.json');
  for (const dir of ['templates', 'docs', 'skills', 'contract', 'fire']) assert.ok(pkg.files.includes(dir), `${dir}/ is packed`);
  assert.ok(!pkg.files.some((f) => f.startsWith('!')), 'nothing is left out of a packed folder');
  for (const file of ['scripts/fire.mjs', 'scripts/find.mjs', 'scripts/propose.mjs', 'scripts/lib/proposal.mjs', 'AGENT-RULES.md', 'GUIDE.md', 'WRITING.md']) {
    assert.ok(pkg.files.includes(file), `${file} is packed`);
    assert.ok(exists(file), `${file} exists`);
  }
  assert.match(pkg.repository?.url || '', /^git\+https:\/\/github\.com\/[\w-]+\/[\w-]+\.git$/, 'fire propose reads the repository from here');
});

test('skill: where.mjs reads the project\'s Fire when it has the screens, and its own when it does not', () => {
  assert.deepEqual(describe(ROOT), { root: ROOT, version: json('package.json').version, screens: true, pictures: true, tools: true });
  assert.equal(describe(os.tmpdir()), null);
  const inFire = where(ROOT);
  assert.equal(inFire.read, ROOT);
  assert.equal(inFire.note, '');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-where-'));
  try {
    const fake = (dir, version, withScreens) => {
      const root = path.join(dir, 'node_modules', 'fire-design');
      fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fire-design', version }));
      fs.writeFileSync(path.join(root, 'scripts/find.mjs'), '');
      if (withScreens) {
        fs.mkdirSync(path.join(root, 'templates'), { recursive: true });
        fs.writeFileSync(path.join(root, 'templates/logs.html'), '');
        fs.mkdirSync(path.join(root, 'contract/pictures/template'), { recursive: true });
      }
      return fs.realpathSync(root);
    };
    // An older Fire, installed one folder down (a workspace): the skill's own Fire is read, and the note says so.
    const old = path.join(tmp, 'old');
    const oldRoot = fake(path.join(old, 'web'), '0.12.4', false);
    const a = where(old);
    assert.equal(fs.realpathSync(a.project.root), oldRoot);
    assert.equal(a.read, ROOT);
    assert.match(a.note, /builds with Fire 0\.12\.4/);
    assert.match(a.note, /Lint with the project's own Fire/);
    // A current Fire: the project's own is read, from a folder inside the project too.
    const cur = path.join(tmp, 'cur');
    const curRoot = fake(cur, '0.13.0', true);
    fs.mkdirSync(path.join(cur, 'src/screens'), { recursive: true });
    const b = where(path.join(cur, 'src/screens'));
    assert.equal(fs.realpathSync(b.read), curRoot);
    assert.equal(b.note, '');
    // No Fire in the project: the skill's own.
    const none = path.join(tmp, 'none');
    fs.mkdirSync(none);
    assert.equal(where(none).read, ROOT);
    // The command prints the folder and exits 0.
    const r = spawnSync(process.execPath, [path.join(ROOT, 'skills/fire/where.mjs'), '--cwd', cur], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^read from /m);
    const j = spawnSync(process.execPath, [path.join(ROOT, 'skills/fire/where.mjs'), '--cwd', old, '--json'], { encoding: 'utf8' });
    assert.equal(JSON.parse(j.stdout).read, ROOT);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('skill: the instructions agree: proposals are public issues, and the pointer is the same everywhere', () => {
  const guide = text('GUIDE.md');
  const rules = text('AGENT-RULES.md');
  const block = (s) => s.match(/```markdown\n## Interface: the Fire design system\n\n([\s\S]*?)```/)?.[1];
  assert.ok(block(guide), 'GUIDE.md has the pointer');
  assert.equal(block(guide), block(rules), 'the pointer is the same in GUIDE.md and AGENT-RULES.md');
  assert.match(block(rules), /reference screen/);
  assert.match(block(rules), /fire propose/);
  for (const [name, doc] of [['GUIDE.md', guide], ['AGENT-RULES.md', rules], ['skills/fire/contributing.md', text('skills/fire/contributing.md')]]) {
    assert.ok(!/never post one publicly|Proposals are internal|REQUESTS\.md/.test(doc), `${name} no longer keeps proposals internal`);
    assert.match(doc, /fire propose new/, `${name} names fire propose`);
    assert.match(doc, /public/, `${name} says the issue is public`);
    assert.match(doc, /Ember/, `${name} names the demo product for example data`);
  }
  assert.match(rules, /\| Build any screen \| The list of reference screens, `skills\/fire\/screens\.md`/);
  assert.ok(exists('.github/ISSUE_TEMPLATE/proposal.md'), 'the issue template the README names');
  assert.match(text('README.md'), /"Component or extension request" issue template/);
});

#!/usr/bin/env node
/*
 * propose: ask Fire for what it lacks, as an issue on Fire's public repository.
 *
 *   fire propose new <slug> [--kind component|variant|token|pattern|bug|accessibility] [--dir docs/fire/proposals]
 *   fire propose check <file.md> [--json]
 *   fire propose send <file.md> [--repo owner/name] [--dry-run]
 *   node scripts/propose.mjs forms [--check]
 *
 * new    writes <dir>/<slug>.md from the template for the kind (default component; scripts/lib/proposal.mjs holds the
 *        templates). It fills in Fire's version, and the surface when the working directory's package.json has
 *        "fire": { "surface": "app" }. It never overwrites a file.
 * check  prints one line per finding (file:line, error or warning, the rule, what to do) and exits 1 on any error.
 *        --json prints { errors, warnings, findings, title, kind, labels }. The rules are in scripts/lib/proposal.mjs:
 *        the shape (title, meta, section-missing, section-empty, searched, card, markup, markup-lint, css, css-class,
 *        css-fd-class, css-fd-token, css-lint) and private details, because the issue is public (private-path,
 *        private-email, private-host, private-name, secret; and the warnings url, local-image, file-reference).
 *        What is private: the working directory's package name, its "fire": { "private": [...] }, and the name of the
 *        repository folder.
 * send   checks the file, then files it with GitHub's `gh` command: the first line is the title, the rest without HTML
 *        comments is the body, the kind gives the label. The repository is --repo, else repository.url in Fire's
 *        package.json. It stops when the file already has an `Issue: <url>` line, or when an issue with the same
 *        title exists (open or closed). --dry-run prints what it would file and writes nothing. On success it appends
 *        `Issue: <url>` to the file and prints the comment to put above the rules in fire-local.css.
 * forms  writes .github/ISSUE_TEMPLATE/ (proposal.md, bug.md, config.yml) from the same templates; --check exits 1
 *        when a committed form differs.
 *
 * Exit codes: 0 done, 1 findings or a refusal, 2 usage, or gh missing or not signed in.
 * Exports newProposal, checkFile, send, writeForms, formsCurrent and main, so tests call them with a fake runner.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KINDS, SURFACES, FIRE_ROOT, template, check, bodyOf, formFiles } from './lib/proposal.mjs';

const USAGE = `usage: fire propose new <slug> [--kind ${Object.keys(KINDS).join('|')}] [--dir docs/fire/proposals]
       fire propose check <file.md> [--json]
       fire propose send <file.md> [--repo owner/name] [--dry-run]
       node scripts/propose.mjs forms [--check]`;

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const defaultLog = { out: (s) => console.log(s), err: (s) => console.error(s) };

/* ------------------------------------------------------------------ new */

export function newProposal(slug, { kind = 'component', dir = 'docs/fire/proposals', cwd = process.cwd(), fireRoot = FIRE_ROOT, log = defaultLog } = {}) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) { log.err(`propose: the slug is lower case letters, digits and hyphens: run-duration-bar.\n${USAGE}`); return { code: 2 }; }
  if (!KINDS[kind]) { log.err(`propose: unknown kind "${kind}": use one of ${Object.keys(KINDS).join(', ')}.`); return { code: 2 }; }
  const file = path.resolve(cwd, dir, `${slug}.md`);
  const rel = path.relative(cwd, file) || file;
  if (fs.existsSync(file)) { log.err(`propose: ${rel} exists; it is not overwritten. Pick another slug, or edit that file.`); return { code: 1, file }; }
  const version = readJson(path.join(fireRoot, 'package.json'))?.version || null;
  const surface = readJson(path.join(cwd, 'package.json'))?.fire?.surface;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, template(kind, { version, surface: SURFACES.includes(surface) ? surface : null }));
  log.out(`wrote ${rel}\nFill in every comment and placeholder, then run: fire propose check ${rel}`);
  return { code: 0, file };
}

/* ------------------------------------------------------------------ check */

export function checkFile(file, { cwd = process.cwd(), fireRoot = FIRE_ROOT, repoRoot } = {}) {
  const text = fs.readFileSync(path.resolve(cwd, file), 'utf8');
  return check(text, { cwd, fireRoot, repoRoot, file });
}

const formatFinding = (file, f) => `${file}:${f.line}  ${f.severity}  ${f.rule}  ${f.message}`;
const summary = (r) => `${r.errors} error${r.errors === 1 ? '' : 's'}, ${r.warnings} warning${r.warnings === 1 ? '' : 's'}`;

function runCheck(file, { json, cwd, fireRoot, repoRoot, log }) {
  let r;
  try { r = checkFile(file, { cwd, fireRoot, repoRoot }); } catch (e) { log.err(`propose: cannot read ${file}: ${e.message}`); return 2; }
  if (json) log.out(JSON.stringify(r, null, 2));
  else {
    for (const f of r.findings) log.out(formatFinding(file, f));
    log.out(`${file}: ${summary(r)}`);
  }
  return r.errors ? 1 : 0;
}

/* ------------------------------------------------------------------ send */

export function repoFrom(fireRoot) {
  const pkg = readJson(path.join(fireRoot, 'package.json'));
  const raw = typeof pkg?.repository === 'string' ? pkg.repository : pkg?.repository?.url;
  if (!raw) return null;
  const m = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(raw) || /^(?:github:)?([\w.-]+)\/([\w.-]+)$/.exec(raw);
  return m ? `${m[1]}/${m[2]}` : null;
}

const defaultRun = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' });
const AUTH = /auth login|not logged in|authenticat|GH_TOKEN/i;

// send(file, { run, repo, dryRun, cwd, fireRoot, repoRoot, log }) → { code, url? }. run(cmd, args) returns what
// spawnSync returns ({ status, stdout, stderr, error }); tests pass a fake one.
export function send(file, { run = defaultRun, repo = null, dryRun = false, cwd = process.cwd(), fireRoot = FIRE_ROOT, repoRoot, log = defaultLog } = {}) {
  const abs = path.resolve(cwd, file);
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { log.err(`propose: cannot read ${file}: ${e.message}`); return { code: 2 }; }
  const r = check(text, { cwd, fireRoot, repoRoot, file });
  if (r.errors) {
    for (const f of r.findings.filter((x) => x.severity === 'error')) log.err(formatFinding(file, f));
    log.err(`${file}: ${summary(r)}. Nothing was sent: fix the errors and send again.`);
    return { code: 1 };
  }
  const target = repo || repoFrom(fireRoot);
  if (!target) { log.err('propose: Fire\'s package.json has no repository.url, so the repository is unknown: pass --repo owner/name.'); return { code: 2 }; }
  if (!/^[\w.-]+\/[\w.-]+$/.test(target)) { log.err(`propose: "${target}" is not a repository: write it as owner/name.`); return { code: 2 }; }
  const filed = /^Issue:\s+(\S+)\s*$/m.exec(text);
  if (filed) { log.err(`propose: already filed as ${filed[1]}. Add to that issue in the browser instead.`); return { code: 1, url: filed[1] }; }

  const ghFailed = (res) => {
    if (res.error && res.error.code === 'ENOENT') { log.err('propose: the gh command is not installed: install GitHub\'s CLI (https://cli.github.com), run gh auth login, and send again.'); return 2; }
    if (AUTH.test(`${res.stderr || ''}`)) { log.err('propose: gh is not signed in to GitHub: run gh auth login, and send again.'); return 2; }
    return 0;
  };

  // an issue with the same title, open or closed
  const list = run('gh', ['issue', 'list', '--repo', target, '--state', 'all', '--search', `${r.title} in:title`, '--json', 'number,title,state,url']);
  if (list.error || list.status !== 0) {
    const code = ghFailed(list);
    if (!dryRun) {
      if (code) return { code };
      log.err(`propose: could not search ${target}'s issues: ${(list.stderr || '').trim() || 'gh failed'}`);
      return { code: 1 };
    }
    log.err('propose: the search for an issue with the same title did not run (see above); a real send runs it first.');
  } else {
    let found = [];
    try { found = JSON.parse(list.stdout || '[]'); } catch { found = []; }
    const same = found.find((i) => String(i.title).trim().toLowerCase() === r.title.trim().toLowerCase());
    if (same) {
      log.err(`propose: ${target} already has this issue: #${same.number} (${String(same.state).toLowerCase()}) ${same.url}\nAdd what is new to that issue in the browser, or change the title if yours is a different need.`);
      return { code: 1, url: same.url };
    }
  }

  const body = bodyOf(text);
  if (dryRun) {
    log.out(`title: ${r.title}\nlabels: ${r.labels.join(', ')}\nrepository: ${target}\n\n${body}`);
    log.out('(dry run: nothing was filed)');
    return { code: 0 };
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-propose-'));
  const bodyFile = path.join(tmp, 'body.md');
  fs.writeFileSync(bodyFile, body);
  try {
    const base = ['issue', 'create', '--repo', target, '--title', r.title, '--body-file', bodyFile];
    let res = run('gh', [...base, ...r.labels.flatMap((l) => ['--label', l])]);
    if ((res.error || res.status !== 0) && !ghFailed(res) && /label/i.test(res.stderr || '')) {
      log.err(`propose: ${target} has no label ${r.labels.join(', ')}; filing without labels.`);
      res = run('gh', base);
    }
    if (res.error || res.status !== 0) {
      const code = ghFailed(res);
      if (code) return { code };
      log.err(`propose: gh could not create the issue: ${(res.stderr || '').trim() || 'no output'}`);
      return { code: 1 };
    }
    const url = ((res.stdout || '').match(/https:\/\/\S+/g) || []).pop();
    if (!url) { log.err(`propose: gh did not print the issue's address: ${(res.stdout || '').trim()}`); return { code: 1 }; }
    fs.writeFileSync(abs, text.replace(/\n*$/, '\n') + `\nIssue: ${url}\n`);
    log.out(`${url}\nPut this above the component's rules in fire-local.css:\n/* Proposed to Fire: ${url} */`);
    return { code: 0, url };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ forms */

export function formsCurrent(fireRoot = FIRE_ROOT) {
  const stale = [];
  for (const [rel, text] of Object.entries(formFiles())) {
    let have = null;
    try { have = fs.readFileSync(path.join(fireRoot, rel), 'utf8'); } catch { /* missing */ }
    if (have !== text) stale.push(rel);
  }
  return stale;
}

export function writeForms(fireRoot = FIRE_ROOT) {
  const files = formFiles();
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(fireRoot, rel)), { recursive: true });
    fs.writeFileSync(path.join(fireRoot, rel), text);
  }
  return Object.keys(files);
}

/* ------------------------------------------------------------------ CLI */

export function main(argv, { log = defaultLog, run, cwd = process.cwd(), fireRoot = FIRE_ROOT } = {}) {
  const [sub, ...rest] = argv;
  if (!sub || sub === '-h' || sub === '--help') { (sub ? log.out : log.err)(USAGE); return 0; }
  const flags = {}, pos = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--json' || a === '--dry-run' || a === '--check') flags[a.slice(2)] = true;
    else if (a === '--kind' || a === '--dir' || a === '--repo') {
      if (rest[i + 1] === undefined) { log.err(`propose: ${a} needs a value.\n${USAGE}`); return 2; }
      flags[a.slice(2)] = rest[++i];
    } else if (/^--(kind|dir|repo)=/.test(a)) { const [k, v] = a.slice(2).split(/=(.*)/s); flags[k] = v; }
    else if (a.startsWith('--')) { log.err(`propose: unknown option ${a}\n${USAGE}`); return 2; }
    else pos.push(a);
  }
  if (sub === 'new') {
    if (pos.length !== 1) { log.err(USAGE); return 2; }
    return newProposal(pos[0], { kind: flags.kind || 'component', dir: flags.dir || 'docs/fire/proposals', cwd, fireRoot, log }).code;
  }
  if (sub === 'check') {
    if (pos.length !== 1) { log.err(USAGE); return 2; }
    return runCheck(pos[0], { json: !!flags.json, cwd, fireRoot, log });
  }
  if (sub === 'send') {
    if (pos.length !== 1) { log.err(USAGE); return 2; }
    return send(pos[0], { repo: flags.repo || null, dryRun: !!flags['dry-run'], cwd, fireRoot, log, ...(run ? { run } : {}) }).code;
  }
  if (sub === 'forms') {
    if (flags.check) {
      const stale = formsCurrent(fireRoot);
      for (const s of stale) log.err(`propose: ${s} is not current: run node scripts/propose.mjs forms`);
      return stale.length ? 1 : 0;
    }
    for (const f of writeForms(fireRoot)) log.out(`wrote ${f}`);
    return 0;
  }
  log.err(`propose: unknown command "${sub}"\n${USAGE}`);
  return 2;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}

# Resuming work on Fire

For whoever picks Fire up on another machine, a person or an agent.

## Where the state is

- The current release is the newest tag and the first entry of [CHANGELOG.md](CHANGELOG.md). `main` can be ahead of
  the tag by commits that change no packaged file, like this one.
- Open work, the owner's decisions and the follow-ups in products are private: `docs/FIRE-HANDOFF.md` in Facet's
  private repository. Read it before starting. Do not copy it here: this repository is public.
- Products ask for parts and report faults as issues on this repository (`gh issue list`; `GUIDE.md` section 7 says
  what one holds). Read the open ones before planning a release. Answer on the issue, with nothing private: close it
  with the release that ships it, or with the reason it was declined.

## Set up

Node 22, npm, Git and Python 3 (for the docs server).

```sh
git clone https://github.com/vidhatanand/firedesign.git && cd firedesign
npm ci
node node_modules/playwright-core/cli.js install chromium chromium-headless-shell firefox webkit
npm run check
node scripts/gate.mjs --check
node scripts/looks-check.mjs --check
```

- On Linux add `--with-deps` to the browser install. If a download fails, run the install again.
- `npm run check` skips five tests until each starter has run `npm ci` (`starters/lit-vite`, `starters/next`,
  `starters/vue-vite`).
- If the gate reports only `templates/record: look changed at w375`, run it again (up to a few times): it can capture
  that template while it is still loading. Do not rewrite the fingerprints for it, whatever the message advises.
- The gate's screenshots were taken on macOS on Apple silicon. If only looks drift on another system, compare with the
  last tag before touching `contract/fingerprints.json`.
- `npm run dev` serves the docs; the templates are listed at <http://localhost:4747/templates/index.html>.
- The Lit starter's check uses the Fire installed in that starter, not the working copy: to test a change, install the
  working copy there first (`npm install --no-save ../..`).

## Checks on GitHub

`.github/workflows/check.yml` runs these checks on GitHub's machines (macOS on Apple silicon, Node 22), so they do not
wait on one computer. Read a run with `gh run list --workflow check.yml` and `gh run view <id> --log-failed`.

- **A push to `main`, to a branch named `rel/…` or `ci/…`, and a pull request** run four things side by side: the
  suite with the starters installed, the gate with the looks check, and each starter's `npm run check` from its lock.
  The suite takes about half an hour there, because it runs one test file at a time; the rest take about eight
  minutes.
- **A tag `v<x.y.z>`** runs the release as a product installs it: an empty project installs the tag, and each starter
  is copied out of the repository, installed and built. `gh workflow run check.yml -f tag=v<x.y.z>` does the same for
  a release that is already out.
- **A release commit pushed before its starters are locked** (step 4 below) skips the starters' checks and the lock
  test, with a warning on the run. That is allowed only while the version has no tag.
- A runner has three cores and scroll bars that take space. A test that passes here and fails there usually waits
  a fixed time (wait for the condition instead), or measures against `innerWidth` where a locked page has reserved
  an 11px scroll-bar gutter (measure against the edge a fixed box reaches, as the half-sheet test does).
- A runner retries what can fail by timing, and names it in a notice on the run: the gate when its only findings
  are looks (up to three runs), a test file that failed (up to three), a starter's check (twice). A real fault fails
  every time. When a test's file shows up in a notice, fix the test.
- The suite job lists the steps of `npm run check` itself, and fails when that script changes: update the job then.

A push still needs the owner's yes. GitHub's run does not replace it.

## Release

Only with the owner's yes for that release. A release is a tag: no GitHub Release and no npm publish.

1. On a branch, add the changelog entry as `## <x.y.z> — <day Mon year>`, then run `node scripts/version.mjs <x.y.z>`
   and `node scripts/build.mjs`.
2. If nothing that renders changed, keep the gate's baseline and change only the `fire` field of
   `contract/fingerprints.json`. Otherwise run `node scripts/gate.mjs` and review the diff.
3. Run the three checks above. The starters-pin test fails until step 5; nothing else may.
4. Commit, fast-forward `main` and push. The starters can only be locked to a commit that is on GitHub.
5. Lock with npm 11: `NPM=<path to npm 11> node scripts/pin-starters.mjs <full id of that commit>`. npm 10 drops the
   locks' `libc` fields. Only the `node_modules/fire-design` entry of each lock may change.
6. In a copy, `npm ci` each starter from its new lock and run its `npm run check`, one at a time, and the test suite.
7. Commit the locks, tag that commit (`git tag -a v<x.y.z>`) and `git push --atomic origin main v<x.y.z>`. Never move
   a pushed tag.
8. Verify from a fresh clone of the tag, a starter copied outside the repository and an empty project that installs
   `github:vidhatanand/firedesign#v<x.y.z>`.
9. Close each issue the release answers, naming the version. Posting on an issue needs the owner's yes, like a push.

GitHub can do the waiting in steps 3, 6 and 8. Push the release commit as a branch named `rel/<x.y.z>` in place of
`main` in step 4, lock the starters to it, push the lock commit to the same branch and wait for a green run. Then
fast-forward `main`, tag and push both together; the tag's own run is step 8. Run a step here as well when a run is
red for a reason you cannot explain.

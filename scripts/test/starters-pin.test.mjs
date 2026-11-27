// The starters depend on the release they ship in, locked as an installed package (scripts/pin-starters.mjs), so
// `npm ci` in a starter works outside Fire's repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../pin-starters.mjs';

// A release commit is pushed before the starters can be locked to it (HANDOFF.md, step 4). The workflow sets
// FIRE_STARTERS_UNLOCKED=1 for that commit alone, and only while the version has no tag (.github/workflows/check.yml).
const unlocked = process.env.FIRE_STARTERS_UNLOCKED === '1' && 'the release commit is pushed and its starters are not locked to it yet';

test('every starter depends on github:vidhatanand/firedesign#v<version>, locked to a commit of that version', { skip: unlocked }, () => {
  const { problems } = check();
  assert.deepEqual(problems, []);
});

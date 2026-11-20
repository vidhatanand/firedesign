// The starters depend on the release they ship in, locked as an installed package (scripts/pin-starters.mjs), so
// `npm ci` in a starter works outside Fire's repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../pin-starters.mjs';

test('every starter depends on github:vidhatanand/firedesign#v<version>, locked to a commit of that version', () => {
  const { problems } = check();
  assert.deepEqual(problems, []);
});

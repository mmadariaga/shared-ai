'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('the old pre-flight-before-materialization order reproduces the missing-directory failure', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-autofast-'));
  const changeDir = path.join(root, 'openspec', 'changes', 'clarify-apply-coordinator-contract');

  assert.equal(fs.existsSync(changeDir), false);
  assert.throws(
    () => {
      if (!fs.existsSync(changeDir)) throw new Error('archive pre-flight requires the change directory');
    },
    /requires the change directory/
  );
});

test('materialization completes writes and sync before the archive-worker pre-flight runs over them', () => {
  const hands = read('sai/commands/explore/autofast-hands-worker.md');
  const explore = read('sai/commands/explore/instructions.md');
  const spec = read('openspec/specs/auto-fast-hands-worker/spec.md');

  const writes = hands.indexOf('1. **Validated writes**');
  const sync = hands.indexOf('2. **Spec sync**');
  const stop = hands.indexOf('It stops there');
  const finishMove = hands.indexOf('1. **Archive move**');
  assert.ok(writes >= 0 && writes < sync, 'validated writes must precede spec sync in the materialize payload');
  assert.ok(sync < stop && stop < finishMove, 'materialize must stop before the finish payload begins at the archive move');
  assert.match(hands, /--autofast-materialize/);
  assert.match(hands, /--autofast-finish/);
  assert.doesNotMatch(hands, /\*\*Archive pre-flight\*\*/, 'the hands worker must not own the archive pre-flight');

  assert.match(explore, /6\. \*\*Materialization and sync\*\*/);
  assert.match(explore, /7\. \*\*Archive segment\*\*[\s\S]*?over the materialized artifacts/);
  assert.match(explore, /8\. \*\*Pre-authorized commit\*\*[\s\S]*?finish payload/);

  assert.match(spec, /### Requirement: Two-payload closed execution/);
  assert.match(spec, /#### Scenario: Materialize payload stops before mutation gates/);
  assert.match(spec, /#### Scenario: Finish payload assumes gated artifacts/);
});

test('the auto-fast materialization step block appears exactly once', () => {
  const explore = read('sai/commands/explore/instructions.md');
  const matches = explore.match(/\*\*Materialization and sync\*\*/g) || [];
  assert.equal(matches.length, 1);
});

test('Claude Code and opencode retain the same hands contract projection', () => {
  const matrix = read('bin/worker-matrix.js');
  const manifest = read('sai/install-manifest.json');
  const hands = 'sai/commands/explore/autofast-hands-worker.md';

  assert.match(matrix, new RegExp(`phase: 'autofast-hands'[\\s\\S]{0,220}workerContract: '${hands.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  assert.match(manifest, /autofast-hands/);
  assert.match(manifest, /claude-sai-autofast-hands-worker/);
  assert.match(manifest, /opencode-sai-autofast-hands-worker/);
});

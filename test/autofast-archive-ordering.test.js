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

test('the old archive-before-materialization order reproduces the missing-directory failure', () => {
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

test('hands materializes validated drafts before the complete archive pre-flight', () => {
  const hands = read('sai/commands/explore/autofast-hands-worker.md');
  const explore = read('sai/commands/explore/instructions.md');
  const spec = read('openspec/specs/auto-fast-hands-worker/spec.md');

  const writes = hands.indexOf('1. **Validated writes**');
  const preflight = hands.indexOf('2. **Archive pre-flight**');
  const sync = hands.indexOf('3. **Spec sync**');
  const move = hands.indexOf('4. **Archive move**');
  assert.ok(writes >= 0 && writes < preflight, 'writes must precede pre-flight');
  assert.ok(preflight < sync && sync < move, 'pre-flight must precede sync and move');
  assert.match(hands, /against the files just written/);
  assert.match(hands, /classification[\s\S]*unchecked-item scan[\s\S]*delta-spec assessment[\s\S]*collision check/);
  assert.match(hands, /supplied validated contents are immutable[\s\S]*schema validation and mutation/);

  assert.doesNotMatch(explore, /dispatch the EXISTING `sai-archive-worker` read-only pre-flight/);
  assert.match(explore, /hands worker first writes the schema-validated drafts[\s\S]*archive read-only pre-flight/);
  assert.match(spec, /Missing change directory is materialized before pre-flight/);
  assert.match(spec, /all seven steps complete exactly as ordered/);
});

test('Claude Code and opencode retain the same hands contract projection', () => {
  const matrix = read('bin/worker-matrix.js');
  const manifest = read('sai/install-manifest.json');
  const hands = 'sai/commands/explore/autofast-hands-worker.md';

  assert.match(matrix, new RegExp(`phase: 'autofast-hands'[\\s\\S]{0,220}workerContract: '${hands.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}'`));
  assert.match(manifest, /autofast-hands/);
  assert.match(manifest, /claude-sai-autofast-hands-worker/);
  assert.match(manifest, /opencode-sai-autofast-hands-worker/);
});

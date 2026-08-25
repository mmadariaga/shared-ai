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

function readExploreContract() {
  const exploreSources = [
    'sai/commands/explore/instructions.md',
    'sai/commands/explore/steps/common.md',
    'sai/commands/explore/steps/artifact-review-language-gate.md',
    'sai/commands/explore/steps/slicing-assessment.md',
    'sai/commands/explore/steps/crystallization-protocol.md',
    'sai/commands/explore/steps/crystallization-language-gates.md',
    'sai/commands/explore/steps/review-loop.md',
    'sai/commands/explore/steps/pipeline-selector.md',
    'sai/commands/explore/steps/pipeline-auto-supervised.md',
    'sai/commands/explore/steps/pipeline-auto-fast.md',
    'sai/commands/explore/steps/idea-list.md',
  ];
  return exploreSources.map(relativePath => read(relativePath)).join('\n');
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

test('backfill execution completes writes before archive preparation and archive execution', () => {
  const backfill = read('sai/commands/backfill/worker.md');
  const archive = read('sai/commands/archive/worker.md');
  const explore = readExploreContract();

  const backfillPrepare = backfill.indexOf('--autofast-prepare');
  const backfillExecute = backfill.indexOf('--autofast-execute');
  const archivePrepare = archive.indexOf('--autofast-prepare');
  const archiveExecute = archive.indexOf('--autofast-execute');
  assert.ok(backfillPrepare >= 0 && backfillPrepare < backfillExecute,
    'backfill preparation must precede its explicit execution continuation');
  assert.ok(archivePrepare >= 0 && archivePrepare < archiveExecute,
    'archive preparation must precede its explicit execution continuation');
  assert.match(backfill, /openspec\/changes\/\{name\}\/\.openspec\.yaml/);
  assert.match(backfill, /openspec\/changes\/\{name\}\/proposal\.md/);
  assert.match(backfill, /openspec\/changes\/\{name\}\/specs\/\{capability\}\/spec\.md/);
  assert.match(archive, /1\. Run the approved delta-spec sync/);
  assert.match(archive, /2\. Move `openspec\/changes\/\{name\}\/`/);
  assert.match(archive, /3\. Stage exactly the supplied owned path set/);
  assert.match(archive, /4\. Apply the commit-message rules/);

  assert.match(explore, /6\. \*\*Backfill execution\*\*/);
  assert.match(explore, /7\. \*\*Archive preparation\*\*[\s\S]*?read-only pre-flight/);
  assert.match(explore, /8\. \*\*Archive execution and pre-authorized commit\*\*[\s\S]*?SAME `sai-archive-worker`/);
});

test('the auto-fast backfill execution and archive preparation blocks appear exactly once', () => {
  const explore = readExploreContract();
  assert.equal((explore.match(/\*\*Backfill execution\*\*/g) || []).length, 1);
  assert.equal((explore.match(/\*\*Archive preparation\*\*/g) || []).length, 1);
  assert.equal((explore.match(/\*\*Archive execution and pre-authorized commit\*\*/g) || []).length, 1);
});

test('Claude Code and opencode retain the same implementer projection without a hands worker', () => {
  const matrix = read('bin/worker-matrix.js');
  const manifest = read('sai/install-manifest.json');
  const parsedManifest = JSON.parse(manifest);
  const backfill = parsedManifest['worker-matrix'].entries
    .find(entry => entry.workerName === 'sai-backfill-worker');

  assert.match(matrix, /phase: 'autofast-implement'[\s\S]{0,220}workerContract: 'sai\/commands\/explore\/autofast-implement-worker\.md'/);
  assert.match(manifest, /autofast-implement/);
  assert.ok(backfill.helperPermissions.includes('Write'),
    'backfill must expose Write in its managed helper permissions');
  assert.match(backfill.claudeAgent.tools, /\bWrite\b/,
    'Claude backfill agent tools must include Write');
  assert.doesNotMatch(matrix, /autofast-hands/);
  assert.doesNotMatch(manifest, /autofast-hands/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/explore/autofast-hands-worker.md')), false);
});

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
    'sai/commands/explore/steps/pipeline-plan-unattended.md',
    'sai/commands/explore/steps/pipeline-direct-build.md',
    'sai/commands/explore/steps/idea-list.md',
  ];
  return exploreSources.map(relativePath => read(relativePath)).join('\n');
}

test('the old pre-flight-before-materialization order reproduces the missing-directory failure', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-direct-build-'));
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

  const backfillPrepare = backfill.indexOf('--direct-build-prepare');
  const backfillExecute = backfill.indexOf('--direct-build-execute');
  const archivePrepare = archive.indexOf('--direct-build-prepare');
  const archiveExecute = archive.indexOf('--direct-build-execute');
  assert.ok(backfillPrepare >= 0 && backfillPrepare < backfillExecute,
    'backfill preparation must precede its explicit execution continuation');
  assert.ok(archivePrepare >= 0 && archivePrepare < archiveExecute,
    'archive preparation must precede its explicit execution continuation');
  assert.match(backfill, /openspec\/changes\/\{name\}\/\.openspec\.yaml/);
  assert.match(backfill, /openspec\/changes\/\{name\}\/proposal\.md/);
  assert.match(backfill, /openspec\/changes\/\{name\}\/specs\/\{capability\}\/spec\.md/);
  assert.match(archive, /1\. Run `openspec archive <name> --yes --json`/);
  assert.match(archive, /2\. Classify every supplied approved path before staging/);
  assert.match(archive, /3\. Commit only when at least one eligible approved path remains/);
  assert.match(archive, /apply\s+the commit-message rules to the staged state only/);

  assert.match(explore, /6\. \*\*Backfill execution\*\*/);
  assert.match(explore, /7\. \*\*Archive preparation\*\*[\s\S]*?read-only pre-flight/);
  assert.match(explore, /8\. \*\*Archive execution and pre-authorized commit\*\*[\s\S]*?SAME `sai-archive-worker`/);
});

test('direct-build archive staging omits ignored untracked paths but stages mixed eligible paths', () => {
  const archive = read('sai/commands/archive/worker.md');
  const execution = archive.slice(archive.indexOf('## Direct Build (unattended) execution continuation'));
  const stagingStart = execution.indexOf('2. Classify every supplied approved path before staging');
  const commitStart = execution.indexOf('3. Commit only when at least one eligible approved path remains');
  assert.ok(stagingStart >= 0 && stagingStart < commitStart,
    'classification must precede the commit decision');
  const staging = execution.slice(stagingStart, commitStart);

  assert.match(staging, /`git ls-files --error-unmatch -- <path>`/);
  assert.match(staging, /its exit-1 no-match result is\s+untracked and any other error is terminal/);
  assert.match(staging, /For an untracked path only, run\s+`git check-ignore --quiet -- <path>`/);
  assert.match(staging, /exit 0 means that the path is\s+intentionally ignored, so omit it and append\s+`\[sai-archive\] warning: omitted ignored untracked path: <path>` to the\s+worker-authored `summary`/);
  assert.match(staging, /exit 1 means it is eligible and any other error\s+is terminal/);
  assert.match(staging, /tracked paths,\s+tracked deletions, and untracked non-ignored paths as\s+eligible/);
  assert.match(staging, /stage\s+every eligible path with the existing exact allowlist\s+and deletion-aware\s+behavior/);
  assert.match(staging, /Never use\s+`git add -A`,\s+`git add \.`,\s+`git add -f`/);
});

test('direct-build archive execution keeps the empty-index no-commit result when all paths are ignored', () => {
  const archive = read('sai/commands/archive/worker.md');
  const execution = archive.slice(archive.indexOf('## Direct Build (unattended) execution continuation'));
  const commitStart = execution.indexOf('3. Commit only when at least one eligible approved path remains');
  const commit = execution.slice(commitStart, execution.indexOf('\n\nThe worker records each realized path', commitStart));

  assert.match(commit, /If all approved paths were\s+omitted as untracked ignored paths/);
  assert.match(commit, /existing empty-index guard/);
  assert.match(commit, /\[sai-archive\] no commit: staging left the index empty/);
  assert.match(commit, /retain the\s+warnings/);
  assert.match(commit, /do not author a message or create a commit/);
});

test('archive contract documents capability-emptying delta refusal with retirement routing', () => {
  const worker = read('sai/commands/archive/worker.md');
  const instructions = read('sai/commands/archive/instructions.md');

  assert.match(worker, /the capability-emptying delta\s+assessment \(detect when a delta spec capability's.*?with no `## ADDED Requirements`/s,
    'archive worker must document the capability-emptying assessment in pre-flight');
  assert.match(worker, /Delta would empty.*?of all published requirements/,
    'archive worker must document the capability-emptying stop-text');
  assert.match(worker, /Capability\s+retirement is owned by `\/sai-retire-docs`/,
    'archive worker refusal must name /sai-retire-docs as the owning path');
  assert.match(worker, /reshape as ADD-only/,
    'archive worker refusal must document reshaping as ADD-only option');

  assert.match(instructions, /## Capability-emptying delta refusal/,
    'instructions must have a Capability-emptying delta refusal section');
  assert.match(instructions, /capability's `## REMOVED Requirements` section names every requirement.*?with no `## ADDED Requirements`/s,
    'instructions must define capability-emptying delta shape');
  assert.match(instructions, /moved to `openspec\/specs\/_archived\/<capability>\/`.*?through `\/sai-retire-docs`/s,
    'instructions must document the /sai-retire-docs retirement path');
  assert.match(instructions, /`openspec validate <capability>` will return green and is not evidence/,
    'instructions must explain why openspec validate is not evidence');
});

test('the direct-build backfill execution and archive preparation blocks appear exactly once', () => {
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

  assert.match(matrix, /phase: 'direct-build'[\s\S]{0,220}workerContract: 'sai\/commands\/explore\/direct-build-worker\.md'/);
  assert.match(manifest, /direct-build/);
  assert.ok(backfill.helperPermissions.includes('Write'),
    'backfill must expose Write in its managed helper permissions');
  assert.match(backfill.claudeAgent.tools, /\bWrite\b/,
    'Claude backfill agent tools must include Write');
  assert.doesNotMatch(matrix, /direct-build-hands/);
  assert.doesNotMatch(manifest, /direct-build-hands/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/explore/direct-build-hands-worker.md')), false);
});

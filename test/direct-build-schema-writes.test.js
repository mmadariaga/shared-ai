'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('repository-artifact scope defines the two protected update protocols', () => {
  const policy = read('sai/policies/repository-artifact-scope.md');

  assert.match(policy, /any repository\s+artifact required by the crystallized change, regardless of file format/);
  assert.match(policy, /does not directly modify `openspec\/specs\/\*\*`/);
  assert.match(policy, /delta under the active change,\s+backfill, and the OpenSpec archive sync operation/);
  assert.match(policy, /Existing ADR and DDR records are historical records and are not edited in\s+place/);
  assert.match(policy, /`supersede`, `reframe`, `reverse`, or `amend`/);
});

test('direct-build implementer uses repository-artifact scope and protects published specs', () => {
  const worker = read('sai/commands/explore/direct-build-worker.md');

  assert.match(worker, /Fetch @sai\/policies\/repository-artifact-scope\.md and use it\./);
  assert.match(worker, /Write any artifact the crystallized change requires, within the\s+repository-artifact scope and its protected update protocols/);
});

test('direct-build step-1 scope delegates published-spec protection to the shared policy', () => {
  const pipeline = read('sai/commands/explore/steps/pipeline-direct-build.md');

  assert.match(pipeline, /Fetch `@sai\/policies\/repository-artifact-scope\.md`: the implementer may write any repository artifact required by the block, regardless of format, under that policy's protected update protocols/);
});

test('explore instructions reflect the repository-artifact implementer boundary (E1)', () => {
  const instructions = read('sai/commands/explore/steps/pipeline-direct-build.md');

  assert.match(instructions, /repository artifact required by the block, regardless of format/);
});

test('backfill keeps the specs-only closed file set with no schemas duplication (I4)', () => {
  const backfill = read('sai/commands/backfill/worker.md');
  const execution = backfill.slice(backfill.indexOf('## Direct Build (unattended) execution continuation'));

  assert.match(execution, /`openspec\/changes\/\{name\}\/\.openspec\.yaml`/);
  assert.match(execution, /`openspec\/changes\/\{name\}\/proposal\.md`/);
  assert.match(execution, /`openspec\/changes\/\{name\}\/specs\/\{capability\}\/spec\.md` paths already present in/);
  assert.match(execution, /It never creates `design\.md`,\s+`tasks\.md`, `implementation\.md`, an unlisted capability, or any other file\./);
  assert.doesNotMatch(execution, /`openspec\/schemas\/\*\*`/);
});

test('archive keeps the sole sync and move primitive with no schemas duplication (I4)', () => {
  const archive = read('sai/commands/archive/worker.md');

  assert.match(archive, /1\. \*\*CLI archive\*\* — `openspec archive <name> --yes --json`, the sole sync and\s+move primitive/);
  const execution = archive.slice(archive.indexOf('## Direct Build (unattended) execute continuation'));
  assert.doesNotMatch(execution, /`openspec\/schemas\/\*\*`/);
});

test('direct-build final commit stages the implementer union including schemas files (E5)', () => {
  const pipeline = read('sai/commands/explore/steps/pipeline-direct-build.md');

  assert.match(pipeline, /8\. \*\*Archive execution and pre-authorized commit\*\*[\s\S]*?stages only the supplied OWNED paths \(reconstructed artifacts, synced main specs, and the implementer.?s unioned changed paths/);
});

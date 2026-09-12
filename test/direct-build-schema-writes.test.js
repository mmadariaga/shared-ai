'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('direct-build implementer ban permits schemas but keeps specs, changes, and config forbidden (I1/E1)', () => {
  const worker = read('sai/commands/explore/direct-build-worker.md');

  // Schemas product scope is writable
  assert.match(worker, /shipped product schemas under `openspec\/schemas\/\*\*` are writable/,
    'worker must state that shipped product schemas under openspec/schemas/** are writable');

  // Total ban is narrowed to an except-schemas ban
  assert.match(worker, /never create or modify anything under `openspec\/` except `openspec\/schemas\/\*\*`/,
    'worker must narrow the total openspec ban to an except-schemas ban');

  // Specs, changes, and config stay forbidden or reserved
  assert.match(worker, /`openspec\/specs\/\*\*`, `openspec\/changes\/\*\*`, and `openspec\/config\.yaml` stay forbidden or reserved/,
    'worker must keep specs/**, changes/**, and config.yaml forbidden or reserved');
});

test('direct-build step-1 violation detector excludes schemas but still flags specs and archive writes (I2/E4)', () => {
  const pipeline = read('sai/commands/explore/steps/pipeline-direct-build.md');

  // Detector names the still-forbidden paths
  assert.match(pipeline, /including `openspec\/specs\/\*\*`, `openspec\/changes\/\*\*`, or `openspec\/config\.yaml`; `openspec\/schemas\/\*\*` is permitted product scope and never a violation/,
    'detector must list specs/**, changes/**, config.yaml as violations and schemas/** as permitted');

  // Recovery cycle does not fire for schemas alone
  assert.match(pipeline, /targeting non-bookkeeping content under `openspec\/` other than `openspec\/schemas\/\*\*`, enter a pre-dispatch recovery cycle/,
    'recovery must exclude schemas/** from non-bookkeeping openspec targets');

  // Total-ban wording is gone from the detector
  assert.doesNotMatch(pipeline, /including non-bookkeeping content like `openspec\/schemas\/\*\*` or `openspec\/config\.yaml`/,
    'detector must no longer flag schemas/** as a step-1 violation');
});

test('explore instructions reflect the schemas-allowed implementer boundary (E1)', () => {
  const instructions = read('sai/commands/explore/instructions.md');

  assert.match(instructions, /and `openspec\/schemas\/\*\*` under its closed exclusions \(never under `openspec\/` except `openspec\/schemas\/\*\*`\)/,
    'instructions must state the schemas-allowed implementer boundary');
});

test('backfill keeps the specs-only closed file set with no schemas duplication (I4)', () => {
  const backfill = read('sai/commands/backfill/worker.md');
  const execution = backfill.slice(backfill.indexOf('## Direct Build (unattended) execution continuation'));

  // Closed file set is still proposal and specs only
  assert.match(execution, /`openspec\/changes\/\{name\}\/\.openspec\.yaml`/);
  assert.match(execution, /`openspec\/changes\/\{name\}\/proposal\.md`/);
  assert.match(execution, /`openspec\/changes\/\{name\}\/specs\/\{capability\}\/spec\.md` paths already present in/);
  assert.match(execution, /It never creates `design\.md`,\s+`tasks\.md`, `implementation\.md`, an unlisted capability, or any other file\./);

  // Execute order must not claim schemas writes (schemas stay implementer-owned)
  assert.doesNotMatch(execution, /`openspec\/schemas\/\*\*`/,
    'backfill execute order must not name schemas/** as a writable path');
});

test('archive keeps the sole sync and move primitive with no schemas duplication (I4)', () => {
  const archive = read('sai/commands/archive/worker.md');

  assert.match(archive, /1\. Run `openspec archive <name> --yes --json` as the sole sync \+ move/,
    'archive must keep the sole sync + move primitive');

  // Archive execution must not claim schemas writes
  const execution = archive.slice(archive.indexOf('## Direct Build (unattended) execution continuation'));
  assert.doesNotMatch(execution, /`openspec\/schemas\/\*\*`/,
    'archive execute continuation must not name schemas/** as a writable path');
});

test('direct-build final commit stages the implementer union including schemas files (E5)', () => {
  const pipeline = read('sai/commands/explore/steps/pipeline-direct-build.md');

  assert.match(pipeline, /8\. \*\*Archive execution and pre-authorized commit\*\*[\s\S]*?stages only the supplied OWNED paths \(reconstructed artifacts, synced main specs, and the implementer.?s unioned changed paths/,
    'step 8 must stage the implementer unioned changed paths alongside reconstructed artifacts and synced specs');
});

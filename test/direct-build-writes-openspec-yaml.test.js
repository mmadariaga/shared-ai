'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
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

test('direct-build step 3 prepare dispatch requests .openspec.yaml metadata file', () => {
  const explore = readExploreContract();

  // Step 3 must state that the dispatch requests the metadata file
  assert.match(explore, /3\. \*\*Sibling backfill preparation\*\*[\s\S]*?The dispatch requests the backfill worker to compose the draft set including `openspec\/changes\/\{name\}\/\.openspec\.yaml`/,
    'Step 3 must state that the prepare dispatch requests .openspec.yaml metadata file');

  // Step 3 must reference the canonical form at section 6a
  assert.match(explore, /3\. \*\*Sibling backfill preparation\*\*[\s\S]*?sai\/commands\/backfill\/instructions\.md` section 6a[\s\S]*?in addition to `proposal\.md` and capability specs/,
    'Step 3 must reference canonical form and list .openspec.yaml alongside other drafts');
});

test('direct-build step 4 validation accepts .openspec.yaml metadata file', () => {
  const explore = readExploreContract();

  // Step 4 must accept the metadata file as part of the returned draft set
  assert.match(explore, /4\. \*\*Spec review\*\*[\s\S]*?and accepts `openspec\/changes\/\{name\}\/\.openspec\.yaml`[\s\S]*?as part of the returned draft set/,
    'Step 4 must accept .openspec.yaml as part of the returned draft set');

  // Step 4 must validate the metadata file as the canonical three-key form
  assert.match(explore, /4\. \*\*Spec review\*\*[\s\S]*?validating it as the canonical three-key form from `sai\/commands\/backfill\/instructions\.md` section 6a[\s\S]*?rather than against the capability schema/,
    'Step 4 must validate .openspec.yaml as canonical form, not against capability schema');
});

test('direct-build artifact set includes .openspec.yaml metadata file', () => {
  const explore = readExploreContract();
  const backfill = read('sai/commands/backfill/worker.md');
  const backfillInstructions = read('sai/commands/backfill/instructions.md');

  // Step 5 mentions the artifact set includes .openspec.yaml in canonical form
  assert.match(explore, /that set is restricted to the schema-validated OpenSpec drafts plus the `\.openspec\.yaml` metadata file/,
    'Step 5 must state that the artifact set includes .openspec.yaml in canonical form');

  // Step 6 includes .openspec.yaml in the validated draft paths
  assert.match(explore, /6\. \*\*Backfill execution\*\*[\s\S]*?containing only the validated draft paths and byte-for-byte contents, including `openspec\/changes\/\{name\}\/\.openspec\.yaml`/,
    'Step 6 must include .openspec.yaml in the validated draft paths');

  // Reference the canonical form in backfill/instructions.md section 6a
  assert.match(explore, /sai\/commands\/backfill\/instructions\.md` section 6a/,
    'Step 5 must reference the canonical form at section 6a of backfill instructions');

  // Verify the canonical shape is defined in backfill/instructions.md
  assert.match(backfillInstructions, /### 6a\. Draft `\.openspec\.yaml`[\s\S]*?schema: sai-workflow[\s\S]*?created:[\s\S]*?backfilled: true/,
    'backfill/instructions.md section 6a must define the canonical .openspec.yaml shape');

  // Verify backfill worker already mentions .openspec.yaml in execution continuation
  assert.match(backfill, /openspec\/changes\/\{name\}\/\.openspec\.yaml/,
    'backfill worker must mention .openspec.yaml in its execution continuation');
});

test('direct-build preparation still performs no write (E2)', () => {
  const explore = readExploreContract();

  // Step 3 mentions preparation performs no draft write
  assert.match(explore, /3\. \*\*Sibling backfill preparation\*\*[\s\S]*?Preparation performs no draft write/,
    'Step 3 must state that preparation performs no draft write');

  // Verify the backfill worker documentation also confirms this
  const backfillWorker = read('sai/commands/backfill/worker.md');
  assert.match(backfillWorker, /A Direct Build.*prepare envelope[\s\S]*?it never writes those drafts/,
    'backfill worker must confirm that prepare envelope never writes drafts');
});

test('direct-build artifact set paths are complete and consistent', () => {
  const backfillWorker = read('sai/commands/backfill/worker.md');

  // Backfill worker execution continuation must list all allowed paths
  assert.match(backfillWorker, /openspec\/changes\/\{name\}\/\.openspec\.yaml/);
  assert.match(backfillWorker, /openspec\/changes\/\{name\}\/proposal\.md/);
  assert.match(backfillWorker, /openspec\/changes\/\{name\}\/specs\/\{capability\}\/spec\.md/);
});

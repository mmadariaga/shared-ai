'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const explorerStepsDir = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps');
const nucleusFile = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md');

function findFetchDirectives(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fetchRegex = /Fetch @sai\/commands\/explore\/steps\/([a-z-]+\.md)/g;
    const fetches = [];
    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
      fetches.push(match[1]);
    }
    return fetches;
  } catch (err) {
    return [];
  }
}

const FOLLOW_LOADED = [
  'crystallization-protocol.md',
  'slice.md',
  'pipeline-direct-build.md',
  'pipeline-plan-unattended.md',
];

function getReachableStepFiles() {
  const reachable = new Set();
  const toProcess = new Set();
  const filesBeingProcessed = new Set();

  // Start with the nucleus
  const nucleusFetches = findFetchDirectives(nucleusFile);
  nucleusFetches.forEach(file => {
    if (file.startsWith('..')) {
      // This is a relative path like ../../ which shouldn't happen for steps
      return;
    }
    toProcess.add(file);
  });

  // Follow-loaded files are named by sidecar next.follow, not by nucleus Fetch.
  FOLLOW_LOADED.forEach(file => toProcess.add(file));

  // Process all reachable files
  while (toProcess.size > 0) {
    const file = [...toProcess][0];
    toProcess.delete(file);

    if (reachable.has(file) || filesBeingProcessed.has(file)) {
      continue;
    }

    filesBeingProcessed.add(file);
    const filePath = path.join(explorerStepsDir, file);

    const fetches = findFetchDirectives(filePath);
    fetches.forEach(fetchedFile => {
      if (!reachable.has(fetchedFile)) {
        toProcess.add(fetchedFile);
      }
    });

    reachable.add(file);
    filesBeingProcessed.delete(file);
  }

  return reachable;
}

function getAllStepFiles() {
  try {
    const files = fs.readdirSync(explorerStepsDir);
    return new Set(files.filter(f => f.endsWith('.md')));
  } catch (err) {
    return new Set();
  }
}

test('should have common.md reachable directly from nucleus', () => {
  const nucleusFetches = findFetchDirectives(nucleusFile);
  assert.ok(nucleusFetches.includes('common.md'),
    'common.md should be directly reachable from nucleus');
});

test('boot pack does not fetch follow-loaded step files', () => {
  const nucleusFetches = findFetchDirectives(nucleusFile);
  const commonFetches = findFetchDirectives(path.join(explorerStepsDir, 'common.md'));
  const bootFetches = new Set([...nucleusFetches, ...commonFetches]);
  for (const file of FOLLOW_LOADED) {
    assert.ok(!bootFetches.has(file), `boot must not fetch ${file}`);
  }
});

test('common.md does not fetch nested crystallization files', () => {
  const commonFetches = findFetchDirectives(path.join(explorerStepsDir, 'common.md'));
  for (const file of [
    'slicing-assessment.md',
    'artifact-review-language-gate.md',
    'crystallization-language-gates.md',
    'crystallization-protocol.md',
  ]) {
    assert.ok(!commonFetches.includes(file), `common.md must not fetch ${file}`);
  }
});

test('crystallization-protocol.md fetches assessment and language gates', () => {
  const fetches = findFetchDirectives(path.join(explorerStepsDir, 'crystallization-protocol.md'));
  assert.ok(fetches.includes('slicing-assessment.md'),
    'crystallization-protocol.md should fetch slicing-assessment.md');
  assert.ok(fetches.includes('artifact-review-language-gate.md'),
    'crystallization-protocol.md should fetch artifact-review-language-gate.md');
  assert.ok(fetches.includes('crystallization-language-gates.md'),
    'crystallization-protocol.md should fetch crystallization-language-gates.md');
});

test('follow-load is driven by next.follow with no whitelist and a stop-on-failure rule', () => {
  const instructions = fs.readFileSync(nucleusFile, 'utf8');
  const policy = fs.readFileSync(path.join(__dirname, '..', 'sai', 'policies', 'stage-machine.md'), 'utf8');
  assert.match(instructions, /Fetch @sai\/policies\/stage-machine\.md/);
  assert.match(policy, /fetch whatever `next\.follow` names/);
  assert.match(policy, /There is no file whitelist/);
  assert.match(policy, /show the error and wait for the user/);
  assert.match(policy, /Guess no other file/);
  assert.match(policy, /never route the failure through worker Bounded/);
  assert.match(policy, /An emit failure or `rejected` response stops the same way/);
  assert.match(policy, /conversation loaded-set already contains that path/);
  assert.match(policy, /Never parse `next\.hint` to decide whether to/);
  assert.doesNotMatch(instructions, /5\. \*\*Crystallization protocol \(single change\)\*\*/);
});

test('sidecar STAGE_FILES still name the follow-loaded step files', () => {
  const idea = fs.readFileSync(path.join(__dirname, '..', 'sai-state', 'machines', 'explore-idea.js'), 'utf8');
  const slice = fs.readFileSync(path.join(__dirname, '..', 'sai-state', 'machines', 'explore-slice.js'), 'utf8');
  assert.match(idea, /crystallize: 'sai\/commands\/explore\/steps\/crystallization-protocol\.md'/);
  assert.match(slice, /const SLICE_STEP = 'sai\/commands\/explore\/steps\/slice\.md'/);
  assert.match(slice, /const DIRECT_BUILD_STEP = 'sai\/commands\/explore\/steps\/pipeline-direct-build\.md'/);
  assert.match(slice, /const PLAN_STEP = 'sai\/commands\/explore\/steps\/pipeline-plan-unattended\.md'/);
});

test('should have all step files reachable through fetch chain', () => {
  const allStepFiles = getAllStepFiles();
  const reachableFiles = getReachableStepFiles();

  const unreachableFiles = Array.from(allStepFiles)
    .filter(file => !reachableFiles.has(file))
    .sort();

  assert.deepEqual(unreachableFiles, [],
    `The following step files are unreachable through the fetch chain: ${unreachableFiles.join(', ')}`
  );
});

test('should have all reachable files present in steps directory', () => {
  const allStepFiles = getAllStepFiles();
  const reachableFiles = getReachableStepFiles();

  const missingFiles = Array.from(reachableFiles)
    .filter(file => !allStepFiles.has(file))
    .sort();

  assert.deepEqual(missingFiles, [],
    `The following fetched files are missing from the steps directory: ${missingFiles.join(', ')}`
  );
});

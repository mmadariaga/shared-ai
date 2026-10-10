'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');
const { expandInstallManifest } = require('../bin/install-manifest');
const manifest = require('../sai/install-manifest.json');

const repoRoot = path.join(__dirname, '..');
const POLICY = 'sai/policies/code-quality-priority-stack.md';
const FETCH_LINE = 'Fetch @sai/policies/code-quality-priority-stack.md';
const IMPLEMENT_COMMON = 'sai/commands/implement/steps/common.md';
const REVIEW_PASS_6 = 'sai/commands/review/steps/resolve-review-analysis.md';
const STACK_HEADING = '## Code Quality Priority Stack';
const CODE_WRITERS = [
  'sai/commands/apply/worker-common.md',
  'sai/commands/explore/direct-build-worker.md',
  'sai/commands/meta-review/review-fix-worker.md',
];
const MERGE_INSTRUCTIONS = 'sai/commands/merge/instructions.md';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

test('the Priority Stack section lives only in the policy', () => {
  const holders = walk(path.join(repoRoot, 'sai'))
    .filter((file) => file.endsWith('.md'))
    .filter((file) => fs.readFileSync(file, 'utf8').includes(STACK_HEADING));
  assert.deepEqual(holders, []);
  assert.ok(read(POLICY).startsWith('# Code Quality Priority Stack\n'));
});

test('the implement step library loads the policy', () => {
  assert.ok(read(IMPLEMENT_COMMON).split('\n').includes(FETCH_LINE));
});

test('review pass 6 loads the policy on a tension', () => {
  assert.ok(read(REVIEW_PASS_6).includes(FETCH_LINE));
});

test('code-writing workers explicitly load the single-source policy within their boundaries', () => {
  for (const file of CODE_WRITERS) {
    assert.equal(read(file).split('\n').filter(line => line === FETCH_LINE).length, 1, file);
  }
  assert.match(read(CODE_WRITERS[0]), /within the assigned Step and role restrictions/);
  assert.match(read(CODE_WRITERS[0]), /GREEN's test-file prohibition remains in force/);
  assert.match(read(CODE_WRITERS[1]), /within the crystallized block's scope/);
  assert.match(read(CODE_WRITERS[2]), /only to the selected findings, retaining the exclusions/);
  for (const file of ['sai/commands/apply/red-worker.md', 'sai/commands/apply/green-worker.md']) {
    assert.ok(read(file).includes('Fetch @sai/commands/apply/worker-common.md'), file);
  }
});

test('merge loads the policy conditionally for code resolutions and proposed corrections', () => {
  const source = read(MERGE_INSTRUCTIONS);
  const writing = source.slice(source.indexOf('#### Writing the resolution'), source.indexOf('### Step 8:'));
  assert.ok(writing.includes(FETCH_LINE));
  assert.match(writing, /Before authoring a code resolution or a coordinator-authorized code correction/);
  assert.match(writing, /approved strategy, behavior-preservation requirements/);
  assert.match(writing, /authorized ranges; those restrictions prevail/);
  assert.match(writing, /complete existing\s+version.*\) alone requires no policy load/);
  const correction = source.slice(source.indexOf('### Step 8:'), source.indexOf('### Step 9:'));
  assert.ok(correction.includes(FETCH_LINE));
  assert.match(correction, /Before authoring a proposed code correction/);
  assert.match(correction, /approved strategy and behavior-preservation requirements/);
  assert.match(correction, /those restrictions prevail/);
  assert.match(correction, /grants no write/);
  assert.match(correction, /authorize and capture the correction ranges before application/);
  assert.ok(!read('sai/commands/merge/worker.md').includes(FETCH_LINE));
});

test('policy references are limited to the intended planning, review, and code-writing surfaces', () => {
  const holders = walk(path.join(repoRoot, 'sai'))
    .filter(file => file.endsWith('.md'))
    .filter(file => fs.readFileSync(file, 'utf8').includes(FETCH_LINE))
    .map(file => path.relative(repoRoot, file).split(path.sep).join('/'));
  assert.deepEqual(holders.sort(), [IMPLEMENT_COMMON, REVIEW_PASS_6, ...CODE_WRITERS, MERGE_INSTRUCTIONS].sort());
  for (const file of [...CODE_WRITERS, MERGE_INSTRUCTIONS]) {
    assert.doesNotMatch(read(file), /\*\*(?:YAGNI|SOLID|Dependency ladder|Minimum surface area)\*\*/);
  }
});

test('merge stage disclosure delivers conditional loads to apply and test-correction only', () => {
  for (const stage of ['strategy', 'apply', 'test-correction', 'renumbering-plan']) {
    const result = spawnSync(process.execPath, [
      path.join(repoRoot, 'sai/tools/merge.js'), 'instructions', '--stage', stage,
      '--cwd', repoRoot,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes(FETCH_LINE), ['apply', 'test-correction'].includes(stage), stage);
    if (stage === 'test-correction') {
      assert.match(result.stdout, /Before authoring a proposed code correction/);
      assert.match(result.stdout, /grants no write/);
    }
  }
});

for (const harness of ['claude', 'opencode']) {
  test(`${harness} projects the shared code-writing instructions and unchanged policy`, () => {
    const base = path.join(repoRoot, '.tmp', 'code-quality-worker-coverage', harness);
    const destinationRoot = Object.fromEntries(
      ['agents', 'commands', 'config', 'sai', 'skills', 'root'].map(key => [key, path.join(base, key)]),
    );
    const entries = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const file of [POLICY, ...CODE_WRITERS, MERGE_INSTRUCTIONS, 'sai/commands/merge/worker.md']) {
      const destination = path.join(destinationRoot.sai, file.slice('sai/'.length));
      const matches = entries.filter(entry => entry.destinationPath === destination);
      assert.equal(matches.length, 1, file);
      assert.equal(matches[0].sourceText ?? fs.readFileSync(matches[0].sourcePath, 'utf8'), read(file), file);
    }
  });
}

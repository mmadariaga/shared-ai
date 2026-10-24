'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { expandInstallManifest } = require('../bin/install-manifest');
const manifest = require('../sai/install-manifest.json');

const repoRoot = path.join(__dirname, '..');
const POLICY = 'sai/policies/code-quality-priority-stack.md';
const FETCH_LINE = 'Fetch @sai/policies/code-quality-priority-stack.md';
const REVIEW_PASS_6 = 'sai/commands/review/steps/resolve-review-analysis.md';
const STACK_HEADING = '## Code Quality Priority Stack';
const CODE_WRITERS = [
  'sai/commands/explore/direct-build-worker.md',
  'sai/commands/implement/worker-common.md',
];
const MERGE_APPLY = 'sai/commands/merge/steps/apply.md';
const MERGE_TEST_CORRECTION = 'sai/commands/merge/steps/test-correction.md';
const MERGE_STEPS = [MERGE_APPLY, MERGE_TEST_CORRECTION];

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

test('review pass 6 loads the policy on a tension', () => {
  assert.ok(read(REVIEW_PASS_6).includes(FETCH_LINE));
});

test('code-writing workers explicitly load the single-source policy within their boundaries', () => {
  for (const file of CODE_WRITERS) {
    assert.equal(read(file).split('\n').filter(line => line === FETCH_LINE).length, 1, file);
  }
  assert.match(read(CODE_WRITERS[0]), /within the crystallized block's scope/);
  assert.match(read(CODE_WRITERS[1]), /within your role and the brief/);
  for (const file of ['sai/commands/implement/red-worker.md', 'sai/commands/implement/green-worker.md']) {
    assert.ok(read(file).includes('Fetch @sai/commands/implement/worker-common.md'), file);
  }
});

test('merge loads the policy conditionally for code resolutions and proposed corrections', () => {
  const writing = read(MERGE_APPLY);
  assert.ok(writing.includes(FETCH_LINE));
  assert.match(writing, /Before authoring a code resolution or a coordinator-authorized code correction/);
  assert.match(writing, /accepted strategy, behavior-preservation requirements/);
  assert.match(writing, /authorized ranges; those restrictions prevail/);
  assert.match(writing, /complete existing version.*\) alone requires no policy load/);
  const correction = read(MERGE_TEST_CORRECTION);
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
  assert.deepEqual(holders.sort(), [REVIEW_PASS_6, ...CODE_WRITERS, ...MERGE_STEPS].sort());
  for (const file of [...CODE_WRITERS, ...MERGE_STEPS]) {
    assert.doesNotMatch(read(file), /\*\*(?:YAGNI|SOLID|Dependency ladder|Minimum surface area)\*\*/);
  }
});

test('only the apply and test-correction merge steps load the policy', () => {
  for (const step of ['common', 'strategy', 'apply', 'test-correction', 'renumbering-plan']) {
    const source = read(`sai/commands/merge/steps/${step}.md`);
    assert.equal(source.includes(FETCH_LINE), ['apply', 'test-correction'].includes(step), step);
  }
});

for (const harness of ['claude', 'opencode']) {
  test(`${harness} projects the shared code-writing instructions and unchanged policy`, () => {
    const base = path.join(repoRoot, '.tmp', 'code-quality-worker-coverage', harness);
    const destinationRoot = Object.fromEntries(
      ['agents', 'commands', 'config', 'sai', 'skills', 'root'].map(key => [key, path.join(base, key)]),
    );
    const entries = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const file of [POLICY, ...CODE_WRITERS, ...MERGE_STEPS, 'sai/commands/merge/worker.md']) {
      const destination = path.join(destinationRoot.sai, file.slice('sai/'.length));
      const matches = entries.filter(entry => entry.destinationPath === destination);
      assert.equal(matches.length, 1, file);
      assert.equal(matches[0].sourceText ?? fs.readFileSync(matches[0].sourcePath, 'utf8'), read(file), file);
    }
  });
}

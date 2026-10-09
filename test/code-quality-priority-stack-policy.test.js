'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const POLICY = 'sai/policies/code-quality-priority-stack.md';
const FETCH_LINE = 'Fetch @sai/policies/code-quality-priority-stack.md';
const IMPLEMENT_COMMON = 'sai/commands/implement/steps/common.md';
const REVIEW_PASS_6 = 'sai/commands/review/steps/resolve-review-analysis.md';
const STACK_HEADING = '## Code Quality Priority Stack';

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

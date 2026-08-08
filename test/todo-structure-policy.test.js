'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const POLICY_PATH = 'sai/policies/todo-structure.md';

function policy() {
  const fullPath = path.join(repoRoot, POLICY_PATH);
  assert.equal(fs.existsSync(fullPath), true, `${POLICY_PATH} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('todo-structure policy fixes the render threshold at three steps', () => {
  const source = policy();

  assert.match(source, /fewer than three|less than three|below three/i);
  assert.match(source, /three or more|at least three|three steps or more/i);
  assert.match(source, /three/i);
});

test('todo-structure policy renders no task list below the threshold and renders at or above it', () => {
  const source = policy();

  assert.match(source, /no task list|renders nothing|nothing.*renders|no list/i);
  assert.match(source, /renders(?: a task list| the task list|)?/i);
});

test('todo-structure policy keeps the threshold constant single-sourced in the policy itself', () => {
  const source = policy();

  assert.match(source, /threshold.*(?:lives|defined|declared|fixed) only|only.*threshold|single[- ]source/i);
  assert.match(source, /reference the policy/i);
  assert.match(source, /without restating|restat(?:e|ing).*(?:the value|threshold)|do not restate/i);
});

test('todo-structure policy restricts task-list tool-call emission to the coordinator session', () => {
  const source = policy();

  assert.match(source, /coordinator session|coordinator\b/i);
  assert.match(source, /never.*worker|worker.*never/i);
  assert.match(source, /exclusively|only the coordinator/i);
});

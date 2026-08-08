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

test('todo-structure policy names the apply step projection as a governed surface', () => {
  const source = policy();

  assert.match(source, /apply step projection|apply-step projection/i);
  assert.match(source, /governed surface|governs the apply step/i);
});

test('todo-structure policy keeps the apply step projection state vocabulary and deterministic derivation', () => {
  const source = policy();

  assert.match(source, /apply step projection/i);
  assert.match(source, /pending|in_progress|completed/i);
  assert.match(source, /on[- ]disk|marked set/i);
  assert.match(source, /plan order|deriv(?:ed|es|ation)/i);
});

test('todo-structure policy keeps the minimum-threshold rule single-sourced for the apply step projection', () => {
  const source = policy();

  assert.match(source, /apply step projection/i);
  assert.match(source, /minimum[- ]threshold|render threshold/i);
  assert.match(source, /single[- ]source/i);
  assert.match(source, /reference(?:s|d)?(?: the policy)?/i);
  assert.match(source, /without restating|do not restate|never restate/i);
});

test('todo-structure policy keeps apply step projection emission ownership in the coordinator session', () => {
  const source = policy();

  assert.match(source, /apply step projection/i);
  assert.match(source, /coordinator session|coordinator\b/i);
  assert.match(source, /(?:only|exclusively).*coordinator|coordinator.*(?:only|exclusively)/i);
});

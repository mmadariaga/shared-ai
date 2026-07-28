'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { IMPLEMENTATION_ARTIFACTS } = require('../fixtures/implementation-adapter.js');

const repoRoot = path.join(__dirname, '..');

test('Step 1 artifact interfaces remain plain CommonJS maps', () => {
  assert.deepEqual(Object.keys(IMPLEMENTATION_ARTIFACTS).sort(), [
    'coordinator',
    'inlineCaller',
    'invocationCore',
    'worker',
  ]);
  assert.doesNotMatch(JSON.stringify(IMPLEMENTATION_ARTIFACTS), /loader|claude|opencode|copilot/i);
});

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('Step 1 rejects post-resolution terminal payloads without a resolved change name', () => {
  const worker = artifact(IMPLEMENTATION_ARTIFACTS.worker);
  const coordinator = artifact(IMPLEMENTATION_ARTIFACTS.coordinator);

  assert.match(worker, /every post-resolution payload include[s]?[^\n]*resolved_change_name/i);
  assert.match(coordinator, /Every post-resolution payload.*requires `resolved_change_name`/);
  assert.match(coordinator, /terminal\s+navigation/i);
});

test('Step 1 replacement request forwards only the exact reconstruction envelope', () => {
  const coordinator = artifact(IMPLEMENTATION_ARTIFACTS.coordinator);
  for (const field of [
    'original_envelope',
    'resolved_change_name',
    'opaque_input_history',
  ]) {
    assert.match(coordinator, new RegExp(`\\b${field}\\b`));
  }
  assert.match(coordinator, /durable-artifact reconstruction instruction/);
  assert.match(coordinator, /Do not include artifact contents/);
  assert.match(coordinator, /binding identifiers/);
});

test('Step 1 accepts a plan with ordered coverage, RED before GREEN, verification, STOP and COMMIT, and no execution', () => {
  const worker = artifact(IMPLEMENTATION_ARTIFACTS.worker);
  for (const requirement of [
    /implementation\.md/,
    /every task in order/i,
    /verification and STOP markers/i,
    /RED\s+before GREEN/i,
    /human-check encoding/i,
    /executed no implementation step/i,
  ]) {
    assert.match(worker, requirement);
  }
});

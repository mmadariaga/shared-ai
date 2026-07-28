'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  REQUIRED_OPERATIONS,
} = require('../fixtures/implementation-harness-bindings.js');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('Step 2 routed harness bindings expose the required lifecycle symbols', () => {
  for (const relativePath of [
    'sai/orchestration/workers/bindings/claude/implementation-worker.md',
    'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
  ]) {
    const binding = artifact(relativePath);
    for (const operation of REQUIRED_OPERATIONS) {
      assert.match(binding, new RegExp(`## ${operation}`),
        `${relativePath} should expose ${operation}`);
    }
  }
});

test('Step 2 routed harness bindings use only their canonical harness binding', () => {
  const surfaces = [
    {
      name: 'Claude',
      binding: artifact('sai/orchestration/workers/bindings/claude/implementation-worker.md'),
      forwardingSkill: artifact('skills/claude/sai-3-implementation-worker/SKILL.md'),
      permissionTarget: /Agent\s*\(/,
      forbiddenHarness: /opencode[\\/]implementation-worker\.md/,
    },
    {
      name: 'opencode',
      binding: artifact('sai/orchestration/workers/bindings/opencode/implementation-worker.md'),
      forwardingSkill: artifact('skills/opencode/sai-3-implementation-worker/SKILL.md'),
      permissionTarget: /task\s*\(/,
      forbiddenHarness: /claude[\\/]implementation-worker\.md/,
    },
  ];

  for (const surface of surfaces) {
    for (const operation of REQUIRED_OPERATIONS) {
      assert.match(surface.binding, new RegExp(`\\b${operation}\\b`),
        `${surface.name} binding should define ${operation}`);
    }
    assert.match(surface.binding, surface.permissionTarget,
      `${surface.name} binding should use its harness permission target`);
    assert.match(surface.forwardingSkill, /orchestration[\\/]workers[\\/]bindings[\\/]/,
      `${surface.name} runtime skill should resolve a binding source`);
    assert.doesNotMatch(surface.forwardingSkill, surface.forbiddenHarness,
      `${surface.name} runtime skill must not resolve the other harness binding`);
  }
});

test('Step 2 routed harness bindings failed needs_input continuation allows one replacement with complete reconstruction state', () => {
  for (const relativePath of [
    'sai/orchestration/workers/bindings/claude/implementation-worker.md',
    'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
  ]) {
    const binding = artifact(relativePath);

    assert.match(binding, /failed|failure/i);
    assert.match(binding, /at most one|one replacement|single replacement/i);
    assert.match(binding, /dispatch_one_replacement_worker/);
    for (const field of [
      'original_envelope',
      'resolved_change_name',
      'opaque_input_history',
      'durable_artifact_reconstruction_instruction',
    ]) {
      assert.match(binding, new RegExp(`\\b${field}\\b`),
        `${relativePath} should reconstruct ${field}`);
    }
  }
});

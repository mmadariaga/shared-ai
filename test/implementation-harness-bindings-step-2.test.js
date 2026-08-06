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

const WORKERS = [
  ['sai-1-spec-proposal-worker', 'spec-worker.md'],
  ['sai-2-design-worker', 'design-worker.md'],
  ['sai-3-implementation-worker', 'implementation-worker.md'],
  ['sai-5-review-worker', 'review-worker.md'],
  ['sai-6-security-worker', 'security-worker.md'],
  ['sai-7-performance-worker', 'performance-worker.md'],
  ['sai-8-accessibility-worker', 'accessibility-worker.md'],
];

test('Step 2 routed harness bindings expose the required lifecycle symbols', () => {
  for (const harness of ['claude', 'opencode']) {
    const relativePath = `sai/orchestration/workers/bindings/${harness}/implementation-worker.md`;
    const binding = artifact(relativePath);
    for (const operation of REQUIRED_OPERATIONS) {
      assert.match(binding, new RegExp(`## ${operation}`),
        `${relativePath} should expose ${operation}`);
    }
  }
});

test('Step 3 removes worker proxy skills while preserving harness-specific binding sources', () => {
  for (const [harness, permissionTarget] of [
    ['claude', /Agent\s*\(/],
    ['opencode', /task\s*\(/],
  ]) {
    for (const [worker, filename] of WORKERS) {
      assert.equal(fs.existsSync(path.join(repoRoot, 'skills', harness, worker, 'SKILL.md')), false,
        `${harness} worker proxy source should be absent`);

      const relativePath = `sai/orchestration/workers/bindings/${harness}/${filename}`;
      const binding = artifact(relativePath);
      assert.match(binding, permissionTarget,
        `${harness} binding should use its harness permission target`);
      if (filename === 'implementation-worker.md') {
        for (const operation of REQUIRED_OPERATIONS) {
          assert.match(binding, new RegExp(`\\b${operation}\\b`),
            `${relativePath} should define ${operation}`);
        }
      }
    }
  }
});

test('Step 3 keeps all seven managed Claude agents alongside the neutral binding sources', () => {
  for (const [worker, filename] of WORKERS) {
    assert.ok(fs.existsSync(path.join(repoRoot, 'sai', 'orchestration', 'workers', 'bindings', 'claude', filename)));
    assert.ok(fs.existsSync(path.join(repoRoot, 'agents', 'claude', `${worker}.md`)));
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

test('Step 3 documentation does not instruct ownership or copying of retired proxy skills', () => {
  for (const relativePath of ['README.md', 'AGENTS.md', 'INSTALL.claude.md', 'INSTALL.opencode.md', 'INSTALL.copilot.md']) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    const documentation = fs.readFileSync(fullPath, 'utf8');
    assert.doesNotMatch(documentation,
      /(?:copy|install|project|own|forward)[^\n]{0,160}skills[\\/](?:claude|opencode)[\\/]sai-[^\n]*SKILL\.md/i,
      `${relativePath} should not document retired proxy ownership or copying`);
  }
});

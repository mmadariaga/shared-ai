'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  REQUIRED_OPERATIONS,
} = require('../fixtures/implementation-harness-bindings.js');
const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');

const matrixManifest = loadInstallManifest(path.join(__dirname, '..'));
function matrixBinding(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'binding' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix binding should exist`);
  return item.text;
}

function matrixAgent(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'agent' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix agent should exist`);
  return item.text;
}

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

const BINDING_PHASE = Object.fromEntries(WORKERS.map(([worker, filename]) => [
  filename,
  filename.replace('-worker.md', ''),
]));

const OPERATION_PHRASE = {
  dispatch_worker: /Dispatch the worker once|dispatch\s+/i,
  continue_same_worker: /Continue on the same (?:worker|task)/i,
  dispatch_one_replacement_worker: /one bounded replacement|replacement dispatch/i,
};

test('Step 2 routed harness bindings expose the required lifecycle symbols', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = matrixBinding(harness, 'implementation');
    for (const operation of REQUIRED_OPERATIONS) {
      assert.match(binding, OPERATION_PHRASE[operation],
        `${harness} binding should expose ${operation}`);
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

      const binding = matrixBinding(harness, BINDING_PHASE[filename]);
      assert.match(binding, permissionTarget,
        `${harness} binding should use its harness permission target`);
      if (filename === 'implementation-worker.md') {
        for (const operation of REQUIRED_OPERATIONS) {
          assert.match(binding, OPERATION_PHRASE[operation],
            `${harness} binding should define ${operation}`);
        }
      }
    }
  }
});

test('Step 3 keeps all seven managed Claude agents alongside the neutral binding sources', () => {
  for (const [worker, filename] of WORKERS) {
    const phase = BINDING_PHASE[filename];
    assert.match(matrixAgent('claude', phase), new RegExp(worker),
      `the Claude matrix agent should seed ${worker}`);
    assert.match(matrixBinding('claude', phase), /Agent\s*\(/,
      `the Claude matrix binding should render ${filename}`);
    assert.equal(fs.existsSync(path.join(repoRoot, 'agents', 'claude', `${worker}.md`)), false,
      `no per-harness ${worker} agent source should exist`);
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'orchestration', 'workers', 'bindings', 'claude', filename)), false,
      `no per-harness ${filename} binding source should exist`);
  }
});

test('Step 2 routed coordinator failed needs_input continuation allows one replacement with complete reconstruction state', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const fields = [
    'original_envelope',
    'resolved_change_name',
    'opaque_input_history',
    'durable[- ]artifact reconstruction instruction',
  ];

  assert.match(coordinator, /failed|failure/i,
    'the coordinator should handle failed continuations');
  assert.match(coordinator, /at most one replacement|one fresh worker|one replacement/i,
    'the coordinator should allow one replacement');
  assert.match(coordinator, /replacement_reconstruction_fields/,
    'the coordinator should declare the reconstruction field set');
  for (const field of fields) {
    assert.match(coordinator, new RegExp(field),
      `the coordinator should reconstruct ${field}`);
  }
  for (const harness of ['claude', 'opencode']) {
    const binding = matrixBinding(harness, 'implementation');
    assert.match(binding, /one bounded replacement|replacement/i,
      `${harness} binding should carry the replacement path`);
    assert.match(binding, /reconstruction fields|originating binding context/i,
      `${harness} binding should carry the reconstruction fields`);
  }
});

test('Step 3 documentation does not instruct ownership or copying of retired proxy skills', () => {
  for (const relativePath of ['README.md', 'AGENTS.md']) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    const documentation = fs.readFileSync(fullPath, 'utf8');
    assert.doesNotMatch(documentation,
      /(?:copy|install|project|own|forward)[^\n]{0,160}skills[\\/](?:claude|opencode)[\\/]sai-[^\n]*SKILL\.md/i,
      `${relativePath} should not document retired proxy ownership or copying`);
  }
});

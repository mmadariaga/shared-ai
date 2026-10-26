'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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
  ['sai-5-security-worker', 'security-worker.md'],
  ['sai-6-performance-worker', 'performance-worker.md'],
  ['sai-7-accessibility-worker', 'accessibility-worker.md'],
  ['sai-commit-worker', 'commit-worker.md'],
  ['sai-archive-worker', 'archive-worker.md'],
  ['sai-backfill-worker', 'backfill-worker.md'],
  ['sai-direct-build-worker', 'direct-build-worker.md'],
];

// Every worker binding renders from the standalone template, which carries only the create and
// continue calls and leaves the lifecycle to the coordinator. The routed template stays in the
// source tree until its last consumer retires.

const BINDING_PHASE = Object.fromEntries(WORKERS.map(([worker, filename]) => [
  filename,
  filename.replace('-worker.md', ''),
]));

const STANDALONE_OPERATION_PHRASE = {
  dispatch_worker: /Create the worker with the ready prompt alone/,
  continue_same_worker: /Send every later message[\s\S]*to the captured handle/,
};

test('Step 2 standalone harness bindings expose the create and continue calls and carry no replacement machinery', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const [, filename] of WORKERS) {
      const binding = matrixBinding(harness, BINDING_PHASE[filename]);
      for (const [operation, phrase] of Object.entries(STANDALONE_OPERATION_PHRASE)) {
        assert.match(binding, phrase, `${harness} ${filename} binding should expose ${operation}`);
      }
      assert.doesNotMatch(binding, /replacement_reconstruction_fields|continue_after_|command-runner/,
        `${harness} ${filename} binding leaves the lifecycle to its coordinator`);
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
      for (const [operation, phrase] of Object.entries(STANDALONE_OPERATION_PHRASE)) {
        assert.match(binding, phrase, `${harness} binding should define ${operation}`);
      }
    }
  }
});

test('Step 3 keeps the managed Claude phase agents alongside the neutral binding sources', () => {
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

test('every worker binding fetches the cache-warming policy and names its harness dispose action, once', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/policies/cache-warming.md')), 'the policy the bindings fetch exists');
  for (const harness of ['claude', 'opencode']) {
    for (const [, filename] of WORKERS) {
      const binding = matrixBinding(harness, BINDING_PHASE[filename]);
      assert.equal(binding.match(/^Fetch @sai\/policies\/cache-warming\.md$/gm)?.length, 1, `${harness} ${filename} fetches the policy once`);
      assert.match(binding, /disposes the worker at run close, at a segment\s+boundary, and when it replaces the worker/, `${harness} ${filename} names the dispose points`);
      if (harness === 'claude') assert.match(binding, /TaskStop\(task_id: "<captured agent ID>"\)/, `${filename} stops the worker by agent ID`);
      else assert.match(binding, /removes the outstanding shell[\s\S]*interrupts that session[\s\S]*`dispose` message/, `${filename} removes the shell, interrupts the session, and falls back to the message`);
    }
  }
});

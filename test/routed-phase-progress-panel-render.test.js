'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readExploreContract() {
  const exploreSources = [
    'sai/commands/explore/instructions.md',
    'sai/commands/explore/steps/common.md',
    'sai/commands/explore/steps/review-edge-cases.md',
    'sai/commands/explore/steps/implementation-details.md',
    'sai/commands/explore/steps/artifact-review-language-gate.md',
    'sai/commands/explore/steps/slicing-assessment.md',
    'sai/commands/explore/steps/crystallization-protocol.md',
    'sai/commands/explore/steps/crystallization-language-gates.md',
    'sai/commands/explore/steps/review-loop.md',
    'sai/commands/explore/steps/pipeline-selector.md',
    'sai/commands/explore/steps/pipeline-plan-unattended.md',
    'sai/commands/explore/steps/pipeline-direct-build.md',
    'sai/commands/explore/direct-build-coordinator.md',
    'sai/commands/explore/steps/idea-list.md',
  ];
  return exploreSources.map(relativePath => read(relativePath)).join('\n');
}

test('todo policy defines a conditional progress-event render act', () => {
  const policy = read('sai/policies/todo-structure.md');

  assert.match(policy, /Rendering actions/);
  assert.match(policy, /Render at dispatch/);
  assert.match(policy, /state-changing progress event/);
  assert.match(policy, /at least one previously unmarked id declared/);
  assert.match(policy, /no render and stamps nothing/);
  assert.doesNotMatch(policy, /no render and issues no wall-clock call/);
  assert.match(policy, /state-changing progress-event update stamps every newly completed step/);
  assert.match(policy, /no-op progress event stamps nothing/);
  assert.match(policy, /Reconcile at the phase's reconciliation trigger/);
  assert.doesNotMatch(policy, /on each worker progress event, apply the deterministic derivation/);
});

test('shared runner renders only after a progress event changes the marked set', () => {
  const runner = read('sai/orchestration/command-runner.md');

  assert.match(runner, /record(?:s|ing) whether the\s+event[\s\S]{0,120}previously unmarked declared id/i);
  assert.match(runner, /visual `progress_plan` exists[\s\S]{0,180}changed its marked set/);
  assert.match(runner, /routing-only event performs\s+no render and stamps\s+nothing/);
  assert.doesNotMatch(runner, /changed no marked state performs no render or wall-clock/);
  assert.match(runner, /changed_files[\s\S]{0,180}progress-event render act/);
  assert.match(runner, /After validation and registration, issue the independent panel updates and same-worker continuation in one assistant turn/);
  assert.match(runner, /continuation remains exactly `continue_after_progress`/);
});

test('every matrix binding is standalone and binds no panel mechanics', () => {
  const manifest = loadInstallManifest(repoRoot);

  for (const harness of ['claude', 'opencode']) {
    const bindings = matrixRenderFor(manifest, harness, repoRoot)
      .filter(item => item.kind === 'binding');

    const standaloneBindings = bindings.filter(item => ['direct-build', 'spec', 'design', 'security', 'performance', 'accessibility', 'commit', 'archive', 'backfill', 'red', 'green', 'review'].includes(item.phase));
    assert.equal(standaloneBindings.length, 12, `${harness} should retain direct-build, spec, design, the three audits, commit, archive, backfill, RED, GREEN, and review bindings`);
    assert.equal(bindings.length, 13, `${harness} binds the 12 listed workers and the merge worker, all standalone`);
    for (const binding of standaloneBindings) {
      assert.doesNotMatch(binding.text, /panel-render\.md/,
        `${harness}/${binding.destinationName} must not bind the progress panel for a standalone coordinator`);
      const dispatchPrefix = binding.text.slice(0, binding.text.indexOf('Dispatch the worker'));
      assert.doesNotMatch(dispatchPrefix, /\n\n\n/,
        `${harness}/${binding.destinationName} must not contain a blank placeholder block`);
    }
  }
});

test('the plan family renders no task list and keeps pointer routing in its own cards', () => {
  const explore = readExploreContract();

  assert.doesNotMatch(explore, /spec-standalone@1|design-standalone@1/, 'the retired plan machines are gone from explore');
  assert.doesNotMatch(explore, /SpecStepPointerMap/, 'the static SpecStepPointerMap reference should not remain');
  for (const relativePath of ['sai/commands/spec/coordinator.md', 'sai/commands/design/coordinator.md', 'sai/commands/plan/cycle.md']) {
    const card = read(relativePath);
    assert.doesNotMatch(card, /progress_plan|todo-structure|panel-render/, `${relativePath} declares no progress plan and renders no panel`);
  }
  assert.match(read('sai/commands/plan/cycle.md'), /Active step: <stage> — follow <next\.follow>/, 'pointer routing stays active');
});

test('panel degradation is declared for routed phases and explore', () => {
  // Check explore separately since it needs the whole contract
  assert.match(readExploreContract(), /unavailable at runtime/,
    'sai/commands/explore/instructions.md should define the runtime panel degradation route');
});

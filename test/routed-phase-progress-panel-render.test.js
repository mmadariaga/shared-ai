'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const routedPhases = [
  'spec',
  'design',
  'implementation',
  'review',
  'security',
  'performance',
  'accessibility',
  'commit',
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readExploreContract() {
  const exploreSources = [
    'sai/commands/explore/instructions.md',
    'sai/commands/explore/steps/common.md',
    'sai/commands/explore/steps/artifact-review-language-gate.md',
    'sai/commands/explore/steps/slicing-assessment.md',
    'sai/commands/explore/steps/crystallization-protocol.md',
    'sai/commands/explore/steps/crystallization-language-gates.md',
    'sai/commands/explore/steps/review-loop.md',
    'sai/commands/explore/steps/pipeline-selector.md',
    'sai/commands/explore/steps/pipeline-plan-unattended.md',
    'sai/commands/explore/steps/pipeline-direct-build.md',
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
  assert.match(runner, /routing-only event performs no render and stamps\nnothing/);
  assert.doesNotMatch(runner, /changed no marked state performs no render or wall-clock/);
  assert.match(runner, /changed_files[\s\S]{0,180}progress-event render act/);
  assert.match(runner, /render act[\s\S]{0,320}continue_after_progress/);
});

test('routed coordinators delegate progress rendering to the shared policy', () => {
  const coordinatorPaths = [
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md',
    'sai/commands/review/coordinator.md',
    'sai/commands/security/coordinator.md',
    'sai/commands/performance/coordinator.md',
    'sai/commands/accessibility/coordinator.md',
  ];

  for (const relativePath of coordinatorPaths) {
    const coordinator = read(relativePath);
    assert.match(coordinator, /Progress-event\s+panel updates follow/);
    assert.match(coordinator, /panel tool is unavailable at runtime|declared panel tool is unavailable at runtime/);
    assert.match(coordinator, /record its notice/);
    assert.match(coordinator, /disable later[\s\S]{0,40}panel calls/);
    assert.doesNotMatch(coordinator, /Re-render the list on every progress event/);
  }
});

test('routed matrix bindings reference the matching harness panel mechanics', () => {
  const manifest = loadInstallManifest(repoRoot);

  for (const harness of ['claude', 'opencode']) {
    const bindings = matrixRenderFor(manifest, harness, repoRoot)
      .filter(item => item.kind === 'binding');

    for (const phase of routedPhases) {
      const binding = bindings.find(item => item.phase === phase);
      assert.ok(binding, `${harness}/${phase} binding should exist`);
      assert.match(binding.text, /When the coordinator adapter declares a `progress_plan`/);
      assert.match(
        binding.text,
        new RegExp(`Fetch @sai/adapters/${harness}/panel-render\\.md`),
        `${harness}/${phase} should fetch its panel-render binding`,
      );
      assert.match(binding.text, /todo-structure\.md/);
      assert.match(binding.text, /worker never emits panel tool calls/);
      assert.match(binding.text, /When no `progress_plan` is declared, no plan-based list is rendered/);
    }

    const applyBindings = bindings.filter(item => item.phase === 'apply');
    assert.equal(applyBindings.length, 2, `${harness} should retain RED and GREEN bindings`);
    for (const binding of applyBindings) {
      assert.doesNotMatch(binding.text, /panel-render\.md/,
        `${harness}/${binding.destinationName} must not bind the progress panel for apply`);
      const dispatchPrefix = binding.text.slice(0, binding.text.indexOf('Dispatch the worker'));
      assert.doesNotMatch(dispatchPrefix, /\n\n\n/,
        `${harness}/${binding.destinationName} must not contain a blank placeholder block`);
    }
  }
});

test('supervised explore runs keep visual plan rendering disabled while retaining pointer routing', () => {
  const explore = readExploreContract();

  assert.match(explore, /declares no visual `progress_plan`/);
  assert.match(explore, /no task-list step is marked and no milestone stamp is rendered/i);
  assert.match(explore, /canonical routing-only `SpecStepPointerMap`/);
});

test('panel degradation is declared for routed phases, apply projection, and explore', () => {
  for (const relativePath of [
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md',
    'sai/commands/review/coordinator.md',
    'sai/commands/security/coordinator.md',
    'sai/commands/performance/coordinator.md',
    'sai/commands/accessibility/coordinator.md',
    'sai/commands/apply/coordinator.md',
  ]) {
    assert.match(read(relativePath), /unavailable at runtime/,
      `${relativePath} should define the runtime panel degradation route`);
  }
  // Check explore separately since it needs the whole contract
  assert.match(readExploreContract(), /unavailable at runtime/,
    'sai/commands/explore/instructions.md should define the runtime panel degradation route');
});

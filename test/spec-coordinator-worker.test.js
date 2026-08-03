'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  SPEC_COORDINATOR_ARTIFACTS,
  REQUIRED_OPERATIONS,
} = require('../fixtures/spec-coordinator-worker.js');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('spec invocation core loads only the technical instruction sequence', () => {
  const core = artifact('sai/commands/spec/invocation.md');

  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/policies/glossary-format.md',
    'Fetch @sai/instructions/spec.propose.md',
    'Fetch @skills/openspec-propose/SKILL.md',
    'Fetch @sai/policies/remember.md',
  ];
  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /\*\*User's request:\*\*\s*\$ARGUMENTS/);
  assert.doesNotMatch(core, /Fetch @sai\/policies\/prereqs\.md/);
  assert.doesNotMatch(core, /Fetch @sai\/policies\/artifact-feedback-gate\.md/);
  assert.doesNotMatch(core, /Spec proposal done in openspec\/changes\//);
});

test('existing Copilot wrapper reaches the shared spec core without routed workers', () => {
  const wrapper = artifact('commands/copilot/sai-1-spec.prompt.md');
  const entrypoint = artifact('sai/commands/sai-1-spec.md');

  assert.match(wrapper, /Fetch @sai\/commands\/sai-1-spec\.md/);
  assert.doesNotMatch(wrapper, /worker|coordinator/i);
  assert.doesNotMatch(entrypoint, /worker|coordinator/i);
});

test('inline completion remains outside the spec invocation core', () => {
  const core = artifact('sai/commands/spec/invocation.md');
  const inline = artifact('sai/commands/sai-1-spec.md');

  assert.doesNotMatch(core, /decision summary|feedback gate|MANDATORY STOP|Spec proposal done in openspec\/changes\//i);
  assert.match(inline, /decision summary/i);
  assert.match(inline, /artifact-feedback-gate\.md/);
  assert.match(inline, /Spec proposal done in openspec\/changes\/\{name\}\/\./);
});

test('coordinator declares lifecycle-only ownership and the exact two-string envelope', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);
  assert.match(coordinator, /only metadata|user-facing spec coordinator/i);
  assert.match(coordinator, /wrapper_echo_value/);
  assert.match(coordinator, /arguments_value/);
  assert.match(coordinator, /exactly two|two strings/i);
  assert.match(coordinator, /allowed_nonterminal_extensions|extensions.*empty/i);
  assert.match(coordinator, /extension_handlers|handlers.*empty/i);
  assert.match(coordinator, /no design notice state/i);
  assert.deepEqual(REQUIRED_OPERATIONS, [
    'dispatch_worker', 'continue_same_worker', 'dispatch_one_replacement_worker',
  ]);
  assert.match(coordinator, /dispatch exactly one|start exactly one/i);
  assert.match(coordinator, /continue the same worker/i);
  assert.match(coordinator, /at most one replacement/i);
});

test('coordinator preserves closed statuses, ordered picker forwarding, and opaque history', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);
  assert.match(coordinator, /needs_input/);
  assert.match(coordinator, /completed/);
  assert.match(coordinator, /closed lifecycle statuses/);
  assert.match(coordinator, /question/);
  assert.match(coordinator, /options/);
  assert.match(coordinator, /answer_value/);
  assert.match(coordinator, /opaque input history/i);
  assert.match(coordinator, /order|ordered/i);
});

test('coordinator unions changed files in order and replaces a failed continuation once', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);
  assert.match(coordinator, /changed-file union/);
  assert.match(coordinator, /ordered duplicate-free/);
  assert.match(coordinator, /continue the same worker/i);
  assert.match(coordinator, /one replacement worker/i);
  assert.match(coordinator, /same[- ]worker.*before|before.*same[- ]worker/i);
  assert.match(coordinator, /at most one|one replacement|once/i);
});

test('worker owns prerequisites, resolution, artifacts, summary, and feedback responsibilities', () => {
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);
  for (const responsibility of [
    'prerequisite', 'resolved_change_name', 'artifact', 'summary', 'feedback',
  ]) assert.match(worker, new RegExp(responsibility, 'i'));
  assert.match(worker, /metadata[- ]only|metadata/);
  assert.doesNotMatch(worker, /artifact_contents/);
});

test('Claude and opencode bindings mirror envelope and continuation mechanics', () => {
  const claude = artifact(SPEC_COORDINATOR_ARTIFACTS.claudeBinding);
  const opencode = artifact(SPEC_COORDINATOR_ARTIFACTS.opencodeBinding);
  for (const binding of [claude, opencode]) {
    assert.match(binding, /original (InvocationEnvelope|envelope)/i);
    assert.match(binding, /continuation|Continue/i);
    assert.match(binding, /at most one fresh|one replacement/i);
    assert.match(binding, /binding[- ]owned.*metadata|metadata.*binding[- ]owned/i);
  }
  assert.match(claude, /SendMessage|agent ID/i);
  assert.match(opencode, /task|session|continu/i);
});

test('Claude spec invocation routes through the coordinator and Claude worker binding', () => {
  const wrapper = artifact('commands/claude/sai-1-spec.md');
  const claudeBinding = artifact('sai/orchestration/workers/bindings/claude/spec-worker.md');
  const manifest = artifact('sai/install-manifest.json');
  assert.match(wrapper, /^model:\s*opus\s*$/m);
  assert.match(wrapper, /^effort:\s*medium\s*$/m);
  assert.match(wrapper, /spec[\\/]coordinator\.md/);
  assert.match(wrapper, /sai-1-spec-proposal-worker/);
  assert.match(claudeBinding, /subagent_type:\s*"sai-1-spec-proposal-worker"/);
  assert.match(manifest, /agents\/claude\/sai-1-spec-proposal-worker\.md/);
  assert.match(wrapper, /\$ARGUMENTS/);
});

test('opencode spec invocation routes through the coordinator and opencode worker binding', () => {
  const wrapper = artifact('commands/opencode/sai-1-spec.md');
  assert.match(wrapper, /^model:\s*opencode-go\/minimax-m3\s*$/m);
  assert.match(wrapper, /spec[\\/]coordinator\.md/);
  assert.match(wrapper, /sai-1-spec-proposal-worker/);
  assert.match(wrapper, /\$ARGUMENTS/);
});

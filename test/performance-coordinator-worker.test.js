'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function projectedSources(harness) {
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: path.join(repoRoot, '.test-performance-commands'),
    sai: path.join(repoRoot, '.test-performance-sai'),
    skills: path.join(repoRoot, '.test-performance-skills'),
    agents: path.join(repoRoot, '.test-performance-agents'),
    config: path.join(repoRoot, '.test-performance-config'),
  };
  return expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
    .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'));
}

test('performance invocation core loads the shared audit sequence in order', () => {
  const core = artifact('sai/commands/performance/invocation.md');
  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/instructions/performance.md',
    'Fetch @sai/policies/remember.md',
  ];

  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /\$ARGUMENTS/);
  assert.equal((core.match(/Fetch @sai\/instructions\/performance\.md/g) || []).length, 1);
  assert.doesNotMatch(core, /InvocationEnvelope|resolved_change_name|terminal navigation|MANDATORY STOP/i);
  assert.doesNotMatch(core, /Files Affected[\s\S]{0,240}sai\/instructions\/performance\.md/);
});

test('Copilot inline caller shares the performance invocation core and retains its boundaries', () => {
  const caller = artifact('sai/commands/sai-7-performance.md');

  assert.match(caller, /Fetch @sai\/commands\/performance\/invocation\.md/);
  assert.match(caller, /<TASK>[\s\S]*## Prerequisite checks/);
  assert.match(caller, /Fetch @sai\/policies\/prereqs\.md/);
  assert.match(caller, /## Resolve change[\s\S]*Fetch @sai\/policies\/change-picker\.md/);
  assert.match(caller, /## Technical performance audit[\s\S]*Fetch @sai\/commands\/performance\/invocation\.md/);
  assert.match(caller, /## Completion[\s\S]*MANDATORY STOP/);
  assert.match(caller, /\$ARGUMENTS/);
});

test('generic Copilot projections retain both performance entrypoints', () => {
  const sources = new Set(projectedSources('copilot'));

  assert.equal(sources.has('sai/commands/sai-7-performance.md'), true);
  assert.equal(sources.has('commands/copilot/sai-7-performance.prompt.md'), true);
});

test('performance coordinator exposes the complete adapter contract', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');
  const fields = [
    'original_envelope',
    'dispatch_operation',
    'continuation_operation',
    'allowed_nonterminal_extensions',
    'extension_handlers',
    'replacement_reconstruction_fields',
    'terminal_navigation',
  ];

  assert.match(coordinator, /performance_coordinator_adapter/);
  for (const field of fields) {
    assert.match(coordinator, new RegExp(`\\b${field}\\b`));
  }
  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,120}(?:empty|\[\])/i);
  assert.match(coordinator, /extension_handlers[\s\S]{0,120}(?:empty|\{\})/i);
  assert.match(coordinator, /terminal_navigation[\s\S]{0,120}Performance audit done\./i);
});

test('performance coordinator validates lifecycle payloads and terminal statuses', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');

  assert.match(coordinator, /validat(?:e|es|ion)[\s\S]{0,240}(?:lifecycle|worker)[\s\S]{0,240}(?:payload|result)/i);
  for (const status of ['completed', 'needs_input', 'failed', 'cancelled']) {
    assert.match(coordinator, new RegExp(`\\b${status}\\b`));
  }
  for (const field of ['summary', 'changed_files', 'resolved_change_name', 'question', 'options']) {
    assert.match(coordinator, new RegExp(`\\b${field}\\b`));
  }
  assert.match(coordinator, /status[\s\S]{0,180}(?:exactly|only)[\s\S]{0,180}(?:completed|needs_input|failed|cancelled)/i);
});

test('performance coordinator preserves summary text and unions changed paths in first-seen order', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');

  assert.match(coordinator, /changed_files[\s\S]{0,240}(?:ordered|first[- ]seen)[\s\S]{0,120}union/i);
  assert.match(coordinator, /(?:print|preserve)[\s\S]{0,160}(?:worker )?summary[\s\S]{0,160}(?:unchanged|verbatim|exactly)/i);
  assert.ok(coordinator.includes('Performance audit done.'));
});

test('performance coordinator performs no technical prerequisite or research I/O', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');

  for (const operation of [
    'prerequisite',
    'artifact',
    'git',
    'diff',
    'tier',
    'diagnostic',
    'research',
  ]) {
    assert.match(
      coordinator,
      new RegExp(`(?:SHALL NOT|MUST NOT|does not)[^\\n]{0,180}${operation}`, 'i'),
      `coordinator should prohibit ${operation} I/O`
    );
  }
});

test('canonical performance worker preserves the scope, ordering, tier, and evidence contract', () => {
  const worker = artifact('sai/orchestration/workers/sai-7-performance-worker.md');

  assert.match(worker, /complete scope grammar/i);
  assert.match(worker, /parent[- ]branch[\s\S]{0,160}order/i);
  assert.match(worker, /four tiers|tier 1[\s\S]{0,120}tier 4/i);
  assert.match(worker, /500[- ]LOC cutover/i);
  assert.match(worker, /eight[- ]call cap|8[- ]call cap/i);
  assert.match(worker, /exact evidence policy/i);
});

test('canonical performance worker defines all lifecycle payload shapes', () => {
  const worker = artifact('sai/orchestration/workers/sai-7-performance-worker.md');

  for (const payload of [
    'worker_completed',
    'worker_needs_input_before_resolution',
    'worker_unsuccessful',
  ]) {
    assert.match(worker, new RegExp(`\\b${payload}\\b`));
  }
  assert.match(worker, /needs_input[\s\S]{0,240}question[\s\S]{0,240}options/i);
  assert.match(worker, /failed[\s\S]{0,160}cancelled[\s\S]{0,240}resolved_change_name/i);
  assert.match(worker, /changed_files[\s\S]{0,240}summary/i);
});

test('successful performance execution writes and verifies only performance.md', () => {
  const worker = artifact('sai/orchestration/workers/sai-7-performance-worker.md');

  assert.match(worker, /successful[\s\S]{0,240}(?:write|create)[\s\S]{0,240}openspec\/changes\/\{change-name\}\/performance\.md/i);
  assert.match(worker, /verif(?:y|ies|ication)[\s\S]{0,240}performance\.md/i);
  assert.match(worker, /only[\s\S]{0,120}performance\.md/i);
});

test('performance lifecycle payloads carry metadata rather than report contents', () => {
  const worker = artifact('sai/orchestration/workers/sai-7-performance-worker.md');

  assert.match(worker, /lifecycle payloads?[\s\S]{0,240}metadata[\s\S]{0,240}(?:not|rather than|exclude)[\s\S]{0,160}(?:report|performance\.md) contents/i);
  assert.match(worker, /report contents[\s\S]{0,160}(?:shall not|must not|never|exclude)/i);
});

test('Step 3 Claude and opencode bindings route only their canonical performance worker', () => {
  const bindings = [
    {
      name: 'Claude',
      path: 'sai/orchestration/workers/bindings/claude/performance-worker.md',
      identity: 'canonical managed Agent identity',
      mechanism: 'Agent',
    },
    {
      name: 'opencode',
      path: 'sai/orchestration/workers/bindings/opencode/performance-worker.md',
      identity: 'canonical numbered task identity',
      mechanism: 'task',
    },
  ];

  for (const binding of bindings) {
    const source = artifact(binding.path);
    assert.match(source, new RegExp(`${binding.identity}[\\s\\S]{0,100}sai-7-performance-worker`, 'i'),
      `${binding.name} binding should declare the canonical worker identity`);
    assert.match(source, new RegExp(`${binding.mechanism}[\\s\\S]{0,100}sai-7-performance-worker`, 'i'),
      `${binding.name} binding should dispatch only its canonical worker`);
    assert.match(source, /complete original envelope|original_envelope/i,
      `${binding.name} dispatch should preserve the original envelope`);
    assert.match(source, /same-worker continuation|continue[\s\S]{0,100}same worker/i,
      `${binding.name} should attempt same-worker continuation first`);
    assert.match(source, /at most one replacement|one replacement|replacement[\s\S]{0,100}1/i,
      `${binding.name} should permit at most one replacement`);
  }
});

test('Step 3 bindings bound delegated research evidence and reject unauthorized operations', () => {
  for (const relativePath of [
    'sai/orchestration/workers/bindings/claude/performance-worker.md',
    'sai/orchestration/workers/bindings/opencode/performance-worker.md',
  ]) {
    const binding = artifact(relativePath);
    assert.match(binding, /bounded evidence/i, `${relativePath} should bound research evidence`);
    assert.match(binding, /eight-call cap|8-call cap|cap of 8/i,
      `${relativePath} should enforce the eight-call audit cap`);
    assert.match(binding, /authorized read-only diagnostics/i,
      `${relativePath} should permit only authorized read-only diagnostics`);
    assert.match(binding, /reject[\s\S]{0,240}(?:write-capable delegation|production|schema|migration|config|dependency)/i,
      `${relativePath} should reject unauthorized writes and mutations`);
  }
});

test('Step 3 bindings preserve worker lifecycle results and own continuation metadata', () => {
  for (const relativePath of [
    'sai/orchestration/workers/bindings/claude/performance-worker.md',
    'sai/orchestration/workers/bindings/opencode/performance-worker.md',
  ]) {
    const binding = artifact(relativePath);
    for (const field of ['summary', 'question', 'ordered options', 'paths', 'resolved names']) {
      assert.match(binding, new RegExp(field, 'i'), `${relativePath} should preserve ${field}`);
    }
    assert.match(binding, /continuation metadata[\s\S]{0,100}(?:binding-owned|owned by the binding)/i,
      `${relativePath} continuation metadata should remain binding-owned`);
  }
});

test('Step 3 managed-agent and forwarding-skill identities match the canonical binding identity', () => {
  const identity = 'sai-7-performance-worker';
  const surfaces = [
    'agents/claude/sai-7-performance-worker.md',
    'skills/claude/sai-7-performance-worker/SKILL.md',
    'skills/opencode/sai-7-performance-worker/SKILL.md',
  ];

  for (const relativePath of surfaces) {
    assert.match(artifact(relativePath), new RegExp(identity),
      `${relativePath} should use the canonical performance worker identity`);
  }
  assert.match(artifact('agents/claude/sai-7-performance-worker.md'), /managed agent/i);
  assert.match(artifact('skills/claude/sai-7-performance-worker/SKILL.md'), /Claude forwarding skill/i);
  assert.match(artifact('skills/opencode/sai-7-performance-worker/SKILL.md'), /opencode forwarding skill/i);
});

test('Step 4 routed performance wrappers fetch only their matching skill and coordinator surfaces', () => {
  const wrappers = [
    {
      name: 'Claude',
      path: 'commands/claude/sai-7-performance.md',
      model: /^model:\s*\S+$/m,
      setting: /^effort:\s*\S+$/m,
      forbidden: /skills[\\/]opencode[\\/]sai-7-performance-worker|opencode-worker/i,
    },
    {
      name: 'opencode',
      path: 'commands/opencode/sai-7-performance.md',
      model: /^model:\s*\S+$/m,
      setting: /^variant:\s*\S+$/m,
      forbidden: /skills[\\/]claude[\\/]sai-7-performance-worker|claude-worker/i,
    },
  ];

  for (const wrapper of wrappers) {
    const source = artifact(wrapper.path);
    assert.match(source, wrapper.model, `${wrapper.name} wrapper should declare its model`);
    assert.match(source, wrapper.setting, `${wrapper.name} wrapper should declare its harness setting`);
    assert.match(source, /sai[\\/]commands[\\/]performance[\\/]coordinator\.md/,
      `${wrapper.name} wrapper should fetch the performance coordinator`);
    assert.match(source, /skills[\\/]sai-7-performance-worker[\\/]SKILL\.md/,
      `${wrapper.name} wrapper should fetch the matching forwarding skill`);
    assert.match(source, /\$ARGUMENTS/, `${wrapper.name} wrapper should preserve complete arguments`);
    assert.doesNotMatch(source, wrapper.forbidden,
      `${wrapper.name} wrapper should not fetch the other harness binding`);
  }
});

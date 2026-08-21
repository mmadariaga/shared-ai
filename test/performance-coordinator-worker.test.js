'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

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
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

test('Step 1 performance card uses neutral root protocols and retires flat canonical sources', () => {
  const worker = artifact('sai/commands/performance/worker.md');
  assert.match(worker, /@sai\/orchestration\/worker-core\.md/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-7-performance-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('performance invocation core loads the shared audit sequence in order', () => {
  const core = artifact('sai/commands/performance/invocation.md');
  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/commands/performance/instructions.md',
    'Fetch @sai/policies/remember.md',
  ];

  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /\$ARGUMENTS/);
  assert.equal((core.match(/Fetch @sai\/commands\/performance\/instructions\.md/g) || []).length, 1);
  assert.doesNotMatch(core, /InvocationEnvelope|resolved_change_name|terminal navigation|MANDATORY STOP/i);
  assert.doesNotMatch(core, /Files Affected[\s\S]{0,240}sai\/commands\/performance\/instructions\.md/);
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
  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,240}progress/i);
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
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(worker, /complete scope grammar/i);
  assert.match(worker, /parent[- ]branch[\s\S]{0,160}order/i);
  assert.match(worker, /four tiers|tier 1[\s\S]{0,120}tier 4/i);
  assert.match(worker, /500[- ]LOC cutover/i);
  assert.match(worker, /eight[- ]call cap|8[- ]call cap/i);
  assert.match(worker, /exact evidence policy/i);
});

test('canonical performance worker defines all lifecycle payload shapes', () => {
  const worker = artifact('sai/commands/performance/worker.md');

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
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(worker, /successful[\s\S]{0,240}(?:write|create)[\s\S]{0,240}openspec\/changes\/\{change-name\}\/performance\.md/i);
  assert.match(worker, /verif(?:y|ies|ication)[\s\S]{0,240}performance\.md/i);
  assert.match(worker, /only[\s\S]{0,120}performance\.md/i);
});

test('performance lifecycle payloads carry metadata rather than report contents', () => {
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(worker, /lifecycle payloads?[\s\S]{0,240}metadata[\s\S]{0,240}(?:not|rather than|exclude)[\s\S]{0,160}(?:report|performance\.md) contents/i);
  assert.match(worker, /report contents[\s\S]{0,160}(?:shall not|must not|never|exclude)/i);
});

test('Step 3 Claude and opencode bindings route only their canonical performance worker', () => {
  const surfaces = [
    {
      name: 'Claude',
      binding: matrixBinding('claude', 'performance'),
      mechanism: 'Agent',
    },
    {
      name: 'opencode',
      binding: matrixBinding('opencode', 'performance'),
      mechanism: 'task',
    },
  ];

  for (const binding of surfaces) {
    const source = binding.binding;
    assert.match(source, new RegExp(`${binding.mechanism}[\\s\\S]{0,100}sai-7-performance-worker`, 'i'),
      `${binding.name} binding should dispatch only its canonical worker`);
    assert.match(source, /original (InvocationEnvelope|envelope)/i,
      `${binding.name} dispatch should preserve the original envelope`);
    assert.match(source, /Continue on the same (?:worker|task)/i,
      `${binding.name} should attempt same-worker continuation first`);
    assert.match(source, /one bounded replacement|replacement/i,
      `${binding.name} should permit at most one replacement`);
    assert.doesNotMatch(source, /sai\/orchestration\/inline-invocation\.md/);
  }
});

test('performance transport carries only arguments_value and contract metadata across dispatch, continuation, reconstruction, and progress', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');
  const worker = artifact('sai/commands/performance/worker.md');
  const bindings = [matrixBinding('claude', 'performance'), matrixBinding('opencode', 'performance')];

  assert.match(coordinator, /original[_ ]envelope|original envelope/i,
    'initial performance dispatch must retain the original envelope as coordinator state');
  assert.match(coordinator, /dispatch[_ ]operation|dispatch.*worker/i,
    'initial performance dispatch must use the routed worker operation');
  assert.match(coordinator, /continuation[_ ]operation|continue.*same worker/i,
    'performance continuation must use the binding-owned operation');
  assert.match(coordinator, /replacement[_ ]reconstruction|replacement worker/i,
    'performance replacement must use the reconstruction contract');
  assert.match(coordinator, /Mark steps only from worker progress-event|coordinator[\s\S]{0,120}renders? the (?:full )?plan/i,
    'performance progress ownership must remain with the coordinator');

  for (const source of [coordinator, worker, ...bindings]) {
    assert.match(source, /arguments_value/,
      'each performance transport surface must carry arguments_value');
    assert.doesNotMatch(source, /wrapper_echo_value/,
      'no performance transport surface may carry wrapper_echo_value');
  }
  assert.match(bindings[0], /sai-7-performance-worker/);
  assert.match(bindings[0], /Agent/);
  assert.match(bindings[1], /sai-7-performance-worker/);
  assert.match(bindings[1], /task/i);
});

test('Step 3 worker contract bounds delegated research evidence and rejects unauthorized operations', () => {
  const worker = artifact('sai/commands/performance/worker.md');
  assert.match(worker, /bounded evidence/i, 'the worker contract should bound research evidence');
  assert.match(worker, /eight-call cap|8-call cap|cap of 8/i,
    'the worker contract should enforce the eight-call audit cap');
  assert.match(worker, /only after explicit user authorization[\s\S]{0,120}read-only/i,
    'the worker contract should permit only authorized read-only diagnostics');
  assert.match(worker, /never (?:modify|write)[\s\S]{0,240}(?:production|schema|migration|config|dependenc)/i,
    'the worker contract should reject unauthorized writes and mutations');
});

test('Step 3 coordinator preserves worker lifecycle results and owns the continuation operation', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');
  for (const field of ['summary', 'question', 'options', 'changed_files', 'resolved_change_name']) {
    assert.match(coordinator, new RegExp(field, 'i'), `the coordinator should preserve ${field}`);
  }
  assert.match(coordinator, /continuation_operation/i,
    'the coordinator should route through the binding continuation operation');
});

test('Step 3 managed-agent identity and binding remain while forwarding skill sources are retired', () => {
  const identity = 'sai-7-performance-worker';
  const surfaces = [
    matrixAgent('claude', 'performance'),
    matrixBinding('claude', 'performance'),
    matrixBinding('opencode', 'performance'),
  ];

  for (const source of surfaces) {
    assert.match(source, new RegExp(identity),
      'the surface should use the canonical performance worker identity');
  }
  assert.match(matrixAgent('claude', 'performance'), /returns structured lifecycle metadata|description:/i,
    'the managed Claude agent should remain a managed agent seed');
  assert.equal(fs.existsSync(path.join(repoRoot, 'skills', 'claude', identity, 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, 'skills', 'opencode', identity, 'SKILL.md')), false);
});

test('Step 4 routed performance wrappers fetch only their matching launcher and the launcher fetches binding and coordinator', () => {
  const launcher = artifact('sai/commands/performance/launcher.md');
  assert.match(launcher, /sai[\\/]orchestration[\\/]workers[\\/]bindings[\\/]performance-worker\.md/,
    'launcher should fetch the matching neutral binding');

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
    assert.match(source, /sai[\\/]commands[\\/]performance[\\/]launcher\.md/,
      `${wrapper.name} wrapper should fetch the performance launcher`);
    assert.doesNotMatch(source, /Fetch @skills\/sai-7-performance-worker\/SKILL\.md/,
      `${wrapper.name} wrapper should not fetch the worker forwarding skill`);
    assert.match(source, /\$ARGUMENTS/, `${wrapper.name} wrapper should preserve complete arguments`);
    assert.doesNotMatch(source, wrapper.forbidden,
      `${wrapper.name} wrapper should not fetch the other harness binding`);
  }
});

test('performance coordinator declares the canonical five-step progress plan in order with labels', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');

  for (const id of ['resolve-performance-scope', 'map-stack-hot-paths', 'audit-performance-tiers', 'resolve-diagnostics', 'close-performance-outcome']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /resolve-performance-scope[\s\S]{0,300}map-stack-hot-paths[\s\S]{0,300}audit-performance-tiers[\s\S]{0,300}resolve-diagnostics[\s\S]{0,300}close-performance-outcome/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /resolve-performance-scope[\s\S]{0,200}Resolve performance scope and tier/i);
  assert.match(coordinator, /map-stack-hot-paths[\s\S]{0,200}Map stack and hot paths/i);
  assert.match(coordinator, /audit-performance-tiers[\s\S]{0,200}Resolve performance tier analysis/i);
  assert.match(coordinator, /resolve-diagnostics[\s\S]{0,200}Resolve diagnostics gate/i);
  assert.match(coordinator, /close-performance-outcome[\s\S]{0,200}Close performance outcome/i);
  assert.match(coordinator, /at dispatch/i);
  assert.match(coordinator, /continue_after_progress[\s\S]{0,160}protocol[- ]?only/i);
});

test('performance worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(
    worker,
    /resolve-performance-scope[\s\S]{0,800}map-stack-hot-paths[\s\S]{0,800}audit-performance-tiers[\s\S]{0,800}resolve-diagnostics[\s\S]{0,800}close-performance-outcome/,
    'the performance worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /startup act/i);
  assert.match(worker, /resolve-performance-scope/);
  assert.match(worker, /diagnostics[\s\S]{0,240}(?:authorization|not applicable|skip)/i);
  assert.match(worker, /resolve-diagnostics/);
  assert.match(worker, /empty diff[\s\S]{0,240}(?:no-change|completed)/i);
  assert.match(worker, /no Milestone Stamp/i);
  assert.match(worker, /never[\s\S]{0,160}(?:before resolution|in place of a terminal|needs_input)/i);
});

test('performance coordinator and policy render the plan coordinator-only with threshold reference and no stamp', () => {
  const coordinator = artifact('sai/commands/performance/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
  assert.match(policy, /completed[\s\S]{0,240}in_progress|in_progress[\s\S]{0,240}completed/i,
    'reported ids should render completed and the leading unmarked step in_progress');
  assert.match(policy, /(?:below|fewer than|less than)[\s\S]{0,120}three|three[\s\S]{0,120}(?:below|fewer than|less than)/i,
    'the policy should state the declared-step threshold');
  assert.match(policy, /(?:no|without|never)[\s\S]{0,200}(?:below|threshold)/i,
    'no task list / todowrite call should be emitted below the threshold');
  assert.doesNotMatch(coordinator, /fewer than three|below three/,
    'the coordinator should reference the policy and not restate the threshold constant');
  assert.match(policy, /coordinator session/i,
    'the policy should record the coordinator-only emission ownership');
  assert.doesNotMatch(coordinator, /date \+%H:%M/,
    'the coordinator should carry no per-harness wall-clock command');

  assert.match(policy, /todowrite/i,
    'the policy should name the opencode todowrite tool');
  assert.match(policy, /disabl[\s\S]{0,200}subagent/i,
    'the policy should tie the disabled-by-default tool to the subagent context');
  assert.doesNotMatch(coordinator, /Get-Date/,
    'the coordinator should carry no PowerShell wall-clock command');

  assert.match(worker, /no Milestone Stamp/i,
    'the worker contract should state audit plans carry no Milestone Stamp');
  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
});

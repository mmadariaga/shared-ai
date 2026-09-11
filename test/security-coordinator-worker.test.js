'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const matrixManifest = loadInstallManifest(repoRoot);

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function matrixBinding(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, repoRoot)
    .find(entry => entry.kind === 'binding' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix binding should exist`);
  return item.text;
}

test('Step 1 security card uses neutral root protocols and retires flat canonical sources', () => {
  const worker = artifact('sai/commands/security/worker.md');
  assert.match(worker, /@sai\/orchestration\/worker-core\.md/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-6-security-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('security coordinator declares the canonical five-step progress plan in order with labels', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');

  for (const id of ['resolve-security-scope', 'discover-module-map', 'resolve-sast-analysis', 'resolve-sca', 'close-security-outcome']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /resolve-security-scope[\s\S]{0,300}discover-module-map[\s\S]{0,300}resolve-sast-analysis[\s\S]{0,300}resolve-sca[\s\S]{0,300}close-security-outcome/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /resolve-security-scope[\s\S]{0,200}Resolve security scope/i);
  assert.match(coordinator, /discover-module-map[\s\S]{0,200}Discover modules and trust boundaries/i);
  assert.match(coordinator, /resolve-sast-analysis[\s\S]{0,200}Resolve SAST analysis/i);
  assert.match(coordinator, /resolve-sca[\s\S]{0,200}Resolve SCA gate/i);
  assert.match(coordinator, /close-security-outcome[\s\S]{0,200}Close security outcome/i);
});

test('security coordinator admits the progress shape as the sole nonterminal extension', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');

  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,240}(?:progress|sole nonterminal)/i);
  assert.match(coordinator, /extension_handlers[\s\S]{0,120}(?:empty|\{\})/i);
});

test('security transport carries only arguments_value and contract metadata across dispatch, continuation, reconstruction, and progress', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');
  const worker = artifact('sai/commands/security/worker.md');
  const bindings = [matrixBinding('claude', 'security'), matrixBinding('opencode', 'security')];

  assert.match(coordinator, /original[_ ]envelope|original envelope/i,
    'initial security dispatch must retain the original envelope as coordinator state');
  assert.match(coordinator, /dispatch[_ ]operation|dispatch.*worker/i,
    'initial security dispatch must use the routed worker operation');
  assert.match(coordinator, /continuation[_ ]operation|continue.*same worker/i,
    'security continuation must use the binding-owned operation');
  assert.match(coordinator, /replacement[_ ]reconstruction|replacement worker/i,
    'security replacement must use the reconstruction contract');
  assert.match(coordinator, /Mark steps only from worker progress-event|coordinator[\s\S]{0,120}renders? the (?:full )?plan/i,
    'security progress ownership must remain with the coordinator');

  for (const source of [coordinator, worker, ...bindings]) {
    assert.match(source, /arguments_value/,
      'each security transport surface must carry arguments_value');
    assert.doesNotMatch(source, /wrapper_echo_value/,
      'no security transport surface may carry wrapper_echo_value');
  }
  assert.match(bindings[0], /sai-6-security-worker/);
  assert.match(bindings[0], /Agent/);
  assert.match(bindings[1], /sai-6-security-worker/);
  assert.match(bindings[1], /task/i);
});

test('security coordinator renders at dispatch and reconciles at run-closing results', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');

  assert.match(coordinator, /at dispatch/i);
  assert.match(coordinator, /completed[\s\S]{0,240}unmarked[\s\S]{0,160}completed/i);
  assert.match(coordinator, /(?:failed|cancelled)[\s\S]{0,200}(?:as last rendered|freeze)/i);
  assert.match(coordinator, /needs_input[\s\S]{0,240}(?:unchanged|as last rendered)/i);
  assert.match(coordinator, /continue_after_progress[\s\S]{0,160}protocol[- ]?only/i);
});

test('security worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/security/worker.md');

  assert.match(
    worker,
    /resolve-security-scope[\s\S]{0,800}discover-module-map[\s\S]{0,800}resolve-sast-analysis[\s\S]{0,800}resolve-sca[\s\S]{0,800}close-security-outcome/,
    'the security worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /startup act/i);
  assert.match(worker, /resolve-security-scope/);
  assert.match(worker, /manifest[\s\S]{0,240}(?:changed|skip|not applicable)/i);
  assert.match(worker, /resolve-sca/);
  assert.match(worker, /empty diff[\s\S]{0,240}(?:no-change|completed)/i);
  assert.match(worker, /no Milestone Stamp/i);
  assert.match(worker, /never[\s\S]{0,160}(?:before resolution|in place of a terminal|needs_input)/i);
});

test('security coordinator and policy render the plan coordinator-only with threshold reference and no stamp', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');
  const worker = artifact('sai/commands/security/worker.md');

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

// ─── audit-step-gated-instructions (step-gated delivery replicated onto the audit family) ──

const SECURITY_PLAN_STEPS = [
  ['resolve-security-scope', 'Resolve security scope'],
  ['discover-module-map', 'Discover modules and trust boundaries'],
  ['resolve-sast-analysis', 'Resolve SAST analysis'],
  ['resolve-sca', 'Resolve SCA gate'],
  ['close-security-outcome', 'Close security outcome'],
];
const SECURITY_STEP_MAP = {
  'resolve-security-scope': null,
  'discover-module-map': 'sai/commands/security/steps/discover-module-map.md',
  'resolve-sast-analysis': 'sai/commands/security/steps/resolve-sast-analysis.md',
  'resolve-sca': 'sai/commands/security/steps/resolve-sca.md',
  'close-security-outcome': 'sai/commands/security/steps/close-security-outcome.md',
};

test('step-gated: the security coordinator declares step_machine and loads stage-machine.md', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');

  assert.match(coordinator, /step_machine: security-standalone@1/,
    'the coordinator should declare step_machine: security-standalone@1');
  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.doesNotMatch(coordinator, /step_pointer_map/,
    'the static step_pointer_map should not be declared');
});

test('step-gated: progress continuations carry exactly two lines with the deterministic Active step pointer', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /## Step machines/,
    'stage-machine.md should have a Step machines section');
  assert.match(stageMachine, /the two-line continuation/i,
    'stage-machine.md should document the two-line continuation');
  assert.match(stageMachine, /Active step: none.*complete remaining work/,
    'stage-machine.md should specify the terminal pointer line');
});

test('step-gated: non-progress continuations carry no pointer line', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /do not invoke emit and do not consult the machine/,
    'stage-machine.md should state that non-progress continuations do not invoke emit');
  assert.match(stageMachine, /active step file persists/,
    'stage-machine.md should state that the active step file persists');
});

test('step-gated: replacement reconstruction includes active_step_id', () => {
  const coordinator = artifact('sai/commands/security/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /replacement_reconstruction_fields[\s\S]{0,400}active_step_id/,
    'replacement reconstruction should include the departing worker active_step_id');
  assert.match(stageMachine, /A replacement worker re-resolves/,
    "stage-machine.md should describe replacement re-resolution");
  assert.match(stageMachine, /## Step machines/,
    'stage-machine.md should have a Step machines section');
});

test('step-gated: the security worker loads steps/common.md at dispatch and executes only the active step', () => {
  const worker = artifact('sai/commands/security/worker.md');

  assert.match(worker, /Fetch @sai\/commands\/security\/steps\/common\.md and keep it in force for the entire run/,
    'common.md should load at dispatch as part of the sealed initial surface');
  assert.match(worker, /## Active Step Execution/, 'the worker contract should own active-step execution');
  assert.match(worker, /this contract plus common\.md is the sealed initial surface/);
  assert.match(worker, /`resolve-security-scope` runs from it before the first progress event/,
    'the fileless first step should run from the sealed surface before the first pointer');
  assert.match(worker, /never prefetch, open, or follow any other step instruction file/,
    'the worker must execute only the coordinator-named step');
  assert.doesNotMatch(worker, /Fetch @sai\/commands\/security\/invocation\.md/,
    'the wholesale invocation fetch chain must be replaced by active-step execution');
  assert.match(worker, /A gated stage resolved by legitimate skip still reports its milestone/,
    'a legitimately skipped gated stage still advances the pointer past it');
});

test('step-gated: the carved step library exists beside the untouched monolith', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/security/instructions.md')),
    'the original instructions.md stays in place untouched');
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/security/steps/common.md')),
    'steps/common.md should exist');
  for (const [id, relativePath] of Object.entries(SECURITY_STEP_MAP)) {
    if (!relativePath) continue;
    const source = artifact(relativePath);
    assert.notEqual(source, '', `${relativePath} should exist`);
    assert.match(source, new RegExp(`Active step: ${id}\\.`),
      `${relativePath} should name its active step id`);
  }
  assert.match(artifact('sai/commands/security/steps/common.md'), /`resolve-security-scope` has no step file of its own/,
    'common.md should record that resolve-security-scope is fileless');
});

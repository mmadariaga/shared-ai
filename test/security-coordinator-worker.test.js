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

test('Step 1 security worker card loads the shared audit rules and no shared-orchestration protocol', () => {
  const worker = artifact('sai/commands/security/worker.md');
  assert.match(worker, /Fetch @sai\/commands\/audit\/worker-common\.md/);
  assert.doesNotMatch(worker, /worker-core\.md|bounded-dispatch-retry|verified-precondition-handback/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-5-security-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('security transport: the audit coordinator carries arguments_value, the worker gets a brief, and the bindings keep their harness calls', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');
  const worker = artifact('sai/commands/security/worker.md');
  const bindings = [matrixBinding('claude', 'security'), matrixBinding('opencode', 'security')];

  assert.match(coordinator, /one string, `arguments_value`/);
  assert.match(coordinator, /The creation dispatch carries only the ready prompt/);
  assert.match(coordinator, /`SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode/);
  assert.doesNotMatch(worker, /arguments_value/, 'the worker receives a brief, not the raw argument string');
  for (const source of [coordinator, worker, ...bindings]) {
    assert.doesNotMatch(source, /wrapper_echo_value/,
      'no security transport surface may carry wrapper_echo_value');
  }
  assert.match(bindings[0], /sai-5-security-worker/);
  assert.match(bindings[0], /Agent/);
  assert.match(bindings[0], /SendMessage\(to: "<captured agent ID>"/);
  assert.match(bindings[1], /sai-5-security-worker/);
  assert.match(bindings[1], /task/i);
  assert.match(bindings[1], /task\(task_id: "<captured task ID>"/);
});

test('security worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/security/worker.md');

  assert.match(
    worker,
    /resolve-security-scope[\s\S]{0,800}discover-module-map[\s\S]{0,800}resolve-sast-analysis[\s\S]{0,800}resolve-sca[\s\S]{0,800}close-security-outcome/,
    'the security worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /`resolve-security-scope` — no file; run inline from the brief and `common\.md`/);
  assert.match(worker, /reports together with `discover-module-map`/);
  assert.match(worker, /no manifest[\s\S]{0,240}resolve-sca/i);
  assert.match(worker, /empty diff[\s\S]{0,400}Not Applicable report/i);
  assert.match(worker, /SCA did not run and why/);
  assert.doesNotMatch(worker, /progress event|needs_input/i, 'the worker reports step-done batches and asks through the shared rules');
});

// ─── audit-step-gated-instructions (step-gated delivery replicated onto the audit family) ──

const SECURITY_STEP_MAP = {
  'resolve-security-scope': null,
  'discover-module-map': 'sai/commands/security/steps/discover-module-map.md',
  'resolve-sast-analysis': 'sai/commands/security/steps/resolve-sast-analysis.md',
  'resolve-sca': 'sai/commands/security/steps/resolve-sca.md',
  'close-security-outcome': 'sai/commands/security/steps/close-security-outcome.md',
};

test('step-gated: the security worker loads steps/common.md at dispatch and executes only the active step', () => {
  const worker = artifact('sai/commands/security/worker.md');
  const shared = artifact('sai/commands/audit/worker-common.md');

  assert.match(worker, /Fetch @sai\/commands\/security\/steps\/common\.md and keep it in force for the entire run/,
    'common.md should load at dispatch as part of the sealed initial surface');
  assert.match(worker, /^## Steps$/m, 'the worker contract should own the plan in one Steps section');
  assert.match(shared, /Fetch the file the pointer names, and skip the fetch when you already loaded it in this session/,
    'the worker executes only the coordinator-named step');
  assert.match(shared, /Run the audit's scope step inline: it has no file/,
    'the fileless first step should run before the first pointer');
  assert.doesNotMatch(worker, /Fetch @sai\/commands\/security\/invocation\.md/,
    'the wholesale invocation fetch chain must be replaced by active-step execution');
  assert.match(shared, /A step you decided to skip because it does not apply is complete: report it in the same batch/,
    'a legitimately skipped stage still advances the pointer past it');
});

test('step-gated: the step library is the only security instruction surface', () => {
  for (const retired of ['instructions.md', 'invocation.md']) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/security', retired)), false,
      `the monolithic security ${retired} is retired`);
  }
  const manifest = JSON.parse(artifact('sai/install-manifest.json'));
  for (const [id, destination] of [
    ['retired-sai-6-security-instructions', 'commands/security/instructions.md'],
    ['retired-sai-6-security-invocation', 'commands/security/invocation.md'],
  ]) {
    const retirement = manifest.retirements.find(record => record.id === id);
    assert.ok(retirement, `the manifest should retire installed copies of ${destination}`);
    assert.equal(retirement.destination.path, destination);
  }
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

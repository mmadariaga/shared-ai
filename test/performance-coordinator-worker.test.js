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

test('Step 1 performance worker card loads the shared audit rules and no shared-orchestration protocol', () => {
  const worker = artifact('sai/commands/performance/worker.md');
  assert.match(worker, /Fetch @sai\/commands\/audit\/worker-common\.md/);
  assert.doesNotMatch(worker, /worker-core\.md|bounded-dispatch-retry|verified-precondition-handback/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-6-performance-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('performance scope grammar lives in options.md, validated by the audit coordinator and applied by common.md', () => {
  const common = artifact('sai/commands/performance/steps/common.md');
  const options = artifact('sai/commands/performance/options.md');
  const coordinator = artifact('sai/commands/audit/coordinator.md');

  for (const flag of ['--full', '--path <dir>', '--tier backend|frontend|db|queue', '--runtime', '--parent-branch <branch>']) {
    assert.ok(options.includes(`\`${flag}\``), `options.md should declare ${flag}`);
  }
  for (const flag of ['--full', '--path', '--tier', '--runtime', '--parent-branch']) {
    assert.ok(common.includes(`\`${flag}\``), `common.md § Scope should apply ${flag}`);
  }
  assert.match(common, /Fetch @sai\/commands\/performance\/options\.md/);
  assert.match(coordinator, /Fetch @sai\/commands\/\{audit\}\/options\.md/);
  assert.match(coordinator, /a value outside the set `options\.md` declares/);
  assert.match(coordinator, /a second positional value/);
  assert.match(common, /^## Scope$/m);
  assert.match(common, /## Scope[\s\S]*?parent branch\. Detection order/);
  assert.doesNotMatch(common, /§ Prerequisites/, 'no reference may point to a Prerequisites section');
  for (const heading of ['Input', 'Scope', 'Communication Mode', 'Severity Taxonomy', 'Operating Principles', 'Hard Rules']) {
    assert.equal((common.match(new RegExp(`^## ${heading}$`, 'gm')) || []).length, 1, `common.md has one ${heading} section`);
  }
  assert.doesNotMatch(common, /^## (?:Remember|Prerequisites)$/m);
});

test('the audit coordinator owns change resolution and the proposal gate for performance', () => {
  const worker = artifact('sai/commands/performance/worker.md');
  const coordinator = artifact('sai/commands/audit/coordinator.md');

  assert.ok(coordinator.includes('Cannot start {command}: name the change ({candidates, or none}).'));
  assert.ok(coordinator.includes('Cannot start {command} for {name}: missing proposal.md.'));
  assert.match(coordinator, /An empty change name takes the only change directory under `openspec\/changes\/` \(archive excluded\) that has a `proposal\.md`/);
  assert.doesNotMatch(worker, /openspec list|No active changes found|Use change '|Which change\?/, 'the worker no longer resolves the change');
  assert.match(worker, /^## Steps$/m);
});

test('performance close step writes and verifies only performance.md in its two forms', () => {
  const close = artifact('sai/commands/performance/steps/close-performance-outcome.md');
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(close, /Fetch @sai\/commands\/performance\/performance-report\.template\.md/);
  assert.ok(close.includes('openspec/changes/{change-name}/performance.md'));
  assert.match(close, /\*\*Normal report\*\*/);
  assert.match(close, /\*\*Not Applicable report\*\*/);
  assert.ok(close.includes('`Summary:` tally'));
  assert.ok(close.includes('`## Not Applicable`'));
  assert.ok(close.includes('The payload carries the summary; the report stays in `performance.md`.'));
  assert.ok(worker.includes('sai/commands/performance/performance-report.template.md'),
    'the worker card points to the report template');
});

test('performance report template is the single source of the finding fields, the number rule, and the tally', () => {
  const template = artifact('sai/commands/performance/performance-report.template.md');
  const common = artifact('sai/commands/performance/steps/common.md');
  const close = artifact('sai/commands/performance/steps/close-performance-outcome.md');
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(template, /\*\*Scope:\*\* .* · \*\*Tiers:\*\* .* · \*\*Baseline:\*\* .* · \*\*Date:\*\* \{YYYY-MM-DD\}/);
  assert.ok(template.includes('estimated — verify with {method}'));
  assert.ok(template.includes('Summary: Critical={n} High={n} Medium={n} Low={n} Informational={n}'));
  assert.deepEqual(
    [...template.matchAll(/^## (.+)$/gm)].map(match => match[1]),
    ['Not Applicable', 'Findings', 'Acknowledged Trade-offs (from change artifacts)'],
  );
  for (const retired of ['Executive Summary', 'Hot Paths in Scope', 'Observability Gaps', 'Prioritized Remediation Plan', 'Validation Plan']) {
    assert.doesNotMatch(template, new RegExp(retired));
  }
  assert.ok(common.includes('performance-report.template.md'));
  for (const source of [common, close, worker]) {
    assert.doesNotMatch(source, /\*\*Expected impact if unfixed|\*\*Root cause/, 'finding fields live in the template alone');
  }
  assert.equal([common, close, worker].filter(source => source.includes('estimated — verify with')).length, 0,
    'the estimate mark is stated once, in the template');
});

test('performance step files and tier checklists follow the single-source layout', () => {
  const tierAudit = artifact('sai/commands/performance/steps/audit-performance-tiers.md');
  const stepFiles = ['map-stack-hot-paths', 'audit-performance-tiers', 'resolve-diagnostics', 'close-performance-outcome'];

  for (const id of stepFiles) {
    assert.match(artifact(`sai/commands/performance/steps/${id}.md`), /The step is done when /,
      `${id} opens with a checkable completion criterion`);
    assert.doesNotMatch(artifact(`sai/commands/performance/steps/${id}.md`), /Phase [1-6]\b/);
  }
  assert.ok(tierAudit.includes('For each tier in the selected scope: Fetch @sai/commands/performance/checklists/<tier>.md'));
  for (const tier of ['backend', 'frontend', 'db', 'queue']) {
    assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/performance/checklists', `${tier}.md`)),
      `the ${tier} checklist should exist`);
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/performance/steps', `${tier}.md`)), false);
  }
  assert.match(tierAudit, /### Cross-cutting checklist/);
  assert.match(tierAudit, /Without `--runtime`/);
  const diagnostics = artifact('sai/commands/performance/steps/resolve-diagnostics.md');
  assert.match(diagnostics, /`--runtime` is the whole authorization: ask no question, and never wait for an answer/);
  assert.doesNotMatch(diagnostics, /`Run diagnostics` \/ `Skip diagnostics`|needs_input/);
  assert.match(diagnostics, /record it as unavailable in the report's `Diagnostics` field/);
});

test('performance wrappers accept --runtime on both harnesses', () => {
  for (const wrapper of ['commands/claude/sai-6-performance.md', 'commands/opencode/sai-6-performance.md']) {
    const description = artifact(wrapper).match(/^description:.*$/m)[0];
    assert.ok(description.includes('--runtime'), `${wrapper} description should name --runtime`);
  }
  assert.match(artifact('commands/claude/sai-6-performance.md'), /^argument-hint:.*\[optional: --runtime\]/m);
});

test('Step 3 Claude and opencode bindings route only their canonical performance worker', () => {
  const surfaces = [
    {
      name: 'Claude',
      binding: matrixBinding('claude', 'performance'),
      mechanism: 'Agent',
      continuation: 'SendMessage(to: "<captured agent ID>"',
    },
    {
      name: 'opencode',
      binding: matrixBinding('opencode', 'performance'),
      mechanism: 'task',
      continuation: 'task(task_id: "<captured task ID>"',
    },
  ];

  for (const binding of surfaces) {
    const source = binding.binding;
    assert.match(source, new RegExp(`${binding.mechanism}[\\s\\S]{0,100}sai-6-performance-worker`, 'i'),
      `${binding.name} binding should dispatch only its canonical worker`);
    assert.ok(source.includes('Fetch @sai/commands/performance/worker.md and follow it exactly'),
      `${binding.name} binding should hand the worker its own contract`);
    assert.ok(source.includes(binding.continuation),
      `${binding.name} binding should continue the same worker`);
    assert.doesNotMatch(source, /command-runner|replacement_reconstruction_fields|continue_after_|panel-render/,
      `${binding.name} binding leaves the lifecycle to the audit coordinator`);
    assert.doesNotMatch(source, /sai\/orchestration\/inline-invocation\.md/);
  }
});

test('performance transport: the audit coordinator carries arguments_value and the worker gets a brief', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');
  const worker = artifact('sai/commands/performance/worker.md');
  const bindings = [matrixBinding('claude', 'performance'), matrixBinding('opencode', 'performance')];

  assert.match(coordinator, /one string, `arguments_value`/);
  assert.match(coordinator, /The task message opens with the first pointer line/);
  assert.doesNotMatch(worker, /arguments_value/, 'the worker receives a brief, not the raw argument string');
  for (const source of [coordinator, worker, ...bindings]) {
    assert.doesNotMatch(source, /wrapper_echo_value/,
      'no performance transport surface may carry wrapper_echo_value');
  }
  assert.match(bindings[0], /sai-6-performance-worker/);
  assert.match(bindings[0], /Agent/);
  assert.match(bindings[1], /sai-6-performance-worker/);
  assert.match(bindings[1], /task/i);
});

test('performance steps bound delegated research and rejected writes', () => {
  const map = artifact('sai/commands/performance/steps/map-stack-hot-paths.md');
  const common = artifact('sai/commands/performance/steps/common.md');
  const diagnostics = artifact('sai/commands/performance/steps/resolve-diagnostics.md');

  assert.ok(map.includes('≤8 per audit'), 'the mapping step owns the eight-explorer cap');
  assert.ok(map.includes('total LOC ≤ 500') && map.includes('total LOC > 500'), 'the mapping step owns the 500-LOC cutover');
  assert.ok(common.includes('The only file written is `openspec/changes/{change-name}/performance.md`'));
  assert.match(common, /never modify production code, schemas, migrations, configuration, dependencies, manifests, or lockfiles/);
  assert.match(diagnostics, /read-only measurements/);
  assert.match(diagnostics, /never against a production target/);
});

test('Step 3 managed-agent identity and binding remain while forwarding skill sources are retired', () => {
  const identity = 'sai-6-performance-worker';
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

test('Step 4 performance wrappers fetch the shared audit coordinator, which fetches the binding', () => {
  const coordinator = artifact('sai/commands/audit/coordinator.md');
  assert.match(coordinator, /Fetch @sai\/orchestration\/workers\/bindings\/\{audit\}-worker\.md and use it/,
    'the coordinator should fetch the matching neutral binding');

  const wrappers = [
    {
      name: 'Claude',
      path: 'commands/claude/sai-6-performance.md',
      model: /^model:\s*\S+$/m,
      setting: /^effort:\s*\S+$/m,
      forbidden: /skills[\\/]opencode[\\/]sai-6-performance-worker|opencode-worker/i,
    },
    {
      name: 'opencode',
      path: 'commands/opencode/sai-6-performance.md',
      model: /^model:\s*\S+#\S+$/m,
      setting: /^model:\s*\S+#\S+$/m,
      forbidden: /skills[\\/]claude[\\/]sai-6-performance-worker|claude-worker/i,
      forbiddenVariant: /^variant:\s*\S+$/m,
    },
  ];

  for (const wrapper of wrappers) {
    const source = artifact(wrapper.path);
    assert.match(source, wrapper.model, `${wrapper.name} wrapper should declare its model`);
    assert.match(source, wrapper.setting, `${wrapper.name} wrapper should declare its harness setting`);
    if (wrapper.forbiddenVariant) {
      assert.doesNotMatch(source, wrapper.forbiddenVariant,
        `${wrapper.name} wrapper should not carry a separate variant line`);
    }
    assert.match(source, /Fetch @sai\/commands\/audit\/coordinator\.md and follow it exactly/,
      `${wrapper.name} wrapper should fetch the shared audit coordinator`);
    assert.match(source, /command_name: performance/, `${wrapper.name} wrapper should name its audit`);
    assert.doesNotMatch(source, /command-bootstrap\.md|@sai\/adapters\//,
      `${wrapper.name} wrapper should load no bootstrap and no boot adapter`);
    assert.doesNotMatch(source, /Fetch @skills\/sai-6-performance-worker\/SKILL\.md/,
      `${wrapper.name} wrapper should not fetch the worker forwarding skill`);
    assert.match(source, /\$ARGUMENTS/, `${wrapper.name} wrapper should preserve complete arguments`);
    assert.doesNotMatch(source, wrapper.forbidden,
      `${wrapper.name} wrapper should not fetch the other harness binding`);
  }
});

test('performance worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/performance/worker.md');

  assert.match(
    worker,
    /resolve-performance-scope[\s\S]{0,800}map-stack-hot-paths[\s\S]{0,800}audit-performance-tiers[\s\S]{0,800}resolve-diagnostics[\s\S]{0,800}close-performance-outcome/,
    'the performance worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /`resolve-performance-scope` — no file; run inline from the brief and `common\.md`/);
  assert.match(worker, /reports together with `map-stack-hot-paths`/);
  assert.match(worker, /Without `--runtime`, the batch also carries `resolve-diagnostics`/);
  assert.match(worker, /empty diff[\s\S]{0,240}Not Applicable report/i);
  assert.doesNotMatch(worker, /progress event|needs_input|authorization question/i);
});

// ─── audit-step-gated-instructions (step-gated delivery replicated onto the audit family) ──

const PERFORMANCE_STEP_MAP = {
  'resolve-performance-scope': null,
  'map-stack-hot-paths': 'sai/commands/performance/steps/map-stack-hot-paths.md',
  'audit-performance-tiers': 'sai/commands/performance/steps/audit-performance-tiers.md',
  'resolve-diagnostics': 'sai/commands/performance/steps/resolve-diagnostics.md',
  'close-performance-outcome': 'sai/commands/performance/steps/close-performance-outcome.md',
};

test('step-gated: the performance worker loads steps/common.md at dispatch and executes only the active step', () => {
  const worker = artifact('sai/commands/performance/worker.md');
  const shared = artifact('sai/commands/audit/worker-common.md');

  assert.match(worker, /Fetch @sai\/commands\/performance\/steps\/common\.md and keep it in force for the entire run/,
    'common.md should load at dispatch as part of the sealed initial surface');
  assert.match(worker, /^## Steps$/m, 'the worker contract should own the plan in one Steps section');
  assert.match(shared, /Fetch the file the pointer names, and skip the fetch when you already loaded it in this session/,
    'the worker executes only the coordinator-named step');
  assert.match(shared, /Run the audit's scope step inline: it has no file/,
    'the fileless first step should run before the first pointer');
  assert.doesNotMatch(worker, /Fetch @sai\/commands\/performance\/invocation\.md/,
    'the wholesale invocation fetch chain must be replaced by active-step execution');
  assert.match(shared, /A step you decided to skip because it does not apply is complete: report it in the same batch/,
    'a legitimately skipped stage still advances the pointer past it');
});

test('step-gated: the step library is the only performance instruction surface', () => {
  for (const retired of ['instructions.md', 'invocation.md']) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/performance', retired)), false,
      `the monolithic performance ${retired} is retired`);
  }
  const manifest = JSON.parse(artifact('sai/install-manifest.json'));
  for (const [id, destination] of [
    ['retired-sai-7-performance-instructions', 'commands/performance/instructions.md'],
    ['retired-sai-7-performance-invocation', 'commands/performance/invocation.md'],
  ]) {
    const retirement = manifest.retirements.find(record => record.id === id);
    assert.ok(retirement, `the manifest should retire installed copies of ${destination}`);
    assert.equal(retirement.destination.path, destination);
  }
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/performance/steps/common.md')),
    'steps/common.md should exist');
  for (const [id, relativePath] of Object.entries(PERFORMANCE_STEP_MAP)) {
    if (!relativePath) continue;
    const source = artifact(relativePath);
    assert.notEqual(source, '', `${relativePath} should exist`);
    assert.match(source, new RegExp(`Active step: ${id}\\.`),
      `${relativePath} should name its active step id`);
  }
  assert.match(artifact('sai/commands/performance/steps/common.md'), /`resolve-performance-scope` has no step file of its own/,
    'common.md should record that resolve-performance-scope is fileless');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const coordinatorPath = 'sai/commands/meta-build/coordinator.md';
const launcherPath = 'sai/commands/meta-build/command-bootstrap.md';
const applyCoordinatorPath = 'sai/commands/apply/coordinator.md';
const boundedRecoveryPath = 'sai/policies/bounded-recovery.md';

function readRequired(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(absolutePath), true, `${relativePath} should exist`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertContains(source, text, message = `expected card to contain ${text}`) {
  assert.ok(source.includes(text), message);
}

test('build source layout contains only the coordinator and launcher cards', () => {
  assert.equal(fs.existsSync(path.join(repoRoot, coordinatorPath)), true, `${coordinatorPath} should exist`);
  assert.equal(fs.existsSync(path.join(repoRoot, launcherPath)), true, `${launcherPath} should exist`);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/meta-build/worker.md')), false,
    'build must not introduce a worker card');
});

test('build launcher fetches only the implementation worker binding', () => {
  const source = readRequired(launcherPath).trim().split(/\r?\n/);
  assert.deepEqual(source, [
    'Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.',
  ]);
  assert.doesNotMatch(source.join('\n'), /claude|opencode|red-worker|green-worker|coordinator\.md/i);
});

test('build coordinator declares the implement-to-apply composition and envelopes', () => {
  const source = readRequired(coordinatorPath);
  assert.match(source, /position 0\s*[—-]\s*implementation phase adapter/);
  assertContains(source, 'sai/commands/implement/coordinator.md');
  assert.match(source, /position 1\s*[—-]\s*existing apply phase adapter/);
  assertContains(source, 'sai/commands/apply/coordinator.md');
  assert.doesNotMatch(source, /\bwrapper_echo_value\s*:/,
    'build successor envelopes must not construct or forward the wrapper echo field');
  assert.match(source, /command_name:\s*apply/);
  assert.match(source, /arguments_value:\s*(?:\{name\}|resolved_change_name)/,
    'the build successor must carry the resolved change in arguments_value');
  assertContains(source, 'command_name: apply');
  assertContains(source, 'continuation_reference` absent or empty');
  assertContains(source, 'fast-track true is supervisor session state');
  assertContains(source, 'does not re-declare RED/GREEN dispatch');
  assert.doesNotMatch(source, /sai\/commands\/build\/worker\.md/);
  assert.doesNotMatch(source, /build-specific managed worker|build-specific worker matrix/i);
});

test('build coordinator normalizes fast-track and resolves one change without an intermediate gate', () => {
  const source = readRequired(coordinatorPath);
  assertContains(source, 'strip every `--fast-track` token');
  assertContains(source, 'in any token order');
  assertContains(source, 'does NOT make `/sai-build` a fifth body-file parse member');
  assertContains(source, 'does NOT activate a build-local fast-track mode');
  assertContains(source, 'Resolve the target OpenSpec change name exactly once');
  assertContains(source, 'Neither segment re-enters a harness boot adapter or command wrapper');
  assertContains(source, 'No intermediate approval gate');
  assertContains(source, 'transitions immediately to the apply segment');
  assertContains(source, 'Do NOT print the standalone implement completion literal');
  assertContains(source, 'not the `sai-explore` supervision pattern');
  assertContains(source, 'Do not require Plan - Unattended or Direct Build - Unattended crystallization authorization');
});

test('build coordinator owns fast-track activation and blocks apply after phase-one failure', () => {
  const source = readRequired(coordinatorPath);
  assertContains(source, '> FAST-TRACK MODE ACTIVE');
  assertContains(source, 'exactly one line');
  assertContains(source, 'Print the banner zero times when apply never activates');
  assertContains(source, 'commit pre-authorization');
  assertContains(source, 'non-detached branch auto-stay');
  assertContains(source, 'identically with and without fast-track');
  assertContains(source, 'Detached HEAD still presents the existing three-option branch prompt');
  assertContains(source, 'Safe-operations confirmations remain required');
  assertContains(source, 'If the implement segment returns `failed` or `cancelled`');
  assertContains(source, 'without activating apply');
  assertContains(source, 'without printing the FAST-TRACK banner');
  assertContains(source, 'without claiming apply completion');
});

test('build coordinator preserves re-entry, stops, completion, and changed-files union', () => {
  const source = readRequired(coordinatorPath);
  assertContains(source, 'Re-entry after interruption or partial apply goes through the implement segment again');
  assertContains(source, 'Non-removable stops');
  assertContains(source, 'routing-tree STOP');
  assertContains(source, 'GREEN-conflict STOP');
  assertContains(source, 'Recovery-budget exhaustion stops the current');
  assertContains(source, 'Implementation applied. Run `/sai-5-review {name}` in a new chat when ready.');
  assertContains(source, 'Do not declare a maximum Step count');
  assertContains(source, 'Large plans are accepted');
  assertContains(source, 'ordered, duplicate-free changed-files union');
  assertContains(source, 'without resetting the union on segment activation');
  assertContains(source, 'Phase 2 dispatches existing `sai-4-red-worker` / `sai-4-green-worker` only through the apply adapter');
});

test('apply retry choice remains the same single Step grant inside build on both harnesses', () => {
  const build = readRequired(coordinatorPath);
  const apply = readRequired(applyCoordinatorPath);

  assert.match(apply, /Authorize one fresh attempt/);
  assert.match(apply, /manual-correction/);
  assert.match(apply, /authorized-step-retry/);
  assert.match(apply, /one fresh budget for the whole Step|fresh whole-Step budget/);
  assert.match(build, /existing apply coordinator owns the exhausted-Step\s+choice/);
  assert.match(build, /Keep that choice and answer on the active apply segment/);
  assert.match(build, /does not\s+re-present it, mint a second budget, or restart the implement segment/);
  assert.match(build, /one grant covers the blocked Step's\s+worker and coordinator budgets together/);
  assert.doesNotMatch(build, /authorized-step-retry|attempt_history|kind: coordinator-attempt|diagnosis_key/i,
    'build must bind to apply recovery without implementing a second recovery grant');

  for (const harness of ['claude', 'opencode']) {
    const boot = readRequired(`sai/adapters/${harness}/boot.md`);
    const applyWrapper = readRequired(`commands/${harness}/sai-4-apply.md`);
    const buildWrapper = readRequired(`commands/${harness}/sai-build.md`);
    assert.match(boot, /@sai\/commands\/apply\/coordinator\.md/,
      `${harness} standalone apply must select the shared apply coordinator`);
    assert.match(boot, /@sai\/commands\/meta-build\/coordinator\.md/,
      `${harness} build must select the composition coordinator`);
    assert.ok(applyWrapper.includes(`@sai/adapters/${harness}/boot.md`));
    assert.ok(buildWrapper.includes(`@sai/adapters/${harness}/boot.md`));
  }
});

test('Step 6 compatibility inherits diagnosis-driven recovery through apply and the shared runner', () => {
  const buildSources = [
    ['coordinator', readRequired(coordinatorPath)],
    ['launcher', readRequired(launcherPath)],
  ];
  const apply = readRequired(applyCoordinatorPath);
  const recoveryPolicy = readRequired(boundedRecoveryPath);
  const build = buildSources.map(([, source]) => source).join('\n');
  const diagnosisRecovery = /diagnosis[- ]driven recovery|distinct[- ]diagnosis|diagnosis[_ -]?key/i;

  assert.match(recoveryPolicy, diagnosisRecovery,
    'the shared bounded-recovery policy should own diagnosis-driven recovery');
  assert.match(apply, diagnosisRecovery,
    'the apply route should inherit diagnosis-driven recovery');
  const claudeBoot = readRequired('sai/adapters/claude/boot.md');
  const opencodeBoot = readRequired('sai/adapters/opencode/boot.md');
  for (const boot of [claudeBoot, opencodeBoot]) {
    assert.match(boot, /@sai\/orchestration\/command-runner\.md/,
      'the harness boot loads the shared runner once per session, covering the apply route');
  }
  assert.match(apply, /recovery_policy\s*:\s*true/,
    'the apply route should opt into the shared recovery policy');

  assert.match(build, /sai\/commands\/apply\/coordinator\.md/,
    'build must continue to reference the existing apply coordinator');
  assert.doesNotMatch(build,
    /(?:recovery_policy|continue_after_recovery|diagnosis_key|design-overview-repair|Coverage Signature|Known-False Report Recovery|sole runtime registry|surface_id\s*\|)/i,
    'build must not rewrite or register recovery behavior');
});

test('Claude sai-build keeps exact apply parity for the chained apply segment', () => {
  const buildWrapper = readRequired('commands/claude/sai-build.md');
  const applyWrapper = readRequired('commands/claude/sai-4-apply.md');
  const buildTools = buildWrapper.match(/^allowed-tools:\s*(.+)$/m);
  const applyTools = applyWrapper.match(/^allowed-tools:\s*(.+)$/m);

  assert.ok(buildTools, 'sai-build should declare allowed-tools');
  assert.ok(applyTools, 'sai-4-apply should declare allowed-tools');
  assert.equal(buildTools[1].trim(), applyTools[1].trim(),
    'sai-build should keep exact apply parity for coordinator-owned git, checklist, and verification work');
  assert.match(buildWrapper,
    /^allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList$/m,
    'sai-build should pin the wide execution set without node-scoped narrowing');
});

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

test('Step 1 review card uses neutral root protocols and retires flat canonical sources', () => {
  const worker = artifact('sai/commands/review/worker.md');
  assert.match(worker, /@sai\/orchestration\/worker-core\.md/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-5-review-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('review coordinator declares the canonical five-step progress plan in order with labels', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  for (const id of ['resolve-change', 'establish-diff-scope', 'resolve-review-analysis', 'resolve-mutation-analysis', 'close-review-outcome']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /resolve-change[\s\S]{0,300}establish-diff-scope[\s\S]{0,300}resolve-review-analysis[\s\S]{0,300}resolve-mutation-analysis[\s\S]{0,300}close-review-outcome/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /resolve-change[\s\S]{0,200}Resolve change/i);
  assert.match(coordinator, /establish-diff-scope[\s\S]{0,200}Resolve diff scope/i);
  assert.match(coordinator, /resolve-review-analysis[\s\S]{0,200}Resolve review analysis/i);
  assert.match(coordinator, /resolve-mutation-analysis[\s\S]{0,200}Resolve mutation-analysis gate/i);
  assert.match(coordinator, /close-review-outcome[\s\S]{0,200}Close review outcome/i);
});

test('review coordinator admits the progress shape as the sole nonterminal extension', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,240}(?:progress|sole nonterminal)/i);
  assert.match(coordinator, /extension_handlers[\s\S]{0,120}(?:empty|\{\})/i);
});

test('review transport carries only arguments_value and contract metadata across dispatch, continuation, reconstruction, and progress', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');
  const worker = artifact('sai/commands/review/worker.md');
  const bindings = [matrixBinding('claude', 'review'), matrixBinding('opencode', 'review')];

  assert.match(coordinator, /original[_ ]envelope|original envelope/i,
    'initial review dispatch must retain the original envelope as coordinator state');
  assert.match(coordinator, /dispatch[_ ]operation|dispatch.*worker/i,
    'initial review dispatch must use the routed worker operation');
  assert.match(coordinator, /continuation[_ ]operation|continue.*same worker/i,
    'review continuation must use the binding-owned operation');
  assert.match(coordinator, /replacement[_ ]reconstruction|replacement worker/i,
    'review replacement must use the reconstruction contract');
  assert.match(coordinator, /Mark steps only from worker progress-event|coordinator[\s\S]{0,120}renders? the (?:full )?plan/i,
    'review progress ownership must remain with the coordinator');

  for (const source of [coordinator, worker, ...bindings]) {
    assert.match(source, /arguments_value/,
      'each review transport surface must carry arguments_value');
    assert.doesNotMatch(source, /wrapper_echo_value/,
      'no review transport surface may carry wrapper_echo_value');
  }
  assert.match(bindings[0], /sai-5-review-worker/);
  assert.match(bindings[0], /Agent/);
  assert.match(bindings[1], /sai-5-review-worker/);
  assert.match(bindings[1], /task/i);
});

test('review coordinator renders at dispatch and reconciles at run-closing results', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /at dispatch/i);
  assert.match(coordinator, /completed[\s\S]{0,240}unmarked[\s\S]{0,160}completed/i);
  assert.match(coordinator, /(?:failed|cancelled)[\s\S]{0,200}(?:as last rendered|freeze)/i);
  assert.match(coordinator, /needs_input[\s\S]{0,240}(?:unchanged|as last rendered)/i);
  assert.match(coordinator, /continue_after_progress[\s\S]{0,160}protocol[- ]?only/i);
});

test('review worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/review/worker.md');

  assert.match(
    worker,
    /resolve-change[\s\S]{0,800}establish-diff-scope[\s\S]{0,800}resolve-review-analysis[\s\S]{0,800}resolve-mutation-analysis[\s\S]{0,800}close-review-outcome/,
    'the review worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /startup act/i);
  assert.match(worker, /resolve-change/);
  assert.match(worker, /Pass 11[\s\S]{0,240}(?:gate|not applicable|skip)/i);
  assert.match(worker, /empty diff[\s\S]{0,240}(?:cancelled|establish-diff-scope)/i);
  assert.match(worker, /no Milestone Stamp/i);
  assert.match(worker, /never[\s\S]{0,160}(?:before resolution|in place of a terminal|needs_input)/i);
});

test('review coordinator and policy render the plan coordinator-only with threshold reference and no stamp', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');
  const worker = artifact('sai/commands/review/worker.md');

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

// ─── review-step-gated-instructions (step-gated delivery for the audit family head) ──

const REVIEW_PLAN_STEPS = [
  ['resolve-change', 'Resolve change'],
  ['establish-diff-scope', 'Resolve diff scope'],
  ['resolve-review-analysis', 'Resolve review analysis'],
  ['resolve-mutation-analysis', 'Resolve mutation-analysis gate'],
  ['close-review-outcome', 'Close review outcome'],
];
const REVIEW_STEP_MAP = {
  'resolve-change': null,
  'establish-diff-scope': 'sai/commands/review/steps/establish-diff-scope.md',
  'resolve-review-analysis': 'sai/commands/review/steps/resolve-review-analysis.md',
  'resolve-mutation-analysis': 'sai/commands/review/steps/resolve-mutation-analysis.md',
  'close-review-outcome': 'sai/commands/review/steps/close-review-outcome.md',
};

test('step-gated: the review coordinator declares a static step_pointer_map over exactly the five plan ids', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /Declare the static optional `step_pointer_map`/,
    'the coordinator should declare the static optional step_pointer_map');
  assert.match(coordinator, /never carried in the dispatch envelope or any reconstruction field/,
    'the map should never travel in the dispatch envelope or reconstruction fields');

  const table = coordinator.slice(
    coordinator.indexOf('| step id |'),
    coordinator.indexOf('While the map is in force'),
  );
  const rows = [...table.matchAll(/^\s*\| `([a-z-]+)` \| (.+) \|$/gm)].map(m => [m[1], m[2].trim()]);
  assert.deepEqual(rows.map(([id]) => id), REVIEW_PLAN_STEPS.map(([id]) => id),
    'the map should cover every declared plan id exactly once, in plan order');
  assert.equal(rows[0][1], 'none', 'resolve-change stays fileless');
  for (const [id] of REVIEW_PLAN_STEPS.slice(1)) {
    const expected = `\`@${REVIEW_STEP_MAP[id]}\``;
    assert.equal(rows.find(([rowId]) => rowId === id)[1], expected,
      `${id} should map to its just-in-time step file`);
  }
});

test('step-gated: progress continuations carry exactly two lines with the deterministic Active step pointer', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /every progress-event continuation payload you send is exactly two lines/,
    'progress continuations should be exactly the protocol line plus one pointer line');
  assert.match(coordinator, /`Active step: <id> — follow <path>`/,
    'the coordinator should pin the exact pointer-line literal');
  assert.match(coordinator, /first declared step still unmarked in plan order after applying the event/,
    'pointer derivation should follow the shared runner rule');
  assert.match(coordinator, /Active step: none — complete remaining work and return your terminal result\./,
    'an all-marked plan should deliver the terminal pointer line');
});

test('step-gated: non-progress continuations carry no pointer line', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /Continuations that are not progress-event continuations[^.]*carry no pointer line/,
    'picker-answer forwarding must not carry a pointer line');
  assert.match(coordinator, /active step file persists across them in its continuous session/,
    'the worker session should retain its active step across non-pointer continuations');
});

test('step-gated: replacement reconstruction includes active_step_id', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /replacement_reconstruction_fields[\s\S]{0,400}active_step_id/,
    'replacement reconstruction should include the departing worker active_step_id');
  assert.match(coordinator, /first continuation carries the correct pointer line for that active step/,
    "the replacement's first continuation should restore that step's pointer");
});

test('step-gated: the review worker loads steps/common.md at dispatch and executes only the active step', () => {
  const worker = artifact('sai/commands/review/worker.md');

  assert.match(worker, /Fetch @sai\/commands\/review\/steps\/common\.md and keep it in force for the entire run/,
    'common.md should load at dispatch as part of the sealed initial surface');
  assert.match(worker, /## Active Step Execution/, 'the worker contract should own active-step execution');
  assert.match(worker, /this contract plus common\.md is the sealed initial surface/);
  assert.match(worker, /`resolve-change` runs from it before the first progress event/,
    'the fileless first step should run from the sealed surface before the first pointer');
  assert.match(worker, /never prefetch, open, or follow any other step instruction file/,
    'the worker must execute only the coordinator-named step');
  assert.doesNotMatch(worker, /Fetch @sai\/commands\/review\/invocation\.md/,
    'the wholesale invocation fetch chain must be replaced by active-step execution');
  assert.match(worker, /A gated stage resolved by legitimate skip still reports its milestone/,
    'a legitimately skipped gated stage still advances the pointer past it');
});

test('step-gated: the carved step library exists beside the untouched monolith', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/review/instructions.md')),
    'the original instructions.md stays in place untouched');
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/review/steps/common.md')),
    'steps/common.md should exist');
  for (const [id, relativePath] of Object.entries(REVIEW_STEP_MAP)) {
    if (!relativePath) continue;
    const source = artifact(relativePath);
    assert.notEqual(source, '', `${relativePath} should exist`);
    assert.match(source, new RegExp(`Active step: ${id}\\.`),
      `${relativePath} should name its active step id`);
  }
  assert.match(artifact('sai/commands/review/steps/common.md'), /`resolve-change` has no step file of its own/,
    'common.md should record that resolve-change is fileless');
});

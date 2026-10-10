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

test('review coordinator declares the canonical four-step progress plan in order with labels', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  for (const id of ['resolve-change', 'establish-diff-scope', 'resolve-review-analysis', 'close-review-outcome']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /resolve-change[\s\S]{0,300}establish-diff-scope[\s\S]{0,300}resolve-review-analysis[\s\S]{0,300}close-review-outcome/,
    'the four canonical step ids should be declared in order'
  );
  assert.match(coordinator, /resolve-change[\s\S]{0,200}Resolve change/i);
  assert.match(coordinator, /establish-diff-scope[\s\S]{0,200}Resolve diff scope/i);
  assert.match(coordinator, /resolve-review-analysis[\s\S]{0,200}Resolve review analysis/i);
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

test('Direct Build discloses findings and resolves exclusions before the fix worker in both review routes', () => {
  const close = artifact('sai/commands/meta-review/direct-build-close.md');
  const selection = artifact('sai/commands/meta-review/findings-selection.md');
  const fixWorker = artifact('sai/commands/meta-review/review-fix-worker.md');
  const standalone = artifact('sai/commands/review/coordinator.md');
  const composition = artifact('sai/commands/meta-review/coordinator.md');

  assert.match(standalone, /Fetch @sai\/commands\/meta-review\/direct-build-close\.md/);
  assert.match(composition, /Fetch @sai\/commands\/meta-review\/direct-build-close\.md/);
  assert.match(close, /After `direct-label`, before\s+the fix loop: Fetch @sai\/commands\/meta-review\/findings-selection\.md/);
  assert.match(close, /no selected findings[\s\S]*`decline-close` without a dispatch/);
  assert.match(selection, /show[\s\S]*every found issue/i);
  assert.match(selection, /source-qualified id[\s\S]*severity[\s\S]*title[\s\S]*problem\/impact[\s\S]*location/);
  assert.match(selection, /`review:C1` or\s+`security:C1`/);
  assert.match(selection, /Fix all findings \(Recommended\)[\s\S]*Specify findings to exclude[\s\S]*free-text response/);
  assert.match(selection, /`Other` on Claude Code[\s\S]*`Type your own answer` on opencode/);
  assert.match(selection, /without a second question/);
  assert.match(selection, /empty, unknown, ambiguous, or unqualified id[\s\S]*dispatch nothing/);
  assert.match(selection, /every eligible finding is\s+excluded[\s\S]*no fix or commit/);
  assert.match(close, /full \*\*selected\*\* findings input[\s\S]*labeled exclusion list/);
  assert.match(close, /against the selected findings[\s\S]*exclusions/);
  assert.match(fixWorker, /selected findings as your sole fix targets/);
  assert.match(fixWorker, /initial exclusion list remains in force across continuations/);
});

test('zero-audit eligible findings reach the composition-owned shared close on both harnesses', () => {
  const composition = artifact('sai/commands/meta-review/coordinator.md');
  const bootstrap = artifact('sai/commands/meta-review/command-bootstrap.md');
  assert.match(composition, /After successful review and a legible triage parse, apply the composition's\s+Direct Build close with only the freshly regenerated `review\.md`/);
  assert.match(composition, /Eligible findings receive the correction choice/);
  assert.match(bootstrap, /When no audit is activated[\s\S]*Direct Build\s+close/);
  assert.doesNotMatch(composition, /do not apply the Direct Build close below|even when `review\.md` still carries findings/);
  assert.match(composition, /standalone Direct Build close belongs to `\/sai-5-review` and never runs\s+inside this composition/);
  for (const harness of ['claude', 'opencode']) {
    assert.ok(artifact(`commands/${harness}/sai-review.md`).includes(`@sai/adapters/${harness}/boot.md`));
    const boot = artifact(`sai/adapters/${harness}/boot.md`);
    assert.match(boot, /Routed names[^\n]*`meta-review`[^\n]*select the\s+coordinator card/);
    assert.ok(boot.includes('Fetch @sai/commands/{name}/coordinator.md'));
  }
});

test('zero-audit no-eligible findings preserve the literal and existing eligibility exclusions', () => {
  const composition = artifact('sai/commands/meta-review/coordinator.md');
  const close = artifact('sai/commands/meta-review/direct-build-close.md');
  const literal = 'Review complete. No audits recommended. Run `/sai-archive {name}` in a new chat when ready.';
  assert.equal(composition.split(literal).length - 1, 1);
  assert.match(composition, /When no eligible findings remain, print the literal unchanged and stop/);
  assert.match(composition, /standard close is the zero-audit literal above when zero audits/);
  assert.match(composition, /`decline-close` = the run-specific standard close/);
  assert.match(close, /zero remaining findings, offer no selector/);
  assert.match(close, /Leave open Questions \(`Q\*`\) out of the fix input/);
  assert.match(close, /whose fix changes a requirement or the design/);
  assert.match(close, /no remaining finding can be[\s\S]*offer no selector/);
});

test('zero-audit close excludes stale audit reports from every findings stage', () => {
  const composition = artifact('sai/commands/meta-review/coordinator.md');
  assert.match(composition, /only when each audit was activated and regenerated in\s+this same run/);
  assert.match(composition, /with zero audits, input is only the freshly regenerated\s+`review\.md`/);
  assert.match(composition, /Existing non-activated audit reports stay untouched and are\s+excluded from eligibility, findings selection, and fix input/);
});

test('zero-audit correction does not bypass triage errors or individual warnings', () => {
  const composition = artifact('sai/commands/meta-review/coordinator.md');
  const bootstrap = artifact('sai/commands/meta-review/command-bootstrap.md');
  assert.match(composition, /When the Error close of `command-bootstrap\.md` applies, this Direct Build\s+close does not run/);
  assert.match(bootstrap, /## Error close/);
  assert.match(bootstrap, /`review\.md` is missing, or none of the three values is legible/);
  assert.match(bootstrap, /Any other value is illegible: that audit does not run and the\s+summary carries a warning line/);
  assert.match(bootstrap, /An illegible value adds no\s+correction authorization/);
  assert.match(bootstrap, /exactly `Yes` activates the matching audit segment/);
  assert.doesNotMatch(composition, /illegible/);
  assert.match(composition, /An audit segment that returns `failed` or `cancelled` does not close the\s+composition, an exception to `@sai\/orchestration\/composition\.md` § 2/);
  assert.match(composition, /the other audits continue/);
  assert.doesNotMatch(composition, /## Edge cases|## No intermediate approval gate|## Non-removable stops|## No Step ceiling|bounded-recovery/);
});

test('zero-audit fixes retain explicit selection, existing rounds and local-commit boundaries', () => {
  const composition = artifact('sai/commands/meta-review/coordinator.md');
  const close = artifact('sai/commands/meta-review/direct-build-close.md');
  assert.match(composition, /no\s+fix dispatch before explicit Direct Build selection/);
  assert.match(close, /nothing is dispatched\s+before that selection/);
  assert.match(close, /pre-authorizes exactly one local commit/);
  assert.match(close, /loop is capped at three rounds/);
  const header = close.slice(0, close.indexOf('## Selector'));
  assert.doesNotMatch(header, /command-execution\.md|unattended-runtime-recovery\.md/);
  const fixLoop = close.slice(close.indexOf('## Fix loop'));
  assert.match(fixLoop, /Fetch @sai\/policies\/command-execution\.md/);
  assert.match(fixLoop, /Fetch @sai\/policies\/unattended-runtime-recovery\.md/);
  assert.match(close, /no push, no amend, no retry, no other path staged/);
  assert.doesNotMatch(close, /manual-route note/);
  assert.match(close, /non-convergence close[\s\S]*nothing was committed[\s\S]*still open[\s\S]*left uncommitted/);
  assert.match(close, /Fetch @sai\/policies\/commit-rules\.md/);
  assert.match(close, /Fetch @sai\/policies\/autonomy-audit-log\.md/);
});

test('review worker contract enumerates the four ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/review/worker.md');

  assert.match(
    worker,
    /resolve-change[\s\S]{0,800}establish-diff-scope[\s\S]{0,800}resolve-review-analysis[\s\S]{0,800}close-review-outcome/,
    'the review worker contract should enumerate the same four ids in the same order'
  );
  assert.match(worker, /startup act/i);
  assert.match(worker, /resolve-change/);
  assert.match(worker, /complete path returns three progress events/);
  assert.match(worker, /passes 1–11 are done/);
  assert.match(worker, /empty diff[\s\S]{0,240}(?:cancelled|establish-diff-scope)/i);
  assert.doesNotMatch(worker, /no Milestone Stamp/i, 'audit plans carry stamps per todo-structure; the worker states nothing about them');
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

  assert.doesNotMatch(worker, /no Milestone Stamp/i,
    'the worker never renders stamps, so its contract states nothing about them');
  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
});

// ─── review-step-gated-instructions (step-gated delivery for the audit family head) ──

const REVIEW_PLAN_STEPS = [
  ['resolve-change', 'Resolve change'],
  ['establish-diff-scope', 'Resolve diff scope'],
  ['resolve-review-analysis', 'Resolve review analysis'],
  ['close-review-outcome', 'Close review outcome'],
];
const REVIEW_STEP_MAP = {
  'resolve-change': null,
  'establish-diff-scope': 'sai/commands/review/steps/establish-diff-scope.md',
  'resolve-review-analysis': 'sai/commands/review/steps/resolve-review-analysis.md',
  'close-review-outcome': 'sai/commands/review/steps/close-review-outcome.md',
};

test('review reaches done in three progress events while audits retain four', () => {
  const review = require('../sai-state/machines/review-standalone.js');
  assert.deepEqual(review.STEPS, REVIEW_PLAN_STEPS.map(([id]) => id));
  assert.deepEqual(review.STAGE_FILES, { ...Object.fromEntries(
    Object.entries(REVIEW_STEP_MAP).map(([id, file]) => [id, file || 'none'])), done: 'none' });
  assert.equal(review.firstFiled().stage, 'establish-diff-scope');
  let result = review.transition(review.initialState, {
    step_ids: ['resolve-change', 'establish-diff-scope'],
  });
  assert.equal(result.next.follow, REVIEW_STEP_MAP['resolve-review-analysis']);
  assert.equal(result.state.stage, 'resolve-review-analysis');
  assert.deepEqual(result.state.done, ['resolve-change', 'establish-diff-scope']);
  const ignored = review.transition(result.state, { step_ids: ['resolve-mutation-analysis'] });
  assert.deepEqual(ignored.state, result.state);
  result = review.transition(result.state, { step_ids: ['resolve-review-analysis'] });
  assert.equal(result.next.follow, REVIEW_STEP_MAP['close-review-outcome']);
  result = review.transition(result.state, { step_ids: ['close-review-outcome'] });
  assert.equal(result.state.stage, 'done');
  assert.equal(result.next.follow, 'none');
  for (const phase of ['security', 'performance', 'accessibility']) {
    const machine = require(`../sai-state/machines/${phase}-standalone.js`);
    assert.equal(machine.STEPS.length, 5);
    let state = machine.transition(machine.initialState, { step_ids: machine.STEPS.slice(0, 2) }).state;
    for (const id of machine.STEPS.slice(2)) state = machine.transition(state, { step_ids: [id] }).state;
    assert.equal(state.stage, 'done');
    assert.deepEqual(state.done, machine.STEPS);
  }
  for (const harness of ['claude', 'opencode']) {
    assert.match(matrixBinding(harness, 'review'), /sai\/commands\/review\/worker\.md/);
  }
});

test('step-gated: the review coordinator declares step_machine and loads stage-machine.md', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /step_machine: review-standalone@1/,
    'the coordinator should declare step_machine: review-standalone@1');
  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.doesNotMatch(coordinator, /step_pointer_map/,
    'the static step_pointer_map should not be declared');
});

test('step-gated: progress continuations carry exactly two lines with the deterministic Active step pointer', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /## Step machines/,
    'stage-machine.md should have a Step machines section');
  assert.match(stageMachine, /the two-line continuation/i,
    'stage-machine.md should document the two-line continuation');
  assert.match(stageMachine, /`Active step: none` line/,
    'stage-machine.md should specify the terminal pointer line');
});

test('step-gated: non-progress continuations carry no pointer line', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /do not invoke emit and do not consult the machine/,
    'stage-machine.md should state that non-progress continuations do not invoke emit');
  assert.match(stageMachine, /active step file persists/,
    'stage-machine.md should state that the active step file persists');
});

test('step-gated: replacement reconstruction includes active_step_id', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /replacement_reconstruction_fields[\s\S]{0,400}active_step_id/,
    'replacement reconstruction should include the departing worker active_step_id');
  assert.match(stageMachine, /A replacement worker re-resolves/,
    "stage-machine.md should describe replacement re-resolution");
  assert.match(stageMachine, /## Step machines/,
    'stage-machine.md should have a Step machines section');
});

test('step-gated: the review worker loads steps/common.md at dispatch and executes only the active step', () => {
  const worker = artifact('sai/commands/review/worker.md');

  assert.match(worker, /Fetch @sai\/commands\/review\/steps\/common\.md and keep it in force for the entire run/,
    'common.md should load at dispatch as part of the sealed initial surface');
  assert.match(worker, /## Active Step Execution/, 'the worker contract should own active-step execution');
  assert.match(worker, /this contract plus common\.md is the sealed initial surface/);
  assert.match(worker, /`resolve-change` runs from it before the first progress event/,
    'the fileless first step should run from the sealed surface before the first pointer');
  assert.match(worker, /execute only the step it names, following that file exactly/,
    'the worker must execute only the coordinator-named step');
  assert.doesNotMatch(worker, /never prefetch, open, or follow/, 'the pointer rule is stated positively');
  assert.doesNotMatch(worker, /Fetch @sai\/commands\/review\/invocation\.md/,
    'the wholesale invocation fetch chain must be replaced by active-step execution');
  assert.doesNotMatch(worker, /gated stage|resolve-mutation-analysis/,
    'review has no optional mutation milestone');
});

test('step-gated: the step library is the only review instruction surface', () => {
  for (const retired of ['instructions.md', 'invocation.md']) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/review', retired)), false,
      `the monolithic review ${retired} is retired`);
  }
  const manifest = JSON.parse(artifact('sai/install-manifest.json'));
  const mutationRetirement = manifest.retirements.find(record => record.id === 'retired-review-mutation-analysis-step');
  assert.ok(mutationRetirement);
  assert.equal(mutationRetirement.destination.path, 'commands/review/steps/resolve-mutation-analysis.md');
  assert.deepEqual(mutationRetirement.harnesses, ['claude', 'opencode']);
  assert.deepEqual(mutationRetirement.managedHashes, [
    '1af64e9b39d573d8d794b42810f3719441f1b062d2018476f02c5c495aea5ecb',
    'b7bbfb2ddade2a7ac59b640613d1665f98faa48fdfc3c9f5587985ec768edffa',
  ]);
  for (const [id, destination] of [
    ['retired-sai-5-review-instructions', 'commands/review/instructions.md'],
    ['retired-sai-5-review-invocation', 'commands/review/invocation.md'],
  ]) {
    const retirement = manifest.retirements.find(record => record.id === id);
    assert.ok(retirement, `the manifest should retire installed copies of ${destination}`);
    assert.equal(retirement.destination.path, destination);
  }
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/review/steps/common.md')),
    'steps/common.md should exist');
  for (const [id, relativePath] of Object.entries(REVIEW_STEP_MAP)) {
    if (!relativePath) continue;
    const source = artifact(relativePath);
    assert.notEqual(source, '', `${relativePath} should exist`);
    assert.match(source, new RegExp(`Active step: ${id}\\.`),
      `${relativePath} should name its active step id`);
  }
  assert.match(artifact('sai/commands/review/worker.md'), /`resolve-change` runs from it before the first progress event/,
    'the worker contract should record that resolve-change runs without a step file');
});

test('review executes eleven passes, preserves alignment and resilience, and writes only its report', () => {
  const worker = artifact('sai/commands/review/worker.md');
  const analysis = artifact('sai/commands/review/steps/resolve-review-analysis.md');
  const close = artifact('sai/commands/review/steps/close-review-outcome.md');
  assert.deepEqual([...analysis.matchAll(/^(\d+)\. \*\*/gm)].map(match => Number(match[1])),
    Array.from({ length: 11 }, (_, index) => index + 1));
  assert.match(analysis, /contradict a recorded decision/);
  assert.match(analysis, /single owner of retry, timeout, circuit-breaker, idempotency, and fallback defects/);
  assert.match(analysis, /cap the finding at Question or Low/);
  assert.match(analysis, /Critical only for cascade or outage, data loss, or duplicate side effects with concrete impact/);
  assert.match(analysis, /An uncovered goal or acceptance criterion is a finding/);
  assert.match(analysis, /scope creep is a `Question`/);
  assert.match(analysis, /A pass with nothing to report stays silent/);
  assert.match(analysis, /Audit recommendations come only from passes 3 to 5/);
  assert.doesNotMatch(analysis, /adds no audit recommendation|Its findings are ordinary findings/);
  assert.equal((analysis.match(/blatant defect/g) || []).length, 1, 'one blatant-defect rule');
  assert.match(analysis, /Only when `GLOSSARY\.md` exists at the repo root: Fetch @sai\/policies\/glossary-format\.md/);
  assert.doesNotMatch(artifact('sai/commands/review/steps/common.md'), /glossary-format/);
  assert.match(artifact('sai/commands/review/steps/common.md'), /## Severity[\s\S]*\*\*Critical\*\* — must be fixed before merge/);
  assert.doesNotMatch(close, /\*\*Critical\*\* —/);
  assert.doesNotMatch(worker, /OpenSpec prerequisite/);
  assert.doesNotMatch(analysis, /Coverage Notes|record the pass as skipped/);
  assert.doesNotMatch(worker, /coverage notes|`Resilience:`/);
  assert.match(close, /the three `Surface touched` lines, and a closing `Summary:` tally/);
  assert.match(worker, /Write only `openspec\/changes\/\{change-name\}\/review\.md`/);
  assert.match(worker, /`changed_files` holds only that report path/);
  assert.match(close, /When the draft has no finding, go to step 4/);
  assert.match(close, /dispatch exactly one `budget-explorer` adversary/);
  assert.doesNotMatch(analysis + close, /mutation|mMUT|Pass 12/i);
  for (const audit of ['security', 'performance', 'accessibility']) {
    assert.match(analysis, new RegExp('recommend `/sai-[678]-' + audit));
  }
});

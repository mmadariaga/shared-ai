'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');

const repoRoot = path.join(__dirname, '..');

// ─── interface stubs (RED phase) ────────────────────────────────────────────
// The Step 2 routed apply cards do not exist yet. Every artifact() read below
// asserts the card's presence FIRST so a RED run fails by assertion on the
// absent routed apply structure, never by an ENOENT setup error.

const APPLY_CARDS = {
  coordinator: 'sai/commands/apply/coordinator.md',
  redWorker: 'sai/commands/apply/red-worker.md',
  greenWorker: 'sai/commands/apply/green-worker.md',
  runner: 'sai/commands/apply/runner.md',
  invocation: 'sai/commands/apply/invocation.md',
};

const REPORT_FIELDS = [
  'Step executed',
  'Per-item status',
  'RED result',
  'GREEN result',
  'Deviations',
  'Technical learnings/friction',
  'STOP reached?',
  'Files modified',
  'Attempts per phase',
];

const RECOVERY_HEADINGS = ['Reported', 'Evidence', 'Cause', 'Correction', 'Verification'];

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function combinedCards() {
  return [
    artifact(APPLY_CARDS.coordinator),
    artifact(APPLY_CARDS.redWorker),
    artifact(APPLY_CARDS.greenWorker),
    artifact(APPLY_CARDS.runner),
    artifact(APPLY_CARDS.invocation),
  ].join('\n');
}

function execOk() {
  return { status: 0, stdout: '1.4.1\n', stderr: '', error: null };
}

function collectOut() {
  const stream = new PassThrough();
  const chunks = [];
  stream.on('data', chunk => chunks.push(chunk));
  return { stream, text: () => Buffer.concat(chunks).toString() };
}

// ─── specs/apply-routed-card-set/spec.md — adapter field set ────────────────

test('Step 2 the apply coordinator adapter declares the full phase-adapter field set with immutable recovery_policy', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  for (const field of [
    'original_envelope',
    'dispatch_operation',
    'continuation_operation',
    'allowed_nonterminal_extensions',
    'extension_handlers',
    'replacement_reconstruction_fields',
    'terminal_navigation',
  ]) {
    assert.match(coordinator, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `specs/apply-routed-card-set/spec.md: the coordinator should declare the ${field} adapter field`);
  }
  assert.match(coordinator, /recovery_policy\s*:\s*true/,
    'specs/apply-routed-card-set/spec.md: the apply adapter should declare recovery_policy: true');
  assert.match(coordinator, /recovery_policy[\s\S]{0,220}immutable|immutable[\s\S]{0,220}recovery_policy/i,
    'specs/apply-routed-card-set/spec.md: recovery_policy should be immutable (segment-scoped under composition)');
});

test('Step 2 the coordinator is fetched through the routed coordinator path, not a utility body card', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  assert.match(coordinator, /# Isolation Mode/,
    'specs/apply-routed-card-set/spec.md: the coordinator card must keep the Isolation Mode block');
  assert.doesNotMatch(coordinator, /@sai\/commands\/apply\/instructions\.md/,
    'specs/apply-routed-card-set/spec.md: the coordinator must not load the monolithic instruction');
  const claudeWrapper = artifact('commands/claude/sai-4-apply.md');
  const opencodeWrapper = artifact('commands/opencode/sai-4-apply.md');
  for (const wrapper of [claudeWrapper, opencodeWrapper]) {
    assert.match(wrapper, /command_name:\s*apply/,
      'specs/apply-routed-card-set/spec.md: the apply wrapper must still forward command_name: apply');
    assert.doesNotMatch(wrapper, /sai\/commands\/apply\/body\.md/,
      'specs/apply-routed-card-set/spec.md: the wrapper must not fetch the retired utility body card');
  }
});

// ─── specs/apply-step-projection/spec.md — per-dispatch progress plans ──────

test('Step 2 every apply dispatch declares one canonical progress plan with the closed progress-event shape', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /event:\s*"?progress"?/,
    'specs/apply-step-projection/spec.md: the progress event must carry exactly event: progress');
  assert.match(combined, /step_ids:\s*string\[\]/,
    'specs/apply-step-projection/spec.md: the progress event must carry step_ids: string[]');
  assert.match(combined, /changed_files:\s*string\[\]/,
    'specs/apply-step-projection/spec.md: the progress event must carry changed_files: string[]');
  assert.match(combined, /test-authoring\s*(?:→|->)\s*red-verification/,
    'specs/apply-step-projection/spec.md: the RED plan must be test-authoring → red-verification');
  assert.match(combined, /implementation\s*(?:→|->)\s*green-verification/,
    'specs/apply-step-projection/spec.md: the GREEN plan must be implementation → green-verification');
  assert.match(combined, /test-authoring\s*(?:→|->)\s*green-verification/,
    'specs/apply-step-projection/spec.md: the green-exception plan must be test-authoring → green-verification');
  assert.match(combined, /green[- ]exception/,
    'specs/apply-step-projection/spec.md: the green-exception plan must be named');
});

test('Step 2 each RED, GREEN, or green-exception dispatch is a separate worker invocation with one immutable plan', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /separate[\s\S]{0,80}(?:worker )?invocation|each[\s\S]{0,120}(?:RED|GREEN|dispatch)[\s\S]{0,120}separate/i,
    'specs/apply-step-projection/spec.md: each dispatch must be a separate worker invocation');
  assert.match(combined, /immutable/,
    'specs/apply-step-projection/spec.md: the dispatch-local plan must be immutable');
  assert.match(combined, /selected[\s\S]{0,120}before dispatch|before[\s\S]{0,120}dispatch[\s\S]{0,120}(?:select|plan)/i,
    'specs/apply-step-projection/spec.md: the plan must be selected before dispatch');
  assert.match(combined, /does not mutate|not[\s\S]{0,40}mutate|unchanged|never changes/i,
    'specs/apply-step-projection/spec.md: selecting another plan for a later dispatch must not mutate the earlier plan');
});

test('Step 2 worker progress marks only its dispatch-local plan', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  for (const worker of [red, green]) {
    assert.match(worker, /dispatch[- ]local plan|plan selected for this dispatch|its own plan|the plan declared for this dispatch/i,
      'specs/apply-step-projection/spec.md: worker progress must mark only the dispatch-local plan');
    assert.match(worker, /step_ids:\s*string\[\]/,
      'specs/apply-step-projection/spec.md: the worker must report progress step_ids');
  }
});

// ─── specs/apply-coordinator-ownership/spec.md — run-start projection ───────

test('Step 2 the run-start Step Projection is coordinator-derived and carries no progress protocol', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  assert.match(coordinator, /Step Projection|step projection/i,
    'specs/apply-step-projection/spec.md: the coordinator must define the run-start Step Projection');
  assert.match(coordinator, /run[- ]start|at the start of the run/i,
    'specs/apply-step-projection/spec.md: the projection must render at run start');
  assert.match(coordinator, /coordinator[\s\S]{0,80}(?:deriv|own)|deriv(?:ed|ing)[\s\S]{0,80}coordinator/i,
    'specs/apply-step-projection/spec.md: the projection must be coordinator-derived');
  assert.match(coordinator, /no progress protocol|no progress_plan|no plan declaration/i,
    'specs/apply-step-projection/spec.md: the projection must carry no progress plan, event, or acknowledgement');
  assert.doesNotMatch(coordinator, /continue_after_progress[\s\S]{0,120}Step Projection|Step Projection[\s\S]{0,120}continue_after_progress/i,
    'specs/apply-step-projection/spec.md: the projection must not carry continue_after_progress');
});

// ─── specs/apply-coordinator-ownership/spec.md — changed-files union ────────

test('Step 2 the invocation-wide changed-files union is ordered, duplicate-free, never reset, and excludes scratch', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /changed[- ]?files[\s\S]{0,160}union|union[\s\S]{0,160}changed[- ]?files/i,
    'specs/apply-coordinator-ownership/spec.md: the coordinator must own an invocation-wide changed-files union');
  assert.match(combined, /ordered/i,
    'specs/apply-coordinator-ownership/spec.md: the union must be ordered');
  assert.match(combined, /duplicate[- ]free|no duplicates|unique/i,
    'specs/apply-coordinator-ownership/spec.md: the union must be duplicate-free');
  assert.match(combined, /never[\s\S]{0,80}(?:reset|cleared)|(?:reset|cleared)[\s\S]{0,80}never/i,
    'specs/apply-coordinator-ownership/spec.md: the union must never be reset across RED/GREEN/recovery');
  assert.match(combined, /scratch/i,
    'specs/apply-coordinator-ownership/spec.md: the union must exclude scratch paths');
  assert.match(combined, /pre[- ]commit/i,
    'specs/apply-coordinator-ownership/spec.md: the union must supply pre-commit reporting and addition');
});

// ─── specs/apply-red-green-worker-model/spec.md — name injection/echo ───────

test('Step 2 the coordinator injects the resolved change name and the workers echo it without change selection', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  assert.match(coordinator, /arguments_value/,
    'specs/apply-red-green-worker-model/spec.md: each worker dispatch envelope must carry arguments_value');
  assert.match(coordinator, /resolved_change_name/,
    'specs/apply-red-green-worker-model/spec.md: the coordinator must carry the resolved change name');
  assert.match(coordinator, /resolved[\s\S]{0,80}arguments_value|arguments_value[\s\S]{0,80}resolved/i,
    'specs/apply-red-green-worker-model/spec.md: the coordinator must inject the resolved name as arguments_value');
  for (const worker of [red, green]) {
    assert.match(worker, /resolved_change_name/,
      'specs/apply-red-green-worker-model/spec.md: every post-resolution payload must echo resolved_change_name');
    assert.match(worker, /every[\s\S]{0,160}post[- ]resolution|post[- ]resolution[\s\S]{0,160}every|lifecycle payload/i,
      'specs/apply-red-green-worker-model/spec.md: the echo must apply to every post-resolution lifecycle payload');
    assert.match(worker, /identical|same[\s\S]{0,60}resolved|return[\s\S]{0,80}resolved_change_name/i,
      'specs/apply-red-green-worker-model/spec.md: RED and GREEN must return the identical resolved_change_name');
    assert.doesNotMatch(worker, /change[- ]picker|openspec list|Which change\?|Use change '\{name\}'/,
      'specs/apply-red-green-worker-model/spec.md: workers must never execute change selection');
  }
});

// ─── specs/apply-subagent-report-contract/spec.md — report fields ───────────

test('Step 2 RED and GREEN terminal payloads use the worker-core closed envelope plus the nine-field apply report extension', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  for (const worker of [red, green]) {
    for (const status of ['completed', 'needs_input', 'failed', 'cancelled']) {
      assert.match(worker, new RegExp(`\\b${status}\\b`),
        'specs/apply-subagent-report-contract/spec.md: the worker-core closed status envelope must be preserved');
    }
    assert.match(worker, /resolved_change_name/, 'the terminal payload must echo the resolved change name');
    assert.match(worker, /changed_files/, 'the terminal payload must carry changed_files');
    assert.match(worker, /summary/, 'the terminal payload must carry a summary');
    for (const field of REPORT_FIELDS) {
      assert.ok(worker.includes(field), `specs/apply-subagent-report-contract/spec.md: missing report field: ${field}`);
    }
  }
});

test('Step 2 the report dispatch-kind table pins field values, malformed field 8, soft-degraded field 9, and scratch-free field 8', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${runner}\n${coordinator}`;
  assert.match(combined, /green[- ]direct/,
    'specs/apply-subagent-report-contract/spec.md: the dispatch-kind table must include green-direct');
  assert.match(combined, /dispatch[- ]kind|per dispatch kind|keyed on the dispatch/i,
    'specs/apply-subagent-report-contract/spec.md: field values must follow the dispatch-kind table');
  assert.match(combined, /field 8[\s\S]{0,140}(?:malformed|omitted)|malformed[\s\S]{0,140}field 8/i,
    'specs/apply-subagent-report-contract/spec.md: an absent field 8 must be malformed');
  assert.match(combined, /field 9[\s\S]{0,180}(?:soft[- ]degrad|not malformed|exempt)|soft[- ]degrad[\s\S]{0,180}field 9/i,
    'specs/apply-subagent-report-contract/spec.md: an absent field 9 must soft-degrade');
  assert.match(combined, /scratch[\s\S]{0,120}field 8|field 8[\s\S]{0,120}scratch/i,
    'specs/apply-subagent-report-contract/spec.md: scratch must never appear in field 8');
});

// ─── specs/apply-execution-telemetry-appendix/spec.md — telemetry row ───────

test('Step 2 the execution telemetry row uses the pinned column shape and closed vocabularies', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${runner}\n${coordinator}`;
  assert.match(combined, /\| Step \| dispatch \| phase \| attempts \| first_failure \| note \|/,
    'specs/apply-execution-telemetry-appendix/spec.md: the telemetry table must carry the six fixed columns');
  assert.match(combined, /green[- ]direct/,
    'specs/apply-execution-telemetry-appendix/spec.md: dispatch must admit green-direct');
  assert.match(combined, /first_failure/,
    'specs/apply-execution-telemetry-appendix/spec.md: the table must carry a first_failure column');
  assert.match(combined, /assertion[\s\S]{0,60}setup[\s\S]{0,60}import[\s\S]{0,60}other[\s\S]{0,60}n\/a|assertion\s*\/\s*setup\s*\/\s*import\s*\/\s*other\s*\/\s*n\/a/i,
    'specs/apply-execution-telemetry-appendix/spec.md: first failure must draw from assertion|setup|import|other|n/a');
  assert.match(combined, /`red`[\s\S]{0,60}`green`|red\s*\/\s*green|(?:phase|`phase`)[\s\S]{0,60}(?:red|green)[\s\S]{0,60}(?:green|red)/i,
    'specs/apply-execution-telemetry-appendix/spec.md: phase must admit exactly red and green');
});

test('Step 2 the appendices keep Plan vs Final Implementation before Execution Telemetry; telemetry appends once before commit', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  const plan = combined.search(/## Appendix: Plan vs Final Implementation/);
  const telemetry = combined.search(/## Appendix: Execution Telemetry/);
  assert.ok(plan >= 0 && telemetry >= 0,
    'specs/apply-execution-telemetry-appendix/spec.md: both appendices must be declared');
  assert.ok(plan < telemetry,
    'specs/apply-execution-telemetry-appendix/spec.md: Plan vs Final Implementation must precede Execution Telemetry regardless of creation order');
  assert.match(combined, /created once|never create a second section|one section/i,
    'specs/apply-execution-telemetry-appendix/spec.md: the telemetry section must be created once');
  assert.match(combined, /before the commit|before[\s\S]{0,80}commit/i,
    'specs/apply-execution-telemetry-appendix/spec.md: telemetry must append before the commit');
  assert.match(combined, /Human Verification/i,
    'specs/apply-execution-telemetry-appendix/spec.md: telemetry must append after the verification/human gates');
});

// ─── specs/apply-step-routing-tree/spec.md — routing tree ───────────────────

test('Step 2 a Step without RED and with production files dispatches GREEN directly', () => {
  const runner = artifact(APPLY_CARDS.runner);
  assert.match(runner, /green[- ]direct/,
    'specs/apply-step-routing-tree/spec.md: the no-RED-with-production route must be GREEN direct');
  assert.match(runner, /no RED|without a RED|no RED block|RED block absent/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on the absence of a RED phase');
  assert.match(runner, /production file/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on the presence of production files');
  assert.match(runner, /GREEN[\s\S]{0,140}direct(?:ly)?|direct(?:ly)?[\s\S]{0,140}GREEN/i,
    'specs/apply-step-routing-tree/spec.md: the branch must dispatch GREEN without a RED dispatch');
});

test('Step 2 a Step without RED and without production files dispatches one RED green-exception', () => {
  const runner = artifact(APPLY_CARDS.runner);
  assert.match(runner, /green[- ]exception/,
    'specs/apply-step-routing-tree/spec.md: the no-RED-no-production route must be the green-exception');
  assert.match(runner, /no RED|without a RED|no RED block|RED block absent/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on the absence of a RED phase');
  assert.match(runner, /no production file/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on the absence of production files');
  assert.match(runner, /one[\s\S]{0,60}RED/i,
    'specs/apply-step-routing-tree/spec.md: exactly one RED dispatch must be issued');
});

test('Step 2 RED without an exact unambiguous interfaces.md Step contract stops before any dispatch or write', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${runner}\n${coordinator}`;
  assert.match(combined, /exact[\s\S]{0,40}unambiguous|unambiguous[\s\S]{0,40}exact/i,
    'specs/apply-step-routing-tree/spec.md: the contract must be exact and unambiguous');
  assert.match(combined, /interfaces\.md|## Step N|Step Contract/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on the interfaces.md Step contract');
  assert.match(combined, /ambiguous/i,
    'specs/apply-step-routing-tree/spec.md: an ambiguous match must also stop');
  assert.match(combined, /stop[\s\S]{0,140}before[\s\S]{0,80}(?:dispatch|write)|before[\s\S]{0,80}(?:dispatch|write)[\s\S]{0,140}stop/i,
    'specs/apply-step-routing-tree/spec.md: the stop must happen before any dispatch or write');
});

test('Step 2 RED with a contract and production files dispatches blind RED then GREEN', () => {
  const runner = artifact(APPLY_CARDS.runner);
  assert.match(runner, /blind[\s\S]{0,60}RED|RED[\s\S]{0,60}blind/i,
    'specs/apply-step-routing-tree/spec.md: the first dispatch must be the blind RED writer');
  assert.match(runner, /then[\s\S]{0,100}GREEN|GREEN[\s\S]{0,100}after/i,
    'specs/apply-step-routing-tree/spec.md: the blind RED must be followed by a GREEN dispatch');
  assert.match(runner, /production file/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on the presence of production files');
  assert.match(runner, /## Step N|Step Contract|interfaces\.md/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on an available Step contract');
});

test('Step 2 RED with a contract and no production files dispatches one RED green-exception terminating GREEN=pass', () => {
  const runner = artifact(APPLY_CARDS.runner);
  assert.match(runner, /green[- ]exception/,
    'specs/apply-step-routing-tree/spec.md: the RED-no-production route must be the green-exception');
  assert.match(runner, /no production file/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on the absence of production files');
  assert.match(runner, /## Step N|Step Contract|interfaces\.md/i,
    'specs/apply-step-routing-tree/spec.md: the branch must key on an available Step contract');
  assert.match(runner, /GREEN\s*=\s*pass|GREEN:\s*pass|green[- ]?exception[\s\S]{0,140}pass/i,
    'specs/apply-step-routing-tree/spec.md: the green-exception must terminate with GREEN=pass');
});

test('Step 2 contract-absent and ambiguous-contract stops emit no traced fallback or single-dispatch routing line', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const invocation = artifact(APPLY_CARDS.invocation);
  const combined = `${runner}\n${coordinator}\n${invocation}`;
  assert.doesNotMatch(combined, /routing to a single dispatch/i,
    'specs/apply-step-routing-tree/spec.md: no single-dispatch fallback trace may remain');
  assert.doesNotMatch(combined, /RED block present but no/i,
    'specs/apply-step-delegation/spec.md: no traced fall-back line may remain for a missing contract');
  assert.doesNotMatch(combined, /traced fall[- ]back|fall[- ]back trace/i,
    'specs/apply-step-delegation/spec.md: no traced fall-back machinery may remain');
  assert.match(combined, /ambiguous/i,
    'specs/apply-step-routing-tree/spec.md: the ambiguous-contract stop must remain defined');
});

// ─── specs/apply-test-impl-split/spec.md — blind RED and GREEN separation ────

test('Step 2 the blind RED prompt carries only the matching Step contract and testing slice', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const red = artifact(APPLY_CARDS.redWorker);
  assert.match(coordinator, /## Step N|Step Contract|interfaces\.md/i,
    'specs/apply-step-delegation/spec.md: the blind prompt must include the matching Step contract');
  assert.match(coordinator, /testing slice|test command|Implementation Context/i,
    'specs/apply-step-delegation/spec.md: the blind prompt must include the testing slice');
  assert.match(red, /only[\s\S]{0,140}(?:the )?(?:matching|that|this) Step|Step Contract/i,
    'specs/apply-test-impl-split/spec.md: the RED worker must receive only the contract and testing slice');
  assert.match(red, /testing slice|test command/i,
    'specs/apply-test-impl-split/spec.md: the RED worker must receive the testing slice');
  assert.doesNotMatch(red, /GREEN body|implementation body/i,
    'specs/apply-test-impl-split/spec.md: the blind RED prompt must not reveal the implementation body');
});

test('Step 2 the GREEN prompt excludes test files and green-worker.md forbids creating or modifying them', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const green = artifact(APPLY_CARDS.greenWorker);
  assert.match(coordinator, /exclude[\s\S]{0,100}test file|test file[\s\S]{0,100}exclude/i,
    'specs/apply-test-impl-split/spec.md: the GREEN dispatch allowed files must exclude test files');
  assert.match(green, /test file/i,
    'specs/apply-step-delegation/spec.md: the GREEN worker contract must address test files');
  assert.match(green, /forbidden|MUST NOT|prohibited/i,
    'specs/apply-step-delegation/spec.md: creating or modifying a test file must be forbidden');
  assert.match(green, /creat(?:e|ing)[\s\S]{0,80}modify(?:ing)?[\s\S]{0,100}test file|test file[\s\S]{0,100}forbidden/i,
    'specs/apply-test-impl-split/spec.md: the GREEN worker must never create or modify a test file');
});

test('Step 2 RED stubs use only contract-valid null/empty behavior and read existing tests only as a fallback', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  assert.match(red, /stub/i,
    'specs/apply-test-impl-split/spec.md: the RED contract must govern interface stubs');
  assert.match(red, /null|empty|wrong/i,
    'specs/apply-test-impl-split/spec.md: stubs must return null/empty/wrong values');
  assert.match(red, /no logic|must not[\s\S]{0,80}logic|without[\s\S]{0,60}logic/i,
    'specs/apply-test-impl-split/spec.md: stubs must contain no assertion-satisfying implementation logic');
  assert.match(red, /existing test/i,
    'specs/apply-test-impl-split/spec.md: the RED worker may read existing tests');
  assert.match(red, /fallback/i,
    'specs/apply-test-impl-split/spec.md: the read must be the specified fallback');
  assert.match(red, /setup convention/i,
    'specs/apply-test-impl-split/spec.md: the fallback must key on missing setup conventions');
});

// ─── specs/apply-same-worker-retry/spec.md — bounded recovery ───────────────

test('Step 2 coordinator-disproven GREEN evidence continues the same worker with one shared bounded recovery pool', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /continue_after_recovery/,
    'specs/apply-same-worker-retry/spec.md: recovery must continue the same worker with continue_after_recovery');
  assert.match(combined, /same[\s\S]{0,60}worker|worker[\s\S]{0,60}same/i,
    'specs/apply-same-worker-retry/spec.md: recovery must remain on the same worker');
  assert.match(combined, /never[\s\S]{0,140}(?:fresh|replacement|new) worker|(?:fresh|replacement|new) worker[\s\S]{0,140}never/i,
    'specs/apply-same-worker-retry/spec.md: recovery must never open a fresh worker');
  assert.match(combined, /three attempts|3 attempts|at most three|exactly three/i,
    'specs/apply-same-worker-retry/spec.md: recovery must permit at most three attempts');
  assert.match(combined, /exhaust/i,
    'specs/apply-same-worker-retry/spec.md: exhaustion must be a terminal state');
  assert.match(combined, /checkbox[\s\S]{0,140}(?:commit|advance)|commit[\s\S]{0,140}(?:checkbox|advance)|advance[\s\S]{0,140}(?:checkbox|commit)/i,
    'specs/apply-same-worker-retry/spec.md: exhaustion must block checkbox marking, commit, and advance');
});

test('Step 2 a completed GREEN disproven by coordinator verification is classified validation-failed before recovery continuation', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /validation[- ]failed/,
    'specs/apply-coordinator-verification/spec.md: the disproven GREEN must be classified validation-failed');
  assert.match(combined, /before[\s\S]{0,140}continue_after_recovery|continue_after_recovery[\s\S]{0,140}only after|first[\s\S]{0,80}classif/i,
    'specs/apply-same-worker-retry/spec.md: classification must precede any continue_after_recovery continuation');
  assert.match(combined, /coordinator[\s\S]{0,80}(?:verif|evidence)|(?:verif|evidence)[\s\S]{0,80}coordinator/i,
    'specs/apply-coordinator-verification/spec.md: coordinator verification must be the classifying authority');
});

test('Step 2 the recovery continuation carries the ordered Reported/Evidence/Cause/Correction/Verification diagnosis to the same GREEN worker', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const green = artifact(APPLY_CARDS.greenWorker);
  const combined = `${coordinator}\n${green}`;
  const start = combined.search(/\bReported\b/);
  assert.ok(start >= 0, 'the recovery diagnosis must begin with the Reported heading');
  const tail = combined.slice(start);
  const positions = RECOVERY_HEADINGS.map(heading => tail.search(new RegExp(`\\b${heading}\\b`)));
  for (const position of positions) assert.ok(position >= 0, 'each recovery heading must exist');
  assert.deepEqual([...positions].sort((left, right) => left - right), positions,
    'specs/apply-same-worker-retry/spec.md: the recovery headings must stay in the required order');
  assert.match(combined, /same[\s\S]{0,60}GREEN worker|GREEN worker[\s\S]{0,60}same/i,
    'specs/apply-same-worker-retry/spec.md: the continuation must target the same GREEN worker session');
  assert.match(combined, /continue_after_recovery/,
    'specs/apply-same-worker-retry/spec.md: the continuation must use continue_after_recovery');
});

test('Step 2 worker-returned eligible failures and coordinator validation-failed share one undoubled three-attempt pool', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /one[\s\S]{0,80}shared[\s\S]{0,80}(?:three[- ]attempt|recovery pool)|shared[\s\S]{0,80}three[- ]attempt/i,
    'specs/apply-same-worker-retry/spec.md: both recovery sources must share one three-attempt pool');
  assert.match(combined, /validation[- ]failed/,
    'specs/apply-same-worker-retry/spec.md: coordinator-classified validation-failed must draw from the same pool');
  assert.match(combined, /three attempts|3 attempts|exactly three/i,
    'specs/apply-same-worker-retry/spec.md: the pool must hold exactly three attempts');
  assert.match(combined, /undoubl|not[\s\S]{0,60}(?:doubled|duplicated)|single[\s\S]{0,60}(?:pool|budget|count)/i,
    'specs/apply-same-worker-retry/spec.md: the pool must not be doubled per recovery source');
});

// ─── specs/apply-coordinator-verification/spec.md — scratch cleanup ─────────

test('Step 2 every dispatch, continuation, and checklist run is followed by scratch cleanup with pinned trace lines', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  // Exact non-empty trace forms live solely on the coordinator.
  assert.match(coordinator, /> Scratch cleanup: removed \.tmp\/\{change-name\}\//,
    'specs/apply-coordinator-verification/spec.md: the per-change cleanup trace must be pinned on the coordinator');
  assert.match(coordinator, /> Scratch cleanup: removed \.tmp\/\{change-name\}\/,[ \t]*\.tmp\//,
    'specs/apply-coordinator-verification/spec.md: the parent cleanup trace must end with ", .tmp/" on the coordinator');
  assert.doesNotMatch(runner, /> Scratch cleanup: removed \.tmp\/\{change-name\}\//,
    'specs/apply-coordinator-verification/spec.md: runner must not restate the exact per-change trace form');
  assert.match(combined, /every dispatch|each dispatch|after each dispatch/i,
    'specs/apply-coordinator-verification/spec.md: cleanup must follow every dispatch');
  assert.match(combined, /continuation/i,
    'specs/apply-coordinator-verification/spec.md: cleanup must also follow every continuation');
  assert.match(combined, /before[\s\S]{0,80}(?:comparison|redispatch)|comparison[\s\S]{0,80}sweep|sweep[\s\S]{0,80}before[\s\S]{0,80}(?:comparison|redispatch)/i,
    'specs/apply-coordinator-verification/spec.md: cleanup must precede comparison or redispatch');
  assert.match(combined, /checklist/i,
    'specs/apply-coordinator-verification/spec.md: the coordinator checklist runs must be named');
});

test('Step 2 worker contracts do not claim coordinator checklist authority', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  for (const worker of [red, green]) {
    assert.doesNotMatch(worker, /(?:runs?|owns?|conducts?|performs?)[\s\S]{0,80}(?:Verification Checklist|checklist)/i,
      'specs/apply-coordinator-verification/spec.md: workers must not claim to run the coordinator checklist');
    assert.doesNotMatch(worker, /checklist[\s\S]{0,80}(?:authority|runs?|owns?)/i,
      'specs/apply-coordinator-verification/spec.md: workers must not claim checklist authority');
  }
});

// ─── specs/apply-routed-card-set/spec.md — invocation loads and completion ──

test('Step 2 the routed invocation parses arguments before the change picker and loads the full behavior set', () => {
  const invocation = artifact(APPLY_CARDS.invocation);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${invocation}\n${coordinator}`;
  assert.match(invocation, /arguments_value/,
    'specs/apply-routed-card-set/spec.md: invocation must consume arguments_value');
  assert.match(coordinator, /arguments_value/,
    'specs/apply-routed-card-set/spec.md: apply coordinator must consume arguments_value');
  const parse = combined.search(/(?:parse|parsing)[\s\S]{0,180}(?:arguments_value|--fast-track)|(?:arguments_value|--fast-track)[\s\S]{0,180}(?:parse|parsing)/i);
  const picker = combined.search(/change[- ]picker/i);
  const prereq = combined.search(/prereqs|prerequisite/i);
  assert.ok(parse >= 0 && picker >= 0 && prereq >= 0,
    'specs/apply-routed-card-set/spec.md: argument parsing, picker, and prerequisite loading must all exist');
  assert.ok(parse < picker,
    'specs/apply-routed-card-set/spec.md: arguments_value/fast-track parsing must occur before the change picker');
  assert.match(combined, /implementation\.md/,
    'specs/apply-routed-card-set/spec.md: the invocation must check implementation.md');
  assert.match(combined, /openspec/,
    'specs/apply-routed-card-set/spec.md: the invocation must check OpenSpec');
  assert.match(combined, /--fast-track/,
    'specs/apply-routed-card-set/spec.md: the invocation must parse the fast-track flag');
  assert.match(combined, /FAST-TRACK MODE ACTIVE/,
    'specs/apply-routed-card-set/spec.md: the fast-track banner must be pinned');
  assert.match(combined, /@skills\/budget\/SKILL\.md/,
    'specs/apply-routed-card-set/spec.md: the invocation must load the budget skill');
  assert.match(combined, /@skills\/safe-operations\/SKILL\.md/,
    'specs/apply-routed-card-set/spec.md: the invocation must load the safe-operations skill');
  assert.match(combined, /@sai\/policies\/sai-learnings-format\.md/,
    'specs/apply-routed-card-set/spec.md: the invocation must load the learnings format');
  assert.match(combined, /@sai\/orchestration\/command-runner\.md/,
    'specs/apply-routed-card-set/spec.md: the invocation must load the runner contract');
  assert.match(combined, /@sai\/policies\/remember\.md/,
    'specs/apply-routed-card-set/spec.md: the invocation must load the remember policy');
});

test('Step 2 full completion emits exactly the pinned completion literal; fast track emits its banner once without bypassing safe operations', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const invocation = artifact(APPLY_CARDS.invocation);
  const combined = `${coordinator}\n${runner}\n${invocation}`;
  assert.match(invocation, /Implementation applied\. Run `\/sai-5-review \{name\}` in a new chat when ready\./,
    'specs/apply-routed-card-set/spec.md: the full successful completion literal must be pinned on invocation Completion');
  assert.match(invocation, /> FAST-TRACK MODE ACTIVE/,
    'specs/apply-routed-card-set/spec.md: the fast-track banner must be emitted exactly once');
  assert.match(combined, /exactly once|once per run|once/i,
    'specs/apply-routed-card-set/spec.md: the banner must not repeat');
  assert.match(combined, /safe[- ]operations/i,
    'specs/apply-routed-card-set/spec.md: fast track must not bypass safe-operations confirmations');
});

test('routing STOP has one normative home on the runner Step Routing Tree', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  assert.match(runner, /Step Routing Tree/,
    'runner must own the Step Routing Tree heading');
  assert.match(runner, /RED block present[\s\S]{0,200}STOP|STOP before any dispatch/i,
    'runner must carry the RED-without-contract STOP rule');
  // Coordinator may reference the runner home but must not keep a second full five-shape tree
  // with equal STOP authority. If coordinator still mentions STOP, it must point at runner.
  if (/STOP before any dispatch/i.test(coordinator)) {
    assert.match(coordinator, /runner\.md|Step Routing Tree/i,
      'any coordinator STOP mention must reference the runner normative home');
  }
});

test('chained activation skips shell prereq/picker/fast-track parse but keeps Completion binding', () => {
  const invocation = artifact(APPLY_CARDS.invocation);
  assert.match(invocation, /Chained activation|chained segment/i,
    'invocation must document the chained activation path');
  assert.match(invocation, /(?:does not|do not|skip)[\s\S]{0,120}(?:Prerequisite|change-picker|Fast-track parse)/i,
    'chained path must skip shell prereq/picker/fast-track parse');
  assert.match(invocation, /## Completion/,
    'Completion section remains for the standalone completion action binding');
});

test('terminal_navigation is parameterized for sole/final completion vs non-final transition', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  assert.match(coordinator, /terminal_navigation/,
    'coordinator declares terminal_navigation');
  assert.match(coordinator, /non-final|parameterized/i,
    'terminal_navigation must be parameterized for non-final transition');
  assert.match(coordinator, /Implementation applied\. Run `\/sai-5-review \{name\}` in a new chat when ready\.|standalone completion/i,
    'sole/final path still binds the shell completion action');
});

// ─── specs/apply-boot-rerouting/spec.md — boot adapters ─────────────────────

test('Step 2 both boot adapters select the apply coordinator, exclude apply from utility selection, and forward the envelope byte-for-byte', () => {
  const claude = artifact('sai/adapters/claude/boot.md');
  const opencode = artifact('sai/adapters/opencode/boot.md');
  for (const boot of [claude, opencode]) {
    assert.match(boot, /@sai\/commands\/apply\/coordinator\.md/,
      'specs/apply-boot-rerouting/spec.md: apply must select the routed coordinator card');
    assert.match(boot, /@sai\/commands\/build\/coordinator\.md/,
      'specs/build-command/spec.md: build must select the routed coordinator card');
    assert.doesNotMatch(boot, /@sai\/commands\/apply\/body\.md/,
      'specs/apply-boot-rerouting/spec.md: apply must no longer select the utility body card');
    assert.doesNotMatch(boot, /Utility names[\s\S]{0,80}`build`/,
      'specs/build-command/spec.md: build must not be selected as a utility body card');
    assert.match(boot, /Routed names[\s\S]{0,200}`apply`|`apply`[\s\S]{0,80}routed/i,
      'specs/apply-boot-rerouting/spec.md: apply must join the routed name set');
    assert.doesNotMatch(boot, /Utility names[\s\S]{0,80}`apply`/,
      'specs/apply-boot-rerouting/spec.md: apply must be excluded from utility selection');
    assert.match(boot, /wrapper_echo_value/,
      'specs/apply-boot-rerouting/spec.md: the boot must forward wrapper_echo_value');
    assert.match(boot, /arguments_value/,
      'specs/apply-boot-rerouting/spec.md: the boot must forward arguments_value');
    assert.match(boot, /byte-for-byte|verbatim|unchanged|without modification/i,
      'specs/apply-boot-rerouting/spec.md: the boot must forward wrapper echo and arguments byte-for-byte');
  }
});

// ─── specs/apply-routed-card-set/spec.md + worker-matrix-collapse/spec.md ───

test('Step 2 install and doctor retire the apply body card and monolithic instruction without deleting a user-modified destination', async () => {
  const { loadInstallManifest } = require('../bin/install-manifest.js');
  const { installClaude, installOpencode } = require('../bin/install-flow.js');
  const { main } = require('../bin/doctor.js');
  const manifest = loadInstallManifest(repoRoot);

  const retiredPaths = ['commands/apply/body.md', 'commands/apply/instructions.md'];
  for (const destinationPath of retiredPaths) {
    const records = manifest.retirements.filter(record =>
      record.destination.class === 'sai' && record.destination.path === destinationPath);
    assert.equal(records.length, 1,
      `specs/apply-routed-card-set/spec.md: exactly one retirement record should cover ${destinationPath}`);
    assert.deepEqual(records[0].harnesses.sort(), ['claude', 'opencode'],
      `specs/apply-routed-card-set/spec.md: ${destinationPath} should be retired for both harnesses`);
    assert.ok(records[0].managedHashes.length > 0,
      `specs/apply-routed-card-set/spec.md: ${destinationPath} should carry managed hashes`);
  }
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'apply', 'body.md')), false,
    'specs/apply-routed-card-set/spec.md: the apply body card source must be retired from the active layout');
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'apply', 'instructions.md')), false,
    'specs/apply-routed-card-set/spec.md: the monolithic apply instruction must be retired from the active layout');

  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-apply-retire-'));
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    assert.equal(fs.existsSync(path.join(claudeBase, 'sai', 'commands', 'apply', 'body.md')), false,
      'specs/apply-routed-card-set/spec.md: install must not project the retired apply body card');
    assert.equal(fs.existsSync(path.join(claudeBase, 'sai', 'commands', 'apply', 'instructions.md')), false,
      'specs/apply-routed-card-set/spec.md: install must not project the retired apply instruction');

    const destination = path.join(claudeBase, 'sai', 'commands', 'apply', 'body.md');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, 'user-owned retired apply body copy\n');
    const before = fs.readFileSync(destination, 'utf8');

    const capture = collectOut();
    const code = await main({
      argv: ['--json'],
      projectRoot,
      claudeBase,
      opencodeBase,
      execOpenspec: execOk,
      out: capture.stream,
    });
    assert.equal(code, 0,
      'specs/apply-routed-card-set/spec.md: doctor should run cleanly beside an unrecognized retired copy');
    const section = JSON.parse(capture.text())['[Claude Code]'];
    const warnings = (section && section['retired-file']) || [];
    const warning = warnings.find(record => record.destination === destination || record.path === destination);
    assert.ok(warning,
      'specs/apply-routed-card-set/spec.md: doctor should identify the retired apply body destination');
    assert.equal(warning.recognized, false,
      'specs/apply-routed-card-set/spec.md: the user-modified copy must be unrecognized');
    assert.match(warning.recommendation, /manually/i,
      'specs/apply-routed-card-set/spec.md: doctor should recommend manual cleanup');
    assert.equal(fs.readFileSync(destination, 'utf8'), before,
      'specs/apply-routed-card-set/spec.md: the user-modified retired destination must not be deleted or changed');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('Step 2 with the apply contract files present, install and doctor derive the nine-worker roster without projection-ID collisions', async () => {
  const { loadInstallManifest, expandInstallManifest, expandRetirementManifest } = require('../bin/install-manifest.js');
  const { installClaude, installOpencode } = require('../bin/install-flow.js');
  const { main } = require('../bin/doctor.js');
  const NINE_WORKERS = [
    'sai-1-spec-proposal-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
    'sai-4-red-worker',
    'sai-4-green-worker',
  ];
  const manifest = loadInstallManifest(repoRoot);
  assert.equal(manifest['worker-matrix'].entries.length, 9,
    'specs/worker-matrix-collapse/spec.md: the manifest must declare the nine-entry worker matrix');

  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-apply-nine-roster-'));
  const claudeBase = path.join(projectRoot, 'claude');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
    installClaude(claudeBase);
    installOpencode(opencodeBase);
    for (const worker of NINE_WORKERS) {
      assert.ok(fs.existsSync(path.join(claudeBase, 'agents', `${worker}.md`)),
        `specs/worker-matrix-collapse/spec.md: claude should install ${worker} managed agent`);
    }
    for (const [harness, base] of [['claude', claudeBase], ['opencode', opencodeBase]]) {
      const roots = {
        commands: path.join(base, 'commands'),
        sai: path.join(base, 'sai'),
        skills: path.join(base, 'skills'),
        agents: path.join(base, 'agents'),
        config: base,
        root: base,
      };
      const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot: roots });
      const retired = expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot: roots });
      const retiredIds = retired.map(record => record.id);
      assert.equal(new Set(retiredIds).size, retiredIds.length,
        `specs/worker-matrix-collapse/spec.md: ${harness} retirement expansion must carry no projection-ID collision`);
      const bindings = active.filter(projection =>
        path.relative(roots.sai, projection.destinationPath).split(path.sep).join('/')
          .startsWith('orchestration/workers/bindings/'));
      assert.equal(bindings.length, 9,
        `specs/worker-matrix-collapse/spec.md: ${harness} should install nine worker bindings`);
      for (const projection of active) {
        assert.doesNotMatch(JSON.stringify([projection.id, projection.sourcePath, projection.destinationPath, projection.strategy]), /\{\{/,
          `specs/worker-matrix-collapse/spec.md: ${harness} should leave no unresolved template placeholder`);
      }
    }
    const capture = collectOut();
    const code = await main({
      argv: ['--json'],
      projectRoot,
      claudeBase,
      opencodeBase,
      execOpenspec: execOk,
      out: capture.stream,
    });
    assert.equal(code, 0,
      'specs/worker-matrix-collapse/spec.md: doctor should run cleanly with the apply contract files present');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

// ─── specs/diagnosis-driven-recovery-apply/spec.md — Step 5 RED/GREEN recovery ─

test('Step 5 a non-clean RED intermediate continues on the same RED worker before GREEN', () => {
  const runner = artifact(APPLY_CARDS.runner);
  assert.match(runner,
    /RED[\s\S]{0,260}(?:non[- ]clean|intermediate)[\s\S]{0,260}continue_after_recovery/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: a non-clean RED intermediate must enter recovery');
  assert.match(runner,
    /continue_after_recovery[\s\S]{0,220}(?:same[\s\S]{0,80}RED worker|RED worker[\s\S]{0,80}same)|(?:same[\s\S]{0,80}RED worker|RED worker[\s\S]{0,80}same)[\s\S]{0,220}continue_after_recovery/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: RED recovery must continue the same RED worker');
  assert.match(runner,
    /(?:non[- ]clean|intermediate)[\s\S]{0,300}(?:diagnos|recover|continue_after_recovery)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: the runner must diagnose the non-clean RED result');

  const validRed = runner.search(/valid RED|RED[\s\S]{0,80}(?:result|outcome)[\s\S]{0,80}valid/i);
  const greenDispatch = runner.search(/(?:dispatch|dispatches|dispatching)[\s\S]{0,60}GREEN/i);
  assert.ok(validRed >= 0 && greenDispatch >= 0 && validRed < greenDispatch,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN must not dispatch before RED is valid');
});

test('Step 5 RED recovery stays inside tests and stubs and remains blind to the implementation body', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  assert.match(red, /continue_after_recovery/,
    'specs/diagnosis-driven-recovery-apply/spec.md: RED must support same-worker recovery continuation');
  assert.match(red,
    /continue_after_recovery[\s\S]{0,260}(?:only|limited|restricted)[\s\S]{0,140}(?:test|stub)|(?:test|stub)[\s\S]{0,140}(?:only|limited|restricted)[\s\S]{0,260}continue_after_recovery/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: RED recovery may change only tests and interface stubs');
  assert.match(red, /blind(?:ness|ly|[ -]writer)?/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: RED must remain explicitly blind');
  assert.match(red,
    /(?:recovery|continue_after_recovery)[\s\S]{0,360}(?:MUST NOT|never|forbidden|prohibited)[\s\S]{0,160}(?:implementation|production|GREEN)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: RED recovery must not cross into implementation or production work');
  assert.doesNotMatch(red, /GREEN implementation body|implementation body[\s\S]{0,100}(?:provided|included|received)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: the RED prompt must not expose the GREEN implementation body');
});

test('Step 5 an unpassable RED closes with the failed blocking-contradiction STOP envelope', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const routing = `${runner}\n${coordinator}`;

  assert.match(red, /status:\s*failed/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: unpassable RED must return status: failed');
  assert.match(red, /failure_class:\s*blocking-contradiction/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: unpassable RED must classify blocking-contradiction');
  assert.match(red, /unrecoverable:\s*boolean/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: RED unrecoverable must be a boolean envelope field');
  assert.match(red, /evidence/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: RED STOP must require evidence');
  assert.match(routing,
    /RED[\s\S]{0,280}(?:failed|blocking-contradiction)[\s\S]{0,280}STOP/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: unpassable RED must route to STOP');
  assert.match(routing,
    /STOP reached\?[\s\S]{0,120}yes|STOP[\s\S]{0,120}reached\?[\s\S]{0,120}yes/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: the unpassable RED report must set STOP reached? to yes');
  assert.match(routing,
    /evidence[\s\S]{0,180}STOP|STOP[\s\S]{0,180}evidence/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: the RED STOP must be evidence-backed');
});

test('Step 5 a GREEN failed outcome has a STOP envelope while a false veto remains recovery-eligible', () => {
  const green = artifact(APPLY_CARDS.greenWorker);
  const runner = artifact(APPLY_CARDS.runner);

  assert.match(green, /status:\s*failed/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN must define the failed lifecycle envelope');
  assert.match(green, /failure_class/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN failed must carry failure classification');
  assert.match(green, /unrecoverable:\s*boolean/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN failed must carry boolean unrecoverable');
  assert.match(runner,
    /GREEN[\s\S]{0,280}(?:status:\s*failed|failed outcome|failed result)[\s\S]{0,280}STOP/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: a GREEN failed envelope must be a STOP-capable outcome');
  assert.match(runner,
    /false[- ]veto[\s\S]{0,180}(?:eligible|recovery|continue_after_recovery)|(?:eligible|recovery|continue_after_recovery)[\s\S]{0,180}false[- ]veto/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: a false veto must remain eligible for recovery');
});

test('Step 5 GREEN recovery has an absolute prohibition on test files and interfaces.md', () => {
  const green = artifact(APPLY_CARDS.greenWorker);
  assert.match(green, /continue_after_recovery/,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN recovery must use the same continuation protocol');
  assert.match(green,
    /(?:recovery|continue_after_recovery)[\s\S]{0,320}(?:MUST NOT|never|forbidden|prohibited)[\s\S]{0,160}test file/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN recovery must never create or modify tests');
  assert.match(green,
    /(?:recovery|continue_after_recovery)[\s\S]{0,320}(?:MUST NOT|never|forbidden|prohibited)[\s\S]{0,160}interfaces?\.md/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN recovery must never create or modify interfaces.md');
  assert.match(green, /(?:absolute|without exception|under no circumstances|no exceptions|ever)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: the GREEN test/interface prohibition must be absolute');
});

test('Step 5 a GREEN result of fail is reported with STOP reached? yes', () => {
  const green = artifact(APPLY_CARDS.greenWorker);
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${green}\n${runner}\n${coordinator}`;

  assert.match(combined, /GREEN result\s*[:=]\s*fail/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN must expose result: fail');
  assert.match(combined,
    /GREEN result\s*[:=]\s*fail[\s\S]{0,220}STOP|STOP[\s\S]{0,220}GREEN result\s*[:=]\s*fail/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN result fail must stop the step');
  assert.match(combined,
    /STOP reached\?[\s\S]{0,120}yes|STOP[\s\S]{0,120}reached\?[\s\S]{0,120}yes/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN result fail must report STOP reached? yes');
});

test('Step 5 split-flow GREEN is gated exclusively on a valid RED result', () => {
  const runner = artifact(APPLY_CARDS.runner);
  assert.match(runner, /split[- ]flow/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: the RED/GREEN route must be identified as split-flow');
  assert.match(runner,
    /valid RED[\s\S]{0,240}(?:only|before|then)[\s\S]{0,180}GREEN|GREEN[\s\S]{0,240}(?:only after|after|gated on)[\s\S]{0,180}valid RED/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: split-flow GREEN must run only after valid RED');
  assert.match(runner,
    /(?:passes|wrong[- ]failure|non[- ]clean)[\s\S]{0,220}(?:must not|never|do not|cannot)[\s\S]{0,140}GREEN|GREEN[\s\S]{0,220}(?:must not|never|do not|cannot)[\s\S]{0,140}(?:passes|wrong[- ]failure|non[- ]clean)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: non-valid RED outcomes must not unlock GREEN');
});

test('Step 5 neither worker edits implementation.md or runs git', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  for (const [name, worker] of [['RED', red], ['GREEN', green]]) {
    assert.match(worker,
      /(?:MUST NOT|never|forbidden|prohibited)[\s\S]{0,80}(?:edit|modify|mark)[\s\S]{0,80}implementation\.md|implementation\.md[\s\S]{0,80}(?:MUST NOT|never|forbidden|prohibited)/i,
      `specs/diagnosis-driven-recovery-apply/spec.md: ${name} must never edit implementation.md`);
    assert.match(worker,
      /(?:MUST NOT|never|forbidden|prohibited)[\s\S]{0,80}(?:run|execute|invoke)?[\s\S]{0,40}git|git[\s\S]{0,100}(?:MUST NOT|never|forbidden|prohibited)/i,
      `specs/diagnosis-driven-recovery-apply/spec.md: ${name} must never run git`);
  }
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

const APPLY_CARDS = {
  coordinator: 'sai/commands/apply/coordinator.md',
  redWorker: 'sai/commands/apply/red-worker.md',
  greenWorker: 'sai/commands/apply/green-worker.md',
  runner: 'sai/commands/apply/runner.md',
  workerCommon: 'sai/commands/apply/worker-common.md',
  policy: 'sai/policies/bounded-recovery.md',
  recovery: 'sai/commands/apply/steps/recovery.md',
  exhausted: 'sai/commands/apply/steps/exhausted-step.md',
  veto: 'sai/commands/apply/steps/veto-override.md',
};

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}


test('Step 4 the routed apply cards preserve the scope and scratch contract', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  const common = artifact(APPLY_CARDS.workerCommon);

  assert.match(red, /Tests and interface stubs the plan authorizes for this Step\. Production files are outside them\./,
    'specs/apply-test-impl-split/spec.md: RED writes only tests and stubs');
  assert.match(green, /Production files the plan authorizes for this Step\. Test files and declared interfaces \(`interfaces\.md`\) are outside them\./,
    'specs/apply-test-impl-split/spec.md: GREEN writes only production files');
  assert.match(common, /Your scratch path is `\.tmp\/\{change-name\}\/`\. It is outside your allowed files\./,
    'specs/apply-coordinator-verification/spec.md: the scratch path is declared and excluded from allowed files');
  assert.match(common, /Create temporary files only below it\. Before a clean return you MAY remove its contents and the directory; after a STOP or failure nothing needs preserving/,
    'specs/apply-coordinator-verification/spec.md: scratch creation and removal rules');
  assert.match(common, /Leave the `\.tmp\/` parent in place\./,
    'specs/apply-coordinator-verification/spec.md: the scratch parent stays');
  assert.match(common, /Field 8 lists no scratch path\./,
    'specs/apply-coordinator-verification/spec.md: field 8 excludes scratch');
  assert.match(common, /Always present: an empty list is valid, a missing field makes the report malformed\./,
    'specs/apply-subagent-report-contract/spec.md: the field-8 rule');
});

test('Step 4 the coordinator surface sweeps scratch after every dispatch and verifies through one call', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;

  assert.match(combined, /every dispatch|each dispatch|once per dispatch/i,
    'specs/apply-coordinator-verification/spec.md: every dispatch return must trigger a sweep');
  assert.match(combined, /continuation/i,
    'specs/apply-coordinator-verification/spec.md: every continuation return must trigger a sweep');
  assert.match(coordinator, /sweep scratch and verify with one `apply-step\.js verify` call/,
    'specs/apply-coordinator-verification/spec.md: the sweep and the checks are one call');
  assert.match(coordinator, /Add `--parent-was-absent` when `\.tmp\/` did not exist before the Step's first dispatch/,
    'the call form keeps its parent flag');
  assert.match(coordinator, /Print each `sweep\.lines` entry\./,
    'the tool-generated sweep lines are printed');
  for (const outcome of ['clean', 'STOP', 'failure', 'crash']) {
    assert.match(combined, new RegExp(`${outcome}[\\s\\S]{0,260}sweep|sweep[\\s\\S]{0,260}${outcome}`, 'i'),
      `specs/apply-coordinator-verification/spec.md: ${outcome} returns must trigger a scratch sweep`);
  }
});

test('Step 4 the cleanup line forms are tool-generated and tested at the tool, not restated in the cards', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const toolTest = fs.readFileSync(path.join(repoRoot, 'test/apply-step-tool.test.js'), 'utf8');

  assert.doesNotMatch(`${coordinator}\n${runner}`, /> Scratch cleanup: removed/,
    'the cards do not restate the line forms the tool returns');
  assert.match(toolTest, /> Scratch cleanup: removed \.tmp\/demo\/, \.tmp\//,
    'test/apply-step-tool.test.js pins the returned cleanup line');
});

test('Step 4 swept scratch stays out of the union and add-list without broadening recovery or human intervention', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(coordinator, /Swept paths stay out of the changed-files union and the field-8 add-list\./,
    'specs/apply-coordinator-verification/spec.md: removed paths stay out of observed changes');
  assert.match(combined, /The sweep never widens recovery eligibility or authorizes removing any other path;/,
    'specs/apply-coordinator-verification/spec.md: cleanup must not broaden recovery eligibility');
  assert.match(combined, /out-of-scope[\s\S]{0,260}(?:recovery|human intervention)|(?:recovery|human intervention)[\s\S]{0,260}out-of-scope/i,
    'specs/apply-coordinator-verification/spec.md: unrelated out-of-scope paths must keep their existing handling');
});

test('Step 4 scratch is excluded from the changed-files union and the field-8 add-list', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(coordinator, /Swept paths stay out of the changed-files union and the field-8 add-list/,
    'specs/apply-coordinator-ownership/spec.md: swept scratch paths must be excluded from observed changes');
  assert.match(combined, /union|changed[- ]?files/i,
    'specs/apply-coordinator-ownership/spec.md: the changed-files union must be the comparison surface');
  assert.match(combined, /field 8|Files modified/i,
    'specs/apply-coordinator-ownership/spec.md: the add-list must exclude scratch');
  assert.match(combined, /pre[- ]commit/i,
    'specs/apply-coordinator-ownership/spec.md: the union must supply pre-commit reporting');
});

test('Step 4 a completed GREEN disproven by coordinator verification is classified validation-failed before Known-False recovery', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;

  assert.match(combined, /validation[- ]failed/,
    'specs/apply-coordinator-verification/spec.md: the coordinator must classify the disproven GREEN as validation-failed');
  assert.match(combined, /before[\s\S]{0,140}continue_after_recovery|continue_after_recovery[\s\S]{0,140}only after|first[\s\S]{0,80}classif/i,
    'specs/apply-coordinator-verification/spec.md: classification must precede the recovery continuation');
  assert.match(combined, /coordinator[\s\S]{0,80}verification[\s\S]{0,120}authoritative|authoritative[\s\S]{0,120}coordinator/i,
    'specs/apply-coordinator-verification/spec.md: coordinator verification must be authoritative');
  assert.match(combined, /checklist|verification checklist/i,
    'specs/apply-coordinator-verification/spec.md: the coordinator must own a Verification Checklist');
});

test('Step 4 in-scope RED and GREEN recovery continues the same worker with continue_after_recovery', () => {
  const recovery = artifact(APPLY_CARDS.recovery);
  const policy = artifact(APPLY_CARDS.policy);
  const green = artifact(APPLY_CARDS.greenWorker);

  assert.match(recovery, /continues the owning worker with `continue_after_recovery`/,
    'recovery.md: an eligible diagnosis continues the owning worker with the recovery continuation');
  assert.match(policy, /Resume the target worker with exactly `continue_after_recovery`/,
    'bounded-recovery.md owns the same-worker continuation');
  assert.match(policy, /Recovery never dispatches a replacement worker/,
    'bounded-recovery.md owns the no-replacement rule');
  assert.match(green, /continue_after_recovery/,
    'GREEN must consume the recovery continuation');
});

test('Step 4 Known-False recovery branches by Cause Locus and scopes the recovery ledger to the Step', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const policy = artifact(APPLY_CARDS.policy);
  const recovery = coordinator.slice(coordinator.indexOf('## Known-False Report Recovery'));
  const steps = artifact(APPLY_CARDS.recovery);

  assert.match(recovery, /`@sai\/policies\/bounded-recovery\.md` owns diagnosis, Cause Locus, diagnosis key, and eligibility/,
    'the shared machinery must be delegated to the bounded-recovery policy, not restated');
  for (const locus of ['`in-scope`', '`owner-in-run`', '`out-of-scope`', '`unresolved`']) {
    assert.ok(policy.includes(locus), `bounded-recovery.md must define the ${locus} Cause Locus`);
  }
  assert.match(recovery, /recovery scope is the Step: on Step entry send `\{kind: step-entry, step: "Step N"\}` to `recovery-ledger@1`, never a bare `reset`/,
    'the ledger scope is the Step, granted by the step-entry signal');
  assert.match(recovery, /A re-entered Step keeps what it already spent\./,
    'a re-entered Step must not draw a fresh ledger');
  assert.match(steps, /blocks Automated checkbox marking, commit, and Step advance/,
    'a hand-back or exhaustion must block checkbox marking, commit, and advance');
  assert.doesNotMatch(coordinator, /not reset per Step|segment-scoped recovery pool/,
    'no stale segment-scoped ledger wording may remain');
});

test('Step 4 recovery carries exactly the ordered five-field diagnosis without exposing worker output', () => {
  const recovery = artifact(APPLY_CARDS.recovery);
  const positions = ['Reported', 'Evidence', 'Cause', 'Correction', 'Verification']
    .map(field => recovery.indexOf('`' + field + '`'));

  for (const position of positions) assert.ok(position >= 0, 'recovery field should exist');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions,
    'recovery fields must remain in the required order');
  assert.match(recovery, /no raw output or artifact contents/,
    'no raw output may enter the recovery prompt');
  assert.match(recovery, /RED stays blind to the GREEN body/,
    'recovery must preserve the blindness restriction');
});

test('Step 4 out-of-scope recovery makes zero attempts and permits at most one current-Step plan-artifact repair', () => {
  const recovery = artifact(APPLY_CARDS.recovery);

  assert.match(recovery, /`out-of-scope` cause spends zero worker attempts/,
    'out-of-scope recovery must take zero worker attempts');
  assert.match(recovery, /exact current-Step verification assertion in `implementation\.md`[\s\S]{0,200}repair that one assertion/,
    'plan-artifact repair must be limited to the current Step assertion in implementation.md');
});

test('Step 4 Coverage Signature is one invariant sentence in one place', () => {
  const recovery = artifact(APPLY_CARDS.recovery);
  const others = [APPLY_CARDS.coordinator, APPLY_CARDS.runner, APPLY_CARDS.exhausted].map(artifact).join('\n');

  assert.equal((recovery.match(/\*\*Coverage Signature\.\*\*/g) || []).length, 1,
    'the Coverage Signature is defined once');
  assert.match(recovery, /exactly one producer reference changes, from the impossible later-Step point to an existing current-Step point/,
    'the invariant names the only permitted change');
  assert.match(recovery, /Nothing is deleted, disabled, broadened, or loosened/,
    'the invariant forbids weakening');
  assert.doesNotMatch(recovery, /pass_observation|assertion_operator|seven-field/,
    'no field-by-field comparison procedure remains');
  assert.doesNotMatch(others, /Coverage Signature/,
    'no other apply card restates the Coverage Signature');
});

test('Step 4 duplicate diagnosis is terminal before exhaustion and the unresolved diagnosis has no Cause Locus', () => {
  const recovery = artifact(APPLY_CARDS.recovery);
  const policy = artifact(APPLY_CARDS.policy);
  const ledger = fs.readFileSync(path.join(repoRoot, 'sai-state/machines/recovery-ledger.js'), 'utf8');

  assert.match(recovery, /`rejected: duplicate diagnosis`/,
    'recovery.md names the duplicate answer the ledger owns');
  assert.match(ledger, /result\.rejected = 'duplicate diagnosis'/,
    'the ledger machine enforces duplicate rejection');
  assert.match(ledger, /result\.rejected = 'unresolved cause'/,
    'the ledger machine enforces key-less rejection');
  assert.match(policy, /duplicates are\s+rejected before dispatch/,
    'bounded-recovery.md: a duplicate worker diagnosis is rejected before dispatch');
  assert.match(policy, /`unresolved` — the evidence cannot establish a concrete point/,
    'bounded-recovery.md: unresolved carries no concrete locus claim');
});

test('Step 4 a repair beyond the exhausted coordinator budget hands back to a human', () => {
  const recovery = artifact(APPLY_CARDS.recovery);

  assert.match(recovery, /or a repair past the coordinator budget, stops the run for a human/,
    'a repair beyond the coordinator budget must stop for a human');
});

test('Step 4 recovery uses recovery_policy true and independently verifies a plan-artifact repair', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const recovery = artifact(APPLY_CARDS.recovery);

  assert.match(`${coordinator}\n${runner}`, /recovery_policy\s*[:=]\s*true/,
    'recovery continuation must set recovery_policy true');
  assert.match(recovery, /never runs verification as part of its write/,
    'plan-artifact repair must not execute verification as part of its write');
  assert.match(recovery, /independent verification stays mandatory/,
    'verification must be independent after plan-artifact repair');
});

test('Step 4 the worker contracts never receive coordinator-only recovery evidence', () => {
  const combined = [APPLY_CARDS.redWorker, APPLY_CARDS.greenWorker, APPLY_CARDS.workerCommon].map(artifact).join('\n');

  assert.doesNotMatch(combined, /include.*(?:pre-dispatch )?baseline/i,
    'specs/apply-coordinator-verification/spec.md: workers must not receive the pre-dispatch baseline');
  assert.doesNotMatch(combined, /include.*allowed-file set/i,
    'specs/apply-coordinator-verification/spec.md: workers must not receive the coordinator allowed-file set');
  assert.doesNotMatch(combined, /per-report recovery assessment/i,
    'specs/apply-coordinator-verification/spec.md: workers must not receive the per-report recovery assessment');
  assert.match(combined, /no raw output/i,
    'specs/apply-coordinator-verification/spec.md: the no-raw-output restriction must remain');
  assert.match(combined, /forbidden/i,
    'specs/apply-test-impl-split/spec.md: the worker prohibitions must remain');
});

test('Step 4 report field 8 omission is malformed while an explicit empty list is valid and field 9 is retired', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${runner}\n${coordinator}`;

  const message = 'Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing.';
  const escapedMessage = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.equal((combined.match(new RegExp(escapedMessage, 'g')) || []).length, 1,
    'specs/apply-subagent-report-contract/spec.md: the malformed-report message must be emitted exactly once');
  assert.match(combined, /A report without field 8 is malformed\./,
    'specs/apply-subagent-report-contract/spec.md: an omitted field 8 is malformed');
  assert.match(artifact(APPLY_CARDS.workerCommon), /an empty list is valid, a missing field makes the report malformed/,
    'specs/apply-subagent-report-contract/spec.md: an explicit empty list must remain valid');
  assert.doesNotMatch(`${combined}\n${artifact(APPLY_CARDS.workerCommon)}`, /field 9|Attempts per phase/i,
    'field 9 (Attempts per phase) is retired from the apply report contract');
  assert.match(combined, /scratch[\s\S]{0,120}field 8|field 8[\s\S]{0,120}scratch/i,
    'specs/apply-subagent-report-contract/spec.md: scratch must never appear in field 8');
});

test('Step 4 the telemetry row shape is retired from the apply cards', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${runner}\n${coordinator}`;
  assert.doesNotMatch(combined, /\| Step \| dispatch \| phase \| attempts \| first_failure \| note \|/,
    'the telemetry table must carry no fixed columns any more');
  assert.doesNotMatch(combined, /first_failure/, 'the first_failure column is retired');
});

function activeTerminalLifecycle() {
  return artifact('sai/commands/apply/steps/terminal-lifecycle.md');
}

function terminalDocs() {
  const section = activeTerminalLifecycle();
  const start = section.indexOf('## 4. Terminal documentation commit');
  const end = section.indexOf('## 5. Print and stop');
  assert.ok(start >= 0 && end > start, 'the terminal documentation commit section must exist');
  return section.slice(start, end);
}

test('Step 2 terminal no-op and decline paths do not create or retry a documentation commit', () => {
  const docs = terminalDocs();
  const rules = artifact('sai/policies/commit-rules.md');
  assert.match(docs, /When the set is empty, skip the rest of this section: no message, no question\./);
  assert.match(docs, /Ask through commit-rules § Authorization gate/);
  assert.match(rules, /An off-option reply or silence is not a decline: re-present the same ask unchanged/);
  assert.match(rules, /`no` declines: execute nothing/);
  assert.match(docs, /On `no`, leave the files in the working tree, say what remains uncommitted, and continue without retrying\./);
});

test('Step 2 terminal preview precedes message and authorization and remains non-mutating', () => {
  const docs = terminalDocs();
  const visibility = docs.indexOf('**Visibility listing.**');
  const message = docs.indexOf('**Message.**');
  const authorization = docs.indexOf('**Authorization.**');
  assert.ok(visibility >= 0 && message > visibility && authorization > message,
    'visibility must precede the proposed message and authorization');
  assert.match(docs, /The listing never touches the index/);
});

test('Step 2 active session authorization and fast-track skip only the terminal ask', () => {
  const docs = terminalDocs();
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const rules = artifact('sai/policies/commit-rules.md');
  assert.match(docs, /an active `session_commit_authorized` skips only the ask/);
  assert.match(coordinator, /At apply segment entry,[\s\S]{0,300}set `session_commit_authorized=true` if and only if fast-track is active/);
  assert.match(coordinator, /An active flag skips only the authorization ask: the visibility report and proposed message still print before every commit/);
  assert.match(rules, /options `yes \(Recommended\)` \/ `no` \/ `Allow on this session`/);
  assert.match(rules, /`Allow on this session` authorizes this commit and activates the session grant/);
});

test('Step 2 terminal documentation preserves the pre-Final-sweep halt and field-8 boundaries', () => {
  const section = activeTerminalLifecycle();
  const docs = terminalDocs();
  assert.match(section, /A run that stops for a human before this point runs none of it\./);
  assert.match(docs, /the changed-files union, per-Step add-lists, and unrelated paths are outside the set/);
  assert.match(docs, /uses no Step number, report, or plan cross-check/);
  assert.match(docs, /Never resolve it from `openspec\/changes\/\{change-name\}\/`/);
});

function unblockLadder() {
  return artifact(APPLY_CARDS.recovery);
}

test('Step 4 the recovery rungs traverse autonomously and leave budgets to the ledger', () => {
  const recovery = unblockLadder();
  assert.match(recovery, /Traverse the rungs autonomously: route rather than write, and never ask the user which rung to take\./,
    'the rungs must be traversed without a per-incident user prompt');
  assert.match(recovery, /`recovery-ledger@1` owns the budgets, their grant on the Step's first entry/,
    'the budgets are owned by the ledger, with no figures restated in the recovery step');
  assert.match(recovery, /A delegated dispatch spends a coordinator attempt exactly as a self-edit does/,
    'delegating must consume a coordinator attempt exactly as a self-edit does');
  assert.match(recovery, /When no worker-safe path remains and the cause is test scaffolding that lives outside test files/,
    'self-edit must wait until no worker-safe correction exists');
});

test('Step 4 the coordinator never writes a test file and routes test causes to their owner', () => {
  const recovery = unblockLadder();
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const policy = artifact(APPLY_CARDS.policy);
  assert.match(coordinator, /a test, assertion, or expected value you would write goes to the RED worker instead/,
    'the write boundary pairs the test-file limit with its alternative');
  assert.match(recovery, /Never write an assertion body, an expected value, production semantics, or a test file\./,
    'scaffolding repair never writes a test file');
  assert.match(recovery, /when the Step had no RED dispatch \(GREEN-only\) and the cause is in a test, dispatch a fresh RED worker/,
    'a GREEN-only Step with a test cause must dispatch a fresh RED');
  assert.match(recovery, /a cause in a test file goes to its RED owner and never to GREEN/,
    'a test cause must never be routed to GREEN');
  assert.match(policy, /A cause located in a test file is therefore `owner-in-run`/,
    'bounded-recovery.md owns the test-cause routing');
  assert.match(recovery, /A cause inside a test file the RED worker may not write has no coordinator path: stop and ask the user\./,
    'an unwritable test cause stops for the user');
  assert.doesNotMatch(recovery, /returns unpassable or `unrecoverable`/,
    'the infra-fix rule has no unrecoverable trigger');
});

test('Step 4 budget exhaustion hands to the exhausted-Step choice and keeps the enumerated stopping reasons', () => {
  const recovery = unblockLadder();
  const coordinator = artifact(APPLY_CARDS.coordinator);
  assert.match(coordinator, /A `recovery-ledger@1` response that reports a budget `exhausted`: Fetch @sai\/commands\/apply\/steps\/exhausted-step\.md/,
    'an exhausted budget must load the exhausted-Step choice');
  for (const reason of [/weakening or deleting an assertion/i, /redefining the agreed contract/i, /safe-operations/i, /a true veto/i, /pre-existing failure outside the change's radius/i]) {
    assert.match(recovery, reason, 'the enumerated stopping reasons must stay complete');
  }
  assert.match(recovery, /Nothing else interrupts an unattended run\./,
    'no other condition may stop the run for a user');
  assert.match(recovery, /Remaining budget never authorizes a forbidden correction/,
    'remaining budget authorizes nothing forbidden');
});

test('Step 4 exhausted budgets offer one explicit whole-Step retry choice with no fast-track grant', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const policy = artifact(APPLY_CARDS.policy);
  const choice = artifact(APPLY_CARDS.exhausted);
  const grantContract = policy.slice(policy.indexOf('### Apply-only authorized Step retry'));

  assert.match(coordinator, /Fetch @sai\/policies\/question-context\.md and follow it for the exhausted-budget choice/);
  assert.match(choice, /native picker/);
  assert.match(choice, /Question: `How do you want to proceed with Step N\?`/);
  assert.match(choice, /`Authorize one fresh attempt` \(`authorize-step-retry`\); `I will correct it manually` \(`manual-correction`\)/);
  assert.match(choice, /a free-text reply that picks no option authorizes nothing: show the same picker again, unchanged/);
  assert.match(choice, /Never auto-select either option under `--fast-track`/);
  assert.match(choice, /fresh whole-Step budget/);
  assert.match(choice, /re-read the current `implementation\.md` Step contract and verification scope/);
  assert.match(choice, /new no-commit-guard window with a fresh snapshot/);
  assert.match(choice, /Take both tallies, the exhausted budget, and all prior cycles from the ledger response/);
  assert.match(choice, /report the retained history and the new cycle/);
  assert.match(choice, /When either fresh budget is exhausted again, ask for a new explicit decision; never chain a grant/);
  assert.match(choice, /defines in plain words each term it uses/);
  assert.doesNotMatch(choice, /Can't you fix it|## Terminology|`Terminology` section/,
    'the fixed definitions and example phrases are removed');

  assert.match(grantContract, /`\{kind: authorized-step-retry, step: "Step N", authorized: true\}`/);
  assert.match(grantContract, /A new attempt is one new\s+invocation of the whole blocked Step with fresh worker and coordinator budgets/);
  assert.match(grantContract, /Explicit authorization\*\* means\s+the user's selection of the retry option or an unequivocal order/);
  assert.match(grantContract, /archives the exhausted cycle/);
  assert.match(grantContract, /clears both active ledgers and counters together/);
  assert.match(grantContract, /cannot override an `unrecoverable: true`\s+veto/);
});

test('Step 4 a re-entered Step keeps its spent budgets and duplicate coordinator diagnoses cost zero', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const recovery = unblockLadder();
  const policy = artifact(APPLY_CARDS.policy);
  assert.match(coordinator, /`\{kind: step-entry, step: "Step N"\}` to `recovery-ledger@1`, never a bare `reset`/,
    'the Step budget must be granted by the Step-guarded step-entry signal, never the bare reset');
  assert.match(policy, /only on the first entry to that Step in the\s+run; a Step re-entered after a correction or a route retry keeps what it has\s+spent/,
    'bounded-recovery.md owns the first-entry grant');
  assert.match(recovery, /`\{kind: coordinator-attempt, key: \[artifact path, concrete point, authorized correction boundary\]\}`/,
    'a coordinator attempt must carry a concrete diagnosis key');
  assert.match(recovery, /A rejected key spends nothing and hands back the existing diagnosis/,
    'a rejected coordinator key must spend zero attempts');
});

test('Step 4 exhaustion is read from the ledger and the autonomous-correction trace exists and prints at run close', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const recovery = unblockLadder();
  const policy = artifact(APPLY_CARDS.policy);
  assert.match(policy, /`budgets` as `\{worker: \{spent, limit\}, coordinator: \{spent, limit\}\}`/,
    'every ledger outcome must report what each budget spent');
  assert.match(policy, /names the budget that ran out as `exhausted`/,
    'an exhaustion must name the budget that ran out');
  assert.match(recovery, /Read every tally from its response; when the ledger gives none, count nothing from memory, run no recovery attempt, and stop the Step/,
    'a missing ledger response runs no recovery attempt');
  assert.match(recovery, /> Autonomous correction: Step <N> \| <rung> \| key <path> :: <point> :: <boundary> \| <budget> <ordinal> of 3 \| <outcome>/,
    'the trace line format lives in recovery.md');
  assert.doesNotMatch(coordinator, /> Autonomous correction: Step/,
    'the card holds only the print-at-close rule and the empty literal');
  assert.match(coordinator, /in Execution details at run close however the run ends, or `> Autonomous corrections: none`\. The trace is conversation text only\./,
    'the trace must be reported at run close, empty or not');
  assert.equal((coordinator.match(/> Autonomous corrections: none/g) || []).length, 1,
    'the empty-trace literal appears once');
});

test('Step 4 the card discloses recovery behind two failure-triggered pointers and keeps the write boundary once', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const section = coordinator.slice(coordinator.indexOf('## Known-False Report Recovery'));

  assert.match(section, /A failed `apply-step\.js verify`, a worker result that is `failed` or carries a STOP, or a `completed` report your evidence disproves: Fetch @sai\/commands\/apply\/steps\/recovery\.md before any recovery attempt\./,
    'the recovery pointer names its condition');
  assert.match(section, /A `recovery-ledger@1` response that reports a budget `exhausted`: Fetch @sai\/commands\/apply\/steps\/exhausted-step\.md\./,
    'the exhausted-Step pointer names its condition');
  assert.equal((coordinator.match(/\*\*Write boundary\.\*\*/g) || []).length, 1,
    'the coordinator write boundary is stated once');
  assert.doesNotMatch(coordinator, /Unblock ladder|Plan-artifact repair\.\*\*|Last-resort infra fix|Exhausted-Step choice\.\*\*/,
    'the failure-only sections no longer sit in the card');
});

test('Step 4 each failure-only rule lives in exactly one apply file', () => {
  const files = [APPLY_CARDS.coordinator, APPLY_CARDS.runner, APPLY_CARDS.recovery, APPLY_CARDS.exhausted, APPLY_CARDS.veto].map(artifact);
  const count = (pattern) => files.reduce((total, text) => total + (text.match(pattern) || []).length, 0);

  assert.equal(count(/Authorize one fresh attempt/g), 1, 'the exhausted-Step picker options appear once');
  assert.equal(count(/`\{kind: coordinator-attempt, key:/g), 1, 'the coordinator-attempt signal appears once');
  assert.equal(count(/Nothing else interrupts an unattended run/g), 1, 'the stopping list appears once');
  assert.equal(count(/never runs verification as part of its write/g), 1, 'the repair verification rule appears once');
  assert.equal(count(/\{kind: veto, step:/g), 1, 'the veto flow stays in veto-override.md only');
  assert.equal(count(/blocks? (?:Automated )?checkbox marking, commit,? and (?:Step )?advance/g), 1, 'the checkbox/commit/advance block is stated once');
  assert.equal(count(/stop and ask the user/g), 1, 'the unwritable test-cause stop is stated once');
  assert.equal(count(/never to GREEN/g), 1, 'test-cause routing is stated once outside the policy');
  assert.doesNotMatch(artifact(APPLY_CARDS.recovery), /three worker slots|three coordinator attempts/, 'budget figures stay with the ledger');
});

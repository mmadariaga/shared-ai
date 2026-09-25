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
};

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function recoverySection(combined) {
  const start = combined.search(/### Known-False Report Recovery|## Recovery|Recovery Dispatch|recovery continuation|Bounded Recovery/i);
  assert.ok(start >= 0, 'the apply coordinator surface should define bounded report recovery');
  return combined.slice(start);
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

test('Step 4 the coordinator surface sweeps scratch after every dispatch and checklist run before comparison', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;

  assert.match(combined, /Sweep\*\* exactly `\.tmp\/\{change-name\}\/`/,
    'specs/apply-coordinator-verification/spec.md: the coordinator must sweep exactly the per-change scratch path');
  assert.match(combined, /every dispatch|each dispatch|once per dispatch/i,
    'specs/apply-coordinator-verification/spec.md: every dispatch return must trigger a sweep');
  assert.match(combined, /continuation/i,
    'specs/apply-coordinator-verification/spec.md: every continuation return must trigger a sweep');
  assert.match(combined, /after each coordinator-owned run of the Step's Verification Checklist|Verification Checklist[\s\S]{0,300}sweep/i,
    'specs/apply-coordinator-verification/spec.md: every coordinator checklist run must be followed by a sweep');
  assert.match(combined, /before[\s\S]{0,80}(?:comparison|redispatch)|comparison[\s\S]{0,80}(?:sweep|exclude)|sweep[\s\S]{0,80}before[\s\S]{0,80}(?:comparison|redispatch)/i,
    'specs/apply-coordinator-verification/spec.md: the sweep must precede comparison or redispatch');
  for (const outcome of ['clean', 'STOP', 'failure', 'crash']) {
    assert.match(combined, new RegExp(`${outcome}[\\s\\S]{0,260}sweep|sweep[\\s\\S]{0,260}${outcome}`, 'i'),
      `specs/apply-coordinator-verification/spec.md: ${outcome} returns must trigger a scratch sweep`);
  }
});

test('Step 4 scratch cleanup has the exact pinned trace lines and no empty-sweep trace', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  // Exact non-empty trace forms are sole-homed on the coordinator.
  assert.match(coordinator, /> Scratch cleanup: removed \.tmp\/\{change-name\}\//,
    'specs/apply-coordinator-verification/spec.md: the per-change trace line must be pinned on the coordinator');
  assert.match(coordinator, /> Scratch cleanup: removed \.tmp\/\{change-name\}\/,[ \t]*\.tmp\//,
    'specs/apply-coordinator-verification/spec.md: the parent trace line must end with ", .tmp/" on the coordinator');
  assert.doesNotMatch(runner, /> Scratch cleanup: removed \.tmp\/\{change-name\}\//,
    'specs/apply-coordinator-verification/spec.md: runner must not equal-authority restate the exact per-change trace');
  assert.match(coordinator, /An empty sweep prints nothing\./,
    'specs/apply-coordinator-verification/spec.md: an empty sweep must emit no trace line');
});

test('Step 4 scratch cleanup stays ordered before comparison without broadening recovery or human intervention', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /Swept paths are excluded from changed paths, the plan cross-check, the `Subagent ↔ git` comparison/,
    'specs/apply-coordinator-verification/spec.md: the ordered sweep must exclude removed paths from comparison');
  assert.match(combined, /The sweep never widens recovery eligibility or authorizes removing any other path;/,
    'specs/apply-coordinator-verification/spec.md: cleanup must not broaden recovery eligibility');
  assert.match(combined, /out-of-scope[\s\S]{0,260}(?:recovery|human intervention)|(?:recovery|human intervention)[\s\S]{0,260}out-of-scope/i,
    'specs/apply-coordinator-verification/spec.md: unrelated out-of-scope paths must keep their existing handling');
});

test('Step 4 scratch is excluded from the changed-files union, field-8 add-list, and pre-commit reporting', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /Swept paths are excluded from changed paths[\s\S]{0,160}the field-8 add-list, and line totals/,
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
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const green = artifact(APPLY_CARDS.greenWorker);
  const combined = `${coordinator}\n${green}`;
  const recovery = recoverySection(combined);

  assert.match(recovery, /in[- ]scope[\s\S]{0,360}continue_after_recovery|continue_after_recovery[\s\S]{0,360}in[- ]scope/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: in-scope recovery must use the recovery continuation');
  assert.match(green, /continue_after_recovery/,
    'specs/diagnosis-driven-recovery-apply/spec.md: GREEN must consume the recovery continuation');
  assert.match(recovery, /same[- ]worker|same worker/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: in-scope recovery must remain on the same worker');
  assert.match(recovery, /(?:never|must not|not)[\s\S]{0,160}(?:fresh|replacement|new) worker/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: recovery must never open a fresh worker');
});

test('Step 4 Known-False recovery branches by Cause Locus and scopes the recovery ledger to the Step', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const policy = artifact(APPLY_CARDS.policy);
  const recovery = coordinator.slice(coordinator.indexOf('## Known-False Report Recovery'));

  assert.match(recovery, /Known-False Report Recovery/,
    'specs/apply-coordinator-verification/spec.md: recovery must define the Known-False branch');
  assert.match(recovery, /follow `@sai\/policies\/bounded-recovery\.md`: diagnosis, Cause Locus, diagnosis key, ledger/,
    'the shared machinery must be delegated to the bounded-recovery policy, not restated');
  for (const locus of ['`in-scope`', '`owner-in-run`', '`out-of-scope`', '`unresolved`']) {
    assert.ok(policy.includes(locus), `bounded-recovery.md must define the ${locus} Cause Locus`);
  }
  assert.match(recovery, /recovery scope is the Step: on Step entry send `\{kind: step-entry, step: "Step N"\}` to `recovery-ledger@1`, never a bare `reset`/,
    'specs/apply-coordinator-verification/spec.md: the ledger scope is the Step, granted by the step-entry signal');
  assert.match(recovery, /A re-entered Step keeps what it already spent\./,
    'a re-entered Step must not draw a fresh ledger');
  assert.match(recovery, /Exhaustion, or any hand-back, blocks Automated checkbox marking, commit, and Step advance/,
    'exhaustion must block checkbox marking, commit, and advance');
  assert.doesNotMatch(coordinator, /not reset per Step|segment-scoped recovery pool/,
    'no stale segment-scoped ledger wording may remain');
});

test('Step 4 recovery appends exactly the ordered five-heading diagnosis without exposing worker output', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const recovery = coordinator.slice(coordinator.indexOf('## Known-False Report Recovery'));
  const positions = ['Reported', 'Evidence', 'Cause', 'Correction', 'Verification']
    .map(heading => recovery.indexOf(`#### ${heading}`));

  for (const position of positions) assert.ok(position >= 0, 'recovery heading should exist');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions,
    'specs/apply-coordinator-verification/spec.md: recovery headings must remain in the required order');
  assert.match(recovery, /same worker/i,
    'in-scope diagnosis must target the same worker session');
  assert.match(recovery, /no raw output or artifact contents/,
    'specs/apply-coordinator-verification/spec.md: no raw output may enter the recovery prompt');
  assert.match(recovery, /RED stays blind to the GREEN body/,
    'specs/apply-test-impl-split/spec.md: recovery must preserve the blindness restriction');
});

test('Step 4 out-of-scope recovery makes zero attempts and permits at most one current-Step plan-artifact repair', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  const recovery = recoverySection(combined);

  assert.match(recovery, /out[- ]of[- ]scope[\s\S]{0,420}(?:zero|0)[\s\S]{0,100}attempt/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: out-of-scope recovery must take zero worker attempts');
  assert.match(recovery, /(?:optional[\s\S]{0,260}(?:at most one|one)[\s\S]{0,320}(?:current[- ]Step|implementation\.md|plan[- ]artifact)|(?:at most one|one)[\s\S]{0,320}(?:optional|current[- ]Step|implementation\.md|plan[- ]artifact))/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: only an optional at-most-one plan-artifact repair is allowed');
  assert.match(recovery, /current[- ]Step[\s\S]{0,360}implementation\.md|implementation\.md[\s\S]{0,360}current[- ]Step/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: plan-artifact repair must be limited to the current Step implementation.md');
});

test('Step 4 Coverage Signature declares fields and field-equivalence for Known-False diagnosis', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  const start = combined.search(/Coverage Signature/i);
  assert.ok(start >= 0, 'specs/diagnosis-driven-recovery-apply/spec.md: Coverage Signature must be declared');
  const signature = combined.slice(start, start + 2400);

  assert.match(signature, /fields?|field names?/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: Coverage Signature fields must be explicit');
  for (const field of [/step/i, /(?:test|verification)/i, /assertion/i, /expected/i, /observation/i]) {
    assert.match(signature, field,
      'specs/diagnosis-driven-recovery-apply/spec.md: Coverage Signature must pin each diagnostic field');
  }
  assert.match(signature, /equivalent|equivalence|field[- ]by[- ]field|same signature/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: Coverage Signatures must define equivalence');
});

test('Step 4 duplicate diagnosis is terminal before exhaustion and the unresolved diagnosis has no Cause Locus', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const policy = artifact(APPLY_CARDS.policy);

  assert.match(coordinator, /repeated key returns `rejected: duplicate diagnosis` and hands back the existing diagnosis/,
    'a duplicate coordinator diagnosis must hand back rather than spend budget');
  assert.match(policy, /duplicates are\s+rejected before dispatch/,
    'bounded-recovery.md: a duplicate worker diagnosis is rejected before dispatch');
  assert.match(policy, /`unresolved` — the evidence cannot establish a concrete point/,
    'bounded-recovery.md: unresolved carries no concrete locus claim');
});

test('Step 4 a repair beyond the exhausted coordinator budget hands back to a human', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const recovery = recoverySection(`${coordinator}\n${runner}`);

  assert.match(recovery, /one past the coordinator budget, is an unresolved hand-back to a human/,
    'specs/diagnosis-driven-recovery-apply/spec.md: a repair beyond the coordinator budget must have an unresolved human hand-back branch');
});

test('Step 4 recovery uses recovery_policy true and independently verifies a plan-artifact repair', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  const recovery = recoverySection(combined);

  assert.match(combined, /recovery_policy\s*[:=]\s*true/,
    'specs/diagnosis-driven-recovery-apply/spec.md: recovery continuation must set recovery_policy true');
  assert.match(recovery, /(?:plan[- ]artifact|implementation\.md)[\s\S]{0,700}(?:independent|separate)[\s\S]{0,180}verification|(?:independent|separate)[\s\S]{0,180}verification[\s\S]{0,700}(?:plan[- ]artifact|implementation\.md)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: verification must be independent after plan-artifact repair');
  assert.match(recovery, /(?:repair|write)[\s\S]{0,520}(?:does not|must not|shall not|never)[\s\S]{0,260}(?:execute|run|perform|include)[\s\S]{0,180}verification[\s\S]{0,180}(?:as part of|during|in)[\s\S]{0,100}write/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: plan-artifact repair must not execute verification as part of its write');
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

test('Step 4 report field 8 omission is malformed while an explicit empty list is valid and field 9 soft-degrades', () => {
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
  assert.match(combined, /field 9[\s\S]{0,180}(?:soft[- ]degrad|not malformed|exempt)|soft[- ]degrad[\s\S]{0,180}field 9/i,
    'specs/apply-subagent-report-contract/spec.md: an absent field 9 must soft-degrade, not block');
  assert.match(combined, /scratch[\s\S]{0,120}field 8|field 8[\s\S]{0,120}scratch/i,
    'specs/apply-subagent-report-contract/spec.md: scratch must never appear in field 8');
});

test('Step 4 the execution telemetry row shape is pinned with the green-direct dispatch vocabulary', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${runner}\n${coordinator}`;
  assert.match(combined, /\| Step \| dispatch \| phase \| attempts \| first_failure \| note \|/,
    'specs/apply-execution-telemetry-appendix/spec.md: the telemetry table must carry the six fixed columns');
  assert.match(combined, /green[- ]direct/,
    'specs/apply-execution-telemetry-appendix/spec.md: dispatch must admit green-direct');
  assert.match(combined, /`red`[\s\S]{0,80}`green`|red[\s\S]{0,80}green/,
    'specs/apply-execution-telemetry-appendix/spec.md: dispatch must admit red and green');
  assert.match(combined, /first_failure/,
    'specs/apply-execution-telemetry-appendix/spec.md: the first_failure column must be pinned');
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
  assert.match(coordinator, /When fast-track is active at run start, pre-activate the flag\./);
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
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const start = coordinator.indexOf('## Unblock ladder');
  assert.ok(start >= 0, 'the coordinator must declare the unblock ladder');
  const end = coordinator.indexOf('\n  ## ', start + 1);
  return coordinator.slice(start, end);
}

test('Step 4 the unblock ladder traverses autonomously under a Step-scoped coordinator budget', () => {
  const ladder = unblockLadder();
  assert.match(ladder, /Traverse it autonomously: route rather than write, never ask the user which rung to take\./,
    'the ladder must be traversed without a per-incident user prompt');
  assert.match(ladder, /Each Step has three worker slots and three coordinator attempts, both held by `recovery-ledger@1`/,
    'the coordinator budget must be three attempts per Step, held in the state store');
  assert.match(ladder, /granted by the Step-entry signal only on the Step's first entry/,
    'both budgets must be granted on the first entry to each Step');
  assert.match(ladder, /A delegated corrective dispatch spends a coordinator attempt exactly as a self-edit does/,
    'delegating must consume a coordinator attempt exactly as a self-edit does');
  assert.match(ladder, /Only when the RED-owner retry returns unpassable or `unrecoverable` and no worker-safe path remains/,
    'self-edit must wait until no worker-safe correction exists');
});

test('Step 4 the coordinator never writes a test file and routes test causes to their owner', () => {
  const ladder = unblockLadder();
  assert.match(ladder, /You never write a test file\./,
    'the coordinator must never write a test file');
  assert.match(ladder, /When no RED worker was dispatched for the Step \(GREEN-only\) and the cause is in a test, dispatch a fresh RED worker/,
    'a GREEN-only Step with a test cause must dispatch a fresh RED');
  assert.match(ladder, /When the Step's RED owner is exhausted or vetoed, escalate to a human/,
    'an exhausted test owner must escalate instead of a coordinator test edit');
  assert.match(ladder, /A cause in a test file belongs to its RED owner and never goes to GREEN\./,
    'a test cause must never be routed to GREEN');
});

test('Step 4 budget exhaustion and the enumerated stopping reasons close an unattended Step', () => {
  const ladder = unblockLadder();
  assert.match(ladder, /Exhausting either budget stops the Step and escalates, naming the Step, the diagnosis, and the spend on each budget\./,
    'exhausting either budget must escalate naming the Step, diagnosis, and attempts');
  for (const reason of [/weakening or deleting an assertion/i, /redefining the agreed contract/i, /safe-operations/i, /`unrecoverable: true` veto/i, /pre-existing failure outside the change's radius/i]) {
    assert.match(ladder, reason, 'the enumerated stopping reasons must stay complete');
  }
  assert.match(ladder, /Nothing else interrupts an unattended run\./,
    'no other condition may stop the run for a user');
});

test('Step 4 a re-entered Step keeps its spent budgets and duplicate coordinator diagnoses cost zero', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const ladder = unblockLadder();
  assert.match(coordinator, /`\{kind: step-entry, step: "Step N"\}` to `recovery-ledger@1`, never a bare `reset`/,
    'the Step budget must be granted by the Step-guarded step-entry signal, never the bare reset');
  assert.match(ladder, /`step_entry: first`; a `re-entry` keeps what was spent; `unidentified` grants nothing/,
    'a re-entered Step must keep its spent budgets');
  assert.match(ladder, /`\{kind: coordinator-attempt, key: \[artifact path, concrete point, authorized correction boundary\]\}`/,
    'a coordinator attempt must carry a concrete diagnosis key');
  assert.match(ladder, /repeated key returns `rejected: duplicate diagnosis`/,
    'a duplicate coordinator diagnosis must spend zero attempts');
  assert.match(ladder, /A key-less attempt returns `rejected: unresolved cause`/,
    'a coordinator attempt without a concrete key must spend zero attempts');
});

test('Step 4 exhaustion is self-describing and the autonomous-correction trace has an enforced format', () => {
  const ladder = unblockLadder();
  const policy = artifact(APPLY_CARDS.policy);
  assert.match(policy, /`budgets` as `\{worker: \{spent, limit\}, coordinator: \{spent, limit\}\}`/,
    'every ledger outcome must report what each budget spent');
  assert.match(policy, /names the budget that ran out as `exhausted`/,
    'an exhaustion must name the budget that ran out');
  assert.match(ladder, /Read tallies from the response's `budgets`, never from memory\./,
    'the escalation tallies must come from the store, not from conversation memory');
  assert.match(ladder, /an exhausted coordinator budget stops the Step even with worker slots left/,
    'leftover worker slots must open no alternative route once the coordinator budget is gone');
  assert.match(ladder, /`> Autonomous correction: Step <N> \| <rung> \| key <path> :: <point> :: <boundary> \| <budget> <ordinal> of 3 \| <outcome>`/,
    'the trace line format must be pinned');
  assert.match(ladder, /Record one line per autonomous rung taken, zero-cost outcomes included/,
    'the trace must cover zero-cost outcomes too');
  assert.match(ladder, /Print the collected lines at run close however the run ends, or `> Autonomous corrections: none`\./,
    'the trace must be reported at run close, empty or not');
});

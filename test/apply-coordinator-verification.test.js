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

const scratchRules = [
  'Scratch path: `.tmp/{change-name}/` (separate from and excluded from `Allowed files`).',
  'A worker MAY create temporary files only below `.tmp/{change-name}/`, MAY remove all contents of exactly that directory and the directory itself before a clean return, and has no preservation obligation on STOP or failure. A non-clean return has no preservation obligation.',
  'A worker MUST NOT remove the `.tmp/` parent.',
  'Files modified MUST contain only non-scratch paths and MUST exclude every path below `.tmp/{change-name}/`.',
];

test('Step 4 the routed apply cards preserve the scope and scratch contract sentences byte-exactly', () => {
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  const combined = `${red}\n${green}`;

  assert.match(combined, /\*Scope\*: Write ONLY the interface stubs and the tests for this Step\. Do NOT write the implementation\./,
    'specs/apply-test-impl-split/spec.md: the RED scope anchor must remain byte-exact');
  assert.match(combined, /\*Scope\*: Implement ONLY what is specified in the Step's GREEN body\. Do NOT write tests\./,
    'specs/apply-test-impl-split/spec.md: the GREEN scope anchor must remain byte-exact');
  assert.match(combined, /Blind Test-Writer Allowed files contain only plan-authorized test and RED\/interface-stub files and exclude production files\./,
    'specs/apply-test-impl-split/spec.md: the blind allowed-files rule must remain byte-exact');
  assert.match(combined, /Implementation Dispatch Allowed files contain only plan-authorized production files and exclude tests and declared interfaces\./,
    'specs/apply-test-impl-split/spec.md: the implementation allowed-files rule must remain byte-exact');
  for (const sentence of scratchRules) {
    assert.match(combined, new RegExp(sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `specs/apply-coordinator-verification/spec.md: missing byte-exact scratch sentence: ${sentence}`);
  }
  assert.match(combined, /An explicitly present empty `Files modified` list is valid; an omitted field 8 is malformed\./,
    'specs/apply-subagent-report-contract/spec.md: the field-8 rule must remain byte-exact');
});

test('Step 4 the coordinator surface sweeps scratch after every dispatch and checklist run before comparison', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;

  assert.match(combined, /sweep exactly `\.tmp\/\{change-name\}\/`|sweep exactly the per-change scratch path/i,
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
  assert.match(coordinator, /empty sweep[\s\S]{0,180}(?:emits nothing|no output|no message)|(?:emits nothing|no output|no message)[\s\S]{0,180}empty sweep/i,
    'specs/apply-coordinator-verification/spec.md: an empty sweep must emit no trace line');
});

test('Step 4 scratch cleanup stays ordered before comparison without broadening recovery or human intervention', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /ordered sweep[\s\S]{0,320}(?:absent|exclude|excluded)[\s\S]{0,260}(?:report )?comparison/i,
    'specs/apply-coordinator-verification/spec.md: the ordered sweep must exclude removed paths from comparison');
  assert.match(combined, /Scratch cleanup[\s\S]{0,260}(?:MUST NOT|does not|not)[\s\S]{0,180}(?:broaden|authorize|remove).*?(?:recovery|unexpected path)/i,
    'specs/apply-coordinator-verification/spec.md: cleanup must not broaden recovery eligibility');
  assert.match(combined, /out-of-scope[\s\S]{0,260}(?:recovery|human intervention)|(?:recovery|human intervention)[\s\S]{0,260}out-of-scope/i,
    'specs/apply-coordinator-verification/spec.md: unrelated out-of-scope paths must keep their existing handling');
});

test('Step 4 scratch is excluded from the changed-files union, field-8 add-list, and pre-commit reporting', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  assert.match(combined, /Scratch paths? removed by the ordered sweep SHALL be excluded/i,
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

test('Step 4 Known-False recovery branches by Cause Locus and uses an invocation recovery ledger', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  const recovery = recoverySection(combined);

  assert.match(recovery, /Known[- ]False/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: recovery must define the Known-False branch');
  assert.match(recovery, /Cause Locus/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: recovery must branch on Cause Locus');
  for (const locus of [/\bRED\b/i, /\bGREEN\b/i, /plan[- ]artifact/i, /out[- ]of[- ]scope/i]) {
    assert.match(recovery, locus,
      'specs/diagnosis-driven-recovery-apply/spec.md: every recovery Cause Locus branch must be declared');
  }
  assert.match(combined, /recovery ledger/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: recovery attempts must be tracked in a ledger');
  assert.match(combined, /recovery ledger[\s\S]{0,700}(?:not reset|never reset|must not reset|shall not reset)[\s\S]{0,220}(?:each|per|between)[\s\S]{0,80}Step/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: the recovery ledger must not reset per Step');
  assert.match(combined, /exhaust/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: exhaustion must remain a defined terminal state');
  assert.match(combined, /checkbox[\s\S]{0,140}(?:commit|advance)|commit[\s\S]{0,140}(?:checkbox|advance)|advance[\s\S]{0,140}(?:checkbox|commit)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: exhaustion must block checkbox marking, commit, and advance');
  assert.match(combined, /human intervention/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: exhaustion must stop for human intervention');
});

test('Step 4 recovery appends exactly the ordered five-heading diagnosis without exposing worker output', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  const combined = `${coordinator}\n${red}\n${green}`;
  const recovery = recoverySection(combined);
  const headings = ['Reported', 'Evidence', 'Cause', 'Correction', 'Verification'];
  const positions = headings.map(heading => recovery.search(new RegExp(`\\b${heading}\\b`)));

  for (const position of positions) assert.ok(position >= 0, 'recovery heading should exist');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions,
    'specs/diagnosis-driven-recovery-apply/spec.md: recovery headings must remain in the required order');
  assert.match(recovery, /same[- ]worker|same worker/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: in-scope diagnosis must target the same worker session');
  assert.match(recovery, /no raw output|raw output.*(?:not|excluded|forbidden)/i,
    'specs/apply-coordinator-verification/spec.md: no raw output may enter the recovery prompt');
  assert.match(recovery, /blind/i,
    'specs/apply-test-impl-split/spec.md: recovery must preserve the blindness restriction');
});

test('Step 4 out-of-scope recovery makes zero attempts and permits at most one current-Step plan-artifact repair', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  const recovery = recoverySection(combined);

  assert.match(recovery, /out[- ]of[- ]scope[\s\S]{0,420}(?:zero|0)[\s\S]{0,100}attempt/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: out-of-scope recovery must take zero worker attempts');
  assert.match(recovery, /(?:zero|0) attempts[\s\S]{0,420}out[- ]of[- ]scope/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: zero attempts must be attached to the out-of-scope locus');
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
  for (const field of [/step/i, /(?:test|verification)/i, /assertion/i, /expected/i, /observed/i]) {
    assert.match(signature, field,
      'specs/diagnosis-driven-recovery-apply/spec.md: Coverage Signature must pin each diagnostic field');
  }
  assert.match(signature, /equivalent|equivalence|field[- ]by[- ]field|same signature/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: Coverage Signatures must define equivalence');
});

test('Step 4 duplicate diagnosis is terminal before exhaustion and the unresolved diagnosis has no Cause Locus', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const combined = `${coordinator}\n${runner}`;
  const recovery = recoverySection(combined);

  assert.match(recovery, /duplicate diagnosis[\s\S]{0,520}(?:before|prior to|without)[\s\S]{0,120}(?:exhaust|human|hand[- ]back)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: duplicate diagnosis must stop before recovery exhaustion');
  assert.match(recovery, /unresolved[\s\S]{0,500}(?:has no|without|must not (?:have|carry)|cannot (?:have|carry)|no)[\s\S]{0,140}(?:Cause Locus|locus)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: unresolved diagnosis must have no Cause Locus');
  assert.doesNotMatch(recovery, /(?:Cause Locus|locus)\s*[:=]\s*unresolved/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: unresolved must not be represented as a Cause Locus value');
});

test('Step 4 the second unresolved repair hands back to a human', () => {
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const runner = artifact(APPLY_CARDS.runner);
  const recovery = recoverySection(`${coordinator}\n${runner}`);

  assert.match(recovery, /second[\s-]+repair[\s\S]{0,520}(?:unresolved|human|hand[- ]back)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: a second repair must have an unresolved human hand-back branch');
  assert.match(recovery, /unresolved[\s\S]{0,420}(?:human hand[- ]back|hand[- ]back to human|human intervention)/i,
    'specs/diagnosis-driven-recovery-apply/spec.md: unresolved recovery must hand back to a human');
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
  const red = artifact(APPLY_CARDS.redWorker);
  const green = artifact(APPLY_CARDS.greenWorker);
  const combined = `${red}\n${green}`;

  assert.doesNotMatch(combined, /include.*(?:pre-dispatch )?baseline/i,
    'specs/apply-coordinator-verification/spec.md: workers must not receive the pre-dispatch baseline');
  assert.doesNotMatch(combined, /include.*allowed-file set/i,
    'specs/apply-coordinator-verification/spec.md: workers must not receive the coordinator allowed-file set');
  assert.doesNotMatch(combined, /per-report recovery assessment/i,
    'specs/apply-coordinator-verification/spec.md: workers must not receive the per-report recovery assessment');
  assert.match(combined, /raw output/i,
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
  assert.match(combined, /An explicitly present empty `Files modified` list is valid; an omitted field 8 is malformed\./,
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

function terminalLifecycleSection(text) {
  const start = text.indexOf('## Final sweep and terminal lifecycle');
  assert.ok(start >= 0, 'the routed runner must expose the terminal lifecycle');
  return text.slice(start);
}

test('Step 2 terminal no-op and decline paths do not create or retry a documentation commit', () => {
  const section = terminalLifecycleSection(artifact(APPLY_CARDS.runner));
  assert.match(section, /When none of these conditions holds, propose no terminal documentation commit and ask no terminal authorization question/);
  assert.match(section, /only explicit `yes` authorizes `git add` and `git commit`/);
  assert.match(section, /silence or any other response is a decline/);
  assert.match(section, /On decline, leave eligible files in the working tree/);
  assert.match(section, /without retrying/);
  assert.match(section, /continue to MANDATORY STOP/);
});

test('Step 2 terminal preview precedes message and authorization and remains non-mutating', () => {
  const section = terminalLifecycleSection(artifact(APPLY_CARDS.runner));
  const visibility = section.indexOf('### Terminal visibility listing');
  const message = section.indexOf('proposed commit message', visibility);
  const authorization = section.indexOf('### Terminal authorization and commit');
  assert.ok(visibility >= 0 && message > visibility && authorization > message,
    'visibility must precede the proposed message and authorization');
  assert.match(section, /Before proposing a terminal documentation commit message and before authorization/);
  assert.match(section, /does not stage, unstage, or otherwise mutate the Git index/);
});

test('Step 2 active session authorization and fast-track skip only the terminal ask', () => {
  const runner = artifact(APPLY_CARDS.runner);
  const invocation = artifact('sai/commands/apply/invocation.md');
  const coordinator = artifact(APPLY_CARDS.coordinator);
  const combined = `${runner}\n${invocation}\n${coordinator}`;
  assert.match(combined, /session_commit_authorized/);
  assert.match(invocation, /fast-track.*pre-activate|pre-activate.*fast-track/i);
  assert.match(runner, /When the session flag is already active.*skip only this authorization ask/s);
  assert.match(runner, /still print the visibility listing and proposed message before staging and committing/s);
  assert.match(runner, /does not offer `Allow on this session`/);
});

test('Step 2 terminal documentation preserves the pre-Final-sweep halt and field-8 boundaries', () => {
  const section = terminalLifecycleSection(artifact(APPLY_CARDS.runner));
  assert.match(section, /run that halts before this Final sweep performs neither learnings promotion nor terminal documentation evaluation/);
  assert.match(section, /Keep terminal staging separate from per-Step field-8 staging/);
  assert.match(section, /does not depend on a Step number or worker report/);
  assert.match(section, /changed-files union.*outside this set/);
  assert.match(section, /never resolve `GLOSSARY\.md` from `openspec\/changes\/\{change-name\}`/);
});

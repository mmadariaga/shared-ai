'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function recoverySection(instruction) {
  const start = instruction.search(/Known-False Report Recovery|Recovery Dispatch/i);
  assert.ok(start >= 0, 'apply instruction should define bounded report recovery');
  return instruction.slice(start);
}

test('ordinary dispatch captures coordinator-only evidence and derives dispatch-specific scope before report evaluation', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const dispatch = instruction.search(/dispatch/i);
  const reportEvaluation = instruction.search(/(?:evaluate|assess|classif).*report/i);

  assert.match(instruction, /pre-dispatch.*baseline|baseline.*pre-dispatch/i);
  assert.match(instruction, /tracked.*untracked|untracked.*tracked/i);
  assert.match(instruction, /path identit|working-tree.*path/i);
  assert.match(instruction, /plan-level.*(?:file )?scope|Step.*plan.*scope/i);
  assert.match(instruction, /dispatch-kind.*allowed-file|allowed-file.*dispatch-kind/i);
  assert.ok(dispatch >= 0 && reportEvaluation >= 0 && dispatch < reportEvaluation,
    'evidence and scope must be established before report evaluation');

  const recovery = recoverySection(instruction);
  assert.match(recovery, /coordinator-only|coordinator.*state/i);
  assert.match(recovery, /baseline/);
  assert.match(recovery, /allowed-file/);
  assert.match(recovery, /per-report.*recovery.*assessment|recovery.*assessment/i);
});

test('allowed-file rules distinguish single, blind test-writer, and implementation dispatches', () => {
  const instruction = artifact('sai/instructions/apply.md');

  assert.match(instruction, /single dispatch[\s\S]{0,240}(?:allowed-file|file scope)[\s\S]{0,240}Step.*plan.*scope/i);
  assert.match(instruction, /blind test-writer[\s\S]{0,320}(?:only|exclude|excluding)[\s\S]{0,320}(?:authorized test|RED|interface stub)/i);
  assert.match(instruction, /implementation dispatch[\s\S]{0,320}(?:only|exclude|excluding)[\s\S]{0,320}(?:production|test|declared interface)/i);
  assert.match(instruction, /blind.*(?:exclude|not include).*production|production.*(?:exclude|not include).*blind/i);
  assert.match(instruction, /implementation.*(?:exclude|not include).*test|test.*(?:exclude|not include).*implementation/i);
  assert.match(instruction, /implementation.*declared interface|declared interface.*implementation/i);
});

test('clean checklist and path evidence preserve the existing post-verification gates without recovery', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.match(instruction, /checklist.*pass|Verification Checklist.*passes/i);
  assert.match(instruction, /no.*(?:path|file).*discrepancy|path.*comparison.*no discrepancy/i);
  assert.match(instruction, /no Recovery Dispatch|does not dispatch recovery|without.*recovery/i);
  assert.match(instruction, /Human Verification/);
  assert.match(instruction, /checkbox/);
  assert.match(instruction, /commit/);
});

test('confirmed contradictions aggregate into exactly one bounded recovery dispatch before advancement', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recovery = recoverySection(instruction);
  assert.match(recovery, /one|at most one|exactly one/i);
  assert.match(recovery, /aggregate|aggregat.*contradict|all.*contradict/i);
  assert.match(recovery, /before.*checkbox|checkbox.*after.*recovery/i);
  assert.match(recovery, /before.*commit|commit.*after.*recovery/i);
  assert.match(recovery, /current Step|current step/);
  assert.match(recovery, /existing plan scope|plan scope/);
  assert.doesNotMatch(recovery, /advisor tier|additional advisor/i);
});

test('recovery dispatch retains three ordinary sections and appends the ordered five-heading recovery block', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recovery = recoverySection(instruction);
  const headings = ['Reported', 'Evidence', 'Cause', 'Correction', 'Verification'];
  const positions = headings.map((heading) => recovery.search(new RegExp(`\\b${heading}\\b`, 'i')));

  for (const position of positions) assert.ok(position >= 0, 'recovery heading should exist');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions,
    'recovery headings should remain in the required order');
  assert.match(recovery, /first three.*(?:sections|parts)|three.*ordinary.*(?:sections|parts)/i);
  assert.match(recovery, /exactly one.*fourth|fourth.*exactly one/i);
  assert.match(recovery, /fixed.*Subagent Report|report contract/i);
  assert.match(recovery, /no raw output|raw output.*(?:not|excluded|forbidden)/i);
  assert.match(recovery, /blind.*(?:restriction|rule)|blind.*test-writer/i);
});

test('ordinary and blind prompts do not receive coordinator-only recovery evidence or forbidden details', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recoveryStart = instruction.search(/Known-False Report Recovery|Recovery Dispatch/i);
  assert.ok(recoveryStart >= 0);
  const ordinary = instruction.slice(0, recoveryStart);

  assert.doesNotMatch(ordinary, /include.*(?:pre-dispatch )?baseline/i);
  assert.doesNotMatch(ordinary, /include.*allowed-file set/i);
  assert.doesNotMatch(ordinary, /per-report recovery assessment/i);
  assert.match(instruction, /raw output/);
  assert.match(instruction, /change artifacts|implementation\.md/);
  assert.match(instruction, /forbidden.*(?:blind|test-writer)|blind.*forbidden/i);
});

test('unsafe or unowned path discrepancies stop for human intervention without recovery', () => {
  const instruction = artifact('sai/instructions/apply.md');
  assert.match(instruction, /existed.*before|present.*baseline|baseline.*present/i);
  assert.match(instruction, /unknown.*(?:ownership|shared)|shared.*ownership/i);
  assert.match(instruction, /destructive.*(?:cleanup|correction)|unauthorized.*(?:cleanup|correction)/i);
  assert.match(instruction, /no recovery|does not dispatch recovery/i);
  assert.match(instruction, /human intervention/i);
  assert.match(instruction, /absent.*baseline|newly created|created by.*dispatch/i);
  assert.match(instruction, /safe.*reversib|reversib.*safe/i);
});

test('successful recovery independently re-verifies and resumes gates; failed recovery halts without retry', () => {
  const instruction = artifact('sai/instructions/apply.md');
  const recovery = recoverySection(instruction);
  assert.match(recovery, /re-run.*(?:normal )?Verification Checklist|Verification Checklist.*re-run/i);
  assert.match(recovery, /coordinator verification.*authoritative|coordinator.*authoritative/i);
  assert.match(recovery, /learnings/);
  assert.match(recovery, /Human Verification/);
  assert.match(recovery, /checkbox/);
  assert.match(recovery, /appendix|appendices/);
  assert.match(recovery, /commit/);
  assert.match(recovery, /no second recovery|without.*second.*recovery|at most one/i);
  assert.match(recovery, /failed|uncertain|unresolved|unsafe|out-of-scope/i);
  assert.match(recovery, /does not mark|do not mark|no checkbox/i);
  assert.match(recovery, /does not propose|do not propose|no commit/i);
  assert.match(recovery, /human intervention/);
});

test('terminal documentation commit is a sibling after the final sweep and promotion pass', () => {
  const apply = artifact('sai/instructions/apply.md');
  const finalSweep = apply.search(/Final sweep/i);
  const promotion = apply.search(/## Learnings Promotion Pass/i);
  const terminalCommit = apply.search(/## Terminal Documentation Commit/i);

  assert.match(apply, /Exactly once per completed run, after the Final sweep and `## Learnings Promotion Pass`/);
  assert.match(apply, /The sibling `## Terminal Documentation Commit` uses its own non-mutating listing/);
  assert.ok(finalSweep >= 0 && promotion > finalSweep && terminalCommit > promotion,
    'the terminal documentation commit must follow the Final sweep and promotion pass');
});

test('apply directs one gated promotion and documentation commit, including docs-only eligibility and refusal behavior', () => {
  const apply = artifact('sai/commands/sai-4-apply.md');

  assert.match(apply, /promotion pass/);
  assert.match(apply, /sibling.*terminal documentation commit|terminal documentation commit.*sibling/i);
  assert.match(apply, /docs-only|documentation-only/i);
  assert.match(apply, /one shared gate|shared.*(?:authorization|commit).*gate/i);
  assert.match(apply, /declin|non-yes|not.*yes/i);
  assert.match(apply, /eligible.*(?:uncommitted|remain.*commit)|uncommitted.*eligible/i);
});

test('terminal eligibility uses terminal working-tree state and supports independent docs changes', () => {
  const apply = artifact('sai/instructions/apply.md');
  const command = artifact('sai/commands/sai-4-apply.md');

  assert.match(apply, /changed `docs\/\*\*` paths remain independently eligible/);
  assert.match(apply, /Evaluate `docs\/\*\*` at terminal time with no run-start baseline/);
  assert.match(apply, /pre-existing uncommitted documentation is eligible/);
  assert.match(apply, /When this pass writes `SAI_LEARNINGS\.md`/);
  assert.match(apply, /derive a fixed terminal set from the current working tree/);
  assert.match(command, /promotion-written `SAI_LEARNINGS\.md` joins the same fixed set and authorization gate/);
  assert.match(apply, /When the fixed terminal set is empty/);
  assert.match(apply, /propose no message/);
  assert.match(apply, /ask no authorization question/);
});

test('pre-authorization disclosure lists exact paths and learning promotion details without staging or delete authority', () => {
  const apply = artifact('sai/instructions/apply.md');

  assert.match(apply, /before proposing a message or asking for authorization/);
  assert.match(apply, /every exact path in the fixed terminal set/);
  assert.match(apply, /every working-tree path outside that set/);
  assert.match(apply, /without staging or reading `git diff --cached`/);
  assert.match(apply, /Do not derive this set from a Step, `tasks\.md`, an intended add-list, or subagent report field 8/);
  assert.match(apply, /path written/);
  assert.match(apply, /count of entries added and superseded broken down by section/);
  assert.match(apply, /keys of any pre-seeded entries/);
  assert.match(apply, /grants no delete authority/);
});

test('terminal message and staging rules remain limited to eligible paths and hunks', () => {
  const apply = artifact('sai/instructions/apply.md');
  const commitRules = artifact('sai/policies/commit-rules.md');

  assert.match(apply, /Propose one message for the complete terminal set/);
  assert.match(apply, /apply `sai\/policies\/commit-rules\.md` to the eligible terminal paths and hunks only/);
  assert.match(apply, /Never use `git add -A`, another broad sweep/);
  assert.match(apply, /stage exactly the changed `docs\/\*\*` paths in the fixed set plus root `SAI_LEARNINGS\.md`/);
  assert.match(apply, /Include every changed path under `docs\/\*\*`/);
  assert.match(apply, /every working-tree path outside that set, including OpenSpec change artifacts/);
  assert.match(apply, /path that includes `openspec\/changes\/\{change-name\}\//);
  assert.match(commitRules, /subject/i);
  assert.match(commitRules, /body/i);
  assert.match(commitRules, /footer/i);
});

test('ordinary Step commits and halted runs do not enter the terminal documentation operation', () => {
  const apply = artifact('sai/instructions/apply.md');
  const command = artifact('sai/commands/sai-4-apply.md');

  assert.match(apply, /ordinary `## Pre-commit File Visibility Report` remains unchanged/);
  assert.match(apply, /intended add-list.*field 8/);
  assert.match(apply, /A run that halts before the Final sweep promotes nothing/);
  assert.match(apply, /terminal documentation commit SHALL NOT be evaluated/);
  assert.match(command, /If any Step remains unchecked/);
  assert.match(command, /continue to the MANDATORY STOP/);
});

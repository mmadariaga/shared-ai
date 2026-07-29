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

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

const PATHS = {
  redWorker: 'sai/commands/apply/red-worker.md',
  greenWorker: 'sai/commands/apply/green-worker.md',
  implementInstructions: 'sai/commands/implement/instructions.md',
  implementationTemplate: 'sai/commands/implement/implementation-plan.template.md',
  agents: 'AGENTS.md',
};

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

// ─── (a) RED worker scope authorizes plan-named removal, nothing else ───────

test('the RED worker scope grants a bounded retirement exception for plan-named retired test files only', () => {
  const red = artifact(PATHS.redWorker);

  const blindLine = red.indexOf('Blind Test-Writer Allowed files contain only plan-authorized test and RED/interface-stub files and exclude production files.');
  assert.ok(blindLine >= 0, 'the blind allowed-files anchor must remain byte-exact');
  const exceptionIndex = red.search(/Bounded retirement exception:/);
  assert.ok(exceptionIndex >= 0, 'the scope must declare the bounded retirement exception');
  assert.ok(exceptionIndex > blindLine,
    'the retirement exception must extend, not replace, the blind allowed-files rule');

  assert.match(red, /plan names obsolete test files as retired[\s\S]{0,200}exact repository-relative path/,
    'the exception must key on plan-named retired files with exact repository-relative paths');
  assert.match(red, /MAY remove exactly those plan-named retired files and nothing else/,
    'the worker may remove exactly the plan-named retired files and nothing else');
  assert.match(red, /grants no read access[\s\S]{0,160}(?:MUST NOT|never|without)[\s\S]{0,120}reading production files or change artifacts/i,
    'removal must grant no read access to production files or change artifacts');
  assert.match(red, /every path not named as retired remains forbidden to write, modify, or remove/,
    'every non-retired path must stay forbidden');
});

test('the RED worker keeps its absolute boundaries outside the retirement exception', () => {
  const red = artifact(PATHS.redWorker);
  const green = artifact(PATHS.greenWorker);

  assert.match(red, /Read any production source file outside the blindness fallback\./,
    'the production-read prohibition must remain intact');
  assert.match(red, /A worker MUST NOT remove the `\.tmp\/` parent\./,
    'the scratch-parent prohibition must remain intact');
  assert.match(red, /MUST NOT run any git operation or create any commit\./,
    'the git prohibition must remain intact');
  assert.match(red, /MUST NOT edit or modify `implementation\.md` or mark any checkbox\./,
    'the plan-artifact prohibition must remain intact');
  for (const worker of [red, green]) {
    assert.match(worker, /Files modified MUST contain only non-scratch paths and MUST exclude every path below `\.tmp\/\{change-name\}\/`\./,
      'the field-8 scratch exclusion rule must remain byte-exact on both workers');
  }
  assert.doesNotMatch(green, /retired/i,
    'GREEN must not gain any retirement authorization of its own');
});

test('a recovery continuation inherits the removal authorization for the same plan-named retired files only', () => {
  const red = artifact(PATHS.redWorker);
  const start = red.indexOf('## Recovery Continuation');
  assert.ok(start >= 0, 'the Recovery Continuation section must exist');
  const recovery = red.slice(start);

  assert.match(recovery, /recovery continuation inherits[\s\S]{0,200}(?:bounded )?retirement(?: removal)? authorization/i,
    'the continuation must inherit the retirement removal authorization');
  assert.match(recovery, /inherits[\s\S]{0,320}exactly the same plan-named retired test files and no others/i,
    'the inheritance must be limited to the same plan-named retired files only');
});

// ─── (b) report field 8 declares removed paths ──────────────────────────────

test('report field 8 declares removed paths alongside written and created ones', () => {
  const red = artifact(PATHS.redWorker);
  const fieldStart = red.indexOf('8. **Files modified**');
  assert.ok(fieldStart >= 0, 'field 8 must remain declared');
  const field = red.slice(fieldStart, red.indexOf('\n9.', fieldStart));

  assert.match(field, /non-scratch paths written, created, or removed/,
    'field 8 must cover written, created, and removed paths');
  assert.match(field, /plan-named retired test file removed under the bounded retirement exception is declared here by its exact repository-relative path/,
    'removed retired files must be declared by exact repository-relative path');
  assert.match(field, /An explicitly present empty `Files modified` list is valid; an omitted field 8 is malformed\./,
    'the pinned field-8 empty-list rule must remain byte-exact');
});

// ─── (c) planner guidance: placement, green-direct exclusion, checklist ─────

test('implement instructions confine retirements to RED blocks with per-file absence checklist items', () => {
  const instructions = artifact(PATHS.implementInstructions);

  assert.match(instructions, /\*\*Test retirements:\*\*[\s\S]{0,240}ONLY inside that step's RED block/,
    'retirements must live only inside RED blocks');
  assert.match(instructions, /exact repository-relative path, marked `retired`/,
    'each retirement must carry its exact repository-relative path marked retired');
  assert.match(instructions, /green-direct Step \(no RED block\) never carries retirements/,
    'a green-direct Step must never carry retirements');
  assert.match(instructions, /one Verification Checklist item per retired file asserting that file's absence/,
    'each retired file needs one absence checklist item');
  assert.match(instructions, /coordinator runs it after the RED dispatch returns and before GREEN may be dispatched/,
    'the coordinator must run the absence item between RED and GREEN');

  const hardRulesStart = instructions.indexOf('## Hard Rules');
  assert.ok(hardRulesStart >= 0, 'Hard Rules must exist');
  assert.match(instructions.slice(hardRulesStart),
    /\*\*Test retirements:\*\* A Step retires obsolete test files only inside its RED block/,
    'Hard Rules must restate the retirement placement rule');
});

test('the implementation plan template carries the RED-block retirement rule', () => {
  const template = artifact(PATHS.implementationTemplate);
  const redPhaseStart = template.indexOf('##### RED phase');
  const redPhaseEnd = template.indexOf('##### GREEN phase', redPhaseStart);
  assert.ok(redPhaseStart >= 0 && redPhaseEnd > redPhaseStart, 'the template must keep its RED phase block');
  const redPhase = template.slice(redPhaseStart, redPhaseEnd);

  assert.match(redPhase, /\*\*Retirements:\*\*[\s\S]{0,240}ONLY inside this RED block/,
    'the template RED phase must instruct retirements only inside the RED block');
  assert.match(redPhase, /exact repository-relative path marked `retired`/,
    'the template rule must pin the exact-path retired marker');
  assert.match(redPhase, /step without a RED block never carries retirements/,
    'the template rule must exclude green-direct steps from carrying retirements');
  assert.match(redPhase, /one Verification Checklist item asserting the retired file's absence/,
    'the template rule must require one absence checklist item per retired file');
  assert.match(redPhase, /after the RED dispatch returns and before GREEN may be dispatched/,
    'the template rule must place the absence item between RED and GREEN');
});

// ─── (d) AGENTS.md anti-pattern rule ────────────────────────────────────────

test('AGENTS.md documents RED-owned retirement and the anti-pattern rule for tests', () => {
  const agents = artifact(PATHS.agents);
  const sectionStart = agents.indexOf('### RED → GREEN');
  const sectionEnd = agents.indexOf('### ', sectionStart + 1);
  assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, 'the RED → GREEN convention section must exist');
  const section = agents.slice(sectionStart, sectionEnd);

  assert.match(section, /owned by the RED dispatch \(or the green-exception flow\), never by GREEN/,
    'retirement ownership must sit with RED (or green-exception), never GREEN');
  assert.match(section, /names retired test files only inside RED blocks by exact repository-relative path/,
    'plans must name retired files inside RED blocks by exact repository-relative path');
  assert.match(section, /RED worker may remove exactly those plan-named files/,
    'only the RED worker may remove the plan-named files');
  assert.match(section, /Tests assert the absence of retired files; they never encode routing vocabulary such as "must be removed in GREEN"/,
    'tests must assert absence, never encode routing vocabulary');
});

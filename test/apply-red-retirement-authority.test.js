'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

const PATHS = {
  redWorker: 'sai/commands/apply/red-worker.md',
  greenWorker: 'sai/commands/apply/green-worker.md',
  implementCommon: 'sai/commands/implement/steps/common.md',
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

  const allowedLine = red.indexOf('Tests and interface stubs the plan authorizes for this Step. Production files are outside them.');
  assert.ok(allowedLine >= 0, 'the blind allowed-files rule must remain');
  const exceptionIndex = red.search(/\*\*Retired tests\.\*\*/);
  assert.ok(exceptionIndex > allowedLine,
    'the retirement exception must extend, not replace, the allowed-files rule');

  assert.match(red, /plan names obsolete test files as retired, each by exact repo-relative path/,
    'the exception must key on plan-named retired files with exact repository-relative paths');
  assert.match(red, /MAY remove exactly those files and nothing else/,
    'the worker may remove exactly the plan-named retired files and nothing else');
  assert.match(red, /needs no read of production files or change artifacts, and grants none/,
    'removal must grant no read access to production files or change artifacts');
  assert.match(red, /Every path not named as retired stays forbidden to remove\./,
    'every non-retired path must stay forbidden');
});

test('the RED worker keeps its absolute boundaries outside the retirement exception', () => {
  const red = artifact(PATHS.redWorker);
  const green = artifact(PATHS.greenWorker);
  const common = artifact('sai/commands/apply/worker-common.md');

  assert.match(red, /read production source only for that same fallback/,
    'the production-read prohibition must remain intact');
  for (const worker of [red, green]) {
    assert.ok(worker.includes('Fetch @sai/commands/apply/worker-common.md and follow it exactly.'),
      'both workers must load the shared worker rules');
  }
  assert.match(common, /Leave the `\.tmp\/` parent in place\./,
    'the scratch-parent prohibition must remain intact');
  assert.match(common, /Run no git operation and create no commit\./,
    'the git prohibition must remain intact');
  assert.match(common, /Leave `implementation\.md` and every checkbox untouched\./,
    'the plan-artifact prohibition must remain intact');
  assert.match(common, /Field 8 lists no scratch path\./,
    'the field-8 scratch exclusion rule must remain');
  assert.doesNotMatch(green, /retired/i,
    'GREEN must not gain any retirement authorization of its own');
});

test('a recovery continuation inherits the removal authorization for the same plan-named retired files only', () => {
  const red = artifact(PATHS.redWorker);
  assert.match(red, /A recovery continuation keeps this permission for exactly the same files and no others\./,
    'the continuation must inherit the retirement authorization for the same plan-named files only');
});

// ─── (b) report field 8 declares removed paths ──────────────────────────────

test('report field 8 declares removed paths alongside written and created ones', () => {
  const common = artifact('sai/commands/apply/worker-common.md');
  const red = artifact(PATHS.redWorker);
  const fieldStart = common.indexOf('8. **Files modified**');
  assert.ok(fieldStart >= 0, 'field 8 must remain declared');
  const field = common.slice(fieldStart, common.indexOf('\n9.', fieldStart));

  assert.match(field, /every non-scratch path you wrote, created, or removed/,
    'field 8 must cover written, created, and removed paths');
  assert.match(red, /declaring each in field 8 by that path/,
    'removed retired files must be declared by exact repository-relative path');
  assert.match(field, /an empty list is valid, a missing field makes the report malformed/,
    'the field-8 empty-list rule must remain');
});

// ─── (c) planner guidance: placement, green-direct exclusion, checklist ─────

test('implement hard rules confine retirements to RED blocks with per-file absence checklist items', () => {
  const common = artifact(PATHS.implementCommon);
  const hardRulesStart = common.indexOf('## Hard Rules');
  assert.ok(hardRulesStart >= 0, 'Hard Rules must exist');
  const hardRules = common.slice(hardRulesStart);

  assert.match(hardRules, /\*\*Test retirements:\*\* A Step retires obsolete test files only inside its RED block/,
    'retirements must live only inside RED blocks');
  assert.match(hardRules, /exact repository-relative path as `retired`/,
    'each retirement must carry its exact repository-relative path marked retired');
  assert.match(hardRules, /green-direct Step \(no RED block\) never carries retirements/,
    'a green-direct Step must never carry retirements');
  assert.match(hardRules, /one Verification Checklist item asserting its absence/,
    'each retired file needs one absence checklist item');
  assert.match(hardRules, /run by the coordinator after the RED dispatch returns and before GREEN may be dispatched/,
    'the coordinator must run the absence item between RED and GREEN');
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

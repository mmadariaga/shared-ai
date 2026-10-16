'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const registry = require('../sai-state/registry.js');

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const COORDINATOR = 'sai/commands/review-new/coordinator.md';
const WORKER = 'sai/commands/review-new/worker.md';
const STEPS = {
  'establish-diff-scope': 'sai/commands/review-new/steps/establish-diff-scope.md',
  'resolve-review-analysis': 'sai/commands/review-new/steps/resolve-review-analysis.md',
  'close-review-outcome': 'sai/commands/review-new/steps/close-review-outcome.md',
};
const passes = source => source.split(/\r?\n/).filter(line => /^\d+\. \*\*/.test(line));

test('the step machine is registered and delivers the three filed steps in order after the fileless intake', () => {
  assert.ok(registry.has('review-new-steps@1'));
  const machine = registry.get('review-new-steps@1');
  assert.deepEqual([...machine.STEPS], ['review-intake', ...Object.keys(STEPS)]);
  assert.equal(machine.STAGE_FILES['review-intake'], 'none');
  for (const [step, file] of Object.entries(STEPS)) {
    assert.equal(machine.STAGE_FILES[step], file);
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} must exist`);
  }
  assert.equal(machine.firstFiled().next.follow, STEPS['establish-diff-scope']);
  const first = machine.transition(machine.initialState, { step_ids: ['review-intake', 'establish-diff-scope'] });
  assert.equal(first.next.follow, STEPS['resolve-review-analysis']);
  const second = machine.transition(first.state, { step_ids: ['resolve-review-analysis'] });
  assert.equal(second.next.follow, STEPS['close-review-outcome']);
});

test('the coordinator resolves the change without a picker and prints the pinned literals', () => {
  const source = read(COORDINATOR);
  assert.match(source, /Drop any `--fast-track` token/);
  assert.match(source, /--parent-branch <branch>/);
  assert.match(source, /the only change directory under `openspec\/changes\/` \(archive excluded\) that has a `proposal\.md`/);
  assert.match(source, /Cannot start \/sai-4-review-new: name the change \(\{candidates, or none\}\)\./);
  assert.match(source, /Cannot start \/sai-4-review-new for \{name\}: missing proposal\.md\./);
  assert.match(source, /without escalating and writing nothing/);
  assert.match(source, /Review-new done\./);
  assert.doesNotMatch(source, /AskUserQuestion|native picker to choose a change/);
});

test('the coordinator only reviews: it fixes nothing and has no Direct Build close or review-fix worker', () => {
  const source = read(COORDINATOR) + read(WORKER);
  assert.match(source, /it fixes no finding/);
  assert.doesNotMatch(source, /direct-build-close|review-fix|sai-review-fix-worker/);
  assert.match(read(WORKER), /Fix no finding/);
});

test('the review commit follows the staging rule: ignore check, one path, no force-add, no push, no attribution', () => {
  const source = read(COORDINATOR);
  assert.match(source, /git check-ignore -q openspec\/changes\/\{name\}\/review\.md/);
  assert.match(source, /`git add` that path alone/);
  assert.match(source, /git commit -m "<subject>" -- <path>/);
  assert.match(source, /at most 50 characters/);
  assert.match(source, /no `Co-Authored-By` trailer and no AI-attribution line of any kind/);
  assert.match(source, /Never force-add with `-f`, never push/);
  assert.match(source, /ignored, the report stays on disk uncommitted/);
});

test('the coordinator verifies review.md itself and spends at most 3 attempts before escalating', () => {
  const source = read(COORDINATOR);
  assert.match(source, /every finding heading[\s\S]{0,120}carries an identifier/);
  assert.match(source, /closing `Summary:` tally matches the number of findings/);
  assert.match(source, /budget of 3 attempts/);
  assert.match(source, /different from the previous one/);
  assert.match(source, /one that stops the run/);
  assert.match(source, /no closing line/);
  assert.match(source, /A new review regenerates `review\.md` completely/);
});

test('the empty diff ends the run without a report or a commit', () => {
  assert.match(read(STEPS['establish-diff-scope']), /No changes detected against \{parent-branch\}\. Nothing to review\./);
  const coordinator = read(COORDINATOR);
  assert.match(coordinator, /write no `review\.md`, commit nothing/);
});

test('the review keeps the eleven passes, the severities, the adversary challenge, and both review modes', () => {
  const original = read('sai/commands/review/steps/resolve-review-analysis.md');
  const copy = read(STEPS['resolve-review-analysis']);
  assert.equal(passes(copy).length, 11);
  assert.deepEqual(passes(copy), passes(original));
  const common = read('sai/commands/review-new/steps/common.md');
  for (const severity of ['Critical', 'High', 'Medium', 'Low', 'Question']) {
    assert.ok(common.includes(`**${severity}**`), `common.md must define ${severity}`);
  }
  assert.match(read(STEPS['close-review-outcome']), /`budget-explorer` adversary/);
  const scope = read(STEPS['establish-diff-scope']);
  assert.match(scope, /\*\*Direct\*\* \(total ≤ 500 changed lines\)/);
  assert.match(scope, /\*\*Delegated\*\* \(total > 500\)/);
  assert.match(scope, /`--parent-branch` value/);
});

test('pending findings of build-log.md are leads that must still hold, and the report format has one source', () => {
  const common = read('sai/commands/review-new/steps/common.md');
  assert.match(common, /`build-log\.md`[\s\S]{0,80}pending findings, read them as leads/);
  assert.match(common, /Write into `review\.md` only the ones that still hold/);
  assert.match(read(STEPS['resolve-review-analysis']), /every pending finding of `build-log\.md` verified/);
  assert.match(read(STEPS['close-review-outcome']), /Fetch @sai\/commands\/review\/review-report\.template\.md/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/review-new/review-report.template.md')), false);
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/review/review-report.template.md')));
});

test('the worker is created once with the ready handshake, dispatches only budget-explorer, and writes only review.md', () => {
  const source = read(WORKER);
  assert.match(source, /event: ready/);
  assert.match(source, /Active step: <id> — follow <path>/);
  assert.match(source, /Write only `openspec\/changes\/\{change-name\}\/review\.md`/);
  assert.match(source, /Dispatch only `budget-explorer`/);
  assert.match(source, /Run no git command that changes the repository/);
  const coordinator = read(COORDINATOR);
  assert.match(coordinator, /Create `sai-review-new-worker` once for the run/);
  assert.match(coordinator, /SendMessage/);
  assert.match(coordinator, /task_id/);
  assert.match(coordinator, /review-new-steps@1/);
});

test('/sai-build-new closes with the counts by category, the audits, and a triage invitation without running an audit', () => {
  const build = read('sai/commands/build-new/coordinator.md');
  assert.match(build, /Critical, High, Medium, Low, Questions/);
  assert.match(build, /`## Recommended Audits` block/);
  assert.match(build, /Run no audit/);
  assert.match(build, /delete the findings they do not want applied, and run `\/sai-3-implement-new \{name\}`/);
  assert.match(build, /Questions stay open until the user answers them, because `\/sai-3-implement-new` applies only fixable findings/);
  assert.match(build, /With zero findings, report the zero counts and omit the invitation/);
  assert.match(build, /no review ran/);
  assert.match(build, /print both reports and end the run without a closing line/);
  assert.match(build, /A segment starts only when the previous one completed, including a segment 1 that completed with no new work/);
});

test('the command wrappers and the ADR that extends 0194 exist', () => {
  for (const harness of ['claude', 'opencode']) {
    const wrapper = read(`commands/${harness}/sai-4-review-new.md`);
    assert.match(wrapper, /Fetch @sai\/commands\/review-new\/coordinator\.md and follow it exactly/);
    assert.match(wrapper, /command_name: review-new/);
    assert.doesNotMatch(wrapper, /@sai\/adapters\//);
  }
  const adr = read('docs/adr/0195-review-new-is-a-review-only-command-of-the-new-family.md');
  assert.match(adr, /adr-index: amends 0194/);
  assert.match(read('docs/adr/0000-INDEX.md'), /0195-review-new-is-a-review-only-command-of-the-new-family\.md/);
});

test('the naming spec keeps forbidding the historical sai-4-review name', () => {
  assert.match(read('openspec/specs/sai-command-naming/spec.md'), /sai-4-review\.md/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'commands/claude/sai-4-review.md')), false);
});

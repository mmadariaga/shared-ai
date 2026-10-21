'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const registry = require('../sai-state/registry.js');

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const COORDINATOR = 'sai/commands/review/coordinator.md';
const WORKER = 'sai/commands/review/worker.md';
const STEPS = {
  'establish-diff-scope': 'sai/commands/review/steps/establish-diff-scope.md',
  'resolve-review-analysis': 'sai/commands/review/steps/resolve-review-analysis.md',
  'close-review-outcome': 'sai/commands/review/steps/close-review-outcome.md',
};
const passes = source => source.split(/\r?\n/).filter(line => /^\d+\. \*\*/.test(line));

test('the step machine is registered and delivers the three filed steps in order after the fileless intake', () => {
  assert.ok(registry.has('review-steps@1'));
  const machine = registry.get('review-steps@1');
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
  assert.match(source, /Cannot start \/sai-4-review: name the change \(\{candidates, or none\}\)\./);
  assert.match(source, /Cannot start \/sai-4-review for \{name\}: missing proposal\.md\./);
  assert.match(source, /without escalating and writing nothing/);
  assert.match(source, /Review done\./);
  assert.doesNotMatch(source, /AskUserQuestion|native picker to choose a change/);
});

test('the coordinator only reviews: it fixes nothing and has no Direct Build close or review-fix worker', () => {
  const source = read(COORDINATOR) + read(WORKER);
  assert.match(source, /it fixes no finding/);
  assert.doesNotMatch(source, /direct-build-close|review-fix|sai-review-fix-worker/);
  assert.match(read(WORKER), /Fix no finding/);
});

test('the review commit keeps staging safeguards and the explicit-user AI attribution exception', () => {
  const source = read(COORDINATOR);
  assert.match(source, /git check-ignore -q openspec\/changes\/\{name\}\/review\.md/);
  assert.match(source, /`git add` that path alone/);
  assert.match(source, /git commit -m "<subject>" -- <path>/);
  assert.match(source, /at most 50 characters/);
  assert.match(source, /Human coauthor credits are allowed/);
  assert.match(source, /Omit AI attribution unless the user explicitly requests it in the conversation/);
  assert.match(source, /Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request/);
  assert.match(source, /written rule, not a new validation step/);
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
  const common = read('sai/commands/review/steps/common.md');
  for (const severity of ['Critical', 'High', 'Medium', 'Low', 'Question']) {
    assert.ok(common.includes(`**${severity}**`), `common.md must define ${severity}`);
  }
  assert.match(read(STEPS['close-review-outcome']), /`budget-explorer` adversary/);
  const scope = read(STEPS['establish-diff-scope']);
  assert.match(scope, /\*\*Direct\*\* \(total ≤ 500 changed lines\)/);
  assert.match(scope, /\*\*Delegated\*\* \(total > 500\)/);
  assert.match(scope, /`--parent-branch` value/);
});

test('the review never reads build-log.md, and the report format has one source', () => {
  const common = read('sai/commands/review/steps/common.md');
  for (const file of [common, read(STEPS['establish-diff-scope']), read(STEPS['resolve-review-analysis']), read('sai/commands/review/worker.md')]) {
    assert.doesNotMatch(file, /build-log\.md/);
  }
  assert.match(read(STEPS['close-review-outcome']), /Fetch @sai\/commands\/review\/review-report\.template\.md/);
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
  assert.match(coordinator, /Create `sai-4-review-worker` once for the run/);
  assert.match(coordinator, /SendMessage/);
  assert.match(coordinator, /task_id/);
  assert.match(coordinator, /review-steps@1/);
});

test('/sai-build closes with the counts, the audits, and the fixed, excluded, and left-open lists without running an audit', () => {
  const build = read('sai/commands/build/coordinator.md');
  assert.match(build, /Critical, High, Medium, Low, Questions/);
  assert.match(build, /`## Recommended Audits` block/);
  assert.match(build, /Run no audit/);
  assert.match(build, /remove its ` \(EXCLUDED: …\)` mark from the heading in `review\.md` and run `\/sai-3-implement \{name\}`/);
  assert.doesNotMatch(build, /invite the user/);
  assert.match(build, /\*\*Fixed\*\*/);
  assert.match(build, /\*\*Excluded\*\*/);
  assert.match(build, /\*\*Left open by the fix segment\*\*/);
  assert.match(build, /Never list it as excluded/);
  assert.match(build, /Questions stay open until the user answers them, because the fix segment applies only fixable findings/);
  assert.match(build, /With zero findings, report the zero counts and print none of these lists/);
  assert.match(build, /no review ran/);
  assert.match(build, /print both reports and end the run without a closing line/);
  assert.match(build, /A segment starts only when the previous one completed, including a segment 1 that completed with no new work/);
});

test('/sai-build assesses the findings itself once, marks the excluded ones, commits review.md alone, and fixes the rest in segment 3', () => {
  const build = read('sai/commands/build/coordinator.md');
  const assessment = build.slice(build.indexOf('## Assessment pass'), build.indexOf('## Close'));
  assert.match(assessment, /You run this pass yourself, once, after segment 2 completes and wrote `review\.md`/);
  assert.match(assessment, /never in a worker/);
  assert.match(assessment, /No fixed selection rule, threshold, or severity cutoff applies/);
  assert.match(assessment, /never mandatory checks/);
  assert.match(assessment, /` \(EXCLUDED: <reason>\)`/);
  assert.match(assessment, /Never mark a Question/);
  assert.match(assessment, /`git commit -m "<subject>" -- <path>`/);
  assert.match(assessment, /at most 50 characters/);
  assert.match(assessment, /Authorship credits follow that same Commit rule/);
  assert.match(assessment, /never push/);
  assert.match(assessment, /Start segment 3 only when that count is above zero/);
  assert.match(assessment, /never runs when `review\.md` holds no fixable finding/);
  assert.match(assessment, /keeps no memory/);
  assert.match(build, /3\. `\/sai-3-implement` again/);
  assert.match(build, /one review pass runs per run/);
  assert.match(build, /When segment 1 or segment 3 ends blocked/);
});

test('finding-state defines the excluded mark and /sai-3-implement skips excluded findings', () => {
  const state = read('sai/policies/finding-state.md');
  assert.match(state, /## Excluded mark/);
  assert.match(state, /` \(EXCLUDED: <reason>\)`/);
  assert.match(state, /A Question never\s+carries it/);
  assert.match(state, /stays open for every consumer except `\/sai-3-implement`/);
  assert.doesNotMatch(state, /does not honor the mark/);
  assert.match(state, /Regenerating a report replaces its excluded marks together with\s+its fixed marks/);
  const implement = read('sai/commands/implement/coordinator.md');
  assert.match(implement, /excluded mark \(` \(EXCLUDED: …\)`/);
  assert.match(implement, /is skipped: it is not applied, not marked, not a pending finding, and not an obstacle/);
  assert.match(implement, /Wherever this command says open fixable finding, it leaves excluded findings out/);
});

test('the command wrappers and the ADR that extends 0194 exist', () => {
  for (const harness of ['claude', 'opencode']) {
    const wrapper = read(`commands/${harness}/sai-4-review.md`);
    assert.match(wrapper, /Fetch @sai\/commands\/review\/coordinator\.md and follow it exactly/);
    assert.match(wrapper, /command_name: review$/m);
    assert.doesNotMatch(wrapper, /@sai\/adapters\//);
  }
  const adr = read('docs/adr/0195-review-new-is-a-review-only-command-of-the-new-family.md');
  assert.match(adr, /adr-index: amends 0194/);
  const supersession = read('docs/adr/0198-build-new-selects-and-fixes-findings-after-its-review.md');
  assert.match(supersession, /adr-index: amends 0195/);
  assert.match(supersession, /Supersedes Decision 4 of \[ADR 0195\]/);
  assert.match(read('docs/adr/0000-INDEX.md'), /0198-build-new-selects-and-fixes-findings-after-its-review\.md\) — \*\*Amends\*\* 0195/);
  assert.match(read('docs/adr/0000-INDEX.md'), /0195-review-new-is-a-review-only-command-of-the-new-family\.md/);
});

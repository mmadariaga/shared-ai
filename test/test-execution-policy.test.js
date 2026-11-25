'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const CARDS = [
  'sai/commands/implement/coordinator.md',
  'sai/commands/explore/direct-build-coordinator.md',
  'sai/commands/merge/coordinator.md',
];

test('E2 to E9, E13: one policy is the single source of how the three commands choose, run, and classify tests', () => {
  const policy = read('sai/policies/test-execution.md');
  for (const part of ['## Resolve the command once', '## Select', '## Run', '## Classify a failing test', '## Obstacles', '## Closing report']) {
    assert.ok(policy.includes(part), part);
  }
  assert.match(policy, /the routine full-suite run belongs to CI/);
  assert.match(policy, /`test-command`/);
  assert.match(policy, /None — no test runner in this project/);
  assert.match(policy, /> Suite gate: skipped — no test suite found/);
  assert.match(policy, /Never hand over a generic goal such as "run the project's full test suite"/);
  assert.match(policy, /When `restore` answers `failed`, the run blocks: nothing is edited, staged, or committed while base files are in the working tree/);
  assert.match(policy, /When `swap` answers `refused` or a tool error, the failures count as new/);
  for (const card of CARDS) {
    assert.match(read(card), /Fetch `@sai\/policies\/test-execution\.md`/, `${card} loads the policy`);
  }
});

test('E13: each command reports every test run with its selection result and that the full-suite run belongs to CI', () => {
  assert.match(read('sai/commands/implement/coordinator.md'), /`selected` with the number of tests, or `full` with the reason[\s\S]{0,120}a statement that the routine full-suite run belongs to CI/);
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /`selected N` or `full <reason>`[\s\S]{0,700}the routine full-suite run belongs to CI/);
  assert.match(read('sai/commands/merge/coordinator.md'), /`selected N` or `full <reason>`[\s\S]{0,200}the routine full-suite run belongs to CI/);
});

test('I7, E1: the commands hand the executor exact command lines and keep their own scope', () => {
  const direct = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(direct, /the exact command line built from the resolver's command, its scoping idiom, and the test set[^.]*never a generic goal/);
  assert.match(direct, /the diff since `base_sha`/);
  assert.match(direct, /untracked and unstaged files included/);
  assert.doesNotMatch(direct, /run the project's full test suite|temporary detached `git worktree`/);
  assert.match(read('sai/commands/implement/coordinator.md'), /every plan test of the change \(the `\*\*Tests\*\*` of every step, regression guards included\) plus the tests related to the whole change diff/);
  assert.match(read('sai/commands/merge/coordinator.md'), /the tests related to the files that differ between the pre-launch `HEAD` and the final tree/);
});

test('I6: Direct Build records the dirty git state when it dispatches the implementer', () => {
  const direct = read('sai/commands/explore/direct-build-coordinator.md');
  const step1 = direct.slice(direct.indexOf('1. **Implement**'), direct.indexOf('2. **Functional fix loop**'));
  assert.match(step1, /Record the dirty git state before the dispatch: write `git status --porcelain` to `baseline-dirty\.txt` in the run directory/);
  assert.match(step1, /emit `record` \(`baseline`\)/);
});

test('E5, E6: Direct Build keeps its skipped-suite literal and treats an ambiguous command as an obstacle of its gate', () => {
  const direct = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(direct, /print exactly `> Suite gate: skipped — no test suite found`/);
  assert.match(direct, /`ambiguous`, or a runner that fails before running any test[^.]*an obstacle of `step-2b`/);
});

test('E15: GREEN closes on its step tests and selection, the RED test_command means one step\'s tests, and baseline means the dirty git state', () => {
  assert.doesNotMatch(read('sai/commands/implement/green-worker.md'), /earlier steps stay green/);
  assert.doesNotMatch(read('sai/commands/implement/steps/green-step.md'), /earlier steps stay green/);
  assert.match(read('sai/commands/implement/green-worker.md'), /passes together with the tests the coordinator selects for the files you changed/);
  assert.match(read('sai/commands/implement/worker-common.md'), /RED gives the exact command that runs only this step's tests/);
  assert.match(read('sai/commands/design/red-worker.md'), /`test_command` in your report names the command that runs only one step's tests/);
  assert.doesNotMatch(read('sai/commands/design/red-worker.md'), /runs every plan test of the change/);
  assert.doesNotMatch(read('sai/commands/implement/steps/red-step.md'), /command that runs every plan test of the change/);
});

test('E15: no two ADRs carry the same number', () => {
  const numbers = fs.readdirSync(path.join(root, 'docs/adr')).map((name) => /^(\d{4}[a-z]?)-/.exec(name)).filter(Boolean).map((match) => match[1]);
  const duplicates = numbers.filter((number, index) => numbers.indexOf(number) !== index);
  assert.deepEqual(duplicates, []);
  assert.ok(fs.existsSync(path.join(root, 'docs/adr/0232-lazy-failure-baseline-in-the-working-tree.md')));
  assert.match(read('docs/adr/0232-lazy-failure-baseline-in-the-working-tree.md'), /^# ADR 0232:/);
  assert.match(read('docs/adr/0000-INDEX.md'), /\[0232 — Find the failures the base already had lazily at Close, in the working tree\]\(\.\/0232-lazy-failure-baseline-in-the-working-tree\.md\)/);
});

test('I8: design drafts the Test Command from the shared resolver before tasks.md exists', () => {
  assert.match(read('sai/commands/design/steps/tasks.md'), /Take the draft from the shared resolver[\s\S]{0,400}`test-select\.js`[\s\S]{0,200}pass no `--change`/);
});

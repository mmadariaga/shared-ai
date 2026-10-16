'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const manifest = require('../sai/install-manifest.json');
const registry = require('../sai-state/registry.js');
const { resolveProfile, translate } = require('../bin/capabilities');
const { matrixRenderFor } = require('../bin/install-manifest');

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const fetches = source => source.split(/\r?\n/).filter(line => line.includes('Fetch @'));

const COORDINATORS = ['sai/commands/implement-new/coordinator.md', 'sai/commands/build-new/coordinator.md'];
const WORKER_CARDS = [
  'sai/commands/implement-new/red-worker.md',
  'sai/commands/implement-new/green-worker.md',
  'sai/commands/implement-new/worker-common.md',
];
const STEP_FILES = ['sai/commands/implement-new/steps/red-step.md', 'sai/commands/implement-new/steps/green-step.md'];
const FAMILY_FILES = [...COORDINATORS, ...WORKER_CARDS, ...STEP_FILES];

// Shared orchestration contracts that stop, ask, or recover, and which the family must not load.
const FORBIDDEN_LOADS = [
  'command-runner',
  'worker-core',
  'bounded-recovery',
  'stop-options',
  'unattended-runtime-recovery',
  'no-commit-guard',
  'composition',
];

test('every -new contract file exists and loads none of the shared stopping orchestration', () => {
  for (const file of FAMILY_FILES) {
    const source = read(file);
    for (const name of FORBIDDEN_LOADS) {
      for (const line of fetches(source)) {
        assert.ok(!line.includes(name), `${file} must not fetch ${name}: ${line}`);
      }
    }
    assert.doesNotMatch(source, /@sai\/adapters\//, `${file} must not load a boot adapter`);
  }
});

test('the -new coordinators load only the policies that never stop a run', () => {
  const allowed = [
    '@sai/policies/public-chat.md',
    '@sai/policies/remember.md',
    '@skills/safe-operations/SKILL.md',
    '@sai/policies/prereqs-check.md',
    '@sai/policies/prereqs-paths.md',
    '@sai/policies/tool-resolution.md',
    '@skills/budget-executor/SKILL.md',
    '@sai/policies/artifact-review-contract.md',
    '@sai/policies/finding-state.md',
    '@sai/orchestration/workers/bindings/red-new-worker.md',
    '@sai/orchestration/workers/bindings/green-new-worker.md',
    '@sai/commands/implement-new/coordinator.md',
  ];
  for (const file of COORDINATORS) {
    for (const line of fetches(read(file))) {
      assert.ok(allowed.some(target => line.includes(`Fetch ${target}`)), `${file} fetches an unexpected target: ${line}`);
    }
  }
  const implementNew = read(COORDINATORS[0]);
  for (const target of allowed.slice(0, 7)) {
    assert.ok(implementNew.includes(target), `implement-new coordinator should load ${target}`);
  }
});

test('/sai-build-new chains only /sai-3-implement-new and reserves the review position', () => {
  const build = read(COORDINATORS[1]);
  assert.match(build, /Fetch @sai\/commands\/implement-new\/coordinator\.md/);
  assert.match(build, /\/sai-4-review/);
  assert.match(build, /reserved/);
  assert.doesNotMatch(build, /meta-build|composition\.md/);
  assert.match(build, /Build-new done\./);
});

test('the implement-new coordinator carries the run goals and every pinned edge-case behavior', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /Implement-new done\./);
  assert.match(source, /Cannot start \/sai-3-implement-new for \{name\}: missing/);
  assert.match(source, /never push/i);
  assert.match(source, /deviation/i);
  assert.match(source, /force majeure/i);
  assert.match(source, /baseline/i);
  assert.match(source, /end-to-end suites are never run/i);
  assert.match(source, /red-new-steps@1/);
  assert.match(source, /green-new-steps@1/);
  assert.match(source, /SendMessage/);
  assert.match(source, /task_id/);
  assert.match(source, /git diff --cached --name-only/);
  assert.match(source, /every task is already checked/);
});

test('step commits carry no attribution and the all-checked case runs the suites once', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /no `Co-Authored-By` trailer and no AI-attribution line of any kind, even when the harness suggests one/);
  const start = source.indexOf('## Start');
  const section = source.slice(start, source.indexOf('## The step cycle'));
  const allChecked = section.indexOf('every task is already checked');
  const baseline = section.indexOf('failure baseline');
  assert.ok(allChecked !== -1 && baseline !== -1 && allChecked < baseline,
    'the all-checked close must come before the baseline run');
  assert.equal(section.split('every task is already checked').length - 1, 1);
});

test('RED owns tests and stubs while GREEN owns production code and never writes tests', () => {
  const red = read('sai/commands/implement-new/red-worker.md');
  const green = read('sai/commands/implement-new/green-worker.md');
  assert.match(red, /never write production logic/);
  assert.match(red, /stubs/);
  assert.match(green, /never write tests/);
  assert.match(green, /Test files, fixtures, and `interfaces\.md` are outside your write surface/);
  const common = read('sai/commands/implement-new/worker-common.md');
  assert.match(common, /event: ready/);
  assert.match(common, /Active step: <id> — follow <path>/);
  assert.match(common, /Run no git command that changes the repository/);
});

test('the step machines are registered and deliver one filed step by pointer', () => {
  const expected = {
    'red-new-steps@1': 'sai/commands/implement-new/steps/red-step.md',
    'green-new-steps@1': 'sai/commands/implement-new/steps/green-step.md',
  };
  for (const [id, file] of Object.entries(expected)) {
    assert.ok(registry.has(id), `${id} must be registered`);
    const machine = registry.get(id);
    assert.deepEqual(machine.firstFiled().next.follow, file);
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} must exist`);
    // The coordinator resets the machine before every step, so a reset must repeat the same pointer.
    assert.deepEqual(machine.firstFiled(), machine.firstFiled());
    assert.match(read(COORDINATORS[0]), new RegExp(file.replaceAll('.', '\\.')));
  }
});

test('both workers join the matrix with the budget tier and the execution capability profile', () => {
  const entries = manifest['worker-matrix'].entries.filter(entry => /-new-worker$/.test(entry.workerName));
  assert.deepEqual(entries.map(entry => entry.workerName), ['sai-red-new-worker', 'sai-green-new-worker']);
  for (const entry of entries) {
    assert.equal(entry.tier, 'budget');
    assert.ok(fs.existsSync(path.join(repoRoot, entry.workerContract)), `${entry.workerContract} must exist`);
    assert.equal(manifest.capabilities.assignments.agents[entry.workerName], 'worker-execution');
    assert.equal(entry.claudeAgent.description, entry.opencodeAgent.description);
  }
});

test('both commands hold a coordinator profile that can edit, commit, and delegate to the new workers only', () => {
  for (const [command, profile] of [['sai-3-implement-new', 'implement-new-command'], ['sai-build-new', 'build-new-command']]) {
    assert.equal(manifest.capabilities.assignments.commands[command], profile);
    const resolved = resolveProfile(manifest.capabilities, profile);
    assert.equal(resolved.write, true);
    assert.deepEqual(resolved.shell, ['*']);
    assert.deepEqual(resolved.delegate, ['executor', 'sai-red-new-worker', 'sai-green-new-worker']);
    for (const harness of ['claude', 'opencode']) {
      assert.ok(translate(manifest.capabilities, profile, harness).toolRequirements.some(item => item.capability === 'write'));
    }
  }
});

test('the existing build, implement, and apply wrappers keep their boot adapter', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const file of ['sai-build.md', 'sai-3-implement.md', 'sai-4-apply.md']) {
      assert.match(read(`commands/${harness}/${file}`), new RegExp(`@sai/adapters/${harness}/boot\\.md`), `${harness}/${file}`);
    }
  }
});

test('both commands have usage pages that the references link', () => {
  for (const name of ['sai-3-implement-new', 'sai-build-new']) {
    assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'commands', `${name}.md`)), `docs/commands/${name}.md must exist`);
    assert.match(read('docs/on-demand-commands.md') + read('docs/sequential-pipeline.md') + read('README.md'),
      new RegExp(`docs/commands/${name}\\.md|commands/${name}\\.md`), `${name} must be linked`);
  }
});

test('the coordinator carries the resilience contract: attempt budget, escalation, replacement, resumption, build log', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /implement-new-run@1/);
  assert.match(source, /budget of 3 attempts/);
  assert.match(source, /different from the previous one/);
  assert.match(source, /`exhaustion`, the budget is gone: escalate at once/);
  assert.match(source, /Do not advance to another task first/);
  assert.match(source, /`final-suite` obstacle/);
  assert.match(source, /resets that obstacle's counter/);
  assert.match(source, /one that stops the run/);
  assert.match(source, /a new worker/);
  assert.match(source, /handover-\{role\}-\{k\}\.md/);
  assert.match(source, /\.tmp\/\{name\}\/run-\{unique-suffix\}\//);
  assert.doesNotMatch(source, /system temp directory/);
  assert.match(source, /the run never stages it/);
  assert.doesNotMatch(source, /user commits it/);
  assert.match(source, /## Resuming/);
  assert.match(source, /git log/);
  assert.match(source, /openspec\/changes\/\{name\}\/build-log\.md/);
  for (const part of ['work done', 'deviations', 'overrides', 'pending findings', 'blocker']) {
    assert.ok(source.includes(part), `build-log.md must name ${part}`);
  }
});

test('workers return the path of a report file and the store event keeps free text out', () => {
  const common = read('sai/commands/implement-new/worker-common.md');
  assert.match(common, /return only that path/);
  assert.match(common, /hand-over summary/);
  assert.match(common, /run directory `\.tmp\/\{change-name\}\/run-\*\/`/);
  const coordinator = read(COORDINATORS[0]);
  assert.match(coordinator, /Free text never goes into an event/);
  assert.ok(registry.has('implement-new-run@1'));
});

test('/sai-build-new starts no later segment after a blocked or stopped segment', () => {
  const build = read(COORDINATORS[1]);
  assert.match(build, /blocked/);
  assert.match(build, /do not start any later segment/);
  assert.match(build, /build-log\.md/);
});

test('the coordinator reviews each step adversarially with bounded fix rounds and pending findings', () => {
  const source = read(COORDINATORS[0]);
  const review = source.slice(source.indexOf('**Review.**'), source.indexOf('**Commit.**'));
  assert.match(review, /pipeline-direct-build\.md` Step 2/);
  assert.match(review, /spec fidelity, test gaming, and excess scope/);
  assert.match(review, /Empirical/);
  assert.match(review, /Fetch @sai\/policies\/artifact-review-contract\.md/);
  assert.match(review, /scope observation/);
  assert.match(review, /no test goes through RED first/);
  assert.match(review, /Fix rounds are not attempts/);
  assert.match(review, /at most 3 fix rounds/);
  assert.match(review, /not a failure and not an obstacle, and nothing escalates/);
  assert.match(review, /`findings\.md`/);
  assert.match(review, /Style, design, performance, and general security belong to the later review command/);
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/policies/artifact-review-contract.md')));
  assert.doesNotMatch(read('docs/commands/sai-3-implement-new.md'), /no review round after GREEN/);
});

test('the -new bindings render from the standalone template and leave the lifecycle to the coordinator', () => {
  for (const harness of ['claude', 'opencode']) {
    const bindings = matrixRenderFor(manifest, harness, repoRoot)
      .filter(item => item.kind === 'binding' && /-new$/.test(item.phase));
    assert.deepEqual(bindings.map(item => item.destinationName), ['red-new-worker.md', 'green-new-worker.md'], harness);
    for (const item of bindings) {
      assert.doesNotMatch(item.text, /command-runner|guard window|replacement_reconstruction_fields|continue_after_/, `${harness} ${item.phase}`);
      assert.match(item.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /task\(task_id: "<captured task ID>"/);
      assert.match(item.text, new RegExp(`Fetch @sai/commands/implement-new/${item.phase.replace('-new', '')}-worker\\.md`));
    }
    const shared = matrixRenderFor(manifest, harness, repoRoot).find(item => item.kind === 'binding' && item.phase === 'spec');
    assert.match(shared.text, /command-runner\.md/, 'shared-orchestration bindings keep their lifecycle owner');
  }
});

test('every git add checks the ignore rules, the review sees new files, and the commit proves completeness', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /git check-ignore -q <path>/);
  assert.match(source, /Never force-add with `-f`/);
  assert.match(source, /Every `git add` below follows this rule/);
  const review = source.slice(source.indexOf('**Review.**'), source.indexOf('**Commit.**'));
  assert.match(review, /git diff --cached/);
  assert.doesNotMatch(review, /git diff HEAD/);
  const green = source.slice(source.indexOf('**GREEN.**'), source.indexOf('**Review.**'));
  assert.match(green, /`git add` GREEN's files/);
  const commit = source.slice(source.indexOf('**Commit.**'), source.indexOf('## Workers'));
  assert.match(commit, /`git status --porcelain`, minus the dirty baseline, the run directory, and the ignored paths, must be empty/);
  assert.doesNotMatch(source, /version control ignores the change directory/);
  assert.match(source, /Cannot start \/sai-3-implement-new: name the change/);
});

test('audit reports are applied after the tasks through the step cycle, marked fixed, and never redone', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /Fetch @sai\/policies\/finding-state\.md/);
  const audit = source.slice(source.indexOf('## Audit findings'), source.indexOf('## Workers'));
  for (const report of ['review.md', 'security.md', 'performance.md', 'accessibility.md']) {
    assert.ok(audit.includes(report), `the audit section must name ${report}`);
  }
  assert.match(audit, /after every task is checked/);
  assert.match(audit, /Decide per finding whether it needs RED/);
  assert.match(audit, /fixed mark/);
  assert.match(audit, /neither is done again/);
  assert.match(audit, /A Question stays open/);
  assert.match(source, /no audit report holds an open fixable finding/);
  assert.match(read('sai/commands/implement-new/worker-common.md'), /every fixed mark to the coordinator/);
  assert.match(read('sai/commands/implement-new/steps/red-step.md'), /audit findings instead of tasks/);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const manifest = require('../sai/install-manifest.json');
const registry = require('../sai-state/registry.js');
const { resolveProfile, translate } = require('../bin/capabilities');

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

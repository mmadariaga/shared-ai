'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const registry = require('../sai-state/registry.js');

// Helper: Extract [id, target] pairs from step_pointer_map table
function pointerRows(markdownSection) {
  const rows = [];
  const re = /^\s*\|\s*`([a-z-]+)` \|\s*(.+?)\s*\|$/gm;
  let match;
  while ((match = re.exec(markdownSection)) !== null) {
    const id = match[1];
    let target = match[2].trim();
    // Strip backticks and leading @ from paths; keep 'none' as-is
    if (target === 'none') {
      target = 'none';
    } else if (target.startsWith('`@')) {
      target = target.slice(2, -1); // Remove `@ and trailing `
    }
    rows.push([id, target]);
  }
  return rows;
}

// Discover coordinators that declare step_machine by scanning sai/commands/*/coordinator.md
function discoverStepMachineCoordinators() {
  const coordinatorsDir = path.join(__dirname, '../sai/commands');
  const coordinators = [];

  const entries = fs.readdirSync(coordinatorsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const coordPath = path.join(coordinatorsDir, entry.name, 'coordinator.md');
    if (!fs.existsSync(coordPath)) continue;

    const content = fs.readFileSync(coordPath, 'utf8');
    const stepMachineMatch = content.match(/step_machine:\s*([a-z-]+@\d+)/);
    if (stepMachineMatch) {
      coordinators.push({
        name: entry.name,
        machineId: stepMachineMatch[1],
        coordPath,
        content,
      });
    }
  }

  return coordinators;
}

test('no coordinator card declares a step_machine adapter field any more, and the retired audit machines are gone', () => {
  assert.deepEqual(discoverStepMachineCoordinators().map(coord => coord.name), [],
    'the audit coordinator drives the {audit}-steps@1 machines directly, with no adapter declaration');
  for (const audit of ['security', 'performance', 'accessibility']) {
    assert.equal(registry.has(`${audit}-standalone@1`), false, `${audit}-standalone@1 must be unregistered`);
    assert.equal(fs.existsSync(path.join(__dirname, '..', `sai-state/machines/${audit}-standalone.js`)), false, `${audit}-standalone.js must be retired`);
    assert.equal(registry.has(`${audit}-steps@1`), true, `${audit}-steps@1 must stay registered`);
  }
});

test('step machines own STAGE_FILES with no static pointer tables (source-driven)', () => {
  const expectedSpecStageFiles = {
    'spec-intake': 'none',
    research: 'sai/commands/spec/steps/research.md',
    proposal: 'sai/commands/spec/steps/proposal.md',
    specs: 'sai/commands/spec/steps/specs.md',
    validation: 'sai/commands/spec/steps/validation.md',
  };
  const expectedDesignStageFiles = {
    'design-intake': 'none',
    research: 'sai/commands/design/steps/research.md',
    design: 'sai/commands/design/steps/design.md',
    tasks: 'sai/commands/design/steps/tasks.md',
    interfaces: 'sai/commands/design/steps/interfaces.md',
  };
  for (const [machineId, expected] of [['spec-steps@1', expectedSpecStageFiles], ['design-steps@1', expectedDesignStageFiles]]) {
    const machine = registry.get(machineId);
    assert.ok(machine, `${machineId} must be registered`);
    assert.deepEqual(Array.from(machine.STEPS), Object.keys(expected), `${machineId} steps`);
    for (const [id, target] of Object.entries(expected)) {
      assert.equal(machine.STAGE_FILES[id], target, `${machineId} ${id} pointer must match STAGE_FILES[${id}]`);
    }
  }
  assert.equal(registry.get('design-steps@1').STAGE_FILES.overview, undefined,
    'the overview is a separate continuation, not a step of design-steps@1');
  // The retired phase contracts and machines no longer exist.
  for (const retired of ['sai/policies/spec-phase-contract.md', 'sai/commands/design/phase-contract.md',
    'sai-state/machines/spec-standalone.js', 'sai-state/machines/design-standalone.js']) {
    assert.equal(fs.existsSync(path.join(__dirname, '..', retired)), false, `${retired} must be retired`);
  }
  assert.equal(registry.has('spec-standalone@1'), false);
  assert.equal(registry.has('design-standalone@1'), false);
});

test('spec-steps@1, design-steps@1, and plan-run@1 are properly registered', () => {
  for (const machineId of ['spec-steps@1', 'design-steps@1']) {
    const machine = registry.get(machineId);
    assert.ok(machine, `${machineId} must be registered`);
    assert.equal(machine.machineId, machineId);
    assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
    assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
    assert.ok(machine.initialState, 'must have initialState');
    assert.equal(typeof machine.transition, 'function', 'must have transition function');
    assert.equal(typeof machine.project, 'function', 'must have project function');
  }
  const run = registry.get('plan-run@1');
  assert.ok(run, 'plan-run@1 must be registered');
  assert.equal(run.machineId, 'plan-run@1');
  assert.equal(typeof run.transition, 'function');
  assert.equal(typeof run.project, 'function');
});

for (const audit of ['security', 'performance', 'accessibility']) {
  test(`${audit}-steps@1 machine is registered and routes by pointer, skipped stages included`, () => {
    const id = `${audit}-steps@1`;
    const machine = registry.get(id);
    assert.ok(machine, `${id} must be registered`);
    assert.equal(machine.machineId, id);
    assert.equal(machine.STAGE_FILES[machine.STEPS[0]], 'none', 'the first step runs inline');
    for (const step of machine.STEPS.slice(1)) {
      assert.equal(machine.STAGE_FILES[step], `sai/commands/${audit}/steps/${step}.md`);
    }
    // A batch that skips stages advances the machine past every id it carries.
    const skipped = machine.transition(machine.initialState, { step_ids: machine.STEPS.slice(0, -1) });
    assert.equal(skipped.state.stage, machine.STEPS[machine.STEPS.length - 1]);
    assert.equal(skipped.next.follow, machine.STAGE_FILES[machine.STEPS[machine.STEPS.length - 1]]);
  });
}

// ─── First pointer with the task disclosure (step-pointer-with-task) ────────

function readRepo(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('the first-pointer rule is stated once, phase-neutral, in the three shared surfaces', () => {
  const runner = readRepo('sai/orchestration/command-runner.md');
  const stageMachine = readRepo('sai/policies/stage-machine.md');
  const workerCore = readRepo('sai/orchestration/worker-core.md');

  assert.match(runner, /\*\*First pointer with the task\.\*\*/);
  assert.match(runner, /first line[\s\S]{0,120}task-disclosure continuation|task-disclosure continuation[\s\S]{0,200}first line/);
  assert.match(runner, /reports both ids in one progress\s+event/);
  assert.match(runner, /no per-phase exception/);
  assert.match(stageMachine, /\{stage, next: \{follow, hint\}\}` for its first filed step/);
  assert.match(stageMachine, /phase-neutral/);
  assert.match(workerCore, /## Step-machine task disclosure/);
  assert.match(workerCore, /carries both ids in plan order/);
  assert.match(workerCore, /Do not follow the pointer and emit no progress\s+event/,
    'a resolution failure returns before research with no progress event (E6)');
});

test('replacement before the first progress event reconstructs with the first filed step as active (E8)', () => {
  const runner = readRepo('sai/orchestration/command-runner.md');
  const stageMachine = readRepo('sai/policies/stage-machine.md');
  assert.match(runner, /before the first progress event it is the first filed step from the\s+`reset` response, never the fileless first step and never a `none` pointer/);
  assert.match(stageMachine, /Before the first progress event, that active step is the first filed step/);
});

test('the audit coordinator sends the first filed pointer with the task disclosure', () => {
  const coordinator = readRepo('sai/commands/audit/coordinator.md');
  assert.match(coordinator, /`reset` `\{audit\}-steps@1`/);
  assert.match(coordinator, /The `reset` response names the first pointer/);
  assert.match(coordinator, /The task message opens with the first pointer line, `Active step: <stage> — follow <pointer>`/);
  for (const audit of ['security', 'performance', 'accessibility']) {
    const second = registry.get(`${audit}-steps@1`).firstFiled().stage;
    assert.ok(fs.existsSync(path.join(__dirname, '..', `sai/commands/${audit}/steps/${second}.md`)), `${audit} first filed step ${second} has its step file`);
  }
});

test('the plan commands deliver the first filed pointer with the task message and advance the machines per report', () => {
  const cycle = readRepo('sai/commands/plan/cycle.md');
  assert.match(cycle, /`reset` the segment's step machine; the response names the first filed step/);
  assert.match(cycle, /The task message opens with `Active step: <stage> — follow <next\.follow>`/);
  assert.match(cycle, /emit `\{"step_ids": \[\.\.\.\]\}` to the machine/);
  for (const [name, machineId] of [['spec', 'spec-steps@1'], ['design', 'design-steps@1']]) {
    const coordinator = readRepo(`sai/commands/${name}/coordinator.md`);
    assert.ok(coordinator.includes(machineId), `${name} coordinator should reset ${machineId}`);
    const second = registry.get(machineId).firstFiled().stage;
    assert.ok(coordinator.includes(`\`${second}\``), `${name} coordinator should list the static fallback order`);
    const common = readRepo(`sai/commands/${name}/steps/common.md`);
    assert.match(common, /first line of the task message/, `${name} common.md should carry the step-delivery rule`);
    assert.match(common, /in the first report/, `${name} common.md should report both ids together`);
  }
});

test('every audit worker adopts the shared pointer rule and reports the scope step with the first filed step', () => {
  const shared = readRepo('sai/commands/audit/worker-common.md');
  assert.match(shared, /Each message opens with the pointer line `Active step: <id> — follow <path>`/);
  assert.match(shared, /The first batch carries the scope step with the first filed step/);
  for (const name of ['security', 'performance', 'accessibility']) {
    const worker = readRepo(`sai/commands/${name}/worker.md`);
    const common = readRepo(`sai/commands/${name}/steps/common.md`);
    assert.match(worker, /Fetch @sai\/commands\/audit\/worker-common\.md/, `${name} worker should load the shared rules`);
    assert.doesNotMatch(worker, /Startup Handshake|worker-core\.md|§ Step-machine task disclosure/, `${name} worker keeps no shared-orchestration rule`);
    assert.doesNotMatch(common, /progress event|worker contract's Active Step Execution/, `${name} common.md keeps no progress-event rule`);
    const machine = require(`../sai-state/machines/${name}-steps.js`);
    assert.match(worker, new RegExp(`\`${machine.STEPS[0]}\` — no file`), `${name} worker runs the fileless first step inline`);
  }
});


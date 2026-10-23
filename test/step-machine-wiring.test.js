'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const registry = require('../sai-state/registry.js');

// Helper: Extract step ids from progress plan format: "- `id` — \"label\""
function planIds(markdownSection) {
  const ids = [];
  const re = /^\s*- `([a-z-]+)` — "/gm;
  let match;
  while ((match = re.exec(markdownSection)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

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

test('discovered coordinators have registered step machines and fetch stage-machine.md', () => {
  const coordinators = discoverStepMachineCoordinators();
  assert.ok(coordinators.length > 0, 'should discover at least one coordinator with step_machine');

  // The shared-orchestration audit phases declare a step_machine. The spec and design
  // commands run outside the shared orchestration and drive their machines from their own cards.
  const names = coordinators.map(c => c.name).sort();
  const expectedPhases = ['accessibility', 'performance', 'security'];
  assert.deepEqual(names, expectedPhases, 'must discover exactly performance, security, and accessibility');

  for (const coord of coordinators) {
    assert.ok(registry.has(coord.machineId), `${coord.machineId} must be registered in sai-state/registry.js`);
    assert.ok(coord.content.includes('Fetch @sai/policies/stage-machine.md'), `${coord.name} must load stage-machine.md`);
    const machine = registry.get(coord.machineId);
    assert.ok(machine, `${coord.machineId} should be retrievable from registry`);
  }
});

test('coordinator progress plans match their registered machines (source-driven)', () => {
  const coordinators = discoverStepMachineCoordinators();
  for (const coord of coordinators) {
    const machine = registry.get(coord.machineId);
    assert.ok(machine, `${coord.machineId} must be registered`);
    const extractedIds = planIds(coord.content);
    assert.deepEqual(extractedIds, machine.STEPS, `${coord.name} progress plan ids must match machine STEPS`);
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

test('security-standalone@1 machine is properly registered', () => {
  const machine = registry.get('security-standalone@1');
  assert.ok(machine, 'security-standalone@1 must be registered');
  assert.equal(machine.machineId, 'security-standalone@1');
  assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.ok(machine.initialState, 'must have initialState');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');
});

test('performance-standalone@1 machine is properly registered', () => {
  const machine = registry.get('performance-standalone@1');
  assert.ok(machine, 'performance-standalone@1 must be registered');
  assert.equal(machine.machineId, 'performance-standalone@1');
  assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.ok(machine.initialState, 'must have initialState');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');
});

test('accessibility-standalone@1 machine is properly registered', () => {
  const machine = registry.get('accessibility-standalone@1');
  assert.ok(machine, 'accessibility-standalone@1 must be registered');
  assert.equal(machine.machineId, 'accessibility-standalone@1');
  assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.ok(machine.initialState, 'must have initialState');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');
});

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

test('every step-machine coordinator sends the first filed pointer with the task disclosure', () => {
  const coordinators = discoverStepMachineCoordinators();
  assert.equal(coordinators.length, 3, 'three step-machine coordinators should be discovered');
  for (const { name, machineId, content } of coordinators) {
    const mod = registry.get(machineId);
    const second = mod.firstFiled().stage;
    assert.match(content, new RegExp("first filed step's pointer \\(`" + second + '`\\)'),
      `${name} coordinator should name its first filed step ${second}`);
    assert.match(content, /post-ready task disclosure/, `${name} coordinator should send it in the task disclosure`);
    assert.match(content, /Before the first progress event, the worker's `active_step_id` is that step/,
      `${name} coordinator should set active_step_id for early replacement`);
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

test('every step-machine worker and common.md adopt the task-disclosure pointer rule', () => {
  for (const name of ['security', 'performance', 'accessibility']) {
    const worker = readRepo(`sai/commands/${name}/worker.md`);
    const common = readRepo(`sai/commands/${name}/steps/common.md`);
    assert.match(worker, /§ Step-machine task disclosure/, `${name} worker should reference the shared rule`);
    // Security and performance state the pointer rule once, in their worker card; their common.md carries no pointer rule.
    if (name === 'security' || name === 'performance') {
      assert.match(worker, /Each progress-event continuation carries one pointer line/, `${name} worker should carry the step-delivery rule`);
      assert.doesNotMatch(common, /first line of the task-disclosure continuation/, `${name} common.md should not repeat the step-delivery rule`);
    } else {
      assert.match(common, /first line of the task-disclosure continuation/, `${name} common.md should carry the step-delivery rule`);
      assert.match(common, /in the first progress event/, `${name} common.md should report both ids together`);
    }
    assert.doesNotMatch(worker, /is the Startup Handshake/, `${name} worker should no longer return the first step alone`);
  }
});


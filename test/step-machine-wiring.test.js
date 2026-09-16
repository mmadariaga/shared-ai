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

  // Must discover exactly spec, design, implement, performance, review, security, and accessibility
  const names = coordinators.map(c => c.name).sort();
  const expectedPhases = ['accessibility', 'design', 'implement', 'performance', 'review', 'security', 'spec'];
  assert.deepEqual(names, expectedPhases, 'must discover exactly spec, design, implement, performance, review, security, and accessibility');

  for (const coord of coordinators) {
    assert.ok(registry.has(coord.machineId), `${coord.machineId} must be registered in sai-state/registry.js`);
    assert.ok(coord.content.includes('Fetch @sai/policies/stage-machine.md'), `${coord.name} must load stage-machine.md`);
    const machine = registry.get(coord.machineId);
    assert.ok(machine, `${coord.machineId} should be retrievable from registry`);
  }
});

test('coordinator progress plans match their registered machines (source-driven)', () => {
  const coordinators = discoverStepMachineCoordinators();
  const specPhaseContract = fs.readFileSync(path.join(__dirname, '../sai/policies/spec-phase-contract.md'), 'utf8');
  const designPhaseContract = fs.readFileSync(path.join(__dirname, '../sai/commands/design/phase-contract.md'), 'utf8');

  for (const coord of coordinators) {
    const machine = registry.get(coord.machineId);
    assert.ok(machine, `${coord.machineId} must be registered`);

    let extractedIds;
    if (coord.name === 'spec') {
      // Extract from spec-phase-contract.md SpecProgressPlan section
      const specPlanMatch = specPhaseContract.match(/### `SpecProgressPlan`[\s\S]*?(?=### )/);
      assert.ok(specPlanMatch, 'spec-phase-contract.md should have SpecProgressPlan section');
      extractedIds = planIds(specPlanMatch[0]);
      assert.deepEqual(extractedIds, machine.STEPS, `${coord.name} progress plan ids must match machine STEPS`);
    } else if (coord.name === 'design') {
      // Extract unopted and opted variants from design phase-contract.md
      const designPlanMatch = designPhaseContract.match(/### `DesignProgressPlan`[\s\S]*?(?=### )/);
      assert.ok(designPlanMatch, 'design phase-contract.md should have DesignProgressPlan section');

      // Look for opted-in plan block (comes first in the text)
      const optedMatch = designPlanMatch[0].match(/\*\*Opted-in plan[\s\S]*?(?=\*\*Unopted|###)/);
      assert.ok(optedMatch, 'design phase-contract should have opted-in plan block');
      const optedIds = planIds(optedMatch[0]);
      assert.deepEqual(optedIds, machine.OPTED_IN_STEPS, 'design opted-in ids must match OPTED_IN_STEPS');

      // Look for unopted plan block (comes second in the text)
      const unoptedMatch = designPlanMatch[0].match(/\*\*Unopted plan[\s\S]*?(?=###|$)/);
      assert.ok(unoptedMatch, 'design phase-contract should have unopted plan block');
      const unoptedIds = planIds(unoptedMatch[0]);
      assert.deepEqual(unoptedIds, machine.UNOPTED_STEPS, 'design unopted ids must match UNOPTED_STEPS');
    } else if (coord.name === 'implement' || coord.name === 'performance' || coord.name === 'review' || coord.name === 'security' || coord.name === 'accessibility') {
      // Extract from coordinator card itself
      extractedIds = planIds(coord.content);
      assert.deepEqual(extractedIds, machine.STEPS, `${coord.name} progress plan ids must match machine STEPS`);
    }
  }
});

test('step machines own STAGE_FILES with no static pointer tables (source-driven)', () => {
  const coordinators = discoverStepMachineCoordinators();
  const specPhaseContract = fs.readFileSync(path.join(__dirname, '../sai/policies/spec-phase-contract.md'), 'utf8');
  const designPhaseContract = fs.readFileSync(path.join(__dirname, '../sai/commands/design/phase-contract.md'), 'utf8');

  assert.doesNotMatch(specPhaseContract, /### `SpecStepPointerMap`/,
    'spec-phase-contract.md should not retain the static SpecStepPointerMap table');
  assert.doesNotMatch(designPhaseContract, /### `DesignStepPointerMap`/,
    'design phase-contract.md should not retain the static DesignStepPointerMap table');
  assert.match(specPhaseContract, /spec-standalone@1/,
    'spec-phase-contract.md should route via the spec step machine');
  assert.match(designPhaseContract, /design-standalone@1/,
    'design phase-contract.md should route via the design step machine');

  const expectedSpecStageFiles = {
    'prereqs-and-change': 'none',
    research: 'sai/commands/spec/steps/research.md',
    proposal: 'sai/commands/spec/steps/proposal.md',
    specs: 'sai/commands/spec/steps/specs.md',
    validation: 'sai/commands/spec/steps/validation.md',
    review: 'sai/commands/spec/steps/review.md',
  };
  const expectedDesignStageFiles = {
    'prereqs-resolution': 'none',
    research: 'sai/commands/design/steps/research.md',
    design: 'sai/commands/design/steps/design.md',
    tasks: 'sai/commands/design/steps/tasks.md',
    interfaces: 'sai/commands/design/steps/interfaces.md',
    review: 'sai/commands/design/steps/review.md',
    overview: 'sai/commands/design/steps/overview.md',
  };

  for (const coord of coordinators) {
    const machine = registry.get(coord.machineId);
    assert.ok(machine, `${coord.machineId} must be registered`);

    if (coord.name === 'spec') {
      const machineSteps = Array.from(machine.STEPS).sort();
      assert.deepEqual(machineSteps, Object.keys(expectedSpecStageFiles).sort(),
        'spec machine STEPS must cover the canonical six steps');
      for (const [id, target] of Object.entries(expectedSpecStageFiles)) {
        assert.equal(machine.STAGE_FILES[id], target,
          `spec ${id} pointer must match STAGE_FILES[${id}]`);
      }
    } else if (coord.name === 'design') {
      const machineOptedSteps = Array.from(machine.OPTED_IN_STEPS).sort();
      assert.deepEqual(machineOptedSteps, Object.keys(expectedDesignStageFiles).sort(),
        'design machine OPTED_IN_STEPS must cover the canonical seven steps');
      for (const [id, target] of Object.entries(expectedDesignStageFiles)) {
        assert.equal(machine.STAGE_FILES[id], target,
          `design ${id} pointer must match STAGE_FILES[${id}]`);
      }
    }
    // Note: all seven phases use step_machine; no phase retains a static step_pointer_map table
  }
});

test('spec-standalone@1 machine is properly registered', () => {
  const machine = registry.get('spec-standalone@1');
  assert.ok(machine, 'spec-standalone@1 must be registered');
  assert.equal(machine.machineId, 'spec-standalone@1');
  assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.ok(machine.initialState, 'must have initialState');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');
});

test('design-standalone@1 machine is properly registered', () => {
  const machine = registry.get('design-standalone@1');
  assert.ok(machine, 'design-standalone@1 must be registered');
  assert.equal(machine.machineId, 'design-standalone@1');
  assert.ok(machine.UNOPTED_STEPS, 'must have UNOPTED_STEPS array');
  assert.ok(machine.OPTED_IN_STEPS, 'must have OPTED_IN_STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');
});

test('implement-standalone@1 machine is properly registered', () => {
  const machine = registry.get('implement-standalone@1');
  assert.ok(machine, 'implement-standalone@1 must be registered');
  assert.equal(machine.machineId, 'implement-standalone@1');
  assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.ok(machine.initialState, 'must have initialState');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');
});

test('review-standalone@1 machine is properly registered', () => {
  const machine = registry.get('review-standalone@1');
  assert.ok(machine, 'review-standalone@1 must be registered');
  assert.equal(machine.machineId, 'review-standalone@1');
  assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.ok(machine.initialState, 'must have initialState');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');
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

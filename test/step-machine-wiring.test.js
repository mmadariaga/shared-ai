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

  // Must discover exactly spec, design, implement, and review
  const names = coordinators.map(c => c.name).sort();
  const expectedPhases = ['design', 'implement', 'review', 'spec'];
  assert.deepEqual(names, expectedPhases, 'must discover exactly spec, design, implement, and review');

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
    } else if (coord.name === 'implement' || coord.name === 'review') {
      // Extract from coordinator card itself
      extractedIds = planIds(coord.content);
      assert.deepEqual(extractedIds, machine.STEPS, `${coord.name} progress plan ids must match machine STEPS`);
    }
  }
});

test('step pointer maps match machine STAGE_FILES (source-driven)', () => {
  const coordinators = discoverStepMachineCoordinators();
  const specPhaseContract = fs.readFileSync(path.join(__dirname, '../sai/policies/spec-phase-contract.md'), 'utf8');
  const designPhaseContract = fs.readFileSync(path.join(__dirname, '../sai/commands/design/phase-contract.md'), 'utf8');

  for (const coord of coordinators) {
    const machine = registry.get(coord.machineId);
    assert.ok(machine, `${coord.machineId} must be registered`);

    let extractedRows;
    if (coord.name === 'spec') {
      // Extract from spec-phase-contract.md SpecStepPointerMap section
      const specMapMatch = specPhaseContract.match(/### `SpecStepPointerMap`[\s\S]*?(?=### )/);
      assert.ok(specMapMatch, 'spec-phase-contract.md should have SpecStepPointerMap section');
      extractedRows = pointerRows(specMapMatch[0]);

      // Verify pointer rows match STAGE_FILES
      for (const [id, target] of extractedRows) {
        assert.equal(target, machine.STAGE_FILES[id],
          `spec ${id} pointer must match STAGE_FILES[${id}]`);
      }
      // Verify coverage: extracted rows must cover all steps
      const rowIds = extractedRows.map(r => r[0]).sort();
      const machineSteps = Array.from(machine.STEPS).sort();
      assert.deepEqual(rowIds, machineSteps,
        'spec pointer map rows must cover all STEPS');
    } else if (coord.name === 'design') {
      // Extract from design phase-contract.md DesignStepPointerMap section
      const designMapMatch = designPhaseContract.match(/### `DesignStepPointerMap`[\s\S]*?(?=## )/);
      assert.ok(designMapMatch, 'design phase-contract.md should have DesignStepPointerMap section');
      extractedRows = pointerRows(designMapMatch[0]);

      // Verify pointer rows match STAGE_FILES
      for (const [id, target] of extractedRows) {
        assert.equal(target, machine.STAGE_FILES[id],
          `design ${id} pointer must match STAGE_FILES[${id}]`);
      }
      // Verify coverage: extracted rows must cover opted-in steps (design variant)
      const rowIds = extractedRows.map(r => r[0]).sort();
      const machineOptedSteps = Array.from(machine.OPTED_IN_STEPS).sort();
      assert.deepEqual(rowIds, machineOptedSteps,
        'design pointer map rows must cover all OPTED_IN_STEPS');
    }
    // Note: implement and review do not have step_pointer_map tables; they use step_machine
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

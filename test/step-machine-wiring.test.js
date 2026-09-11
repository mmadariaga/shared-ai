'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const registry = require('../sai-state/registry.js');

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

test('discovered coordinators have registered step machines', () => {
  const coordinators = discoverStepMachineCoordinators();
  assert.ok(coordinators.length > 0, 'should discover at least one coordinator with step_machine');

  // In this change, only spec and design should be discovered
  const names = coordinators.map(c => c.name);
  assert.ok(names.includes('spec'), 'spec coordinator should declare step_machine');
  assert.ok(names.includes('design'), 'design coordinator should declare step_machine');

  for (const coord of coordinators) {
    assert.ok(registry.has(coord.machineId), `${coord.machineId} must be registered in sai-state/registry.js`);
    assert.ok(coord.content.includes('Fetch @sai/policies/stage-machine.md'), `${coord.name} must load stage-machine.md`);
  }
});

test('spec-standalone@1 is registered and configured correctly', () => {
  const machine = registry.get('spec-standalone@1');
  assert.ok(machine, 'spec-standalone@1 must be registered');
  assert.equal(machine.machineId, 'spec-standalone@1');
  assert.ok(Array.isArray(machine.STEPS), 'must have STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.ok(machine.initialState, 'must have initialState');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');

  // Verify expected steps exist
  const expectedSteps = ['prereqs-and-change', 'research', 'proposal', 'specs', 'validation', 'review'];
  assert.deepEqual(machine.STEPS, expectedSteps, 'spec steps must match spec-phase-contract');

  // Verify stage files are correct
  assert.equal(machine.STAGE_FILES['prereqs-and-change'], 'none');
  assert.ok(machine.STAGE_FILES.research.includes('research.md'));
  assert.ok(machine.STAGE_FILES.review.includes('review.md'));
});

test('design-standalone@1 is registered and configured correctly', () => {
  const machine = registry.get('design-standalone@1');
  assert.ok(machine, 'design-standalone@1 must be registered');
  assert.equal(machine.machineId, 'design-standalone@1');
  assert.ok(machine.UNOPTED_STEPS, 'must have UNOPTED_STEPS array');
  assert.ok(machine.OPTED_IN_STEPS, 'must have OPTED_IN_STEPS array');
  assert.ok(machine.STAGE_FILES, 'must have STAGE_FILES');
  assert.equal(typeof machine.transition, 'function', 'must have transition function');
  assert.equal(typeof machine.project, 'function', 'must have project function');

  // Verify variant steps
  const unopted = ['prereqs-resolution', 'research', 'design', 'tasks', 'interfaces', 'review'];
  const opted = ['prereqs-resolution', 'research', 'design', 'tasks', 'interfaces', 'review', 'overview'];
  assert.deepEqual(machine.UNOPTED_STEPS, unopted, 'unopted variant must match design phase contract');
  assert.deepEqual(machine.OPTED_IN_STEPS, opted, 'opted variant must match design phase contract');

  // Verify stage files
  assert.equal(machine.STAGE_FILES['prereqs-resolution'], 'none');
  assert.ok(machine.STAGE_FILES.research.includes('research.md'));
  assert.ok(machine.STAGE_FILES.overview.includes('overview.md'));
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../sai/install-manifest.json');
const { defineWorkerMatrix } = require('../bin/worker-matrix.js');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

test('the plan RED is a pinned matrix worker with its own card, model, and design-owned binding', () => {
  const entry = manifest['worker-matrix'].entries.find(item => item.workerName === 'sai-2-red-worker');
  assert.ok(entry, 'the matrix declares sai-2-red-worker');
  assert.equal(entry.phase, 'design-red');
  assert.equal(entry.workerContract, 'sai/commands/design/red-worker.md');
  assert.equal(entry.bindingStem, 'design-red');
  assert.ok(defineWorkerMatrix(manifest['worker-matrix'].entries));
  const fixRed = manifest['worker-matrix'].entries.find(item => item.workerName === 'sai-3-red-worker');
  assert.notEqual(entry.workerContract, fixRed.workerContract, 'the plan RED never shares the fix RED contract');
  assert.equal(manifest.capabilities.assignments.agents['sai-2-red-worker'], 'worker-execution');
  for (const profile of ['design-command', 'plan-command']) {
    assert.ok(manifest.capabilities.profiles[profile].delegate.includes('sai-2-red-worker'), profile);
  }
  assert.match(read('sai/commands/design/red-worker.md'), /Fetch `@sai\/commands\/implement\/worker-common\.md` and follow it exactly\./);
});

test('telemetry attributes the plan RED to Design and the fix RED and GREEN to the implement segment', () => {
  assert.match(read('sai/tools/change-telemetry.js'), /'sai-2-red-worker': 'design'/);
  assert.match(read('sai/tools/change-telemetry.js'), /'sai-3-red-worker': 'implement'/);
  assert.match(read('sai/tools/retrospective.js'), /'sai-2-red-worker': 'design'/);
});

test('the design step machine loses the interfaces step and the red-steps machine serves both RED briefs', () => {
  const design = require('../sai-state/machines/design-steps.js');
  assert.deepEqual(Array.from(design.STEPS), ['design-intake', 'research', 'design', 'tasks']);
  const red = read('sai/commands/implement/steps/red-step.md');
  assert.match(red, /## Plan brief/);
  assert.match(red, /## Finding brief/);
  assert.match(red, /\[regression guard\]/);
});

test('the interfaces and change-overview artifacts retired from the schema, the templates, and the tools', () => {
  const schema = read('openspec/schemas/sai-workflow/schema.yaml');
  assert.doesNotMatch(schema, /id: interfaces|id: change-overview/);
  for (const file of ['openspec/schemas/sai-workflow/templates/interfaces.md', 'openspec/schemas/sai-workflow/templates/change-overview.md',
    'sai/commands/design/steps/interfaces.md', 'sai/commands/design/steps/overview.md', 'sai/commands/design/change-overview.md',
    'sai/policies/step-contract-format.md']) {
    assert.equal(exists(file), false, `${file} retired`);
  }
  assert.doesNotMatch(read('sai/tools/plan-publication.js'), /interfaces\.md|change-overview/);
  assert.doesNotMatch(read('sai/tools/status.js'), /interfaces|change-overview/);
});

test('the design coordinator runs the plan RED phase and accepts only tests that are red by assertion', () => {
  const design = read('sai/commands/design/coordinator.md');
  assert.match(design, /red by assertion/);
  assert.match(design, /\[regression guard\]/);
  assert.match(design, /create no plan RED worker/);
  assert.match(design, /`test\(plan\): add failing tests for \{name\}`/);
  assert.match(design, /--overview-lang[^\n]*no longer exists/);
});

test('the implement coordinator stops on an earlier-format plan and checks the plan tests at start', () => {
  const implement = read('sai/commands/implement/coordinator.md');
  assert.match(implement, /its plan has no plan tests\. Run \/sai-2-design \{name\} again\./);
  assert.match(implement, /obstacle `plan-tests`/);
  assert.match(implement, /the fix RED only when a finding needs a test/);
});

test('the explore Plan route and the plan coordinator carry no overview language', () => {
  assert.doesNotMatch(read('sai/commands/explore/steps/pipeline-plan-unattended.md'), /overview/i);
  assert.doesNotMatch(read('sai/commands/plan/coordinator.md'), /--overview-lang <language>/);
  assert.match(read('sai/commands/explore/body.md'), /Unknown option --overview-lang/);
});

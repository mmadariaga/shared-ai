'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const phases = [
  ['security', 'resolve-security-scope', 'discover-module-map'],
  ['performance', 'resolve-performance-scope', 'map-stack-hot-paths'],
  ['accessibility', 'resolve-accessibility-scope', 'map-ui-framework'],
];

test('audits keep the proposal gate in the shared coordinator without environment prerequisite startup', () => {
  const coordinator = read('sai/commands/audit/coordinator.md');
  assert.ok(coordinator.includes('Cannot start {command} for {name}: missing proposal.md.'));
  assert.doesNotMatch(coordinator, /Fetch @sai\/policies\/prereqs(?:-check)?\.md|prereqs\.js/);
  const workerCommon = read('sai/commands/audit/worker-common.md');
  assert.doesNotMatch(workerCommon, /Fetch @sai\/policies\/prereqs(?:-check)?\.md|prereqs\.js/);
  for (const [phase, startup, firstFiled] of phases) {
    const worker = read(`sai/commands/${phase}/worker.md`);
    assert.match(worker, /Fetch @sai\/commands\/audit\/worker-common\.md/);
    assert.doesNotMatch(worker, /startup act \(prerequisite checks|the three steps above/);
    assert.doesNotMatch(worker, /proposal\.md not found/, 'the coordinator owns the proposal gate');
    assert.ok(worker.includes(`\`${startup}\``));
    assert.ok(worker.includes(`together with \`${firstFiled}\``));
    const common = read(`sai/commands/${phase}/steps/common.md`);
    assert.match(common, /Fetch @skills\/budget-ro\/SKILL\.md/);
    assert.doesNotMatch(common, /Fetch @skills\/budget\/SKILL\.md/);
    for (const content of [worker, common]) {
      assert.doesNotMatch(content, /Fetch @sai\/policies\/prereqs(?:-check)?\.md|prereqs\.js/);
    }
  }
});

test('deep-review retains the artifact table without a preflight', () => {
  const coordinator = read('sai/commands/deep-review/coordinator.md');
  assert.match(coordinator, /## Artifact paths/);
  assert.match(coordinator, /runs no OpenSpec prerequisite check/);
  assert.match(coordinator, /Fetch @sai\/policies\/prereqs-paths\.md/);
  assert.doesNotMatch(coordinator, /Fetch @sai\/policies\/prereqs(?:-check)?\.md|prereqs\.js/);
});

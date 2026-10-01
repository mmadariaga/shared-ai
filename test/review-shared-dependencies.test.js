'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const phases = [
  ['review', 'resolve-change', 'establish-diff-scope'],
  ['security', 'resolve-security-scope', 'discover-module-map'],
  ['performance', 'resolve-performance-scope', 'map-stack-hot-paths'],
  ['accessibility', 'resolve-accessibility-scope', 'map-ui-framework'],
];

test('review and audits keep proposal gates without environment prerequisite startup', () => {
  for (const [phase, startup, firstFiled] of phases) {
    const worker = read(`sai/commands/${phase}/worker.md`);
    assert.match(worker, /OpenSpec prerequisite checks belong to `\/sai-explore` alone/);
    assert.match(worker, /This worker runs no such check/);
    assert.doesNotMatch(worker, /startup act \(prerequisite checks|the three steps above/);
    assert.ok(worker.includes('openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.'));
    assert.ok(worker.includes(`first delivered pointer targets \`${firstFiled}\``)
      || worker.includes(`first delivered pointer targeting \`${firstFiled}\``));
    assert.ok(worker.includes(`\`${startup}\``));
    assert.match(worker, /first line of the task-disclosure continuation, before `arguments_value`/);
    assert.match(worker, /reports (?:together with|in one batch together with)/);
    const common = read(`sai/commands/${phase}/steps/common.md`);
    assert.match(common, /Fetch @skills\/budget-ro\/SKILL\.md/);
    assert.doesNotMatch(common, /Fetch @skills\/budget\/SKILL\.md/);
    for (const content of [worker, common]) {
      assert.doesNotMatch(content, /Fetch @sai\/policies\/prereqs(?:-check)?\.md|prereqs\.js/);
    }
    assert.ok(common.includes(`report \`${startup}\` and \`${firstFiled}\` together`));
  }
});

test('meta-review retains the artifact table without a preflight', () => {
  const coordinator = read('sai/commands/meta-review/coordinator.md');
  assert.match(coordinator, /## Artifact paths/);
  assert.match(coordinator, /runs no OpenSpec prerequisite check/);
  assert.match(coordinator, /Fetch @sai\/policies\/prereqs-paths\.md/);
  assert.doesNotMatch(coordinator, /Fetch @sai\/policies\/prereqs(?:-check)?\.md|prereqs\.js/);
});

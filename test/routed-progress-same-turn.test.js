'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

for (const [harness, panel, continuation] of [
  ['claude', 'TaskUpdate', 'SendMessage'],
  ['opencode', 'todowrite', 'task'],
]) {
  test(`${harness} batches only progress continuation and preserves panel degradation`, () => {
    const binding = read(`sai/adapters/${harness}/panel-render.md`);
    assert.match(binding, /routed progress-event continuation is the sole exception/);
    assert.ok(binding.includes(panel));
    assert.ok(binding.includes(continuation));
    assert.match(binding, /same assistant turn/);
    assert.match(binding, /Other tool or contract errors remain failures/);
    assert.match(binding, /exactly one visible notice/);
    assert.match(binding, /stop panel calls for the rest of the invocation/);
  });
}

test('no-op events render nothing and milestone stamps retain their validator source', () => {
  const policy = read('sai/policies/todo-structure.md');
  assert.match(policy, /re-render the full list in the same assistant turn as worker continuation/);
  assert.match(policy, /performs no render and stamps nothing/);
  assert.match(policy, /`emit --progress` response/);
  assert.match(policy, /The render precedes the dispatch call itself/);
});

test('existing dependency work remains installed without expanding review/audit consumers', () => {
  for (const harness of ['claude', 'opencode']) {
    const fetch = read(`skills/${harness}/fetch/SKILL.md`);
    assert.match(fetch, /probes the project-local `sai\/` root exactly once/);
    assert.match(fetch, /Probed and found absent/);
  }
  for (const phase of ['review', 'security', 'performance', 'accessibility']) {
    assert.match(read(`sai/commands/${phase}/steps/common.md`), /Fetch @skills\/budget-ro\/SKILL\.md/);
    const worker = read(`sai/commands/${phase}/worker.md`);
    assert.doesNotMatch(worker, /Fetch @sai\/policies\/prereqs-check\.md|prereqs\.js/);
  }
  assert.doesNotMatch(read('sai/commands/deep-review/coordinator.md'), /Fetch @sai\/policies\/prereqs/);
});

test('combined startup retains failure, legitimate early-outcome and reconstruction contracts', () => {
  assert.match(read('sai/commands/accessibility/worker.md'), /When the scope holds no UI file, the audit does not apply, even with `--runtime`: the first batch also carries `resolve-static-audit` and `resolve-runtime-audit`/);
  const design = require('../sai-state/machines/design-steps.js');
  assert.equal(design.firstFiled().stage, 'research');
  const first = design.transition(design.initialState, { step_ids: ['design-intake', 'research'] });
  assert.deepEqual(first.state.done, ['design-intake', 'research']);
  assert.equal(first.state.stage, 'design');
  const later = design.transition(first.state, { step_ids: ['design'] });
  assert.equal(design.project(JSON.parse(JSON.stringify(later.state))).next.follow, design.STAGE_FILES.tasks);
});

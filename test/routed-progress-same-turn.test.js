'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('progress validation and registration precede independent same-turn presentation and continuation', () => {
  const runner = read('sai/orchestration/command-runner.md');
  assert.match(runner, /After validation and registration, issue the independent panel updates and same-worker continuation in one assistant turn/);
  assert.match(runner, /Do not wait for the panel result before issuing the continuation/);
  assert.match(runner, /initial render still precedes the first dispatch/);
  assert.doesNotMatch(runner, /before continuing, so the user sees the mark|before sending\s+the two-line continuation/);
  assert.match(runner, /no new guard window/);
});

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

test('all seven coordinators defer progress batching to the runner without a render-first override', () => {
  for (const phase of ['spec', 'design', 'implement', 'review', 'security', 'performance', 'accessibility']) {
    const card = read(`sai/commands/${phase}/coordinator.md`);
    assert.doesNotMatch(card, /through the shared command runner before worker continuation/, phase);
    assert.match(card, /command-runner\.md/, phase);
  }
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
    if (phase !== 'review' && phase !== 'security' && phase !== 'performance') assert.match(worker, /OpenSpec prerequisite checks belong to `\/sai-explore` alone/);
    assert.doesNotMatch(worker, /Fetch @sai\/policies\/prereqs-check\.md|prereqs\.js/);
  }
  assert.match(read('sai/commands/meta-review/coordinator.md'), /runs no OpenSpec prerequisite check/);
});

test('combined startup retains failure, legitimate early-outcome and reconstruction contracts', () => {
  const core = read('sai/orchestration/worker-core.md');
  assert.match(core, /return its terminal status\. Do not follow the pointer and emit no progress/);
  assert.match(core, /report only the ids it completed/);
  assert.match(core, /carries both ids in plan order/);
  const runner = read('sai/orchestration/command-runner.md');
  assert.match(runner, /before the first progress event it is the first filed step/);
  assert.match(read('sai/commands/accessibility/worker.md'), /a no-UI run reports `resolve-accessibility-scope`/);
  const design = require('../sai-state/machines/design-standalone.js');
  for (const withOverview of [false, true]) {
    assert.equal(design.firstFiled().stage, 'research');
    const first = design.transition(design.initialState, { step_ids: ['prereqs-resolution', 'research'], withOverview });
    assert.deepEqual(first.state.done, ['prereqs-resolution', 'research']);
    assert.equal(first.state.withOverview, withOverview);
    assert.equal(first.state.stage, 'design');
    const later = design.transition(first.state, { step_ids: ['design'], withOverview: !withOverview });
    assert.equal(later.state.withOverview, withOverview);
    assert.equal(design.project(JSON.parse(JSON.stringify(later.state))).next.follow, design.STAGE_FILES.tasks);
  }
});

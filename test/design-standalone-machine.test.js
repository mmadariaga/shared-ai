'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const machine = require('../sai-state/machines/design-standalone.js');
const registry = require('../sai-state/registry.js');

test('design-standalone@1 is registered with the seven/six-step tables as-is', () => {
  assert.equal(machine.machineId, 'design-standalone@1');
  assert.ok(registry.has('design-standalone@1'), 'design-standalone@1 must be registered');
  assert.ok(registry.has('explore-idea@1'), 'explore-idea@1 must stay registered');
  assert.ok(registry.has('explore-slice@1'), 'explore-slice@1 must stay registered');
  assert.ok(registry.has('spec-standalone@1'), 'spec-standalone@1 must stay registered');
  assert.deepEqual(machine.OPTED_IN_STEPS, [
    'prereqs-resolution',
    'research',
    'design',
    'tasks',
    'interfaces',
    'review',
    'overview',
  ]);
  assert.deepEqual(machine.UNOPTED_STEPS, [
    'prereqs-resolution',
    'research',
    'design',
    'tasks',
    'interfaces',
    'review',
  ]);
  assert.equal(machine.STAGE_FILES['prereqs-resolution'], 'none');
  assert.equal(machine.STAGE_FILES.research, 'sai/commands/design/steps/research.md');
  assert.equal(machine.STAGE_FILES.design, 'sai/commands/design/steps/design.md');
  assert.equal(machine.STAGE_FILES.tasks, 'sai/commands/design/steps/tasks.md');
  assert.equal(machine.STAGE_FILES.interfaces, 'sai/commands/design/steps/interfaces.md');
  assert.equal(machine.STAGE_FILES.review, 'sai/commands/design/steps/review.md');
  assert.equal(machine.STAGE_FILES.overview, 'sai/commands/design/steps/overview.md');
  for (const step of ['research', 'design', 'tasks', 'interfaces', 'review', 'overview']) {
    const full = path.join(__dirname, '..', machine.STAGE_FILES[step]);
    assert.ok(fs.existsSync(full), `${machine.STAGE_FILES[step]} must exist`);
  }
});

test('E4 initial state carries follow none and projects the prereqs pointer (default unopted)', () => {
  assert.equal(machine.initialState.stage, 'prereqs-resolution');
  assert.deepEqual(machine.initialState.done, []);
  assert.equal(machine.initialState.withOverview, false);
  const projected = machine.project(machine.initialState);
  assert.equal(projected.next.follow, 'none');
  assert.match(projected.next.hint, /no fetch/);
  assert.ok(projected.snapshot && typeof projected.snapshot === 'object');
  assert.equal(projected.snapshot.machineId, 'design-standalone@1');
});

test('opted-in happy-path walks the seven steps to done with byte-identical follow targets', () => {
  let state = machine.initialState;
  const seen = [];
  // Spawn flag arrives on the pristine first signal; the first delivered
  // pointer targets research.
  let r = machine.transition(state, { step_ids: ['prereqs-resolution'], withOverview: true });
  assert.equal(r.state.stage, 'research');
  assert.equal(r.state.withOverview, true);
  assert.equal(r.next.follow, 'sai/commands/design/steps/research.md');
  assert.match(r.next.hint, /skip if already loaded/);
  state = r.state;
  seen.push(r.next.follow);

  const order = ['research', 'design', 'tasks', 'interfaces', 'review'];
  const expected = {
    research: 'sai/commands/design/steps/design.md',
    design: 'sai/commands/design/steps/tasks.md',
    tasks: 'sai/commands/design/steps/interfaces.md',
    interfaces: 'sai/commands/design/steps/review.md',
    review: 'sai/commands/design/steps/overview.md',
  };
  for (const step of order) {
    const out = machine.transition(state, { step_ids: [step] });
    assert.equal(out.next.follow, expected[step], `after ${step} must point at ${expected[step]}`);
    assert.match(out.next.hint, /skip if already loaded/);
    assert.ok(!('rejected' in out) || out.rejected === undefined, 'happy-path must not reject');
    assert.ok(!('set' in out.next), 'next stays pointer-only');
    state = out.state;
    seen.push(out.next.follow);
  }
  // Marking overview completes all seven and returns done with follow none.
  const done = machine.transition(state, { step_ids: ['overview'] });
  assert.equal(done.state.stage, 'done');
  assert.deepEqual(done.state.done, [
    'prereqs-resolution',
    'research',
    'design',
    'tasks',
    'interfaces',
    'review',
    'overview',
  ]);
  assert.equal(done.next.follow, 'none');
  assert.match(done.next.hint, /all steps complete/);
  assert.ok(!('state' in done.next) && !('snapshot' in done.next), 'wire stays minimal');
});

test('unopted happy-path walks the six steps to done and never derives overview', () => {
  // Absent flag defaults to unopted.
  let state = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'] }).state;
  assert.equal(state.withOverview, false);
  for (const step of ['research', 'design', 'tasks', 'interfaces']) {
    const out = machine.transition(state, { step_ids: [step] });
    state = out.state;
    assert.equal(state.withOverview, false);
  }
  assert.equal(state.stage, 'review');
  assert.equal(machine.project(state).next.follow, 'sai/commands/design/steps/review.md');
  const done = machine.transition(state, { step_ids: ['review'] });
  assert.equal(done.state.stage, 'done');
  assert.deepEqual(done.state.done, [
    'prereqs-resolution',
    'research',
    'design',
    'tasks',
    'interfaces',
    'review',
  ]);
  assert.equal(done.next.follow, 'none');
  assert.match(done.next.hint, /all steps complete/);
  // An overview id on an unopted run is undeclared and ignored.
  const before = JSON.stringify(done.state);
  const ignored = machine.transition(done.state, { step_ids: ['overview'] });
  assert.equal(JSON.stringify(ignored.state), before, 'overview must stay undeclared on unopted runs');
  assert.equal(ignored.rejected, undefined);
});

test('E5 undeclared worker ids are ignored silently with no notification channel', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'], withOverview: true });
  assert.equal(started.state.stage, 'research');
  const before = JSON.stringify(started.state);
  const current = machine.project(started.state);
  const ignored = machine.transition(started.state, { step_ids: ['not-a-step', 'also-unknown'] });
  assert.equal(JSON.stringify(ignored.state), before, 'undeclared ids must not change state');
  assert.deepEqual(ignored.next, current.next, 'authoritative pointer re-steers the worker');
  assert.equal(ignored.rejected, undefined, 'silent ignore carries no notification channel');
  assert.deepEqual(ignored.state.done, started.state.done);
});

test('variant is pristine-only: first signal adopts, later signals never change it, non-boolean never adopts', () => {
  // Pristine adopts true.
  const opted = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'], withOverview: true });
  assert.equal(opted.state.withOverview, true);
  // Later signal carrying false is ignored (immutability).
  const stayed = machine.transition(opted.state, { step_ids: ['research'], withOverview: false });
  assert.equal(stayed.state.withOverview, true, 'variant must stay immutable after adoption');
  assert.equal(stayed.state.stage, 'design');
  // Pristine with a non-boolean flag stays default unopted.
  const fuzzy = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'], withOverview: 'opted-in' });
  assert.equal(fuzzy.state.withOverview, false, 'non-boolean flag must not adopt');
  const numeric = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'], withOverview: 1 });
  assert.equal(numeric.state.withOverview, false, 'numeric flag must not adopt');
});

test('E6 replacement re-resolves the active step from the surviving session', () => {
  let state = machine.initialState;
  state = machine.transition(state, { step_ids: ['prereqs-resolution'], withOverview: true }).state;
  state = machine.transition(state, { step_ids: ['research'] }).state;
  // Surviving session holds done=[prereqs-resolution,research] opted-in; a
  // replacement projects without a transition and its first continuation
  // carries design.
  const reproj = machine.project(JSON.parse(JSON.stringify(state)));
  assert.equal(reproj.next.follow, 'sai/commands/design/steps/design.md');
  assert.match(reproj.next.hint, /design.*skip if already loaded/);
  // Unopted replacement after review points at done, never overview.
  let unopted = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'] }).state;
  for (const step of ['research', 'design', 'tasks', 'interfaces', 'review']) {
    unopted = machine.transition(unopted, { step_ids: [step] }).state;
  }
  assert.equal(unopted.stage, 'done');
  assert.equal(machine.project(JSON.parse(JSON.stringify(unopted))).next.follow, 'none');
});

test('E6 parked machine: empty signal leaves state and pointer unchanged with no rejection', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'], withOverview: true });
  const parked = machine.transition(started.state, {});
  assert.deepEqual(parked.state, started.state);
  assert.deepEqual(parked.next, machine.project(started.state).next);
  assert.equal(parked.rejected, undefined);
});

test('transition and project are pure with no input mutation', () => {
  const state = { stage: 'research', done: ['prereqs-resolution'], withOverview: true };
  const before = JSON.stringify(state);
  const p1 = machine.project(state);
  const p2 = machine.project(state);
  assert.deepEqual(p2, p1);
  assert.equal(JSON.stringify(state), before);
  const t1 = machine.transition(state, { step_ids: ['research'] });
  const t2 = machine.transition(state, { step_ids: ['research'] });
  assert.deepEqual(t2, t1);
  assert.equal(JSON.stringify(state), before);
});

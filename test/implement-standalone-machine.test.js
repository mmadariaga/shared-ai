'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const machine = require('../sai-state/machines/implement-standalone.js');
const registry = require('../sai-state/registry.js');

test('implement-standalone@1 is registered with the six-step table as-is', () => {
  assert.equal(machine.machineId, 'implement-standalone@1');
  assert.ok(registry.has('implement-standalone@1'), 'implement-standalone@1 must be registered');
  assert.ok(registry.has('explore-idea@1'), 'explore-idea@1 must stay registered');
  assert.ok(registry.has('explore-slice@1'), 'explore-slice@1 must stay registered');
  assert.ok(registry.has('spec-standalone@1'), 'spec-standalone@1 must stay registered');
  assert.ok(registry.has('design-standalone@1'), 'design-standalone@1 must stay registered');
  assert.deepEqual(machine.STEPS, [
    'prereqs-resolution',
    'collapse-implemented-steps',
    'artifact-analysis',
    'documentation-review',
    'plan-generation',
    'validation',
  ]);
  assert.equal(machine.STAGE_FILES['prereqs-resolution'], 'none');
  assert.equal(
    machine.STAGE_FILES['collapse-implemented-steps'],
    'sai/commands/implement/steps/collapse-implemented-steps.md'
  );
  assert.equal(
    machine.STAGE_FILES['artifact-analysis'],
    'sai/commands/implement/steps/artifact-analysis.md'
  );
  assert.equal(
    machine.STAGE_FILES['documentation-review'],
    'sai/commands/implement/steps/documentation-review.md'
  );
  assert.equal(
    machine.STAGE_FILES['plan-generation'],
    'sai/commands/implement/steps/plan-generation.md'
  );
  assert.equal(machine.STAGE_FILES.validation, 'sai/commands/implement/steps/validation.md');
  assert.equal(machine.STAGE_FILES.done, 'none');
  for (const step of [
    'collapse-implemented-steps',
    'artifact-analysis',
    'documentation-review',
    'plan-generation',
    'validation',
  ]) {
    const full = path.join(__dirname, '..', machine.STAGE_FILES[step]);
    assert.ok(fs.existsSync(full), machine.STAGE_FILES[step] + ' must exist');
  }
});

test('E4 initial state carries follow none and projects the prereqs pointer', () => {
  assert.equal(machine.initialState.stage, 'prereqs-resolution');
  assert.deepEqual(machine.initialState.done, []);
  const projected = machine.project(machine.initialState);
  assert.equal(projected.next.follow, 'none');
  assert.match(projected.next.hint, /no fetch/);
  assert.ok(projected.snapshot && typeof projected.snapshot === 'object');
  assert.equal(projected.snapshot.machineId, 'implement-standalone@1');
});

test('happy-path progression walks the six steps to done with byte-identical follow targets', () => {
  let state = machine.initialState;
  // Startup marks prereqs-resolution; the first delivered pointer targets
  // collapse-implemented-steps.
  const first = machine.transition(state, { step_ids: ['prereqs-resolution'] });
  assert.equal(first.state.stage, 'collapse-implemented-steps');
  assert.equal(first.next.follow, 'sai/commands/implement/steps/collapse-implemented-steps.md');
  assert.match(first.next.hint, /skip if already loaded/);
  state = first.state;

  const order = [
    'collapse-implemented-steps',
    'artifact-analysis',
    'documentation-review',
    'plan-generation',
  ];
  const expected = {
    'collapse-implemented-steps': 'sai/commands/implement/steps/artifact-analysis.md',
    'artifact-analysis': 'sai/commands/implement/steps/documentation-review.md',
    'documentation-review': 'sai/commands/implement/steps/plan-generation.md',
    'plan-generation': 'sai/commands/implement/steps/validation.md',
  };
  for (const step of order) {
    const out = machine.transition(state, { step_ids: [step] });
    assert.equal(out.next.follow, expected[step], 'after ' + step + ' must point at ' + expected[step]);
    assert.match(out.next.hint, /skip if already loaded/);
    assert.ok(!('rejected' in out) || out.rejected === undefined, 'happy-path must not reject');
    assert.ok(!('set' in out.next), 'next stays pointer-only');
    state = out.state;
  }
  // Marking validation completes all six and returns done with follow none (E6).
  const done = machine.transition(state, { step_ids: ['validation'] });
  assert.equal(done.state.stage, 'done');
  assert.deepEqual(done.state.done, [
    'prereqs-resolution',
    'collapse-implemented-steps',
    'artifact-analysis',
    'documentation-review',
    'plan-generation',
    'validation',
  ]);
  assert.equal(done.next.follow, 'none');
  assert.match(done.next.hint, /all steps complete/);
  assert.ok(!('state' in done.next) && !('snapshot' in done.next), 'wire stays minimal');
});

test('E2 undeclared worker ids are ignored silently with no notification channel', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'] });
  assert.equal(started.state.stage, 'collapse-implemented-steps');
  const before = JSON.stringify(started.state);
  const current = machine.project(started.state);
  const ignored = machine.transition(started.state, { step_ids: ['not-a-step', 'also-unknown'] });
  assert.equal(JSON.stringify(ignored.state), before, 'undeclared ids must not change state');
  assert.deepEqual(ignored.next, current.next, 'authoritative pointer re-steers the worker');
  assert.equal(ignored.rejected, undefined, 'silent ignore carries no notification channel');
  assert.deepEqual(ignored.state.done, started.state.done);
});

test('E3 replacement re-resolves the active step from the surviving session', () => {
  let state = machine.initialState;
  state = machine.transition(state, { step_ids: ['prereqs-resolution'] }).state;
  state = machine.transition(state, { step_ids: ['collapse-implemented-steps'] }).state;
  // Surviving session holds done=[prereqs-resolution,collapse-implemented-steps];
  // a replacement projects without a transition and its first continuation
  // carries artifact-analysis.
  const reproj = machine.project(JSON.parse(JSON.stringify(state)));
  assert.equal(reproj.next.follow, 'sai/commands/implement/steps/artifact-analysis.md');
  assert.match(reproj.next.hint, /artifact-analysis.*skip if already loaded/);
});

test('E3 replacement re-resolution overrides a stale cached stage', () => {
  const stale = {
    stage: 'prereqs-resolution',
    done: ['prereqs-resolution', 'collapse-implemented-steps'],
  };
  const reproj = machine.project(stale);
  assert.equal(reproj.snapshot.state.stage, 'artifact-analysis');
  assert.equal(reproj.next.follow, 'sai/commands/implement/steps/artifact-analysis.md');
});

test('E7 parked machine: empty signal leaves state and pointer unchanged with no rejection', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['prereqs-resolution'] });
  const parked = machine.transition(started.state, {});
  assert.deepEqual(parked.state, started.state);
  assert.deepEqual(parked.next, machine.project(started.state).next);
  assert.equal(parked.rejected, undefined);
});

test('transition and project are pure with no input mutation', () => {
  const state = { stage: 'collapse-implemented-steps', done: ['prereqs-resolution'] };
  const before = JSON.stringify(state);
  const p1 = machine.project(state);
  const p2 = machine.project(state);
  assert.deepEqual(p2, p1);
  assert.equal(JSON.stringify(state), before);
  const t1 = machine.transition(state, { step_ids: ['collapse-implemented-steps'] });
  const t2 = machine.transition(state, { step_ids: ['collapse-implemented-steps'] });
  assert.deepEqual(t2, t1);
  assert.equal(JSON.stringify(state), before);
});

test('marks are monotonic and out-of-order ids land in canonical STEPS order', () => {
  const out = machine.transition(machine.initialState, {
    step_ids: ['artifact-analysis', 'prereqs-resolution', 'collapse-implemented-steps'],
  });
  assert.deepEqual(out.state.done, [
    'prereqs-resolution',
    'collapse-implemented-steps',
    'artifact-analysis',
  ]);
  assert.equal(out.state.stage, 'documentation-review');
  const again = machine.transition(out.state, { step_ids: ['prereqs-resolution'] });
  assert.deepEqual(again.state.done, out.state.done, 'a re-reported mark must not duplicate');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const machine = require('../sai-state/machines/review-standalone.js');
const registry = require('../sai-state/registry.js');

test('review-standalone@1 is registered with the five-step table as-is', () => {
  assert.equal(machine.machineId, 'review-standalone@1');
  assert.ok(registry.has('review-standalone@1'), 'review-standalone@1 must be registered');
  assert.ok(registry.has('explore-idea@1'), 'explore-idea@1 must stay registered');
  assert.ok(registry.has('explore-slice@1'), 'explore-slice@1 must stay registered');
  assert.ok(registry.has('spec-standalone@1'), 'spec-standalone@1 must stay registered');
  assert.ok(registry.has('design-standalone@1'), 'design-standalone@1 must stay registered');
  assert.ok(registry.has('implement-standalone@1'), 'implement-standalone@1 must stay registered');
  assert.deepEqual(machine.STEPS, [
    'resolve-change',
    'establish-diff-scope',
    'resolve-review-analysis',
    'resolve-mutation-analysis',
    'close-review-outcome',
  ]);
  assert.equal(machine.STAGE_FILES['resolve-change'], 'none');
  assert.equal(
    machine.STAGE_FILES['establish-diff-scope'],
    'sai/commands/review/steps/establish-diff-scope.md'
  );
  assert.equal(
    machine.STAGE_FILES['resolve-review-analysis'],
    'sai/commands/review/steps/resolve-review-analysis.md'
  );
  assert.equal(
    machine.STAGE_FILES['resolve-mutation-analysis'],
    'sai/commands/review/steps/resolve-mutation-analysis.md'
  );
  assert.equal(
    machine.STAGE_FILES['close-review-outcome'],
    'sai/commands/review/steps/close-review-outcome.md'
  );
  assert.equal(machine.STAGE_FILES.done, 'none');
  for (const step of [
    'establish-diff-scope',
    'resolve-review-analysis',
    'resolve-mutation-analysis',
    'close-review-outcome',
  ]) {
    const full = path.join(__dirname, '..', machine.STAGE_FILES[step]);
    assert.ok(fs.existsSync(full), machine.STAGE_FILES[step] + ' must exist');
  }
});

test('E4 initial state carries follow none and projects the resolve-change pointer', () => {
  assert.equal(machine.initialState.stage, 'resolve-change');
  assert.deepEqual(machine.initialState.done, []);
  const projected = machine.project(machine.initialState);
  assert.equal(projected.next.follow, 'none');
  assert.match(projected.next.hint, /no fetch/);
  assert.ok(projected.snapshot && typeof projected.snapshot === 'object');
  assert.equal(projected.snapshot.machineId, 'review-standalone@1');
});

test('happy-path progression walks the five steps to done with byte-identical follow targets', () => {
  let state = machine.initialState;
  // Startup marks resolve-change; the first delivered pointer targets
  // establish-diff-scope.
  const first = machine.transition(state, { step_ids: ['resolve-change'] });
  assert.equal(first.state.stage, 'establish-diff-scope');
  assert.equal(first.next.follow, 'sai/commands/review/steps/establish-diff-scope.md');
  assert.match(first.next.hint, /skip if already loaded/);
  state = first.state;

  const order = [
    'establish-diff-scope',
    'resolve-review-analysis',
    'resolve-mutation-analysis',
  ];
  const expected = {
    'establish-diff-scope': 'sai/commands/review/steps/resolve-review-analysis.md',
    'resolve-review-analysis': 'sai/commands/review/steps/resolve-mutation-analysis.md',
    'resolve-mutation-analysis': 'sai/commands/review/steps/close-review-outcome.md',
  };
  for (const step of order) {
    const out = machine.transition(state, { step_ids: [step] });
    assert.equal(out.next.follow, expected[step], 'after ' + step + ' must point at ' + expected[step]);
    assert.match(out.next.hint, /skip if already loaded/);
    assert.ok(!('rejected' in out) || out.rejected === undefined, 'happy-path must not reject');
    assert.ok(!('set' in out.next), 'next stays pointer-only');
    state = out.state;
  }
  // Marking close-review-outcome completes all five and returns done with follow none (E6).
  const done = machine.transition(state, { step_ids: ['close-review-outcome'] });
  assert.equal(done.state.stage, 'done');
  assert.deepEqual(done.state.done, [
    'resolve-change',
    'establish-diff-scope',
    'resolve-review-analysis',
    'resolve-mutation-analysis',
    'close-review-outcome',
  ]);
  assert.equal(done.next.follow, 'none');
  assert.match(done.next.hint, /all steps complete/);
  assert.ok(!('state' in done.next) && !('snapshot' in done.next), 'wire stays minimal');
});

test('E2 undeclared worker ids are ignored silently with no notification channel', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['resolve-change'] });
  assert.equal(started.state.stage, 'establish-diff-scope');
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
  state = machine.transition(state, { step_ids: ['resolve-change'] }).state;
  state = machine.transition(state, { step_ids: ['establish-diff-scope'] }).state;
  // Surviving session holds done=[resolve-change,establish-diff-scope];
  // a replacement projects without a transition and its first continuation
  // carries resolve-review-analysis.
  const reproj = machine.project(JSON.parse(JSON.stringify(state)));
  assert.equal(reproj.next.follow, 'sai/commands/review/steps/resolve-review-analysis.md');
  assert.match(reproj.next.hint, /resolve-review-analysis.*skip if already loaded/);
});

test('E3 replacement re-resolution overrides a stale cached stage', () => {
  const stale = {
    stage: 'resolve-change',
    done: ['resolve-change', 'establish-diff-scope'],
  };
  const reproj = machine.project(stale);
  assert.equal(reproj.snapshot.state.stage, 'resolve-review-analysis');
  assert.equal(reproj.next.follow, 'sai/commands/review/steps/resolve-review-analysis.md');
});

test('E7 parked machine: empty signal leaves state and pointer unchanged with no rejection', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['resolve-change'] });
  const parked = machine.transition(started.state, {});
  assert.deepEqual(parked.state, started.state);
  assert.deepEqual(parked.next, machine.project(started.state).next);
  assert.equal(parked.rejected, undefined);
});

test('transition and project are pure with no input mutation', () => {
  const state = { stage: 'establish-diff-scope', done: ['resolve-change'] };
  const before = JSON.stringify(state);
  const p1 = machine.project(state);
  const p2 = machine.project(state);
  assert.deepEqual(p2, p1);
  assert.equal(JSON.stringify(state), before);
  const t1 = machine.transition(state, { step_ids: ['establish-diff-scope'] });
  const t2 = machine.transition(state, { step_ids: ['establish-diff-scope'] });
  assert.deepEqual(t2, t1);
  assert.equal(JSON.stringify(state), before);
});

test('marks are monotonic and out-of-order ids land in canonical STEPS order', () => {
  const out = machine.transition(machine.initialState, {
    step_ids: ['resolve-review-analysis', 'resolve-change', 'establish-diff-scope'],
  });
  assert.deepEqual(out.state.done, [
    'resolve-change',
    'establish-diff-scope',
    'resolve-review-analysis',
  ]);
  assert.equal(out.state.stage, 'resolve-mutation-analysis');
  const again = machine.transition(out.state, { step_ids: ['resolve-change'] });
  assert.deepEqual(again.state.done, out.state.done, 'a re-reported mark must not duplicate');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const machine = require('../sai-state/machines/apply-standalone.js');
const registry = require('../sai-state/registry.js');

test('apply-standalone@1 is registered with the five-mode routing table', () => {
  assert.equal(machine.machineId, 'apply-standalone@1');
  assert.ok(registry.has('apply-standalone@1'), 'apply-standalone@1 must be registered');
  assert.ok(registry.has('explore-idea@1'), 'explore-idea@1 must stay registered');
  assert.ok(registry.has('explore-slice@1'), 'explore-slice@1 must stay registered');
  assert.deepEqual(machine.ROUTING_MODES, [
    'split-flow',
    'green-direct',
    'green-exception-test-only',
    'green-exception-no-production',
    'stop-missing-contract',
  ]);
  // Verify all five routing mode files exist
  const modes = [
    'routing-split-flow.md',
    'routing-green-direct.md',
    'routing-green-exception-test-only.md',
    'routing-green-exception-no-production.md',
    'routing-stop-missing-contract.md',
  ];
  for (const mode of modes) {
    const full = path.join(__dirname, '..', 'sai', 'commands', 'apply', 'steps', mode);
    assert.ok(fs.existsSync(full), mode + ' must exist');
  }
  // Verify terminal file exists
  const terminal = path.join(__dirname, '..', 'sai', 'commands', 'apply', 'steps', 'terminal-lifecycle.md');
  assert.ok(fs.existsSync(terminal), 'terminal-lifecycle.md must exist');
});

test('E2 STAGE_FILES carries composite mode_stage keys for five routing modes', () => {
  const expected = {
    'split-flow_entry': 'sai/commands/apply/steps/routing-split-flow.md',
    'green-direct_entry': 'sai/commands/apply/steps/routing-green-direct.md',
    'green-exception-test-only_entry': 'sai/commands/apply/steps/routing-green-exception-test-only.md',
    'green-exception-no-production_entry': 'sai/commands/apply/steps/routing-green-exception-no-production.md',
    'stop-missing-contract_entry': 'sai/commands/apply/steps/routing-stop-missing-contract.md',
    terminal: 'sai/commands/apply/steps/terminal-lifecycle.md',
  };
  assert.deepEqual(machine.STAGE_FILES, expected);
});

test('initial state is entry with empty set, active null, no mode', () => {
  assert.equal(machine.initialState.stage, 'entry');
  assert.deepEqual(machine.initialState.set, []);
  assert.equal(machine.initialState.active, null);
  assert.deepEqual(machine.initialState.done, []);
  assert.equal(machine.initialState.mode, null);
  const projected = machine.project(machine.initialState);
  assert.equal(projected.next.follow, machine.STAGE_FILES.terminal);
  assert.match(projected.next.hint, /all steps complete/);
});

test('E1, I3: seeding signal carries both recordedList and recordedDone', () => {
  const seed = {
    recordedList: ['Step-1', 'Step-2', 'Step-3'],
    recordedDone: ['Step-1'],
  };
  const result = machine.transition(machine.initialState, seed);
  assert.deepEqual(result.state.set, ['Step-1', 'Step-2', 'Step-3']);
  assert.deepEqual(result.state.done, ['Step-1']);
  assert.equal(result.state.active, 'Step-2', 'first not-fully-marked is active');
  assert.equal(result.state.stage, 'entry');
  assert.equal(result.state.mode, null, 'mode not set by seeding');
});

test('E2: derivation rule — fully-marked is done, first not-marked is active', () => {
  const state = machine.initialState;
  const seeded = machine.transition(state, {
    recordedList: ['Step-1', 'Step-2', 'Step-3', 'Step-4'],
    recordedDone: ['Step-1', 'Step-3'],
  });
  assert.equal(seeded.state.active, 'Step-2', 'first not-done in plan order is active');
  // Add Step-2 to done
  const advanced = machine.transition(seeded.state, { intent: 'next-step' });
  assert.deepEqual(advanced.state.done, ['Step-1', 'Step-3', 'Step-2']);
  assert.equal(advanced.state.active, 'Step-4', 'Step-4 is now first not-done');
});

test('E1: empty set yields empty active; terminal stage when all done', () => {
  const empty = machine.transition(machine.initialState, {
    recordedList: [],
    recordedDone: [],
  });
  assert.equal(empty.state.active, null, 'empty set has no active');
  assert.equal(empty.state.stage, machine.DONE_STAGE, 'stage is terminal');
  assert.equal(empty.next.follow, machine.STAGE_FILES.terminal);
});

test('coordinator signals mode; machine sets mode and stage to entry', () => {
  const seeded = machine.transition(machine.initialState, {
    recordedList: ['Step-1', 'Step-2'],
    recordedDone: [],
  });
  assert.equal(seeded.state.active, 'Step-1');
  assert.equal(seeded.state.mode, null);
  const moded = machine.transition(seeded.state, { mode: 'split-flow' });
  assert.equal(moded.state.mode, 'split-flow');
  assert.equal(moded.state.stage, 'entry');
  assert.equal(moded.next.follow, 'sai/commands/apply/steps/routing-split-flow.md');
});

test('E3: partially-completed Step re-enters at entry stage; no inner-stage restore', () => {
  const state = {
    stage: 'something-else', // Simulating a cached stale stage
    set: ['Step-1', 'Step-2'],
    active: 'Step-1',
    done: [],
    mode: null,
  };
  const reproj = machine.project(state);
  assert.equal(reproj.snapshot.state.stage, 'entry', 'should re-enter at entry');
  assert.equal(reproj.snapshot.state.active, 'Step-1', 'active unchanged');
});

test('mode signal on terminal state is rejected', () => {
  const terminal = machine.transition(machine.initialState, {
    recordedList: [],
    recordedDone: [],
  });
  assert.equal(terminal.state.stage, machine.DONE_STAGE);
  const rejected = machine.transition(terminal.state, { mode: 'split-flow' });
  assert.equal(rejected.rejected, 'ALREADY_DONE');
});

test('complete-step marks active done, moves to next Step, clears mode', () => {
  const seeded = machine.transition(machine.initialState, {
    recordedList: ['Step-1', 'Step-2', 'Step-3'],
    recordedDone: [],
  });
  const moded = machine.transition(seeded.state, { mode: 'green-direct' });
  assert.equal(moded.state.active, 'Step-1');
  assert.equal(moded.state.mode, 'green-direct');

  const completed = machine.transition(moded.state, { intent: 'complete-step' });
  assert.deepEqual(completed.state.done, ['Step-1']);
  assert.equal(completed.state.active, 'Step-2');
  assert.equal(completed.state.mode, null, 'mode cleared after completion');
  assert.equal(completed.state.stage, 'entry');
});

test('next-step has same effect as complete-step', () => {
  const seeded = machine.transition(machine.initialState, {
    recordedList: ['Step-1', 'Step-2'],
    recordedDone: [],
  });
  const via_complete = machine.transition(seeded.state, { intent: 'complete-step' });
  const via_next = machine.transition(seeded.state, { intent: 'next-step' });
  assert.deepEqual(via_complete.state, via_next.state);
});

test('E8: all Steps done yields terminal stage', () => {
  let state = machine.initialState;
  state = machine.transition(state, {
    recordedList: ['Step-1', 'Step-2'],
    recordedDone: [],
  }).state;
  state = machine.transition(state, { mode: 'green-direct' }).state;
  state = machine.transition(state, { intent: 'complete-step' }).state;
  assert.equal(state.active, 'Step-2');
  state = machine.transition(state, { mode: 'green-direct' }).state;
  const final = machine.transition(state, { intent: 'complete-step' });
  assert.equal(final.state.active, null, 'no active when all done');
  assert.equal(final.state.stage, machine.DONE_STAGE);
  assert.equal(final.next.follow, machine.STAGE_FILES.terminal);
  assert.match(final.next.hint, /terminal lifecycle/);
});

test('E6: parked machine (empty signal) leaves state and pointer unchanged', () => {
  const seeded = machine.transition(machine.initialState, {
    recordedList: ['Step-1'],
    recordedDone: [],
  });
  const parked = machine.transition(seeded.state, {});
  assert.deepEqual(parked.state, seeded.state);
  assert.deepEqual(parked.next, machine.project(seeded.state).next);
  assert.equal(parked.rejected, undefined);
});

test('unknown signal is rejected but state unchanged', () => {
  const seeded = machine.transition(machine.initialState, {
    recordedList: ['Step-1'],
    recordedDone: [],
  });
  const before = JSON.stringify(seeded.state);
  const unknown = machine.transition(seeded.state, { intent: 'unknown-intent' });
  assert.equal(JSON.stringify(unknown.state), before);
  assert.equal(unknown.rejected, 'UNKNOWN_SIGNAL');
});

test('transition and project are pure with no input mutation', () => {
  const state = {
    stage: 'entry',
    set: ['Step-1', 'Step-2'],
    active: 'Step-1',
    done: [],
    mode: 'green-direct',
  };
  const before = JSON.stringify(state);
  const p1 = machine.project(state);
  const p2 = machine.project(state);
  assert.deepEqual(p2, p1);
  assert.equal(JSON.stringify(state), before);
  const t1 = machine.transition(state, { intent: 'complete-step' });
  const t2 = machine.transition(state, { intent: 'complete-step' });
  assert.deepEqual(t2, t1);
  assert.equal(JSON.stringify(state), before);
});

test('done list is monotonic (never removes completed Steps)', () => {
  let state = machine.initialState;
  state = machine.transition(state, {
    recordedList: ['Step-1', 'Step-2', 'Step-3'],
    recordedDone: [],
  }).state;
  state = machine.transition(state, { mode: 'split-flow' }).state;
  state = machine.transition(state, { intent: 'complete-step' }).state;
  assert.deepEqual(state.done, ['Step-1']);

  // Advance to Step-2
  state = machine.transition(state, { mode: 'green-direct' }).state;
  state = machine.transition(state, { intent: 'complete-step' }).state;
  assert.deepEqual(state.done, ['Step-1', 'Step-2']);

  // Step-1 can never be un-done
  const trying = machine.transition(state, { intent: 'complete-step' });
  assert.deepEqual(trying.state.done, ['Step-1', 'Step-2', 'Step-3']);
});

test('project re-resolves active from surviving done set (E3 replacement)', () => {
  const state = {
    stage: 'entry',
    set: ['Step-1', 'Step-2', 'Step-3'],
    active: 'Step-2', // Simulating cached stale active
    done: ['Step-1'],
    mode: null,
  };
  const reproj = machine.project(state);
  assert.equal(reproj.snapshot.state.active, 'Step-2', 'Step-2 is still first not-done');

  const more_done = {
    stage: 'entry',
    set: ['Step-1', 'Step-2', 'Step-3'],
    active: 'Step-1', // Stale: Step-1 is now done
    done: ['Step-1', 'Step-2'],
    mode: null,
  };
  const reproj2 = machine.project(more_done);
  assert.equal(reproj2.snapshot.state.active, 'Step-3', 'Step-3 is now first not-done');
});

test('seeding with done field (alternative name) is supported', () => {
  const seed = {
    recordedList: ['Step-1', 'Step-2'],
    done: ['Step-1'],
  };
  const result = machine.transition(machine.initialState, seed);
  assert.deepEqual(result.state.done, ['Step-1']);
  assert.equal(result.state.active, 'Step-2');
});

test('five routing modes map to five distinct routing files', () => {
  const modes = machine.ROUTING_MODES;
  assert.equal(modes.length, 5);
  for (const mode of modes) {
    const key = `${mode}_entry`;
    assert.ok(machine.STAGE_FILES[key], `STAGE_FILES must have entry for ${mode}`);
    const file = machine.STAGE_FILES[key];
    assert.match(file, /sai\/commands\/apply\/steps\//);
  }
});

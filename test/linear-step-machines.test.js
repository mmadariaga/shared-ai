'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const specMachine = require('../sai-state/machines/spec-standalone.js');
const implementMachine = require('../sai-state/machines/implement-standalone.js');
const reviewMachine = require('../sai-state/machines/review-standalone.js');
const registry = require('../sai-state/registry.js');

const machines = [
  { name: 'spec-standalone@1', machine: specMachine },
  { name: 'implement-standalone@1', machine: implementMachine },
  { name: 'review-standalone@1', machine: reviewMachine },
];

for (const { name, machine } of machines) {
  test(`${name} is registered and declares required properties`, () => {
    assert.ok(registry.has(name), `${name} must be registered`);
    assert.equal(machine.machineId, name);
    assert.ok(Array.isArray(machine.STEPS), 'STEPS must be an array');
    assert.ok(machine.STEPS.length > 0, 'STEPS must not be empty');
    assert.ok(machine.STAGE_FILES && typeof machine.STAGE_FILES === 'object', 'STAGE_FILES must exist');
    assert.ok(machine.initialState && typeof machine.initialState === 'object', 'initialState must exist');
    assert.equal(typeof machine.transition, 'function', 'transition must be a function');
    assert.equal(typeof machine.project, 'function', 'project must be a function');
    assert.equal(typeof machine.DONE_STAGE, 'string', 'DONE_STAGE must be a string');
  });

  test(`${name} initial state has first step as stage with empty done list`, () => {
    assert.equal(machine.initialState.stage, machine.STEPS[0]);
    assert.deepEqual(machine.initialState.done, []);
  });

  test(`${name} initial state projects with follow none for first step`, () => {
    const projected = machine.project(machine.initialState);
    assert.equal(projected.next.follow, 'none', `${name} first step should have follow: none`);
    assert.ok(projected.snapshot && typeof projected.snapshot === 'object', 'project must return snapshot');
    assert.equal(projected.snapshot.machineId, name);
  });

  test(`${name} step files exist for all non-none follow targets`, () => {
    for (const step of machine.STEPS) {
      const followFile = machine.STAGE_FILES[step];
      if (followFile && followFile !== 'none') {
        const full = path.join(__dirname, '..', followFile);
        assert.ok(fs.existsSync(full), `${followFile} (for step ${step}) must exist`);
      }
    }
  });

  test(`${name} happy-path progression walks through all steps to done`, () => {
    let state = machine.initialState;

    // First step transitions via its id
    let r = machine.transition(state, { step_ids: [machine.STEPS[0]] });
    assert.equal(r.state.stage, machine.STEPS[1] || machine.DONE_STAGE);
    assert.deepEqual(r.state.done, [machine.STEPS[0]]);
    state = r.state;

    // Walk remaining steps
    for (let i = 1; i < machine.STEPS.length; i++) {
      const stepId = machine.STEPS[i];
      const out = machine.transition(state, { step_ids: [stepId] });
      assert.deepEqual(out.state.done, machine.STEPS.slice(0, i + 1));
      assert.equal(out.state.stage, i + 1 < machine.STEPS.length ? machine.STEPS[i + 1] : machine.DONE_STAGE);
      assert.ok(!('rejected' in out) || out.rejected === undefined, 'happy-path must not reject');
      state = out.state;
    }

    // Last step should lead to done
    assert.equal(state.stage, machine.DONE_STAGE);
    assert.deepEqual(state.done, machine.STEPS);
    const done = machine.project(state);
    assert.equal(done.next.follow, 'none', 'done stage must have follow: none');
  });

  test(`${name} undeclared ids are ignored silently`, () => {
    const started = machine.transition(machine.initialState, { step_ids: [machine.STEPS[0]] });
    const before = JSON.stringify(started.state);
    const current = machine.project(started.state);
    const ignored = machine.transition(started.state, { step_ids: ['not-a-step', 'also-unknown'] });
    assert.equal(JSON.stringify(ignored.state), before, 'undeclared ids must not change state');
    assert.deepEqual(ignored.next, current.next, 'authoritative pointer re-steers worker');
    assert.equal(ignored.rejected, undefined, 'silent ignore carries no notification');
  });

  test(`${name} replacement re-resolves from surviving session state`, () => {
    let state = machine.initialState;
    state = machine.transition(state, { step_ids: [machine.STEPS[0]] }).state;
    if (machine.STEPS.length > 1) {
      state = machine.transition(state, { step_ids: [machine.STEPS[1]] }).state;
    }
    const reproj = machine.project(JSON.parse(JSON.stringify(state)));
    const expected = state.done.length < machine.STEPS.length
      ? machine.STEPS[state.done.length]
      : machine.DONE_STAGE;
    assert.equal(reproj.next.follow, machine.STAGE_FILES[expected] || 'none');
  });

  test(`${name} parked machine: empty signal leaves state unchanged`, () => {
    const started = machine.transition(machine.initialState, { step_ids: [machine.STEPS[0]] });
    const parked = machine.transition(started.state, {});
    assert.deepEqual(parked.state, started.state);
    assert.deepEqual(parked.next, machine.project(started.state).next);
    assert.equal(parked.rejected, undefined);
  });

  test(`${name} transition and project are pure`, () => {
    const state = { stage: machine.STEPS[0], done: [] };
    const before = JSON.stringify(state);
    machine.project(state);
    machine.project(state);
    assert.equal(JSON.stringify(state), before, 'project must not mutate');
    machine.transition(state, { step_ids: [] });
    machine.transition(state, { step_ids: [] });
    assert.equal(JSON.stringify(state), before, 'transition must not mutate');
  });

  test(`${name} marks are monotonic`, () => {
    let state = machine.initialState;
    for (const stepId of machine.STEPS.slice(0, -1)) {
      state = machine.transition(state, { step_ids: [stepId] }).state;
    }
    const before = state.done.slice();
    // Re-emitting earlier steps should not change the done list
    const same = machine.transition(state, { step_ids: [machine.STEPS[0]] });
    assert.deepEqual(same.state.done, before, 'marks must be monotonic');
  });
}

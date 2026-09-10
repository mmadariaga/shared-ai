'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const machine = require('../sai-state/machines/spec-standalone.js');
const registry = require('../sai-state/registry.js');

test('spec-standalone@1 is registered with the six-step table as-is', () => {
  assert.equal(machine.machineId, 'spec-standalone@1');
  assert.ok(registry.has('spec-standalone@1'), 'spec-standalone@1 must be registered');
  assert.ok(registry.has('explore-idea@1'), 'explore-idea@1 must stay registered');
  assert.ok(registry.has('explore-slice@1'), 'explore-slice@1 must stay registered');
  assert.deepEqual(machine.STEPS, [
    'prereqs-and-change',
    'research',
    'proposal',
    'specs',
    'validation',
    'review',
  ]);
  assert.equal(machine.STAGE_FILES['prereqs-and-change'], 'none');
  assert.equal(machine.STAGE_FILES.research, 'sai/commands/spec/steps/research.md');
  assert.equal(machine.STAGE_FILES.proposal, 'sai/commands/spec/steps/proposal.md');
  assert.equal(machine.STAGE_FILES.specs, 'sai/commands/spec/steps/specs.md');
  assert.equal(machine.STAGE_FILES.validation, 'sai/commands/spec/steps/validation.md');
  assert.equal(machine.STAGE_FILES.review, 'sai/commands/spec/steps/review.md');
  for (const step of ['research', 'proposal', 'specs', 'validation', 'review']) {
    const full = path.join(__dirname, '..', machine.STAGE_FILES[step]);
    assert.ok(fs.existsSync(full), `${machine.STAGE_FILES[step]} must exist`);
  }
});

test('E4 initial state carries follow none and projects the prereqs pointer', () => {
  assert.equal(machine.initialState.stage, 'prereqs-and-change');
  assert.deepEqual(machine.initialState.done, []);
  const projected = machine.project(machine.initialState);
  assert.equal(projected.next.follow, 'none');
  assert.match(projected.next.hint, /no fetch/);
  assert.ok(projected.snapshot && typeof projected.snapshot === 'object');
  assert.equal(projected.snapshot.machineId, 'spec-standalone@1');
});

test('happy-path progression walks the six steps to done with byte-identical follow targets', () => {
  let state = machine.initialState;
  const seen = [];
  // Startup marks prereqs-and-change; the first delivered pointer targets research.
  let r = machine.transition(state, { step_ids: ['prereqs-and-change'] });
  assert.equal(r.state.stage, 'research');
  assert.equal(r.next.follow, 'sai/commands/spec/steps/research.md');
  assert.match(r.next.hint, /skip if already loaded/);
  state = r.state;
  seen.push(r.next.follow);

  const order = ['research', 'proposal', 'specs', 'validation'];
  const expected = {
    research: 'sai/commands/spec/steps/proposal.md',
    proposal: 'sai/commands/spec/steps/specs.md',
    specs: 'sai/commands/spec/steps/validation.md',
    validation: 'sai/commands/spec/steps/review.md',
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
  // Marking review completes all six and returns done with follow none (E6).
  const done = machine.transition(state, { step_ids: ['review'] });
  assert.equal(done.state.stage, 'done');
  assert.deepEqual(done.state.done, [
    'prereqs-and-change',
    'research',
    'proposal',
    'specs',
    'validation',
    'review',
  ]);
  assert.equal(done.next.follow, 'none');
  assert.match(done.next.hint, /all steps complete/);
  assert.ok(!('state' in done.next) && !('snapshot' in done.next), 'wire stays minimal');
});

test('E2 undeclared worker ids are ignored silently with no notification channel', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['prereqs-and-change'] });
  assert.equal(started.state.stage, 'research');
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
  state = machine.transition(state, { step_ids: ['prereqs-and-change'] }).state;
  state = machine.transition(state, { step_ids: ['research'] }).state;
  // Surviving session holds done=[prereqs-and-change,research]; a replacement
  // projects without a transition and its first continuation carries proposal.
  const reproj = machine.project(JSON.parse(JSON.stringify(state)));
  assert.equal(reproj.next.follow, 'sai/commands/spec/steps/proposal.md');
  assert.match(reproj.next.hint, /proposal.*skip if already loaded/);
});

test('E7 parked machine: empty signal leaves state and pointer unchanged with no rejection', () => {
  const started = machine.transition(machine.initialState, { step_ids: ['prereqs-and-change'] });
  const parked = machine.transition(started.state, {});
  assert.deepEqual(parked.state, started.state);
  assert.deepEqual(parked.next, machine.project(started.state).next);
  assert.equal(parked.rejected, undefined);
});

test('transition and project are pure with no input mutation', () => {
  const state = { stage: 'research', done: ['prereqs-and-change'] };
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

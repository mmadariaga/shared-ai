'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const machine = require('../sai-state/machines/implement-run.js');
const registry = require('../sai-state/registry.js');

const SAI_STATE_TOOL = path.join(__dirname, '..', 'bin', 'sai-state.js');

function run(...events) {
  let state = machine.initialState;
  let result = null;
  for (const event of events) {
    result = machine.transition(state, event);
    state = result.state;
  }
  return result;
}

const start = { kind: 'start', dir: '.tmp/demo/run-1a2b' };

test('implement-run@1 is registered and declares the machine contract', () => {
  assert.ok(registry.has('implement-run@1'));
  assert.equal(machine.machineId, 'implement-run@1');
  assert.equal(typeof machine.transition, 'function');
  assert.equal(typeof machine.project, 'function');
  assert.equal(machine.initialState.stage, 'idle');
  assert.equal(machine.project(machine.initialState).next.follow, 'none');
});

test('an unknown or missing event kind is an invalid event', () => {
  assert.equal(machine.transition(machine.initialState, { kind: 'nope' }), null);
  assert.equal(machine.transition(machine.initialState, {}), null);
  assert.equal(machine.transition(machine.initialState, null), null);
});

test('start opens the run once and keeps the run directory', () => {
  const result = run(start);
  assert.equal(result.state.stage, 'running');
  assert.equal(result.run.dir, start.dir);
  assert.equal(machine.transition(result.state, start).rejected, 'ALREADY_RUNNING');
  assert.equal(machine.transition(machine.initialState, { kind: 'start' }).rejected, 'run directory required');
});

test('each obstacle has a budget of three attempts and the fourth is exhaustion', () => {
  let state = run(start).state;
  for (let spent = 1; spent <= 3; spent++) {
    const result = machine.transition(state, { kind: 'attempt', obstacle: 'step-2' });
    assert.equal(result.rejected, undefined);
    assert.deepEqual(result.budgets['step-2'], { spent, limit: 3 });
    state = result.state;
  }
  const exhausted = machine.transition(state, { kind: 'attempt', obstacle: 'step-2' });
  assert.equal(exhausted.rejected, 'exhaustion');
  assert.equal(exhausted.exhausted, 'step-2');
  assert.deepEqual(exhausted.budgets['step-2'], { spent: 3, limit: 3 });
  const other = machine.transition(state, { kind: 'attempt', obstacle: 'final-suite' });
  assert.deepEqual(other.budgets['final-suite'], { spent: 1, limit: 3 });
});

test('an escalation waits for the answer; continue resets only that obstacle, stop stops the run', () => {
  let state = run(start,
    { kind: 'attempt', obstacle: 'step-2' }, { kind: 'attempt', obstacle: 'step-2' }, { kind: 'attempt', obstacle: 'step-2' },
    { kind: 'attempt', obstacle: 'final-suite' }).state;
  state = machine.transition(state, { kind: 'escalate', obstacle: 'step-2' }).state;
  assert.equal(state.stage, 'escalated');
  assert.equal(state.blocker, 'step-2');
  assert.equal(machine.transition(state, { kind: 'attempt', obstacle: 'step-2' }).rejected, 'run is not running');
  assert.equal(machine.transition(state, { kind: 'answer', obstacle: 'final-suite', choice: 'continue' }).rejected,
    'obstacle is not the open escalation');
  assert.equal(machine.transition(state, { kind: 'answer', obstacle: 'step-2', choice: 'maybe' }).rejected,
    'choice must be continue or stop');

  const resumed = machine.transition(state, { kind: 'answer', obstacle: 'step-2', choice: 'continue' });
  assert.equal(resumed.state.stage, 'running');
  assert.equal(resumed.state.blocker, '');
  assert.equal(resumed.budgets['step-2'], undefined);
  assert.deepEqual(resumed.budgets['final-suite'], { spent: 1, limit: 3 });

  const stopped = machine.transition(state, { kind: 'answer', obstacle: 'step-2', choice: 'stop' });
  assert.equal(stopped.state.stage, 'stopped');
});

test('an answer without an open escalation changes nothing', () => {
  const result = machine.transition(run(start).state, { kind: 'answer', obstacle: 'step-2', choice: 'continue' });
  assert.equal(result.rejected, 'no escalation is waiting');
  assert.equal(result.state.stage, 'running');
});

test('steps and references are recorded as identifiers and paths without duplicates', () => {
  const result = run(start,
    { kind: 'step-start', step: 'step-1' },
    { kind: 'record', ref: 'report', path: '.tmp/demo/run-1a2b/reports/step-1-red.yaml' },
    { kind: 'record', ref: 'report', path: '.tmp/demo/run-1a2b/reports/step-1-red.yaml' },
    { kind: 'record', ref: 'deviation', path: '.tmp/demo/run-1a2b/deviations.md' },
    { kind: 'record', ref: 'override', path: '.tmp/demo/run-1a2b/overrides.md' },
    { kind: 'record', ref: 'finding', path: '.tmp/demo/run-1a2b/findings.md' },
    { kind: 'record', ref: 'baseline', path: '.tmp/demo/run-1a2b/baseline.md' },
    { kind: 'step-done', step: 'step-1' },
    { kind: 'step-done', step: 'step-1' });
  assert.deepEqual(result.run.committed, ['step-1']);
  assert.equal(result.run.step, '');
  assert.equal(result.run.reports.length, 1);
  assert.equal(result.run.deviations.length, 1);
  assert.equal(result.run.overrides.length, 1);
  assert.equal(result.run.findings.length, 1);
  assert.equal(result.run.baselines.length, 1);
  assert.equal(machine.transition(result.state, { kind: 'record', ref: 'essay', path: '/x' }).rejected, 'unknown reference kind');
  assert.equal(machine.transition(result.state, { kind: 'record', ref: 'report', path: 'a\nb' }).rejected, 'path required');
  assert.equal(machine.transition(result.state, { kind: 'step-start', step: 'free text with spaces' }).rejected, 'step id required');
});

test('close records the outcome and status never changes the state', () => {
  const base = run(start, { kind: 'step-start', step: 'step-1' });
  assert.deepEqual(machine.transition(base.state, { kind: 'status' }).state, base.state);
  assert.equal(machine.transition(base.state, { kind: 'close', outcome: 'completed' }).state.stage, 'completed');
  assert.equal(machine.transition(base.state, { kind: 'close', outcome: 'later' }).rejected,
    'outcome must be completed, escalated, or stopped');
  assert.equal(machine.transition(machine.initialState, { kind: 'close', outcome: 'completed' }).rejected, 'run is not started');
});

test('project re-derives the run view from a persisted state', () => {
  const result = run(start, { kind: 'attempt', obstacle: 'step-1' }, { kind: 'step-start', step: 'step-1' });
  const projected = machine.project(JSON.parse(JSON.stringify(result.state)));
  assert.equal(projected.run.status, 'running');
  assert.equal(projected.run.step, 'step-1');
  assert.deepEqual(projected.budgets['step-1'], { spent: 1, limit: 3 });
});

test('the sai-state store carries the run view and resumes it after the coordinator loses its context', () => {
  const call = (args, input) => {
    const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...args], { encoding: 'utf8', input: input || '' });
    return { status: result.status, payload: result.stdout.trim() ? JSON.parse(result.stdout) : null };
  };
  const key = `implement-run-test-${process.pid}-${Date.now()}`;
  const id = call(['spawn', '--key', key]).payload.id;
  try {
    const emit = event => call(['emit', id, 'implement-run@1', '-'], JSON.stringify(event));
    assert.equal(emit(start).payload.stage, 'running');
    emit({ kind: 'attempt', obstacle: 'step-1' });
    emit({ kind: 'record', ref: 'deviation', path: '.tmp/demo/run-1a2b/deviations.md' });
    const status = emit({ kind: 'status' }).payload;
    assert.equal(status.stage, 'running');
    assert.equal(status.run.dir, start.dir);
    assert.deepEqual(status.run.deviations, ['.tmp/demo/run-1a2b/deviations.md']);
    assert.deepEqual(status.budgets['step-1'], { spent: 1, limit: 3 });
    assert.equal(status.next.follow, 'none');
    assert.equal(emit({ kind: 'bogus' }).status, 1);
  } finally {
    call(['close', id]);
  }
});

test('a finished run does not block the next start; an interrupted one still resumes', () => {
  const next = { kind: 'start', dir: '.tmp/demo/run-3c4d' };
  for (const outcome of ['completed', 'stopped']) {
    const finished = run(start, { kind: 'step-start', step: 'step-1' }, { kind: 'attempt', obstacle: 'step-1' },
      { kind: 'step-done', step: 'step-1' }, { kind: 'close', outcome });
    const fresh = machine.transition(finished.state, next);
    assert.equal(fresh.rejected, undefined, `start after ${outcome} must be accepted`);
    assert.equal(fresh.state.stage, 'running');
    assert.equal(fresh.run.dir, next.dir);
    assert.deepEqual(fresh.run.committed, []);
    assert.deepEqual(fresh.budgets, {});
  }
  const escalated = run(start, { kind: 'escalate', obstacle: 'step-1' });
  assert.equal(machine.transition(escalated.state, next).rejected, 'ALREADY_RUNNING');
  assert.equal(machine.transition(escalated.state, next).state.dir, start.dir);
});

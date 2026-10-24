'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const machine = require('../sai-state/machines/merge-run.js');
const registry = require('../sai-state/registry.js');

const SAI_STATE_TOOL = path.join(__dirname, '..', 'bin', 'sai-state.js');
const HEAD = '41dfbce96ba172a61c111e78eec9507393f6ea98';

function run(...events) {
  let state = machine.initialState;
  let result = null;
  for (const event of events) {
    result = machine.transition(state, event);
    state = result.state;
  }
  return result;
}

const start = { kind: 'start', dir: '/tmp/claude-1000/sai/merge-1a2b' };
const launch = { kind: 'launch', method: 'rebase-squash', branch: 'feature/login', head: HEAD, baseline: '/tmp/claude-1000/sai/merge-1a2b/baseline.json' };

test('merge-run@1 is registered, sits on the run core, and declares the machine contract', () => {
  assert.ok(registry.has('merge-run@1'));
  assert.equal(machine.machineId, 'merge-run@1');
  assert.equal(typeof machine.transition, 'function');
  assert.equal(typeof machine.project, 'function');
  assert.equal(machine.initialState.stage, 'idle');
  assert.equal(machine.ATTEMPT_BUDGET, 3);
  assert.deepEqual(machine.METHODS, ['merge', 'rebase', 'rebase-squash']);
  assert.equal(machine.project(machine.initialState).next.follow, 'none');
  assert.equal(machine.transition(machine.initialState, { kind: 'nope' }), null);
});

test('launch records the method, branch, pre-launch HEAD, and baseline path as identifiers', () => {
  const result = run(start, launch);
  assert.equal(result.run.method, 'rebase-squash');
  assert.equal(result.run.branch, 'feature/login');
  assert.equal(result.run.head, HEAD);
  assert.equal(result.run.baseline, launch.baseline);
  const unavailable = run(start, { ...launch, baseline: undefined });
  assert.equal(unavailable.run.baseline, '', 'an unavailable baseline is recorded as none');
});

test('launch rejects an unknown method, a free-text branch, a malformed HEAD, and a closed run', () => {
  const open = run(start).state;
  assert.equal(machine.transition(open, { ...launch, method: 'cherry-pick' }).rejected, 'method must be merge, rebase, or rebase-squash');
  assert.equal(machine.transition(open, { ...launch, branch: 'two\nlines' }).rejected, 'branch required');
  assert.equal(machine.transition(open, { ...launch, branch: undefined }).rejected, 'branch required');
  assert.equal(machine.transition(open, { ...launch, head: 'HEAD' }).rejected, 'pre-launch head commit required');
  assert.equal(machine.transition(open, { ...launch, baseline: 'a\nb' }).rejected, 'baseline must be a path');
  assert.equal(machine.transition(machine.initialState, launch).rejected, 'run is not running');
});

test('stop names the conflict stop in progress and close clears it', () => {
  const stopOne = run(start, launch, { kind: 'stop', stop: 1 });
  assert.equal(stopOne.run.stop, '1');
  assert.equal(machine.transition(stopOne.state, { kind: 'stop', stop: 2 }).run.stop, '2');
  assert.equal(machine.transition(stopOne.state, { kind: 'stop', stop: 0 }).rejected, 'stop index must be a positive integer');
  assert.equal(machine.transition(stopOne.state, { kind: 'stop', stop: 'first' }).rejected, 'stop index must be a positive integer');
  const closed = machine.transition(stopOne.state, { kind: 'close', outcome: 'completed' });
  assert.equal(closed.run.stop, '');
  assert.equal(closed.run.method, 'rebase-squash', 'the method, branch, and head stay for the report');
});

test('each obstacle has a budget of three attempts, and an answer resets only that obstacle', () => {
  let state = run(start).state;
  for (let spent = 1; spent <= 3; spent++) {
    const result = machine.transition(state, { kind: 'attempt', obstacle: 'new-failure' });
    assert.deepEqual(result.budgets['new-failure'], { spent, limit: 3 });
    state = result.state;
  }
  assert.equal(machine.transition(state, { kind: 'attempt', obstacle: 'new-failure' }).rejected, 'exhaustion');
  assert.deepEqual(machine.transition(state, { kind: 'attempt', obstacle: 'stop-2' }).budgets['stop-2'], { spent: 1, limit: 3 });
  state = machine.transition(state, { kind: 'escalate', obstacle: 'new-failure' }).state;
  assert.equal(state.stage, 'escalated');
  assert.equal(machine.transition(state, { kind: 'answer', obstacle: 'new-failure', choice: 'continue' }).budgets['new-failure'], undefined);
  assert.equal(machine.transition(state, { kind: 'answer', obstacle: 'new-failure', choice: 'stop' }).state.stage, 'stopped');
});

test('obstacles, findings, and assumptions are recorded as paths without duplicates', () => {
  const dir = '/tmp/claude-1000/sai/merge-1a2b';
  const result = run(start,
    { kind: 'record', ref: 'obstacle', path: `${dir}/obstacles.md` },
    { kind: 'record', ref: 'obstacle', path: `${dir}/obstacles.md` },
    { kind: 'record', ref: 'finding', path: `${dir}/findings.md` },
    { kind: 'record', ref: 'assumption', path: `${dir}/assumptions.md` });
  assert.deepEqual(result.run.obstacles, [`${dir}/obstacles.md`]);
  assert.deepEqual(result.run.findings, [`${dir}/findings.md`]);
  assert.deepEqual(result.run.assumptions, [`${dir}/assumptions.md`]);
  assert.equal(machine.transition(result.state, { kind: 'record', ref: 'report', path: '/x' }).rejected, 'unknown reference kind');
});

test('a finished run does not block the next start; an interrupted one still resumes', () => {
  const next = { kind: 'start', dir: '/tmp/claude-1000/sai/merge-3c4d' };
  const finished = run(start, launch, { kind: 'stop', stop: 1 }, { kind: 'close', outcome: 'completed' });
  const fresh = machine.transition(finished.state, next);
  assert.equal(fresh.state.stage, 'running');
  assert.equal(fresh.run.method, '');
  assert.equal(fresh.run.head, '');
  const interrupted = run(start, launch, { kind: 'stop', stop: 2 });
  assert.equal(machine.transition(interrupted.state, next).rejected, 'ALREADY_RUNNING');
  assert.equal(interrupted.run.stop, '2', 'the stop survives for the resume');
});

test('the sai-state store carries the run view under the session key and resumes it', () => {
  const call = (args, input) => {
    const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...args], { encoding: 'utf8', input: input || '' });
    return { status: result.status, payload: result.stdout.trim() ? JSON.parse(result.stdout) : null };
  };
  const key = `merge-run-test-${process.pid}-${Date.now()}`;
  const id = call(['spawn', '--key', key]).payload.id;
  try {
    const emit = event => call(['emit', id, 'merge-run@1', '-'], JSON.stringify(event));
    assert.equal(emit(start).payload.stage, 'running');
    emit(launch);
    emit({ kind: 'stop', stop: 1 });
    const status = emit({ kind: 'status' }).payload;
    assert.equal(status.stage, 'running');
    assert.equal(status.run.branch, 'feature/login');
    assert.equal(status.run.head, HEAD);
    assert.equal(status.run.stop, '1');
    assert.equal(status.next.follow, 'none');
    assert.equal(emit({ kind: 'bogus' }).status, 1);
  } finally {
    call(['close', id]);
  }
});

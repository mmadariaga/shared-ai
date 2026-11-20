'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const machine = require('../sai-state/machines/direct-build-run.js');
const registry = require('../sai-state/registry.js');
const { sessionFile } = require('../bin/sai-state.js');

const SAI_STATE_TOOL = path.join(__dirname, '..', 'bin', 'sai-state.js');
const BASE = '41dfbce96ba172a61c111e78eec9507393f6ea98';
const RUN_DIR = '/tmp/claude-1000/sai/direct-build-demo-1a2b';
const REPORT_DIR = '/tmp/claude-1000/sai/sai-transfer-abc123';
const TRANSFER_DIR = '/tmp/claude-1000/sai/sai-transfer-def456';

function run(...events) {
  let state = machine.initialState;
  let result = null;
  for (const event of events) {
    result = machine.transition(state, event);
    state = result.state;
  }
  return result;
}

const start = { kind: 'start', dir: RUN_DIR, change: 'demo' };
const base = [
  { kind: 'field', field: 'base_sha', value: BASE },
  { kind: 'field', field: 'slice_snapshot', value: 'slice-snapshot-1a2b' },
  { kind: 'record', ref: 'report-dir', path: REPORT_DIR },
];
const evidence = { kind: 'record', ref: 'evidence', path: RUN_DIR + '/paths.json' };
const worker = [
  { kind: 'field', field: 'route', value: 'worker' },
  { kind: 'record', ref: 'transfer-dir', path: TRANSFER_DIR },
];

function atArchive(...more) {
  return run(start, ...base, { kind: 'checkpoint', item: 'build-implement' }, evidence,
    { kind: 'checkpoint', item: 'backfill' }, ...worker, { kind: 'checkpoint', item: 'archive' }, ...more);
}

test('direct-build-run@1 is registered, sits on the run core, and declares the machine contract', () => {
  assert.ok(registry.has('direct-build-run@1'));
  assert.equal(machine.machineId, 'direct-build-run@1');
  assert.equal(machine.initialState.stage, 'idle');
  assert.equal(machine.ATTEMPT_BUDGET, 3);
  assert.deepEqual(machine.ITEMS, ['build-implement', 'backfill', 'archive']);
  assert.equal(machine.project(machine.initialState).next.follow, 'none');
  assert.equal(machine.transition(machine.initialState, { kind: 'nope' }), null);
});

test('start opens the run of one slice with its counters at zero', () => {
  const result = run(start);
  assert.equal(result.state.stage, 'running');
  assert.equal(result.run.change, 'demo');
  assert.equal(result.run.dir, RUN_DIR);
  assert.equal(result.run.fix_rounds, '0');
  assert.equal(result.run.gate_rounds, '0');
  assert.equal(machine.transition(machine.initialState, { kind: 'start', dir: RUN_DIR }).rejected, 'change name required');
  assert.equal(machine.transition(result.state, start).rejected, 'ALREADY_RUNNING');
});

test('fields hold identifiers only and reject a free-text or malformed value', () => {
  const open = run(start).state;
  const set = (field, value) => machine.transition(open, { kind: 'field', field, value });
  assert.equal(set('base_sha', BASE).run.base_sha, BASE);
  assert.equal(set('base_sha', 'HEAD').rejected, 'value is not valid for base_sha');
  assert.equal(set('slice_snapshot', 'n/a').run.slice_snapshot, 'n/a');
  assert.equal(set('slice_snapshot', 'two words').rejected, 'value is not valid for slice_snapshot');
  assert.equal(set('route', 'no-specs').run.route, 'no-specs');
  assert.equal(set('route', 'both').rejected, 'value is not valid for route');
  assert.equal(set('fix_rounds', '2').run.fix_rounds, '2');
  assert.equal(set('gate_rounds', 3).run.gate_rounds, '3');
  assert.equal(set('gate_rounds', '-1').rejected, 'value is not valid for gate_rounds');
  assert.equal(set('order_snapshot', 'x').rejected, 'field must be base_sha, slice_snapshot, route, fix_rounds, gate_rounds');
  assert.equal(machine.transition(machine.initialState, { kind: 'field', field: 'route', value: 'worker' }).rejected, 'run is not running');
});

test('step records the pending step among step-1 to step-8', () => {
  const open = run(start).state;
  assert.equal(machine.transition(open, { kind: 'step', step: 'step-2b' }).run.step, 'step-2b');
  assert.equal(machine.transition(open, { kind: 'step', step: 'step-9' }).rejected, 'step must be step-1 … step-8');
});

test('E1: a checkpoint is accepted only when the state its item needs is stored', () => {
  const open = run(start).state;
  const first = machine.transition(open, { kind: 'checkpoint', item: 'build-implement' });
  assert.equal(first.rejected, 'run state incomplete');
  assert.deepEqual(first.missing, ['base_sha', 'slice_snapshot', 'report_dirs']);

  const entered = run(start, ...base, { kind: 'checkpoint', item: 'build-implement' });
  assert.deepEqual(entered.run.items, ['build-implement']);
  assert.equal(entered.run.step, 'step-1');

  const noEvidence = machine.transition(entered.state, { kind: 'checkpoint', item: 'backfill' });
  assert.deepEqual(noEvidence.missing, ['evidence']);
  const backfill = run(start, ...base, { kind: 'checkpoint', item: 'build-implement' }, evidence, { kind: 'checkpoint', item: 'backfill' });
  assert.deepEqual(backfill.run.items, ['build-implement', 'backfill']);
  assert.equal(backfill.run.step, 'step-3');

  const noRoute = machine.transition(backfill.state, { kind: 'checkpoint', item: 'archive' });
  assert.deepEqual(noRoute.missing, ['route', 'transfer_dirs']);
  const archive = atArchive();
  assert.deepEqual(archive.run.items, ['build-implement', 'backfill', 'archive']);
  assert.equal(archive.run.step, 'step-7');
});

test('re-entering an item drops the checkpoints after it', () => {
  const again = machine.transition(atArchive().state, { kind: 'checkpoint', item: 'backfill' });
  assert.deepEqual(again.run.items, ['build-implement', 'backfill']);
});

test('E3: an execute order in flight is uncertain until its check settles, and a consumed archive order stays consumed', () => {
  const sent = atArchive({ kind: 'order', order: 'archive-execute', snapshot: 'order-snapshot-1' });
  assert.equal(sent.run.order_state, 'sent');
  assert.equal(sent.run.order_snapshot, 'order-snapshot-1');
  assert.deepEqual(machine.rewindView(sent.state), { change: 'demo', items: ['build-implement', 'backfill', 'archive'], hold: 'uncertain' });

  const inconclusive = machine.transition(sent.state, { kind: 'order-result', result: 'uncertain' });
  assert.equal(inconclusive.run.order_state, 'uncertain');
  assert.equal(machine.rewindView(inconclusive.state).hold, 'uncertain');

  const none = machine.transition(inconclusive.state, { kind: 'order-result', result: 'no-effect' });
  assert.equal(none.run.order_state, '');
  assert.equal(machine.rewindView(none.state).hold, '', 'a verified no-effect check releases the rewind');
  assert.deepEqual(none.run.consumed, []);

  const done = machine.transition(sent.state, { kind: 'order-result', result: 'done' });
  assert.deepEqual(done.run.consumed, ['archive-execute']);
  assert.equal(machine.rewindView(done.state).hold, 'consumed');
  assert.equal(machine.transition(done.state, { kind: 'order', order: 'archive-execute', snapshot: 'order-snapshot-2' }).rejected, 'order already consumed');

  const grants = machine.transition(machine.transition(done.state, { kind: 'consume', grant: 'archive-commit' }).state, { kind: 'consume', grant: 'telemetry-commit' });
  assert.deepEqual(grants.run.consumed, ['archive-execute', 'archive-commit', 'telemetry-commit']);
  assert.equal(machine.transition(done.state, { kind: 'consume', grant: 'push' }).rejected, 'grant must be archive-commit or telemetry-commit');
});

test('a backfill order leaves nothing consumed, so it never holds a rewind once settled', () => {
  const sent = run(start, { kind: 'order', order: 'backfill-execute', snapshot: 'n/a' });
  const done = machine.transition(sent.state, { kind: 'order-result', result: 'done' });
  assert.deepEqual(done.run.consumed, []);
  assert.equal(machine.rewindView(done.state).hold, '');
  assert.equal(machine.transition(machine.initialState, { kind: 'order-result', result: 'done' }).rejected, 'no order is in flight');
  assert.equal(machine.transition(start && run(start).state, { kind: 'order', order: 'push', snapshot: 'x' }).rejected, 'order must be backfill-execute or archive-execute');
});

test('discard returns one slice to the initial state and leaves another slice alone', () => {
  const state = atArchive().state;
  const other = machine.transition(state, { kind: 'discard', change: 'other' });
  assert.equal(other.run.change, 'demo');
  assert.deepEqual(other.run.items, ['build-implement', 'backfill', 'archive']);
  const gone = machine.transition(state, { kind: 'discard', change: 'demo' });
  assert.deepEqual(gone.state, machine.initialState);
});

test('rewind cuts the checkpoints back to an item, and the first item discards everything', () => {
  const state = atArchive().state;
  const back = machine.transition(state, { kind: 'rewind', change: 'demo', item: 'backfill' });
  assert.deepEqual(back.run.items, ['build-implement', 'backfill']);
  assert.equal(back.run.step, 'step-3');
  assert.equal(back.run.base_sha, BASE, 'the stored references stay for the re-entered item');
  assert.deepEqual(machine.transition(state, { kind: 'rewind', change: 'demo', item: 'build-implement' }).state, machine.initialState);
  assert.equal(machine.transition(state, { kind: 'rewind', change: 'other', item: 'backfill' }).run.items.length, 3);
  assert.equal(machine.transition(state, { kind: 'rewind', change: 'demo', item: 'merge' }).rejected, 'item must be build-implement, backfill, archive');
});

test('worker handles are recorded per role, with the warning of a changed handle under create', () => {
  const first = run(start, { kind: 'record', ref: 'worker', role: 'implementer', handle: 'agent-1', reason: 'create' });
  assert.deepEqual(first.run.workers, ['implementer:agent-1']);
  const replaced = machine.transition(first.state, { kind: 'record', ref: 'worker', role: 'implementer', handle: 'agent-2', reason: 'replace' });
  assert.deepEqual(replaced.run.workers, ['implementer:agent-1', 'implementer:agent-2']);
  assert.equal(replaced.warnings, undefined);
  const changed = machine.transition(first.state, { kind: 'record', ref: 'worker', role: 'implementer', handle: 'agent-3', reason: 'create' });
  assert.deepEqual(changed.warnings, ['WORKER_HANDLE_CHANGED']);
  assert.equal(machine.transition(machine.initialState, { kind: 'record', ref: 'worker', role: 'implementer', handle: 'a', reason: 'create' }).rejected, 'run is not started');
});

test('references are recorded as paths without duplicates', () => {
  const result = run(start, ...base, { kind: 'record', ref: 'report-dir', path: REPORT_DIR }, evidence, evidence,
    { kind: 'record', ref: 'commit', path: BASE }, { kind: 'record', ref: 'project-dir', path: '/tmp/claude-1000/sai/backfill-validation-1' });
  assert.deepEqual(result.run.report_dirs, [REPORT_DIR]);
  assert.deepEqual(result.run.evidence, [RUN_DIR + '/paths.json']);
  assert.deepEqual(result.run.commits, [BASE]);
  assert.deepEqual(result.run.project_dirs, ['/tmp/claude-1000/sai/backfill-validation-1']);
  assert.equal(machine.transition(result.state, { kind: 'record', ref: 'deviation', path: '/x' }).rejected, 'unknown reference kind');
});

test('each step has a budget of three attempts that survives a resume, and resume keeps the counters', () => {
  let state = run(start, { kind: 'field', field: 'fix_rounds', value: '2' }, { kind: 'step', step: 'step-4' }).state;
  for (let spent = 1; spent <= 3; spent++) {
    const result = machine.transition(state, { kind: 'attempt', obstacle: 'step-4' });
    assert.deepEqual(result.budgets['step-4'], { spent, limit: 3 });
    state = result.state;
  }
  assert.equal(machine.transition(state, { kind: 'attempt', obstacle: 'step-4' }).rejected, 'exhaustion');
  state = machine.transition(state, { kind: 'escalate', obstacle: 'step-4' }).state;
  assert.equal(state.stage, 'escalated');

  const resumed = machine.transition(state, { kind: 'resume', change: 'demo' });
  assert.equal(resumed.state.stage, 'running');
  assert.equal(resumed.run.blocker, '');
  assert.equal(resumed.run.fix_rounds, '2');
  assert.equal(resumed.run.step, 'step-4');
  assert.deepEqual(resumed.budgets['step-4'], { spent: 3, limit: 3 }, 'a resume reopens no budget');
});

test('resume reopens a parked run of the same slice only', () => {
  const parked = run(start, ...base, { kind: 'close', outcome: 'stopped' });
  assert.equal(parked.state.stage, 'stopped');
  assert.equal(machine.transition(parked.state, { kind: 'resume', change: 'demo' }).state.stage, 'running');
  assert.equal(machine.transition(parked.state, { kind: 'resume', change: 'other' }).rejected, 'no run state for that change');
  assert.equal(machine.transition(machine.initialState, { kind: 'resume', change: 'demo' }).rejected, 'no run state for that change');
  const done = machine.transition(run(start).state, { kind: 'close', outcome: 'completed' });
  assert.equal(machine.transition(done.state, { kind: 'resume', change: 'demo' }).rejected, 'run is completed');
});

test('E8: a start after a finished slice opens fresh state for the next slice', () => {
  const finished = machine.transition(atArchive().state, { kind: 'close', outcome: 'completed' });
  const next = machine.transition(finished.state, { kind: 'start', dir: RUN_DIR + '-2', change: 'next' });
  assert.equal(next.run.change, 'next');
  assert.deepEqual(next.run.items, []);
  assert.equal(next.run.base_sha, '');
  assert.deepEqual(next.run.report_dirs, []);
});

// ---------------------------------------------------------------------------
// The store: the run state follows the slice cursor in one session-file write.
// ---------------------------------------------------------------------------

function call(args, input) {
  const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...args], { encoding: 'utf8', input: input || '' });
  return { status: result.status, payload: result.stdout.trim() ? JSON.parse(result.stdout) : null };
}

function openStore() {
  const key = `direct-build-run-test-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const id = call(['spawn', '--key', key]).payload.id;
  const slice = (event) => call(['emit', id, 'explore-slice@1', '-'], JSON.stringify(event));
  const runState = (event) => call(['emit', id, 'direct-build-run@1', '-'], JSON.stringify(event));
  const stored = () => JSON.parse(fs.readFileSync(sessionFile(id), 'utf8')).stateByMachine;
  return { id, slice, runState, stored, close: () => call(['close', id]) };
}

function startedSlice(store, names = ['demo', 'next']) {
  store.slice({ recordedList: names });
  store.slice({ intent: 'route-choice' });
  assert.equal(store.slice({ intent: 'direct-build' }).payload.stage, 'build-implement');
  assert.equal(store.runState(start).payload.stage, 'running');
  for (const event of [...base, { kind: 'checkpoint', item: 'build-implement' }, evidence, { kind: 'checkpoint', item: 'backfill' }]) store.runState(event);
  store.slice({ intent: 'complete' });
  store.runState({ kind: 'step', step: 'step-3' });
  for (const event of [...worker, { kind: 'checkpoint', item: 'archive' }]) store.runState(event);
  store.slice({ intent: 'complete' });
}

test('E1/E2: the stored run state accepts a rewind to a later step and survives as the run view', () => {
  const store = openStore();
  try {
    startedSlice(store);
    const status = store.runState({ kind: 'status' }).payload;
    assert.equal(status.run.change, 'demo');
    assert.deepEqual(status.run.items, ['build-implement', 'backfill', 'archive']);
    assert.equal(status.run.base_sha, BASE);

    const parked = store.slice({ intent: 'fail' });
    assert.equal(parked.status, 0);

    const rewound = store.slice({ intent: 'goto', target: 'backfill', reason: 'correction' });
    assert.equal(rewound.status, 0);
    assert.equal(rewound.payload.rejected, undefined);
    const kept = store.stored()['direct-build-run@1'].state;
    assert.deepEqual(kept.items, ['build-implement', 'backfill'], 'the rewind cut the later checkpoint in the same write');
    assert.equal(kept.step, 'step-3');
    assert.equal(kept.base_sha, BASE);

    const resumed = store.slice({ intent: 'resume-direct-build' });
    assert.equal(resumed.payload.stage, 'backfill');
    assert.equal(store.runState({ kind: 'resume', change: 'demo' }).payload.run.status, 'running');
  } finally {
    store.close();
  }
});

test('E1: a rewind to a step with no stored run state is rejected with the missing run state, and the first step stays available', () => {
  const store = openStore();
  try {
    store.slice({ recordedList: ['demo'] });
    store.slice({ intent: 'route-choice' });
    store.slice({ intent: 'direct-build' });
    store.slice({ intent: 'complete' });
    store.slice({ intent: 'complete' });
    const rejected = store.slice({ intent: 'goto', target: 'backfill', reason: 'correction' });
    assert.equal(rejected.payload.rejected, 'MISSING_PRECONDITIONS');
    assert.deepEqual(rejected.payload.missing, ['run-state']);
    assert.equal(rejected.payload.resume_at, 'build-implement');
    assert.equal(rejected.payload.stage, 'archive');
    const first = store.slice({ intent: 'goto', target: 'build-implement', reason: 'correction' });
    assert.equal(first.payload.rejected, undefined);
    assert.equal(first.payload.stage, 'build-implement');
  } finally {
    store.close();
  }
});

test('E3: a rewind is refused while an execute order is uncertain and while an archive order is consumed', () => {
  const store = openStore();
  try {
    startedSlice(store);
    store.runState({ kind: 'order', order: 'archive-execute', snapshot: 'order-snapshot-1' });
    store.runState({ kind: 'order-result', result: 'uncertain' });
    store.slice({ intent: 'fail' });
    assert.equal(store.slice({ intent: 'goto', target: 'backfill', reason: 'correction' }).payload.rejected, 'GOTO_ORDER_UNCERTAIN');
    assert.equal(store.slice({ intent: 'goto', target: 'build-implement', reason: 'correction' }).payload.rejected, 'GOTO_ORDER_UNCERTAIN');
    assert.equal(store.stored()['direct-build-run@1'].state.items.length, 3, 'a rejected goto changes no run state');

    store.runState({ kind: 'resume', change: 'demo' });
    store.runState({ kind: 'order-result', result: 'no-effect' });
    const released = store.slice({ intent: 'goto', target: 'backfill', reason: 'correction' });
    assert.equal(released.payload.rejected, undefined, 'a verified no-effect check releases the rewind');
  } finally {
    store.close();
  }
});

test('E3: a consumed archive order is never renewed by a rewind', () => {
  const store = openStore();
  try {
    startedSlice(store);
    store.runState({ kind: 'order', order: 'archive-execute', snapshot: 'order-snapshot-1' });
    store.runState({ kind: 'order-result', result: 'done' });
    store.slice({ intent: 'fail' });
    assert.equal(store.slice({ intent: 'goto', target: 'backfill', reason: 'correction' }).payload.rejected, 'GOTO_ORDER_CONSUMED');
    assert.equal(store.slice({ intent: 'goto', target: 'build-implement', reason: 'correction' }).payload.rejected, 'GOTO_ORDER_CONSUMED');
    assert.deepEqual(store.stored()['direct-build-run@1'].state.consumed, ['archive-execute']);
  } finally {
    store.close();
  }
});

test('E6: going back to pending, or a content amendment, discards the stored run state', () => {
  const store = openStore();
  try {
    startedSlice(store);
    store.slice({ intent: 'fail' });
    const moved = store.slice({ intent: 'goto', target: 'pending', reason: 'user-request' });
    assert.equal(moved.payload.rejected, undefined);
    assert.deepEqual(store.stored()['direct-build-run@1'].state.items, []);
    assert.equal(store.stored()['direct-build-run@1'].state.change, '');
    assert.equal(store.stored()['direct-build-run@1'].state.stage, 'idle');

    const amended = openStore();
    try {
      startedSlice(amended);
      amended.slice({ intent: 'fail' });
      amended.slice({ amend: 'demo', amend_kind: 'metadata' });
      assert.equal(amended.stored()['direct-build-run@1'].state.change, 'demo', 'a metadata amendment keeps it');
      amended.slice({ amend: 'demo', amend_kind: 'content' });
      assert.equal(amended.stored()['direct-build-run@1'].state.change, '');
    } finally {
      amended.close();
    }
  } finally {
    store.close();
  }
});

test('E7/E8: a reset of the run machine clears every stored run state, and a fresh slice starts with none', () => {
  const store = openStore();
  try {
    startedSlice(store);
    assert.equal(call(['reset', store.id, 'direct-build-run@1']).payload.reset, 'direct-build-run@1');
    const status = store.runState({ kind: 'status' }).payload;
    assert.equal(status.run.change, '');
    assert.deepEqual(status.run.items, []);
  } finally {
    store.close();
  }

  const second = openStore();
  try {
    startedSlice(second, ['demo', 'next']);
    second.slice({ intent: 'complete' });
    second.runState({ kind: 'close', outcome: 'completed' });
    const next = second.slice({ intent: 'auto-continue' });
    assert.equal(next.payload.stage, 'build-implement');
    const stored = second.stored()['direct-build-run@1'].state;
    assert.equal(stored.change, '', 'the next slice starts with no run state of the earlier one');
    assert.deepEqual(stored.items, []);
  } finally {
    second.close();
  }
});

test('E4: a session that never stored a run state rejects every rewind past the first step', () => {
  const store = openStore();
  try {
    store.slice({ recordedList: ['demo'] });
    store.slice({ intent: 'route-choice' });
    store.slice({ intent: 'direct-build' });
    store.slice({ intent: 'complete' });
    store.slice({ intent: 'complete' });
    assert.equal(store.slice({ intent: 'goto', target: 'backfill', reason: 'user-request' }).payload.rejected, 'MISSING_PRECONDITIONS');
    assert.equal(store.stored()['direct-build-run@1'], undefined, 'the rejection wrote no run machine');
  } finally {
    store.close();
  }
});

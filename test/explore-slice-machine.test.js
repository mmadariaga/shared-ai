'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const slice = require('../sai-state/machines/explore-slice.js');
const registry = require('../sai-state/registry.js');

test('explore-slice@1 is registered with no explore-stage@1 alias', () => {
  assert.equal(slice.machineId, 'explore-slice@1');
  assert.ok(registry.has('explore-slice@1'), 'explore-slice@1 must be registered');
  assert.ok(registry.has('explore-idea@1'), 'explore-idea@1 must be registered');
  assert.equal(registry.get('explore-stage@1'), undefined, 'explore-stage@1 must have no alias');
});

test('Direct Build cursor travels in stage: build-implement → backfill → archive → idle', () => {
  let state = slice.initialState;
  assert.equal(state.stage, 'idle');
  const recorded = slice.transition(state, { recordedList: ['a'] });
  assert.equal(recorded.state.stage, 'idle');
  const start = slice.transition(recorded.state, { intent: 'direct-build' });
  assert.equal(start.state.stage, 'build-implement');
  assert.equal(start.state.active, 'a');
  const mid = slice.transition(start.state, { intent: 'complete' });
  assert.equal(mid.state.stage, 'backfill');
  const arch = slice.transition(mid.state, { intent: 'complete' });
  assert.equal(arch.state.stage, 'archive');
  const done = slice.transition(arch.state, { intent: 'complete' });
  assert.equal(done.state.stage, 'idle');
  assert.equal(done.state.active, null);
  assert.deepEqual(done.state.done, ['a']);
  assert.ok(!('set' in done.next) && done.next.follow && done.next.hint, 'next stays pointer-only');
});

test('E8 fail/cancel and E9 already-running and E2 next-slice do not mark done', () => {
  const started = slice.transition(slice.initialState, { intent: 'direct-build' });
  const again = slice.transition(started.state, { intent: 'direct-build' });
  assert.equal(again.rejected, 'ALREADY_RUNNING');
  assert.equal(again.state.stage, 'build-implement');
  const failed = slice.transition(started.state, { intent: 'fail' });
  assert.equal(failed.state.stage, 'build-implement');
  assert.ok(failed.state.active != null);
  assert.deepEqual(failed.state.done, []);
  const cancelled = slice.transition(started.state, { intent: 'cancel' });
  assert.equal(cancelled.state.stage, 'build-implement');
  const onArchive = slice.transition(
    slice.transition(slice.transition(started.state, { intent: 'complete' }).state, { intent: 'complete' }).state,
    { intent: 'next-slice' },
  );
  assert.equal(onArchive.state.stage, 'archive');
  assert.ok(onArchive.state.active != null);
  assert.deepEqual(onArchive.state.done, []);
});

test('slice step and instructions carry next-slice for Plan and Manual only', () => {
  const sliceStep = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'slice.md'), 'utf8');
  const instructions = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');
  assert.match(sliceStep, /next-slice/);
  assert.match(sliceStep, /Plan and Manual/);
  assert.match(sliceStep, /Direct Build never uses `next-slice`/);
  assert.match(instructions, /next-slice/);
  assert.match(instructions, /Mere containment of the string `next-slice` SHALL NOT fire the token/);
  assert.match(instructions, /Direct Build never uses `next-slice`/);
});

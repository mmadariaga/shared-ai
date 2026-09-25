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
  assert.match(start.next.hint, /^load and follow /);
  const mid = slice.transition(start.state, { intent: 'complete' });
  assert.equal(mid.state.stage, 'backfill');
  assert.match(mid.next.hint, /^follow the instructions of /);
  const arch = slice.transition(mid.state, { intent: 'complete' });
  assert.equal(arch.state.stage, 'archive');
  const done = slice.transition(arch.state, { intent: 'complete' });
  assert.equal(done.state.stage, 'idle');
  assert.equal(done.state.active, null);
  assert.deepEqual(done.state.done, ['a']);
  assert.ok(!('set' in done.next) && done.next.follow && done.next.hint, 'next stays pointer-only');
});

test('E8 fail/cancel and E9 already-running and E2 next-slice do not mark done', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = slice.transition(recorded.state, { intent: 'direct-build' });
  const again = slice.transition(started.state, { intent: 'direct-build' });
  assert.equal(again.rejected, 'ALREADY_RUNNING');
  assert.equal(again.state.stage, 'build-implement');
  const failed = slice.transition(started.state, { intent: 'fail' });
  assert.equal(failed.state.stage, 'idle');
  assert.equal(failed.state.active, null);
  assert.deepEqual(failed.state.parked, { a: { mode: 'direct-build', stage: 'build-implement' } });
  assert.deepEqual(failed.state.done, []);
  const cancelled = slice.transition(started.state, { intent: 'cancel' });
  assert.equal(cancelled.state.stage, 'idle');
  assert.deepEqual(cancelled.state.parked, { a: { mode: 'direct-build', stage: 'build-implement' } });
  assert.deepEqual(cancelled.state.done, []);
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
  const planStep = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'pipeline-plan-unattended.md'), 'utf8');
  assert.match(sliceStep, /next-slice/);
  assert.match(sliceStep, /Plan and Manual/);
  assert.match(sliceStep, /Direct Build never uses `next-slice`/);
  assert.match(instructions, /next-slice/);
  assert.match(sliceStep, /Mere containment of the string `next-slice` SHALL NOT fire the token/);
  assert.match(planStep, /Implement completes only on `next-slice`/);
  assert.match(sliceStep, /Plan `next-slice`-on-implement rule lives in `pipeline-plan-unattended\.md`/);
});

test('Plan cursor travels idle → sai-1 → sai-2 → implement → idle; last idle is rest', () => {
  let state = slice.initialState;
  const recorded = slice.transition(state, { recordedList: ['a'] });
  const start = slice.transition(recorded.state, { intent: 'plan' });
  assert.equal(start.state.stage, 'sai-1');
  assert.equal(start.state.active, 'a');
  assert.equal(start.state.mode, 'plan');
  assert.equal(start.next.follow, 'sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.match(start.next.hint, /^load and follow /);
  const mid = slice.transition(start.state, { intent: 'complete' });
  assert.equal(mid.state.stage, 'sai-2');
  assert.match(mid.next.hint, /^follow the instructions of /);
  const impl = slice.transition(mid.state, { intent: 'complete' });
  assert.equal(impl.state.stage, 'implement');
  assert.match(impl.next.hint, /^follow the instructions of /);
  const completeOnImpl = slice.transition(impl.state, { intent: 'complete' });
  assert.equal(completeOnImpl.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(completeOnImpl.state.stage, 'implement');
  const done = slice.transition(impl.state, { intent: 'next-slice' });
  assert.equal(done.state.stage, 'idle');
  assert.equal(done.state.active, null);
  assert.equal(done.state.mode, null);
  assert.deepEqual(done.state.done, ['a']);
  assert.match(done.next.hint, /^load and follow /);
});

test('E1 next-slice on sai-1/sai-2 stays put; E2 fail keeps pending; E3 already-running across modes', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = slice.transition(recorded.state, { intent: 'plan' });
  const earlySlice = slice.transition(started.state, { intent: 'next-slice' });
  assert.equal(earlySlice.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(earlySlice.state.stage, 'sai-1');
  assert.ok(earlySlice.state.active != null);
  const sai2 = slice.transition(started.state, { intent: 'complete' });
  const midSlice = slice.transition(sai2.state, { intent: 'next-slice' });
  assert.equal(midSlice.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(midSlice.state.stage, 'sai-2');
  const failed = slice.transition(sai2.state, { intent: 'fail' });
  assert.equal(failed.state.stage, 'idle');
  assert.deepEqual(failed.state.parked, { a: { mode: 'plan', stage: 'sai-2' } });
  assert.deepEqual(failed.state.done, []);
  const again = slice.transition(started.state, { intent: 'plan' });
  assert.equal(again.rejected, 'ALREADY_RUNNING');
  const cross = slice.transition(started.state, { intent: 'direct-build' });
  assert.equal(cross.rejected, 'ALREADY_RUNNING');
  assert.equal(cross.state.mode, 'plan');
  const dbRecorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const db = slice.transition(dbRecorded.state, { intent: 'direct-build' });
  const dbCross = slice.transition(db.state, { intent: 'plan' });
  assert.equal(dbCross.rejected, 'ALREADY_RUNNING');
  assert.equal(dbCross.state.mode, 'direct-build');
});

test('idea stages route to their own step files and hint load and follow', () => {
  const idea = require('../sai-state/machines/explore-idea.js');
  const first = idea.project(idea.initialState);
  assert.match(first.next.hint, /^load and follow /);
  assert.equal(first.next.follow, 'sai/commands/explore/steps/common.md');
  const stage2 = idea.transition(idea.initialState, { intent: 'next-step' });
  assert.equal(stage2.state.stage, 'review-edge-cases');
  assert.equal(stage2.next.follow, 'sai/commands/explore/steps/review-edge-cases.md');
  assert.match(stage2.next.hint, /^load and follow /);
  const stage3 = idea.transition(stage2.state, { intent: 'next-step' });
  assert.equal(stage3.state.stage, 'implementation-details');
  assert.equal(stage3.next.follow, 'sai/commands/explore/steps/implementation-details.md');
  assert.match(stage3.next.hint, /^load and follow /);
  const cryst = idea.transition(stage3.state, { intent: 'next-step' });
  assert.equal(cryst.state.stage, 'crystallize');
  assert.match(cryst.next.hint, /^load and follow /);
  assert.equal(cryst.next.follow, 'sai/commands/explore/steps/crystallization-protocol.md');
});

test('empty pending rejects NO_PENDING_SLICE with unchanged state; non-empty starts pending[0]', () => {
  const emptyPlan = slice.transition(slice.initialState, { intent: 'plan' });
  assert.equal(emptyPlan.rejected, 'NO_PENDING_SLICE');
  assert.equal(emptyPlan.state.stage, 'idle');
  assert.equal(emptyPlan.state.active, null);
  assert.equal(emptyPlan.state.mode, null);
  assert.deepEqual(emptyPlan.state.set, []);
  assert.deepEqual(emptyPlan.state.done, []);
  const emptyBuild = slice.transition(slice.initialState, { intent: 'direct-build' });
  assert.equal(emptyBuild.rejected, 'NO_PENDING_SLICE');
  assert.equal(emptyBuild.state.stage, 'idle');
  assert.equal(emptyBuild.state.active, null);
  assert.equal(emptyBuild.state.mode, null);
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  const planStart = slice.transition(recorded.state, { intent: 'plan' });
  assert.equal(planStart.state.active, 'a');
  assert.equal(planStart.state.stage, 'sai-1');
  assert.ok(!('rejected' in planStart));
  const buildStart = slice.transition(recorded.state, { intent: 'direct-build' });
  assert.equal(buildStart.state.active, 'a');
  assert.equal(buildStart.state.stage, 'build-implement');
  assert.ok(!('rejected' in buildStart));
});

test('ALREADY_RUNNING keeps precedence over NO_PENDING_SLICE; exhausted set rejects like empty', () => {
  const runningEmptyPending = slice.transition(
    { stage: 'build-implement', set: ['a'], active: 'a', done: ['a'], mode: 'direct-build' },
    { intent: 'direct-build' },
  );
  assert.equal(runningEmptyPending.rejected, 'ALREADY_RUNNING');
  assert.equal(runningEmptyPending.state.active, 'a');
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const start = slice.transition(recorded.state, { intent: 'direct-build' });
  const mid = slice.transition(start.state, { intent: 'complete' });
  const arch = slice.transition(mid.state, { intent: 'complete' });
  const done = slice.transition(arch.state, { intent: 'complete' });
  assert.equal(done.state.stage, 'idle');
  assert.equal(done.state.active, null);
  assert.deepEqual(done.state.done, ['a']);
  const againPlan = slice.transition(done.state, { intent: 'plan' });
  assert.equal(againPlan.rejected, 'NO_PENDING_SLICE');
  assert.equal(againPlan.state.stage, 'idle');
  assert.equal(againPlan.state.active, null);
  const againBuild = slice.transition(done.state, { intent: 'direct-build' });
  assert.equal(againBuild.rejected, 'NO_PENDING_SLICE');
  assert.equal(againBuild.state.stage, 'idle');
  assert.equal(againBuild.state.active, null);
});

test('a failed Plan slice resumes at its saved stage on a later plan selection', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = slice.transition(recorded.state, { intent: 'plan' });
  const sai2 = slice.transition(started.state, { intent: 'complete' });
  const failed = slice.transition(sai2.state, { intent: 'fail' });
  assert.ok(!('rejected' in failed));
  assert.equal(failed.next.follow, 'sai/commands/explore/steps/route-selector.md');
  const retry = slice.transition(failed.state, { intent: 'plan' });
  assert.ok(!('rejected' in retry));
  assert.equal(retry.state.active, 'a');
  assert.equal(retry.state.mode, 'plan');
  assert.equal(retry.state.stage, 'sai-2');
  assert.deepEqual(retry.state.parked, {});
  const impl = slice.transition(retry.state, { intent: 'complete' });
  assert.equal(impl.state.stage, 'implement');
});

test('a failed Direct Build slice resumes at its saved stage', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = slice.transition(recorded.state, { intent: 'direct-build' });
  const backfill = slice.transition(started.state, { intent: 'complete' });
  const cancelled = slice.transition(backfill.state, { intent: 'cancel' });
  const retry = slice.transition(cancelled.state, { intent: 'direct-build' });
  assert.ok(!('rejected' in retry));
  assert.equal(retry.state.stage, 'backfill');
  assert.equal(retry.state.active, 'a');
});

test('a parked slice resumes only in its own mode', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = slice.transition(recorded.state, { intent: 'plan' });
  const failed = slice.transition(slice.transition(started.state, { intent: 'complete' }).state, { intent: 'fail' });
  const cross = slice.transition(failed.state, { intent: 'direct-build' });
  assert.equal(cross.rejected, 'ALREADY_RUNNING');
  assert.equal(cross.state.active, null);
  assert.equal(cross.state.stage, 'idle');
  assert.deepEqual(cross.state.parked, { a: { mode: 'plan', stage: 'sai-2' } });
});

test('a parked slice does not block another pending slice', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  const started = slice.transition(recorded.state, { intent: 'plan' });
  const failed = slice.transition(started.state, { intent: 'fail' });
  const other = slice.transition(failed.state, { intent: 'direct-build', pick: 'b' });
  assert.ok(!('rejected' in other));
  assert.equal(other.state.active, 'b');
  assert.equal(other.state.stage, 'build-implement');
  assert.deepEqual(other.state.parked, { a: { mode: 'plan', stage: 'sai-1' } });
});

test('pick starts the chosen pending slice; a pick outside the pending set rejects', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  const picked = slice.transition(recorded.state, { intent: 'plan', pick: 'b' });
  assert.equal(picked.state.active, 'b');
  assert.equal(picked.state.stage, 'sai-1');
  const impl = slice.transition(slice.transition(picked.state, { intent: 'complete' }).state, { intent: 'complete' });
  const closed = slice.transition(impl.state, { intent: 'next-slice' });
  assert.deepEqual(closed.state.done, ['b']);
  const repick = slice.transition(closed.state, { intent: 'plan', pick: 'b' });
  assert.equal(repick.rejected, 'NO_PENDING_SLICE');
  assert.equal(repick.state.active, null);
  const unknown = slice.transition(recorded.state, { intent: 'direct-build', pick: 'zzz' });
  assert.equal(unknown.rejected, 'NO_PENDING_SLICE');
  const notString = slice.transition(recorded.state, { intent: 'plan', pick: 1 });
  assert.equal(notString.rejected, 'NO_PENDING_SLICE');
});

test('a recordedList discards parked cursors so re-crystallized slices restart', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = slice.transition(recorded.state, { intent: 'plan' });
  const failed = slice.transition(slice.transition(started.state, { intent: 'complete' }).state, { intent: 'fail' });
  const recrystallized = slice.transition(failed.state, { recordedList: ['a'] });
  assert.deepEqual(recrystallized.state.parked, {});
  const restart = slice.transition(recrystallized.state, { intent: 'plan' });
  assert.equal(restart.state.stage, 'sai-1');
});

test('fail or cancel with no active slice changes nothing', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const failed = slice.transition(recorded.state, { intent: 'fail' });
  assert.ok(!('rejected' in failed));
  assert.equal(failed.state.stage, 'idle');
  assert.deepEqual(failed.state.parked, {});
});

test('route-selector acknowledges NO_PENDING_SLICE as missing inventory without dispatch', () => {
  const selector = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'route-selector.md'), 'utf8');
  assert.match(selector, /NO_PENDING_SLICE/);
  assert.match(selector, /no change has been crystallized/);
  assert.match(selector, /block-first/);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const slice = require('../sai-state/machines/explore-slice.js');
const registry = require('../sai-state/registry.js');

function selectRoute(state, intent, extra = {}) {
  const selector = slice.transition(state, { intent: 'route-choice' });
  if (selector.rejected) return selector;
  return slice.transition(selector.state, Object.assign({}, extra, { intent }));
}

test('explore-slice@1 is registered with no explore-stage@1 alias', () => {
  assert.equal(slice.machineId, 'explore-slice@1');
  assert.ok(registry.has('explore-slice@1'), 'explore-slice@1 must be registered');
  assert.ok(registry.has('explore-idea@1'), 'explore-idea@1 must be registered');
  assert.equal(registry.get('explore-stage@1'), undefined, 'explore-stage@1 must have no alias');
});

test('Direct Build exposes the picker after inventory recording but waits for its answer', () => {
  let state = slice.initialState;
  assert.equal(state.stage, 'idle');
  const premature = slice.transition(state, { intent: 'direct-build' });
  assert.equal(premature.rejected, 'INVENTORY_NOT_READY');
  assert.equal(premature.state.active, null);
  const recorded = slice.transition(state, { recordedList: ['a'] });
  assert.equal(recorded.state.stage, 'waiting');
  assert.equal(recorded.state.inventoryReady, true);
  assert.equal(recorded.next.follow, 'sai/commands/explore/steps/route-selector.md',
    'successful inventory recording exposes the route picker step');
  assert.equal(recorded.state.blockEmissionTurnClosed, true,
    'the route gate stays closed while the picker is only being presented');
  assert.equal(slice.transition(recorded.state, { intent: 'direct-build' }).rejected, 'ROUTE_CHOICE_REQUIRED');
  const choiceTurn = slice.transition(recorded.state, { intent: 'route-choice' });
  assert.equal(choiceTurn.state.stage, 'waiting');
  assert.equal(choiceTurn.next.follow, 'sai/commands/explore/steps/route-selector.md');
  state = choiceTurn.state;
  const start = slice.transition(state, { intent: 'direct-build' });
  assert.equal(start.state.stage, 'build-implement');
  assert.equal(start.state.active, 'a');
  assert.match(start.next.hint, /^load and follow /);
  const mid = slice.transition(start.state, { intent: 'complete' });
  assert.equal(mid.state.stage, 'backfill');
  assert.match(mid.next.hint, /^follow the instructions of /);
  const arch = slice.transition(mid.state, { intent: 'complete' });
  assert.equal(arch.state.stage, 'archive');
  const done = slice.transition(arch.state, { intent: 'complete' });
  assert.equal(done.state.stage, 'waiting');
  assert.equal(done.state.active, null);
  assert.deepEqual(done.state.done, ['a']);
  assert.ok(!('set' in done.next) && done.next.follow && done.next.hint, 'next stays pointer-only');
});

test('route-choice activation rejects a premature reply and does not select a mode before the picker answer', () => {
  const premature = slice.transition(slice.initialState, { intent: 'route-choice' });
  assert.equal(premature.rejected, 'INVENTORY_NOT_READY');
  assert.equal(premature.state.active, null);
  assert.equal(premature.next.follow, 'none');

  const recorded = slice.transition(slice.initialState, { recordedList: ['first', 'second'] });
  assert.equal(recorded.next.follow, 'sai/commands/explore/steps/route-selector.md');
  assert.equal(recorded.state.blockEmissionTurnClosed, true);
  assert.equal(slice.transition(recorded.state, { intent: 'plan' }).rejected, 'ROUTE_CHOICE_REQUIRED');
  assert.equal(slice.transition(recorded.state, { intent: 'direct-build' }).rejected, 'ROUTE_CHOICE_REQUIRED');

  // This event represents a valid answer returned by the native picker.
  const exposed = slice.transition(recorded.state, { intent: 'route-choice' });
  assert.equal(exposed.next.follow, 'sai/commands/explore/steps/route-selector.md');
  assert.equal(exposed.state.stage, 'waiting');
  assert.equal(exposed.state.mode, null, 'the event exposes instructions but does not choose Plan or Direct Build');
  assert.equal(exposed.state.active, null);
  assert.equal(exposed.state.blockEmissionTurnClosed, false);
  assert.deepEqual(exposed.state.set, ['first', 'second']);
});

test('legacy inactive inventory state fails closed until an answered route-choice event', () => {
  const legacy = {
    stage: 'idle',
    set: ['legacy-change'],
    done: [],
    active: null,
    mode: null,
    parked: {},
  };
  const projected = slice.project(legacy);
  assert.equal(projected.snapshot.state.stage, 'waiting');
  assert.equal(projected.snapshot.state.blockEmissionTurnClosed, true);
  assert.equal(projected.next.follow, 'sai/commands/explore/steps/route-selector.md');

  const premature = slice.transition(legacy, { intent: 'plan' });
  assert.equal(premature.rejected, 'ROUTE_CHOICE_REQUIRED');
  const exposed = slice.transition(legacy, { intent: 'route-choice' });
  assert.equal(exposed.next.follow, 'sai/commands/explore/steps/route-selector.md');
  const selected = slice.transition(exposed.state, { intent: 'plan' });
  assert.equal(selected.state.active, 'legacy-change');
  assert.equal(selected.state.stage, 'sai-1');
});

test('re-crystallizing during an active route preserves its pointer and defers the new inventory choice', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['old-first', 'old-second'] });
  const exposed = slice.transition(recorded.state, { intent: 'route-choice' });
  const started = slice.transition(exposed.state, { intent: 'plan' });
  const midRun = slice.transition(started.state, { intent: 'complete' });
  assert.equal(midRun.state.stage, 'sai-2');

  const replaced = slice.transition(midRun.state, { recordedList: ['new-first', 'new-second'] });
  assert.deepEqual(replaced.state.set, ['new-first', 'new-second']);
  assert.equal(replaced.state.active, 'old-first');
  assert.equal(replaced.state.stage, 'sai-2');
  assert.equal(replaced.state.blockEmissionTurnClosed, true);
  assert.equal(replaced.next.follow, 'sai/commands/explore/steps/pipeline-plan-unattended.md');

  const premature = slice.transition(replaced.state, { intent: 'route-choice' });
  assert.equal(premature.rejected, 'ALREADY_RUNNING');
  assert.equal(premature.state.active, 'old-first');
  assert.equal(premature.next.follow, 'sai/commands/explore/steps/pipeline-plan-unattended.md');

  const implement = slice.transition(replaced.state, { intent: 'complete' });
  const completed = slice.transition(implement.state, { intent: 'next-slice' });
  assert.equal(completed.state.stage, 'waiting');
  assert.equal(completed.state.active, null);
  assert.equal(completed.next.follow, 'sai/commands/explore/steps/route-selector.md',
    'the replacement set exposes its picker after the old active route closes');

  const laterReply = slice.transition(completed.state, { intent: 'route-choice' });
  assert.equal(laterReply.next.follow, 'sai/commands/explore/steps/route-selector.md');
  const selected = slice.transition(laterReply.state, { intent: 'direct-build' });
  assert.equal(selected.state.active, 'new-first', 'the picker answer applies to the replacement inventory');
  assert.equal(selected.state.stage, 'build-implement');
});

test('repeated route-choice events cannot disturb or replace an active route', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['active-change'] });
  const exposed = slice.transition(recorded.state, { intent: 'route-choice' });
  const repeatedExposure = slice.transition(exposed.state, { intent: 'route-choice' });
  assert.equal(repeatedExposure.rejected, undefined, 'duplicate exposure is harmless and still does not select a route');
  assert.equal(repeatedExposure.state.active, null);
  assert.equal(repeatedExposure.state.stage, 'waiting');
  assert.deepEqual(repeatedExposure.state.set, ['active-change']);
  assert.equal(repeatedExposure.next.follow, 'sai/commands/explore/steps/route-selector.md');

  const started = slice.transition(repeatedExposure.state, { intent: 'plan' });
  const competingChoice = slice.transition(started.state, { intent: 'direct-build' });
  assert.equal(competingChoice.rejected, 'ALREADY_RUNNING');
  const repeatedChoice = slice.transition(competingChoice.state, { intent: 'route-choice' });
  assert.equal(repeatedChoice.rejected, 'ALREADY_RUNNING');
  assert.equal(repeatedChoice.state.active, 'active-change');
  assert.equal(repeatedChoice.state.mode, 'plan');
  assert.equal(repeatedChoice.state.stage, 'sai-1');
  assert.equal(repeatedChoice.next.follow, 'sai/commands/explore/steps/pipeline-plan-unattended.md');
});

test('E8 fail/cancel and E9 already-running and E2 next-slice do not mark done', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = selectRoute(recorded.state, 'direct-build');
  const again = slice.transition(started.state, { intent: 'direct-build' });
  assert.equal(again.rejected, 'ALREADY_RUNNING');
  assert.equal(again.state.stage, 'build-implement');
  const failed = slice.transition(started.state, { intent: 'fail' });
  assert.equal(failed.state.stage, 'waiting');
  assert.equal(failed.state.active, null);
  assert.deepEqual(failed.state.parked, { a: { mode: 'direct-build', stage: 'build-implement' } });
  assert.deepEqual(failed.state.done, []);
  const cancelled = slice.transition(started.state, { intent: 'cancel' });
  assert.equal(cancelled.state.stage, 'waiting');
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

test('Plan cursor travels waiting → sai-1 → sai-2 → implement → waiting; last waiting is rest', () => {
  let state = slice.initialState;
  const recorded = slice.transition(state, { recordedList: ['a'] });
  const start = selectRoute(recorded.state, 'plan');
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
  assert.equal(done.state.stage, 'waiting');
  assert.equal(done.state.active, null);
  assert.equal(done.state.mode, null);
  assert.deepEqual(done.state.done, ['a']);
  assert.match(done.next.hint, /^load and follow /);
});

test('E1 next-slice on sai-1/sai-2 stays put; E2 fail keeps pending; E3 already-running across modes', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = selectRoute(recorded.state, 'plan');
  const earlySlice = slice.transition(started.state, { intent: 'next-slice' });
  assert.equal(earlySlice.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(earlySlice.state.stage, 'sai-1');
  assert.ok(earlySlice.state.active != null);
  const sai2 = slice.transition(started.state, { intent: 'complete' });
  const midSlice = slice.transition(sai2.state, { intent: 'next-slice' });
  assert.equal(midSlice.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(midSlice.state.stage, 'sai-2');
  const failed = slice.transition(sai2.state, { intent: 'fail' });
  assert.equal(failed.state.stage, 'waiting');
  assert.deepEqual(failed.state.parked, { a: { mode: 'plan', stage: 'sai-2' } });
  assert.deepEqual(failed.state.done, []);
  const again = slice.transition(started.state, { intent: 'plan' });
  assert.equal(again.rejected, 'ALREADY_RUNNING');
  const cross = slice.transition(started.state, { intent: 'direct-build' });
  assert.equal(cross.rejected, 'ALREADY_RUNNING');
  assert.equal(cross.state.mode, 'plan');
  const dbRecorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const db = selectRoute(dbRecorded.state, 'direct-build');
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
  assert.equal(emptyPlan.rejected, 'INVENTORY_NOT_READY');
  assert.equal(emptyPlan.state.stage, 'idle');
  assert.equal(emptyPlan.state.active, null);
  assert.equal(emptyPlan.state.mode, null);
  assert.deepEqual(emptyPlan.state.set, []);
  assert.deepEqual(emptyPlan.state.done, []);
  const emptyBuild = slice.transition(slice.initialState, { intent: 'direct-build' });
  assert.equal(emptyBuild.rejected, 'INVENTORY_NOT_READY');
  assert.equal(emptyBuild.state.stage, 'idle');
  assert.equal(emptyBuild.state.active, null);
  assert.equal(emptyBuild.state.mode, null);

  const recordedEmpty = slice.transition(slice.initialState, { recordedList: [] });
  assert.equal(recordedEmpty.state.inventoryReady, true);
  assert.equal(recordedEmpty.state.stage, 'waiting');
  assert.equal(recordedEmpty.next.follow, 'sai/commands/explore/steps/route-selector.md',
    'the selector checks the recorded empty inventory and dispatches nothing');
  const noPending = selectRoute(recordedEmpty.state, 'plan');
  assert.equal(noPending.rejected, 'NO_PENDING_SLICE');
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  const planStart = selectRoute(recorded.state, 'plan');
  assert.equal(planStart.state.active, 'a');
  assert.equal(planStart.state.stage, 'sai-1');
  assert.ok(!('rejected' in planStart));
  const buildStart = selectRoute(recorded.state, 'direct-build');
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
  const start = selectRoute(recorded.state, 'direct-build');
  const mid = slice.transition(start.state, { intent: 'complete' });
  const arch = slice.transition(mid.state, { intent: 'complete' });
  const done = slice.transition(arch.state, { intent: 'complete' });
  assert.equal(done.state.stage, 'waiting');
  assert.equal(done.state.active, null);
  assert.deepEqual(done.state.done, ['a']);
  assert.equal(slice.transition(done.state, { intent: 'plan' }).rejected, 'ROUTE_CHOICE_REQUIRED',
    'a finished slice re-locks the route gate');
  const againPlan = selectRoute(done.state, 'plan');
  assert.equal(againPlan.rejected, 'NO_PENDING_SLICE');
  assert.equal(againPlan.state.stage, 'waiting');
  assert.equal(againPlan.state.active, null);
  const againBuild = selectRoute(done.state, 'direct-build');
  assert.equal(againBuild.rejected, 'NO_PENDING_SLICE');
  assert.equal(againBuild.state.stage, 'waiting');
  assert.equal(againBuild.state.active, null);
});

test('a failed Plan slice resumes at its saved stage on a later plan selection', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = selectRoute(recorded.state, 'plan');
  const sai2 = slice.transition(started.state, { intent: 'complete' });
  const failed = slice.transition(sai2.state, { intent: 'fail' });
  assert.ok(!('rejected' in failed));
  assert.equal(failed.next.follow, 'sai/commands/explore/steps/route-selector.md');
  assert.equal(slice.transition(failed.state, { intent: 'plan' }).rejected, 'ROUTE_CHOICE_REQUIRED',
    'a parked slice resumes only after a fresh picker answer');
  const retry = selectRoute(failed.state, 'plan');
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
  const started = selectRoute(recorded.state, 'direct-build');
  const backfill = slice.transition(started.state, { intent: 'complete' });
  const cancelled = slice.transition(backfill.state, { intent: 'cancel' });
  const retry = selectRoute(cancelled.state, 'direct-build');
  assert.ok(!('rejected' in retry));
  assert.equal(retry.state.stage, 'backfill');
  assert.equal(retry.state.active, 'a');
});

test('a parked slice resumes only in its own mode', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = selectRoute(recorded.state, 'plan');
  const failed = slice.transition(slice.transition(started.state, { intent: 'complete' }).state, { intent: 'fail' });
  const cross = selectRoute(failed.state, 'direct-build');
  assert.equal(cross.rejected, 'PARKED_IN_OTHER_MODE');
  assert.equal(cross.state.active, null);
  assert.equal(cross.state.stage, 'waiting');
  assert.deepEqual(cross.state.parked, { a: { mode: 'plan', stage: 'sai-2' } });
});

test('a parked first slice blocks later slices until it resumes in its own mode', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  const started = selectRoute(recorded.state, 'plan');
  const failed = slice.transition(started.state, { intent: 'fail' });
  const blocked = selectRoute(failed.state, 'direct-build');
  assert.equal(blocked.rejected, 'PARKED_IN_OTHER_MODE');
  assert.equal(blocked.state.active, null);
  assert.equal(blocked.state.stage, 'waiting');
  assert.deepEqual(blocked.state.parked, { a: { mode: 'plan', stage: 'sai-1' } });
});

test('every route starts the first pending slice, even when a legacy pick names a later slice', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  const picked = selectRoute(recorded.state, 'plan', { pick: 'b' });
  assert.equal(picked.state.active, 'a');
  assert.equal(picked.state.stage, 'sai-1');
  const directBuildWithLegacyPick = selectRoute(recorded.state, 'direct-build', { pick: 'b' });
  assert.equal(directBuildWithLegacyPick.state.active, 'a');
  assert.equal(directBuildWithLegacyPick.state.stage, 'build-implement');
  const sai2 = slice.transition(picked.state, { intent: 'complete' });
  const impl = slice.transition(sai2.state, { intent: 'complete' });
  const closed = slice.transition(impl.state, { intent: 'next-slice' });
  assert.deepEqual(closed.state.done, ['a']);
  const next = selectRoute(closed.state, 'direct-build');
  assert.equal(next.state.active, 'b');
  assert.equal(next.state.stage, 'build-implement');
});

test('a re-crystallized inventory replaces old names and reopens matching completed names', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const started = selectRoute(recorded.state, 'plan');
  const failed = slice.transition(slice.transition(started.state, { intent: 'complete' }).state, { intent: 'fail' });
  const completedPrior = Object.assign({}, failed.state, { done: ['a', 'old-change'], set: ['a', 'old-change'] });
  const recrystallized = slice.transition(completedPrior, { recordedList: ['a', 'new-change'] });
  assert.deepEqual(recrystallized.state.set, ['a', 'new-change']);
  assert.deepEqual(recrystallized.state.done, [], 'every name in the new set is pending again');
  assert.equal(recrystallized.state.stage, 'waiting');
  assert.equal(recrystallized.next.follow, 'sai/commands/explore/steps/route-selector.md');
  assert.equal(slice.shouldResetDone(recrystallized.state, [completedPrior]), true);
  assert.equal(slice.shouldResetDone(recrystallized.state, [recrystallized.state]), false);
  assert.deepEqual(recrystallized.state.parked, {});
  const restart = selectRoute(recrystallized.state, 'plan');
  assert.equal(restart.state.stage, 'sai-1');
  assert.equal(restart.state.active, 'a', 'route uses only the newest set in emitted order');
});

test('fail or cancel with no active slice changes nothing', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const failed = slice.transition(recorded.state, { intent: 'fail' });
  assert.ok(!('rejected' in failed));
  assert.equal(failed.state.stage, 'waiting');
  assert.deepEqual(failed.state.parked, {});
});

test('route-selector acknowledges NO_PENDING_SLICE as missing inventory without dispatch', () => {
  const selector = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'route-selector.md'), 'utf8');
  assert.match(selector, /NO_PENDING_SLICE/);
  assert.match(selector, /no change has been crystallized/);
  assert.match(selector, /block-first/);
  assert.match(selector, /An answer that does not map to exactly one fixed picker option is ambiguous/i);
  assert.doesNotMatch(selector, /maps to neither route option is treated as \*\*Manual\*\*/i);
});

function finishDirectBuild(state) {
  let current = state;
  for (let i = 0; i < 3; i++) current = slice.transition(current, { intent: 'complete' }).state;
  return current;
}

test('auto-continue starts the next slice as Direct Build only after a clean Direct Build finish', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b', 'c'] });
  const finished = finishDirectBuild(selectRoute(recorded.state, 'direct-build').state);
  assert.equal(finished.autoContinueReady, true);
  assert.equal(slice.transition(finished, { intent: 'plan' }).rejected, 'ROUTE_CHOICE_REQUIRED',
    'a route intent still needs a fresh picker answer');
  const next = slice.transition(finished, { intent: 'auto-continue' });
  assert.ok(!('rejected' in next));
  assert.equal(next.state.active, 'b');
  assert.equal(next.state.mode, 'direct-build');
  assert.equal(next.state.stage, 'build-implement');
  assert.equal(next.state.autoContinueReady, false);
  assert.equal(slice.transition(next.state, { intent: 'auto-continue' }).rejected, 'ALREADY_RUNNING');
});

test('auto-continue is refused before any slice, after Plan, after a park, and after re-crystallization', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  assert.equal(slice.transition(recorded.state, { intent: 'auto-continue' }).rejected, 'ROUTE_CHOICE_REQUIRED');

  let plan = selectRoute(recorded.state, 'plan').state;
  plan = slice.transition(plan, { intent: 'complete' }).state;
  plan = slice.transition(plan, { intent: 'complete' }).state;
  const planDone = slice.transition(plan, { intent: 'next-slice' }).state;
  assert.equal(planDone.autoContinueReady, false);
  assert.equal(slice.transition(planDone, { intent: 'auto-continue' }).rejected, 'ROUTE_CHOICE_REQUIRED');

  const started = selectRoute(recorded.state, 'direct-build');
  const parked = slice.transition(started.state, { intent: 'fail' }).state;
  assert.equal(slice.transition(parked, { intent: 'auto-continue' }).rejected, 'ROUTE_CHOICE_REQUIRED');

  const finished = finishDirectBuild(selectRoute(recorded.state, 'direct-build').state);
  const replaced = slice.transition(finished, { recordedList: ['x', 'y'] }).state;
  assert.equal(slice.transition(replaced, { intent: 'auto-continue' }).rejected, 'ROUTE_CHOICE_REQUIRED');
});

test('auto-continue on an exhausted set rejects with NO_PENDING_SLICE', () => {
  const recorded = slice.transition(slice.initialState, { recordedList: ['a'] });
  const finished = finishDirectBuild(selectRoute(recorded.state, 'direct-build').state);
  assert.equal(slice.transition(finished, { intent: 'auto-continue' }).rejected, 'NO_PENDING_SLICE');
});

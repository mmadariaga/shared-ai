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
  const retry = slice.transition(cancelled.state, { intent: 'resume-direct-build' });
  assert.ok(!('rejected' in retry));
  assert.equal(retry.state.stage, 'backfill');
  assert.equal(retry.state.active, 'a');
});

test('Direct Build resumption consumes each parked stage without a new route gate', () => {
  for (const intent of ['fail', 'cancel']) {
    for (let index = 0; index < slice.DIRECT_BUILD_STEPS.length; index++) {
      const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
      let current = selectRoute(inventory, 'direct-build').state;
      for (let i = 0; i < index; i++) current = slice.transition(current, { intent: 'complete' }).state;
      const parked = slice.transition(current, { intent }).state;
      for (const selection of ['route-choice', 'direct-build', 'plan']) {
        const rejected = slice.transition(parked, { intent: selection });
        assert.equal(rejected.rejected, 'RESUMPTION_REQUIRED');
        assert.deepEqual(rejected.state, parked);
      }
      const resumed = slice.transition(parked, { intent: 'resume-direct-build', pick: 'b' });
      assert.equal(resumed.rejected, undefined);
      assert.equal(resumed.state.active, 'a');
      assert.equal(resumed.state.stage, slice.DIRECT_BUILD_STEPS[index]);
      assert.deepEqual(resumed.state.done, parked.done);
      assert.deepEqual(resumed.state.parked, {});
      assert.equal(resumed.next.follow, 'sai/commands/explore/steps/pipeline-direct-build.md');
      assert.equal(slice.transition(resumed.state, { intent: 'resume-direct-build' }).rejected, 'ALREADY_RUNNING');
      // Multiple stops consume the same cursor; none advance or finish work.
      const stoppedAgain = slice.transition(resumed.state, { intent: 'fail' });
      assert.deepEqual(stoppedAgain.state.parked, parked.parked);
    }
  }
});

test('resumption cannot create an execution, bypass Plan, or replay a completed commit stage', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
  const plan = selectRoute(inventory, 'plan').state;
  const parkedPlan = slice.transition(plan, { intent: 'fail' }).state;
  const completed = finishDirectBuild(selectRoute(inventory, 'direct-build').state);
  const parkedBuild = slice.transition(selectRoute(inventory, 'direct-build').state, { intent: 'fail' }).state;
  const replaced = slice.transition(parkedBuild, { recordedList: ['a', 'b'] }).state;
  for (const state of [slice.initialState, inventory, parkedPlan, completed, replaced]) {
    const result = slice.transition(state, { intent: 'resume-direct-build' });
    assert.equal(result.rejected, 'NO_PENDING_DIRECT_BUILD');
    assert.deepEqual(result.state, slice.project(state).snapshot.state);
  }
  assert.deepEqual(completed.done, ['a']);
  assert.equal(selectRoute(completed, 'plan').state.active, 'b', 'later slices retain their route choices');
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

test('the set-wide publication answer is recorded once, read back, and cleared with the inventory', () => {
  assert.equal(slice.initialState.publication, '');
  assert.deepEqual(slice.project(slice.initialState).run, { publication: '', moves: [] });

  const premature = slice.transition(slice.initialState, { intent: 'publication', value: 'yes' });
  assert.equal(premature.rejected, 'INVENTORY_NOT_READY');
  assert.equal(premature.state.publication, '');

  const recorded = slice.transition(slice.initialState, { recordedList: ['a', 'b'] });
  assert.deepEqual(recorded.run, { publication: '', moves: [] });
  assert.equal(slice.transition(recorded.state, { intent: 'publication', value: 'maybe' }).rejected, 'INVALID_PUBLICATION');
  assert.equal(slice.transition(recorded.state, { intent: 'publication', value: '' }).rejected, 'INVALID_PUBLICATION');

  const answered = slice.transition(recorded.state, { intent: 'publication', value: 'yes' });
  assert.equal(answered.rejected, undefined);
  assert.equal(answered.state.publication, 'yes');
  assert.deepEqual(answered.run, { publication: 'yes', moves: [] });
  assert.equal(answered.state.blockEmissionTurnClosed, true, 'the answer opens no route gate');
  assert.equal(answered.state.stage, 'waiting');

  const second = slice.transition(answered.state, { intent: 'publication', value: 'no' });
  assert.equal(second.rejected, 'PUBLICATION_ALREADY_RECORDED');
  assert.equal(second.state.publication, 'yes');

  const read = slice.transition(answered.state, { intent: 'publication' });
  assert.equal(read.rejected, undefined);
  assert.deepEqual(read.run, { publication: 'yes', moves: [] });
  assert.deepEqual(read.state, answered.state);

  // The answer outlives route choices, a running slice, and a finished slice.
  let state = slice.transition(answered.state, { intent: 'route-choice' }).state;
  state = slice.transition(state, { intent: 'direct-build' }).state;
  assert.equal(state.publication, 'yes');
  state = slice.transition(state, { intent: 'fail' }).state;
  assert.equal(slice.project(state).run.publication, 'yes');
  assert.equal(slice.transition(state, { amend: 'a' }).state.publication, 'yes');

  // A new inventory replaces the set, and its answer with it.
  const replaced = slice.transition(state, { recordedList: ['c'] });
  assert.equal(replaced.state.publication, '');
  assert.deepEqual(replaced.run, { publication: '', moves: [] });
});

test('a stored state that predates the publication field reads as unanswered', () => {
  const legacy = { stage: 'waiting', set: ['a'], inventoryReady: true, active: null, done: [], mode: null, parked: {} };
  assert.deepEqual(slice.project(legacy).run, { publication: '', moves: [] });
  assert.equal(slice.transition(legacy, { intent: 'publication', value: 'no' }).state.publication, 'no');
  assert.equal(slice.project({ stage: 'waiting', set: ['a'], publication: 'bogus' }).run.publication, '');
});

// ---------------------------------------------------------------------------
// goto, amendment kinds, and re-registration
// ---------------------------------------------------------------------------

function parkedDirectBuild(names = ['a', 'b'], step = 0) {
  const inventory = slice.transition(slice.initialState, { recordedList: names }).state;
  let state = selectRoute(inventory, 'direct-build').state;
  for (let i = 0; i < step; i++) state = slice.transition(state, { intent: 'complete' }).state;
  return slice.transition(state, { intent: 'fail' }).state;
}

test('E13: a parked Direct Build cursor moves to pending and the inventory, completed slices, and publication stay', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
  const answered = slice.transition(inventory, { intent: 'publication', value: 'yes' }).state;
  const done = finishDirectBuild(selectRoute(answered, 'direct-build').state);
  const parked = slice.transition(selectRoute(done, 'direct-build').state, { intent: 'fail' }).state;
  assert.equal(parked.parked.b.stage, 'build-implement');

  const stuck = slice.transition(parked, { intent: 'route-choice' });
  assert.equal(stuck.rejected, 'RESUMPTION_REQUIRED', 'the dead end this change removes');

  const moved = slice.transition(parked, { intent: 'goto', target: 'pending', reason: 'correction', received_at: '2026-11-20T10:00:00+01:00' });
  assert.ok(!('rejected' in moved));
  assert.deepEqual(moved.state.parked, {});
  assert.deepEqual(moved.state.done, ['a']);
  assert.equal(moved.state.publication, 'yes');
  assert.deepEqual(moved.state.set, ['a', 'b']);
  assert.equal(moved.state.blockEmissionTurnClosed, true, 'the route selector is presented again');
  assert.deepEqual(moved.run.moves, [{ target: 'pending', reason: 'correction', received_at: '2026-11-20T10:00:00+01:00' }]);

  const reselected = selectRoute(moved.state, 'direct-build');
  assert.equal(reselected.state.active, 'b');
  assert.equal(reselected.state.stage, 'build-implement');
});

test('a parked Direct Build cursor moves to the first step and resumes there', () => {
  const parked = parkedDirectBuild(['a'], 1);
  assert.equal(parked.parked.a.stage, 'backfill');

  const moved = slice.transition(parked, { intent: 'goto', target: 'build-implement', reason: 'user-request' });
  assert.ok(!('rejected' in moved));
  assert.deepEqual(moved.state.parked.a, { mode: 'direct-build', stage: 'build-implement' });
  assert.equal(slice.transition(moved.state, { intent: 'resume-direct-build' }).state.stage, 'build-implement');
});

test('E1: a running Direct Build slice rewinds to its first step, and to a later step only when its run state is stored', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a'] }).state;
  const atArchive = slice.transition(slice.transition(selectRoute(inventory, 'direct-build').state, { intent: 'complete' }).state, { intent: 'complete' }).state;
  assert.equal(atArchive.stage, 'archive');

  const later = slice.transition(atArchive, { intent: 'goto', target: 'backfill', reason: 'correction' });
  assert.equal(later.rejected, 'MISSING_PRECONDITIONS');
  assert.deepEqual(later.missing, ['run-state']);
  assert.equal(later.resume_at, 'build-implement', 'the first step stays available');
  assert.equal(later.state.stage, 'archive');
  assert.deepEqual(later.run.moves, []);
  assert.equal(later.run_effect, undefined);

  const otherSlice = { change: 'b', items: ['build-implement', 'backfill'], hold: '' };
  assert.equal(slice.transition(atArchive, { intent: 'goto', target: 'backfill', reason: 'correction', run_state: otherSlice }).rejected, 'MISSING_PRECONDITIONS', 'another slice state offers nothing');
  const unsaved = { change: 'a', items: ['build-implement'], hold: '' };
  assert.equal(slice.transition(atArchive, { intent: 'goto', target: 'backfill', reason: 'correction', run_state: unsaved }).rejected, 'MISSING_PRECONDITIONS');

  const stored = { change: 'a', items: ['build-implement', 'backfill'], hold: '' };
  const rewound = slice.transition(atArchive, { intent: 'goto', target: 'backfill', reason: 'correction', run_state: stored });
  assert.ok(!('rejected' in rewound));
  assert.equal(rewound.state.stage, 'backfill');
  assert.deepEqual(rewound.run_effect, { rewind: { slice: 'a', item: 'backfill' } });
  assert.equal(rewound.run.moves.length, 1);

  const first = slice.transition(atArchive, { intent: 'goto', target: 'build-implement', reason: 'correction' });
  assert.ok(!('rejected' in first));
  assert.equal(first.state.stage, 'build-implement');
  assert.equal(first.state.active, 'a');
  assert.equal(first.run.moves.length, 1);
});

test('E1: a goto toward a route start or a later step is past the ceiling and changes nothing', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a'] }).state;
  for (const target of ['direct-build', 'plan']) {
    assert.equal(slice.transition(inventory, { intent: 'goto', target, reason: 'user-request' }).rejected, 'GOTO_PAST_CEILING', target);
  }
  // A pending slice has no route position: any step lies past the selector.
  assert.equal(slice.transition(inventory, { intent: 'goto', target: 'build-implement', reason: 'user-request' }).rejected, 'GOTO_PAST_CEILING');
  const running = selectRoute(inventory, 'direct-build').state;
  assert.equal(slice.transition(running, { intent: 'goto', target: 'archive', reason: 'user-request' }).rejected, 'GOTO_PAST_CEILING');
  assert.equal(slice.transition(running, { intent: 'goto', target: 'build-implement', reason: 'user-request' }).rejected, 'GOTO_ALREADY_AT_TARGET');
  assert.equal(slice.transition(running, { intent: 'goto', target: 'sai-1', reason: 'user-request' }).rejected, 'GOTO_UNKNOWN_TARGET');
  assert.equal(slice.transition(running, { intent: 'goto', target: 'crystallize', reason: 'user-request' }).rejected, 'GOTO_UNKNOWN_TARGET');
  assert.equal(slice.transition(running, { intent: 'goto', target: 'pending', reason: 'because' }).rejected, 'GOTO_REASON_INVALID');
  assert.equal(slice.transition(slice.initialState, { intent: 'goto', target: 'pending', reason: 'correction' }).rejected, 'INVENTORY_NOT_READY');
});

test('a running slice goes back to pending with the route gate closed', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
  const running = selectRoute(inventory, 'plan').state;
  const moved = slice.transition(running, { intent: 'goto', target: 'pending', reason: 'user-request' });

  assert.ok(!('rejected' in moved));
  assert.equal(moved.state.active, null);
  assert.equal(moved.state.mode, null);
  assert.equal(moved.state.stage, 'waiting');
  assert.equal(moved.state.blockEmissionTurnClosed, true);
  assert.equal(slice.transition(moved.state, { intent: 'plan' }).rejected, 'ROUTE_CHOICE_REQUIRED');
});

test('a Plan slice rewinds to an earlier step of its own route', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a'] }).state;
  let state = selectRoute(inventory, 'plan').state;
  state = slice.transition(slice.transition(state, { intent: 'complete' }).state, { intent: 'complete' }).state;
  assert.equal(state.stage, 'implement');

  const moved = slice.transition(state, { intent: 'goto', target: 'sai-2', reason: 'correction' });
  assert.equal(moved.state.stage, 'sai-2');
  assert.equal(moved.state.active, 'a');
});

test('E16: a goto into a completed slice is rejected unless the user explicitly asks to reopen it', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
  const done = finishDirectBuild(selectRoute(inventory, 'direct-build').state);
  assert.deepEqual(done.done, ['a']);

  assert.equal(slice.transition(done, { intent: 'goto', target: 'pending', reason: 'user-request', slice: 'a' }).rejected, 'SLICE_COMPLETED');
  assert.equal(slice.transition(done, { intent: 'goto', target: 'pending', reason: 'correction', slice: 'a', reopen: true }).rejected, 'SLICE_COMPLETED');

  const reopened = slice.transition(done, { intent: 'goto', target: 'pending', reason: 'user-request', slice: 'a', reopen: true });
  assert.ok(!('rejected' in reopened));
  assert.deepEqual(reopened.state.done, []);
  assert.equal(reopened.state.blockEmissionTurnClosed, true);
  assert.equal(reopened.run.moves[0].target, 'pending');
  // The store keeps the reopened slice out of done when the stored list is merged in.
  assert.equal(slice.shouldResetDone(reopened.state, [done]), true);
  assert.equal(slice.shouldResetDone(done, [done]), false);
});

test('E3: a rewind is held while an execute order is uncertain or an archive order or commit grant was consumed', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a'] }).state;
  const atArchive = slice.transition(slice.transition(selectRoute(inventory, 'direct-build').state, { intent: 'complete' }).state, { intent: 'complete' }).state;
  const view = (hold) => ({ change: 'a', items: ['build-implement', 'backfill'], hold });

  for (const target of ['backfill', 'build-implement']) {
    const uncertain = slice.transition(atArchive, { intent: 'goto', target, reason: 'correction', run_state: view('uncertain') });
    assert.equal(uncertain.rejected, 'GOTO_ORDER_UNCERTAIN', target);
    assert.equal(uncertain.state.stage, 'archive');
    assert.deepEqual(uncertain.run.moves, []);
    assert.equal(slice.transition(atArchive, { intent: 'goto', target, reason: 'correction', run_state: view('consumed') }).rejected, 'GOTO_ORDER_CONSUMED', target);
  }
  // Going back to pending is an exit, not a rewind: it discards the run state instead of replaying it.
  const exit = slice.transition(atArchive, { intent: 'goto', target: 'pending', reason: 'user-request', run_state: view('uncertain') });
  assert.ok(!('rejected' in exit));
  assert.deepEqual(exit.run_effect, { drop: ['a'] });
});

test('E1: a rewind to the first step needs no stored run state and discards it', () => {
  const parked = parkedDirectBuild(['a'], 1);
  const moved = slice.transition(parked, { intent: 'goto', target: 'build-implement', reason: 'user-request' });
  assert.ok(!('rejected' in moved));
  assert.deepEqual(moved.run_effect, { rewind: { slice: 'a', item: 'build-implement' } });
});

test('E6: pending, a content amendment, and a reopened slice discard the run state; a metadata amendment keeps it', () => {
  const parked = parkedDirectBuild(['a', 'b'], 1);
  assert.deepEqual(slice.transition(parked, { intent: 'goto', target: 'pending', reason: 'correction' }).run_effect, { drop: ['a'] });
  assert.deepEqual(slice.transition(parked, { amend: 'a', amend_kind: 'content' }).run_effect, { drop: ['a'] });
  assert.equal(slice.transition(parked, { amend: 'a', amend_kind: 'metadata' }).run_effect, undefined);
  assert.equal(slice.transition(parked, { intent: 'fail' }).run_effect, undefined);

  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
  const done = finishDirectBuild(selectRoute(inventory, 'direct-build').state);
  assert.deepEqual(slice.transition(done, { intent: 'goto', target: 'pending', reason: 'user-request', slice: 'a', reopen: true }).run_effect, { drop: ['a'] });
});

test('E2/E8: a resumed slice keeps its run state, and a slice that starts fresh starts with none', () => {
  const parked = parkedDirectBuild(['a', 'b'], 1);
  assert.equal(slice.transition(parked, { intent: 'resume-direct-build' }).run_effect, undefined, 'resumption reads the stored state');

  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
  assert.deepEqual(selectRoute(inventory, 'direct-build').run_effect, { drop: ['a', 'b'] });
  const next = slice.transition(finishDirectBuild(selectRoute(inventory, 'direct-build').state), { intent: 'auto-continue' });
  assert.deepEqual(next.run_effect, { drop: ['a', 'b'] }, 'a later slice never reads an earlier slice state');
  assert.equal(selectRoute(inventory, 'plan').run_effect, undefined, 'a Plan slice has no Direct Build run state');
});

test('a re-registration keeps the run state of a slice that keeps a cursor and drops the others', () => {
  const parked = parkedDirectBuild(['a', 'b'], 1);
  const keep = slice.transition(parked, { recordedList: ['a', 'b'], unchanged: ['a'] });
  assert.deepEqual(keep.run_effect, { drop: ['b'] });
  const dropAll = slice.transition(parked, { recordedList: ['a', 'b'] });
  assert.deepEqual(dropAll.run_effect, { drop: ['a', 'b'] });
});

test('E11: a content amendment returns a running slice to pending and closes the route gate; E12: metadata keeps it', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b'] }).state;
  const running = selectRoute(inventory, 'direct-build').state;

  const metadata = slice.transition(running, { amend: 'a', amend_kind: 'metadata' });
  assert.ok(!('rejected' in metadata));
  assert.equal(metadata.state.active, 'a');
  assert.equal(metadata.state.stage, 'build-implement');
  assert.equal(metadata.state.blockEmissionTurnClosed, false);

  const content = slice.transition(running, { amend: 'a', amend_kind: 'content' });
  assert.ok(!('rejected' in content));
  assert.equal(content.state.active, null);
  assert.equal(content.state.stage, 'waiting');
  assert.equal(content.state.blockEmissionTurnClosed, true);
  assert.deepEqual(content.state.set, ['a', 'b']);

  // Another slice amended while a slice runs leaves the running slice alone.
  const other = slice.transition(running, { amend: 'b', amend_kind: 'content' });
  assert.equal(other.state.active, 'a');
  assert.equal(other.state.blockEmissionTurnClosed, false);
});

test('a parked cursor survives a metadata amendment and is dropped by a content amendment', () => {
  const parked = parkedDirectBuild(['a'], 1);
  const kept = slice.transition(parked, { amend: 'a', amend_kind: 'metadata' });
  assert.deepEqual(kept.state.parked, parked.parked);

  const dropped = slice.transition(parked, { amend: 'a', amend_kind: 'content' });
  assert.deepEqual(dropped.state.parked, {});
  assert.equal(dropped.state.blockEmissionTurnClosed, true);
  assert.equal(slice.transition(dropped.state, { intent: 'route-choice' }).rejected, undefined);
});

test('a completed slice is never amendable', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a'] }).state;
  const done = finishDirectBuild(selectRoute(inventory, 'direct-build').state);
  for (const amend_kind of ['metadata', 'content']) {
    assert.equal(slice.transition(done, { amend: 'a', amend_kind }).rejected, 'SLICE_COMPLETED');
  }
});

test('I6: a re-registration keeps done and parked cursors of unchanged slices and the publication of an unchanged set', () => {
  const inventory = slice.transition(slice.initialState, { recordedList: ['a', 'b', 'c'] }).state;
  const answered = slice.transition(inventory, { intent: 'publication', value: 'yes' }).state;
  const afterA = finishDirectBuild(selectRoute(answered, 'direct-build').state);
  const parked = slice.transition(selectRoute(afterA, 'direct-build').state, { intent: 'fail' }).state;
  assert.deepEqual(parked.done, ['a']);
  assert.ok(parked.parked.b);

  const same = slice.transition(parked, { recordedList: ['a', 'b', 'c'], unchanged: ['a', 'b', 'c'] });
  assert.deepEqual(same.state.done, ['a']);
  assert.deepEqual(same.state.parked, parked.parked);
  assert.equal(same.state.publication, 'yes');
  assert.equal(same.state.blockEmissionTurnClosed, true);
  assert.equal(same.state.inventoryVersion, parked.inventoryVersion + 1);

  const changedB = slice.transition(parked, { recordedList: ['a', 'b', 'c'], unchanged: ['a', 'c'] });
  assert.deepEqual(changedB.state.done, ['a']);
  assert.deepEqual(changedB.state.parked, {});
  assert.equal(changedB.state.publication, 'yes');

  const changedA = slice.transition(parked, { recordedList: ['a', 'b', 'c'], unchanged: ['b', 'c'] });
  assert.deepEqual(changedA.state.done, []);
  assert.deepEqual(changedA.state.parked, parked.parked);

  const otherSet = slice.transition(parked, { recordedList: ['a', 'd'], unchanged: ['a'] });
  assert.deepEqual(otherSet.state.done, ['a']);
  assert.equal(otherSet.state.publication, '', 'the answer belongs to the set it was asked for');

  const noList = slice.transition(parked, { recordedList: ['a', 'b', 'c'] });
  assert.deepEqual(noList.state.done, []);
  assert.deepEqual(noList.state.parked, {});
});

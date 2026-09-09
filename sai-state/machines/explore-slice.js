'use strict';

const machineId = 'explore-slice@1';

const IDLE_STAGE = 'idle';
const DIRECT_BUILD_MODE = 'direct-build';
const DIRECT_BUILD_STEPS = Object.freeze(['build-implement', 'backfill', 'archive']);
const ANON_SLICE = 'current';

const SLICE_STEP = 'sai/commands/explore/steps/slice.md';
const DIRECT_BUILD_STEP = 'sai/commands/explore/steps/pipeline-direct-build.md';

const STAGE_FILES = Object.freeze({
  idle: SLICE_STEP,
  'build-implement': DIRECT_BUILD_STEP,
  backfill: DIRECT_BUILD_STEP,
  archive: DIRECT_BUILD_STEP,
});

const initialState = Object.freeze({
  stage: IDLE_STAGE,
  set: [],
  active: null,
  done: [],
  mode: null,
});

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : IDLE_STAGE;
  const set = Array.isArray(src.set) ? src.set.slice() : [];
  const active = src.active == null ? null : src.active;
  const done = Array.isArray(src.done) ? src.done.slice() : [];
  const mode = typeof src.mode === 'string' ? src.mode : null;
  return { stage, set, active, done, mode };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    set: current.set.slice(),
    active: current.active,
    done: current.done.slice(),
    mode: current.mode,
  };
}

function nextFor(stage) {
  const follow = STAGE_FILES[stage] || SLICE_STEP;
  return { follow, hint: 'fetch the ' + stage + ' step' };
}

function outcome(current, rejected) {
  const state = {
    stage: current.stage,
    set: current.set.slice(),
    active: current.active,
    done: current.done.slice(),
    mode: current.mode,
  };
  const result = {
    state,
    snapshot: { state: snapshotOf(state), machineId },
    next: nextFor(state.stage),
  };
  if (rejected) result.rejected = rejected;
  return result;
}

function pendingOf(current) {
  return current.set.filter((name) => current.done.indexOf(name) === -1);
}

function hasIntent(signal) {
  return Boolean(signal && typeof signal === 'object' && typeof signal.intent === 'string' && signal.intent.length > 0);
}

function project(state) {
  const current = cloneState(state);
  return {
    snapshot: { state: snapshotOf(current), machineId },
    next: nextFor(current.stage),
  };
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = signal && typeof signal === 'object' ? signal : {};

  // Inventory recording: a recordedList replaces `set` without moving the
  // Direct Build cursor. Slice names persist in sidecar state and never
  // appear on the wire.
  if (Array.isArray(sig.recordedList)) {
    current.set = sig.recordedList.slice();
    return outcome(current);
  }

  if (!hasIntent(signal)) {
    return outcome(current, 'READINESS_IS_NOT_INTENT');
  }

  const intent = sig.intent;

  if (intent === 'fail' || intent === 'cancel') {
    // E8: fail/cancel leaves the active step pending. Neither incomplete
    // Archive nor next-slice marks the slice done.
    return outcome(current);
  }

  if (intent === 'next-slice') {
    // E2: Direct Build never uses next-slice. Plan/Manual next-slice stays
    // contract/prose in this change (I6).
    return outcome(current, 'READINESS_IS_NOT_INTENT');
  }

  if (intent === DIRECT_BUILD_MODE) {
    // E9: another Direct Build selection while active is set: already running.
    if (current.active != null) {
      return outcome(current, 'ALREADY_RUNNING');
    }
    const pending = pendingOf(current);
    current.active = pending.length > 0 ? pending[0] : ANON_SLICE;
    current.mode = DIRECT_BUILD_MODE;
    current.stage = DIRECT_BUILD_STEPS[0];
    return outcome(current);
  }

  if (intent === 'complete') {
    if (current.mode !== DIRECT_BUILD_MODE || DIRECT_BUILD_STEPS.indexOf(current.stage) === -1) {
      return outcome(current, 'READINESS_IS_NOT_INTENT');
    }
    const idx = DIRECT_BUILD_STEPS.indexOf(current.stage);
    if (current.stage === 'archive') {
      // I5/E2: completing Archive marks the slice done and clears active.
      if (current.active != null && current.done.indexOf(current.active) === -1) {
        current.done = current.done.concat([current.active]);
      }
      current.active = null;
      current.mode = null;
      current.stage = IDLE_STAGE;
      return outcome(current);
    }
    current.stage = DIRECT_BUILD_STEPS[idx + 1];
    return outcome(current);
  }

  return outcome(current, 'READINESS_IS_NOT_INTENT');
}

module.exports = { machineId, initialState, transition, project, DIRECT_BUILD_STEPS };

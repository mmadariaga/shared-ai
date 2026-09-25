'use strict';

const machineId = 'explore-slice@1';

const IDLE_STAGE = 'idle';
const DIRECT_BUILD_MODE = 'direct-build';
const PLAN_MODE = 'plan';
const DIRECT_BUILD_STEPS = Object.freeze(['build-implement', 'backfill', 'archive']);
const PLAN_STEPS = Object.freeze(['sai-1', 'sai-2', 'implement']);

const SLICE_STEP = 'sai/commands/explore/steps/slice.md';
const ROUTE_SELECTOR_STEP = 'sai/commands/explore/steps/route-selector.md';
const DIRECT_BUILD_STEP = 'sai/commands/explore/steps/pipeline-direct-build.md';
const PLAN_STEP = 'sai/commands/explore/steps/pipeline-plan-unattended.md';

const STAGE_FILES = Object.freeze({
  idle: ROUTE_SELECTOR_STEP,
  'sai-1': PLAN_STEP,
  'sai-2': PLAN_STEP,
  implement: PLAN_STEP,
  'build-implement': DIRECT_BUILD_STEP,
  backfill: DIRECT_BUILD_STEP,
  archive: DIRECT_BUILD_STEP,
});

// Stage-static first vs repeat. Skip-fetch is the chat loaded-set, not this table.
const STAGE_HINTS = Object.freeze({
  idle: 'load',
  'sai-1': 'load',
  'sai-2': 'follow',
  implement: 'follow',
  'build-implement': 'load',
  backfill: 'follow',
  archive: 'follow',
});

const MODE_STEPS = Object.freeze({
  [DIRECT_BUILD_MODE]: DIRECT_BUILD_STEPS,
  [PLAN_MODE]: PLAN_STEPS,
});

const initialState = Object.freeze({
  stage: IDLE_STAGE,
  set: [],
  active: null,
  done: [],
  mode: null,
  parked: {},
});

// A parked slice is pending with a saved cursor: `fail` or `cancel` parked it,
// and only a selection in its own mode resumes it at the saved stage.
function cloneParked(src) {
  const parked = {};
  if (!src || typeof src !== 'object' || Array.isArray(src)) return parked;
  for (const name of Object.keys(src)) {
    const entry = src[name];
    if (!entry || typeof entry !== 'object') continue;
    const steps = MODE_STEPS[entry.mode];
    if (!steps || steps.indexOf(entry.stage) === -1) continue;
    parked[name] = { mode: entry.mode, stage: entry.stage };
  }
  return parked;
}

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : IDLE_STAGE;
  const set = Array.isArray(src.set) ? src.set.slice() : [];
  const active = src.active == null ? null : src.active;
  const done = Array.isArray(src.done) ? src.done.slice() : [];
  const mode = typeof src.mode === 'string' ? src.mode : null;
  const parked = cloneParked(src.parked);
  return { stage, set, active, done, mode, parked };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    set: current.set.slice(),
    active: current.active,
    done: current.done.slice(),
    mode: current.mode,
    parked: cloneParked(current.parked),
  };
}

function hintFor(stage, follow) {
  const kind = STAGE_HINTS[stage] || 'load';
  if (kind === 'follow') return 'follow the instructions of ' + follow;
  return 'load and follow ' + follow;
}

function nextFor(stage) {
  const follow = STAGE_FILES[stage] || SLICE_STEP;
  return { follow, hint: hintFor(stage, follow) };
}

function outcome(current, rejected) {
  const state = snapshotOf(current);
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

function finishSlice(current) {
  if (current.active != null && current.done.indexOf(current.active) === -1) {
    current.done = current.done.concat([current.active]);
  }
  current.active = null;
  current.mode = null;
  current.stage = IDLE_STAGE;
  return outcome(current);
}

// `pick` names the slice the user chose; without it the first pending slice
// starts. A parked slice resumes at its saved stage, and only in its own mode.
function startRoute(current, mode, steps, pick) {
  if (current.active != null) {
    return outcome(current, 'ALREADY_RUNNING');
  }
  const pending = pendingOf(current);
  const target = pick === undefined ? pending[0] : pick;
  if (target === undefined || pending.indexOf(target) === -1) {
    return outcome(current, 'NO_PENDING_SLICE');
  }
  const parked = current.parked[target];
  if (parked && parked.mode !== mode) {
    return outcome(current, 'ALREADY_RUNNING');
  }
  current.active = target;
  current.mode = mode;
  current.stage = parked ? parked.stage : steps[0];
  delete current.parked[target];
  return outcome(current);
}

function parkSlice(current) {
  if (current.active == null) {
    return outcome(current);
  }
  current.parked[current.active] = { mode: current.mode, stage: current.stage };
  current.active = null;
  current.mode = null;
  current.stage = IDLE_STAGE;
  return outcome(current);
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
  // Direct Build or Plan cursor of a running slice, and discards every parked
  // cursor, so a re-crystallized slice re-enters at its route's first step.
  // Slice names persist in stage machine state and never appear on the wire.
  if (Array.isArray(sig.recordedList)) {
    current.set = sig.recordedList.slice();
    current.parked = {};
    return outcome(current);
  }

  if (!hasIntent(signal)) {
    return outcome(current, 'READINESS_IS_NOT_INTENT');
  }

  const intent = sig.intent;

  if (intent === 'fail' || intent === 'cancel') {
    // Fail/cancel parks the active slice at its current step, releases
    // `active`, and returns to idle without marking the slice done.
    return parkSlice(current);
  }

  if (intent === 'next-slice') {
    // Plan implement completes only on next-slice. Direct Build never uses it.
    // next-slice on sai-1/sai-2 stays put (E1).
    if (current.mode === PLAN_MODE && current.stage === 'implement') {
      return finishSlice(current);
    }
    return outcome(current, 'READINESS_IS_NOT_INTENT');
  }

  if (intent === DIRECT_BUILD_MODE) {
    return startRoute(current, DIRECT_BUILD_MODE, DIRECT_BUILD_STEPS, sig.pick);
  }

  if (intent === PLAN_MODE) {
    return startRoute(current, PLAN_MODE, PLAN_STEPS, sig.pick);
  }

  if (intent === 'complete') {
    if (current.mode === DIRECT_BUILD_MODE && DIRECT_BUILD_STEPS.indexOf(current.stage) !== -1) {
      const idx = DIRECT_BUILD_STEPS.indexOf(current.stage);
      if (current.stage === 'archive') {
        // Completing Archive marks the slice done and clears active.
        return finishSlice(current);
      }
      current.stage = DIRECT_BUILD_STEPS[idx + 1];
      return outcome(current);
    }
    if (current.mode === PLAN_MODE && PLAN_STEPS.indexOf(current.stage) !== -1) {
      // complete advances sai-1 → sai-2 → implement. Implement is not
      // completable this way; only next-slice finishes the slice.
      if (current.stage === 'implement') {
        return outcome(current, 'READINESS_IS_NOT_INTENT');
      }
      const idx = PLAN_STEPS.indexOf(current.stage);
      current.stage = PLAN_STEPS[idx + 1];
      return outcome(current);
    }
    return outcome(current, 'READINESS_IS_NOT_INTENT');
  }

  return outcome(current, 'READINESS_IS_NOT_INTENT');
}

module.exports = { machineId, initialState, transition, project, DIRECT_BUILD_STEPS, PLAN_STEPS };

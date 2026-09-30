'use strict';

const machineId = 'explore-slice@1';

const IDLE_STAGE = 'idle';
const WAITING_STAGE = 'waiting';
const DIRECT_BUILD_MODE = 'direct-build';
const PLAN_MODE = 'plan';
const DIRECT_BUILD_STEPS = Object.freeze(['build-implement', 'backfill', 'archive']);
const PLAN_STEPS = Object.freeze(['sai-1', 'sai-2', 'implement']);

const SLICE_STEP = 'sai/commands/explore/steps/slice.md';
const ROUTE_SELECTOR_STEP = 'sai/commands/explore/steps/route-selector.md';
const DIRECT_BUILD_STEP = 'sai/commands/explore/steps/pipeline-direct-build.md';
const PLAN_STEP = 'sai/commands/explore/steps/pipeline-plan-unattended.md';

const STAGE_FILES = Object.freeze({
  idle: 'none',
  waiting: ROUTE_SELECTOR_STEP,
  'sai-1': PLAN_STEP,
  'sai-2': PLAN_STEP,
  implement: PLAN_STEP,
  'build-implement': DIRECT_BUILD_STEP,
  backfill: DIRECT_BUILD_STEP,
  archive: DIRECT_BUILD_STEP,
});

// Stage-static first vs repeat. Skip-fetch is the chat loaded-set, not this table.
const STAGE_HINTS = Object.freeze({
  idle: 'none',
  waiting: 'load',
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
  inventoryReady: false,
  inventoryVersion: 0,
  blockEmissionTurnClosed: false,
  autoContinueReady: false,
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
  const set = Array.isArray(src.set) ? src.set.slice() : [];
  const inventoryReady = src.inventoryReady === true || set.length > 0;
  const inventoryVersion = Number.isSafeInteger(src.inventoryVersion) && src.inventoryVersion >= 0
    ? src.inventoryVersion
    : 0;
  let stage = typeof src.stage === 'string' ? src.stage : IDLE_STAGE;
  // An older explore-slice@1 session used `idle` for both pre-inventory and
  // waiting states. A non-empty recorded set proves that it is waiting.
  if (stage === IDLE_STAGE && inventoryReady) stage = WAITING_STAGE;
  const active = src.active == null ? null : src.active;
  // Older explore-slice@1 records do not carry the turn-close flag. Treat an
  // inactive recorded inventory as closed so an upgraded session cannot start
  // a route without a fresh route-choice event after the native picker answer.
  const blockEmissionTurnClosed = typeof src.blockEmissionTurnClosed === 'boolean'
    ? src.blockEmissionTurnClosed
    : inventoryReady && active == null;
  // Set only by a clean Direct Build finish; older records never carry it.
  const autoContinueReady = src.autoContinueReady === true;
  const done = Array.isArray(src.done) ? src.done.slice() : [];
  const mode = typeof src.mode === 'string' ? src.mode : null;
  const parked = cloneParked(src.parked);
  return { stage, set, inventoryReady, inventoryVersion, blockEmissionTurnClosed, autoContinueReady, active, done, mode, parked };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    set: current.set.slice(),
    inventoryReady: current.inventoryReady,
    inventoryVersion: current.inventoryVersion,
    blockEmissionTurnClosed: current.blockEmissionTurnClosed,
    autoContinueReady: current.autoContinueReady,
    active: current.active,
    done: current.done.slice(),
    mode: current.mode,
    parked: cloneParked(current.parked),
  };
}

function hintFor(stage, follow) {
  if (follow === 'none') return 'no step before crystallization inventory is recorded';
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
    next: nextForState(state),
  };
  if (rejected) result.rejected = rejected;
  return result;
}

function nextForState(state) {
  // A complete inventory exposes the route selector so it can present the
  // native picker. `blockEmissionTurnClosed` remains the mutation gate: route
  // intents still reject until the selector receives an explicit answer and
  // emits `route-choice`.
  return nextFor(state.stage);
}

function pendingOf(current) {
  return current.set.filter((name) => current.done.indexOf(name) === -1);
}

function hasIntent(signal) {
  return Boolean(signal && typeof signal === 'object' && typeof signal.intent === 'string' && signal.intent.length > 0);
}

// Every slice close re-locks the route gate: the next slice needs a fresh
// picker answer (`route-choice`) or, after a clean Direct Build slice only, the
// coordinator's stored continuation consent (`auto-continue`).
function finishSlice(current) {
  if (current.active != null && current.done.indexOf(current.active) === -1) {
    current.done = current.done.concat([current.active]);
  }
  current.blockEmissionTurnClosed = true;
  current.autoContinueReady = current.mode === DIRECT_BUILD_MODE;
  current.active = null;
  current.mode = null;
  current.stage = WAITING_STAGE;
  return outcome(current);
}

// Route order is crystallization order: every route starts the first pending
// slice. A parked slice resumes at its saved stage, and only in its own mode.
function startRoute(current, mode, steps) {
  if (current.active != null) {
    return outcome(current, 'ALREADY_RUNNING');
  }
  if (!current.inventoryReady) {
    return outcome(current, 'INVENTORY_NOT_READY');
  }
  if (current.blockEmissionTurnClosed) {
    return outcome(current, 'ROUTE_CHOICE_REQUIRED');
  }
  return beginSlice(current, mode, steps);
}

// Starts the first pending slice once the route gate is open.
function beginSlice(current, mode, steps) {
  const target = pendingOf(current)[0];
  if (target === undefined) {
    return outcome(current, 'NO_PENDING_SLICE');
  }
  const parked = current.parked[target];
  if (parked && parked.mode !== mode) {
    return outcome(current, 'PARKED_IN_OTHER_MODE');
  }
  current.autoContinueReady = false;
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
  current.blockEmissionTurnClosed = true;
  current.autoContinueReady = false;
  current.active = null;
  current.mode = null;
  current.stage = WAITING_STAGE;
  return outcome(current);
}

function project(state) {
  const current = cloneState(state);
  return {
    snapshot: { state: snapshotOf(current), machineId },
    next: nextForState(current),
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
    current.inventoryReady = true;
    current.inventoryVersion += 1;
    current.blockEmissionTurnClosed = true;
    current.autoContinueReady = false;
    // Every name belongs to this newly emitted inventory, even when the same
    // name appeared in an earlier crystallization.
    current.done = [];
    current.parked = {};
    if (current.active == null) {
      current.stage = WAITING_STAGE;
      current.mode = null;
      // The block-emission turn closes here. The route selector may now
      // present its native picker, but blockEmissionTurnClosed keeps route
      // intents locked until the user answers and route-choice is emitted.
      return outcome(current);
    }
    return outcome(current);
  }

  if (!hasIntent(signal)) {
    return outcome(current, 'READINESS_IS_NOT_INTENT');
  }

  const intent = sig.intent;

  if (intent === 'route-choice') {
    if (current.active != null) {
      return outcome(current, 'ALREADY_RUNNING');
    }
    if (!current.inventoryReady) {
      return outcome(current, 'INVENTORY_NOT_READY');
    }
    if (current.stage !== WAITING_STAGE) {
      return outcome(current, 'NOT_WAITING_FOR_ROUTE');
    }
    // The coordinator emits this only after one valid native-picker answer.
    // It unlocks the follow-up route intent; it does not itself select a mode
    // or change the ordered inventory.
    current.blockEmissionTurnClosed = false;
    current.autoContinueReady = false;
    return outcome(current);
  }

  if (intent === 'auto-continue') {
    // The coordinator emits this only when its stored continuation answer is
    // `yes`. The machine accepts it only right after a clean Direct Build
    // finish and starts the next first-pending slice as Direct Build.
    if (current.active != null) {
      return outcome(current, 'ALREADY_RUNNING');
    }
    if (!current.autoContinueReady) {
      return outcome(current, 'ROUTE_CHOICE_REQUIRED');
    }
    return beginSlice(current, DIRECT_BUILD_MODE, DIRECT_BUILD_STEPS);
  }

  if (intent === 'fail' || intent === 'cancel') {
    // Fail/cancel parks the active slice at its current step, releases
    // `active`, and returns to waiting without marking the slice done.
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
    return startRoute(current, DIRECT_BUILD_MODE, DIRECT_BUILD_STEPS);
  }

  if (intent === PLAN_MODE) {
    return startRoute(current, PLAN_MODE, PLAN_STEPS);
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

function shouldResetDone(nextState, previousStates) {
  const nextVersion = Number.isSafeInteger(nextState && nextState.inventoryVersion)
    ? nextState.inventoryVersion
    : 0;
  const previousVersion = (Array.isArray(previousStates) ? previousStates : []).reduce((highest, state) => {
    const version = Number.isSafeInteger(state && state.inventoryVersion) ? state.inventoryVersion : 0;
    return Math.max(highest, version);
  }, 0);
  return nextVersion > previousVersion;
}

module.exports = {
  machineId,
  initialState,
  transition,
  project,
  shouldResetDone,
  DIRECT_BUILD_STEPS,
  PLAN_STEPS,
};

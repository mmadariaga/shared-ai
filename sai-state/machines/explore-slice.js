'use strict';

const machineId = 'explore-slice@1';

const IDLE_STAGE = 'idle';
const WAITING_STAGE = 'waiting';
const DIRECT_BUILD_MODE = 'direct-build';
const PLAN_MODE = 'plan';
const DIRECT_BUILD_STEPS = Object.freeze(['build-implement', 'backfill', 'archive']);
const PLAN_STEPS = Object.freeze(['sai-1', 'sai-2', 'implement']);
const PUBLICATION_ANSWERS = Object.freeze(['yes', 'no']);

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

const GOTO_REASONS = Object.freeze(['user-request', 'correction']);
// The target that returns a slice to pending: no cursor, the route selector
// presented again. Every other target is a route step.
const PENDING_TARGET = 'pending';
// A route start lies past the route selector, which no forward move crosses.
const ROUTE_START_TARGETS = Object.freeze([DIRECT_BUILD_MODE, PLAN_MODE]);

const initialState = Object.freeze({
  stage: IDLE_STAGE,
  set: [],
  inventoryReady: false,
  inventoryVersion: 0,
  doneEpoch: 0,
  blockEmissionTurnClosed: false,
  autoContinueReady: false,
  active: null,
  done: [],
  mode: null,
  parked: {},
  publication: '',
  moves: [],
});

// Accepted moves, oldest first. Identifiers only: the target, its reason, and
// the time the CLI received the event.
function cloneMoves(src) {
  if (!Array.isArray(src)) return [];
  return src
    .filter((move) => move && typeof move === 'object' && typeof move.target === 'string' && GOTO_REASONS.includes(move.reason))
    .map((move) => ({ target: move.target, reason: move.reason, received_at: typeof move.received_at === 'string' ? move.received_at : null }));
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

// A parked slice is pending with a saved cursor: `fail` or `cancel` parked it,
// Plan selection or Direct Build resumption consumes its saved stage.
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

// The set-wide publication answer: '' until recorded, then 'yes' or 'no'.
function clonePublication(value) {
  return PUBLICATION_ANSWERS.indexOf(value) === -1 ? '' : value;
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
  const publication = clonePublication(src.publication);
  const doneEpoch = safeCount(src.doneEpoch);
  const moves = cloneMoves(src.moves);
  return { stage, set, inventoryReady, inventoryVersion, doneEpoch, blockEmissionTurnClosed, autoContinueReady, active, done, mode, parked, publication, moves };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    set: current.set.slice(),
    inventoryReady: current.inventoryReady,
    inventoryVersion: current.inventoryVersion,
    doneEpoch: current.doneEpoch,
    blockEmissionTurnClosed: current.blockEmissionTurnClosed,
    autoContinueReady: current.autoContinueReady,
    active: current.active,
    done: current.done.slice(),
    mode: current.mode,
    parked: cloneParked(current.parked),
    publication: current.publication,
    moves: cloneMoves(current.moves),
  };
}

// Identifiers only: the set-wide answer and the accepted moves travel to the
// coordinators as this view.
function viewOf(current) {
  return { publication: current.publication, moves: cloneMoves(current.moves) };
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

// `more` adds the fields of a rejection that names what is missing (`missing`,
// `resume_at`) or the effect an accepted outcome has on the Direct Build run
// state of `direct-build-run@1` (`run_effect`, see `runEffect`).
function outcome(current, rejected, more) {
  const state = snapshotOf(current);
  const result = {
    state,
    snapshot: { state: snapshotOf(state), machineId },
    next: nextForState(state),
    run: viewOf(state),
  };
  if (rejected) result.rejected = rejected;
  return Object.assign(result, more || {});
}

// The run state of `direct-build-run@1` follows the slice cursor, and the CLI
// applies the effect in the same store write as the outcome: `drop` lists the
// slices whose run state is discarded, `rewind` cuts one slice's run state back
// to a route item (the first item discards it).
function runEffect(drop, rewind) {
  const effect = {};
  if (drop && drop.length > 0) effect.drop = drop;
  if (rewind) effect.rewind = rewind;
  return Object.keys(effect).length > 0 ? { run_effect: effect } : {};
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
    const parked = current.parked[pendingOf(current)[0]];
    if (parked && parked.mode === DIRECT_BUILD_MODE) {
      return outcome(current, 'RESUMPTION_REQUIRED');
    }
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
  // A resumed slice keeps its run state. A Direct Build slice that starts fresh starts with
  // none, and the run state holds one slice, so no earlier slice's state survives it.
  return outcome(current, null, parked || mode !== DIRECT_BUILD_MODE ? null : runEffect(current.set.slice()));
}

// The active slice leaves its route without a cursor: pending again, with the
// route gate closed so the selector is presented again.
function releaseActive(current) {
  current.active = null;
  current.mode = null;
  current.stage = WAITING_STAGE;
  current.blockEmissionTurnClosed = true;
  current.autoContinueReady = false;
}

function recordMove(current, target, reason, receivedAt) {
  current.moves = cloneMoves(current.moves).concat([{ target, reason, received_at: typeof receivedAt === 'string' ? receivedAt : null }]);
}

// `goto`: moves a slice backward, never past the route selector. The target is
// `pending` (no cursor, selector presented again) or a route step of the slice's
// own route that lies before its current step. A Direct Build rewind to a step
// after the first needs the run state of that step in the store (`run_state`,
// which the CLI reads from `direct-build-run@1`; none when the store holds
// nothing), and is held while an execute order's effect is uncertain or an
// archive order or commit grant was consumed. A completed slice is rejected
// unless the user explicitly asks to reopen it (`reopen: true`, reason
// `user-request`, target `pending`). A rejection changes nothing and records
// nothing.
function gotoSlice(current, sig) {
  if (GOTO_REASONS.indexOf(sig.reason) === -1) return outcome(current, 'GOTO_REASON_INVALID');
  if (!current.inventoryReady) return outcome(current, 'INVENTORY_NOT_READY');
  const target = sig.target;
  if (typeof target !== 'string') return outcome(current, 'GOTO_UNKNOWN_TARGET');
  if (ROUTE_START_TARGETS.indexOf(target) !== -1) return outcome(current, 'GOTO_PAST_CEILING');
  const name = typeof sig.slice === 'string' ? sig.slice : (current.active != null ? current.active : pendingOf(current)[0]);
  if (name === undefined || current.set.indexOf(name) === -1) return outcome(current, name === undefined ? 'NO_PENDING_SLICE' : 'UNKNOWN_SLICE');

  if (current.done.indexOf(name) !== -1) {
    if ((sig.reopen !== true && sig.reopen !== 'true') || sig.reason !== 'user-request' || target !== PENDING_TARGET) return outcome(current, 'SLICE_COMPLETED');
    if (current.active != null) return outcome(current, 'ALREADY_RUNNING');
    current.done = current.done.filter((entry) => entry !== name);
    current.doneEpoch += 1;
    delete current.parked[name];
    current.blockEmissionTurnClosed = true;
    current.autoContinueReady = false;
    recordMove(current, target, sig.reason, sig.received_at);
    return outcome(current, null, runEffect([name]));
  }

  if (target === PENDING_TARGET) {
    delete current.parked[name];
    if (current.active === name) releaseActive(current);
    else if (pendingOf(current)[0] === name) {
      current.blockEmissionTurnClosed = true;
      current.autoContinueReady = false;
    }
    recordMove(current, target, sig.reason, sig.received_at);
    return outcome(current, null, runEffect([name]));
  }

  const cursor = current.active === name ? { mode: current.mode, stage: current.stage } : current.parked[name];
  const known = Object.keys(MODE_STEPS).some((mode) => MODE_STEPS[mode].indexOf(target) !== -1);
  if (!known) return outcome(current, 'GOTO_UNKNOWN_TARGET');
  // A pending slice with no cursor has no route position: any route step lies past the selector.
  if (!cursor) return outcome(current, 'GOTO_PAST_CEILING');
  const steps = MODE_STEPS[cursor.mode];
  if (steps.indexOf(target) === -1) return outcome(current, 'GOTO_UNKNOWN_TARGET');
  const from = steps.indexOf(cursor.stage);
  const to = steps.indexOf(target);
  if (to === from) return outcome(current, 'GOTO_ALREADY_AT_TARGET');
  if (to > from) return outcome(current, 'GOTO_PAST_CEILING');
  if (cursor.mode === DIRECT_BUILD_MODE) {
    const stored = storedRunState(sig, name);
    if (stored.hold === 'consumed') return outcome(current, 'GOTO_ORDER_CONSUMED');
    if (stored.hold !== '') return outcome(current, 'GOTO_ORDER_UNCERTAIN');
    if (to !== 0 && stored.items.indexOf(target) === -1) {
      return outcome(current, 'MISSING_PRECONDITIONS', { missing: ['run-state'], resume_at: DIRECT_BUILD_STEPS[0] });
    }
  }
  if (current.active === name) current.stage = target;
  else current.parked[name] = { mode: cursor.mode, stage: target };
  recordMove(current, target, sig.reason, sig.received_at);
  return outcome(current, null, cursor.mode === DIRECT_BUILD_MODE ? runEffect(null, { slice: name, item: target }) : null);
}

// The Direct Build run state the store holds for a slice, as the CLI passes it
// in the `goto` event: the route items whose state is stored and the hold on a
// rewind (`consumed`, `uncertain`, or none). No view means the store holds none.
function storedRunState(sig, name) {
  const view = sig.run_state && typeof sig.run_state === 'object' && sig.run_state.change === name ? sig.run_state : {};
  return {
    items: Array.isArray(view.items) ? view.items.filter((item) => typeof item === 'string') : [],
    hold: typeof view.hold === 'string' ? view.hold : '',
  };
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
    run: viewOf(current),
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
    const previousSet = current.set;
    const previousDone = current.done;
    const previousParked = current.parked;
    const previousPublication = current.publication;
    // A slice whose stored block hash is unchanged (`unchanged`, computed by the
    // CLI from the stored and the new block hashes) keeps its completion and its
    // parked cursor; an event without the list keeps none.
    const keep = Array.isArray(sig.unchanged)
      ? sig.recordedList.filter((name) => sig.unchanged.indexOf(name) !== -1)
      : [];
    current.set = sig.recordedList.slice();
    current.inventoryReady = true;
    current.inventoryVersion += 1;
    current.blockEmissionTurnClosed = true;
    current.autoContinueReady = false;
    // Every other name belongs to this newly emitted inventory, even when the
    // same name appeared in an earlier crystallization.
    current.done = current.set.filter((name) => keep.indexOf(name) !== -1 && previousDone.indexOf(name) !== -1);
    current.parked = {};
    for (const name of keep) {
      if (previousParked[name]) current.parked[name] = previousParked[name];
    }
    // The publication answer belongs to the set it was asked for: it survives a
    // re-registration of the same change names.
    const sameNames = previousSet.length === current.set.length
      && previousSet.every((name) => current.set.indexOf(name) !== -1);
    current.publication = sameNames ? previousPublication : '';
    // A slice keeps its run state only while it keeps a cursor.
    const dropped = previousSet.concat(current.set)
      .filter((name, i, all) => all.indexOf(name) === i && name !== current.active && !current.parked[name]);
    const effect = runEffect(dropped);
    if (current.active == null) {
      current.stage = WAITING_STAGE;
      current.mode = null;
      // The block-emission turn closes here. The route selector may now
      // present its native picker, but blockEmissionTurnClosed keeps route
      // intents locked until the user answers and route-choice is emitted.
      return outcome(current, null, effect);
    }
    return outcome(current, null, effect);
  }

  // Single-slice amendment: the block emit's `--amend` validates one block and
  // asks the machine whether that slice may be replaced; `amend_kind` is the
  // CLI's field-by-field comparison of the stored and the new block. A
  // completed slice is never amendable. A `metadata` amendment keeps the route
  // authorization: a running slice is amended in place and a parked cursor is
  // kept. A `content` amendment (also any unknown kind) voids it: the slice
  // returns to pending without a cursor and the route gate closes, so the route
  // selector is presented again. Order and the other slices stay as they were.
  if (typeof sig.amend === 'string') {
    if (!current.inventoryReady || current.set.indexOf(sig.amend) === -1) {
      return outcome(current, 'UNKNOWN_SLICE');
    }
    if (current.done.indexOf(sig.amend) !== -1) {
      return outcome(current, 'SLICE_COMPLETED');
    }
    if (sig.amend_kind === 'metadata') {
      return outcome(current);
    }
    const first = pendingOf(current)[0];
    delete current.parked[sig.amend];
    if (current.active === sig.amend) releaseActive(current);
    if (first === sig.amend) {
      current.blockEmissionTurnClosed = true;
      current.autoContinueReady = false;
    }
    return outcome(current, null, runEffect([sig.amend]));
  }

  if (!hasIntent(signal)) {
    return outcome(current, 'READINESS_IS_NOT_INTENT');
  }

  const intent = sig.intent;

  if (intent === 'goto') {
    return gotoSlice(current, sig);
  }

  if (intent === 'resume-direct-build') {
    if (current.active != null) return outcome(current, 'ALREADY_RUNNING');
    const parked = current.parked[pendingOf(current)[0]];
    if (!parked || parked.mode !== DIRECT_BUILD_MODE) {
      return outcome(current, 'NO_PENDING_DIRECT_BUILD');
    }
    // Resumption consumes the saved cursor, not a new route authorization.
    return beginSlice(current, DIRECT_BUILD_MODE, DIRECT_BUILD_STEPS);
  }

  if (intent === 'publication') {
    // One answer per recorded set; a new inventory clears it, so a slice chain
    // reads it back without asking again, also after a context compaction. An
    // event without `value` records nothing and returns the run view: that is
    // how a coordinator reads the answer.
    if (sig.value === undefined) {
      return outcome(current);
    }
    if (!current.inventoryReady) {
      return outcome(current, 'INVENTORY_NOT_READY');
    }
    if (PUBLICATION_ANSWERS.indexOf(sig.value) === -1) {
      return outcome(current, 'INVALID_PUBLICATION');
    }
    if (current.publication !== '') {
      return outcome(current, 'PUBLICATION_ALREADY_RECORDED');
    }
    current.publication = sig.value;
    return outcome(current);
  }

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
    const parked = current.parked[pendingOf(current)[0]];
    if (parked && parked.mode === DIRECT_BUILD_MODE) {
      return outcome(current, 'RESUMPTION_REQUIRED');
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
  // A reopened slice leaves `done`; the union with the stored list must not bring it back.
  const nextEpoch = safeCount(nextState && nextState.doneEpoch);
  const previousEpoch = (Array.isArray(previousStates) ? previousStates : []).reduce((highest, state) => Math.max(highest, safeCount(state && state.doneEpoch)), 0);
  return nextVersion > previousVersion || nextEpoch > previousEpoch;
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

'use strict';

// design-standalone@1 — stateful stage machine owning happy-path step routing
// for standalone `sai-2-design` runs (I1). Mirrors `explore-idea@1` cursor
// pattern and the sibling `spec-standalone@1` machine: stage machine owns the stage
// table, pointer routing, transition rules, and progression state; the
// coordinator consults it per progress event and wraps its `next.follow` in
// the unchanged two-line continuation (wire byte-identical). Routing-only:
// the machine never writes artifacts.
//
// Standalone-only scope (I4): the supervised adapter keeps its routing-only
// map and never consults this machine; no shared sessions or state. Shared
// `command-runner` contract untouched.
//
// Stage table (I2) replicates the seven design steps from
// `sai/commands/design/phase-contract.md` as-is, happy-path only, no
// wait/failure states:
//   prereqs-resolution (follow: none) + six step files; terminal done maps
//   to the exact `Active step: none` literal (E4).
//
// Variant (I3, E2, E9): two variants via a single canonical boolean spawn
// flag `withOverview` — true selects the opted-in 7-step plan (with
// overview), false (default) selects the unopted 6-step plan (without).
// The coordinator derives the flag from raw `--overview-lang` token presence
// (malformed/duplicate still counts as present; value validation stays
// worker-owned) and passes only the boolean here. The variant is immutable
// for the run; unopted runs never derive overview. A pristine session (no
// marks yet) adopts the flag from the first signal carrying it; every later
// signal's flag is ignored.
//
// Signal contract: the coordinator emits `{ step_ids: string[] }` per
// progress event (the worker's reported ids) plus the spawn `withOverview`
// flag on the first signal. Undeclared ids are ignored silently with no
// notification channel; the authoritative pointer re-steers the worker
// (E5, I5). Feedback (`needs_input`) and recovery (`continue_after_recovery`)
// continuations carry no pointer and never consult the machine — the machine
// parks until the next progress event (E6, I5). Replacement re-resolves via
// `project()` from the surviving stage machine session (E6, I5). Every standalone
// run opens a fresh stage machine session and never reuses prior marks; supervised
// runs never touch this machine; the session closes when the run closes with
// no machine auto-retry (E6, I5). Emit or follow-load failure stops the run,
// shows the error, and waits; nothing is guessed, never through Bounded
// Recovery (E7, I5).
//
// Pointer/fetch contract (I5) mirrors explore follow-load: after each
// `/emit`, fetch whatever `next.follow` names with no file whitelist; an
// unknown follow target or a path outside `steps/` stops with an error and
// fetches nothing; a follow-load failure stops, shows the error, and waits;
// nothing is guessed and the failure is never routed through Bounded
// Recovery (E7). Loaded-set skip (E8): an already-loaded follow path is not
// re-fetched — see hint wording below, adopted by convention from the
// sai-1/Plan change.

const machineId = 'design-standalone@1';

const OPTED_IN_STEPS = Object.freeze([
  'prereqs-resolution',
  'research',
  'design',
  'tasks',
  'interfaces',
  'review',
  'overview',
]);

const UNOPTED_STEPS = Object.freeze([
  'prereqs-resolution',
  'research',
  'design',
  'tasks',
  'interfaces',
  'review',
]);

const DONE_STAGE = 'done';

const STAGE_FILES = Object.freeze({
  'prereqs-resolution': 'none',
  research: 'sai/commands/design/steps/research.md',
  design: 'sai/commands/design/steps/design.md',
  tasks: 'sai/commands/design/steps/tasks.md',
  interfaces: 'sai/commands/design/steps/interfaces.md',
  review: 'sai/commands/design/steps/review.md',
  overview: 'sai/commands/design/steps/overview.md',
  done: 'none',
});

const initialState = Object.freeze({
  stage: 'prereqs-resolution',
  done: [],
  withOverview: false,
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Canonical boolean spawn flag only (M1): `withOverview: boolean`.
// Returns the flag when present as a boolean, otherwise null (absent).
// No string/number coercion; value validation stays worker-owned.
function variantFromSignal(signal) {
  if (!isPlainObject(signal)) return null;
  if (typeof signal.withOverview === 'boolean') return signal.withOverview;
  return null;
}

// Canonical key only (M1): reads `withOverview` boolean, defaults false
// (unopted). Round-trips this machine's own persisted state exactly.
function withOverviewFromState(state) {
  if (!isPlainObject(state)) return false;
  if (typeof state.withOverview === 'boolean') return state.withOverview;
  return false;
}

function activeStepsFor(withOverview) {
  return withOverview ? OPTED_IN_STEPS : UNOPTED_STEPS;
}

function cloneState(state) {
  const src = isPlainObject(state) ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : 'prereqs-resolution';
  const done = Array.isArray(src.done) ? src.done.slice() : [];
  const withOverview = withOverviewFromState(src);
  return { stage, done, withOverview };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    done: current.done.slice(),
    withOverview: current.withOverview,
  };
}

function firstUnmarked(done, withOverview) {
  const active = activeStepsFor(withOverview);
  for (const step of active) {
    if (done.indexOf(step) === -1) return step;
  }
  return DONE_STAGE;
}

function nextFor(stage) {
  // E1/I2: prereqs-resolution carries follow: none — it runs from the worker
  // contract plus common.md before the first progress event; the initial
  // dispatch bears no Active step line and the first delivered pointer
  // targets research.
  if (stage === 'prereqs-resolution') {
    return { follow: 'none', hint: 'no fetch — runs from worker contract plus common.md' };
  }
  // E4/I2: terminal done maps to the completion pointer; the coordinator
  // wraps it as the exact `Active step: none` literal.
  if (stage === DONE_STAGE) {
    return { follow: 'none', hint: 'all steps complete — return terminal result' };
  }
  const follow = STAGE_FILES[stage] || 'none';
  // E8: hint wording adopted by convention from the sai-1/Plan change —
  // loaded-set skip travels in the hint so an already-loaded follow path is
  // not re-fetched.
  return { follow, hint: 'fetch the ' + stage + ' step — skip if already loaded' };
}

function outcome(current, rejected) {
  const state = {
    stage: current.stage,
    done: current.done.slice(),
    withOverview: current.withOverview,
  };
  const result = {
    state,
    snapshot: { state: snapshotOf(state), machineId },
    next: nextFor(state.stage),
  };
  if (rejected) result.rejected = rejected;
  return result;
}

function reportedIds(signal) {
  const sig = isPlainObject(signal) ? signal : {};
  // Canonical signal is `{ step_ids: [...] }` (the worker progress-event
  // ids). Accept `completedIds` as a tolerant alias, mirroring the sibling
  // spec-standalone machine; nothing else advances.
  if (Array.isArray(sig.step_ids)) return sig.step_ids;
  if (Array.isArray(sig.completedIds)) return sig.completedIds;
  return null;
}

function isPristine(current) {
  return current.done.length === 0 && current.stage === 'prereqs-resolution';
}

function project(state) {
  const current = cloneState(state);
  // E6: re-resolution derives the active step from the surviving session's
  // done set (and its immutable variant), so a replacement's first
  // continuation carries the correct pointer even when the cached stage is
  // stale. Unopted runs never derive overview (E2).
  current.stage = firstUnmarked(current.done, current.withOverview);
  return {
    snapshot: { state: snapshotOf(current), machineId },
    next: nextFor(current.stage),
  };
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = isPlainObject(signal) ? signal : {};

  // I3: variant immutable for the run. A pristine session (no marks yet)
  // adopts the canonical boolean spawn flag from the first signal carrying
  // it; every later signal's flag is ignored. Absent flag defaults to
  // unopted (false).
  const signalVariant = variantFromSignal(sig);
  if (signalVariant !== null && isPristine(current)) {
    current.withOverview = signalVariant;
  }

  const ids = reportedIds(sig);
  // E5/E6/I5: no recognized ids (missing signal, empty list, or only
  // undeclared ids) is ignored silently with no notification channel — no
  // `rejected` marker, no state change. The coordinator re-emits the
  // authoritative pointer from the unchanged state, which re-steers the
  // worker. A machine-named unknown file or a path outside `steps/` never
  // reaches this transition as an id; that case stops at the coordinator's
  // follow-load gate (E7, I5) and fetches nothing. Parked machine
  // (needs_input/failed/cancelled with pointer-free continuations) likewise
  // leaves state and pointer unchanged.
  if (!ids) {
    current.stage = firstUnmarked(current.done, current.withOverview);
    return outcome(current);
  }

  // Add newly completed declared ids in canonical plan order so the done
  // set stays deterministic regardless of wire order. Undeclared ids are
  // silently dropped (E5); on unopted runs `overview` is undeclared and
  // never added (E2). Marks are monotonic — never reopened or removed.
  const active = activeStepsFor(current.withOverview);
  for (const step of active) {
    if (ids.indexOf(step) !== -1 && current.done.indexOf(step) === -1) {
      current.done = current.done.concat([step]);
    }
  }
  current.stage = firstUnmarked(current.done, current.withOverview);
  return outcome(current);
}

module.exports = {
  machineId,
  initialState,
  transition,
  project,
  OPTED_IN_STEPS,
  UNOPTED_STEPS,
  STAGE_FILES,
  DONE_STAGE,
};

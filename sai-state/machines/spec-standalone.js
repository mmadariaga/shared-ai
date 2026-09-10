'use strict';

// spec-standalone@1 — stateful sidecar machine owning happy-path step routing
// for standalone `sai-1-spec` runs (I1). Mirrors `explore-idea@1` cursor
// pattern: sidecar owns the stage table, pointer routing, transition rules,
// and progression state; the coordinator consults it per progress event and
// wraps its `next.follow` in the unchanged two-line continuation (wire
// byte-identical). Routing-only: the machine never writes artifacts.
//
// Standalone-only scope (I3): the supervised adapter keeps its routing-only
// map and never consults this machine; no shared sessions or state. Shared
// `command-runner` contract untouched.
//
// Stage table (I2) replicates the six steps from
// `sai/policies/spec-phase-contract.md` as-is, happy-path only, no
// wait/failure states:
//   prereqs-and-change (follow: none) + five step files; terminal done maps
//   to the exact `Active step: none` literal (E6).
//
// Signal contract: the coordinator emits `{ step_ids: string[] }` per
// progress event (the worker's reported ids). Undeclared ids are ignored
// silently with no notification channel; the authoritative pointer re-steers
// the worker (E2, I5). Feedback (`needs_input`) and recovery
// (`continue_after_recovery`) continuations carry no pointer and never
// consult the machine — the machine parks until the next progress event
// (E7, I5). Replacement re-resolves via `project()` from the surviving
// sidecar session (E3, I5). Every standalone run opens a fresh sidecar
// session and never reuses prior marks; supervised runs never touch this
// machine; the session closes when the run closes with no machine
// auto-retry (E5, E7, I5).
//
// Pointer/fetch contract (I4) mirrors explore follow-load: after each
// `/emit`, fetch whatever `next.follow` names with no file whitelist; an
// unknown follow target or a path outside `steps/` stops with an error and
// fetches nothing; a follow-load failure stops, shows the error, and waits;
// nothing is guessed and the failure is never routed through Bounded
// Recovery (E1, E2). Loaded-set skip (E8, Plan change): an already-loaded
// follow path is not re-fetched — see hint wording below.

const machineId = 'spec-standalone@1';

const STEPS = Object.freeze([
  'prereqs-and-change',
  'research',
  'proposal',
  'specs',
  'validation',
  'review',
]);

const DONE_STAGE = 'done';

const STAGE_FILES = Object.freeze({
  'prereqs-and-change': 'none',
  research: 'sai/commands/spec/steps/research.md',
  proposal: 'sai/commands/spec/steps/proposal.md',
  specs: 'sai/commands/spec/steps/specs.md',
  validation: 'sai/commands/spec/steps/validation.md',
  review: 'sai/commands/spec/steps/review.md',
  done: 'none',
});

const initialState = Object.freeze({
  stage: 'prereqs-and-change',
  done: [],
});

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : 'prereqs-and-change';
  const done = Array.isArray(src.done) ? src.done.slice() : [];
  return { stage, done };
}

function snapshotOf(current) {
  return {
    stage: current.stage,
    done: current.done.slice(),
  };
}

function firstUnmarked(done) {
  for (const step of STEPS) {
    if (done.indexOf(step) === -1) return step;
  }
  return DONE_STAGE;
}

function nextFor(stage) {
  // E4: prereqs-and-change carries follow: none — it runs from the worker
  // contract plus common.md before the first progress event; the initial
  // dispatch bears no Active step line and the first delivered pointer
  // targets research.
  if (stage === 'prereqs-and-change') {
    return { follow: 'none', hint: 'no fetch — runs from worker contract plus common.md' };
  }
  // E6/I2: terminal done maps to the completion pointer; the coordinator
  // wraps it as the exact `Active step: none` literal.
  if (stage === DONE_STAGE) {
    return { follow: 'none', hint: 'all steps complete — return terminal result' };
  }
  const follow = STAGE_FILES[stage] || 'none';
  // E8: Plan change hint wording — loaded-set skip travels in the hint so an
  // already-loaded follow path is not re-fetched.
  return { follow, hint: 'fetch the ' + stage + ' step — skip if already loaded' };
}

function outcome(current, rejected) {
  const state = {
    stage: current.stage,
    done: current.done.slice(),
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
  const sig = signal && typeof signal === 'object' ? signal : {};
  // Canonical signal is `{ step_ids: [...] }` (the worker progress-event
  // ids). Accept `completedIds` as a tolerant alias; nothing else advances.
  if (Array.isArray(sig.step_ids)) return sig.step_ids;
  if (Array.isArray(sig.completedIds)) return sig.completedIds;
  return null;
}

function project(state) {
  const current = cloneState(state);
  // E3: re-resolution derives the active step from the surviving session's
  // done set, so a replacement's first continuation carries the correct
  // pointer even when the cached stage is stale.
  current.stage = firstUnmarked(current.done);
  return {
    snapshot: { state: snapshotOf(current), machineId },
    next: nextFor(current.stage),
  };
}

function transition(state, signal) {
  const current = cloneState(state);

  const ids = reportedIds(signal);
  // E2/I5: no recognized ids (missing signal, empty list, or only
  // undeclared ids) is ignored silently with no notification channel — no
  // `rejected` marker, no state change. The coordinator re-emits the
  // authoritative pointer from the unchanged state, which re-steers the
  // worker. A machine-named unknown file or a path outside `steps/` never
  // reaches this transition as an id; that case stops at the coordinator's
  // follow-load gate (E2, I4) and fetches nothing.
  if (!ids) {
    current.stage = firstUnmarked(current.done);
    return outcome(current);
  }

  // Add newly completed declared ids in canonical STEPS order so the done
  // set stays deterministic regardless of wire order. Undeclared ids are
  // silently dropped (E2). Marks are monotonic — never reopened or removed.
  for (const step of STEPS) {
    if (ids.indexOf(step) !== -1 && current.done.indexOf(step) === -1) {
      current.done = current.done.concat([step]);
    }
  }
  current.stage = firstUnmarked(current.done);
  return outcome(current);
}

module.exports = { machineId, initialState, transition, project, STEPS, STAGE_FILES, DONE_STAGE };

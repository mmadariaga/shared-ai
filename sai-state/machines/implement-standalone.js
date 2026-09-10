'use strict';

// implement-standalone@1 — stateful stage machine owning happy-path step routing
// for standalone `sai-3-implement` runs (I1). Clones the `spec-standalone@1`
// pattern: stage machine owns the stage table, pointer routing, transition rules,
// and progression state; the coordinator consults it per progress event and
// wraps its `next.follow` in the unchanged two-line continuation (wire
// byte-identical). Routing-only: the machine never writes artifacts.
//
// Standalone-only scope (E1, I8): the machine governs `sai-3` in standalone
// mode only; on the chained path (`/sai-build` implement pos0 non-final) the
// same adapter runs with supervised transition and this machine does not
// arbitrate; no shared sessions or state. Shared `command-runner` contract
// untouched.
//
// Stage table (E2, I3) replicates the six `progress_plan` ids from
// `sai/commands/implement/coordinator.md` as-is, happy-path only, no
// wait/failure states:
//   prereqs-resolution (follow: none) + five step files; terminal done maps
//   to the exact `Active step: none` literal (E2).
//
// Signal contract: the coordinator emits `{ step_ids: string[] }` per
// progress event (the worker's reported ids). Undeclared ids are ignored
// silently with no notification channel; the authoritative pointer re-steers
// the worker (E2). Feedback (`needs_input`) and recovery
// (`continue_after_recovery`) continuations carry no pointer and never
// consult the machine — the machine parks until the next progress event
// (I8). Replacement re-resolves via `project()` from the surviving
// stage machine session (I5). Every standalone run opens a fresh stage machine
// session and never reuses prior marks; supervised runs never touch this
// machine; the session closes when the run closes with no machine
// auto-retry (E1, I8).
//
// Pointer/fetch contract (E3, I4) mirrors explore follow-load: after each
// `/emit`, fetch whatever `next.follow` names with no file whitelist; an
// unknown follow target or a path outside `steps/` stops with an error and
// fetches nothing; a follow-load failure stops, shows the error, and waits;
// nothing is guessed and the failure is never routed through Bounded
// Recovery. Loaded-set skip (E5, I6, Plan change): an already-loaded
// follow path is not re-fetched — see hint wording below.
//
// Minimal wire (E4, I5): only `{stage, next}` travels the wire with mandatory
// `machineId` on every `/emit`; no snapshots, no state in the request;
// malformed `machineId` answers `INVALID_EVENT` / `UNKNOWN_MACHINE` with no
// fallback (stage-machine-owned).
//
// Minimal boot (E3, I3, I4): nucleus only (`worker.md` + `steps/common.md`);
// `prereqs-resolution` has no file of its own and runs from the worker
// contract plus `common.md` before the first pointer; each of the five step
// files loads only when `next.follow` names it.
//
// Fail-closed (E6, I7): without the stage machine the process stops, the user is
// notified, and the run waits for new instructions; it does not continue
// degraded. Cursor dedup (E5, I6): re-emitting the same state does not
// reload the already-loaded file.

const machineId = 'implement-standalone@1';

const STEPS = Object.freeze([
  'prereqs-resolution',
  'collapse-implemented-steps',
  'artifact-analysis',
  'documentation-review',
  'plan-generation',
  'validation',
]);

const DONE_STAGE = 'done';

const STAGE_FILES = Object.freeze({
  'prereqs-resolution': 'none',
  'collapse-implemented-steps': 'sai/commands/implement/steps/collapse-implemented-steps.md',
  'artifact-analysis': 'sai/commands/implement/steps/artifact-analysis.md',
  'documentation-review': 'sai/commands/implement/steps/documentation-review.md',
  'plan-generation': 'sai/commands/implement/steps/plan-generation.md',
  validation: 'sai/commands/implement/steps/validation.md',
  done: 'none',
});

const initialState = Object.freeze({
  stage: 'prereqs-resolution',
  done: [],
});

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : 'prereqs-resolution';
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
  // E3/I3: prereqs-resolution carries follow: none — it runs from the worker
  // contract plus common.md before the first progress event; the initial
  // dispatch bears no Active step line and the first delivered pointer
  // targets collapse-implemented-steps.
  if (stage === 'prereqs-resolution') {
    return { follow: 'none', hint: 'no fetch — runs from worker contract plus common.md' };
  }
  // Terminal done maps to the completion pointer; the coordinator
  // wraps it as the exact `Active step: none` literal.
  if (stage === DONE_STAGE) {
    return { follow: 'none', hint: 'all steps complete — return terminal result' };
  }
  const follow = STAGE_FILES[stage] || 'none';
  // E5/I6: cursor-dedup hint wording — loaded-set skip travels in the hint so an
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
  // Re-resolution derives the active step from the surviving session's
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
  // E2: no recognized ids (missing signal, empty list, or only
  // undeclared ids) is ignored silently with no notification channel — no
  // `rejected` marker, no state change. The coordinator re-emits the
  // authoritative pointer from the unchanged state, which re-steers the
  // worker. A machine-named unknown file or a path outside `steps/` never
  // reaches this transition as an id; that case stops at the coordinator's
  // follow-load gate (E3, I4) and fetches nothing.
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

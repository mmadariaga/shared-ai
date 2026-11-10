'use strict';

// Factory for linear step machines: creates a stateful stage machine that owns
// happy-path step routing for standalone coordinator runs. The returned machine
// follows the spec-steps@1, design-steps@1, and review-steps@1 pattern: the machine owns the
// stage table, pointer routing, transition rules, and progression state; the
// coordinator consults it per progress event and wraps its `next.follow` in the
// unchanged two-line continuation (wire byte-identical). Routing-only: the
// machine never writes artifacts.

function createLinearStepMachine({ machineId, steps, stageFiles }) {
  if (!machineId || !Array.isArray(steps) || !stageFiles || typeof stageFiles !== 'object') {
    throw new Error('createLinearStepMachine requires machineId, steps array, and stageFiles object');
  }

  const DONE_STAGE = 'done';
  const STEPS = Object.freeze(steps.slice());
  const STAGE_FILES_MAP = Object.freeze(Object.assign({}, stageFiles, { done: 'none' }));
  const initialState = Object.freeze({
    stage: steps[0] || DONE_STAGE,
    done: [],
  });

  function cloneState(state) {
    const src = state && typeof state === 'object' ? state : {};
    const stage = typeof src.stage === 'string' ? src.stage : (steps[0] || DONE_STAGE);
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
    // The first step carries follow: none — it runs from the worker contract
    // plus common.md before the first progress event; the initial dispatch bears
    // no Active step line and the first delivered pointer targets the second step
    // or done if there is only one step.
    if (stage === steps[0]) {
      return { follow: 'none', hint: 'no fetch — runs from worker contract plus common.md' };
    }
    // Terminal done maps to the completion pointer; the coordinator wraps it as
    // the exact `Active step: none` literal.
    if (stage === DONE_STAGE) {
      return { follow: 'none', hint: 'all steps complete — return terminal result' };
    }
    const follow = STAGE_FILES_MAP[stage] || 'none';
    // Hint wording follows the established pattern for loaded-set skip.
    return { follow, hint: 'fetch the ' + stage + ' step — skip if already loaded' };
  }

  // The first filed step is the first step whose follow is a file. Every
  // current machine's first step is fileless, so this is the second step. The
  // `reset` verb returns it so the coordinator can deliver that pointer with
  // the task disclosure; the worker runs the fileless first step inline.
  function firstFiled() {
    for (const step of STEPS) {
      const file = STAGE_FILES_MAP[step];
      if (typeof file === 'string' && file !== 'none') {
        return { stage: step, next: { follow: file, hint: 'fetch the ' + step + ' step — skip if already loaded' } };
      }
    }
    return { stage: DONE_STAGE, next: nextFor(DONE_STAGE) };
  }

  // The active step a rejection answers with: the first unmarked step, except
  // that with nothing done it is the first filed step, the pointer `reset`
  // returned, so a rejection right after `reset` re-steers the worker to the
  // file it was given and never to the fileless first step. Only the response
  // carries it; the stored state still derives its stage from the done set.
  function activeFor(done) {
    if (done.length === 0) {
      const first = firstFiled();
      return { stage: first.stage, next: first.next };
    }
    const stage = firstUnmarked(done);
    return { stage, next: nextFor(stage) };
  }

  function outcome(current, rejected, extra) {
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
    if (extra) Object.assign(result, extra);
    return result;
  }

  function reportedIds(signal) {
    const sig = signal && typeof signal === 'object' ? signal : {};
    // Canonical signal is `{ step_ids: [...] }` (the worker progress-event ids).
    // Accept `completedIds` as a tolerant alias; nothing else advances.
    if (Array.isArray(sig.step_ids)) return sig.step_ids;
    if (Array.isArray(sig.completedIds)) return sig.completedIds;
    return null;
  }

  function project(state) {
    const current = cloneState(state);
    // Re-resolution derives the active step from the surviving session's done set,
    // so a replacement's first continuation carries the correct pointer even when
    // the cached stage is stale.
    current.stage = firstUnmarked(current.done);
    return {
      snapshot: { state: snapshotOf(current), machineId },
      next: nextFor(current.stage),
    };
  }

  function transition(state, signal) {
    const current = cloneState(state);

    const ids = reportedIds(signal);
    // A report without a step list (missing signal) changes nothing: the
    // coordinator re-emits the authoritative pointer from the unchanged state,
    // which re-steers the worker.
    if (!ids) {
      current.stage = firstUnmarked(current.done);
      return outcome(current);
    }

    // A report that names an id the machine does not declare is rejected whole:
    // `rejected: UNKNOWN_STEP_ID` with the unknown ids, the state unchanged, and
    // the unchanged active pointer, so the coordinator re-steers the worker and
    // the worker reports the whole step again. Declared ids of that report are not
    // applied, so the machine never moves on input it does not understand. A
    // machine-named unknown file or a path outside `steps/` never reaches this
    // transition as an id; that case stops at the coordinator's follow-load gate
    // and fetches nothing.
    const unknown = ids.filter((id) => STEPS.indexOf(id) === -1);
    if (unknown.length > 0) {
      current.stage = firstUnmarked(current.done);
      const active = activeFor(current.done);
      return outcome(current, 'UNKNOWN_STEP_ID', { unknown_ids: unknown, stage: active.stage, next: active.next });
    }

    // Add newly completed declared ids in canonical STEPS order so the done set
    // stays deterministic regardless of wire order. Declared ids that are already
    // done stay accepted with no change. Marks are monotonic — never reopened or
    // removed.
    for (const step of STEPS) {
      if (ids.indexOf(step) !== -1 && current.done.indexOf(step) === -1) {
        current.done = current.done.concat([step]);
      }
    }
    current.stage = firstUnmarked(current.done);
    return outcome(current);
  }

  return { machineId, initialState, transition, project, firstFiled, STEPS, STAGE_FILES: STAGE_FILES_MAP, DONE_STAGE };
}

module.exports = { createLinearStepMachine };

'use strict';

const machineId = 'explore-idea@1';

const STAGES = Object.freeze(['explore-change', 'review-edge-cases', 'implementation-details', 'crystallize']);

const COMMON_STEP = 'sai/commands/explore/steps/common.md';

const STAGE_FILES = Object.freeze({
  'explore-change': 'sai/commands/explore/steps/common.md',
  'review-edge-cases': 'sai/commands/explore/steps/common.md',
  'implementation-details': 'sai/commands/explore/steps/common.md',
  crystallize: 'sai/commands/explore/steps/crystallization-protocol.md',
});

const initialState = Object.freeze({ stage: 'explore-change', ideaList: [], edgeCaseList: null, implementationDetailsList: null });

// Each stage's own recorded list. A recordedList event records into the list
// owned by the current stage.
const STAGE_LISTS = Object.freeze({
  'explore-change': 'ideaList',
  'review-edge-cases': 'edgeCaseList',
  'implementation-details': 'implementationDetailsList',
});

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : STAGES[0];
  const ideaList = Array.isArray(src.ideaList) ? src.ideaList.slice() : [];
  // Distinguish unrecorded (null) from recorded-empty (empty array)
  const edgeCaseList = Array.isArray(src.edgeCaseList) ? src.edgeCaseList.slice() : null;
  const implementationDetailsList = Array.isArray(src.implementationDetailsList) ? src.implementationDetailsList.slice() : null;
  return { stage, ideaList, edgeCaseList, implementationDetailsList };
}

// Stage-static first vs repeat. Skip-fetch is the chat loaded-set, not this table.
const STAGE_HINTS = Object.freeze({
  'explore-change': 'load',
  'review-edge-cases': 'follow',
  'implementation-details': 'follow',
  crystallize: 'load',
});

function hintFor(stage, follow) {
  const kind = STAGE_HINTS[stage] || 'load';
  if (kind === 'follow') return 'follow the instructions of ' + follow;
  return 'load and follow ' + follow;
}

function nextFor(stage) {
  const follow = STAGE_FILES[stage] || COMMON_STEP;
  return { follow, hint: hintFor(stage, follow) };
}

function advanceState(current) {
  const idx = STAGES.indexOf(current.stage);
  const stage = idx === -1 ? current.stage : (idx + 1 >= STAGES.length ? STAGES[STAGES.length - 1] : STAGES[idx + 1]);
  return {
    stage,
    ideaList: current.ideaList.slice(),
    edgeCaseList: current.edgeCaseList ? current.edgeCaseList.slice() : null,
    implementationDetailsList: current.implementationDetailsList ? current.implementationDetailsList.slice() : null,
  };
}

function hasIntent(signal) {
  return Boolean(signal && typeof signal === 'object' && typeof signal.intent === 'string' && signal.intent.length > 0);
}

function project(state) {
  const current = cloneState(state);
  const snapshotState = {
    stage: current.stage,
    ideaList: current.ideaList.slice(),
    edgeCaseList: current.edgeCaseList ? current.edgeCaseList.slice() : null,
    implementationDetailsList: current.implementationDetailsList ? current.implementationDetailsList.slice() : null,
  };
  return {
    snapshot: { state: snapshotState, machineId },
    next: nextFor(current.stage),
  };
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = signal && typeof signal === 'object' ? signal : {};

  // Content-based recording: a non-null recordedList records into the current
  // stage's own list without advancing. Recording and advancing stay separate
  // emits; the content-based empty-set rule advances on a later no-intent emit.
  if (Array.isArray(sig.recordedList)) {
    const listKey = STAGE_LISTS[current.stage];
    if (listKey) {
      const recordedState = {
        stage: current.stage,
        ideaList: current.ideaList.slice(),
        edgeCaseList: current.edgeCaseList ? current.edgeCaseList.slice() : null,
        implementationDetailsList: current.implementationDetailsList ? current.implementationDetailsList.slice() : null,
      };
      recordedState[listKey] = sig.recordedList.slice();
      const snapshotState = {
        stage: recordedState.stage,
        ideaList: recordedState.ideaList.slice(),
        edgeCaseList: recordedState.edgeCaseList ? recordedState.edgeCaseList.slice() : null,
        implementationDetailsList: recordedState.implementationDetailsList ? recordedState.implementationDetailsList.slice() : null,
      };
      return {
        state: recordedState,
        snapshot: { state: snapshotState, machineId },
        next: nextFor(current.stage),
      };
    }
  }

  // Determine if auto-advance is allowed based on stage and recorded list content.
  // Auto-advance only at stages with content-based empty-set rules: review-edge-cases and implementation-details.
  let shouldAutoAdvance = false;
  if (current.stage === 'review-edge-cases' && current.edgeCaseList !== null && current.edgeCaseList.length === 0) {
    shouldAutoAdvance = true;
  } else if (current.stage === 'implementation-details' && current.implementationDetailsList !== null && current.implementationDetailsList.length === 0) {
    shouldAutoAdvance = true;
  }

  if (shouldAutoAdvance) {
    const nextState = advanceState(current);
    const snapshotState = {
      stage: nextState.stage,
      ideaList: nextState.ideaList.slice(),
      edgeCaseList: nextState.edgeCaseList ? nextState.edgeCaseList.slice() : null,
      implementationDetailsList: nextState.implementationDetailsList ? nextState.implementationDetailsList.slice() : null,
    };
    return {
      state: nextState,
      snapshot: { state: snapshotState, machineId },
      next: nextFor(nextState.stage),
    };
  }

  if (!hasIntent(signal)) {
    const staying = {
      stage: current.stage,
      ideaList: current.ideaList.slice(),
      edgeCaseList: current.edgeCaseList ? current.edgeCaseList.slice() : null,
      implementationDetailsList: current.implementationDetailsList ? current.implementationDetailsList.slice() : null,
    };
    const snapshotState = {
      stage: staying.stage,
      ideaList: staying.ideaList.slice(),
      edgeCaseList: staying.edgeCaseList ? staying.edgeCaseList.slice() : null,
      implementationDetailsList: staying.implementationDetailsList ? staying.implementationDetailsList.slice() : null,
    };
    return {
      state: staying,
      snapshot: { state: snapshotState, machineId },
      next: nextFor(staying.stage),
      rejected: 'READINESS_IS_NOT_INTENT',
    };
  }

  const nextState = advanceState(current);
  const snapshotState = {
    stage: nextState.stage,
    ideaList: nextState.ideaList.slice(),
    edgeCaseList: nextState.edgeCaseList ? nextState.edgeCaseList.slice() : null,
    implementationDetailsList: nextState.implementationDetailsList ? nextState.implementationDetailsList.slice() : null,
  };
  return {
    state: nextState,
    snapshot: { state: snapshotState, machineId },
    next: nextFor(nextState.stage),
  };
}

module.exports = { machineId, initialState, transition, project, STAGES };

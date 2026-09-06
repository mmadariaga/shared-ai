'use strict';

const machineId = 'explore-stage@1';

const STAGES = Object.freeze(['explore-change', 'review-edge-cases', 'implementation-details', 'crystallize']);

const COMMON_STEP = 'sai/commands/explore/steps/common.md';

const STAGE_FILES = Object.freeze({
  'explore-change': 'sai/commands/explore/steps/common.md',
  'review-edge-cases': 'sai/commands/explore/steps/common.md',
  'implementation-details': 'sai/commands/explore/steps/common.md',
  crystallize: 'sai/commands/explore/steps/crystallization-protocol.md',
});

const initialState = Object.freeze({ stage: 'explore-change', ideaList: [] });

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : STAGES[0];
  const ideaList = Array.isArray(src.ideaList) ? src.ideaList.slice() : [];
  return { stage, ideaList };
}

function nextFor(stage) {
  const follow = STAGE_FILES[stage] || COMMON_STEP;
  return { follow, hint: 'fetch the ' + stage + ' step' };
}

function advanceState(current) {
  const idx = STAGES.indexOf(current.stage);
  if (idx === -1) {
    return { stage: current.stage, ideaList: current.ideaList.slice() };
  }
  const nextIdx = idx + 1 >= STAGES.length ? STAGES.length - 1 : idx + 1;
  return { stage: STAGES[nextIdx], ideaList: current.ideaList.slice() };
}

function hasIntent(signal) {
  return Boolean(signal && typeof signal === 'object' && typeof signal.intent === 'string' && signal.intent.length > 0);
}

function project(state) {
  const current = cloneState(state);
  const snapshotState = { stage: current.stage, ideaList: current.ideaList.slice() };
  return {
    snapshot: { state: snapshotState, machineId },
    next: nextFor(current.stage),
  };
}

function transition(state, signal) {
  const current = cloneState(state);
  const rawList = state && typeof state === 'object' && Array.isArray(state.ideaList) ? state.ideaList : [];
  const isEmpty = rawList.length === 0;
  if (isEmpty) {
    const nextState = advanceState(current);
    const snapshotState = { stage: nextState.stage, ideaList: nextState.ideaList.slice() };
    return {
      state: nextState,
      snapshot: { state: snapshotState, machineId },
      next: nextFor(nextState.stage),
    };
  }
  if (!hasIntent(signal)) {
    const staying = { stage: current.stage, ideaList: current.ideaList.slice() };
    const snapshotState = { stage: staying.stage, ideaList: staying.ideaList.slice() };
    return {
      state: staying,
      snapshot: { state: snapshotState, machineId },
      next: nextFor(staying.stage),
      rejected: 'READINESS_IS_NOT_INTENT',
    };
  }
  const nextState = advanceState(current);
  const snapshotState = { stage: nextState.stage, ideaList: nextState.ideaList.slice() };
  return {
    state: nextState,
    snapshot: { state: snapshotState, machineId },
    next: nextFor(nextState.stage),
  };
}

module.exports = { machineId, initialState, transition, project, STAGES };

'use strict';

const machineId = 'explore-idea@1';

const STAGES = Object.freeze(['explore-change', 'review-edge-cases', 'implementation-details', 'crystallize']);

const COMMON_STEP = 'sai/commands/explore/steps/common.md';

const CRYSTALLIZATION_STEP = 'sai/commands/explore/steps/crystallization-protocol.md';
const POC_LANE_STEP = 'sai/commands/explore/steps/poc-lane.md';

const STAGE_FILES = Object.freeze({
  'explore-change': 'sai/commands/explore/steps/common.md',
  'review-edge-cases': 'sai/commands/explore/steps/common.md',
  'implementation-details': 'sai/commands/explore/steps/common.md',
  crystallize: CRYSTALLIZATION_STEP,
});

// Lane routing. A lane is a step the coordinator enters and leaves without
// moving the stage, so the POC lane is reached through `next.follow` like every
// other step. The active lane lives in state (`route`) because the pointer is
// re-derived from persisted state on every read; a `null` route means the
// current stage's own file.
const ROUTE_FILES = Object.freeze({
  'poc-lane': { follow: POC_LANE_STEP, hint: 'load' },
});

// intent -> { stage it is valid at, route it sets (null clears the lane) }
const LANE_ROUTES = Object.freeze({
  'poc-lane': { stage: 'crystallize', route: 'poc-lane' },
  'crystallize-resume': { stage: 'crystallize', route: null },
});

const initialState = Object.freeze({ stage: 'explore-change', ideaList: [], edgeCaseList: null, implementationDetailsList: null, route: null });

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
  // Active lane, or null when the stage's own step file is the pointer.
  const route = typeof src.route === 'string' && ROUTE_FILES[src.route] ? src.route : null;
  return { stage, ideaList, edgeCaseList, implementationDetailsList, route };
}

// Stage-static first vs repeat. Skip-fetch is the chat loaded-set, not this table.
const STAGE_HINTS = Object.freeze({
  'explore-change': 'load',
  'review-edge-cases': 'follow',
  'implementation-details': 'follow',
  crystallize: 'load',
});

function hintText(kind, follow) {
  if (kind === 'follow') return 'follow the instructions of ' + follow;
  return 'load and follow ' + follow;
}

function hintFor(stage, follow) {
  return hintText(STAGE_HINTS[stage] || 'load', follow);
}

function nextFor(stage, route) {
  const lane = route ? ROUTE_FILES[route] : null;
  if (lane) return { follow: lane.follow, hint: hintText(lane.hint, lane.follow) };
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
    route: null,
  };
}

const ADVANCE_INTENT = 'next-step';

function isAdvanceIntent(signal) {
  return Boolean(signal && typeof signal === 'object' && signal.intent === ADVANCE_INTENT);
}

function project(state) {
  const current = cloneState(state);
  const snapshotState = {
    stage: current.stage,
    ideaList: current.ideaList.slice(),
    edgeCaseList: current.edgeCaseList ? current.edgeCaseList.slice() : null,
    implementationDetailsList: current.implementationDetailsList ? current.implementationDetailsList.slice() : null,
    route: current.route,
  };
  return {
    snapshot: { state: snapshotState, machineId },
    next: nextFor(current.stage, current.route),
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
        route: current.route,
      };
      recordedState[listKey] = sig.recordedList.slice();
      const snapshotState = {
        stage: recordedState.stage,
        ideaList: recordedState.ideaList.slice(),
        edgeCaseList: recordedState.edgeCaseList ? recordedState.edgeCaseList.slice() : null,
        implementationDetailsList: recordedState.implementationDetailsList ? recordedState.implementationDetailsList.slice() : null,
        route: recordedState.route,
      };
      return {
        state: recordedState,
        snapshot: { state: snapshotState, machineId },
        next: nextFor(current.stage, current.route),
      };
    }
  }

  // Lane routing: a declared lane intent emitted at its own stage sets or clears
  // the active lane without advancing the stage or touching a recorded list, so
  // the returned pointer names the lane's step file. Emitted at any other stage
  // it is not a valid advance intent and falls through to the rejection below.
  const laneRoute = typeof sig.intent === 'string' ? LANE_ROUTES[sig.intent] : undefined;
  if (laneRoute && current.stage === laneRoute.stage) {
    const routed = {
      stage: current.stage,
      ideaList: current.ideaList.slice(),
      edgeCaseList: current.edgeCaseList ? current.edgeCaseList.slice() : null,
      implementationDetailsList: current.implementationDetailsList ? current.implementationDetailsList.slice() : null,
      route: laneRoute.route,
    };
    const snapshotState = {
      stage: routed.stage,
      ideaList: routed.ideaList.slice(),
      edgeCaseList: routed.edgeCaseList ? routed.edgeCaseList.slice() : null,
      implementationDetailsList: routed.implementationDetailsList ? routed.implementationDetailsList.slice() : null,
      route: routed.route,
    };
    return {
      state: routed,
      snapshot: { state: snapshotState, machineId },
      next: nextFor(routed.stage, routed.route),
    };
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
      route: nextState.route,
    };
    return {
      state: nextState,
      snapshot: { state: snapshotState, machineId },
      next: nextFor(nextState.stage, nextState.route),
    };
  }

  // Intent allowlist: only the exact `next-step` intent advances. Any other
  // intent (including any non-empty stray string) stays put with the in-band
  // rejection, mirroring explore-slice.js. Missing/empty intent rejects the
  // same way. Empty-list auto-advance above is unchanged.
  if (!isAdvanceIntent(sig)) {
    const staying = {
      stage: current.stage,
      ideaList: current.ideaList.slice(),
      edgeCaseList: current.edgeCaseList ? current.edgeCaseList.slice() : null,
      implementationDetailsList: current.implementationDetailsList ? current.implementationDetailsList.slice() : null,
      route: current.route,
    };
    const snapshotState = {
      stage: staying.stage,
      ideaList: staying.ideaList.slice(),
      edgeCaseList: staying.edgeCaseList ? staying.edgeCaseList.slice() : null,
      implementationDetailsList: staying.implementationDetailsList ? staying.implementationDetailsList.slice() : null,
      route: staying.route,
    };
    return {
      state: staying,
      snapshot: { state: snapshotState, machineId },
      next: nextFor(staying.stage, staying.route),
      rejected: 'READINESS_IS_NOT_INTENT',
    };
  }

  const nextState = advanceState(current);
  const snapshotState = {
    stage: nextState.stage,
    ideaList: nextState.ideaList.slice(),
    edgeCaseList: nextState.edgeCaseList ? nextState.edgeCaseList.slice() : null,
    implementationDetailsList: nextState.implementationDetailsList ? nextState.implementationDetailsList.slice() : null,
    route: nextState.route,
  };
  return {
    state: nextState,
    snapshot: { state: snapshotState, machineId },
    next: nextFor(nextState.stage, nextState.route),
  };
}

module.exports = { machineId, initialState, transition, project, STAGES };

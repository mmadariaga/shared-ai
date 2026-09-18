'use strict';

const machineId = 'explore-idea@1';

// `poc-lane` is a CONDITIONAL stage. It sits between `explore-change` and
// `review-edge-cases` and belongs to an idea's progression only when the
// uncertainty axis fired at the close of stage 1 and the user took the POC,
// or when the user asked for the lane explicitly from a later stage.
// Ordinary advancement never enters it: it is entered exclusively by one of
// its entry intents, and `next-step` from `explore-change` skips straight to
// `review-edge-cases`.
const STAGES = Object.freeze(['explore-change', 'poc-lane', 'review-edge-cases', 'implementation-details', 'crystallize']);

const CONDITIONAL_STAGES = Object.freeze(['poc-lane']);

const COMMON_STEP = 'sai/commands/explore/steps/common.md';

const CRYSTALLIZATION_STEP = 'sai/commands/explore/steps/crystallization-protocol.md';
const POC_LANE_STEP = 'sai/commands/explore/steps/poc-lane.md';

const STAGE_FILES = Object.freeze({
  'explore-change': 'sai/commands/explore/steps/common.md',
  'poc-lane': POC_LANE_STEP,
  'review-edge-cases': 'sai/commands/explore/steps/common.md',
  'implementation-details': 'sai/commands/explore/steps/common.md',
  crystallize: CRYSTALLIZATION_STEP,
});

// intent -> { the stages the intent is valid at, the conditional stage it enters }
// `poc-lane` is the stage-1 close entry, taken from the automatic go/no-go.
// `poc-lane-late` is the explicit user-invoked entry available from stages 2
// through 4; it enters the same conditional stage from wherever the
// progression currently sits, and leaving the lane returns to
// `review-edge-cases` through ordinary advancement like any other lane run.
const CONDITIONAL_ENTRIES = Object.freeze({
  'poc-lane': { from: Object.freeze(['explore-change']), stage: 'poc-lane' },
  'poc-lane-late': {
    from: Object.freeze(['review-edge-cases', 'implementation-details', 'crystallize']),
    stage: 'poc-lane',
  },
});

const initialState = Object.freeze({
  stage: 'explore-change',
  ideaList: [],
  candidateList: null,
  edgeCaseList: null,
  implementationDetailsList: null,
  pocLane: false,
});

// Each stage's own recorded list. A recordedList event records into the list
// owned by the current stage.
const STAGE_LISTS = Object.freeze({
  'explore-change': 'ideaList',
  'poc-lane': 'candidateList',
  'review-edge-cases': 'edgeCaseList',
  'implementation-details': 'implementationDetailsList',
});

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const stage = typeof src.stage === 'string' ? src.stage : STAGES[0];
  const ideaList = Array.isArray(src.ideaList) ? src.ideaList.slice() : [];
  // Distinguish unrecorded (null) from recorded-empty (empty array)
  const candidateList = Array.isArray(src.candidateList) ? src.candidateList.slice() : null;
  const edgeCaseList = Array.isArray(src.edgeCaseList) ? src.edgeCaseList.slice() : null;
  const implementationDetailsList = Array.isArray(src.implementationDetailsList) ? src.implementationDetailsList.slice() : null;
  // True once the conditional POC stage has been entered for this idea, so the
  // painted stage TODO keeps its fifth entry after the lane closes.
  const pocLane = src.pocLane === true;
  return { stage, ideaList, candidateList, edgeCaseList, implementationDetailsList, pocLane };
}

// Stage-static first vs repeat. Skip-fetch is the chat loaded-set, not this table.
const STAGE_HINTS = Object.freeze({
  'explore-change': 'load',
  'poc-lane': 'load',
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

function nextFor(stage) {
  const follow = STAGE_FILES[stage] || COMMON_STEP;
  return { follow, hint: hintFor(stage, follow) };
}

function advanceState(current) {
  const idx = STAGES.indexOf(current.stage);
  let stage = current.stage;
  if (idx !== -1) {
    // Ordinary advancement steps over every conditional stage; a conditional
    // stage is reached only through its own entry intent.
    let i = idx + 1;
    while (i < STAGES.length && CONDITIONAL_STAGES.includes(STAGES[i])) i += 1;
    stage = i >= STAGES.length ? STAGES[STAGES.length - 1] : STAGES[i];
  }
  return Object.assign(cloneState(current), { stage });
}

const ADVANCE_INTENT = 'next-step';

function isAdvanceIntent(signal) {
  return Boolean(signal && typeof signal === 'object' && signal.intent === ADVANCE_INTENT);
}

function project(state) {
  const current = cloneState(state);
  return {
    snapshot: { state: cloneState(current), machineId },
    next: nextFor(current.stage),
  };
}

function result(state, extra) {
  const next = {
    state,
    snapshot: { state: cloneState(state), machineId },
    next: nextFor(state.stage),
  };
  return extra ? Object.assign(next, extra) : next;
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
      const recordedState = cloneState(current);
      recordedState[listKey] = sig.recordedList.slice();
      return result(recordedState);
    }
  }

  // Conditional-stage entry: a declared entry intent emitted at one of its own
  // originating stages moves the progression into the conditional stage without
  // touching a recorded list, so an already agreed edge-case or
  // implementation-detail list survives a late entry untouched. Emitted at any
  // other stage it is not a valid advance intent and falls through to the
  // rejection below.
  const entry = typeof sig.intent === 'string' ? CONDITIONAL_ENTRIES[sig.intent] : undefined;
  if (entry && entry.from.includes(current.stage)) {
    const entered = Object.assign(cloneState(current), { stage: entry.stage, pocLane: true });
    return result(entered);
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
    return result(advanceState(current));
  }

  // Intent allowlist: only the exact `next-step` intent advances. Any other
  // intent (including any non-empty stray string) stays put with the in-band
  // rejection, mirroring explore-slice.js. Missing/empty intent rejects the
  // same way. Empty-list auto-advance above is unchanged.
  if (!isAdvanceIntent(sig)) {
    return result(cloneState(current), { rejected: 'READINESS_IS_NOT_INTENT' });
  }

  return result(advanceState(current));
}

module.exports = { machineId, initialState, transition, project, STAGES };

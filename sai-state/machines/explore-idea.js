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
  'review-edge-cases': 'sai/commands/explore/steps/review-edge-cases.md',
  'implementation-details': 'sai/commands/explore/steps/implementation-details.md',
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

// The stage order is a default path, not a gate: the machine guards what each
// stage requires. A section is the data a stage produces, with a state
// (`agreed` or `open`) and the source that holds it (`issue` or
// `conversation`). Free text never enters the store: a section records its
// state and source next to the identifier lists.
const SECTION_STAGES = Object.freeze(['explore-change', 'review-edge-cases', 'implementation-details']);
const SECTION_STATES = Object.freeze(['agreed', 'open']);
const SECTION_SOURCES = Object.freeze(['issue', 'conversation']);

// The per-stage preconditions, as data: the sections that must be `agreed` to
// be at a stage. `goto` checks them on a forward move; a backward move needs
// none.
const PRECONDITIONS = Object.freeze({
  'explore-change': Object.freeze([]),
  'review-edge-cases': Object.freeze(['explore-change']),
  'implementation-details': Object.freeze(['explore-change', 'review-edge-cases']),
  crystallize: Object.freeze(['explore-change', 'review-edge-cases', 'implementation-details']),
});

// The store keeps identifiers only: a recorded list holds list ids such as `E1`, never item text.
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

const GOTO_INTENT = 'goto';
const GOTO_REASONS = Object.freeze(['user-request', 'correction']);

// Targets that belong to `explore-slice@1`: a route start or a route step lies
// past the route selector, which no forward move crosses.
const PAST_CEILING_TARGETS = Object.freeze(['direct-build', 'plan', 'build-implement', 'backfill', 'archive', 'sai-1', 'sai-2', 'implement', 'pending', 'waiting']);

// The exploration's own life, apart from its stage: `active` is the exploration
// the explore contract governs, `paused` keeps every stage, section, list, and
// move while the contract is suspended, and `closed` is the mark an ended
// exploration leaves so a context compaction or the load receipt left in the
// chat never reopens it. Only a new invocation (`sai-state reset`) leaves
// `closed`; only the `resume` intent leaves `paused`.
const EXPLORATIONS = Object.freeze(['active', 'paused', 'closed']);
const PAUSE_INTENT = 'pause';
const RESUME_INTENT = 'resume';
const CLOSE_INTENT = 'close-explore';
const STATUS_INTENT = 'status';

const initialState = Object.freeze({
  exploration: 'active',
  stage: 'explore-change',
  ideaList: [],
  candidateList: null,
  edgeCaseList: null,
  implementationDetailsList: null,
  pocLane: false,
  sections: Object.freeze({
    'explore-change': Object.freeze({ state: 'open', source: null }),
    'review-edge-cases': Object.freeze({ state: 'open', source: null }),
    'implementation-details': Object.freeze({ state: 'open', source: null }),
  }),
  moves: Object.freeze([]),
});

// Each stage's own recorded list. A recordedList event records into the list
// owned by the current stage.
const STAGE_LISTS = Object.freeze({
  'explore-change': 'ideaList',
  'poc-lane': 'candidateList',
  'review-edge-cases': 'edgeCaseList',
  'implementation-details': 'implementationDetailsList',
});

function cloneSections(src) {
  const sections = {};
  const raw = src && typeof src === 'object' && !Array.isArray(src) ? src : {};
  for (const stage of SECTION_STAGES) {
    const entry = raw[stage] && typeof raw[stage] === 'object' ? raw[stage] : {};
    sections[stage] = {
      state: SECTION_STATES.includes(entry.state) ? entry.state : 'open',
      source: SECTION_SOURCES.includes(entry.source) ? entry.source : null,
    };
  }
  return sections;
}

// Accepted moves, oldest first. Identifiers only: the target, its reason, and
// the time the CLI received the event.
function cloneMoves(src) {
  if (!Array.isArray(src)) return [];
  return src
    .filter((move) => move && typeof move === 'object' && typeof move.target === 'string' && GOTO_REASONS.includes(move.reason))
    .map((move) => ({ target: move.target, reason: move.reason, received_at: typeof move.received_at === 'string' ? move.received_at : null }));
}

function cloneState(state) {
  const src = state && typeof state === 'object' ? state : {};
  const exploration = EXPLORATIONS.includes(src.exploration) ? src.exploration : 'active';
  const stage = typeof src.stage === 'string' ? src.stage : STAGES[0];
  const ideaList = Array.isArray(src.ideaList) ? src.ideaList.slice() : [];
  // Distinguish unrecorded (null) from recorded-empty (empty array)
  const candidateList = Array.isArray(src.candidateList) ? src.candidateList.slice() : null;
  const edgeCaseList = Array.isArray(src.edgeCaseList) ? src.edgeCaseList.slice() : null;
  const implementationDetailsList = Array.isArray(src.implementationDetailsList) ? src.implementationDetailsList.slice() : null;
  // True once the conditional POC stage has been entered for this idea, so the
  // painted stage TODO keeps its fifth entry after the lane closes.
  const pocLane = src.pocLane === true;
  const sections = cloneSections(src.sections);
  const moves = cloneMoves(src.moves);
  return { exploration, stage, ideaList, candidateList, edgeCaseList, implementationDetailsList, pocLane, sections, moves };
}

// Identifiers only: the accepted moves travel to the closing report as this view,
// and `exploration` is the one value a turn reads to know whether the explore
// contract governs it.
function viewOf(current) {
  return { exploration: current.exploration, moves: current.moves.map((move) => Object.assign({}, move)) };
}

function sameList(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function setSection(state, stage, patch) {
  state.sections[stage] = Object.assign({}, state.sections[stage], patch);
}

// Stage-static first vs repeat. Skip-fetch is the chat loaded-set, not this table.
const STAGE_HINTS = Object.freeze({
  'explore-change': 'load',
  'poc-lane': 'load',
  'review-edge-cases': 'load',
  'implementation-details': 'load',
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

// A paused or closed exploration has no step to follow: the pointer names the
// common step only so the response keeps its shape, and the hint says the
// explore contract is not in force.
function pointerFor(current) {
  if (current.exploration === 'paused') {
    return { follow: COMMON_STEP, hint: 'the exploration is paused: follow no explore step until the user resumes it' };
  }
  if (current.exploration === 'closed') {
    return { follow: COMMON_STEP, hint: 'the exploration is closed: follow no explore step; a new /sai-explore invocation starts a new one' };
  }
  return nextFor(current.stage);
}

function advanceState(current) {
  const idx = STAGES.indexOf(current.stage);
  const next = cloneState(current);
  let stage = current.stage;
  if (idx !== -1) {
    // Ordinary advancement steps over every conditional stage; a conditional
    // stage is reached only through its own entry intent.
    let i = idx + 1;
    while (i < STAGES.length && CONDITIONAL_STAGES.includes(STAGES[i])) i += 1;
    // The user's confirmation that closes a stage agrees its section.
    if (next.sections[current.stage] && next.sections[current.stage].state !== 'agreed') {
      setSection(next, current.stage, { state: 'agreed', source: 'conversation' });
    }
    // A stage whose section is still agreed is skipped (E3), except when the
    // progression leaves the POC lane: that always returns to the edge cases.
    if (current.stage !== 'poc-lane') {
      while (i < STAGES.length - 1 && next.sections[STAGES[i]] && next.sections[STAGES[i]].state === 'agreed') {
        i += 1;
        while (i < STAGES.length && CONDITIONAL_STAGES.includes(STAGES[i])) i += 1;
      }
    }
    stage = i >= STAGES.length ? STAGES[STAGES.length - 1] : STAGES[i];
  }
  return Object.assign(next, { stage });
}

const ADVANCE_INTENT = 'next-step';

function isAdvanceIntent(signal) {
  return Boolean(signal && typeof signal === 'object' && signal.intent === ADVANCE_INTENT);
}

// An intent-less emit carries no intent at all: the field is absent, null, or
// the empty string. The content-based empty-set rule is advancement by content,
// not by intent, so it applies only to these signals; anything carrying an
// intent goes through the allowlist below.
function isIntentless(signal) {
  const intent = signal ? signal.intent : undefined;
  return intent === undefined || intent === null || intent === '';
}

function project(state) {
  const current = cloneState(state);
  return {
    snapshot: { state: cloneState(current), machineId },
    next: pointerFor(current),
    run: viewOf(current),
  };
}

function result(state, extra) {
  const next = {
    state,
    snapshot: { state: cloneState(state), machineId },
    next: pointerFor(state),
    run: viewOf(state),
  };
  return extra ? Object.assign(next, extra) : next;
}

// Section recording: `{ sections: { <stage>: { state, source?, list? } } }`.
// It records the state and source of each named section and, when a `list` is
// given, the stage's own list as the starting proposal, without moving the
// stage. An agreed section needs a source; an open one keeps the one it has.
// An invalid event changes nothing.
function recordSections(current, recorded) {
  if (!recorded || typeof recorded !== 'object' || Array.isArray(recorded)) return null;
  const next = cloneState(current);
  for (const stage of Object.keys(recorded)) {
    const entry = recorded[stage];
    if (!SECTION_STAGES.includes(stage) || !entry || typeof entry !== 'object') return null;
    if (!SECTION_STATES.includes(entry.state)) return null;
    if (entry.source !== undefined && !SECTION_SOURCES.includes(entry.source)) return null;
    if (entry.state === 'agreed' && entry.source === undefined && next.sections[stage].source === null) return null;
    if (entry.list !== undefined) {
      if (!Array.isArray(entry.list) || !entry.list.every((item) => typeof item === 'string' && IDENTIFIER.test(item))) return null;
      if (stage === 'explore-change') return null;
      next[STAGE_LISTS[stage]] = entry.list.slice();
    }
    setSection(next, stage, { state: entry.state, source: entry.source === undefined ? next.sections[stage].source : entry.source });
  }
  return next;
}

// `goto`: moves to any stage whose preconditions hold. A backward move is
// always accepted and keeps every section as it is (E3); a forward move needs
// the target's preconditions and stops at `crystallize`, the ceiling of this
// machine (E1); a failed check names each absent section and the earliest
// stage that owns one (E2) and leaves the state unchanged.
function goto(current, sig) {
  const unchanged = (rejected, extra) => result(cloneState(current), Object.assign({ rejected }, extra));
  if (!GOTO_REASONS.includes(sig.reason)) return unchanged('GOTO_REASON_INVALID');
  const target = sig.target;
  if (typeof target !== 'string' || !Object.prototype.hasOwnProperty.call(PRECONDITIONS, target)) {
    return unchanged(PAST_CEILING_TARGETS.includes(target) ? 'GOTO_PAST_CEILING' : 'GOTO_UNKNOWN_TARGET');
  }
  const from = STAGES.indexOf(current.stage);
  const to = STAGES.indexOf(target);
  if (from === to) return unchanged('GOTO_ALREADY_AT_TARGET');
  if (to > from) {
    const missing = PRECONDITIONS[target].filter((stage) => current.sections[stage].state !== 'agreed');
    if (missing.length > 0) return unchanged('MISSING_PRECONDITIONS', { missing, resume_at: missing[0] });
  }
  const moved = cloneState(current);
  moved.stage = target;
  moved.moves = moved.moves.concat([{ target, reason: sig.reason, received_at: typeof sig.received_at === 'string' ? sig.received_at : null }]);
  return result(moved);
}

// Pause, resume, and close act on the exploration, not on its stage. `status`
// reads the exploration and changes nothing, so a turn that must know whether
// the explore contract governs it can ask in any exploration. A paused
// exploration keeps every section, list, and move and accepts only `resume`;
// a closed one keeps no explore state and accepts nothing, so a late event can
// neither revive it nor record into it. An exploration that is not paused has
// nothing to resume. Returns null for every other event: the stage machine
// below handles it.
function explorationTransition(current, sig) {
  if (sig.intent === STATUS_INTENT) return result(cloneState(current));
  if (current.exploration === 'closed') return result(cloneState(current), { rejected: 'EXPLORATION_CLOSED' });
  if (current.exploration === 'paused') {
    if (sig.intent !== RESUME_INTENT) return result(cloneState(current), { rejected: 'EXPLORATION_PAUSED' });
    return result(Object.assign(cloneState(current), { exploration: 'active' }));
  }
  if (sig.intent === RESUME_INTENT) return result(cloneState(current), { rejected: 'NOT_PAUSED' });
  if (sig.intent === PAUSE_INTENT) return result(Object.assign(cloneState(current), { exploration: 'paused' }));
  if (sig.intent === CLOSE_INTENT) return result(Object.assign(cloneState(initialState), { exploration: 'closed' }));
  return null;
}

function transition(state, signal) {
  const current = cloneState(state);
  const sig = signal && typeof signal === 'object' ? signal : {};

  const lifecycle = explorationTransition(current, sig);
  if (lifecycle) return lifecycle;

  // Section recording (issue seeding and deviation marking): records state,
  // source, and an optional starting list per section without moving the stage.
  if (sig.sections !== undefined) {
    const recorded = recordSections(current, sig.sections);
    if (recorded === null) return result(cloneState(current), { rejected: 'SECTIONS_INVALID' });
    return result(recorded);
  }

  // Content-based recording: a non-null recordedList records into the current
  // stage's own list without advancing. Recording and advancing stay separate
  // emits; the content-based empty-set rule advances on a later no-intent emit.
  // A list that differs from the recorded one reopens its own section; a changed
  // `What`/`Why` list reopens every later section too, keeping its content as
  // the starting proposal (E4).
  if (Array.isArray(sig.recordedList)) {
    const listKey = STAGE_LISTS[current.stage];
    if (listKey) {
      const recordedState = cloneState(current);
      const changed = !sameList(current[listKey], sig.recordedList);
      recordedState[listKey] = sig.recordedList.slice();
      if (changed && recordedState.sections[current.stage]) {
        setSection(recordedState, current.stage, { state: 'open' });
        if (current.stage === 'explore-change') {
          for (const later of SECTION_STAGES.slice(1)) setSection(recordedState, later, { state: 'open' });
        }
      }
      return result(recordedState);
    }
  }

  if (sig.intent === GOTO_INTENT) return goto(current, sig);

  // Conditional-stage entry: a declared entry intent emitted at one of its own
  // originating stages moves the progression into the conditional stage without
  // touching a recorded list, so an already agreed edge-case or
  // implementation-detail list survives a late entry untouched. Emitted at any
  // other stage it is not a valid advance intent and falls through to the
  // rejection below.
  const entry = typeof sig.intent === 'string' ? CONDITIONAL_ENTRIES[sig.intent] : undefined;
  if (entry && entry.from.includes(current.stage)) {
    const entered = Object.assign(cloneState(current), { stage: entry.stage, pocLane: true });
    // Taking the lane at the close of stage 1 confirms the stage-1 section.
    if (current.stage === 'explore-change' && entered.sections['explore-change'].state !== 'agreed') {
      setSection(entered, 'explore-change', { state: 'agreed', source: 'conversation' });
    }
    return result(entered);
  }

  // Determine if auto-advance is allowed based on stage and recorded list content.
  // Auto-advance only at the stage with a content-based empty-set rule: review-edge-cases.
  // An empty implementation-details list never advances on its own: the user
  // confirms the proposed `- None` with the `next-step` intent.
  // It is reserved for intent-less emits, so an unrecognized or out-of-stage
  // intent still falls through to the allowlist rejection below instead of
  // taking a free advance the caller never asked for.
  const intentless = isIntentless(sig);
  let shouldAutoAdvance = false;
  if (intentless && current.stage === 'review-edge-cases' && current.edgeCaseList !== null && current.edgeCaseList.length === 0) {
    shouldAutoAdvance = true;
  }

  if (shouldAutoAdvance) {
    return result(advanceState(current));
  }

  // Intent allowlist: only the exact `next-step` intent advances. Any other
  // intent (including any non-empty stray string) stays put with the in-band
  // rejection, mirroring explore-slice.js. Missing/empty intent rejects the
  // same way. The empty edge-case auto-advance above is unchanged.
  if (!isAdvanceIntent(sig)) {
    return result(cloneState(current), { rejected: 'READINESS_IS_NOT_INTENT' });
  }

  return result(advanceState(current));
}

module.exports = { machineId, initialState, transition, project, STAGES, PRECONDITIONS, SECTION_STAGES, EXPLORATIONS };

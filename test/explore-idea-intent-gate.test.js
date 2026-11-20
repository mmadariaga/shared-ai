'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const idea = require('../sai-state/machines/explore-idea.js');

test('idea intent allowlist: banana and missing intent do not advance', () => {
  const banana = idea.transition(idea.initialState, { intent: 'banana' });
  assert.equal(banana.state.stage, 'explore-change');
  assert.equal(banana.rejected, 'READINESS_IS_NOT_INTENT');

  const missing = idea.transition(idea.initialState, {});
  assert.equal(missing.state.stage, 'explore-change');
  assert.equal(missing.rejected, 'READINESS_IS_NOT_INTENT');

  const emptyIntent = idea.transition(idea.initialState, { intent: '' });
  assert.equal(emptyIntent.state.stage, 'explore-change');
  assert.equal(emptyIntent.rejected, 'READINESS_IS_NOT_INTENT');
});

test('idea intent allowlist: next-step advances exactly one stage per emit', () => {
  const s2 = idea.transition(idea.initialState, { intent: 'next-step' });
  assert.equal(s2.state.stage, 'review-edge-cases');
  assert.ok(!('rejected' in s2));

  const s3 = idea.transition(s2.state, { intent: 'next-step' });
  assert.equal(s3.state.stage, 'implementation-details');
  assert.ok(!('rejected' in s3));

  const s4 = idea.transition(s3.state, { intent: 'next-step' });
  assert.equal(s4.state.stage, 'crystallize');
  assert.ok(!('rejected' in s4));
});

test('idea recordedList records without advancing; empty list auto-advances only on later no-intent emit', () => {
  const recorded = idea.transition(idea.initialState, { recordedList: ['a'] });
  assert.equal(recorded.state.stage, 'explore-change');
  assert.deepEqual(recorded.state.ideaList, ['a']);
  assert.ok(!('rejected' in recorded));

  const atEdge = idea.transition(idea.initialState, { intent: 'next-step' });
  assert.equal(atEdge.state.stage, 'review-edge-cases');
  const recordedEmpty = idea.transition(atEdge.state, { recordedList: [] });
  assert.equal(recordedEmpty.state.stage, 'review-edge-cases');
  assert.deepEqual(recordedEmpty.state.edgeCaseList, []);

  const auto = idea.transition(recordedEmpty.state, {});
  assert.equal(auto.state.stage, 'implementation-details');
  assert.ok(!('rejected' in auto));
});

test('poc-lane enters the conditional stage from explore-change without touching the lists', () => {
  const start = { stage: 'explore-change', ideaList: ['a'], edgeCaseList: null, implementationDetailsList: null };
  const lane = idea.transition(start, { intent: 'poc-lane' });

  assert.equal(lane.state.stage, 'poc-lane');
  assert.equal(lane.state.pocLane, true);
  assert.equal(lane.next.follow, 'sai/commands/explore/steps/poc-lane.md');
  assert.match(lane.next.hint, /^load and follow /);
  assert.ok(!('rejected' in lane));
  assert.deepEqual(lane.state.ideaList, ['a']);
  assert.equal(lane.state.edgeCaseList, null);
  assert.equal(lane.state.implementationDetailsList, null);
  assert.equal(lane.state.candidateList, null);
});

test('the lane is left by ordinary next-step advancement into review-edge-cases', () => {
  const lane = idea.transition(idea.initialState, { intent: 'poc-lane' });
  const back = idea.transition(lane.state, { intent: 'next-step' });

  assert.equal(back.state.stage, 'review-edge-cases');
  assert.equal(back.next.follow, 'sai/commands/explore/steps/review-edge-cases.md');
  assert.ok(!('rejected' in back));
  // The fifth painted entry survives the lane it belongs to.
  assert.equal(back.state.pocLane, true);
});

test('ordinary advancement from explore-change skips the conditional POC stage', () => {
  const skipped = idea.transition(idea.initialState, { intent: 'next-step' });
  assert.equal(skipped.state.stage, 'review-edge-cases');
  assert.equal(skipped.state.pocLane, false);
});

test('the lane pointer is re-derived from persisted state, not only from the entry emit', () => {
  // bin/sai-state.js overwrites the wire pointer with project(persistedState),
  // so a stage that lives only in the transition result would be lost on write.
  const lane = idea.transition(idea.initialState, { intent: 'poc-lane' });

  const projected = idea.project(lane.state);
  assert.equal(projected.next.follow, 'sai/commands/explore/steps/poc-lane.md');
  assert.equal(projected.snapshot.state.stage, 'poc-lane');

  // An interrupting non-advancing emit keeps the lane pointer.
  const parked = idea.transition(lane.state, {});
  assert.equal(parked.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(parked.next.follow, 'sai/commands/explore/steps/poc-lane.md');

  // The agreed candidate list records at the lane without advancing.
  const candidates = idea.transition(parked.state, { recordedList: ['C1', 'C2'] });
  assert.equal(candidates.state.stage, 'poc-lane');
  assert.deepEqual(candidates.state.candidateList, ['C1', 'C2']);
  assert.equal(candidates.next.follow, 'sai/commands/explore/steps/poc-lane.md');

  // An empty candidate list never auto-advances the lane.
  const emptyCandidates = idea.transition(lane.state, { recordedList: [] });
  const stillThere = idea.transition(emptyCandidates.state, {});
  assert.equal(stillThere.state.stage, 'poc-lane');
  assert.equal(stillThere.rejected, 'READINESS_IS_NOT_INTENT');
});

test('the lane entry intent is rejected outside the explore-change stage', () => {
  for (const stage of ['review-edge-cases', 'implementation-details', 'crystallize']) {
    const late = idea.transition({ stage, ideaList: [], edgeCaseList: ['E1'], implementationDetailsList: ['I1'] }, { intent: 'poc-lane' });
    assert.equal(late.state.stage, stage);
    assert.equal(late.state.pocLane, false);
    assert.equal(late.rejected, 'READINESS_IS_NOT_INTENT');
  }

  // The retired routing intent is just an unknown intent now.
  const retired = idea.transition({ stage: 'crystallize', ideaList: [] }, { intent: 'crystallize-resume' });
  assert.equal(retired.state.stage, 'crystallize');
  assert.equal(retired.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(retired.next.follow, 'sai/commands/explore/steps/crystallization-protocol.md');
});

test('the late entry intent enters the same lane from stages 2 through 4 without touching agreed lists', () => {
  for (const stage of ['review-edge-cases', 'implementation-details', 'crystallize']) {
    const late = idea.transition(
      { stage, ideaList: ['a'], edgeCaseList: ['E1'], implementationDetailsList: ['I1'] },
      { intent: 'poc-lane-late' },
    );

    assert.equal(late.state.stage, 'poc-lane');
    assert.equal(late.state.pocLane, true);
    assert.equal(late.next.follow, 'sai/commands/explore/steps/poc-lane.md');
    assert.ok(!('rejected' in late));
    // An agreed edge-case or implementation-detail list survives the detour.
    assert.deepEqual(late.state.edgeCaseList, ['E1']);
    assert.deepEqual(late.state.implementationDetailsList, ['I1']);
    assert.equal(late.state.candidateList, null);

    // The lane closes back into stage 2 whichever stage it was entered from.
    const back = idea.transition(late.state, { intent: 'next-step' });
    assert.equal(back.state.stage, 'review-edge-cases');
    assert.deepEqual(back.state.edgeCaseList, ['E1']);
    assert.deepEqual(back.state.implementationDetailsList, ['I1']);
    assert.equal(back.state.pocLane, true);
  }
});

test('the late entry intent is rejected at stage 1 and inside the lane itself', () => {
  const atStage1 = idea.transition(idea.initialState, { intent: 'poc-lane-late' });
  assert.equal(atStage1.state.stage, 'explore-change');
  assert.equal(atStage1.state.pocLane, false);
  assert.equal(atStage1.rejected, 'READINESS_IS_NOT_INTENT');

  const lane = idea.transition(idea.initialState, { intent: 'poc-lane' });
  const reEntry = idea.transition(lane.state, { intent: 'poc-lane-late' });
  assert.equal(reEntry.state.stage, 'poc-lane');
  assert.equal(reEntry.rejected, 'READINESS_IS_NOT_INTENT');
});

test('an empty recorded list does not turn an unrecognized intent into an advance', () => {
  const stages = [
    { stage: 'review-edge-cases', edgeCaseList: [], implementationDetailsList: null },
    { stage: 'implementation-details', edgeCaseList: ['E1'], implementationDetailsList: [] },
  ];

  for (const base of stages) {
    const start = Object.assign({ ideaList: ['a'], candidateList: null }, base);

    for (const intent of ['banana', 'crystallize-resume', 'poc-lane']) {
      const emitted = idea.transition(start, { intent });
      assert.equal(emitted.state.stage, base.stage);
      assert.equal(emitted.state.pocLane, false);
      assert.equal(emitted.rejected, 'READINESS_IS_NOT_INTENT');
    }

    const explicit = idea.transition(start, { intent: 'next-step' });
    assert.ok(!('rejected' in explicit));
    assert.notEqual(explicit.state.stage, base.stage);

    const auto = idea.transition(start, {});
    const emptyIntent = idea.transition(start, { intent: '' });
    if (base.stage === 'review-edge-cases') {
      // E3: an empty edge-case list still advances without an intent.
      assert.ok(!('rejected' in auto));
      assert.equal(explicit.state.stage, auto.state.stage);
      assert.equal(emptyIntent.state.stage, auto.state.stage);
      assert.ok(!('rejected' in emptyIntent));
    } else {
      // E3: an empty implementation-details list advances only on `next-step`.
      for (const emitted of [auto, emptyIntent]) {
        assert.equal(emitted.state.stage, 'implementation-details');
        assert.equal(emitted.rejected, 'READINESS_IS_NOT_INTENT');
      }
    }

    // E3: conditional entry is evaluated before the auto-advance, so a valid
    // late entry still enters the lane from an empty-list stage.
    const late = idea.transition(start, { intent: 'poc-lane-late' });
    assert.equal(late.state.stage, 'poc-lane');
    assert.equal(late.state.pocLane, true);
    assert.ok(!('rejected' in late));
  }
});

test('caller-side next-step recognition lives in common.md and slice.md points at it', () => {
  const common = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'common.md'), 'utf8');
  const slice = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'slice.md'), 'utf8');
  assert.match(common, /bare token/);
  assert.match(common, /dominant intent/);
  assert.match(common, /Mere containment of the string `next-step` SHALL NOT fire the token/);
  assert.match(common, /negates, defers, quotes, or discusses the token SHALL NOT advance/);
  assert.match(slice, /stage-progression rule in `common\.md`/);
});

const SEED = {
  sections: {
    'explore-change': { state: 'agreed', source: 'issue' },
    'review-edge-cases': { state: 'agreed', source: 'issue', list: ['E1', 'E4'] },
    'implementation-details': { state: 'agreed', source: 'issue', list: [] },
  },
};

test('section seeding records state, source, and the issue lists without moving the stage', () => {
  const seeded = idea.transition(idea.initialState, SEED);

  assert.ok(!('rejected' in seeded));
  assert.equal(seeded.state.stage, 'explore-change');
  assert.deepEqual(seeded.state.edgeCaseList, ['E1', 'E4']);
  assert.deepEqual(seeded.state.implementationDetailsList, []);
  assert.deepEqual(seeded.state.sections['explore-change'], { state: 'agreed', source: 'issue' });
  assert.deepEqual(seeded.state.sections['implementation-details'], { state: 'agreed', source: 'issue' });
});

test('an open seeded section keeps its list as the starting proposal', () => {
  const seeded = idea.transition(idea.initialState, { sections: { 'review-edge-cases': { state: 'open', source: 'issue', list: ['E1'] } } });

  assert.equal(seeded.state.sections['review-edge-cases'].state, 'open');
  assert.deepEqual(seeded.state.edgeCaseList, ['E1']);
});

test('malformed section events are rejected and change nothing', () => {
  for (const bad of [
    { sections: { crystallize: { state: 'agreed', source: 'issue' } } },
    { sections: { 'review-edge-cases': { state: 'done', source: 'issue' } } },
    { sections: { 'review-edge-cases': { state: 'agreed', source: 'chat' } } },
    { sections: { 'review-edge-cases': { state: 'agreed' } } },
    { sections: { 'review-edge-cases': { state: 'open', list: 'E1' } } },
    { sections: { 'explore-change': { state: 'open', list: ['x'] } } },
    { sections: { 'review-edge-cases': { state: 'open', list: ['E1 free text is not an identifier'] } } },
    { sections: [] },
  ]) {
    const rejected = idea.transition(idea.initialState, bad);
    assert.equal(rejected.rejected, 'SECTIONS_INVALID', JSON.stringify(bad));
    assert.deepEqual(rejected.state, idea.project(idea.initialState).snapshot.state);
  }
});

test('goto moves forward to crystallize once every section is agreed, and records the move', () => {
  const seeded = idea.transition(idea.initialState, SEED).state;
  const moved = idea.transition(seeded, { intent: 'goto', target: 'crystallize', reason: 'user-request', received_at: '2026-11-20T10:00:00+01:00' });

  assert.ok(!('rejected' in moved));
  assert.equal(moved.state.stage, 'crystallize');
  assert.equal(moved.next.follow, 'sai/commands/explore/steps/crystallization-protocol.md');
  assert.deepEqual(moved.run.moves, [{ target: 'crystallize', reason: 'user-request', received_at: '2026-11-20T10:00:00+01:00' }]);
  assert.deepEqual(idea.project(moved.state).run, moved.run);
});

test('E2: a forward goto whose preconditions fail names every absent section and changes nothing', () => {
  const seeded = idea.transition(idea.initialState, { sections: { 'explore-change': { state: 'agreed', source: 'issue' } } }).state;
  const rejected = idea.transition(seeded, { intent: 'goto', target: 'crystallize', reason: 'user-request' });

  assert.equal(rejected.rejected, 'MISSING_PRECONDITIONS');
  assert.deepEqual(rejected.missing, ['review-edge-cases', 'implementation-details']);
  assert.equal(rejected.resume_at, 'review-edge-cases');
  assert.equal(rejected.state.stage, 'explore-change');
  assert.deepEqual(rejected.run.moves, [], 'a rejected goto records nothing');
  assert.deepEqual(rejected.state.sections, seeded.sections);

  const fresh = idea.transition(idea.initialState, { intent: 'goto', target: 'implementation-details', reason: 'correction' });
  assert.deepEqual(fresh.missing, ['explore-change', 'review-edge-cases']);
});

test('E1: a goto toward a route start or route step is past the ceiling; unknown targets and reasons are rejected', () => {
  for (const target of ['direct-build', 'plan', 'build-implement', 'archive', 'sai-1', 'pending']) {
    const past = idea.transition(idea.initialState, { intent: 'goto', target, reason: 'user-request' });
    assert.equal(past.rejected, 'GOTO_PAST_CEILING', target);
  }
  assert.equal(idea.transition(idea.initialState, { intent: 'goto', target: 'nowhere', reason: 'user-request' }).rejected, 'GOTO_UNKNOWN_TARGET');
  assert.equal(idea.transition(idea.initialState, { intent: 'goto', target: 'poc-lane', reason: 'user-request' }).rejected, 'GOTO_UNKNOWN_TARGET');
  for (const reason of [undefined, 'because', '']) {
    assert.equal(idea.transition(idea.initialState, { intent: 'goto', target: 'crystallize', reason }).rejected, 'GOTO_REASON_INVALID');
  }
  const here = idea.transition(idea.initialState, { intent: 'goto', target: 'explore-change', reason: 'correction' });
  assert.equal(here.rejected, 'GOTO_ALREADY_AT_TARGET');
});

test('E3: a backward goto is always accepted and later sections keep their agreed state', () => {
  const seeded = idea.transition(idea.initialState, SEED).state;
  const atCrystallize = idea.transition(seeded, { intent: 'goto', target: 'crystallize', reason: 'user-request' }).state;
  const back = idea.transition(atCrystallize, { intent: 'goto', target: 'explore-change', reason: 'correction' });

  assert.ok(!('rejected' in back));
  assert.equal(back.state.stage, 'explore-change');
  assert.deepEqual(back.state.sections, seeded.sections);
  assert.deepEqual(back.state.edgeCaseList, ['E1', 'E4']);
  assert.equal(back.run.moves.length, 2);

  // The next forward move skips every stage whose section is still agreed.
  const forward = idea.transition(back.state, { intent: 'next-step' });
  assert.equal(forward.state.stage, 'crystallize');
});

test('E4: a rewound What/Why change reopens every later section and keeps its content', () => {
  const seeded = idea.transition(idea.initialState, SEED).state;
  const atCrystallize = idea.transition(seeded, { intent: 'goto', target: 'crystallize', reason: 'user-request' }).state;
  const back = idea.transition(atCrystallize, { intent: 'goto', target: 'explore-change', reason: 'correction' }).state;

  const same = idea.transition(back, { recordedList: [] });
  assert.equal(same.state.sections['review-edge-cases'].state, 'agreed', 'an unchanged list reopens nothing');

  const changed = idea.transition(back, { recordedList: ['a new idea'] });
  assert.equal(changed.state.sections['explore-change'].state, 'open');
  assert.equal(changed.state.sections['review-edge-cases'].state, 'open');
  assert.equal(changed.state.sections['implementation-details'].state, 'open');
  assert.deepEqual(changed.state.edgeCaseList, ['E1', 'E4'], 'content stays as the starting proposal');

  const next = idea.transition(changed.state, { intent: 'next-step' });
  assert.equal(next.state.stage, 'review-edge-cases', 'the reopened stage is discussed again');
  assert.equal(next.state.sections['explore-change'].state, 'agreed');
  assert.equal(next.state.sections['explore-change'].source, 'conversation');
});

test('E8: marking one section open reopens only that stage on the next forward move', () => {
  const seeded = idea.transition(idea.initialState, SEED).state;
  const marked = idea.transition(seeded, { sections: { 'implementation-details': { state: 'open' } } }).state;
  const forward = idea.transition(marked, { intent: 'next-step' });

  assert.equal(forward.state.stage, 'implementation-details');
  assert.equal(marked.sections['review-edge-cases'].state, 'agreed');
});

test('E5: a section agrees only through the user confirmation of next-step, so a proposed list stays open', () => {
  const recorded = idea.transition(idea.initialState, { recordedList: ['a'] }).state;
  assert.equal(recorded.sections['explore-change'].state, 'open');
  assert.equal(idea.transition(recorded, { intent: 'goto', target: 'review-edge-cases', reason: 'user-request' }).rejected, 'MISSING_PRECONDITIONS');

  const confirmed = idea.transition(recorded, { intent: 'next-step' }).state;
  assert.deepEqual(confirmed.sections['explore-change'], { state: 'agreed', source: 'conversation' });
});

test('the retired issue-shortcut intent is an unknown intent', () => {
  const retired = idea.transition(idea.initialState, { intent: 'issue-shortcut', edgeCaseList: [], implementationDetailsList: [] });

  assert.equal(retired.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(retired.state.stage, 'explore-change');
});

test('an empty implementation-details list advances only on next-step (E3)', () => {
  const at = { stage: 'implementation-details', ideaList: ['a'], candidateList: null, edgeCaseList: ['E1'], implementationDetailsList: null, pocLane: false };
  const recorded = idea.transition(at, { recordedList: [] });
  assert.equal(recorded.state.stage, 'implementation-details');
  assert.deepEqual(recorded.state.implementationDetailsList, []);

  const intentless = idea.transition(recorded.state, {});
  assert.equal(intentless.state.stage, 'implementation-details');
  assert.equal(intentless.rejected, 'READINESS_IS_NOT_INTENT');

  const confirmed = idea.transition(recorded.state, { intent: 'next-step' });
  assert.equal(confirmed.state.stage, 'crystallize');
  assert.ok(!('rejected' in confirmed));
  assert.deepEqual(confirmed.state.implementationDetailsList, []);
});


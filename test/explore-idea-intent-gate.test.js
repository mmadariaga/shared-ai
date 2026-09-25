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

    // E1/E4: the intent-less and `next-step` paths keep their current outcome.
    const auto = idea.transition(start, {});
    assert.ok(!('rejected' in auto));
    const explicit = idea.transition(start, { intent: 'next-step' });
    assert.ok(!('rejected' in explicit));
    assert.equal(explicit.state.stage, auto.state.stage);
    const emptyIntent = idea.transition(start, { intent: '' });
    assert.equal(emptyIntent.state.stage, auto.state.stage);
    assert.ok(!('rejected' in emptyIntent));

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

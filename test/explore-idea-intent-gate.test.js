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

test('poc-lane routes to the lane step at crystallize without moving the stage or lists', () => {
  const crystallize = { stage: 'crystallize', ideaList: ['a'], edgeCaseList: ['E1'], implementationDetailsList: ['I1'] };
  const lane = idea.transition(crystallize, { intent: 'poc-lane' });

  assert.equal(lane.state.stage, 'crystallize');
  assert.equal(lane.state.route, 'poc-lane');
  assert.equal(lane.next.follow, 'sai/commands/explore/steps/poc-lane.md');
  assert.match(lane.next.hint, /^load and follow /);
  assert.ok(!('rejected' in lane));
  assert.deepEqual(lane.state.ideaList, ['a']);
  assert.deepEqual(lane.state.edgeCaseList, ['E1']);
  assert.deepEqual(lane.state.implementationDetailsList, ['I1']);
});

test('crystallize-resume routes back to the crystallization protocol without moving the stage', () => {
  const inLane = { stage: 'crystallize', ideaList: [], edgeCaseList: [], implementationDetailsList: [], route: 'poc-lane' };
  const back = idea.transition(inLane, { intent: 'crystallize-resume' });

  assert.equal(back.state.stage, 'crystallize');
  assert.equal(back.next.follow, 'sai/commands/explore/steps/crystallization-protocol.md');
  assert.equal(back.state.route, null);
  assert.ok(!('rejected' in back));
});

test('the lane pointer is re-derived from persisted state, not only from the routing emit', () => {
  // bin/sai-state.js overwrites the wire pointer with project(persistedState),
  // so a lane that lives only in the transition result would be lost on write.
  const crystallize = { stage: 'crystallize', ideaList: [], edgeCaseList: [], implementationDetailsList: [] };
  const lane = idea.transition(crystallize, { intent: 'poc-lane' });

  const projected = idea.project(lane.state);
  assert.equal(projected.next.follow, 'sai/commands/explore/steps/poc-lane.md');
  assert.equal(projected.snapshot.state.route, 'poc-lane');

  // An interrupting non-advancing emit keeps the lane pointer.
  const parked = idea.transition(lane.state, {});
  assert.equal(parked.rejected, 'READINESS_IS_NOT_INTENT');
  assert.equal(parked.next.follow, 'sai/commands/explore/steps/poc-lane.md');

  // Leaving the lane restores the stage's own step file.
  const left = idea.transition(parked.state, { intent: 'crystallize-resume' });
  assert.equal(idea.project(left.state).next.follow, 'sai/commands/explore/steps/crystallization-protocol.md');
});

test('lane routing intents are rejected outside the crystallize stage', () => {
  for (const intent of ['poc-lane', 'crystallize-resume']) {
    const early = idea.transition(idea.initialState, { intent });
    assert.equal(early.state.stage, 'explore-change');
    assert.equal(early.state.route, null);
    assert.equal(early.rejected, 'READINESS_IS_NOT_INTENT');
    assert.equal(early.next.follow, 'sai/commands/explore/steps/common.md');
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

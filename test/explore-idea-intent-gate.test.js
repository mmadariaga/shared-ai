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

test('caller-side next-step recognition lives in common.md and slice.md points at it', () => {
  const common = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'common.md'), 'utf8');
  const slice = fs.readFileSync(path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps', 'slice.md'), 'utf8');
  assert.match(common, /bare token/);
  assert.match(common, /dominant intent/);
  assert.match(common, /Mere containment of the string `next-step` SHALL NOT fire the token/);
  assert.match(common, /negates, defers, quotes, or discusses the token SHALL NOT advance/);
  assert.match(slice, /stage-progression rule in `common\.md`/);
});

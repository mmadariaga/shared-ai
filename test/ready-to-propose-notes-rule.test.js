'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const policyPath = path.join(__dirname, '..', 'sai', 'policies', 'ready-to-propose-format.md');

function notesRule() {
  const policy = fs.readFileSync(policyPath, 'utf8');
  const start = policy.indexOf('- **Request Additional Notes**:');
  const end = policy.indexOf('- **Overview language**:', start);
  assert.ok(start >= 0 && end > start, 'the Request Additional Notes field rule should exist under Field rules');
  return policy.slice(start, end);
}

test('notes rule leads with a positive definition naming the context it carries', () => {
  const rule = notesRule();
  assert.match(rule, /discussed, agreed context that could influence implementation/);
  assert.match(rule, /future behavior the conversation agreed on but excluded from this change/);
  assert.match(rule, /related follow-up work, such as PBIs or tickets/);
  assert.match(rule, /points the conversation left explicitly undecided/);
});

test('notes rule separates a non-goal from its detail without counting it as duplication', () => {
  const rule = notesRule();
  assert.match(rule, /A non-goal and its detail are two facts/);
  assert.match(rule, /The pair is not duplication/);
  assert.match(rule, /future behavior outside this change goes here as future context/);
});

test('notes rule carries a checkable emission sweep run before the block is printed', () => {
  const rule = notesRule();
  assert.match(rule, /\*\*Emission sweep\*\*, run before the block is printed/);
  assert.match(rule, /every discussed-and-excluded topic whose detail goes beyond its non-goal in `\*\*Key constraints\*\*` has that detail in `\*\*Request Additional Notes\*\*`/);
  assert.match(rule, /each per-slice block sweeps only its own slice's content/);
});

test('notes rule keeps a generic illustrative example and the unchanged consumer sentence', () => {
  const rule = notesRule();
  assert.match(rule, /Illustrative example/);
  assert.match(rule, /Consumers treat it as informative context only: no requirement, scenario, or mandatory scope derives from it\./);
});

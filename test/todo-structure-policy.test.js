'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const POLICY_PATH = 'sai/policies/todo-structure.md';

function policy() {
  const fullPath = path.join(repoRoot, POLICY_PATH);
  assert.equal(fs.existsSync(fullPath), true, `${POLICY_PATH} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

const CONTRACT_PATH = 'sai/policies/artifact-review-contract.md';

function findingContract() {
  const fullPath = path.join(repoRoot, CONTRACT_PATH);
  assert.equal(fs.existsSync(fullPath), true, `${CONTRACT_PATH} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('todo-structure policy fixes the render threshold at three steps', () => {
  const source = policy();

  assert.match(source, /fewer than three|less than three|below three/i);
  assert.match(source, /three or more|at least three|three steps or more/i);
  assert.match(source, /three/i);
});

test('todo-structure policy renders no task list below the threshold and renders at or above it', () => {
  const source = policy();

  assert.match(source, /no task list|renders nothing|nothing.*renders|no list/i);
  assert.match(source, /renders(?: a task list| the task list|)?/i);
});

test('todo-structure policy keeps the threshold constant single-sourced in the policy itself', () => {
  const source = policy();

  assert.match(source, /threshold.*(?:lives|defined|declared|fixed) only|only.*threshold|single[- ]source/i);
  assert.match(source, /reference the policy/i);
  assert.match(source, /without restating|restat(?:e|ing).*(?:the value|threshold)|do not restate/i);
});

test('todo-structure policy restricts task-list tool-call emission to the coordinator session', () => {
  const source = policy();

  assert.match(source, /coordinator session|coordinator\b/i);
  assert.match(source, /never.*worker|worker.*never/i);
  assert.match(source, /exclusively|only the coordinator/i);
});

test('todo-structure policy names the apply step projection as a governed surface', () => {
  const source = policy();

  assert.match(source, /apply step projection|apply-step projection/i);
  assert.match(source, /governed surface|governs the apply step/i);
});

test('todo-structure policy keeps the apply step projection state vocabulary and deterministic derivation', () => {
  const source = policy();

  assert.match(source, /apply step projection/i);
  assert.match(source, /pending|in_progress|completed/i);
  assert.match(source, /on[- ]disk|marked set/i);
  assert.match(source, /plan order|deriv(?:ed|es|ation)/i);
});

test('todo-structure policy keeps the minimum-threshold rule single-sourced for the apply step projection', () => {
  const source = policy();

  assert.match(source, /apply step projection/i);
  assert.match(source, /minimum[- ]threshold|render threshold/i);
  assert.match(source, /single[- ]source/i);
  assert.match(source, /reference(?:s|d)?(?: the policy)?/i);
  assert.match(source, /without restating|do not restate|never restate/i);
});

test('todo-structure policy keeps apply step projection emission ownership in the coordinator session', () => {
  const source = policy();

  assert.match(source, /apply step projection/i);
  assert.match(source, /coordinator session|coordinator\b/i);
  assert.match(source, /(?:only|exclusively).*coordinator|coordinator.*(?:only|exclusively)/i);
});

test('todo-structure policy defines the milestone stamp as a decorative rendering action that leaves the step surface unchanged', () => {
  const source = policy();

  assert.match(source, /decorative rendering action/i);
  assert.match(source, /milestone stamp/i);
  assert.match(source, /(?:stable )?(?:step )?id/i);
  assert.match(source, /label/i);
  assert.match(source, /plan order/i);
  assert.match(source, /deriv(?:ed|es|ation)|derived state/i);
});

test('todo-structure policy restricts milestone stamps to the three routed planning-phase task lists, never the Idea Progress List or apply step projection', () => {
  const source = policy();

  assert.match(source, /milestone stamp/i);
  assert.match(source, /three routed/i);
  assert.match(source, /Idea Progress List/i);
  assert.match(source, /apply step projection/i);
  assert.match(source, /(?:never|not|no stamp).*(?:Idea Progress List|apply step projection)|(?:Idea Progress List|apply step projection).*(?:never|not|no stamp)/i);
});

test('todo-structure policy names no per-harness time command in the milestone stamp surface', () => {
  const source = policy();

  assert.match(source, /milestone stamp annotation/i);
  assert.doesNotMatch(source, /Get-Date/i);
  assert.doesNotMatch(source, /\bdate\b/i);
});

test('todo-structure policy names the four audit progress plans as unstamped alongside the Idea Progress List', () => {
  const source = policy();

  assert.match(source, /audit progress plans[\s\S]{0,160}(?:carry no stamps|no stamps)/i);
  assert.match(source, /three routed/i);
});

// ---- Step 1 (spec-design-review-progress-step): evidence-only review policy ----
// Reconciling a completed phase marks every unmarked non-review step completed,
// except the evidence-marked review of the spec and design plans.

test('step 1 reconcile marks every unmarked non-review step completed and leaves an unmarked review step unchanged', () => {
  const source = policy();

  assert.match(source, /reconcile/i);
  assert.match(source, /unmarked|unchecked/i);
  assert.match(source, /review[\s\S]{0,160}(?:unchanged|not (?:marked|checked|touched))|(?:never|not)[\s\S]{0,120}(?:marks?|checks?)[\s\S]{0,80}review/i);
  assert.match(source, /(?:spec and design|spec[\s\S]{0,80}design)[\s\S]{0,200}review|review[\s\S]{0,200}(?:spec and design|spec[\s\S]{0,80}design)/i);
});

test('step 1 reconciliation never marks review without a worker progress event carrying review evidence', () => {
  const source = policy();

  assert.match(source, /evidence/i);
  assert.match(source, /worker progress event|progress event/i);
  assert.match(source, /never[\s\S]{0,200}(?:marks?|checks?)[\s\S]{0,80}review|review[\s\S]{0,200}(?:is )?(?:never|not)[\s\S]{0,120}(?:marked|checked)/i);
});

test('step 1 an evidence-marked review stays completed through later edits and High findings', () => {
  const source = policy();

  assert.match(source, /high findings?/i);
  assert.match(source, /later edits?|subsequent edits?|further edits?/i);
  assert.match(source, /remains (?:completed|marked|checked)|(?:never|does not)[\s\S]{0,120}(?:revert|unmark|uncheck|regress)/i);
});

test('step 1 reconcile preserves the rendered list exactly on failed, cancelled, or needs-input results', () => {
  const source = policy();

  assert.match(source, /needs[-_ ]input/i);
  assert.match(source, /failed|cancelled|canceled/i);
  assert.match(source, /preserv(?:e|ed|ing)[\s\S]{0,160}(?:exactly|as[- ]is|unchanged)/i);
  assert.match(source, /last rendered|as rendered|previous(?:ly)? rendered/i);
});

test('step 1 the review carve-out covers only the spec and design plans; a review step in a third plan completes normally', () => {
  const source = policy();

  assert.match(source, /carve[- ]out|carved[- ]out|exception/i);
  assert.match(source, /(?:scoped|limited|restricted|confined)[\s\S]{0,120}(?:spec and design|two (?:plans|surfaces)|spec[\s\S]{0,80}design)/i);
  assert.match(source, /(?:any|other|third|remaining) plan/i);
  assert.match(source, /reconcil(?:es|ed)[\s\S]{0,160}completed|completed[\s\S]{0,160}normally/i);
});

test('step 1 the shared finding contract surface lists worker-owned spec and design artifact reviewers and keeps the five-field finding shape with base tally', () => {
  const source = findingContract();

  assert.match(source, /artifact reviewer/i);
  assert.match(source, /(?:spec|design)[\s\S]{0,80}(?:artifact )?reviewer|(?:artifact )?reviewer[\s\S]{0,80}(?:spec|design)/i);
  assert.match(source, /worker[- ]owned|owned by the worker/i);
  assert.match(source, /five[- ]field|five fields/i);
  assert.match(source, /base tally|Summary:/i);
});

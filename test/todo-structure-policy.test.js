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

test('todo-structure policy extends milestone stamps to every list marked from progress events, never the Idea Progress List or apply step projection', () => {
  const source = policy();

  assert.match(source, /milestone stamp/i);
  assert.match(source, /marked from worker progress events/i,
    'the scope should be keyed on progress-event marking, not on a fixed phase count');
  assert.match(source, /audit plans/i,
    'the four audit plans should be inside the stamped scope');
  assert.match(source, /Idea Progress List/i);
  assert.match(source, /apply step projection/i);
  assert.match(source, /(?:never|not|no stamp).*(?:Idea Progress List|apply step projection)|(?:Idea Progress List|apply step projection).*(?:never|not|no stamp)/i);
  assert.doesNotMatch(source, /three routed/i,
    'the retired three-phase carve-out should be gone');
});

test('todo-structure policy names no per-harness time command in the milestone stamp surface', () => {
  const source = policy();

  assert.match(source, /milestone stamp annotation/i);
  assert.doesNotMatch(source, /Get-Date/i);
  assert.doesNotMatch(source, /\bdate\b/i);
});

test('todo-structure policy makes the stamp closure-only, sourced from received_at, with no wall-clock call', () => {
  const source = policy();

  assert.match(source, /closure-only/i,
    'the stamp should be declared closure-only');
  assert.match(source, /carries a stamp exactly when it renders `completed`/i,
    'a step should be stamped exactly when it renders completed');
  assert.match(source, /`pending` step and the `in_progress` step carry none/i,
    'pending and in_progress steps should carry no stamp');
  assert.match(source, /top-level `received_at` of the response that marked the step/i,
    'the value should come from the marking verdict');
  assert.match(source, /terminal `validate` response's `received_at`/i,
    'bulk close should use the terminal verdict value');
  assert.match(source, /no wall-clock call of any kind/i,
    'the coordinator should issue no wall-clock call');
  assert.match(source, /no timezone resolution, no conversion, no fallback/i,
    'the stamp should be read straight off the offset-bearing value');

  const stampSection = source.slice(source.indexOf('## Milestone stamp annotation'));
  assert.ok(stampSection, 'the stamp section should exist');
  assert.doesNotMatch(stampSection, /shell call/i,
    'the retired per-render-act shell-call budget should be gone');
  assert.doesNotMatch(stampSection, /inherits|inherited start|start stamp of/i,
    'start-stamp inheritance should be gone');
});

test('todo-structure policy fixes the rendered stamp form and the freeze behavior', () => {
  const source = policy();

  assert.match(source, /- 10:51/,
    'the policy should show the rendered form');
  assert.match(source, /separated by ` - `/,
    'the separator should be fixed');
  assert.match(source, /`needs_input`, `failed`, and `cancelled` leave the list and its stamps exactly as last rendered/i,
    'unsuccessful and input results should freeze the stamps');
});

// ---- Step 1: run-closing reconciliation (remove-dead-review-steps) ----
// Reconciling a completed phase marks every unmarked step completed; the
// former evidence-marked review carve-out of the spec and design plans is gone.

test('step 1 reconcile marks every unmarked step completed with no review carve-out', () => {
  const source = policy();

  assert.match(source, /reconcile/i);
  assert.match(source, /On a successful trigger, render every unmarked step `completed`\./);
  assert.doesNotMatch(source, /evidence-marked/i,
    'the evidence-marked review carve-out should be gone');
  assert.doesNotMatch(source, /review carve-out|evidence carve-out/i,
    'no review reconciliation carve-out should remain');
});

test('step 1 reconcile preserves the rendered list exactly on failed, cancelled, or needs-input results', () => {
  const source = policy();

  assert.match(source, /needs[-_ ]input/i);
  assert.match(source, /failed|cancelled|canceled/i);
  assert.match(source, /preserv(?:e|ed|ing)[\s\S]{0,160}(?:exactly|as[- ]is|unchanged)/i);
  assert.match(source, /last rendered|as rendered|previous(?:ly)? rendered/i);
});

test('step 7 todo policy keeps Explore-only manual review, supervised Review Engine surfaces, and worker consumption without worker-owned loop semantics', () => {
  const source = findingContract();
  const todo = policy();
  const explore = fs.readFileSync(
    path.join(repoRoot, 'sai/commands/explore/instructions.md'),
    'utf8',
  );
  const combined = `${source}\n${explore}`;

  assert.doesNotMatch(todo, /worker[- ]owned[\s\S]{0,220}(?:review loop|review pass)/i,
    'the todo policy should remain limited to progress-list semantics');
  assert.doesNotMatch(source, /automatic worker-owned planning-artifact review loop|worker[- ]owned[\s-]+(?:planning[- ]artifact )?review (?:loop|pass)/i,
    'the finding contract must not retain the retired worker-owned loop');
  const reviewLoop = fs.readFileSync(
    path.join(repoRoot, 'sai/commands/explore/steps/review-loop.md'),
    'utf8',
  );
  assert.match(reviewLoop, /Post-crystallization review loop \(sai-explore only\)[\s\S]{0,600}user-triggered/,
    'manual review must be an Explore-only, user-triggered surface');
  assert.match(combined, /supervis(?:ed|ion)[\s\S]{0,320}Review Engine|Review Engine[\s\S]{0,320}supervis(?:ed|ion)/i,
    'supervised review must use the Review Engine surface');
  assert.doesNotMatch(source, /spec-proposal and design workers are consumers/i,
    'the finding contract should name no spec or design worker consumer');

  assert.match(source, /artifact review/i);
  assert.match(source, /(?:spec|design)[\s\S]{0,120}(?:artifact )?review|(?:artifact )?review[\s\S]{0,120}(?:spec|design)/i);
  assert.match(source, /five[- ]field|five fields/i);
  assert.match(source, /base tally|Summary:/i);
  assert.doesNotMatch(todo, /evidence-marked/i,
    'the todo policy should no longer carry the evidence-marked review carve-out');
});

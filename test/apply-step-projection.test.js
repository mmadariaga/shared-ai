'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const APPLY_PATH = 'sai/instructions/apply.md';

function apply() {
  const fullPath = path.join(repoRoot, APPLY_PATH);
  assert.ok(fs.existsSync(fullPath), `${APPLY_PATH} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('apply.md instructs a run-start render from `#### Step N:` headings in plan order', () => {
  const source = apply();

  assert.match(source, /`#### Step N:`|#### Step \d+/i);
  assert.match(source, /implementation\.md/i);
  assert.match(source, /collect|gather|read/i);
  assert.match(source, /plan order|in order/i);
});

test('apply.md maps each step heading to exactly one entry with a stable step-integer id and heading-text label', () => {
  const source = apply();

  assert.match(source, /exactly one (?:entry|task|item)/i);
  assert.match(source, /stable.*(?:id|identifier)/i);
  assert.match(source, /step integer|step number/i);
  assert.match(source, /heading text|heading\b[\s\S]{0,80}(?:label|title)|label[\s\S]{0,80}heading/i);
  assert.match(source, /never (?:adds?|removes?|renames?|reorders?|re-labels?)/i);
});

test('apply.md renders the full projected list before the first Step dispatch', () => {
  const source = apply();

  const render = source.search(/run-start render|renders? (?:the |a )?(?:step |projection )?list before/i);
  const firstDispatch = source.search(/first Step dispatch|first dispatch/i);

  assert.ok(render >= 0, 'apply.md must define the run-start render of the step list');
  assert.ok(firstDispatch >= 0, 'apply.md must reference the first Step dispatch');
  assert.ok(render < firstDispatch, 'the run-start render must precede the first Step dispatch');
});

test('apply.md includes appended audit steps in the same step-heading projection', () => {
  const source = apply();

  assert.match(source, /audit step/i);
  assert.match(source, /append(?:ed|ing)|additional steps?/i);
  assert.match(source, /`#### Step N:`|#### Step \d+/i);
  assert.match(source, /same (?:projection|heading)|projection[\s\S]{0,120}(?:audit|additional)/i);
});

test('apply.md gates the projection by referencing the todo-structure policy without restating the threshold constant', () => {
  const source = apply();

  assert.match(source, /sai\/policies\/todo-structure\.md/i);
  assert.match(source, /threshold/i);
  assert.match(source, /reference(?:s|d)?(?: the policy)?|apply the policy/i);
  assert.doesNotMatch(source, /fewer than three|at least three|less than three|three or more/i);
});

test('apply.md renders no step list below the threshold and proceeds normally on either harness', () => {
  const source = apply();

  assert.match(source, /(?:no|no task|no step|nothing).*(?:list|renders?)|below.*threshold/i);
  assert.match(source, /proceed(?:s)? normally|runs? normally|continue(?:s)? normally/i);
  assert.match(source, /(?:both|either|neither) harness(?:es)?|claude code and opencode|per harness/i);
});

test('apply.md derives the initial render state from the on-disk checkbox state at run start', () => {
  const source = apply();

  assert.match(source, /on-disk|on disk/i);
  assert.match(source, /checkbox state|checked state|marker state/i);
  assert.match(source, /run start|start of the run|run-start/i);
  assert.match(source, /pending|in_progress|completed/i);
  assert.match(source, /fully? (?:marked|checked)|all.*\[x\]|every.*\[x\]|first not[- ]fully/i);
});

test('apply.md renders already-marked steps completed on re-run and keeps implementation.md the durable record', () => {
  const source = apply();

  assert.match(source, /already.*\[x\]|previously.*(?:marked|checked)|re-run/i);
  assert.match(source, /completed/i);
  assert.match(source, /implementation\.md[\s\S]{0,160}(?:durable|source of truth|authoritative|read by)/i);
  assert.match(source, /sai-archive/i);
  assert.match(source, /sai-status/i);
});

test('apply.md marks the projected entry completed in the same batched update that flips its checkboxes, after verification', () => {
  const source = apply();

  assert.match(source, /checkbox|`\[x\]`|mark(?:ing)? checkboxes/i);
  assert.match(source, /same (?:batched )?update|one update|single update/i);
  assert.match(source, /completed/i);
  assert.match(source, /after.*verification|verification.*pass/i);
  assert.match(source, /Human Verification/i);
  assert.match(source, /never (?:disagree|diverge|drift)|never.*out of sync/i);
});

test('apply.md does not mark the projected entry of an unverified step', () => {
  const source = apply();

  assert.match(source, /unverified|failed verification|did not pass|not (?:yet )?verified/i);
  assert.match(source, /(?:not (?:be )?marked|does not mark|leave.*pending|stays? pending)/i);
});

test('apply.md emits the task-list tool call from the coordinator session only, never from a Step-execution subagent', () => {
  const source = apply();

  assert.match(source, /task[- ]list|projection list|render(?:s)? (?:the )?list/i);
  assert.match(source, /coordinator session|coordinator\b/i);
  assert.match(source, /never[\s\S]{0,160}(?:subagent|worker)|(?:subagent|worker)[\s\S]{0,160}never/i);
  assert.match(source, /(?:only|exclusively)[\s\S]{0,120}coordinator|coordinator[\s\S]{0,120}(?:only|exclusively)/i);
});

test('apply.md projection surface carries no progress-plan declaration and no progress event payload', () => {
  const source = apply();

  assert.doesNotMatch(source, /progress_plan/i);
  assert.doesNotMatch(source, /event:\s*progress/i);
  assert.doesNotMatch(source, /continue_after_progress/i);
  assert.match(source, /no (?:change|alteration)[\s\S]{0,120}(?:lifecycle|coordinator contract)|no progress protocol/i);
});

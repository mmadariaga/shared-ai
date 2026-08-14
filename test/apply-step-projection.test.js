'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const COORDINATOR_PATH = 'sai/commands/apply/coordinator.md';
const RUNNER_PATH = 'sai/commands/apply/runner.md';
const RED_WORKER_PATH = 'sai/commands/apply/red-worker.md';
const GREEN_WORKER_PATH = 'sai/commands/apply/green-worker.md';

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function combined() {
  return [
    artifact(COORDINATOR_PATH),
    artifact(RUNNER_PATH),
    artifact(RED_WORKER_PATH),
    artifact(GREEN_WORKER_PATH),
  ].join('\n');
}

test('Step 2 the run-start Step Projection is coordinator-derived and renders from `#### Step N:` headings in plan order', () => {
  const coordinator = artifact(COORDINATOR_PATH);
  assert.match(coordinator, /`#### Step N:`|#### Step \d+/i,
    'specs/apply-step-projection/spec.md: the projection must read the Step N headings');
  assert.match(coordinator, /implementation\.md/i,
    'specs/apply-step-projection/spec.md: the projection must read implementation.md');
  assert.match(coordinator, /plan order|in order/i,
    'specs/apply-step-projection/spec.md: the projection must preserve plan order');
  assert.match(coordinator, /run[- ]start|start of the run/i,
    'specs/apply-step-projection/spec.md: the render must happen at run start');
  assert.match(coordinator, /coordinator[\s\S]{0,80}(?:deriv|own)|deriv(?:ed|ing)[\s\S]{0,80}coordinator/i,
    'specs/apply-step-projection/spec.md: the projection must be coordinator-derived');
});

test('Step 2 the run-start Step Projection carries no progress_plan, progress event, or continue_after_progress', () => {
  const coordinator = artifact(COORDINATOR_PATH);
  assert.match(coordinator, /no progress protocol|no progress_plan|no plan declaration|no progress payload/i,
    'specs/apply-step-projection/spec.md: the projection must introduce no progress protocol');
  assert.doesNotMatch(coordinator, /continue_after_progress[\s\S]{0,140}Step Projection|Step Projection[\s\S]{0,140}continue_after_progress/i,
    'specs/apply-step-projection/spec.md: the projection must carry no continue_after_progress');
  assert.doesNotMatch(coordinator, /event:\s*"?progress"?[\s\S]{0,140}Step Projection|Step Projection[\s\S]{0,140}event:\s*"?progress"?/i,
    'specs/apply-step-projection/spec.md: the projection must carry no progress event');
});

test('Step 2 the projection renders the full list before the first Step dispatch and derives initial state from on-disk checkboxes', () => {
  const coordinator = artifact(COORDINATOR_PATH);
  const render = coordinator.search(/renders? (?:the |a )?(?:step |projection )?list before|run[- ]start render/i);
  const firstDispatch = coordinator.search(/first Step dispatch|first dispatch/i);
  assert.ok(render >= 0, 'the coordinator must define the run-start render of the step list');
  assert.ok(firstDispatch >= 0, 'the coordinator must reference the first Step dispatch');
  assert.ok(render < firstDispatch,
    'specs/apply-step-projection/spec.md: the run-start render must precede the first Step dispatch');
  assert.match(coordinator, /on-disk|on disk/i,
    'specs/apply-step-projection/spec.md: the initial state must derive from the on-disk checkbox state');
  assert.match(coordinator, /pending|in_progress|completed/i,
    'specs/apply-step-projection/spec.md: the initial render state must use the pending/in_progress/completed vocabulary');
});

test('Step 2 the projection marks its entry completed in the same batched update that flips the checkboxes, after verification', () => {
  const coordinator = artifact(COORDINATOR_PATH);
  assert.match(coordinator, /checkbox|`\[x\]`|mark(?:ing)? checkboxes/i,
    'specs/apply-step-projection/spec.md: the coordinator must mark checkboxes');
  assert.match(coordinator, /same (?:batched )?update|one update|single update/i,
    'specs/apply-step-projection/spec.md: the checkbox flip and the projection mark must share one update');
  assert.match(coordinator, /completed/i,
    'specs/apply-step-projection/spec.md: the projected entry must be marked completed');
  assert.match(coordinator, /after.*verification|verification.*pass|Human Verification/i,
    'specs/apply-step-projection/spec.md: the mark must happen only after verification');
  assert.match(coordinator, /never (?:disagree|diverge|drift)|never.*out of sync/i,
    'specs/apply-step-projection/spec.md: the harness list and on-disk checkboxes must never disagree');
});

test('Step 2 the projection does not mark the entry of an unverified step and stays on-disk-durable', () => {
  const coordinator = artifact(COORDINATOR_PATH);
  assert.match(coordinator, /unverified|failed verification|did not pass|not (?:yet )?verified/i,
    'specs/apply-step-projection/spec.md: the unverified state must be addressed');
  assert.match(coordinator, /(?:not (?:be )?marked|does not mark|leave.*pending|stays? pending)/i,
    'specs/apply-step-projection/spec.md: an unverified step must not be marked completed');
  assert.match(coordinator, /implementation\.md[\s\S]{0,160}(?:durable|source of truth|authoritative|read by)/i,
    'specs/apply-step-projection/spec.md: implementation.md must remain the durable record');
});

test('Step 2 the task-list tool call originates from the coordinator session only, never from a worker', () => {
  const coordinator = artifact(COORDINATOR_PATH);
  const red = artifact(RED_WORKER_PATH);
  const green = artifact(GREEN_WORKER_PATH);
  assert.match(coordinator, /task[- ]list|projection list|render(?:s)? (?:the )?list/i,
    'specs/apply-step-projection/spec.md: the coordinator must own the task-list render');
  assert.match(coordinator, /coordinator session|coordinator\b/i,
    'specs/apply-step-projection/spec.md: the render must originate from the coordinator session');
  for (const worker of [red, green]) {
    assert.doesNotMatch(worker, /task[- ]list tool|render(?:s)? (?:the )?(?:step |projection )?list/i,
      'specs/apply-step-projection/spec.md: workers must never emit the task-list tool call');
  }
});

test('Step 2 each dispatch carries exactly one immutable progress plan selected before dispatch', () => {
  const runner = artifact(RUNNER_PATH);
  const coordinator = artifact(COORDINATOR_PATH);
  const combined = `${runner}\n${coordinator}`;
  assert.match(combined, /immutable/,
    'specs/apply-step-projection/spec.md: the dispatch-local plan must be immutable');
  assert.match(combined, /selected[\s\S]{0,120}before dispatch|before[\s\S]{0,120}dispatch[\s\S]{0,120}(?:select|plan)/i,
    'specs/apply-step-projection/spec.md: the plan must be selected before dispatch');
  assert.match(combined, /does not mutate|not[\s\S]{0,40}mutate|unchanged|never changes/i,
    'specs/apply-step-projection/spec.md: a later plan selection must not mutate an earlier plan');
  assert.match(combined, /test-authoring\s*(?:→|->)\s*red-verification/,
    'specs/apply-step-projection/spec.md: the RED plan must be pinned');
  assert.match(combined, /implementation\s*(?:→|->)\s*green-verification/,
    'specs/apply-step-projection/spec.md: the GREEN plan must be pinned');
  assert.match(combined, /test-authoring\s*(?:→|->)\s*green-verification/,
    'specs/apply-step-projection/spec.md: the green-exception plan must be pinned');
  assert.match(combined, /event:\s*"?progress"?/,
    'specs/apply-step-projection/spec.md: worker progress must use the closed progress-event shape');
  assert.match(combined, /step_ids:\s*string\[\]/,
    'specs/apply-step-projection/spec.md: the progress event must carry step_ids');
  assert.match(combined, /changed_files:\s*string\[\]/,
    'specs/apply-step-projection/spec.md: the progress event must carry changed_files');
});

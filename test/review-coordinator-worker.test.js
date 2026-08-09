'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

test('review coordinator declares the canonical five-step progress plan in order with labels', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  for (const id of ['resolve-change', 'establish-diff-scope', 'resolve-review-analysis', 'resolve-mutation-analysis', 'close-review-outcome']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /resolve-change[\s\S]{0,300}establish-diff-scope[\s\S]{0,300}resolve-review-analysis[\s\S]{0,300}resolve-mutation-analysis[\s\S]{0,300}close-review-outcome/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /resolve-change[\s\S]{0,200}Resolve change/i);
  assert.match(coordinator, /establish-diff-scope[\s\S]{0,200}Resolve diff scope/i);
  assert.match(coordinator, /resolve-review-analysis[\s\S]{0,200}Resolve review analysis/i);
  assert.match(coordinator, /resolve-mutation-analysis[\s\S]{0,200}Resolve mutation-analysis gate/i);
  assert.match(coordinator, /close-review-outcome[\s\S]{0,200}Close review outcome/i);
});

test('review coordinator admits the progress shape as the sole nonterminal extension', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,240}(?:progress|sole nonterminal)/i);
  assert.match(coordinator, /extension_handlers[\s\S]{0,120}(?:empty|\{\})/i);
});

test('review coordinator renders at dispatch and reconciles at run-closing results', () => {
  const coordinator = artifact('sai/commands/review/coordinator.md');

  assert.match(coordinator, /at dispatch/i);
  assert.match(coordinator, /completed[\s\S]{0,240}unmarked[\s\S]{0,160}completed/i);
  assert.match(coordinator, /(?:failed|cancelled)[\s\S]{0,200}(?:as last rendered|freeze)/i);
  assert.match(coordinator, /needs_input[\s\S]{0,240}(?:unchanged|as last rendered)/i);
  assert.match(coordinator, /continue_after_progress[\s\S]{0,160}protocol[- ]?only/i);
});

test('review worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/orchestration/workers/sai-5-review-worker.md');

  assert.match(
    worker,
    /resolve-change[\s\S]{0,800}establish-diff-scope[\s\S]{0,800}resolve-review-analysis[\s\S]{0,800}resolve-mutation-analysis[\s\S]{0,800}close-review-outcome/,
    'the review worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /startup act/i);
  assert.match(worker, /resolve-change/);
  assert.match(worker, /Pass 11[\s\S]{0,240}(?:gate|not applicable|skip)/i);
  assert.match(worker, /empty diff[\s\S]{0,240}(?:cancelled|establish-diff-scope)/i);
  assert.match(worker, /no Milestone Stamp/i);
  assert.match(worker, /never[\s\S]{0,160}(?:before resolution|in place of a terminal|needs_input)/i);
});

test('review bindings render the plan coordinator-only with threshold reference and no stamp', () => {
  const claude = artifact('sai/orchestration/workers/bindings/claude/review-worker.md');
  const opencode = artifact('sai/orchestration/workers/bindings/opencode/review-worker.md');

  assert.match(claude, /task list/i);
  assert.match(claude, /completed[\s\S]{0,240}in_progress/i);
  assert.match(claude, /minimum threshold[\s\S]{0,160}todo-structure\.md|todo-structure\.md[\s\S]{0,160}(?:threshold|below)/i);
  assert.match(claude, /(?:no task list|no todowrite)[\s\S]{0,200}(?:below|threshold)/i);
  assert.doesNotMatch(claude, /fewer than three|below three/);
  assert.match(claude, /coordinator session/i);
  assert.doesNotMatch(claude, /date \+%H:%M/);

  assert.match(opencode, /todowrite/i);
  assert.match(opencode, /full[\s\S]{0,120}todos/i);
  assert.match(opencode, /constant[\s\S]{0,160}priority/i);
  assert.match(opencode, /disabl[\s\S]{0,200}subagent/i);
  assert.doesNotMatch(opencode, /Get-Date/);

  for (const binding of [claude, opencode]) {
    assert.match(binding, /no Milestone Stamp/i);
    assert.match(binding, /todo-structure\.md/);
  }
});

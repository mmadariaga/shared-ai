'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const WORKER_SURFACES = [
  'sai/commands/apply/red-worker.md',
  'sai/commands/apply/green-worker.md',
  'sai/commands/apply/steps/routing-split-flow.md',
  'sai/commands/apply/steps/routing-green-direct.md',
  'sai/commands/apply/steps/routing-green-exception-no-production.md',
  'sai/commands/apply/steps/routing-green-exception-test-only.md',
];

test('the plan template carries one Step test command per RED block and a plan-level full-suite command', () => {
  const template = source('sai/commands/implement/implementation-plan.template.md');
  const suite = template.indexOf('## Verification commands');
  const firstStep = template.indexOf('#### Step 1:');

  assert.ok(suite >= 0 && suite < firstStep, 'the full-suite section precedes the Steps');
  assert.match(template.slice(suite, firstStep), /`\{full-suite-command\}`/);
  assert.match(template, /##### RED phase[\s\S]*?\*\*Step test command:\*\* `\{step-test-command\}`/);
  assert.doesNotMatch(template, /`\{test-command\}`/);
  assert.doesNotMatch(template.slice(firstStep), /\{full-suite-command\}/, 'no Step references the full suite');
});

test('the generator rule is single-sourced in common.md and referenced by generation and validation', () => {
  const common = source('sai/commands/implement/steps/common.md');
  assert.match(common, /\*\*Verification commands:\*\*[^\n]*\{step-test-command\}[^\n]*\{full-suite-command\}/);
  for (const card of ['plan-generation.md', 'validation.md']) {
    assert.match(source(`sai/commands/implement/steps/${card}`), /\*\*Verification commands\*\*/);
  }
});

test('the apply coordinator defines both commands, including the legacy fallback', () => {
  const coordinator = source('sai/commands/apply/coordinator.md');
  const section = coordinator.slice(coordinator.indexOf('## Verification commands'));
  assert.match(section, /\*\*Step test command\*\*[\s\S]*`Verify RED` checkbox/);
  assert.match(section, /\*\*Full-suite command\*\*[\s\S]*terminal-lifecycle § 0/);
  assert.match(section, /`out-of-scope`[\s\S]*\/sai-3-implement/);
});

test('worker-facing surfaces point at the Step commands and never name the full suite', () => {
  for (const file of WORKER_SURFACES) {
    assert.doesNotMatch(source(file), /full[- ]suite/i, `${file} names the full suite`);
  }
  for (const file of WORKER_SURFACES.slice(2)) {
    assert.match(source(file), /coordinator § Verification commands/, `${file} lacks the pointer`);
  }
});

test('the terminal suite gate runs before the functional review and tolerates legacy plans', () => {
  const terminal = source('sai/commands/apply/steps/terminal-lifecycle.md');
  const gate = terminal.indexOf('## 0. Terminal suite gate');
  const review = terminal.indexOf('## 1. Terminal functional review');

  assert.ok(gate >= 0 && review > gate);
  const body = terminal.slice(gate, review);
  assert.match(body, /§§ 1–5 do not run/);
  assert.match(body, /> Terminal suite gate: skipped — plan has no full-suite command/);
});

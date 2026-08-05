'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('accessibility invocation core loads budget, instruction, and remember in order', () => {
  const core = artifact('sai/commands/accessibility/invocation.md');
  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/instructions/accessibility.md',
    'Fetch @sai/policies/remember.md',
  ];

  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /^arguments:\s*\$ARGUMENTS\s*$/m);
});

test('Copilot inline accessibility caller loads the shared core once without a routed binding', () => {
  const caller = artifact('sai/commands/sai-8-accessibility.md');
  const coreLoads = caller.match(/Fetch @sai\/commands\/accessibility\/invocation\.md/g) || [];

  assert.equal(coreLoads.length, 1);
  assert.doesNotMatch(caller, /Fetch @sai\/orchestration\/workers\/bindings\//);
  assert.doesNotMatch(caller, /Fetch @skills\/(?:claude|opencode)\/sai-8-accessibility-worker\//);
});

test('accessibility scope, runtime, and parent arguments reach the shared core unchanged', () => {
  const caller = artifact('sai/commands/sai-8-accessibility.md');
  const core = artifact('sai/commands/accessibility/invocation.md');
  const argumentsValue = '--full --path src/components --runtime feature-branch';

  assert.match(caller, /Fetch @sai\/commands\/accessibility\/invocation\.md/);
  assert.match(caller, /arguments:\s*\$ARGUMENTS/);
  assert.match(core, /arguments:\s*\$ARGUMENTS/);
  assert.ok(caller.includes('$ARGUMENTS'), `complete arguments should preserve ${argumentsValue}`);
  assert.ok(core.includes('$ARGUMENTS'), `complete arguments should reach the core: ${argumentsValue}`);
});

test('accessibility review defaults to static-only without a runtime scanner', () => {
  const instruction = artifact('sai/instructions/accessibility.md');

  assert.match(instruction, /`--runtime` to enable browser-based[\s\S]{0,160}Default:\s*static-only/i);
  assert.match(instruction, /Runtime requires[\s\S]{0,160}explicitly authorize each command/i);
});

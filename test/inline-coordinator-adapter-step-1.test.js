'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { IMPLEMENTATION_ARTIFACTS } = require('../fixtures/implementation-adapter.js');
const { COMPLETION_ARTIFACTS } = require('../fixtures/implementation-completion-step-4.js');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('Step 1 inline coordinator stops on the first missing artifact without writing', () => {
  const inline = artifact('sai/orchestration/inline-invocation.md');

  const proposal = inline.indexOf("`Change '{change-name}' not found. Run /sai-1-spec to create it first.`");
  const design = inline.indexOf('`design.md not found for \'{change-name}\'. Run /sai-2-design first.`');
  const tasks = inline.indexOf('`tasks.md not found for \'{change-name}\'. Run /sai-2-design first.`');
  assert.ok(proposal >= 0 && proposal < design && design < tasks);
  assert.match(inline, /first missing artifact without checking later artifacts or writing any\s+file/i);
});

test('Step 1 Copilot envelopes remain phase then arguments for both adapters', () => {
  const design = artifact('commands/copilot/sai-2-design.prompt.md');
  const implement = artifact('commands/copilot/sai-3-implement.prompt.md');

  for (const [phase, prompt] of [
    ['sai-2-design', design],
    ['sai-3-implement', implement],
  ]) {
    assert.match(prompt, new RegExp(`^phase: ${phase}\\r?\\narguments: \\$ARGUMENTS$`, 'm'));
  }
});

test('Step 1 maintained entrypoints use routed paths or direct Copilot adapter dispatch', () => {
  for (const phase of ['sai-2-design', 'sai-3-implement']) {
    const claude = artifact(`commands/claude/${phase}.md`);
    const opencode = artifact(`commands/opencode/${phase}.md`);
    const copilot = artifact(`commands/copilot/${phase}.prompt.md`);

    assert.match(claude, /sai-(?:2-design|3-implementation)-worker|sai\/commands\/(?:design\/coordinator|implement\/coordinator)/);
    assert.match(opencode, /sai-coordinator|sai-(?:2-design|3-implementation)-worker/);
    assert.match(copilot, /sai\/orchestration\/inline-invocation\.md/);
  }
});

test('Step 1 removes legacy inline coordinator sources', () => {
  for (const relativePath of [
    'sai/commands/sai-2-design-inline.md',
    'sai/commands/sai-3-implement-inline.md',
    'sai/orchestration/sai-design-coordinator.md',
    'sai/orchestration/sai-implementation-coordinator.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false, `${relativePath} should be removed`);
  }
});

test('Step 1 completion artifact interface remains a plain CommonJS map', () => {
  assert.deepEqual(Object.keys(COMPLETION_ARTIFACTS).sort(), [
    'coordinator',
    'inlineWrapper',
    'invocation',
  ]);
  assert.equal(Object.prototype.hasOwnProperty.call(COMPLETION_ARTIFACTS, 'loader'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(COMPLETION_ARTIFACTS, 'claude'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(COMPLETION_ARTIFACTS, 'opencode'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(COMPLETION_ARTIFACTS, 'copilot'), false);
});

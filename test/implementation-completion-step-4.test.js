'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { COMPLETION_ARTIFACTS } = require('../fixtures/implementation-completion-step-4.js');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('completed routed output uses the coordinator contract and reports ordered files once', () => {
  const coordinator = artifact(COMPLETION_ARTIFACTS.coordinator);
  assert.match(coordinator, /ordered union of `payload\.changed_files`/);
  assert.match(coordinator, /add each path once and never reset it/);
  assert.match(coordinator, /On `completed`[\s\S]*Implementation plan done/);
  assert.match(coordinator, /Stop immediately/);
});

test('Step 4 Claude Code and opencode wrappers use the routed implementation lifecycle', () => {
  for (const relativePath of ['commands/claude/sai-3-implement.md', 'commands/opencode/sai-3-implement.md']) {
    const wrapper = artifact(relativePath);
    assert.match(wrapper, /sai\/orchestration\/workers\/bindings\/implementation-worker\.md/);
    assert.match(wrapper, /sai\/commands\/implement\/coordinator\.md/);
    assert.doesNotMatch(wrapper, /inline-invocation|copilot/i);
  }
  for (const retiredPath of [
    'commands/copilot/sai-3-implement.prompt.md',
    'sai/orchestration/inline-invocation.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('Step 4 non-completed outcomes do not emit the completion sentence', () => {
  const coordinator = artifact(COMPLETION_ARTIFACTS.coordinator);
  assert.match(coordinator, /On `failed`[\s\S]*without the completion message/);
  assert.match(coordinator, /On `cancelled`[\s\S]*without claiming completion/);
  assert.match(coordinator, /For `needs_input`[\s\S]*same worker/);
});

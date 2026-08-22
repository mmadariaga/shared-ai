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
  const launcher = artifact('sai/commands/implement/command-bootstrap.md');
  for (const relativePath of ['commands/claude/sai-3-implement.md', 'commands/opencode/sai-3-implement.md']) {
    const wrapper = artifact(relativePath);
    assert.match(wrapper, /sai\/commands\/implement\/command-bootstrap\.md/);
    assert.doesNotMatch(wrapper, /inline-invocation|copilot/i);
  }
  assert.match(launcher, /sai\/orchestration\/workers\/bindings\/implementation-worker\.md/);
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

test('Step 1 keeps the standalone completion pin while allowing positional non-final navigation', () => {
  const coordinator = artifact(COMPLETION_ARTIFACTS.coordinator);
  assert.ok(
    coordinator.includes(
      'then print exactly: `Implementation plan done in openspec/changes/{name}/. Review and run \\`/sai-4-apply {name}\\` (--fast-track) **in a new chat** when ready.` Stop immediately.'
    ),
    'sole/final implement completion must retain the exact standalone pin'
  );
  assert.match(
    coordinator,
    /`terminal_navigation`[\s\S]{0,240}selection is positional/i,
    'implement terminal_navigation must be positional under composition'
  );
  assert.match(
    coordinator,
    /non-final[\s\S]{0,220}composition-owned authorized transition only[\s\S]{0,220}do not print the standalone MANDATORY STOP message/i,
    'non-final composition must not emit the standalone apply invitation'
  );
});

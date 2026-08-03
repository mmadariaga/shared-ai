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

test('spec invocation core loads only the technical instruction sequence', () => {
  const core = artifact('sai/commands/spec/invocation.md');

  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/policies/glossary-format.md',
    'Fetch @sai/instructions/spec.propose.md',
    'Fetch @skills/openspec-propose/SKILL.md',
    'Fetch @sai/policies/remember.md',
  ];
  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /\*\*User's request:\*\*\s*\$ARGUMENTS/);
  assert.doesNotMatch(core, /Fetch @sai\/policies\/prereqs\.md/);
  assert.doesNotMatch(core, /Fetch @sai\/policies\/artifact-feedback-gate\.md/);
  assert.doesNotMatch(core, /Spec proposal done in openspec\/changes\//);
});

test('existing Copilot wrapper reaches the shared spec core without routed workers', () => {
  const wrapper = artifact('commands/copilot/sai-1-spec.prompt.md');
  const entrypoint = artifact('sai/commands/sai-1-spec.md');

  assert.match(wrapper, /Fetch @sai\/commands\/sai-1-spec\.md/);
  assert.doesNotMatch(wrapper, /worker|coordinator/i);
  assert.doesNotMatch(entrypoint, /worker|coordinator/i);
});

test('inline completion remains outside the spec invocation core', () => {
  const core = artifact('sai/commands/spec/invocation.md');
  const inline = artifact('sai/commands/sai-1-spec.md');

  assert.doesNotMatch(core, /decision summary|feedback gate|MANDATORY STOP|Spec proposal done in openspec\/changes\//i);
  assert.match(inline, /decision summary/i);
  assert.match(inline, /artifact-feedback-gate\.md/);
  assert.match(inline, /Spec proposal done in openspec\/changes\/\{name\}\/\./);
});

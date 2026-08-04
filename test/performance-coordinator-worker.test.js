'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function projectedSources(harness) {
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: path.join(repoRoot, '.test-performance-commands'),
    sai: path.join(repoRoot, '.test-performance-sai'),
    skills: path.join(repoRoot, '.test-performance-skills'),
    agents: path.join(repoRoot, '.test-performance-agents'),
    config: path.join(repoRoot, '.test-performance-config'),
  };
  return expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
    .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'));
}

test('performance invocation core loads the shared audit sequence in order', () => {
  const core = artifact('sai/commands/performance/invocation.md');
  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/instructions/performance.md',
    'Fetch @sai/policies/remember.md',
  ];

  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /\$ARGUMENTS/);
  assert.equal((core.match(/Fetch @sai\/instructions\/performance\.md/g) || []).length, 1);
  assert.doesNotMatch(core, /InvocationEnvelope|resolved_change_name|terminal navigation|MANDATORY STOP/i);
  assert.doesNotMatch(core, /Files Affected[\s\S]{0,240}sai\/instructions\/performance\.md/);
});

test('Copilot inline caller shares the performance invocation core and retains its boundaries', () => {
  const caller = artifact('sai/commands/sai-7-performance.md');

  assert.match(caller, /Fetch @sai\/commands\/performance\/invocation\.md/);
  assert.match(caller, /<TASK>[\s\S]*## Prerequisite checks/);
  assert.match(caller, /Fetch @sai\/policies\/prereqs\.md/);
  assert.match(caller, /## Resolve change[\s\S]*Fetch @sai\/policies\/change-picker\.md/);
  assert.match(caller, /## Technical performance audit[\s\S]*Fetch @sai\/commands\/performance\/invocation\.md/);
  assert.match(caller, /## Completion[\s\S]*MANDATORY STOP/);
  assert.match(caller, /\$ARGUMENTS/);
});

test('generic Copilot projections retain both performance entrypoints', () => {
  const sources = new Set(projectedSources('copilot'));

  assert.equal(sources.has('sai/commands/sai-7-performance.md'), true);
  assert.equal(sources.has('commands/copilot/sai-7-performance.prompt.md'), true);
});

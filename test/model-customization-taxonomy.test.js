'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const customization = require('../bin/model-customization.js');

function fixtureManifest() {
  return {
    projections: [
      ...['sai-1-spec-proposal-worker', 'sai-4-red-worker'].map(name => ({
        destination: { class: 'agents', path: `${name}.md` }, harnesses: ['claude', 'opencode'],
        matrix: { kind: 'agent', phase: 'apply' },
      })),
      ...['budget-subagent', 'budget-executor', 'budget-explorer'].map(name => ({
        destination: { class: 'agents', path: `${name}.md` }, harnesses: ['claude'],
      })),
      ...['budget', 'executor', 'explore'].map(name => ({
        destination: { class: 'agents', path: `${name}.md` }, harnesses: ['opencode'],
      })),
      { source: 'commands/claude', destination: { class: 'commands', path: '.' }, harnesses: ['claude'] },
      { source: 'commands/opencode', destination: { class: 'commands', path: '.' }, harnesses: ['opencode'] },
    ],
  };
}

test('model customization exposes the five stable taxonomy labels and metadata families', () => {
  assert.deepEqual(customization.SCOPE_OPTIONS, ['Workers', 'Agents', 'Commands', 'Utilities', 'All']);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-model-taxonomy-'));
  try {
    for (const harness of ['claude', 'opencode']) {
      fs.mkdirSync(path.join(root, 'commands', harness), { recursive: true });
      for (const name of ['sai-commit', 'sai-pr', 'sai-status', 'sai-worktree', 'sai-build']) {
        fs.writeFileSync(path.join(root, 'commands', harness, `${name}.md`), '---\n---\n');
      }
    }
    const families = customization.enumerateProjectionTargets(root, () => fixtureManifest(), 'claude');
    assert.deepEqual(families.worker, ['sai-1-spec-proposal-worker', 'sai-4-red-worker']);
    assert.deepEqual(families.agent, ['budget-executor', 'budget-explorer', 'budget-subagent']);
    assert.deepEqual(customization.buildChecklistTargets('Workers', families).map(item => item.value), [
      'worker:sai-1-spec-proposal-worker', 'worker:sai-4-red-worker',
    ]);
    assert.deepEqual(customization.buildChecklistTargets('Utilities', families).map(item => item.value), [
      'utility:sai-commit', 'utility:sai-pr', 'utility:sai-status', 'utility:sai-worktree',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('target identity parsing is independent of display labels', () => {
  const entry = customization.parseTarget('utility:sai-status');
  assert.deepEqual(entry, {
    value: 'utility:sai-status', family: 'utility', name: 'sai-status', label: 'utility:sai-status',
  });
  assert.equal(customization.parseTarget('sai-status'), null);
});

test('effective model annotation prefers project-local frontmatter for both harnesses', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-model-taxonomy-'));
  try {
    const claudeGlobal = path.join(root, 'claude-global');
    const opencodeGlobal = path.join(root, 'opencode-global');
    fs.mkdirSync(path.join(root, '.claude', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(root, '.opencode', 'agents'), { recursive: true });
    fs.mkdirSync(claudeGlobal, { recursive: true });
    fs.mkdirSync(opencodeGlobal, { recursive: true });
    fs.writeFileSync(path.join(claudeGlobal, 'worker.md'), '---\nmodel: opus\neffort: low\n---\n');
    fs.writeFileSync(path.join(root, '.claude', 'agents', 'worker.md'), '---\nmodel: sonnet\neffort: high\n---\n');
    fs.writeFileSync(path.join(opencodeGlobal, 'worker.md'), '---\nmodel: openai/gpt\nvariant: low\n---\n');
    fs.writeFileSync(path.join(root, '.opencode', 'agents', 'worker.md'), '---\nmodel: openai/local\nvariant: high\n---\n');
    assert.equal(customization.effectiveSetting({ family: 'worker', name: 'worker' }, root, claudeGlobal, root, 'claude'), 'anthropic/sonnet (high)');
    assert.equal(customization.effectiveSetting({ family: 'worker', name: 'worker' }, root, opencodeGlobal, root, 'opencode'), 'openai/local (high)');
    assert.equal(customization.effectiveSetting({ family: 'worker', name: 'missing' }, root, claudeGlobal, root, 'claude'), 'unavailable');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

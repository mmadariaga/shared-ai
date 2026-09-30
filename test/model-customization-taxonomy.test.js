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
  assert.deepEqual(customization.SCOPE_OPTIONS, ['All', 'Agents', 'Orchestrators', 'Workers', 'Utilities']);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-model-taxonomy-'));
  try {
    for (const harness of ['claude', 'opencode']) {
      fs.mkdirSync(path.join(root, 'commands', harness), { recursive: true });
      for (const name of ['sai-commit', 'sai-pr', 'sai-retire-docs', 'sai-status', 'sai-worktree', 'sai-build']) {
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
      'utility:sai-pr', 'utility:sai-retire-docs', 'utility:sai-status', 'utility:sai-worktree',
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

test('target profiles carry a context estimate and a difficulty per family-qualified identity', () => {
  assert.ok(Object.isFrozen(customization.TARGET_PROFILE));
  for (const [value, { context, difficulty }] of Object.entries(customization.TARGET_PROFILE)) {
    assert.ok(['Small', 'Medium', 'Large'].includes(context), value);
    assert.ok(['↑', '↑↑', '↑↑↑'].includes(difficulty), value);
    assert.equal(customization.taskContextFor({ value }), context);
    assert.equal(customization.taskDifficultyFor({ value }), difficulty);
  }
  for (const value of ['command:budget', 'worker:future-worker']) {
    assert.equal(customization.taskContextFor({ value }), 'Unknown', value);
    assert.equal(customization.taskDifficultyFor({ value }), 'Unknown', value);
  }
  assert.equal(customization.taskContextFor({ value: 'agent:budget' }), 'Medium');
  assert.equal(customization.taskContextFor({ value: 'agent:executor' }), 'Small');
  assert.equal(customization.taskContextFor({ value: 'agent:budget-executor' }), 'Small');
  assert.equal(customization.taskContextFor({ value: 'agent:explore' }),
    customization.taskContextFor({ value: 'agent:budget-explorer' }));
  assert.equal(customization.taskContextFor({ value: 'agent:budget' }),
    customization.taskContextFor({ value: 'agent:budget-subagent' }));
});

test('context estimates distinguish fresh Step workers from cumulative orchestration', () => {
  assert.equal(customization.taskContextFor({ value: 'command:sai-4-apply' }), 'Large');
  assert.equal(customization.taskContextFor({ value: 'worker:sai-4-red-worker' }), 'Medium');
  assert.equal(customization.taskContextFor({ value: 'worker:sai-4-green-worker' }), 'Medium');
  assert.equal(customization.taskContextFor({ value: 'command:sai-6-security' }), 'Medium');
  assert.equal(customization.taskContextFor({ value: 'worker:sai-6-security-worker' }), 'Large');
  assert.equal(customization.taskContextFor({ value: 'utility:sai-status' }), 'Small');
});

test('difficulty is keyed by complete family-qualified target identity', () => {
  assert.equal(customization.taskDifficultyFor({ value: 'worker:sai-2-design-worker' }), '↑↑↑');
  assert.equal(customization.taskDifficultyFor({ value: 'agent:budget' }), '↑');
  assert.equal(customization.taskDifficultyFor({ value: 'command:sai-2-design' }), '↑↑');
  assert.equal(customization.taskDifficultyFor({ value: 'utility:sai-retire-docs' }), '↑↑');
  assert.equal(customization.TARGET_PROFILE.budget, undefined);
});

test('orchestrator difficulty reflects coordinator reasoning rather than worker analysis', () => {
  const expected = {
    'sai-explore': '↑↑↑',
    'sai-1-spec': '↑↑',
    'sai-2-design': '↑↑',
    'sai-build': '↑↑↑',
    'sai-3-implement': '↑↑',
    'sai-4-apply': '↑↑↑',
    'sai-review': '↑↑',
    'sai-5-review': '↑↑',
    'sai-6-security': '↑',
    'sai-7-performance': '↑',
    'sai-8-accessibility': '↑',
    'sai-backfill': '↑↑',
    'sai-archive': '↑↑',
    'sai-merge': '↑↑↑',
    'sai-commit': '↑',
  };
  for (const [name, difficulty] of Object.entries(expected)) {
    assert.equal(customization.taskDifficultyFor({ value: `command:${name}` }), difficulty, name);
  }
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

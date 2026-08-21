'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

const dietedBodies = ['archive', 'commit', 'pr', 'worktree'];
const subagentBodies = ['backfill', 'explore'];
const utilityBodies = [...dietedBodies, ...subagentBodies, 'status'];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('dieted utility bodies drop the budget fetch and keep safe-operations', () => {
  for (const name of dietedBodies) {
    const source = read(`sai/commands/${name}/body.md`);
    assert.doesNotMatch(source, /@skills\/budget\//,
      `${name} body must not fetch the budget skill`);
    assert.match(source, /Fetch @skills\/safe-operations\/SKILL\.md/,
      `${name} body must keep the safe-operations fetch`);
  }
});

test('live-dispatch utility bodies keep the budget fetch', () => {
  for (const name of subagentBodies) {
    const source = read(`sai/commands/${name}/body.md`);
    assert.match(source, /Fetch @skills\/budget\/SKILL\.md/,
      `${name} body must keep the budget skill`);
  }
});

test('no utility body carries an isolation block', () => {
  for (const name of utilityBodies) {
    const source = read(`sai/commands/${name}/body.md`);
    assert.doesNotMatch(source, /# Isolation Mode/,
      `${name} body must not carry an isolation block`);
  }
});

test('spec launcher carries exactly safe-operations and the worker binding', () => {
  const directives = read('sai/commands/spec/launcher.md')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  assert.deepEqual(directives, [
    'Fetch @skills/safe-operations/SKILL.md and use it.',
    'Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.',
  ]);
});

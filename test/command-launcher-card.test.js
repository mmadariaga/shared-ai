'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const commands = [
  ['sai-1-spec.md', 'spec'],
  ['sai-2-design.md', 'design'],
  ['sai-3-implement.md', 'implement'],
  ['sai-4-apply.md', 'apply'],
  ['sai-5-review.md', 'review'],
  ['sai-6-security.md', 'security'],
  ['sai-7-performance.md', 'performance'],
  ['sai-8-accessibility.md', 'accessibility'],
  ['sai-archive.md', 'archive'],
  ['sai-backfill.md', 'backfill'],
  ['sai-commit.md', 'commit'],
  ['sai-explore.md', 'explore'],
  ['sai-pr.md', 'pr'],
  ['sai-status.md', 'status'],
  ['sai-worktree.md', 'worktree'],
];
const emptyLaunchers = new Set(['apply', 'archive', 'backfill', 'commit', 'pr', 'status', 'worktree']);
const movedDirectives = {
  spec: [
    'Fetch @sai/policies/glossary-format.md',
    'Fetch @skills/budget/SKILL.md and use it.',
    'Fetch @skills/safe-operations/SKILL.md and use it.',
    'Fetch @sai/orchestration/workers/bindings/spec-worker.md and use it.',
    'Fetch @sai/commands/spec/coordinator.md and follow those instructions exactly.',
  ],
  design: [
    'Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.',
    'Fetch @sai/commands/design/coordinator.md and follow those instructions exactly.',
  ],
  implement: [
    'Fetch @sai/orchestration/workers/bindings/implementation-worker.md and use it.',
    'Fetch @sai/commands/implement/coordinator.md and follow those instructions exactly.',
  ],
  review: [
    'Fetch @sai/orchestration/workers/bindings/review-worker.md and use it.',
    'Fetch @sai/commands/review/coordinator.md and follow those instructions exactly.',
  ],
  security: [
    'Fetch @sai/orchestration/workers/bindings/security-worker.md and use it.',
    'Fetch @sai/commands/security/coordinator.md and follow those instructions exactly.',
  ],
  performance: [
    'Fetch @sai/orchestration/workers/bindings/performance-worker.md and use it.',
    'Fetch @sai/commands/performance/coordinator.md and follow those instructions exactly.',
  ],
  accessibility: [
    'Fetch @sai/orchestration/workers/bindings/accessibility-worker.md and use it.',
    'Fetch @sai/commands/accessibility/coordinator.md and follow those instructions exactly.',
  ],
  explore: ['Fetch @sai/orchestration/workers/bindings/design-worker.md and use it.'],
};

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function fetchLines(source) {
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('Fetch @'));
}

test('exactly 15 harness-neutral launcher cards exist and budget has none', () => {
  const actual = [];
  for (const [, folder] of commands) {
    const relative = `sai/commands/${folder}/launcher.md`;
    assert.equal(fs.existsSync(path.join(repoRoot, relative)), true, `${relative} should exist`);
    actual.push(relative);
  }
  assert.equal(actual.length, 15);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'budget', 'launcher.md')), false);
});

test('launcher content is exact, ordered, and harness-neutral', () => {
  for (const [, folder] of commands) {
    const source = read(`sai/commands/${folder}/launcher.md`);
    assert.doesNotMatch(source, /claude|opencode/i, `${folder} launcher must be harness-neutral`);
    assert.doesNotMatch(source, /@sai\/adapters\//, `${folder} launcher must not fetch an adapter`);
    assert.doesNotMatch(source, /InvocationEnvelope|command_name|wrapper_echo_value|arguments_value/);
    if (emptyLaunchers.has(folder)) {
      assert.deepEqual(fetchLines(source), [], `${folder} launcher must remain near-empty`);
    } else {
      assert.deepEqual(fetchLines(source), movedDirectives[folder], `${folder} launcher directive order`);
    }
  }
});

test('baseline fixture records every unchanged wrapper directive inventory', () => {
  const fixture = JSON.parse(read('fixtures/thin-command-wrappers-baseline.json'));
  assert.deepEqual(fixture.command_files, commands.map(([file]) => file));
  for (const harness of ['claude', 'opencode']) {
    for (const [file] of commands) {
      assert.deepEqual(
        fetchLines(read(`commands/${harness}/${file}`)),
        fixture.wrappers[harness][file],
        `${harness}/${file} must match the captured pre-change directive inventory`,
      );
    }
  }
});

test('Command Launcher glossary term and relationship remain canonical', () => {
  const glossary = read('GLOSSARY.md');
  assert.match(glossary, /\*\*Command Launcher\*\*: "The harness-neutral per-command card at `sai\/commands\/\{name\}\/launcher\.md`/);
  assert.match(glossary, /- A \*\*Command Launcher\*\* is loaded by one \/sai-\* wrapper after its \*\*Harness Boot Adapter\*\*/);
});

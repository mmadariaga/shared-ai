'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installProjection } = require('../bin/install-flow.js');
const { STRATEGIES, validateManifest, loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const WORKER_NAMES = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];

function claudeSourceBytes() {
  return '---\ndescription: Source command\nmodel: source-model\neffort: source-effort\n---\n\nSource body.\n';
}

function tunedClaudeDestBytes() {
  return '---\ndescription: Dest command\nmodel: tuned-model\neffort: tuned-effort\n---\n\nDest body.\n';
}

function tunableSeedProjection(dir) {
  const sourcePath = path.join(dir, 'source.md');
  const destinationPath = path.join(dir, 'installed', 'wrapper.md');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  return { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
}

function agentDestinationRoots(prefix) {
  return {
    commands: path.join(prefix, 'commands'),
    sai: path.join(prefix, 'sai'),
    skills: path.join(prefix, 'skills'),
    agents: path.join(prefix, 'agents'),
    config: path.join(prefix, 'config'),
  };
}

function agentRule(id) {
  return {
    id,
    source: 'agents/claude/sai-5-review-worker.md',
    destination: { class: 'agents', path: 'sai-5-review-worker.md' },
    harnesses: ['claude'],
    strategy: 'owned-copy',
    recursive: false,
    include: ['**/*.md'],
    exclude: [],
    ownership: 'owned',
    drift: 'content',
  };
}

test('tunable-seed passes validation', () => {
  assert.ok(STRATEGIES && STRATEGIES.includes('tunable-seed'),
    'STRATEGIES should include the tunable-seed strategy');
  const rule = {
    id: 'test-tunable-seed-rule',
    source: 'commands/claude/wrapper.md',
    destination: { class: 'root', path: 'claude/commands/wrapper.md' },
    harnesses: ['claude'],
    strategy: 'tunable-seed',
    recursive: false,
    include: ['**/*.md'],
    exclude: [],
    ownership: 'managed',
    drift: 'content',
  };
  assert.equal(typeof validateManifest, 'function', 'validateManifest should be exported');
  assert.doesNotThrow(() => validateManifest(rule),
    'a rule with strategy tunable-seed should pass manifest validation');
});

test('tunable-seed routes to the dedicated installer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-route-'));
  try {
    const projection = tunableSeedProjection(dir);
    fs.writeFileSync(projection.sourcePath, claudeSourceBytes());
    fs.writeFileSync(projection.destinationPath, tunedClaudeDestBytes());
    assert.doesNotThrow(() => installProjection(projection, dir),
      'installProjection should accept a tunable-seed projection without throwing');
    const dest = fs.readFileSync(projection.destinationPath, 'utf8');
    assert.ok(dest.includes('model: tuned-model'),
      'the destination model line should retain its pre-install value');
    assert.ok(dest.includes('effort: tuned-effort'),
      'the destination effort line should retain its pre-install value');
    assert.ok(dest.includes('description: Source command'),
      'the destination non-tunable frontmatter should come from the source');
    assert.ok(dest.includes('Source body.'), 'the destination body should come from the source');
    assert.ok(!dest.includes('Dest body.'), 'the old destination body should not survive');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the manifest declares 17 tunable-seed managed agent projections', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = agentDestinationRoots(path.join(os.tmpdir(), 'sai-agent-projection-17'));
  const allAgentProjections = [];
  const opencodeBasenames = [...WORKER_NAMES, 'explore', 'executor', 'budget'];
  for (const harness of ['claude', 'opencode']) {
    const agentProjections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents));
    const expectedCount = harness === 'opencode' ? 10 : 7;
    const expectedBasenames = harness === 'opencode' ? opencodeBasenames : WORKER_NAMES;
    assert.equal(agentProjections.length, expectedCount,
      `the manifest should declare exactly ${expectedCount} agent projections for ${harness}`);
    assert.ok(agentProjections.every(projection => projection.strategy === 'tunable-seed'),
      `every ${harness} agent projection should use the tunable-seed strategy`);
    assert.ok(agentProjections.every(projection => projection.ownership === 'managed'),
      `every ${harness} agent projection should be managed`);
    assert.deepEqual(
      agentProjections.map(projection => path.basename(projection.destinationPath, '.md')).sort(),
      [...expectedBasenames].sort(),
      harness === 'opencode'
        ? `${harness} agent projections should cover the seven sai worker filenames plus explore, executor, and budget`
        : `${harness} agent projections should cover the seven sai worker filenames`);
    allAgentProjections.push(...agentProjections);
  }
  assert.equal(allAgentProjections.length, 17,
    'the manifest should declare 17 managed agent projections across both harnesses');
});

test('no managed agent projection declares owned-copy', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const agentRules = manifest.projections
    .filter(projection => projection.destination && projection.destination.class === 'agents');
  assert.equal(agentRules.length, 17,
    'the manifest should declare 17 agent-class projections');
  assert.ok(agentRules.every(projection => projection.strategy !== 'owned-copy'),
    'no managed agent projection may declare the retired owned-copy strategy');
});

test('validateManifest rejects the retired owned-copy strategy', () => {
  assert.throws(
    () => validateManifest(agentRule('claude-sai-5-review-worker')),
    error => {
      const message = String(error && error.message || error);
      return message.includes('claude-sai-5-review-worker') &&
        /invalid|unsupported|unknown|not supported|retired/i.test(message);
    },
    'validateManifest should throw naming the projection id and the invalid strategy'
  );
});

test('installProjection throws on the retired owned-copy strategy', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-strategy-owned-copy-'));
  try {
    const sourcePath = path.join(dir, 'source.md');
    const destinationPath = path.join(dir, 'installed', 'wrapper.md');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(sourcePath, claudeSourceBytes());
    const projection = { strategy: 'owned-copy', harness: 'claude', sourcePath, destinationPath };
    assert.throws(
      () => installProjection(projection, dir),
      error => String(error && error.message || error).includes('owned-copy'),
      'installProjection should throw naming the retired strategy');
    assert.equal(fs.existsSync(destinationPath), false,
      'a rejected owned-copy projection must not write its destination');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

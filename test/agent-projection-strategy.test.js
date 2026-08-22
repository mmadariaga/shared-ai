'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installProjection, installClaude, installOpencode } = require('../bin/install-flow.js');
const { STRATEGIES, validateManifest, loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const WORKER_NAMES = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
  'sai-commit-worker',
  'sai-archive-worker',
  'sai-backfill-worker',
];

const APPLY_WORKER_NAMES = ['sai-4-red-worker', 'sai-4-green-worker'];

const ALL_WORKER_NAMES = [...WORKER_NAMES, ...APPLY_WORKER_NAMES,
  'sai-autofast-implement-worker', 'sai-autofast-hands-worker'];

const CLAUDE_GENERIC_AGENTS = ['budget-explorer', 'budget-executor', 'budget-subagent'];

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
    root: path.join(prefix, 'config'),
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

test('the manifest declares 28 matrix tunable-seed managed agent projections', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = agentDestinationRoots(path.join(os.tmpdir(), 'sai-agent-projection-18'));
  const allAgentProjections = [];
  for (const harness of ['claude', 'opencode']) {
    const allAgents = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents));
    const agentProjections = allAgents
      .filter(projection => ALL_WORKER_NAMES.includes(path.basename(projection.destinationPath, '.md')));
    assert.equal(agentProjections.length, 14,
      `the manifest should declare exactly 14 matrix agent projections for ${harness}`);
    assert.ok(agentProjections.every(projection => projection.strategy === 'tunable-seed'),
      `every ${harness} matrix agent projection should use the tunable-seed strategy`);
    assert.ok(agentProjections.every(projection => projection.ownership === 'managed'),
      `every ${harness} matrix agent projection should be managed`);
    assert.deepEqual(
      agentProjections.map(projection => path.basename(projection.destinationPath, '.md')).sort(),
      [...ALL_WORKER_NAMES].sort(),
      `${harness} matrix agent projections should cover exactly the fourteen worker identities`);
    assert.ok(allAgents.every(projection => projection.strategy === 'tunable-seed'),
      `every ${harness} agent projection, matrix and support alike, should use the tunable-seed strategy`);
    allAgentProjections.push(...agentProjections);
  }
  assert.equal(allAgentProjections.length, 28,
    'the manifest should declare 28 matrix managed agent projections across both harnesses');
});

test('the manifest declares exactly 34 tunable-seed agents projections, exactly 17 targeting Claude', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const agentRules = manifest.projections
    .filter(projection => projection.destination && projection.destination.class === 'agents');
  const tunableAgentRules = agentRules.filter(projection => projection.strategy === 'tunable-seed');
  assert.equal(tunableAgentRules.length, 34,
    'the manifest should declare exactly 34 tunable-seed agent-class projections');
  assert.equal(
    tunableAgentRules.filter(projection => projection.harnesses.includes('claude')).length, 17,
    'exactly 17 tunable-seed agent-class projections should target Claude');
  assert.equal(
    tunableAgentRules.filter(projection => projection.harnesses.includes('opencode')).length, 17,
    'exactly 17 tunable-seed agent-class projections should target opencode');
});

test('the three new Claude generic-agent projections are Claude-only, destination-unique, and tunable-seed', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const agentRules = manifest.projections
    .filter(projection => projection.destination && projection.destination.class === 'agents');
  const claudeAgentRules = agentRules.filter(projection => projection.harnesses.includes('claude'));
  const claudeBasenames = claudeAgentRules.map(projection => path.basename(projection.destination.path, '.md'));
  for (const name of CLAUDE_GENERIC_AGENTS) {
    assert.equal(
      agentRules.filter(projection => path.basename(projection.destination.path, '.md') === name).length, 1,
      `the ${name} Claude destination basename should occur exactly once across the manifest`);
    assert.ok(claudeBasenames.includes(name), `Claude should declare a ${name} agent projection`);
  }
  for (const rule of claudeAgentRules) {
    assert.equal(rule.strategy, 'tunable-seed',
      `every Claude agent projection, including ${rule.id}, should use the tunable-seed strategy`);
  }
});

test('no Claude agent projection field names a tunable key', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const claudeAgentRules = manifest.projections
    .filter(projection => projection.destination && projection.destination.class === 'agents' &&
      projection.harnesses.includes('claude'));
  for (const rule of claudeAgentRules) {
    for (const key of ['model', 'effort']) {
      assert.equal(Object.hasOwn(rule, key), false,
        `the ${rule.id} agent projection must not carry a ${key} field`);
    }
  }
});

test('no managed agent projection declares owned-copy', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const agentRules = manifest.projections
    .filter(projection => projection.destination && projection.destination.class === 'agents');
  const matrixAgentRules = agentRules.filter(projection => projection.matrix);
  assert.equal(matrixAgentRules.length, 28,
    'the manifest should declare 28 matrix agent-class projections (fourteen per harness)');
  assert.equal(
    matrixAgentRules.filter(projection => projection.harnesses.includes('claude')).length, 14,
    'claude should declare exactly fourteen matrix agent projections');
  assert.equal(
    matrixAgentRules.filter(projection => projection.harnesses.includes('opencode')).length, 14,
    'opencode should declare exactly fourteen matrix agent projections');
  for (const name of ['explore', 'executor', 'budget']) {
    assert.ok(agentRules.some(projection => projection.destination.path.endsWith(`${name}.md`)),
      `opencode should retain its regular ${name} support agent projection`);
  }
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

test('the apply worker agents are tunable-seed managed projections in both harnesses', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const destinationRoot = agentDestinationRoots(path.join(os.tmpdir(), 'sai-apply-projection-'));
  for (const harness of ['claude', 'opencode']) {
    const allAgents = expandInstallManifest(manifest, { harness, repoRoot: path.join(__dirname, '..'), destinationRoot })
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents));
    for (const name of APPLY_WORKER_NAMES) {
      const projection = allAgents.find(candidate =>
        path.basename(candidate.destinationPath, '.md') === name);
      assert.ok(projection, `${harness} should declare the ${name} matrix agent projection`);
      assert.equal(projection.strategy, 'tunable-seed',
        `${harness} ${name} should use the tunable-seed strategy`);
      assert.equal(projection.ownership, 'managed',
        `${harness} ${name} should be a managed projection`);
      assert.equal(projection.harness, harness,
        `${harness} ${name} should target its own harness`);
    }
  }
});

test('apply agents resolve per-harness budget-tier model configuration, not the routed-phase tier', () => {
  const tuningOf = text => {
    const model = (text.match(/^model:\s*(.+)$/m) || [])[1];
    const tierLine = (text.match(/^(?:variant|effort|mode):\s*(.+)$/m) || [])[1];
    return `${model}|${tierLine}`;
  };
  const applyTiers = {};
  for (const [harness, install] of [['claude', installClaude], ['opencode', installOpencode]]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-apply-tier-${harness}-`));
    try {
      install(base);
      const textOf = name => {
        const agentPath = path.join(base, 'agents', `${name}.md`);
        assert.ok(fs.existsSync(agentPath),
          `${harness} should install the ${name} managed agent`);
        return fs.readFileSync(agentPath, 'utf8');
      };
      const routedTier = tuningOf(textOf('sai-1-spec-proposal-worker'));
      for (const name of APPLY_WORKER_NAMES) {
        const tier = tuningOf(textOf(name));
        applyTiers[`${harness}/${name}`] = tier;
        assert.notEqual(tier, routedTier,
          `${harness} ${name} must not reuse the standard routed-phase model/tuning tier`);
      }
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
  assert.notEqual(applyTiers['claude/sai-4-red-worker'], applyTiers['opencode/sai-4-red-worker'],
    'the RED apply agent must resolve its own harness budget tier with no universal pinned model identifier');
  assert.notEqual(applyTiers['claude/sai-4-green-worker'], applyTiers['opencode/sai-4-green-worker'],
    'the GREEN apply agent must resolve its own harness budget tier with no universal pinned model identifier');
});

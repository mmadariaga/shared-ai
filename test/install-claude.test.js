'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  installClaude,
  MANAGED_WORKERS,
  CLAUDE_SPEC_WORKER_AGENT,
  CLAUDE_SPEC_WORKER_OWNER,
  CLAUDE_DESIGN_WORKER_AGENT,
  CLAUDE_DESIGN_WORKER_OWNER,
  CLAUDE_IMPLEMENTATION_WORKER_AGENT,
  CLAUDE_IMPLEMENTATION_WORKER_OWNER,
  CLAUDE_REVIEW_WORKER_AGENT,
  CLAUDE_REVIEW_WORKER_OWNER,
  OWNER_BY_CLAUDE_AGENT,
} = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

test('managed worker registry defines every Claude compatibility export', () => {
  assert.ok(MANAGED_WORKERS, 'MANAGED_WORKERS should be exported');

  const expectedNames = [
    'sai-3-implementation-worker',
    'sai-2-design-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-1-spec-proposal-worker',
  ];
  assert.deepEqual(Object.keys(MANAGED_WORKERS), expectedNames,
    'registry keys should contain each managed worker exactly once');

  const expectedClaude = {
    'sai-1-spec-proposal-worker': {
      agent: 'sai-1-spec-proposal-worker.md',
      owner: '.sai-1-spec-proposal-worker.owner.json',
    },
    'sai-2-design-worker': {
      agent: 'sai-2-design-worker.md',
      owner: '.sai-2-design-worker.owner.json',
    },
    'sai-3-implementation-worker': {
      agent: 'sai-3-implementation-worker.md',
      owner: '.sai-3-implementation-worker.owner.json',
    },
    'sai-5-review-worker': {
      agent: 'sai-5-review-worker.md',
      owner: '.sai-5-review-worker.owner.json',
    },
    'sai-6-security-worker': {
      agent: 'sai-6-security-worker.md',
      owner: '.sai-6-security-worker.owner.json',
    },
  };

  for (const [name, claude] of Object.entries(expectedClaude)) {
    assert.deepEqual(MANAGED_WORKERS[name].claude, claude, `${name} Claude metadata should remain stable`);
  }
  assert.equal(Object.hasOwn(MANAGED_WORKERS['sai-1-spec-proposal-worker'], 'opencode'), false,
    'the spec worker should remain Claude-only');

  assert.equal(CLAUDE_SPEC_WORKER_AGENT, 'sai-1-spec-proposal-worker.md');
  assert.equal(CLAUDE_SPEC_WORKER_OWNER, '.sai-1-spec-proposal-worker.owner.json');
  assert.equal(CLAUDE_DESIGN_WORKER_AGENT, 'sai-2-design-worker.md');
  assert.equal(CLAUDE_DESIGN_WORKER_OWNER, '.sai-2-design-worker.owner.json');
  assert.equal(CLAUDE_IMPLEMENTATION_WORKER_AGENT, 'sai-3-implementation-worker.md');
  assert.equal(CLAUDE_IMPLEMENTATION_WORKER_OWNER, '.sai-3-implementation-worker.owner.json');
  assert.equal(CLAUDE_REVIEW_WORKER_AGENT, 'sai-5-review-worker.md');
  assert.equal(CLAUDE_REVIEW_WORKER_OWNER, '.sai-5-review-worker.owner.json');
  assert.deepEqual(OWNER_BY_CLAUDE_AGENT, {
    'sai-1-spec-proposal-worker.md': '.sai-1-spec-proposal-worker.owner.json',
    'sai-2-design-worker.md': '.sai-2-design-worker.owner.json',
    'sai-3-implementation-worker.md': '.sai-3-implementation-worker.owner.json',
    'sai-5-review-worker.md': '.sai-5-review-worker.owner.json',
    'sai-6-security-worker.md': '.sai-6-security-worker.owner.json',
  });
});

test('installClaude copies commands/claude/*.md to dest/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const cmdDir = path.join(tmpDir, 'commands');
  assert.ok(fs.existsSync(cmdDir), 'commands/ dir should exist');
  const files = fs.readdirSync(cmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in commands/');
  assert.ok(files.includes('budget.md'), 'budget.md should be in commands/');
  const design = fs.readFileSync(path.join(cmdDir, 'sai-2-design.md'), 'utf8');
  assert.match(design, /^model: claude-opus-4-8$/m);
  assert.match(design, /^effort: low$/m);
  assert.match(design, /^allowed-tools: Skill, Agent, SendMessage, AskUserQuestion$/m);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies sai/commands/*.md to dest/sai/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const saiCmdDir = path.join(tmpDir, 'sai', 'commands');
  assert.ok(fs.existsSync(saiCmdDir), 'sai/commands/ dir should exist');
  const files = fs.readdirSync(saiCmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in sai/commands/');
  for (const file of [path.join('design', 'coordinator.md'), path.join('design', 'invocation.md'), path.join('implement', 'coordinator.md'), path.join('implement', 'invocation.md')]) {
    assert.ok(fs.existsSync(path.join(saiCmdDir, file)), `${file} should be projected`);
  }
  for (const file of ['sai-2-design.md', 'sai-3-implement.md']) {
    assert.equal(fs.existsSync(path.join(saiCmdDir, file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies all standalone policies to dest/sai/policies/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  for (const file of ['artifact-feedback-gate.md', 'change-picker.md', 'commit-rules.md', 'prereqs.md', 'status-picker.md']) {
    assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'policies', file)), `${file} should be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude projects the canonical ADR template and removes former compatibility destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'instructions', '_templates', 'adr-index.md')));
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', '_templates', 'adr-index.md')), false);
  for (const file of ['sai-2-design-core.md', 'sai-3-implementation-core.md', 'implement-invocation.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude does not project the Copilot inline orchestration adapter', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'inline-invocation.md')), false);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies all Claude-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-subagent', 'SKILL.md')), 'skills/budget-subagent/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Claude');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude projects the routed spec coordinator, binding, skill, and agent', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-spec-'));
  try {
    installClaude(tmpDir);
    for (const file of [
      path.join('sai', 'commands', 'spec', 'coordinator.md'),
      path.join('sai', 'orchestration', 'workers', 'bindings', 'claude', 'spec-worker.md'),
      path.join('skills', 'sai-1-spec-proposal-worker', 'SKILL.md'),
      path.join('agents', 'sai-1-spec-proposal-worker.md'),
    ]) assert.ok(fs.existsSync(path.join(tmpDir, file)), `${file} should be projected`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Claude worker ownership is collision-safe', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-review-ownership-'));
  const repoRoot = path.join(__dirname, '..');
  try {
    const manifest = loadInstallManifest(repoRoot);
    const destinationRoot = {
      commands: path.join(tmpDir, 'commands'),
      sai: path.join(tmpDir, 'sai'),
      skills: path.join(tmpDir, 'skills'),
      agents: path.join(tmpDir, 'agents'),
      config: tmpDir,
    };
    const owned = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot })
      .filter(projection => projection.strategy === 'owned-copy');
    assert.ok(owned.length > 0, 'the manifest should declare owned-copy workers');

    installClaude(tmpDir);
    for (const projection of owned) {
      assert.ok(fs.existsSync(projection.destinationPath), `owned worker should be installed: ${projection.destinationPath}`);
      const ownerPath = path.join(
        path.dirname(projection.destinationPath),
        `.${path.basename(projection.destinationPath, '.md')}.owner.json`
      );
      assert.ok(fs.existsSync(ownerPath),
        `owned worker should have a sidecar: ${projection.destinationPath}`);
    }

    const spec = owned.find(projection => projection.sourcePath.endsWith(path.join('sai-1-spec-proposal-worker.md')));
    assert.ok(spec, 'the manifest should declare the spec owned-copy worker');
    assert.ok(fs.existsSync(path.join(tmpDir, 'agents', '.sai-1-spec-proposal-worker.owner.json')),
      'spec worker should map to its own owner sidecar');
    assert.equal(fs.existsSync(path.join(tmpDir, 'agents', '.sai-2-design-worker.owner.json')), true,
      'spec worker must never use the design owner sidecar');

    const review = owned.find(projection => projection.sourcePath.endsWith(path.join('sai-5-review-worker.md')));
    assert.ok(review, 'the manifest should declare the review owned-copy worker');
    assert.ok(fs.existsSync(path.join(tmpDir, 'agents', '.sai-5-review-worker.owner.json')),
      'review worker should map to its own owner sidecar');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Every owned worker resolves to its owner sidecar and rejects an incompatible agent', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-review-collision-'));
  const agentPath = path.join(tmpDir, 'agents', 'sai-5-review-worker.md');
  const sentinel = 'user-owned incompatible review worker\n';
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, sentinel);
    assert.throws(() => installClaude(tmpDir), /collision|rename|remove|ownership/i);
    assert.equal(fs.readFileSync(agentPath, 'utf8'), sentinel, 'incompatible content must not be overwritten');

    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    installClaude(tmpDir);
    const reviewBytes = fs.readFileSync(agentPath);
    fs.unlinkSync(path.join(tmpDir, 'agents', '.sai-5-review-worker.owner.json'));
    installClaude(tmpDir);
    assert.deepEqual(fs.readFileSync(agentPath), reviewBytes, 'exact-compatible content should be reused');
    assert.equal(fs.existsSync(path.join(tmpDir, 'agents', '.sai-5-review-worker.owner.json')), false,
      'exact-compatible unowned content should not gain a sidecar');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installClaude overwrites existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old sentinel content');
  installClaude(tmpDir);
  const expected = fs.readFileSync(path.join(__dirname, '..', 'commands', 'claude', 'sai-1-spec.md'), 'utf8');
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), expected, 'existing vendor command should be overwritten with repo version');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude overwrites stale command wrappers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  installClaude(tmpDir);
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing stale file should be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude reuses compatible unowned worker content without recreating ownership', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  try {
    installClaude(tmpDir);
    const agentPath = path.join(tmpDir, 'agents', 'sai-3-implementation-worker.md');
    const sidecarPath = path.join(tmpDir, 'agents', '.sai-3-implementation-worker.owner.json');
    const beforeBytes = fs.readFileSync(agentPath);
    fs.unlinkSync(sidecarPath);

    installClaude(tmpDir);

    assert.deepEqual(fs.readFileSync(agentPath), beforeBytes, 'compatible unowned worker bytes should remain unchanged');
    assert.equal(fs.existsSync(sidecarPath), false, 'compatible unowned worker should remain unowned');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

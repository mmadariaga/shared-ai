'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const { installClaude, installOpencode, installCopilot, MANAGED_WORKERS } = require('../bin/install-flow.js');
const { enumerateClaude, enumerateOpencode, enumerateCopilot, buildDeletionSet, runDeletion } = require('../bin/uninstall-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

function inventoryRoots(base, harness) {
  if (harness === 'copilot') {
    return {
      commands: path.join(base, 'prompts'),
      sai: path.join(base, 'sai'),
      skills: path.join(base, 'skills'),
      agents: path.join(base, 'agents'),
      config: path.join(base, 'sai'),
    };
  }
  return {
    commands: path.join(base, 'commands'),
    sai: path.join(base, 'sai'),
    skills: path.join(base, 'skills'),
    agents: path.join(base, 'agents'),
    config: base,
  };
}

function normalizeInventoryDestination(destination, destinationRoot) {
  const root = Object.entries(destinationRoot)
    .sort((left, right) => right[1].length - left[1].length)
    .find(([, candidate]) => {
      const relative = path.relative(candidate, destination);
      return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
    });
  assert.ok(root, `destination should be under an install root: ${destination}`);
  return `${root[0]}/${path.relative(root[1], destination).split(path.sep).join('/')}`;
}

function managedWorkerSourcePaths(repoRoot) {
  const workerStems = {
    'sai-3-implementation-worker': 'implementation-worker',
    'sai-2-design-worker': 'design-worker',
    'sai-5-review-worker': 'review-worker',
    'sai-1-spec-proposal-worker': 'spec-worker',
    'sai-6-security-worker': 'security-worker',
    'sai-7-performance-worker': 'performance-worker',
  };
  return new Set(Object.entries(MANAGED_WORKERS).flatMap(([name, worker]) => [
    `sai/orchestration/workers/bindings/claude/${workerStems[name]}.md`,
    `sai/orchestration/workers/bindings/opencode/${workerStems[name]}.md`,
    `skills/claude/${name}/SKILL.md`,
    `skills/opencode/${name}/SKILL.md`,
    `agents/claude/${worker.claude.agent}`,
  ].map(source => path.resolve(repoRoot, source))));
}

test('managed worker source enumeration resolves the security worker stem', () => {
  const repoRoot = path.join(__dirname, '..');
  const sources = managedWorkerSourcePaths(repoRoot);
  for (const source of [
    'sai/orchestration/workers/bindings/claude/security-worker.md',
    'sai/orchestration/workers/bindings/opencode/security-worker.md',
    'skills/claude/sai-6-security-worker/SKILL.md',
    'skills/opencode/sai-6-security-worker/SKILL.md',
    'agents/claude/sai-6-security-worker.md',
  ]) {
    assert.equal(sources.has(path.resolve(repoRoot, source)), true, `should enumerate ${source}`);
  }
});

test('install and uninstall inventories are exact and deterministic for every harness', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const cases = [
    {
      harness: 'claude',
      install: (base) => installClaude(base),
      enumerate: (base) => enumerateClaude(base),
    },
    {
      harness: 'opencode',
      install: (base) => installOpencode(base),
      enumerate: (base) => enumerateOpencode(base),
    },
    {
      harness: 'copilot',
      install: (base, roots) => installCopilot(roots.commands, roots.skills, roots.agents, roots.sai),
      enumerate: (base, roots) => enumerateCopilot(roots.commands, roots.skills, roots.agents, roots.sai),
    },
  ];

  for (const { harness, install, enumerate } of cases) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-inventory-${harness}-`));
    const destinationRoot = inventoryRoots(base, harness);
    try {
      install(base, destinationRoot);
      const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
      const activeDestinations = active.map(projection => projection.destinationPath);
      for (const projection of active.filter(item => item.strategy === 'owned-copy')) {
        activeDestinations.push(path.join(path.dirname(projection.destinationPath),
          `.${path.basename(projection.destinationPath, '.md')}.owner.json`));
      }
      const normalize = destinations => destinations
        .map(destination => normalizeInventoryDestination(destination, destinationRoot))
        .sort();
      const normalizedActive = normalize(activeDestinations);
      const entries = enumerate(base, destinationRoot);
      const normalizedUninstall = normalize(entries
        .filter(entry => entry.assetType !== 'retired-managed-file')
        .map(entry => entry.dest));
      assert.deepEqual(normalizedUninstall, normalizedActive, `${harness} uninstall inventory should match install inventory`);
      assert.equal(new Set(normalizedUninstall).size, normalizedUninstall.length,
        `${harness} uninstall destinations should be unique`);
      assert.deepEqual(normalizedUninstall, [...normalizedUninstall].sort(),
        `${harness} uninstall destinations should have deterministic order`);
      const second = normalize(enumerate(base, destinationRoot)
        .filter(entry => entry.assetType !== 'retired-managed-file')
        .map(entry => entry.dest));
      assert.deepEqual(normalizedUninstall, second, `${harness} uninstall enumeration should be deterministic`);

      if (harness === 'claude') {
        const managedAgents = entries.filter(entry => entry.assetType === 'claude-managed-agent');
        assert.equal(managedAgents.length, Object.keys(MANAGED_WORKERS).length);
        for (const worker of Object.values(MANAGED_WORKERS)) {
          const agentPath = path.join(destinationRoot.agents, worker.claude.agent);
          const entry = managedAgents.find(candidate => candidate.dest === agentPath);
          assert.ok(entry, `Claude should enumerate ${worker.claude.agent}`);
          assert.equal(entry.ownerPath, path.join(destinationRoot.agents, worker.claude.owner));
        }
      }

      if (harness === 'copilot') {
        const workerSources = managedWorkerSourcePaths(repoRoot);
        assert.equal(entries.some(entry => workerSources.has(entry.src)), false,
          'Copilot enumeration must exclude managed worker bindings, forwarding skills, and Claude agents');
      }
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

function walkFiles(dir) {
  const result = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        result.push(full);
      }
    }
  }
  walk(dir);
  return result;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function writtenMinusVersion(tmpDir) {
  return walkFiles(tmpDir).map(f => path.relative(tmpDir, f)).filter(f => f !== '.version');
}

test('enumerateClaude dests match installClaude written files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installClaude(tmpDir);
    const written = writtenMinusVersion(tmpDir);
    const entries = enumerateClaude(tmpDir);
    const enumeratedDests = entries.filter(e => e.assetType !== 'retired-managed-file').map(e => path.relative(tmpDir, e.dest));
    assert.deepEqual([...written].sort(), [...enumeratedDests].sort());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateOpencode dests match installOpencode written files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installOpencode(tmpDir);
    const written = writtenMinusVersion(tmpDir);
    const entries = enumerateOpencode(tmpDir);
    const enumeratedDests = entries.filter(e => e.assetType !== 'retired-managed-file').map(e => path.relative(tmpDir, e.dest));
    assert.deepEqual([...written].sort(), [...enumeratedDests].sort());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateCopilot dests match installCopilot written files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    const written = writtenMinusVersion(tmpDir);
    const entries = enumerateCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    const enumeratedDests = entries.filter(e => e.assetType !== 'retired-managed-file').map(e => path.relative(tmpDir, e.dest));
    assert.deepEqual([...written].sort(), [...enumeratedDests].sort());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateClaude src sha256 matches installed dest sha256', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installClaude(tmpDir);
    const entries = enumerateClaude(tmpDir);
    assert.ok(entries.length > 0, 'enumerateClaude should return entries after install');
    for (const { src, dest, assetType } of entries) {
      if (assetType === 'retired-managed-file') continue;
      assert.equal(sha256(src), sha256(dest), `sha256 mismatch: ${src} -> ${dest}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateOpencode src sha256 matches installed dest sha256', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installOpencode(tmpDir);
    const entries = enumerateOpencode(tmpDir);
    assert.ok(entries.length > 0, 'enumerateOpencode should return entries after install');
    for (const { src, dest, assetType } of entries) {
      if (assetType === 'retired-managed-file') continue;
      assert.equal(sha256(src), sha256(dest), `sha256 mismatch: ${src} -> ${dest}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumerateCopilot src sha256 matches installed dest sha256', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    installCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    const entries = enumerateCopilot(tmpDir, tmpDir, tmpDir, tmpDir);
    assert.ok(entries.length > 0, 'enumerateCopilot should return entries after install');
    for (const { src, dest, assetType } of entries) {
      if (assetType === 'retired-managed-file') continue;
      assert.equal(sha256(src), sha256(dest), `sha256 mismatch: ${src} -> ${dest}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enumeration includes retirement records but excludes them from active projections', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    const entries = enumerateOpencode(tmpDir);
    const retired = entries.filter(e => e.assetType === 'retired-managed-file');
    assert.deepEqual(retired.map(e => path.relative(tmpDir, e.dest)).sort(), [
      path.join('sai', 'commands', 'sai-2-design.md'),
      path.join('sai', 'commands', 'sai-2-design-inline.md'),
      path.join('sai', 'commands', 'sai-3-implement.md'),
      path.join('sai', 'commands', 'sai-3-implement-inline.md'),
      path.join('sai', 'compat', '_templates', 'adr-index.md'),
      path.join('sai', 'compat', 'sai-2-design-core.md'),
      path.join('sai', 'compat', 'sai-3-implementation-core.md'),
    ].sort());
    for (const entry of retired) {
      assert.ok(Array.isArray(entry.acceptedHashes));
      assert.ok(entry.acceptedHashes.length > 0);
       assert.match(entry.ruleId, /^retired-/);
    }
    assert.equal(entries.some(e => e.assetType !== 'retired-managed-file' && e.dest.endsWith('sai-2-design-inline.md')), false);
    assert.equal(entries.some(e => e.assetType !== 'retired-managed-file' && e.dest.endsWith('sai-3-implement-inline.md')), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('buildDeletionSet excludes opencode.json/opencode.jsonc paths', () => {
  const entries = buildDeletionSet();
  const hasConfigPath = entries.some(e =>
    e.dest.endsWith('opencode.json') || e.dest.endsWith('opencode.jsonc')
  );
  assert.ok(!hasConfigPath, 'buildDeletionSet should not include opencode config paths');
});

test('enumerateClaude does not error with default paths (no manifest)', () => {
  assert.doesNotThrow(() => {
    const result = enumerateClaude();
    assert.ok(Array.isArray(result));
  });
});

test('enumerateOpencode does not error with default paths (no manifest)', () => {
  assert.doesNotThrow(() => {
    const result = enumerateOpencode();
    assert.ok(Array.isArray(result));
  });
});

test('enumerateCopilot does not error with default paths (no manifest)', () => {
  assert.doesNotThrow(() => {
    const result = enumerateCopilot();
    assert.ok(Array.isArray(result));
  });
});

test('Step 4 incompatible Claude performance agents remain protected during install and uninstall', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-performance-collision-'));
  const agent = path.join(base, 'agents', 'sai-7-performance-worker.md');
  const owner = path.join(base, 'agents', '.sai-7-performance-worker.owner.json');
  const sentinel = 'user-owned incompatible performance worker\n';
  try {
    fs.mkdirSync(path.dirname(agent), { recursive: true });
    fs.writeFileSync(agent, sentinel);
    assert.throws(() => installClaude(base), /collision|incompatible|ownership|rename|remove/i);
    assert.equal(fs.readFileSync(agent, 'utf8'), sentinel);
    assert.equal(fs.existsSync(owner), false, 'blocked installation must not create an owner sidecar');
    runDeletion(enumerateClaude(base));
    assert.equal(fs.readFileSync(agent, 'utf8'), sentinel, 'guarded uninstall must preserve user-owned content');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('Step 4 proven managed performance agent and owner sidecar are removed together', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-performance-managed-'));
  try {
    installClaude(base);
    const agent = path.join(base, 'agents', 'sai-7-performance-worker.md');
    const owner = path.join(base, 'agents', '.sai-7-performance-worker.owner.json');
    assert.equal(fs.existsSync(agent), true, 'managed performance agent should be installed');
    assert.equal(fs.existsSync(owner), true, 'managed performance owner sidecar should be installed');
    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(agent), false);
    assert.equal(fs.existsSync(owner), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

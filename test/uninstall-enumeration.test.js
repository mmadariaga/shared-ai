'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const { installClaude, installOpencode, MANAGED_WORKERS } = require('../bin/install-flow.js');
const { enumerateClaude, enumerateOpencode, buildDeletionSet, runDeletion } = require('../bin/uninstall-flow.js');
const { loadInstallManifest, expandInstallManifest, expandRetirementManifest } = require('../bin/install-manifest.js');

const STEP3_SUPERSEDED_UTILITIES = ['apply', 'archive', 'backfill', 'commit', 'explore', 'pr', 'status', 'worktree'];
const STEP3_SUPERSEDED_WORKERS = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];
const STEP3_SUPERSEDED_DESTINATIONS = [
  ...STEP3_SUPERSEDED_UTILITIES.map(name =>
    path.join('sai', 'commands', name === 'apply' ? 'sai-4-apply.md' : `sai-${name}.md`)),
  path.join('sai', 'orchestration', 'coordinator-contract.md'),
  path.join('sai', 'orchestration', 'worker-lifecycle.md'),
  ...STEP3_SUPERSEDED_WORKERS.map(name => path.join('sai', 'orchestration', 'workers', `${name}.md`)),
];

const FOLDED_INSTRUCTIONS_RETIREMENT_DESTINATIONS = [
  'accessibility.md',
  'apply.md',
  'archive.md',
  'archive-commit-gate.md',
  'backfill.md',
  'change-overview.md',
  'commit.md',
  'design.md',
  'explore.md',
  'implement.md',
  'performance.md',
  'pr.md',
  'review.md',
  'security.md',
  'spec.propose.md',
  'worktree.md',
  '_templates/accessibility-report.md',
  '_templates/adr-index.md',
  '_templates/ddr-index.md',
  '_templates/implementation-plan.md',
  '_templates/performance-report.md',
  '_templates/pr-body.md',
  '_templates/review-report.md',
  '_templates/security-report.md',
].map(relative => path.join('sai', 'instructions', ...relative.split('/')));

function inventoryRoots(base, harness) {
  return {
    commands: path.join(base, 'commands'),
    sai: path.join(base, 'sai'),
    skills: path.join(base, 'skills'),
    agents: path.join(base, 'agents'),
    config: base,
    root: base,
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
    'sai-8-accessibility-worker': 'accessibility-worker',
  };
  return new Set(Object.entries(MANAGED_WORKERS).flatMap(([name, worker]) => [
    `sai/orchestration/workers/bindings/claude/${workerStems[name]}.md`,
    `sai/orchestration/workers/bindings/opencode/${workerStems[name]}.md`,
    `agents/claude/${worker.claude.agent}`,
  ].map(source => path.resolve(repoRoot, source))));
}

test('managed worker source enumeration resolves the security worker stem', () => {
  const repoRoot = path.join(__dirname, '..');
  const sources = managedWorkerSourcePaths(repoRoot);
  for (const source of [
    'sai/orchestration/workers/bindings/claude/security-worker.md',
    'sai/orchestration/workers/bindings/opencode/security-worker.md',
    'agents/claude/sai-6-security-worker.md',
    'sai/orchestration/workers/bindings/claude/accessibility-worker.md',
    'sai/orchestration/workers/bindings/opencode/accessibility-worker.md',
    'agents/claude/sai-8-accessibility-worker.md',
  ]) {
    assert.equal(sources.has(path.resolve(repoRoot, source)), true, `should enumerate ${source}`);
  }
});

test('install and uninstall inventories are exact and deterministic for every supported harness', () => {
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
  ];

  for (const { harness, install, enumerate } of cases) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-inventory-${harness}-`));
    const destinationRoot = inventoryRoots(base, harness);
    try {
      install(base, destinationRoot);
      const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
      const activeDestinations = active.map(projection => projection.destinationPath);
      const normalize = destinations => destinations
        .map(destination => normalizeInventoryDestination(destination, destinationRoot))
        .sort();
      const isExcludedInventory = destination =>
        destination === 'sai/orchestration/workers/bindings/idea-list-render.md' ||
        /^agents\/(?:budget|executor|explore)\.md$/.test(destination);
       const rawActive = normalize(activeDestinations);
       assert.equal(rawActive.some(destination =>
         destination.includes('/orchestration/workers/bindings/claude/') ||
         destination.includes('/orchestration/workers/bindings/opencode/')), false,
       `${harness} active inventory must not use harness-qualified binding destinations`);
       assert.equal(rawActive.includes('sai/orchestration/workers/bindings/idea-list-render.md'), true,
         `${harness} should keep the regular idea-list-render binding in the active inventory`);
       if (harness === 'claude') {
         assert.equal(rawActive.some(destination => /^agents\/(?:budget|executor|explore)\.md$/.test(destination)), false,
           'claude must not project support agents');
       } else {
         assert.equal(['budget', 'executor', 'explore'].every(name =>
           rawActive.includes(`agents/${name}.md`)), true,
         'opencode should keep its three support agents in the active inventory');
       }
      const normalizedActive = rawActive.filter(destination => !isExcludedInventory(destination));
      const activeWorkerBindings = normalizedActive
        .filter(destination => /^sai\/orchestration\/workers\/bindings\/[a-z-]+-worker\.md$/.test(destination));
      assert.equal(activeWorkerBindings.length, 7,
        `${harness} should project exactly seven active worker bindings`);
      const activeWorkers = normalizedActive
        .filter(destination => /^agents\/sai-\d-.*-worker\.md$/.test(destination));
      assert.equal(activeWorkers.length, 7,
        `${harness} should project exactly seven active managed agents`);
       const entries = enumerate(base, destinationRoot);
      const normalizedUninstall = normalize(entries
        .filter(entry => entry.assetType !== 'retired-managed-file')
        .map(entry => entry.dest)).filter(destination => !isExcludedInventory(destination));
      assert.deepEqual(normalizedUninstall, normalizedActive, `${harness} uninstall inventory should match install inventory`);
      assert.equal(new Set(normalizedUninstall).size, normalizedUninstall.length,
        `${harness} uninstall destinations should be unique`);
      assert.deepEqual(normalizedUninstall, [...normalizedUninstall].sort(),
        `${harness} uninstall destinations should have deterministic order`);
      const second = normalize(enumerate(base, destinationRoot)
        .filter(entry => entry.assetType !== 'retired-managed-file')
        .map(entry => entry.dest)).filter(destination => !isExcludedInventory(destination));
      assert.deepEqual(normalizedUninstall, second, `${harness} uninstall enumeration should be deterministic`);

       const retiredBindings = normalize(entries
         .filter(entry => entry.assetType === 'retired-managed-file' && entry.ruleId.endsWith('-proxy-skill') && entry.ruleId.includes(`-${harness}-`))
         .map(entry => entry.dest));
       assert.deepEqual(retiredBindings, [
         'skills/sai-8-accessibility-worker/SKILL.md',
         'skills/sai-2-design-worker/SKILL.md',
         'skills/sai-3-implementation-worker/SKILL.md',
         'skills/sai-7-performance-worker/SKILL.md',
         'skills/sai-5-review-worker/SKILL.md',
         'skills/sai-6-security-worker/SKILL.md',
         'skills/sai-1-spec-proposal-worker/SKILL.md',
       ].sort(), `${harness} should enumerate only its seven retired routed bindings`);

      if (harness === 'claude') {
        const managedAgents = entries.filter(entry => entry.assetType === 'claude-managed-agent');
        assert.equal(managedAgents.length, Object.keys(MANAGED_WORKERS).length);
        for (const worker of Object.values(MANAGED_WORKERS)) {
          const agentPath = path.join(destinationRoot.agents, worker.claude.agent);
          const entry = managedAgents.find(candidate => candidate.dest === agentPath);
          assert.ok(entry, `Claude should enumerate ${worker.claude.agent}`);
          assert.deepEqual(entry.tunableKeys, ['model', 'effort'],
            'Claude managed agent entries should declare their tunable keys');
        }
      }

    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('STEP1_RETIRE_INLINE: uninstall retains only Claude and opencode destinations', () => {
  const flow = require('../bin/install-flow.js');
  const uninstall = require('../bin/uninstall-flow.js');
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step1-uninstall-'));
  const claudeBase = path.join(base, 'claude');
  const opencodeBase = path.join(base, 'opencode');

  try {
    assert.deepEqual(Object.keys(flow).filter(name => /copilot/i.test(name)), []);
    assert.deepEqual(Object.keys(uninstall).filter(name => /copilot/i.test(name)), []);
    assert.equal(typeof flow.installClaude, 'function');
    assert.equal(typeof flow.installOpencode, 'function');
    assert.equal(typeof uninstall.enumerateClaude, 'function');
    assert.equal(typeof uninstall.enumerateOpencode, 'function');
    assert.equal(typeof uninstall.enumerateCopilot, 'undefined');

    flow.installClaude(claudeBase);
    flow.installOpencode(opencodeBase);
    const roots = {
      claude: inventoryRoots(claudeBase, 'claude'),
      opencode: inventoryRoots(opencodeBase, 'opencode'),
    };
    const active = ['claude', 'opencode'].flatMap(harness =>
      expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: roots[harness],
      }).map(projection => normalizeInventoryDestination(projection.destinationPath, roots[harness]))
    ).sort();
    const enumerated = [
      ...uninstall.enumerateClaude(claudeBase),
      ...uninstall.enumerateOpencode(opencodeBase),
    ]
      .filter(entry => entry.assetType !== 'retired-managed-file')
      .map(entry => normalizeInventoryDestination(entry.dest, roots[entry.dest.startsWith(opencodeBase) ? 'opencode' : 'claude']))
      .sort();

    assert.deepEqual(enumerated, active);
    assert.equal(enumerated.some(destination => /copilot|inline-invocation/i.test(destination)), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
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

test('enumeration includes retirement records but excludes them from active projections', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-uninstall-'));
  try {
    const entries = enumerateOpencode(tmpDir);
    const retired = entries.filter(e => e.assetType === 'retired-managed-file');
    const normalized = retired.map(e => path.relative(tmpDir, e.dest));
    assert.equal(new Set(normalized).size, normalized.length,
      'retired-managed-file destinations should be unique');
    const expected = [
      path.join('sai', 'commands', 'sai-2-design.md'),
      path.join('sai', 'commands', 'sai-2-design-inline.md'),
      path.join('sai', 'commands', 'sai-3-implement.md'),
       path.join('sai', 'commands', 'sai-3-implement-inline.md'),
      path.join('sai', 'commands', 'sai-1-spec.md'),
      path.join('sai', 'commands', 'sai-5-review.md'),
      path.join('sai', 'commands', 'sai-6-security.md'),
      path.join('sai', 'commands', 'sai-7-performance.md'),
      path.join('sai', 'commands', 'sai-8-accessibility.md'),
      ...STEP3_SUPERSEDED_DESTINATIONS,
       path.join('skills', 'sai-8-accessibility-worker', 'SKILL.md'),
       path.join('skills', 'sai-2-design-worker', 'SKILL.md'),
       path.join('skills', 'sai-3-implementation-worker', 'SKILL.md'),
       path.join('skills', 'sai-7-performance-worker', 'SKILL.md'),
       path.join('skills', 'sai-5-review-worker', 'SKILL.md'),
       path.join('skills', 'sai-6-security-worker', 'SKILL.md'),
       path.join('skills', 'sai-1-spec-proposal-worker', 'SKILL.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'opencode', 'accessibility-worker.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'opencode', 'design-worker.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'opencode', 'implementation-worker.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'opencode', 'performance-worker.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'opencode', 'review-worker.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'opencode', 'security-worker.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'opencode', 'spec-worker.md'),
       path.join('sai', 'compat', '_templates', 'adr-index.md'),
      path.join('sai', 'compat', 'sai-2-design-core.md'),
      path.join('sai', 'compat', 'sai-3-implementation-core.md'),
      path.join('sai', 'instructions', 'prereqs.md'),
      ...FOLDED_INSTRUCTIONS_RETIREMENT_DESTINATIONS,
    ];
    for (const destination of expected) {
      assert.equal(normalized.includes(destination), true,
        `retirement enumeration should cover ${destination}`);
    }
    for (const entry of retired) {
      assert.ok(Array.isArray(entry.acceptedHashes));
      assert.ok(entry.acceptedHashes.length > 0);
       assert.match(entry.ruleId, /^retired-/);
    }
    assert.equal(entries.some(e => e.assetType !== 'retired-managed-file' && e.dest.endsWith('sai-2-design-inline.md')), false);
    assert.equal(entries.some(e => e.assetType !== 'retired-managed-file' && e.dest.endsWith('sai-3-implement-inline.md')), false);
    assert.equal(entries.some(e => e.assetType !== 'retired-managed-file' && e.dest.endsWith(path.join('sai', 'commands', 'sai-4-apply.md'))), false);
    assert.equal(entries.some(e => e.assetType !== 'retired-managed-file' && e.dest.endsWith('coordinator-contract.md')), false);
    assert.equal(entries.some(e => e.assetType !== 'retired-managed-file' && e.dest.endsWith('worker-lifecycle.md')), false);
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

test('FOLD_RETIREMENT: every folded instructions destination carries a hash-gated retired-managed-file record', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  for (const destination of FOLDED_INSTRUCTIONS_RETIREMENT_DESTINATIONS) {
    const records = manifest.retirements.filter(retirement =>
      retirement.destination.class === 'sai' && retirement.destination.path ===
        path.relative('sai', destination).split(path.sep).join('/'));
    assert.equal(records.length, 1,
      `exactly one retirement record should cover the folded destination ${destination}`);
    const record = records[0];
    assert.deepEqual(record.harnesses, ['claude', 'opencode'],
      `${destination} should carry an explicit claude/opencode allowlist`);
    assert.ok(record.managedHashes.length > 0,
      `${destination} should carry a non-empty managed-hash set`);
    assert.ok(record.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)),
      `${destination} hashes should be lowercase SHA-256`);
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-fold-retired-enum-'));
  try {
    installOpencode(tmpDir);
    const retired = enumerateOpencode(tmpDir)
      .filter(entry => entry.assetType === 'retired-managed-file');
    const normalized = new Map(retired.map(entry => [path.relative(tmpDir, entry.dest), entry]));
    for (const destination of FOLDED_INSTRUCTIONS_RETIREMENT_DESTINATIONS) {
      const entry = normalized.get(destination);
      assert.ok(entry, `uninstall should enumerate a retired record for ${destination}`);
      assert.ok(Array.isArray(entry.acceptedHashes) && entry.acceptedHashes.length > 0,
        `${destination} should enumerate accepted hashes`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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

test('Step 4 divergent Claude performance agents are overwritten with notice and uninstall removes body-matching agents', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-performance-collision-'));
  const agent = path.join(base, 'agents', 'sai-7-performance-worker.md');
  const sentinel = 'user-owned incompatible performance worker\n';
  const notices = [];
  const originalLog = console.log;
  try {
    installClaude(base);
    const expectedBytes = fs.readFileSync(agent);
    fs.writeFileSync(agent, sentinel);
    console.log = message => notices.push(String(message));
    assert.doesNotThrow(() => installClaude(base),
      'installClaude should not throw on a divergent agent destination');
    assert.deepEqual(fs.readFileSync(agent), expectedBytes,
      'the sentinel should be replaced by the managed source bytes');
    assert.ok(notices.some(message => message.includes(agent)),
      'a stdout notice should name the overwritten file');

    const sidecar = path.join(base, 'agents', '.sai-7-performance-worker.owner.json');
    fs.writeFileSync(sidecar, JSON.stringify({ managedHash: crypto.createHash('sha256').update(expectedBytes).digest('hex') }));
    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(agent), false, 'the body-matching agent should be deleted on uninstall');
    assert.equal(fs.existsSync(sidecar), false,
      'a shape-matching sidecar should be removed alongside its agent');
  } finally {
    console.log = originalLog;
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('Step 4 managed performance agent installs without a sidecar and uninstall removes it', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-performance-managed-'));
  try {
    installClaude(base);
    const agent = path.join(base, 'agents', 'sai-7-performance-worker.md');
    const sidecar = path.join(base, 'agents', '.sai-7-performance-worker.owner.json');
    assert.equal(fs.existsSync(agent), true, 'managed performance agent should be installed');
    assert.equal(fs.existsSync(sidecar), false, 'fresh installs must not create owner sidecars');
    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(agent), false);
    assert.equal(fs.existsSync(sidecar), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('STEP3_RETIREMENT: uninstall enumerates a retired-managed-file record for every superseded destination on both harnesses', () => {
  for (const [harness, install, enumerate] of [
    ['claude', installClaude, enumerateClaude],
    ['opencode', installOpencode, enumerateOpencode],
  ]) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step3-retired-enum-'));
    try {
      install(tmpDir);
      const retired = enumerate(tmpDir)
        .filter(entry => entry.assetType === 'retired-managed-file');
      const normalized = new Set(retired.map(entry => path.relative(tmpDir, entry.dest)));
      for (const destination of STEP3_SUPERSEDED_DESTINATIONS) {
        assert.equal(normalized.has(destination), true,
          `uninstall should enumerate a retired-managed-file record for ${destination}`);
      }
      for (const entry of retired) {
        assert.equal(Array.isArray(entry.acceptedHashes) && entry.acceptedHashes.length > 0, true,
          `retired entry ${entry.dest} should carry accepted hashes`);
        assert.match(entry.ruleId, /^retired-/);
      }
      assert.equal(retired.some(entry =>
        entry.ruleId.endsWith('-proxy-skill') && entry.ruleId.includes(`-${harness}-`)), true,
      `the step-3 additions must not remove the historical ${harness} proxy-skill retirement records`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('STEP3_PARITY: active install inventory equals uninstall active enumeration for both harnesses from one manifest expansion', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  for (const { harness, install, enumerate } of [
    { harness: 'claude', install: installClaude, enumerate: enumerateClaude },
    { harness: 'opencode', install: installOpencode, enumerate: enumerateOpencode },
  ]) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-step3-parity-${harness}-`));
    const destinationRoot = inventoryRoots(base, harness);
    try {
      install(base, destinationRoot);
      const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
        .map(projection => normalizeInventoryDestination(projection.destinationPath, destinationRoot))
        .sort();
      const uninstall = enumerate(base, destinationRoot)
        .filter(entry => entry.assetType !== 'retired-managed-file')
        .map(entry => normalizeInventoryDestination(entry.dest, destinationRoot))
        .sort();
      assert.deepEqual(uninstall, active,
        `${harness} active uninstall enumeration should equal the manifest-derived install inventory`);

      const retirementDests = expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot })
        .map(record => normalizeInventoryDestination(record.destinationPath, destinationRoot))
        .sort();
      const retiredDests = enumerate(base, destinationRoot)
        .filter(entry => entry.assetType === 'retired-managed-file')
        .map(entry => normalizeInventoryDestination(entry.dest, destinationRoot))
        .sort();
      assert.deepEqual(retiredDests, retirementDests,
        `${harness} retired enumeration should derive from the same manifest retirement expansion with no second path list`);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

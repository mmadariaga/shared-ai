'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  loadInstallManifest,
  expandInstallManifest,
  expandRetirementManifest,
  matrixRenderFor,
} = require('../bin/install-manifest.js');
const { MANAGED_WORKERS } = require('../bin/install-flow.js');

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-manifest-'));
  fs.mkdirSync(path.join(repoRoot, 'sai'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'commands', 'claude'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'commands', 'opencode'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'commands', 'claude', 'alpha.md'), 'alpha');
  fs.writeFileSync(path.join(repoRoot, 'commands', 'claude', 'zeta.md'), 'zeta');
  fs.writeFileSync(path.join(repoRoot, 'commands', 'opencode', 'foreign.md'), 'foreign');
  return repoRoot;
}

function rule(overrides = {}) {
  return {
    id: 'commands',
    source: 'commands/claude',
    destination: { class: 'root', path: 'claude/commands' },
    harnesses: ['claude', 'opencode'],
    strategy: 'copy',
    recursive: true,
    include: ['**/*.md'],
    exclude: [],
    ownership: 'managed',
    drift: 'content',
    ...overrides,
  };
}

const MANAGED_WORKER_PROJECTIONS = {
  'sai-3-implementation-worker': {
    claudeBinding: {
      id: 'claude-implementation-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/implementation-worker.md',
       destinationPath: 'orchestration/workers/bindings/implementation-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-implementation-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
       destinationPath: 'orchestration/workers/bindings/implementation-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-3-implementation-worker',
      sourcePath: 'agents/claude/sai-3-implementation-worker.md',
      destinationPath: 'sai-3-implementation-worker.md',
    },
  },
  'sai-2-design-worker': {
    claudeBinding: {
      id: 'claude-design-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/design-worker.md',
       destinationPath: 'orchestration/workers/bindings/design-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-design-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/design-worker.md',
       destinationPath: 'orchestration/workers/bindings/design-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-2-design-worker',
      sourcePath: 'agents/claude/sai-2-design-worker.md',
      destinationPath: 'sai-2-design-worker.md',
    },
  },
  'sai-5-review-worker': {
    claudeBinding: {
      id: 'claude-review-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/review-worker.md',
       destinationPath: 'orchestration/workers/bindings/review-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-review-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/review-worker.md',
       destinationPath: 'orchestration/workers/bindings/review-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-5-review-worker',
      sourcePath: 'agents/claude/sai-5-review-worker.md',
      destinationPath: 'sai-5-review-worker.md',
    },
  },
  'sai-6-security-worker': {
    claudeBinding: {
      id: 'claude-security-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/security-worker.md',
       destinationPath: 'orchestration/workers/bindings/security-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-security-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/security-worker.md',
       destinationPath: 'orchestration/workers/bindings/security-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-6-security-worker',
      sourcePath: 'agents/claude/sai-6-security-worker.md',
      destinationPath: 'sai-6-security-worker.md',
    },
  },
  'sai-7-performance-worker': {
    claudeBinding: {
      id: 'claude-performance-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/performance-worker.md',
       destinationPath: 'orchestration/workers/bindings/performance-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-performance-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/performance-worker.md',
       destinationPath: 'orchestration/workers/bindings/performance-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-7-performance-worker',
      sourcePath: 'agents/claude/sai-7-performance-worker.md',
      destinationPath: 'sai-7-performance-worker.md',
    },
  },
  'sai-8-accessibility-worker': {
    claudeBinding: {
      id: 'claude-accessibility-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/accessibility-worker.md',
       destinationPath: 'orchestration/workers/bindings/accessibility-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-accessibility-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/accessibility-worker.md',
       destinationPath: 'orchestration/workers/bindings/accessibility-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-8-accessibility-worker',
      sourcePath: 'agents/claude/sai-8-accessibility-worker.md',
      destinationPath: 'sai-8-accessibility-worker.md',
    },
  },
  'sai-1-spec-proposal-worker': {
    claudeBinding: {
      id: 'claude-spec-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/spec-worker.md',
       destinationPath: 'orchestration/workers/bindings/spec-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-spec-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/spec-worker.md',
       destinationPath: 'orchestration/workers/bindings/spec-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-1-spec-proposal-worker',
      sourcePath: 'agents/claude/sai-1-spec-proposal-worker.md',
      destinationPath: 'sai-1-spec-proposal-worker.md',
    },
  },
  'sai-commit-worker': {
    claudeBinding: {
      id: 'claude-commit-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/commit-worker.md',
       destinationPath: 'orchestration/workers/bindings/commit-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-commit-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/commit-worker.md',
       destinationPath: 'orchestration/workers/bindings/commit-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-commit-worker',
      sourcePath: 'agents/claude/sai-commit-worker.md',
      destinationPath: 'sai-commit-worker.md',
    },
  },
  'sai-archive-worker': {
    claudeBinding: {
      id: 'claude-archive-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/archive-worker.md',
       destinationPath: 'orchestration/workers/bindings/archive-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-archive-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/archive-worker.md',
       destinationPath: 'orchestration/workers/bindings/archive-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-archive-worker',
      sourcePath: 'agents/claude/sai-archive-worker.md',
      destinationPath: 'sai-archive-worker.md',
    },
  },
  'sai-backfill-worker': {
    claudeBinding: {
      id: 'claude-backfill-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/backfill-worker.md',
       destinationPath: 'orchestration/workers/bindings/backfill-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-backfill-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/backfill-worker.md',
        destinationPath: 'orchestration/workers/bindings/backfill-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-backfill-worker',
      sourcePath: 'agents/claude/sai-backfill-worker.md',
      destinationPath: 'sai-backfill-worker.md',
    },
  },
  'sai-merge-worker': {
    claudeBinding: {
      id: 'claude-merge-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/merge-worker.md',
       destinationPath: 'orchestration/workers/bindings/merge-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-merge-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/merge-worker.md',
        destinationPath: 'orchestration/workers/bindings/merge-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-merge-worker',
      sourcePath: 'agents/claude/sai-merge-worker.md',
      destinationPath: 'sai-merge-worker.md',
    },
  },


  'sai-4-red-worker': {
    claudeBinding: {
      id: 'claude-red-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/red-worker.md',
       destinationPath: 'orchestration/workers/bindings/red-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-red-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/red-worker.md',
       destinationPath: 'orchestration/workers/bindings/red-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-4-red-worker',
      sourcePath: 'agents/claude/sai-4-red-worker.md',
      destinationPath: 'sai-4-red-worker.md',
    },
  },
  'sai-4-green-worker': {
    claudeBinding: {
      id: 'claude-green-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/green-worker.md',
       destinationPath: 'orchestration/workers/bindings/green-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-green-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/green-worker.md',
       destinationPath: 'orchestration/workers/bindings/green-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-4-green-worker',
      sourcePath: 'agents/claude/sai-4-green-worker.md',
      destinationPath: 'sai-4-green-worker.md',
    },
  },
  'sai-direct-build-worker': {
    claudeBinding: {
      id: 'claude-direct-build-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/direct-build-worker.md',
       destinationPath: 'orchestration/workers/bindings/direct-build-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-direct-build-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/direct-build-worker.md',
       destinationPath: 'orchestration/workers/bindings/direct-build-worker.md',
    },
    claudeAgent: {
      id: 'claude-sai-direct-build-worker',
      sourcePath: 'agents/claude/sai-direct-build-worker.md',
      destinationPath: 'sai-direct-build-worker.md',
    },
  },
};

const ROUTED_PHASES = ['spec', 'design', 'implement', 'review', 'security', 'performance', 'accessibility'];

function workerDestinationRoots(prefix) {
  return {
    commands: path.join(prefix, 'commands'),
    sai: path.join(prefix, 'sai'),
    skills: path.join(prefix, 'skills'),
    agents: path.join(prefix, 'agents'),
    config: path.join(prefix, 'config'),
    root: path.join(prefix, 'config'),
  };
}

function normalizeWorkerProjection(projection, repoRoot, destinationRoot) {
  const destinationRootEntry = Object.entries(destinationRoot).find(([, root]) => {
    const relative = path.relative(root, projection.destinationPath);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  });
  assert.ok(destinationRootEntry, `destination root should contain ${projection.destinationPath}`);
  return {
    id: projection.id,
    harness: projection.harness,
    destinationPath: path.relative(destinationRootEntry[1], projection.destinationPath).split(path.sep).join('/'),
    strategy: projection.strategy,
    ownership: projection.ownership,
    drift: projection.drift,
  };
}

function expectedWorkerProjection(record, harness, metadata) {
  return {
    id: record.id,
    harness,
    destinationPath: record.destinationPath,
    strategy: metadata.strategy,
    ownership: metadata.ownership,
    drift: 'content',
  };
}

function relSource(projection, repoRoot) {
  return path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
}

function isRetiredPerPhaseSource(source, harness) {
  if (source.startsWith(`sai/orchestration/workers/bindings/${harness}/`)) return true;
  return new RegExp(`^agents/${harness}/sai-\\d-.*-worker\\.md$`).test(source);
}

function workerDestinationClass(id) {
  if (id.endsWith('-worker')) return 'agents';
  return 'sai';
}

function compareWorkerProjections(left, right, destinationRoot) {
  const leftPath = path.join(destinationRoot[workerDestinationClass(left.id)], left.destinationPath);
  const rightPath = path.join(destinationRoot[workerDestinationClass(right.id)], right.destinationPath);
  return leftPath.localeCompare(rightPath) || left.id.localeCompare(right.id);
}

test('managed worker registry has complete Claude and opencode manifest projections', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), 'sai-worker-projections'));
  const expectedByHarness = {
    claude: Object.values(MANAGED_WORKER_PROJECTIONS).flatMap(worker => [
      expectedWorkerProjection(worker.claudeBinding, 'claude', { strategy: 'copy', ownership: 'managed' }),
      expectedWorkerProjection(worker.claudeAgent, 'claude', { strategy: 'tunable-seed', ownership: 'managed' }),
    ]),
    opencode: Object.values(MANAGED_WORKER_PROJECTIONS).flatMap(worker => [
      expectedWorkerProjection(worker.opencodeBinding, 'opencode', { strategy: 'copy', ownership: 'managed' }),
    ]),
  };
  for (const expected of Object.values(expectedByHarness)) {
    expected.sort((left, right) => compareWorkerProjections(left, right, destinationRoot));
  }

  assert.deepEqual(Object.keys(MANAGED_WORKERS), Object.keys(MANAGED_WORKER_PROJECTIONS));
  assert.equal(Object.hasOwn(MANAGED_WORKERS['sai-1-spec-proposal-worker'], 'opencode'), false,
    'spec opencode compatibility assets must not imply managed-agent registration metadata');

  for (const [harness, expected] of Object.entries(expectedByHarness)) {
    const first = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const second = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const actual = first.map(projection => normalizeWorkerProjection(projection, repoRoot, destinationRoot))
      .filter(projection => expected.some(record => record.id === projection.id));
    const actualSecond = second.map(projection => normalizeWorkerProjection(projection, repoRoot, destinationRoot))
      .filter(projection => expected.some(record => record.id === projection.id));

    assert.deepEqual(actual, expected, `${harness} worker projections should match complete records`);
    assert.deepEqual(actual, actualSecond, `${harness} worker expansion should be deterministic`);
    assert.deepEqual(actual, [...actual].sort((left, right) =>
      compareWorkerProjections(left, right, destinationRoot)));
    assert.equal(new Set(actual.map(projection => projection.destinationPath)).size, actual.length,
      `${harness} worker destinations should be unique`);
    assert.ok(actual.filter(projection => projection.id.endsWith('-worker-binding'))
      .every(projection => !projection.destinationPath.includes(`${path.sep}claude${path.sep}`) &&
        !projection.destinationPath.includes(`${path.sep}opencode${path.sep}`)),
    `${harness} active worker bindings should use neutral destinations`);

    for (const workerName of Object.keys(MANAGED_WORKERS)) {
      const workerRecords = actual.filter(record =>
        MANAGED_WORKER_PROJECTIONS[workerName][`${harness === 'claude' ? 'claude' : 'opencode'}Binding`].id === record.id ||
         (harness === 'claude' && MANAGED_WORKER_PROJECTIONS[workerName].claudeAgent.id === record.id)
      );
      assert.equal(workerRecords.length, harness === 'claude' ? 2 : 1,
        `${harness} should project the expected number of records for ${workerName}`);
    }

    const workerProjections = first.filter(projection =>
      expected.some(record => record.id === projection.id));
    for (const projection of workerProjections) {
      assert.equal(isRetiredPerPhaseSource(relSource(projection, repoRoot), harness), false,
        `${harness} worker projection must not source from a retired per-phase tree: ${relSource(projection, repoRoot)}`);
    }
  }

  const workerSources = new Set(Object.values(MANAGED_WORKER_PROJECTIONS).flatMap(worker => [
    worker.claudeBinding.sourcePath,
    worker.opencodeBinding.sourcePath,
     worker.claudeAgent.sourcePath,
  ]));
});

test('Step 6 security worker exposes matrix binding and worker projections', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), 'sai-security-worker-projections'));
  const expected = [
     ['claude', 'claude-security-worker-binding', 'orchestration/workers/bindings/security-worker.md'],
     ['opencode', 'opencode-security-worker-binding', 'orchestration/workers/bindings/security-worker.md'],
     ['claude', 'claude-sai-6-security-worker', 'sai-6-security-worker.md'],
  ];

  for (const [harness, expectedId, expectedDestination] of expected) {
    const projection = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .find(candidate => candidate.id === expectedId);
    assert.ok(projection, `${harness} should project ${expectedId}`);
    const relative = projection.destinationPath.includes(`${path.sep}agents${path.sep}`)
      ? path.relative(destinationRoot.agents, projection.destinationPath)
      : path.relative(destinationRoot.sai, projection.destinationPath);
    assert.equal(relative.split(path.sep).join('/'), expectedDestination,
      `${expectedId} should land at ${expectedDestination}`);
    assert.equal(isRetiredPerPhaseSource(relSource(projection, repoRoot), harness), false,
      `${expectedId} must not source from a retired per-harness tree`);
  }

});

test('security worker fixture preserves the owned Claude agent contract', () => {
  assert.deepEqual(MANAGED_WORKER_PROJECTIONS['sai-6-security-worker'].claudeAgent, {
    id: 'claude-sai-6-security-worker',
    sourcePath: 'agents/claude/sai-6-security-worker.md',
    destinationPath: 'sai-6-security-worker.md',
  });
});

test('loadInstallManifest reads the versioned manifest shape', () => {
  const repoRoot = makeRepo();
  try {
    fs.writeFileSync(
      path.join(repoRoot, 'sai', 'install-manifest.json'),
      '{"version": 1, "projections": [], "retirements": []}'
    );
    const manifest = loadInstallManifest(repoRoot);
    assert.deepEqual(manifest, { version: 1, projections: [], retirements: [] });
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('canonical manifest projects policies recursively to all harnesses', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const policyRule = manifest.projections.find(projection => projection.id === 'sai-policies');
  assert.deepEqual(policyRule, {
    id: 'sai-policies',
    source: 'sai/policies',
    destination: { class: 'sai', path: 'policies' },
    harnesses: ['claude', 'opencode'],
    strategy: 'copy',
    recursive: true,
    include: ['**/*.md'],
    ownership: 'managed',
    drift: 'content',
  });
  assert.equal(manifest.projections.filter(projection => projection.source === 'sai/policies').length, 1);
});

test('canonical manifest has no active compatibility ADR-template projection', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const compatibility = manifest.projections
    .filter(projection => projection.source.startsWith('sai/compat/'))
    .map(projection => ({
      source: projection.source,
      destination: projection.destination,
      harnesses: projection.harnesses,
      recursive: projection.recursive,
      overrides: projection.overrides,
    }));
  assert.deepEqual(compatibility, []);
  assert.equal(
    manifest.projections.some(projection => projection.source === 'sai/compat/_templates/adr-index.md'),
    false
  );
});

test('canonical manifest projects implementation assets to neutral matrix destinations', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-matrix-commands'),
    sai: path.join(os.tmpdir(), 'sai-matrix-sai'),
    skills: path.join(os.tmpdir(), 'sai-matrix-skills'),
    agents: path.join(os.tmpdir(), 'sai-matrix-agents'),
    config: path.join(os.tmpdir(), 'sai-matrix-config'),
    root: path.join(os.tmpdir(), 'sai-matrix-config'),
  };
  const retiredImplementationSources = [
    'sai/orchestration/workers/bindings/claude/implementation-worker.md',
    'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
    'agents/claude/sai-3-implementation-worker.md',
    'agents/opencode/sai-3-implementation-worker.md',
  ];

  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const sourceSet = new Set(projections.map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    const destinations = projections.map(projection => projection.destinationPath);

    assert.equal(new Set(destinations).size, destinations.length, `${harness} destinations should be unique`);
    assert.deepEqual(destinations, [...destinations].sort((a, b) => a.localeCompare(b)), `${harness} destinations should be ordered`);
    for (const source of [
      'sai/orchestration/command-runner.md',
      'sai/orchestration/worker-core.md',
      'sai/commands/implement/worker.md',
    ]) {
      assert.ok(sourceSet.has(source), `${harness} should include ${source}`);
    }
    const binding = projections.find(projection =>
      projection.destinationPath.endsWith(path.join('orchestration', 'workers', 'bindings', 'implementation-worker.md')));
    assert.ok(binding, `${harness} should project the neutral matrix implementation binding`);
    assert.equal(binding.harness, harness, `${harness} implementation binding should be harness-scoped`);
    assert.equal(isRetiredPerPhaseSource(relSource(binding, repoRoot), harness), false,
      `${harness} implementation binding must not source from a retired per-harness tree`);
    if (harness === 'claude') {
      const agent = projections.find(projection =>
        projection.destinationPath.endsWith(path.join('agents', 'sai-3-implementation-worker.md')));
      assert.ok(agent, 'claude should project the implementation worker agent');
      assert.equal(isRetiredPerPhaseSource(relSource(agent, repoRoot), harness), false,
        'claude implementation agent must not source from a retired per-harness agent tree');
    }
    for (const retiredSource of retiredImplementationSources) {
      assert.equal(sourceSet.has(retiredSource), false,
        `${harness} must not source from the retired per-harness tree ${retiredSource}`);
    }
  }
});

test('canonical manifest projects routed spec assets only to Claude Code and opencode', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const expectedSources = {
    claude: [
      'sai/orchestration/command-runner.md',
      'sai/orchestration/worker-core.md',
      'sai/commands/spec/worker.md',
    ],
    opencode: [
      'sai/orchestration/command-runner.md',
      'sai/orchestration/worker-core.md',
      'sai/commands/spec/worker.md',
    ],
  };
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-spec-commands'),
    sai: path.join(os.tmpdir(), 'sai-spec-sai'),
    skills: path.join(os.tmpdir(), 'sai-spec-skills'),
    agents: path.join(os.tmpdir(), 'sai-spec-agents'),
    config: path.join(os.tmpdir(), 'sai-spec-config'),
    root: path.join(os.tmpdir(), 'sai-spec-config'),
  };
  for (const [harness, requiredSources] of Object.entries(expectedSources)) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const sources = new Set(projections.map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    for (const source of requiredSources) assert.ok(sources.has(source), `${harness} should project ${source}`);
    const binding = projections.find(projection =>
      projection.destinationPath.endsWith(path.join('orchestration', 'workers', 'bindings', 'spec-worker.md')));
    assert.ok(binding, `${harness} should project the neutral spec binding destination`);
    assert.equal(isRetiredPerPhaseSource(relSource(binding, repoRoot), harness), false,
      `${harness} spec binding must not source from a retired per-harness tree`);
    if (harness === 'claude') {
      const agent = projections.find(projection =>
        projection.destinationPath.endsWith(path.join('agents', 'sai-1-spec-proposal-worker.md')));
      assert.ok(agent, 'claude should project the spec proposal worker agent destination');
      assert.equal(isRetiredPerPhaseSource(relSource(agent, repoRoot), harness), false,
        'claude spec agent must not source from a retired per-harness agent tree');
      assert.equal(sources.has('sai/orchestration/workers/bindings/opencode/spec-worker.md'), false);
    } else {
      assert.equal(sources.has('sai/orchestration/workers/bindings/claude/spec-worker.md'), false);
      assert.equal(sources.has('agents/claude/sai-1-spec-proposal-worker.md'), false);
    }
  }
});

test('Installer projects every routed review surface', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-review-commands'),
    sai: path.join(os.tmpdir(), 'sai-review-sai'),
    skills: path.join(os.tmpdir(), 'sai-review-skills'),
    agents: path.join(os.tmpdir(), 'sai-review-agents'),
    config: path.join(os.tmpdir(), 'sai-review-config'),
    root: path.join(os.tmpdir(), 'sai-review-config'),
  };
  const expected = [
     ['claude', path.join('orchestration', 'workers', 'bindings', 'review-worker.md')],
     ['opencode', path.join('orchestration', 'workers', 'bindings', 'review-worker.md')],
     ['claude', path.join('agents', 'sai-5-review-worker.md')],
  ];

  for (const harness of ['claude', 'opencode']) {
    const first = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const second = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const normalize = projections => projections.map(projection => ({
      source: path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'),
      destination: projection.destinationPath,
    }));
    assert.deepEqual(normalize(first), normalize(second), `${harness} review expansion should be deterministic`);

    for (const [expectedHarness, destinationSuffix] of expected.filter(item => item[0] === harness)) {
      const projection = first.find(item => item.destinationPath.endsWith(destinationSuffix));
      assert.ok(projection, `${expectedHarness} should project a matrix review destination ${destinationSuffix}`);
      assert.equal(isRetiredPerPhaseSource(relSource(projection, repoRoot), harness), false,
        `${expectedHarness} review destination ${destinationSuffix} must not source from a retired per-harness tree`);
    }
  }

});

test('Installer projects deterministic routed performance surfaces with ownership metadata', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), 'sai-performance-worker-projections'));
  const expected = {
    'sai/commands/performance/coordinator.md': {
      harnesses: ['claude', 'opencode'],
      destination: 'commands/performance/coordinator.md',
      strategy: 'copy',
      ownership: 'managed',
    },
    'sai/commands/performance/invocation.md': {
      harnesses: ['claude', 'opencode'],
      destination: 'commands/performance/invocation.md',
      strategy: 'copy',
      ownership: 'managed',
    },
    'sai/commands/performance/worker.md': {
      harnesses: ['claude', 'opencode'],
      destination: 'commands/performance/worker.md',
      strategy: 'copy',
      ownership: 'managed',
    },
  };
  const matrixDestinations = [
    ['claude', 'orchestration/workers/bindings/performance-worker.md', 'copy', 'managed'],
    ['opencode', 'orchestration/workers/bindings/performance-worker.md', 'copy', 'managed'],
    ['claude', 'sai-7-performance-worker.md', 'tunable-seed', 'managed'],
  ];

  for (const harness of ['claude', 'opencode']) {
    const normalize = projections => projections.map(projection => ({
      source: path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'),
      destination: path.relative(
        destinationRoot[projection.sourcePath.includes(`${path.sep}agents${path.sep}`) ? 'agents' :
          projection.sourcePath.includes(`${path.sep}skills${path.sep}`) ? 'skills' : 'sai'],
        projection.destinationPath
      ).split(path.sep).join('/'),
      strategy: projection.strategy,
      ownership: projection.ownership,
      drift: projection.drift,
    }));
    const first = normalize(expandInstallManifest(manifest, { harness, repoRoot, destinationRoot }));
    const second = normalize(expandInstallManifest(manifest, { harness, repoRoot, destinationRoot }));
    assert.deepEqual(first, second, `${harness} performance expansion should be deterministic`);

    for (const [source, contract] of Object.entries(expected)) {
      if (!contract.harnesses.includes(harness)) continue;
      const projection = first.find(candidate => candidate.source === source);
      assert.ok(projection, `${harness} should project ${source}`);
      assert.equal(projection.destination, contract.destination, `${source} destination should be stable`);
      assert.equal(projection.strategy, contract.strategy, `${source} strategy should be stable`);
      assert.equal(projection.ownership, contract.ownership, `${source} ownership should be stable`);
      assert.equal(projection.drift, 'content', `${source} drift should be content`);
    }

    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const [expectedHarness, destinationSuffix, strategy, ownership] of matrixDestinations.filter(item => item[0] === harness)) {
      const projection = projections.find(candidate =>
        path.relative(destinationRoot.agents, candidate.destinationPath).split(path.sep).join('/') === destinationSuffix ||
        path.relative(destinationRoot.sai, candidate.destinationPath).split(path.sep).join('/') === destinationSuffix);
      assert.ok(projection, `${expectedHarness} should project matrix performance destination ${destinationSuffix}`);
      assert.equal(projection.strategy, strategy, `${expectedHarness} ${destinationSuffix} strategy should be stable`);
      assert.equal(projection.ownership, ownership, `${expectedHarness} ${destinationSuffix} ownership should be stable`);
      assert.equal(isRetiredPerPhaseSource(relSource(projection, repoRoot), harness), false,
        `${expectedHarness} ${destinationSuffix} must not source from a retired per-harness tree`);
    }
  }

});

test('Routed review bindings remain harness-specific', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), 'sai-routed-review-matrix'));
  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const binding = projections.find(projection =>
      path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/') === ['orchestration', 'workers', 'bindings', 'review-worker.md'].join('/'));
    assert.ok(binding, `${harness} should project the matrix review binding at its neutral destination`);
    assert.equal(binding.harness, harness, `${harness} review binding should be harness-scoped`);
    assert.equal(isRetiredPerPhaseSource(relSource(binding, repoRoot), harness), false,
      `${harness} review binding must not source from a retired per-harness tree`);
    const agent = projections.find(projection =>
      path.relative(destinationRoot.agents, projection.destinationPath)
        .split(path.sep).join('/') === 'sai-5-review-worker.md');
    assert.ok(agent, `${harness} should project the matrix review worker agent`);
    assert.equal(isRetiredPerPhaseSource(relSource(agent, repoRoot), harness), false,
      `${harness} review agent must not source from a retired per-harness tree`);
  }
});

test('compatibility and policy projections resolve for every supported harness', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-projection-commands'),
    sai: path.join(os.tmpdir(), 'sai-projection-sai'),
    skills: path.join(os.tmpdir(), 'sai-projection-skills'),
    agents: path.join(os.tmpdir(), 'sai-projection-agents'),
    config: path.join(os.tmpdir(), 'sai-projection-config'),
    root: path.join(os.tmpdir(), 'sai-projection-config'),
  };
  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, {
      harness,
      repoRoot: path.join(__dirname, '..'),
      destinationRoot,
    });
     assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('adr-index.template.md'))));
     assert.ok(projections.some(p => path.relative(path.join(__dirname, '..'), p.sourcePath).split(path.sep).join('/') === 'sai/commands/implement/adr-index.template.md'));
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', '_templates', 'adr-index.md'))), false);
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'glossary-format.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'remember.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'sai-learnings-format.md'))));
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'implement-invocation.md'))), false);
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'sai-2-design-core.md'))), false);
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'sai-3-implementation-core.md'))), false);
  }
});

test('design matrix projections carry opt-in overview generation semantics for both harnesses', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const designEntry = manifest['worker-matrix'].entries.find(entry => entry.phase === 'design');
  assert.ok(designEntry, 'the design worker matrix entry should exist');
  assert.match(designEntry.overviewGeneration, /only when --overview-lang is present and valid/);
  assert.doesNotMatch(designEntry.overviewGeneration, /flag was absent|using English when/i);

  for (const harness of ['claude', 'opencode']) {
    const binding = matrixRenderFor(manifest, harness, repoRoot)
      .find(item => item.kind === 'binding' && item.phase === 'design');
    assert.ok(binding, `${harness} should render the design binding`);
    assert.match(binding.text, /overview_generation/);
    assert.match(binding.text, /only when --overview-lang is present and valid/);
    assert.doesNotMatch(binding.text, /flag was absent|using English when/i);
  }
});

test('canonical identity surfaces reject former routed names', () => {
  const repoRoot = path.join(__dirname, '..');
  const paths = [
    'configs/opencode.jsonc',
    'sai/install-manifest.json',
    'commands/claude/sai-2-design.md',
    'commands/claude/sai-3-implement.md',
    'commands/opencode/sai-2-design.md',
    'commands/opencode/sai-3-implement.md',
    'sai/commands/design/worker.md',
    'sai/commands/implement/worker.md',
    'README.md',
    'AGENTS.md',
  ];
  const former = /sai-design-coordinator|sai-implementation-coordinator|sai-design-planning-worker|sai-implementation-planning-worker|Fetch @sai\/compat\/(?:design|implement)-invocation-core\.md/;
  for (const relativePath of paths) {
    assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'), former, relativePath);
  }
});

test('the same manifest expansion provides one ordered inventory for all consumers', () => {
  const repoRoot = makeRepo();
  try {
    const manifest = { version: 1, projections: [rule()], retirements: [] };
     const options = { harness: 'claude', repoRoot, destinationRoot: { root: '' } };
    const installer = expandInstallManifest(manifest, options);
    const doctor = expandInstallManifest(manifest, options);
    const uninstall = expandInstallManifest(manifest, options);
    assert.deepEqual(installer.map(p => p.destinationPath), [
      path.resolve('', 'claude/commands', 'alpha.md'),
      path.resolve('', 'claude/commands', 'zeta.md'),
    ]);
    assert.deepEqual(doctor, installer);
    assert.deepEqual(uninstall, installer);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('recursive candidates are normalized, sorted, and filtered include-before-exclude', () => {
  const repoRoot = makeRepo();
  try {
      const manifest = {
        version: 1,
        projections: [rule({ include: ['**/alpha.md', '**/zeta.md'], exclude: ['**/zeta.md'] })],
        retirements: [],
    };
    const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: { root: '/dest' } });
    assert.deepEqual(projections.map(p => p.destinationPath), [
      path.resolve('/dest', 'claude/commands', 'alpha.md'),
    ]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('explicit rules replace recursive candidates only when declared as overrides', () => {
  const repoRoot = makeRepo();
  try {
      const manifest = {
        version: 1,
        projections: [
          rule({ id: 'recursive' }),
          rule({ id: 'explicit', source: 'commands/claude/alpha.md', destination: { class: 'root', path: 'claude/commands/alpha.md' }, recursive: false, overrides: 'recursive' }),
        ],
        retirements: [],
    };
     const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: { root: '' } });
    assert.equal(projections.filter(p => p.destinationPath.endsWith('alpha.md')).length, 1);
      assert.throws(() => expandInstallManifest({ version: 1, projections: [rule(), rule({ id: 'duplicate' })], retirements: [] }, { harness: 'claude', repoRoot, destinationRoot: { root: '' } }), /duplicate/i);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('the graph is sorted by normalized destination and rule id without foreign harness bindings', () => {
  const repoRoot = makeRepo();
   const manifest = {
    version: 1,
    projections: [
       rule({ id: 'z-rule', destination: { class: 'root', path: 'z/claude' }, recursive: false, source: 'commands/claude/zeta.md' }),
       rule({ id: 'a-rule', destination: { class: 'root', path: 'a/claude' }, recursive: false, source: 'commands/claude/alpha.md' }),
      rule({ id: 'copilot-only', harnesses: ['copilot'], recursive: false, source: 'commands/copilot/foreign.md', destination: { class: 'root', path: 'copilot/foreign.md' } }),
    ],
    retirements: [],
  };
  try {
      const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: { root: '' } });
    assert.deepEqual(projections.map(p => p.destinationPath), [
      path.resolve('', 'a/claude'),
      path.resolve('', 'z/claude'),
    ]);
    assert.ok(projections.every(p => p.harness === 'claude'));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('all supported strategies produce generic projection metadata and safeguards', () => {
  const repoRoot = makeRepo();
  try {
    const strategies = ['copy', 'tunable-seed', 'merge-jsonc', 'forwarding-manifest'];
    const manifest = {
      version: 1,
      projections: strategies.map((strategy, index) => rule({
        id: `strategy-${index}`,
       source: 'commands/claude/alpha.md',
         destination: { class: 'root', path: `strategy-${index}/claude.md` },
        recursive: false,
        strategy,
        ownership: index === 1 ? 'owned' : 'managed',
         drift: index === 2 ? 'content' : 'missing',
      })),
      retirements: [],
    };
      const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: { root: '' } });
    assert.deepEqual(projections.map(p => p.strategy), strategies);
    assert.ok(projections.every(p => p.ownership && p.drift));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('expanded projections expose missing, unexpected nested, and content drift audit targets', () => {
  const repoRoot = makeRepo();
  try {
    const manifest = { version: 1, projections: [rule({ drift: 'content' })], retirements: [] };
     const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: { root: path.join(repoRoot, 'installed') } });
    assert.ok(projections.every(p => 'sourcePath' in p && 'destinationPath' in p && 'ownership' in p && 'drift' in p));
    assert.ok(projections.some(p => p.drift === 'content'));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('STEP1_RETIRE_INLINE: manifest and installer expose only routed harnesses', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), 'sai-step1-retire-inline'));
  const supported = ['claude', 'opencode'];
  const flow = require('../bin/install-flow.js');

  assert.deepEqual(Object.keys(flow).filter(name => /copilot/i.test(name)), []);
  assert.equal(typeof flow.installClaude, 'function');
  assert.equal(typeof flow.installOpencode, 'function');
  assert.equal(typeof flow.installCopilot, 'undefined');

  assert.ok(manifest.projections.length > 0);
  assert.ok(manifest.projections.every(projection =>
    projection.harnesses.every(harness => supported.includes(harness))));
  assert.equal(manifest.projections.some(projection =>
    projection.source === 'sai/orchestration/inline-invocation.md' ||
    /inline-invocation\.md$/.test(projection.destination.path)), false);

  for (const harness of supported) {
    const active = expandInstallManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot,
    });
    assert.ok(active.length > 0, `${harness} should have active projections`);
    assert.ok(active.every(projection => projection.harness === harness));
     const routedBindings = active
       .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'))
       .filter(source => source.startsWith(`sai/orchestration/workers/bindings/${harness}/`));
     assert.equal(routedBindings.length, 0, `${harness} should retain no retired per-harness worker binding sources`);
     const adapterSource = `sai/adapters/${harness}/idea-list-render.md`;
     const adapterProjection = active.find(projection =>
       path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/') === adapterSource);
     assert.ok(adapterProjection, `${harness} should retain the adapter idea-list-render source`);
     assert.equal(
       path.relative(destinationRoot.sai, adapterProjection.destinationPath).split(path.sep).join('/'),
       `adapters/${harness}/idea-list-render.md`,
       `${harness} should project the idea-list-render adapter destination`
     );

    const retirements = expandRetirementManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot,
    });
    assert.ok(retirements.length > 0, `${harness} should expose applicable retirements`);
    assert.ok(retirements.every(retirement => retirement.harness === harness));
  }

  assert.deepEqual(expandInstallManifest(manifest, {
    harness: 'copilot',
    repoRoot,
    destinationRoot,
  }), []);
});

test('STEP1_RETIRE_INLINE: universal skill metadata names only the supported harnesses', () => {
  for (const relativePath of [
    'skills/universal/sai-commands/SKILL.md',
    'skills/universal/safe-operations/SKILL.md',
  ]) {
    const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
    const metadata = source.match(/^compatibility:\s*(.+)$/im);
    assert.ok(metadata, `${relativePath} should declare compatibility metadata`);
    assert.match(metadata[1], /^\s*(?:claude\s*,\s*opencode|opencode\s*,\s*claude)\s*$/i);
  }
});

test('canonical manifest validates all historical retirements and excludes them from active projections', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const workerNames = [
    'sai-1-spec-proposal-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
  ];
  const proxyRetirements = manifest.retirements.filter(retirement => retirement.id.endsWith('-proxy-skill'));
  assert.equal(proxyRetirements.length, 14, 'the manifest should retire one proxy skill per routed worker and harness');
  assert.deepEqual(
    proxyRetirements.map(retirement => retirement.harnesses).flat().sort(),
    [...workerNames.flatMap(() => ['claude', 'opencode'])].sort(),
    'proxy retirement ownership should cover Claude and opencode only'
  );
  const expectedProxyRecords = [
    ['retired-claude-sai-1-spec-proposal-worker-proxy-skill', 'sai-1-spec-proposal-worker', 'a800e2f9bbc14ca8d8f3e42e1f36ae07684bb7275d662d68528b49828c3ad4ee'],
    ['retired-claude-sai-2-design-worker-proxy-skill', 'sai-2-design-worker', '502df5d4a20f527a6412f66461826e3b49d24556ee2567063c391e98f0dc4fd0'],
    ['retired-claude-sai-3-implementation-worker-proxy-skill', 'sai-3-implementation-worker', '1f35c1c969eb3f2a346174d604f293e9b870feaf5b63f6446e16026e6d3020a0'],
    ['retired-claude-sai-5-review-worker-proxy-skill', 'sai-5-review-worker', '6157297386700bfe4afe05d6c7d811f8c92d1c34647a0818304cdf595eb71dae'],
    ['retired-claude-sai-6-security-worker-proxy-skill', 'sai-6-security-worker', '17e36d185354baff27643baea4e1d475feadd880c0e4f1cbc8f2daeb2d25cb66'],
    ['retired-claude-sai-7-performance-worker-proxy-skill', 'sai-7-performance-worker', '64739dcc37bd11a1f7859baf7b44036d6fe0aac39ff612b13ec3dcd5d497a5eb'],
    ['retired-claude-sai-8-accessibility-worker-proxy-skill', 'sai-8-accessibility-worker', '262fe9d207a9d726fd84d3a75c921ea9d32fa0bf35f5a6d6b651354eae85345e'],
    ['retired-opencode-sai-1-spec-proposal-worker-proxy-skill', 'sai-1-spec-proposal-worker', '6e5e2099d8f04298a189924bca47b28538ff6a58cab7af9a788685a9cf74007c'],
    ['retired-opencode-sai-2-design-worker-proxy-skill', 'sai-2-design-worker', '5302680208a21f588021f046cf8bcd424d9df7794f2269264367f352fd0f9d76'],
    ['retired-opencode-sai-3-implementation-worker-proxy-skill', 'sai-3-implementation-worker', '647869b6e1ade95b34fdb3c4d257ba9444993a914baf39bfa72731f75dd0fd73'],
    ['retired-opencode-sai-5-review-worker-proxy-skill', 'sai-5-review-worker', 'aee35c7e2d636d48e6fe003da250821dc577acc7874dd4fbad0146de889acff9'],
    ['retired-opencode-sai-6-security-worker-proxy-skill', 'sai-6-security-worker', 'f268bbbe0b8ff386d4ccc6f0875225d4b267d343ddaf0b072b33f3c10eec2db2'],
    ['retired-opencode-sai-7-performance-worker-proxy-skill', 'sai-7-performance-worker', '76bd076266f597119fc2834efae1183ab977c53cd9fac79c20f48d2bd7803d48'],
    ['retired-opencode-sai-8-accessibility-worker-proxy-skill', 'sai-8-accessibility-worker', '87d5d3cb8503b54b97590341153eeb730a762b10001d9b47c0f77b2155e52c37'],
  ];
  for (const [id, worker, digest] of expectedProxyRecords) {
    const retirement = manifest.retirements.find(record => record.id === id);
    assert.deepEqual(retirement, {
      id,
      destination: { class: 'skills', path: `${worker}/SKILL.md` },
      harnesses: [id.startsWith('retired-claude-') ? 'claude' : 'opencode'],
      managedHashes: [digest],
    });
  }
  assert.equal(proxyRetirements.some(retirement => retirement.harnesses.includes('copilot')), false);
  assert.ok(manifest.retirements.every(retirement => ['sai', 'skills', 'agents'].includes(retirement.destination.class)));
  assert.ok(proxyRetirements.every(retirement => retirement.destination.class === 'skills'));
  assert.ok(proxyRetirements.every(retirement => retirement.managedHashes.length > 0 &&
    retirement.managedHashes.every(value => /^[0-9a-f]{64}$/.test(value))));
  for (const harness of ['claude', 'opencode']) {
    const names = proxyRetirements.filter(retirement => retirement.harnesses.includes(harness));
    assert.deepEqual(names.map(retirement => retirement.destination.path).sort(),
      workerNames.map(name => `${name}/SKILL.md`).sort());
  }
  assert.ok(manifest.retirements.some(retirement => retirement.id.includes('-claude-') &&
    retirement.id.includes('worker-binding')),
  'historical harness-qualified binding retirement records remain available');
  for (const harness of ['claude', 'opencode']) {
    const active = expandInstallManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot: workerDestinationRoots(path.join(os.tmpdir(), `sai-retirement-active-${harness}`)),
    });
    assert.equal(active.some(projection => projection.strategy === 'forwarding-manifest'), false,
      `${harness} must have no active worker forwarding projection`);
    assert.equal(active.some(projection => /skills[\\/]((claude|opencode)[\\/])?sai-.*-worker[\\/]SKILL\.md$/.test(
      path.relative(repoRoot, projection.sourcePath))), false,
    `${harness} must not project a worker proxy source`);
  }
  return;
  const expected = [
    {
      id: 'retired-sai-2-design',
      destination: { class: 'sai', path: 'commands/sai-2-design.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      managedHashes: [
        '019a4e3f36fda7d2e9175d00668a5bdfaebbea245609086bffb91f9802e3d22a',
        '02e501c0ef744b7f064d3149f9177ae5c382814ada87829dc05db23075a23d1e',
        '11eaceeb96d585ec87256aaf67cd9b8eb188082f80e2d536347ebef2c66722ba',
        '12c64b9e943e3ad096b22de7edde10299040acdb286fbec43a0d8e07d135e7a1',
        '217bf88c785582366a68d5b26a125ed1f218f9c281a443ba8a8200e465dce669',
        '3c1f426088e8741f55ff9aa6f92fab83e5e0d538e1bed2dbd929446f885713d0',
        '575d793e53678e9f8c26e6704136006a5e91e14c041adbf38d865e47ccf07c81',
        '5a9269962cd7524429837803fe80623bb858b8dfc49fd5d8f3720af2e916fccc',
        '5ccb6ee97190bcabb55c63cb4b35f3510443fb1ca55c44af4bd2ef80fa2d9b8a',
        '6f1eb1d4a18877c8fd64da6f7cb2f132d6e9fac6b91e934834642a46402576ab',
        '71e196f55e94da7dce0152f97e5f9a46fb6b5ae9056466141e9a37ef54bcd6b6',
        '7b6683cbfd1611bd5897a2007b2c482085b807e1344bb64316f973b4354b16c0',
        '7c6c0a5449099407469b9b670e0828f878cea5d9cc9a5d16d51b881aa009894c',
        'abb5e1d70a943d3b02f4e360f0a4e45efc65244c3a6d50826b096c0fee3887f5',
        'af7c25ae97dbaf26397e86ea6150fa096e2dd1a52fe99be519d61e6aa8b2741d',
        'b9a909cce730b032056b9a1aa9574c48878e8008a509eb5c533e8b9c29803300',
        'b9e8c47a92e5bb3ab7e41583bf7ddff47efcefabb6d1cacb5881c04417569b9f',
        'c74baf43fe46fcb8a4ca5084480f32f6cb5d55840b4989d0cf5edb3bdfde24da',
        'd1ff86ea45811f14bc2c65941fdf7b80c3a6531adaa678c356243043b2b26692',
        'd49b2c04e6ab6f630a4da659d5c45f6ec77e7b143bc38b2d1a24912aa84cc378',
        'd8df318f314a6e028f804553de712b3fa4da6232aff90ba383a1316a739a71f6',
        'def179bd4beaa42c7de4e86eabdb7ddd820b6fdb95be76f779b306c8900266ac',
        'fde71350d93d07bec0fcaf3de1e441da348311e5f205a17f85c3c9637a2a3ee3',
      ],
    },
    {
      id: 'retired-sai-3-implement',
      destination: { class: 'sai', path: 'commands/sai-3-implement.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      managedHashes: [
        '181eae486677d710242e395137f6e3f2c5b0206c26d6b2ce783d48d58ce95a54',
        '217a21c606584d4a2b05659432c977941409acc2b47b92e937ad3fadcfee2e62',
        '677d5b154a6228e588507d7c1ba117a921c871f176e92e79d4cff29475866794',
        '7138bcc212e6cfcd921b7d36a383084f604289cd48e4f6874de14ebdf2ba7df9',
        '753638b2ebecdb2ea099dffa18b89bc5c4b54a8ddc6fab5c6d35550300f97220',
        '7624713d11145c4d01b210d36397d5c2874345039cc29095fd1647f301ce06dd',
        '7c34672592bc626ac9d8e39d53a7b9b1fd61fa4f961590480f06f1a1be545cdc',
        '7d2435a8d565224f1f3708a8aa51cc29ff29325ae34a608672042f5cac137fbe',
        '8dacdb9ce90f0a1a231d26cafaeaade9a2a273f6630750ffcc73ac4bff921275',
        '9881841bfee6eaf4492e4da3df936281abe5816e46c9dda11559ac319c87f050',
        'ac2c83812a05791d248e13e1740b0be774bba0ab048dae698bbcf7874e7157c2',
        'b591cb30e451b2020cfe516009214dd50ef0065bb71ae26198e9f43f07cedb36',
        'c083613112265f522fa8e15b8571a523116028f3f4aa10a91c642415dc603057',
        'ca3a5fc6cc23efec9b051ded0cbca4fe48451f9b1d766736349512d6f111aa2c',
        'd8280a41f5eaa13cec8f498d768417f28ba8367a9833b02fb0ce46d06ecc1d13',
        'dac09dfc50e331550351bc535fde36a532a438be2b5faf13e47902a7d858ffb1',
        'f2dec038f575ebdcf5f48bf096fc8741318564995b59886a5ef5fe0361cfac4f',
        'f7358cef4dc7e87a32bda452acbc3a58cc6f0746a83b6721cba4dfcf7a6f872a',
      ],
    },
    {
      id: 'retired-sai-2-design-core',
      destination: { class: 'sai', path: 'compat/sai-2-design-core.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      managedHashes: ['072a970983f017a3f46207131c4bede350447f59018cb193fcd9886a81b3bd36'],
    },
    {
      id: 'retired-sai-3-implementation-core',
      destination: { class: 'sai', path: 'compat/sai-3-implementation-core.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      managedHashes: ['e6f583546585154f15d5629c7da0aeafae2505fa63be4ec8be537a5f03393176'],
    },
    {
      id: 'retired-implement-invocation',
      destination: { class: 'sai', path: 'compat/implement-invocation.md' },
      harnesses: ['copilot'],
      managedHashes: [
        'd044b9f82118577cf029b06a4ae842454dd6b5c5292aaa56413766f86d79fc83',
        'f5065219359ef2347a163d21e9b926669659d878e65a8a7722554e2d4affd6ec',
      ],
    },
    {
      id: 'retired-sai-2-design-inline',
      destination: { class: 'sai', path: 'commands/sai-2-design-inline.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      managedHashes: [
        'dc1a8c7a30896a9368a5c114aba100e45f26aa9d826996084d674576c274f1f7',
        '21d3130c2d41251162aabb1682495e9cb37ab397c6de45e38207b701709e5159',
        '7524f761c55a20c2c69915c8656e2699fa4b1aba2771ea2132970bf9afb00981',
        'c1bb3a75dc12160745e6fda6fc26d091e1f23eda69775acac224bf29d5ab4741',
        'a1db1d07057d6ef6f05b4c9b0254a7c45c6c8cfeedcbe1a6a7a5415638350141',
      ],
    },
    {
      id: 'retired-sai-3-implement-inline',
      destination: { class: 'sai', path: 'commands/sai-3-implement-inline.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      managedHashes: [
        '9881841bfee6eaf4492e4da3df936281abe5816e46c9dda11559ac319c87f050',
        '8c7333f28044b93a745e68dd70a53515a8911995955916f63d55c2e84088f9b5',
        'a6272f4d3bb8bd114bcedbc7c1f0ebc9464a8abc3fd6c3c3241fea03a7af63dd',
        'b5fc306377ccc505eed731c98326f3f3afdeb5950e1f417143d5a2267d8557df',
        '6775d9054e3e9bd90c1c1cda26cfce40ff784236009a88e667430bb7d4db0380',
      ],
    },
    {
      id: 'retired-adr-index-template',
      destination: { class: 'sai', path: 'compat/_templates/adr-index.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      managedHashes: [
        '689c2cab58cd9cc41c3a37ecc32e16a4e4503c1ac379304de1fc8e3b6c4311c2',
        '2a8052146bbcf677adfd4881bc280b71a9a92ffaf5a23142cf3b92c7a85eaf01',
      ],
    },
    {
      id: 'retired-claude-spec-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/claude/spec-worker.md' },
      harnesses: ['claude'],
      managedHashes: ['cc1234710fcd3aaee81850173e3902110b25caf7036d5a276a8e32c761817258'],
    },
    {
      id: 'retired-claude-design-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/claude/design-worker.md' },
      harnesses: ['claude'],
      managedHashes: [
        'ce13052eef97c0c64c3b0634dd9297c9c0d9403a06bbe12bcb4c18b104ef529c',
        'f59bc58934b88f81fe8ee9c2717bbe86701eace201215ecdf22ac02938f0977f',
      ],
    },
    {
      id: 'retired-claude-implementation-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/claude/implementation-worker.md' },
      harnesses: ['claude'],
      managedHashes: [
        '38f838655ef7eccada7a7a9373dd3bd5a3d3e7cd28af368f25412bad6cb4f7ff',
        'bbc973e4749e488a13c295a15b0e5d593cf20e76e030a66038cbed72a2eb5665',
        'be263652007b2be2f2b77c9983d5656525ad27dfa0dc89311fa6a0a01f3b955b',
      ],
    },
    {
      id: 'retired-claude-review-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/claude/review-worker.md' },
      harnesses: ['claude'],
      managedHashes: ['54e24207cce8198c9ab9f0bf406aea2340fdb6d598e490d95908b661712b1634'],
    },
    {
      id: 'retired-claude-security-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/claude/security-worker.md' },
      harnesses: ['claude'],
      managedHashes: ['c1a9b87dd71d237d196a468dad22e98c3d44396a3d371225e05a742217dbe9e6'],
    },
    {
      id: 'retired-claude-performance-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/claude/performance-worker.md' },
      harnesses: ['claude'],
      managedHashes: ['f81800d9a7ff68a7abea2dc0e360bf40cabbbc1d51f894846d2df788df18f1bc'],
    },
    {
      id: 'retired-claude-accessibility-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/claude/accessibility-worker.md' },
      harnesses: ['claude'],
      managedHashes: [
        '6cf9757559429e2b7f394c5ef1b46a5b860720b17d77d2b3118547d9c3294173',
        '7c5d22e78aa9d2fff5121d5ebcf1d5e8f4593f383ec853f7b228446f80aa4a10',
      ],
    },
    {
      id: 'retired-opencode-spec-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/opencode/spec-worker.md' },
      harnesses: ['opencode'],
      managedHashes: ['fb326f086cd42d71268379564ee0674bb5bf0544322ffd9a0a3412e535ee646f'],
    },
    {
      id: 'retired-opencode-design-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/opencode/design-worker.md' },
      harnesses: ['opencode'],
      managedHashes: [
        '179e9f3169cfdea8164dcd8006fa72de7b00b504adbbac8bcad9cd476244dab5',
        '57bc263bbc70f56a746186fc157b79befda13566334c85c2d7f2f5e076a7bde3',
      ],
    },
    {
      id: 'retired-opencode-implementation-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/opencode/implementation-worker.md' },
      harnesses: ['opencode'],
      managedHashes: [
        '48537406a68134f525f6b206c1abd678927097a8d7d4bc525f31da0db953b6d9',
        'babd46318eb245472a5eb15ec5abee1ee56397e0443b6e53f3664ee482eba4d0',
        'bb986c56b074b9d9966ef5219f192313a52e39a0bf86c81008581cbe1b77a109',
      ],
    },
    {
      id: 'retired-opencode-review-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/opencode/review-worker.md' },
      harnesses: ['opencode'],
      managedHashes: ['977381a05d88569190e709bb6cc9514baf5b072137f07c1980e9e63f58a7ab77'],
    },
    {
      id: 'retired-opencode-security-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/opencode/security-worker.md' },
      harnesses: ['opencode'],
      managedHashes: ['4fe4ef0a90291fc72c58be65096170b3a927b365ac9d1da5db2fe254de4db6c1'],
    },
    {
      id: 'retired-opencode-performance-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/opencode/performance-worker.md' },
      harnesses: ['opencode'],
      managedHashes: ['a10766cd4ce3263a10c457dc783a881040af44763a65cb1b32bc68b64d120272'],
    },
    {
      id: 'retired-opencode-accessibility-worker-binding',
      destination: { class: 'sai', path: 'orchestration/workers/bindings/opencode/accessibility-worker.md' },
      harnesses: ['opencode'],
      managedHashes: [
        '272605e01a63a7c423829ba873504daedff28733b2d27e4677d7850d014f826b',
        '415b56d211cac6394eca3e0d867ae3f927fdbbbe354a6e0daae94af73eb597f3',
      ],
    },
  ];
  assert.deepEqual(manifest.retirements, expected);
   assert.deepEqual(manifest.retirements.filter(retirement =>
     retirement.destination.path === 'orchestration/workers/bindings/idea-list-render.md'), [
     {
       id: 'retired-claude-idea-list-render-binding',
       destination: { class: 'sai', path: 'orchestration/workers/bindings/idea-list-render.md' },
       harnesses: ['claude'],
       managedHashes: [
         '238b0fd7ef14b3f155e4bee008be9883948ad9b17e8a9477e79f0d013e878f23',
         '792d0614a8a724ef19364976195ba8f6f0d08e70bc4d5db68eee0343603f54b0',
         '8376ebfd6f8c59709d65a6d79be0dfbf10baaeb6f282bd76442a302c26f30b37',
       ],
     },
     {
       id: 'retired-opencode-idea-list-render-binding',
       destination: { class: 'sai', path: 'orchestration/workers/bindings/idea-list-render.md' },
       harnesses: ['opencode'],
       managedHashes: [
         'af9f1b8915db80210f9595c1adf7568c695401ba059f03e408c99e6273856347',
         '5d26dd5bb555d525c4e7658fc021cb70a0dcdf90f248d020c51b2409ddf9a348',
         '74516e0219b92fc12be50b19d411af5031861ced9616e794630f32b1386a7dbf',
       ],
     },
   ]);
  assert.equal(manifest.retirements.flatMap(retirement => retirement.managedHashes).length, 91);
  assert.ok(manifest.retirements.flatMap(retirement => retirement.managedHashes).every(hash => /^[0-9a-f]{64}$/.test(hash)));

  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-retirement-commands'),
    sai: path.join(os.tmpdir(), 'sai-retirement-sai'),
    skills: path.join(os.tmpdir(), 'sai-retirement-skills'),
    agents: path.join(os.tmpdir(), 'sai-retirement-agents'),
    config: path.join(os.tmpdir(), 'sai-retirement-config'),
    root: path.join(os.tmpdir(), 'sai-retirement-config'),
  };
  for (const harness of ['claude', 'opencode']) {
    const retirements = expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot });
     assert.deepEqual(retirements.map(retirement => retirement.destinationPath), [
        path.resolve(destinationRoot.sai, 'commands/sai-2-design.md'),
        path.resolve(destinationRoot.sai, 'commands/sai-2-design-inline.md'),
        path.resolve(destinationRoot.sai, 'commands/sai-3-implement.md'),
        path.resolve(destinationRoot.sai, 'commands/sai-3-implement-inline.md'),
        path.resolve(destinationRoot.sai, 'commands/design/invocation.md'),
        path.resolve(destinationRoot.sai, 'commands/design/instructions.md'),
        path.resolve(destinationRoot.sai, 'commands/implement/invocation.md'),
        ...[
            path.resolve(destinationRoot.sai, 'orchestration/workers/bindings', harness, 'accessibility-worker.md'),
            path.resolve(destinationRoot.sai, 'orchestration/workers/bindings', harness, 'design-worker.md'),
            path.resolve(destinationRoot.sai, 'orchestration/workers/bindings', harness, 'implementation-worker.md'),
            path.resolve(destinationRoot.sai, 'orchestration/workers/bindings', harness, 'performance-worker.md'),
            path.resolve(destinationRoot.sai, 'orchestration/workers/bindings', harness, 'review-worker.md'),
            path.resolve(destinationRoot.sai, 'orchestration/workers/bindings', harness, 'security-worker.md'),
            path.resolve(destinationRoot.sai, 'orchestration/workers/bindings', harness, 'spec-worker.md'),
            path.resolve(destinationRoot.skills, 'sai-8-accessibility-worker/SKILL.md'),
            path.resolve(destinationRoot.skills, 'sai-2-design-worker/SKILL.md'),
            path.resolve(destinationRoot.skills, 'sai-3-implementation-worker/SKILL.md'),
            path.resolve(destinationRoot.skills, 'sai-7-performance-worker/SKILL.md'),
            path.resolve(destinationRoot.skills, 'sai-5-review-worker/SKILL.md'),
            path.resolve(destinationRoot.skills, 'sai-6-security-worker/SKILL.md'),
            path.resolve(destinationRoot.skills, 'sai-1-spec-proposal-worker/SKILL.md'),
          ],
          path.resolve(destinationRoot.sai, 'compat/_templates/adr-index.md'),
        path.resolve(destinationRoot.sai, 'compat/sai-2-design-core.md'),
        path.resolve(destinationRoot.sai, 'compat/sai-3-implementation-core.md'),
     ].sort());
    assert.ok(retirements.every(retirement => retirement.harness === harness));
    const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    assert.equal(active.some(projection => projection.destinationPath.endsWith('sai-2-design-inline.md')), false);
    assert.equal(active.some(projection => projection.destinationPath.endsWith('sai-3-implement-inline.md')), false);
  }
});

test('retirement validation rejects malformed records, duplicate ids or destinations, and invalid hashes', () => {
  const repoRoot = makeRepo();
  try {
    const base = {
      version: 1,
      projections: [],
      retirements: [{
        id: 'retired',
        destination: { class: 'sai', path: 'old.md' },
        harnesses: ['claude', 'opencode'],
        managedHashes: ['a'.repeat(64)],
      }],
    };
    const cases = [
      [{ ...base, retirements: undefined }, /retirements array/],
      [{ ...base, projections: [rule({ id: 'retired' })] }, /duplicate retirement id/],
      [{ ...base, retirements: [{ ...base.retirements[0], destination: { class: 'root', path: 'old.md' } }] }, /destination/],
      [{ ...base, retirements: [{ ...base.retirements[0], harnesses: ['unknown'] }] }, /invalid harnesses/],
      [{ ...base, retirements: [{ ...base.retirements[0], managedHashes: ['A'.repeat(64)] }] }, /lowercase SHA-256/],
      [{ ...base, retirements: [{ ...base.retirements[0], managedHashes: ['a'.repeat(63)] }] }, /lowercase SHA-256/],
      [{ ...base, retirements: [{ ...base.retirements[0], managedHashes: ['a'.repeat(64), 'a'.repeat(64)] }] }, /duplicate managedHashes/],
      [{ ...base, retirements: [base.retirements[0], { ...base.retirements[0] }] }, /duplicate retirement id/],
      [{ ...base, retirements: [base.retirements[0], { ...base.retirements[0], id: 'other' }] }, /Duplicate retirement destination/],
    ];
    for (const [manifest, pattern] of cases) {
      assert.throws(() => expandRetirementManifest(manifest, {
        harness: 'claude',
        repoRoot,
         destinationRoot: { sai: '/dest', skills: '/skills' },
      }), pattern);
    }
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('retirement expansion resolves sai and skills destination classes independently', () => {
  const repoRoot = makeRepo();
  try {
    const manifest = {
      version: 1,
      projections: [],
      retirements: [
        { id: 'retired-sai', destination: { class: 'sai', path: 'old/sai.md' }, harnesses: ['claude'], managedHashes: ['a'.repeat(64)] },
        { id: 'retired-skills', destination: { class: 'skills', path: 'old/skill.md' }, harnesses: ['claude'], managedHashes: ['b'.repeat(64)] },
      ],
    };
    let expanded;
    assert.doesNotThrow(() => {
      expanded = expandRetirementManifest(manifest, {
        harness: 'claude',
        repoRoot,
        destinationRoot: { sai: '/sai-root', skills: '/skills-root' },
      });
    });
    if (!expanded) return;
    assert.deepEqual(expanded.map(record => record.destinationPath), [
      path.resolve('/sai-root', 'old/sai.md'),
      path.resolve('/skills-root', 'old/skill.md'),
    ]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('folded instruction templates project to their co-located and root destinations for every harness', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-templates-commands'),
    sai: path.join(os.tmpdir(), 'sai-templates-sai'),
    skills: path.join(os.tmpdir(), 'sai-templates-skills'),
    agents: path.join(os.tmpdir(), 'sai-templates-agents'),
    config: path.join(os.tmpdir(), 'sai-templates-config'),
    root: path.join(os.tmpdir(), 'sai-templates-config'),
  };
  const templateMap = [
    { source: 'sai/commands/accessibility/accessibility-report.template.md', destination: 'commands/accessibility/accessibility-report.template.md' },
    { source: 'sai/commands/implement/implementation-plan.template.md', destination: 'commands/implement/implementation-plan.template.md' },
    { source: 'sai/commands/performance/performance-report.template.md', destination: 'commands/performance/performance-report.template.md' },
    { source: 'sai/commands/pr/pr-body.template.md', destination: 'commands/pr/pr-body.template.md' },
    { source: 'sai/commands/review/review-report.template.md', destination: 'commands/review/review-report.template.md' },
    { source: 'sai/commands/security/security-report.template.md', destination: 'commands/security/security-report.template.md' },
    { source: 'sai/commands/implement/adr-index.template.md', destination: 'commands/implement/adr-index.template.md' },
    { source: 'sai/commands/implement/ddr-index.template.md', destination: 'commands/implement/ddr-index.template.md' },
  ];
  let projectedCount = 0;
  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const sourceSet = new Set(projections.map(projection =>
      path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    assert.equal(sourceSet.has('sai/instructions/change-overview.md'), false,
      `${harness} must not source an active projection from sai/instructions/`);
    assert.equal(projections.some(projection =>
      path.relative(destinationRoot.sai, projection.destinationPath).split(path.sep).join('/').startsWith('instructions/')), false,
      `${harness} must not land an active projection at an instructions/ destination`);
    for (const { source, destination } of templateMap) {
      const projection = projections.find(
        p => path.relative(repoRoot, p.sourcePath).split(path.sep).join('/') === source
      );
      assert.ok(projection, `${harness} should project ${source}`);
      assert.equal(
        projection.destinationPath.endsWith(path.join(...destination.split('/'))),
        true,
        `${harness} ${source} should land at ${destination}`
      );
      assert.equal(
        fs.readFileSync(projection.sourcePath, 'utf8'),
        fs.readFileSync(path.join(repoRoot, source), 'utf8'),
        `${harness} ${source} projected source should equal its repository source`
      );
      projectedCount += 1;
    }
  }
  assert.equal(projectedCount, 16, 'eight folded templates across two harnesses should project to 16 paths');
});

test('matrix worker bindings and agents are the sole worker inventory per harness', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility', 'commit', 'archive'];
  const workers = {
    spec: 'sai-1-spec-proposal-worker',
    design: 'sai-2-design-worker',
    implementation: 'sai-3-implementation-worker',
    review: 'sai-5-review-worker',
    security: 'sai-6-security-worker',
    performance: 'sai-7-performance-worker',
    accessibility: 'sai-8-accessibility-worker',
    commit: 'sai-commit-worker',
    archive: 'sai-archive-worker',
  };
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), `sai-matrix-inventory-${harness}`));
    const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/') &&
        phases.includes(path.basename(projection.destinationPath, '-worker.md')))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 9, `${harness} should declare exactly nine worker bindings`);
    assert.deepEqual(bindingNames.sort(), phases.map(phase => `${phase}-worker.md`).sort(),
      `${harness} worker bindings should cover exactly the nine phases`);
    assert.equal(bindingNames.includes('idea-list-render.md'), false,
      `${harness} must not declare an idea-list-render matrix binding projection`);

    const agentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents) &&
        Object.values(workers).includes(path.basename(projection.destinationPath, '.md')))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(agentNames.length, 9, `${harness} should declare exactly nine managed agents`);
    assert.deepEqual(agentNames.sort(), Object.values(workers).sort(),
      `${harness} managed agents should be exactly the nine worker identities`);
    assert.equal(agentNames.some(name => ['budget', 'executor', 'explore'].includes(name)), false,
      `${harness} must not declare support agents as worker inventory`);

    const workerProjections = active.filter(projection => {
      const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
      return isRetiredPerPhaseSource(source, harness) && !source.endsWith('/idea-list-render.md');
    });
    assert.equal(workerProjections.length, 0,
      `${harness} must not project any retired per-phase worker source`);
  }
});

test('canonical manifest projects exactly one harness boot adapter and the utility body cards per harness', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-adapter-commands'),
    sai: path.join(os.tmpdir(), 'sai-adapter-sai'),
    skills: path.join(os.tmpdir(), 'sai-adapter-skills'),
    agents: path.join(os.tmpdir(), 'sai-adapter-agents'),
    config: path.join(os.tmpdir(), 'sai-adapter-config'),
    root: path.join(os.tmpdir(), 'sai-adapter-config'),
  };
  const utilities = ['explore', 'pr', 'retire-docs', 'status', 'worktree'];
  const applyCards = ['coordinator.md', 'red-worker.md', 'green-worker.md', 'runner.md', 'invocation.md'];
  const commitCards = ['coordinator.md', 'worker.md'];
  const archiveCards = ['coordinator.md', 'worker.md'];
  const flatSources = [
    'sai/commands/sai-4-apply.md',
    'sai/commands/sai-archive.md',
    'sai/commands/sai-backfill.md',
    'sai/commands/sai-commit.md',
    'sai/commands/sai-explore.md',
    'sai/commands/sai-pr.md',
    'sai/commands/sai-status.md',
    'sai/commands/sai-worktree.md',
  ];

  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const sources = projections.map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'));
    const sourceSet = new Set(sources);

    assert.ok(sourceSet.has(`sai/adapters/${harness}/boot.md`),
      `${harness} should project its own boot adapter`);
    const foreign = harness === 'claude' ? 'sai/adapters/opencode/boot.md' : 'sai/adapters/claude/boot.md';
    assert.equal(sourceSet.has(foreign), false,
      `${harness} must not project the foreign boot adapter ${foreign}`);

    for (const utility of utilities) {
      assert.ok(sourceSet.has(`sai/commands/${utility}/body.md`),
        `${harness} should project the utility card sai/commands/${utility}/body.md`);
    }
    for (const card of commitCards) {
      assert.ok(sourceSet.has(`sai/commands/commit/${card}`),
        `${harness} should project the routed commit card sai/commands/commit/${card}`);
    }
    for (const card of archiveCards) {
      assert.ok(sourceSet.has(`sai/commands/archive/${card}`),
        `${harness} should project the routed archive card sai/commands/archive/${card}`);
    }
    assert.equal(sourceSet.has('sai/commands/commit/body.md'), false,
      `${harness} must not project the retired commit body card`);
    assert.equal(sourceSet.has('sai/commands/archive/body.md'), false,
      `${harness} must not project the retired archive body card`);
    for (const card of ['coordinator.md', 'worker.md']) {
      assert.ok(sourceSet.has(`sai/commands/backfill/${card}`),
        `${harness} should project the routed backfill card sai/commands/backfill/${card}`);
    }
    assert.equal(sourceSet.has('sai/commands/backfill/body.md'), false,
      `${harness} must not project the retired backfill body card`);
    for (const card of applyCards) {
      assert.ok(sourceSet.has(`sai/commands/apply/${card}`),
        `${harness} should project the routed apply card sai/commands/apply/${card}`);
    }
    assert.equal(sourceSet.has('sai/commands/apply/body.md'), false,
      `${harness} must not project the retired apply body card`);
    assert.equal(sourceSet.has('sai/commands/apply/instructions.md'), false,
      `${harness} must not project the retired monolithic apply instruction`);
    for (const flat of flatSources) {
      assert.equal(sourceSet.has(flat), false,
        `${harness} must not project the flat utility source ${flat}`);
    }

    const adapter = projections.find(projection =>
      projection.destinationPath.endsWith(path.join('adapters', harness, 'boot.md')));
    assert.ok(adapter, `${harness} should land its boot adapter at sai/adapters/${harness}/boot.md`);
    assert.equal(adapter.harness, harness, `${harness} boot adapter projection should be harness-scoped`);
    for (const utility of utilities) {
      const card = projections.find(projection =>
        projection.destinationPath.endsWith(path.join('commands', utility, 'body.md')));
      assert.ok(card, `${harness} should land the ${utility} utility card at sai/commands/${utility}/body.md`);
    }
    for (const card of applyCards) {
      const applyCard = projections.find(projection =>
        projection.destinationPath.endsWith(path.join('commands', 'apply', card)));
      assert.ok(applyCard, `${harness} should land the routed apply card at sai/commands/apply/${card}`);
    }
    assert.equal(projections.some(projection =>
      projection.destinationPath.endsWith(path.join('commands', 'apply', 'body.md'))), false,
    `${harness} must not land the retired apply body card`);
    assert.equal(projections.some(projection =>
      projection.destinationPath.endsWith(path.join('commands', 'apply', 'instructions.md'))), false,
    `${harness} must not land the retired monolithic apply instruction`);
  }
});

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
const flatUtilityFilename = name => (name === 'apply' ? 'sai-4-apply.md' : `sai-${name}.md`);
const STEP3_SUPERSEDED_RETIREMENT_PATHS = [
  ...STEP3_SUPERSEDED_UTILITIES.map(name => `commands/${flatUtilityFilename(name)}`),
  'orchestration/coordinator-contract.md',
  'orchestration/worker-lifecycle.md',
  ...STEP3_SUPERSEDED_WORKERS.map(name => `orchestration/workers/${name}.md`),
];
const STEP3_SUPERSEDED_SOURCES = [
  ...STEP3_SUPERSEDED_UTILITIES.map(name => `sai/commands/${flatUtilityFilename(name)}`),
  'sai/orchestration/coordinator-contract.md',
  'sai/orchestration/worker-lifecycle.md',
  ...STEP3_SUPERSEDED_WORKERS.map(name => `sai/orchestration/workers/${name}.md`),
];

test('STEP3_RETIREMENT: superseded flat destinations are retired for both harnesses and never projected', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);

  for (const destinationPath of STEP3_SUPERSEDED_RETIREMENT_PATHS) {
    const records = manifest.retirements.filter(retirement =>
      retirement.destination.class === 'sai' && retirement.destination.path === destinationPath);
    assert.equal(records.length, 1,
      `exactly one retirement record should cover the superseded destination ${destinationPath}`);
    assert.deepEqual(records[0].harnesses, ['claude', 'opencode'],
      `${destinationPath} should be retired for an explicit claude/opencode allowlist`);
    assert.ok(records[0].managedHashes.length > 0,
      `${destinationPath} should carry a non-empty managed-hash set`);
    assert.ok(records[0].managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)),
      `${destinationPath} should carry lowercase SHA-256 managed hashes`);
  }

  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), `sai-step3-superseded-${harness}`));
    const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const sources = new Set(active.map(projection =>
      path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    const activeDestinations = new Set(active.map(projection =>
      path.relative(destinationRoot.sai, projection.destinationPath).split(path.sep).join('/')));
    const retirements = expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot });
    const retirementDestinations = new Set(retirements.map(record =>
      path.relative(destinationRoot.sai, record.destinationPath).split(path.sep).join('/')));

    for (const sourcePath of STEP3_SUPERSEDED_SOURCES) {
      assert.equal(sources.has(sourcePath), false,
        `${harness} must not source an active projection from ${sourcePath}`);
    }
    for (const destinationPath of STEP3_SUPERSEDED_RETIREMENT_PATHS) {
      assert.equal(activeDestinations.has(destinationPath), false,
        `${harness} must not land an active projection at ${destinationPath}`);
      assert.equal(retirementDestinations.has(destinationPath), true,
        `${harness} should expand a retirement destination for ${destinationPath}`);
    }
  }
});

test('STEP3_AUDIT: source audit rejects the superseded destinations while allowing historical exclusions', () => {
  const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step3-manifest-audit-'));
  const referenceLines = STEP3_SUPERSEDED_SOURCES
    .map(destination => `# wrapper navigation references @${destination} directly`);
  const historicalFiles = [
    path.join('docs', 'adr', '0001-superseded-layout.md'),
    path.join('openspec', 'changes', 'archive', 'legacy-change', 'proposal.md'),
  ];
  try {
    const activeDir = path.join(fixture, 'sai', 'commands');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.writeFileSync(path.join(activeDir, 'legacy.md'), `${referenceLines.join('\n')}\n`);
    for (const relative of historicalFiles) {
      const fullPath = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, `${referenceLines.join('\n')}\n`);
    }

    const references = auditActiveReferences(fixture);
    const flagged = new Set(references.map(reference => reference.reference));
    for (const destination of STEP3_SUPERSEDED_SOURCES) {
      assert.equal(flagged.has(destination), true,
        `source audit should reject the superseded active path ${destination}`);
    }
    for (const relative of historicalFiles) {
      assert.equal(references.some(reference => reference.file === relative), false,
        `source audit should allow historical references in ${relative}`);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('STEP3_CONTRACT: the complete npm test contract holds with no retirement gaps, collisions, or active references', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);

  for (const destinationPath of STEP3_SUPERSEDED_RETIREMENT_PATHS) {
    assert.equal(manifest.retirements.some(retirement =>
      retirement.destination.class === 'sai' && retirement.destination.path === destinationPath), true,
    `the manifest must retire ${destinationPath}`);
  }

  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), `sai-step3-contract-${harness}`));
    const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const retirements = expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot });
    const activeDestinations = new Set(active.map(projection =>
      path.resolve(projection.destinationPath).toLowerCase()));
    for (const record of retirements) {
      assert.equal(activeDestinations.has(path.resolve(record.destinationPath).toLowerCase()), false,
        `${harness} retirement destination must not collide with an active projection: ${record.destinationPath}`);
    }
  }

  const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');
  const references = auditActiveReferences(repoRoot);
  for (const destination of STEP3_SUPERSEDED_SOURCES) {
    assert.equal(references.some(reference => reference.reference === destination), false,
      `active repository content must not reference ${destination}`);
  }
});

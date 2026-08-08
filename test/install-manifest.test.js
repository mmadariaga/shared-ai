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
};

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
    sourcePath: path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'),
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
    sourcePath: record.sourcePath,
    destinationPath: record.destinationPath,
    strategy: metadata.strategy,
    ownership: metadata.ownership,
    drift: 'content',
  };
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
  }

  const workerSources = new Set(Object.values(MANAGED_WORKER_PROJECTIONS).flatMap(worker => [
    worker.claudeBinding.sourcePath,
    worker.opencodeBinding.sourcePath,
     worker.claudeAgent.sourcePath,
  ]));
});

test('Step 6 security worker exposes binding and worker projections', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), 'sai-security-worker-projections'));
  const source = projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
  const expected = [
     ['claude', 'sai/orchestration/workers/bindings/claude/security-worker.md', path.join('orchestration', 'workers', 'bindings', 'security-worker.md')],
     ['opencode', 'sai/orchestration/workers/bindings/opencode/security-worker.md', path.join('orchestration', 'workers', 'bindings', 'security-worker.md')],
     ['claude', 'agents/claude/sai-6-security-worker.md', 'sai-6-security-worker.md'],
  ];

  for (const [harness, expectedSource, expectedDestination] of expected) {
    const projection = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .find(candidate => source(candidate) === expectedSource);
    assert.ok(projection, `${harness} should project ${expectedSource}`);
    assert.equal(projection.destinationPath.endsWith(expectedDestination), true,
      `${expectedSource} should land at ${expectedDestination}`);
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

test('canonical manifest keeps implementation projections harness-specific', () => {
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
  const implementationSources = {
    claude: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/claude/implementation-worker.md',
      'agents/claude/sai-3-implementation-worker.md',
    ],
    opencode: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
    ],
  };

  for (const harness of Object.keys(implementationSources)) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const sourceSet = new Set(projections.map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    const destinations = projections.map(projection => projection.destinationPath);

    assert.equal(new Set(destinations).size, destinations.length, `${harness} destinations should be unique`);
    assert.deepEqual(destinations, [...destinations].sort((a, b) => a.localeCompare(b)), `${harness} destinations should be ordered`);
    for (const source of implementationSources[harness]) {
      assert.ok(sourceSet.has(source), `${harness} should include ${source}`);
    }

    if (harness === 'claude') {
      assert.equal(sourceSet.has('sai/orchestration/workers/bindings/opencode/implementation-worker.md'), false);
    } else if (harness === 'opencode') {
      assert.equal(sourceSet.has('sai/orchestration/workers/bindings/claude/implementation-worker.md'), false);
      assert.equal(sourceSet.has('agents/claude/sai-3-implementation-worker.md'), false);
    }
  }
});

test('canonical manifest projects routed spec assets only to Claude Code and opencode', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const expected = {
    claude: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-1-spec-proposal-worker.md',
      'sai/orchestration/workers/bindings/claude/spec-worker.md',
      'agents/claude/sai-1-spec-proposal-worker.md',
    ],
    opencode: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-1-spec-proposal-worker.md',
      'sai/orchestration/workers/bindings/opencode/spec-worker.md',
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
  for (const [harness, requiredSources] of Object.entries(expected)) {
    const sources = new Set(expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    for (const source of requiredSources) assert.ok(sources.has(source), `${harness} should project ${source}`);
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
     ['claude', 'sai/orchestration/workers/bindings/claude/review-worker.md', path.join('orchestration', 'workers', 'bindings', 'review-worker.md')],
     ['opencode', 'sai/orchestration/workers/bindings/opencode/review-worker.md', path.join('orchestration', 'workers', 'bindings', 'review-worker.md')],
     ['claude', 'agents/claude/sai-5-review-worker.md', 'sai-5-review-worker.md'],
  ];

  for (const harness of ['claude', 'opencode']) {
    const first = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const second = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const normalize = projections => projections.map(projection => ({
      source: path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'),
      destination: projection.destinationPath,
    }));
    assert.deepEqual(normalize(first), normalize(second), `${harness} review expansion should be deterministic`);

    for (const [expectedHarness, source, destinationSuffix] of expected.filter(item => item[0] === harness)) {
      const projection = first.find(item =>
        path.relative(repoRoot, item.sourcePath).split(path.sep).join('/') === source
      );
      assert.ok(projection, `${expectedHarness} should project ${source}`);
      assert.equal(projection.destinationPath.endsWith(destinationSuffix), true,
        `${source} should land at ${destinationSuffix}`);
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
    'sai/orchestration/workers/sai-7-performance-worker.md': {
      harnesses: ['claude', 'opencode'],
      destination: 'orchestration/workers/sai-7-performance-worker.md',
      strategy: 'copy',
      ownership: 'managed',
    },
    'sai/orchestration/workers/bindings/claude/performance-worker.md': {
      harnesses: ['claude'],
       destination: 'orchestration/workers/bindings/performance-worker.md',
      strategy: 'copy',
      ownership: 'managed',
    },
    'sai/orchestration/workers/bindings/opencode/performance-worker.md': {
      harnesses: ['opencode'],
       destination: 'orchestration/workers/bindings/performance-worker.md',
      strategy: 'copy',
      ownership: 'managed',
    },
    'agents/claude/sai-7-performance-worker.md': {
      harnesses: ['claude'],
      destination: 'sai-7-performance-worker.md',
      strategy: 'tunable-seed',
      ownership: 'managed',
    },
  };

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
  }

});

test('Routed review bindings remain harness-specific', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const routedReview = manifest.projections.filter(projection =>
    projection.source.includes('review-worker') || projection.source.includes('sai-5-review')
  );
  assert.ok(routedReview.length > 0, 'the manifest should declare routed review surfaces');
  assert.ok(routedReview.every(projection => projection.harnesses.every(harness => ['claude', 'opencode'].includes(harness))));
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
     assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('instructions', '_templates', 'adr-index.md'))));
     assert.ok(projections.some(p => path.relative(path.join(__dirname, '..'), p.sourcePath).split(path.sep).join('/') === 'sai/instructions/_templates/adr-index.md'));
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', '_templates', 'adr-index.md'))), false);
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'glossary-format.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'remember.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'sai-learnings-format.md'))));
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'implement-invocation.md'))), false);
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'sai-2-design-core.md'))), false);
     assert.equal(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'sai-3-implementation-core.md'))), false);
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
    'sai/orchestration/workers/sai-2-design-worker.md',
    'sai/orchestration/workers/sai-3-implementation-worker.md',
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
    assert.equal(routedBindings.length, 8, `${harness} should retain all routed worker bindings`);

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
  assert.ok(manifest.retirements.every(retirement => ['sai', 'skills'].includes(retirement.destination.class)));
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
   assert.equal(manifest.retirements.flatMap(retirement => retirement.managedHashes).length, 79);
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

test('recursive sai-instructions projection carries the extracted _templates files to every harness', () => {
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
  const templateFiles = [
    'adr-index.md',
    'implementation-plan.md',
    'review-report.md',
    'security-report.md',
    'performance-report.md',
    'accessibility-report.md',
    'pr-body.md',
  ];
  let projectedCount = 0;
  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const name of templateFiles) {
      const relativeSource = `sai/instructions/_templates/${name}`;
      const projection = projections.find(
        p => path.relative(repoRoot, p.sourcePath).split(path.sep).join('/') === relativeSource
      );
      assert.ok(projection, `${harness} should project ${relativeSource} via the recursive sai-instructions rule`);
      assert.equal(
        projection.destinationPath.endsWith(path.join('instructions', '_templates', name)),
        true,
        `${harness} ${name} should land under instructions/_templates`
      );
      assert.equal(
        fs.readFileSync(projection.sourcePath, 'utf8'),
        fs.readFileSync(path.join(repoRoot, relativeSource), 'utf8'),
        `${harness} ${name} projected source should equal its repository source`
      );
      projectedCount += 1;
    }
  }
  assert.equal(projectedCount, 14, 'seven templates across two harnesses should project to 14 paths');
});

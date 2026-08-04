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
  fs.mkdirSync(path.join(repoRoot, 'commands', 'copilot'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'commands', 'claude', 'alpha.md'), 'alpha');
  fs.writeFileSync(path.join(repoRoot, 'commands', 'claude', 'zeta.md'), 'zeta');
  fs.writeFileSync(path.join(repoRoot, 'commands', 'opencode', 'foreign.md'), 'foreign');
  fs.writeFileSync(path.join(repoRoot, 'commands', 'copilot', 'foreign.md'), 'foreign');
  return repoRoot;
}

function rule(overrides = {}) {
  return {
    id: 'commands',
    source: 'commands/claude',
    destination: { class: 'root', path: 'claude/commands' },
    harnesses: ['claude', 'opencode', 'copilot'],
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
      destinationPath: 'orchestration/workers/bindings/claude/implementation-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-implementation-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
      destinationPath: 'orchestration/workers/bindings/opencode/implementation-worker.md',
    },
    claudeForwarding: {
      id: 'claude-sai-3-implementation-worker-forwarding',
      sourcePath: 'skills/claude/sai-3-implementation-worker/SKILL.md',
      destinationPath: 'sai-3-implementation-worker/SKILL.md',
    },
    opencodeForwarding: {
      id: 'opencode-sai-3-implementation-worker-forwarding',
      sourcePath: 'skills/opencode/sai-3-implementation-worker/SKILL.md',
      destinationPath: 'sai-3-implementation-worker/SKILL.md',
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
      destinationPath: 'orchestration/workers/bindings/claude/design-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-design-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/design-worker.md',
      destinationPath: 'orchestration/workers/bindings/opencode/design-worker.md',
    },
    claudeForwarding: {
      id: 'claude-sai-2-design-worker-forwarding',
      sourcePath: 'skills/claude/sai-2-design-worker/SKILL.md',
      destinationPath: 'sai-2-design-worker/SKILL.md',
    },
    opencodeForwarding: {
      id: 'opencode-sai-2-design-worker-forwarding',
      sourcePath: 'skills/opencode/sai-2-design-worker/SKILL.md',
      destinationPath: 'sai-2-design-worker/SKILL.md',
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
      destinationPath: 'orchestration/workers/bindings/claude/review-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-review-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/review-worker.md',
      destinationPath: 'orchestration/workers/bindings/opencode/review-worker.md',
    },
    claudeForwarding: {
      id: 'claude-sai-5-review-worker-forwarding',
      sourcePath: 'skills/claude/sai-5-review-worker/SKILL.md',
      destinationPath: 'sai-5-review-worker/SKILL.md',
    },
    opencodeForwarding: {
      id: 'opencode-sai-5-review-worker-forwarding',
      sourcePath: 'skills/opencode/sai-5-review-worker/SKILL.md',
      destinationPath: 'sai-5-review-worker/SKILL.md',
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
      destinationPath: 'orchestration/workers/bindings/claude/security-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-security-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/security-worker.md',
      destinationPath: 'orchestration/workers/bindings/opencode/security-worker.md',
    },
    claudeForwarding: {
      id: 'claude-sai-6-security-worker-forwarding',
      sourcePath: 'skills/claude/sai-6-security-worker/SKILL.md',
      destinationPath: 'sai-6-security-worker/SKILL.md',
    },
    opencodeForwarding: {
      id: 'opencode-sai-6-security-worker-forwarding',
      sourcePath: 'skills/opencode/sai-6-security-worker/SKILL.md',
      destinationPath: 'sai-6-security-worker/SKILL.md',
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
      destinationPath: 'orchestration/workers/bindings/claude/performance-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-performance-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/performance-worker.md',
      destinationPath: 'orchestration/workers/bindings/opencode/performance-worker.md',
    },
    claudeForwarding: {
      id: 'claude-sai-7-performance-worker-forwarding',
      sourcePath: 'skills/claude/sai-7-performance-worker/SKILL.md',
      destinationPath: 'sai-7-performance-worker/SKILL.md',
    },
    opencodeForwarding: {
      id: 'opencode-sai-7-performance-worker-forwarding',
      sourcePath: 'skills/opencode/sai-7-performance-worker/SKILL.md',
      destinationPath: 'sai-7-performance-worker/SKILL.md',
    },
    claudeAgent: {
      id: 'claude-sai-7-performance-worker',
      sourcePath: 'agents/claude/sai-7-performance-worker.md',
      destinationPath: 'sai-7-performance-worker.md',
    },
  },
  'sai-1-spec-proposal-worker': {
    claudeBinding: {
      id: 'claude-spec-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/claude/spec-worker.md',
      destinationPath: 'orchestration/workers/bindings/claude/spec-worker.md',
    },
    opencodeBinding: {
      id: 'opencode-spec-worker-binding',
      sourcePath: 'sai/orchestration/workers/bindings/opencode/spec-worker.md',
      destinationPath: 'orchestration/workers/bindings/opencode/spec-worker.md',
    },
    claudeForwarding: {
      id: 'claude-sai-1-spec-proposal-worker-forwarding',
      sourcePath: 'skills/claude/sai-1-spec-proposal-worker/SKILL.md',
      destinationPath: 'sai-1-spec-proposal-worker/SKILL.md',
    },
    opencodeForwarding: {
      id: 'opencode-sai-1-spec-proposal-worker-forwarding',
      sourcePath: 'skills/opencode/sai-1-spec-proposal-worker/SKILL.md',
      destinationPath: 'sai-1-spec-proposal-worker/SKILL.md',
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
  if (id.includes('forwarding')) return 'skills';
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
      expectedWorkerProjection(worker.claudeForwarding, 'claude', { strategy: 'forwarding-manifest', ownership: 'managed' }),
      expectedWorkerProjection(worker.claudeAgent, 'claude', { strategy: 'owned-copy', ownership: 'owned' }),
    ]),
    opencode: Object.values(MANAGED_WORKER_PROJECTIONS).flatMap(worker => [
      expectedWorkerProjection(worker.opencodeBinding, 'opencode', { strategy: 'copy', ownership: 'managed' }),
      expectedWorkerProjection(worker.opencodeForwarding, 'opencode', { strategy: 'forwarding-manifest', ownership: 'managed' }),
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

    for (const workerName of Object.keys(MANAGED_WORKERS)) {
      const workerRecords = actual.filter(record =>
        MANAGED_WORKER_PROJECTIONS[workerName][`${harness === 'claude' ? 'claude' : 'opencode'}Binding`].id === record.id ||
        MANAGED_WORKER_PROJECTIONS[workerName][`${harness === 'claude' ? 'claude' : 'opencode'}Forwarding`].id === record.id ||
        (harness === 'claude' && MANAGED_WORKER_PROJECTIONS[workerName].claudeAgent.id === record.id)
      );
      assert.equal(workerRecords.length, harness === 'claude' ? 3 : 2,
        `${harness} should project the expected number of records for ${workerName}`);
    }
  }

  const workerSources = new Set(Object.values(MANAGED_WORKER_PROJECTIONS).flatMap(worker => [
    worker.claudeBinding.sourcePath,
    worker.opencodeBinding.sourcePath,
    worker.claudeForwarding.sourcePath,
    worker.opencodeForwarding.sourcePath,
    worker.claudeAgent.sourcePath,
  ]));
  const copilot = expandInstallManifest(manifest, { harness: 'copilot', repoRoot, destinationRoot })
    .map(projection => normalizeWorkerProjection(projection, repoRoot, destinationRoot));
  assert.equal(copilot.some(projection => workerSources.has(projection.sourcePath)), false,
    'Copilot must not receive managed worker bindings, forwarding skills, or Claude agents');
  assert.equal(copilot.some(projection => projection.strategy === 'owned-copy' &&
    Object.values(MANAGED_WORKER_PROJECTIONS).some(worker => worker.claudeAgent.id === projection.id)), false,
  'Copilot must not receive managed Claude agent projections');
});

test('Step 6 security worker exposes five manifest projection records and Copilot commands', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = workerDestinationRoots(path.join(os.tmpdir(), 'sai-security-worker-projections'));
  const source = projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
  const expected = [
    ['claude', 'sai/orchestration/workers/bindings/claude/security-worker.md', path.join('orchestration', 'workers', 'bindings', 'claude', 'security-worker.md')],
    ['opencode', 'sai/orchestration/workers/bindings/opencode/security-worker.md', path.join('orchestration', 'workers', 'bindings', 'opencode', 'security-worker.md')],
    ['claude', 'skills/claude/sai-6-security-worker/SKILL.md', path.join('sai-6-security-worker', 'SKILL.md')],
    ['opencode', 'skills/opencode/sai-6-security-worker/SKILL.md', path.join('sai-6-security-worker', 'SKILL.md')],
    ['claude', 'agents/claude/sai-6-security-worker.md', 'sai-6-security-worker.md'],
  ];

  for (const [harness, expectedSource, expectedDestination] of expected) {
    const projection = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .find(candidate => source(candidate) === expectedSource);
    assert.ok(projection, `${harness} should project ${expectedSource}`);
    assert.equal(projection.destinationPath.endsWith(expectedDestination), true,
      `${expectedSource} should land at ${expectedDestination}`);
  }

  const copilotSources = new Set(expandInstallManifest(manifest, {
    harness: 'copilot',
    repoRoot,
    destinationRoot,
  }).map(source));
  assert.equal(copilotSources.has('sai/commands/sai-6-security.md'), true);
  assert.equal(copilotSources.has('commands/copilot/sai-6-security.prompt.md'), true);
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
    harnesses: ['claude', 'opencode', 'copilot'],
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

test('canonical manifest installs exactly one Copilot inline orchestration adapter projection', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const inline = manifest.projections.filter(projection => projection.source === 'sai/orchestration/inline-invocation.md');

  assert.equal(inline.length, 1, 'inline adapter should have one managed owner');
  assert.deepEqual(
    {
      source: inline[0].source,
      destination: inline[0].destination,
      harnesses: inline[0].harnesses,
      strategy: inline[0].strategy,
      recursive: inline[0].recursive,
      ownership: inline[0].ownership,
      drift: inline[0].drift,
    },
    {
      source: 'sai/orchestration/inline-invocation.md',
      destination: { class: 'sai', path: 'orchestration/inline-invocation.md' },
      harnesses: ['copilot'],
      strategy: 'copy',
      recursive: false,
      ownership: 'managed',
      drift: 'content',
    }
  );
  assert.equal(
    manifest.projections.filter(projection => projection.destination.path === 'orchestration/inline-invocation.md').length,
    1,
    'inline adapter destination should not have a second owner'
  );
  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot: {
        commands: path.join(os.tmpdir(), `sai-inline-${harness}-commands`),
        sai: path.join(os.tmpdir(), `sai-inline-${harness}-sai`),
        skills: path.join(os.tmpdir(), `sai-inline-${harness}-skills`),
        agents: path.join(os.tmpdir(), `sai-inline-${harness}-agents`),
        config: path.join(os.tmpdir(), `sai-inline-${harness}-config`),
      },
    });
    assert.equal(
      projections.some(projection => projection.sourcePath.endsWith(path.join('sai', 'orchestration', 'inline-invocation.md'))),
      false,
      `${harness} must not receive the Copilot inline adapter`
    );
  }
  const copilotOrchestration = manifest.projections.filter(projection =>
    projection.harnesses.includes('copilot') && projection.source.startsWith('sai/orchestration/')
  );
  assert.deepEqual(copilotOrchestration.map(projection => projection.source), [
    'sai/orchestration/inline-invocation.md',
  ]);
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
  };
  const implementationSources = {
    claude: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/claude/implementation-worker.md',
      'skills/claude/sai-3-implementation-worker/SKILL.md',
      'agents/claude/sai-3-implementation-worker.md',
    ],
    opencode: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
      'skills/opencode/sai-3-implementation-worker/SKILL.md',
    ],
    copilot: [
      'sai/commands/implement/coordinator.md',
      'sai/commands/implement/invocation.md',
    ],
  };

  for (const harness of Object.keys(implementationSources)) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const sourceSet = new Set(projections.map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    const destinations = projections.map(projection => projection.destinationPath);

    assert.equal(new Set(destinations).size, destinations.length, `${harness} destinations should be unique`);
    assert.deepEqual(destinations, [...destinations].sort(), `${harness} destinations should be ordered`);
    for (const source of implementationSources[harness]) {
      assert.ok(sourceSet.has(source), `${harness} should include ${source}`);
    }

    if (harness === 'claude') {
      assert.equal(sourceSet.has('sai/orchestration/workers/bindings/opencode/implementation-worker.md'), false);
    } else if (harness === 'opencode') {
      assert.equal(sourceSet.has('sai/orchestration/workers/bindings/claude/implementation-worker.md'), false);
      assert.equal(sourceSet.has('agents/claude/sai-3-implementation-worker.md'), false);
    } else {
      assert.deepEqual(
        [...sourceSet].filter(source => source.startsWith('sai/orchestration/')).sort(),
        ['sai/orchestration/inline-invocation.md']
      );
      assert.equal([...sourceSet].some(source => source.includes('/bindings/')), false);
      assert.equal([...sourceSet].some(source => source.includes('/workers/')), false);
      assert.equal([...sourceSet].some(source => source.startsWith('agents/claude/')), false);
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
      'skills/claude/sai-1-spec-proposal-worker/SKILL.md',
      'agents/claude/sai-1-spec-proposal-worker.md',
    ],
    opencode: [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-1-spec-proposal-worker.md',
      'sai/orchestration/workers/bindings/opencode/spec-worker.md',
      'skills/opencode/sai-1-spec-proposal-worker/SKILL.md',
    ],
  };
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-spec-commands'),
    sai: path.join(os.tmpdir(), 'sai-spec-sai'),
    skills: path.join(os.tmpdir(), 'sai-spec-skills'),
    agents: path.join(os.tmpdir(), 'sai-spec-agents'),
    config: path.join(os.tmpdir(), 'sai-spec-config'),
  };
  for (const [harness, requiredSources] of Object.entries(expected)) {
    const sources = new Set(expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
      .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    for (const source of requiredSources) assert.ok(sources.has(source), `${harness} should project ${source}`);
  }
  const copilotSources = new Set(expandInstallManifest(manifest, { harness: 'copilot', repoRoot, destinationRoot })
    .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
  assert.equal([...copilotSources].some(source => source.includes('spec-worker') || source.includes('spec-proposal')), false);
  assert.equal([...copilotSources].some(source => source.includes('sai/commands/spec/coordinator')), false);
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
  };
  const expected = [
    ['claude', 'sai/orchestration/workers/bindings/claude/review-worker.md', path.join('orchestration', 'workers', 'bindings', 'claude', 'review-worker.md')],
    ['opencode', 'sai/orchestration/workers/bindings/opencode/review-worker.md', path.join('orchestration', 'workers', 'bindings', 'opencode', 'review-worker.md')],
    ['claude', 'skills/claude/sai-5-review-worker/SKILL.md', path.join('sai-5-review-worker', 'SKILL.md')],
    ['opencode', 'skills/opencode/sai-5-review-worker/SKILL.md', path.join('sai-5-review-worker', 'SKILL.md')],
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

  const copilot = expandInstallManifest(manifest, { harness: 'copilot', repoRoot, destinationRoot });
  assert.equal(copilot.some(projection => {
    const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
    return source.includes('review-worker') || source.includes('sai-5-review');
  }), false, 'Copilot receives no routed review binding');
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
      destination: 'orchestration/workers/bindings/claude/performance-worker.md',
      strategy: 'copy',
      ownership: 'managed',
    },
    'sai/orchestration/workers/bindings/opencode/performance-worker.md': {
      harnesses: ['opencode'],
      destination: 'orchestration/workers/bindings/opencode/performance-worker.md',
      strategy: 'copy',
      ownership: 'managed',
    },
    'skills/claude/sai-7-performance-worker/SKILL.md': {
      harnesses: ['claude'],
      destination: 'sai-7-performance-worker/SKILL.md',
      strategy: 'forwarding-manifest',
      ownership: 'managed',
    },
    'skills/opencode/sai-7-performance-worker/SKILL.md': {
      harnesses: ['opencode'],
      destination: 'sai-7-performance-worker/SKILL.md',
      strategy: 'forwarding-manifest',
      ownership: 'managed',
    },
    'agents/claude/sai-7-performance-worker.md': {
      harnesses: ['claude'],
      destination: 'sai-7-performance-worker.md',
      strategy: 'owned-copy',
      ownership: 'owned',
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

  const copilotSources = new Set(expandInstallManifest(manifest, {
    harness: 'copilot',
    repoRoot,
    destinationRoot,
  }).map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
  assert.equal(copilotSources.has('sai/commands/sai-7-performance.md'), true);
  assert.equal(copilotSources.has('commands/copilot/sai-7-performance.prompt.md'), true);
  for (const source of [
    'sai/orchestration/workers/sai-7-performance-worker.md',
    'sai/orchestration/workers/bindings/claude/performance-worker.md',
    'sai/orchestration/workers/bindings/opencode/performance-worker.md',
    'skills/claude/sai-7-performance-worker/SKILL.md',
    'skills/opencode/sai-7-performance-worker/SKILL.md',
    'agents/claude/sai-7-performance-worker.md',
  ]) assert.equal(copilotSources.has(source), false, `Copilot must exclude ${source}`);
  assert.equal(manifest.projections.some(projection =>
    JSON.stringify(projection.exclude || []).includes('sai-7-performance')), false,
  'Copilot must not need a command-specific performance exclude entry');
});

test('Copilot receives no routed review binding', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const routedReview = manifest.projections.filter(projection =>
    projection.source.includes('review-worker') || projection.source.includes('sai-5-review')
  );
  assert.ok(routedReview.length >= 5, 'the manifest should declare all five routed review surfaces');
  assert.ok(routedReview.every(projection => !projection.harnesses.includes('copilot')));
});

test('compatibility and policy projections resolve for every supported harness', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-projection-commands'),
    sai: path.join(os.tmpdir(), 'sai-projection-sai'),
    skills: path.join(os.tmpdir(), 'sai-projection-skills'),
    agents: path.join(os.tmpdir(), 'sai-projection-agents'),
    config: path.join(os.tmpdir(), 'sai-projection-config'),
  };
  for (const harness of ['claude', 'opencode', 'copilot']) {
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
    'commands/copilot/sai-2-design.prompt.md',
    'commands/copilot/sai-3-implement.prompt.md',
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
    const strategies = ['copy', 'owned-copy', 'merge-jsonc', 'forwarding-manifest'];
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

test('canonical manifest validates all historical retirements and excludes them from active projections', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
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
  ];
  assert.deepEqual(manifest.retirements, expected);
   assert.equal(manifest.retirements.flatMap(retirement => retirement.managedHashes).length, 57);
  assert.ok(manifest.retirements.flatMap(retirement => retirement.managedHashes).every(hash => /^[0-9a-f]{64}$/.test(hash)));

  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-retirement-commands'),
    sai: path.join(os.tmpdir(), 'sai-retirement-sai'),
    skills: path.join(os.tmpdir(), 'sai-retirement-skills'),
    agents: path.join(os.tmpdir(), 'sai-retirement-agents'),
    config: path.join(os.tmpdir(), 'sai-retirement-config'),
  };
  for (const harness of ['claude', 'opencode', 'copilot']) {
    const retirements = expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot });
     assert.deepEqual(retirements.map(retirement => retirement.destinationPath), [
       path.resolve(destinationRoot.sai, 'commands/sai-2-design.md'),
       path.resolve(destinationRoot.sai, 'commands/sai-2-design-inline.md'),
       path.resolve(destinationRoot.sai, 'commands/sai-3-implement.md'),
        path.resolve(destinationRoot.sai, 'commands/sai-3-implement-inline.md'),
        ...(harness === 'copilot' ? [path.resolve(destinationRoot.sai, 'compat/implement-invocation.md')] : []),
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
        harnesses: ['claude', 'opencode', 'copilot'],
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
        destinationRoot: { sai: '/dest' },
      }), pattern);
    }
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
  for (const harness of ['claude', 'opencode', 'copilot']) {
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
  assert.equal(projectedCount, 21, 'seven templates across three harnesses should project to 21 paths');
});

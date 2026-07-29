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

test('canonical manifest exposes the exact compatibility allowlist', () => {
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
  assert.deepEqual(compatibility, [
    {
      source: 'sai/compat/sai-2-design-core.md',
      destination: { class: 'sai', path: 'compat/sai-2-design-core.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      recursive: false,
      overrides: 'sai-instructions',
    },
    {
      source: 'sai/compat/sai-3-implementation-core.md',
      destination: { class: 'sai', path: 'compat/sai-3-implementation-core.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      recursive: false,
      overrides: 'sai-instructions',
    },
    {
      source: 'sai/compat/implement-invocation.md',
      destination: { class: 'sai', path: 'compat/implement-invocation.md' },
      harnesses: ['copilot'],
      recursive: false,
      overrides: 'sai-instructions',
    },
    {
      source: 'sai/compat/_templates/adr-index.md',
      destination: { class: 'sai', path: 'compat/_templates/adr-index.md' },
      harnesses: ['claude', 'opencode', 'copilot'],
      recursive: false,
      overrides: 'sai-instructions',
    },
  ]);
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
      'sai/compat/sai-3-implementation-core.md',
      'sai/compat/implement-invocation.md',
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
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'sai-2-design-core.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('compat', 'sai-3-implementation-core.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('compat', '_templates', 'adr-index.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'glossary-format.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'remember.md'))));
    assert.ok(projections.some(p => p.destinationPath.endsWith(path.join('policies', 'sai-learnings-format.md'))));
    assert.equal(
      projections.some(p => p.destinationPath.endsWith(path.join('compat', 'implement-invocation.md'))),
      harness === 'copilot'
    );
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
  ];
  assert.deepEqual(manifest.retirements, expected);
  assert.equal(manifest.retirements.flatMap(retirement => retirement.managedHashes).length, 10);
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
      path.resolve(destinationRoot.sai, 'commands/sai-2-design-inline.md'),
      path.resolve(destinationRoot.sai, 'commands/sai-3-implement-inline.md'),
    ]);
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
  assert.equal(projectedCount, 18, 'six templates across three harnesses should project to 18 paths');
});

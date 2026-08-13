'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { cleanupRetiredProjections } = require('../bin/install-flow.js');
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

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-retirement-step-3-'));
}

function hash(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function roots(base) {
  return { base, sai: path.join(base, 'sai'), skills: path.join(base, 'skills') };
}

function retirementPaths(base) {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  return expandRetirementManifest(manifest, {
    harness: 'claude',
    repoRoot: path.join(__dirname, '..'),
    destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
  });
}

test('retirement cleanup treats an absent destination as a no-op', () => {
  const base = tempDir();
  try {
    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.length, retirementPaths(base).length);
    assert.ok(results.every(result => result.action === 'not-found'));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup deletes matching bytes for every accepted historical worker digest', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const retirements = manifest.retirements.filter(retirement => retirement.id.endsWith('-proxy-skill'));

  for (const retirement of retirements) {
    for (const acceptedHash of retirement.managedHashes) {
      const base = tempDir();
      try {
        const expanded = expandRetirementManifest(manifest, {
          harness: retirement.harnesses[0],
          repoRoot: path.join(__dirname, '..'),
          destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
        });
        const target = expanded.find(record => record.id === retirement.id);
        const bytes = Buffer.from(`historical bytes for ${acceptedHash}`);
        fs.mkdirSync(path.dirname(target.destinationPath), { recursive: true });
        fs.writeFileSync(target.destinationPath, bytes);

        const originalCreateHash = crypto.createHash;
        crypto.createHash = () => ({ update: () => ({ digest: () => acceptedHash }) });
        let results;
        try {
          results = cleanupRetiredProjections(retirement.harnesses[0], roots(base));
        } finally {
          crypto.createHash = originalCreateHash;
        }
        assert.equal(results.find(result => result.id === retirement.id).action, 'deleted',
          `${retirement.id} should delete digest ${acceptedHash}`);
        assert.equal(fs.existsSync(target.destinationPath), false);
      } finally {
        fs.rmSync(base, { recursive: true, force: true });
      }
    }
  }
});

test('retirement cleanup deletes a destination whose bytes match a registered hash', () => {
  const base = tempDir();
  try {
    const retirement = retirementPaths(base).find(record => record.id.endsWith('-proxy-skill'));
    assert.ok(retirement, 'a proxy retirement record should be available');
    const bytes = Buffer.from('managed loader bytes');
    const destinationPath = retirement.destinationPath;
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, bytes);

    const originalCreateHash = crypto.createHash;
    crypto.createHash = () => ({ update: () => ({ digest: () => retirement.managedHashes[0] }) });
    let results;
    try {
      results = cleanupRetiredProjections('claude', roots(base));
    } finally {
      crypto.createHash = originalCreateHash;
    }
    assert.equal(results.find(result => result.id === retirement.id).action, 'deleted');
    assert.equal(fs.existsSync(destinationPath), false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup preserves modified and unknown destination bytes', () => {
  const base = tempDir();
  try {
    const [modifiedRetirement, unknownRetirement] = retirementPaths(base)
      .filter(record => record.id.endsWith('-proxy-skill'));
    assert.ok(modifiedRetirement && unknownRetirement, 'two proxy retirement records should be available');
    const modifiedPath = modifiedRetirement.destinationPath;
    const unknownPath = unknownRetirement.destinationPath;
    const modifiedBytes = Buffer.from('user-modified loader bytes');
    const unknownBytes = Buffer.from('unrecognized loader bytes');
    fs.mkdirSync(path.dirname(modifiedPath), { recursive: true });
    fs.mkdirSync(path.dirname(unknownPath), { recursive: true });
    fs.writeFileSync(modifiedPath, modifiedBytes);
    fs.writeFileSync(unknownPath, unknownBytes);

    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.find(result => result.id === modifiedRetirement.id).action, 'preserved');
    assert.equal(results.find(result => result.id === unknownRetirement.id).action, 'preserved');
    assert.deepEqual(fs.readFileSync(modifiedPath), modifiedBytes);
    assert.deepEqual(fs.readFileSync(unknownPath), unknownBytes);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('retirement cleanup preserves unknown bytes for every former worker binding destination', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const retirements = manifest.retirements.filter(retirement => retirement.id.endsWith('-proxy-skill'));
  const base = tempDir();
  try {
    const destinations = retirements.map(retirement => expandRetirementManifest(manifest, {
      harness: retirement.harnesses[0],
      repoRoot: path.join(__dirname, '..'),
       destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
    }).find(record => record.id === retirement.id));
    const bytes = Buffer.from('unrecognized worker binding bytes');
    for (const destination of destinations) {
      fs.mkdirSync(path.dirname(destination.destinationPath), { recursive: true });
      fs.writeFileSync(destination.destinationPath, bytes);
    }

    const results = [
      ...cleanupRetiredProjections('claude', roots(base)),
      ...cleanupRetiredProjections('opencode', roots(base)),
    ];
    for (const destination of destinations) {
      assert.equal(results.find(result => result.id === destination.id).action, 'preserved');
      assert.deepEqual(fs.readFileSync(destination.destinationPath), bytes);
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('ADR template retirement cleanup deletes a former compatibility copy for each accepted hash', () => {
  const manifest = loadInstallManifest(path.join(__dirname, '..'));
  const acceptedHashes = manifest.retirements.find(retirement => retirement.id === 'retired-adr-index-template').managedHashes;

  for (const acceptedHash of acceptedHashes) {
    const base = tempDir();
    try {
      const retirement = retirementPaths(base).find(record => record.id === 'retired-adr-index-template');
      const destinationPath = retirement.destinationPath;
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, Buffer.from(`historical ADR template ${acceptedHash}`));

      const originalCreateHash = crypto.createHash;
      crypto.createHash = () => ({ update: () => ({ digest: () => acceptedHash }) });
      let results;
      try {
        results = cleanupRetiredProjections('claude', roots(base));
      } finally {
        crypto.createHash = originalCreateHash;
      }

      assert.equal(results.find(result => result.id === 'retired-adr-index-template').action, 'deleted');
      assert.equal(fs.existsSync(destinationPath), false);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('ADR template retirement cleanup preserves a modified former compatibility copy', () => {
  const base = tempDir();
  try {
    const retirement = retirementPaths(base).find(record => record.id === 'retired-adr-index-template');
    const destinationPath = retirement.destinationPath;
    const bytes = Buffer.from('modified ADR template bytes');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, bytes);

    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.find(result => result.id === 'retired-adr-index-template').action, 'preserved');
    assert.deepEqual(fs.readFileSync(destinationPath), bytes);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('ADR template retirement cleanup preserves an unrecognized former compatibility copy', () => {
  const base = tempDir();
  try {
    const retirement = retirementPaths(base).find(record => record.id === 'retired-adr-index-template');
    const destinationPath = retirement.destinationPath;
    const bytes = Buffer.from('unrecognized ADR template bytes');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, bytes);

    const results = cleanupRetiredProjections('claude', roots(base));
    assert.equal(results.find(result => result.id === 'retired-adr-index-template').action, 'preserved');
    assert.deepEqual(fs.readFileSync(destinationPath), bytes);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('STEP1_RETIRE_INLINE: retired routed loaders use exact hashes and preserve modified copies', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const retiredLoaderPaths = [
    'commands/sai-2-design.md',
    'commands/sai-3-implement.md',
    'commands/sai-2-design-inline.md',
    'commands/sai-3-implement-inline.md',
    'compat/sai-2-design-core.md',
    'compat/sai-3-implementation-core.md',
    'compat/implement-invocation.md',
  ];
  const loaderRetirements = manifest.retirements.filter(retirement =>
    retiredLoaderPaths.includes(retirement.destination.path));
  assert.ok(loaderRetirements.length > 0, 'routed loader retirements should be declared');
  assert.ok(loaderRetirements.every(retirement =>
    retirement.harnesses.every(harness => ['claude', 'opencode'].includes(harness)) &&
    retirement.managedHashes.length > 0 &&
    retirement.managedHashes.every(value => /^[0-9a-f]{64}$/.test(value))));

  for (const retirement of loaderRetirements) {
    const base = tempDir();
    try {
      const expanded = expandRetirementManifest(manifest, {
        harness: retirement.harnesses[0],
        repoRoot,
        destinationRoot: { sai: path.join(base, 'sai'), skills: path.join(base, 'skills') },
      });
      const target = expanded.find(record => record.id === retirement.id);
      assert.ok(target, `${retirement.id} should expand for its owning harness`);
      fs.mkdirSync(path.dirname(target.destinationPath), { recursive: true });
      fs.writeFileSync(target.destinationPath, 'retired routed loader bytes');

      const originalCreateHash = crypto.createHash;
      crypto.createHash = () => ({ update: () => ({ digest: () => retirement.managedHashes[0] }) });
      try {
        assert.equal(cleanupRetiredProjections(retirement.harnesses[0], roots(base))
          .find(result => result.id === retirement.id).action, 'deleted');
      } finally {
        crypto.createHash = originalCreateHash;
      }
      assert.equal(fs.existsSync(target.destinationPath), false);

      fs.mkdirSync(path.dirname(target.destinationPath), { recursive: true });
      fs.writeFileSync(target.destinationPath, 'modified routed loader bytes');
      const result = cleanupRetiredProjections(retirement.harnesses[0], roots(base))
        .find(record => record.id === retirement.id);
      assert.equal(result.action, 'preserved');
      assert.equal(fs.readFileSync(target.destinationPath, 'utf8'), 'modified routed loader bytes');
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('matrix retirement: active projections never source from retired per-phase worker trees', () => {
  const { expandInstallManifest } = require('../bin/install-manifest.js');
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
  const workers = {
    spec: 'sai-1-spec-proposal-worker',
    design: 'sai-2-design-worker',
    implementation: 'sai-3-implementation-worker',
    review: 'sai-5-review-worker',
    security: 'sai-6-security-worker',
    performance: 'sai-7-performance-worker',
    accessibility: 'sai-8-accessibility-worker',
  };
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = {
      commands: path.join(os.tmpdir(), `sai-matrix-retirement-${harness}-commands`),
      sai: path.join(os.tmpdir(), `sai-matrix-retirement-${harness}-sai`),
      skills: path.join(os.tmpdir(), `sai-matrix-retirement-${harness}-skills`),
      agents: path.join(os.tmpdir(), `sai-matrix-retirement-${harness}-agents`),
      config: os.tmpdir(),
      root: os.tmpdir(),
    };
    const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const projection of active) {
      const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
      if (source.endsWith('/idea-list-render.md')) continue;
      assert.equal(source.startsWith(`sai/orchestration/workers/bindings/${harness}/`), false,
        `${harness} must not source an active projection from a retired per-harness binding tree: ${source}`);
      assert.equal(new RegExp(`^agents/${harness}/sai-\\d-.*-worker\\.md$`).test(source), false,
        `${harness} must not source an active projection from a retired per-harness agent tree: ${source}`);
    }
    const ideaListSource = active
      .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'))
      .filter(source => source.endsWith('/idea-list-render.md'));
    assert.equal(ideaListSource.length, 1,
      `${harness} should retain the regular idea-list-render binding source`);
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/') &&
        phases.includes(path.basename(projection.destinationPath, '-worker.md')))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 7, `${harness} should declare exactly seven worker bindings`);
    assert.deepEqual(bindingNames.sort(), phases.map(phase => `${phase}-worker.md`).sort(),
      `${harness} worker binding names should match the canonical phase matrix`);
    const agentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents) &&
        Object.values(workers).includes(path.basename(projection.destinationPath, '.md')))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(agentNames.length, 7, `${harness} should declare exactly seven managed agents`);
    assert.deepEqual(agentNames.sort(), Object.values(workers).sort(),
      `${harness} managed agent names should match the canonical worker matrix`);
  }
});

test('STEP3_RETIREMENT: every superseded destination carries a hash-gated claude/opencode retirement record', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);

  for (const destinationPath of STEP3_SUPERSEDED_RETIREMENT_PATHS) {
    const records = manifest.retirements.filter(retirement =>
      retirement.destination.class === 'sai' && retirement.destination.path === destinationPath);
    assert.equal(records.length, 1,
      `exactly one retirement record should cover the superseded destination ${destinationPath}`);
    const record = records[0];
    assert.deepEqual(record.harnesses, ['claude', 'opencode'],
      `${destinationPath} should carry an explicit claude/opencode allowlist`);
    assert.ok(record.managedHashes.length > 0,
      `${destinationPath} should carry a non-empty managed-hash set`);
    assert.ok(record.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)),
      `${destinationPath} hashes should be lowercase SHA-256`);
  }

  for (const harness of ['claude', 'opencode']) {
    const active = expandInstallManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot: {
        commands: path.join(os.tmpdir(), `sai-step3-retire-${harness}-commands`),
        sai: path.join(os.tmpdir(), `sai-step3-retire-${harness}-sai`),
        skills: path.join(os.tmpdir(), `sai-step3-retire-${harness}-skills`),
        agents: path.join(os.tmpdir(), `sai-step3-retire-${harness}-agents`),
        config: path.join(os.tmpdir(), `sai-step3-retire-${harness}-config`),
        root: path.join(os.tmpdir(), `sai-step3-retire-${harness}-config`),
      },
    });
    const sources = new Set(active.map(projection =>
      path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    for (const destinationPath of STEP3_SUPERSEDED_SOURCES) {
      assert.equal(sources.has(destinationPath), false,
        `${harness} active projections must not source from the superseded destination ${destinationPath}`);
    }
  }
});

const FOLDED_INSTRUCTIONS_RETIREMENT_PATHS = [
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
].map(relative => `instructions/${relative}`);

test('FOLD_RETIREMENT: every former sai/instructions destination carries a hash-gated claude/opencode retirement record and no active projection', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);

  for (const destinationPath of FOLDED_INSTRUCTIONS_RETIREMENT_PATHS) {
    const records = manifest.retirements.filter(retirement =>
      retirement.destination.class === 'sai' && retirement.destination.path === destinationPath);
    assert.equal(records.length, 1,
      `exactly one retirement record should cover the folded destination ${destinationPath}`);
    const record = records[0];
    assert.deepEqual(record.harnesses, ['claude', 'opencode'],
      `${destinationPath} should carry an explicit claude/opencode allowlist`);
    assert.ok(record.managedHashes.length > 0,
      `${destinationPath} should carry a non-empty managed-hash set`);
    assert.ok(record.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)),
      `${destinationPath} hashes should be lowercase SHA-256`);
  }

  for (const harness of ['claude', 'opencode']) {
    const saiRoot = path.join(os.tmpdir(), `sai-fold-retire-${harness}-sai`);
    const active = expandInstallManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot: {
        commands: path.join(os.tmpdir(), `sai-fold-retire-${harness}-commands`),
        sai: saiRoot,
        skills: path.join(os.tmpdir(), `sai-fold-retire-${harness}-skills`),
        agents: path.join(os.tmpdir(), `sai-fold-retire-${harness}-agents`),
        config: path.join(os.tmpdir(), `sai-fold-retire-${harness}-config`),
        root: path.join(os.tmpdir(), `sai-fold-retire-${harness}-config`),
      },
    });
    const sources = new Set(active.map(projection =>
      path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    assert.equal(sources.has('sai/instructions/change-overview.md'), false,
      `${harness} active projections must not source from sai/instructions/`);
    const activeDestinations = new Set(active
      .filter(projection => path.dirname(projection.destinationPath) === saiRoot ||
        path.dirname(projection.destinationPath).startsWith(saiRoot + path.sep))
      .map(projection => path.relative(saiRoot, projection.destinationPath).split(path.sep).join('/')));
    for (const destinationPath of FOLDED_INSTRUCTIONS_RETIREMENT_PATHS) {
      assert.equal(activeDestinations.has(destinationPath), false,
        `${harness} active projections must not land at the retired destination ${destinationPath}`);
    }
  }
});

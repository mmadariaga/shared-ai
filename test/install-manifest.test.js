'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  loadInstallManifest,
  expandInstallManifest,
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
      '{"version": 1, "projections": []}'
    );
    const manifest = loadInstallManifest(repoRoot);
    assert.deepEqual(manifest, { version: 1, projections: [] });
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

test('the same manifest expansion provides one ordered inventory for all consumers', () => {
  const repoRoot = makeRepo();
  try {
    const manifest = { version: 1, projections: [rule()] };
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
    };
     const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: { root: '' } });
    assert.equal(projections.filter(p => p.destinationPath.endsWith('alpha.md')).length, 1);
     assert.throws(() => expandInstallManifest({ version: 1, projections: [rule(), rule({ id: 'duplicate' })] }, { harness: 'claude', repoRoot, destinationRoot: { root: '' } }), /duplicate/i);
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
    const manifest = { version: 1, projections: [rule({ drift: 'content' })] };
     const projections = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot: { root: path.join(repoRoot, 'installed') } });
    assert.ok(projections.every(p => 'sourcePath' in p && 'destinationPath' in p && 'ownership' in p && 'drift' in p));
    assert.ok(projections.some(p => p.drift === 'content'));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

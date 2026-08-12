'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');

const repoRoot = path.join(__dirname, '..');
const claudeLoader = ['claude', 'loader.md'].join('-');
const opencodeLoader = ['opencode', 'loader.md'].join('-');
const retiredSources = [
  'sai/commands/sai-2-design.md',
  'sai/commands/sai-3-implement.md',
  'sai/compat/sai-2-design-core.md',
  'sai/compat/sai-3-implementation-core.md',
  'sai/compat/implement-invocation.md',
];
const formerAdrTemplateSource = 'sai/compat/_templates/adr-index.md';

function writeFixture(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

test('retired phase sources are absent and grouped callers remain available', () => {
  for (const source of retiredSources) assert.equal(fs.existsSync(path.join(repoRoot, source)), false);
  for (const source of [
    'sai/commands/design/coordinator.md',
    'sai/commands/design/invocation.md',
    'sai/commands/implement/coordinator.md',
    'sai/commands/implement/invocation.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, source)), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/instructions/_templates/adr-index.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, formerAdrTemplateSource)), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'sai', 'install-manifest.json'), 'utf8'));
  assert.ok(manifest.retirements.some(retirement => retirement.destination.path === 'compat/_templates/adr-index.md'));
});

test('active-reference audit excludes archived changes and ADRs but scans maintained files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step-6-audit-'));
  try {
    writeFixture(root, 'README.md', `uses ${claudeLoader}\n`);
    writeFixture(root, path.join('openspec', 'changes', 'archive', 'old', 'proposal.md'), `uses ${opencodeLoader}\n`);
    writeFixture(root, path.join('docs', 'adr', '0001-retired-loader.md'), `uses ${claudeLoader}\n`);

    const references = auditActiveReferences(root);

    assert.ok(Array.isArray(references), 'audit should return a reference list');
    assert.deepEqual(references, [
      { file: 'README.md', reference: claudeLoader },
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('STEP1_RETIRE_INLINE: active projections retain both routed inventories and no inline destination', () => {
  const repoRoot = path.join(__dirname, '..');
  const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(repoRoot);
  const roots = {
    commands: path.join(os.tmpdir(), 'sai-step1-layout-commands'),
    sai: path.join(os.tmpdir(), 'sai-step1-layout-sai'),
    skills: path.join(os.tmpdir(), 'sai-step1-layout-skills'),
    agents: path.join(os.tmpdir(), 'sai-step1-layout-agents'),
    config: path.join(os.tmpdir(), 'sai-step1-layout-config'),
    root: path.join(os.tmpdir(), 'sai-step1-layout-config'),
  };
  const workers = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];

  assert.equal(manifest.projections.some(projection =>
    projection.source === 'sai/orchestration/inline-invocation.md' ||
    /inline-invocation\.md$/.test(projection.destination.path)), false);
  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot: roots,
    });
    const sources = new Set(projections.map(projection =>
      path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')));
    const destinations = new Set(projections.map(projection =>
      path.relative(roots.sai, projection.destinationPath).split(path.sep).join('/')));
    assert.deepEqual(
      workers.map(name => `orchestration/workers/bindings/${name}-worker.md`)
        .filter(destination => destinations.has(destination)),
      workers.map(name => `orchestration/workers/bindings/${name}-worker.md`),
      `${harness} routed binding inventory should remain complete at the neutral destination`,
    );
    assert.equal([...sources].some(source => source.includes('/copilot/')), false);
  }
});

test('STEP1_RETIRE_INLINE: adapter source, capability spec, Copilot assets, and adapter-only tests are absent', () => {
  const repoRoot = path.join(__dirname, '..');
  for (const relativePath of [
    'sai/orchestration/inline-invocation.md',
    'specs/inline-coordinator-adapter/spec.md',
    'skills/copilot',
    'commands/copilot',
    'agents/copilot',
    'INSTALL.copilot.md',
    'test/inline-coordinator-adapter-step-1.test.js',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent after Step 1 retirement`);
  }
});

test('STEP1_RETIRE_INLINE: active-reference audit rejects retired loaders but exempts archives and ADRs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step1-audit-'));
  try {
    writeFixture(root, 'README.md', `uses ${claudeLoader}\n`);
    writeFixture(root, path.join('openspec', 'changes', 'archive', 'old', 'proposal.md'), `uses ${opencodeLoader}\n`);
    writeFixture(root, path.join('docs', 'adr', '0001-loader.md'), `uses ${claudeLoader}\n`);
    assert.deepEqual(auditActiveReferences(root), [
      { file: 'README.md', reference: claudeLoader },
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('STEP1_RETIRE_INLINE: active-reference audit also rejects the deleted inline adapter', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-step1-inline-audit-'));
  try {
    writeFixture(root, 'README.md', 'Fetch @sai/orchestration/inline-invocation.md\n');
    assert.ok(auditActiveReferences(root).length > 0,
      'active-reference audit should report the deleted inline adapter reference');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

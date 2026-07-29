'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
const { expandRetirementManifest } = require('../bin/install-manifest.js');

const HARNESSes = ['claude', 'opencode', 'copilot'];
const HASH = 'a'.repeat(64);

function destinationRoot(prefix) {
  return {
    commands: path.join(os.tmpdir(), `${prefix}-commands`),
    sai: path.join(os.tmpdir(), `${prefix}-sai`),
    skills: path.join(os.tmpdir(), `${prefix}-skills`),
    agents: path.join(os.tmpdir(), `${prefix}-agents`),
    config: path.join(os.tmpdir(), `${prefix}-config`),
  };
}

function retirementManifest() {
  return {
    version: 1,
    projections: [],
  retirements: [
        {
          id: 'claude-orchestration-loader',
          source: 'sai/orchestration/claude-loader.md',
          destination: { class: 'sai', path: 'orchestration/claude-loader.md' },
          harnesses: HARNESSes,
          managedHashes: [HASH],
        },
        {
          id: 'opencode-orchestration-loader',
          source: 'sai/orchestration/opencode-loader.md',
          destination: { class: 'sai', path: 'orchestration/opencode-loader.md' },
          harnesses: HARNESSes,
          managedHashes: [HASH],
        },
      ],
  };
}

test('Step 2 retirement loaders have one sai record per loader for every harness', () => {
  const manifest = retirementManifest();
  assert.equal(manifest.retirements.length, 2);
  for (const retirement of manifest.retirements) {
    assert.equal(retirement.destination.class, 'sai');
    assert.deepEqual(retirement.harnesses, HARNESSes);
    assert.ok(retirement.managedHashes.length > 0);
    assert.ok(retirement.managedHashes.every(hash => /^[a-f0-9]{64}$/.test(hash)));
  }
});

test('malformed retirement loaders fail before destination mutation', () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-retirement-'));
  const sentinel = path.join(destination, 'sentinel.txt');
  fs.writeFileSync(sentinel, 'unchanged');
  const manifest = retirementManifest();
  manifest.retirements[0].managedHashes = ['NOT-A-SHA256'];

  try {
    assert.throws(
      () => expandRetirementManifest(manifest, {
        harness: 'claude',
        repoRoot: __dirname,
        destinationRoot: destinationRoot('retirement-malformed'),
      }),
      /hash|loader|manifest|invalid/i
    );
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'unchanged');
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});

test('retirement expansion returns both loader records for each harness', () => {
  const manifest = retirementManifest();
  for (const harness of HARNESSes) {
    const records = expandRetirementManifest(manifest, {
      harness,
      repoRoot: __dirname,
      destinationRoot: destinationRoot(`retirement-${harness}`),
    });
    assert.equal(records.length, 2);
    assert.ok(records.every(record => record.harness === harness));
    assert.ok(records.every(record => typeof record.id === 'string'));
    assert.ok(records.every(record => path.isAbsolute(record.destinationPath)));
    assert.ok(records.every(record => Array.isArray(record.managedHashes)));
  }
});

test('active expansion excludes retirement loaders and keeps Copilot inline orchestration ownership sole', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const roots = destinationRoot('retirement-active');
  for (const harness of ['claude', 'opencode']) {
    const active = expandInstallManifest(manifest, {
      harness,
      repoRoot,
      destinationRoot: roots,
    });
    assert.equal(active.some(record => /orchestration[\\/](?:claude|opencode)-loader\.md$/.test(record.sourcePath)), false);
  }

  const copilot = manifest.projections.filter(projection =>
    projection.harnesses.includes('copilot') && projection.source.startsWith('sai/orchestration/')
  );
  assert.deepEqual(copilot.map(projection => projection.source), [
    'sai/orchestration/inline-invocation.md',
  ]);
});

test('grouped design and implementation phase assets preserve their former source contracts', () => {
  const repoRoot = path.join(__dirname, '..');
  const phases = [
    {
      name: 'design',
      directory: path.join(repoRoot, 'sai', 'commands', 'design'),
       coordinator: path.join(repoRoot, 'sai', 'commands', 'design', 'coordinator.md'),
       invocation: path.join(repoRoot, 'sai', 'commands', 'design', 'invocation.md'),
      instruction: 'sai/instructions/design.md',
    },
    {
      name: 'implement',
      directory: path.join(repoRoot, 'sai', 'commands', 'implement'),
       coordinator: path.join(repoRoot, 'sai', 'commands', 'implement', 'coordinator.md'),
       invocation: path.join(repoRoot, 'sai', 'commands', 'implement', 'invocation.md'),
      instruction: 'sai/instructions/implement.md',
    },
  ];

  for (const phase of phases) {
    assert.deepEqual(fs.readdirSync(phase.directory).sort(), ['coordinator.md', 'invocation.md']);
    assert.equal(
      fs.readFileSync(path.join(phase.directory, 'coordinator.md'), 'utf8'),
      fs.readFileSync(phase.coordinator, 'utf8')
    );
    const invocation = fs.readFileSync(path.join(phase.directory, 'invocation.md'), 'utf8');
    assert.equal(invocation, fs.readFileSync(phase.invocation, 'utf8'));
    assert.match(invocation, new RegExp(`Fetch @${phase.instruction.replaceAll('/', '\\/')}`));
  }

  const adrIndex = path.join(repoRoot, 'sai', 'compat', '_templates', 'adr-index.md');
  assert.equal(fs.existsSync(adrIndex), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'design', 'adr-index.md')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'commands', 'implement', 'adr-index.md')), false);
});

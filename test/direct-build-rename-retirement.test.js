'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { cleanupRetiredProjections } = require('../bin/install-flow.js');
const { loadInstallManifest, expandRetirementManifest } = require('../bin/install-manifest.js');

const REPO_ROOT = path.join(__dirname, '..');

const AUTOFAST_RENAME_RETIREMENTS = Object.freeze([
  {
    id: 'retired-explore-pipeline-auto-fast',
    class: 'sai',
    path: 'commands/explore/steps/pipeline-auto-fast.md',
    harnesses: ['claude', 'opencode'],
  },
  {
    id: 'retired-explore-pipeline-auto-supervised',
    class: 'sai',
    path: 'commands/explore/steps/pipeline-auto-supervised.md',
    harnesses: ['claude', 'opencode'],
  },
  {
    id: 'retired-explore-autofast-implement-worker-contract',
    class: 'sai',
    path: 'commands/explore/autofast-implement-worker.md',
    harnesses: ['claude', 'opencode'],
  },
  {
    id: 'retired-claude-autofast-implement-worker-binding',
    class: 'sai',
    path: 'orchestration/workers/bindings/autofast-implement-worker.md',
    harnesses: ['claude'],
  },
  {
    id: 'retired-opencode-autofast-implement-worker-binding',
    class: 'sai',
    path: 'orchestration/workers/bindings/autofast-implement-worker.md',
    harnesses: ['opencode'],
  },
  {
    id: 'retired-claude-sai-autofast-implement-worker-agent',
    class: 'agents',
    path: 'sai-autofast-implement-worker.md',
    harnesses: ['claude'],
  },
  {
    id: 'retired-opencode-sai-autofast-implement-worker-agent',
    class: 'agents',
    path: 'sai-autofast-implement-worker.md',
    harnesses: ['opencode'],
  },
]);

function destinationRoot(base) {
  return {
    commands: path.join(base, 'commands'),
    sai: path.join(base, 'sai'),
    skills: path.join(base, 'skills'),
    agents: path.join(base, 'agents'),
    config: base,
    root: base,
  };
}

test('autofast rename retirements cover step files, contract, binding, and agents for both harnesses', () => {
  const manifest = loadInstallManifest(REPO_ROOT);

  for (const expected of AUTOFAST_RENAME_RETIREMENTS) {
    const record = manifest.retirements.find(retirement => retirement.id === expected.id);
    assert.ok(record, `missing retirement ${expected.id}`);
    assert.deepEqual(record.destination, { class: expected.class, path: expected.path });
    assert.deepEqual(record.harnesses, expected.harnesses);
    assert.ok(record.managedHashes.length > 0, `${expected.id} needs managedHashes`);
    assert.ok(record.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)),
      `${expected.id} hashes must be lowercase SHA-256`);
  }

  for (const harness of ['claude', 'opencode']) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), `sai-autofast-retire-${harness}-`));
    try {
      const roots = { base, ...destinationRoot(base) };
      const expanded = expandRetirementManifest(manifest, {
        harness,
        repoRoot: REPO_ROOT,
        destinationRoot: destinationRoot(base),
      });
      const ids = expanded.map(record => record.id);
      assert.ok(ids.includes('retired-explore-pipeline-auto-fast'));
      assert.ok(ids.includes('retired-explore-pipeline-auto-supervised'));
      assert.ok(ids.includes('retired-explore-autofast-implement-worker-contract'));
      assert.ok(ids.includes(`retired-${harness}-autofast-implement-worker-binding`));
      assert.ok(ids.includes(`retired-${harness}-sai-autofast-implement-worker-agent`));

      const binding = expanded.find(record =>
        record.id === `retired-${harness}-autofast-implement-worker-binding`);
      const agent = expanded.find(record =>
        record.id === `retired-${harness}-sai-autofast-implement-worker-agent`);
      assert.ok(binding.destinationPath.endsWith(path.join('bindings', 'autofast-implement-worker.md')));
      assert.ok(agent.destinationPath.endsWith('sai-autofast-implement-worker.md'));

      // Matching managed bytes are deleted; user-owned bytes are preserved.
      fs.mkdirSync(path.dirname(binding.destinationPath), { recursive: true });
      fs.mkdirSync(path.dirname(agent.destinationPath), { recursive: true });
      const matchingHash = binding.managedHashes[0];
      const originalCreateHash = crypto.createHash;
      crypto.createHash = () => ({ update: () => ({ digest: () => matchingHash }) });
      try {
        fs.writeFileSync(binding.destinationPath, Buffer.from(`managed ${matchingHash}`));
        fs.writeFileSync(agent.destinationPath, Buffer.from('user-owned agent body\n'));
        const results = cleanupRetiredProjections(harness, roots);
        assert.equal(results.find(result => result.id === binding.id).action, 'deleted');
        assert.equal(fs.existsSync(binding.destinationPath), false);
        // Agent uses a different managed hash set — force preserved path for non-matching bytes
        crypto.createHash = () => ({ update: () => ({ digest: () => 'a'.repeat(64) }) });
        fs.writeFileSync(agent.destinationPath, Buffer.from('user-owned agent body\n'));
        const second = cleanupRetiredProjections(harness, roots);
        assert.equal(second.find(result => result.id === agent.id).action, 'preserved');
        assert.equal(fs.readFileSync(agent.destinationPath, 'utf8'), 'user-owned agent body\n');
      } finally {
        crypto.createHash = originalCreateHash;
      }
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('active projections never source the retired autofast explore paths', () => {
  const { expandInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(REPO_ROOT);
  const retiredSources = new Set([
    'sai/commands/explore/steps/pipeline-auto-fast.md',
    'sai/commands/explore/steps/pipeline-auto-supervised.md',
    'sai/commands/explore/autofast-implement-worker.md',
  ]);
  const retiredDestSuffixes = [
    'commands/explore/steps/pipeline-auto-fast.md',
    'commands/explore/steps/pipeline-auto-supervised.md',
    'commands/explore/autofast-implement-worker.md',
    'orchestration/workers/bindings/autofast-implement-worker.md',
    'sai-autofast-implement-worker.md',
  ];

  for (const harness of ['claude', 'opencode']) {
    const base = path.join(os.tmpdir(), `sai-autofast-active-${harness}`);
    const active = expandInstallManifest(manifest, {
      harness,
      repoRoot: REPO_ROOT,
      destinationRoot: destinationRoot(base),
    });
    for (const projection of active) {
      const source = path.relative(REPO_ROOT, projection.sourcePath).split(path.sep).join('/');
      assert.equal(retiredSources.has(source), false,
        `${harness} must not source retired ${source}`);
      for (const suffix of retiredDestSuffixes) {
        assert.equal(projection.destinationPath.replace(/\\/g, '/').endsWith(suffix), false,
          `${harness} must not project retired destination ending ${suffix}`);
      }
    }
  }
});

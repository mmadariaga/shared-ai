'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Module = require('module');

const flow = require('../bin/install-flow.js');
const { enumerateClaude, enumerateOpencode, computePlanEntry, runDeletion } = require('../bin/uninstall-flow.js');
const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const WORKER_NAMES = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
  'sai-commit-worker',
  'sai-archive-worker',
  'sai-backfill-worker',
];

const CLAUDE_GENERIC_AGENTS = ['budget-explorer', 'budget-executor', 'budget-subagent'];

const WORKER_PHASE = {
  'sai-1-spec-proposal-worker': 'spec',
  'sai-2-design-worker': 'design',
  'sai-3-implementation-worker': 'implementation',
  'sai-5-review-worker': 'review',
  'sai-6-security-worker': 'security',
  'sai-7-performance-worker': 'performance',
  'sai-8-accessibility-worker': 'accessibility',
  'sai-commit-worker': 'commit',
  'sai-archive-worker': 'archive',
  'sai-backfill-worker': 'backfill',
};

const matrixManifest = loadInstallManifest(path.join(__dirname, '..'));
function matrixAgent(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'agent' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix agent should exist`);
  return item.text;
}

function ownerSidecarPath(agentPath) {
  return path.join(path.dirname(agentPath), `.${path.basename(agentPath, '.md')}.owner.json`);
}

function agentProjection(workerName, dir) {
  const sourcePath = path.join(dir, 'sources', `${workerName}.md`);
  const destinationPath = path.join(dir, 'agents', `${workerName}.md`);
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, matrixAgent('claude', WORKER_PHASE[workerName]));
  return { sourcePath, destinationPath };
}

const stripTunableLines = text => text.split('\n')
  .filter(line => !/^(model|effort|variant):/.test(line))
  .join('\n');

function lineIndexOf(text, needle) {
  return text.split('\n').findIndex(line => line.includes(needle));
}

function writeFixture(dir, sourceText, destText) {
  const sourcePath = path.join(dir, 'source.md');
  const destinationPath = path.join(dir, 'installed', 'wrapper.md');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(sourcePath, sourceText);
  fs.writeFileSync(destinationPath, destText);
  return { sourcePath, destinationPath };
}

function installTunableSeed(dir, sourceText, destText, harness = 'claude') {
  const { sourcePath, destinationPath } = writeFixture(dir, sourceText, destText);
  const projection = { strategy: 'tunable-seed', harness, sourcePath, destinationPath };
  assert.doesNotThrow(() => flow.installProjection(projection, dir));
  return fs.readFileSync(destinationPath, 'utf8');
}

test('CLAUDE_TUNABLE_KEYS and OPENCODE_TUNABLE_KEYS declare the harness tunable sets', () => {
  assert.deepEqual(flow.CLAUDE_TUNABLE_KEYS, ['model', 'effort']);
  assert.deepEqual(flow.OPENCODE_TUNABLE_KEYS, ['model', 'variant']);
});

test('first install writes source verbatim', () => {
  assert.equal(typeof flow.tunableSeedInstaller, 'function',
    'tunableSeedInstaller should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-first-'));
  try {
    const sourcePath = path.join(dir, 'source.md');
    const destinationPath = path.join(dir, 'installed', 'wrapper.md');
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    const sourceText = '---\ndescription: Test\neffort: tuned-effort\nmodel: tuned-model\n---\n\nbody\n';
    fs.writeFileSync(sourcePath, sourceText);
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const result = flow.tunableSeedInstaller(projection);
    assert.ok(['created', 'reused', 'overwritten'].includes(result),
      'tunableSeedInstaller should report one of created, reused, overwritten');
    assert.equal(fs.readFileSync(destinationPath, 'utf8'), sourceText,
      'an absent destination should receive the source bytes verbatim');
    const effortIndex = lineIndexOf(sourceText, 'effort: tuned-effort');
    const modelIndex = lineIndexOf(sourceText, 'model: tuned-model');
    assert.ok(effortIndex > -1 && modelIndex > -1 && effortIndex < modelIndex,
      'tunable lines should be the source tunable lines in source order');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall overwrites customized models with repo defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-overwrite-'));
  try {
    const source = '---\ndescription: Source command\nmodel: source-model\neffort: source-effort\n---\n\nSource body.\n';
    const dest = installTunableSeed(dir, source,
      '---\ndescription: Dest command\nmodel: tuned-model\neffort: tuned-effort\n---\n\nDest body.\n');
    assert.equal(dest, source,
      'global install should overwrite the destination with source bytes verbatim');
    assert.ok(dest.includes('model: source-model') && dest.includes('effort: source-effort'),
      'source tunable values should overwrite destination tunables');
    assert.ok(!dest.includes('model: tuned-model') && !dest.includes('effort: tuned-effort'),
      'destination tunable customizations should not survive a global reinstall');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall overwrites destination with source including tunables', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-gain-'));
  try {
    const source = '---\ndescription: Test\ndescription_priority: override\npermission:\n  task:\n    "*": deny\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\nmodel: tuned-model\npermission:\n  task:\n    "*": deny\n---\n\nbody\n');
    assert.equal(dest, source,
      'global install should overwrite the destination with source bytes verbatim');
    assert.ok(dest.includes('description_priority: override'),
      'a source non-tunable key should be present after overwrite');
    assert.ok(!dest.includes('model: tuned-model'),
      'destination tunable customizations should not survive a global reinstall');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall removes stale keys and discards destination tunables', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-lose-'));
  try {
    const source = '---\ndescription: Test\npermission:\n  edit: allow\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\neffort: tuned-effort\ndescription_priority: stale\npermission:\n  edit: allow\n---\n\nbody\n');
    assert.equal(dest, source,
      'global install should overwrite the destination with source bytes verbatim');
    assert.ok(!dest.includes('description_priority'),
      'a non-tunable key absent from the source should be removed from the destination');
    assert.ok(!dest.includes('effort: tuned-effort'),
      'destination tunable customizations should not survive a global reinstall');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall overwrites permission-block destinations with source bytes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-permission-'));
  try {
    const source = '---\ndescription: Test\npermission:\n  edit: "**"\n  task:\n    "*": deny\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\nmodel: tuned-model\npermission:\n  edit: "**"\n  task:\n    "*": deny\n---\n\nbody\n',
      'opencode');
    assert.equal(dest, source,
      'global install should overwrite the destination with source bytes verbatim');
    assert.ok(!dest.includes('model: tuned-model'),
      'destination tunable customizations should not survive a global reinstall');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall overwrites tunable lines with source values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-order-'));
  try {
    const source = '---\ndescription: Test\nmodel: source-model\neffort: source-effort\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\neffort: tuned-effort\nmodel: tuned-model\n---\n\nbody\n');
    assert.equal(dest, source,
      'global install should overwrite the destination with source bytes verbatim');
    assert.ok(dest.includes('model: source-model') && dest.includes('effort: source-effort'),
      'source tunable values should overwrite destination tunables');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall discards destination-only tunables', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-preserve-'));
  try {
    const source = '---\ndescription: Test\nmodel: source-model\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\nmodel: tuned-model\neffort: tuned-effort\n---\n\nbody\n');
    assert.equal(dest, source,
      'global install should overwrite the destination with source bytes verbatim');
    assert.ok(!dest.includes('effort: tuned-effort'),
      'a destination-only tunable should not survive a global reinstall');
    assert.ok(dest.includes('model: source-model'),
      'the source tunable value should overwrite the destination');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall seeds source tunables into the destination', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-absent-'));
  try {
    const source = '---\ndescription: Test\nmodel: source-model\neffort: source-effort\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\n---\n\nbody\n');
    assert.equal(dest, source,
      'global install should overwrite the destination with source bytes verbatim');
    assert.ok(dest.includes('model: source-model') && dest.includes('effort: source-effort'),
      'source tunables should be seeded into the destination');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a non-tunable destination line is overwritten', () => {
  assert.equal(typeof flow.tunableSeedInstaller, 'function',
    'tunableSeedInstaller should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-nontunable-'));
  try {
    const dest = installTunableSeed(dir,
      '---\ndescription: New description\n---\n\nbody\n',
      '---\ndescription: Old description\n---\n\nbody\n');
    assert.ok(dest.includes('description: New description'),
      'a non-tunable destination line should be replaced with the source line');
    assert.ok(!dest.includes('Old description'),
      'the old non-tunable value should not survive');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('extraction does not require a YAML library', () => {
  assert.equal(typeof flow.tunableSeedInstaller, 'function',
    'tunableSeedInstaller should be exported');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-yaml-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir,
      '---\ndescription: Test\nmodel: source-model\n---\n\nbody\n',
      '---\ndescription: Test\nmodel: tuned-model\n---\n\nbody\n');
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    const originalLoad = Module._load;
    const requested = [];
    Module._load = function (request, parent, isMain) {
      requested.push(request);
      return originalLoad.call(this, request, parent, isMain);
    };
    try {
      flow.tunableSeedInstaller(projection);
    } finally {
      Module._load = originalLoad;
    }
    assert.ok(!requested.some(name => /yaml/i.test(name)),
      'the tunable extraction path must not require a YAML parser');
    assert.ok(fs.readFileSync(destinationPath, 'utf8').includes('model: source-model'),
      'global install should overwrite destination tunables with source values');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a tuned managed destination is recognized as managed and deleted', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-managed-'));
  try {
    flow.installClaude(dir);
    const agentPath = path.join(dir, 'agents', 'sai-5-review-worker.md');
    const tuned = fs.readFileSync(agentPath, 'utf8')
      .replace(/^model:.*$/m, 'model: tuned-model')
      .replace(/^effort:.*$/m, 'effort: tuned-effort');
    assert.match(tuned, /^model: tuned-model$/m, 'the tuned fixture should carry a new model value');
    fs.writeFileSync(agentPath, tuned);

    const entry = enumerateClaude(dir)
      .find(candidate => candidate.assetType === 'claude-managed-agent' && candidate.dest === agentPath);
    assert.ok(entry, 'a tuned managed destination should enumerate as a claude-managed-agent entry');
    assert.equal(computePlanEntry(entry).action, 'delete',
      'a destination whose only difference is its tunables should plan a delete');
    runDeletion([entry]);
    assert.equal(fs.existsSync(agentPath), false,
      'the tuned managed agent should be deleted on uninstall');
    assert.equal(fs.existsSync(ownerSidecarPath(agentPath)), false,
      'no owner sidecar should remain after deletion');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a body-divergent managed destination is kept as a project-local override', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-override-'));
  try {
    flow.installClaude(dir);
    const agentPath = path.join(dir, 'agents', 'sai-5-review-worker.md');
    const divergent = fs.readFileSync(agentPath, 'utf8') + '\n// project-local change\n';
    fs.writeFileSync(agentPath, divergent);

    const entry = enumerateClaude(dir)
      .find(candidate => candidate.assetType === 'claude-managed-agent' && candidate.dest === agentPath);
    assert.ok(entry, 'a divergent managed destination should enumerate as a claude-managed-agent entry');
    assert.equal(computePlanEntry(entry).action, 'keep-override',
      'a destination whose body or non-tunable frontmatter differs should be kept');
    runDeletion([entry]);
    assert.equal(fs.readFileSync(agentPath, 'utf8'), divergent,
      'a body-divergent managed destination should be preserved as an override');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Claude and opencode uninstall enumerate their managed agent destinations', () => {
  const genericNames = ['explore', 'executor', 'budget'];
  const applyNames = ['sai-4-red-worker', 'sai-4-green-worker',
    'sai-direct-build-worker', 'sai-review-fix-worker'];
  for (const [harness, install, enumerate, expectedCount] of [
    ['claude', flow.installClaude, enumerateClaude, 18],
    ['opencode', flow.installOpencode, enumerateOpencode, 18],
  ]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sai-tunable-${expectedCount}-${harness}-`));
    try {
      install(dir);
      const agentEntries = enumerate(dir).filter(entry => entry.assetType === 'claude-managed-agent');
      assert.equal(agentEntries.length, expectedCount,
        `${harness} uninstall should enumerate exactly ${expectedCount} managed agent destinations`);
      assert.ok(agentEntries.every(entry => !/owner\.json$/.test(entry.dest)),
        `${harness} uninstall must not enumerate owner sidecars as deletion targets`);
      assert.ok(agentEntries.every(entry => !Object.hasOwn(entry, 'ownerPath')),
        `${harness} entries must not carry an ownerPath field`);
      const basenames = agentEntries.map(entry => path.basename(entry.dest, '.md'));
      if (harness === 'opencode') {
        assert.ok(genericNames.every(name => basenames.includes(name)),
          'opencode agent destinations should include explore, executor, and budget');
        assert.ok(WORKER_NAMES.every(name => basenames.includes(name)),
          'opencode agent destinations should still cover the eleven sai worker filenames');
      } else {
        assert.ok(WORKER_NAMES.every(name => basenames.includes(name)),
          'claude agent destinations should still cover the eleven sai worker filenames');
        assert.ok(CLAUDE_GENERIC_AGENTS.every(name => basenames.includes(name)),
          'claude agent destinations should include the three budget agent basenames');
      }
      assert.ok(applyNames.every(name => basenames.includes(name)),
        `${harness} agent destinations should include the two apply-role worker filenames`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Claude uninstall enumerates the three budget-agent destinations as managed agents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-claude-budget-'));
  try {
    flow.installClaude(dir);
    const agentEntries = enumerateClaude(dir).filter(entry => entry.assetType === 'claude-managed-agent');
    const basenames = agentEntries.map(entry => path.basename(entry.dest, '.md'));
    for (const name of CLAUDE_GENERIC_AGENTS) {
      assert.ok(basenames.includes(name),
        `Claude should enumerate the ${name} managed agent destination`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('agentProjection helper resolves the managed Claude source for each worker', () => {
  for (const workerName of WORKER_NAMES) {
    const { sourcePath, destinationPath } = agentProjection(workerName, path.join(os.tmpdir(), 'sai-tunable-helper'));
    assert.ok(fs.existsSync(sourcePath), `${workerName} should have a Claude agent source`);
    assert.equal(path.basename(destinationPath), `${workerName}.md`);
  }
});

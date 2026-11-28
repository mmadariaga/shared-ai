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
  'sai-4-review-worker',
  'sai-5-security-worker',
  'sai-6-performance-worker',
  'sai-7-accessibility-worker',
  'sai-commit-worker',
  'sai-archive-worker',
  'sai-backfill-worker',
];

const CLAUDE_GENERIC_AGENTS = ['budget-explorer', 'budget-executor', 'budget-subagent'];

const WORKER_PHASE = {
  'sai-1-spec-proposal-worker': 'spec',
  'sai-2-design-worker': 'design',
  'sai-4-review-worker': 'review',
  'sai-5-security-worker': 'security',
  'sai-6-performance-worker': 'performance',
  'sai-7-accessibility-worker': 'accessibility',
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
  assert.deepEqual(flow.CLAUDE_TUNABLE_KEYS, ['model', 'effort', 'harness']);
  assert.deepEqual(flow.OPENCODE_TUNABLE_KEYS, ['model', 'variant', 'harness']);
});

test('E2 a hand-set harness line in an opencode agent file is a user-owned tunable', () => {
  const source = '---\nname: sai-demo-worker\nmodel: opencode-go/source\nvariant: low\n---\n\nbody\n';
  const handSet = '---\nname: sai-demo-worker\nmodel: opencode-go/tuned\nvariant: high\nharness: claude\n---\n\nbody\n';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-harness-opencode-'));
  try {
    const { sourcePath, destinationPath } = writeFixture(dir, source, handSet);
    const projection = { strategy: 'tunable-seed', harness: 'opencode', sourcePath, destinationPath };
    assert.equal(flow.tunableSeedInstaller(projection), 'reused', 'a compatible file keeps the route line');
    assert.equal(fs.readFileSync(destinationPath, 'utf8'), handSet);
    assert.ok(flow.managedDefinitionBytes(Buffer.from(source), flow.OPENCODE_TUNABLE_KEYS)
      .equals(flow.managedDefinitionBytes(Buffer.from(handSet), flow.OPENCODE_TUNABLE_KEYS)),
    'doctor compares managed content after stripping the tunables');
    const divergent = installTunableSeed(dir, source.replace('body', 'new body'), handSet, 'opencode');
    assert.ok(divergent.includes('harness: claude') && divergent.includes('new body'), 'a reinstall keeps the routing');
    assert.ok(!/^harness:/m.test(source), 'the opencode agent templates ship no harness line');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E2 setup writes and removes the opencode route line on the separate model/variant shape', () => {
  const { patchFrontmatter } = require('../bin/model-customization.js');
  const keys = flow.OPENCODE_TUNABLE_KEYS;
  const source = '---\nname: sai-demo-worker\nmodel: opencode-go/a\nvariant: low\n---\n\nbody\n';
  const options = { separateVariant: true, passthroughHarness: 'claude' };
  const routed = patchFrontmatter(source, keys, { harness: 'claude' }, options);
  assert.equal(routed, '---\nname: sai-demo-worker\nmodel: opencode-go/a\nvariant: low\nharness: claude\n---\n\nbody\n',
    'a routing-only setting keeps the inert model and variant lines and adds the route line');
  assert.equal(patchFrontmatter(routed, keys, { harness: 'claude' }, options), routed, 'writing twice adds one line');
  assert.equal(patchFrontmatter(routed, keys, { model: 'opencode-go/a', variant: 'low' }, options), source,
    'choosing a model removes the route line');
  assert.equal(patchFrontmatter(routed, ['model', 'variant'], { model: 'opencode-go/a', variant: 'low' }).includes('harness: claude'), true,
    'a caller that does not manage harness never touches it');
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

test('global reinstall updates managed content and preserves customized models', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-overwrite-'));
  try {
    const source = '---\ndescription: Source command\nmodel: source-model\neffort: source-effort\n---\n\nSource body.\n';
    const dest = installTunableSeed(dir, source,
      '---\ndescription: Dest command\nmodel: tuned-model\neffort: tuned-effort\n---\n\nDest body.\n');
    assert.equal(dest, source.replace('source-model', 'tuned-model').replace('source-effort', 'tuned-effort'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall preserves destination-only model with new managed keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-gain-'));
  try {
    const source = '---\ndescription: Test\ndescription_priority: override\npermission:\n  task:\n    "*": deny\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\nmodel: tuned-model\npermission:\n  task:\n    "*": deny\n---\n\nbody\n');
    assert.equal(flow.stripTunableLines(Buffer.from(dest), ['model']).toString(), source);
    assert.ok(dest.includes('description_priority: override'),
      'a source non-tunable key should be present after overwrite');
    assert.ok(dest.includes('model: tuned-model'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall removes stale managed keys and retains tunables', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-lose-'));
  try {
    const source = '---\ndescription: Test\npermission:\n  edit: allow\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\neffort: tuned-effort\ndescription_priority: stale\npermission:\n  edit: allow\n---\n\nbody\n');
    assert.equal(flow.stripTunableLines(Buffer.from(dest), ['effort']).toString(), source);
    assert.ok(!dest.includes('description_priority'),
      'a non-tunable key absent from the source should be removed from the destination');
    assert.ok(dest.includes('effort: tuned-effort'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall reuses compatible permission blocks with tuned models', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-permission-'));
  try {
    const source = '---\ndescription: Test\npermission:\n  edit: "**"\n  task:\n    "*": deny\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\nmodel: tuned-model\npermission:\n  edit: "**"\n  task:\n    "*": deny\n---\n\nbody\n',
      'opencode');
    assert.equal(flow.stripTunableLines(Buffer.from(dest), ['model']).toString(), source);
    assert.ok(dest.includes('model: tuned-model'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall leaves compatible tunable lines unchanged', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-order-'));
  try {
    const source = '---\ndescription: Test\nmodel: source-model\neffort: source-effort\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\neffort: tuned-effort\nmodel: tuned-model\n---\n\nbody\n');
    assert.equal(dest, '---\ndescription: Test\neffort: tuned-effort\nmodel: tuned-model\n---\n\nbody\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall retains destination-only tunables', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-preserve-'));
  try {
    const source = '---\ndescription: Test\nmodel: source-model\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\nmodel: tuned-model\neffort: tuned-effort\n---\n\nbody\n');
    assert.ok(dest.includes('effort: tuned-effort') && dest.includes('model: tuned-model'));
    assert.ok(!dest.includes('source-model'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('global reinstall retains omitted tunables on compatible existing agents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-absent-'));
  try {
    const source = '---\ndescription: Test\nmodel: source-model\neffort: source-effort\n---\n\nbody\n';
    const dest = installTunableSeed(dir,
      source,
      '---\ndescription: Test\n---\n\nbody\n');
    assert.equal(dest, '---\ndescription: Test\n---\n\nbody\n');
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
    assert.ok(fs.readFileSync(destinationPath, 'utf8').includes('model: tuned-model'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a tuned managed destination is recognized as managed and deleted', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-managed-'));
  try {
    flow.installClaude(dir);
    const agentPath = path.join(dir, 'agents', 'sai-4-review-worker.md');
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
    const agentPath = path.join(dir, 'agents', 'sai-4-review-worker.md');
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
  const genericNames = ['budget-explorer', 'budget-executor', 'budget-subagent'];
  const applyNames = ['sai-3-red-worker', 'sai-3-green-worker',
    'sai-direct-build-worker', 'sai-4-review-worker'];
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
        `${harness} agent destinations should include the role worker filenames`);
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

test('E11 a hand-set harness line in a Claude Code agent file is a user-owned tunable', () => {
  const source = '---\nname: sai-demo-worker\nmodel: source-model\neffort: source-effort\ntools: Read\n---\n\nbody\n';
  const handSet = '---\nname: sai-demo-worker\nmodel: tuned-model\neffort: tuned-effort\nharness: opencode\ntools: Read\n---\n\nbody\n';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-harness-'));
  try {
    // A compatible file keeps the line and is reused, not overwritten.
    const { sourcePath, destinationPath } = writeFixture(dir, source, handSet);
    const projection = { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
    assert.equal(flow.tunableSeedInstaller(projection), 'reused');
    assert.equal(fs.readFileSync(destinationPath, 'utf8'), handSet);
    // Doctor compares managed content after stripping the tunables, so the line reports no drift.
    assert.ok(flow.managedDefinitionBytes(Buffer.from(source), flow.CLAUDE_TUNABLE_KEYS)
      .equals(flow.managedDefinitionBytes(Buffer.from(handSet), flow.CLAUDE_TUNABLE_KEYS)));
    // A divergent body is overwritten while the harness line survives.
    const divergent = installTunableSeed(dir, source.replace('body', 'new body'), handSet);
    assert.ok(divergent.includes('harness: opencode') && divergent.includes('new body'));
    // The agent templates ship no harness line.
    assert.ok(!/^harness:/m.test(source));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E7 the harness line that setup writes stays a user-owned tunable, and setup removes it again', () => {
  const { patchFrontmatter } = require('../bin/model-customization.js');
  const keys = flow.CLAUDE_TUNABLE_KEYS;
  const source = '---\nname: sai-demo-worker\nmodel: source-model\neffort: source-effort\ntools: Read\n---\n\nbody\n';
  const routed = patchFrontmatter(source, keys, { harness: 'opencode' });
  assert.ok(routed.includes('\nharness: opencode\n'));
  assert.ok(flow.managedDefinitionBytes(Buffer.from(source), keys).equals(flow.managedDefinitionBytes(Buffer.from(routed), keys)),
    'the line setup writes is no drift for doctor');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-setup-harness-'));
  try {
    const divergent = installTunableSeed(dir, source.replace('body', 'new body'), routed);
    assert.ok(divergent.includes('harness: opencode') && divergent.includes('new body'), 'a reinstall keeps the routing');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // Choosing a Claude model removes the line, so the file is the factory shape again.
  assert.equal(patchFrontmatter(routed, keys, { model: 'source-model', effort: 'source-effort' }), source);
  assert.ok(!/^harness:/m.test(source), 'the installer itself still writes no default line');
});

test('E11 the shipped Claude Code agent sources and generated agents carry no harness line', () => {
  const root = path.resolve(__dirname, '..');
  for (const name of ['budget-explorer', 'budget-executor', 'budget-subagent', 'worker-template']) {
    assert.ok(!/^harness:/m.test(fs.readFileSync(path.join(root, 'agents', 'claude', `${name}.md`), 'utf8')), name);
  }
});

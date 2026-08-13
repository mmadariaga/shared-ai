'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  deleteEntry,
  pruneEmptyDirs,
  runDeletion,
} = require('../bin/uninstall-flow.js');
const { loadInstallManifest } = require('../bin/install-manifest.js');

const crypto = require('crypto');

function writeFile(dir, relPath, content) {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

test('deleteEntry deletes file when dest hash matches src hash', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const content = 'matching content';
    const srcPath = writeFile(tmpDir, 'canonical.txt', content);
    const destPath = writeFile(tmpDir, 'dest.txt', content);
    const result = deleteEntry({ src: srcPath, dest: destPath, editorBase: tmpDir });
    assert.equal(result, 'deleted');
    assert.equal(fs.existsSync(destPath), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deleteEntry keeps file as kept-override when dest hash differs from src hash', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const srcPath = writeFile(tmpDir, 'canonical.txt', 'canonical content');
    const destPath = writeFile(tmpDir, 'dest.txt', 'user modified content');
    const result = deleteEntry({ src: srcPath, dest: destPath, editorBase: tmpDir });
    assert.equal(result, 'kept-override');
    assert.equal(fs.existsSync(destPath), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deleteEntry returns not-found for missing destination without throwing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const srcPath = writeFile(tmpDir, 'canonical.txt', 'some content');
    const missingDest = path.join(tmpDir, 'does-not-exist.txt');
    assert.doesNotThrow(() => {
      const result = deleteEntry({ src: srcPath, dest: missingDest, editorBase: tmpDir });
      assert.equal(result, 'not-found');
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('retired entries delete accepted content and preserve unknown content', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const managed = 'retired managed content';
    const acceptedHashes = [hash(managed)];
    const matchingDest = writeFile(tmpDir, path.join('commands', 'retired.md'), managed);
    const modifiedDest = writeFile(tmpDir, path.join('commands', 'modified.md'), 'unknown content');
    const configPath = writeFile(tmpDir, 'opencode.jsonc', '{"unrelated":true}');
    const unrelatedPath = writeFile(tmpDir, 'commands/unrelated.md', 'keep me');
    const plan = [
      { assetType: 'retired-managed-file', acceptedHashes, ruleId: 'retired-test', dest: matchingDest, editorBase: tmpDir },
      { assetType: 'retired-managed-file', acceptedHashes, ruleId: 'retired-test', dest: modifiedDest, editorBase: tmpDir },
    ];
    const result = runDeletion(plan);
    assert.equal(result.deleted, 1);
    assert.equal(result.keptOverride, 1);
    assert.equal(result.notFound, 0);
    assert.equal(fs.existsSync(matchingDest), false);
    assert.equal(fs.readFileSync(modifiedDest, 'utf8'), 'unknown content');
    assert.equal(fs.readFileSync(unrelatedPath, 'utf8'), 'keep me');
    assert.equal(fs.readFileSync(configPath, 'utf8'), '{"unrelated":true}');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('retired destination inventory preserves modified content across all 14 former worker bindings', () => {
   const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-retirements-'));
   const retirements = loadInstallManifest(path.join(__dirname, '..')).retirements.filter(retirement => retirement.id.endsWith('-proxy-skill'));
   const destinations = retirements.map(retirement => path.join(retirement.destination.class, retirement.destination.path));
   try {
     assert.equal(destinations.length, 14);
     const plan = destinations.map(destination => ({
      assetType: 'retired-managed-file',
      acceptedHashes: [hash('managed')],
      ruleId: `retired-${destination}`,
      dest: writeFile(tmpDir, destination, 'locally modified'),
      editorBase: tmpDir,
    }));
    const result = runDeletion(plan);
    assert.equal(result.keptOverride, destinations.length);
    for (const destination of destinations) assert.equal(fs.readFileSync(path.join(tmpDir, destination), 'utf8'), 'locally modified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('all 14 former worker bindings delete accepted bytes and keep overrides', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-retired-worker-bindings-'));
   const retirements = loadInstallManifest(path.join(__dirname, '..')).retirements.filter(retirement => retirement.id.endsWith('-proxy-skill'));
  const managed = 'historical managed worker binding';
  const acceptedHash = hash(managed);
  const unrelated = writeFile(tmpDir, 'unrelated.txt', 'keep me');
  try {
    const matching = retirements.map((retirement, index) => {
      const dest = writeFile(tmpDir, path.join('matching', `${index}.md`), managed);
      return { assetType: 'retired-managed-file', acceptedHashes: [acceptedHash], ruleId: retirement.id, dest, editorBase: tmpDir };
    });
    const overrides = retirements.map((retirement, index) => {
      const dest = writeFile(tmpDir, path.join('overrides', `${index}.md`), 'locally modified');
      return { assetType: 'retired-managed-file', acceptedHashes: [acceptedHash], ruleId: retirement.id, dest, editorBase: tmpDir };
    });
    const result = runDeletion([...matching, ...overrides]);
    assert.equal(result.deleted, 14);
    assert.equal(result.keptOverride, 14);
    assert.equal(result.notFound, 0);
    for (const entry of matching) assert.equal(fs.existsSync(entry.dest), false);
    for (const entry of overrides) assert.equal(fs.readFileSync(entry.dest, 'utf8'), 'locally modified');
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'keep me');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('pruneEmptyDirs removes empty parent directories walking upward to editorBase', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const nestedDir = path.join(tmpDir, 'a', 'b', 'c');
    fs.mkdirSync(nestedDir, { recursive: true });
    const filePath = path.join(nestedDir, 'file.md');
    fs.writeFileSync(filePath, 'content');
    fs.unlinkSync(filePath);
    pruneEmptyDirs(nestedDir, tmpDir);
    assert.equal(fs.existsSync(path.join(tmpDir, 'a', 'b', 'c')), false,
      'deepest empty dir should be removed');
    assert.equal(fs.existsSync(path.join(tmpDir, 'a', 'b')), false,
      'intermediate empty dir should be removed');
    assert.equal(fs.existsSync(path.join(tmpDir, 'a')), false,
      'top-level empty dir should be removed');
    assert.equal(fs.existsSync(tmpDir), true,
      'editorBase should not be removed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('pruneEmptyDirs preserves directory that still contains a kept override', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const contentDir = path.join(tmpDir, 'a', 'b');
    fs.mkdirSync(contentDir, { recursive: true });
    writeFile(tmpDir, path.join('a', 'b', 'override.md'), 'kept override content');
    pruneEmptyDirs(contentDir, tmpDir);
    assert.equal(fs.existsSync(contentDir), true,
      'directory with kept override should be preserved');
    assert.equal(fs.existsSync(tmpDir), true,
      'editorBase should be preserved');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runDeletion on re-run with previously-deleted path raises no error and counts as not-found', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const srcPath = writeFile(tmpDir, 'canonical.txt', 'content');
    const missingDest = path.join(tmpDir, 'already-deleted.txt');
    const plan = [
      { src: srcPath, dest: missingDest, editorBase: tmpDir, action: 'delete', exists: false, hashMatches: false },
    ];
    assert.doesNotThrow(() => {
      const result = runDeletion(plan);
      assert.equal(result.notFound, 1,
        'previously-deleted path should count as not-found');
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runDeletion returned counts equal observed deleted, kept-override, not-found tallies', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-'));
  try {
    const matchContent = 'matching content';
    const srcMatch = writeFile(tmpDir, 'src-match.txt', matchContent);
    const destMatch = writeFile(tmpDir, 'dest-match.txt', matchContent);
    const srcDiff = writeFile(tmpDir, 'src-diff.txt', 'canonical');
    const destDiff = writeFile(tmpDir, 'dest-diff.txt', 'user override');
    const srcMissing = writeFile(tmpDir, 'src-missing.txt', 'content');
    const missingDest = path.join(tmpDir, 'not-found.txt');
    const plan = [
      { src: srcMatch, dest: destMatch, editorBase: tmpDir },
      { src: srcDiff, dest: destDiff, editorBase: tmpDir },
      { src: srcMissing, dest: missingDest, editorBase: tmpDir },
    ];
    const result = runDeletion(plan);
    assert.equal(typeof result.deleted, 'number');
    assert.equal(typeof result.keptOverride, 'number');
    assert.equal(typeof result.notFound, 'number');
    assert.equal(result.deleted + result.keptOverride + result.notFound, plan.length,
      'sum of counts should equal plan length');
    assert.equal(result.deleted, 1,
      'one entry should be deleted (hash matches)');
    assert.equal(result.keptOverride, 1,
      'one entry should be kept as override (hash diverges)');
    assert.equal(result.notFound, 1,
      'one entry should be not-found (dest missing)');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('claude-managed-agent entries delete on body-and-non-tunable match and keep divergent destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-exec-managed-agent-'));
  try {
    const canonical = '---\ndescription: Managed agent\nmodel: canonical-model\neffort: canonical-effort\n---\n\nbody\n';
    const tunedDest = '---\ndescription: Managed agent\nmodel: user-model\neffort: user-effort\n---\n\nbody\n';
    const divergentDest = '---\ndescription: Managed agent\nmodel: user-model\neffort: user-effort\n---\n\nuser divergent body\n';
    const src = writeFile(tmpDir, 'canonical.md', canonical);
    const tunedPath = writeFile(tmpDir, path.join('agents', 'tuned.md'), tunedDest);
    const divergentPath = writeFile(tmpDir, path.join('agents', 'divergent.md'), divergentDest);
    const plan = [
      { assetType: 'claude-managed-agent', src, dest: tunedPath, editorBase: tmpDir, tunableKeys: ['model', 'effort'] },
      { assetType: 'claude-managed-agent', src, dest: divergentPath, editorBase: tmpDir, tunableKeys: ['model', 'effort'] },
    ];
    const result = runDeletion(plan);
    assert.equal(result.deleted, 1,
      'a tuned destination should be deleted as managed');
    assert.equal(result.keptOverride, 1,
      'a body-divergent destination should be kept as an override');
    assert.equal(result.notFound, 0);
    assert.equal(fs.existsSync(tunedPath), false);
    assert.equal(fs.readFileSync(divergentPath, 'utf8'), divergentDest);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('matrix retirement: the active worker inventory stays exactly seven bindings and seven agents per harness', () => {
  const { expandInstallManifest } = require('../bin/install-manifest.js');
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
  const workers = [
    'sai-1-spec-proposal-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
  ];
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = {
      commands: path.join(os.tmpdir(), `sai-exec-matrix-${harness}-commands`),
      sai: path.join(os.tmpdir(), `sai-exec-matrix-${harness}-sai`),
      skills: path.join(os.tmpdir(), `sai-exec-matrix-${harness}-skills`),
      agents: path.join(os.tmpdir(), `sai-exec-matrix-${harness}-agents`),
      config: os.tmpdir(),
      root: os.tmpdir(),
    };
    const active = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/') &&
        phases.includes(path.basename(projection.destinationPath, '-worker.md')))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 7, `${harness} should project exactly seven worker bindings`);
    assert.deepEqual(bindingNames.sort(), phases.map(phase => `${phase}-worker.md`).sort(),
      `${harness} worker binding names should match the canonical phase matrix`);
    assert.equal(bindingNames.includes('idea-list-render.md'), false,
      `${harness} must not project an idea-list-render matrix binding`);
    const allBindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(allBindingNames.length, 7,
      `${harness} should keep only the seven routed worker bindings in the matrix destination`);
    const ideaList = active.find(projection =>
      path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/') ===
      `sai/adapters/${harness}/idea-list-render.md`);
    assert.ok(ideaList, `${harness} should project the adapter idea-list render source outside the matrix`);
    assert.equal(path.relative(destinationRoot.sai, ideaList.destinationPath).split(path.sep).join('/'),
      `adapters/${harness}/idea-list-render.md`);
    const agentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents) &&
        workers.includes(path.basename(projection.destinationPath, '.md')))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(agentNames.length, 7, `${harness} should project exactly seven managed agents`);
    assert.deepEqual(agentNames.sort(), [...workers].sort(),
      `${harness} managed agent names should match the canonical worker matrix`);
    assert.equal(agentNames.some(name => ['budget', 'executor', 'explore'].includes(name)), false,
      `${harness} must not project support agents as matrix worker inventory`);
  }
});

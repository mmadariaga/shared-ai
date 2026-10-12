'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { expandInstallManifest } = require('../bin/install-manifest');

const repoRoot = path.resolve(__dirname, '..');
const presetText = fs.readFileSync(path.join(repoRoot, 'sai/presets/claude/[sai-default]-OPUS.json'), 'utf8');
const preset = JSON.parse(presetText);
const manifest = require('../sai/install-manifest.json');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

function settings(text) {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(frontmatter, 'frontmatter must exist');
  const result = {};
  for (const key of ['model', 'effort']) {
    const matches = [...frontmatter[1].matchAll(new RegExp(`^${key}: (.+)$`, 'gm'))];
    assert.equal(matches.length, 1, `${key} must be explicit and unique`);
    result[key] = matches[0][1].trim();
  }
  return result;
}

function projections(harness) {
  const base = path.join(repoRoot, '.tmp', 'align-claude-defaults-opus-preset', harness);
  const destinationRoot = Object.fromEntries(
    ['agents', 'commands', 'config', 'sai', 'skills', 'root'].map(key => [key, path.join(base, key)]),
  );
  return { base, entries: expandInstallManifest(manifest, { harness, repoRoot, destinationRoot }) };
}

test('all 40 Claude shipped roles retain the OPUS preset defaults with five identical planners', () => {
  const previous = Object.fromEntries(Object.entries(preset)
    .filter(([name]) => !/^worker:sai-3-(frontend|backend|infra|other)-worker$/.test(name))
    .map(([name, value]) => [name.replace('worker:sai-3-ui-worker', 'worker:sai-3-implementation-worker'), value]));
  assert.equal(hash(JSON.stringify(previous, null, 2) + '\n'), '214fff330885f84ece7527632bbb5bdd2b940d813c623c866e2f2f308cc3752f');
  for (const agent of ['ui', 'frontend', 'backend', 'infra', 'other']) assert.deepEqual(preset[`worker:sai-3-${agent}-worker`], previous['worker:sai-3-implementation-worker']);
  const counts = {};
  const { base, entries } = projections('claude');
  for (const [role, expected] of Object.entries(preset)) {
    const [family, name] = role.split(':');
    counts[family] = (counts[family] || 0) + 1;
    const directory = family === 'agent' || family === 'worker' ? 'agents' : 'commands';
    if (family === 'worker') {
      const entry = manifest['worker-matrix'].entries.find(entry => entry.workerName === name);
      assert.ok(entry, role);
      assert.deepEqual({ model: entry.claudeAgent.model, effort: entry.claudeAgent.effort }, expected, role);
    } else {
      assert.deepEqual(settings(fs.readFileSync(path.join(repoRoot, directory, 'claude', `${name}.md`), 'utf8')), expected, role);
    }
    const generated = entries.find(entry => entry.destinationPath === path.join(base, directory, `${name}.md`));
    assert.ok(generated, `${role} must be projected`);
    assert.deepEqual(settings(generated.sourceText ?? fs.readFileSync(generated.sourcePath, 'utf8')), expected, role);
  }
  assert.deepEqual(counts, { agent: 3, command: 15, worker: 19, utility: 3 });
  for (const name of ['to-pr', 'to-backlog', 'from-backlog', 'from-next-backlog-item']) {
    assert.ok(!Object.hasOwn(preset, `command:${name}`));
  }
});

test('non-implementation opencode projections remain byte-identical across the category-routing change', () => {
  // This fingerprint was calculated on HEAD before category routing. The three
  // entry wrappers and five planners are covered by their routing, permission,
  // handshake and default-model checks; every other projected byte stays pinned.
  const { base, entries } = projections('opencode');
  const output = entries.map(entry => [
    path.relative(base, entry.destinationPath).split(path.sep).join('/'),
    entry.sourceText ?? fs.readFileSync(entry.sourcePath, 'utf8'),
  ]).filter(([name]) => /^(agents|commands|config)\//.test(name))
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  assert.equal(output.length, 45);
  assert.equal(output.filter(([name]) => /^agents\/sai-3-.*-worker\.md$/.test(name)).length, 5);
  const unchanged = output.filter(([name]) => !/^agents\/sai-3-.*-worker\.md$/.test(name)
    && !/^commands\/(sai-3-implement|sai-build|sai-explore)\.md$/.test(name));
  assert.equal(unchanged.length, 37);
  assert.equal(hash(JSON.stringify(unchanged)), 'ae95c53c1bb9706aafa51eb5fde3f1ccca6a000f6e9b4bfa3d088d286eca551d');
});

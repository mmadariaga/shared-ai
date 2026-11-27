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

// Generated opencode agent bodies carry the platform-resolved SAI temp roots, the Claude Code one included, whose
// Linux form names the user id. The pinned hashes were taken on Linux as user 1000, so projection runs as Linux with
// that user id, whatever the host.
function asLinux(action) {
  const original = Object.getOwnPropertyDescriptor(process, 'platform');
  const uid = Object.getOwnPropertyDescriptor(process, 'getuid');
  Object.defineProperty(process, 'platform', { value: 'linux' });
  process.getuid = () => 1000;
  // The Linux temp base is the real form of /tmp; the pinned form is /tmp itself, whatever the host links it to.
  const realpath = fs.realpathSync;
  fs.realpathSync = Object.assign(target => (target === '/tmp' ? target : realpath(target)), { native: realpath.native });
  try { return action(); } finally {
    fs.realpathSync = realpath;
    Object.defineProperty(process, 'platform', original);
    if (uid) Object.defineProperty(process, 'getuid', uid); else delete process.getuid;
  }
}

function projections(harness) {
  const base = path.join(repoRoot, '.tmp', 'align-claude-defaults-opus-preset', harness);
  const destinationRoot = Object.fromEntries(
    ['agents', 'commands', 'config', 'sai', 'skills', 'root'].map(key => [key, path.join(base, key)]),
  );
  return { base, entries: asLinux(() => expandInstallManifest(manifest, { harness, repoRoot, destinationRoot, installRoot: harness === 'claude' ? '/home/test/.claude' : '/home/test/.config/opencode' })) };
}

test('all 37 Claude shipped roles match the audit-renumbered OPUS preset exactly', () => {
  assert.equal(hash(presetText), '6c284557e5357ba5db1aac1a6677f6158b3b2d5112860b6aceebd8c5dd71c2e2');
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
  assert.deepEqual(counts, { agent: 3, command: 16, worker: 14, utility: 4 });
  for (const name of ['to-pr', 'to-backlog', 'from-backlog', 'from-next-backlog-item']) {
    assert.ok(!Object.hasOwn(preset, `command:${name}`));
  }
});

test('generated opencode agents, command wrappers, and configuration match the customizable-definition snapshot', () => {
  // Includes the shared budget-* identities, dispatch grants, and customization markers.
  const { base, entries } = projections('opencode');
  const output = entries.map(entry => [
    path.relative(base, entry.destinationPath).split(path.sep).join('/'),
    entry.sourceText ?? fs.readFileSync(entry.sourcePath, 'utf8'),
  ]).filter(([name]) => /^(agents|commands|config)\//.test(name))
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  assert.equal(output.length, 44);
  assert.equal(hash(JSON.stringify(output)), '8a53b4cfe9ddd1929026c2fdb073032bc5242eada823c7c8a49f8820c1b0b78d');
});

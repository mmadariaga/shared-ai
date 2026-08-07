'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { installProjection } = require('../bin/install-flow.js');
const { STRATEGIES, validateManifest } = require('../bin/install-manifest.js');

function claudeSourceBytes() {
  return '---\ndescription: Source command\nmodel: source-model\neffort: source-effort\n---\n\nSource body.\n';
}

function tunedClaudeDestBytes() {
  return '---\ndescription: Dest command\nmodel: tuned-model\neffort: tuned-effort\n---\n\nDest body.\n';
}

function tunableSeedProjection(dir) {
  const sourcePath = path.join(dir, 'source.md');
  const destinationPath = path.join(dir, 'installed', 'wrapper.md');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  return { strategy: 'tunable-seed', harness: 'claude', sourcePath, destinationPath };
}

test('tunable-seed passes validation', () => {
  assert.ok(STRATEGIES && STRATEGIES.includes('tunable-seed'),
    'STRATEGIES should include the tunable-seed strategy');
  const rule = {
    id: 'test-tunable-seed-rule',
    source: 'commands/claude/wrapper.md',
    destination: { class: 'root', path: 'claude/commands/wrapper.md' },
    harnesses: ['claude'],
    strategy: 'tunable-seed',
    recursive: false,
    include: ['**/*.md'],
    exclude: [],
    ownership: 'managed',
    drift: 'content',
  };
  assert.equal(typeof validateManifest, 'function', 'validateManifest should be exported');
  assert.doesNotThrow(() => validateManifest(rule),
    'a rule with strategy tunable-seed should pass manifest validation');
});

test('tunable-seed routes to the dedicated installer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-tunable-route-'));
  try {
    const projection = tunableSeedProjection(dir);
    fs.writeFileSync(projection.sourcePath, claudeSourceBytes());
    fs.writeFileSync(projection.destinationPath, tunedClaudeDestBytes());
    assert.doesNotThrow(() => installProjection(projection, dir),
      'installProjection should accept a tunable-seed projection without throwing');
    const dest = fs.readFileSync(projection.destinationPath, 'utf8');
    assert.ok(dest.includes('model: tuned-model'),
      'the destination model line should retain its pre-install value');
    assert.ok(dest.includes('effort: tuned-effort'),
      'the destination effort line should retain its pre-install value');
    assert.ok(dest.includes('description: Source command'),
      'the destination non-tunable frontmatter should come from the source');
    assert.ok(dest.includes('Source body.'), 'the destination body should come from the source');
    assert.ok(!dest.includes('Dest body.'), 'the old destination body should not survive');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

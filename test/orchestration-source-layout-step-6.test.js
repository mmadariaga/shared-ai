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

test('active-reference audit reports no supported dependency on retired sources', () => {
  const references = auditActiveReferences(repoRoot);

  assert.ok(Array.isArray(references), 'audit should return a reference list');
  assert.deepEqual(references, []);
});

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

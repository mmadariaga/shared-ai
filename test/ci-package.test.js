'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { requiredFiles, verifyPackage } = require('../.github/scripts/verify-package.cjs');

test('package verification covers entry points and runtime inputs for both harnesses', () => {
  const required = requiredFiles(path.resolve(__dirname, '..'));
  for (const file of [
    'bin/install.js', 'bin/sai-state.js', 'sai/install-manifest.json',
    'agents/claude/worker-template.md', 'agents/opencode/worker-template.md',
    'commands/claude/sai-explore.md', 'commands/opencode/sai-explore.md',
    'configs/opencode.jsonc', 'openspec/schemas/sai-workflow/schema.yaml',
    'sai-state/machines/explore-idea.js',
  ]) assert.ok(required.has(file), file);
  const report = [{ files: [...required].map(file => ({ path: file })) }];
  assert.equal(verifyPackage(report, required), required.size);
  assert.equal(verifyPackage({ 'shared-ai': report[0] }, required), required.size);
  for (const missing of required) {
    assert.throws(() => verifyPackage([{ files: report[0].files.filter(file => file.path !== missing) }], required),
      /Package is missing required files/);
  }
});

test('package verification rejects missing or malformed npm output', () => {
  for (const report of [null, [], [{ files: [] }, { files: [] }], [{}]]) {
    assert.throws(() => verifyPackage(report, new Set(['bin/install.js'])), /Expected exactly one/);
  }
  assert.throws(() => verifyPackage([{ files: [] }], new Set(['bin/install.js'])), /bin\/install\.js/);
});

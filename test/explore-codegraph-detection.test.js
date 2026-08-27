'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const instructionsPath = path.join(repoRoot, 'sai', 'commands', 'explore', 'instructions.md');

function instructions() {
  return fs.readFileSync(instructionsPath, 'utf8');
}

function hasRootIndexEvidence({ rootScopedEntries }) {
  return rootScopedEntries.some(entry => path.basename(entry) !== '.gitignore');
}

test('CodeGraph detection uses the root-scoped directory Glob and excludes the sentinel', () => {
  const source = instructions();

  assert.match(source, /directory-scoped `Glob` with `path: \.codegraph` and `pattern: \*`/);
  assert.match(source, /root-scoped results include an entry other than `\.gitignore`/);
  assert.doesNotMatch(source, /Glob for `\.codegraph\/\*`/);
  assert.match(source, /Glob` is the only permitted filesystem probe/);
});

test('CodeGraph detection regression cases use only root-scoped non-sentinel evidence', () => {
  const cases = [
    { name: 'existing root index', rootScopedEntries: ['codegraph.db'], nestedEntries: [], expected: true },
    { name: 'absent directory', rootScopedEntries: [], nestedEntries: [], expected: false },
    { name: 'sentinel-only directory', rootScopedEntries: ['.gitignore'], nestedEntries: [], expected: false },
    {
      name: 'nested-only directory',
      rootScopedEntries: [],
      nestedEntries: ['nested/.codegraph/codegraph.db'],
      expected: false,
    },
  ];

  for (const { name, rootScopedEntries, nestedEntries, expected } of cases) {
    assert.equal(hasRootIndexEvidence({ rootScopedEntries, nestedEntries }), expected, name);
  }
});

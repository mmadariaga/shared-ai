'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { expandInstallManifest, loadInstallManifest } = require('../bin/install-manifest');

const repoRoot = path.resolve(__dirname, '..');
const universalRoot = path.join(repoRoot, 'skills', 'universal');
const harnesses = ['claude', 'opencode'];
// A reference is an `.md` name inside a backtick span or a Markdown link target.
const REFERENCE = /`([^`\s]+\.md)`|\]\(([^)\s#]+\.md)(?:#[^)]*)?\)/g;

function installedSources(harness) {
  const manifest = loadInstallManifest(repoRoot);
  const root = path.join(os.tmpdir(), `skill-references-${harness}`);
  const destinationRoot = Object.fromEntries(['commands', 'sai', 'skills', 'agents', 'config', 'root'].map(key => [key, path.join(root, key)]));
  const rows = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
  return new Set(rows.map(row => row.sourcePath));
}

test('every existing file a universal skill references is installed wherever the referencing file is', () => {
  const installed = Object.fromEntries(harnesses.map(harness => [harness, installedSources(harness)]));
  const referencingFiles = [...new Set(harnesses.flatMap(harness => [...installed[harness]]))]
    .filter(file => file.endsWith('.md') && file.startsWith(universalRoot + path.sep))
    .sort();
  assert.ok(referencingFiles.length > 0, 'installed universal skill files are found');

  const failures = [];
  for (const file of referencingFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(REFERENCE)) {
      const reference = match[1] || match[2];
      const target = path.resolve(path.dirname(file), reference);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) continue;
      for (const harness of harnesses) {
        if (installed[harness].has(file) && !installed[harness].has(target)) {
          failures.push(`${path.relative(repoRoot, file)} references \`${reference}\` (${path.relative(repoRoot, target)}), which is not installed for ${harness}`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(failures)], []);
});

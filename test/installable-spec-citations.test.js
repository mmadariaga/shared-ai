'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

// The folders copied into other projects. There, shared-ai's own
// `openspec/specs/` does not exist, so a citation of one of its capabilities
// points at a missing file.
const INSTALLABLE_ROOTS = [
  'sai',
  'skills',
  'agents',
  'commands',
  'openspec/schemas/sai-workflow',
];

function walkDir(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      files.push(path.relative(repoRoot, fullPath).split(path.sep).join('/'));
    }
  }

  return files;
}

function capabilityNames() {
  return fs
    .readdirSync(path.join(repoRoot, 'openspec', 'specs'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_archived')
    .map((entry) => entry.name);
}

function findOwnSpecCitations(text, capabilities) {
  const findings = [];
  const pathForm = /specs\/([a-z0-9][a-z0-9-]*)\//g;
  const nameForm = /`([a-z0-9][a-z0-9-]*)`\s+(?:capability|spec)\b/g;

  text.split(/\r?\n/).forEach((line, index) => {
    for (const [form, pattern] of [['path', pathForm], ['name', nameForm]]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (capabilities.has(match[1])) {
          findings.push({ line: index + 1, form, capability: match[1] });
        }
      }
    }
  });

  return findings;
}

test('own-spec citation detector flags both forms and spares target-project references', () => {
  const capabilities = new Set(['tasks-routing-metadata', 'commit-rules']);

  assert.deepEqual(
    findOwnSpecCitations(
      [
        'See `openspec/specs/tasks-routing-metadata/spec.md`.',
        'Relative: specs/tasks-routing-metadata/spec.md',
        'Per the `tasks-routing-metadata` capability.',
        'The `commit-rules` spec owns it.',
      ].join('\n'),
      capabilities
    ).map((finding) => `${finding.line}:${finding.form}:${finding.capability}`),
    [
      '1:path:tasks-routing-metadata',
      '2:path:tasks-routing-metadata',
      '3:name:tasks-routing-metadata',
      '4:name:commit-rules',
    ]
  );

  assert.deepEqual(
    findOwnSpecCitations(
      [
        'Write `openspec/specs/{name}/spec.md`.',
        'Delta at specs/<capability>/spec.md',
        'Never modify `openspec/specs/**`.',
        'Fetch @sai/policies/commit-rules.md',
        'Follow commit-rules for the message.',
        'An unknown `not-a-capability` capability.',
      ].join('\n'),
      capabilities
    ),
    []
  );
});

test('installable files cite no shared-ai capability spec', () => {
  const capabilities = new Set(capabilityNames());
  assert.ok(capabilities.size > 0, 'openspec/specs/ must list capability directories');

  const violations = [];

  for (const root of INSTALLABLE_ROOTS) {
    for (const filePath of walkDir(path.join(repoRoot, root))) {
      const text = fs.readFileSync(path.join(repoRoot, filePath), 'utf8');

      for (const finding of findOwnSpecCitations(text, capabilities)) {
        violations.push(`  ${filePath}:${finding.line} (${finding.form} form) ${finding.capability}`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    'Installable files are copied into projects where shared-ai\'s openspec/specs/ does not exist. ' +
      `State the rule in the file instead of citing the spec. Citations:\n${violations.join('\n')}`
  );
});

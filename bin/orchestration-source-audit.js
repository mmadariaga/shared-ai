'use strict';

const fs = require('fs');
const path = require('path');

const ACTIVE_REFERENCE_EXCLUSIONS = [
  path.join('openspec', 'changes', 'archive'),
  path.join('docs', 'adr'),
];
const RETIRED_LOADERS = [
  'sai/commands/sai-2-design-inline.md',
  'sai/commands/sai-3-implement-inline.md',
];
const TEST_REFERENCE_ALIASES = ['claude-loader.md', 'opencode-loader.md'];
const MAINTAINED_ROOTS = [
  'sai',
  'fixtures',
  'test',
  path.join('openspec', 'specs'),
  path.join('openspec', 'changes'),
  'docs',
];
const MAINTAINED_ROOT_FILES = [
  'AGENTS.md',
  'GLOSSARY.md',
  'README.md',
  'INSTALL.claude.md',
  'INSTALL.copilot.md',
  'INSTALL.opencode.md',
];

function isHistoricalReference(relativePath) {
  return ACTIVE_REFERENCE_EXCLUSIONS.some(prefix => relativePath === prefix || relativePath.startsWith(`${prefix}${path.sep}`));
}

function isRetirementEvidence(relativePath, line) {
  if (relativePath === path.join('sai', 'install-manifest.json')) return true;
  if (relativePath.startsWith(`${path.join('openspec', 'changes', 'remove-legacy-inline-command-loaders')}${path.sep}`)) return true;
  return /absent|exclude|historical|retir|removed|cleanup|former|not\s+(?:an?\s+)?available|doesnotmatch/i.test(line);
}

function filesUnder(root, relativeRoot) {
  if (!fs.existsSync(root)) return [];
  const stat = fs.statSync(root);
  if (stat.isFile()) return [relativeRoot];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.join(relativeRoot, entry.name);
    return entry.isDirectory() ? filesUnder(path.join(root, entry.name), relativePath) : [relativePath];
  });
}

function auditActiveReferences(repoRoot) {
  const relativePaths = [
    ...MAINTAINED_ROOT_FILES.filter(relativePath => fs.existsSync(path.join(repoRoot, relativePath))),
    ...MAINTAINED_ROOTS.flatMap(relativeRoot => filesUnder(path.join(repoRoot, relativeRoot), relativeRoot)),
  ];
  const references = [];
  for (const relativePath of [...new Set(relativePaths)].sort()) {
    if (isHistoricalReference(relativePath)) continue;
    const content = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    const lines = content.split(/\r?\n/);
    const researchDocumentation = relativePath.startsWith(`openspec${path.sep}changes${path.sep}`)
      && lines.findIndex(line => /Proposal Research Documentation/i.test(line));
    for (const [index, line] of lines.entries()) {
      if (isRetirementEvidence(relativePath, line)) continue;
      if (researchDocumentation >= 0 && index > researchDocumentation) continue;
      const nearby = lines.slice(Math.max(0, index - 3), index + 4).join('\n');
      if (relativePath.startsWith(`test${path.sep}`) && /doesNotMatch|existsSync|should be (?:absent|removed)/i.test(nearby)) continue;
      const retiredLoaders = [...RETIRED_LOADERS];
      if (!fs.existsSync(path.join(repoRoot, 'test'))) retiredLoaders.push(...TEST_REFERENCE_ALIASES);
      for (const reference of retiredLoaders) {
        if (line.includes(reference)) references.push({ file: relativePath, reference });
      }
    }
  }
  return references;
}

module.exports = { auditActiveReferences };

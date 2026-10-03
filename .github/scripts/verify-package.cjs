'use strict';

const fs = require('node:fs');
const path = require('node:path');

// These are runtime inputs, not a list derived from npm's output. Comparing
// every source file catches an accidental files-list or npmignore exclusion.
const runtimeRoots = [
  'bin', 'commands', 'agents', 'sai', 'sai-state', 'skills', 'configs',
  'openspec/schemas',
];

function requiredFiles(root) {
  const required = new Set(['package.json', 'bin/install.js', 'bin/sai-state.js',
    'sai/install-manifest.json', 'openspec/schemas/sai-workflow/schema.yaml']);
  function visit(relative) {
    const absolute = path.join(root, relative);
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute)) visit(`${relative}/${name}`);
    } else {
      required.add(relative);
    }
  }
  for (const directory of runtimeRoots) visit(directory);
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const entry of Object.values(metadata.bin)) required.add(entry);
  return required;
}

function verifyPackage(report, required) {
  // npm 10 emits an array; newer npm emits an object keyed by package name.
  const packages = Array.isArray(report) ? report
    : report && typeof report === 'object' ? Object.values(report) : [];
  if (packages.length !== 1 || !Array.isArray(packages[0]?.files)) {
    throw new Error('Expected exactly one npm pack JSON report with a files array');
  }
  const packed = new Set(packages[0].files.map(file => file.path));
  const missing = [...required].filter(file => !packed.has(file));
  if (missing.length) throw new Error(`Package is missing required files:\n${missing.join('\n')}`);
  return required.size;
}

if (require.main === module) {
  try {
    const report = JSON.parse(fs.readFileSync(0, 'utf8'));
    const count = verifyPackage(report, requiredFiles(path.resolve(__dirname, '../..')));
    console.log(`Package contains all ${count} required runtime files; nothing was published.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { requiredFiles, verifyPackage };

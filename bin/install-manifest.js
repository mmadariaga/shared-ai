'use strict';

const fs = require('fs');
const path = require('path');

const STRATEGIES = new Set([
  'copy',
  'owned-copy',
  'merge-jsonc',
  'forwarding-manifest',
]);
const SUPPORTED_HARNESSES = new Set(['claude', 'opencode', 'copilot']);
const SHA256 = /^[0-9a-f]{64}$/;

function normalizeRelative(value) {
  return value.split(path.sep).join('/').replace(/^\.\//, '');
}

function patternToRegExp(pattern) {
  const input = normalizeRelative(pattern);
  let output = '^';
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '*') {
      if (input[index + 1] === '*') {
        index += 1;
        if (input[index + 1] === '/') {
          index += 1;
          output += '(?:.*/)?';
        } else {
          output += '.*';
        }
      } else {
        output += '[^/]*';
      }
    } else if (character === '?') {
      output += '[^/]';
    } else {
      output += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${output}$`);
}

function matchesAny(relativePath, patterns) {
  return patterns.some(pattern => patternToRegExp(pattern).test(relativePath));
}

function walkFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files.sort((left, right) => normalizeRelative(left).localeCompare(normalizeRelative(right)));
}

function validateManifest(manifest) {
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.projections)) {
    throw new Error('sai/install-manifest.json must contain version 1 and a projections array');
  }
  const ids = new Set();
  for (const rule of manifest.projections) {
    if (!rule || typeof rule.id !== 'string' || rule.id.length === 0 || ids.has(rule.id)) {
      throw new Error(`Invalid or duplicate projection id: ${rule && rule.id}`);
    }
    ids.add(rule.id);
    if (typeof rule.source !== 'string' || !rule.destination || typeof rule.destination.class !== 'string' || typeof rule.destination.path !== 'string') {
      throw new Error(`Projection ${rule.id} must declare source and destination { class, path }`);
    }
    if (!Array.isArray(rule.harnesses) || rule.harnesses.length === 0 || !STRATEGIES.has(rule.strategy)) {
      throw new Error(`Projection ${rule.id} has invalid harnesses or strategy`);
    }
    if (rule.overrides !== undefined && typeof rule.overrides !== 'string') {
      throw new Error(`Projection ${rule.id} overrides must name one rule id`);
    }
  }
  validateRetirements(manifest, ids);
}

function validateRetirements(manifest, projectionIds) {
  if (!Array.isArray(manifest.retirements)) {
    throw new Error('sai/install-manifest.json must contain a retirements array');
  }
  const ids = new Set(projectionIds);
  const destinations = new Set();
  for (const retirement of manifest.retirements) {
    if (!retirement || typeof retirement.id !== 'string' || retirement.id.length === 0 || ids.has(retirement.id)) {
      throw new Error(`Invalid or duplicate retirement id: ${retirement && retirement.id}`);
    }
    ids.add(retirement.id);
    if (!retirement.destination || retirement.destination.class !== 'sai' || typeof retirement.destination.path !== 'string') {
      throw new Error(`Retirement ${retirement.id} must declare destination { class: "sai", path }`);
    }
    const destination = `${retirement.destination.class}/${normalizeRelative(retirement.destination.path)}`;
    if (destinations.has(destination)) throw new Error(`Duplicate retirement destination: ${destination}`);
    destinations.add(destination);
    if (!Array.isArray(retirement.harnesses) || retirement.harnesses.length === 0 || retirement.harnesses.some(harness => !SUPPORTED_HARNESSES.has(harness))) {
      throw new Error(`Retirement ${retirement.id} has invalid harnesses`);
    }
    if (!Array.isArray(retirement.managedHashes) || retirement.managedHashes.length === 0 || retirement.managedHashes.some(hash => !SHA256.test(hash))) {
      throw new Error(`Retirement ${retirement.id} managedHashes must contain lowercase SHA-256 digests`);
    }
    if (new Set(retirement.managedHashes).size !== retirement.managedHashes.length) {
      throw new Error(`Retirement ${retirement.id} has duplicate managedHashes`);
    }
  }
}

function loadInstallManifest(repoRoot) {
  const manifestPath = path.join(repoRoot, 'sai', 'install-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  validateManifest(manifest);
  return manifest;
}

function collisionKey(destinationPath) {
  const normalized = path.resolve(destinationPath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function expandRule(rule, { harness, repoRoot, destinationRoot }) {
  const source = path.resolve(repoRoot, rule.source);
  const destinationBase = destinationRoot[rule.destination.class];
  if (typeof destinationBase !== 'string') throw new Error(`No destination root for class ${rule.destination.class} on ${harness}`);
  if (!fs.existsSync(source)) throw new Error(`Projection source does not exist: ${rule.source}`);

  const sourceStat = fs.statSync(source);
  const sourceFiles = rule.recursive ? walkFiles(source) : [source];
  if (rule.recursive && !sourceStat.isDirectory()) throw new Error(`Recursive projection ${rule.id} must use a directory source`);
  if (!rule.recursive && !sourceStat.isFile()) throw new Error(`Explicit projection ${rule.id} must use a file source`);

  const include = Array.isArray(rule.include) && rule.include.length > 0 ? rule.include : ['**/*'];
  const exclude = Array.isArray(rule.exclude) ? rule.exclude : [];
  const candidates = sourceFiles
    .map(sourcePath => ({ sourcePath, relativePath: rule.recursive ? normalizeRelative(path.relative(source, sourcePath)) : path.basename(sourcePath) }))
    .filter(candidate => matchesAny(candidate.relativePath, include))
    .filter(candidate => !matchesAny(candidate.relativePath, exclude));

  return candidates.map(candidate => ({
    id: rule.id,
    sourcePath: candidate.sourcePath,
    destinationPath: path.resolve(destinationBase, rule.destination.path, rule.recursive ? candidate.relativePath : ''),
    harness,
    strategy: rule.strategy,
    ownership: rule.ownership,
    drift: rule.drift,
    overrides: rule.overrides,
    recursive: Boolean(rule.recursive),
  }));
}

function expandInstallManifest(manifest, { harness, repoRoot, destinationRoot }) {
  validateManifest(manifest);
  const destinations = new Map();
  for (const rule of manifest.projections.filter(candidate => candidate.harnesses.includes(harness))) {
    for (const projection of expandRule(rule, { harness, repoRoot, destinationRoot })) {
      const key = collisionKey(projection.destinationPath);
      const existing = destinations.get(key);
      if (!existing) {
        destinations.set(key, projection);
      } else if (!projection.recursive && projection.overrides === existing.id && existing.recursive) {
        destinations.set(key, projection);
      } else {
        throw new Error(`Projection destination collision: ${existing.id} and ${projection.id} -> ${projection.destinationPath}`);
      }
    }
  }
  return [...destinations.values()]
    .sort((left, right) => normalizeRelative(left.destinationPath).localeCompare(normalizeRelative(right.destinationPath)) || left.id.localeCompare(right.id))
    .map(({ overrides, recursive, ...projection }) => projection);
}

function expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot }) {
  validateManifest(manifest);
  void repoRoot;
  return manifest.retirements
    .filter(retirement => retirement.harnesses.includes(harness))
    .map(retirement => {
      const destinationBase = destinationRoot[retirement.destination.class];
      if (typeof destinationBase !== 'string') throw new Error(`No destination root for class ${retirement.destination.class} on ${harness}`);
      return {
        id: retirement.id,
        destinationPath: path.resolve(destinationBase, retirement.destination.path),
        harness,
        managedHashes: [...retirement.managedHashes],
      };
    })
    .sort((left, right) => normalizeRelative(left.destinationPath).localeCompare(normalizeRelative(right.destinationPath)) || left.id.localeCompare(right.id));
}

module.exports = { loadInstallManifest, expandInstallManifest, expandRetirementManifest };

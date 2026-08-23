'use strict';

const fs = require('fs');
const path = require('path');

const {
  defineWorkerMatrix,
  materializeWorkerMatrix,
} = require('./worker-matrix');

const STRATEGIES = Object.freeze([
  'copy',
  'tunable-seed',
  'merge-jsonc',
  'forwarding-manifest',
]);
const SUPPORTED_HARNESSES = new Set(['claude', 'opencode']);
const SHA256 = /^[0-9a-f]{64}$/;
const RETIREMENT_DESTINATION_CLASSES = new Set(['sai', 'skills']);
const MATRIX_TEMPLATE_NAMES = Object.freeze([
  'claudeBinding',
  'opencodeBinding',
  'claudeAgent',
  'opencodeAgent',
]);
const MATRIX_KINDS = new Set(['binding', 'agent']);
const MATRIX_SCRATCH_RELATIVE = path.join('.tmp', 'collapse-sai-worker-matrix', 'matrix-sources');
const INVOCATION_ENVELOPE_FIELD = 'arguments_value';
const RETIRED_INVOCATION_ENVELOPE_FIELD = ['wrapper', 'echo', 'value'].join('_');
const PHASE_WORKER_IDENTITIES = Object.freeze({
  spec: 'sai-1-spec-proposal-worker',
  design: 'sai-2-design-worker',
  implementation: 'sai-3-implementation-worker',
  review: 'sai-5-review-worker',
  security: 'sai-6-security-worker',
  performance: 'sai-7-performance-worker',
  accessibility: 'sai-8-accessibility-worker',
  commit: 'sai-commit-worker',
  archive: 'sai-archive-worker',
  backfill: 'sai-backfill-worker',
  merge: 'sai-merge-worker',
});
const PHASE_CONTRACT_DIRS = Object.freeze({
  spec: 'spec',
  design: 'design',
  implementation: 'implement',
  review: 'review',
  security: 'security',
  performance: 'performance',
  accessibility: 'accessibility',
  commit: 'commit',
  archive: 'archive',
  backfill: 'backfill',
  merge: 'merge',
});
const MATRIX_ENTRY_REQUIRED_FIELDS = Object.freeze([
  'phase',
  'workerName',
  'workerContract',
  'bindingStem',
  'dispatchPrimitive',
  'initialDispatch',
  'continuationLiteral',
  'replacementFields',
  'helperPermissions',
  'progressDeclaration',
  'claudeAgent',
  'opencodeAgent',
]);

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

function assertOneStringInvocationEnvelope(value, location, seen = new Set()) {
  if (typeof value === 'string') {
    if (value.includes(RETIRED_INVOCATION_ENVELOPE_FIELD)) {
      throw new Error(
        `${location} declares retired ${RETIRED_INVOCATION_ENVELOPE_FIELD}; `
        + `the InvocationEnvelope contains only ${INVOCATION_ENVELOPE_FIELD}`
      );
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Object.prototype.hasOwnProperty.call(value, RETIRED_INVOCATION_ENVELOPE_FIELD)) {
    throw new Error(
      `${location} declares retired ${RETIRED_INVOCATION_ENVELOPE_FIELD}; `
      + `the InvocationEnvelope contains only ${INVOCATION_ENVELOPE_FIELD}`
    );
  }
  for (const [key, child] of Object.entries(value)) {
    assertOneStringInvocationEnvelope(child, `${location}.${key}`, seen);
  }
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

function validateRule(rule, ids) {
  if (!rule || typeof rule.id !== 'string' || rule.id.length === 0 || (ids && ids.has(rule.id))) {
    throw new Error(`Invalid or duplicate projection id: ${rule && rule.id}`);
  }
  if (ids) ids.add(rule.id);
  if (typeof rule.source !== 'string' || !rule.destination || typeof rule.destination.class !== 'string' || typeof rule.destination.path !== 'string') {
    throw new Error(`Projection ${rule.id} must declare source and destination { class, path }`);
  }
  if (!Array.isArray(rule.harnesses) || rule.harnesses.length === 0 || !STRATEGIES.includes(rule.strategy)) {
    throw new Error(`Projection ${rule.id} has invalid harnesses or strategy`);
  }
  if (rule.overrides !== undefined && typeof rule.overrides !== 'string') {
    throw new Error(`Projection ${rule.id} overrides must name one rule id`);
  }
  if (rule.matrix !== undefined) {
    if (!rule.matrix || !MATRIX_KINDS.has(rule.matrix.kind) || typeof rule.matrix.phase !== 'string') {
      throw new Error(`Projection ${rule.id} matrix must declare { kind, phase }`);
    }
  }
}

const APPLY_CONTRACT_BY_WORKER = Object.freeze({
  'sai-4-red-worker': 'sai/commands/apply/red-worker.md',
  'sai-4-green-worker': 'sai/commands/apply/green-worker.md',
});

const AUTOFAST_CONTRACT_BY_WORKER = Object.freeze({
  'sai-autofast-implement-worker': 'sai/commands/explore/autofast-implement-worker.md',
  'sai-autofast-hands-worker': 'sai/commands/explore/autofast-hands-worker.md',
});

function assertWorkerIdentity(entry, harness) {
  const prefix = `${harness} worker matrix: `;
  if (entry.phase === 'apply') {
    const expectedContract = APPLY_CONTRACT_BY_WORKER[entry.workerName];
    if (expectedContract === undefined) {
      throw new Error(`${prefix}unknown apply worker identity ${entry.workerName}`);
    }
    if (entry.workerContract !== expectedContract) {
      throw new Error(`${prefix}apply worker ${entry.workerName} has mismatched worker contract ${entry.workerContract}`);
    }
    return;
  }
  if (Object.prototype.hasOwnProperty.call(AUTOFAST_CONTRACT_BY_WORKER, entry.workerName)) {
    const expectedContract = AUTOFAST_CONTRACT_BY_WORKER[entry.workerName];
    if (entry.workerContract !== expectedContract) {
      throw new Error(`${prefix}auto-fast worker ${entry.workerName} has mismatched worker contract ${entry.workerContract}`);
    }
    return;
  }
  const canonical = PHASE_WORKER_IDENTITIES[entry.phase];
  if (canonical && entry.workerName !== canonical) {
    throw new Error(`${prefix}phase ${entry.phase} has misassigned worker identity ${entry.workerName}`);
  }
  const contractDir = PHASE_CONTRACT_DIRS[entry.phase] || entry.phase;
  const expectedContract = `sai/commands/${contractDir}/worker.md`;
  if (entry.workerContract !== expectedContract) {
    throw new Error(`${prefix}phase ${entry.phase} has mismatched worker contract ${entry.workerContract}`);
  }
}

function validateMatrixEntries(entries, harness) {
  entries.forEach(entry => {
    if (!entry || typeof entry !== 'object' || typeof entry.phase !== 'string' || entry.phase.length === 0) {
      return;
    }
    for (const field of MATRIX_ENTRY_REQUIRED_FIELDS) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        throw new Error(`${harness} worker matrix: phase ${entry.phase} is missing required field: ${field}`);
      }
    }
    assertWorkerIdentity(entry, harness);
  });
}

function validateMatrixEntriesForInstall(manifest, harness) {
  const matrix = manifest && manifest['worker-matrix'];
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix) || !Array.isArray(matrix.entries)) {
    return;
  }
  validateMatrixEntries(matrix.entries, harness);
}

function assertWorkerContractsUseOneStringEnvelope(matrix, { harness, repoRoot }) {
  if (!matrix || !Array.isArray(matrix.entries)) return;
  for (const entry of matrix.entries) {
    if (!entry || typeof entry.workerContract !== 'string') continue;
    const contractPath = path.resolve(repoRoot, entry.workerContract);
    if (!fs.existsSync(contractPath) || !fs.statSync(contractPath).isFile()) continue;
    assertOneStringInvocationEnvelope(
      fs.readFileSync(contractPath, 'utf8'),
      `${harness} worker contract ${entry.workerContract}`,
    );
  }
}

function validateMatrixBlock(matrix) {
  if (matrix === undefined) return;
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
    throw new Error('worker-matrix block must be an object');
  }
  if (!matrix.templates || typeof matrix.templates !== 'object' || Array.isArray(matrix.templates)) {
    throw new Error('worker-matrix block must declare templates');
  }
  for (const name of MATRIX_TEMPLATE_NAMES) {
    if (typeof matrix.templates[name] !== 'string' || matrix.templates[name].length === 0) {
      throw new Error(`worker-matrix block must declare template source for ${name}`);
    }
  }
  for (const kind of ['bindings', 'agents']) {
    const section = matrix[kind];
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      throw new Error(`worker-matrix block must declare ${kind}`);
    }
    if (!section.destination || typeof section.destination.class !== 'string' || typeof section.destination.path !== 'string') {
      throw new Error(`worker-matrix ${kind} must declare destination { class, path }`);
    }
    if (!Array.isArray(section.harnesses) || section.harnesses.length === 0 || section.harnesses.some(harness => !SUPPORTED_HARNESSES.has(harness))) {
      throw new Error(`worker-matrix ${kind} has invalid harnesses`);
    }
    if (!STRATEGIES.includes(section.strategy) || section.strategy !== (kind === 'bindings' ? 'copy' : 'tunable-seed')) {
      throw new Error(`worker-matrix ${kind} must use the ${kind === 'bindings' ? 'copy' : 'tunable-seed'} strategy`);
    }
    if (typeof section.ownership !== 'string' || typeof section.drift !== 'string') {
      throw new Error(`worker-matrix ${kind} must declare ownership and drift`);
    }
  }
  if (!Array.isArray(matrix.entries)) {
    throw new Error('worker-matrix block must declare phase entries');
  }
  if (matrix.entries.length === 0) {
    throw new Error('worker-matrix block must declare at least one phase entry');
  }
  const seen = new Set();
  let applySeen = 0;
  for (const entry of matrix.entries) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('worker-matrix phase entry must be an object');
    }
    if (typeof entry.phase !== 'string' || entry.phase.length === 0) {
      throw new Error('worker-matrix phase entry must declare a phase');
    }
    if (entry.phase === 'apply') {
      applySeen += 1;
      if (applySeen > 2) {
        throw new Error(`worker-matrix declares duplicate phase: ${entry.phase}`);
      }
    } else {
      if (seen.has(entry.phase)) {
        throw new Error(`worker-matrix declares duplicate phase: ${entry.phase}`);
      }
      seen.add(entry.phase);
    }
  }
  defineWorkerMatrix(matrix.entries);
}

function validateManifest(manifest) {
  assertOneStringInvocationEnvelope(manifest, 'sai/install-manifest.json');
  if (manifest && !Array.isArray(manifest.projections) && typeof manifest.id === 'string') {
    validateRule(manifest);
    return;
  }
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.projections)) {
    throw new Error('sai/install-manifest.json must contain version 1 and a projections array');
  }
  const ids = new Set();
  for (const rule of manifest.projections) {
    validateRule(rule, ids);
  }
  validateMatrixBlock(manifest['worker-matrix']);
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
    if (!retirement.destination
        || !RETIREMENT_DESTINATION_CLASSES.has(retirement.destination.class)
        || typeof retirement.destination.path !== 'string') {
      throw new Error(`Retirement ${retirement.id} must declare destination { class: "sai" | "skills", path }`);
    }
    const destination = `${retirement.destination.class}/${normalizeRelative(retirement.destination.path)}`;
    if (!Array.isArray(retirement.harnesses) || retirement.harnesses.length === 0 || retirement.harnesses.some(harness => !SUPPORTED_HARNESSES.has(harness))) {
      throw new Error(`Retirement ${retirement.id} has invalid harnesses`);
    }
    for (const harness of retirement.harnesses) {
      const harnessDestination = `${harness}:${destination}`;
      if (destinations.has(harnessDestination)) throw new Error(`Duplicate retirement destination: ${destination}`);
      destinations.add(harnessDestination);
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

function matrixProjectionId(harness, kind, item) {
  if (kind === 'binding') return `${harness}-${path.basename(item.destinationName, '.md')}-binding`;
  return `${harness}-${path.basename(item.destinationName, '.md')}`;
}

function matrixRenderFor(manifest, harness, repoRoot) {
  const matrix = manifest['worker-matrix'];
  if (!matrix) return [];
  assertWorkerContractsUseOneStringEnvelope(matrix, { harness, repoRoot });
  const templates = {};
  for (const name of MATRIX_TEMPLATE_NAMES) {
    const templatePath = path.resolve(repoRoot, matrix.templates[name]);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`${harness} worker matrix: template ${name} does not exist: ${matrix.templates[name]}`);
    }
    templates[name] = fs.readFileSync(templatePath, 'utf8');
    assertOneStringInvocationEnvelope(templates[name], `${harness} worker matrix template ${name}`);
  }
  const rendered = materializeWorkerMatrix(defineWorkerMatrix(matrix.entries), templates);
  return rendered
    .filter(item => item.harness === harness)
    .map(item => ({
      kind: item.kind,
      phase: item.phase,
      destinationName: item.destinationName,
      text: item.text,
      entry: matrix.entries.find(entry => entry.workerName === item.workerName),
    }));
}

function expandWorkerMatrix(matrix, { harness, repoRoot, destinationRoot }) {
  const bindingsSection = matrix.bindings;
  const agentsSection = matrix.agents;
  assertWorkerContractsUseOneStringEnvelope(matrix, { harness, repoRoot });
  if (!bindingsSection.harnesses.includes(harness) && !agentsSection.harnesses.includes(harness)) {
    return [];
  }
  validateMatrixEntries(matrix.entries, harness);
  const templates = {};
  for (const name of MATRIX_TEMPLATE_NAMES) {
    const templatePath = path.resolve(repoRoot, matrix.templates[name]);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`${harness} worker matrix: template ${name} does not exist: ${matrix.templates[name]}`);
    }
    templates[name] = fs.readFileSync(templatePath, 'utf8');
    assertOneStringInvocationEnvelope(templates[name], `${harness} worker matrix template ${name}`);
  }
  let matrixDef;
  let rendered;
  try {
    matrixDef = defineWorkerMatrix(matrix.entries);
    rendered = materializeWorkerMatrix(matrixDef, templates);
  } catch (error) {
    throw new Error(`${harness} worker matrix: ${error.message}`);
  }
  const projections = [];
  for (const item of rendered) {
    if (item.harness !== harness) continue;
    const kind = item.kind;
    const section = kind === 'binding' ? bindingsSection : agentsSection;
    if (!section.harnesses.includes(harness)) continue;
    const destinationBase = destinationRoot[section.destination.class];
    if (typeof destinationBase !== 'string') {
      throw new Error(`No destination root for class ${section.destination.class} on ${harness}`);
    }
    const destinationPath = path.resolve(destinationBase, section.destination.path, item.destinationName);
    const sourcePath = path.resolve(repoRoot, MATRIX_SCRATCH_RELATIVE, harness, item.destinationName);
    const projection = {
      id: matrixProjectionId(harness, kind, item),
      sourcePath,
      sourceText: item.text,
      destinationPath,
      harness,
      strategy: section.strategy,
      ownership: section.ownership,
      drift: section.drift,
      overrides: kind === 'binding' && section.overrides && section.overrides[harness]
        ? section.overrides[harness]
        : undefined,
      recursive: false,
    };
    projections.push(projection);
  }
  return projections;
}

function expandInstallManifest(manifest, { harness, repoRoot, destinationRoot }) {
  validateMatrixEntriesForInstall(manifest, harness);
  validateManifest(manifest);
  const destinations = new Map();
  const addProjection = (projection) => {
    const key = collisionKey(projection.destinationPath);
    const existing = destinations.get(key);
    if (!existing) {
      destinations.set(key, projection);
    } else if (!projection.recursive && projection.overrides === existing.id && existing.recursive) {
      destinations.set(key, projection);
    } else {
      throw new Error(`Projection destination collision: ${existing.id} and ${projection.id} -> ${projection.destinationPath}`);
    }
  };
  for (const rule of manifest.projections.filter(candidate => candidate.harnesses.includes(harness))) {
    if (rule.matrix) continue;
    for (const projection of expandRule(rule, { harness, repoRoot, destinationRoot })) {
      addProjection(projection);
    }
  }
  if (manifest['worker-matrix'] !== undefined) {
    for (const projection of expandWorkerMatrix(manifest['worker-matrix'], { harness, repoRoot, destinationRoot })) {
      addProjection(projection);
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

module.exports = {
  loadInstallManifest,
  expandInstallManifest,
  expandRetirementManifest,
  matrixRenderFor,
  STRATEGIES,
  validateManifest,
  validateMatrixBlock,
};

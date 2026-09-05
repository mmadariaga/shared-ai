#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  listMdFiles,
  listMdFilesRecursive,
  CLAUDE_BASE,
  OPENCODE_BASE,
  resolveOpencodeBase,
  promptYesNoReadline,
} = require('./install-flow.js');
const flow = require('./install-flow.js');
const { loadInstallManifest, expandInstallManifest, expandRetirementManifest } = require('./install-manifest');

const REPOSITORY_ROOT = path.join(__dirname, '..');

function materializeMatrixSource(projection, harness) {
  if (projection.sourceText === undefined) return projection.sourcePath;
  const target = projection.sourcePath;
  flow.ensureDir(path.dirname(target));
  const expected = Buffer.from(projection.sourceText);
  try {
    if (fs.readFileSync(target).equals(expected)) {
      return target;
    }
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EBUSY' && err.code !== 'EPERM' && err.code !== 'EACCES') {
      throw err;
    }
  }
  const tmp = `${target}.${process.pid}.tmp`;
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(tmp, expected);
      fs.renameSync(tmp, target);
      return target;
    } catch (err) {
      lastError = err;
      try {
        fs.unlinkSync(tmp);
      } catch (cleanupErr) {
        if (cleanupErr.code !== 'ENOENT') lastError = cleanupErr;
      }
      if (err.code !== 'EBUSY' && err.code !== 'EPERM' && err.code !== 'EACCES') {
        throw err;
      }
      if (attempt < 4) sleep(25);
    }
  }
  throw lastError;
}

function enumerateRetiredFiles(manifest, { harness, repoRoot, destinationRoot, editorBase }) {
  return expandRetirementManifest(manifest, { harness, repoRoot, destinationRoot }).map(retirement => ({
    src: retirement.destinationPath,
    dest: retirement.destinationPath,
    editorBase,
    assetType: 'retired-managed-file',
    acceptedHashes: [...retirement.managedHashes],
    ruleId: retirement.id,
  }));
}

function manifestEntries(harness, destinationRoot, editorBase) {
  const manifest = loadInstallManifest(REPOSITORY_ROOT);
  const projections = expandInstallManifest(manifest, {
    harness,
    repoRoot: REPOSITORY_ROOT,
    destinationRoot,
  });
  const entries = [];
  for (const projection of projections) {
    if (projection.strategy === 'merge-jsonc') {
      const configPath = fs.existsSync(path.join(editorBase, 'opencode.json'))
        ? path.join(editorBase, 'opencode.json')
        : path.join(editorBase, 'opencode.jsonc');
      if (fs.existsSync(configPath)) entries.push({ src: configPath, dest: configPath, editorBase, assetType: 'opencode-config', ruleId: projection.id });
      continue;
    }
    const entry = {
      src: materializeMatrixSource(projection, harness),
      dest: projection.destinationPath,
      editorBase,
      ruleId: projection.id,
    };
    if (projection.strategy === 'tunable-seed') {
      entry.assetType = 'claude-managed-agent';
      entry.tunableKeys = projection.harness === 'claude' ? flow.CLAUDE_TUNABLE_KEYS : flow.OPENCODE_TUNABLE_KEYS;
      entries.push(entry);
    } else {
      entries.push(entry);
    }
  }
  entries.push(...enumerateRetiredFiles(manifest, {
    harness,
    repoRoot: REPOSITORY_ROOT,
    destinationRoot,
    editorBase,
  }));
  return entries;
}

function enumerateClaude(destBase) {
  const targetPath = destBase || CLAUDE_BASE;
  const entries = manifestEntries('claude', { commands: path.join(targetPath, 'commands'), sai: path.join(targetPath, 'sai'), skills: path.join(targetPath, 'skills'), agents: path.join(targetPath, 'agents'), config: targetPath, root: targetPath }, targetPath);
  return entries;
}

function enumerateOpencode(destBase) {
  const targetPath = destBase || (typeof resolveOpencodeBase === 'function' ? resolveOpencodeBase() : OPENCODE_BASE);
  return manifestEntries('opencode', { commands: path.join(targetPath, 'commands'), sai: path.join(targetPath, 'sai'), skills: path.join(targetPath, 'skills'), agents: path.join(targetPath, 'agents'), config: targetPath, root: targetPath }, targetPath);
}

function buildDeletionSet(overrides = {}) {
  const { claudeBase, opencodeBase } = overrides;
  return [
    ...enumerateClaude(claudeBase),
    ...enumerateOpencode(opencodeBase),
  ].filter(entry => entry.assetType !== 'opencode-config');
}

const VERSION_SKEW_NOTE =
  'Note: this deletion set reflects the currently-resolved shared-ai version. ' +
  'If you upgraded since installing, run `npx shared-ai install` first to normalize on-disk files before uninstalling.';

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function computeClaudeAgentPlanEntry(entry) {
  const destHash = sha256File(entry.dest);
  if (destHash === null) {
    return { ...entry, action: 'not-found', exists: false, hashMatches: false };
  }
  const hashMatches = flow.stripTunableLines(fs.readFileSync(entry.src), entry.tunableKeys)
    .equals(flow.stripTunableLines(fs.readFileSync(entry.dest), entry.tunableKeys));
  return { ...entry, action: hashMatches ? 'delete' : 'keep-override', exists: true, hashMatches };
}

function computeRetiredPlanEntry(entry) {
  const destHash = sha256File(entry.dest);
  if (destHash === null) return { ...entry, action: 'not-found', exists: false, hashMatches: false };
  const hashMatches = entry.acceptedHashes.includes(destHash);
  return { ...entry, action: hashMatches ? 'delete' : 'keep-override', exists: true, hashMatches };
}

function computePlanEntry(entry) {
  if (entry.assetType === 'retired-managed-file') return computeRetiredPlanEntry(entry);
  if (entry.assetType === 'claude-managed-agent') {
    return computeClaudeAgentPlanEntry(entry);
  }
  const destHash = sha256File(entry.dest);
  if (destHash === null) {
    return { ...entry, action: 'not-found', exists: false, hashMatches: false };
  }
  const srcHash = sha256File(entry.src);
  const hashMatches = srcHash !== null && srcHash === destHash;
  return { ...entry, action: hashMatches ? 'delete' : 'keep-override', exists: true, hashMatches };
}

function computePlan(deletionSet) {
  return deletionSet.map(computePlanEntry);
}

function printPlan(plan, opts = {}) {
  const stream = opts.stream || { write: (s) => console.log(s) };
  stream.write('shared-ai uninstall plan:');
  for (const entry of plan) {
    stream.write(`  ${entry.action.padEnd(13)} ${entry.dest}  (exists=${entry.exists}, hash-matches=${entry.hashMatches})`);
  }
  stream.write('');
  stream.write(VERSION_SKEW_NOTE);
}

function formatSummary(counts) {
  return `Uninstall summary: ${counts.deleted} deleted, ${counts.keptOverride} kept-as-override, ${counts.notFound} not-found.`;
}

function deleteEntry(entry) {
  if (entry.assetType === 'retired-managed-file') {
    const destHash = sha256File(entry.dest);
    if (destHash === null) return 'not-found';
    if (!entry.acceptedHashes.includes(destHash)) {
      console.warn(`Kept (unrecognized retired file): ${entry.dest}`);
      return 'kept-override';
    }
    fs.unlinkSync(entry.dest);
    return 'deleted';
  }
  if (entry.assetType === 'claude-managed-agent') {
    const destHash = sha256File(entry.dest);
    if (destHash === null) {
      return 'not-found';
    }
    const matches = flow.stripTunableLines(fs.readFileSync(entry.src), entry.tunableKeys)
      .equals(flow.stripTunableLines(fs.readFileSync(entry.dest), entry.tunableKeys));
    if (!matches) {
      console.warn(`Kept (project-local override): ${entry.dest}`);
      return 'kept-override';
    }
    fs.unlinkSync(entry.dest);
    flow.deleteSidecarUnderShapeGuard(entry.dest);
    return 'deleted';
  }
  const destHash = sha256File(entry.dest);
  if (destHash === null) {
    return 'not-found';
  }
  const srcHash = sha256File(entry.src);
  if (srcHash === null || srcHash !== destHash) {
    console.warn(`Kept (project-local override): ${entry.dest}`);
    return 'kept-override';
  }
  fs.unlinkSync(entry.dest);
  return 'deleted';
}

function pruneEmptyDirs(startDir, editorBase) {
  const base = path.resolve(editorBase);
  let dir = path.resolve(startDir);
  while (dir !== base && dir.startsWith(base + path.sep)) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      break;
    }
    if (entries.length > 0) {
      break;
    }
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

function runDeletion(plan) {
  const counts = { deleted: 0, keptOverride: 0, notFound: 0 };
  for (const entry of plan) {
    const result = deleteEntry(entry);
    if (result === 'deleted') {
      counts.deleted += 1;
      pruneEmptyDirs(path.dirname(entry.dest), entry.editorBase);
    } else if (result === 'kept-override') {
      counts.keptOverride += 1;
    } else {
      counts.notFound += 1;
    }
  }
  return counts;
}

function parseArgs(argv) {
  const result = { dryRun: false, yes: false };
  const args = argv[0] === 'uninstall' ? argv.slice(1) : argv;
  for (const token of args) {
    if (token === '--dry-run') {
      result.dryRun = true;
    } else if (token === '--yes') {
      result.yes = true;
    } else if (token.startsWith('-')) {
      throw new Error(`Unrecognized flag: ${token}`);
    } else {
      throw new Error(`Unexpected argument: ${token}`);
    }
  }
  return result;
}

async function main({ argv = process.argv.slice(2), confirm = promptYesNoReadline, claudeBase, opencodeBase } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(err.message);
    return 1;
  }

  const overrides = { claudeBase, opencodeBase };
  const plan = computePlan(buildDeletionSet(overrides));
  printPlan(plan);

  if (opts.dryRun) {
    return 0;
  }

  if (!opts.yes) {
    const proceed = await confirm('Delete the files listed above? [y/n] ');
    if (!proceed) {
      console.log('Aborted. Nothing was deleted.');
      return 0;
    }
  }

  const counts = runDeletion(plan);
  console.log(formatSummary(counts));
  return 0;
}

module.exports = {
  buildDeletionSet,
  enumerateClaude,
  enumerateOpencode,
  enumerateRetiredFiles,
  sha256File,
  computeClaudeAgentPlanEntry,
  computeRetiredPlanEntry,
  computePlanEntry,
  computePlan,
  printPlan,
  formatSummary,
  deleteEntry,
  pruneEmptyDirs,
  runDeletion,
  parseArgs,
  main,
};

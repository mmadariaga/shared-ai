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
  COPILOT_PROMPTS_BASE,
  COPILOT_SKILLS_BASE,
  COPILOT_AGENTS_BASE,
  COPILOT_SAI_BASE,
  promptYesNoReadline,
} = require('./install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('./install-manifest');

const REPOSITORY_ROOT = path.join(__dirname, '..');

function manifestEntries(harness, destinationRoot, editorBase) {
  const projections = expandInstallManifest(loadInstallManifest(REPOSITORY_ROOT), {
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
      src: projection.sourcePath,
      dest: projection.destinationPath,
      editorBase,
      ruleId: projection.id,
    };
    if (projection.strategy === 'owned-copy') {
      entry.assetType = 'claude-managed-agent';
      entry.ownerPath = path.join(path.dirname(projection.destinationPath), `.${path.basename(projection.destinationPath, '.md')}.owner.json`);
      entries.push(entry);
      if (fs.existsSync(entry.ownerPath)) entries.push({ src: entry.ownerPath, dest: entry.ownerPath, editorBase, assetType: 'claude-managed-agent-owner', ruleId: projection.id });
    } else {
      entries.push(entry);
    }
  }
  return entries;
}

function enumerateClaude(destBase) {
  const targetPath = destBase || CLAUDE_BASE;
  const entries = manifestEntries('claude', { commands: path.join(targetPath, 'commands'), sai: path.join(targetPath, 'sai'), skills: path.join(targetPath, 'skills'), agents: path.join(targetPath, 'agents'), config: targetPath }, targetPath);
  if (flowCanonicalNumbered()) entries.push(...legacyClaudeRecords(targetPath, entries));
  return entries;
}

function flowCanonicalNumbered() { return false; }
function legacyClaudeRecords() { return []; }

function enumerateOpencode(destBase) {
  const targetPath = destBase || OPENCODE_BASE;
  return manifestEntries('opencode', { commands: path.join(targetPath, 'commands'), sai: path.join(targetPath, 'sai'), skills: path.join(targetPath, 'skills'), agents: path.join(targetPath, 'agents'), config: targetPath }, targetPath);
}

function enumerateCopilot(promptsBase, skillsBase, agentsBase, saiBase) {
  const promptsPath = promptsBase || COPILOT_PROMPTS_BASE;
  const skillsPath = skillsBase || COPILOT_SKILLS_BASE;
  const agentsPath = agentsBase || COPILOT_AGENTS_BASE;
  const saiPath = saiBase || COPILOT_SAI_BASE;
  return manifestEntries('copilot', { commands: promptsPath, sai: saiPath, skills: skillsPath, agents: agentsPath, config: saiPath }, saiPath);
}

function buildDeletionSet(overrides = {}) {
  const { claudeBase, opencodeBase, copilot = {} } = overrides;
  return [
    ...enumerateClaude(claudeBase),
    ...enumerateOpencode(opencodeBase),
    ...enumerateCopilot(copilot.promptsBase, copilot.skillsBase, copilot.agentsBase, copilot.saiBase),
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

function readManagedHash(ownerPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    return typeof parsed.managedHash === 'string' ? parsed.managedHash : null;
  } catch {
    return null;
  }
}

function computeClaudeAgentPlanEntry(entry) {
  const destHash = sha256File(entry.dest);
  if (destHash === null) {
    return { ...entry, action: 'not-found', exists: false, hashMatches: false };
  }
  const managedHash = readManagedHash(entry.ownerPath);
  const hashMatches = managedHash !== null && managedHash === destHash;
  return {
    ...entry,
    action: hashMatches ? 'delete' : 'keep-override',
    exists: true,
    hashMatches,
  };
}

function computePlanEntry(entry) {
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
  if (entry.assetType === 'claude-managed-agent') {
    const destHash = sha256File(entry.dest);
    const managedHash = readManagedHash(entry.ownerPath);
    if (destHash === null) {
      return 'not-found';
    }
    if (managedHash === null || managedHash !== destHash) {
      console.warn(`Kept (project-local override): ${entry.dest}`);
      return 'kept-override';
    }
    fs.unlinkSync(entry.dest);
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

async function main({ argv = process.argv.slice(2), confirm = promptYesNoReadline, claudeBase, opencodeBase, copilot } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(err.message);
    return 1;
  }

  const overrides = { claudeBase, opencodeBase, copilot };
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
  enumerateCopilot,
  sha256File,
  readManagedHash,
  computeClaudeAgentPlanEntry,
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

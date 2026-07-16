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
} = require('./install-flow.js');

const REPOSITORY_ROOT = path.join(__dirname, '..');

// Per-editor skill lists — mirror the hardcoded copy() calls in install-flow.js's
// install* functions (design D1). The symmetry test locks any drift.
const CLAUDE_SKILLS = [
  { tier: 'universal', name: 'budget' },
  { tier: 'universal', name: 'sai-commands' },
  { tier: 'universal', name: 'safe-operations' },
  { tier: 'universal', name: 'token-efficient-languages' },
  { tier: 'claude', name: 'budget-explorer' },
  { tier: 'claude', name: 'budget-executor' },
  { tier: 'claude', name: 'budget-subagent' },
  { tier: 'claude', name: 'fetch' },
];

const OPENCODE_SKILLS = [
  { tier: 'universal', name: 'budget' },
  { tier: 'universal', name: 'sai-commands' },
  { tier: 'universal', name: 'safe-operations' },
  { tier: 'universal', name: 'token-efficient-languages' },
  { tier: 'opencode', name: 'budget-explorer' },
  { tier: 'opencode', name: 'budget-executor' },
  { tier: 'opencode', name: 'budget-subagent' },
  { tier: 'opencode', name: 'fetch' },
];

const COPILOT_SKILLS = [
  { tier: 'copilot', name: 'fetch' },
  { tier: 'universal', name: 'budget' },
  { tier: 'copilot', name: 'budget-explorer' },
  { tier: 'copilot', name: 'budget-executor' },
  { tier: 'copilot', name: 'budget-subagent' },
  { tier: 'universal', name: 'sai-commands' },
  { tier: 'universal', name: 'safe-operations' },
  { tier: 'universal', name: 'token-efficient-languages' },
];

function mapMdFlat(srcDir, destDir) {
  return listMdFiles(srcDir).map(src => ({ src, dest: path.join(destDir, path.basename(src)) }));
}

function mapMdRecursive(srcRoot, destRoot) {
  return listMdFilesRecursive(srcRoot).map(src => ({
    src,
    dest: path.join(destRoot, path.relative(srcRoot, src)),
  }));
}

function mapSkills(skillList, destSkillsDir) {
  return skillList.map(({ tier, name }) => ({
    src: path.join(REPOSITORY_ROOT, 'skills', tier, name, 'SKILL.md'),
    dest: path.join(destSkillsDir, name, 'SKILL.md'),
  }));
}

function enumerateClaude(destBase) {
  const targetPath = destBase || CLAUDE_BASE;
  const entries = [
    ...mapMdFlat(path.join(REPOSITORY_ROOT, 'commands', 'claude'), path.join(targetPath, 'commands')),
    ...mapMdFlat(path.join(REPOSITORY_ROOT, 'sai', 'commands'), path.join(targetPath, 'sai', 'commands')),
    ...mapMdRecursive(path.join(REPOSITORY_ROOT, 'sai', 'instructions'), path.join(targetPath, 'sai', 'instructions')),
    ...mapSkills(CLAUDE_SKILLS, path.join(targetPath, 'skills')),
  ];
  return entries.map(e => ({ ...e, editorBase: targetPath }));
}

function enumerateOpencode(destBase) {
  const targetPath = destBase || OPENCODE_BASE;
  const entries = [
    ...mapMdFlat(path.join(REPOSITORY_ROOT, 'commands', 'opencode'), path.join(targetPath, 'commands')),
    ...mapMdFlat(path.join(REPOSITORY_ROOT, 'sai', 'commands'), path.join(targetPath, 'sai', 'commands')),
    ...mapMdRecursive(path.join(REPOSITORY_ROOT, 'sai', 'instructions'), path.join(targetPath, 'sai', 'instructions')),
    ...mapSkills(OPENCODE_SKILLS, path.join(targetPath, 'skills')),
  ];
  return entries.map(e => ({ ...e, editorBase: targetPath }));
}

function enumerateCopilot(promptsBase, skillsBase, agentsBase, saiBase) {
  const promptsPath = promptsBase || COPILOT_PROMPTS_BASE;
  const skillsPath = skillsBase || COPILOT_SKILLS_BASE;
  const agentsPath = agentsBase || COPILOT_AGENTS_BASE;
  const saiPath = saiBase || COPILOT_SAI_BASE;
  return [
    ...mapMdFlat(path.join(REPOSITORY_ROOT, 'commands', 'copilot'), promptsPath).map(e => ({ ...e, editorBase: promptsPath })),
    ...mapMdFlat(path.join(REPOSITORY_ROOT, 'sai', 'commands'), path.join(saiPath, 'commands')).map(e => ({ ...e, editorBase: saiPath })),
    ...mapMdRecursive(path.join(REPOSITORY_ROOT, 'sai', 'instructions'), path.join(saiPath, 'instructions')).map(e => ({ ...e, editorBase: saiPath })),
    ...mapSkills(COPILOT_SKILLS, skillsPath).map(e => ({ ...e, editorBase: skillsPath })),
    ...mapMdFlat(path.join(REPOSITORY_ROOT, 'agents', 'copilot'), agentsPath).map(e => ({ ...e, editorBase: agentsPath })),
  ];
}

function buildDeletionSet(overrides = {}) {
  const { claudeBase, opencodeBase, copilot = {} } = overrides;
  return [
    ...enumerateClaude(claudeBase),
    ...enumerateOpencode(opencodeBase),
    ...enumerateCopilot(copilot.promptsBase, copilot.skillsBase, copilot.agentsBase, copilot.saiBase),
  ];
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

function computePlanEntry(entry) {
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
  const stream = opts.stream || process.stdout;
  stream.write('shared-ai uninstall plan:\n');
  for (const entry of plan) {
    stream.write(`  ${entry.action.padEnd(13)} ${entry.dest}  (exists=${entry.exists}, hash-matches=${entry.hashMatches})\n`);
  }
  stream.write(`\n${VERSION_SKEW_NOTE}\n`);
}

function formatSummary(counts) {
  return `Uninstall summary: ${counts.deleted} deleted, ${counts.keptOverride} kept-as-override, ${counts.notFound} not-found.`;
}

module.exports = {
  buildDeletionSet,
  enumerateClaude,
  enumerateOpencode,
  enumerateCopilot,
  sha256File,
  computePlanEntry,
  computePlan,
  printPlan,
  formatSummary,
};

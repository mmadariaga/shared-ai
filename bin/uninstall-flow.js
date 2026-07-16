#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

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

module.exports = {
  buildDeletionSet,
  enumerateClaude,
  enumerateOpencode,
  enumerateCopilot,
};

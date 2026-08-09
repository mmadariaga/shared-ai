'use strict';

const path = require('path');
const readline = require('readline');
const { loadInstallManifest } = require('./install-manifest.js');
const { CLAUDE_TUNABLE_KEYS, OPENCODE_TUNABLE_KEYS } = require('./install-flow.js');

const MENU_OPTIONS = Object.freeze(['Customize models', 'Exit']);
const HARNESS_OPTIONS = Object.freeze(['OpenCode', 'Claude Code']);
const FAKE_MODEL_OPTIONS = Object.freeze(['<model>', '<model-alt>']);
const FAKE_EFFORT_OPTIONS = Object.freeze(['<effort>', '<effort-alt>']);

function promptChoice(question, options) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const numberedOptions = options.map((option, index) => `  ${index + 1}. ${option}`).join('\n');
  return new Promise((resolve) => {
    const ask = () => {
      rl.question(`${question}\n${numberedOptions}\n> `, (answer) => {
        const choice = Number.parseInt(answer.trim(), 10);
        if (Number.isInteger(choice) && choice >= 1 && choice <= options.length) {
          rl.close();
          resolve(options[choice - 1]);
        } else {
          ask();
        }
      });
    };
    ask();
  });
}

const defaultPromptChoice = promptChoice;

async function fakeSelectSettings(agentName, promptChoice) {
  const model = await promptChoice(`Placeholder model for ${agentName}:`, FAKE_MODEL_OPTIONS);
  const effort = await promptChoice(`Placeholder effort for ${agentName}:`, FAKE_EFFORT_OPTIONS);
  return { model, effort };
}

function fakeCreateLocalOverride(agentName, settings) {
  return { agent: agentName, ...settings, persistent: false };
}

function enumerateAgents(repoRoot, loadManifest, harness) {
  const manifest = loadManifest(repoRoot);
  return manifest.projections
    .filter(projection => projection.destination.class === 'agents' && projection.harnesses.includes(harness))
    .map(projection => path.basename(projection.destination.path, '.md'))
    .sort();
}

function createAdapter(harness, {
  repoRoot,
  loadManifest = loadInstallManifest,
  promptChoice = defaultPromptChoice,
  selectSettings = fakeSelectSettings,
  createLocalOverride = fakeCreateLocalOverride,
} = {}) {
  const tunableKeys = harness === 'opencode' ? OPENCODE_TUNABLE_KEYS : CLAUDE_TUNABLE_KEYS;
  return {
    enumerateAgents: () => enumerateAgents(repoRoot, loadManifest, harness),
    selectSettings: (agentName) => selectSettings(agentName, promptChoice),
    createLocalOverride: (agentName, settings) => {
      const payload = Object.fromEntries(
        tunableKeys.map(key => [key, key === 'variant' ? settings.effort : settings[key]])
      );
      return createLocalOverride(agentName, payload);
    },
  };
}

function createOpencodeAdapter(options = {}) {
  return createAdapter('opencode', options);
}

function createClaudeAdapter(options = {}) {
  return createAdapter('claude', options);
}

async function runPostSetupMenu({
  projectPath,
  isTTY = process.stdin.isTTY,
  promptChoice = defaultPromptChoice,
} = {}) {
  if (!isTTY) {
    return 'skipped';
  }
  const action = await promptChoice('Post-setup customization:', MENU_OPTIONS);
  if (action === 'Exit') {
    return 'exit';
  }
  const harness = await promptChoice('Choose a harness:', HARNESS_OPTIONS);
  const adapter = harness === 'OpenCode'
    ? module.exports.createOpencodeAdapter({ repoRoot: projectPath, promptChoice })
    : module.exports.createClaudeAdapter({ repoRoot: projectPath, promptChoice });
  for (const agentName of adapter.enumerateAgents()) {
    const settings = await adapter.selectSettings(agentName);
    adapter.createLocalOverride(agentName, settings);
  }
  return harness === 'OpenCode' ? 'customized-opencode' : 'customized-claude';
}

module.exports = {
  runPostSetupMenu,
  promptChoice,
  FAKE_MODEL_OPTIONS,
  FAKE_EFFORT_OPTIONS,
  fakeSelectSettings,
  fakeCreateLocalOverride,
  createOpencodeAdapter,
  createClaudeAdapter,
};

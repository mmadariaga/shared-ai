'use strict';

const path = require('path');
const { loadInstallManifest } = require('./install-manifest.js');
const {
  CLAUDE_TUNABLE_KEYS,
  OPENCODE_TUNABLE_KEYS,
  promptSelect,
  promptChecklist: installFlowPromptChecklist,
} = require('./install-flow.js');

const MENU_OPTIONS = Object.freeze(['Customize models', 'Exit']);
const HARNESS_OPTIONS = Object.freeze(['OpenCode', 'Claude Code']);
const FAKE_MODEL_OPTIONS = Object.freeze(['<model>', '<model-alt>']);
const FAKE_EFFORT_OPTIONS = Object.freeze(['<effort>', '<effort-alt>']);
const AGENT_CHECKLIST_LEGEND = 'Up/Down move · Space toggle · Enter confirm · q/Ctrl-C cancel';

const COMBINED_ENTRY_DELIMITER = ' | ';

function buildCombinedOptions() {
  const combined = [];
  for (const model of FAKE_MODEL_OPTIONS) {
    for (const effort of FAKE_EFFORT_OPTIONS) {
      combined.push(`${model}${COMBINED_ENTRY_DELIMITER}${effort}`);
    }
  }
  return combined;
}

function parseCombinedEntry(entry) {
  if (entry === null) {
    return { model: null, effort: null };
  }
  const [model, effort] = entry.split(COMBINED_ENTRY_DELIMITER);
  if (!FAKE_MODEL_OPTIONS.includes(model) || !FAKE_EFFORT_OPTIONS.includes(effort)) {
    throw new Error(`Unknown combined settings entry: ${entry}`);
  }
  return { model, effort };
}

async function fakeSelectSettings(subsetLabel, promptChoice) {
  const entry = await promptChoice(`Placeholder model and effort for ${subsetLabel}:`, buildCombinedOptions());
  return parseCombinedEntry(entry);
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
  promptChoice = promptSelect,
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
  promptChoice = promptSelect,
  promptChecklist = installFlowPromptChecklist,
} = {}) {
  if (!isTTY) {
    return 'skipped';
  }
  const action = await promptChoice('Post-setup customization:', MENU_OPTIONS);
  if (action === null || action === 'Exit') {
    return undefined;
  }
  const harness = await promptChoice('Choose a harness:', HARNESS_OPTIONS);
  if (harness === null) {
    return undefined;
  }
  const adapter = harness === 'OpenCode'
    ? module.exports.createOpencodeAdapter({ repoRoot: projectPath, promptChoice })
    : module.exports.createClaudeAdapter({ repoRoot: projectPath, promptChoice });
  const agents = adapter.enumerateAgents();
  const outcome = await promptChecklist(agents, agents, undefined, AGENT_CHECKLIST_LEGEND);
  if (outcome.status === 'cancelled' || outcome.status === 'non-interactive') {
    return undefined;
  }
  if (outcome.items.length > 0) {
    const settings = await adapter.selectSettings(outcome.items.join(', '));
    if (settings.model === null || settings.effort === null) {
      return undefined;
    }
    for (const agentName of outcome.items) {
      adapter.createLocalOverride(agentName, settings);
    }
  }
  return undefined;
}

// --- OpenCode model catalog and verbose-record parsing ---

function parseModelCatalog(stdout) {
  const entries = [];
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    const slashIndex = line.indexOf('/');
    if (slashIndex === -1) {
      throw new Error(`Malformed model catalog line (missing '/'): ${line}`);
    }
    const provider = line.slice(0, slashIndex);
    const model = line.slice(slashIndex + 1);
    if (provider === '' || model === '') {
      throw new Error(`Malformed model catalog line (empty provider or model side): ${line}`);
    }
    entries.push({ provider, model });
  }
  return entries;
}

function parseVerboseModelRecords(stdout) {
  const records = [];
  let identity = null;
  let accumulated = null;
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (identity === null) {
      identity = line;
      accumulated = null;
      continue;
    }
    accumulated = accumulated === null ? line : `${accumulated}\n${line}`;
    let parsed;
    try {
      parsed = JSON.parse(accumulated);
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`Verbose model record for ${identity} parsed to a non-object JSON value`);
    }
    records.push({ identity, record: parsed });
    identity = null;
    accumulated = null;
  }
  if (identity !== null) {
    throw new Error(`Verbose model record for ${identity} has no parseable JSON object`);
  }
  return records;
}

function extractVariants(record) {
  if (!Object.prototype.hasOwnProperty.call(record, 'variants')) return [];
  const variants = record.variants;
  if (variants === null || typeof variants !== 'object' || Array.isArray(variants)) {
    throw new Error('Model record variants field is not a plain object');
  }
  return Object.keys(variants);
}

module.exports = {
  runPostSetupMenu,
  FAKE_MODEL_OPTIONS,
  FAKE_EFFORT_OPTIONS,
  fakeSelectSettings,
  fakeCreateLocalOverride,
  createOpencodeAdapter,
  createClaudeAdapter,
  parseModelCatalog,
  parseVerboseModelRecords,
  extractVariants,
};

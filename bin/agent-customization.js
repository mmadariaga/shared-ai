'use strict';

const path = require('path');
const childProcess = require('child_process');
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

// RED stub: NO_VARIANT must be a Symbol in GREEN; a plain string placeholder
// keeps the sentinel tests failing by assertion at RED without leaking GREEN.
const NO_VARIANT = Symbol('NO_VARIANT');
const NO_VARIANT_LABEL = 'Default (no variant)';

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

function buildVariantDisplayOptions(variants) {
  const options = [{ display: NO_VARIANT_LABEL, value: NO_VARIANT }];
  for (const variant of variants) {
    let display = variant;
    let attempt = 0;
    while (options.some(option => option.display === display)) {
      attempt += 1;
      display = attempt === 1 ? `${variant} (variant)` : `${variant} (variant ${attempt})`;
    }
    options.push({ display, value: variant });
  }
  return options;
}

function defaultRunCommand(executable, args, {
  platform = process.platform,
  spawnSync = childProcess.spawnSync,
  env = process.env,
} = {}) {
  let result;
  if (platform === 'win32') {
    // PowerShell resolves npm .cmd shims while environment-backed splatting
    // keeps every CLI argument out of shell command syntax.
    const script = '$commandArgs = @((ConvertFrom-Json -InputObject $env:SAI_COMMAND_ARGS)); '
      + '& $env:SAI_COMMAND_EXECUTABLE @commandArgs; exit $LASTEXITCODE';
    result = spawnSync('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      script,
    ], {
      encoding: 'utf8',
      env: {
        ...env,
        SAI_COMMAND_EXECUTABLE: executable,
        SAI_COMMAND_ARGS: JSON.stringify(args),
      },
    });
  } else {
    result = spawnSync(executable, args, { encoding: 'utf8' });
  }
  if (result.error) throw result.error;
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

function reportCommandFailure(action, outcome) {
  const detail = typeof outcome.stderr === 'string' ? outcome.stderr.trim() : '';
  const suffix = detail === '' ? `exit status ${outcome.status}` : detail;
  console.error(`Unable to ${action}: ${suffix}`);
}

async function opencodeSelectSettings(subsetLabel, promptChoice, runCommand) {
  let catalogOutcome;
  try {
    catalogOutcome = runCommand('opencode', ['models']);
  } catch (error) {
    console.error(`Unable to query OpenCode models: ${error.message}`);
    return null;
  }
  if (catalogOutcome.status !== 0) {
    reportCommandFailure('query OpenCode models', catalogOutcome);
    return null;
  }

  let catalog;
  try {
    catalog = parseModelCatalog(catalogOutcome.stdout);
  } catch {
    return null;
  }
  if (catalog.length === 0) return null;

  const providers = [];
  for (const entry of catalog) {
    if (!providers.includes(entry.provider)) providers.push(entry.provider);
  }

  const provider = await promptChoice(`Provider for ${subsetLabel}:`, providers);
  if (!providers.includes(provider)) return null;

  const models = catalog
    .filter(entry => entry.provider === provider)
    .map(entry => entry.model);
  const model = await promptChoice(`Model for ${subsetLabel}:`, models);
  if (!models.includes(model)) return null;

  const identity = `${provider}/${model}`;

  let verboseOutcome;
  try {
    verboseOutcome = runCommand('opencode', ['models', provider, '--verbose']);
  } catch (error) {
    console.error(`Unable to query OpenCode model variants: ${error.message}`);
    return null;
  }
  if (verboseOutcome.status !== 0) {
    reportCommandFailure('query OpenCode model variants', verboseOutcome);
    return null;
  }

  let records;
  try {
    records = parseVerboseModelRecords(verboseOutcome.stdout);
  } catch {
    return null;
  }
  const matched = records.find(record => record.identity === identity);
  if (!matched) return null;

  let variants;
  try {
    variants = extractVariants(matched.record);
  } catch {
    return null;
  }
  if (variants.length === 0) {
    return { model: identity };
  }

  const variantOptions = buildVariantDisplayOptions(variants);
  const selectedDisplay = await promptChoice(
    `Variant for ${identity}:`,
    variantOptions.map(option => option.display)
  );
  const selected = variantOptions.find(option => option.display === selectedDisplay);
  if (selected === undefined) return null;
  if (selected.value === NO_VARIANT) {
    return { model: identity };
  }
  return { model: identity, variant: selected.value };
}

function createOpencodeAdapter(options = {}) {
  const {
    repoRoot,
    loadManifest = loadInstallManifest,
    promptChoice = promptSelect,
    runCommand = defaultRunCommand,
  } = options;
  return {
    enumerateAgents: () => enumerateAgents(repoRoot, loadManifest, 'opencode'),
    selectSettings: (subsetLabel) => opencodeSelectSettings(subsetLabel, promptChoice, runCommand),
    createLocalOverride: (agentName, settings) => {
      const override = { agent: agentName, model: settings.model, persistent: false };
      if (settings.variant !== undefined) {
        override.variant = settings.variant;
      }
      return override;
    },
  };
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
    if (settings === null || settings.model === null) {
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
  NO_VARIANT,
  FAKE_MODEL_OPTIONS,
  FAKE_EFFORT_OPTIONS,
  fakeSelectSettings,
  fakeCreateLocalOverride,
  createOpencodeAdapter,
  createClaudeAdapter,
  defaultRunCommand,
  parseModelCatalog,
  parseVerboseModelRecords,
  extractVariants,
};

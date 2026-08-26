'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const { loadInstallManifest } = require('./install-manifest.js');
const {
  promptSelect,
  promptChecklist: installFlowPromptChecklist,
  BACK,
} = require('./install-flow.js');

const MENU_OPTIONS = Object.freeze(['Customize models', 'Exit']);
const HARNESS_OPTIONS = Object.freeze(['OpenCode', 'Claude Code']);
const SCOPE_OPTIONS = Object.freeze(['Workers', 'Agents', 'Commands', 'Utilities', 'All']);
const MODEL_CHECKLIST_LEGEND = 'Up/Down move · Space toggle · Enter confirm · ←/Esc back · q/Ctrl-C cancel';
const MODEL_TABLE_INDENT = '      ';
const MODEL_TABLE_GUTTER = '  ';
const MODEL_TABLE_TYPE_WIDTH = 7;
const MODEL_TABLE_COMPLEXITY_HEADER = 'TASK COMPLEXITY';
const MODEL_TABLE_COMPLEXITY_WIDTH = MODEL_TABLE_COMPLEXITY_HEADER.length;
const COMBINED_ENTRY_DELIMITER = ' | ';
const TARGET_PREFIXES = Object.freeze({ worker: 'worker:', agent: 'agent:', command: 'command:', utility: 'utility:' });
const UTILITY_NAMES = Object.freeze(['sai-commit', 'sai-pr', 'sai-retire-docs', 'sai-status', 'sai-worktree']);
const TASK_COMPLEXITY = Object.freeze({
  'worker:sai-1-spec-proposal-worker': '↑↑',
  'worker:sai-2-design-worker': '↑↑↑',
  'worker:sai-3-implementation-worker': '↑↑',
  'worker:sai-4-green-worker': '↑',
  'worker:sai-4-red-worker': '↑',
  'worker:sai-5-review-worker': '↑↑',
  'worker:sai-6-security-worker': '↑↑↑',
  'worker:sai-7-performance-worker': '↑↑',
  'worker:sai-8-accessibility-worker': '↑↑',
  'worker:sai-archive-worker': '↑',
  'worker:sai-autofast-implement-worker': '↑↑',
  'worker:sai-backfill-worker': '↑↑',
  'worker:sai-commit-worker': '↑',
  'worker:sai-merge-worker': '↑↑',
  'agent:budget': '↑',
  'agent:executor': '↑',
  'agent:explore': '↑',
  'agent:budget-explorer': '↑',
  'agent:budget-executor': '↑',
  'agent:budget-subagent': '↑',
  'command:sai-1-spec': '↑↑',
  'command:sai-2-design': '↑↑',
  'command:sai-3-implement': '↑↑',
  'command:sai-4-apply': '↑↑',
  'command:sai-5-review': '↑↑',
  'command:sai-6-security': '↑↑',
  'command:sai-7-performance': '↑↑',
  'command:sai-8-accessibility': '↑↑',
  'command:sai-archive': '↑↑',
  'command:sai-backfill': '↑↑',
  'command:sai-build': '↑↑',
  'command:sai-explore': '↑↑',
  'command:sai-merge': '↑↑',
  'command:sai-review': '↑↑',
  'utility:sai-commit': '↑',
  'utility:sai-pr': '↑',
  'utility:sai-retire-docs': '↑↑',
  'utility:sai-status': '↑',
  'utility:sai-worktree': '↑',
});
const DEFAULT_PACKAGE_ROOT = path.join(__dirname, '..');
const DEFAULT_CLAUDE_GLOBAL_AGENT_ROOT = path.join(os.homedir(), '.claude', 'agents');
const DEFAULT_OPENCODE_GLOBAL_AGENT_ROOT = path.join(os.homedir(), '.config', 'opencode', 'agents');
const DEFAULT_CLAUDE_GLOBAL_COMMAND_ROOT = path.join(os.homedir(), '.claude', 'commands');
const DEFAULT_OPENCODE_GLOBAL_COMMAND_ROOT = path.join(os.homedir(), '.config', 'opencode', 'commands');

const CLAUDE_SETTINGS_CATALOG = Object.freeze({
  models: Object.freeze([
    Object.freeze({ model: 'opus', efforts: Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']) }),
    Object.freeze({ model: 'sonnet', efforts: Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']) }),
    Object.freeze({ model: 'fable', efforts: Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']) }),
    Object.freeze({ model: 'haiku' }),
  ]),
});

const NO_VARIANT = Symbol('NO_VARIANT');
const NO_VARIANT_LABEL = 'Default (no variant)';
const TOP_LEVEL_SCALAR = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/;

function target(family, name, label = name) {
  return { value: `${TARGET_PREFIXES[family]}${name}`, family, name, label };
}

function buildChecklistTargets(scope, families) {
  const selectedFamilies = scope === 'All'
    ? ['worker', 'agent', 'command', 'utility']
    : ({ Workers: ['worker'], Agents: ['agent'], Commands: ['command'], Utilities: ['utility'] }[scope] || []);
  return selectedFamilies.flatMap(family => (families[family] || []).slice().sort()
    .map(entry => typeof entry === 'string' ? target(family, entry) : entry));
}

function parseTarget(value) {
  for (const [family, prefix] of Object.entries(TARGET_PREFIXES)) {
    if (value.startsWith(prefix)) return target(family, value.slice(prefix.length), value);
  }
  return null;
}

function taskComplexityFor(targetEntry) {
  return TASK_COMPLEXITY[targetEntry.value] || '↑';
}

function splitFrontmatter(text) {
  const firstLineEnding = text.match(/\r\n|\n|\r/);
  const lineEnding = firstLineEnding === null ? '\n' : firstLineEnding[0];
  const lines = text.split(/\r\n|\n|\r/);
  const trailingLineEnding = lines.at(-1) === '';
  if (trailingLineEnding) lines.pop();
  if (lines[0] !== '---') return null;
  const endIndex = lines.indexOf('---', 1);
  if (endIndex === -1) return null;
  return { lines, endIndex, lineEnding, trailingLineEnding };
}

function patchFrontmatter(text, tunableKeys, settings) {
  const split = splitFrontmatter(text);
  if (split === null) return null;

  const selected = new Map(
    tunableKeys
      .filter(key => settings[key] !== undefined)
      .map(key => [key, String(settings[key])])
  );
  const seen = new Set();
  const patchedFrontmatter = [];

  for (const line of split.lines.slice(1, split.endIndex)) {
    const match = TOP_LEVEL_SCALAR.exec(line);
    if (!match || !tunableKeys.includes(match[1])) {
      patchedFrontmatter.push(line);
      continue;
    }

    const key = match[1];
    if (!selected.has(key)) {
      if ((key === 'effort' || key === 'variant') && settings[key] === undefined) continue;
      patchedFrontmatter.push(line);
      continue;
    }
    if (seen.has(key)) continue;
    patchedFrontmatter.push(`${key}: ${selected.get(key)}`);
    seen.add(key);
  }

  for (const key of tunableKeys) {
    if (selected.has(key) && !seen.has(key)) {
      patchedFrontmatter.push(`${key}: ${selected.get(key)}`);
    }
  }

  const lines = [
    split.lines[0],
    ...patchedFrontmatter,
    split.lines[split.endIndex],
    ...split.lines.slice(split.endIndex + 1),
  ];
  return lines.join(split.lineEnding) + (split.trailingLineEnding ? split.lineEnding : '');
}

function temporarySiblingPath(destination) {
  const suffix = `${process.pid}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  return `${destination}.tmp.${suffix}`;
}

function atomicReplace(destination, content) {
  const temporary = temporarySiblingPath(destination);
  try {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(temporary, content, 'utf8');
    fs.renameSync(temporary, destination);
    return null;
  } catch (error) {
    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {
      // Temporary cleanup is best effort; the original destination is never removed.
    }
    return error;
  }
}

function materializationFailure(agentName, diagnostic) {
  return { status: 'persistence-failed', agent: agentName, diagnostic };
}

function materializeLocalOverride({
  agentName,
  settings,
  projectPath,
  globalAgentRoot,
  globalCommandRoot,
  harness,
  family = 'worker',
}) {
  const familyDirectory = family === 'command' || family === 'utility' ? 'commands' : 'agents';
  const localDirectory = harness === 'claude'
    ? path.join(projectPath, '.claude', familyDirectory)
    : path.join(projectPath, '.opencode', familyDirectory);
  const destination = path.join(localDirectory, `${agentName}.md`);
  const tunableKeys = harness === 'claude' ? ['model', 'effort'] : ['model', 'variant'];
  const destinationExists = fs.existsSync(destination);

  let currentText;
  try {
    if (destinationExists) {
      currentText = fs.readFileSync(destination, 'utf8');
    } else {
      const sourceRoot = family === 'command' ? globalCommandRoot : globalAgentRoot;
      const source = path.join(sourceRoot, `${agentName}.md`);
      if (!fs.existsSync(source)) {
        return {
          status: 'skipped',
          agent: agentName,
          reason: 'missing-source',
          diagnostic: `Skipped ${agentName}: installed source is unavailable.`,
        };
      }
      currentText = fs.readFileSync(source, 'utf8');
    }
  } catch (error) {
    return materializationFailure(
      agentName,
      `Unable to read the ${destinationExists ? 'project-local target' : 'installed target'} for ${agentName}: ${error.message}`
    );
  }

  const patchedText = patchFrontmatter(currentText, tunableKeys, settings);
  if (patchedText === null) {
    return materializationFailure(agentName, `Target ${agentName} has no valid frontmatter block.`);
  }

  const writeError = atomicReplace(destination, patchedText);
  if (writeError !== null) {
    return materializationFailure(
      agentName,
      `Unable to persist ${destination}: ${writeError.message}`
    );
  }

  return { status: 'persisted', agent: agentName, destination };
}

function enumerateProjectionTargets(packageRoot, loadManifest, harness) {
  const manifest = loadManifest(packageRoot);
  const families = { worker: [], agent: [], command: [], utility: [] };
  for (const projection of manifest.projections) {
    if (!projection.harnesses.includes(harness)) continue;
    const name = path.basename(projection.destination.path, '.md');
    if (projection.destination.class === 'agents') {
      families[projection.matrix && projection.matrix.kind === 'agent' ? 'worker' : 'agent'].push(name);
    }
  }
  for (const name of enumerateCommands(packageRoot, loadManifest, harness)) {
    families[UTILITY_NAMES.includes(name) ? 'utility' : 'command'].push(name);
  }
  for (const family of Object.keys(families)) families[family] = [...new Set(families[family])].sort();
  return families;
}

function enumerateWorkers(packageRoot, loadManifest, harness) {
  return enumerateProjectionTargets(packageRoot, loadManifest, harness).worker;
}

function readFrontmatterSettings(filePath, harness) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const split = splitFrontmatter(fs.readFileSync(filePath, 'utf8'));
    if (!split) return null;
    const values = {};
    for (const line of split.lines.slice(1, split.endIndex)) {
      const match = TOP_LEVEL_SCALAR.exec(line);
      if (match && ['model', 'effort', 'variant'].includes(match[1])) values[match[1]] = match[2].trim();
    }
    if (!values.model) return null;
    const tuning = values[harness === 'claude' ? 'effort' : 'variant'];
    return `${harness === 'claude' ? `anthropic/${values.model}` : values.model}${tuning ? ` (${tuning})` : ''}`;
  } catch {
    return null;
  }
}

function effectiveSetting(targetEntry, projectPath, globalAgentRoot, globalCommandRoot, harness) {
  const directory = targetEntry.family === 'command' || targetEntry.family === 'utility' ? 'commands' : 'agents';
  const localRoot = harness === 'claude' ? path.join(projectPath, '.claude', directory) : path.join(projectPath, '.opencode', directory);
  const globalRoot = directory === 'commands' ? globalCommandRoot : globalAgentRoot;
  return readFrontmatterSettings(path.join(localRoot, `${targetEntry.name}.md`), harness)
    || readFrontmatterSettings(path.join(globalRoot, `${targetEntry.name}.md`), harness)
    || 'unavailable';
}

function isConcreteClaudeCatalogValue(value) {
  return typeof value === 'string'
    && value !== ''
    && !/^<[^>]+>$/.test(value);
}

function matchesIncludePattern(fileName, include) {
  if (!Array.isArray(include) || include.length === 0) return true;
  return include.some(pattern => {
    const expression = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${expression}$`).test(fileName);
  });
}

function enumerateCommands(packageRoot, loadManifest, harness) {
  const names = [];
  const seen = new Set();
  const commandSources = loadManifest(packageRoot).projections
    .filter(projection => projection.destination.class === 'commands' && projection.harnesses.includes(harness))
    .map(projection => ({ source: projection.source, include: projection.include }));
  for (const { source, include } of commandSources) {
    const sourceDir = path.join(packageRoot, source);
    if (!fs.existsSync(sourceDir)) continue;
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      if (!entry.isFile() || !matchesIncludePattern(entry.name, include)) continue;
      const name = path.basename(entry.name, '.md');
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
  }
  return names.sort();
}

function buildClaudeSettingsEntries(settingsCatalog) {
  if (settingsCatalog === null || !Array.isArray(settingsCatalog.models)) return [];
  const entries = [];
  for (const modelEntry of settingsCatalog.models) {
    if (!modelEntry || !isConcreteClaudeCatalogValue(modelEntry.model)) continue;

    if (modelEntry.efforts === undefined) {
      entries.push({ display: modelEntry.model, model: modelEntry.model });
      continue;
    }

    if (!Array.isArray(modelEntry.efforts)) continue;
    for (const effort of modelEntry.efforts) {
      if (!isConcreteClaudeCatalogValue(effort)) continue;
      entries.push({
        display: `${modelEntry.model}${COMBINED_ENTRY_DELIMITER}${effort}`,
        model: modelEntry.model,
        effort,
      });
    }
  }
  return entries;
}

function isClaudeSettingsPair(settingsCatalog, settings) {
  if (!settings || typeof settings.model !== 'string') return false;
  const hasEffort = Object.prototype.hasOwnProperty.call(settings, 'effort');
  return buildClaudeSettingsEntries(settingsCatalog)
    .some(entry => entry.model === settings.model
      && (entry.effort === undefined
        ? !hasEffort
        : hasEffort && entry.effort === settings.effort));
}

async function selectClaudeSettings(subsetLabel, promptChoice, settingsCatalog) {
  const entries = buildClaudeSettingsEntries(settingsCatalog);
  if (entries.length === 0) return null;
  const selectedDisplay = await promptChoice(
    `Model and effort for ${subsetLabel}:`,
    entries.map(entry => entry.display)
  );
  if (selectedDisplay === BACK) return BACK;
  const selected = entries.find(entry => entry.display === selectedDisplay);
  if (selected === undefined) return null;
  return selected.effort === undefined
    ? { model: selected.model }
    : { model: selected.model, effort: selected.effort };
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

function parseModelCatalog(stdout) {
  const entries = [];
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    const slashIndex = line.indexOf('/');
    if (slashIndex === -1) throw new Error(`Malformed model catalog line (missing '/'): ${line}`);
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

  // Provider, model and variant form a dependent chain: stepping back from one
  // screen re-opens the previous one with the catalog already in hand, and
  // stepping back off the provider screen hands control to the caller.
  let screen = 'provider';
  let provider = null;
  let model = null;

  for (;;) {
    if (screen === 'provider') {
      const chosen = await promptChoice(`Provider for ${subsetLabel}:`, providers);
      if (chosen === BACK) return BACK;
      if (!providers.includes(chosen)) return null;
      provider = chosen;
      screen = 'model';
      continue;
    }

    if (screen === 'model') {
      const models = catalog.filter(entry => entry.provider === provider).map(entry => entry.model);
      const chosen = await promptChoice(`Model for ${subsetLabel}:`, models);
      if (chosen === BACK) {
        screen = 'provider';
        continue;
      }
      if (!models.includes(chosen)) return null;
      model = chosen;
      screen = 'variant';
      continue;
    }

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
    if (variants.length === 0) return { model: identity };

    const variantOptions = buildVariantDisplayOptions(variants);
    const selectedDisplay = await promptChoice(
      `Variant for ${identity}:`,
      variantOptions.map(option => option.display)
    );
    if (selectedDisplay === BACK) {
      screen = 'model';
      continue;
    }
    const selected = variantOptions.find(option => option.display === selectedDisplay);
    if (selected === undefined || selected.value === NO_VARIANT) {
      return selected === undefined ? null : { model: identity };
    }
    return { model: identity, variant: selected.value };
  }
}

function createClaudeAdapter({
  projectPath = process.cwd(),
  packageRoot = DEFAULT_PACKAGE_ROOT,
  globalAgentRoot = DEFAULT_CLAUDE_GLOBAL_AGENT_ROOT,
  globalCommandRoot = DEFAULT_CLAUDE_GLOBAL_COMMAND_ROOT,
  loadManifest: loadManifestOverride = loadInstallManifest,
  promptChoice = promptSelect,
  settingsCatalog = CLAUDE_SETTINGS_CATALOG,
} = {}) {
  return {
    enumerateWorkers: () => enumerateWorkers(packageRoot, loadManifestOverride, 'claude'),
    enumerateCommands: () => enumerateCommands(packageRoot, loadManifestOverride, 'claude'),
    enumerateTargets: () => enumerateProjectionTargets(packageRoot, loadManifestOverride, 'claude'),
    effectiveSetting: (targetEntry) => effectiveSetting(targetEntry, projectPath, globalAgentRoot, globalCommandRoot, 'claude'),
    selectSettings: subsetLabel => selectClaudeSettings(subsetLabel, promptChoice, settingsCatalog),
    createLocalOverride: (target, settings) => {
      const family = typeof target === 'string' ? 'worker' : target.family;
      const targetName = typeof target === 'string' ? target : target.name;
      if (!isClaudeSettingsPair(settingsCatalog, settings)) {
        return materializationFailure(targetName, 'Selected Claude settings are not present in the settings catalog.');
      }
      return materializeLocalOverride({
        agentName: targetName,
        settings,
        projectPath,
        globalAgentRoot,
        globalCommandRoot,
        harness: 'claude',
        family,
      });
    },
  };
}

function createOpencodeAdapter({
  projectPath = process.cwd(),
  packageRoot = DEFAULT_PACKAGE_ROOT,
  globalAgentRoot = DEFAULT_OPENCODE_GLOBAL_AGENT_ROOT,
  globalCommandRoot = DEFAULT_OPENCODE_GLOBAL_COMMAND_ROOT,
  loadManifest: loadManifestOverride = loadInstallManifest,
  promptChoice = promptSelect,
  runCommand = defaultRunCommand,
} = {}) {
  return {
    enumerateWorkers: () => enumerateWorkers(packageRoot, loadManifestOverride, 'opencode'),
    enumerateCommands: () => enumerateCommands(packageRoot, loadManifestOverride, 'opencode'),
    enumerateTargets: () => enumerateProjectionTargets(packageRoot, loadManifestOverride, 'opencode'),
    effectiveSetting: (targetEntry) => effectiveSetting(targetEntry, projectPath, globalAgentRoot, globalCommandRoot, 'opencode'),
    selectSettings: subsetLabel => opencodeSelectSettings(subsetLabel, promptChoice, runCommand),
    createLocalOverride: (target, settings) => {
      const family = typeof target === 'string' ? 'worker' : target.family;
      const targetName = typeof target === 'string' ? target : target.name;
      if (!settings || typeof settings.model !== 'string' || settings.model === ''
          || (settings.variant !== undefined && typeof settings.variant !== 'string')) {
        return materializationFailure(targetName, 'Selected OpenCode settings are invalid.');
      }
      return materializeLocalOverride({
        agentName: targetName,
        settings,
        projectPath,
        globalAgentRoot,
        globalCommandRoot,
        harness: 'opencode',
        family,
      });
    },
  };
}

function skippedOutcome(reason, diagnostics = []) {
  return { status: 'skipped', reason, skippedAgents: [], diagnostics };
}

async function runPostSetupMenu({
  projectPath = process.cwd(),
  packageRoot = DEFAULT_PACKAGE_ROOT,
  claudeGlobalAgentRoot = DEFAULT_CLAUDE_GLOBAL_AGENT_ROOT,
  opencodeGlobalAgentRoot = DEFAULT_OPENCODE_GLOBAL_AGENT_ROOT,
  claudeGlobalCommandRoot = DEFAULT_CLAUDE_GLOBAL_COMMAND_ROOT,
  opencodeGlobalCommandRoot = DEFAULT_OPENCODE_GLOBAL_COMMAND_ROOT,
  isTTY = process.stdin.isTTY,
  promptChoice = promptSelect,
  promptChecklist = installFlowPromptChecklist,
} = {}) {
  if (!isTTY) return skippedOutcome('non-tty');

  for (;;) {
    let screen = 'menu';
    let adapter = null;
    let harness = null;
    let scope = null;
    let selectedTargets = null;
    let settings = null;

    for (;;) {
      if (screen === 'menu') {
        const action = await promptChoice(
          'Post-setup customization:',
          MENU_OPTIONS,
          undefined,
          null,
        );
        if (action === BACK) continue;
        if (action === null || action === 'Exit') return skippedOutcome('cancelled');
        if (action !== 'Customize models') return skippedOutcome('cancelled');
        screen = 'harness';
        continue;
      }

      if (screen === 'harness') {
        const chosen = await promptChoice('Choose a harness:', HARNESS_OPTIONS);
        if (chosen === BACK) {
          screen = 'menu';
          continue;
        }
        if (chosen === null) return skippedOutcome('cancelled');
        if (chosen !== 'OpenCode' && chosen !== 'Claude Code') return skippedOutcome('cancelled');
        harness = chosen;
        screen = 'scope';
        continue;
      }

      if (screen === 'scope') {
        const chosen = await promptChoice('Choose a customization scope:', SCOPE_OPTIONS);
        if (chosen === BACK) {
          screen = 'harness';
          continue;
        }
        if (chosen === null) return skippedOutcome('cancelled');
        if (!SCOPE_OPTIONS.includes(chosen)) return skippedOutcome('cancelled');
        scope = chosen;
        screen = 'targets';
        continue;
      }

      if (screen === 'targets') {
        adapter = harness === 'OpenCode'
          ? module.exports.createOpencodeAdapter({
            projectPath,
            packageRoot,
            globalAgentRoot: opencodeGlobalAgentRoot,
            globalCommandRoot: opencodeGlobalCommandRoot,
            promptChoice,
          })
          : module.exports.createClaudeAdapter({
            projectPath,
            packageRoot,
            globalAgentRoot: claudeGlobalAgentRoot,
            globalCommandRoot: claudeGlobalCommandRoot,
            promptChoice,
          });
        const families = typeof adapter.enumerateTargets === 'function'
          ? adapter.enumerateTargets()
          : {
            worker: typeof adapter.enumerateWorkers === 'function' ? adapter.enumerateWorkers() : [],
            agent: [],
            command: typeof adapter.enumerateCommands === 'function' ? adapter.enumerateCommands() : [],
            utility: [],
          };
        const targetEntries = buildChecklistTargets(scope, families);
        const targets = targetEntries.map(entry => entry.value);
        if (targets.length === 0) {
          console.log('No customization targets are available for the selected scope.');
          screen = 'scope';
          continue;
        }
        const nameWidth = Math.max(...targetEntries.map(entry => entry.name.length));
        const header = [
          `${MODEL_TABLE_INDENT}${'TYPE'.padStart(MODEL_TABLE_TYPE_WIDTH)}${MODEL_TABLE_GUTTER}${'TARGET'.padEnd(nameWidth)}${MODEL_TABLE_GUTTER}${MODEL_TABLE_COMPLEXITY_HEADER.padEnd(MODEL_TABLE_COMPLEXITY_WIDTH)}${MODEL_TABLE_GUTTER}SETTING`,
          `${MODEL_TABLE_INDENT}${'─'.repeat(MODEL_TABLE_TYPE_WIDTH)}${MODEL_TABLE_GUTTER}${'─'.repeat(nameWidth)}${MODEL_TABLE_GUTTER}${'─'.repeat(MODEL_TABLE_COMPLEXITY_WIDTH)}${MODEL_TABLE_GUTTER}${'─'.repeat('SETTING'.length)}`,
        ];
        const labels = targetEntries.map((entry) => {
          const setting = typeof adapter.effectiveSetting === 'function'
            ? adapter.effectiveSetting(entry)
            : 'unavailable';
          return `${entry.family.toUpperCase().padStart(MODEL_TABLE_TYPE_WIDTH)}${MODEL_TABLE_GUTTER}${entry.name.padEnd(nameWidth)}${MODEL_TABLE_GUTTER}${taskComplexityFor(entry).padEnd(MODEL_TABLE_COMPLEXITY_WIDTH)}${MODEL_TABLE_GUTTER}${setting}`;
        });

        const selection = await promptChecklist(
          targets,
          targets,
          undefined,
          MODEL_CHECKLIST_LEGEND,
          { preventEmptyConfirm: true, displayOptions: labels, header },
        );
        if (!selection || selection.status === 'cancelled') return skippedOutcome('cancelled');
        if (selection.status === 'non-interactive') return skippedOutcome('non-tty');
        if (selection.status === 'back') {
          screen = 'scope';
          continue;
        }
        if (selection.status !== 'confirmed') return skippedOutcome('cancelled');

        selectedTargets = Array.isArray(selection.items)
          ? selection.items.map(value => parseTarget(value)).filter(Boolean)
          : [];
        if (selectedTargets.length === 0) {
          screen = 'targets';
          continue;
        }
        screen = 'settings';
        continue;
      }

      settings = await adapter.selectSettings(selectedTargets.map(target => target.value).join(', '));
      if (settings === BACK) {
        screen = 'targets';
        continue;
      }
      if (!settings || typeof settings.model !== 'string' || settings.model === '') {
        return skippedOutcome('settings-unavailable');
      }
      break;
    }

    const skippedAgents = [];
    const failedAgents = [];
    const diagnostics = [];
    for (const target of selectedTargets) {
      const result = adapter.createLocalOverride(target, settings);
      if (result.status === 'persisted') continue;
      if (result.status === 'skipped') {
        skippedAgents.push(target.name);
        diagnostics.push(result.diagnostic || `Skipped ${target.name}: installed source is unavailable.`);
        continue;
      }
      if (result.status !== 'persistence-failed') {
        throw new Error(`Unexpected local override outcome for ${target.name}: ${result.status}`);
      }
      if (typeof result.diagnostic !== 'string' || result.diagnostic === '') {
        throw new Error(`Persistence failure for ${target.name} did not include a diagnostic.`);
      }
      failedAgents.push(target.name);
      diagnostics.push(result.diagnostic);
    }

    for (const diagnostic of diagnostics) {
      console.error(`Post-setup customization: ${diagnostic}`);
    }

    if (failedAgents.length > 0) {
      return { status: 'persistence-failed', failedAgents, diagnostics };
    }
  }
}

module.exports = {
  runPostSetupMenu,
  CLAUDE_SETTINGS_CATALOG,
  SCOPE_OPTIONS,
  TARGET_PREFIXES,
  MODEL_CHECKLIST_LEGEND,
  NO_VARIANT,
  BACK,
  createOpencodeAdapter,
  createClaudeAdapter,
  buildClaudeSettingsEntries,
  isClaudeSettingsPair,
  selectClaudeSettings,
  defaultRunCommand,
  parseModelCatalog,
  parseVerboseModelRecords,
  extractVariants,
  buildVariantDisplayOptions,
  buildChecklistTargets,
  parseTarget,
  TASK_COMPLEXITY,
  taskComplexityFor,
  enumerateProjectionTargets,
  effectiveSetting,
  patchFrontmatter,
  materializeLocalOverride,
  atomicReplace,
};

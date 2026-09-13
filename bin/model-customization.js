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
  CHECKLIST_SEPARATOR,
} = require('./install-flow.js');

const MENU_OPTIONS = Object.freeze(['Customize models', 'Exit']);
const HARNESS_OPTIONS = Object.freeze(['OpenCode', 'Claude Code']);
const SCOPE_OPTIONS = Object.freeze(['All', 'Agents', 'Orchestrators', 'Workers', 'Utilities']);
const MODEL_CHECKLIST_LEGEND = 'Up/Down move · Space toggle · Enter confirm · ←/Esc back · q/Ctrl-C cancel';
const MODEL_TABLE_INDENT = '      ';
const MODEL_TABLE_GUTTER = '  ';
const MODEL_TABLE_TYPE_WIDTH = 12;
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
  'worker:sai-backfill-worker': '↑↑',
  'worker:sai-commit-worker': '↑',
  'worker:sai-direct-build-worker': '↑↑',
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

function resolveOpencodeBaseForCustomization() {
  try {
    const flow = require('./install-flow.js');
    if (flow && typeof flow.resolveOpencodeBase === 'function') return flow.resolveOpencodeBase();
  } catch {
    // Fall through to the hardcoded default when the shared resolver is unavailable.
  }
  return path.join(os.homedir(), '.config', 'opencode');
}

function defaultOpencodeGlobalAgentRoot() {
  return path.join(resolveOpencodeBaseForCustomization(), 'agents');
}

function defaultOpencodeGlobalCommandRoot() {
  return path.join(resolveOpencodeBaseForCustomization(), 'commands');
}

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

function displayFamily(family) {
  return family === 'command' ? 'ORCHESTRATOR' : family.toUpperCase();
}

const COMMAND_WORKER_ORDER = Object.freeze({
  'sai-explore': Object.freeze(['sai-direct-build-worker']),
  'sai-1-spec': Object.freeze(['sai-1-spec-proposal-worker']),
  'sai-2-design': Object.freeze(['sai-2-design-worker']),
  'sai-3-implement': Object.freeze(['sai-3-implementation-worker']),
  'sai-4-apply': Object.freeze(['sai-4-red-worker', 'sai-4-green-worker']),
  'sai-5-review': Object.freeze(['sai-5-review-worker']),
  'sai-6-security': Object.freeze(['sai-6-security-worker']),
  'sai-7-performance': Object.freeze(['sai-7-performance-worker']),
  'sai-8-accessibility': Object.freeze(['sai-8-accessibility-worker']),
  'sai-archive': Object.freeze(['sai-archive-worker']),
  'sai-backfill': Object.freeze(['sai-backfill-worker']),
  'sai-merge': Object.freeze(['sai-merge-worker']),
});

// Logical pipeline order for the grouped `All` table only. Filtered scope
// views keep today's alphabetical order. Phase 4 keeps `backfill` before
// `archive` as the explicit alphabetical exception.
const ALL_PHASE_ORDER = Object.freeze([
  Object.freeze(['sai-explore', 'sai-1-spec', 'sai-2-design']),
  Object.freeze(['sai-build', 'sai-3-implement', 'sai-4-apply']),
  Object.freeze(['sai-review', 'sai-5-review', 'sai-6-security', 'sai-7-performance', 'sai-8-accessibility']),
  Object.freeze(['sai-backfill', 'sai-archive', 'sai-merge']),
]);

function entryName(entry) {
  return typeof entry === 'string' ? entry : entry.name;
}

function toTarget(family, entry) {
  return typeof entry === 'string' ? target(family, entry) : entry;
}

function sortedByName(entries) {
  return entries.slice().sort((left, right) => {
    const leftName = entryName(left);
    const rightName = entryName(right);
    return leftName < rightName ? -1 : leftName > rightName ? 1 : 0;
  });
}

function buildChecklistTargets(scope, families) {
  if (scope === 'All') {
    const agents = sortedByName(families.agent || []).map(entry => toTarget('agent', entry));
    const workerByName = new Map();
    for (const entry of (families.worker || [])) {
      workerByName.set(entryName(entry), toTarget('worker', entry));
    }
    const commandByName = new Map();
    for (const entry of (families.command || [])) {
      const name = entryName(entry);
      if (!commandByName.has(name)) commandByName.set(name, toTarget('command', entry));
    }
    const takeCommandBlock = (cmdName) => {
      if (!commandByName.has(cmdName)) return [];
      const rows = [commandByName.get(cmdName)];
      commandByName.delete(cmdName);
      const expected = COMMAND_WORKER_ORDER[cmdName] || [];
      for (const workerName of expected) {
        if (workerByName.has(workerName)) {
          rows.push(workerByName.get(workerName));
          workerByName.delete(workerName);
        }
      }
      return rows;
    };
    const phases = ALL_PHASE_ORDER.map(phase => phase.flatMap(takeCommandBlock));
    // Future commands outside the fixed phases stay alphabetical and join the
    // close phase so the four fixed groups never gain a fifth separator.
    const leftoverRows = [...commandByName.entries()]
      .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
      .flatMap(([cmdName, cmdTarget]) => {
        const rows = [cmdTarget];
        const expected = COMMAND_WORKER_ORDER[cmdName] || [];
        for (const workerName of expected) {
          if (workerByName.has(workerName)) {
            rows.push(workerByName.get(workerName));
            workerByName.delete(workerName);
          }
        }
        return rows;
      });
    const orphanWorkers = [...workerByName.entries()]
      .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
      .map(([, entry]) => entry);
    if (phases.length > 0) {
      phases[phases.length - 1].push(...leftoverRows, ...orphanWorkers);
    }
    const nonEmptyPhases = phases.filter(phase => phase.length > 0);
    const middle = [];
    nonEmptyPhases.forEach((phase, index) => {
      if (index > 0) middle.push({ value: CHECKLIST_SEPARATOR, separator: true, family: 'separator', name: '', label: '' });
      middle.push(...phase);
    });
    const utilities = sortedByName(families.utility || []).map(entry => toTarget('utility', entry));
    // Grouped All table: agents | phased middle block | utilities.
    // Join non-empty groups with a single blank separator row so there is
    // never a leading, trailing, or doubled blank.
    const groups = [agents, middle, utilities].filter(group => group.length > 0);
    if (groups.length <= 1) return groups.length === 0 ? [] : groups[0];
    const result = [];
    groups.forEach((group, index) => {
      if (index > 0) result.push({ value: CHECKLIST_SEPARATOR, separator: true, family: 'separator', name: '', label: '' });
      result.push(...group);
    });
    return result;
  }
  const selectedFamilies = ({ Workers: ['worker'], Agents: ['agent'], Commands: ['command'], Orchestrators: ['command'], Utilities: ['utility'] }[scope] || []);
  return selectedFamilies.flatMap(family => (families[family] || []).slice().sort()
    .map(entry => typeof entry === 'string' ? target(family, entry) : entry));
}

function parseTarget(value) {
  if (value === CHECKLIST_SEPARATOR) return null;
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
      const sourceRoot = family === 'command' || family === 'utility' ? globalCommandRoot : globalAgentRoot;
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

function parseApiModelList(stdout) {
  if (typeof stdout !== 'string') {
    throw new Error('Model list output is not a string');
  }
  let text = stdout.includes('\0') ? stdout.replace(/\0/g, '') : stdout;
  text = text.trim();
  if (text.length > 0 && text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  if (text.startsWith('ï»¿')) {
    text = text.slice(3);
  }
  text = text.trim();
  if (text === '') {
    throw new Error('Empty model list output');
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Unparseable model list output: ${error.message}`);
  }
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.data) ? parsed.data : null);
  if (list === null) {
    throw new Error('Model list output has no data array');
  }
  return list;
}

function extractApiVariants(modelList, provider, model) {
  if (!Array.isArray(modelList)) return null;
  const entry = modelList.find(item => item !== null
    && typeof item === 'object'
    && item.providerID === provider
    && item.id === model);
  if (!entry) return null;
  const variants = entry.variants;
  if (!Array.isArray(variants)) return [];
  const ids = [];
  for (const variant of variants) {
    if (variant !== null && typeof variant === 'object' && typeof variant.id === 'string' && variant.id !== '') {
      ids.push(variant.id);
    } else if (typeof variant === 'string' && variant !== '') {
      ids.push(variant);
    }
  }
  return ids;
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
  // Variants come from a single cached `opencode api v2.model.list` source,
  // fetched once per setup run and reused for every selected model.
  let screen = 'provider';
  let provider = null;
  let model = null;
  let cachedModelList = null;
  let cachedAvailable = null;

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

    if (cachedAvailable === null) {
      let apiOutcome = null;
      let apiFailed = false;
      try {
        apiOutcome = runCommand('opencode', ['api', 'v2.model.list']);
      } catch (error) {
        console.error(`Unable to query OpenCode model variants: ${error.message}`);
        apiFailed = true;
      }
      if (apiFailed) {
        cachedAvailable = false;
      } else if (apiOutcome.status !== 0) {
        reportCommandFailure('query OpenCode model variants', apiOutcome);
        cachedAvailable = false;
      } else {
        try {
          cachedModelList = parseApiModelList(apiOutcome.stdout);
          cachedAvailable = true;
        } catch {
          cachedAvailable = false;
        }
      }
    }

    let variants = [];
    if (cachedAvailable === true) {
      try {
        const extracted = extractApiVariants(cachedModelList, provider, model);
        variants = extracted === null ? [] : extracted;
      } catch {
        variants = [];
      }
    } else {
      variants = [];
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
  globalAgentRoot,
  globalCommandRoot,
  loadManifest: loadManifestOverride = loadInstallManifest,
  promptChoice = promptSelect,
  runCommand = defaultRunCommand,
} = {}) {
  const effectiveAgentRoot = globalAgentRoot !== undefined ? globalAgentRoot : defaultOpencodeGlobalAgentRoot();
  const effectiveCommandRoot = globalCommandRoot !== undefined ? globalCommandRoot : defaultOpencodeGlobalCommandRoot();
  return {
    enumerateWorkers: () => enumerateWorkers(packageRoot, loadManifestOverride, 'opencode'),
    enumerateCommands: () => enumerateCommands(packageRoot, loadManifestOverride, 'opencode'),
    enumerateTargets: () => enumerateProjectionTargets(packageRoot, loadManifestOverride, 'opencode'),
    effectiveSetting: (targetEntry) => effectiveSetting(targetEntry, projectPath, effectiveAgentRoot, effectiveCommandRoot, 'opencode'),
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
        globalAgentRoot: effectiveAgentRoot,
        globalCommandRoot: effectiveCommandRoot,
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
  opencodeGlobalAgentRoot,
  claudeGlobalCommandRoot = DEFAULT_CLAUDE_GLOBAL_COMMAND_ROOT,
  opencodeGlobalCommandRoot,
  isTTY = process.stdin.isTTY,
  promptChoice = promptSelect,
  promptChecklist = installFlowPromptChecklist,
} = {}) {
  const effectiveOpencodeAgentRoot = opencodeGlobalAgentRoot !== undefined ? opencodeGlobalAgentRoot : defaultOpencodeGlobalAgentRoot();
  const effectiveOpencodeCommandRoot = opencodeGlobalCommandRoot !== undefined ? opencodeGlobalCommandRoot : defaultOpencodeGlobalCommandRoot();
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
            globalAgentRoot: effectiveOpencodeAgentRoot,
            globalCommandRoot: effectiveOpencodeCommandRoot,
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
        const selectableEntries = targetEntries.filter(entry => !entry.separator);
        const nameWidth = Math.max(...selectableEntries.map(entry => entry.name.length));
        const header = [
          `${MODEL_TABLE_INDENT}${'TYPE'.padEnd(MODEL_TABLE_TYPE_WIDTH)}${MODEL_TABLE_GUTTER}${'TARGET'.padEnd(nameWidth)}${MODEL_TABLE_GUTTER}${MODEL_TABLE_COMPLEXITY_HEADER.padEnd(MODEL_TABLE_COMPLEXITY_WIDTH)}${MODEL_TABLE_GUTTER}SETTING`,
          `${MODEL_TABLE_INDENT}${'─'.repeat(MODEL_TABLE_TYPE_WIDTH)}${MODEL_TABLE_GUTTER}${'─'.repeat(nameWidth)}${MODEL_TABLE_GUTTER}${'─'.repeat(MODEL_TABLE_COMPLEXITY_WIDTH)}${MODEL_TABLE_GUTTER}${'─'.repeat('SETTING'.length)}`,
        ];
        const labels = targetEntries.map((entry) => {
          if (entry.separator) return '';
          const setting = typeof adapter.effectiveSetting === 'function'
            ? adapter.effectiveSetting(entry)
            : 'unavailable';
          return `${displayFamily(entry.family).padEnd(MODEL_TABLE_TYPE_WIDTH)}${MODEL_TABLE_GUTTER}${entry.name.padEnd(nameWidth)}${MODEL_TABLE_GUTTER}${taskComplexityFor(entry).padEnd(MODEL_TABLE_COMPLEXITY_WIDTH)}${MODEL_TABLE_GUTTER}${setting}`;
        });

        const selection = await promptChecklist(
          targets,
          selectableEntries.map(entry => entry.value),
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
  parseApiModelList,
  extractApiVariants,
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

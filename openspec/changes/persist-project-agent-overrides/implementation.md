# Persist project-local agent overrides

## Goal

Persist selected Claude Code and opencode agent tunables into user-owned
project-local agent files while preserving existing content and keeping setup
successful when optional post-setup customization is skipped or partially
fails.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). If the command returns empty (detached HEAD), use the literal text `detached HEAD` for option 2.
- Resolve the repository **default branch** dynamically — do **not** assume `main`. Apply this chain in order:
  1. Remote head — `git symbolic-ref --quiet refs/remotes/origin/HEAD`; on success take the trailing path segment (`refs/remotes/origin/main` → `main`).
  2. Else whichever of `main` / `master` exists locally (`git show-ref --verify --quiet refs/heads/<name>`).
  3. If both `main` and `master` exist locally and no remote head resolved, prefer `main`.
  4. If neither exists or there is no `origin`, treat the current branch as the resolved default branch (no distinct default exists, so the base prompt below is skipped).
- Present exactly three options in the user's input language (English fallback), in this fixed order. Canonical English labels — translate to match the user's input language, preserving meaning and order:
  1. `Suggest branch "persist-project-agent-overrides"` — the change-name-derived branch (default).
  2. `Stay on current branch "<current-branch>"` — the detected current branch, or `detached HEAD`.
  3. `Enter branch name manually` — free text for a custom branch name.
- No option is prohibited. The user bears full responsibility for the choice.
- **Branch-base prompt (new branches only).** When the selected branch does **not** already exist — option 1, or an option-3 name not present in the repository — present a 2-option closed choice for its base branch, before creating it, through the harness option-picker (`AskUserQuestion` on Claude Code per the closed-choice-prompt rule in `remember.md`; plain-text fallback where no picker exists). Present them in this order; labels localize to the user's input language (English fallback), surrounding text stays English:
  1. `Base on default branch "<default-branch>"` — the dynamically resolved default; this is the pre-selected default option.
  2. `Base on current branch "<current-branch>"` — the current branch, or the literal `detached HEAD` when in detached HEAD.
- Record the chosen base and create the new branch from it before implementing. Skip the base prompt when staying on the current branch, when the target branch already exists, or when the current branch already equals the resolved default branch; in the last case create directly from the default branch.

### Step-by-Step Instructions

#### Step 1: Materialize selected harness overrides

*(Testable step — use RED → GREEN)*

##### RED phase

- [x] Write the focused tests into `test/agent-customization-menu.test.js` using the exact Step 1 assertions in `interfaces.md`. Keep the fixtures isolated under `.tmp/persist-project-agent-overrides/` and inject package, project, and harness-global roots through the adapter options. Cover first materialization, source cloning without package fallback, tunable-only preservation and updates, repeated settings, selected-agent limits, cancellation, non-TTY behavior, OpenCode's write-free selector, the Claude catalog matrix, missing-source soft skips, and atomic write/rename failures.
- [x] Verify RED: run `node --test test/agent-customization-menu.test.js` — expected: **assertion failure** attributable to the current fake settings/non-persistent implementation, not a setup, import, syntax, or compilation error.
- [x] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the test passes, or the failure is not an assertion failure caused by the missing behavior, stop and report the RED failure.

##### GREEN phase (only after RED is verified)

- [x] Replace `bin/agent-customization.js` with the following complete CommonJS implementation. It keeps selectors filesystem-free, resolves the roster from `packageRoot`, resolves missing-agent bytes only from `globalAgentRoot`, patches only top-level harness tunables, and performs every destination write through a same-directory temporary file followed by rename:

```javascript
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
} = require('./install-flow.js');

const MENU_OPTIONS = Object.freeze(['Customize models', 'Exit']);
const HARNESS_OPTIONS = Object.freeze(['OpenCode', 'Claude Code']);
const AGENT_CHECKLIST_LEGEND = 'Up/Down move · Space toggle · Enter confirm · q/Ctrl-C cancel';
const COMBINED_ENTRY_DELIMITER = ' | ';
const DEFAULT_PACKAGE_ROOT = path.join(__dirname, '..');
const DEFAULT_CLAUDE_GLOBAL_AGENT_ROOT = path.join(os.homedir(), '.claude', 'agents');
const DEFAULT_OPENCODE_GLOBAL_AGENT_ROOT = path.join(os.homedir(), '.config', 'opencode', 'agents');

const CLAUDE_SETTINGS_CATALOG = Object.freeze({
  models: Object.freeze([
    Object.freeze({ model: 'opus', efforts: Object.freeze(['low', 'medium', 'high', 'xhigh']) }),
    Object.freeze({ model: 'sonnet', efforts: Object.freeze(['low', 'medium']) }),
  ]),
});

const NO_VARIANT = Symbol('NO_VARIANT');
const NO_VARIANT_LABEL = 'Default (no variant)';
const TOP_LEVEL_SCALAR = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/;

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
    if (!selected.has(key)) continue;
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
  harness,
}) {
  const localDirectory = harness === 'claude'
    ? path.join(projectPath, '.claude', 'agents')
    : path.join(projectPath, '.opencode', 'agents');
  const destination = path.join(localDirectory, `${agentName}.md`);
  const tunableKeys = harness === 'claude' ? ['model', 'effort'] : ['model', 'variant'];
  const destinationExists = fs.existsSync(destination);

  let currentText;
  try {
    if (destinationExists) {
      currentText = fs.readFileSync(destination, 'utf8');
    } else {
      const source = path.join(globalAgentRoot, `${agentName}.md`);
      if (!fs.existsSync(source)) {
        return { status: 'skipped', agent: agentName, reason: 'missing-source' };
      }
      currentText = fs.readFileSync(source, 'utf8');
    }
  } catch (error) {
    return materializationFailure(
      agentName,
      `Unable to read the ${destinationExists ? 'project-local agent' : 'installed agent'} for ${agentName}: ${error.message}`
    );
  }

  const patchedText = patchFrontmatter(currentText, tunableKeys, settings);
  if (patchedText === null) {
    return materializationFailure(agentName, `Agent ${agentName} has no valid frontmatter block.`);
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

function enumerateAgents(packageRoot, loadManifest, harness) {
  const manifest = loadManifest(packageRoot);
  return manifest.projections
    .filter(projection => projection.destination.class === 'agents' && projection.harnesses.includes(harness))
    .map(projection => path.basename(projection.destination.path, '.md'))
    .sort();
}

function buildClaudeSettingsEntries(settingsCatalog) {
  if (settingsCatalog === null || !Array.isArray(settingsCatalog.models)) return [];
  const entries = [];
  for (const modelEntry of settingsCatalog.models) {
    if (!modelEntry || typeof modelEntry.model !== 'string' || !Array.isArray(modelEntry.efforts)) continue;
    for (const effort of modelEntry.efforts) {
      if (typeof effort !== 'string' || effort === '') continue;
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
  if (!settings || typeof settings.model !== 'string' || typeof settings.effort !== 'string') return false;
  return buildClaudeSettingsEntries(settingsCatalog)
    .some(entry => entry.model === settings.model && entry.effort === settings.effort);
}

async function selectClaudeSettings(subsetLabel, promptChoice, settingsCatalog) {
  const entries = buildClaudeSettingsEntries(settingsCatalog);
  if (entries.length === 0) return null;
  const selectedDisplay = await promptChoice(
    `Model and effort for ${subsetLabel}:`,
    entries.map(entry => entry.display)
  );
  const selected = entries.find(entry => entry.display === selectedDisplay);
  if (selected === undefined) return null;
  return { model: selected.model, effort: selected.effort };
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
  const provider = await promptChoice(`Provider for ${subsetLabel}:`, providers);
  if (!providers.includes(provider)) return null;

  const models = catalog.filter(entry => entry.provider === provider).map(entry => entry.model);
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
  if (variants.length === 0) return { model: identity };

  const variantOptions = buildVariantDisplayOptions(variants);
  const selectedDisplay = await promptChoice(
    `Variant for ${identity}:`,
    variantOptions.map(option => option.display)
  );
  const selected = variantOptions.find(option => option.display === selectedDisplay);
  if (selected === undefined || selected.value === NO_VARIANT) return selected === undefined ? null : { model: identity };
  return { model: identity, variant: selected.value };
}

function createClaudeAdapter({
  projectPath = process.cwd(),
  packageRoot = DEFAULT_PACKAGE_ROOT,
  globalAgentRoot = DEFAULT_CLAUDE_GLOBAL_AGENT_ROOT,
  loadManifest: loadManifestOverride = loadInstallManifest,
  promptChoice = promptSelect,
  settingsCatalog = CLAUDE_SETTINGS_CATALOG,
} = {}) {
  return {
    enumerateAgents: () => enumerateAgents(packageRoot, loadManifestOverride, 'claude'),
    selectSettings: subsetLabel => selectClaudeSettings(subsetLabel, promptChoice, settingsCatalog),
    createLocalOverride: (agentName, settings) => {
      if (!isClaudeSettingsPair(settingsCatalog, settings)) {
        return materializationFailure(agentName, 'Selected Claude settings are not present in the settings catalog.');
      }
      return materializeLocalOverride({
        agentName,
        settings,
        projectPath,
        globalAgentRoot,
        harness: 'claude',
      });
    },
  };
}

function createOpencodeAdapter({
  projectPath = process.cwd(),
  packageRoot = DEFAULT_PACKAGE_ROOT,
  globalAgentRoot = DEFAULT_OPENCODE_GLOBAL_AGENT_ROOT,
  loadManifest: loadManifestOverride = loadInstallManifest,
  promptChoice = promptSelect,
  runCommand = defaultRunCommand,
} = {}) {
  return {
    enumerateAgents: () => enumerateAgents(packageRoot, loadManifestOverride, 'opencode'),
    selectSettings: subsetLabel => opencodeSelectSettings(subsetLabel, promptChoice, runCommand),
    createLocalOverride: (agentName, settings) => {
      if (!settings || typeof settings.model !== 'string' || settings.model === ''
          || (settings.variant !== undefined && typeof settings.variant !== 'string')) {
        return materializationFailure(agentName, 'Selected OpenCode settings are invalid.');
      }
      return materializeLocalOverride({
        agentName,
        settings,
        projectPath,
        globalAgentRoot,
        harness: 'opencode',
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
  isTTY = process.stdin.isTTY,
  promptChoice = promptSelect,
  promptChecklist = installFlowPromptChecklist,
} = {}) {
  if (!isTTY) return skippedOutcome('non-tty');

  const action = await promptChoice('Post-setup customization:', MENU_OPTIONS);
  if (action === null || action === 'Exit') return skippedOutcome('cancelled');
  if (action !== 'Customize models') return skippedOutcome('cancelled');

  const harness = await promptChoice('Choose a harness:', HARNESS_OPTIONS);
  if (harness === null) return skippedOutcome('cancelled');
  if (harness !== 'OpenCode' && harness !== 'Claude Code') return skippedOutcome('cancelled');

  const adapter = harness === 'OpenCode'
    ? module.exports.createOpencodeAdapter({
      projectPath,
      packageRoot,
      globalAgentRoot: opencodeGlobalAgentRoot,
      promptChoice,
    })
    : module.exports.createClaudeAdapter({
      projectPath,
      packageRoot,
      globalAgentRoot: claudeGlobalAgentRoot,
      promptChoice,
    });
  const agents = adapter.enumerateAgents();
  const selection = await promptChecklist(agents, agents, undefined, AGENT_CHECKLIST_LEGEND);
  if (!selection || selection.status === 'cancelled') return skippedOutcome('cancelled');
  if (selection.status === 'non-interactive') return skippedOutcome('non-tty');
  if (selection.status !== 'confirmed') return skippedOutcome('cancelled');

  const selectedAgents = Array.isArray(selection.items) ? selection.items : [];
  if (selectedAgents.length === 0) return skippedOutcome('empty-selection');

  const settings = await adapter.selectSettings(selectedAgents.join(', '));
  if (!settings || typeof settings.model !== 'string' || settings.model === '') {
    return skippedOutcome('settings-unavailable');
  }

  const skippedAgents = [];
  const failedAgents = [];
  const diagnostics = [];
  for (const agentName of selectedAgents) {
    const result = adapter.createLocalOverride(agentName, settings);
    if (result.status === 'persisted') continue;
    if (result.status === 'skipped') {
      skippedAgents.push(agentName);
      diagnostics.push(`Skipped ${agentName}: installed source is unavailable.`);
      continue;
    }
    failedAgents.push(agentName);
    diagnostics.push(result.diagnostic);
  }

  if (failedAgents.length > 0) {
    return { status: 'persistence-failed', failedAgents, diagnostics };
  }
  return { status: 'completed', skippedAgents, diagnostics };
}

module.exports = {
  runPostSetupMenu,
  CLAUDE_SETTINGS_CATALOG,
  NO_VARIANT,
  createOpencodeAdapter,
  createClaudeAdapter,
  defaultRunCommand,
  parseModelCatalog,
  parseVerboseModelRecords,
  extractVariants,
  buildVariantDisplayOptions,
  patchFrontmatter,
  materializeLocalOverride,
  atomicReplace,
};
```
- [x] Verify GREEN: run `node --test test/agent-customization-menu.test.js` — expected: PASS, including the atomic failure cases and all isolated-root assertions.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**

- [x] RED verified — `node --test test/agent-customization-menu.test.js` fails with a behavior assertion before the production replacement.
- [x] GREEN verified — `node --test test/agent-customization-menu.test.js` passes after the production replacement.
- [x] `node --check bin/agent-customization.js` — expected result: no syntax errors.

*(No Human checks — this is service-side CLI and filesystem behavior with no observable browser surface.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required for this service-side step.

#### Step 2: Keep setup completion non-fatal for expected customization outcomes

*(Testable step — use RED → GREEN)*

##### RED phase

- [ ] Extend `test/agent-customization-menu.test.js` with the exact Step 2 assertions in `interfaces.md`: inject `completed`, `skipped`, and `persistence-failed` post-setup outcomes and verify required setup still returns `success`; inject an unclassified thrown exception and verify `post-setup-failure`; verify post-setup ordering and no unrelated-file mutation.
- [ ] Verify RED: run `node --test test/agent-customization-menu.test.js` — expected: assertion failure attributable to setup treating a classified post-setup failure as fatal.
- [ ] **GATE — DO NOT PROCEED to GREEN until RED is verified.** If the test passes, or the failure is not an assertion failure caused by the missing non-fatal boundary, stop and report the RED failure.

##### GREEN phase (only after RED is verified)

- [ ] In `bin/setup.js`, replace the existing post-setup call and rejection-only handling in `main` with this complete block immediately after the existing `console.log('SAI workflow configured...')` section:

```javascript
  let customizationOutcome;
  try {
    customizationOutcome = await postSetupMenu({ projectPath });
  } catch (err) {
    console.error(err);
    return 'post-setup-failure';
  }

  if (customizationOutcome === undefined) {
    return 'success';
  }

  if (customizationOutcome.status === 'completed'
      || customizationOutcome.status === 'skipped'
      || customizationOutcome.status === 'persistence-failed') {
    for (const diagnostic of customizationOutcome.diagnostics || []) {
      console.error(`Post-setup customization: ${diagnostic}`);
    }
    return 'success';
  }

  console.error(`Unexpected post-setup customization outcome: ${customizationOutcome.status}`);
  return 'post-setup-failure';
```
- [ ] Verify GREEN: run `node --test test/agent-customization-menu.test.js` — expected: PASS, including all classified outcome and unclassified-exception integration assertions.

##### Step 2 Verification Checklist

**Automated (agent runs before stopping):**

- [ ] RED verified — the focused suite fails before the setup boundary is changed.
- [ ] GREEN verified — `node --test test/agent-customization-menu.test.js` passes after the setup boundary is changed.
- [ ] `npm test` — expected result: the complete Node test suite passes, with the summary evaluated from its `tests`, `pass`, and `fail` count lines.
- [ ] `git diff --check` — expected result: no whitespace errors.

*(No Human checks — setup and post-setup customization are service-side CLI behavior with no observable browser surface.)*

#### Step 2 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required for this service-side step.

## Appendix: Plan vs Final Implementation

This section documents deviations between the original plan and the code that was actually merged.

### Step 1 — Legacy customization assertions migrated

**Plan:** Extend the focused customization suite with the Step 1 persistence assertions.

**Final:** The focused suite also migrated pre-existing tests that asserted the retired non-persistent adapter results and fake settings exports to the new closed persistence contract.

**Reason:** The Step 1 contract intentionally replaces in-memory override objects and undefined menu outcomes with persistent materialization and classified customization outcomes; retaining those assertions prevented the required GREEN suite from passing.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | writer | red | 1 | assertion | |
| 1 | implementation | green | 1 | other | |

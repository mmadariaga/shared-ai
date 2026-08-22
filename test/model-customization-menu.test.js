'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const modelCustomization = require('../bin/model-customization.js');
const { main } = require('../bin/setup.js');
const { BACK } = require('../bin/install-flow.js');

const {
  runPostSetupMenu,
  CLAUDE_SETTINGS_CATALOG: EXPORTED_CLAUDE_SETTINGS_CATALOG,
  buildClaudeSettingsEntries,
  isClaudeSettingsPair,
  selectClaudeSettings,
  patchFrontmatter,
  materializeLocalOverride,
  NO_VARIANT,
  createOpencodeAdapter,
  createClaudeAdapter,
  defaultRunCommand,
  parseModelCatalog,
  parseVerboseModelRecords,
  extractVariants,
} = modelCustomization;

const REPO_ROOT = path.join(__dirname, '..');

const OPENCODE_AGENTS = [
  'budget',
  'executor',
  'explore',
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-4-green-worker',
  'sai-4-red-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
  'sai-archive-worker',
  'sai-backfill-worker',
  'sai-commit-worker',
];

const CLAUDE_AGENTS = [
  'budget-executor',
  'budget-explorer',
  'budget-subagent',
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-4-green-worker',
  'sai-4-red-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
  'sai-archive-worker',
  'sai-backfill-worker',
  'sai-commit-worker',
];
const OPENCODE_WORKERS = OPENCODE_AGENTS.filter(name => name.startsWith('sai-'));
const CLAUDE_WORKERS = CLAUDE_AGENTS.filter(name => name.startsWith('sai-'));
const UTILITY_COMMANDS = ['sai-commit', 'sai-pr', 'sai-status', 'sai-worktree'];

// Step 3: command-family targets exposed by the adapter enumeration seam.
// Kept alphabetical so a bare-name checklist assertion is order-independent of
// any flow-side sorting.
const COMMANDS = [
  'sai-1-spec',
  'sai-2-design',
  'sai-3-implement',
  'sai-4-apply',
  'sai-5-review',
  'sai-6-security',
  'sai-7-performance',
  'sai-8-accessibility',
  'sai-archive',
  'sai-backfill',
  'sai-build',
  'sai-commit',
  'sai-explore',
  'sai-pr',
  'sai-status',
  'sai-worktree',
];
const MODEL_COMMANDS = COMMANDS.filter(name => !UTILITY_COMMANDS.includes(name));

// Step 3: deliberately non-alphabetical enumeration output so the All-scope
// assertions can pin flow-side alphabetical ordering per family.
const SCRAMBLED_WORKERS = [
  'sai-3-implementation-worker',
  'budget',
  'sai-1-spec-proposal-worker',
];

const SCRAMBLED_COMMANDS = [
  'sai-pr',
  'sai-1-spec',
  'sai-backfill',
];

const COMBINED_BOTH = [
  'worker:budget',
  'worker:sai-1-spec-proposal-worker',
  'worker:sai-3-implementation-worker',
  'command:sai-1-spec',
  'command:sai-backfill',
  'utility:sai-pr',
];

const COMBINED_BOTH_BARE = [
  'budget',
  'sai-1-spec-proposal-worker',
  'sai-3-implementation-worker',
  'sai-1-spec',
  'sai-backfill',
  'sai-pr',
];

// Step 4: command-family names mirrored from the current commands/{harness}
// basenames. Both harnesses ship the same 17 names. These are current-state
// fixture assertions, not hardcoded enumerations — production derives the
// names from the manifest's commands-class projections.
const OPENCODE_COMMANDS = [
  'budget',
  'sai-1-spec',
  'sai-2-design',
  'sai-3-implement',
  'sai-4-apply',
  'sai-5-review',
  'sai-6-security',
  'sai-7-performance',
  'sai-8-accessibility',
  'sai-archive',
  'sai-backfill',
  'sai-build',
  'sai-commit',
  'sai-explore',
  'sai-pr',
  'sai-status',
  'sai-worktree',
];

// Step 4: full All-scope row set for the default-selection assertion — every
// worker and every command of the harness, workers first, each family
// alphabetical, type-prefixed (the Step 3 flow sorts each family).
const COMBINED_BOTH_FULL = [
  ...[...OPENCODE_AGENTS].sort().map(name => `worker:${name}`),
  ...[...MODEL_COMMANDS].sort().map(name => `command:${name}`),
  ...[...UTILITY_COMMANDS].sort().map(name => `utility:${name}`),
];

const CHECKLIST_LEGEND = 'Up/Down move · Space toggle · Enter confirm · ←/Esc back · q/Ctrl-C cancel';
const SELECT_LEGEND = 'Up/Down move · Space/Enter confirm · ←/Esc back · q/Ctrl-C cancel';
const SCRATCH_ROOT = path.join(REPO_ROOT, '.tmp', 'customize-command-models', 'scratch-repos');

function snapshotTree(dir) {
  const snapshot = {};
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const full = path.join(current, entry.name);
      const relative = path.relative(dir, full);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        snapshot[relative] = fs.readFileSync(full);
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return snapshot;
}

function makeFakeAdapter(workers, ops, settings = { model: 'opencode-go/test-model' }, commands = []) {
  return {
    enumerateWorkers() {
      return workers;
    },
    enumerateCommands() {
      return commands;
    },
    enumerateTargets() {
      return {
        worker: workers,
        agent: [],
        command: commands.filter(name => !UTILITY_COMMANDS.includes(name)),
        utility: commands.filter(name => UTILITY_COMMANDS.includes(name)),
      };
    },
    effectiveSetting() {
      return 'opencode-go/test-model (high)';
    },
    async selectSettings(label) {
      ops.select.push(label);
      return settings;
    },
    createLocalOverride(target, chosen) {
      const name = typeof target === 'string' ? target : target.name;
      ops.create.push({ target, settings: chosen });
      return {
        status: 'persisted',
        agent: name,
        destination: path.join(REPO_ROOT, '.tmp', 'adapter-spy', `${name}.md`),
      };
    },
  };
}

function patchFactory(name, replacement) {
  const original = modelCustomization[name];
  modelCustomization[name] = replacement;
  return function restore() {
    modelCustomization[name] = original;
  };
}

// Step 3 scratch repo: mirrors the real-repo layout (manifest + agents dirs) so
// the real adapters can enumerate agents and (non-)write overrides against it.
function makeScratchRepo() {
  fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(SCRATCH_ROOT, 'traversal-'));
  fs.mkdirSync(path.join(scratch, 'sai'), { recursive: true });
  fs.mkdirSync(path.join(scratch, 'agents', 'opencode'), { recursive: true });
  fs.mkdirSync(path.join(scratch, 'agents', 'claude'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'sai', 'install-manifest.json'),
    path.join(scratch, 'sai', 'install-manifest.json')
  );
  for (const name of OPENCODE_AGENTS) {
    fs.writeFileSync(
      path.join(scratch, 'agents', 'opencode', `${name}.md`),
      [
        '---',
        `name: ${name}`,
        'description: isolated test source',
        'model: opencode-go/old-model',
        'variant: old',
        '---',
        '',
        `sentinel ${name}`,
        '',
      ].join('\n')
    );
  }
  for (const name of CLAUDE_AGENTS) {
    fs.writeFileSync(
      path.join(scratch, 'agents', 'claude', `${name}.md`),
      [
        '---',
        `name: ${name}`,
        'description: isolated test source',
        'model: opus',
        'effort: high',
        '---',
        '',
        `sentinel ${name}`,
        '',
      ].join('\n')
    );
  }
  return scratch;
}

// Step 4: fixture manifest helper — scratch package root around a copy of the
// real manifest plus a command-source tree, and a decoy installed global
// command directory that must never be read.
function makeEnumerationFixture(harness, packageSourceNames, decoyNames) {
  fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
  const root = fs.mkdtempSync(path.join(SCRATCH_ROOT, 'enumeration-'));
  const packageRoot = path.join(root, 'package');
  fs.mkdirSync(path.join(packageRoot, 'sai'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'sai', 'install-manifest.json'),
    path.join(packageRoot, 'sai', 'install-manifest.json')
  );
  const sourceDir = path.join(packageRoot, 'commands', harness);
  fs.mkdirSync(sourceDir, { recursive: true });
  for (const name of packageSourceNames) {
    fs.writeFileSync(path.join(sourceDir, `${name}.md`), `---\ndescription: fixture\n---\n`);
  }
  const decoyDir = path.join(root, 'installed', harness === 'claude' ? 'commands' : 'commands');
  fs.mkdirSync(decoyDir, { recursive: true });
  for (const name of decoyNames) {
    fs.writeFileSync(path.join(decoyDir, `${name}.md`), `---\ndescription: decoy\n---\n`);
  }
  return { root, packageRoot, decoyDir };
}

// Records every invocation (raw arguments) and resolves a checklist outcome.
// `items` defaults to the full default selection (every agent pre-selected).
function recordChecklist(calls, outcome) {
  return async (...args) => {
    calls.push(args);
    if (typeof outcome === 'function') return outcome(args);
    if (outcome) return outcome;
    return { status: 'confirmed', items: args[1] || [] };
  };
}

after(() => {
  fs.rmSync(SCRATCH_ROOT, { recursive: true, force: true });
});

test('runPostSetupMenu skips when not a TTY: returns the closed non-tty outcome, never prompts, creates no adapter', async () => {
  let promptCalls = 0;
  let opencodeFactoryCalls = 0;
  let claudeFactoryCalls = 0;
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => {
    opencodeFactoryCalls += 1;
    return makeFakeAdapter([], { select: [], create: [] });
  });
  const restoreClaude = patchFactory('createClaudeAdapter', () => {
    claudeFactoryCalls += 1;
    return makeFakeAdapter([], { select: [], create: [] });
  });
  try {
    const result = await runPostSetupMenu({
      isTTY: false,
      promptChoice: async () => {
        promptCalls += 1;
        return 'Customize models';
      },
    });
    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'non-tty',
      skippedAgents: [],
      diagnostics: [],
    });
    assert.equal(promptCalls, 0, 'promptChoice should never be called when not a TTY');
    assert.equal(opencodeFactoryCalls, 0, 'no opencode adapter should be created when skipped');
    assert.equal(claudeFactoryCalls, 0, 'no claude adapter should be created when skipped');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('runPostSetupMenu returns cancelled when Exit is chosen: no harness picker, no checklist, no adapter', async () => {
  let promptCalls = 0;
  let opencodeFactoryCalls = 0;
  let claudeFactoryCalls = 0;
  const checklistCalls = [];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => {
    opencodeFactoryCalls += 1;
    return makeFakeAdapter([], { select: [], create: [] });
  });
  const restoreClaude = patchFactory('createClaudeAdapter', () => {
    claudeFactoryCalls += 1;
    return makeFakeAdapter([], { select: [], create: [] });
  });
  try {
    const result = await runPostSetupMenu({
      isTTY: true,
      promptChoice: async () => {
        promptCalls += 1;
        return 'Exit';
      },
      promptChecklist: async (...args) => {
        checklistCalls.push(args);
        return { status: 'confirmed', items: args[1] || [] };
      },
    });
    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'cancelled',
      skippedAgents: [],
      diagnostics: [],
    });
    assert.equal(promptCalls, 1, 'the main menu should be prompted exactly once');
    assert.equal(checklistCalls.length, 0, 'no checklist should be invoked after Exit');
    assert.equal(opencodeFactoryCalls, 0, 'no opencode adapter should be created on exit');
    assert.equal(claudeFactoryCalls, 0, 'no claude adapter should be created on exit');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('customize OpenCode flow persists every selected agent, never invokes Claude', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  let opencodeFactoryCalls = 0;
  let claudeFactoryCalls = 0;
  const checklistCalls = [];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => {
    opencodeFactoryCalls += 1;
     return makeFakeAdapter(OPENCODE_AGENTS, opencodeOps, {
       model: 'opencode-go/test-model',
       variant: 'high',
     });
  });
  const restoreClaude = patchFactory('createClaudeAdapter', () => {
    claudeFactoryCalls += 1;
    return makeFakeAdapter(CLAUDE_AGENTS, claudeOps);
  });
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers', 'Exit'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async (...args) => {
        checklistCalls.push(args);
        return { status: 'confirmed', items: args[1] };
      },
    });
    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'cancelled',
      skippedAgents: [],
      diagnostics: [],
    });
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once');
    assert.equal(opencodeFactoryCalls, 1, 'createOpencodeAdapter should be invoked exactly once');
    assert.equal(claudeFactoryCalls, 0, 'createClaudeAdapter must never be invoked');
    assert.deepEqual(opencodeOps.select, [OPENCODE_AGENTS.map(name => `worker:${name}`).join(', ')],
      'selectSettings should run exactly once for the whole confirmed subset');
    assert.deepEqual(opencodeOps.create.map(entry => entry.target.name), OPENCODE_AGENTS,
      'createLocalOverride should run exactly once per opencode agent');
    const sharedOpenCodeSettings = { model: 'opencode-go/test-model', variant: 'high' };
    for (let i = 0; i < OPENCODE_AGENTS.length; i += 1) {
      assert.deepEqual(opencodeOps.create[i].settings, sharedOpenCodeSettings,
        'every opencode override should carry the identical shared selectSettings result');
    }
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('customize Claude Code flow persists every selected agent, never invokes OpenCode', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  let opencodeFactoryCalls = 0;
  let claudeFactoryCalls = 0;
  const checklistCalls = [];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => {
    opencodeFactoryCalls += 1;
    return makeFakeAdapter(OPENCODE_AGENTS, opencodeOps);
  });
  const restoreClaude = patchFactory('createClaudeAdapter', () => {
    claudeFactoryCalls += 1;
     return makeFakeAdapter(CLAUDE_AGENTS, claudeOps, { model: 'sonnet', effort: 'medium' });
  });
  try {
    const answers = ['Customize models', 'Claude Code', 'Workers', 'Exit'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async (...args) => {
        checklistCalls.push(args);
        return { status: 'confirmed', items: args[1] };
      },
    });
    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'cancelled',
      skippedAgents: [],
      diagnostics: [],
    });
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once');
    assert.equal(claudeFactoryCalls, 1, 'createClaudeAdapter should be invoked exactly once');
    assert.equal(opencodeFactoryCalls, 0, 'createOpencodeAdapter must never be invoked');
    assert.deepEqual(claudeOps.select, [CLAUDE_AGENTS.map(name => `worker:${name}`).join(', ')],
      'selectSettings should run exactly once for the whole confirmed subset');
    assert.deepEqual(claudeOps.create.map(entry => entry.target.name), CLAUDE_AGENTS,
      'createLocalOverride should run exactly once per claude agent');
    const sharedClaudeSettings = { model: 'sonnet', effort: 'medium' };
    for (let i = 0; i < CLAUDE_AGENTS.length; i += 1) {
      assert.deepEqual(claudeOps.create[i].settings, sharedClaudeSettings,
        'every claude override should carry the identical shared selectSettings result');
    }
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('opencode enumerateWorkers returns only the twelve routed workers', () => {
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT });
  const agents = adapter.enumerateWorkers();
  assert.equal(agents.length, 12, 'exactly twelve routed workers should enumerate for opencode');
  assert.deepEqual([...agents].sort(), [...OPENCODE_WORKERS].sort(),
    'opencode workers should exclude generic delegation agents');
});

test('claude enumerateWorkers returns only the twelve routed workers', () => {
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT });
  const agents = adapter.enumerateWorkers();
  assert.equal(agents.length, 12, 'exactly twelve routed workers should enumerate for claude');
  assert.deepEqual([...agents].sort(), [...CLAUDE_WORKERS].sort(),
    'claude workers should exclude generic delegation agents');
});

test('both adapters classify generic delegation agents separately from Worker Matrix workers', () => {
  const claude = createClaudeAdapter({ repoRoot: REPO_ROOT }).enumerateTargets();
  const opencode = createOpencodeAdapter({ repoRoot: REPO_ROOT }).enumerateTargets();
  assert.deepEqual(claude.agent, ['budget-executor', 'budget-explorer', 'budget-subagent']);
  assert.deepEqual(opencode.agent, ['budget', 'executor', 'explore']);
  assert.equal(claude.worker.length, 12);
  assert.equal(opencode.worker.length, 12);
});

test('Claude settings selection asks one combined frame from the real catalog and resolves the confirmed pair', async () => {
  const calls = [];
  const promptSpy = async (question, options) => {
    calls.push({ question, options });
    return options.find(option => option.includes('sonnet') && option.includes('medium'));
  };
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
  const settings = await adapter.selectSettings('explore');
  assert.equal(calls.length, 1, 'exactly one combined prompt should run per invocation');
   const expectedSize = EXPORTED_CLAUDE_SETTINGS_CATALOG.models
     .reduce((total, entry) => total + (entry.efforts ? entry.efforts.length : 1), 0);
   assert.equal(calls[0].options.length, expectedSize,
     'the combined frame should offer every valid real-catalog model×effort pair');
   assert.ok(calls[0].options.some(option => option === 'haiku'),
     'the model-only catalog entry should be displayed without an effort suffix');
   assert.ok(calls[0].options
     .filter(option => option !== 'haiku')
     .every(option => typeof option === 'string' && option.includes(' | ')),
   'effort-bearing catalog entries should combine one model and one effort in the selector frame');
  assert.deepEqual(settings, { model: 'sonnet', effort: 'medium' },
    'confirming the real sonnet/medium catalog entry should resolve the pair');
});

test('claude adapter selectSettings drives one real combined frame via the prompt boundary and returns the selected pair', async () => {
  const calls = [];
  const promptSpy = async (question, options) => {
    calls.push({ question, options });
    return options.find(option => option.includes('sonnet') && option.includes('low'));
  };
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
  const settings = await adapter.selectSettings('explore');
  assert.equal(calls.length, 1,
    'claude selectSettings(explore) should drive exactly one combined prompt');
  assert.deepEqual(settings, { model: 'sonnet', effort: 'low' },
    'claude selectSettings should resolve the confirmed real catalog entry to its model and effort values');
});

test('each claude agent consumes exactly one real combined frame and resolves a catalog pair', async () => {
  let promptIndex = 0;
  const promptSpy = async (question, options) => {
    const selected = options[promptIndex % options.length];
    promptIndex += 1;
    assert.ok(selected, 'each Claude agent should receive a selectable real catalog entry');
    return selected;
  };
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
  const agents = adapter.enumerateWorkers();
  assert.equal(agents.length, CLAUDE_AGENTS.length,
    `exactly ${CLAUDE_AGENTS.length} agents should enumerate for claude`);
  assert.deepEqual([...agents].sort(), [...CLAUDE_AGENTS].sort(),
    `the enumerated agents should be exactly the ${CLAUDE_AGENTS.length} managed claude agents`);

  for (let i = 0; i < agents.length; i += 1) {
    const settings = await adapter.selectSettings(agents[i]);
     assert.ok(EXPORTED_CLAUDE_SETTINGS_CATALOG.models.some(entry => entry.model === settings.model
       && (entry.efforts ? entry.efforts.includes(settings.effort) : !Object.hasOwn(settings, 'effort'))),
     `claude selectSettings should resolve a valid catalog pair for agent ${i}`);
  }
  assert.equal(promptIndex, agents.length,
    'selectSettings should consume exactly one combined prompt per claude agent');
});

test('opencode createLocalOverride persists a selected variant through the adapter contract', () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalAgent(fixture, 'opencode', PERSIST_OPENCODE_AGENT, opencodeAgentSource());
    const adapter = createOpencodeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.opencodeGlobalRoot,
    });
    const result = adapter.createLocalOverride(PERSIST_OPENCODE_AGENT, {
      model: 'opencode-go/glm-5.2',
      variant: 'high',
    });
    assert.equal(result.status, 'persisted');
    assert.equal(result.agent, PERSIST_OPENCODE_AGENT);
    assert.match(
      fs.readFileSync(result.destination, 'utf8'),
      /model: opencode-go\/glm-5\.2\nvariant: high/
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('default command runner resolves Windows npm shims without interpolating arguments into shell syntax', () => {
  const calls = [];
  const commandArgs = ['models', 'provider&echo-not-a-command', '--verbose'];
  const result = defaultRunCommand('opencode', commandArgs, {
    platform: 'win32',
    env: { PATH: 'sentinel-path' },
    spawnSync(executable, args, options) {
      calls.push({ executable, args, options });
      return { stdout: 'catalog output', stderr: '', status: 0, error: null };
    },
  });

  assert.deepEqual(result, { stdout: 'catalog output', stderr: '', status: 0 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executable, 'powershell.exe',
    'Windows should use PowerShell so npm .cmd shims resolve through PATH');
  assert.deepEqual(JSON.parse(calls[0].options.env.SAI_COMMAND_ARGS), commandArgs,
    'arguments should cross the shell boundary as JSON data');
  assert.equal(calls[0].options.env.SAI_COMMAND_EXECUTABLE, 'opencode');
  assert.ok(!calls[0].args.join(' ').includes(commandArgs[1]),
    'provider text must not be interpolated into PowerShell command syntax');
  assert.match(calls[0].args.at(-1), /@commandArgs/,
    'PowerShell should splat the decoded argument array into the CLI invocation');
});

test('default command runner keeps direct argument-vector execution outside Windows', () => {
  const calls = [];
  defaultRunCommand('opencode', ['models'], {
    platform: 'linux',
    spawnSync(executable, args, options) {
      calls.push({ executable, args, options });
      return { stdout: '', stderr: '', status: 0, error: null };
    },
  });

  assert.deepEqual(calls, [{
    executable: 'opencode',
    args: ['models'],
    options: { encoding: 'utf8' },
  }]);
});

test('claude createLocalOverride persists the selected model and effort through the adapter contract', () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, claudeAgentSource());
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });
    const result = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, {
      model: 'sonnet',
      effort: 'medium',
    });
    assert.equal(result.status, 'persisted');
    assert.equal(result.agent, PERSIST_CLAUDE_AGENT);
    assert.match(
      fs.readFileSync(result.destination, 'utf8'),
      /model: sonnet\neffort: medium/
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('full dependent-flow traversal walks menu, harness, checklist, and provider→model→variant screens while preserving installed sources', async () => {
  const scratch = makeScratchRepo();
  try {
    const before = snapshotTree(path.join(scratch, 'agents'));

    const runner = makeCatalogRunner(
      'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\nopenai/gpt-5.4\n',
      'opencode-go/deepseek-v4-flash\n{\n  "variants": { "low": {}, "high": {} }\n}\n');

    const answers = ['Customize models', 'OpenCode', 'Workers'];
    const overrides = [];
    const originalOpencode = modelCustomization.createOpencodeAdapter;
    const restoreOpencode = patchFactory('createOpencodeAdapter', (deps) => {
      const real = originalOpencode({ ...deps, runCommand: runner });
      return {
        ...real,
        createLocalOverride(target, settings) {
          overrides.push({ target, settings });
          return real.createLocalOverride(target, settings);
        },
      };
    });

    let screenIndex = 0;
    const promptChoice = async (question, options) => {
      if (answers.length > 0) {
        return answers.shift();
      }
      if (options.includes('Exit')) return 'Exit';
      if (screenIndex === 0) {
        screenIndex += 1;
        assert.ok(options.includes('opencode-go'),
          'the traversal presents the provider screen before any model or variant screen');
        return 'opencode-go';
      }
      if (screenIndex === 1) {
        screenIndex += 1;
        assert.deepEqual([...options].sort(), ['deepseek-v4-flash', 'glm-5.2'],
          'the traversal model screen offers exactly the opencode-go models');
        return 'deepseek-v4-flash';
      }
      screenIndex += 1;
      assert.ok(options.includes('high'), 'the traversal presents the variant screen last');
      return 'high';
    };

    const checklistCalls = [];
    try {
      const result = await runPostSetupMenu({
        projectPath: scratch,
        opencodeGlobalAgentRoot: path.join(scratch, 'agents', 'opencode'),
        isTTY: true,
        promptChoice,
        promptChecklist: async (...args) => {
          checklistCalls.push(args);
          return { status: 'confirmed', items: args[1] };
        },
      });
      assert.deepEqual(result, {
        status: 'skipped',
        reason: 'cancelled',
        skippedAgents: [],
        diagnostics: [],
      }, 'the dependent-flow traversal should complete the opencode customization flow');
      assert.equal(checklistCalls.length, 1,
        'the checklist should be invoked exactly once during the traversal');
      assert.equal(screenIndex, 3,
        'provider, model, and variant screens are presented exactly once each, in that order');
      assert.deepEqual(runner.calls.map(call => call.args),
        [['models'], ['models', 'opencode-go', '--verbose']],
        'the traversal invokes the catalog and verbose queries as argument vectors, never --refresh');
      assert.equal(overrides.length, OPENCODE_AGENTS.length,
        'createLocalOverride should run exactly once per selected agent');
      for (const entry of overrides) {
        assert.deepEqual(entry.settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'high' },
          'every selected agent override should carry identical model and variant values');
      }
      assert.deepEqual(snapshotTree(path.join(scratch, 'agents')), before,
        'the agents tree must be byte-identical after the full traversal');
    } finally {
      restoreOpencode();
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

// --- Step 3: checklist seam and retired return tokens ---

test('checklist receives the full enumerated target list of the chosen harness and scope as its default selection', async () => {
  const cases = [
    { scope: 'Workers', items: OPENCODE_AGENTS.map(name => `worker:${name}`) },
    { scope: 'Commands', items: MODEL_COMMANDS.map(name => `command:${name}`).sort() },
    { scope: 'All', items: COMBINED_BOTH_FULL },
  ];
  for (const item of cases) {
    const opencodeOps = { select: [], create: [] };
    const claudeOps = { select: [], create: [] };
    const checklistCalls = [];
    const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
      makeFakeAdapter(OPENCODE_AGENTS, opencodeOps, { model: 'opencode-go/test-model' }, COMMANDS));
    const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
    try {
      const answers = ['Customize models', 'OpenCode', item.scope, 'Exit'];
      const promptChoice = async () => answers.shift() ?? '<model>';
      const result = await runPostSetupMenu({
        projectPath: REPO_ROOT,
        isTTY: true,
        promptChoice,
        promptChecklist: recordChecklist(checklistCalls),
      });
      assert.equal(checklistCalls.length, 1,
        `the checklist should be invoked exactly once for the ${item.scope} scope`);
      assert.deepEqual(checklistCalls[0][0], item.items,
        `the checklist items should be the full enumerated ${item.scope} target list`);
      assert.deepEqual(checklistCalls[0][1], item.items,
        `every target of the ${item.scope} scope should be pre-selected by default`);
      assert.equal(result.status, 'skipped');
      assert.equal(result.reason, 'cancelled');
    } finally {
      restoreOpencode();
      restoreClaude();
    }
  }
});

test('checklist receives the canonical legend string as its footer argument', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const checklistCalls = [];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers', 'Exit'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once');
    assert.ok(checklistCalls[0].includes(CHECKLIST_LEGEND),
      'the checklist should be invoked with the canonical legend as its footer argument');
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('model customization is the sole enabled empty-confirm checklist call', () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'bin', 'model-customization.js'), 'utf8');
  const enabledGuards = source.match(/preventEmptyConfirm\s*:\s*true\b/g) || [];

  assert.equal(enabledGuards.length, 1,
    'exactly the model-customization checklist call should enable preventEmptyConfirm');
});

test('production prompt bindings retain the expected shared-selector surface and one no-footer post-setup override', () => {
  const customizationSource = fs.readFileSync(
    path.join(REPO_ROOT, 'bin', 'model-customization.js'),
    'utf8'
  );

  const promptChoiceInvocations = customizationSource.match(/\bpromptChoice\s*\(/g) || [];
  const defaultPromptSelectBindings = customizationSource.match(/\bpromptChoice\s*=\s*promptSelect\b/g) || [];
  const noFooterOverrides = customizationSource.match(/\bpromptChoice\s*\([^)]*\bnull\b[^)]*\)/g) || [];

  assert.equal(promptChoiceInvocations.length, 7,
    'the model-customization flow should have exactly seven promptChoice invocations');
  assert.equal(defaultPromptSelectBindings.length, 3,
    'the three selector-owning surfaces should retain default promptSelect bindings');
  assert.equal(noFooterOverrides.length, 1,
    'model customization should provide exactly one explicit no-footer post-setup menu override');
});

// --- Step 3: customization scope screen ---

test('scope Workers presents worker identities and scope Commands presents command identities', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(OPENCODE_AGENTS, opencodeOps, { model: 'opencode-go/test-model' }, COMMANDS));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const workerAnswers = ['Customize models', 'OpenCode', 'Workers', 'Exit'];
    const workerChecklist = [];
    const workersResult = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => workerAnswers.shift() ?? '<model>',
      promptChecklist: recordChecklist(workerChecklist),
    });
    assert.equal(workersResult.status, 'skipped');
    assert.equal(workersResult.reason, 'cancelled');
    assert.equal(workerChecklist.length, 1, 'the checklist should be invoked exactly once for the Workers scope');
    assert.deepEqual(workerChecklist[0][0], OPENCODE_AGENTS.map(name => `worker:${name}`),
      'the Workers scope checklist items retain stable worker identities');
    assert.deepEqual(workerChecklist[0][1], OPENCODE_AGENTS.map(name => `worker:${name}`),
      'every worker is pre-selected by default in the Workers scope');

    const commandAnswers = ['Customize models', 'OpenCode', 'Commands', 'Exit'];
    const commandChecklist = [];
    const commandsResult = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => commandAnswers.shift() ?? '<model>',
      promptChecklist: recordChecklist(commandChecklist),
    });
    assert.equal(commandsResult.status, 'skipped');
    assert.equal(commandsResult.reason, 'cancelled');
    assert.equal(commandChecklist.length, 1, 'the checklist should be invoked exactly once for the Commands scope');
    assert.deepEqual(commandChecklist[0][0], MODEL_COMMANDS.map(name => `command:${name}`).sort(),
      'the Commands scope checklist items retain stable command identities');
    assert.deepEqual(commandChecklist[0][1], MODEL_COMMANDS.map(name => `command:${name}`).sort(),
      'every command is pre-selected by default in the Commands scope');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('scope All presents combined worker and command identities, workers first, each family alphabetical', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(SCRAMBLED_WORKERS, opencodeOps, { model: 'opencode-go/test-model' }, SCRAMBLED_COMMANDS));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'All', 'Exit'];
    const checklistCalls = [];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift() ?? '<model>',
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once for the All scope');
    assert.deepEqual(checklistCalls[0][0], COMBINED_BOTH,
      'the All scope checklist items retain family-prefixed identities');
    assert.deepEqual(checklistCalls[0][1], COMBINED_BOTH,
      'every combined row is pre-selected by default in the All scope');
    assert.deepEqual(opencodeOps.select, [COMBINED_BOTH.join(', ')],
      'confirming the All scope returns the stable values into the settings selection');
    assert.deepEqual(opencodeOps.create.map(entry => entry.target.name), COMBINED_BOTH_BARE,
      'each confirmed row configures its bare-name target once, in the combined row order');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
    assert.equal(claudeOps.create.length, 0, 'claude must never create overrides');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('injected checklist seam renders aligned model-table columns with a header but returns stable identities', async () => {
  const ops = { select: [], create: [] };
  const restore = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(
    ['sai-worker'], ops, { model: 'opencode-go/test-model', variant: 'high' },
    ['sai-pr', 'sai-build']
  ));
  try {
    const checklistCalls = [];
    const answers = ['Customize models', 'OpenCode', 'All', 'Exit'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift(),
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(checklistCalls[0][0], [
      'worker:sai-worker', 'command:sai-build', 'utility:sai-pr',
    ]);
    assert.deepEqual(checklistCalls[0][1], checklistCalls[0][0],
      'selection defaults use stable values, not display labels');
    assert.deepEqual(checklistCalls[0][4].header, [
      '         TYPE  TARGET      SETTING',
      `      ${'─'.repeat(7)}  ${'─'.repeat(10)}  ${'─'.repeat(7)}`,
    ],
      'the header columns start under the six-char option prefix and reuse the row widths');
    assert.deepEqual(checklistCalls[0][4].displayOptions, [
      ' WORKER  sai-worker  opencode-go/test-model (high)',
      'COMMAND  sai-build   opencode-go/test-model (high)',
      'UTILITY  sai-pr      opencode-go/test-model (high)',
    ],
      'display labels are aligned type/target/setting columns without ANSI wrappers');
    assert.deepEqual(ops.select, ['worker:sai-worker, command:sai-build, utility:sai-pr'],
      'the injected seam returns stable identities independently of labels');
  } finally {
    restore();
  }
});

test('an adapter without effectiveSetting renders unavailable as plain column text with no ANSI wrapper', async () => {
  const ops = { select: [], create: [] };
  const adapter = makeFakeAdapter(['sai-worker'], ops);
  delete adapter.effectiveSetting;
  const restore = patchFactory('createOpencodeAdapter', () => adapter);
  try {
    const checklistCalls = [];
    const answers = ['Customize models', 'OpenCode', 'Workers', 'Exit'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift(),
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(checklistCalls[0][4].displayOptions, [
      ' WORKER  sai-worker  unavailable',
    ],
      'the unavailable setting renders as ordinary text in the setting column');
    for (const label of checklistCalls[0][4].displayOptions) {
      assert.ok(!label.includes('\x1b'), 'no ANSI escape sequences remain in the labels');
    }
  } finally {
    restore();
  }
});

test('an empty scope prints the no-targets notice, returns to the scope picker, and never opens a checklist', async () => {
  const ops = { select: [], create: [] };
  const restore = patchFactory('createOpencodeAdapter', () => makeFakeAdapter([], ops));
  const logged = [];
  const originalLog = console.log;
  console.log = (...args) => logged.push(args.map(String).join(' '));
  try {
    const checklistCalls = [];
    const answers = ['Customize models', 'OpenCode', 'All', 'Exit'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift(),
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(result.reason, 'cancelled');
    assert.equal(logged.filter(line => line.includes('No customization targets are available for the selected scope.')).length, 1,
      'the empty-scope notice is printed exactly once');
    assert.equal(checklistCalls.length, 0,
      'an empty scope never opens a checklist and therefore never renders a header');
    assert.equal(ops.create.length, 0, 'an empty scope configures nothing');
  } finally {
    console.log = originalLog;
    restore();
  }
});

// --- Step 4: command enumeration from the manifest's commands-class projections ---

test('opencode enumerateCommands returns exactly the 17 manifest-declared commands', () => {
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT });
  const commands = adapter.enumerateCommands();
  assert.equal(commands.length, 17, 'exactly 17 commands should enumerate for opencode');
  assert.deepEqual([...commands].sort(), [...OPENCODE_COMMANDS].sort(),
    'opencode commands should be exactly the 17 manifest-declared names');
});

test('claude enumerateCommands returns exactly the same 17 manifest-declared commands', () => {
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT });
  const commands = adapter.enumerateCommands();
  assert.equal(commands.length, 17, 'exactly 17 commands should enumerate for claude');
  assert.deepEqual([...commands].sort(), [...OPENCODE_COMMANDS].sort(),
    'claude commands should be exactly the same 17 manifest-declared names');
});

test('command enumeration reads the manifest-declared package source directory, never the installed global command directory', () => {
  const decoyNames = ['decoy-command', 'decoy-other'];
  for (const harness of ['opencode', 'claude']) {
    const fixture = makeEnumerationFixture(harness, OPENCODE_COMMANDS, decoyNames);
    try {
      const createAdapter = harness === 'opencode' ? createOpencodeAdapter : createClaudeAdapter;
      const adapter = createAdapter({
        repoRoot: fixture.packageRoot,
        globalCommandRoot: fixture.decoyDir,
      });
      const commands = adapter.enumerateCommands();
      assert.equal(commands.length, OPENCODE_COMMANDS.length,
        `${harness}: the fixture package source should enumerate every command the fixture manifest declares`);
      assert.ok(commands.includes('sai-worktree'),
        `${harness}: a package-source command absent from the decoy installed directory still enumerates`);
      assert.ok(!commands.includes('decoy-command'),
        `${harness}: decoy-only names from the installed global command directory never appear`);
      assert.deepEqual([...commands].sort(), [...OPENCODE_COMMANDS].sort(),
        `${harness}: the enumerated set should be exactly the fixture package-source command set`);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test('All scope presents worker:budget and command:budget as two distinct rows and confirms both as separate targets', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(['budget'], opencodeOps, { model: 'opencode-go/test-model' }, ['budget']));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'All', 'Exit'];
    const checklistCalls = [];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift() ?? '<model>',
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once for the All scope');
    assert.deepEqual(checklistCalls[0][0], ['worker:budget', 'command:budget'],
      'the All scope presents worker:budget and command:budget as two distinct rows');
    assert.deepEqual(checklistCalls[0][1], ['worker:budget', 'command:budget'],
      'both distinct rows are pre-selected by default');
    assert.deepEqual(opencodeOps.select, ['worker:budget, command:budget'],
      'confirming the All scope returns both distinct rows as separate stable targets');
    assert.deepEqual(opencodeOps.create.map(entry => entry.target.name), ['budget', 'budget'],
      'each distinct row configures its own budget target: the worker and the command');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
    assert.equal(claudeOps.create.length, 0, 'claude must never create overrides');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('All scope rows are independently selectable: confirming only the command row configures exactly that target', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(['budget'], opencodeOps, { model: 'opencode-go/test-model' }, ['budget']));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'All', 'Exit'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift() ?? '<model>',
      promptChecklist: async () => ({ status: 'confirmed', items: ['command:budget'] }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(opencodeOps.select, ['command:budget'],
      'confirming only the command row returns exactly that type-prefixed target');
    assert.deepEqual(opencodeOps.create.map(entry => entry.target.name), ['budget'],
      'only the confirmed command row configures a target; the unconfirmed worker row does not');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
    assert.equal(claudeOps.create.length, 0, 'claude must never create overrides');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('back at the scope screen re-opens the harness selector and persists no selection', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () =>
    makeFakeAdapter(CLAUDE_AGENTS, claudeOps, { model: 'sonnet', effort: 'medium' }));
  const prompts = [];
  const checklistCalls = [];
  try {
    const answers = ['Customize models', 'OpenCode', BACK, 'Claude Code', 'Workers', 'Exit'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async (question, options) => {
        prompts.push({ question, options });
        return answers.shift();
      },
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    const scopePrompts = prompts.filter(prompt =>
      prompt.options.length === 5
      && prompt.options.includes('Workers')
      && prompt.options.includes('Commands')
      && prompt.options.includes('Agents')
      && prompt.options.includes('Utilities')
      && prompt.options.includes('All'));
    assert.equal(scopePrompts.length, 2,
      'back at the scope screen should re-present the scope screen after the harness is re-picked');
    for (const prompt of scopePrompts) {
      assert.deepEqual(prompt.options, ['Workers', 'Agents', 'Commands', 'Utilities', 'All'],
        'the scope screen offers exactly the five model customization families');
    }
    assert.equal(prompts.filter(prompt => prompt.question === 'Choose a harness:').length, 2,
      'back at the scope screen should re-open the harness selector');
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once after the re-pick');
    assert.deepEqual(opencodeOps.select, [],
      'the abandoned OpenCode harness selection must never reach settings selection');
    assert.deepEqual(opencodeOps.create, [], 'the abandoned OpenCode harness must never persist an override');
    assert.deepEqual(claudeOps.select, [CLAUDE_AGENTS.join(', ')],
      'the re-picked Claude harness runs one settings selection for the confirmed subset');
    assert.deepEqual(claudeOps.create.map(entry => entry.target.name), CLAUDE_AGENTS,
      'only the re-picked Claude harness configures its targets, exactly once each');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('back at the target checklist re-opens the scope screen and persists no selection from the abandoned pass', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(OPENCODE_AGENTS, opencodeOps, { model: 'opencode-go/test-model' }, COMMANDS));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  const questions = [];
  const checklistCalls = [];
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers', 'Commands', 'Exit'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async (question) => {
        questions.push(question);
        return answers.shift();
      },
      promptChecklist: async (...args) => {
        checklistCalls.push(args);
        return checklistCalls.length === 1 ? { status: 'back' } : { status: 'confirmed', items: args[1] };
      },
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(checklistCalls.length, 2,
      'back at the target checklist should re-open the scope screen and then the checklist again');
    assert.deepEqual(checklistCalls[0][0], OPENCODE_AGENTS,
      'the first checklist pass presents the Workers scope targets with stable worker identities');
    assert.deepEqual(checklistCalls[1][0], COMMANDS,
      'after back the re-picked Commands scope presents stable command identities');
    assert.equal(questions.length, 5,
      'menu, harness, scope, the re-presented scope, and the fresh menu are prompted');
    assert.equal(questions[1], 'Choose a harness:', 'the harness selector precedes the first scope screen');
    assert.equal(questions[2], questions[3],
      'back at the checklist re-presents the same scope screen');
    assert.deepEqual(opencodeOps.select, [COMMANDS.join(', ')],
      'only the confirmed Commands pass reaches settings selection');
    assert.deepEqual(opencodeOps.create.map(entry => entry.target.name), COMMANDS,
      'only the confirmed Commands pass configures targets, exactly once each; the abandoned Workers pass persists nothing');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
    assert.equal(claudeOps.create.length, 0, 'claude must never create overrides');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('subset selection configures exactly the selected agents: one selectSettings per chosen agent, none for the rest', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const subset = [OPENCODE_AGENTS[0], OPENCODE_AGENTS[3]];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers', 'Exit'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => ({ status: 'confirmed', items: subset }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(opencodeOps.select, [subset.join(', ')],
      'selectSettings should run exactly once for the confirmed subset and never for deselected agents');
    assert.deepEqual(opencodeOps.create.map(entry => entry.target.name), subset,
      'createLocalOverride should run exactly once per selected agent and never for deselected agents');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
    assert.equal(claudeOps.create.length, 0, 'claude must never create overrides');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('empty checklist selection completes with zero per-agent configuration', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers'];
    let checklistCalls = 0;
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => {
        checklistCalls += 1;
        return checklistCalls === 1
          ? { status: 'confirmed', items: [] }
          : { status: 'cancelled' };
      },
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(checklistCalls, 2, 'an empty confirmation keeps the checklist open');
    assert.deepEqual(opencodeOps.select, [], 'an empty selection must produce zero selectSettings calls');
    assert.deepEqual(opencodeOps.create, [], 'an empty selection must produce zero createLocalOverride calls');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('promptChoice null at the harness picker aborts before any checklist or per-agent configuration', async () => {
  let promptCalls = 0;
  let opencodeFactoryCalls = 0;
  let claudeFactoryCalls = 0;
  const checklistCalls = [];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => {
    opencodeFactoryCalls += 1;
    return makeFakeAdapter([], { select: [], create: [] });
  });
  const restoreClaude = patchFactory('createClaudeAdapter', () => {
    claudeFactoryCalls += 1;
    return makeFakeAdapter([], { select: [], create: [] });
  });
  try {
    const answers = ['Customize models', 'OpenCode', null];
    let promptIndex = 0;
    const promptChoice = async () => {
      promptCalls += 1;
      const value = answers[promptIndex];
      promptIndex += 1;
      return value;
    };
    const result = await runPostSetupMenu({
      isTTY: true,
      promptChoice,
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(promptCalls, 3, 'the main menu, the harness picker, and the scope screen should be prompted');
    assert.equal(checklistCalls.length, 0,
      'the checklist must never be reached when the harness picker is cancelled');
    assert.equal(opencodeFactoryCalls, 0, 'no opencode adapter should be created');
    assert.equal(claudeFactoryCalls, 0, 'no claude adapter should be created');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('promptChoice null at the provider screen aborts via the real opencode adapter path with no agent configured', async () => {
  const scratch = makeScratchRepo();
  const checklistCalls = [];
  let promptCalls = 0;
  try {
    const runnerCalls = [];
    const fakeRunner = (executable, args) => {
      runnerCalls.push(args);
      return { stdout: 'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\n', status: 0 };
    };
    const originalOpencode = modelCustomization.createOpencodeAdapter;
    const restoreOpencode = patchFactory('createOpencodeAdapter', (deps) => originalOpencode({ ...deps, runCommand: fakeRunner }));
    try {
      const answers = ['Customize models', 'OpenCode', 'Workers', null];
      let promptIndex = 0;
      const promptChoice = async () => {
        const value = answers[promptIndex];
        promptIndex += 1;
        promptCalls += 1;
        return value;
      };
      const result = await runPostSetupMenu({
        projectPath: scratch,
        isTTY: true,
        promptChoice,
        promptChecklist: recordChecklist(checklistCalls),
      });
      assert.equal(result.status, 'skipped');
      assert.equal(result.reason, 'settings-unavailable');
      assert.equal(checklistCalls.length, 1, 'the checklist should be reached exactly once');
      assert.equal(promptCalls, 4,
        'exactly menu, harness, the scope screen, and the provider screen are prompted: no prompt follows the provider-screen null');
      assert.deepEqual(runnerCalls, [['models']],
        'the catalog runner is invoked exactly once before the provider screen, never with --refresh');
    } finally {
      restoreOpencode();
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('checklist cancelled aborts with zero agents configured and returns cancelled', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => ({ status: 'cancelled' }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(opencodeOps.select, [], 'cancellation must configure zero agents');
    assert.deepEqual(opencodeOps.create, [], 'cancellation must create zero overrides');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('checklist non-interactive aborts as non-tty: zero agents configured', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => ({ status: 'non-interactive' }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'non-tty');
    assert.deepEqual(opencodeOps.select, [], 'non-interactive must configure zero agents');
    assert.deepEqual(opencodeOps.create, [], 'non-interactive must create zero overrides');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

// --- Step 2: postSetupMenu wiring in bin/setup.js ---

function captureConsole() {
  const logs = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (m) => logs.push(String(m));
  console.error = (m) => logs.push(String(m));
  return { logs, restore: () => { console.log = origLog; console.error = origError; } };
}

function fakeReadline(questionAnswer = 'y') {
  return {
    isOpen: true,
    closeCount: 0,
    question: (q, cb) => cb(questionAnswer),
    close() { this.isOpen = false; this.closeCount += 1; },
  };
}

function stubSpawnSync() {
  const orig = childProcess.spawnSync;
  childProcess.spawnSync = (cmd, args, opts) => {
    const line = Array.isArray(args) ? `${cmd} ${args.join(' ')}` : String(cmd);
    if (line.startsWith('openspec --version')) {
      return { status: 0, stdout: '', stderr: '', error: null };
    }
    // every other probe (codegraph --version, openspec init, codegraph init) is absent/failed
    return { status: 1, stdout: '', stderr: '', error: null };
  };
  return () => { childProcess.spawnSync = orig; };
}

function makeProjectDir({ withOpenspec = true, withConfig = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-agent-menu-setup-'));
  if (withOpenspec) {
    fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
    if (withConfig) {
      fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
    }
  }
  return dir;
}

test('postSetupMenu spy runs after the completion message and receives exactly { projectPath }', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  let menuCall = null;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupMenu: async (opts) => {
        menuCall = { args: opts, messagesAtInvocation: cap.logs.slice() };
      },
    });
    assert.equal(outcome, 'success');
    assert.ok(menuCall, 'the injected postSetupMenu should be invoked');
    assert.deepEqual(menuCall.args, { projectPath: projectDir },
      'postSetupMenu should receive exactly { projectPath } and never the setup-owned readline');
    assert.ok(menuCall.messagesAtInvocation.some(m => m.includes(`SAI workflow configured at ${projectDir}.`)),
      'the completion message must already be printed when postSetupMenu is invoked');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('default postSetupMenu is silent and non-prompting in a non-TTY run', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
    });
    assert.equal(outcome, 'success');
    assert.equal(rl.closeCount, 1, 'the setup-owned readline is closed exactly once');
    assert.ok(cap.logs.some(m => m.includes(`SAI workflow configured at ${projectDir}.`)),
      'the pre-existing completion message is preserved');
    const interactiveLines = cap.logs.filter(m =>
      /Customize models|Claude Code|OpenCode/i.test(m)
      || /\(\s*y\s*\/\s*n\s*\)/i.test(m)
      || /\?\s*$/.test(m));
    assert.deepEqual(interactiveLines, [],
      'a non-TTY run must not print any menu prompt or customization output');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('injected postSetupWorkflow contract is unchanged and the default postSetupMenu runs after the message without touching the setup readline', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  let workflowCall = null;
  let menuCalls = 0;
  let menuArgs = null;
  let menuMessages = null;
  const restoreMenu = patchFactory('runPostSetupMenu', async (opts) => {
    menuCalls += 1;
    menuArgs = opts;
    menuMessages = cap.logs.slice();
  });
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupWorkflow: async (ctx) => {
        workflowCall = {
          projectPath: ctx.projectPath,
          readline: ctx.readline,
          isOpen: ctx.readline.isOpen,
          messages: cap.logs.slice(),
        };
      },
    });
    assert.equal(outcome, 'success');
    assert.ok(workflowCall, 'the injected workflow should be invoked');
    assert.equal(workflowCall.projectPath, projectDir, 'workflow receives the resolved project path');
    assert.equal(workflowCall.readline, rl, 'workflow receives the same interface instance');
    assert.equal(workflowCall.isOpen, true, 'interface is still open inside the workflow');
    assert.ok(workflowCall.messages.some(m => /^Copied \d+ schema file/.test(m)),
      'schema-copy confirmation precedes the workflow call');
    assert.ok(!workflowCall.messages.some(m => /SAI workflow configured/.test(m)),
      'completion message is not yet printed inside the workflow');
    assert.equal(rl.closeCount, 1, 'readline closed exactly once by the setup flow');
    assert.equal(rl.isOpen, false, 'readline closed after both settle');
    assert.equal(menuCalls, 1, 'the default postSetupMenu should run exactly once');
    assert.deepEqual(menuArgs, { projectPath: projectDir },
      'the default postSetupMenu receives only { projectPath }');
    assert.ok(menuMessages.some(m => m.includes(`SAI workflow configured at ${projectDir}.`)),
      'the default postSetupMenu runs after the completion message');
    assert.equal(rl.closeCount, 1, 'the default postSetupMenu must not close the setup-owned readline');
  } finally {
    restoreMenu();
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('decline/abort never reaches postSetupMenu', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir({ withOpenspec: false }); // openspec/ absent -> ensureOpenspecDir prompts
  const cap = captureConsole();
  const rl = fakeReadline('n'); // decline the openspec init offer
  let menuCalls = 0;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupMenu: async () => { menuCalls += 1; },
    });
    assert.equal(outcome, 'aborted');
    assert.equal(menuCalls, 0, 'postSetupMenu must not be reached after an early decline');
    assert.equal(rl.closeCount, 1, 'readline closed on the decline path');
    assert.ok(cap.logs.some(m => m.includes('Aborted.')), 'Aborted. message preserved');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('required-failure never reaches postSetupMenu', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir({ withConfig: false }); // openspec/ present, config.yaml missing
  const cap = captureConsole();
  const rl = fakeReadline();
  let menuCalls = 0;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupMenu: async () => { menuCalls += 1; },
    });
    assert.equal(outcome, 'required-failure');
    assert.equal(menuCalls, 0, 'postSetupMenu must not be reached before schema copy completes');
    assert.equal(rl.closeCount, 1, 'readline closed on the failure path');
    assert.ok(cap.logs.some(m => m.includes('openspec/config.yaml not found')),
      'existing failure message preserved');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('workflow-throw post-setup-failure never reaches postSetupMenu', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  let menuCalls = 0;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupWorkflow: async () => { throw new Error('workflow exploded'); },
      postSetupMenu: async () => { menuCalls += 1; },
    });
    assert.equal(outcome, 'post-setup-failure');
    assert.equal(menuCalls, 0, 'postSetupMenu must not be reached after a workflow rejection');
    assert.equal(rl.closeCount, 1, 'readline closed exactly once on rejection');
    assert.ok(cap.logs.some(m => m.includes('workflow exploded')), 'rejection error surfaced');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('postSetupMenu rejection resolves post-setup-failure with the readline closed once', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupMenu: async () => { throw new Error('menu exploded'); },
    });
    assert.equal(outcome, 'post-setup-failure');
    assert.equal(rl.closeCount, 1, 'readline closed exactly once before the menu runs');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('Step 2 closed customization outcomes preserve setup success except persistence failure without changing unrelated files', async () => {
  const cases = [
    {
      name: 'completed',
      outcome: { status: 'completed', skippedAgents: [], diagnostics: [] },
      setupResult: 'success',
    },
    {
      name: 'skipped',
      outcome: { status: 'skipped', reason: 'cancelled', skippedAgents: [], diagnostics: [] },
      setupResult: 'success',
    },
    {
      name: 'persistence-failed',
      diagnostic: 'aggregate persistence diagnostic',
      outcome: {
        status: 'persistence-failed',
        diagnostics: ['aggregate persistence diagnostic'],
      },
      setupResult: 'persistence-failed',
    },
  ];

  for (const item of cases) {
    const restoreSpawn = stubSpawnSync();
    const projectDir = makeProjectDir();
    const unrelatedFile = path.join(projectDir, 'unrelated-project-file.txt');
    fs.writeFileSync(unrelatedFile, `unchanged-${item.name}\n`);
    const before = fs.readFileSync(unrelatedFile);
    const cap = captureConsole();
    let workflowCompleted = false;
    let menuCalls = 0;
    try {
      const result = await main({
        argv: ['node', 'bin/setup.js', projectDir],
        createReadline: () => fakeReadline(),
        postSetupWorkflow: async () => {
          workflowCompleted = true;
        },
        postSetupMenu: async (opts) => {
          menuCalls += 1;
          assert.deepEqual(opts, { projectPath: projectDir });
          assert.equal(workflowCompleted, true,
            `${item.name} customization must run after required setup workflow completion`);
          return item.outcome;
        },
      });

      assert.equal(result, item.setupResult,
        `${item.name} customization maps to its declared setup exit status`);
      assert.equal(menuCalls, 1, 'the post-setup customization menu remains reachable');
      assert.deepEqual(fs.readFileSync(unrelatedFile), before,
        'unrelated project files remain byte-identical');
      if (item.diagnostic) {
        assert.equal(cap.logs.some(message => message.includes(item.diagnostic)), false,
          'bin/setup.js must not render diagnostics owned by runPostSetupMenu');
      }
    } finally {
      cap.restore();
      restoreSpawn();
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  }
});

test('Step 2 unclassified post-setup exceptions remain post-setup-failure', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const defect = new Error('unclassified customization defect');
  try {
    const result = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => fakeReadline(),
      postSetupWorkflow: async () => {},
      postSetupMenu: async () => { throw defect; },
    });

    assert.equal(result, 'post-setup-failure',
      'an exception outside CustomizationOutcome is not suppressed');
    assert.ok(cap.logs.some(message => message.includes(defect.message)),
      'the unclassified defect remains visible');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('Step 2 cancellation and non-TTY customization complete without local agent writes', async () => {
  const cases = [
    {
      name: 'cancellation',
      isTTY: true,
      promptChoice: async () => 'Exit',
      reason: 'cancelled',
    },
    {
      name: 'non-TTY',
      isTTY: false,
      promptChoice: async () => assert.fail('non-TTY customization must not prompt'),
      reason: 'non-tty',
    },
  ];

  for (const item of cases) {
    const restoreSpawn = stubSpawnSync();
    const projectDir = makeProjectDir();
    let workflowCompleted = false;
    let menuOutcome = null;
    try {
      const result = await main({
        argv: ['node', 'bin/setup.js', projectDir],
        createReadline: () => fakeReadline(),
        postSetupWorkflow: async () => {
          workflowCompleted = true;
        },
        postSetupMenu: async (opts) => {
          assert.equal(workflowCompleted, true,
            `${item.name} menu remains after required setup workflow completion`);
          menuOutcome = await runPostSetupMenu({
            projectPath: opts.projectPath,
            isTTY: item.isTTY,
            promptChoice: item.promptChoice,
          });
          return menuOutcome;
        },
      });

      assert.equal(result, 'success', `${item.name} customization completes successfully`);
      assert.equal(menuOutcome.status, 'skipped');
      assert.equal(menuOutcome.reason, item.reason);
      assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'agents')), false,
        `${item.name} must not write local Claude agents`);
      assert.equal(fs.existsSync(path.join(projectDir, '.opencode', 'agents')), false,
        `${item.name} must not write local OpenCode agents`);
    } finally {
      restoreSpawn();
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  }
});

// --- Step 1: opencode model-catalog and verbose-record parsing utilities ---

test('parseModelCatalog splits each non-empty stdout line at the first slash into provider and model', () => {
  const entries = parseModelCatalog('opencode-go/deepseek-v4-flash\nopenai/gpt-5.4\n');
  assert.deepEqual(entries, [
    { provider: 'opencode-go', model: 'deepseek-v4-flash' },
    { provider: 'openai', model: 'gpt-5.4' },
  ], 'catalog lines parse into provider and model identifiers in stdout order');
});

test('parseModelCatalog throws on a line without a slash: no partial catalog', () => {
  assert.throws(() => parseModelCatalog('nope'),
    'a line missing the slash should fail the whole discovery transaction');
});

test('parseModelCatalog throws on an empty provider side', () => {
  assert.throws(() => parseModelCatalog('/model'),
    'a line with an empty provider should fail the whole discovery transaction');
});

test('parseModelCatalog throws on an empty model side', () => {
  assert.throws(() => parseModelCatalog('opencode-go/'),
    'a line with an empty model should fail the whole discovery transaction');
});

test('parseModelCatalog of empty output returns an empty catalog', () => {
  assert.deepEqual(parseModelCatalog(''), [],
    'an empty catalog is the empty discovery result at the flow level');
});

test('parseModelCatalog preserves first-appearance provider order for the provider screen', () => {
  const entries = parseModelCatalog('openai/gpt-5.4\nopencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\n');
  const providers = [];
  for (const entry of entries) {
    if (!providers.includes(entry.provider)) providers.push(entry.provider);
  }
  assert.deepEqual(providers, ['openai', 'opencode-go'],
    'distinct providers are offered once in first-appearance order');
});

test('parseVerboseModelRecords parses a header plus multiline JSON into one record', () => {
  const records = parseVerboseModelRecords('opencode-go/deepseek-v4-flash\n{\n  "variants": {}\n}\n');
  assert.deepEqual(records, [
    { identity: 'opencode-go/deepseek-v4-flash', record: { variants: {} } },
  ], 'header plus multiline JSON parses into one record');
});

test('parseVerboseModelRecords parses two header-plus-JSON records separated by a blank line independently', () => {
  const stdout = 'opencode-go/deepseek-v4-flash\n{\n  "variants": { "low": {} }\n}\n'
    + '\n'
    + 'openai/gpt-5.4\n{\n  "variants": { "high": {}, "max": {} }\n}\n';
  const records = parseVerboseModelRecords(stdout);
  assert.deepEqual(records, [
    { identity: 'opencode-go/deepseek-v4-flash', record: { variants: { low: {} } } },
    { identity: 'openai/gpt-5.4', record: { variants: { high: {}, max: {} } } },
  ], 'multiple records separated by blank lines parse independently, never merged');
});

test('parseVerboseModelRecords throws when a header is followed only by non-JSON garbage', () => {
  assert.throws(() => parseVerboseModelRecords('opencode-go/deepseek-v4-flash\nthis is not json\n'),
    'a header without a parseable JSON object is a failure');
});

test('parseVerboseModelRecords throws when the accumulated record text parses to a number', () => {
  assert.throws(() => parseVerboseModelRecords('opencode-go/deepseek-v4-flash\n42\n'),
    'a non-object record is malformed and never becomes a model');
});

test('parseVerboseModelRecords throws when the accumulated record text parses to null', () => {
  assert.throws(() => parseVerboseModelRecords('opencode-go/deepseek-v4-flash\nnull\n'),
    'a non-object record is malformed and never becomes a model');
});

test('parseVerboseModelRecords throws when the accumulated record text parses to a string', () => {
  assert.throws(() => parseVerboseModelRecords('opencode-go/deepseek-v4-flash\n"str"\n'),
    'a non-object record is malformed and never becomes a model');
});

test('parseVerboseModelRecords throws when the accumulated record text parses to an array', () => {
  assert.throws(() => parseVerboseModelRecords('opencode-go/deepseek-v4-flash\n[1, 2]\n'),
    'a non-object record is malformed and never becomes a model');
});

test('extractVariants returns the variants keys in JSON object order', () => {
  assert.deepEqual(extractVariants({ variants: { low: {}, high: {}, max: {} } }),
    ['low', 'high', 'max'], 'variant keys become the variant list in JSON object order');
});

test('extractVariants returns an empty list for an empty or absent variants field', () => {
  assert.deepEqual(extractVariants({ variants: {} }), [],
    'an empty variants field exposes no variants');
  assert.deepEqual(extractVariants({}), [],
    'an absent variants field exposes no variants');
});

test('extractVariants throws when variants is an array', () => {
  assert.throws(() => extractVariants({ variants: ['low', 'high'] }),
    'array variants values fail variant discovery instead of array-index variant names');
});

test('extractVariants throws when variants is null', () => {
  assert.throws(() => extractVariants({ variants: null }),
    'null variants values fail variant discovery instead of silently becoming an empty variant set');
});

test('extractVariants throws when variants is a primitive string', () => {
  assert.throws(() => extractVariants({ variants: 'low' }),
    'primitive variants values fail variant discovery instead of silently becoming an empty variant set');
});

// --- Step 2: dependent opencode model-discovery flow ---

// Scripted runner that records raw invocation vectors and serves the catalog
// and verbose stdout fixtures. `runner.calls` holds { executable, args } for
// every invocation in order.
function makeCatalogRunner(catalogStdout, verboseStdout) {
  const calls = [];
  const runner = (executable, args) => {
    calls.push({ executable, args });
    if (args.includes('--verbose')) {
      return { stdout: verboseStdout, status: 0 };
    }
    return { stdout: catalogStdout, status: 0 };
  };
  runner.calls = calls;
  return runner;
}

// Returns true when the options are the legacy combined-frame entries (frozen
// model + ' | ' + frozen effort), which the dependent flow must never present.
function isCombinedFrame(options) {
  return options.length > 0
    && options.every(option => typeof option === 'string' && option.includes(' | '));
}

// Adaptive prompt for the dependent flow: classifies each settings screen by
// its position and option content, asserting the expected shape before
// resolving the scripted selection. Screen positions: 0 provider, 1 model,
// 2 variant. When the adapter still presents the legacy combined frame (the
// RED stub state), the first assertion fails instead of the adapter crashing.
function makeAdaptivePrompt({
  provider = 'opencode-go',
  expectedModels = null,
  model = null,
  variant = null,
  noVariant = false,
} = {}) {
  const screens = [];
  const promptChoice = async (question, options) => {
    screens.push(options);
    const index = screens.length - 1;
    assert.ok(!isCombinedFrame(options),
      `screen ${index} must not be the legacy combined frame: provider→model→variant screens expected`);
    if (index === 0) {
      assert.ok(options.includes(provider), `provider screen should offer ${provider}`);
      return provider;
    }
    if (index === 1) {
      if (expectedModels !== null) {
        assert.deepEqual([...options].sort(), [...expectedModels].sort(),
          `model screen should offer exactly the ${provider} models`);
      }
      return model ?? [...options].sort()[0];
    }
    if (noVariant) {
      const option = options.find(entry => /no variant/i.test(String(entry)));
      assert.ok(option, 'variant screen should offer the Default (no variant) option');
      return option;
    }
    if (variant !== null) {
      assert.ok(options.includes(variant), `variant screen should offer ${variant}`);
      return variant;
    }
    assert.ok(options.length > 0, 'variant screen should offer at least one option');
    return options[0];
  };
  promptChoice.screens = screens;
  return promptChoice;
}

test('full dependent flow presents provider, model, and variant screens in order and builds the variant override', async () => {
  const runner = makeCatalogRunner(
    'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\nopenai/gpt-5.4\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": { "low": {}, "high": {} }\n}\n');
  const prompt = makeAdaptivePrompt({
    provider: 'opencode-go',
    expectedModels: ['deepseek-v4-flash', 'glm-5.2'],
    model: 'deepseek-v4-flash',
    variant: 'high',
  });
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: prompt, runCommand: runner });
  const beforeSelection = snapshotTree(path.join(REPO_ROOT, '.opencode', 'agents'));
  const settings = await adapter.selectSettings('explore');
  assert.equal(prompt.screens.length, 3,
    'the completed dependent flow presents exactly provider, model, and variant screens in order');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'high' },
    'the dependent flow resolves provider, model, and variant into the settings');
  assert.deepEqual(snapshotTree(path.join(REPO_ROOT, '.opencode', 'agents')), beforeSelection,
    'settings selection must not write to the installed agent sources');
});

test('the runner is invoked as argument vectors, never with --refresh, twice in a completed flow', async () => {
  const runner = makeCatalogRunner(
    'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": { "high": {} }\n}\n');
  const prompt = makeAdaptivePrompt({
    provider: 'opencode-go',
    model: 'deepseek-v4-flash',
    variant: 'high',
  });
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: prompt, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'high' },
    'the completed flow resolves the selected variant');
  assert.deepEqual(runner.calls.map(call => call.args),
    [['models'], ['models', 'opencode-go', '--verbose']],
    'the catalog and verbose queries are exact argument vectors in discovery order, never --refresh');
  for (const call of runner.calls) {
    assert.ok(Array.isArray(call.args), 'args are passed as an argument array, never a shell string');
    assert.ok(!call.args.includes('--refresh'), 'the refresh flag is never passed');
    assert.equal(typeof call.executable, 'string', 'the runner receives the executable as a plain string');
  }
});

test('a provider containing shell metacharacters is passed as a single argument-array element', async () => {
  const runner = makeCatalogRunner(
    'open;code/deepseek-v4-flash\n',
    'open;code/deepseek-v4-flash\n{\n  "variants": { "high": {} }\n}\n');
  const prompt = makeAdaptivePrompt({
    provider: 'open;code',
    model: 'deepseek-v4-flash',
    variant: 'high',
  });
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: prompt, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'open;code/deepseek-v4-flash', variant: 'high' },
    'a metacharacter-bearing provider flows through the whole dependent selection');
  const verboseCalls = runner.calls.filter(call => call.args.includes('--verbose'));
  assert.equal(verboseCalls.length, 1, 'the verbose query runs exactly once for the selected model');
  assert.deepEqual(verboseCalls[0].args, ['models', 'open;code', '--verbose'],
    'the provider is a single argument-array element and is never interpreted as command syntax');
});

test('the model screen is scoped to the selected provider from one catalog parse', async () => {
  const runner = makeCatalogRunner(
    'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\nopenai/gpt-5.4\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": { "high": {} }\n}\n');
  const prompt = makeAdaptivePrompt({
    provider: 'opencode-go',
    expectedModels: ['deepseek-v4-flash', 'glm-5.2'],
    variant: 'high',
  });
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: prompt, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'high' },
    'the flow resolves a model belonging to the selected provider');
  const catalogCalls = runner.calls.filter(call => !call.args.includes('--verbose'));
  assert.equal(catalogCalls.length, 1,
    'the model screen is populated from the already-parsed catalog with exactly one catalog launch');
});

test('the provider screen offers distinct providers in first-appearance order', async () => {
  const runner = makeCatalogRunner(
    'openai/gpt-5.4\nopencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": { "high": {} }\n}\n');
  let screenIndex = 0;
  const promptSpy = async (question, options) => {
    if (screenIndex === 0) {
      screenIndex += 1;
      assert.deepEqual(options, ['openai', 'opencode-go'],
        'distinct providers are offered once, in first-appearance order');
      return 'opencode-go';
    }
    if (screenIndex === 1) {
      screenIndex += 1;
      assert.ok(options.includes('deepseek-v4-flash'), 'model screen follows the provider screen');
      return 'deepseek-v4-flash';
    }
    screenIndex += 1;
    assert.ok(options.includes('high'), 'variant screen follows the model screen');
    return 'high';
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'high' },
    'selecting the second provider resolves its model with the full identity');
});

test('non-zero exit from the catalog command cancels with no screens and no settings', async () => {
  let promptCalls = 0;
  const runner = (executable, args) => ({ stdout: '', status: 1 });
  const promptSpy = async () => {
    promptCalls += 1;
    assert.fail(`no provider, model, or variant screen may appear after a catalog failure (got prompt ${promptCalls})`);
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.equal(settings, null, 'a non-zero catalog exit cancels the selection with null');
  assert.equal(promptCalls, 0, 'an early catalog failure presents no settings screens');
});

test('a catalog launch failure reports an actionable diagnostic instead of ending silently', async () => {
  const messages = [];
  const originalError = console.error;
  console.error = message => messages.push(String(message));
  try {
    const runner = () => {
      const error = new Error('spawnSync opencode ENOENT');
      error.code = 'ENOENT';
      throw error;
    };
    const adapter = createOpencodeAdapter({
      repoRoot: REPO_ROOT,
      promptChoice: async () => assert.fail('no selection screen should follow a launch failure'),
      runCommand: runner,
    });

    const settings = await adapter.selectSettings('explore');

    assert.equal(settings, null, 'a launch failure should cancel without settings');
    assert.equal(messages.length, 1, 'the launch failure should produce one diagnostic');
    assert.match(messages[0], /Unable to query OpenCode models.*ENOENT/,
      'the diagnostic should identify the failed operation and preserve the launch error');
  } finally {
    console.error = originalError;
  }
});

test('a malformed catalog line and an empty catalog each cancel with no partial catalog', async () => {
  for (const stdout of ['nope\n', '']) {
    let promptCalls = 0;
    const runner = (executable, args) => ({ stdout, status: 0 });
    const promptSpy = async () => {
      promptCalls += 1;
      assert.fail('no settings screen may be presented from a failed catalog');
    };
    const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
    const settings = await adapter.selectSettings('explore');
    assert.equal(settings, null,
      `catalog stdout ${JSON.stringify(stdout)} must cancel the selection with null`);
    assert.equal(promptCalls, 0, 'a failed catalog never reaches a settings screen');
  }
});

test('verbose-query failure, unparseable verbose output, and an unmatched model cancel after the screens', async () => {
  const cases = [
    { name: 'non-zero verbose exit', verboseStdout: '', verboseStatus: 1 },
    { name: 'unparseable verbose output', verboseStdout: 'not json\n', verboseStatus: 0 },
    { name: 'no record matching the selected model',
      verboseStdout: 'opencode-go/glm-5.2\n{\n  "variants": { "high": {} }\n}\n', verboseStatus: 0 },
  ];
  for (const item of cases) {
    let screenIndex = 0;
    const promptSpy = async (question, options) => {
      if (screenIndex === 0) {
        screenIndex += 1;
        assert.ok(options.includes('opencode-go'), 'provider screen appears before the verbose query');
        return 'opencode-go';
      }
      if (screenIndex === 1) {
        screenIndex += 1;
        assert.ok(options.includes('deepseek-v4-flash'), 'model screen appears before the verbose query');
        return 'deepseek-v4-flash';
      }
      screenIndex += 1;
      assert.fail('no variant screen may appear after the verbose query fails');
    };
    const runner = (executable, args) => args.includes('--verbose')
      ? { stdout: item.verboseStdout, status: item.verboseStatus }
      : { stdout: 'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\n', status: 0 };
    const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
    const settings = await adapter.selectSettings('explore');
    assert.equal(settings, null,
      `${item.name} must cancel the selection with null after the provider and model screens`);
    assert.equal(screenIndex, 2,
      `${item.name} presents exactly the provider and model screens, no further screen`);
  }
});

test('q at the provider screen cancels after exactly one catalog launch', async () => {
  const runner = makeCatalogRunner('opencode-go/deepseek-v4-flash\n', '');
  let promptCalls = 0;
  const promptSpy = async (question, options) => {
    promptCalls += 1;
    assert.ok(options.includes('opencode-go'),
      `prompt ${promptCalls} is the provider screen offering the discovered provider`);
    return 'q';
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.equal(settings, null, 'q at the provider screen cancels the selection with null');
  assert.equal(promptCalls, 1, 'only the provider screen is prompted before q cancels');
  assert.deepEqual(runner.calls.map(call => call.args), [['models']],
    'exactly one catalog launch precedes the provider screen, no verbose query');
});

test('q at the variant screen cancels with no settings after two launches', async () => {
  const runner = makeCatalogRunner(
    'opencode-go/deepseek-v4-flash\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": { "low": {}, "high": {} }\n}\n');
  let screenIndex = 0;
  const promptSpy = async (question, options) => {
    if (screenIndex === 0) {
      screenIndex += 1;
      assert.ok(options.includes('opencode-go'), 'provider screen precedes the variant screen');
      return 'opencode-go';
    }
    if (screenIndex === 1) {
      screenIndex += 1;
      assert.ok(options.includes('deepseek-v4-flash'), 'model screen precedes the variant screen');
      return 'deepseek-v4-flash';
    }
    screenIndex += 1;
    assert.ok(options.includes('high'), 'variant screen offers the discovered variant');
    return 'q';
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.equal(settings, null, 'q at the variant screen cancels the selection with null');
  assert.equal(screenIndex, 3, 'q is answered at the variant screen after the provider and model screens');
  assert.deepEqual(runner.calls.map(call => call.args),
    [['models'], ['models', 'opencode-go', '--verbose']],
    'the verbose query runs before the variant screen, for exactly two launches');
});

test('a model without variants skips the variant screen and yields a model-only override', async () => {
  const runner = makeCatalogRunner(
    'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": {}\n}\n');
  let screenIndex = 0;
  const promptSpy = async (question, options) => {
    if (screenIndex === 0) {
      screenIndex += 1;
      assert.ok(options.includes('opencode-go'), 'provider screen is presented');
      return 'opencode-go';
    }
    if (screenIndex === 1) {
      screenIndex += 1;
      assert.ok(options.includes('deepseek-v4-flash'), 'model screen is presented');
      return 'deepseek-v4-flash';
    }
    screenIndex += 1;
    assert.fail('no variant screen may appear for a model without variants');
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
  const beforeSelection = snapshotTree(path.join(REPO_ROOT, '.opencode', 'agents'));
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash' },
    'a model without variants resolves model with no variant key');
  assert.equal(screenIndex, 2, 'exactly the provider and model screens are presented');
  assert.deepEqual(snapshotTree(path.join(REPO_ROOT, '.opencode', 'agents')), beforeSelection,
    'settings selection must not write to the installed agent sources');
});

test('NO_VARIANT is a symbol distinct from every possible variant string', () => {
  assert.equal(typeof NO_VARIANT, 'symbol',
    'the Default (no variant) sentinel must be a Symbol so it can never equal a variant identifier string');
  for (const value of ['Default', 'default', 'high', 'low', 'max', 'Default (no variant)', '']) {
    assert.notEqual(NO_VARIANT, value,
      `NO_VARIANT must never equal the string ${JSON.stringify(value)}`);
  }
});

test('selecting Default (no variant) omits the variant key from the settings', async () => {
  const runner = makeCatalogRunner(
    'opencode-go/deepseek-v4-flash\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": { "low": {}, "high": {} }\n}\n');
  let screenIndex = 0;
  const promptSpy = async (question, options) => {
    if (screenIndex === 0) {
      screenIndex += 1;
      assert.ok(options.includes('opencode-go'), 'provider screen is presented');
      return 'opencode-go';
    }
    if (screenIndex === 1) {
      screenIndex += 1;
      assert.ok(options.includes('deepseek-v4-flash'), 'model screen is presented');
      return 'deepseek-v4-flash';
    }
    screenIndex += 1;
    const noVariantOption = options.find(entry => /no variant/i.test(String(entry)));
    assert.ok(noVariantOption, 'the variant screen offers the pinned Default (no variant) option');
    return noVariantOption;
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
  const beforeSelection = snapshotTree(path.join(REPO_ROOT, '.opencode', 'agents'));
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash' },
    'the no-variant option resolves model with no variant key');
  assert.deepEqual(snapshotTree(path.join(REPO_ROOT, '.opencode', 'agents')), beforeSelection,
    'settings selection must not write to the installed agent sources');
});

test('a discovered variant literally named Default or default stays selectable and resolves exactly', async () => {
  const cases = [
    { variant: 'default', verbose: 'opencode-go/deepseek-v4-flash\n{\n  "variants": { "default": {}, "high": {} }\n}\n' },
    { variant: 'Default', verbose: 'opencode-go/deepseek-v4-flash\n{\n  "variants": { "Default": {}, "high": {} }\n}\n' },
  ];
  for (const item of cases) {
    let screenIndex = 0;
    const promptSpy = async (question, options) => {
      if (screenIndex === 0) {
        screenIndex += 1;
        assert.ok(options.includes('opencode-go'), 'provider screen is presented');
        return 'opencode-go';
      }
      if (screenIndex === 1) {
        screenIndex += 1;
        assert.ok(options.includes('deepseek-v4-flash'), 'model screen is presented');
        return 'deepseek-v4-flash';
      }
      screenIndex += 1;
      assert.ok(options.includes(item.variant),
        `a discovered variant named ${item.variant} is offered as a selectable option alongside the no-variant option`);
      return item.variant;
    };
    const runner = makeCatalogRunner('opencode-go/deepseek-v4-flash\n', item.verbose);
    const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
    const settings = await adapter.selectSettings('explore');
    assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: item.variant },
      `selecting the discovered variant ${item.variant} carries that exact identifier`);
  }
});

test('a discovered variant whose identifier equals the pinned label renders a distinct display and resolves exactly', async () => {
  const runner = makeCatalogRunner(
    'opencode-go/deepseek-v4-flash\n',
    'opencode-go/deepseek-v4-flash\n{\n  "variants": { "Default (no variant)": {}, "high": {} }\n}\n');
  let screenIndex = 0;
  const promptSpy = async (question, options) => {
    if (screenIndex === 0) {
      screenIndex += 1;
      assert.ok(options.includes('opencode-go'), 'provider screen is presented');
      return 'opencode-go';
    }
    if (screenIndex === 1) {
      screenIndex += 1;
      assert.ok(options.includes('deepseek-v4-flash'), 'model screen is presented');
      return 'deepseek-v4-flash';
    }
    screenIndex += 1;
    const pinned = options.find(entry => /^Default \(no variant\)$/.test(String(entry)));
    assert.ok(pinned, 'the pinned Default (no variant) option is offered unchanged');
    const disambiguated = options.find(entry => /^Default \(no variant\) \(variant\)$/.test(String(entry)));
    assert.ok(disambiguated,
      'a discovered variant matching the pinned label renders with a (variant) disambiguating suffix');
    assert.equal(options.length, 3,
      'the variant screen offers the pinned default, the disambiguated variant, and high');
    return disambiguated;
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy, runCommand: runner });
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'Default (no variant)' },
    'selecting the disambiguated display resolves the exact variant identifier');
});

test('a null selectSettings result returns settings-unavailable without configuring agents', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const fakeAdapter = {
    enumerateWorkers() {
      return OPENCODE_AGENTS;
    },
    async selectSettings() {
      opencodeOps.select.push('called');
      return null;
    },
    createLocalOverride(agentName, settings) {
      opencodeOps.create.push({ agentName, settings });
      return {
        status: 'persisted',
        agent: agentName,
        destination: path.join(REPO_ROOT, '.tmp', 'adapter-spy', `${agentName}.md`),
      };
    },
  };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => fakeAdapter);
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'Workers'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async (...args) => ({ status: 'confirmed', items: args[1] }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'settings-unavailable');
    assert.deepEqual(opencodeOps.select, ['called'], 'selectSettings runs exactly once');
    assert.deepEqual(opencodeOps.create, [],
      'a null selectSettings result must never configure any agent');
    assert.equal(claudeOps.create.length, 0, 'claude must never be configured');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

// --- Step 1: materialize selected harness overrides ---

const CLAUDE_SETTINGS_CATALOG = {
  models: [
    { model: 'opus', efforts: ['low', 'medium', 'high', 'xhigh'] },
    { model: 'sonnet', efforts: ['low', 'medium'] },
  ],
};

const PERSIST_SCRATCH_ROOT = path.join(REPO_ROOT, '.tmp', 'customize-command-models', 'persist-overrides');
const PERSIST_CLAUDE_AGENT = 'sai-1-spec-proposal-worker';
const PERSIST_CLAUDE_AGENT_2 = 'sai-2-design-worker';
const PERSIST_OPENCODE_AGENT = 'explore';
const PERSIST_CLAUDE_COMMAND = 'sai-1-spec';
const PERSIST_OPENCODE_COMMAND = 'sai-explore';

function makePersistenceFixture() {
  fs.mkdirSync(PERSIST_SCRATCH_ROOT, { recursive: true });
  const root = fs.mkdtempSync(path.join(PERSIST_SCRATCH_ROOT, 'case-'));
  const packageRoot = path.join(root, 'package');
  const projectPath = path.join(root, 'project');
  const claudeGlobalRoot = path.join(root, 'claude-global');
  const opencodeGlobalRoot = path.join(root, 'opencode-global');
  const claudeGlobalCommandRoot = path.join(root, 'claude-global-commands');
  const opencodeGlobalCommandRoot = path.join(root, 'opencode-global-commands');
  fs.mkdirSync(path.join(packageRoot, 'sai'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'sai', 'install-manifest.json'),
    path.join(packageRoot, 'sai', 'install-manifest.json')
  );
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(claudeGlobalRoot, { recursive: true });
  fs.mkdirSync(opencodeGlobalRoot, { recursive: true });
  fs.mkdirSync(claudeGlobalCommandRoot, { recursive: true });
  fs.mkdirSync(opencodeGlobalCommandRoot, { recursive: true });
  return {
    root,
    packageRoot,
    projectPath,
    claudeGlobalRoot,
    opencodeGlobalRoot,
    claudeGlobalCommandRoot,
    opencodeGlobalCommandRoot,
  };
}

function writeGlobalAgent(fixture, harness, agent, contents) {
  const root = harness === 'claude' ? fixture.claudeGlobalRoot : fixture.opencodeGlobalRoot;
  fs.writeFileSync(path.join(root, `${agent}.md`), contents);
  // Compatibility source for the pre-Step-1 seam, which still resolves agent
  // bytes from repoRoot. The future contract must use the harness-global copy.
  writePackageAgent(fixture, harness, agent, `package compatibility bytes for ${agent}\n`);
}

function writePackageAgent(fixture, harness, agent, contents) {
  const root = path.join(fixture.packageRoot, 'agents', harness);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, `${agent}.md`), contents);
}

function writeGlobalCommand(fixture, harness, command, contents) {
  const root = harness === 'claude' ? fixture.claudeGlobalCommandRoot : fixture.opencodeGlobalCommandRoot;
  fs.writeFileSync(path.join(root, `${command}.md`), contents);
}

function claudeAgentSource(agent = PERSIST_CLAUDE_AGENT) {
  return [
    '---',
    `name: ${agent}`,
    'description: source-owned description',
    'model: opus',
    'effort: high',
    'color: blue',
    '---',
    '',
    '# Source body',
    'Keep this body byte-identical.',
    '',
  ].join('\n');
}

function opencodeAgentSource(agent = PERSIST_OPENCODE_AGENT) {
  return [
    '---',
    `name: ${agent}`,
    'description: source-owned description',
    'model: opencode-go/old-model',
    'variant: high',
    'color: green',
    '---',
    '',
    '# Source body',
    'Keep this body byte-identical.',
    '',
  ].join('\n');
}

function claudeCommandSource(command = PERSIST_CLAUDE_COMMAND) {
  return [
    '---',
    `name: ${command}`,
    'description: command-owned description',
    'model: opus',
    'effort: high',
    '---',
    '',
    '# Command body',
    'Keep this command body byte-identical.',
    '',
  ].join('\n');
}

function opencodeCommandSource(command = PERSIST_OPENCODE_COMMAND) {
  return [
    '---',
    `name: ${command}`,
    'description: command-owned description',
    'model: opencode-go/old-model',
    'variant: high',
    '---',
    '',
    '# Command body',
    'Keep this command body byte-identical.',
    '',
  ].join('\n');
}

function descriptionOnlyCommandSource(command) {
  return [
    '---',
    'description: fixture command with no tunables',
    '---',
    '',
    `command body of ${command}`,
    '',
  ].join('\n');
}

function chooseClaudeSonnetMedium(options) {
  const labels = options.map(option => String(option));
  const combined = labels.find(label => /sonnet/.test(label) && /medium/.test(label));
  if (combined !== undefined) return combined;
  if (labels.includes('sonnet')) return 'sonnet';
  if (labels.includes('medium')) return 'medium';
  // RED compatibility: let the placeholder frame reach the catalog assertions.
  return options[0];
}

after(() => {
  fs.rmSync(PERSIST_SCRATCH_ROOT, { recursive: true, force: true });
});

test('Step 1 materialize selected harness overrides: manifest roster and harness-specific source roots', () => {
  const fixture = makePersistenceFixture();
  try {
    writePackageAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, 'package-only Claude bytes\n');
    writePackageAgent(fixture, 'opencode', PERSIST_OPENCODE_AGENT, 'package-only OpenCode bytes\n');
    const claude = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });
    const opencode = createOpencodeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.opencodeGlobalRoot,
    });

    assert.ok(claude.enumerateWorkers().includes(PERSIST_CLAUDE_AGENT));
    assert.ok(opencode.enumerateWorkers().includes(PERSIST_OPENCODE_AGENT));
    assert.equal(claude.enumerateWorkers().includes('package-only'), false);
    assert.equal(opencode.enumerateWorkers().includes('package-only'), false);

    const missing = claude.createLocalOverride(PERSIST_CLAUDE_AGENT, {
      model: 'sonnet',
      effort: 'medium',
    });
    assert.equal(missing.status, 'skipped',
      'a missing harness-global source must not fall back to package-bundled agent bytes');
    assert.equal(missing.reason, 'missing-source');
    assert.equal(
      fs.existsSync(path.join(fixture.projectPath, '.claude', 'agents', `${PERSIST_CLAUDE_AGENT}.md`)),
      false
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 1 materialize selected harness overrides: initial Claude materialization clones and retunes the installed source', () => {
  const fixture = makePersistenceFixture();
  try {
    const source = claudeAgentSource();
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, source);
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      settingsCatalog: CLAUDE_SETTINGS_CATALOG,
    });
    const destination = path.join(
      fixture.projectPath,
      '.claude',
      'agents',
      `${PERSIST_CLAUDE_AGENT}.md`
    );

    const result = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, {
      model: 'sonnet',
      effort: 'medium',
    });

    assert.equal(result.status, 'persisted');
    assert.equal(result.agent, PERSIST_CLAUDE_AGENT);
    assert.equal(result.destination, destination);
    assert.equal(
      fs.readFileSync(destination, 'utf8'),
      source.replace('model: opus', 'model: sonnet').replace('effort: high', 'effort: medium'),
      'the clone preserves the source body and unrelated frontmatter while applying Claude tunables'
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 1 materialize selected harness overrides: existing Claude content is updated without an installed source', () => {
  const fixture = makePersistenceFixture();
  try {
    const destination = path.join(
      fixture.projectPath,
      '.claude',
      'agents',
      `${PERSIST_CLAUDE_AGENT}.md`
    );
    const existing = claudeAgentSource();
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, existing);
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });

    const result = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, {
      model: 'sonnet',
      effort: 'medium',
    });

    assert.equal(result.status, 'persisted');
    assert.equal(
      fs.readFileSync(destination, 'utf8'),
      existing.replace('model: opus', 'model: sonnet').replace('effort: high', 'effort: medium'),
      'only the top-level Claude tunable lines change when the local file is user-owned'
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 1 materialize selected harness overrides: OpenCode selection is in-memory and materialization is harness-local', async () => {
  const fixture = makePersistenceFixture();
  try {
    const source = opencodeAgentSource();
    writeGlobalAgent(fixture, 'opencode', PERSIST_OPENCODE_AGENT, source);
    writePackageAgent(fixture, 'opencode', PERSIST_OPENCODE_AGENT, 'package-only OpenCode bytes\n');
    const runner = makeCatalogRunner(
      'opencode-go/deepseek-v4-flash\n',
      'opencode-go/deepseek-v4-flash\n{\n  "variants": { "high": {} }\n}\n'
    );
    const prompt = makeAdaptivePrompt({
      provider: 'opencode-go',
      model: 'deepseek-v4-flash',
      variant: 'high',
    });
    const beforeSelection = snapshotTree(fixture.root);
    const adapter = createOpencodeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.opencodeGlobalRoot,
      promptChoice: prompt,
      runCommand: runner,
    });
    const settings = await adapter.selectSettings(PERSIST_OPENCODE_AGENT);
    assert.deepEqual(settings, {
      model: 'opencode-go/deepseek-v4-flash',
      variant: 'high',
    });
    assert.deepEqual(snapshotTree(fixture.root), beforeSelection,
      'OpenCode settings selection must not materialize or rewrite files');

    const result = adapter.createLocalOverride(PERSIST_OPENCODE_AGENT, {
      model: 'opencode-go/glm-5.2',
    });
    const destination = path.join(
      fixture.projectPath,
      '.opencode',
      'agents',
      `${PERSIST_OPENCODE_AGENT}.md`
    );
    assert.equal(result.status, 'persisted');
    assert.equal(result.destination, destination);
    assert.equal(
      fs.readFileSync(destination, 'utf8'),
      source.replace('model: opencode-go/old-model', 'model: opencode-go/glm-5.2')
        .replace('variant: high\n', ''),
      'OpenCode tunables use the OpenCode destination and remove an old variant when none is selected'
    );
    assert.equal(fs.existsSync(path.join(fixture.projectPath, '.claude')), false);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 1 materialize selected harness overrides: Claude selection honors the catalog and unavailable catalogs do not write', async () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, claudeAgentSource());
    const frames = [];
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      settingsCatalog: CLAUDE_SETTINGS_CATALOG,
      promptChoice: async (question, options) => {
        frames.push(options);
        return chooseClaudeSonnetMedium(options);
      },
    });
    const settings = await adapter.selectSettings(PERSIST_CLAUDE_AGENT);
    const labels = frames.flat().map(option => String(option)).join('\n');
    for (const value of ['opus', 'sonnet', 'low', 'medium', 'high', 'xhigh']) {
      assert.match(labels, new RegExp(value), `the Claude settings frame displays ${value}`);
    }
    assert.deepEqual(settings, { model: 'sonnet', effort: 'medium' });
    const result = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, settings);
    assert.equal(result.status, 'persisted');
    assert.match(
      fs.readFileSync(path.join(fixture.projectPath, '.claude', 'agents', `${PERSIST_CLAUDE_AGENT}.md`), 'utf8'),
      /model: sonnet\neffort: medium/
    );

    const unavailableBefore = snapshotTree(fixture.projectPath);
    const unavailable = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      settingsCatalog: { models: [] },
      promptChoice: async () => assert.fail('an unavailable catalog must not open a settings prompt'),
    });
    assert.equal(await unavailable.selectSettings(PERSIST_CLAUDE_AGENT), null);
    assert.deepEqual(snapshotTree(fixture.projectPath), unavailableBefore);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 1 materialize selected harness overrides: confirmed subsets, empty selections, cancellation, and non-TTY runs constrain writes', async () => {
  const fixture = makePersistenceFixture();
  const originalClaude = modelCustomization.createClaudeAdapter;
  const originalOpencode = modelCustomization.createOpencodeAdapter;
  try {
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, claudeAgentSource());
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT_2, claudeAgentSource(PERSIST_CLAUDE_AGENT_2));
    const restoreClaude = patchFactory('createClaudeAdapter', deps => originalClaude({
      ...deps,
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      settingsCatalog: CLAUDE_SETTINGS_CATALOG,
      promptChoice: deps.promptChoice,
    }));
    const restoreOpencode = patchFactory('createOpencodeAdapter', deps => originalOpencode({
      ...deps,
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.opencodeGlobalRoot,
    }));
    try {
      const answers = ['Customize models', 'Claude Code', 'Workers'];
      const promptChoice = async (question, options) => {
        if (answers.length > 0) return answers.shift();
        if (question === 'Post-setup customization:') return 'Exit';
        return chooseClaudeSonnetMedium(options);
      };
      const selectedBefore = snapshotTree(fixture.projectPath);
      const completed = await runPostSetupMenu({
        projectPath: fixture.projectPath,
        isTTY: true,
        promptChoice,
        promptChecklist: async () => ({ status: 'confirmed', items: [PERSIST_CLAUDE_AGENT] }),
      });
       assert.equal(completed && completed.status, 'skipped');
       assert.equal(completed && completed.reason, 'cancelled');
      assert.equal(
        fs.existsSync(path.join(fixture.projectPath, '.claude', 'agents', `${PERSIST_CLAUDE_AGENT}.md`)),
        true
      );
      assert.equal(
        fs.existsSync(path.join(fixture.projectPath, '.claude', 'agents', `${PERSIST_CLAUDE_AGENT_2}.md`)),
        false,
        'deselected agents must not be materialized'
      );
      assert.notDeepEqual(snapshotTree(fixture.projectPath), selectedBefore);

      const emptyBefore = snapshotTree(fixture.projectPath);
      const emptyAnswers = ['Customize models', 'Claude Code', 'Workers'];
      let emptyChecklistCalls = 0;
      const empty = await runPostSetupMenu({
        projectPath: fixture.projectPath,
        isTTY: true,
        promptChoice: async () => emptyAnswers.shift(),
        promptChecklist: async () => {
          emptyChecklistCalls += 1;
          return emptyChecklistCalls === 1
            ? { status: 'confirmed', items: [] }
            : { status: 'cancelled' };
        },
      });
      assert.equal(empty.status, 'skipped');
      assert.equal(empty.reason, 'cancelled');
      assert.equal(emptyChecklistCalls, 2, 'an empty confirmation keeps the checklist open');
      assert.deepEqual(snapshotTree(fixture.projectPath), emptyBefore);

      const cancelledBefore = snapshotTree(fixture.projectPath);
      const cancelledAnswers = ['Customize models', 'Claude Code', 'Workers'];
      const cancelled = await runPostSetupMenu({
        projectPath: fixture.projectPath,
        isTTY: true,
        promptChoice: async () => cancelledAnswers.shift(),
        promptChecklist: async () => ({ status: 'cancelled' }),
      });
      assert.equal(cancelled.status, 'skipped');
      assert.equal(cancelled.reason, 'cancelled');
      assert.deepEqual(snapshotTree(fixture.projectPath), cancelledBefore);

      const nonTtyBefore = snapshotTree(fixture.projectPath);
      const nonTty = await runPostSetupMenu({
        projectPath: fixture.projectPath,
        isTTY: false,
        promptChoice: async () => assert.fail('non-TTY execution must not prompt'),
      });
      assert.equal(nonTty.status, 'skipped');
      assert.equal(nonTty.reason, 'non-tty');
      assert.deepEqual(snapshotTree(fixture.projectPath), nonTtyBefore);
    } finally {
      restoreClaude();
      restoreOpencode();
    }
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 1 materialize selected harness overrides: missing sources are per-agent soft failures and repeated settings preserve bytes', () => {
  const fixture = makePersistenceFixture();
  try {
    writePackageAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, 'package fallback must not be used\n');
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT_2, claudeAgentSource(PERSIST_CLAUDE_AGENT_2));
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });
    const missing = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, {
      model: 'sonnet',
      effort: 'medium',
    });
    const persisted = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT_2, {
      model: 'sonnet',
      effort: 'medium',
    });
    const destination = path.join(
      fixture.projectPath,
      '.claude',
      'agents',
      `${PERSIST_CLAUDE_AGENT_2}.md`
    );
     assert.equal(
       fs.existsSync(destination),
       true,
       'the persisted destination must exist before byte-preservation checks'
     );
     const firstBytes = fs.readFileSync(destination);
    const repeated = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT_2, {
      model: 'sonnet',
      effort: 'medium',
    });

    assert.deepEqual(missing, {
      status: 'skipped',
      agent: PERSIST_CLAUDE_AGENT,
      reason: 'missing-source',
      diagnostic: `Skipped ${PERSIST_CLAUDE_AGENT}: installed source is unavailable.`,
    });
    assert.equal(persisted.status, 'persisted');
    assert.equal(repeated.status, 'persisted');
    assert.deepEqual(fs.readFileSync(destination), firstBytes,
      'repeating the same settings leaves the local override byte-identical');
    assert.equal(
      fs.existsSync(path.join(fixture.projectPath, '.claude', 'agents', `${PERSIST_CLAUDE_AGENT}.md`)),
      false
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 1 materialize selected harness overrides: atomic write and Windows rename failures preserve the destination and clean temporary files', () => {
  const fixture = makePersistenceFixture();
  const originalRename = fs.renameSync;
  try {
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, claudeAgentSource());
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });
    const destination = path.join(
      fixture.projectPath,
      '.claude',
      'agents',
      `${PERSIST_CLAUDE_AGENT}.md`
    );
    fs.renameSync = (from, to, ...rest) => {
      if (to === destination) throw new Error('simulated atomic rename failure');
      return originalRename(from, to, ...rest);
    };
    const initial = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, {
      model: 'sonnet',
      effort: 'medium',
    });
    assert.equal(initial.status, 'persistence-failed');
    assert.equal(fs.existsSync(destination), false);
    assert.deepEqual(snapshotTree(path.dirname(destination)), {});
    fs.renameSync = (from, to, ...rest) => {
      if (to === destination) throw new Error('simulated Windows existing-file rename failure');
      return originalRename(from, to, ...rest);
    };
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const existing = claudeAgentSource().replace('model: opus', 'model: sonnet').replace('effort: high', 'effort: low');
    fs.writeFileSync(destination, existing);
    const beforeExistingFailure = snapshotTree(path.dirname(destination));
    const existingFailure = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, {
      model: 'opus',
      effort: 'xhigh',
    });
    assert.equal(existingFailure.status, 'persistence-failed');
    assert.deepEqual(snapshotTree(path.dirname(destination)), beforeExistingFailure,
      'a failed Windows replacement must not delete or alter the existing destination');
  } finally {
    fs.renameSync = originalRename;
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

// --- Step 2: Claude model catalog and model-only persistence ---

function requireClaudeInterface(name, value) {
  assert.equal(typeof value, 'function', `${name} must be exposed as a callable interface`);
  return value;
}

test('Step 2 Claude catalog contains the current models and per-model effort set', () => {
  const efforts = ['low', 'medium', 'high', 'xhigh', 'max'];
  for (const model of ['opus', 'sonnet', 'fable']) {
    const matches = EXPORTED_CLAUDE_SETTINGS_CATALOG.models.filter(entry => entry.model === model);
    assert.equal(matches.length, 1, `${model} appears exactly once in the Claude catalog`);
    assert.deepEqual(matches[0].efforts, efforts,
      `${model} exposes the complete current Claude effort set`);
  }

  const haiku = EXPORTED_CLAUDE_SETTINGS_CATALOG.models.find(entry => entry.model === 'haiku');
  assert.ok(haiku, 'haiku appears in the Claude catalog');
  assert.equal(Object.hasOwn(haiku, 'efforts'), false,
    'haiku is a model-only catalog entry without an efforts array');
});

test('Step 2 Claude settings entries render concrete model-effort pairs and model-only entries', () => {
  const buildEntries = requireClaudeInterface('buildClaudeSettingsEntries', buildClaudeSettingsEntries);
  const entries = buildEntries(EXPORTED_CLAUDE_SETTINGS_CATALOG);
  const sonnetMedium = entries.find(entry => entry.model === 'sonnet' && entry.effort === 'medium');
  const haiku = entries.find(entry => entry.model === 'haiku');

  assert.deepEqual(sonnetMedium, {
    display: 'sonnet | medium',
    model: 'sonnet',
    effort: 'medium',
  });
  assert.deepEqual(haiku, { display: 'haiku', model: 'haiku' });
  assert.ok(entries.every(entry => !/[<>](?:model|effort)[>]/.test(entry.display)),
    'rendered options never contain model or effort placeholders');

  const modelOnlyCatalog = {
    models: [
      { model: 'paired', efforts: ['low'] },
      { model: 'plain' },
    ],
  };
  assert.deepEqual(buildEntries(modelOnlyCatalog), [
    { display: 'paired | low', model: 'paired', effort: 'low' },
    { display: 'plain', model: 'plain' },
  ], 'a model-only entry never borrows an effort from another catalog entry');
});

test('Step 2 Claude pair validation is bounded by each model catalog entry', () => {
  const isPair = requireClaudeInterface('isClaudeSettingsPair', isClaudeSettingsPair);
  const catalog = {
    models: [
      { model: 'paired', efforts: ['low'] },
      { model: 'plain' },
    ],
  };

  assert.equal(isPair(catalog, { model: 'paired', effort: 'low' }), true);
  assert.equal(isPair(catalog, { model: 'plain' }), true);
  assert.equal(isPair(catalog, { model: 'plain', effort: 'low' }), false);
  assert.equal(isPair(catalog, { model: 'paired', effort: 'high' }), false);
});

test('Step 2 Claude selection returns concrete effort and model-only settings without placeholders', async () => {
  const selectSettings = requireClaudeInterface('selectClaudeSettings', selectClaudeSettings);
  const effortOptions = [];
  const effortSettings = await selectSettings(
    'selected Claude agents',
    async (question, options) => {
      effortOptions.push(options);
      assert.ok(options.includes('sonnet | medium'));
      assert.ok(options.includes('haiku'));
      assert.ok(options.every(option => !/[<>](?:model|effort)[>]/.test(option)));
      return 'sonnet | medium';
    },
    EXPORTED_CLAUDE_SETTINGS_CATALOG
  );
  assert.deepEqual(effortSettings, { model: 'sonnet', effort: 'medium' });
  assert.equal(effortOptions.length, 1, 'one Claude settings selection frame is presented');

  const modelOnlySettings = await selectSettings(
    'selected Claude agents',
    async (question, options) => {
      assert.ok(options.includes('haiku'));
      return 'haiku';
    },
    EXPORTED_CLAUDE_SETTINGS_CATALOG
  );
  assert.deepEqual(modelOnlySettings, { model: 'haiku' });
  assert.equal(Object.hasOwn(modelOnlySettings, 'effort'), false,
    'a model-only selection does not manufacture an effort');
});

test('Step 2 unavailable or invalid Claude catalogs return no settings and perform no agent write', async () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, claudeAgentSource());
    for (const settingsCatalog of [
      null,
      { models: [] },
      { models: [{ model: 'haiku', efforts: 'not-an-array' }] },
    ]) {
      const before = snapshotTree(fixture.projectPath);
      const adapter = createClaudeAdapter({
        repoRoot: fixture.packageRoot,
        projectPath: fixture.projectPath,
        packageRoot: fixture.packageRoot,
        globalAgentRoot: fixture.claudeGlobalRoot,
        settingsCatalog,
        promptChoice: async () => assert.fail('an unavailable catalog must not prompt or write an agent'),
      });
      assert.equal(await adapter.selectSettings(PERSIST_CLAUDE_AGENT), null,
        `catalog ${JSON.stringify(settingsCatalog)} produces no settings`);
      assert.deepEqual(snapshotTree(fixture.projectPath), before,
        'an unavailable catalog leaves the project without agent writes');
    }
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 2 first Claude materialization clones the source, preserves unrelated frontmatter and body, and omits effort for haiku', () => {
  const fixture = makePersistenceFixture();
  try {
    const source = claudeAgentSource();
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, source);
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });
    const result = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, { model: 'haiku' });
    const destination = path.join(
      fixture.projectPath,
      '.claude',
      'agents',
      `${PERSIST_CLAUDE_AGENT}.md`
    );

    assert.equal(result.status, 'persisted');
    assert.equal(result.destination, destination);
    assert.equal(
      fs.readFileSync(destination, 'utf8'),
      source.replace('model: opus', 'model: haiku').replace('effort: high\n', ''),
      'first materialization preserves source bytes except the selected Claude tunables'
    );
    assert.doesNotMatch(fs.readFileSync(destination, 'utf8'), /^effort:/m,
      'haiku materialization omits the top-level effort line');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 2 a Claude budget agent is a customization target: haiku override omits effort and leaves the global seed unchanged', () => {
  const fixture = makePersistenceFixture();
  const budgetAgent = 'budget-explorer';
  try {
    const source = claudeAgentSource(budgetAgent);
    writeGlobalAgent(fixture, 'claude', budgetAgent, source);
    const globalSeedPath = path.join(fixture.claudeGlobalRoot, `${budgetAgent}.md`);
    const globalBefore = fs.readFileSync(globalSeedPath);
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });
    assert.ok(adapter.enumerateWorkers().includes(budgetAgent),
      'the customization menu should offer the budget-explorer agent');

    const result = adapter.createLocalOverride(budgetAgent, { model: 'haiku' });
    const destination = path.join(fixture.projectPath, '.claude', 'agents', `${budgetAgent}.md`);
    assert.equal(result.status, 'persisted');
    assert.equal(result.destination, destination);
    const written = fs.readFileSync(destination, 'utf8');
    assert.match(written, /^model: haiku$/m,
      'the project-local override should pin model: haiku');
    assert.doesNotMatch(written, /^effort:/m,
      'the project-local override must omit the top-level effort line');
    assert.deepEqual(fs.readFileSync(globalSeedPath), globalBefore,
      'the user-global seed must remain byte-unchanged');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 2 existing Claude customization preserves body and non-tunable frontmatter while removing only top-level effort for haiku', () => {
  const fixture = makePersistenceFixture();
  try {
    const destination = path.join(
      fixture.projectPath,
      '.claude',
      'agents',
      `${PERSIST_CLAUDE_AGENT}.md`
    );
    const existing = claudeAgentSource().replace(
      '# Source body',
      '# Source body\nBody text retains the word effort: high.'
    );
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, existing);
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });

    const result = adapter.createLocalOverride(PERSIST_CLAUDE_AGENT, { model: 'haiku' });
    assert.equal(result.status, 'persisted');
    assert.equal(
      fs.readFileSync(destination, 'utf8'),
      existing.replace('model: opus', 'model: haiku').replace('effort: high\n', ''),
      'existing local prompt content and non-tunable frontmatter remain unchanged'
    );
    assert.match(fs.readFileSync(destination, 'utf8'), /Body text retains the word effort: high\./);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 2 frontmatter patch persists both Claude tunables only when effort is selected', () => {
  const patch = requireClaudeInterface('patchFrontmatter', patchFrontmatter);
  const source = claudeAgentSource();
  assert.equal(
    patch(source, ['model', 'effort'], { model: 'sonnet', effort: 'medium' }),
    source.replace('model: opus', 'model: sonnet').replace('effort: high', 'effort: medium')
  );
  assert.equal(
    patch(source, ['model', 'effort'], { model: 'haiku' }),
    source.replace('model: opus', 'model: haiku').replace('effort: high\n', '')
  );
});

test('Step 2 OpenCode keeps its independent optional-variant contract while Claude omits effort for haiku', () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalAgent(fixture, 'claude', PERSIST_CLAUDE_AGENT, claudeAgentSource());
    writeGlobalAgent(fixture, 'opencode', PERSIST_OPENCODE_AGENT, opencodeAgentSource());
    const claude = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
    });
    const opencode = createOpencodeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.opencodeGlobalRoot,
    });

    const claudeResult = claude.createLocalOverride(PERSIST_CLAUDE_AGENT, { model: 'haiku' });
    const opencodeResult = opencode.createLocalOverride(PERSIST_OPENCODE_AGENT, {
      model: 'opencode-go/new-model',
    });
    assert.equal(claudeResult.status, 'persisted');
    assert.equal(opencodeResult.status, 'persisted');
    assert.match(
      fs.readFileSync(claudeResult.destination, 'utf8'),
      /^model: haiku$/m
    );
    assert.doesNotMatch(fs.readFileSync(claudeResult.destination, 'utf8'), /^effort:/m);
    assert.match(
      fs.readFileSync(opencodeResult.destination, 'utf8'),
      /^model: opencode-go\/new-model$/m
    );
    assert.doesNotMatch(fs.readFileSync(opencodeResult.destination, 'utf8'), /^variant:/m,
      'OpenCode continues to omit its optional variant when none is selected');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('Step 2 non-empty Claude subsets select settings once and apply the same model-only settings once per selected agent', async () => {
  const claudeOps = { select: [], create: [] };
  const opencodeOps = { select: [], create: [] };
  const restoreClaude = patchFactory('createClaudeAdapter', () =>
    makeFakeAdapter(CLAUDE_AGENTS, claudeOps, { model: 'haiku' }));
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const selected = [CLAUDE_AGENTS[0], CLAUDE_AGENTS[2]];
  try {
    const answers = ['Customize models', 'Claude Code', 'Workers', 'Exit'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift(),
      promptChecklist: async () => ({ status: 'confirmed', items: selected }),
    });

    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(claudeOps.select, [selected.join(', ')]);
    assert.deepEqual(claudeOps.create.map(entry => entry.target.name), selected);
    assert.deepEqual(claudeOps.create.map(entry => entry.settings), [
      { model: 'haiku' },
      { model: 'haiku' },
    ], 'the same settings object shape, without effort, is applied to every selected agent');
    assert.deepEqual(opencodeOps.select, []);
    assert.deepEqual(opencodeOps.create, []);
  } finally {
    restoreClaude();
    restoreOpencode();
  }
});

test('customization inventory is matrix-derived: exactly eleven worker agents per harness in the manifest', () => {
  const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
  const manifest = loadInstallManifest(REPO_ROOT);
  const workers = [
    'sai-1-spec-proposal-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-4-red-worker',
    'sai-4-green-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
    'sai-archive-worker',
    'sai-backfill-worker',
    'sai-commit-worker',
  ];
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = {
      commands: path.join(REPO_ROOT, '.tmp', 'collapse-sai-worker-matrix', `customization-inventory-${harness}`, 'commands'),
      sai: path.join(REPO_ROOT, '.tmp', 'collapse-sai-worker-matrix', `customization-inventory-${harness}`, 'sai'),
      skills: path.join(REPO_ROOT, '.tmp', 'collapse-sai-worker-matrix', `customization-inventory-${harness}`, 'skills'),
      agents: path.join(REPO_ROOT, '.tmp', 'collapse-sai-worker-matrix', `customization-inventory-${harness}`, 'agents'),
      config: path.join(REPO_ROOT, '.tmp', 'collapse-sai-worker-matrix', `customization-inventory-${harness}`),
      root: path.join(REPO_ROOT, '.tmp', 'collapse-sai-worker-matrix', `customization-inventory-${harness}`),
    };
    try {
      const active = expandInstallManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot });
      const agentNames = active
        .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents) &&
          workers.includes(path.basename(projection.destinationPath, '.md')))
        .map(projection => path.basename(projection.destinationPath, '.md'));
      assert.equal(agentNames.length, 12,
        `${harness} customization inventory should contain exactly twelve matrix managed agents`);
      assert.deepEqual(agentNames.sort(), [...workers].sort(),
        `${harness} customization inventory should be exactly the twelve worker identities`);
      assert.equal(agentNames.some(name => ['budget', 'executor', 'explore'].includes(name)), false,
        `${harness} customization inventory must not include support agents as matrix worker inventory`);
      const allAgentNames = active
        .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents))
        .map(projection => path.basename(projection.destinationPath, '.md'));
      if (harness === 'claude') {
        assert.equal(allAgentNames.some(name => ['budget', 'executor', 'explore'].includes(name)), false,
          'claude customization inventory should not include the opencode-only generic basenames');
        assert.equal(allAgentNames.length, 15,
          'claude customization inventory should contain exactly fifteen managed agents: twelve workers plus the three budget agents');
        assert.ok(['budget-executor', 'budget-explorer', 'budget-subagent'].every(name => allAgentNames.includes(name)),
          'claude customization inventory should include the three budget agents');
      } else {
        assert.equal(['budget', 'executor', 'explore'].every(name => allAgentNames.includes(name)), true,
          'opencode customization inventory should keep its three support agents beside the matrix agents');
      }
    } finally {
      fs.rmSync(destinationRoot.root, { recursive: true, force: true });
    }
  }
});

// --- Step 5: command-family override persistence ---

// Command targets reach createLocalOverride as { family, name } records; the
// family value mirrors the stable prefix rendered by the All-scope checklist
// ('command:<name>' rows -> family 'command', 'worker:<name>' rows -> family
// 'worker'). Every fixture run injects the scratch command roots so patch
// sources resolve inside the fixture and never touch the real home command
// directories.

test('claude command createLocalOverride persists the selected model and effort under .claude/commands', () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalCommand(fixture, 'claude', PERSIST_CLAUDE_COMMAND, claudeCommandSource());
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      globalCommandRoot: fixture.claudeGlobalCommandRoot,
    });
    const result = adapter.createLocalOverride(
      { family: 'command', name: PERSIST_CLAUDE_COMMAND },
      { model: 'sonnet', effort: 'medium' }
    );
    assert.equal(result.status, 'persisted');
    assert.equal(
      result.destination,
      path.join(fixture.projectPath, '.claude', 'commands', `${PERSIST_CLAUDE_COMMAND}.md`),
      'a claude command override persists under .claude/commands, never the agents directory'
    );
    assert.match(
      fs.readFileSync(result.destination, 'utf8'),
      /model: sonnet\neffort: medium/
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('opencode command createLocalOverride persists the selected model and optional variant under .opencode/commands', () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalCommand(fixture, 'opencode', PERSIST_OPENCODE_COMMAND, opencodeCommandSource());
    const adapter = createOpencodeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.opencodeGlobalRoot,
      globalCommandRoot: fixture.opencodeGlobalCommandRoot,
    });
    const result = adapter.createLocalOverride(
      { family: 'command', name: PERSIST_OPENCODE_COMMAND },
      { model: 'opencode-go/glm-5.2', variant: 'high' }
    );
    assert.equal(result.status, 'persisted');
    assert.equal(
      result.destination,
      path.join(fixture.projectPath, '.opencode', 'commands', `${PERSIST_OPENCODE_COMMAND}.md`),
      'an opencode command override persists under .opencode/commands, never the agents directory'
    );
    assert.match(
      fs.readFileSync(result.destination, 'utf8'),
      /model: opencode-go\/glm-5\.2\nvariant: high/
    );
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('a command frontmatter lacking tunable keys gains the selected model and effort or variant', () => {
  for (const harness of ['claude', 'opencode']) {
    const fixture = makePersistenceFixture();
    try {
      const command = harness === 'claude' ? PERSIST_CLAUDE_COMMAND : PERSIST_OPENCODE_COMMAND;
      writeGlobalCommand(fixture, harness, command, descriptionOnlyCommandSource(command));
      const createAdapter = harness === 'claude' ? createClaudeAdapter : createOpencodeAdapter;
      const adapter = createAdapter({
        repoRoot: fixture.packageRoot,
        projectPath: fixture.projectPath,
        packageRoot: fixture.packageRoot,
        globalAgentRoot: harness === 'claude' ? fixture.claudeGlobalRoot : fixture.opencodeGlobalRoot,
        globalCommandRoot: harness === 'claude' ? fixture.claudeGlobalCommandRoot : fixture.opencodeGlobalCommandRoot,
      });
      const settings = harness === 'claude'
        ? { model: 'sonnet', effort: 'medium' }
        : { model: 'opencode-go/glm-5.2', variant: 'high' };
      const result = adapter.createLocalOverride({ family: 'command', name: command }, settings);
      assert.equal(result.status, 'persisted',
        `${harness}: a description-only command source is persisted`);
      const written = fs.readFileSync(result.destination, 'utf8');
      assert.match(written, /^model: (sonnet|opencode-go\/glm-5\.2)$/m,
        `${harness}: the selected model key is pinned into the command without a tunable key`);
      if (harness === 'claude') {
        assert.match(written, /^effort: medium$/m,
          'claude gains the selected effort key');
      } else {
        assert.match(written, /^variant: high$/m,
          'opencode gains the selected variant key');
      }
      assert.match(written, /^description: fixture command with no tunables$/m,
        `${harness}: the pre-existing description line is preserved`);
      assert.match(written, new RegExp(`command body of ${command}`),
        `${harness}: the body is preserved`);

      if (harness === 'opencode') {
        const modelOnly = adapter.createLocalOverride(
          { family: 'command', name: command },
          { model: 'opencode-go/deepseek-v4-flash' }
        );
        assert.equal(modelOnly.status, 'persisted');
        const modelOnlyWritten = fs.readFileSync(modelOnly.destination, 'utf8');
        assert.match(modelOnlyWritten, /^model: opencode-go\/deepseek-v4-flash$/m);
        assert.doesNotMatch(modelOnlyWritten, /^variant:/m,
          'opencode does not fabricate a variant key when none is selected');
      }
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test('an existing project-local command is read and patched in place, preserving its body and non-tunable frontmatter', () => {
  const fixture = makePersistenceFixture();
  try {
    const destination = path.join(
      fixture.projectPath,
      '.claude',
      'commands',
      `${PERSIST_CLAUDE_COMMAND}.md`
    );
    const existing = claudeCommandSource().replace(
      '# Command body',
      '# Command body\nLocal command body line kept verbatim.'
    );
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, existing);
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      globalCommandRoot: fixture.claudeGlobalCommandRoot,
    });
    const result = adapter.createLocalOverride(
      { family: 'command', name: PERSIST_CLAUDE_COMMAND },
      { model: 'sonnet', effort: 'medium' }
    );
    assert.equal(result.status, 'persisted');
    assert.equal(result.destination, destination,
      'the existing project-local command file is patched in place');
    assert.equal(
      fs.readFileSync(destination, 'utf8'),
      existing.replace('model: opus', 'model: sonnet').replace('effort: high', 'effort: medium'),
      'only the top-level Claude tunable lines change when the command file is user-owned'
    );
    assert.match(fs.readFileSync(destination, 'utf8'), /Local command body line kept verbatim\./);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('a command declaring a model outside the settings catalog is retuned to the selected catalog value and reported persisted', () => {
  const fixture = makePersistenceFixture();
  try {
    const source = [
      '---',
      'description: command with a legacy model pin',
      'model: legacy-unknown-model',
      '---',
      '',
      'legacy-model command body',
      '',
    ].join('\n');
    writeGlobalCommand(fixture, 'claude', PERSIST_CLAUDE_COMMAND, source);
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      globalCommandRoot: fixture.claudeGlobalCommandRoot,
      settingsCatalog: CLAUDE_SETTINGS_CATALOG,
    });
    const result = adapter.createLocalOverride(
      { family: 'command', name: PERSIST_CLAUDE_COMMAND },
      { model: 'sonnet', effort: 'medium' }
    );
    assert.equal(result.status, 'persisted',
      'a command whose declared model is not in the catalog is still persisted with the selected value');
    const written = fs.readFileSync(result.destination, 'utf8');
    assert.match(written, /^model: sonnet$/m,
      'the declared non-catalog model is replaced by the selected catalog value');
    assert.match(written, /^effort: medium$/m);
    assert.match(written, /legacy-model command body/, 'the body is preserved');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('confirming the haiku catalog entry removes an existing top-level effort line from a command while preserving non-tunable content', () => {
  const fixture = makePersistenceFixture();
  try {
    writeGlobalCommand(fixture, 'claude', PERSIST_CLAUDE_COMMAND, claudeCommandSource());
    const adapter = createClaudeAdapter({
      repoRoot: fixture.packageRoot,
      projectPath: fixture.projectPath,
      packageRoot: fixture.packageRoot,
      globalAgentRoot: fixture.claudeGlobalRoot,
      globalCommandRoot: fixture.claudeGlobalCommandRoot,
    });
    const result = adapter.createLocalOverride(
      { family: 'command', name: PERSIST_CLAUDE_COMMAND },
      { model: 'haiku' }
    );
    assert.equal(result.status, 'persisted');
    const written = fs.readFileSync(result.destination, 'utf8');
    assert.doesNotMatch(written, /^effort:/m,
      'the model-only haiku selection removes the top-level effort line');
    assert.match(written, /^model: haiku$/m);
    assert.match(written, /^description: command-owned description$/m,
      'non-tunable frontmatter is preserved');
    assert.match(written, /# Command body/, 'the body is preserved');
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('command patch sources resolve through the injected global command roots and never mutate the global directories', () => {
  for (const harness of ['claude', 'opencode']) {
    const fixture = makePersistenceFixture();
    try {
      const command = harness === 'claude' ? PERSIST_CLAUDE_COMMAND : PERSIST_OPENCODE_COMMAND;
      const source = harness === 'claude' ? claudeCommandSource() : opencodeCommandSource();
      writeGlobalCommand(fixture, harness, command, source);
      const globalCommandRoot = harness === 'claude' ? fixture.claudeGlobalCommandRoot : fixture.opencodeGlobalCommandRoot;
      const globalAgentRoot = harness === 'claude' ? fixture.claudeGlobalRoot : fixture.opencodeGlobalRoot;
      const commandRootBefore = snapshotTree(globalCommandRoot);
      const agentRootBefore = snapshotTree(globalAgentRoot);
      const createAdapter = harness === 'claude' ? createClaudeAdapter : createOpencodeAdapter;
      const adapter = createAdapter({
        repoRoot: fixture.packageRoot,
        projectPath: fixture.projectPath,
        packageRoot: fixture.packageRoot,
        globalAgentRoot,
        globalCommandRoot,
      });
      const settings = harness === 'claude'
        ? { model: 'sonnet', effort: 'medium' }
        : { model: 'opencode-go/glm-5.2', variant: 'high' };
      const result = adapter.createLocalOverride({ family: 'command', name: command }, settings);
      assert.equal(result.status, 'persisted',
        `${harness}: the patch source is resolved from the injected global command root`);
      const written = fs.readFileSync(result.destination, 'utf8');
      assert.match(written, /description: command-owned description/,
        `${harness}: the patch source bytes come from the injected global command root`);
      assert.match(written, /Keep this command body byte-identical\./,
        `${harness}: the injected source body is preserved`);
      assert.deepEqual(snapshotTree(globalCommandRoot), commandRootBefore,
        `${harness}: the global command root is never written by the override`);
      assert.deepEqual(snapshotTree(globalAgentRoot), agentRootBefore,
        `${harness}: the global agent root is never written by the override`);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test('flow: command targets with no source or invalid frontmatter are reported in diagnostics without aborting the remaining commands', async () => {
  const fixture = makePersistenceFixture();
  const restoreClaude = patchFactory('createClaudeAdapter', deps => createClaudeAdapter({
    ...deps,
    repoRoot: fixture.packageRoot,
    projectPath: fixture.projectPath,
    packageRoot: fixture.packageRoot,
    globalAgentRoot: fixture.claudeGlobalRoot,
    globalCommandRoot: fixture.claudeGlobalCommandRoot,
    settingsCatalog: CLAUDE_SETTINGS_CATALOG,
    promptChoice: deps.promptChoice,
  }));
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter([], { select: [], create: [] }));
  try {
    const valid = 'sai-backfill';
    const missing = 'sai-pr';
    const invalid = 'sai-status';
    const commandSourceDir = path.join(fixture.packageRoot, 'commands', 'claude');
    fs.mkdirSync(commandSourceDir, { recursive: true });
    for (const command of [missing, invalid, valid]) {
      fs.writeFileSync(path.join(commandSourceDir, `${command}.md`), '');
    }
    writeGlobalCommand(fixture, 'claude', valid, claudeCommandSource(valid));
    writeGlobalCommand(fixture, 'claude', invalid, 'no frontmatter block here\njust a body\n');
    const answers = ['Customize models', 'Claude Code', 'Commands'];
    const result = await runPostSetupMenu({
      projectPath: fixture.projectPath,
      isTTY: true,
      promptChoice: async (question, options) => answers.length > 0
        ? answers.shift()
        : chooseClaudeSonnetMedium(options),
      promptChecklist: async () => ({ status: 'confirmed', items: [missing, invalid, valid] }),
    });
    const diagnostics = (result.diagnostics || []).map(entry => String(entry)).join('\n');
    assert.equal(result.status, 'persistence-failed',
      'a persistence-failed target makes the pass non-successful');
    assert.deepEqual(result.failedAgents, [invalid]);
    assert.ok(diagnostics.includes(missing),
      `the command ${missing} with no project-local destination and no installed global source is reported skipped with a diagnostic`);
    assert.ok(diagnostics.includes(invalid),
      `the command ${invalid} whose source file has no valid frontmatter block is reported with a persistence failure diagnostic`);
    const commandsDir = path.join(fixture.projectPath, '.claude', 'commands');
    assert.equal(fs.existsSync(path.join(commandsDir, `${missing}.md`)), false,
      'the skipped command writes no destination');
    assert.equal(fs.existsSync(path.join(commandsDir, `${invalid}.md`)), false,
      'the invalid-frontmatter command writes no destination');
    assert.equal(fs.existsSync(path.join(commandsDir, `${valid}.md`)), true,
      'the remaining valid command is still persisted after the skipped and failed targets');
    assert.match(
      fs.readFileSync(path.join(commandsDir, `${valid}.md`), 'utf8'),
      /model: sonnet\neffort: medium/
    );
  } finally {
    restoreClaude();
    restoreOpencode();
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('the settings selector is invoked exactly once per run for the whole confirmed subset, including All scope, and never for an empty subset', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () =>
    makeFakeAdapter(
      ['budget', 'explore'],
      opencodeOps,
      { model: 'opencode-go/glm-5.2', variant: 'high' },
      ['budget', 'sai-1-spec']
    ));
  const restoreClaude = patchFactory('createClaudeAdapter', () =>
    makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode', 'All', 'Exit'];
    const both = ['worker:budget', 'worker:explore', 'command:budget', 'command:sai-1-spec'];
    const bothBare = ['budget', 'explore', 'budget', 'sai-1-spec'];
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => answers.shift() ?? '<model>',
      promptChecklist: async (...args) => ({ status: 'confirmed', items: args[1] }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(opencodeOps.select, [both.join(', ')],
      'the selector runs exactly once for the whole confirmed All subset');
    assert.equal(opencodeOps.select.length, 1,
      'exactly one settings selection happens for the whole confirmed subset');
    assert.deepEqual(opencodeOps.create.map(entry => entry.target.name), bothBare,
      'every confirmed worker and command target is configured once, in the combined row order');
    const sharedSettings = { model: 'opencode-go/glm-5.2', variant: 'high' };
    for (const entry of opencodeOps.create) {
      assert.deepEqual(entry.settings, sharedSettings,
        'identical settings are applied to every selected target');
    }
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
    assert.equal(claudeOps.create.length, 0, 'claude must never create overrides');

    opencodeOps.select.length = 0;
    opencodeOps.create.length = 0;
    const emptyAnswers = ['Customize models', 'OpenCode', 'All'];
    let emptyChecklistCalls = 0;
    const emptyResult = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async () => emptyAnswers.shift() ?? '<model>',
      promptChecklist: async () => {
        emptyChecklistCalls += 1;
        return emptyChecklistCalls === 1
          ? { status: 'confirmed', items: [] }
          : { status: 'cancelled' };
      },
    });
    assert.equal(emptyResult.status, 'skipped');
    assert.equal(emptyResult.reason, 'cancelled');
    assert.equal(emptyChecklistCalls, 2, 'an empty confirmation keeps the checklist open');
    assert.deepEqual(opencodeOps.select, [], 'an empty confirmed subset invokes no selector');
    assert.deepEqual(opencodeOps.create, [], 'an empty confirmed subset configures no target');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
    assert.equal(claudeOps.create.length, 0, 'claude must never create overrides');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

// --- Step 2: cyclic post-setup passes, diagnostics, and exit policy ---------

function makeOutcomeAdapter({ targets, settings, outcomes, ops }) {
  return {
    enumerateWorkers() {
      ops.enumerate += 1;
      return [...targets];
    },
    enumerateCommands() {
      ops.enumerateCommands = (ops.enumerateCommands || 0) + 1;
      return [];
    },
    async selectSettings(label) {
      ops.select.push({ label });
      return typeof settings === 'function' ? settings(ops.select.length) : settings;
    },
    createLocalOverride(target, chosen) {
      const name = typeof target === 'string' ? target : target.name;
      const index = ops.create.length;
      ops.create.push({ name, target, settings: chosen });
      const selected = typeof outcomes === 'function'
        ? outcomes(name, index)
        : outcomes[index];
      if (selected instanceof Error) throw selected;
      return { agent: name, ...(selected || { status: 'persisted' }) };
    },
  };
}

function captureTerminalEvents() {
  const events = [];
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };
  console.log = message => events.push({ kind: 'log', message: String(message) });
  console.error = message => events.push({ kind: 'error', message: String(message) });
  console.warn = message => events.push({ kind: 'warn', message: String(message) });
  return {
    events,
    restore() {
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
    },
  };
}

test('completed passes re-enter with fresh adapters and selections, render prior diagnostics once, and preserve earlier overrides on later Exit', async () => {
  const firstDiagnostic = 'Skipped first-unavailable: installed source is unavailable.';
  const states = [
    {
      targets: ['first-persisted', 'first-unavailable'],
      settings: { model: 'opencode-go/first' },
      outcomes: [
        { status: 'persisted' },
        { status: 'skipped', reason: 'missing-source' },
      ],
    },
    {
      targets: ['second-persisted'],
      settings: { model: 'opencode-go/second' },
      outcomes: [{ status: 'persisted' }],
    },
  ];
  const adapterOps = states.map(() => ({ enumerate: 0, select: [], create: [] }));
  const adapters = states.map((state, index) => makeOutcomeAdapter({
    ...state,
    ops: adapterOps[index],
  }));
  let factoryCalls = 0;
  const restore = patchFactory('createOpencodeAdapter', () => adapters[factoryCalls++]);
  const checklistCalls = [];
  const eventsCapture = captureTerminalEvents();
  const answers = [
    'Customize models', 'OpenCode', 'Workers',
    'Customize models', 'OpenCode', 'Workers', 'Exit',
  ];
  const promptCalls = [];
  try {
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async (question, options) => {
        eventsCapture.events.push({ kind: 'prompt', question });
        promptCalls.push({ question, options });
        const answer = answers.shift();
        assert.notEqual(answer, undefined, `unexpected prompt: ${question}`);
        return answer;
      },
      promptChecklist: async (...args) => {
        checklistCalls.push(args);
        return { status: 'confirmed', items: args[1] };
      },
    });

    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'cancelled',
      skippedAgents: [],
      diagnostics: [],
    });
    assert.equal(factoryCalls, 2, 'the next completed pass creates a fresh adapter');
    assert.deepEqual(adapterOps.map(ops => ops.enumerate), [1, 1],
      'each pass enumerates its own target set exactly once');
    assert.deepEqual(checklistCalls.map(call => [call[0], call[1]]), [
      [states[0].targets, states[0].targets],
      [states[1].targets, states[1].targets],
    ], 'every newly enumerated target is selected in a fresh checklist');
    assert.deepEqual(adapterOps[0].select, [{ label: states[0].targets.join(', ') }]);
    assert.deepEqual(adapterOps[1].select, [{ label: states[1].targets.join(', ') }]);
    assert.deepEqual(adapterOps[0].create.map(entry => entry.name), states[0].targets);
    assert.deepEqual(adapterOps[1].create.map(entry => entry.name), states[1].targets);
    assert.deepEqual(adapterOps[0].create.map(entry => entry.settings), [states[0].settings, states[0].settings]);
    assert.deepEqual(adapterOps[1].create.map(entry => entry.settings), [states[1].settings]);

    const diagnosticEvents = eventsCapture.events.filter(event =>
      event.message === `Post-setup customization: ${firstDiagnostic}`);
    assert.equal(diagnosticEvents.length, 1,
      'a skipped-target diagnostic is emitted exactly once across later passes');
    const diagnosticIndex = eventsCapture.events.indexOf(diagnosticEvents[0]);
    const menuEvents = eventsCapture.events.filter(event =>
      event.kind === 'prompt' && event.question === 'Post-setup customization:');
    assert.equal(menuEvents.length, 3, 'the fresh menu is shown before the second pass and before Exit');
    const secondMenuIndex = eventsCapture.events.findIndex((event, index) =>
      event.kind === 'prompt'
      && event.question === 'Post-setup customization:'
      && index > eventsCapture.events.findIndex(candidate =>
        candidate.kind === 'prompt' && candidate.question === 'Post-setup customization:'));
    assert.ok(diagnosticIndex < secondMenuIndex,
      'completed-pass diagnostics are emitted before the next menu prompt');
    assert.deepEqual(answers, [], 'the later cancellation consumes only the fresh menu choice');
  } finally {
    eventsCapture.restore();
    restore();
  }
});

test('persistence failure attempts every selected target, returns failedAgents and diagnostics, and does not re-enter the menu', async () => {
  const failureDiagnostic = 'Failed cannot-write: destination could not be persisted.';
  const ops = { enumerate: 0, select: [], create: [] };
    const targets = ['after-failure', 'cannot-write', 'missing-source'];
  const restore = patchFactory('createOpencodeAdapter', () => makeOutcomeAdapter({
    targets,
    settings: { model: 'opencode-go/test-model', variant: 'high' },
      outcomes: [
        { status: 'persisted' },
        { status: 'persistence-failed', diagnostic: failureDiagnostic },
        { status: 'skipped', reason: 'missing-source' },
      ],
    ops,
  }));
  const answers = ['Customize models', 'OpenCode', 'Workers'];
  let menuPrompts = 0;
  try {
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async question => {
        if (question === 'Post-setup customization:') menuPrompts += 1;
        const answer = answers.shift();
        assert.notEqual(answer, undefined, `the failed pass must not prompt again: ${question}`);
        return answer;
      },
      promptChecklist: async (items, defaultSelected) => {
        assert.deepEqual(defaultSelected, items);
        return { status: 'confirmed', items };
      },
    });

    assert.equal(menuPrompts, 1, 'a persistence-failed pass terminates without another menu');
    assert.equal(result.status, 'persistence-failed');
    assert.deepEqual(result.failedAgents, ['cannot-write'],
      'skipped targets are omitted from failedAgents');
    assert.deepEqual(result.diagnostics, [
      failureDiagnostic,
      'Skipped missing-source: installed source is unavailable.',
    ]);
    assert.deepEqual(ops.select, [{ label: targets.join(', ') }],
      'non-empty confirmation invokes settings exactly once');
    assert.deepEqual(ops.create.map(entry => entry.name), targets,
      'remaining selected targets are attempted once after persistence failure');
    assert.deepEqual(ops.create.map(entry => entry.settings), [
      { model: 'opencode-go/test-model', variant: 'high' },
      { model: 'opencode-go/test-model', variant: 'high' },
      { model: 'opencode-go/test-model', variant: 'high' },
    ], 'identical settings are forwarded to every selected target');
  } finally {
    restore();
  }
});

test('empty target enumeration notices the user, returns to scope, and never opens a zero-row checklist or settings', async () => {
  const ops = { enumerate: 0, select: [], create: [] };
  const restore = patchFactory('createOpencodeAdapter', () => makeOutcomeAdapter({
    targets: [],
    settings: { model: 'opencode-go/unused' },
    outcomes: [],
    ops,
  }));
  const answers = ['Customize models', 'OpenCode', 'Workers', BACK, BACK, 'Exit'];
  const scopeQuestions = [];
  const terminal = captureTerminalEvents();
  let checklistCalls = 0;
  try {
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async (question, options) => {
        if (question === 'Choose a customization scope:') scopeQuestions.push(options);
        const answer = answers.shift();
        assert.notEqual(answer, undefined, `unexpected prompt: ${question}`);
        return answer;
      },
      promptChecklist: async () => {
        checklistCalls += 1;
        assert.fail('empty target enumeration must not render a checklist');
      },
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(ops.select.length, 0, 'empty target enumeration must not request settings');
    assert.equal(checklistCalls, 0, 'empty target enumeration must not request a zero-row checklist');
    assert.equal(scopeQuestions.length, 2,
      'empty target enumeration returns to the scope screen for another choice');
    assert.ok(terminal.events.some(event => /no .*target|target.*available/i.test(event.message)),
      'empty target enumeration emits its documented notice');
  } finally {
    terminal.restore();
    restore();
  }
});

test('post-setup selectors use the default single-select legend while the menu suppresses its footer', async () => {
  const ops = { enumerate: 0, select: [], create: [] };
  const restore = patchFactory('createOpencodeAdapter', () => makeOutcomeAdapter({
    targets: ['target'],
    settings: { model: 'opencode-go/test-model' },
    outcomes: [{ status: 'persisted' }],
    ops,
  }));
  const calls = [];
  const answers = ['Customize models', 'OpenCode', 'Workers', 'Exit'];
  try {
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice: async (...args) => {
        calls.push(args);
        return answers.shift();
      },
      promptChecklist: async (...args) => ({ status: 'confirmed', items: args[1] }),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'cancelled');
    assert.equal(calls[0][0], 'Post-setup customization:');
    assert.equal(calls[0][3], null, 'the post-setup menu explicitly suppresses its footer');
    assert.equal(calls[1][0], 'Choose a harness:');
    assert.equal(calls[1].length, 2,
      'the harness selector receives its default footer through promptSelect');
    assert.equal(calls[2][0], 'Choose a customization scope:');
    assert.equal(calls[2].length, 2,
      'the scope selector receives its default footer through promptSelect');
  } finally {
    restore();
  }

  const claudeFrames = [];
  const claude = createClaudeAdapter({
    repoRoot: REPO_ROOT,
    promptChoice: async (...args) => {
      claudeFrames.push(args);
      return chooseClaudeSonnetMedium(args[1]);
    },
  });
  await claude.selectSettings('target');
  assert.ok(claudeFrames.length > 0);
    assert.ok(claudeFrames.every(args => args.length === 2),
      'Claude settings use promptSelect defaults without overriding the footer');

  const opencodeFrames = [];
  let screen = 0;
  const opencode = createOpencodeAdapter({
    repoRoot: REPO_ROOT,
    promptChoice: async (...args) => {
      opencodeFrames.push(args);
      if (screen === 0) {
        screen += 1;
        return 'opencode-go';
      }
      if (screen === 1) {
        screen += 1;
        return 'deepseek-v4-flash';
      }
      screen += 1;
      return 'high';
    },
    runCommand: makeCatalogRunner(
      'opencode-go/deepseek-v4-flash\n',
      'opencode-go/deepseek-v4-flash\n{\n  "variants": { "high": {} }\n}\n'
    ),
  });
  await opencode.selectSettings('target');
  assert.equal(opencodeFrames.length, 3);
    assert.ok(opencodeFrames.every(args => args.length === 2),
      'OpenCode selectors use promptSelect defaults without overriding the footer');
});

test('scope cancellation stops the cycle without reaching targets, settings, or another screen', async () => {
  const ops = { enumerate: 0, select: [], create: [] };
  const restore = patchFactory('createOpencodeAdapter', () => makeOutcomeAdapter({
    targets: ['target'],
    settings: { model: 'opencode-go/test-model' },
    outcomes: [{ status: 'persisted' }],
    ops,
  }));
  const questions = [];
  try {
    const result = await runPostSetupMenu({
      isTTY: true,
      promptChoice: async question => {
        questions.push(question);
        return ['Customize models', 'OpenCode', null][questions.length - 1];
      },
      promptChecklist: async () => assert.fail('scope cancellation must not reach targets'),
    });
    assert.deepEqual(result, {
      status: 'skipped',
      reason: 'cancelled',
      skippedAgents: [],
      diagnostics: [],
    });
    assert.deepEqual(questions, [
      'Post-setup customization:',
      'Choose a harness:',
      'Choose a customization scope:',
    ]);
    assert.equal(ops.select.length, 0);
    assert.equal(ops.create.length, 0);
  } finally {
    restore();
  }
});

test('runPostSetupMenu renders target diagnostics, while setup keeps unexpected exceptions on post-setup-failure', async () => {
  const diagnostic = 'Failed broken-target: invalid frontmatter.';
  const ops = { enumerate: 0, select: [], create: [] };
  const restore = patchFactory('createOpencodeAdapter', () => makeOutcomeAdapter({
    targets: ['broken-target'],
    settings: { model: 'opencode-go/test-model' },
    outcomes: [{ status: 'persistence-failed', diagnostic }],
    ops,
  }));
  const terminal = captureTerminalEvents();
  try {
    const result = await runPostSetupMenu({
      isTTY: true,
      promptChoice: async question => ({
        'Post-setup customization:': 'Customize models',
        'Choose a harness:': 'OpenCode',
        'Choose a customization scope:': 'Workers',
      }[question]),
      promptChecklist: async (items) => ({ status: 'confirmed', items }),
    });
    assert.equal(result.status, 'persistence-failed');
    assert.deepEqual(result.diagnostics, [diagnostic]);
    assert.equal(terminal.events.filter(event =>
      event.message === `Post-setup customization: ${diagnostic}`).length, 1,
      'the runPostSetupMenu owner renders each failure diagnostic once');
  } finally {
    terminal.restore();
    restore();
  }

  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const defect = new Error('unexpected materialization exception');
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => fakeReadline(),
      postSetupWorkflow: async () => {},
      postSetupMenu: async () => { throw defect; },
    });
    assert.equal(outcome, 'post-setup-failure');
  } finally {
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

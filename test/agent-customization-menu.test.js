'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const agentCustomization = require('../bin/agent-customization.js');
const { main } = require('../bin/setup.js');

const {
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
} = agentCustomization;

const REPO_ROOT = path.join(__dirname, '..');

const OPENCODE_AGENTS = [
  'budget',
  'executor',
  'explore',
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];

const CLAUDE_AGENTS = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];

const CHECKLIST_LEGEND = 'Up/Down move · Space toggle · Enter confirm · q/Ctrl-C cancel';
const SCRATCH_ROOT = path.join(REPO_ROOT, '.tmp', 'discover-opencode-model-settings');

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

function makeFakeAdapter(agents, ops) {
  return {
    enumerateAgents() {
      return agents;
    },
    async selectSettings(agentName) {
      ops.select.push(agentName);
      return { model: `model:${agentName}`, effort: `effort:${agentName}` };
    },
    createLocalOverride(agentName, settings) {
      ops.create.push({ agentName, settings });
      return { agent: agentName, ...settings, persistent: false };
    },
  };
}

function patchFactory(name, replacement) {
  const original = agentCustomization[name];
  agentCustomization[name] = replacement;
  return function restore() {
    agentCustomization[name] = original;
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
    fs.writeFileSync(path.join(scratch, 'agents', 'opencode', `${name}.md`), `sentinel ${name}\n`);
  }
  for (const name of CLAUDE_AGENTS) {
    fs.writeFileSync(path.join(scratch, 'agents', 'claude', `${name}.md`), `sentinel ${name}\n`);
  }
  return scratch;
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

// Combined-frame helpers. The delimiter literal joining a model option to an
// effort option is implementation-defined (documented in proposal.md, which
// the blind test-writer must not read), so entries are parsed structurally
// from the interface contract's label shape (model + fixed delimiter +
// effort): an entry must start with a frozen model option and end with a
// frozen effort option, with a non-empty delimiter between them. The frozen
// placeholder values are prefix/suffix-unambiguous ('<model>' is not a prefix
// of '<model-alt>', and '<effort>' is not a suffix of '<effort-alt>').
function splitCombinedEntry(entry) {
  for (const model of FAKE_MODEL_OPTIONS) {
    if (!entry.startsWith(model)) continue;
    for (const effort of FAKE_EFFORT_OPTIONS) {
      if (!entry.endsWith(effort)) continue;
      if (entry.length > model.length + effort.length) {
        return { model, effort };
      }
    }
  }
  return null;
}

// Returns the first combined entry in `options` whose parts are the given
// model and effort options; returns undefined when no entry matches.
function findCombinedEntry(options, model, effort) {
  return options.find(entry => {
    const parts = splitCombinedEntry(entry);
    return parts !== null && parts.model === model && parts.effort === effort;
  });
}

after(() => {
  fs.rmSync(SCRATCH_ROOT, { recursive: true, force: true });
});

test('runPostSetupMenu skips when not a TTY: resolves skipped, never prompts, creates no adapter', async () => {
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
    assert.equal(result, 'skipped');
    assert.equal(promptCalls, 0, 'promptChoice should never be called when not a TTY');
    assert.equal(opencodeFactoryCalls, 0, 'no opencode adapter should be created when skipped');
    assert.equal(claudeFactoryCalls, 0, 'no claude adapter should be created when skipped');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('runPostSetupMenu resolves undefined when Exit is chosen: no harness picker, no checklist, no adapter', async () => {
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
    assert.equal(result, undefined, 'completion and cancel-run both resolve undefined');
    assert.equal(promptCalls, 1, 'the main menu should be prompted exactly once');
    assert.equal(checklistCalls.length, 0, 'no checklist should be invoked after Exit');
    assert.equal(opencodeFactoryCalls, 0, 'no opencode adapter should be created on exit');
    assert.equal(claudeFactoryCalls, 0, 'no claude adapter should be created on exit');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('customize OpenCode flow runs opencode ops for every selected agent, never invokes Claude, resolves undefined', async () => {
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
    return makeFakeAdapter(CLAUDE_AGENTS, claudeOps);
  });
  try {
    const answers = ['Customize models', 'OpenCode'];
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
    assert.equal(result, undefined, 'completion resolves undefined (retired customized-opencode token)');
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once');
    assert.equal(opencodeFactoryCalls, 1, 'createOpencodeAdapter should be invoked exactly once');
    assert.equal(claudeFactoryCalls, 0, 'createClaudeAdapter must never be invoked');
    assert.deepEqual(opencodeOps.select, [OPENCODE_AGENTS.join(', ')],
      'selectSettings should run exactly once for the whole confirmed subset');
    assert.deepEqual(opencodeOps.create.map(entry => entry.agentName), OPENCODE_AGENTS,
      'createLocalOverride should run exactly once per opencode agent');
    const sharedOpenCodeSettings = {
      model: `model:${OPENCODE_AGENTS.join(', ')}`,
      effort: `effort:${OPENCODE_AGENTS.join(', ')}`,
    };
    for (let i = 0; i < OPENCODE_AGENTS.length; i += 1) {
      assert.deepEqual(opencodeOps.create[i].settings, sharedOpenCodeSettings,
        'every opencode override should carry the identical shared selectSettings result');
    }
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('customize Claude Code flow runs claude ops for every selected agent, never invokes OpenCode, resolves undefined', async () => {
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
    return makeFakeAdapter(CLAUDE_AGENTS, claudeOps);
  });
  try {
    const answers = ['Customize models', 'Claude Code'];
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
    assert.equal(result, undefined, 'completion resolves undefined (retired customized-claude token)');
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once');
    assert.equal(claudeFactoryCalls, 1, 'createClaudeAdapter should be invoked exactly once');
    assert.equal(opencodeFactoryCalls, 0, 'createOpencodeAdapter must never be invoked');
    assert.deepEqual(claudeOps.select, [CLAUDE_AGENTS.join(', ')],
      'selectSettings should run exactly once for the whole confirmed subset');
    assert.deepEqual(claudeOps.create.map(entry => entry.agentName), CLAUDE_AGENTS,
      'createLocalOverride should run exactly once per claude agent');
    const sharedClaudeSettings = {
      model: `model:${CLAUDE_AGENTS.join(', ')}`,
      effort: `effort:${CLAUDE_AGENTS.join(', ')}`,
    };
    for (let i = 0; i < CLAUDE_AGENTS.length; i += 1) {
      assert.deepEqual(claudeOps.create[i].settings, sharedClaudeSettings,
        'every claude override should carry the identical shared selectSettings result');
    }
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('opencode enumerateAgents returns exactly the 10 managed agents', () => {
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT });
  const agents = adapter.enumerateAgents();
  assert.equal(agents.length, 10, 'exactly 10 agents should enumerate for opencode');
  assert.deepEqual([...agents].sort(), [...OPENCODE_AGENTS].sort(),
    'opencode agents should be exactly the 10 managed names');
});

test('claude enumerateAgents returns exactly the 7 routed workers', () => {
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT });
  const agents = adapter.enumerateAgents();
  assert.equal(agents.length, 7, 'exactly 7 agents should enumerate for claude');
  assert.deepEqual([...agents].sort(), [...CLAUDE_AGENTS].sort(),
    'claude agents should be exactly the 7 routed workers');
});

test('fakeSelectSettings asks one combined model×effort frame and resolves the confirmed entry', async () => {
  const calls = [];
  const promptSpy = async (question, options) => {
    calls.push({ question, options });
    return findCombinedEntry(options, FAKE_MODEL_OPTIONS[0], FAKE_EFFORT_OPTIONS[1]);
  };
  const settings = await fakeSelectSettings('explore', promptSpy);
  assert.equal(calls.length, 1, 'exactly one combined prompt should run per invocation');
  const expectedSize = FAKE_MODEL_OPTIONS.length * FAKE_EFFORT_OPTIONS.length;
  assert.equal(calls[0].options.length, expectedSize,
    'the combined frame should offer the full model×effort Cartesian product');
  for (let i = 0; i < calls[0].options.length; i += 1) {
    const parts = splitCombinedEntry(calls[0].options[i]);
    assert.ok(parts, `option ${i} should encode exactly one model together with one effort`);
    assert.ok(FAKE_MODEL_OPTIONS.includes(parts.model),
      `option ${i} should carry a frozen model option as its model part`);
    assert.ok(FAKE_EFFORT_OPTIONS.includes(parts.effort),
      `option ${i} should carry a frozen effort option as its effort part`);
    const group = Math.floor(i / FAKE_EFFORT_OPTIONS.length);
    assert.equal(parts.model, FAKE_MODEL_OPTIONS[group],
      `option ${i} should be model-major: group ${group} carries FAKE_MODEL_OPTIONS[${group}]`);
  }
  assert.deepEqual(settings, { model: FAKE_MODEL_OPTIONS[0], effort: FAKE_EFFORT_OPTIONS[1] },
    'confirming the entry whose parts are FAKE_MODEL_OPTIONS[0] + FAKE_EFFORT_OPTIONS[1] should resolve the pair');
});

test('claude adapter selectSettings drives one combined frame via the prompt boundary and returns the selected pair', async () => {
  const calls = [];
  const promptSpy = async (question, options) => {
    calls.push({ question, options });
    return findCombinedEntry(options, FAKE_MODEL_OPTIONS[1], FAKE_EFFORT_OPTIONS[0]);
  };
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
  const settings = await adapter.selectSettings('explore');
  assert.equal(calls.length, 1,
    'claude selectSettings(explore) should drive exactly one combined prompt');
  assert.deepEqual(settings, { model: FAKE_MODEL_OPTIONS[1], effort: FAKE_EFFORT_OPTIONS[0] },
    'claude selectSettings should resolve the confirmed combined entry to its model and effort values');
});

test('each claude agent consumes exactly one combined frame and overrides map effort to the tunable key', async () => {
  let promptIndex = 0;
  const promptSpy = async (question, options) => {
    const i = promptIndex;
    promptIndex += 1;
    const parts = findCombinedEntry(
      options,
      FAKE_MODEL_OPTIONS[Math.floor((i % 4) / 2)],
      FAKE_EFFORT_OPTIONS[i % 2]
    );
    assert.ok(parts, `claude prompt ${i} should find the scripted combined entry`);
    return parts;
  };
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
  const agents = adapter.enumerateAgents();
  assert.equal(agents.length, CLAUDE_AGENTS.length,
    `exactly ${CLAUDE_AGENTS.length} agents should enumerate for claude`);
  assert.deepEqual([...agents].sort(), [...CLAUDE_AGENTS].sort(),
    `the enumerated agents should be exactly the ${CLAUDE_AGENTS.length} managed claude agents`);

  for (let i = 0; i < agents.length; i += 1) {
    const expectedModel = FAKE_MODEL_OPTIONS[Math.floor((i % 4) / 2)];
    const expectedEffort = FAKE_EFFORT_OPTIONS[i % 2];
    const settings = await adapter.selectSettings(agents[i]);
    assert.deepEqual(settings, { model: expectedModel, effort: expectedEffort },
      `claude selectSettings should resolve the scripted combined entry for agent ${i}`);
    const override = adapter.createLocalOverride(agents[i], settings);
    assert.deepEqual(override, {
      agent: agents[i],
      model: expectedModel,
      effort: expectedEffort,
      persistent: false,
    }, 'the claude override should map the selected effort value to the effort key');
  }
  assert.equal(promptIndex, agents.length,
    'selectSettings should consume exactly one combined prompt per claude agent');
});

test('opencode createLocalOverride conditionally includes variant and stays non-persistent', () => {
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT });
  const withVariant = adapter.createLocalOverride('explore', { model: '<model>', variant: 'high' });
  assert.deepEqual(withVariant, {
    agent: 'explore',
    model: '<model>',
    variant: 'high',
    persistent: false,
  }, 'the opencode override should carry the selected variant when one is chosen');
  const withoutVariant = adapter.createLocalOverride('explore', { model: '<model>' });
  assert.deepEqual(withoutVariant, {
    agent: 'explore',
    model: '<model>',
    persistent: false,
  }, 'the opencode override should omit the variant key when no variant was chosen');
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

test('claude createLocalOverride returns agent, model, effort, persistent:false', () => {
  const adapter = createClaudeAdapter({ repoRoot: REPO_ROOT });
  const override = adapter.createLocalOverride('sai-5-review-worker', { model: '<model>', effort: '<effort>' });
  assert.deepEqual(override, {
    agent: 'sai-5-review-worker',
    model: '<model>',
    effort: '<effort>',
    persistent: false,
  }, 'the claude override shape should use the effort tunable key and stay non-persistent');
});

test('fakeCreateLocalOverride is non-persistent and preserves the selected values', () => {
  const override = fakeCreateLocalOverride('explore', { model: '<model>', effort: '<effort>' });
  assert.deepEqual(override, {
    agent: 'explore',
    model: '<model>',
    effort: '<effort>',
    persistent: false,
  }, 'the fake override should carry the agent, selected values, and persistent:false');
});

test('full dependent-flow traversal walks menu, harness, checklist, and provider→model→variant screens with zero filesystem writes', async () => {
  const scratch = makeScratchRepo();
  try {
    const before = snapshotTree(path.join(scratch, 'agents'));

    const runner = makeCatalogRunner(
      'opencode-go/deepseek-v4-flash\nopencode-go/glm-5.2\nopenai/gpt-5.4\n',
      'opencode-go/deepseek-v4-flash\n{\n  "variants": { "low": {}, "high": {} }\n}\n');

    const answers = ['Customize models', 'OpenCode'];
    const overrides = [];
    const originalOpencode = agentCustomization.createOpencodeAdapter;
    const restoreOpencode = patchFactory('createOpencodeAdapter', (deps) => {
      const real = originalOpencode({ ...deps, runCommand: runner });
      return {
        ...real,
        createLocalOverride(agentName, settings) {
          overrides.push({ agentName, settings });
          return real.createLocalOverride(agentName, settings);
        },
      };
    });

    let screenIndex = 0;
    const promptChoice = async (question, options) => {
      if (answers.length > 0) {
        return answers.shift();
      }
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
        isTTY: true,
        promptChoice,
        promptChecklist: async (...args) => {
          checklistCalls.push(args);
          return { status: 'confirmed', items: args[1] };
        },
      });
      assert.equal(result, undefined,
        'the dependent-flow traversal should complete the opencode customization flow and resolve undefined');
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

test('checklist receives the full enumerateAgents list of the chosen harness as its default selection', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const checklistCalls = [];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: recordChecklist(checklistCalls),
    });
    assert.equal(checklistCalls.length, 1, 'the checklist should be invoked exactly once');
    assert.deepEqual(checklistCalls[0][0], OPENCODE_AGENTS,
      'the checklist items should be the full enumerated opencode agent list');
    assert.deepEqual(checklistCalls[0][1], OPENCODE_AGENTS,
      'every agent of the chosen harness should be pre-selected by default');
    assert.equal(result, undefined);
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('checklist receives the canonical legend string as its footer argument', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const checklistCalls = [];
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode'];
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
    assert.equal(result, undefined);
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
    const answers = ['Customize models', 'OpenCode'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => ({ status: 'confirmed', items: subset }),
    });
    assert.equal(result, undefined);
    assert.deepEqual(opencodeOps.select, [subset.join(', ')],
      'selectSettings should run exactly once for the confirmed subset and never for deselected agents');
    assert.deepEqual(opencodeOps.create.map(entry => entry.agentName), subset,
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
    const answers = ['Customize models', 'OpenCode'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => ({ status: 'confirmed', items: [] }),
    });
    assert.equal(result, undefined);
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
    const answers = ['Customize models', null];
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
    assert.equal(result, undefined, 'a cancelled harness picker aborts the run');
    assert.equal(promptCalls, 2, 'only the main menu and the harness picker should be prompted');
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
    const originalOpencode = agentCustomization.createOpencodeAdapter;
    const restoreOpencode = patchFactory('createOpencodeAdapter', (deps) => originalOpencode({ ...deps, runCommand: fakeRunner }));
    try {
      const answers = ['Customize models', 'OpenCode', null];
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
      assert.equal(result, undefined, 'a null provider-screen selection aborts the run');
      assert.equal(checklistCalls.length, 1, 'the checklist should be reached exactly once');
      assert.equal(promptCalls, 3,
        'exactly menu, harness, and the provider screen are prompted: no prompt follows the provider-screen null');
      assert.deepEqual(runnerCalls, [['models']],
        'the catalog runner is invoked exactly once before the provider screen, never with --refresh');
    } finally {
      restoreOpencode();
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('checklist cancelled aborts with zero agents configured and resolves undefined', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => ({ status: 'cancelled' }),
    });
    assert.equal(result, undefined, 'a cancelled checklist aborts the run');
    assert.deepEqual(opencodeOps.select, [], 'cancellation must configure zero agents');
    assert.deepEqual(opencodeOps.create, [], 'cancellation must create zero overrides');
    assert.equal(claudeOps.select.length, 0, 'claude must never be configured');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('checklist non-interactive aborts exactly like cancelled: zero agents configured, resolves undefined', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => makeFakeAdapter(OPENCODE_AGENTS, opencodeOps));
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async () => ({ status: 'non-interactive' }),
    });
    assert.equal(result, undefined, 'a non-interactive checklist aborts the run like cancelled');
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
  const settings = await adapter.selectSettings('explore');
  assert.equal(prompt.screens.length, 3,
    'the completed dependent flow presents exactly provider, model, and variant screens in order');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash', variant: 'high' },
    'the dependent flow resolves provider, model, and variant into the settings');
  const override = adapter.createLocalOverride('explore', settings);
  assert.deepEqual(override, {
    agent: 'explore',
    model: 'opencode-go/deepseek-v4-flash',
    variant: 'high',
    persistent: false,
  }, 'the per-agent override carries model and variant when a variant is chosen');
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
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash' },
    'a model without variants resolves model with no variant key');
  assert.equal(screenIndex, 2, 'exactly the provider and model screens are presented');
  const override = adapter.createLocalOverride('explore', settings);
  assert.deepEqual(override, {
    agent: 'explore',
    model: 'opencode-go/deepseek-v4-flash',
    persistent: false,
  }, 'the override carries model only when the variant is the no-variant default');
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
  const settings = await adapter.selectSettings('explore');
  assert.deepEqual(settings, { model: 'opencode-go/deepseek-v4-flash' },
    'the no-variant option resolves model with no variant key');
  const override = adapter.createLocalOverride('explore', settings);
  assert.deepEqual(override, {
    agent: 'explore',
    model: 'opencode-go/deepseek-v4-flash',
    persistent: false,
  }, 'the override omits the variant key when Default (no variant) is chosen');
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

test('a null selectSettings result completes runPostSetupMenu without configuring agents', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  const fakeAdapter = {
    enumerateAgents() {
      return OPENCODE_AGENTS;
    },
    async selectSettings() {
      opencodeOps.select.push('called');
      return null;
    },
    createLocalOverride(agentName, settings) {
      opencodeOps.create.push({ agentName, settings });
      return { agent: agentName, ...(settings || {}), persistent: false };
    },
  };
  const restoreOpencode = patchFactory('createOpencodeAdapter', () => fakeAdapter);
  const restoreClaude = patchFactory('createClaudeAdapter', () => makeFakeAdapter(CLAUDE_AGENTS, claudeOps));
  try {
    const answers = ['Customize models', 'OpenCode'];
    const promptChoice = async () => answers.shift() ?? '<model>';
    const result = await runPostSetupMenu({
      projectPath: REPO_ROOT,
      isTTY: true,
      promptChoice,
      promptChecklist: async (...args) => ({ status: 'confirmed', items: args[1] }),
    });
    assert.equal(result, undefined, 'a null selectSettings result completes the run');
    assert.deepEqual(opencodeOps.select, ['called'], 'selectSettings runs exactly once');
    assert.deepEqual(opencodeOps.create, [],
      'a null selectSettings result must never configure any agent');
    assert.equal(claudeOps.create.length, 0, 'claude must never be configured');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

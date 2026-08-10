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
  FAKE_MODEL_OPTIONS,
  FAKE_EFFORT_OPTIONS,
  fakeSelectSettings,
  fakeCreateLocalOverride,
  createOpencodeAdapter,
  createClaudeAdapter,
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
const SCRATCH_ROOT = path.join(REPO_ROOT, '.tmp', 'navigable-model-customizer');

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

test('adapter selectSettings drives one combined frame via the prompt boundary and returns the selected pair', async () => {
  for (const [name, createAdapter] of [
    ['opencode', createOpencodeAdapter],
    ['claude', createClaudeAdapter],
  ]) {
    const calls = [];
    const promptSpy = async (question, options) => {
      calls.push({ question, options });
      return findCombinedEntry(options, FAKE_MODEL_OPTIONS[1], FAKE_EFFORT_OPTIONS[0]);
    };
    const adapter = createAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
    const settings = await adapter.selectSettings('explore');
    assert.equal(calls.length, 1,
      `${name} selectSettings(explore) should drive exactly one combined prompt`);
    assert.deepEqual(settings, { model: FAKE_MODEL_OPTIONS[1], effort: FAKE_EFFORT_OPTIONS[0] },
      `${name} selectSettings should resolve the confirmed combined entry to its model and effort values`);
  }
});

test('each enumerated agent consumes exactly one combined frame and overrides map effort to the tunable key', async () => {
  const harnesses = [
    { name: 'opencode', create: createOpencodeAdapter, expectedAgents: OPENCODE_AGENTS, tunable: 'variant' },
    { name: 'claude', create: createClaudeAdapter, expectedAgents: CLAUDE_AGENTS, tunable: 'effort' },
  ];
  for (const { name, create, expectedAgents, tunable } of harnesses) {
    let promptIndex = 0;
    const promptSpy = async (question, options) => {
      const i = promptIndex;
      promptIndex += 1;
      const parts = findCombinedEntry(
        options,
        FAKE_MODEL_OPTIONS[Math.floor((i % 4) / 2)],
        FAKE_EFFORT_OPTIONS[i % 2]
      );
      assert.ok(parts, `${name} prompt ${i} should find the scripted combined entry`);
      return parts;
    };
    const adapter = create({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
    const agents = adapter.enumerateAgents();
    assert.equal(agents.length, expectedAgents.length,
      `exactly ${expectedAgents.length} agents should enumerate for ${name}`);
    assert.deepEqual([...agents].sort(), [...expectedAgents].sort(),
      `the enumerated agents should be exactly the ${expectedAgents.length} managed ${name} agents`);

    for (let i = 0; i < agents.length; i += 1) {
      const expectedModel = FAKE_MODEL_OPTIONS[Math.floor((i % 4) / 2)];
      const expectedEffort = FAKE_EFFORT_OPTIONS[i % 2];
      const settings = await adapter.selectSettings(agents[i]);
      assert.deepEqual(settings, { model: expectedModel, effort: expectedEffort },
        `${name} selectSettings should resolve the scripted combined entry for agent ${i}`);
      const override = adapter.createLocalOverride(agents[i], settings);
      assert.deepEqual(override, {
        agent: agents[i],
        model: expectedModel,
        [tunable]: expectedEffort,
        persistent: false,
      }, `the ${name} override should map the selected effort value to the ${tunable} key`);
    }
    assert.equal(promptIndex, agents.length,
      `selectSettings should consume exactly one combined prompt per ${name} agent`);
  }
});

test('opencode createLocalOverride returns agent, model, variant, persistent:false', () => {
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT });
  const override = adapter.createLocalOverride('explore', { model: '<model>', effort: '<effort>' });
  assert.deepEqual(override, {
    agent: 'explore',
    model: '<model>',
    variant: '<effort>',
    persistent: false,
  }, 'the opencode override shape should use the variant tunable key and stay non-persistent');
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

test('full traversal walks menu, harness, checklist, and one combined frame per agent with zero filesystem writes', async () => {
  const scratch = makeScratchRepo();
  try {
    const before = snapshotTree(path.join(scratch, 'agents'));

    const answers = ['Customize models', 'OpenCode'];
    let promptIndex = 0;
    const promptChoice = async (question, options) => {
      if (promptIndex < answers.length) {
        const value = answers[promptIndex];
        promptIndex += 1;
        return value;
      }
      const agentIndex = promptIndex - answers.length;
      promptIndex += 1;
      return findCombinedEntry(
        options,
        FAKE_MODEL_OPTIONS[Math.floor((agentIndex % 4) / 2)],
        FAKE_EFFORT_OPTIONS[agentIndex % 2]
      );
    };

    const checklistCalls = [];
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
      'the full traversal should complete the opencode customization flow and resolve undefined');
    assert.equal(checklistCalls.length, 1,
      'the checklist should be invoked exactly once during the traversal');

    assert.deepEqual(snapshotTree(path.join(scratch, 'agents')), before,
      'the agents tree must be byte-identical after the full traversal');
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

test('promptChoice null at the single combined model×effort frame aborts via the real adapter path with no agent configured', async () => {
  const scratch = makeScratchRepo();
  const checklistCalls = [];
  let promptCalls = 0;
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
    assert.equal(result, undefined, 'a null combined-frame selection aborts the run');
    assert.equal(checklistCalls.length, 1, 'the checklist should be reached exactly once');
    assert.equal(promptCalls, 3,
      'exactly menu, harness, and the single combined frame are prompted: no prompt follows the combined-frame null');
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

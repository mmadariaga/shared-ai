'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const agentCustomization = require('../bin/agent-customization.js');

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

test('runPostSetupMenu resolves exit when Exit is chosen and creates no adapter', async () => {
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
      isTTY: true,
      promptChoice: async () => {
        promptCalls += 1;
        return 'Exit';
      },
    });
    assert.equal(result, 'exit');
    assert.equal(promptCalls, 1, 'the main menu should be prompted exactly once');
    assert.equal(opencodeFactoryCalls, 0, 'no opencode adapter should be created on exit');
    assert.equal(claudeFactoryCalls, 0, 'no claude adapter should be created on exit');
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('customize OpenCode flow runs opencode ops for every agent and never invokes Claude', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  let opencodeFactoryCalls = 0;
  let claudeFactoryCalls = 0;
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
    });
    assert.equal(result, 'customized-opencode');
    assert.equal(opencodeFactoryCalls, 1, 'createOpencodeAdapter should be invoked exactly once');
    assert.equal(claudeFactoryCalls, 0, 'createClaudeAdapter must never be invoked');
    assert.deepEqual(opencodeOps.select, OPENCODE_AGENTS,
      'selectSettings should run exactly once per opencode agent');
    assert.deepEqual(opencodeOps.create.map(entry => entry.agentName), OPENCODE_AGENTS,
      'createLocalOverride should run exactly once per opencode agent');
    for (let i = 0; i < OPENCODE_AGENTS.length; i += 1) {
      assert.deepEqual(opencodeOps.create[i].settings,
        { model: `model:${OPENCODE_AGENTS[i]}`, effort: `effort:${OPENCODE_AGENTS[i]}` },
        'each createLocalOverride should receive the matching selectSettings result');
    }
  } finally {
    restoreOpencode();
    restoreClaude();
  }
});

test('customize Claude Code flow runs claude ops for every agent and never invokes OpenCode', async () => {
  const opencodeOps = { select: [], create: [] };
  const claudeOps = { select: [], create: [] };
  let opencodeFactoryCalls = 0;
  let claudeFactoryCalls = 0;
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
    });
    assert.equal(result, 'customized-claude');
    assert.equal(claudeFactoryCalls, 1, 'createClaudeAdapter should be invoked exactly once');
    assert.equal(opencodeFactoryCalls, 0, 'createOpencodeAdapter must never be invoked');
    assert.deepEqual(claudeOps.select, CLAUDE_AGENTS,
      'selectSettings should run exactly once per claude agent');
    assert.deepEqual(claudeOps.create.map(entry => entry.agentName), CLAUDE_AGENTS,
      'createLocalOverride should run exactly once per claude agent');
    for (let i = 0; i < CLAUDE_AGENTS.length; i += 1) {
      assert.deepEqual(claudeOps.create[i].settings,
        { model: `model:${CLAUDE_AGENTS[i]}`, effort: `effort:${CLAUDE_AGENTS[i]}` },
        'each createLocalOverride should receive the matching selectSettings result');
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

test('fakeSelectSettings asks model options first then effort options and returns the selections', async () => {
  const calls = [];
  const answers = ['<model>', '<effort-alt>'];
  const promptSpy = async (question, options) => {
    calls.push({ question, options });
    return answers.shift();
  };
  const settings = await fakeSelectSettings('explore', promptSpy);
  assert.equal(calls.length, 2, 'exactly two prompts should run per agent');
  assert.deepEqual(calls[0].options, FAKE_MODEL_OPTIONS, 'the first prompt should offer the model options');
  assert.deepEqual(calls[1].options, FAKE_EFFORT_OPTIONS, 'the second prompt should offer the effort options');
  assert.deepEqual(settings, { model: '<model>', effort: '<effort-alt>' },
    'the settings should hold the two user-selected placeholder values');
});

test('adapter selectSettings drives exactly two prompts, model then effort, via the prompt boundary', async () => {
  const calls = [];
  const answers = ['<model-alt>', '<effort>'];
  const promptSpy = async (question, options) => {
    calls.push({ question, options });
    return answers.shift();
  };
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
  const settings = await adapter.selectSettings('explore');
  assert.equal(calls.length, 2, 'exactly two prompts should run for selectSettings(explore)');
  assert.deepEqual(calls[0].options, FAKE_MODEL_OPTIONS, 'the first prompt should offer the model options');
  assert.deepEqual(calls[1].options, FAKE_EFFORT_OPTIONS, 'the second prompt should offer the effort options');
  assert.deepEqual(settings, { model: '<model-alt>', effort: '<effort>' },
    'selectSettings should resolve the two selected placeholder values');
});

test('opencode adapter selects and overrides each enumerated agent exactly once', async () => {
  const answers = [];
  for (let i = 0; i < OPENCODE_AGENTS.length; i += 1) {
    answers.push(FAKE_MODEL_OPTIONS[i % 2], FAKE_EFFORT_OPTIONS[i % 2]);
  }
  let promptIndex = 0;
  const promptSpy = async () => answers[promptIndex++];
  const adapter = createOpencodeAdapter({ repoRoot: REPO_ROOT, promptChoice: promptSpy });
  const agents = adapter.enumerateAgents();
  assert.equal(agents.length, OPENCODE_AGENTS.length, 'exactly 10 agents should enumerate');
  assert.deepEqual([...agents].sort(), [...OPENCODE_AGENTS].sort(),
    'the enumerated agents should be exactly the 10 managed opencode agents');

  for (let i = 0; i < agents.length; i += 1) {
    const agentName = agents[i];
    const settings = await adapter.selectSettings(agentName);
    assert.deepEqual(settings, { model: FAKE_MODEL_OPTIONS[i % 2], effort: FAKE_EFFORT_OPTIONS[i % 2] },
      'selectSettings should resolve the two selected placeholder values');
    const override = adapter.createLocalOverride(agentName, settings);
    assert.deepEqual(override, {
      agent: agentName,
      model: FAKE_MODEL_OPTIONS[i % 2],
      variant: FAKE_EFFORT_OPTIONS[i % 2],
      persistent: false,
    }, 'the opencode override should map the selected effort value to variant');
  }
  assert.equal(promptIndex, OPENCODE_AGENTS.length * 2,
    'selectSettings should consume exactly two prompts per enumerated agent');
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

test('full traversal against a scratch repo root performs zero filesystem writes', async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-agent-menu-traversal-'));
  try {
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

    const before = snapshotTree(path.join(scratch, 'agents'));

    const answers = ['Customize models', 'OpenCode'];
    let promptIndex = 0;
    const promptChoice = async () => {
      if (promptIndex < answers.length) {
        const value = answers[promptIndex];
        promptIndex += 1;
        return value;
      }
      const offset = promptIndex - answers.length;
      promptIndex += 1;
      return [FAKE_MODEL_OPTIONS, FAKE_EFFORT_OPTIONS][offset % 2][Math.floor(offset / 2) % 2];
    };

    const result = await runPostSetupMenu({ projectPath: scratch, isTTY: true, promptChoice });
    assert.equal(result, 'customized-opencode',
      'the full traversal should complete the opencode customization flow');

    assert.deepEqual(snapshotTree(path.join(scratch, 'agents')), before,
      'the agents tree must be byte-identical after the full traversal');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

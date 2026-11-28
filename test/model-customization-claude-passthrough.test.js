'use strict';

// "Customize models" > OpenCode > Claude Code passthrough: the option routes an opencode worker through Claude Code by
// writing the user-owned `harness: claude` line (the claude-code-passthrough change, E9 and E12).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const modelCustomization = require('../bin/model-customization.js');
const claudeDispatch = require('../sai/tools/claude-dispatch.js');

const {
  runPostSetupMenu,
  createOpencodeAdapter,
  CLAUDE_PASSTHROUGH_LABEL,
  BACK,
} = modelCustomization;

const REPO_ROOT = path.join(__dirname, '..');
const WORKER = 'sai-3-green-worker';
const OTHER_WORKER = 'sai-3-red-worker';
const COMMAND = 'sai-1-spec';

const opencodeAgentText = (name, model, variant) => ['---', `name: ${name}`, `model: ${model}`, ...(variant ? [`variant: ${variant}`] : []), '---', '', 'body', ''].join('\n');
const claudeAgentText = (name, model) => ['---', `name: ${name}`, `model: ${model}`, 'effort: high', 'tools: Read', '---', '', 'body', ''].join('\n');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-passthrough-'));
  const dirs = {
    root,
    project: path.join(root, 'project'),
    claudeAgents: path.join(root, 'claude', 'agents'),
    claudeCommands: path.join(root, 'claude', 'commands'),
    opencodeAgents: path.join(root, 'opencode', 'agents'),
    opencodeCommands: path.join(root, 'opencode', 'commands'),
    presets: path.join(root, 'presets'),
  };
  for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true });
  for (const [name, model] of [[WORKER, 'opencode-go/deepseek'], [OTHER_WORKER, 'opencode-go/other']]) {
    fs.writeFileSync(path.join(dirs.opencodeAgents, `${name}.md`), opencodeAgentText(name, model, 'low'));
  }
  fs.writeFileSync(path.join(dirs.opencodeCommands, `${COMMAND}.md`), ['---', `description: ${COMMAND}`, 'model: opencode-go/other#high', '---', '', 'body', ''].join('\n'));
  fs.writeFileSync(path.join(dirs.claudeAgents, `${WORKER}.md`), claudeAgentText(WORKER, 'opus'));
  dirs.localAgent = name => path.join(dirs.project, '.opencode', 'agents', `${name}.md`);
  dirs.localCommand = name => path.join(dirs.project, '.opencode', 'commands', `${name}.md`);
  dirs.cleanup = () => fs.rmSync(root, { recursive: true, force: true });
  return dirs;
}

const read = file => fs.readFileSync(file, 'utf8');
const lineOf = (text, key) => (text.match(new RegExp(`^${key}:.*$`, 'm')) || [null])[0];

function adapterFor(dirs, extra = {}) {
  return createOpencodeAdapter({
    projectPath: dirs.project,
    packageRoot: REPO_ROOT,
    globalAgentRoot: dirs.opencodeAgents,
    globalCommandRoot: dirs.opencodeCommands,
    claudeGlobalAgentRoot: dirs.claudeAgents,
    checkClaudeAgents: names => Object.fromEntries(names.map(name => [name, null])),
    ...extra,
  });
}

// Runs the post-setup menu on the real OpenCode adapter, with the Claude Code probe replaced by `probe` and the model
// catalog answered from a fixture.
async function runMenu(dirs, { answers, items, probe }) {
  const asked = [];
  const warnings = [];
  const logs = [];
  const original = modelCustomization.createOpencodeAdapter;
  const originalWarn = console.warn;
  const originalLog = console.log;
  modelCustomization.createOpencodeAdapter = options => original({
    ...options,
    claudeGlobalAgentRoot: dirs.claudeAgents,
    runCommand: async (executable, args) => {
      if (Array.isArray(args) && args[0] === 'models') return { status: 0, stdout: 'opencode-go/deepseek\n', stderr: '' };
      return { status: 0, stdout: '[]', stderr: '' };
    },
    checkClaudeAgents: names => (probe ? probe(names) : Object.fromEntries(names.map(name => [name, null]))),
  });
  console.warn = message => warnings.push(String(message));
  console.log = message => logs.push(String(message));
  try {
    const queue = [...answers];
    const outcome = await runPostSetupMenu({
      projectPath: dirs.project,
      isTTY: true,
      claudeGlobalAgentRoot: dirs.claudeAgents,
      claudeGlobalCommandRoot: dirs.claudeCommands,
      opencodeGlobalAgentRoot: dirs.opencodeAgents,
      opencodeGlobalCommandRoot: dirs.opencodeCommands,
      claudePresetDir: dirs.presets,
      opencodePresetDir: dirs.presets,
      promptInput: async () => 'mix',
      promptChoice: async (question, options) => {
        asked.push({ question, options });
        assert.ok(queue.length > 0, `unexpected prompt: ${question}`);
        const answer = queue.shift();
        if (answer !== null && answer !== BACK) assert.ok(options.includes(answer), `${question} offers ${answer}; options: ${options}`);
        return answer;
      },
      promptChecklist: async (targets, defaults) => ({ status: 'confirmed', items: items || defaults }),
    });
    assert.deepEqual(queue, [], 'every scripted answer is consumed');
    return { result: outcome, asked, warnings, logs };
  } finally {
    modelCustomization.createOpencodeAdapter = original;
    console.warn = originalWarn;
    console.log = originalLog;
  }
}

test('E12 the Claude Code route is offered on opencode worker rows only, and mixing rows warns', async () => {
  const dirs = fixture();
  try {
    const outcome = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'OpenCode', 'All', CLAUDE_PASSTHROUGH_LABEL, null],
      items: [`worker:${WORKER}`, `command:${COMMAND}`],
    });
    const provider = outcome.asked.find(entry => entry.question.startsWith('Provider for'));
    assert.deepEqual(provider.options, [CLAUDE_PASSTHROUGH_LABEL, 'opencode-go'], 'the passthrough is the first provider option');
    const routed = read(dirs.localAgent(WORKER));
    assert.equal(lineOf(routed, 'harness'), 'harness: claude');
    assert.equal(lineOf(routed, 'model'), 'model: opencode-go/deepseek', 'the inert model line stays as it is');
    assert.equal(lineOf(routed, 'variant'), 'variant: low');
    assert.equal(fs.existsSync(dirs.localCommand(COMMAND)), false, 'a command wrapper is never routed');
    const warning = outcome.warnings.find(line => line.includes(COMMAND));
    assert.ok(warning && warning.includes('Claude Code passthrough') && warning.includes('worker files'), 'the warning names the row and the scope');
    assert.ok(outcome.logs.some(line => line.includes(WORKER) && line.includes('inert')), 'setup states that the opencode model is inert');
    assert.equal(outcome.result.reason, 'cancelled');
  } finally {
    dirs.cleanup();
  }
});

test('E12 a selection without worker rows offers no Claude Code route', async () => {
  const dirs = fixture();
  try {
    const outcome = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'OpenCode', 'Orchestrators', 'opencode-go', 'deepseek', null],
      items: [`command:${COMMAND}`],
    });
    const provider = outcome.asked.find(entry => entry.question.startsWith('Provider for'));
    assert.deepEqual(provider.options, ['opencode-go'], 'no passthrough on a command row');
    assert.equal(lineOf(read(dirs.localCommand(COMMAND)), 'harness'), null);
    assert.equal(lineOf(read(dirs.localCommand(COMMAND)), 'model'), 'model: opencode-go/deepseek');
  } finally {
    dirs.cleanup();
  }
});

test('E5 a missing Claude Code agent still writes the line and warns once, naming the worker and the piece', async () => {
  const dirs = fixture();
  try {
    const outcome = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'OpenCode', 'Workers', CLAUDE_PASSTHROUGH_LABEL, null],
      items: [`worker:${WORKER}`, `worker:${OTHER_WORKER}`],
      probe: names => Object.fromEntries(names.map(name => [name, name === WORKER ? null : 'claude-agent-missing'])),
    });
    assert.equal(lineOf(read(dirs.localAgent(WORKER)), 'harness'), 'harness: claude');
    assert.equal(lineOf(read(dirs.localAgent(OTHER_WORKER)), 'harness'), 'harness: claude', 'the line stays written whatever the probe found');
    const warnings = outcome.warnings.filter(line => line.includes(OTHER_WORKER));
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /set to run through Claude Code/);
    assert.match(warnings[0], /no agent file of that name/);
    assert.match(warnings[0], /runs through opencode with the model/);
    assert.equal(outcome.warnings.filter(line => line.includes(`${WORKER} `)).length, 0, 'a routed worker that resolves warns nothing');
  } finally {
    dirs.cleanup();
  }
});

test('M1 the setup probe resolves a globally installed Claude Code agent file', () => {
  const dirs = fixture();
  try {
    const adapter = createOpencodeAdapter({
      projectPath: dirs.project,
      packageRoot: REPO_ROOT,
      globalAgentRoot: dirs.opencodeAgents,
      globalCommandRoot: dirs.opencodeCommands,
      claudeGlobalAgentRoot: dirs.claudeAgents,
      // The real checkAgents path resolution, with the binary and session probe answered from the fixture.
      checkClaudeAgents: (names, context) => claudeDispatch.checkAgents(names, context, { probe: () => ({ available: true, authenticated: true }) }),
    });
    assert.deepEqual(adapter.checkPassthrough([WORKER, 'absent-worker']), { [WORKER]: null, 'absent-worker': 'claude-agent-missing' },
      'the global agents directory is read as <claude root>/agents, so an installed worker resolves');
  } finally {
    dirs.cleanup();
  }
});

test('E6 the SETTING column reads the Claude Code agent of a routed worker, or (unresolved)', () => {
  const dirs = fixture();
  try {
    const adapter = adapterFor(dirs);
    const worker = { family: 'worker', name: WORKER, value: `worker:${WORKER}` };
    assert.equal(adapter.effectiveSetting(worker), 'opencode-go/deepseek (low)');
    const routed = adapter.createLocalOverride(worker, { harness: 'claude' });
    assert.equal(routed.status, 'persisted');
    assert.equal(adapter.isPassthrough(worker), true);
    assert.equal(adapter.effectiveSetting(worker), '-> claude: anthropic/opus (high)');
    const unresolved = adapterFor(dirs, { claudeGlobalAgentRoot: path.join(dirs.root, 'empty') });
    assert.equal(unresolved.effectiveSetting(worker), '-> claude: (unresolved)', 'the project file is read before the global root');
  } finally {
    dirs.cleanup();
  }
});

test('E7 Save preset records the Claude Code route of every opencode worker, and Load preset writes it', async () => {
  const dirs = fixture();
  try {
    assert.equal(adapterFor(dirs).createLocalOverride({ family: 'worker', name: WORKER, value: `worker:${WORKER}` }, { harness: 'claude' }).status, 'persisted');
    await runMenu(dirs, { answers: ['Model customization', 'Save preset', 'OpenCode', 'Yes', null] });
    const saved = JSON.parse(read(path.join(dirs.presets, 'mix.json')));
    assert.equal(saved[`worker:${WORKER}`].harness, 'claude');
    assert.equal(saved[`worker:${OTHER_WORKER}`].harness, null, 'a worker that is not routed records null');

    fs.rmSync(path.join(dirs.project, '.opencode', 'agents', `${WORKER}.md`));
    await runMenu(dirs, { answers: ['Model customization', 'Load preset', 'OpenCode', 'mix', 'Yes', null] });
    assert.equal(lineOf(read(dirs.localAgent(WORKER)), 'harness'), 'harness: claude', 'the preset writes the line again');
    assert.equal(lineOf(read(dirs.localAgent(OTHER_WORKER)), 'harness'), null, 'the null entry writes no line');
  } finally {
    dirs.cleanup();
  }
});

test('E4 Reset to default models removes the Claude Code route of an opencode worker', async () => {
  const dirs = fixture();
  try {
    assert.equal(adapterFor(dirs).createLocalOverride({ family: 'worker', name: WORKER, value: `worker:${WORKER}` }, { harness: 'claude' }).status, 'persisted');
    assert.equal(lineOf(read(dirs.localAgent(WORKER)), 'harness'), 'harness: claude');
    await runMenu(dirs, { answers: ['Model customization', 'Reset to default models', 'OpenCode', null] });
    const text = read(dirs.localAgent(WORKER));
    assert.equal(lineOf(text, 'harness'), null, 'the factory definition carries no route line');
    assert.equal(lineOf(text, 'model'), 'model: opencode-go/deepseek');
  } finally {
    dirs.cleanup();
  }
});

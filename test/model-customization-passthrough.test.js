'use strict';

// "Customize models" > Claude Code > OpenCode passthrough: the option writes, shows, saves, loads, and removes the
// user-owned `harness: opencode` line of a Claude Code agent file (E1-E9 of the setup-opencode-passthrough change).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const modelCustomization = require('../bin/model-customization.js');
const { checkAgents, FALLBACK_CAUSES } = require('../sai/tools/opencode-dispatch.js');

const {
  runPostSetupMenu,
  selectClaudeSettings,
  patchFrontmatter,
  createClaudeAdapter,
  createOpencodeAdapter,
  isValidPresetEntry,
  formatRawSetting,
  OPENCODE_PASSTHROUGH_LABEL,
  CLAUDE_SETTINGS_CATALOG,
  BACK,
} = modelCustomization;

const REPO_ROOT = path.join(__dirname, '..');
const WORKER = 'sai-3-red-worker';
const OTHER_WORKER = 'sai-3-green-worker';
const COMMAND = 'sai-1-spec';
const UTILITY = 'sai-status';

const claudeAgentText = (name, lines = []) => ['---', `name: ${name}`, 'description: fixture', 'model: haiku', 'effort: low', ...lines, 'color: blue', '---', '', 'body', ''].join('\n');
const commandText = name => ['---', `description: ${name}`, 'model: opus', 'effort: high', '---', '', 'body', ''].join('\n');
const opencodeAgentText = (name, model, variant) => ['---', `name: ${name}`, `model: ${model}`, ...(variant ? [`variant: ${variant}`] : []), '---', '', 'body', ''].join('\n');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-passthrough-'));
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
  for (const name of [WORKER, OTHER_WORKER]) fs.writeFileSync(path.join(dirs.claudeAgents, `${name}.md`), claudeAgentText(name));
  for (const name of [COMMAND, UTILITY]) fs.writeFileSync(path.join(dirs.claudeCommands, `${name}.md`), commandText(name));
  dirs.localAgent = name => path.join(dirs.project, '.claude', 'agents', `${name}.md`);
  dirs.localCommand = name => path.join(dirs.project, '.claude', 'commands', `${name}.md`);
  dirs.cleanup = () => fs.rmSync(root, { recursive: true, force: true });
  return dirs;
}

function writeLocalAgent(dirs, name, lines) {
  fs.mkdirSync(path.dirname(dirs.localAgent(name)), { recursive: true });
  fs.writeFileSync(dirs.localAgent(name), claudeAgentText(name, lines));
}

const read = file => fs.readFileSync(file, 'utf8');
const lineOf = (text, key) => (text.match(new RegExp(`^${key}:.*$`, 'm')) || [null])[0];

function adapterFor(dirs, extra = {}) {
  return createClaudeAdapter({
    projectPath: dirs.project,
    packageRoot: REPO_ROOT,
    globalAgentRoot: dirs.claudeAgents,
    globalCommandRoot: dirs.claudeCommands,
    opencodeGlobalAgentRoot: dirs.opencodeAgents,
    ...extra,
  });
}

// Runs the post-setup menu on the real Claude Code adapter, with the opencode probe replaced by `probe`.
async function runMenu(dirs, { answers, items, probe, promptInput }) {
  const asked = [];
  const probeCalls = [];
  const original = modelCustomization.createClaudeAdapter;
  const warnings = [];
  const originalWarn = console.warn;
  const originalLog = console.log;
  modelCustomization.createClaudeAdapter = options => original({
    ...options,
    opencodeGlobalAgentRoot: dirs.opencodeAgents,
    checkOpencodeAgents: (names, context) => {
      probeCalls.push(names);
      return probe ? probe(names, context) : Object.fromEntries(names.map(name => [name, null]));
    },
  });
  console.warn = message => warnings.push(String(message));
  console.log = () => {};
  try {
    const queue = [...answers];
    const result = await runPostSetupMenu({
      projectPath: dirs.project,
      isTTY: true,
      claudeGlobalAgentRoot: dirs.claudeAgents,
      claudeGlobalCommandRoot: dirs.claudeCommands,
      opencodeGlobalAgentRoot: dirs.opencodeAgents,
      opencodeGlobalCommandRoot: dirs.opencodeCommands,
      claudePresetDir: dirs.presets,
      opencodePresetDir: dirs.presets,
      promptInput: promptInput || (async () => 'mix'),
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
    return { result, asked, probeCalls, warnings };
  } finally {
    modelCustomization.createClaudeAdapter = original;
    console.warn = originalWarn;
    console.log = originalLog;
  }
}

const modelPrompt = asked => asked.find(entry => entry.question.startsWith('Model for '));

test('E1 the model screen offers OpenCode passthrough first only when an agent-file row is selected', async () => {
  const dirs = fixture();
  try {
    const withAgent = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'All', null],
      items: [`worker:${WORKER}`, `command:${COMMAND}`],
    });
    assert.equal(modelPrompt(withAgent.asked).options[0], OPENCODE_PASSTHROUGH_LABEL);
    assert.deepEqual(modelPrompt(withAgent.asked).options.slice(1), ['opus', 'sonnet', 'fable', 'haiku']);

    const commandsOnly = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'Orchestrators', null],
      items: [`command:${COMMAND}`],
    });
    assert.ok(!modelPrompt(commandsOnly.asked).options.includes(OPENCODE_PASSTHROUGH_LABEL));
    const utilitiesOnly = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'Utilities', null],
      items: [`utility:${UTILITY}`],
    });
    assert.ok(!utilitiesOnly.asked.some(entry => entry.options.includes(OPENCODE_PASSTHROUGH_LABEL)));
  } finally {
    dirs.cleanup();
  }
});

test('E1 the selector returns the routing-only setting, and offers nothing extra by default', async () => {
  const calls = [];
  const choice = answer => async (question, options) => { calls.push(options); return answer; };
  assert.deepEqual(await selectClaudeSettings('x', choice(OPENCODE_PASSTHROUGH_LABEL), CLAUDE_SETTINGS_CATALOG, { offerPassthrough: true }), { harness: 'opencode' });
  assert.equal(calls[0][0], OPENCODE_PASSTHROUGH_LABEL);
  calls.length = 0;
  assert.equal(await selectClaudeSettings('x', choice(BACK), CLAUDE_SETTINGS_CATALOG), BACK);
  assert.ok(!calls[0].includes(OPENCODE_PASSTHROUGH_LABEL));
});

test('E2 choosing passthrough writes only the harness line and keeps model and effort as the fallback model', async () => {
  const dirs = fixture();
  try {
    writeLocalAgent(dirs, WORKER, []);
    const outcome = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'Workers', OPENCODE_PASSTHROUGH_LABEL, null],
      items: [`worker:${WORKER}`, `worker:${OTHER_WORKER}`],
    });
    assert.equal(outcome.result.reason, 'cancelled');
    for (const name of [WORKER, OTHER_WORKER]) {
      const text = read(dirs.localAgent(name));
      assert.equal(lineOf(text, 'harness'), 'harness: opencode', `${name} is routed`);
      assert.equal(lineOf(text, 'model'), 'model: haiku', `${name} keeps its model`);
      assert.equal(lineOf(text, 'effort'), 'effort: low', `${name} keeps its effort`);
      assert.ok(text.includes('color: blue') && text.endsWith('body\n'), 'every other line is untouched');
    }
    assert.equal(read(path.join(dirs.claudeAgents, `${WORKER}.md`)).includes('harness'), false, 'the global agent file is not edited');
  } finally {
    dirs.cleanup();
  }
});

test('E3 choosing a Claude model on a passthrough row writes model and effort and removes the harness line', async () => {
  const dirs = fixture();
  try {
    writeLocalAgent(dirs, WORKER, ['harness: opencode']);
    await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'Workers', 'sonnet', 'medium', null],
      items: [`worker:${WORKER}`],
    });
    const text = read(dirs.localAgent(WORKER));
    assert.equal(lineOf(text, 'harness'), null);
    assert.equal(lineOf(text, 'model'), 'model: sonnet');
    assert.equal(lineOf(text, 'effort'), 'effort: medium');
  } finally {
    dirs.cleanup();
  }
});

test('E4 Reset to default models removes the harness line', async () => {
  const dirs = fixture();
  try {
    writeLocalAgent(dirs, WORKER, ['harness: opencode']);
    fs.writeFileSync(dirs.localAgent(WORKER), read(dirs.localAgent(WORKER)).replace('model: haiku', 'model: opus'));
    await runMenu(dirs, {
      answers: ['Model customization', 'Reset to default models', 'Claude Code', null],
      items: [`worker:${WORKER}`],
    });
    const text = read(dirs.localAgent(WORKER));
    assert.equal(lineOf(text, 'harness'), null);
    assert.equal(lineOf(text, 'model'), 'model: haiku', 'the factory model comes back');
  } finally {
    dirs.cleanup();
  }
});

test('E5 a missing opencode binary or agent still writes the line and warns once per apply, naming the agent and the piece', async () => {
  const dirs = fixture();
  try {
    const probe = names => ({ [WORKER]: 'opencode-agent-missing', [OTHER_WORKER]: 'opencode-missing' });
    const outcome = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'Workers', OPENCODE_PASSTHROUGH_LABEL, null],
      items: [`worker:${WORKER}`, `worker:${OTHER_WORKER}`],
      probe,
    });
    for (const name of [WORKER, OTHER_WORKER]) assert.equal(lineOf(read(dirs.localAgent(name)), 'harness'), 'harness: opencode');
    assert.equal(outcome.probeCalls.length, 1, 'one probe per apply, not one per row');
    assert.deepEqual(outcome.probeCalls[0], [WORKER, OTHER_WORKER]);
    assert.equal(outcome.warnings.length, 2);
    assert.match(outcome.warnings[0], new RegExp(`${WORKER}.*${FALLBACK_CAUSES['opencode-agent-missing']}`));
    assert.match(outcome.warnings[1], new RegExp(`${OTHER_WORKER}.*${FALLBACK_CAUSES['opencode-missing']}`));

    const clean = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'Workers', OPENCODE_PASSTHROUGH_LABEL, null],
      items: [`worker:${WORKER}`],
    });
    assert.deepEqual(clean.warnings, [], 'no warning when opencode can run the agent');
  } finally {
    dirs.cleanup();
  }
});

test('E5 the check reads opencode once and reports a cause per agent', () => {
  let probes = 0;
  const probe = () => { probes += 1; return { available: true, agents: ['a'] }; };
  assert.deepEqual(checkAgents(['a', 'b'], { cwd: '.' }, { probe }), { a: null, b: 'opencode-agent-missing' });
  assert.equal(probes, 1);
  assert.deepEqual(checkAgents(['a'], {}, { probe: () => ({ available: false, agents: null }) }), { a: 'opencode-missing' });
  assert.deepEqual(checkAgents(['a'], {}, { probe: () => ({ available: true, agents: null }) }), { a: 'opencode-agents-unavailable' });
});

test('E6 a passthrough row shows the model and variant of the same-named OpenCode agent, or (unresolved)', () => {
  const dirs = fixture();
  try {
    writeLocalAgent(dirs, WORKER, ['harness: opencode']);
    writeLocalAgent(dirs, OTHER_WORKER, ['harness: opencode']);
    fs.writeFileSync(path.join(dirs.opencodeAgents, `${WORKER}.md`), opencodeAgentText(WORKER, 'opencode-go/some-model', 'high'));
    const adapter = adapterFor(dirs);
    assert.equal(adapter.effectiveSetting({ family: 'worker', name: WORKER }), '-> opencode: opencode-go/some-model (high)');
    assert.equal(adapter.effectiveSetting({ family: 'worker', name: OTHER_WORKER }), '-> opencode: (unresolved)');
    // A row without the line, and a command wrapper that carries one, keep the Claude Code display.
    fs.writeFileSync(path.join(dirs.claudeCommands, `${COMMAND}.md`), commandText(COMMAND).replace('model: opus', 'model: opus\nharness: opencode'));
    assert.equal(adapter.effectiveSetting({ family: 'command', name: COMMAND }), 'anthropic/opus (high)');
    fs.rmSync(dirs.localAgent(OTHER_WORKER));
    assert.equal(adapter.effectiveSetting({ family: 'worker', name: OTHER_WORKER }), 'anthropic/haiku (low)');
  } finally {
    dirs.cleanup();
  }
});

test('E7 Save preset records the passthrough state of every Claude Code row, and Load preset writes or removes the line from it', async () => {
  const dirs = fixture();
  try {
    writeLocalAgent(dirs, WORKER, ['harness: opencode']);
    await runMenu(dirs, { answers: ['Model customization', 'Save preset', 'Claude Code', 'Yes', null] });
    const saved = JSON.parse(read(path.join(dirs.presets, 'mix.json')));
    assert.deepEqual(saved[`worker:${WORKER}`], { model: 'haiku', effort: 'low', harness: 'opencode' });
    assert.deepEqual(saved[`worker:${OTHER_WORKER}`], { model: 'haiku', effort: 'low', harness: null });
    assert.deepEqual(saved[`command:${COMMAND}`], { model: 'opus', effort: 'high', harness: null });

    // Load: the saved routing wins in both directions; an older entry without the value leaves the line alone.
    writeLocalAgent(dirs, OTHER_WORKER, []);
    writeLocalAgent(dirs, 'sai-3-red-worker', ['harness: opencode']);
    fs.writeFileSync(path.join(dirs.presets, 'load.json'), JSON.stringify({
      [`worker:${WORKER}`]: { model: 'sonnet', effort: 'medium', harness: null },
      [`worker:${OTHER_WORKER}`]: { model: 'opus', effort: 'high', harness: 'opencode' },
      [`worker:sai-4-review-worker`]: { model: 'opus', effort: 'high' },
      [`command:${COMMAND}`]: { model: 'sonnet', effort: 'low', harness: 'opencode' },
    }));
    writeLocalAgent(dirs, 'sai-4-review-worker', ['harness: opencode']);
    const outcome = await runMenu(dirs, { answers: ['Model customization', 'Load preset', 'Claude Code', 'load', 'Yes', null] });
    assert.equal(outcome.result.reason, 'cancelled');
    const routed = name => lineOf(read(dirs.localAgent(name)), 'harness');
    assert.equal(routed(WORKER), null, 'harness null removes the line');
    assert.equal(lineOf(read(dirs.localAgent(WORKER)), 'model'), 'model: sonnet');
    assert.equal(routed(OTHER_WORKER), 'harness: opencode', 'harness opencode writes the line');
    assert.equal(lineOf(read(dirs.localAgent(OTHER_WORKER)), 'model'), 'model: opus');
    assert.equal(routed('sai-4-review-worker'), 'harness: opencode', 'an older entry leaves the line as it is');
    assert.equal(lineOf(read(dirs.localAgent('sai-4-review-worker')), 'model'), 'model: opus');
    assert.equal(lineOf(read(dirs.localCommand(COMMAND)), 'harness'), null, 'a command wrapper is never routed');
    assert.equal(lineOf(read(dirs.localCommand(COMMAND)), 'model'), 'model: sonnet');
  } finally {
    dirs.cleanup();
  }
});

test('E7 a preset entry accepts its route value or null and rejects anything else', () => {
  assert.equal(isValidPresetEntry({ model: 'opus', effort: 'high', harness: 'opencode' }, 'claude'), true);
  assert.equal(isValidPresetEntry({ model: 'opus', harness: null }, 'claude'), true);
  assert.equal(isValidPresetEntry({ model: 'opus' }, 'claude'), true);
  for (const bad of ['claude', '', true, 1]) assert.equal(isValidPresetEntry({ model: 'opus', harness: bad }, 'claude'), false, String(bad));
  assert.equal(isValidPresetEntry({ model: 'a/b', variant: 'low', harness: 'claude' }, 'opencode'), true);
  assert.equal(isValidPresetEntry({ model: 'a/b', harness: null }, 'opencode'), true);
  assert.equal(isValidPresetEntry({ model: 'a/b' }, 'opencode'), true);
  for (const bad of ['opencode', '', true, 1]) assert.equal(isValidPresetEntry({ model: 'a/b', harness: bad }, 'opencode'), false, String(bad));
  assert.match(formatRawSetting({ model: 'opus', effort: 'high', harness: 'opencode' }, 'claude'), /-> opencode$/);
  assert.match(formatRawSetting({ model: 'a/b', variant: 'low', harness: 'claude' }, 'opencode'), /-> claude$/);
});

test('E8 in a mixed selection passthrough applies to the agent rows only and a warning names the others', async () => {
  const dirs = fixture();
  try {
    const outcome = await runMenu(dirs, {
      answers: ['Model customization', 'Customize models', 'Claude Code', 'All', OPENCODE_PASSTHROUGH_LABEL, null],
      items: [`worker:${WORKER}`, `command:${COMMAND}`, `utility:${UTILITY}`],
    });
    assert.equal(lineOf(read(dirs.localAgent(WORKER)), 'harness'), 'harness: opencode');
    assert.equal(fs.existsSync(dirs.localCommand(COMMAND)), false, 'the command wrapper keeps its setting and gets no local file');
    assert.equal(fs.existsSync(dirs.localCommand(UTILITY)), false);
    const notice = outcome.warnings.find(line => line.includes(COMMAND));
    assert.ok(notice && notice.includes(UTILITY), 'one warning names every row that was not routed');
    assert.deepEqual(outcome.probeCalls, [[WORKER]], 'only the routed agents are checked');
  } finally {
    dirs.cleanup();
  }
});

test('E8 the adapter refuses to route a command wrapper', () => {
  const dirs = fixture();
  try {
    const adapter = adapterFor(dirs);
    const result = adapter.createLocalOverride({ family: 'command', name: COMMAND, value: `command:${COMMAND}` }, { harness: 'opencode' });
    assert.equal(result.status, 'persistence-failed');
    assert.equal(fs.existsSync(dirs.localCommand(COMMAND)), false);
  } finally {
    dirs.cleanup();
  }
});

test('E9 the OpenCode screen routes a worker to Claude Code and removes the line again', () => {
  const dirs = fixture();
  try {
    const opencodeAgent = path.join(dirs.opencodeAgents, `${WORKER}.md`);
    fs.writeFileSync(opencodeAgent, ['---', `name: ${WORKER}`, 'model: opencode-go/a', 'variant: low', '---', '', 'body', ''].join('\n'));
    const agentRow = { family: 'worker', name: WORKER, value: `worker:${WORKER}` };
    const adapter = createOpencodeAdapter({
      projectPath: dirs.project,
      packageRoot: REPO_ROOT,
      globalAgentRoot: dirs.opencodeAgents,
      globalCommandRoot: dirs.opencodeCommands,
      claudeGlobalAgentRoot: dirs.claudeAgents,
      checkClaudeAgents: names => Object.fromEntries(names.map(name => [name, null])),
    });
    assert.equal(adapter.effectiveSetting(agentRow), 'opencode-go/a (low)');
    assert.equal(adapter.isPassthrough(agentRow), false);
    assert.equal(typeof adapter.checkPassthrough, 'function');

    const routed = adapter.createLocalOverride(agentRow, { harness: 'claude' });
    assert.equal(routed.status, 'persisted');
    let text = read(routed.destination);
    assert.ok(text.includes('harness: claude') && text.includes('model: opencode-go/a') && text.includes('variant: low'),
      'the route line joins the untouched model and variant');
    assert.equal(adapter.isPassthrough(agentRow), true);
    assert.equal(adapter.effectiveSetting(agentRow), '-> claude: anthropic/haiku (low)', 'the SETTING column reads the Claude Code agent');

    const model = adapter.createLocalOverride(agentRow, { model: 'opencode-go/b', variant: 'high' });
    assert.equal(model.status, 'persisted');
    text = read(model.destination);
    assert.ok(!text.includes('harness'), 'choosing a model removes the route line');
    assert.ok(text.includes('model: opencode-go/b') && text.includes('variant: high'));

    const refused = adapter.createLocalOverride(
      { family: 'agent', name: 'budget-explorer', value: 'agent:budget-explorer' },
      { harness: 'claude' }
    );
    assert.equal(refused.status, 'persistence-failed', 'the opencode Generic Agents are never routed');
  } finally {
    dirs.cleanup();
  }
});

test('I2 patchFrontmatter adds and removes harness like any managed line', () => {
  const keys = ['model', 'effort', 'harness'];
  const source = '---\nname: x\nmodel: haiku\neffort: low\ncolor: blue\n---\nbody\n';
  const routed = patchFrontmatter(source, keys, { harness: 'opencode' });
  assert.equal(routed, '---\nname: x\nmodel: haiku\neffort: low\ncolor: blue\nharness: opencode\n---\nbody\n');
  assert.equal(patchFrontmatter(routed, keys, { harness: 'opencode' }), routed, 'writing twice adds one line');
  assert.equal(patchFrontmatter(routed, keys, { model: 'opus', effort: 'high' }), '---\nname: x\nmodel: opus\neffort: high\ncolor: blue\n---\nbody\n');
  assert.equal(patchFrontmatter(routed, keys, { model: 'opus', effort: 'high', keepHarness: true }).includes('harness: opencode'), true);
  assert.equal(patchFrontmatter(routed, keys, { model: 'opus', harness: null }).includes('harness'), false);
  assert.equal(patchFrontmatter(routed, ['model', 'effort'], { model: 'opus', effort: 'high' }).includes('harness: opencode'), true, 'a caller that does not manage harness never touches it');
});

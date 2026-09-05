'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  materializeLocalOverride,
  createClaudeAdapter,
  createOpencodeAdapter,
} = require('../bin/model-customization.js');

const UTILITY_NAMES = ['sai-commit', 'sai-pr', 'sai-retire-docs', 'sai-status', 'sai-worktree'];
const SCRATCH_ROOT = path.join(__dirname, '..', '.tmp', 'customize-command-models', 'utility-source-root');
const ROOTS = [];

function makeFixture() {
  fs.mkdirSync(SCRATCH_ROOT, { recursive: true });
  const root = fs.mkdtempSync(path.join(SCRATCH_ROOT, 'case-'));
  ROOTS.push(root);
  const projectPath = path.join(root, 'project');
  const globalAgentRoot = path.join(root, 'global-agents');
  const globalCommandRoot = path.join(root, 'global-commands');
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(globalAgentRoot, { recursive: true });
  fs.mkdirSync(globalCommandRoot, { recursive: true });
  return { root, projectPath, globalAgentRoot, globalCommandRoot };
}

function claudeCommandSource(name) {
  return [
    '---',
    `name: ${name}`,
    'description: utility-owned description',
    'model: opus',
    'effort: high',
    '---',
    '',
    `# Utility body of ${name}`,
    'Keep this body byte-identical.',
    '',
  ].join('\n');
}

function opencodeCommandSource(name) {
  return [
    '---',
    `name: ${name}`,
    'description: utility-owned description',
    'model: opencode-go/old-model',
    'variant: old',
    '---',
    '',
    `# Utility body of ${name}`,
    'Keep this body byte-identical.',
    '',
  ].join('\n');
}

function claudeAgentSource(name) {
  return [
    '---',
    `name: ${name}`,
    'description: agent-owned description',
    'model: opus',
    'effort: high',
    '---',
    '',
    `# Agent body of ${name}`,
    '',
  ].join('\n');
}

function opencodeAgentSource(name) {
  return [
    '---',
    `name: ${name}`,
    'description: agent-owned description',
    'model: opencode-go/old-model',
    'variant: old',
    '---',
    '',
    `# Agent body of ${name}`,
    '',
  ].join('\n');
}

after(() => {
  fs.rmSync(SCRATCH_ROOT, { recursive: true, force: true });
});

test('utility without a local override persists from the global commands directory on opencode', () => {
  for (const name of UTILITY_NAMES) {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.globalCommandRoot, `${name}.md`), opencodeCommandSource(name));
    const result = materializeLocalOverride({
      agentName: name,
      settings: { model: 'opencode-go/glm-5.2', variant: 'high' },
      projectPath: fixture.projectPath,
      globalAgentRoot: fixture.globalAgentRoot,
      globalCommandRoot: fixture.globalCommandRoot,
      harness: 'opencode',
      family: 'utility',
    });
    assert.equal(result.status, 'persisted', `${name}: utility must persist from the global commands directory`);
    assert.equal(
      result.destination,
      path.join(fixture.projectPath, '.opencode', 'commands', `${name}.md`),
      `${name}: utility destination stays under .opencode/commands`
    );
    const written = fs.readFileSync(result.destination, 'utf8');
    assert.match(written, /model: opencode-go\/glm-5\.2\nvariant: high/);
    assert.match(written, new RegExp(`Utility body of ${name}`), `${name}: source body is preserved`);
  }
});

test('utility without a local override persists from the global commands directory on claude', () => {
  for (const name of UTILITY_NAMES) {
    const fixture = makeFixture();
    fs.writeFileSync(path.join(fixture.globalCommandRoot, `${name}.md`), claudeCommandSource(name));
    const result = materializeLocalOverride({
      agentName: name,
      settings: { model: 'sonnet', effort: 'medium' },
      projectPath: fixture.projectPath,
      globalAgentRoot: fixture.globalAgentRoot,
      globalCommandRoot: fixture.globalCommandRoot,
      harness: 'claude',
      family: 'utility',
    });
    assert.equal(result.status, 'persisted', `${name}: utility must persist from the global commands directory`);
    assert.equal(
      result.destination,
      path.join(fixture.projectPath, '.claude', 'commands', `${name}.md`),
      `${name}: utility destination stays under .claude/commands`
    );
    const written = fs.readFileSync(result.destination, 'utf8');
    assert.match(written, /model: sonnet\neffort: medium/);
    assert.match(written, new RegExp(`Utility body of ${name}`), `${name}: source body is preserved`);
  }
});

test('utility with an existing local override keeps patching the local file', () => {
  for (const harness of ['claude', 'opencode']) {
    const fixture = makeFixture();
    const name = 'sai-retire-docs';
    const localDir = harness === 'claude'
      ? path.join(fixture.projectPath, '.claude', 'commands')
      : path.join(fixture.projectPath, '.opencode', 'commands');
    const destination = path.join(localDir, `${name}.md`);
    const existing = harness === 'claude' ? claudeCommandSource(name) : opencodeCommandSource(name);
    fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(destination, existing);
    const settings = harness === 'claude'
      ? { model: 'sonnet', effort: 'medium' }
      : { model: 'opencode-go/glm-5.2', variant: 'high' };
    const result = materializeLocalOverride({
      agentName: name,
      settings,
      projectPath: fixture.projectPath,
      globalAgentRoot: fixture.globalAgentRoot,
      globalCommandRoot: fixture.globalCommandRoot,
      harness,
      family: 'utility',
    });
    assert.equal(result.status, 'persisted', `${harness}: existing local utility override must persist`);
    assert.equal(result.destination, destination);
    const written = fs.readFileSync(destination, 'utf8');
    if (harness === 'claude') {
      assert.match(written, /model: sonnet\neffort: medium/);
    } else {
      assert.match(written, /model: opencode-go\/glm-5\.2\nvariant: high/);
    }
  }
});

test('utility ignores a same-named file in the global agents directory', () => {
  for (const harness of ['claude', 'opencode']) {
    const fixture = makeFixture();
    const name = 'sai-retire-docs';
    const decoy = harness === 'claude' ? claudeAgentSource(name) : opencodeAgentSource(name);
    fs.writeFileSync(path.join(fixture.globalAgentRoot, `${name}.md`), decoy);
    const settings = harness === 'claude'
      ? { model: 'sonnet', effort: 'medium' }
      : { model: 'opencode-go/glm-5.2', variant: 'high' };
    const result = materializeLocalOverride({
      agentName: name,
      settings,
      projectPath: fixture.projectPath,
      globalAgentRoot: fixture.globalAgentRoot,
      globalCommandRoot: fixture.globalCommandRoot,
      harness,
      family: 'utility',
    });
    assert.deepEqual(result, {
      status: 'skipped',
      agent: name,
      reason: 'missing-source',
      diagnostic: `Skipped ${name}: installed source is unavailable.`,
    }, `${harness}: utility must not fall back to the global agents directory`);
  }
});

test('a genuinely absent global source still returns skipped missing-source for utility', () => {
  for (const harness of ['claude', 'opencode']) {
    const fixture = makeFixture();
    const name = 'sai-retire-docs';
    const settings = harness === 'claude'
      ? { model: 'sonnet', effort: 'medium' }
      : { model: 'opencode-go/glm-5.2', variant: 'high' };
    const result = materializeLocalOverride({
      agentName: name,
      settings,
      projectPath: fixture.projectPath,
      globalAgentRoot: fixture.globalAgentRoot,
      globalCommandRoot: fixture.globalCommandRoot,
      harness,
      family: 'utility',
    });
    assert.deepEqual(result, {
      status: 'skipped',
      agent: name,
      reason: 'missing-source',
      diagnostic: `Skipped ${name}: installed source is unavailable.`,
    });
    const localDir = harness === 'claude'
      ? path.join(fixture.projectPath, '.claude', 'commands')
      : path.join(fixture.projectPath, '.opencode', 'commands');
    assert.equal(fs.existsSync(path.join(localDir, `${name}.md`)), false);
  }
});

test('worker, agent, and command families keep their existing source roots', () => {
  const workerName = 'sai-1-spec-proposal-worker';
  const agentName = 'explore';
  const commandName = 'sai-explore';
  for (const harness of ['claude', 'opencode']) {
    const readSource = harness === 'claude' ? claudeAgentSource : opencodeAgentSource;
    const settings = harness === 'claude'
      ? { model: 'sonnet', effort: 'medium' }
      : { model: 'opencode-go/glm-5.2', variant: 'high' };
    const agentsDir = harness === 'claude' ? '.claude' : '.opencode';

    const workerFixture = makeFixture();
    fs.writeFileSync(path.join(workerFixture.globalAgentRoot, `${workerName}.md`), readSource(workerName));
    const workerResult = materializeLocalOverride({
      agentName: workerName,
      settings,
      projectPath: workerFixture.projectPath,
      globalAgentRoot: workerFixture.globalAgentRoot,
      globalCommandRoot: workerFixture.globalCommandRoot,
      harness,
      family: 'worker',
    });
    assert.equal(workerResult.status, 'persisted', `${harness}: worker still reads the global agents directory`);
    assert.equal(workerResult.destination, path.join(workerFixture.projectPath, agentsDir, 'agents', `${workerName}.md`));

    const agentFixture = makeFixture();
    fs.writeFileSync(path.join(agentFixture.globalAgentRoot, `${agentName}.md`), readSource(agentName));
    const agentResult = materializeLocalOverride({
      agentName: agentName,
      settings,
      projectPath: agentFixture.projectPath,
      globalAgentRoot: agentFixture.globalAgentRoot,
      globalCommandRoot: agentFixture.globalCommandRoot,
      harness,
      family: 'agent',
    });
    assert.equal(agentResult.status, 'persisted', `${harness}: agent still reads the global agents directory`);

    const commandFixture = makeFixture();
    const commandSource = harness === 'claude' ? claudeCommandSource(commandName) : opencodeCommandSource(commandName);
    fs.writeFileSync(path.join(commandFixture.globalCommandRoot, `${commandName}.md`), commandSource);
    const commandResult = materializeLocalOverride({
      agentName: commandName,
      settings,
      projectPath: commandFixture.projectPath,
      globalAgentRoot: commandFixture.globalAgentRoot,
      globalCommandRoot: commandFixture.globalCommandRoot,
      harness,
      family: 'command',
    });
    assert.equal(commandResult.status, 'persisted', `${harness}: command still reads the global commands directory`);
    assert.equal(commandResult.destination, path.join(commandFixture.projectPath, agentsDir, 'commands', `${commandName}.md`));
  }
});

test('adapter createLocalOverride persists a utility without a local override from the global commands directory', () => {
  const name = 'sai-retire-docs';
  const opencodeFixture = makeFixture();
  fs.writeFileSync(path.join(opencodeFixture.globalCommandRoot, `${name}.md`), opencodeCommandSource(name));
  const opencode = createOpencodeAdapter({
    projectPath: opencodeFixture.projectPath,
    globalAgentRoot: opencodeFixture.globalAgentRoot,
    globalCommandRoot: opencodeFixture.globalCommandRoot,
  });
  const opencodeResult = opencode.createLocalOverride(
    { family: 'utility', name },
    { model: 'opencode-go/glm-5.2', variant: 'high' }
  );
  assert.equal(opencodeResult.status, 'persisted');
  assert.equal(
    opencodeResult.destination,
    path.join(opencodeFixture.projectPath, '.opencode', 'commands', `${name}.md`)
  );
  assert.match(fs.readFileSync(opencodeResult.destination, 'utf8'), /model: opencode-go\/glm-5\.2\nvariant: high/);

  const claudeFixture = makeFixture();
  fs.writeFileSync(path.join(claudeFixture.globalCommandRoot, `${name}.md`), claudeCommandSource(name));
  const claude = createClaudeAdapter({
    projectPath: claudeFixture.projectPath,
    globalAgentRoot: claudeFixture.globalAgentRoot,
    globalCommandRoot: claudeFixture.globalCommandRoot,
  });
  const claudeResult = claude.createLocalOverride(
    { family: 'utility', name },
    { model: 'sonnet', effort: 'medium' }
  );
  assert.equal(claudeResult.status, 'persisted');
  assert.equal(
    claudeResult.destination,
    path.join(claudeFixture.projectPath, '.claude', 'commands', `${name}.md`)
  );
  assert.match(fs.readFileSync(claudeResult.destination, 'utf8'), /model: sonnet\neffort: medium/);

  void os.tmpdir();
});

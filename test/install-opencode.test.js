'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const childProcess = require('child_process');

const { installOpencode, copyOpencodeConfig, OPENCODE_INSTALL_CMD, probeOpencode, runOpencodeInstall, promptYesNoReadline, offerOpencodeInstall } = require('../bin/install-flow.js');
const jsonc = require('jsonc-parser');

const AGENT_PLACEHOLDER = { mode: 'subagent', model: 'opencode-go/deepseek-v4-flash' };
const AGENT_KEYS = ['explore', 'executor', 'budget'];

test('installOpencode copies commands/opencode/*.md to dest/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  const cmdDir = path.join(tmpDir, 'commands');
  assert.ok(fs.existsSync(cmdDir), 'commands/ dir should exist');
  const files = fs.readdirSync(cmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in commands/');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode copies all Opencode-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-subagent', 'SKILL.md')), 'skills/budget-subagent/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Opencode');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig copies config when no existing config', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  copyOpencodeConfig(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'opencode.jsonc')), 'opencode.jsonc should be copied when none exists');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig skips copy and prints instructions when opencode.jsonc exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), '{}');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg) + '\n'; };
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'), '{}', 'existing config should not be overwritten');
  assert.ok(printed.includes('"agent"'), 'should print manual instructions containing "agent"');
  assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig skips copy and prints instructions when opencode.json exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), '{}');
  let printed = '';
  const origLog = console.log;
  console.log = (msg) => { printed += String(msg) + '\n'; };
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(printed.includes('"agent"'), 'should print manual instructions when opencode.json exists');
  assert.ok(printed.includes('"budget"'), 'should print the budget agent key in manual instructions');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode overwrites existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old sentinel content');
  installOpencode(tmpDir);
  const expected = fs.readFileSync(path.join(__dirname, '..', 'commands', 'opencode', 'sai-1-spec.md'), 'utf8');
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), expected, 'existing vendor command should be overwritten with repo version');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode overwrites stale command wrappers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  installOpencode(tmpDir);
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing stale file should be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Step 2: Agent key merge tests ---

test('copyOpencodeConfig inserts agent keys into opencode.json when no agent exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.ok(parsed.agent, 'agent block should exist');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be inserted`);
  }
  assert.ok(!fs.existsSync(path.join(tmpDir, 'opencode.jsonc')), 'should not create opencode.jsonc');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig inserts agent keys into opencode.jsonc when no agent exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), JSON.stringify({ theme: 'dark' }));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'));
  assert.ok(parsed.agent, 'agent block should exist in opencode.jsonc');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be inserted into opencode.jsonc`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig merges only opencode.json when both files exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  const jsoncContent = JSON.stringify({ theme: 'light' });
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), jsoncContent);
  const beforeJsoncBytes = Buffer.from(jsoncContent, 'utf8');
  copyOpencodeConfig(tmpDir);
  const jsonParsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.ok(jsonParsed.agent, 'agent should exist in opencode.json after merge');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(jsonParsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be added to opencode.json`);
  }
  const afterJsoncBytes = fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'));
  assert.deepEqual(afterJsoncBytes, beforeJsoncBytes, 'opencode.jsonc should remain untouched');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves comments and unrelated keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const fixture = '{\n  // preserve this comment\n  "theme": "dark"\n}\n';
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), fixture);
  copyOpencodeConfig(tmpDir);
  const raw = fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8');
  assert.ok(raw.includes('// preserve this comment'), 'comment text should survive');
  assert.ok(raw.includes('"theme"'), 'theme key should survive');
  const parsed = jsonc.parse(raw);
  assert.equal(parsed.theme, 'dark', 'theme value should be unchanged');
  assert.deepEqual(Object.keys(parsed).sort(), ['agent', 'theme'].sort(), 'only agent and theme should be top-level keys');
  for (const key of AGENT_KEYS) {
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be added`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves non-target agent children', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { custom: { mode: 'subagent', model: 'my-model' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.deepEqual(parsed.agent.custom, { mode: 'subagent', model: 'my-model' }, 'agent.custom should survive');
  for (const key of AGENT_KEYS) {
    assert.ok(key in parsed.agent, `agent.${key} should exist alongside custom`);
    assert.deepEqual(parsed.agent[key], AGENT_PLACEHOLDER, `agent.${key} should be inserted alongside custom`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig does not overwrite existing target key', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { explore: { mode: 'subagent', model: 'my-custom-model' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.deepEqual(parsed.agent.explore, { mode: 'subagent', model: 'my-custom-model' }, 'existing explore should not be overwritten');
  assert.ok('executor' in parsed.agent, 'executor should be present');
  assert.deepEqual(parsed.agent.executor, AGENT_PLACEHOLDER, 'executor should be inserted');
  assert.ok('budget' in parsed.agent, 'budget should be present');
  assert.deepEqual(parsed.agent.budget, AGENT_PLACEHOLDER, 'budget should be inserted');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig is idempotent when fully configured', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const beforeBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  copyOpencodeConfig(tmpDir);
  const afterBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  assert.deepEqual(afterBytes, beforeBytes, 'file should be unchanged when fully configured');
  copyOpencodeConfig(tmpDir);
  const secondRunBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  assert.deepEqual(secondRunBytes, afterBytes, 'second run should produce identical bytes');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig prints add-notice naming only added keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { explore: { mode: 'subagent', model: 'opencode-go/deepseek-v4-flash' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  const addedLines = messages.filter(m => /added/i.test(m));
  assert.ok(addedLines.some(l => l.includes('executor')), 'should name executor as added');
  assert.ok(addedLines.some(l => l.includes('budget')), 'should name budget as added');
  assert.ok(!addedLines.some(l => l.includes('explore')), 'should NOT name explore as added');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig prints no add-notice when nothing added', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(!messages.some(m => /added/i.test(m)), 'should not print any add-notice');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig falls back gracefully for unparseable JSONC', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const configPath = path.join(tmpDir, 'opencode.jsonc');
  const badContent = '{{{{ not valid jsonc }}}}';
  fs.writeFileSync(configPath, badContent);
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(configPath, 'utf8'), badContent, 'unparseable file should remain unchanged');
  const joined = messages.join('\n');
  assert.ok(joined.includes('Opencode config already exists'), 'should print intro line for fallback');
  assert.ok(joined.includes('// Your trusted low-cost model below'), 'fallback should use the correct comment');
  assert.ok(!joined.includes('// Put your trusted low-cost model here'), 'must not contain the put-model-here string');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig falls back gracefully for non-object root', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const configPath = path.join(tmpDir, 'opencode.json');
  const arrayContent = JSON.stringify(['item1', 'item2']);
  fs.writeFileSync(configPath, arrayContent);
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(configPath, 'utf8'), arrayContent, 'array-root config should remain unchanged');
  const joined = messages.join('\n');
  assert.ok(joined.includes('Opencode config already exists'), 'should print fallback for non-object root');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig suppresses verification message after successful merge', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(!messages.some(m => m.includes('Verify that you have these settings')), 'should not print verification message after merge');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Step 1: Opencode install offer tests ---

test('offerOpencodeInstall (binary present) does nothing', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  let promptYesNoCalled = false;
  await offerOpencodeInstall({
    probe: () => true,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when binary is present');
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called when binary is present');
  assert.equal(messages.length, 0, 'nothing should be printed when binary is present');
});

test('offerOpencodeInstall (absent + TTY + yes) runs install', async () => {
  let runInstallCalled = 0;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled++; return true; },
    promptYesNo: async () => true,
    isTTY: true,
  });
  assert.equal(runInstallCalled, 1, 'runInstall should be called exactly once when user says yes');
});

test('offerOpencodeInstall (absent + TTY + no) prints command', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => false,
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when user declines');
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include install command');
});

test('offerOpencodeInstall (absent + no TTY) prints without prompting', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let promptYesNoCalled = false;
  let runInstallCalled = false;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: false,
  });
  console.log = origLog;
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called in non-TTY mode');
  assert.equal(runInstallCalled, false, 'runInstall should not be called in non-TTY mode');
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include install command');
});

test('offerOpencodeInstall (install failure) does not throw', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => false,
    promptYesNo: async () => true,
    isTTY: true,
  });
  console.log = origLog;
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include manual install command');
});

test('probeOpencode uses spawnSync exit-code semantics', () => {
  const origSpawnSync = childProcess.spawnSync;
  const spawnSyncCalls = [];
  childProcess.spawnSync = (...args) => {
    spawnSyncCalls.push(args);
    const callIndex = spawnSyncCalls.length - 1;
    if (callIndex === 0) return { error: new Error('not found'), status: null, stdout: '', stderr: '' };
    if (callIndex === 1) return { error: null, status: 1, stdout: '', stderr: '' };
    if (callIndex === 2) return { error: null, status: 0, stdout: 'opencode x.y.z\n', stderr: '' };
    return { error: null, status: 0, stdout: '', stderr: '' };
  };
  try {
    assert.equal(probeOpencode(), false, 'error should return false');
    assert.equal(probeOpencode(), false, 'non-zero status should return false');
    assert.equal(probeOpencode(), true, 'zero status should return true');
    assert.ok(spawnSyncCalls.length >= 3, 'spawnSync should be called at least 3 times');
    for (const call of spawnSyncCalls) {
      assert.equal(typeof call[0], 'string', 'should use string command');
      assert.equal(call[0], 'opencode --version', 'should use exact command string');
      assert.equal(call[1]?.shell, true, 'should use shell: true');
    }
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
});


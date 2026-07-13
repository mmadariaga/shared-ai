'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const childProcess = require('child_process');

const {
  CODEGRAPH_CLI_INSTALL_CMD,
  CODEGRAPH_MCP_INSTALL_CMD,
  CODEGRAPH_WIRING_HINT,
  probeCodegraph,
  runCodegraphInstall,
  offerCodegraphInstall,
} = require('../bin/install-flow.js');

const { ensureCodegraphIndex } = require('../bin/setup.js');

test('probeCodegraph uses spawnSync exit-code semantics', () => {
  const origSpawnSync = childProcess.spawnSync;
  const spawnSyncCalls = [];
  childProcess.spawnSync = (...args) => {
    spawnSyncCalls.push(args);
    const callIndex = spawnSyncCalls.length - 1;
    if (callIndex === 0) return { error: new Error('not found'), status: null, stdout: '', stderr: '' };
    if (callIndex === 1) return { error: null, status: 1, stdout: '', stderr: '' };
    if (callIndex === 2) return { error: null, status: 0, stdout: 'codegraph x.y.z\n', stderr: '' };
    return { error: null, status: 0, stdout: '', stderr: '' };
  };
  try {
    assert.equal(probeCodegraph(), false, 'error should return false');
    assert.equal(probeCodegraph(), false, 'non-zero status should return false');
    assert.equal(probeCodegraph(), true, 'zero status should return true');
    assert.ok(spawnSyncCalls.length >= 3, 'spawnSync should be called at least 3 times');
    for (const call of spawnSyncCalls) {
      assert.equal(typeof call[0], 'string', 'should use string command');
      assert.equal(call[0], 'codegraph --version', 'should use exact command string');
      assert.equal(call[1]?.shell, true, 'should use shell: true');
    }
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
});

test('offerCodegraphInstall (binary present) prints wiring hint', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  let promptYesNoCalled = false;
  await offerCodegraphInstall({
    probe: () => true,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when binary is present');
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called when binary is present');
  assert.ok(messages.some(m => m.includes(CODEGRAPH_WIRING_HINT)), 'should print wiring hint');
});

test('offerCodegraphInstall (binary present, no TTY) prints wiring hint', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  let promptYesNoCalled = false;
  await offerCodegraphInstall({
    probe: () => true,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: false,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called');
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called');
  assert.ok(messages.some(m => m.includes(CODEGRAPH_WIRING_HINT)), 'should print wiring hint');
});

test('offerCodegraphInstall (absent + TTY + yes) runs install', async () => {
  let runInstallCalled = 0;
  await offerCodegraphInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled++; return true; },
    promptYesNo: async () => true,
    isTTY: true,
  });
  assert.equal(runInstallCalled, 1, 'runInstall should be called exactly once when user says yes');
});

test('offerCodegraphInstall (absent + TTY + no) prints commands', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  await offerCodegraphInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => false,
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when user declines');
  assert.ok(messages.some(m => m.includes(CODEGRAPH_CLI_INSTALL_CMD)), 'output should include CLI install command');
  assert.ok(messages.some(m => m.includes(CODEGRAPH_MCP_INSTALL_CMD)), 'output should include MCP install command');
});

test('offerCodegraphInstall (absent + no TTY) prints without prompting', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let promptYesNoCalled = false;
  let runInstallCalled = false;
  await offerCodegraphInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: false,
  });
  console.log = origLog;
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called in non-TTY mode');
  assert.equal(runInstallCalled, false, 'runInstall should not be called in non-TTY mode');
  assert.ok(messages.some(m => m.includes(CODEGRAPH_CLI_INSTALL_CMD)), 'output should include CLI install command');
  assert.ok(messages.some(m => m.includes(CODEGRAPH_MCP_INSTALL_CMD)), 'output should include MCP install command');
});

test('offerCodegraphInstall (install failure) does not throw', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  await offerCodegraphInstall({
    probe: () => false,
    runInstall: () => false,
    promptYesNo: async () => true,
    isTTY: true,
  });
  console.log = origLog;
  assert.ok(messages.some(m => m.includes(CODEGRAPH_CLI_INSTALL_CMD)), 'output should include manual CLI install command');
  assert.ok(messages.some(m => m.includes(CODEGRAPH_MCP_INSTALL_CMD)), 'output should include manual MCP install command');
});

// --- Step 2: ensureCodegraphIndex tests ---

test('ensureCodegraphIndex runs init when index absent and binary present', () => {
  const runInitCalls = [];
  ensureCodegraphIndex('/some/project', {
    probe: () => true,
    runInit: (cwd) => { runInitCalls.push(cwd); },
    indexExists: () => false,
  });
  assert.equal(runInitCalls.length, 1, 'runInit should be called once');
  assert.equal(runInitCalls[0], '/some/project', 'runInit should receive projectPath');
});

test('ensureCodegraphIndex skips init when binary absent', () => {
  let runInitCalled = false;
  ensureCodegraphIndex('/some/project', {
    probe: () => false,
    runInit: () => { runInitCalled = true; },
    indexExists: () => false,
  });
  assert.equal(runInitCalled, false, 'runInit should not be called when binary is absent');
});

test('ensureCodegraphIndex is noop when index already present', () => {
  let runInitCalled = false;
  ensureCodegraphIndex('/some/project', {
    probe: () => true,
    runInit: () => { runInitCalled = true; },
    indexExists: () => true,
  });
  assert.equal(runInitCalled, false, 'runInit should not be called when index exists');
});

test('ensureCodegraphIndex uses plain codegraph init form', () => {
  const spawnSyncCalls = [];
  const origSpawnSync = childProcess.spawnSync;
  childProcess.spawnSync = (...args) => { spawnSyncCalls.push(args); return { status: 0 }; };
  try {
    ensureCodegraphIndex('/some/project', {
      probe: () => true,
      indexExists: () => false,
    });
    assert.ok(spawnSyncCalls.some(c => c[0] === 'codegraph' && Array.isArray(c[1]) && c[1][0] === 'init'), 'should spawn codegraph init');
    assert.ok(spawnSyncCalls.some(c => c[2]?.cwd === '/some/project'), 'should pass cwd as projectPath');
    assert.ok(!spawnSyncCalls.some(c => Array.isArray(c[1]) && c[1].includes('-i')), 'should not use -i flag');
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
});

test('ensureCodegraphIndex does not abort on failed init', () => {
  const origSpawnSync = childProcess.spawnSync;
  childProcess.spawnSync = () => ({ status: 1, error: new Error('fail') });
  try {
    ensureCodegraphIndex('/some/project', {
      probe: () => true,
      indexExists: () => false,
    });
    assert.ok(true, 'does not throw on failed init');
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('child_process');

const {
  OPENSPEC_INSTALL_CMD,
  probeOpenspec,
  offerOpenspecInstall,
} = require('../bin/install-flow.js');

test('probeOpenspec uses spawnSync exit-code semantics', () => {
  const origSpawnSync = childProcess.spawnSync;
  const spawnSyncCalls = [];
  childProcess.spawnSync = (...args) => {
    spawnSyncCalls.push(args);
    const callIndex = spawnSyncCalls.length - 1;
    if (callIndex === 0) return { error: new Error('not found'), status: null, stdout: '', stderr: '' };
    if (callIndex === 1) return { error: null, status: 1, stdout: '', stderr: '' };
    if (callIndex === 2) return { error: null, status: 0, stdout: 'openspec x.y.z\n', stderr: '' };
    return { error: null, status: 0, stdout: '', stderr: '' };
  };
  try {
    assert.equal(probeOpenspec(), false, 'error should return false');
    assert.equal(probeOpenspec(), false, 'non-zero status should return false');
    assert.equal(probeOpenspec(), true, 'zero status should return true');
    assert.ok(spawnSyncCalls.length >= 3, 'spawnSync should be called at least 3 times');
    for (const call of spawnSyncCalls) {
      assert.equal(typeof call[0], 'string', 'should use string command');
      assert.equal(call[0], 'openspec --version', 'should use exact command string');
      assert.equal(call[1]?.shell, true, 'should use shell: true');
    }
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
});

test('offerOpenspecInstall (binary present) returns true without prompting', async () => {
  let runInstallCalled = false;
  let promptYesNoCalled = false;
  const result = await offerOpenspecInstall({
    probe: () => true,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: true,
  });
  assert.equal(result, true, 'should return true when binary is present');
  assert.equal(runInstallCalled, false, 'runInstall should not be called when binary is present');
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called when binary is present');
});

test('offerOpenspecInstall (absent + TTY + yes + success) installs and returns true', async () => {
  let runInstallCalled = 0;
  const result = await offerOpenspecInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled++; return true; },
    promptYesNo: async () => true,
    isTTY: true,
  });
  assert.equal(runInstallCalled, 1, 'runInstall should be called exactly once when user says yes');
  assert.equal(result, true, 'should return true after a successful install');
});

test('offerOpenspecInstall (absent + TTY + no) prints command and returns false', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  let result;
  try {
    result = await offerOpenspecInstall({
      probe: () => false,
      runInstall: () => { runInstallCalled = true; return true; },
      promptYesNo: async () => false,
      isTTY: true,
    });
  } finally {
    console.log = origLog;
  }
  assert.equal(runInstallCalled, false, 'runInstall should not be called when user declines');
  assert.equal(result, false, 'should return false when user declines (openspec is required)');
  assert.ok(messages.some(m => m.includes(OPENSPEC_INSTALL_CMD)), 'output should include install command');
});

test('offerOpenspecInstall (absent + no TTY) prints command without prompting and returns false', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let promptYesNoCalled = false;
  let runInstallCalled = false;
  let result;
  try {
    result = await offerOpenspecInstall({
      probe: () => false,
      runInstall: () => { runInstallCalled = true; return true; },
      promptYesNo: async () => { promptYesNoCalled = true; return true; },
      isTTY: false,
    });
  } finally {
    console.log = origLog;
  }
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called in non-TTY mode');
  assert.equal(runInstallCalled, false, 'runInstall should not be called in non-TTY mode');
  assert.equal(result, false, 'should return false in non-TTY mode when absent');
  assert.ok(messages.some(m => m.includes(OPENSPEC_INSTALL_CMD)), 'output should include install command');
});

test('offerOpenspecInstall (install failure) prints command and returns false', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let result;
  try {
    result = await offerOpenspecInstall({
      probe: () => false,
      runInstall: () => false,
      promptYesNo: async () => true,
      isTTY: true,
    });
  } finally {
    console.log = origLog;
  }
  assert.equal(result, false, 'should return false when install fails');
  assert.ok(messages.some(m => m.includes(OPENSPEC_INSTALL_CMD)), 'output should include manual install command');
});

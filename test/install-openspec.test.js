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

// --- CLI minimum version: openspec upgrade offer ---

const { OPENSPEC_UPGRADE_CMD, offerCliUpgrade } = require('../bin/install-flow.js');

function upgradeHarness(overrides = {}) {
  const notices = [];
  const calls = { prompts: [], upgrades: [], rereads: 0 };
  const options = {
    cli: 'openspec',
    current: { installed: true, version: '1.13.0' },
    readVersionAgain: () => { calls.rereads += 1; return { installed: true, version: '1.13.1' }; },
    runUpgrade: (cli) => { calls.upgrades.push(cli); return true; },
    resolvePath: () => '/usr/local/bin/openspec',
    promptYesNo: async (question) => { calls.prompts.push(question); return true; },
    isTTY: true,
    notices,
    ...overrides,
  };
  return { options, notices, calls };
}

test('E1: a CLI that is not installed gets no version check and no message', async () => {
  const { options, notices, calls } = upgradeHarness({ current: { installed: false, version: null } });
  assert.equal(await offerCliUpgrade(options), 'not-installed');
  assert.deepEqual(notices, []);
  assert.deepEqual(calls.prompts, []);
});

test('E2: an unreadable version prints one line and offers nothing', async () => {
  const { options, notices, calls } = upgradeHarness({ current: { installed: true, version: null } });
  assert.equal(await offerCliUpgrade(options), 'unverified');
  assert.equal(notices.length, 1);
  assert.match(notices[0], /Cannot verify the OpenSpec version/);
  assert.deepEqual(calls.prompts, []);
  assert.deepEqual(calls.upgrades, []);
});

test('E3: a version equal to or above the minimum passes with no message', async () => {
  for (const version of ['1.13.1', '1.13.2', '1.14.0', '2.0.0']) {
    const { options, notices, calls } = upgradeHarness({ current: { installed: true, version } });
    assert.equal(await offerCliUpgrade(options), 'current', version);
    assert.deepEqual(notices, [], version);
    assert.deepEqual(calls.prompts, [], version);
  }
});

test('openspec below the minimum with a TTY: yes runs the upgrade command and reads the version again', async () => {
  const { options, notices, calls } = upgradeHarness();
  assert.equal(await offerCliUpgrade(options), 'upgraded');
  assert.deepEqual(calls.prompts, ['Upgrade OpenSpec now? [y/n] ']);
  assert.deepEqual(calls.upgrades, ['openspec']);
  assert.equal(calls.rereads, 1);
  assert.ok(notices.some(m => m.includes('1.13.0') && m.includes('1.13.1')), 'warns with both versions');
});

test('the openspec upgrade command is npm i -g @fission-ai/openspec@latest', () => {
  assert.equal(OPENSPEC_UPGRADE_CMD, 'npm i -g @fission-ai/openspec@latest');
});

test('E4: answering no prints the upgrade command, runs nothing, and does not ask again', async () => {
  const { options, notices, calls } = upgradeHarness({ promptYesNo: async (q) => { calls.prompts.push(q); return false; } });
  assert.equal(await offerCliUpgrade(options), 'declined');
  assert.deepEqual(calls.upgrades, []);
  assert.equal(calls.prompts.length, 1);
  assert.ok(notices.includes(OPENSPEC_UPGRADE_CMD));
});

test('without a TTY the upgrade command is printed and nothing is asked or run', async () => {
  const { options, notices, calls } = upgradeHarness({ isTTY: false });
  assert.equal(await offerCliUpgrade(options), 'printed');
  assert.deepEqual(calls.prompts, []);
  assert.deepEqual(calls.upgrades, []);
  assert.ok(notices.includes(OPENSPEC_UPGRADE_CMD));
});

test('E5: a failing upgrade command reports the failure, prints the manual command, and continues', async () => {
  const { options, notices, calls } = upgradeHarness({ runUpgrade: () => false });
  assert.equal(await offerCliUpgrade(options), 'failed');
  assert.ok(notices.some(m => /upgrade failed/i.test(m)));
  assert.ok(notices.includes('npm i -g @fission-ai/openspec@latest'));
  assert.equal(calls.rereads, 0, 'no re-read after a failed upgrade');
});

test('E6: still below the minimum after the upgrade warns about another binary and shows its path', async () => {
  const { options, notices } = upgradeHarness({
    readVersionAgain: () => ({ installed: true, version: '1.13.0' }),
    resolvePath: () => '/opt/old/bin/openspec',
  });
  assert.equal(await offerCliUpgrade(options), 'still-below');
  assert.ok(notices.some(m => m.includes('/opt/old/bin/openspec') && /older binary/.test(m)));
});

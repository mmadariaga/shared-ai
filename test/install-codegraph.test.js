'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const childProcess = require('child_process');

const {
  CODEGRAPH_CLI_INSTALL_CMD,
  CODEGRAPH_MCP_INSTALL_CMD,
  probeCodegraph,
  runCodegraphInstall,
  offerCodegraphInstall,
  isCodegraphMcpEnabledInConfig,
} = require('../bin/install-flow.js');

const { main, ensureCodegraphIndex } = require('../bin/setup.js');

test('isCodegraphMcpEnabledInConfig reads the opencode v1 mcp shape', () => {
  assert.equal(isCodegraphMcpEnabledInConfig({ mcp: { codegraph: { type: 'local' } } }), true);
  assert.equal(isCodegraphMcpEnabledInConfig({ mcp: { codegraph: { enabled: false } } }), false);
  assert.equal(isCodegraphMcpEnabledInConfig({ mcp: {} }), false);
});

test('isCodegraphMcpEnabledInConfig reads the opencode v2 mcp.servers shape codegraph writes', () => {
  const entry = { type: 'local', command: ['codegraph', 'serve', '--mcp'], disabled: false, codemode: false };
  assert.equal(isCodegraphMcpEnabledInConfig({ mcp: { servers: { codegraph: entry } } }), true);
  assert.equal(isCodegraphMcpEnabledInConfig({ mcp: { servers: { codegraph: { ...entry, disabled: true } } } }), false);
  assert.equal(isCodegraphMcpEnabledInConfig({ mcp: { servers: {} } }), false);
});

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

test('offerCodegraphInstall (binary present) returns silently', async () => {
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
  assert.equal(messages.length, 0, 'should print no CodeGraph line when binary is present');
});

test('offerCodegraphInstall (binary present, no TTY) returns silently', async () => {
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
  assert.equal(messages.length, 0, 'should print no CodeGraph line when binary is present');
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
    assert.equal(spawnSyncCalls.length, 1, 'should spawn codegraph init exactly once');
    const call = spawnSyncCalls[0];
    if (process.platform === 'win32') {
      assert.equal(call.length, 2, 'Windows should use the shell command and options');
      assert.equal(call[0], 'codegraph init');
      assert.deepEqual(call[1], { cwd: '/some/project', stdio: 'inherit', shell: true });
    } else {
      assert.equal(call.length, 3, 'POSIX should use the executable, arguments, and options');
      assert.equal(call[0], 'codegraph');
      assert.deepEqual(call[1], ['init']);
      assert.deepEqual(call[2], { cwd: '/some/project', stdio: 'inherit' });
    }
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

// --- Step 3: setup orchestration DI suites (prepare-setup-menu-seam) ---

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-setup-'));
  if (withOpenspec) {
    fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
    if (withConfig) {
      fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
    }
  }
  return dir;
}

// The setup CLI requires the openspec binary (offerOpenspecInstall probes
// `openspec --version` before any other step). CI runners do not provide it,
// so CLI-spawning tests install a fake `openspec` on PATH that satisfies the
// probe. The posix script covers bash shells; the .cmd shim covers cmd.exe
// (PATHEXT) when the probe runs with `shell: true` on Windows.
function makeFakeOpenspecBin() {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-fake-openspec-'));
  fs.writeFileSync(path.join(binDir, 'openspec'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  fs.writeFileSync(path.join(binDir, 'openspec.cmd'), '@echo off\r\nexit /b 0\r\n');
  try {
    fs.chmodSync(path.join(binDir, 'openspec'), 0o755);
  } catch {
    // Windows has no posix mode bits; the .cmd shim carries that platform.
  }
  return binDir;
}

function envWithFakeOpenspec(binDir) {
  return { ...process.env, PATH: binDir + path.delimiter + process.env.PATH };
}

test('setup runs with an injected workflow: copy before workflow, ctx readline live, closed once after settle', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  let workflowCall = null;
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
    assert.ok(workflowCall, 'workflow should be invoked');
    assert.equal(workflowCall.projectPath, projectDir, 'workflow receives the resolved project path');
    assert.equal(workflowCall.readline, rl, 'workflow receives the same interface instance');
    assert.equal(workflowCall.isOpen, true, 'interface is still open inside the workflow');
    assert.ok(workflowCall.messages.some(m => /^Copied \d+ schema file/.test(m)),
      'schema-copy confirmation precedes the workflow call');
    assert.ok(!workflowCall.messages.some(m => /SAI workflow configured/.test(m)),
      'completion message is not yet printed inside the workflow');
    assert.equal(rl.closeCount, 1, 'readline closed exactly once');
    assert.equal(rl.isOpen, false, 'readline closed after both settle');
    assert.ok(cap.logs.some(m => m.includes(`SAI workflow configured at ${projectDir}.`)),
      'completion message printed');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('setup opens its readline only after the CLI install offers settle', async () => {
  // The offers prompt through their own readline on stdin; a second live
  // interface echoes every key twice and is left on a paused stdin.
  const events = [];
  const orig = childProcess.spawnSync;
  childProcess.spawnSync = (cmd, args) => {
    const line = Array.isArray(args) ? `${cmd} ${args.join(' ')}` : String(cmd);
    if (/^(openspec|codegraph) --version/.test(line)) events.push(line);
    return { status: line.startsWith('openspec --version') ? 0 : 1, stdout: '', stderr: '', error: null };
  };
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  try {
    await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => { events.push('createReadline'); return rl; },
    });
    // The first pair is the version read taken before the offers; the last codegraph
    // probe is ensureCodegraphIndex, which also runs before createReadline.
    assert.deepEqual(events, [
      'openspec --version', 'codegraph --version',
      'openspec --version', 'codegraph --version',
      'codegraph --version',
      'createReadline',
    ]);
  } finally {
    cap.restore();
    childProcess.spawnSync = orig;
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('setup runs without an injected workflow: resolves success with unchanged completion output', async () => {
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
    assert.equal(rl.closeCount, 1, 'readline closed exactly once');
    assert.ok(cap.logs.some(m => m.includes(`SAI workflow configured at ${projectDir}.`)),
      'existing completion message preserved');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('setup without a path configures the current directory without initial confirmation', async (t) => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  t.mock.method(process, 'cwd', () => projectDir);
  try {
    for (const argv of [
      ['node', 'bin/setup.js'],
      ['node', 'bin/install', 'setup'],
    ]) {
      const rl = fakeReadline();
      rl.question = () => assert.fail('configured projects must not prompt for setup confirmation');
      let menuPath = null;
      const outcome = await main({
        argv,
        createReadline: () => rl,
        postSetupMenu: async ({ projectPath }) => {
          menuPath = projectPath;
          return { status: 'skipped' };
        },
      });
      assert.equal(outcome, 'success');
      assert.equal(menuPath, projectDir);
      assert.equal(rl.closeCount, 1);
      assert.ok(fs.existsSync(path.join(projectDir, 'openspec', 'schemas', 'sai-workflow', 'schema.yaml')));
      assert.ok(cap.logs.includes(`Configuring SAI workflow at ${projectDir}`));
      assert.ok(cap.logs.includes(`SAI workflow configured at ${projectDir}.`));
    }
  } finally {
    cap.restore();
    restoreSpawn();
    t.mock.restoreAll();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('setup with a required-step failure before copy: resolves required-failure, workflow never invoked', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir({ withConfig: false }); // openspec/ present, config.yaml missing
  const cap = captureConsole();
  const rl = fakeReadline();
  let workflowCalls = 0;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupWorkflow: async () => { workflowCalls += 1; },
    });
    assert.equal(outcome, 'required-failure');
    assert.equal(workflowCalls, 0, 'workflow must not be invoked before schema copy completes');
    assert.equal(rl.closeCount, 1, 'readline closed on the failure path');
    assert.ok(cap.logs.some(m => m.includes('openspec/config.yaml not found')),
      'existing failure message preserved');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('post-setup workflow rejects: resolves post-setup-failure with readline closed before return', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const rl = fakeReadline();
  let workflowCalls = 0;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupWorkflow: async () => { workflowCalls += 1; throw new Error('menu exploded'); },
    });
    assert.equal(outcome, 'post-setup-failure');
    assert.equal(workflowCalls, 1, 'workflow invoked exactly once');
    assert.equal(rl.closeCount, 1, 'readline closed exactly once on rejection');
    assert.equal(rl.isOpen, false, 'readline closed before the promise resolves');
    assert.ok(cap.logs.some(m => m.includes('menu exploded')), 'rejection error surfaced');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('setup declined before the seam: resolves aborted with readline closed and workflow never invoked', async () => {
  const restoreSpawn = stubSpawnSync();
  const projectDir = makeProjectDir({ withOpenspec: false }); // openspec/ absent → ensureOpenspecDir prompts
  const cap = captureConsole();
  const rl = fakeReadline('n'); // decline the openspec init offer
  let workflowCalls = 0;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => rl,
      postSetupWorkflow: async () => { workflowCalls += 1; },
    });
    assert.equal(outcome, 'aborted');
    assert.equal(workflowCalls, 0, 'workflow must not be invoked on an early decline');
    assert.equal(rl.closeCount, 1, 'readline closed on the decline path');
    assert.ok(cap.logs.some(m => m.includes('Aborted.')), 'Aborted. message preserved');
  } finally {
    cap.restore();
    restoreSpawn();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('requiring bin/setup.js performs no side effects and exports only main and ensureCodegraphIndex', () => {
  const setupPath = require.resolve('../bin/setup.js');
  const readlinePath = require.resolve('readline');
  const origSetup = require.cache[setupPath];
  const origReadline = require.cache[readlinePath];
  const created = [];
  require.cache[readlinePath] = {
    id: readlinePath,
    filename: readlinePath,
    loaded: true,
    exports: { createInterface: (...args) => { created.push(args); return {}; } },
  };
  delete require.cache[setupPath];
  try {
    const setup = require('../bin/setup.js');
    assert.deepEqual(Object.keys(setup).sort(), ['ensureCodegraphIndex', 'main']);
    assert.equal(created.length, 0, 'no readline interface created at require time');
  } finally {
    delete require.cache[setupPath];
    require.cache[readlinePath] = origReadline;
    if (origSetup) require.cache[setupPath] = origSetup;
  }
});

test('setup CLI announces the target path and lets the user decline openspec init', () => {
  const dir = makeProjectDir({ withOpenspec: false });
  const binDir = makeFakeOpenspecBin();
  try {
    const res = childProcess.spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'setup.js')], {
      input: 'n\n',
      encoding: 'utf8',
      cwd: dir,
      env: envWithFakeOpenspec(binDir),
    });
    assert.equal(res.status, 0, 'decline must exit 0');
    assert.ok(res.stdout.includes("Run 'openspec init'?"), 'openspec initialization still requires confirmation');
    assert.ok(res.stdout.includes('Aborted.'), 'Aborted. printed');
    assert.ok(res.stdout.startsWith('Configuring SAI workflow at '), 'the target path is announced before any prompt');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(binDir, { recursive: true, force: true });
  }
});

test('setup CLI maps a required-step failure to exit 1 (required-failure)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-setup-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true }); // no config.yaml
  try {
    const res = childProcess.spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'setup.js'), dir], {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    });
    assert.equal(res.status, 1, 'required-step failure must exit 1');
    assert.ok((res.stdout + res.stderr).includes('openspec'), 'failure output names openspec');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('setup CLI maps a successful run to exit 0 (success)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-setup-'));
  fs.mkdirSync(path.join(dir, 'openspec'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');
  const binDir = makeFakeOpenspecBin();
  try {
    const res = childProcess.spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'setup.js'), dir], {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      env: envWithFakeOpenspec(binDir),
    });
    assert.equal(res.status, 0, 'successful run must exit 0');
    assert.ok(res.stdout.includes(`SAI workflow configured at ${dir}.`), 'completion message printed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(binDir, { recursive: true, force: true });
  }
});

// --- CLI minimum version: CodeGraph upgrade offer and index rebuild ---

const {
  CODEGRAPH_UPGRADE_CMD,
  CODEGRAPH_MANUAL_UPGRADE_CMD,
  CODEGRAPH_INDEX_CMD,
  readCliVersion,
  resolveCliPath,
  offerCliUpgrade,
  offerCodegraphReindex,
} = require('../bin/install-flow.js');

function codegraphUpgradeHarness(overrides = {}) {
  const notices = [];
  const calls = { prompts: [], upgrades: [], rereads: 0 };
  const options = {
    cli: 'codegraph',
    current: { installed: true, version: '1.1.6' },
    readVersionAgain: () => { calls.rereads += 1; return { installed: true, version: '1.6.4' }; },
    runUpgrade: (cli) => { calls.upgrades.push(cli); return true; },
    resolvePath: () => '/usr/bin/codegraph',
    promptYesNo: async (question) => { calls.prompts.push(question); return true; },
    isTTY: true,
    notices,
    ...overrides,
  };
  return { options, notices, calls };
}

test('the CodeGraph commands are declared beside the install commands', () => {
  assert.equal(CODEGRAPH_UPGRADE_CMD, 'codegraph upgrade');
  assert.equal(CODEGRAPH_MANUAL_UPGRADE_CMD, 'npm i -g @colbymchenry/codegraph@latest');
  assert.equal(CODEGRAPH_INDEX_CMD, 'codegraph index');
});

test('E1: CodeGraph that is not installed gets no version check', async () => {
  const { options, notices } = codegraphUpgradeHarness({ current: { installed: false, version: null } });
  assert.equal(await offerCliUpgrade(options), 'not-installed');
  assert.deepEqual(notices, []);
});

test('E2/E3: an unreadable CodeGraph version prints one line; a version at the minimum passes silently', async () => {
  const unread = codegraphUpgradeHarness({ current: { installed: true, version: null } });
  assert.equal(await offerCliUpgrade(unread.options), 'unverified');
  assert.equal(unread.notices.length, 1);
  assert.match(unread.notices[0], /Cannot verify the CodeGraph version/);

  for (const version of ['1.6.4', '1.6.5', '1.10.0']) {
    const ok = codegraphUpgradeHarness({ current: { installed: true, version } });
    assert.equal(await offerCliUpgrade(ok.options), 'current', version);
    assert.deepEqual(ok.notices, [], version);
  }
});

test('CodeGraph below 1.6.4 with a TTY: yes runs the upgrade and reads the version again', async () => {
  const { options, notices, calls } = codegraphUpgradeHarness();
  assert.equal(await offerCliUpgrade(options), 'upgraded');
  assert.deepEqual(calls.prompts, ['Upgrade CodeGraph now? [y/n] ']);
  assert.deepEqual(calls.upgrades, ['codegraph']);
  assert.ok(notices.some(m => m.includes('1.1.6') && m.includes('1.6.4')));
});

test('E4: declining the CodeGraph upgrade prints the command and runs nothing', async () => {
  const { options, notices, calls } = codegraphUpgradeHarness({ promptYesNo: async () => false });
  assert.equal(await offerCliUpgrade(options), 'declined');
  assert.deepEqual(calls.upgrades, []);
  assert.ok(notices.includes(CODEGRAPH_UPGRADE_CMD));
});

test('E5: a failing codegraph upgrade prints the npm command', async () => {
  const { options, notices } = codegraphUpgradeHarness({ runUpgrade: () => false });
  assert.equal(await offerCliUpgrade(options), 'failed');
  assert.ok(notices.includes(CODEGRAPH_MANUAL_UPGRADE_CMD));
});

test('E6: CodeGraph still below the minimum after the upgrade names the PATH binary', async () => {
  const { options, notices } = codegraphUpgradeHarness({
    readVersionAgain: () => ({ installed: true, version: '1.1.6' }),
    resolvePath: () => '/home/user/.local/bin/codegraph',
  });
  assert.equal(await offerCliUpgrade(options), 'still-below');
  assert.ok(notices.some(m => m.includes('/home/user/.local/bin/codegraph') && /older binary/.test(m)));
});

test('readCliVersion reads the first X.Y.Z of the PATH binary and follows the probe semantics', () => {
  const orig = childProcess.spawnSync;
  const results = [
    { status: 0, stdout: 'codegraph v1.6.4-beta (build 9.9.9)\n', stderr: '', error: null },
    { status: 0, stdout: 'codegraph dev\n', stderr: '', error: null },
    { status: 1, stdout: '', stderr: '', error: null },
    { status: null, stdout: '', stderr: '', error: new Error('ENOENT') },
  ];
  const commands = [];
  childProcess.spawnSync = (cmd, opts) => { commands.push([cmd, opts?.shell]); return results.shift(); };
  try {
    assert.deepEqual(readCliVersion('codegraph'), { installed: true, version: '1.6.4' });
    assert.deepEqual(readCliVersion('codegraph'), { installed: true, version: null });
    assert.deepEqual(readCliVersion('codegraph'), { installed: false, version: null });
    assert.deepEqual(readCliVersion('codegraph'), { installed: false, version: null });
    assert.ok(commands.every(([cmd, shell]) => cmd === 'codegraph --version' && shell === true));
  } finally {
    childProcess.spawnSync = orig;
  }
});

test('resolveCliPath returns the first path the lookup prints, or null', () => {
  const orig = childProcess.spawnSync;
  const results = [
    { status: 0, stdout: '\n/usr/bin/codegraph\n/opt/other/codegraph\n', error: null },
    { status: 1, stdout: '', error: null },
  ];
  childProcess.spawnSync = () => results.shift();
  try {
    assert.equal(resolveCliPath('codegraph'), '/usr/bin/codegraph');
    assert.equal(resolveCliPath('codegraph'), null);
  } finally {
    childProcess.spawnSync = orig;
  }
});

test('E7: after a successful upgrade an existing .codegraph/ is offered codegraph index', async () => {
  const prompts = [];
  const indexed = [];
  const notices = [];
  await offerCodegraphReindex({
    projectPath: '/project',
    upgradeStatus: 'upgraded',
    indexExists: () => true,
    runIndex: (p) => { indexed.push(p); return true; },
    promptYesNo: async (q) => { prompts.push(q); return true; },
    notices,
  });
  assert.deepEqual(prompts, ['Rebuild the CodeGraph index now? [y/n] ']);
  assert.deepEqual(indexed, ['/project']);
  assert.deepEqual(notices, []);
});

test('E7: a failed or declined index rebuild prints codegraph index and never blocks', async () => {
  for (const [answer, runIndex] of [[true, () => false], [false, () => assert.fail('must not run')]]) {
    const notices = [];
    await offerCodegraphReindex({
      projectPath: '/project',
      upgradeStatus: 'upgraded',
      indexExists: () => true,
      runIndex,
      promptYesNo: async () => answer,
      notices,
    });
    assert.ok(notices.includes(CODEGRAPH_INDEX_CMD));
  }
});

test('E7: without .codegraph/ no index offer follows the upgrade', async () => {
  await offerCodegraphReindex({
    projectPath: '/project',
    upgradeStatus: 'upgraded',
    indexExists: () => false,
    runIndex: () => assert.fail('must not run'),
    promptYesNo: async () => assert.fail('must not ask'),
    notices: [],
  });
});

test('E8: without a TTY the upgrade was printed, so codegraph index is printed too when .codegraph/ exists', async () => {
  const notices = [];
  await offerCodegraphReindex({
    projectPath: '/project',
    upgradeStatus: 'printed',
    indexExists: () => true,
    runIndex: () => assert.fail('must not run'),
    promptYesNo: async () => assert.fail('must not ask'),
    notices,
  });
  assert.deepEqual(notices, [CODEGRAPH_INDEX_CMD]);
});

test('E4/E5/E6: no index offer after a declined, failed, or still-below upgrade', async () => {
  for (const upgradeStatus of ['declined', 'failed', 'still-below', 'unverified', 'current', 'not-installed']) {
    await offerCodegraphReindex({
      projectPath: '/project',
      upgradeStatus,
      indexExists: () => true,
      runIndex: () => assert.fail('must not run'),
      promptYesNo: async () => assert.fail('must not ask'),
      notices: [],
    });
  }
});

function versionStub({ codegraph, openspec }) {
  const orig = childProcess.spawnSync;
  const commands = [];
  childProcess.spawnSync = (cmd, args) => {
    const line = Array.isArray(args) ? `${cmd} ${args.join(' ')}` : String(cmd);
    commands.push(line);
    if (line.startsWith('openspec --version')) return { status: 0, stdout: `${openspec}\n`, stderr: '', error: null };
    if (line.startsWith('codegraph --version')) {
      return codegraph === null
        ? { status: 1, stdout: '', stderr: '', error: null }
        : { status: 0, stdout: `${codegraph}\n`, stderr: '', error: null };
    }
    return { status: 1, stdout: '', stderr: '', error: null };
  };
  return { commands, restore: () => { childProcess.spawnSync = orig; } };
}

test('setup without a TTY prints the upgrade commands and codegraph index for an outdated CLI pair, then continues', async () => {
  const stub = versionStub({ codegraph: '1.1.6', openspec: '1.13.0' });
  const projectDir = makeProjectDir();
  fs.mkdirSync(path.join(projectDir, '.codegraph'));
  const cap = captureConsole();
  const origIsTTY = process.stdin.isTTY;
  process.stdin.isTTY = false;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => fakeReadline(),
      postSetupMenu: async () => ({ status: 'skipped' }),
    });
    assert.equal(outcome, 'success');
    const upgrade = cap.logs.indexOf('codegraph upgrade');
    const index = cap.logs.indexOf('codegraph index');
    assert.ok(cap.logs.includes('npm i -g @fission-ai/openspec@latest'));
    assert.ok(upgrade >= 0 && index > upgrade, 'codegraph upgrade is printed before codegraph index');
    assert.ok(!stub.commands.some(c => c.startsWith('codegraph upgrade') || c.startsWith('codegraph index')), 'nothing is run without a TTY');
  } finally {
    process.stdin.isTTY = origIsTTY;
    cap.restore();
    stub.restore();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('setup prints nothing about versions when both CLIs meet the minimum', async () => {
  const stub = versionStub({ codegraph: '1.6.4', openspec: '1.13.1' });
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => fakeReadline(),
      postSetupMenu: async () => ({ status: 'skipped' }),
    });
    assert.equal(outcome, 'success');
    assert.ok(!cap.logs.some(m => /minimum|Cannot verify|upgrade/i.test(m)), cap.logs.join('\n'));
  } finally {
    cap.restore();
    stub.restore();
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('setup does not compare the version of a CLI that appears after its start-of-run read (E1)', async () => {
  const orig = childProcess.spawnSync;
  let codegraphReads = 0;
  childProcess.spawnSync = (cmd, args) => {
    const line = Array.isArray(args) ? `${cmd} ${args.join(' ')}` : String(cmd);
    if (line.startsWith('openspec --version')) return { status: 0, stdout: '1.13.1\n', stderr: '', error: null };
    if (line.startsWith('codegraph --version')) {
      codegraphReads += 1;
      // Absent at the first read, as before an install offer; present (and old) afterwards.
      return codegraphReads === 1
        ? { status: 1, stdout: '', stderr: '', error: null }
        : { status: 0, stdout: '1.1.6\n', stderr: '', error: null };
    }
    return { status: 1, stdout: '', stderr: '', error: null };
  };
  const projectDir = makeProjectDir();
  const cap = captureConsole();
  const origIsTTY = process.stdin.isTTY;
  process.stdin.isTTY = false;
  try {
    const outcome = await main({
      argv: ['node', 'bin/setup.js', projectDir],
      createReadline: () => fakeReadline(),
      postSetupMenu: async () => ({ status: 'skipped' }),
    });
    assert.equal(outcome, 'success');
    assert.ok(!cap.logs.some(m => /older than the minimum|codegraph upgrade/.test(m)), cap.logs.join('\n'));
  } finally {
    process.stdin.isTTY = origIsTTY;
    cap.restore();
    childProcess.spawnSync = orig;
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

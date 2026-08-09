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
  CODEGRAPH_WIRING_HINT,
  probeCodegraph,
  runCodegraphInstall,
  offerCodegraphInstall,
} = require('../bin/install-flow.js');

const { main, ensureCodegraphIndex } = require('../bin/setup.js');

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

test('setup CLI maps an interactive decline to exit 0 (aborted)', () => {
  const res = childProcess.spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'setup.js')], {
    input: 'n\n',
    encoding: 'utf8',
    cwd: path.join(__dirname, '..'),
  });
  assert.equal(res.status, 0, 'decline must exit 0');
  assert.ok(res.stdout.includes('Aborted.'), 'Aborted. printed');
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
  try {
    const res = childProcess.spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'setup.js'), dir], {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    });
    assert.equal(res.status, 0, 'successful run must exit 0');
    assert.ok(res.stdout.includes(`SAI workflow configured at ${dir}.`), 'completion message printed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

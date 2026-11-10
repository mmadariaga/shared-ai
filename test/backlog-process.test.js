'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runProcess, stepLabel, PROCESS_TIMEOUT_MS } = require('../sai/tools/backlog-process');
const identity = require('../sai/tools/backlog-slice-identity');

const root = path.resolve(__dirname, '..');
const stubPath = JSON.stringify(path.join(__dirname, 'helpers', 'spawn-stub.js'));
const SLEEP = 'setTimeout(() => {}, 20000)';
const WITH_DESCENDANT = `const { spawn } = require('node:child_process');
spawn(process.execPath, ['-e', ${JSON.stringify(SLEEP)}], { detached: true, stdio: ['ignore', 'inherit', 'inherit'] }).unref();
console.log('finished');`;
// A process that starts a grandchild in its own process group, tells where its pid is, and waits.
const grandchildScript = pidFile => `const { spawn } = require('node:child_process');
const grandchild = spawn(process.execPath, ['-e', ${JSON.stringify(SLEEP)}], { stdio: 'ignore' });
require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(grandchild.pid));
setTimeout(() => {}, 20000);`;
const posix = { skip: process.platform === 'win32' };

// Runs a script in a child node process that resolves to a pass or a failure through its exit code.
function inChild(script) {
  const result = spawnSync(process.execPath, ['-e', `(async () => {\n${script}\n})().catch(error => { console.error(error); process.exitCode = 1; });`], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition, limit = 10000) {
  const started = Date.now();
  while (!condition()) { if (Date.now() - started > limit) throw new Error('Condition not reached in time'); await sleep(25); }
}
const temporary = () => fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-process-'));
const pidFrom = file => Number(fs.readFileSync(file, 'utf8'));

test('E1 I1: the default limit is 120 s', () => {
  assert.equal(PROCESS_TIMEOUT_MS, 120000);
});

test('E1 I2 I6: a process that sleeps past the limit fails with process-timeout and names the step', async () => {
  const started = Date.now();
  await assert.rejects(() => runProcess(process.execPath, ['-e', SLEEP], { step: 'az extension show', timeout: 400 }), error => {
    assert.equal(error.reason, 'process-timeout');
    assert.match(error.message, /az extension show/);
    assert.match(error.message, /400 ms/);
    return true;
  });
  assert.ok(Date.now() - started < 10000);
});

test('I2: the failure message states the limit in seconds when it is a whole number of seconds', async () => {
  await assert.rejects(() => runProcess(process.execPath, ['-e', SLEEP], { step: 'Azure SDK wit POST', timeout: 1000 }), /Azure SDK wit POST did not finish within 1 s/);
});

test('E5 I6: a detached descendant that holds stdout open does not extend the wait past the limit', async () => {
  const started = Date.now();
  const result = await runProcess(process.execPath, ['-e', WITH_DESCENDANT], { step: 'descendant', timeout: 1500, encoding: 'utf8' });
  assert.ok(Date.now() - started < 10000);
  assert.equal(result.status, 0);
  assert.equal(result.error, undefined);
  assert.equal(result.stdout, 'finished\n');
});

test('I2: other process failures keep their result for the caller', async () => {
  const failed = await runProcess(process.execPath, ['-e', 'process.exit(3)'], { step: 'exits', encoding: 'utf8' });
  assert.equal(failed.status, 3);
  const missing = await runProcess('sai-no-such-program', [], { step: 'missing', encoding: 'utf8' });
  assert.equal(missing.error.code, 'ENOENT');
});

test('I4: the result carries the output and the input reaches the process', async () => {
  const result = await runProcess(process.execPath, ['-e', "process.stdin.on('data', d => process.stdout.write(String(d).toUpperCase()))"], { step: 'echo', input: 'data', encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'DATA');
  assert.equal(result.stderr, '');
});

test('I2: the step label is the program and its first subcommand words, never data arguments', () => {
  assert.equal(stepLabel('gh', ['issue', 'view', '12', '--json']), 'gh issue view');
  assert.equal(stepLabel('git', ['remote', '-v']), 'git remote');
  assert.equal(stepLabel('az', ['extension', 'show', '--name', 'azure-devops']), 'az extension show');
});

test('E5 I4: at the limit the whole process group ends, a grandchild included', posix, async () => {
  const directory = temporary();
  const pidFile = path.join(directory, 'grandchild.pid');
  try {
    await assert.rejects(() => runProcess(process.execPath, ['-e', grandchildScript(pidFile)], { step: 'group', timeout: 1500 }), error => error.reason === 'process-timeout');
    const pid = pidFrom(pidFile);
    await until(() => !alive(pid));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('E6 I5: when the calling process is interrupted before the limit, the process group ends with it', posix, async () => {
  for (const [name, end] of [['SIGINT', "process.kill(process.pid, 'SIGINT')"], ['SIGTERM', "process.kill(process.pid, 'SIGTERM')"], ['exit', 'process.exit(0)']]) {
    const directory = temporary();
    const pidFile = path.join(directory, 'grandchild.pid');
    const caller = `const { runProcess } = require(${JSON.stringify(path.join(root, 'sai/tools/backlog-process'))});
runProcess(process.execPath, ['-e', ${JSON.stringify(grandchildScript(pidFile))}], { step: 'interrupted', timeout: 60000 });
const waitForPid = setInterval(() => { if (require('node:fs').existsSync(${JSON.stringify(pidFile)}) && require('node:fs').readFileSync(${JSON.stringify(pidFile)}, 'utf8')) { clearInterval(waitForPid); ${end}; } }, 20);`;
    try {
      const result = spawnSync(process.execPath, ['-e', caller], { cwd: root, encoding: 'utf8', timeout: 20000 });
      if (name === 'exit') assert.equal(result.status, 0, result.stderr); else assert.equal(result.signal, name, `${name}: ${result.stderr}`);
      const pid = pidFrom(pidFile);
      await until(() => !alive(pid));
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  }
});

test('E6 I5: the interrupt handlers exist only while a process runs', posix, async () => {
  const before = [process.listenerCount('SIGINT'), process.listenerCount('SIGTERM'), process.listenerCount('exit')];
  const running = runProcess(process.execPath, ['-e', 'setTimeout(() => {}, 300)'], { step: 'short' });
  assert.equal(process.listenerCount('SIGINT'), before[0] + 1);
  assert.equal(process.listenerCount('exit'), before[2] + 1);
  await running;
  assert.deepEqual([process.listenerCount('SIGINT'), process.listenerCount('SIGTERM'), process.listenerCount('exit')], before);
});

test('E2 I1: the run functions of both backlog tools bound every process and name the stalled step', () => {
  inChild(`
    const assert = require('node:assert/strict');
    const child = require(${JSON.stringify('node:child_process')});
    const limits = [];
    const realSetTimeout = global.setTimeout;
    global.setTimeout = (callback, milliseconds, ...rest) => { if (milliseconds === 120000) { limits.push(milliseconds); milliseconds = 50; } return realSetTimeout(callback, milliseconds, ...rest); };
    let stalled = false;
    require(${stubPath}).stub(child, () => (stalled ? { hang: true } : { status: 0, stdout: 'ok' }));
    const toBacklog = require('./sai/tools/to-backlog');
    const fromBacklog = require('./sai/tools/from-backlog');
    assert.equal(await toBacklog.run('git', ['status'], process.cwd()), 'ok');
    assert.equal(await fromBacklog.run('gh', ['issue', 'view']), 'ok');
    stalled = true;
    await assert.rejects(() => toBacklog.run('gh', ['issue', 'create'], process.cwd()), error => error.reason === 'process-timeout' && /gh issue create/.test(error.message));
    await assert.rejects(() => fromBacklog.run('gh', ['issue', 'view']), error => error.reason === 'process-timeout' && /gh issue view/.test(error.message));
    assert.deepEqual(limits, [120000, 120000, 120000, 120000]);
  `);
});

test('E6 E7 I3 I4: Azure processes disable telemetry and resolve the runtime and extension once', () => {
  inChild(`
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const child = require('node:child_process');
    Object.defineProperty(process, 'platform', { value: 'win32' });
    process.env.AZURE_CORE_COLLECT_TELEMETRY = 'yes';
    const calls = [];
    let extension = true;
    require(${stubPath}).stub(child, (command, args, options) => {
      calls.push({ command, args, env: options.env });
      if (command === 'where.exe') return { stdout: 'C:\\\\cli\\\\wbin\\\\az.cmd\\r\\n', status: 0 };
      if (args.includes('show')) return extension ? { status: 0, stdout: JSON.stringify({ name: 'azure-devops', path: 'C:\\\\extension' }) } : { status: 1, stderr: 'not installed' };
      return { status: 0, stdout: '{}' };
    });
    const reader = require('./sai/tools/from-backlog');
    fs.existsSync = () => true; fs.readFileSync = () => '-IBm azure.cli'; fs.statSync = () => ({ isDirectory: () => true });
    const request = JSON.stringify({ client: 'wit', method: 'GET' });
    await reader.runAzureSdk(request); await reader.runAzureSdk(request); await reader.run('az', ['devops', 'invoke']);
    assert.equal(calls.filter(call => call.command === 'where.exe').length, 1);
    assert.equal(calls.filter(call => call.args.includes('show')).length, 1);
    for (const call of calls.filter(call => call.command !== 'where.exe')) {
      assert.equal(call.env.AZURE_CORE_COLLECT_TELEMETRY, 'no');
      assert.equal(call.env.AZURE_EXTENSION_USE_DYNAMIC_INSTALL, 'no');
    }
    assert.equal(process.env.AZURE_CORE_COLLECT_TELEMETRY, 'yes');
    reader.resetAzureMemory(); extension = false;
    await assert.rejects(() => reader.runAzureSdk(request), error => error.reason === 'extension-unavailable');
    extension = true;
    await reader.runAzureSdk(request);
    extension = false; reader.resetAzureMemory();
    await assert.rejects(() => reader.runAzureSdk(request), error => error.reason === 'extension-unavailable');
    assert.equal(calls.filter(call => call.args.includes('show')).length, 4);
  `);
});

test('E7: a timeout during the extension lookup is reported as a timeout, not as a missing extension', () => {
  inChild(`
    const assert = require('node:assert/strict');
    const child = require('node:child_process');
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const realSetTimeout = global.setTimeout;
    global.setTimeout = (callback, milliseconds, ...rest) => realSetTimeout(callback, milliseconds === 120000 ? 50 : milliseconds, ...rest);
    require(${stubPath}).stub(child, () => ({ hang: true }));
    const reader = require('./sai/tools/from-backlog');
    await assert.rejects(() => reader.runAzureSdk('{}'), error => error.reason === 'process-timeout' && /az extension show/.test(error.message));
  `);
});

const GITHUB = 'https://github.com/o/r/issues';
const marker = value => `<!-- sai-backlog-slices@1 ${JSON.stringify(value)} -->`;
const base = { version: 1, platform: 'github', role: 'parent', parent: `${GITHUB}/1` };

test('E8 I5: a marker without a usable slices array fails readably and names the issue', () => {
  for (const broken of [base, { ...base, slices: {} }, { ...base, slices: 'x' }, { ...base, slices: [null] }]) {
    assert.throws(() => identity.decode(marker(broken), `${GITHUB}/1`), error => {
      assert.ok(!(error instanceof TypeError));
      assert.match(error.message, /o\/r\/issues\/1/);
      return true;
    });
  }
});

test('I5: slicesOf returns the array of a usable marker and names the subject of an unusable one', () => {
  assert.deepEqual(identity.slicesOf({ slices: [{ change_name: 'a' }] }, 'x'), [{ change_name: 'a' }]);
  for (const value of [null, {}, { slices: {} }, { slices: [null] }]) {
    assert.throws(() => identity.slicesOf(value, `${GITHUB}/7`), /issues\/7.*no usable slices array/);
  }
});

test('E8: an import that meets a marker without slices reports the set as incomplete, never complete', async () => {
  const importer = require('../sai/tools/backlog-provider-import');
  const read = importer.bind('github', url => ({ status: 'complete', item: { url, description: marker(base), children: [] }, comments: [] }));
  const result = await read({ url: `${GITHUB}/1` }, {});
  assert.equal(result.status, 'incomplete');
  assert.match(result.message, /issues\/1/);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runProcess, stepLabel, PROCESS_TIMEOUT_MS } = require('../sai/tools/backlog-process');
const identity = require('../sai/tools/backlog-slice-identity');

const root = path.resolve(__dirname, '..');
const SLEEP = 'setTimeout(() => {}, 20000)';
const WITH_DESCENDANT = `const { spawn } = require('node:child_process');
spawn(process.execPath, ['-e', ${JSON.stringify(SLEEP)}], { detached: true, stdio: ['ignore', 'inherit', 'inherit'] }).unref();
console.log('finished');`;

function inChild(script) {
  const result = spawnSync(process.execPath, ['-e', script], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

test('E1 I1: the default limit is 120 s', () => {
  assert.equal(PROCESS_TIMEOUT_MS, 120000);
});

test('E1 I2 I6: a process that sleeps past the limit fails with process-timeout and names the step', () => {
  const started = Date.now();
  assert.throws(() => runProcess(process.execPath, ['-e', SLEEP], { step: 'az extension show', timeout: 400 }), error => {
    assert.equal(error.reason, 'process-timeout');
    assert.match(error.message, /az extension show/);
    assert.match(error.message, /400 ms/);
    return true;
  });
  assert.ok(Date.now() - started < 10000);
});

test('I2: the failure message states the limit in seconds when it is a whole number of seconds', () => {
  assert.throws(() => runProcess(process.execPath, ['-e', SLEEP], { step: 'Azure SDK wit POST', timeout: 1000 }), /Azure SDK wit POST did not finish within 1 s/);
});

test('E5 I6: a detached descendant that holds stdout open does not extend the wait past the limit', () => {
  const started = Date.now();
  const result = runProcess(process.execPath, ['-e', WITH_DESCENDANT], { step: 'descendant', timeout: 1500, encoding: 'utf8' });
  assert.ok(Date.now() - started < 10000);
  assert.equal(result.status, 0);
  assert.equal(result.error, undefined);
  assert.equal(result.stdout, 'finished\n');
});

test('I2: other process failures keep their result for the caller', () => {
  const failed = runProcess(process.execPath, ['-e', 'process.exit(3)'], { step: 'exits', encoding: 'utf8' });
  assert.equal(failed.status, 3);
  const missing = runProcess('sai-no-such-program', [], { step: 'missing', encoding: 'utf8' });
  assert.equal(missing.error.code, 'ENOENT');
});

test('I2: the step label is the program and its first subcommand words, never data arguments', () => {
  assert.equal(stepLabel('gh', ['issue', 'view', '12', '--json']), 'gh issue view');
  assert.equal(stepLabel('git', ['remote', '-v']), 'git remote');
  assert.equal(stepLabel('az', ['extension', 'show', '--name', 'azure-devops']), 'az extension show');
});

test('E2 I1: the run functions of both backlog tools bound every process and name the stalled step', () => {
  inChild(`
    const assert = require('node:assert/strict');
    const child = require('node:child_process');
    let stalled = false;
    child.spawnSync = (command, args, options) => {
      if (stalled) return { error: Object.assign(new Error('spawnSync gh ETIMEDOUT'), { code: 'ETIMEDOUT' }), status: null, signal: 'SIGKILL' };
      assert.equal(options.timeout, 120000); assert.equal(options.killSignal, 'SIGKILL'); return { status: 0, stdout: 'ok' };
    };
    const toBacklog = require('./sai/tools/to-backlog');
    const fromBacklog = require('./sai/tools/from-backlog');
    assert.equal(toBacklog.run('git', ['status'], process.cwd()), 'ok');
    assert.equal(fromBacklog.run('gh', ['issue', 'view']), 'ok');
    stalled = true;
    assert.throws(() => toBacklog.run('gh', ['issue', 'create'], process.cwd()), error => error.reason === 'process-timeout' && /gh issue create/.test(error.message));
    assert.throws(() => fromBacklog.run('gh', ['issue', 'view']), error => error.reason === 'process-timeout' && /gh issue view/.test(error.message));
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
    child.spawnSync = (command, args, options) => {
      calls.push({ command, args, env: options.env });
      if (command === 'where.exe') return { stdout: 'C:\\\\cli\\\\wbin\\\\az.cmd\\r\\n', status: 0 };
      if (args.includes('show')) return extension ? { status: 0, stdout: JSON.stringify({ name: 'azure-devops', path: 'C:\\\\extension' }) } : { status: 1, stderr: 'not installed' };
      return { status: 0, stdout: '{}' };
    };
    const reader = require('./sai/tools/from-backlog');
    fs.existsSync = () => true; fs.readFileSync = () => '-IBm azure.cli'; fs.statSync = () => ({ isDirectory: () => true });
    const request = JSON.stringify({ client: 'wit', method: 'GET' });
    reader.runAzureSdk(request); reader.runAzureSdk(request); reader.run('az', ['devops', 'invoke']);
    assert.equal(calls.filter(call => call.command === 'where.exe').length, 1);
    assert.equal(calls.filter(call => call.args.includes('show')).length, 1);
    for (const call of calls.filter(call => call.command !== 'where.exe')) {
      assert.equal(call.env.AZURE_CORE_COLLECT_TELEMETRY, 'no');
      assert.equal(call.env.AZURE_EXTENSION_USE_DYNAMIC_INSTALL, 'no');
    }
    assert.equal(process.env.AZURE_CORE_COLLECT_TELEMETRY, 'yes');
    reader.resetAzureMemory(); extension = false;
    assert.throws(() => reader.runAzureSdk(request), error => error.reason === 'extension-unavailable');
    extension = true;
    reader.runAzureSdk(request);
    assert.throws(() => { extension = false; reader.resetAzureMemory(); reader.runAzureSdk(request); }, error => error.reason === 'extension-unavailable');
    assert.equal(calls.filter(call => call.args.includes('show')).length, 4);
  `);
});

test('E7: a timeout during the extension lookup is reported as a timeout, not as a missing extension', () => {
  inChild(`
    const assert = require('node:assert/strict');
    const child = require('node:child_process');
    Object.defineProperty(process, 'platform', { value: 'linux' });
    child.spawnSync = () => ({ error: Object.assign(new Error('x'), { code: 'ETIMEDOUT' }), status: null });
    const reader = require('./sai/tools/from-backlog');
    assert.throws(() => reader.runAzureSdk('{}'), error => error.reason === 'process-timeout' && /az extension show/.test(error.message));
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

test('E8: an import that meets a marker without slices reports the set as incomplete, never complete', () => {
  const importer = require('../sai/tools/backlog-provider-import');
  const read = importer.bind('github', url => ({ status: 'complete', item: { url, description: marker(base), children: [] }, comments: [] }));
  const result = read({ url: `${GITHUB}/1` }, {});
  assert.equal(result.status, 'incomplete');
  assert.match(result.message, /issues\/1/);
});

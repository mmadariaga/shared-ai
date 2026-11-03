'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { queryWaitControls, promptSelect, BACK } = require('../bin/install-flow.js');
const customization = require('../bin/model-customization.js');
const { queryOpencode, defaultRunCommand, createOpencodeAdapter } = customization;

const silentWait = () => () => {};
const shortQuery = { queryTimeoutMs: 15, cleanupTimeoutMs: 15, waitControls: silentWait };
const tick = () => new Promise(resolve => setImmediate(resolve));

function terminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.raw = [];
  input.setRawMode = value => input.raw.push(value);
  const output = new PassThrough();
  output.text = '';
  output.on('data', data => { output.text += data; });
  return { input, output };
}

test('each hung query has a replaceable deadline, even when an injected runner ignores abort', async () => {
  assert.equal(customization.OPENCODE_QUERY_TIMEOUT_MS, 30_000);
  let signal;
  const outcome = await queryOpencode(['models'], 'Querying models', (_exe, _args, options) => {
    signal = options.signal;
    return new Promise(() => {});
  }, shortQuery);
  assert.equal(outcome.status, 'failed');
  assert.match(outcome.diagnostic, /timed out/);
  assert.equal(signal.aborted, true);
});

for (const [str, key, back] of [
  ['q', { name: 'q' }, false],
  ['\x03', { sequence: '\x03' }, false],
  ['\x1b', { name: 'escape' }, true],
]) {
  test(`wait controls handle ${key.name || 'Ctrl+C'}, discard late output, and restore adjacent screen input`, async () => {
    const { input, output } = terminal();
    let late;
    const pending = queryOpencode(['models'], 'Querying OpenCode models', () => new Promise(resolve => { late = resolve; }), {
      ...shortQuery,
      queryTimeoutMs: 1000,
      waitControls: (label, controller) => queryWaitControls(label, controller, input, output),
    });
    await tick();
    assert.match(output.text, /Querying OpenCode models/);
    input.emit('keypress', str, key);
    const outcome = await pending;
    assert.equal(outcome === BACK, back);
    if (!back) assert.equal(typeof outcome, 'symbol');
    assert.equal(input.listenerCount('keypress'), 0);
    late({ status: 0, stdout: 'late/model' });
    const selection = promptSelect('Retry?', ['yes', 'no'], input);
    input.emit('keypress', '', { name: 'return' });
    assert.equal(await selection, 'yes');
    await tick();
    assert.equal(input.raw.at(-1), false);
    assert.equal(input.listenerCount('keypress'), 0);
  });
}

test('wait controls release input after success, launch failure and input closure', async () => {
  for (const kind of ['success', 'failure', 'closed']) {
    const { input, output } = terminal();
    const result = queryOpencode(['models'], 'Query', () => {
      if (kind === 'failure') throw new Error('ENOENT');
      if (kind === 'closed') { setImmediate(() => input.emit('end')); return new Promise(() => {}); }
      return { status: 0, stdout: 'provider/model' };
    }, { ...shortQuery, waitControls: (label, controller) => queryWaitControls(label, controller, input, output) });
    if (kind === 'failure') await assert.rejects(result, /ENOENT/);
    else if (kind === 'closed') assert.match((await result).diagnostic, /input closed/);
    else assert.equal((await result).status, 0);
    await tick();
    assert.equal(input.raw.at(-1), false);
    for (const event of ['keypress', 'end', 'close', 'error']) assert.equal(input.listenerCount(event), 0);
  }
});

function fakeChild(pid) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.unref = () => { child.unreferenced = true; };
  child.kill = () => { child.killed = true; };
  return child;
}

test('POSIX cancellation kills only the dedicated owned group', async () => {
  const child = fakeChild(1234);
  const controller = new AbortController();
  const kills = [];
  const result = defaultRunCommand('opencode', ['models'], {
    platform: 'linux', signal: controller.signal,
    spawn: (_command, _args, options) => { assert.equal(options.detached, true); return child; },
    kill: (...args) => {
      kills.push(args);
      if (args[1] === 0) {
        process.nextTick(() => child.emit('exit', null, 'SIGKILL'));
        throw Object.assign(new Error('group is gone'), { code: 'ESRCH' });
      }
    },
  });
  controller.abort();
  await assert.rejects(result, /cancelled/);
  assert.deepEqual(kills, [[-1234, 'SIGKILL'], [-1234, 0]]);
  assert.equal(child.unreferenced, true);
});

test('Windows cancellation targets the owned PID tree and bounds a hanging taskkill', async () => {
  const child = fakeChild(1234);
  const cleanup = fakeChild(1235);
  const calls = [];
  const controller = new AbortController();
  const result = defaultRunCommand('opencode', ['models'], {
    platform: 'win32', signal: controller.signal, cleanupTimeoutMs: 10,
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      return calls.length === 1 ? child : cleanup;
    },
  });
  controller.abort();
  await assert.rejects(result, error => /cleanup failed.*deadline/.test(error.message) && Boolean(error.cleanupFailure));
  assert.equal(calls[1].command, 'taskkill.exe');
  assert.deepEqual(calls[1].args, ['/PID', '1234', '/T', '/F']);
  assert.equal(cleanup.killed, true);
  assert.equal(child.unreferenced, true);
});

test('real asynchronous runner confirms owned process exit before settling cancellation', { timeout: 15_000 }, async () => {
  const { spawn } = require('node:child_process');
  const controller = new AbortController();
  let owned;
  const pending = defaultRunCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    signal: controller.signal,
    // OS process startup/termination competes with the full suite on CI. The
    // deterministic tests above cover the short production cleanup deadline.
    cleanupTimeoutMs: 5_000,
    spawn: (...args) => {
      const child = spawn(...args);
      if (!owned) owned = child;
      return child;
    },
  });
  const exited = new Promise(resolve => owned.once('exit', resolve));
  await new Promise(resolve => owned.once('spawn', resolve));
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  await exited;
  assert.throws(() => process.kill(owned.pid, 0), { code: 'ESRCH' }, 'the real owned root must be gone, not merely unreferenced');
});

test('Windows cancellation waits for root exit when taskkill closes first', async () => {
  const root = fakeChild(1234);
  const helper = fakeChild(1235);
  const controller = new AbortController();
  let calls = 0;
  let settled = false;
  const result = defaultRunCommand('opencode', ['models'], {
    signal: controller.signal, platform: 'win32', cleanupTimeoutMs: 1000,
    spawn: () => ++calls === 1 ? root : helper,
  });
  const rejection = assert.rejects(result, error => {
    settled = true;
    return error.message === 'Query cancelled.' && !error.cleanupFailure;
  });
  controller.abort();
  helper.emit('close', 0);
  await tick();
  assert.equal(settled, false, 'taskkill success must not settle before root exit confirmation');
  assert.equal(root.unreferenced, undefined, 'the pending exit must retain its event-loop handle');
  root.emit('exit', null, 'SIGKILL');
  await rejection;
  assert.equal(root.unreferenced, true);
});

test('Windows cleanup deadline still applies when taskkill succeeds but root exit is missing', async () => {
  const root = fakeChild(1234);
  const helper = fakeChild(1235);
  const controller = new AbortController();
  let calls = 0;
  const result = defaultRunCommand('opencode', ['models'], {
    signal: controller.signal, platform: 'win32', cleanupTimeoutMs: 10,
    spawn: () => ++calls === 1 ? root : helper,
  });
  controller.abort();
  helper.emit('close', 0);
  await assert.rejects(result, error => /cleanup failed.*deadline/.test(error.cleanupFailure));
  assert.equal(root.killed, true);
  assert.equal(root.listenerCount('exit'), 1, 'the temporary cleanup listener must be removed');
  root.emit('exit', null, 'SIGKILL');
  assert.equal(root.unreferenced, true);
});

for (const mode of ['throw', 'error', 'nonzero', 'hang', 'success']) {
  test(`Windows cleanup observes ${mode}, uses only owned fallback and ignores late helper callbacks`, async () => {
    const root = fakeChild(1234);
    const helper = fakeChild(1235);
    let rootKills = 0;
    root.kill = () => { rootKills += 1; };
    const controller = new AbortController();
    let calls = 0;
    const result = defaultRunCommand('opencode', ['models'], {
      signal: controller.signal, platform: 'win32', cleanupTimeoutMs: 10,
      spawn: () => {
        if (++calls === 1) return root;
        if (mode === 'throw') throw new Error('ENOENT');
        setImmediate(() => {
          if (mode === 'error') helper.emit('error', new Error('EACCES'));
          if (mode === 'nonzero') helper.emit('close', 1);
          if (mode === 'success') {
            root.emit('exit', null, 'SIGKILL');
            helper.emit('close', 0);
          }
        });
        return helper;
      },
    });
    controller.abort();
    await assert.rejects(result, error => mode === 'success'
      ? error.message === 'Query cancelled.' && !error.cleanupFailure
      : /cleanup failed/.test(error.cleanupFailure));
    assert.equal(rootKills, mode === 'success' ? 0 : 1);
    helper.emit('close', 1);
    if (mode !== 'throw') helper.emit('error', new Error('late error'));
    await tick();
    assert.equal(rootKills, mode === 'success' ? 0 : 1, 'late helper callbacks must not kill anything again');
  });
}

test('POSIX group termination failure reports uncertainty and attempts only the owned root fallback', async () => {
  const child = fakeChild(1234);
  const controller = new AbortController();
  const result = defaultRunCommand('opencode', ['models'], {
    signal: controller.signal, platform: 'linux',
    spawn: () => child,
    kill: () => { throw Object.assign(new Error('permission denied'), { code: 'EPERM' }); },
  });
  controller.abort();
  await assert.rejects(result, error => /cleanup failed.*owned process group/.test(error.cleanupFailure));
  assert.equal(child.killed, true);
});

test('failed cleanup never sends a root fallback after the owned root has exited', async () => {
  const child = fakeChild(1234);
  const helper = fakeChild(1235);
  const controller = new AbortController();
  let calls = 0;
  const result = defaultRunCommand('opencode', ['models'], {
    signal: controller.signal, platform: 'win32', cleanupTimeoutMs: 10,
    spawn: () => ++calls === 1 ? child : helper,
  });
  child.emit('exit', 0);
  controller.abort();
  helper.emit('close', 1);
  await assert.rejects(result, /cleanup failed/);
  assert.equal(child.killed, undefined);
});

test('an owned POSIX group that remains present exhausts cleanup once and stops polling', async () => {
  const child = fakeChild(1234);
  const controller = new AbortController();
  let probes = 0;
  const result = defaultRunCommand('opencode', ['models'], {
    signal: controller.signal, platform: 'linux', cleanupTimeoutMs: 10,
    spawn: () => child,
    kill: (_pid, signal) => { if (signal === 0) probes += 1; },
  });
  controller.abort();
  await assert.rejects(result, /cleanup failed.*deadline/);
  assert.equal(child.killed, true);
  const completedProbes = probes;
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(probes, completedProbes);
});

test('cleanup failures are visible while cancellation and back navigation remain unchanged', async () => {
  for (const reason of ['cancelled', BACK, 'timeout']) {
    const messages = [];
    const original = console.error;
    console.error = message => messages.push(message);
    try {
      const outcome = await queryOpencode(['models'], 'Query', (_command, _args, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('cleanup failed'), { cleanupFailure: 'OpenCode query cleanup failed: taskkill exit 1.' })), { once: true });
      }), {
        ...shortQuery,
        waitControls: (_label, controller) => { setImmediate(() => controller.abort(reason)); return () => {}; },
      });
      if (reason === 'timeout') assert.match(outcome.diagnostic, /timed out.*cleanup failed/);
      else {
        assert.equal(outcome === BACK, reason === BACK);
        assert.match(messages.join('\n'), /cleanup failed/);
      }
    } finally { console.error = original; }
  }
});

test('provider/model choice time is outside deadlines and variants use their own bounded query', async () => {
  const calls = [];
  const adapter = createOpencodeAdapter({
    ...shortQuery,
    promptChoice: async (_label, choices) => { await new Promise(resolve => setTimeout(resolve, 25)); return choices[0]; },
    runCommand: async (_exe, args) => {
      calls.push(args);
      if (args[0] === 'models') return { status: 0, stdout: 'provider/model\n' };
      return new Promise(() => {});
    },
  });
  const outcome = await adapter.selectSettings('target');
  assert.equal(outcome.status, 'failed');
  assert.match(outcome.diagnostic, /variants.*timed out/);
  assert.deepEqual(calls, [['models'], ['api', 'model.list']]);
});

test('failure and query cancellation preserve targets without writes, then explicit retry can succeed', async () => {
  const original = customization.createOpencodeAdapter;
  const selections = [];
  let attempts = 0;
  let writes = 0;
  customization.createOpencodeAdapter = () => ({
    enumerateWorkers: () => ['first', 'second'],
    selectSettings: async () => {
      attempts += 1;
      assert.equal(writes, 0, 'failed or cancelled attempts must not write settings');
      if (attempts === 3) return { model: 'provider/model' };
      if (attempts === 1) return queryOpencode(['models'], 'Query', () => new Promise(() => {}), shortQuery);
      return queryOpencode(['models'], 'Query', () => new Promise(() => {}), {
        ...shortQuery, waitControls: (_label, controller) => { setImmediate(() => controller.abort('cancelled')); return () => {}; },
      });
    },
    createLocalOverride: () => { writes += 1; return { status: 'persisted' }; },
  });
  const choices = ['Customize models', 'OpenCode', 'Workers', 'Customize models', 'OpenCode', 'Workers', 'Customize models', 'OpenCode', 'Workers', 'Exit'];
  try {
    const outcome = await customization.runPostSetupMenu({
      isTTY: true,
      promptChoice: async () => choices.shift() ?? assert.fail('unexpected prompt'),
      promptChecklist: async (_items, defaults) => {
        selections.push(defaults);
        return { status: 'confirmed', items: ['worker:second'] };
      },
    });
    assert.equal(outcome.status, 'skipped');
    assert.equal(attempts, 3);
    assert.equal(writes, 1);
    assert.deepEqual(selections, [['worker:first', 'worker:second'], ['worker:second'], ['worker:second']]);
    assert.deepEqual(choices, []);
  } finally { customization.createOpencodeAdapter = original; }
});

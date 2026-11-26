'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { route, turn, guardedTurn, acquireTurnLock, busyResult, BUSY_EXIT, readEvents, runArguments, harnessOf, parseArguments, UsageError } = require('../sai/tools/opencode-dispatch');

const repoRoot = path.resolve(__dirname, '..');
const SCRIPT = path.join(repoRoot, 'sai/tools/opencode-dispatch.js');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');

function scratch(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `opencode-dispatch-${prefix}-`));
}

function agentFile(directory, name, harnessLine) {
  fs.mkdirSync(path.join(directory, 'agents'), { recursive: true });
  const lines = ['---', `name: ${name}`, 'model: haiku', ...(harnessLine === undefined ? [] : [harnessLine]), 'tools: Read', '---', '', 'body', ''];
  fs.writeFileSync(path.join(directory, 'agents', `${name}.md`), lines.join('\n'));
}

const probeOf = (available, agents) => () => ({ available, agents });

test('E1 an agent file without the harness key, or with harness claude, routes to Claude Code', () => {
  const project = scratch('route-claude');
  const global = scratch('route-global');
  try {
    agentFile(path.join(project, '.claude'), 'plain', undefined);
    agentFile(path.join(project, '.claude'), 'explicit', 'harness: claude');
    agentFile(path.join(project, '.claude'), 'odd', 'harness: somewhere');
    const options = { root: () => global, probe: () => assert.fail('opencode is not probed for a Claude route') };
    assert.deepEqual(route({ agent: 'plain', cwd: project }, options), { route: 'claude', cause: 'no-harness-key', agent: 'plain' });
    assert.deepEqual(route({ agent: 'explicit', cwd: project }, options), { route: 'claude', cause: 'harness-not-opencode', agent: 'explicit' });
    assert.deepEqual(route({ agent: 'odd', cwd: project }, options), { route: 'claude', cause: 'harness-not-opencode', agent: 'odd' });
    assert.deepEqual(route({ agent: 'absent', cwd: project }, options), { route: 'claude', cause: 'agent-file-missing', agent: 'absent' });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(global, { recursive: true, force: true });
  }
});

test('E2 harness opencode with the binary and an agent of the same name routes to opencode', () => {
  const project = scratch('route-opencode');
  const global = scratch('route-global');
  try {
    agentFile(path.join(project, '.claude'), 'worker', 'harness: opencode');
    agentFile(global, 'global-worker', 'harness: "opencode"');
    const probe = probeOf(true, ['worker', 'global-worker', 'other']);
    assert.deepEqual(route({ agent: 'worker', cwd: project }, { root: () => global, probe }), { route: 'opencode', cause: 'harness-opencode', agent: 'worker' });
    assert.equal(route({ agent: 'global-worker', cwd: project }, { root: () => global, probe }).route, 'opencode', 'the user-global agent file counts and its quotes are stripped');
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(global, { recursive: true, force: true });
  }
});

test('the project agent file wins over the user-global one, as Claude Code resolves it', () => {
  const project = scratch('route-precedence');
  const global = scratch('route-global');
  try {
    agentFile(path.join(project, '.claude'), 'worker', 'harness: claude');
    agentFile(global, 'worker', 'harness: opencode');
    assert.equal(route({ agent: 'worker', cwd: project }, { root: () => global, probe: probeOf(true, ['worker']) }).route, 'claude');
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(global, { recursive: true, force: true });
  }
});

test('E3 a missing opencode binary, agent, or listing falls back to Claude Code with a notice that names the agent and the cause', () => {
  const project = scratch('route-fallback');
  try {
    agentFile(path.join(project, '.claude'), 'worker', 'harness: opencode');
    const cases = [
      [probeOf(false, null), 'opencode-missing', /command is not available/],
      [probeOf(true, ['someone-else']), 'opencode-agent-missing', /no agent of that name/],
      [probeOf(true, null), 'opencode-agents-unavailable', /did not list its agents/],
    ];
    for (const [probe, cause, text] of cases) {
      const answer = route({ agent: 'worker', cwd: project }, { root: () => project, probe });
      assert.equal(answer.route, 'claude');
      assert.equal(answer.cause, cause);
      assert.match(answer.notice, /Agent worker /);
      assert.match(answer.notice, text);
    }
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('harnessOf reads only the frontmatter key', () => {
  assert.equal(harnessOf('---\nname: a\nharness: opencode\n---\nharness: claude\n'), 'opencode');
  assert.equal(harnessOf('---\nname: a\n---\nharness: opencode\n'), null);
  assert.equal(harnessOf('no frontmatter\nharness: opencode\n'), null);
  assert.equal(harnessOf("---\nharness: 'opencode'\r\n---\n"), 'opencode');
});

test('E2 a turn runs `opencode run --format json` with the message as the one argument after `--`, and never --auto', () => {
  assert.deepEqual(runArguments({ agent: 'worker' }, 'hello'), ['run', '--format', 'json', '--agent', 'worker', '--', 'hello']);
  assert.deepEqual(runArguments({ session: 'ses_1', agent: 'worker' }, 'again'), ['run', '--format', 'json', '--session', 'ses_1', '--agent', 'worker', '--', 'again']);
  assert.deepEqual(runArguments({ session: 'ses_1' }, '--report-dir /tmp/x'), ['run', '--format', 'json', '--session', 'ses_1', '--', '--report-dir /tmp/x']);
  for (const args of [runArguments({ agent: 'w' }, 'm'), runArguments({ session: 's' }, 'm')]) assert.ok(!args.includes('--auto'));
});

const event = (type, extra = {}) => JSON.stringify({ type, sessionID: 'ses_one', ...extra });
const stepFinish = (tokens, cost = 0) => event('step_finish', { part: { type: 'step-finish', cost, tokens } });
const text = (messageID, value) => event('text', { part: { messageID, type: 'text', text: value } });

test('readEvents takes the session of the first event, the text of the last message, and the sum of the steps', () => {
  const stdout = [
    event('step_start'), text('m1', 'thinking aloud'),
    stepFinish({ input: 10, output: 2, reasoning: 1, cache: { read: 5, write: 0 } }, 0.5),
    'not json', '', '[1]',
    event('step_start'), text('m2', '{path, '), text('m2', 'sha256}'),
    stepFinish({ input: 4, output: 3, reasoning: 0, cache: { read: 7, write: 2 } }, 0.25),
  ].join('\n');
  assert.deepEqual(readEvents(stdout), {
    sessionID: 'ses_one', text: '{path, sha256}', error: null, cost: 0.75,
    tokens: { input: 14, output: 5, reasoning: 1, cache_read: 12, cache_write: 2 },
  });
});

test('E4 a turn fails on a non-zero exit, an error event, or a start with no sessionID', async () => {
  const ok = stdout => async () => ({ status: 0, stdout });
  const started = await turn({ agent: 'w', message: 'm', cwd: '.' }, ok([event('step_start'), text('m1', 'ready'), stepFinish({})].join('\n')));
  assert.deepEqual([started.status, started.sessionID, started.text, started.error, started.exit_code], ['ok', 'ses_one', 'ready', null, 0]);

  const exited = await turn({ agent: 'w', message: 'm', cwd: '.' }, async () => ({ status: 3, stdout: '' }));
  assert.equal(exited.status, 'failed');
  assert.equal(exited.exit_code, 3);
  assert.match(exited.error, /status 3/);

  const errored = await turn({ agent: 'w', message: 'm', cwd: '.' }, ok(event('error', { error: { message: 'Agent not found: "w"' } })));
  assert.deepEqual([errored.status, errored.error], ['failed', 'Agent not found: "w"']);

  const silent = await turn({ agent: 'w', message: 'm', cwd: '.' }, ok(''));
  assert.deepEqual([silent.status, silent.sessionID, silent.error], ['failed', null, 'opencode run printed no sessionID']);

  const missing = await turn({ agent: 'w', message: 'm', cwd: '.' }, async () => ({ status: null, stdout: '', error: 'spawn opencode ENOENT' }));
  assert.deepEqual([missing.status, missing.error], ['failed', 'spawn opencode ENOENT']);
});

test('a continuation keeps its session when the output names none, and the message reaches opencode unchanged', async () => {
  const seen = [];
  const message = '--report-dir /tmp/claude-1000/sai/x\n--harness claude\nnext step\n';
  const result = await turn({ session: 'ses_kept', message, cwd: '.' }, async args => { seen.push(args); return { status: 0, stdout: '' }; });
  assert.equal(result.status, 'ok');
  assert.equal(result.sessionID, 'ses_kept');
  assert.equal(seen[0].at(-1), message, 'the tool appends nothing to the message');
});

test('parseArguments accepts the three commands and rejects every misuse', () => {
  assert.deepEqual(parseArguments(['route', '--agent', 'w', '--cwd', '/p']), { command: 'route', agent: 'w', session: undefined, inputFile: null, cwd: '/p' });
  assert.deepEqual(parseArguments(['start', '--agent', 'w', '--input-file', '/m']), { command: 'start', agent: 'w', session: undefined, inputFile: '/m', cwd: process.cwd() });
  assert.deepEqual(parseArguments(['continue', '--session', 'ses_1', '--input-file', '/m', '--agent', 'w']), { command: 'continue', agent: 'w', session: 'ses_1', inputFile: '/m', cwd: process.cwd() });
  for (const argv of [
    [], ['unknown'], ['route'], ['route', '--agent', '../x'], ['route', '--agent', 'w', '--input-file', '/m'],
    ['start', '--agent', 'w'], ['start', '--input-file', '/m'], ['start', '--agent', 'w', '--session', 'ses_1', '--input-file', '/m'],
    ['continue', '--input-file', '/m'], ['continue', '--session', 'ses 1', '--input-file', '/m'], ['continue', '--session', 'ses_1'],
    ['route', '--agent', 'w', '--agent', 'v'], ['route', '--agent', 'w', '--cwd'], ['route', '--agent', 'w', '--bogus', 'x'],
  ]) {
    assert.throws(() => parseArguments(argv), UsageError, argv.join(' '));
  }
});

/** A fake `opencode` on PATH: it records every `run` argv and prints the events of one turn. */
function fakeOpencode(directory) {
  const bin = path.join(directory, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  const file = path.join(bin, 'opencode');
  fs.writeFileSync(file, `#!/usr/bin/env node
const fs = require('fs');
const argv = process.argv.slice(2);
if (argv[0] === '--version') { console.log('opencode v0.0.0'); process.exit(0); }
if (argv[0] === 'debug' && argv[1] === 'agents') { console.log(JSON.stringify((process.env.FAKE_AGENTS || '').split(',').filter(Boolean).map(name => ({ name })))); process.exit(0); }
const stdin = fs.fstatSync(0);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ argv, stdinIsNull: stdin.isCharacterDevice() }) + '\\n');
const session = argv.includes('--session') ? argv[argv.indexOf('--session') + 1] : 'ses_' + argv[argv.indexOf('--agent') + 1];
const message = argv[argv.indexOf('--') + 1];
if (process.env.FAKE_MODE === 'error') { console.log(JSON.stringify({ type: 'error', sessionID: session, error: { message: 'boom' } })); process.exit(1); }
console.log(JSON.stringify({ type: 'step_start', sessionID: session, part: { messageID: 'm1' } }));
console.log(JSON.stringify({ type: 'text', sessionID: session, part: { messageID: 'm1', text: message.split('\\n')[0] } }));
console.log(JSON.stringify({ type: 'step_finish', sessionID: session, part: { cost: 0, tokens: { input: 1, output: 2, reasoning: 0, cache: { read: 0, write: 0 } } } }));
`, { mode: 0o755 });
  return bin;
}

function cli(args, env, cwd) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: { ...process.env, ...env }, encoding: 'utf8' });
}

test('E7 the CLI passes a message that starts with -- intact, with no shell and no input to wait on', { skip: process.platform === 'win32' }, () => {
  const dir = scratch('cli');
  try {
    const bin = fakeOpencode(dir);
    const log = path.join(dir, 'log.jsonl');
    const message = path.join(dir, 'message.txt');
    const body = '--report-dir /tmp/claude-1000/sai/x\nquote " dollar $HOME backtick ` $(touch pwned) ; echo\n';
    fs.writeFileSync(message, body);
    const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_LOG: log };

    const started = cli(['start', '--agent', 'worker', '--input-file', message, '--cwd', dir], env, dir);
    assert.equal(started.status, 0, started.stderr);
    const result = JSON.parse(started.stdout);
    assert.deepEqual([result.status, result.sessionID, result.text, result.exit_code], ['ok', 'ses_worker', '--report-dir /tmp/claude-1000/sai/x', 0]);
    assert.deepEqual(result.tokens, { input: 1, output: 2, reasoning: 0, cache_read: 0, cache_write: 0 });

    const continued = cli(['continue', '--session', result.sessionID, '--agent', 'worker', '--input-file', message, '--cwd', dir], env, dir);
    assert.equal(continued.status, 0, continued.stderr);
    assert.equal(JSON.parse(continued.stdout).sessionID, 'ses_worker');

    const calls = fs.readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].argv.slice(0, 6), ['run', '--format', 'json', '--agent', 'worker', '--']);
    assert.deepEqual(calls[1].argv.slice(0, 7), ['run', '--format', 'json', '--session', 'ses_worker', '--agent', 'worker']);
    for (const call of calls) {
      assert.equal(call.argv.at(-2), '--', 'the message is the single argument after --');
      assert.equal(call.argv.at(-1), body, 'the message arrives exactly as the file holds it');
      assert.ok(!call.argv.includes('--auto'));
      assert.equal(call.stdinIsNull, true, 'the turn has no terminal input to wait on');
    }
    assert.ok(!fs.existsSync(path.join(dir, 'pwned')), 'no shell interpreted the message');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI exits 1 with a failed object when the turn fails, and 2 on a usage error', { skip: process.platform === 'win32' }, () => {
  const dir = scratch('cli-fail');
  try {
    const bin = fakeOpencode(dir);
    const message = path.join(dir, 'message.txt');
    fs.writeFileSync(message, 'hello');
    const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_LOG: path.join(dir, 'log.jsonl'), FAKE_MODE: 'error' };
    const failed = cli(['start', '--agent', 'worker', '--input-file', message, '--cwd', dir], env, dir);
    assert.equal(failed.status, 1);
    assert.deepEqual([JSON.parse(failed.stdout).status, JSON.parse(failed.stdout).error], ['failed', 'boom']);
    const usage = cli(['start', '--agent', 'worker', '--input-file', path.join(dir, 'missing.txt')], env, dir);
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /cannot read input file/);
    assert.equal(cli(['start', '--agent', 'worker'], env, dir).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E10 parallel starts run one opencode process per worker, each result carries its own sessionID', { skip: process.platform === 'win32' }, async () => {
  const dir = scratch('cli-parallel');
  try {
    const bin = fakeOpencode(dir);
    const log = path.join(dir, 'log.jsonl');
    const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_LOG: log };
    const names = ['sai-5-security-worker', 'sai-6-performance-worker', 'sai-7-accessibility-worker'];
    const outputs = await Promise.all(names.map(name => new Promise((resolve, reject) => {
      const message = path.join(dir, `${name}.txt`);
      fs.writeFileSync(message, `ready for ${name}`);
      const child = spawn(process.execPath, [SCRIPT, 'start', '--agent', name, '--input-file', message, '--cwd', dir], { env });
      let stdout = '';
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.on('error', reject);
      child.on('close', () => resolve(JSON.parse(stdout)));
    })));
    assert.deepEqual(outputs.map(output => output.sessionID), names.map(name => `ses_${name}`));
    assert.deepEqual(outputs.map(output => output.text), names.map(name => `ready for ${name}`));
    assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').length, names.length);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the route command prints one JSON object and falls back with a notice when opencode lacks the agent', { skip: process.platform === 'win32' }, () => {
  const project = scratch('cli-route');
  const global = scratch('cli-route-global');
  try {
    const bin = fakeOpencode(project);
    agentFile(path.join(project, '.claude'), 'worker', 'harness: opencode');
    const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}`, CLAUDE_CONFIG_DIR: global, FAKE_LOG: path.join(project, 'log.jsonl') };
    const present = cli(['route', '--agent', 'worker', '--cwd', project], { ...env, FAKE_AGENTS: 'worker,other' }, project);
    assert.equal(present.status, 0, present.stderr);
    assert.deepEqual(JSON.parse(present.stdout), { route: 'opencode', cause: 'harness-opencode', agent: 'worker' });
    const absent = cli(['route', '--agent', 'worker', '--cwd', project], { ...env, FAKE_AGENTS: 'other' }, project);
    assert.equal(JSON.parse(absent.stdout).route, 'claude');
    assert.equal(JSON.parse(absent.stdout).cause, 'opencode-agent-missing');
    const noBinary = cli(['route', '--agent', 'worker', '--cwd', project], { ...env, PATH: path.dirname(process.execPath) }, project);
    assert.equal(JSON.parse(noBinary.stdout).cause, 'opencode-missing');
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(global, { recursive: true, force: true });
  }
});

test('the dispatch policy is the single source and the five dispatch sites point to it', () => {
  const policy = read('sai/policies/opencode-dispatch.md');
  assert.match(policy, /opencode-dispatch\.js/);
  assert.match(policy, /`harness: opencode`/);
  assert.match(policy, /route --agent/);
  assert.match(policy, /run_in_background: true/);
  assert.match(policy, /Agent` tool/);
  assert.match(policy, /never passes `--auto`/);
  assert.match(policy, /needs_input/);
  assert.match(policy, /`warming: false`/);
  assert.match(policy, /TaskStop\(task_id/);
  assert.match(policy, /`--harness claude` as its second line/);
  assert.match(policy, /the tool adds nothing to any message/);
  for (const site of [
    'sai/orchestration/workers/bindings/claude/standalone-worker-template.md',
    'skills/claude/budget-explorer/SKILL.md',
    'skills/claude/budget-executor/SKILL.md',
    'skills/claude/budget-subagent/SKILL.md',
  ]) {
    assert.match(read(site), /Fetch `@sai\/policies\/opencode-dispatch\.md`/, site);
  }
  assert.match(read('sai/policies/worker-lifecycle.md'), /opencode-routed agent \(`@sai\/policies\/opencode-dispatch\.md`\)[^.]*`TaskStop`/);
  assert.match(read('sai/policies/cache-warming.md'), /opencode-routed agent \(`@sai\/policies\/opencode-dispatch\.md`\) receives no switch/);
});

test('I8 the --harness envelope line is defined by the report transport and carried only with --report-dir', () => {
  const transport = read('sai/policies/worker-report-transport.md');
  const boundary = transport.slice(transport.indexOf('## Author boundary'), transport.indexOf('## Direct Build role fields'));
  assert.match(boundary, /second line, `--harness <claude\|opencode>`/);
  assert.match(boundary, /strip that line the same way, retain it/);
  assert.match(boundary, /`temp-root\.js` or `transfer\.js` call/);
  assert.match(boundary, /Without the line[^.]*infer the harness from the installed root/);
  const tool = read('sai/tools/opencode-dispatch.js');
  assert.doesNotMatch(tool, /HARNESS_NOTE|temp root:/, 'the tool appends no instruction of its own');
});

test('E13 opencode dispatch sites and templates stay free of the routing key', () => {
  for (const file of ['sai/orchestration/workers/bindings/opencode/standalone-worker-template.md', 'skills/opencode/budget-explorer/SKILL.md', 'skills/opencode/budget-executor/SKILL.md', 'skills/opencode/budget-subagent/SKILL.md']) {
    assert.doesNotMatch(read(file), /harness: opencode|opencode-dispatch/, file);
  }
});

const okRun = async () => ({ status: 0, stdout: [event('step_start'), text('m1', 'done'), stepFinish({})].join('\n') });

test('E6 a continue refuses to start while the lock of its session belongs to a live process, and sends nothing', async () => {
  const dir = scratch('lock-busy');
  try {
    assert.equal(acquireTurnLock(dir, 'ses_busy', { pid: 4242 }).acquired, true);
    let sent = 0;
    const result = await guardedTurn({ session: 'ses_busy', message: 'again', cwd: '.' }, { lockDirectory: () => dir, alive: pid => pid === 4242, run: async () => { sent += 1; return okRun(); } });
    assert.equal(sent, 0, 'nothing reaches opencode');
    assert.deepEqual([result.status, result.sessionID, result.exit_code, result.busy_pid], ['busy', 'ses_busy', null, 4242]);
    assert.match(result.error, /still running \(process 4242\); nothing was sent/);
    assert.equal(fs.readFileSync(path.join(dir, 'ses_busy.lock'), 'utf8'), '4242', 'the lock of the running turn is untouched');
    assert.equal(BUSY_EXIT, 3);
    assert.deepEqual(busyResult('ses_x', 0).tokens, { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E6 a lock whose process no longer exists is ignored, and the turn runs and releases its own lock', async () => {
  const dir = scratch('lock-stale');
  try {
    fs.writeFileSync(path.join(dir, 'ses_stale.lock'), '999999');
    let sent = 0;
    const result = await guardedTurn({ session: 'ses_stale', message: 'again', cwd: '.' }, { lockDirectory: () => dir, alive: () => false, run: async () => {
      sent += 1;
      assert.equal(fs.readFileSync(path.join(dir, 'ses_stale.lock'), 'utf8'), String(process.pid), 'the running turn holds the lock');
      return okRun();
    } });
    assert.equal(sent, 1);
    assert.equal(result.status, 'ok');
    assert.deepEqual(fs.readdirSync(dir), [], 'the lock and its draft are gone when the turn ends');

    fs.writeFileSync(path.join(dir, 'ses_junk.lock'), 'not a pid');
    assert.equal((await guardedTurn({ session: 'ses_junk', message: 'm', cwd: '.' }, { lockDirectory: () => dir, run: okRun })).status, 'ok', 'a lock that holds no PID is replaced');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the turn lock is released when the turn fails or throws, and a second turn of another session is not blocked', async () => {
  const dir = scratch('lock-release');
  try {
    const failed = await guardedTurn({ session: 'ses_a', message: 'm', cwd: '.' }, { lockDirectory: () => dir, run: async () => ({ status: 1, stdout: '' }) });
    assert.equal(failed.status, 'failed');
    assert.deepEqual(fs.readdirSync(dir), []);
    await assert.rejects(guardedTurn({ session: 'ses_a', message: 'm', cwd: '.' }, { lockDirectory: () => dir, run: async () => { throw new Error('spawn failed'); } }), /spawn failed/);
    assert.deepEqual(fs.readdirSync(dir), []);

    const first = acquireTurnLock(dir, 'ses_one', { pid: process.pid });
    assert.equal(first.acquired, true);
    const other = await guardedTurn({ session: 'ses_two', message: 'm', cwd: '.' }, { lockDirectory: () => dir, run: okRun });
    assert.equal(other.status, 'ok', 'the lock is per session');
    first.release();
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('F2 a contender that finds the stale lock replaced meanwhile never removes the lock that replaced it', () => {
  const dir = scratch('lock-race');
  try {
    fs.writeFileSync(path.join(dir, 'ses_race.lock'), '4001');
    let first = null;
    // While the second contender checks the stale holder, the first one completes its whole replacement.
    const second = acquireTurnLock(dir, 'ses_race', { pid: 5002, alive: pid => {
      if (pid === 4001 && first === null) first = acquireTurnLock(dir, 'ses_race', { pid: 5001, alive: holder => holder === 5001 });
      return pid === 5001;
    } });
    assert.equal(first.acquired, true);
    assert.deepEqual([second.acquired, second.pid], [false, 5001], 'the second contender sees the live lock of the first');
    assert.equal(fs.readFileSync(path.join(dir, 'ses_race.lock'), 'utf8'), '5001', 'the lock of the first contender is untouched');
    assert.deepEqual(fs.readdirSync(dir).sort(), ['ses_race.lock'], 'no draft or claim is left behind');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('F2 several processes over one stale lock never acquire it at once', { skip: process.platform === 'win32' }, async () => {
  const dir = scratch('lock-contenders');
  try {
    const dead = spawnSync(process.execPath, ['-e', '']);
    fs.writeFileSync(path.join(dir, 'ses_many.lock'), String(dead.pid));
    const go = path.join(dir, 'go');
    const script = `
      const fs = require('fs');
      const { acquireTurnLock } = require(${JSON.stringify(SCRIPT)});
      while (!fs.existsSync(${JSON.stringify(go)})) { /* wait for the start signal */ }
      const lock = acquireTurnLock(${JSON.stringify(dir)}, 'ses_many', {});
      if (lock.acquired) {
        fs.appendFileSync(${JSON.stringify(path.join(dir, 'acquired.log'))}, process.pid + '\\n');
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 600);
        lock.release();
      }
    `;
    const children = Array.from({ length: 8 }, () => new Promise(resolve => spawn(process.execPath, ['-e', script], { stdio: 'ignore' }).on('close', resolve)));
    await new Promise(resolve => setTimeout(resolve, 400));
    fs.writeFileSync(go, '');
    await Promise.all(children);
    assert.equal(fs.readFileSync(path.join(dir, 'acquired.log'), 'utf8').trim().split('\n').length, 1, 'exactly one contender took the stale lock');
    assert.equal(fs.existsSync(path.join(dir, 'ses_many.lock')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a release never removes a lock that another process took over, a start takes no lock, and an unresolved lock directory leaves the turn unguarded', async () => {
  const dir = scratch('lock-misc');
  try {
    const mine = acquireTurnLock(dir, 'ses_mine', { pid: 111 });
    fs.writeFileSync(path.join(dir, 'ses_mine.lock'), '222');
    mine.release();
    assert.equal(fs.readFileSync(path.join(dir, 'ses_mine.lock'), 'utf8'), '222');
    fs.unlinkSync(path.join(dir, 'ses_mine.lock'));

    let asked = 0;
    const started = await guardedTurn({ agent: 'w', message: 'm', cwd: '.' }, { lockDirectory: () => { asked += 1; return dir; }, run: okRun });
    assert.deepEqual([started.status, asked, fs.readdirSync(dir)], ['ok', 0, []]);

    const unguarded = await guardedTurn({ session: 'ses_x', message: 'm', cwd: '.' }, { lockDirectory: () => null, run: okRun });
    assert.equal(unguarded.status, 'ok');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('E6 the CLI refuses a continue with status busy and exit 3 while the session lock is live, and sends nothing to opencode', { skip: process.platform === 'win32' }, () => {
  const { resolveTempRoot } = require('../sai/tools/temp-root');
  let root;
  try { root = resolveTempRoot('claude'); } catch { root = null; }
  if (root === null) return;
  const dir = scratch('cli-busy');
  const session = `ses_busy_${process.pid}_${Date.now()}`;
  const locks = path.join(root, 'opencode-turns');
  fs.mkdirSync(locks, { recursive: true, mode: 0o700 });
  const lock = path.join(locks, `${session}.lock`);
  try {
    const bin = fakeOpencode(dir);
    const log = path.join(dir, 'log.jsonl');
    const message = path.join(dir, 'message.txt');
    fs.writeFileSync(message, 'again');
    fs.writeFileSync(lock, String(process.pid));
    const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_LOG: log };
    const busy = cli(['continue', '--session', session, '--agent', 'worker', '--input-file', message, '--cwd', dir], env, dir);
    assert.equal(busy.status, 3, busy.stderr);
    const result = JSON.parse(busy.stdout);
    assert.deepEqual([result.status, result.sessionID, result.busy_pid], ['busy', session, process.pid]);
    assert.equal(fs.existsSync(log), false, 'opencode was never run');

    fs.writeFileSync(lock, '999999999');
    const free = cli(['continue', '--session', session, '--agent', 'worker', '--input-file', message, '--cwd', dir], env, dir);
    assert.equal(free.status, 0, free.stderr);
    assert.equal(fs.existsSync(lock), false, 'the turn removed the lock it took over');
  } finally {
    fs.rmSync(lock, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('I3 the dispatch policy tells the coordinator how to handle a busy refusal', () => {
  const policy = read('sai/policies/opencode-dispatch.md');
  assert.match(policy, /`status: busy`/);
  assert.match(policy, /exit code 3/);
  assert.match(policy, /resend the same message once/);
});

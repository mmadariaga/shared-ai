'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { disposeShells, parseArguments, UsageError } = require('../sai/tools/dispose-shells');

const SCRIPT = path.resolve(__dirname, '../sai/tools/dispose-shells.js');
const DIRECTORY = '/home/user/my project';
const shell = (id, session, status = 'running') => ({ id, status, metadata: { sessionID: session } });

/** A stubbed `opencode api`: shells that vanish when deleted, and a record of every call. */
function server(shells, { refuseDelete = [], failListing = false, failAfterDelete = false } = {}) {
  const calls = [];
  let deleted = false;
  const run = (method, apiPath) => {
    calls.push([method, apiPath]);
    if (method === 'GET') {
      if (failListing || (failAfterDelete && deleted)) return { ok: false };
      return { ok: true, body: { location: { directory: DIRECTORY }, data: shells.map(item => ({ ...item })) } };
    }
    const id = /^\/api\/shell\/([^?]+)/.exec(apiPath)[1];
    deleted = true;
    if (refuseDelete.includes(id)) return { ok: false };
    shells.splice(shells.findIndex(item => item.id === id), 1);
    return { ok: true };
  };
  return { run, calls };
}

test('E8 it removes every running shell of the session and no shell of another session', () => {
  const { run, calls } = server([shell('sh_a', 'ses_1'), shell('sh_b', 'ses_2'), shell('sh_c', 'ses_1'), shell('sh_d', 'ses_1', 'exited')]);
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run), { status: 'removed', removed: ['sh_a', 'sh_c'], failed: [], closed: [], close_failed: [] });
  const deletes = calls.filter(([method]) => method === 'DELETE').map(([, apiPath]) => apiPath);
  assert.deepEqual(deletes, ['/api/shell/sh_a?location[directory]=%2Fhome%2Fuser%2Fmy%20project', '/api/shell/sh_c?location[directory]=%2Fhome%2Fuser%2Fmy%20project']);
  assert.ok(calls.every(([, apiPath]) => apiPath.includes('?location[directory]=%2Fhome%2Fuser%2Fmy%20project')), 'every call carries the URL-encoded directory inline');
});

test('E15 a worker with no running shell is reported as none, and nothing is deleted', () => {
  const { run, calls } = server([shell('sh_b', 'ses_2'), shell('sh_x', 'ses_1', 'killed')]);
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run), { status: 'none', removed: [], failed: [], closed: [], close_failed: [] });
  assert.deepEqual(calls.map(([method]) => method), ['GET']);
});

test('E15 a shell still listed after its removal is failed, and the others are removed', () => {
  const { run } = server([shell('sh_a', 'ses_1'), shell('sh_b', 'ses_1')], { refuseDelete: ['sh_b'] });
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run), { status: 'failed', removed: ['sh_a'], failed: ['sh_b'], closed: [], close_failed: [] });
});

test('E14 an unreachable server or a failed second listing is unavailable', () => {
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, server([], { failListing: true }).run), { status: 'unavailable', removed: [], failed: [], closed: [], close_failed: [] });
  const after = disposeShells({ session: 'ses_1', cwd: DIRECTORY }, server([shell('sh_a', 'ses_1')], { failAfterDelete: true }).run);
  assert.equal(after.status, 'unavailable');
  assert.deepEqual(after.removed, [], 'nothing is reported removed that the second listing did not confirm');
});

test('an id that is not a shell id is never put in a request path', () => {
  const { run, calls } = server([shell('../../etc', 'ses_1')]);
  assert.equal(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run).status, 'none');
  assert.deepEqual(calls.map(([method]) => method), ['GET']);
});

test('it refuses a missing session or directory as a usage error', () => {
  for (const input of [{ cwd: DIRECTORY }, { session: 'ses 1', cwd: DIRECTORY }, { session: 'ses_1' }, { session: '../x', cwd: DIRECTORY }]) {
    assert.throws(() => disposeShells(input, server([]).run), UsageError, JSON.stringify(input));
  }
});

test('the CLI runs the opencode CLI by name, prints one JSON object, and maps the status to the exit code', { skip: process.platform === 'win32' }, t => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'dispose-shells-'));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  const log = path.join(bin, 'calls.log');
  fs.writeFileSync(path.join(bin, 'opencode'), `#!${process.execPath}
const fs = require('node:fs');
const [, , api, method, apiPath] = process.argv;
fs.appendFileSync(${JSON.stringify(log)}, [api, method, apiPath].join(' ') + '\\n');
const state = ${JSON.stringify(path.join(bin, 'state.json'))};
let shells = fs.existsSync(state) ? JSON.parse(fs.readFileSync(state, 'utf8')) : [{ id: 'sh_a', status: 'running', metadata: { sessionID: 'ses_1' } }];
if (method === 'DELETE') { shells = []; fs.writeFileSync(state, JSON.stringify(shells)); process.exit(0); }
console.log(JSON.stringify({ location: { directory: '/tmp' }, data: shells }));
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const run = args => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env });
  const removed = run(['--session', 'ses_1', '--cwd', '/tmp']);
  assert.equal(removed.status, 0);
  assert.deepEqual(JSON.parse(removed.stdout), { status: 'removed', removed: ['sh_a'], failed: [], closed: [], close_failed: [] });
  assert.deepEqual(fs.readFileSync(log, 'utf8').trim().split('\n'), [
    'api GET /api/shell?location[directory]=%2Ftmp', 'api DELETE /api/shell/sh_a?location[directory]=%2Ftmp', 'api GET /api/shell?location[directory]=%2Ftmp',
  ]);
  assert.equal(JSON.parse(run(['--session', 'ses_1', '--cwd', '/tmp']).stdout).status, 'none');
  const usage = run(['--session', 'ses_1']);
  assert.equal(usage.status, 2);
  assert.equal(JSON.parse(usage.stdout).status, 'error');
  const missing = spawnSync(process.execPath, [SCRIPT, '--session', 'ses_1', '--cwd', '/tmp'], { encoding: 'utf8', env: { ...process.env, PATH: path.join(bin, 'nowhere') } });
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stdout).status, 'unavailable');
});

const listings = calls => calls.filter(([method]) => method === 'GET').length;

test('E9 several sessions share one running listing and one verifying listing, and the envelope follows the order given', () => {
  const { run, calls } = server([shell('sh_a', 'ses_1'), shell('sh_b', 'ses_2'), shell('sh_c', 'ses_3'), shell('sh_d', 'ses_1')]);
  const result = disposeShells({ sessions: ['ses_2', 'ses_1', 'ses_4'], cwd: DIRECTORY }, run);
  assert.deepEqual(result, {
    status: 'removed',
    results: [
      { session: 'ses_2', status: 'removed', removed: ['sh_b'], failed: [], closed: [], close_failed: [] },
      { session: 'ses_1', status: 'removed', removed: ['sh_a', 'sh_d'], failed: [], closed: [], close_failed: [] },
      { session: 'ses_4', status: 'none', removed: [], failed: [], closed: [], close_failed: [] },
    ],
  });
  assert.equal(listings(calls), 2, 'two listings whatever the number of sessions');
  assert.equal(calls.filter(([method]) => method === 'DELETE').length, 3);
});

test('E9 the top status is the worst entry: unavailable > failed > removed > none', () => {
  const none = disposeShells({ sessions: ['ses_8', 'ses_9'], cwd: DIRECTORY }, server([shell('sh_a', 'ses_1')]).run);
  assert.equal(none.status, 'none');
  const failed = disposeShells({ sessions: ['ses_1', 'ses_2', 'ses_9'], cwd: DIRECTORY }, server([shell('sh_a', 'ses_1'), shell('sh_b', 'ses_2')], { refuseDelete: ['sh_a'] }).run);
  assert.equal(failed.status, 'failed');
  const unavailable = disposeShells({ sessions: ['ses_1', 'ses_2'], cwd: DIRECTORY }, server([shell('sh_a', 'ses_1')], { failAfterDelete: true }).run);
  assert.equal(unavailable.status, 'unavailable');
  assert.deepEqual(unavailable.results.map(entry => entry.status), ['unavailable', 'none'], 'a session with no shell stays none');
  assert.equal(disposeShells({ sessions: ['ses_1', 'ses_2'], cwd: DIRECTORY }, server([], { failListing: true }).run).status, 'unavailable');
});

test('E10 a refused delete in one session leaves the other sessions removed, each with its own status', () => {
  const { run } = server([shell('sh_a', 'ses_1'), shell('sh_b', 'ses_2'), shell('sh_c', 'ses_1')], { refuseDelete: ['sh_b'] });
  const result = disposeShells({ sessions: ['ses_1', 'ses_2'], cwd: DIRECTORY }, run);
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.results, [
    { session: 'ses_1', status: 'removed', removed: ['sh_a', 'sh_c'], failed: [], closed: [], close_failed: [] },
    { session: 'ses_2', status: 'failed', removed: [], failed: ['sh_b'], closed: [], close_failed: [] },
  ]);
});

test('E11 every argument is validated before any delete, and a session named twice yields one entry', () => {
  const { run, calls } = server([shell('sh_a', 'ses_1')]);
  assert.throws(() => disposeShells({ sessions: ['ses_1', 'bad id'], cwd: DIRECTORY }, run), UsageError);
  assert.throws(() => disposeShells({ sessions: ['ses_1', 'ses_2'], cwd: '' }, run), UsageError);
  assert.deepEqual(calls, [], 'nothing was listed or removed');
  const twice = disposeShells(parseArguments(['--session', 'ses_1', '--session', 'ses_1', '--cwd', DIRECTORY]), run);
  assert.deepEqual(twice, { status: 'removed', results: [{ session: 'ses_1', status: 'removed', removed: ['sh_a'], failed: [], closed: [], close_failed: [] }] });
});

test('E12 a repeated --cwd is a usage error, and the shape follows the number of --session flags', () => {
  assert.throws(() => parseArguments(['--session', 'ses_1', '--cwd', '/a', '--cwd', '/b']), UsageError);
  assert.throws(() => parseArguments(['--session', 'ses_1', '--bogus', 'x']), UsageError);
  assert.deepEqual(parseArguments(['--session', 'ses_1', '--cwd', '/a']), { session: 'ses_1', cwd: '/a' });
  assert.deepEqual(parseArguments(['--session', 'ses_1', '--session', 'ses_2', '--cwd', '/a']), { sessions: ['ses_1', 'ses_2'], cwd: '/a' });
});

test('the CLI prints the envelope for two sessions, exits like the worst entry, and removes nothing on a usage error', { skip: process.platform === 'win32' }, t => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'dispose-shells-'));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  const log = path.join(bin, 'calls.log');
  fs.writeFileSync(path.join(bin, 'opencode'), `#!${process.execPath}
const fs = require('node:fs');
const [, , api, method, apiPath] = process.argv;
fs.appendFileSync(${JSON.stringify(log)}, [api, method, apiPath].join(' ') + '\\n');
const state = ${JSON.stringify(path.join(bin, 'state.json'))};
let shells = fs.existsSync(state) ? JSON.parse(fs.readFileSync(state, 'utf8')) : [{ id: 'sh_a', status: 'running', metadata: { sessionID: 'ses_1' } }, { id: 'sh_b', status: 'running', metadata: { sessionID: 'ses_2' } }];
if (method === 'DELETE') { shells = []; fs.writeFileSync(state, JSON.stringify(shells)); process.exit(0); }
console.log(JSON.stringify({ location: { directory: '/tmp' }, data: shells }));
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  const run = args => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env });
  const refused = run(['--session', 'ses_1', '--session', 'bad id', '--cwd', '/tmp']);
  assert.equal(refused.status, 2);
  assert.equal(run(['--session', 'ses_1', '--cwd', '/tmp', '--cwd', '/tmp']).status, 2);
  assert.equal(fs.existsSync(log), false, 'a usage error never reaches the server');
  const removed = run(['--session', 'ses_1', '--session', 'ses_2', '--cwd', '/tmp']);
  assert.equal(removed.status, 0);
  assert.deepEqual(JSON.parse(removed.stdout), {
    status: 'removed',
    results: [{ session: 'ses_1', status: 'removed', removed: ['sh_a'], failed: [], closed: [], close_failed: [] }, { session: 'ses_2', status: 'removed', removed: ['sh_b'], failed: [], closed: [], close_failed: [] }],
  });
  assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').filter(line => line.startsWith('api GET')).length, 2);
});

// ---- closing the cache-warm chain of a removed `wait.js warm` shell ----
const { stateToken, decodeStateToken } = require('../skills/universal/sai-cache-warmer/wait');
const { splitCommand, warmChain } = require('../sai/tools/dispose-shells');

const CHAIN_A = '0123456789abcdef';
const CHAIN_B = 'fedcba9876543210';
const withCommand = (id, session, command, status = 'running') => ({ ...shell(id, session, status), command });

/** A stubbed warmer: the real token decoder, and a record of each chain it was asked to close. */
function warmer(answers = {}) {
  const closes = [];
  return {
    closes,
    decode: decodeStateToken,
    close: chain => {
      closes.push(chain);
      const answer = answers[chain] ?? 'closed';
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

test('E1 E9 a removed warm shell with --chain closes its chain once the shell is gone', () => {
  const { run, calls } = server([withCommand('sh_a', 'ses_1', `node "/home/u/.config/opencode/skills/sai-cache-warmer/wait.js" warm --chain ${CHAIN_A}`)]);
  const stub = warmer();
  const result = disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, stub);
  assert.deepEqual(result, { status: 'removed', removed: ['sh_a'], failed: [], closed: [CHAIN_A], close_failed: [] });
  assert.deepEqual(stub.closes, [CHAIN_A]);
  assert.equal(calls.at(-1)[0], 'GET', 'the close follows the verifying listing');
});

test('E1 the --state form decodes the token that wait.js exports and closes that chain', () => {
  const token = stateToken({ chain: CHAIN_B, generation: 2, token: 't', interval_ms: 1, closing_ms: 2, armed_ms: 0 });
  const { run } = server([withCommand('sh_a', 'ses_1', `node /x/wait.js warm --state ${token}`)]);
  const stub = warmer();
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, stub).closed, [CHAIN_B]);
  assert.deepEqual(stub.closes, [CHAIN_B]);
});

test('E9 I7 a quoted Windows path with spaces and backslashes is split into arguments', () => {
  const script = 'C:\\Users\\Jane Doe\\.config\\opencode\\skills\\sai-cache-warmer\\wait.js';
  const command = `node "${script}" warm --chain ${CHAIN_A}`;
  assert.deepEqual(splitCommand(command), ['node', script, 'warm', '--chain', CHAIN_A]);
  assert.equal(warmChain(command, decodeStateToken), CHAIN_A);
  assert.equal(warmChain(`node "D:/my tools/wait.js" warm --chain ${CHAIN_A}`, decodeStateToken), CHAIN_A);
  assert.equal(warmChain(`node 'D:/my tools/wait.js' warm --chain ${CHAIN_A}`, decodeStateToken), CHAIN_A);
  const { run } = server([withCommand('sh_a', 'ses_1', command)]);
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, warmer()).closed, [CHAIN_A]);
});

test('E2 a shell that is not a wait.js warm command, has no command, or has an undecodable token closes no chain', () => {
  const { run } = server([
    withCommand('sh_a', 'ses_1', 'node /x/transfer.js watch --dir /tmp/d'),
    shell('sh_b', 'ses_1'),
    withCommand('sh_c', 'ses_1', 'node /x/wait.js warm --state !!not-a-token'),
    withCommand('sh_d', 'ses_1', `node /x/wait.js arm --chain ${CHAIN_A}`),
    withCommand('sh_e', 'ses_1', 'node /x/wait.js warm --chain ../escape'),
  ]);
  const stub = warmer();
  const result = disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, stub);
  assert.deepEqual(result, { status: 'removed', removed: ['sh_a', 'sh_b', 'sh_c', 'sh_d', 'sh_e'], failed: [], closed: [], close_failed: [] });
  assert.deepEqual(stub.closes, []);
});

test('E10 several shells of the same chain close it once, and an already-closed answer counts as closed', () => {
  const line = `node /x/wait.js warm --chain ${CHAIN_A}`;
  const { run } = server([withCommand('sh_a', 'ses_1', line), withCommand('sh_b', 'ses_1', line)]);
  const stub = warmer({ [CHAIN_A]: 'already-closed' });
  const result = disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, stub);
  assert.deepEqual(stub.closes, [CHAIN_A]);
  assert.deepEqual([result.closed, result.close_failed], [[CHAIN_A], []]);
  const twoSessions = server([withCommand('sh_a', 'ses_1', line), withCommand('sh_b', 'ses_2', line)]);
  const shared = warmer();
  const envelope = disposeShells({ sessions: ['ses_1', 'ses_2'], cwd: DIRECTORY }, twoSessions.run, shared);
  assert.deepEqual(shared.closes, [CHAIN_A], 'a chain named by two sessions closes once');
  assert.deepEqual(envelope.results.map(entry => entry.closed), [[CHAIN_A], [CHAIN_A]]);
});

test('E3 a failed close lands in close_failed and leaves status and the other chain untouched', () => {
  const { run } = server([
    withCommand('sh_a', 'ses_1', `node /x/wait.js warm --chain ${CHAIN_A}`),
    withCommand('sh_b', 'ses_1', `node /x/wait.js warm --chain ${CHAIN_B}`),
  ]);
  const result = disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, warmer({ [CHAIN_A]: new Error('locked'), [CHAIN_B]: 'absent' }));
  assert.deepEqual(result, { status: 'removed', removed: ['sh_a', 'sh_b'], failed: [], closed: [], close_failed: [CHAIN_A, CHAIN_B] });
});

test('E11 a warm shell that survives its removal still has its chain closed, with status failed', () => {
  const { run } = server([withCommand('sh_a', 'ses_1', `node /x/wait.js warm --chain ${CHAIN_A}`)], { refuseDelete: ['sh_a'] });
  const stub = warmer();
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, stub), { status: 'failed', removed: [], failed: ['sh_a'], closed: [CHAIN_A], close_failed: [] });
  assert.deepEqual(stub.closes, [CHAIN_A]);
});

test('E11 a failed verifying listing is unavailable and the chain is still closed', () => {
  const { run } = server([withCommand('sh_a', 'ses_1', `node /x/wait.js warm --chain ${CHAIN_A}`)], { failAfterDelete: true });
  const result = disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, warmer());
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(result.closed, [CHAIN_A]);
});

test('E5 a none listing closes no chain, even when the warm shell belongs to another session', () => {
  const { run, calls } = server([withCommand('sh_a', 'ses_2', `node /x/wait.js warm --chain ${CHAIN_A}`)]);
  const stub = warmer();
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run, stub), { status: 'none', removed: [], failed: [], closed: [], close_failed: [] });
  assert.deepEqual(stub.closes, []);
  assert.deepEqual(calls.map(([method]) => method), ['GET']);
});

test('E3 with no installed wait.js the default warmer reports the chain as failed, not as a status change', t => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dispose-root-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const { run } = server([withCommand('sh_a', 'ses_1', `node /x/wait.js warm --chain ${CHAIN_A}`)]);
  const saved = { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, PATH: process.env.PATH };
  process.env.XDG_CONFIG_HOME = home;
  process.env.PATH = '';
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const result = disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run);
  assert.equal(result.status, 'removed');
  assert.deepEqual([result.closed, result.close_failed], [[], [CHAIN_A]]);
});

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
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run), { status: 'removed', removed: ['sh_a', 'sh_c'], failed: [] });
  const deletes = calls.filter(([method]) => method === 'DELETE').map(([, apiPath]) => apiPath);
  assert.deepEqual(deletes, ['/api/shell/sh_a?location[directory]=%2Fhome%2Fuser%2Fmy%20project', '/api/shell/sh_c?location[directory]=%2Fhome%2Fuser%2Fmy%20project']);
  assert.ok(calls.every(([, apiPath]) => apiPath.includes('?location[directory]=%2Fhome%2Fuser%2Fmy%20project')), 'every call carries the URL-encoded directory inline');
});

test('E15 a worker with no running shell is reported as none, and nothing is deleted', () => {
  const { run, calls } = server([shell('sh_b', 'ses_2'), shell('sh_x', 'ses_1', 'killed')]);
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run), { status: 'none', removed: [], failed: [] });
  assert.deepEqual(calls.map(([method]) => method), ['GET']);
});

test('E15 a shell still listed after its removal is failed, and the others are removed', () => {
  const { run } = server([shell('sh_a', 'ses_1'), shell('sh_b', 'ses_1')], { refuseDelete: ['sh_b'] });
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, run), { status: 'failed', removed: ['sh_a'], failed: ['sh_b'] });
});

test('E14 an unreachable server or a failed second listing is unavailable', () => {
  assert.deepEqual(disposeShells({ session: 'ses_1', cwd: DIRECTORY }, server([], { failListing: true }).run), { status: 'unavailable', removed: [], failed: [] });
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
  assert.deepEqual(JSON.parse(removed.stdout), { status: 'removed', removed: ['sh_a'], failed: [] });
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
      { session: 'ses_2', status: 'removed', removed: ['sh_b'], failed: [] },
      { session: 'ses_1', status: 'removed', removed: ['sh_a', 'sh_d'], failed: [] },
      { session: 'ses_4', status: 'none', removed: [], failed: [] },
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
    { session: 'ses_1', status: 'removed', removed: ['sh_a', 'sh_c'], failed: [] },
    { session: 'ses_2', status: 'failed', removed: [], failed: ['sh_b'] },
  ]);
});

test('E11 every argument is validated before any delete, and a session named twice yields one entry', () => {
  const { run, calls } = server([shell('sh_a', 'ses_1')]);
  assert.throws(() => disposeShells({ sessions: ['ses_1', 'bad id'], cwd: DIRECTORY }, run), UsageError);
  assert.throws(() => disposeShells({ sessions: ['ses_1', 'ses_2'], cwd: '' }, run), UsageError);
  assert.deepEqual(calls, [], 'nothing was listed or removed');
  const twice = disposeShells(parseArguments(['--session', 'ses_1', '--session', 'ses_1', '--cwd', DIRECTORY]), run);
  assert.deepEqual(twice, { status: 'removed', results: [{ session: 'ses_1', status: 'removed', removed: ['sh_a'], failed: [] }] });
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
    results: [{ session: 'ses_1', status: 'removed', removed: ['sh_a'], failed: [] }, { session: 'ses_2', status: 'removed', removed: ['sh_b'], failed: [] }],
  });
  assert.equal(fs.readFileSync(log, 'utf8').trim().split('\n').filter(line => line.startsWith('api GET')).length, 2);
});

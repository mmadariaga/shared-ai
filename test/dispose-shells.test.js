'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { disposeShells, UsageError } = require('../sai/tools/dispose-shells');

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

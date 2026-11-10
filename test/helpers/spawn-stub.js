'use strict';

// Replaces `child_process.spawn` with a handler that answers like the old `spawnSync` stubs did: it receives
// `(command, args, options)` and returns `{ status, stdout, stderr, signal, error, hang }`. `hang: true` is a process
// that never ends, so the caller's time limit decides; `error` is a spawn failure such as ENOENT.
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');

function fakeChild(result) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.stdin.resume();
  setImmediate(() => {
    if (result.hang) return;
    if (result.error) { child.emit('error', result.error); return; }
    child.stdout.end(result.stdout == null ? undefined : Buffer.from(result.stdout));
    child.stderr.end(result.stderr == null ? undefined : Buffer.from(result.stderr));
    const status = result.status === undefined ? 0 : result.status;
    child.emit('exit', status, result.signal ?? null);
    setImmediate(() => child.emit('close', status, result.signal ?? null));
  });
  return child;
}

function stub(childProcess, handler) {
  childProcess.spawn = (command, args, options) => fakeChild(handler(command, args, options) || {});
}

module.exports = { stub, fakeChild };

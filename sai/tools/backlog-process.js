'use strict';

const childProcess = require('node:child_process');

// The limit of each external process the backlog tools start. It bounds one process and its descendants, never a whole invocation.
const PROCESS_TIMEOUT_MS = 120000;

function limitLabel(milliseconds) {
  return milliseconds % 1000 === 0 ? `${milliseconds / 1000} s` : `${milliseconds} ms`;
}

// The process groups that are running now. A group started apart from the terminal no longer receives its interrupt,
// so the tool ends each of them when it is interrupted, terminated, or exits before the bound.
const running = new Set();
const SIGNALS = ['SIGINT', 'SIGTERM'];

function endTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') childProcess.spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else process.kill(-child.pid, 'SIGKILL');
  } catch { /* The group already ended. */ }
}
function endAll() {
  for (const child of running) endTree(child);
  running.clear();
}
function onSignal(signal) {
  endAll();
  disarm();
  // Another handler of the host decides what an interrupt means for it; with none left the default action applies.
  if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
}
const handlers = Object.fromEntries(SIGNALS.map(signal => [signal, () => onSignal(signal)]));
let armed = false;
function arm() {
  if (armed) return;
  armed = true;
  for (const signal of SIGNALS) process.on(signal, handlers[signal]);
  process.on('exit', endAll);
}
function disarm() {
  if (!armed) return;
  armed = false;
  for (const signal of SIGNALS) process.removeListener(signal, handlers[signal]);
  process.removeListener('exit', endAll);
}

/**
 * Runs one external process with a time limit and resolves with its `spawnSync`-shaped result. `step` names the
 * logical operation for the failure message; `timeout` is the limit in milliseconds and defaults to 120 s. The process
 * runs as the leader of its own process group (`taskkill /T` on Windows), so a process that outlives the limit is
 * killed together with every descendant and reported as a `process-timeout` failure (the promise rejects). The same
 * group ends when the calling process receives `SIGINT` or `SIGTERM` or exits while the process still runs. A process
 * that exited by itself while a descendant still holds its output pipe is treated as finished once the limit
 * passes, so the descendant never extends the wait past the limit. Every other outcome resolves to the caller unchanged.
 */
function runProcess(command, args, options = {}) {
  const { step, timeout = PROCESS_TIMEOUT_MS, input, encoding, maxBuffer = 1024 * 1024, ...spawnOptions } = options;
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = childProcess.spawn(command, args, { ...spawnOptions, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true });
    } catch (error) { resolve({ error, status: null, signal: null, stdout: null, stderr: null, pid: 0 }); return; }
    const chunks = { stdout: [], stderr: [] };
    const sizes = { stdout: 0, stderr: 0 };
    let status = null, signal = null, exited = false, closed = false, settled = false, failure = null;
    const collect = name => data => {
      chunks[name].push(data);
      sizes[name] += data.length;
      if (sizes[name] > maxBuffer && !failure) { failure = Object.assign(new Error(`${command} output exceeded maxBuffer`), { code: 'ENOBUFS' }); endTree(child); }
    };
    const text = name => { const buffer = Buffer.concat(chunks[name]); return encoding && encoding !== 'buffer' ? buffer.toString(encoding) : buffer; };
    const finish = (timedOut) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      running.delete(child);
      if (!running.size) disarm();
      child.stdout.destroy(); child.stderr.destroy();
      if (timedOut && !exited) {
        reject(Object.assign(new Error(`${step || command} did not finish within ${limitLabel(timeout)} and was stopped. Nothing is reported as loaded or written by this step.`), { reason: 'process-timeout' }));
        return;
      }
      resolve({ pid: child.pid, status, signal, stdout: text('stdout'), stderr: text('stderr'), ...(failure ? { error: failure } : {}) });
    };
    const timer = setTimeout(() => { endTree(child); finish(true); }, timeout);
    child.on('error', error => { failure = failure || error; if (!child.pid) finish(false); });
    child.on('exit', (code, name) => { exited = true; status = code; signal = name; if (closed) finish(false); });
    child.on('close', () => { closed = true; if (exited) finish(false); });
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    child.stdin.on('error', () => { /* The process ended without reading its input. */ });
    child.stdin.end(input);
    if (child.pid) { running.add(child); arm(); }
  });
}

/** The logical step of a process: its program and the first two subcommand words, never the interpreter path or the data arguments. */
function stepLabel(command, args = []) {
  return [command, ...args.filter(arg => typeof arg === 'string' && !arg.startsWith('-')).slice(0, 2)].join(' ');
}

module.exports = { PROCESS_TIMEOUT_MS, runProcess, stepLabel };

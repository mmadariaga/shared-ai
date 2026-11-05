'use strict';

const { spawnSync } = require('node:child_process');

// The limit of each external process the backlog tools start. It bounds one process, never a whole invocation.
const PROCESS_TIMEOUT_MS = 120000;

function limitLabel(milliseconds) {
  return milliseconds % 1000 === 0 ? `${milliseconds / 1000} s` : `${milliseconds} ms`;
}

/**
 * Runs one external process with a time limit. `step` names the logical operation for the failure message;
 * `timeout` is the limit in milliseconds and defaults to 120 s. A process that outlives the limit is killed
 * and reported as a `process-timeout` failure. A process that exited by itself while a descendant still holds its
 * output pipe is treated as finished, so the descendant never extends the wait past the limit. Every other
 * outcome is returned to the caller unchanged.
 */
function runProcess(command, args, options = {}) {
  const { step, timeout = PROCESS_TIMEOUT_MS, ...spawnOptions } = options;
  const result = spawnSync(command, args, { ...spawnOptions, timeout, killSignal: 'SIGKILL' });
  if (result.error?.code === 'ETIMEDOUT') {
    // A process that already exited with a status and only has a descendant holding the output pipe open has finished.
    if (result.status !== null) { const { error, ...finished } = result; return finished; }
    throw Object.assign(new Error(`${step || command} did not finish within ${limitLabel(timeout)} and was stopped. Nothing is reported as loaded or written by this step.`), { reason: 'process-timeout' });
  }
  return result;
}

/** The logical step of a process: its program and the first two subcommand words, never the interpreter path or the data arguments. */
function stepLabel(command, args = []) {
  return [command, ...args.filter(arg => typeof arg === 'string' && !arg.startsWith('-')).slice(0, 2)].join(' ');
}

module.exports = { PROCESS_TIMEOUT_MS, runProcess, stepLabel };

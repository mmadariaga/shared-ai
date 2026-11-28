'use strict';

/**
 * dispatch-common — what the two per-turn dispatch tools share (sai/policies/opencode-dispatch.md,
 * sai/policies/claude-dispatch.md).
 *
 * The routing key of an agent file and the turn lock of a session live here once, so `opencode-dispatch.js` and
 * `claude-dispatch.js` read the same frontmatter and serialize the same way. Each tool keeps its own lock directory:
 * the opencode route locks under the Claude Code SAI temp root, the Claude route under the opencode one.
 *
 * A lock file holds the PID of the tool process that runs the turn. A lock whose PID is gone is replaced, and only by
 * the contender that holds the replacement claim, which removes the file only while it still holds the stale PID it
 * read: no contender can remove a lock that another one linked in the meantime, so two contenders over one stale lock
 * never both acquire it. A temp root that cannot be resolved leaves the turn unguarded, since the guard never stops a
 * run on its own failure.
 */

const fs = require('node:fs');
const path = require('node:path');
const { resolveTempRoot } = require('./temp-root');

const BUSY_EXIT = 3;
const CLAIM_STALE_MS = 10000;
const CLAIM_ATTEMPTS = 100;
const CLAIM_WAIT_MS = 20;
const FRONTMATTER_KEY = /^([A-Za-z0-9_-]+):[ \t]*(.*?)[ \t]*$/;

/** The value of one top-level key in the frontmatter of an agent file, or `null` when it carries none. */
function frontmatterValue(text, key) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  for (const line of lines.slice(1, end)) {
    const match = FRONTMATTER_KEY.exec(line);
    if (match && match[1] === key) return match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return null;
}

/** The value of the `harness:` key in the frontmatter of an agent file, or `null` when it carries none. */
function harnessOf(text) {
  return frontmatterValue(text, 'harness');
}

const emptyTokens = () => ({ input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 });

/** Whether a process with this PID exists; a process this user cannot signal still exists. */
function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/** The PID a lock file holds, or `null` when it holds anything else. */
function lockHolder(file) {
  try {
    const pid = Number(fs.readFileSync(file, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/** Block this process for `milliseconds` without spinning. */
function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

/**
 * The directory of the turn locks of one route under one harness's SAI temp root, created when missing; `null` when
 * the root cannot be resolved (a missing harness root on Linux, an unsafe one), which leaves the turn unguarded.
 */
function turnLockDirectory(harness, name) {
  try {
    const directory = path.join(resolveTempRoot(harness), name);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    return directory;
  } catch {
    return null;
  }
}

/**
 * Take the replacement claim of a lock: an exclusive-create file that one contender at a time holds while it removes a
 * stale lock. A claim older than CLAIM_STALE_MS belongs to a process that died inside that instant and is removed.
 */
function takeClaim(claim) {
  try {
    fs.closeSync(fs.openSync(claim, 'wx', 0o600));
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  try {
    if (Date.now() - fs.statSync(claim).mtimeMs > CLAIM_STALE_MS) fs.unlinkSync(claim);
  } catch { /* the claim was released first */ }
  return false;
}

/**
 * Take the turn lock of `session` in `directory`. The PID is written to a private file that is hard-linked to the lock
 * name, so the lock never exists empty and two processes never both create it. `{ acquired: true, release }`, or
 * `{ acquired: false, pid }` with the PID of the live holder.
 */
function acquireTurnLock(directory, session, { pid = process.pid, alive = processAlive } = {}) {
  const file = path.join(directory, `${session}.lock`);
  const claim = `${file}.claim`;
  const draft = path.join(directory, `${session}.${pid}.${Date.now()}.tmp`);
  fs.writeFileSync(draft, String(pid), { mode: 0o600 });
  try {
    for (let attempt = 0; attempt < CLAIM_ATTEMPTS; attempt += 1) {
      try {
        fs.linkSync(draft, file);
        return { acquired: true, release: () => { if (lockHolder(file) === pid) try { fs.unlinkSync(file); } catch { /* already gone */ } } };
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
      const holder = lockHolder(file);
      if (holder !== null && alive(holder)) return { acquired: false, pid: holder };
      if (!takeClaim(claim)) {
        sleepSync(CLAIM_WAIT_MS);
        continue;
      }
      try {
        if (lockHolder(file) === holder) fs.unlinkSync(file);
      } catch { /* the lock is already gone */ } finally {
        try { fs.unlinkSync(claim); } catch { /* the claim is gone */ }
      }
    }
    return { acquired: false, pid: lockHolder(file) };
  } finally {
    try { fs.unlinkSync(draft); } catch { /* the draft is gone */ }
  }
}

/** The result of a turn refused because an earlier turn of its session still runs. */
function busyResult(session, pid) {
  return {
    status: 'busy', sessionID: session, text: '', tokens: emptyTokens(), cost: 0, exit_code: null,
    error: `the previous turn of session ${session} is still running${pid ? ` (process ${pid})` : ''}; nothing was sent`,
    ...(pid ? { busy_pid: pid } : {}),
  };
}

module.exports = {
  BUSY_EXIT,
  frontmatterValue,
  harnessOf,
  emptyTokens,
  processAlive,
  lockHolder,
  sleepSync,
  turnLockDirectory,
  acquireTurnLock,
  busyResult,
};

#!/usr/bin/env node

'use strict';

/**
 * dispose-shells — the opencode stop of a worker's running shells (sai/policies/worker-lifecycle.md).
 *
 * Removing the shell of an opencode subagent ends the background command it runs, which is how a disposed worker's
 * armed cache-warm wait ends. The `opencode` CLI discovers the server and authenticates by itself, so no secret passes
 * through here. The tool lists the shells of the project directory, keeps the running ones whose `metadata.sessionID`
 * is the worker's session, removes each, and lists again: a shell counts as removed only when the second listing no
 * longer shows it.
 *
 *   node dispose-shells.js --session <sessionID> [--session <sessionID> ...] --cwd <project-root>
 *
 * One `--session` prints one JSON object `{ status, removed, failed }`, with `status`:
 *   removed      every running shell of the session was removed (and `removed` lists them);
 *   none         the session had no running shell;
 *   failed       a shell is still listed after its removal, or its removal was refused;
 *   unavailable  the `opencode` CLI is absent, or the server did not answer a listing.
 * Exit 0 for `removed` and `none`, 1 for `failed` and `unavailable`, 2 for a usage error.
 *
 * Two or more `--session` flags print the envelope `{ status, results }`: one entry `{ session, status, removed, failed }`
 * per distinct session, in the order given, from one running listing and one verifying listing. The top `status` is the
 * worst entry (`unavailable` > `failed` > `removed` > `none`) and sets the exit code. Every argument is validated before
 * any shell is removed; a repeated `--cwd` is a usage error. A session named twice yields one entry.
 *
 * The raw method-and-path form carries the directory in the query. The `--param` form is silently ignored by the
 * server, which would then act on its default directory.
 */

const { spawnSync } = require('node:child_process');

const SESSION = /^[A-Za-z0-9_-]+$/;
const SHELL = /^sh_[A-Za-z0-9_-]+$/;
const USAGE = 'Usage: node dispose-shells.js --session <sessionID> [--session <sessionID> ...] --cwd <project-root>';
const WORST_FIRST = ['unavailable', 'failed', 'removed', 'none'];
const CALL_TIMEOUT_MS = 20000;

/** A misuse of the command line (exit 2). */
class UsageError extends Error {}

const location = directory => `location[directory]=${encodeURIComponent(directory)}`;

/** One `opencode api` call: `{ ok, body }`, where `body` is the parsed JSON of a response that has one. */
function defaultRun(method, apiPath) {
  const result = spawnSync('opencode', ['api', method, apiPath], { encoding: 'utf8', timeout: CALL_TIMEOUT_MS });
  if (result.error || result.status !== 0) return { ok: false };
  const text = result.stdout.trim();
  if (!text) return { ok: true };
  try { return { ok: true, body: JSON.parse(text) }; } catch { return { ok: false }; }
}

/** The listed shells (the running ones only when `runningOnly`) keyed by `metadata.sessionID`, or `null` when the listing failed. */
function listShells(run, directory, runningOnly) {
  const listing = run('GET', `/api/shell?${location(directory)}`);
  if (!listing.ok || !Array.isArray(listing.body?.data)) return null;
  const bySession = new Map();
  for (const shell of listing.body.data) {
    if ((runningOnly && shell?.status !== 'running') || !SHELL.test(shell?.id ?? '') || typeof shell?.metadata?.sessionID !== 'string') continue;
    const ids = bySession.get(shell.metadata.sessionID) ?? [];
    ids.push(shell.id);
    bySession.set(shell.metadata.sessionID, ids);
  }
  return bySession;
}

/** The sessions of one call: validated all at once, in the order given, each once. */
function checkInput({ sessions, cwd }) {
  if (!Array.isArray(sessions) || !sessions.length || !sessions.every(session => SESSION.test(session ?? ''))) {
    throw new UsageError('--session must be the sessionID of the worker');
  }
  if (typeof cwd !== 'string' || !cwd) throw new UsageError('--cwd must be the project root');
  return [...new Set(sessions)];
}

/** One entry per session, from one running listing and one verifying listing whatever the number of sessions. */
function disposeSessions(sessions, cwd, run) {
  const running = listShells(run, cwd, true);
  if (running === null) return sessions.map(session => ({ session, status: 'unavailable', removed: [], failed: [] }));
  const found = new Map(sessions.map(session => [session, running.get(session) ?? []]));
  const targets = [...found.values()].flat();
  if (!targets.length) return sessions.map(session => ({ session, status: 'none', removed: [], failed: [] }));
  for (const id of targets) run('DELETE', `/api/shell/${id}?${location(cwd)}`);
  const left = listShells(run, cwd, false);
  return sessions.map(session => {
    const ids = found.get(session);
    if (!ids.length) return { session, status: 'none', removed: [], failed: [] };
    if (left === null) return { session, status: 'unavailable', removed: [], failed: ids };
    const remaining = new Set(left.get(session) ?? []);
    const failed = ids.filter(id => remaining.has(id));
    return { session, status: failed.length ? 'failed' : 'removed', removed: ids.filter(id => !remaining.has(id)), failed };
  });
}

/** The worst status of the entries, so a caller can gate on one value. */
const worst = entries => WORST_FIRST.find(status => entries.some(entry => entry.status === status));

/**
 * One `session` yields today's `{ status, removed, failed }`. `sessions` (the number of `--session` flags given is two
 * or more) yields `{ status, results }`, one entry per distinct session in the order given.
 */
function disposeShells({ session, sessions, cwd }, run = defaultRun) {
  const single = sessions === undefined;
  const distinct = checkInput({ sessions: single ? [session] : sessions, cwd });
  const entries = disposeSessions(distinct, cwd, run);
  if (single) return { status: entries[0].status, removed: entries[0].removed, failed: entries[0].failed };
  return { status: worst(entries), results: entries };
}

function parseArguments(args) {
  const sessions = [];
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--session', '--cwd'].includes(args[i]) || i + 1 >= args.length) throw new UsageError(USAGE);
    if (args[i] === '--session') sessions.push(args[i + 1]);
    else if (values.cwd !== undefined) throw new UsageError('--cwd accepts one value');
    else values.cwd = args[i + 1];
  }
  return sessions.length > 1 ? { sessions, cwd: values.cwd } : { session: sessions[0], cwd: values.cwd };
}

function main(argv) {
  try {
    const result = disposeShells(parseArguments(argv));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.status === 'removed' || result.status === 'none' ? 0 : 1;
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stdout.write(`${JSON.stringify({ status: 'error', message: error.message })}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { UsageError, disposeShells, parseArguments, main };

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
 *   node dispose-shells.js --session <sessionID> --cwd <project-root>
 *
 * Prints one JSON object `{ status, removed, failed }`, with `status`:
 *   removed      every running shell of the session was removed (and `removed` lists them);
 *   none         the session had no running shell;
 *   failed       a shell is still listed after its removal, or its removal was refused;
 *   unavailable  the `opencode` CLI is absent, or the server did not answer a listing.
 * Exit 0 for `removed` and `none`, 1 for `failed` and `unavailable`, 2 for a usage error.
 *
 * The raw method-and-path form carries the directory in the query. The `--param` form is silently ignored by the
 * server, which would then act on its default directory.
 */

const { spawnSync } = require('node:child_process');

const SESSION = /^[A-Za-z0-9_-]+$/;
const SHELL = /^sh_[A-Za-z0-9_-]+$/;
const USAGE = 'Usage: node dispose-shells.js --session <sessionID> --cwd <project-root>';
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

/** The ids of the shells of `session` that the server lists (the running ones only when `runningOnly`), or `null` when the listing failed. */
function listShells(run, directory, session, runningOnly) {
  const listing = run('GET', `/api/shell?${location(directory)}`);
  if (!listing.ok || !Array.isArray(listing.body?.data)) return null;
  return listing.body.data
    .filter(shell => (!runningOnly || shell?.status === 'running') && shell?.metadata?.sessionID === session && SHELL.test(shell.id ?? ''))
    .map(shell => shell.id);
}

function disposeShells({ session, cwd }, run = defaultRun) {
  if (!SESSION.test(session ?? '')) throw new UsageError('--session must be the sessionID of the worker');
  if (typeof cwd !== 'string' || !cwd) throw new UsageError('--cwd must be the project root');
  const found = listShells(run, cwd, session, true);
  if (found === null) return { status: 'unavailable', removed: [], failed: [] };
  if (!found.length) return { status: 'none', removed: [], failed: [] };
  for (const id of found) run('DELETE', `/api/shell/${id}?${location(cwd)}`);
  const left = listShells(run, cwd, session, false);
  if (left === null) return { status: 'unavailable', removed: [], failed: found };
  const failed = found.filter(id => left.includes(id));
  return { status: failed.length ? 'failed' : 'removed', removed: found.filter(id => !failed.includes(id)), failed };
}

function parseArguments(args) {
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--session', '--cwd'].includes(args[i]) || i + 1 >= args.length) throw new UsageError(USAGE);
    values[args[i].slice(2)] = args[i + 1];
  }
  return values;
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

module.exports = { UsageError, disposeShells, main };

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
 * One `--session` prints one JSON object `{ status, removed, failed, closed, close_failed }`, with `status`:
 *   removed      every running shell of the session was removed (and `removed` lists them);
 *   none         the session had no running shell;
 *   failed       a shell is still listed after its removal, or its removal was refused;
 *   unavailable  the `opencode` CLI is absent, or the server did not answer a listing.
 * Exit 0 for `removed` and `none`, 1 for `failed` and `unavailable`, 2 for a usage error.
 *
 * Two or more `--session` flags print the envelope `{ status, results }`: one entry `{ session, status, removed, failed, closed, close_failed }`
 * per distinct session, in the order given, from one running listing and one verifying listing. The top `status` is the
 * worst entry (`unavailable` > `failed` > `removed` > `none`) and sets the exit code. Every argument is validated before
 * any shell is removed; a repeated `--cwd` is a usage error. A session named twice yields one entry.
 *
 * A removed shell that runs `wait.js warm --chain <id>` or `wait.js warm --state <token>` (the launch line of the
 * listing's `command` field) also closes that cache-warm chain once, after the removal and whatever its outcome, so a
 * worker that is woken after its dispose cannot arm another wait (`wait.js close`). Each result carries `closed` (the
 * chain ids closed, `already-closed` included) and `close_failed` (the ones whose close did not succeed); neither
 * changes `status` or the exit code.
 *
 * The raw method-and-path form carries the directory in the query. The `--param` form is silently ignored by the
 * server, which would then act on its default directory.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const CHAIN_ID = /^[0-9a-f]{16}$/;
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

/**
 * The listed shells (the running ones only when `runningOnly`) as `{ id, command }` keyed by `metadata.sessionID`, or
 * `null` when the listing failed. `command` is the launch line as typed, or `undefined` for an entry without one.
 */
function listShells(run, directory, runningOnly) {
  const listing = run('GET', `/api/shell?${location(directory)}`);
  if (!listing.ok || !Array.isArray(listing.body?.data)) return null;
  const bySession = new Map();
  for (const shell of listing.body.data) {
    if ((runningOnly && shell?.status !== 'running') || !SHELL.test(shell?.id ?? '') || typeof shell?.metadata?.sessionID !== 'string') continue;
    const entries = bySession.get(shell.metadata.sessionID) ?? [];
    entries.push({ id: shell.id, command: typeof shell.command === 'string' ? shell.command : undefined });
    bySession.set(shell.metadata.sessionID, entries);
  }
  return bySession;
}

/** The arguments of a launch line: whitespace separates them, single or double quotes group one, and `\` is literal. */
function splitCommand(command) {
  const args = [];
  let current = '';
  let started = false;
  let quote = null;
  for (const char of command) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) args.push(current);
      current = '';
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (started) args.push(current);
  return args;
}

/**
 * The chain id a `wait.js warm` launch line names, from `--chain <id>` or the `--state <token>` that `decode` turns into
 * a state; `null` for any other command, a missing value, or a token that does not decode (those close no chain).
 */
function warmChain(command, decode) {
  if (typeof command !== 'string') return null;
  const args = splitCommand(command);
  const script = args.findIndex(arg => path.win32.basename(arg) === 'wait.js');
  if (script < 0 || args[script + 1] !== 'warm') return null;
  const rest = args.slice(script + 2);
  const chain = rest[rest.indexOf('--chain') + 1];
  if (rest.includes('--chain') && CHAIN_ID.test(chain ?? '')) return chain;
  const token = rest[rest.indexOf('--state') + 1];
  if (!rest.includes('--state') || token === undefined) return null;
  const state = decode(token);
  return CHAIN_ID.test(state?.chain ?? '') ? state.chain : null;
}

/** The sessions' chains to close: the distinct chain ids of each session's running `warm` shells. */
function chainsOf(entries, decode) {
  return [...new Set(entries.map(entry => warmChain(entry.command, decode)).filter(Boolean))];
}

/**
 * Close each chain once through the installed `wait.js` module (the root `resolveGlobalRoot('opencode')` names). A
 * chain closes when the answer is `closed` or `already-closed`; any other answer, an older `wait.js` without `close`,
 * or a thrown error leaves it in the failed list.
 */
function defaultWarmer() {
  let loaded;
  const load = () => {
    if (loaded) return loaded;
    const fetchDirectories = ['skills/fetch', 'skills/universal/fetch'].map(directory => path.resolve(__dirname, '..', '..', directory, 'harness-root.js'));
    const harnessRoot = require(fetchDirectories.find(file => fs.existsSync(file)) ?? fetchDirectories[0]);
    const root = harnessRoot.resolveGlobalRoot('opencode');
    loaded = require(path.join(root, 'skills', 'sai-cache-warmer', 'wait.js'));
    return loaded;
  };
  return {
    decode: token => { try { return load().decodeStateToken?.(token) ?? null; } catch { return null; } },
    close: chain => load().closeChain(chain).status,
  };
}
const CLOSED = ['closed', 'already-closed'];

/** The sessions of one call: validated all at once, in the order given, each once. */
function checkInput({ sessions, cwd }) {
  if (!Array.isArray(sessions) || !sessions.length || !sessions.every(session => SESSION.test(session ?? ''))) {
    throw new UsageError('--session must be the sessionID of the worker');
  }
  if (typeof cwd !== 'string' || !cwd) throw new UsageError('--cwd must be the project root');
  return [...new Set(sessions)];
}

/** The chains of the entries, closed once each: `{ closed, close_failed }` of one session, from the shared `outcomes`. */
function closeChains(chains, outcomes, warmer) {
  for (const chain of chains) {
    if (outcomes.has(chain)) continue;
    let answer;
    try { answer = warmer.close(chain); } catch { answer = 'failed'; }
    outcomes.set(chain, CLOSED.includes(answer));
  }
  return { closed: chains.filter(chain => outcomes.get(chain)), close_failed: chains.filter(chain => !outcomes.get(chain)) };
}

/**
 * One entry per session, from one running listing and one verifying listing whatever the number of sessions. The
 * chains of the removed `warm` shells close after the removal, whatever its outcome.
 */
function disposeSessions(sessions, cwd, run, warmer) {
  const empty = session => ({ session, status: 'none', removed: [], failed: [], closed: [], close_failed: [] });
  const running = listShells(run, cwd, true);
  if (running === null) return sessions.map(session => ({ ...empty(session), status: 'unavailable' }));
  const found = new Map(sessions.map(session => [session, running.get(session) ?? []]));
  const targets = [...found.values()].flat().map(shell => shell.id);
  if (!targets.length) return sessions.map(empty);
  for (const id of targets) run('DELETE', `/api/shell/${id}?${location(cwd)}`);
  const left = listShells(run, cwd, false);
  const outcomes = new Map();
  return sessions.map(session => {
    const shells = found.get(session);
    if (!shells.length) return empty(session);
    const ids = shells.map(shell => shell.id);
    const closing = closeChains(chainsOf(shells, warmer.decode), outcomes, warmer);
    if (left === null) return { session, status: 'unavailable', removed: [], failed: ids, ...closing };
    const remaining = new Set((left.get(session) ?? []).map(shell => shell.id));
    const failed = ids.filter(id => remaining.has(id));
    return { session, status: failed.length ? 'failed' : 'removed', removed: ids.filter(id => !remaining.has(id)), failed, ...closing };
  });
}

/** The worst status of the entries, so a caller can gate on one value. */
const worst = entries => WORST_FIRST.find(status => entries.some(entry => entry.status === status));

/**
 * One `session` yields today's `{ status, removed, failed }`. `sessions` (the number of `--session` flags given is two
 * or more) yields `{ status, results }`, one entry per distinct session in the order given.
 */
function disposeShells({ session, sessions, cwd }, run = defaultRun, warmer = defaultWarmer()) {
  const single = sessions === undefined;
  const distinct = checkInput({ sessions: single ? [session] : sessions, cwd });
  const entries = disposeSessions(distinct, cwd, run, warmer);
  const [first] = entries;
  if (single) return { status: first.status, removed: first.removed, failed: first.failed, closed: first.closed, close_failed: first.close_failed };
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

module.exports = { UsageError, disposeShells, parseArguments, splitCommand, warmChain, main };

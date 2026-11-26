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
 * Descendant sessions (opencode only). A worker's own helpers (the explorers a spec worker dispatches) are child sessions
 * of the worker, and disposing the worker does not stop them. When the listing holds a running shell of a session other
 * than the named ones, the tool reads the session tree (`parent_id` of `session_v2` in `opencode.db`, read-only,
 * through `opencode-db.js`) and removes the running shells of every descendant of each named session from the same
 * listing, closing the cache-warm chain of each `wait.js warm` shell it removes. The calling session
 * (`OPENCODE_SESSION_ID`) and its ancestors are never touched, so the main session's chain stays open. Each entry then
 * carries `cascade`: `{ status, removed, failed, closed, close_failed }`, with `status` `ok`, or `unavailable` and a
 * `reason` when the session tree cannot be read (no database, no `node:sqlite`, an unsupported schema). The cascade
 * never changes the `status` of a named session or the exit code. With no running shell outside the named sessions
 * there is nothing to cascade, the database is not read, and `cascade` is absent.
 *
 * The raw method-and-path form carries the directory in the query. The `--param` form is silently ignored by the
 * server, which would then act on its default directory.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { resolveOpencode } = require('./opencode-launcher');
const { defaultLoadSqlite, openOpencodeDatabase, opencodeChildren } = require('./opencode-db');
const usageKit = require('./usage');

const CHAIN_ID = /^[0-9a-f]{16}$/;
const SESSION = /^[A-Za-z0-9_-]+$/;
const SHELL = /^sh_[A-Za-z0-9_-]+$/;
const USAGE = {
  general: {
    usage: ['node sai/tools/dispose-shells.js --session <sessionID> [--session <sessionID> ...] --cwd <project-root>'],
    notes: ['Removes the running shells of each worker session (the opencode stop call). Several --session flags share one listing.'],
    examples: [
      'node sai/tools/dispose-shells.js --session ses_0123456789abcdef --cwd /path/to/project',
      'node sai/tools/dispose-shells.js --session ses_0123456789abcdef --session ses_fedcba9876543210 --cwd /path/to/project',
    ],
    flags: { '--session': true, '--cwd': { once: true } },
    required: ['--session', '--cwd'],
  },
};
const WORST_FIRST = ['unavailable', 'failed', 'removed', 'none'];
const CALL_TIMEOUT_MS = 20000;
const MAX_ANCESTORS = 16;

/** A misuse of the command line (exit 2). */
class UsageError extends Error {}

const location = directory => `location[directory]=${encodeURIComponent(directory)}`;

/** One `opencode api` call: `{ ok, body }`, where `body` is the parsed JSON of a response that has one. */
function defaultRun(method, apiPath) {
  const { command } = resolveOpencode();
  if (command === null) return { ok: false };
  const result = spawnSync(command, ['api', method, apiPath], { encoding: 'utf8', timeout: CALL_TIMEOUT_MS });
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

/** The session that runs the tool and its ancestors (`parent_id` upward), which a cascade never touches. */
function protectedSessions(db, caller) {
  const protectedIds = new Set();
  const select = db.prepare('SELECT parent_id FROM session_v2 WHERE id = ?');
  for (let id = caller, depth = 0; id && !protectedIds.has(id) && depth <= MAX_ANCESTORS; depth += 1) {
    protectedIds.add(id);
    id = select.get(id)?.parent_id;
  }
  return protectedIds;
}

/**
 * The default session-tree reader: `sessions` to a Map of each session to the ids of its descendants, the calling
 * session and its ancestors left out. It throws when the opencode database cannot be read.
 */
function defaultTree(env = process.env, loadSqlite = defaultLoadSqlite) {
  return sessions => {
    const db = openOpencodeDatabase(env, loadSqlite);
    try {
      const guarded = protectedSessions(db, env.OPENCODE_SESSION_ID);
      return new Map(sessions.map(session => [session, opencodeChildren(db, session).map(child => child.id).filter(id => !guarded.has(id))]));
    } finally {
      db.close();
    }
  };
}

const cascadeEntry = (status, extra = {}) => ({ status, removed: [], failed: [], closed: [], close_failed: [], ...extra });

/**
 * The descendant shells of each named session: `null` when the listing holds no running shell outside the named
 * sessions (nothing to cascade, no database read), otherwise a Map of each session to `{ status, reason?, shells }`.
 */
function planCascade(sessions, running, tree) {
  const named = new Set(sessions);
  if (![...running.keys()].some(session => !named.has(session))) return null;
  let descendants;
  try { descendants = tree(sessions); } catch (error) {
    return new Map(sessions.map(session => [session, { status: 'unavailable', reason: error?.message ?? 'The session tree could not be read', shells: [] }]));
  }
  return new Map(sessions.map(session => {
    const ids = (descendants.get(session) ?? []).filter(id => !named.has(id));
    return [session, { status: 'ok', shells: ids.flatMap(id => running.get(id) ?? []) }];
  }));
}

/**
 * One entry per session, from one running listing and one verifying listing whatever the number of sessions. The
 * chains of the removed `warm` shells close after the removal, whatever its outcome.
 */
function disposeSessions(sessions, cwd, run, warmer, tree) {
  const empty = session => ({ session, status: 'none', removed: [], failed: [], closed: [], close_failed: [] });
  const running = listShells(run, cwd, true);
  if (running === null) return sessions.map(session => ({ ...empty(session), status: 'unavailable' }));
  const found = new Map(sessions.map(session => [session, running.get(session) ?? []]));
  const cascade = planCascade(sessions, running, tree);
  const below = session => cascade?.get(session)?.shells ?? [];
  const targets = [...new Set([...found.values(), ...sessions.map(below)].flat().map(shell => shell.id))];
  const withCascade = (entry, outcome) => (cascade ? { ...entry, cascade: outcome } : entry);
  if (!targets.length) return sessions.map(session => withCascade(empty(session), cascade && cascadeEntry(cascade.get(session).status, cascade.get(session).reason ? { reason: cascade.get(session).reason } : {})));
  for (const id of targets) run('DELETE', `/api/shell/${id}?${location(cwd)}`);
  const left = listShells(run, cwd, false);
  const stillListed = new Set(left === null ? [] : [...left.values()].flat().map(shell => shell.id));
  const outcomes = new Map();
  return sessions.map(session => {
    const shells = found.get(session);
    const descendants = below(session);
    const closingDescendants = closeChains(chainsOf(descendants, warmer.decode), outcomes, warmer);
    const descendantIds = descendants.map(shell => shell.id);
    const plan = cascade?.get(session);
    const outcome = plan && cascadeEntry(plan.status, {
      ...(plan.reason ? { reason: plan.reason } : {}),
      removed: left === null ? [] : descendantIds.filter(id => !stillListed.has(id)),
      failed: left === null ? descendantIds : descendantIds.filter(id => stillListed.has(id)),
      ...closingDescendants,
    });
    if (!shells.length) return withCascade(empty(session), outcome);
    const ids = shells.map(shell => shell.id);
    const closing = closeChains(chainsOf(shells, warmer.decode), outcomes, warmer);
    if (left === null) return withCascade({ session, status: 'unavailable', removed: [], failed: ids, ...closing }, outcome);
    const remaining = new Set((left.get(session) ?? []).map(shell => shell.id));
    const failed = ids.filter(id => remaining.has(id));
    return withCascade({ session, status: failed.length ? 'failed' : 'removed', removed: ids.filter(id => !remaining.has(id)), failed, ...closing }, outcome);
  });
}

/** The worst status of the entries, so a caller can gate on one value. */
const worst = entries => WORST_FIRST.find(status => entries.some(entry => entry.status === status));

/**
 * One `session` yields today's `{ status, removed, failed }`. `sessions` (the number of `--session` flags given is two
 * or more) yields `{ status, results }`, one entry per distinct session in the order given.
 */
function disposeShells({ session, sessions, cwd }, run = defaultRun, warmer = defaultWarmer(), tree = defaultTree()) {
  const single = sessions === undefined;
  const distinct = checkInput({ sessions: single ? [session] : sessions, cwd });
  const entries = disposeSessions(distinct, cwd, run, warmer, tree);
  const [first] = entries;
  if (single) {
    const { status, removed, failed, closed, close_failed: closeFailed, cascade } = first;
    return { status, removed, failed, closed, close_failed: closeFailed, ...(cascade ? { cascade } : {}) };
  }
  return { status: worst(entries), results: entries };
}

function parseArguments(args) {
  const sessions = [];
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--session', '--cwd'].includes(args[i]) || i + 1 >= args.length) throw new UsageError(`Unexpected argument ${args[i]}`);
    if (args[i] === '--session') sessions.push(args[i + 1]);
    else if (values.cwd !== undefined) throw new UsageError('--cwd accepts one value');
    else values.cwd = args[i + 1];
  }
  return sessions.length > 1 ? { sessions, cwd: values.cwd } : { session: sessions[0], cwd: values.cwd };
}

function main(argv) {
  const guarded = usageKit.handle(USAGE, argv, {
    json: info => (info.help ? { usage: info.usage, examples: info.examples } : { status: 'error', message: info.cause, usage: info.usage, examples: info.examples }),
  });
  if (guarded !== null) return guarded;
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

module.exports = { USAGE, UsageError, defaultTree, protectedSessions, disposeShells, parseArguments, splitCommand, warmChain, main };

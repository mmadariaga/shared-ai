#!/usr/bin/env node

'use strict';

/**
 * opencode-dispatch — the dispatch of a Claude Code agent through the OpenCode CLI (sai/policies/opencode-dispatch.md).
 *
 * A Claude Code agent file that carries `harness: opencode` runs through `opencode run --format json`, one process per
 * turn, so the model comes from the OpenCode agent of the same name. The tool decides the route, runs one turn, and
 * prints one JSON object. It never passes `--auto`: an `ask` permission is rejected without hanging the turn. It never
 * opens a shell: the worker message travels as one `spawn` argument, after `--`, so free text is never re-quoted and a
 * message that starts with `--` is never read as an option. The command it spawns is the one `opencode-launcher.js`
 * resolves, which on Windows is the `.exe` behind npm's `.cmd` shim.
 *
 *   node opencode-dispatch.js route --agent <name> [--cwd <project-root>]
 *   node opencode-dispatch.js start --agent <name> --input-file <path> [--cwd <project-root>]
 *   node opencode-dispatch.js continue --session <sessionID> --input-file <path> [--agent <name>] [--cwd <project-root>]
 *
 * `route` prints `{ route, cause, agent, notice? }` with `route` `claude` or `opencode`. The agent file is the one
 * Claude Code resolves: `<project-root>/.claude/agents/<name>.md` first, then the user-global `agents/` of the Claude
 * Code root. Only the value `opencode` of its `harness:` key selects `opencode`, and only when the `opencode` binary
 * runs and lists an agent of the same name; every other case routes to `claude`, and a missing binary or agent adds a
 * `notice` that names the agent and the cause. Exit 0.
 *
 * `start` and `continue` run one turn and print `{ status, sessionID, text, tokens, cost, exit_code, error }`, with
 * `status` `ok`, `failed`, or `busy`. `sessionID` is the one of the first output event (the handle for later turns), `text` the
 * text of the turn's last message, and `tokens` the sum of its steps. A turn is `failed` on a non-zero exit, an `error`
 * event, or (for `start`) no `sessionID`. Exit 0 for `ok`, 1 for `failed`, 2 for a usage error, 3 for `busy`.
 * The message reaches opencode exactly as the file holds it: the tool adds nothing to it.
 *
 * A `continue` holds a turn lock while its turn runs: the file `<SAI temp root>/opencode-turns/<sessionID>.lock` of the
 * Claude Code SAI temp root, which holds the PID of the tool process and is removed when the turn ends (a signal that
 * stops the tool included). A `continue` whose lock belongs to a live process is refused: it prints `{ status: 'busy', ... }`
 * with the PID of the running turn, sends nothing to opencode, and exits 3. A lock whose process no longer exists is
 * ignored and replaced. A temp root that cannot be resolved leaves the turn unguarded, since the guard never stops a run on
 * its own failure. The lock covers the turns this tool runs; `start` has no session yet and takes none.
 *
 * Stopping the tool (SIGTERM, SIGINT, SIGHUP) stops its `opencode run` process too. On Windows those handlers never
 * run, because Windows ends a process without delivering a signal; there the dispose relies on Claude Code's
 * `TaskStop` of the `Bash` task, which was verified on Windows to end the whole process tree: a background `Bash` task
 * running a Node parent that spawned a child with the options below ended both when stopped. The handlers stay for
 * Linux and macOS.
 */

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { extractInputFile, readInputFile, InputFileError } = require('./input-reader');
const { resolveOpencode, SHIM_UNRESOLVED } = require('./opencode-launcher');
const { resolveTempRoot } = require('./temp-root');
const usageKit = require('./usage');

const AGENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SESSION = /^[A-Za-z0-9_-]+$/;
const HARNESS_KEY = /^harness:\s*(.*?)\s*$/;
const OD = 'node sai/tools/opencode-dispatch.js';

const USAGE = {
  subcommands: {
    route: {
      usage: [`${OD} route --agent <name> [--cwd <project-root>]`],
      notes: ['Reads `harness:` from the agent file Claude Code resolves and checks the opencode binary and an opencode agent of the same name; prints `claude` or `opencode` with the cause.'],
      examples: [`${OD} route --agent budget-explorer --cwd /path/to/project`],
      flags: { '--agent': { once: true }, '--cwd': { once: true } },
      required: ['--agent'],
    },
    start: {
      usage: [`${OD} start --agent <name> --input-file <path> [--cwd <project-root>]`],
      notes: ['Runs one `opencode run --format json` turn that creates the session of the agent; the message is the input file.'],
      examples: [`${OD} start --agent budget-explorer --input-file message.txt --cwd /path/to/project`],
      flags: { '--agent': { once: true }, '--input-file': { once: true }, '--cwd': { once: true } },
      required: ['--agent', '--input-file'],
    },
    continue: {
      usage: [`${OD} continue --session <sessionID> --input-file <path> [--agent <name>] [--cwd <project-root>]`],
      notes: [
        'Runs one turn that sends the message of the input file to an existing session.',
        'Refused with status `busy` and exit 3, sending nothing, while an earlier turn of the same session still runs.',
      ],
      examples: [`${OD} continue --session ses_0123456789abcdef --input-file message.txt --cwd /path/to/project`],
      flags: { '--session': { once: true }, '--input-file': { once: true }, '--agent': { once: true }, '--cwd': { once: true } },
      required: ['--session', '--input-file'],
    },
  },
};
const PROBE_TIMEOUT_MS = 20000;
const TURN_LOCK_DIR = 'opencode-turns';
const BUSY_EXIT = 3;
const CLAIM_STALE_MS = 10000;
const CLAIM_ATTEMPTS = 100;
const CLAIM_WAIT_MS = 20;

/** A misuse of the command line (exit 2). */
class UsageError extends Error {}

/** The Claude Code global root, through the shared resolver the install places beside `fetch.js`. */
function claudeRoot() {
  const candidates = ['skills/fetch', 'skills/universal/fetch'].map(directory => path.resolve(__dirname, '..', '..', directory, 'harness-root.js'));
  const resolver = require(candidates.find(file => fs.existsSync(file)) ?? candidates[0]);
  return resolver.resolveGlobalRoot('claude');
}

/** The value of the `harness:` key in the frontmatter of an agent file, or `null` when it carries none. */
function harnessOf(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  for (const line of lines.slice(1, end)) {
    const match = HARNESS_KEY.exec(line);
    if (match) return match[1].replace(/^(['"])(.*)\1$/, '$2');
  }
  return null;
}

/** The agent file Claude Code resolves for `agent`: the project first, then the user-global root. `null` when absent. */
function readAgentFile(agent, cwd, root) {
  for (const directory of [path.join(cwd, '.claude', 'agents'), path.join(root(), 'agents')]) {
    try { return fs.readFileSync(path.join(directory, `${agent}.md`), 'utf8'); } catch { /* try the next root */ }
  }
  return null;
}

/**
 * `opencode --version` and `opencode debug agents`, run without a shell through the opencode launcher:
 * `{ available, agents }`, `agents` null on failure. An unavailable opencode may add the launcher's `cause` and `shim`.
 */
function defaultProbe(cwd) {
  const launched = resolveOpencode();
  if (launched.command === null) return { available: false, agents: null, cause: launched.cause, shim: launched.shim };
  const options = { cwd, encoding: 'utf8', timeout: PROBE_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] };
  const version = spawnSync(launched.command, ['--version'], options);
  if (version.error || version.status !== 0) return { available: false, agents: null };
  const listing = spawnSync(launched.command, ['debug', 'agents'], options);
  if (listing.error || listing.status !== 0) return { available: true, agents: null };
  try {
    const parsed = JSON.parse(listing.stdout);
    return { available: true, agents: Array.isArray(parsed) ? parsed.map(entry => entry?.name).filter(name => typeof name === 'string') : null };
  } catch {
    return { available: true, agents: null };
  }
}

const FALLBACK_CAUSES = {
  'opencode-missing': 'the opencode command is not available',
  [SHIM_UNRESOLVED]: 'the opencode shim does not name an executable that exists',
  'opencode-agent-missing': 'opencode has no agent of that name',
  'opencode-agents-unavailable': 'opencode did not list its agents',
};

function fallback(agent, cause, shim) {
  const detail = shim ? ` (${shim})` : '';
  return {
    route: 'claude', cause, agent,
    notice: `Agent ${agent} is set to run through opencode, but ${FALLBACK_CAUSES[cause]}${detail}. It runs through Claude Code with the model of its Claude Code agent file.`,
  };
}

/** The fallback cause of `agent` against one probe result, or `null` when opencode can run it. */
function missingCause(agent, { available, agents, cause }) {
  if (!available) return cause ?? 'opencode-missing';
  if (agents === null) return 'opencode-agents-unavailable';
  if (!agents.includes(agent)) return 'opencode-agent-missing';
  return null;
}

/**
 * The opencode check of `route`, for several agents with one probe: `{ [agent]: cause | null }`, where a cause is one of
 * the fallback causes of `route` (`FALLBACK_CAUSES`) and `null` means opencode runs the agent. Setup calls it once per
 * apply and warns from the causes; it never reads an agent file or decides a route.
 */
function checkAgents(agents, { cwd = process.cwd() } = {}, { probe = defaultProbe } = {}) {
  const result = probe(cwd);
  return Object.fromEntries(agents.map(agent => [agent, missingCause(agent, result)]));
}

/** The route of `agent`: `{ route, cause, agent, notice? }`. */
function route({ agent, cwd }, { root = claudeRoot, probe = defaultProbe } = {}) {
  const text = readAgentFile(agent, cwd, root);
  if (text === null) return { route: 'claude', cause: 'agent-file-missing', agent };
  const harness = harnessOf(text);
  if (harness === null) return { route: 'claude', cause: 'no-harness-key', agent };
  if (harness !== 'opencode') return { route: 'claude', cause: 'harness-not-opencode', agent };
  const result = probe(cwd);
  const cause = missingCause(agent, result);
  if (cause !== null) return fallback(agent, cause, result.shim);
  return { route: 'opencode', cause: 'harness-opencode', agent };
}

/** The `opencode run` arguments of one turn; the message is the single argument after `--`. */
function runArguments({ agent, session }, message) {
  const args = ['run', '--format', 'json'];
  if (session) args.push('--session', session);
  if (agent) args.push('--agent', agent);
  return [...args, '--', message];
}

const emptyTokens = () => ({ input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 });

/** The turn's facts from the JSON lines of `opencode run --format json`; lines that are not JSON objects are skipped. */
function readEvents(stdout) {
  const result = { sessionID: null, text: '', tokens: emptyTokens(), cost: 0, error: null };
  const texts = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event === null || typeof event !== 'object') continue;
    if (result.sessionID === null && typeof event.sessionID === 'string' && event.sessionID) result.sessionID = event.sessionID;
    if (event.type === 'error' && result.error === null) {
      result.error = String(event.error?.message ?? event.error?.type ?? 'error event');
    } else if (event.type === 'text' && typeof event.part?.text === 'string') {
      const message = event.part.messageID ?? '';
      texts.set(message, [...(texts.get(message) ?? []), event.part.text]);
    } else if (event.type === 'step_finish') {
      const tokens = event.part?.tokens ?? {};
      result.tokens.input += tokens.input ?? 0;
      result.tokens.output += tokens.output ?? 0;
      result.tokens.reasoning += tokens.reasoning ?? 0;
      result.tokens.cache_read += tokens.cache?.read ?? 0;
      result.tokens.cache_write += tokens.cache?.write ?? 0;
      result.cost += event.part?.cost ?? 0;
    }
  }
  const last = [...texts.values()].at(-1);
  result.text = last ? last.join('') : '';
  return result;
}

/** One `opencode run` process, never through a shell and never with a stdin to wait on: `{ status, stdout, error }`. */
function defaultRun(args, cwd) {
  return new Promise(resolve => {
    const launched = resolveOpencode();
    if (launched.command === null) {
      const detail = launched.shim ? ` (${launched.shim})` : '';
      resolve({ status: null, stdout: '', error: `${FALLBACK_CAUSES[launched.cause]}${detail}` });
      return;
    }
    const child = spawn(launched.command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let failure = null;
    let settled = false;
    const finish = code => {
      if (settled) return;
      settled = true;
      resolve({ status: code, stdout: Buffer.concat(chunks).toString('utf8'), error: failure });
    };
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.once(signal, () => { child.kill('SIGTERM'); process.exit(1); });
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.resume();
    child.on('error', error => { failure = error.message; finish(null); });
    child.on('close', finish);
  });
}

/**
 * Run one turn: `start` creates the session of `agent`, `continue` sends `message` to `session` (and to `agent` when it is
 * given). `{ status, sessionID, text, tokens, cost, exit_code, error }`.
 */
async function turn({ agent, session, message, cwd }, run = defaultRun) {
  const outcome = await run(runArguments({ agent, session }, message), cwd);
  const events = readEvents(outcome.stdout ?? '');
  const sessionID = events.sessionID ?? session ?? null;
  let error = events.error;
  if (error === null && outcome.error) error = outcome.error;
  if (error === null && outcome.status !== 0) error = `opencode run exited with status ${outcome.status}`;
  if (error === null && sessionID === null) error = 'opencode run printed no sessionID';
  return {
    status: error === null ? 'ok' : 'failed',
    sessionID, text: events.text, tokens: events.tokens, cost: events.cost,
    exit_code: outcome.status, error,
  };
}

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

/**
 * The directory of the turn locks under the Claude Code SAI temp root, created when missing; `null` when the root cannot be
 * resolved (a missing harness root on Linux, an unsafe one), which leaves the turn unguarded.
 */
function turnLockDirectory() {
  try {
    const directory = path.join(resolveTempRoot('claude'), TURN_LOCK_DIR);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    return directory;
  } catch {
    return null;
  }
}

/** Block this process for `milliseconds` without spinning. */
function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
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
 * name, so the lock never exists empty and two processes never both create it. A lock whose PID is gone is replaced, and
 * only by the contender that holds the replacement claim, which removes the file only while it still holds the stale PID it
 * read: no contender can remove a lock that another one linked in the meantime, so two contenders over one stale lock never
 * both acquire it. `{ acquired: true, release }`, or `{ acquired: false, pid }` with the PID of the live holder.
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

/** The result of a `continue` that was refused because an earlier turn of its session still runs. */
function busyResult(session, pid) {
  return {
    status: 'busy', sessionID: session, text: '', tokens: emptyTokens(), cost: 0, exit_code: null,
    error: `the previous turn of session ${session} is still running${pid ? ` (process ${pid})` : ''}; nothing was sent`,
    ...(pid ? { busy_pid: pid } : {}),
  };
}

/**
 * Run one turn under the turn lock of its session. A `start` has no session and runs unguarded. The lock is released when the
 * turn ends, and on process exit, which the signal handlers of `defaultRun` reach through `process.exit`.
 */
async function guardedTurn(params, { run = defaultRun, lockDirectory = turnLockDirectory, alive = processAlive } = {}) {
  const directory = params.session ? lockDirectory() : null;
  if (directory === null) return turn(params, run);
  const lock = acquireTurnLock(directory, params.session, { alive });
  if (!lock.acquired) return busyResult(params.session, lock.pid);
  process.once('exit', lock.release);
  try {
    return await turn(params, run);
  } finally {
    process.removeListener('exit', lock.release);
    lock.release();
  }
}

/** The command and its options: `{ command, agent, session, inputFile, cwd }`, or a `UsageError`. */
function parseArguments(argv) {
  const { argv: rest, inputFile } = extractInputFile(argv);
  const [command, ...flags] = rest;
  if (!['route', 'start', 'continue'].includes(command)) throw new UsageError('The command is route, start, or continue');
  const options = { command, agent: undefined, session: undefined, inputFile, cwd: undefined };
  const names = { '--agent': 'agent', '--session': 'session', '--cwd': 'cwd' };
  for (let i = 0; i < flags.length; i += 2) {
    const key = names[flags[i]];
    if (!key) throw new UsageError(`Unknown option ${flags[i]}`);
    if (options[key] !== undefined) throw new UsageError(`${flags[i]} given more than once`);
    if (i + 1 >= flags.length || flags[i + 1].startsWith('--')) throw new UsageError(`${flags[i]} requires a value`);
    options[key] = flags[i + 1];
  }
  if (command !== 'continue' && options.session !== undefined) throw new UsageError('--session belongs to continue');
  if (command === 'route' && inputFile !== null) throw new UsageError('route takes no --input-file');
  if (command !== 'continue' && !AGENT.test(options.agent ?? '')) throw new UsageError('--agent must be the name of the agent');
  if (command === 'continue') {
    if (!SESSION.test(options.session ?? '')) throw new UsageError('--session must be the sessionID of the worker');
    if (options.agent !== undefined && !AGENT.test(options.agent)) throw new UsageError('--agent must be the name of the agent');
  }
  if (command !== 'route' && inputFile === null) throw new UsageError(`${command} requires --input-file`);
  return { ...options, cwd: options.cwd ?? process.cwd() };
}

async function main(argv) {
  const guarded = usageKit.handle(USAGE, argv);
  if (guarded !== null) return guarded;
  let options;
  let message;
  try {
    options = parseArguments(argv);
    if (options.command !== 'route') message = readInputFile(options.inputFile);
  } catch (error) {
    if (!(error instanceof UsageError) && !(error instanceof InputFileError)) throw error;
    process.stderr.write(`${usageKit.error(USAGE, usageKit.recognized(USAGE, argv), error.message)}\n`);
    return 2;
  }
  if (options.command === 'route') {
    process.stdout.write(`${JSON.stringify(route(options))}\n`);
    return 0;
  }
  const result = await guardedTurn({ agent: options.agent, session: options.session, message, cwd: options.cwd });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.status === 'ok' ? 0 : result.status === 'busy' ? BUSY_EXIT : 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}

module.exports = { route, checkAgents, FALLBACK_CAUSES, turn, guardedTurn, acquireTurnLock, busyResult, BUSY_EXIT, readEvents, runArguments, harnessOf, parseArguments, UsageError, USAGE };

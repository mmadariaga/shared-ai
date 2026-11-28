#!/usr/bin/env node

'use strict';

/**
 * claude-dispatch — the dispatch of an opencode SAI worker through the Claude Code CLI (sai/policies/claude-dispatch.md).
 *
 * An opencode agent file that carries `harness: claude` runs through `claude -p`, one process per turn, so the model,
 * effort, tools, and permission mode come from the Claude Code agent of the same name. The tool decides the route,
 * runs one turn, stops a turn, and prints one JSON object. It never passes `--model` or `--effort`: the Claude Code
 * agent file carries them, and every turn names it with `--agent`, a resumed one included. Every turn also adds the
 * opencode SAI temp root with `--add-dir`, because the coordinator's report directory lies there. The message travels on stdin, so free text is never re-quoted and a message full of options
 * is never read as one. The command it spawns is the one `opencode-launcher.js` resolves for the name `claude`, which
 * on Windows is the `.exe` behind npm's `.cmd` shim.
 *
 *   node claude-dispatch.js route --agent <name> [--cwd <project-root>]
 *   node claude-dispatch.js start --agent <name> --input-file <path> [--cwd <project-root>]
 *   node claude-dispatch.js continue --session <sessionID> --agent <name> --input-file <path> [--cwd <project-root>]
 *   node claude-dispatch.js stop --session <sessionID> [--cwd <project-root>]
 *
 * `route` prints `{ route, cause, agent, notice? }` with `route` `claude` or `opencode`. The agent file is the one
 * opencode resolves: `<project-root>/.opencode/agents/<name>.md` first, then the user-global `agents/` of the opencode
 * root. Only the value `claude` of its `harness:` key selects `claude`, and only when the `claude` binary runs,
 * `claude auth status` reports a signed-in session, and a Claude Code agent file of the same name exists (project
 * `.claude/agents/` first, then the Claude Code global root). Every other case routes to `opencode`, and a missing
 * piece adds a `notice` that names the agent and the cause. Exit 0.
 *
 * `start`, `continue`, and `stop` print `{ status, sessionID, text, tokens, cost, exit_code, error }`, with `status`
 * `ok`, `failed`, or `busy` for a turn and `stopped` or `none` for a stop. `start` creates the session with a UUID of
 * its own; `sessionID` is the handle for later turns; `text` is the turn's result text; `tokens` and `cost` are read
 * from the turn's `usage` and `total_cost_usd`. A turn is `failed` on a non-zero exit, an error result, or (for
 * `start`) no `session_id`. Exit 0 for `ok` and for a stop, 1 for `failed`, 2 for a usage error, 3 for `busy`.
 *
 * A `continue` holds a turn lock of its session while the turn runs: the file
 * `<opencode SAI temp root>/claude-turns/<sessionID>.lock`, which holds the PID of the tool process and is removed when
 * the turn ends (a signal that stops the tool included). A second turn of the same session while that PID lives is
 * refused with `status: busy` (exit 3), sends nothing, and is no failed turn. `start` takes the lock of the session it
 * creates; `stop` is the only other reader of it.
 *
 * `stop` ends the running turn: it kills the process tree of the PID the turn lock holds, releases the lock, and prints
 * `stopped`; a session with no live turn answers `none`, and so does a lock whose PID now belongs to another program. `stop` is the opencode stop call of a Claude-routed worker.
 *
 * The child's environment drops `OPENCODE_SESSION_ID`, so no turn reads the coordinator's session as its own.
 */

const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { extractInputFile, readInputFile, InputFileError } = require('./input-reader');
const { resolveBinary } = require('./opencode-launcher');
const { resolveTempRoot } = require('./temp-root');
const { acquireTurnLock, busyResult, emptyTokens, frontmatterValue, harnessOf, lockHolder, processAlive, sleepSync, turnLockDirectory: commonLockDirectory, BUSY_EXIT } = require('./dispatch-common');
const usageKit = require('./usage');

const AGENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SESSION = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const CD = 'node sai/tools/claude-dispatch.js';

const USAGE = {
  subcommands: {
    route: {
      usage: [`${CD} route --agent <name> [--cwd <project-root>]`],
      notes: ['Reads `harness:` from the opencode agent file and checks the `claude` binary, its signed-in session, and a Claude Code agent file of the same name; prints `claude` or `opencode` with the cause.'],
      examples: [`${CD} route --agent sai-3-green-worker --cwd /path/to/project`],
      flags: { '--agent': { once: true }, '--cwd': { once: true } },
      required: ['--agent'],
    },
    start: {
      usage: [`${CD} start --agent <name> --input-file <path> [--cwd <project-root>]`],
      notes: ['Runs one `claude -p` turn that creates the session of the agent under a UUID of the tool; the message is the input file, sent on stdin.'],
      examples: [`${CD} start --agent sai-3-green-worker --input-file message.txt --cwd /path/to/project`],
      flags: { '--agent': { once: true }, '--input-file': { once: true }, '--cwd': { once: true } },
      required: ['--agent', '--input-file'],
    },
    continue: {
      usage: [`${CD} continue --session <sessionID> --agent <name> --input-file <path> [--cwd <project-root>]`],
      notes: [
        'Runs one `claude -p --resume` turn that sends the message of the input file to an existing session.',
        'Refused with status `busy` and exit 3, sending nothing, while an earlier turn of the same session still runs.',
      ],
      examples: [`${CD} continue --session 4f8a9c2e-0a41-4f6e-9f2b-1c7d8e9a0b11 --agent sai-3-green-worker --input-file message.txt --cwd /path/to/project`],
      flags: { '--session': { once: true }, '--agent': { once: true }, '--input-file': { once: true }, '--cwd': { once: true } },
      required: ['--session', '--agent', '--input-file'],
    },
    stop: {
      usage: [`${CD} stop --session <sessionID> [--cwd <project-root>]`],
      notes: ['Ends the running turn of the session and releases its turn lock; a session with no live turn answers `none`.'],
      examples: [`${CD} stop --session 4f8a9c2e-0a41-4f6e-9f2b-1c7d8e9a0b11`],
      flags: { '--session': { once: true }, '--cwd': { once: true } },
      required: ['--session'],
    },
  },
};
const PROBE_TIMEOUT_MS = 20000;
const TURN_LOCK_DIR = 'claude-turns';
const STOP_GRACE_MS = 5000;
const AUTH_ENVIRONMENT = ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX'];

/** A misuse of the command line (exit 2). */
class UsageError extends Error {}

/** The shared harness-root resolver the install places beside `fetch.js`. */
function harnessRoots() {
  const candidates = ['skills/fetch', 'skills/universal/fetch'].map(directory => path.resolve(__dirname, '..', '..', directory, 'harness-root.js'));
  return require(candidates.find(file => fs.existsSync(file)) ?? candidates[0]);
}

function opencodeRoot() {
  return harnessRoots().resolveGlobalRoot('opencode');
}

function claudeRoot() {
  return harnessRoots().resolveGlobalRoot('claude');
}

/** One agent file of `agent`: the project directory of the harness first, then its user-global root. `null` when absent. */
function readAgentFile(agent, cwd, globalRoot, directory) {
  const root = typeof globalRoot === 'function' ? globalRoot() : globalRoot;
  for (const parent of [path.join(cwd, `.${directory}`), root]) {
    try { return fs.readFileSync(path.join(parent, 'agents', `${agent}.md`), 'utf8'); } catch { /* try the next root */ }
  }
  return null;
}

/** The opencode agent file opencode resolves for `agent`. `null` when absent. */
function readOpencodeAgentFile(agent, cwd, globalRoot) {
  return readAgentFile(agent, cwd, globalRoot, 'opencode');
}

/** The Claude Code agent file Claude Code resolves for `agent`. `null` when absent. */
function readClaudeAgentFile(agent, cwd, harnessRoot) {
  return readAgentFile(agent, cwd, harnessRoot, 'claude');
}

/** The turn settings of one Claude Code agent file: its `tools:` list and its `permissionMode:`, when it declares them. */
function agentSettings(text) {
  const tools = frontmatterValue(text, 'tools');
  const permissionMode = frontmatterValue(text, 'permissionMode');
  return {
    allowedTools: tools === null || tools.trim() === '' ? null : tools.trim(),
    permissionMode: permissionMode === null || permissionMode.trim() === '' ? null : permissionMode.trim(),
  };
}

/** The child's environment: the caller's, without the session variable that belongs to the opencode coordinator. */
function childEnvironment(env = process.env) {
  const { OPENCODE_SESSION_ID, ...rest } = env;
  return rest;
}

/**
 * `claude --version` and `claude auth status`, run without a shell through the launcher: `{ available, authenticated,
 * cause?, shim? }`. An `auth status` that fails counts as signed in when the environment authenticates the CLI another
 * way (an API key, Bedrock, or Vertex), so a usable install never falls back.
 */
function defaultProbe(cwd) {
  const launched = resolveBinary('claude');
  if (launched.command === null) return { available: false, authenticated: false, cause: launched.cause, shim: launched.shim };
  const env = childEnvironment();
  const options = { cwd, encoding: 'utf8', timeout: PROBE_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'], env };
  const version = spawnSync(launched.command, ['--version'], options);
  if (version.error || version.status !== 0) return { available: false, authenticated: false, cause: 'claude-missing' };
  const authenticatedByEnvironment = AUTH_ENVIRONMENT.some(name => env[name]);
  const auth = spawnSync(launched.command, ['auth', 'status'], options);
  if (auth.error) return { available: true, authenticated: authenticatedByEnvironment };
  if (auth.status !== 0) return { available: true, authenticated: authenticatedByEnvironment };
  try {
    const parsed = JSON.parse(auth.stdout);
    if (parsed !== null && typeof parsed === 'object' && parsed.loggedIn === false) return { available: true, authenticated: authenticatedByEnvironment };
  } catch { /* a non-JSON status line keeps the exit code as the answer */ }
  return { available: true, authenticated: true };
}

const FALLBACK_CAUSES = {
  'claude-missing': 'the claude command is not available',
  'claude-shim-unresolved': 'the claude shim does not name an executable that exists',
  'claude-auth-unavailable': 'Claude Code reports no signed-in session',
  'claude-agent-missing': 'Claude Code has no agent file of that name',
};

function fallback(agent, cause, shim) {
  const detail = shim ? ` (${shim})` : '';
  return {
    route: 'opencode', cause, agent,
    notice: `Agent ${agent} is set to run through Claude Code, but ${FALLBACK_CAUSES[cause]}${detail}. It runs through opencode with the model of its opencode agent file.`,
  };
}

/** The fallback cause of `agent` against one probe result, or `null` when Claude Code can run it. */
function missingCause(agent, result, cwd, harnessRoot) {
  if (!result.available) return result.cause ?? 'claude-missing';
  if (!result.authenticated) return 'claude-auth-unavailable';
  if (readClaudeAgentFile(agent, cwd, harnessRoot) === null) return 'claude-agent-missing';
  return null;
}

/**
 * The Claude Code check of `route`, for several agents with one probe: `{ [agent]: cause | null }`, where a cause is one
 * of the fallback causes of `route` (`FALLBACK_CAUSES`) and `null` means Claude Code runs the agent. `harnessRoot` is the
 * Claude Code root whose `agents/` directory holds the user-global agent files, not that directory itself. Setup calls
 * it once per apply and warns from the causes; it never reads an agent file of opencode or decides a route.
 */
function checkAgents(agents, { cwd = process.cwd(), harnessRoot = claudeRoot } = {}, { probe = defaultProbe } = {}) {
  const result = probe(cwd);
  return Object.fromEntries(agents.map(agent => [agent, missingCause(agent, result, cwd, harnessRoot)]));
}

/** The route of `agent`: `{ route, cause, agent, notice? }`. */
function route({ agent, cwd }, { root = opencodeRoot, harnessRoot = claudeRoot, probe = defaultProbe } = {}) {
  const text = readOpencodeAgentFile(agent, cwd, root);
  if (text === null) return { route: 'opencode', cause: 'agent-file-missing', agent };
  const harness = harnessOf(text);
  if (harness === null) return { route: 'opencode', cause: 'no-harness-key', agent };
  if (harness !== 'claude') return { route: 'opencode', cause: 'harness-not-claude', agent };
  const result = probe(cwd);
  const cause = missingCause(agent, result, cwd, harnessRoot);
  if (cause !== null) return fallback(agent, cause, result.shim);
  return { route: 'claude', cause: 'harness-claude', agent };
}

/** The tool names of an agent file's `tools:` value: split on commas outside parentheses, trimmed, empty entries dropped. */
function toolList(tools) {
  const names = [];
  let depth = 0;
  let current = '';
  for (const character of tools) {
    if (character === '(') depth += 1;
    else if (character === ')') depth = Math.max(0, depth - 1);
    if (character === ',' && depth === 0) {
      if (current.trim() !== '') names.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim() !== '') names.push(current.trim());
  return names;
}

/**
 * The `claude -p` arguments of one turn: create names the session, continue resumes it, and the message is on stdin.
 * Both name the agent, because a resumed session rebuilds its system prompt and model from the flags of the turn, not
 * from the transcript. `reportRoot` (the opencode SAI temp root) is added as a working directory, so the worker can
 * write its report drafts in the coordinator's report directory, which lies outside the project.
 */
function runArguments({ agent, session, create }, settings = {}, { reportRoot = null } = {}) {
  const args = create
    ? ['-p', '--agent', agent, '--output-format', 'json', '--session-id', session]
    : ['-p', '--resume', session, '--agent', agent, '--output-format', 'json'];
  if (reportRoot) args.push('--add-dir', reportRoot);
  if (settings.allowedTools) args.push('--allowedTools', ...toolList(settings.allowedTools));
  if (settings.permissionMode) args.push('--permission-mode', settings.permissionMode);
  return args;
}

/** The opencode SAI temp root, which holds the coordinator's report directory; `null` when it cannot be resolved. */
function defaultReportRoot() {
  try {
    return resolveTempRoot('opencode');
  } catch {
    return null;
  }
}

/**
 * The turn's JSON result: the whole output when it parses, else the last line that does. An array of events (the form
 * a `verbose` setting gives) yields its last `result` event. `null` when none does.
 */
function readResult(stdout) {
  const text = stdout.trim();
  if (text === '') return null;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return [...parsed].reverse().find(event => event !== null && typeof event === 'object' && event.type === 'result') ?? null;
    if (parsed !== null && typeof parsed === 'object') return parsed;
  } catch { /* fall through to the lines */ }
  for (const line of text.split(/\r?\n/).reverse()) {
    try {
      const parsed = JSON.parse(line);
      if (parsed !== null && typeof parsed === 'object') return parsed;
    } catch { /* not a result line */ }
  }
  return null;
}

/**
 * One `claude -p` process, never through a shell: `{ status, stdout, error }`. The message reaches its stdin. On POSIX
 * the child runs in its own process group, so a stop kills the group and not just the tool; its PID is written to
 * `track.childFile` (when given) so the stop can reach it, and the file is removed when the turn ends.
 */
function defaultRun(args, cwd, message, track = {}) {
  return new Promise(resolve => {
    const launched = resolveBinary('claude');
    if (launched.command === null) {
      const detail = launched.shim ? ` (${launched.shim})` : '';
      resolve({ status: null, stdout: '', error: `${FALLBACK_CAUSES[launched.cause]}${detail}` });
      return;
    }
    const detached = process.platform !== 'win32';
    const child = spawn(launched.command, args, { cwd, env: childEnvironment(), detached, stdio: ['pipe', 'pipe', 'pipe'] });
    if (track.childFile !== undefined && child.pid !== undefined) {
      try { fs.writeFileSync(track.childFile, String(child.pid), { mode: 0o600 }); } catch { /* the stop falls back to the tool PID */ }
    }
    const chunks = [];
    let failure = null;
    let settled = false;
    let terminating = false;
    // The child of a POSIX turn leads its own group, so `-child.pid` is the whole tree, grandchildren included.
    const killTree = () => {
      if (child.pid === undefined) return;
      try {
        if (detached) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch { /* the tree is already gone */ }
    };
    const finish = code => {
      if (settled) return;
      settled = true;
      if (track.childFile !== undefined) { try { fs.unlinkSync(track.childFile); } catch { /* already removed */ } }
      resolve({ status: code, stdout: Buffer.concat(chunks).toString('utf8'), error: failure });
      if (terminating) process.exit(1);
    };
    for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.once(signal, () => { terminating = true; killTree(); });
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.resume();
    child.stdin.on('error', () => { /* the child may end before it reads the message */ });
    child.stdin.end(message);
    child.on('error', error => { failure = error.message; finish(null); });
    child.on('close', finish);
  });
}

/**
 * Run one turn: `start` creates the session of `agent` under `session`, `continue` resumes `session`.
 * `{ status, sessionID, text, tokens, cost, exit_code, error }`. `track` carries the child-PID file of the turn.
 */
async function turn({ agent, session, message, cwd, create = false, track }, run = defaultRun, { reportRoot = defaultReportRoot } = {}) {
  const text = readClaudeAgentFile(agent, cwd, claudeRoot);
  if (text === null) {
    return {
      status: 'failed', sessionID: session ?? null, text: '', tokens: emptyTokens(), cost: 0, exit_code: null,
      error: `Claude Code has no agent file of that name: ${agent}`,
    };
  }
  const root = typeof reportRoot === 'function' ? reportRoot() : reportRoot;
  const outcome = await run(runArguments({ agent, session, create }, agentSettings(text), { reportRoot: root }), cwd, message, track);
  const result = readResult(outcome.stdout ?? '');
  const usage = result?.usage ?? {};
  const tokens = {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    reasoning: 0,
    cache_read: usage.cache_read_input_tokens ?? 0,
    cache_write: usage.cache_creation_input_tokens ?? 0,
  };
  const resultSession = typeof result?.session_id === 'string' && result.session_id !== '' ? result.session_id : null;
  const sessionID = resultSession ?? session ?? null;
  let error = null;
  if (outcome.error) error = outcome.error;
  else if (result !== null && result.is_error === true) error = String(result.result ?? 'error result');
  else if (result !== null && typeof result.subtype === 'string' && result.subtype !== 'success') error = `claude reported ${result.subtype}`;
  else if (outcome.status !== 0) error = `claude exited with status ${outcome.status}`;
  else if (result === null) error = 'claude printed no JSON result';
  else if (create && resultSession === null) error = 'claude printed no session_id';
  return {
    status: error === null ? 'ok' : 'failed',
    sessionID,
    text: typeof result?.result === 'string' ? result.result : '',
    tokens,
    cost: typeof result?.total_cost_usd === 'number' ? result.total_cost_usd : 0,
    exit_code: outcome.status,
    error,
  };
}

/** The directory of the turn locks under the opencode SAI temp root; `null` leaves the turn unguarded. */
function turnLockDirectory() {
  return commonLockDirectory('opencode', TURN_LOCK_DIR);
}

/** Run one turn under the turn lock of its session, which `start` chooses and `continue` receives. */
async function guardedTurn(params, { run = defaultRun, lockDirectory = turnLockDirectory, alive = processAlive } = {}) {
  const directory = lockDirectory();
  if (directory === null) return turn(params, run);
  const lock = acquireTurnLock(directory, params.session, { alive });
  if (!lock.acquired) return busyResult(params.session, lock.pid);
  process.once('exit', lock.release);
  const track = { childFile: path.join(directory, `${params.session}.child`) };
  try {
    return await turn({ ...params, track }, run);
  } finally {
    process.removeListener('exit', lock.release);
    lock.release();
  }
}

/** Whether the process group `pgid` still exists. */
function groupAlive(pgid, kill = process.kill) {
  try {
    kill(-pgid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/**
 * End the process tree of `pid`: `taskkill /T` on Windows, and elsewhere the child's process group (when `childPid` is
 * known and still alive) together with the tool, waiting for both before the tree is force-killed and the stop returns.
 */
function terminateTree(pid, {
  childPid = null,
  platform = process.platform,
  alive = processAlive,
  kill = process.kill,
  sleep = sleepSync,
  now = Date.now,
  graceMs = STOP_GRACE_MS,
} = {}) {
  if (platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  const group = Number.isInteger(childPid) && childPid > 0 ? childPid : null;
  const groupUp = () => group !== null && groupAlive(group, kill);
  if (group !== null) { try { kill(-group, 'SIGTERM'); } catch { /* the group is already gone */ } }
  try { kill(pid, 'SIGTERM'); } catch { /* the tool is already gone */ }
  const deadline = now() + graceMs;
  while (now() < deadline && (alive(pid) || groupUp())) sleep(50);
  if (groupUp()) { try { kill(-group, 'SIGKILL'); } catch { /* the group is already gone */ } }
  if (alive(pid)) { try { kill(pid, 'SIGKILL'); } catch { /* the tool is already gone */ } }
}

/**
 * Whether `pid` is still a `claude-dispatch.js` process. A lock left by a killed tool can name a PID the system has since
 * given to an unrelated process, which a stop must never signal. Linux reads `/proc`, other POSIX systems ask `ps`;
 * Windows has no cheap reader, so the live PID counts as the tool there.
 */
function ownsTurn(pid, { platform = process.platform, readFile = fs.readFileSync, run = spawnSync } = {}) {
  if (platform === 'win32') return true;
  let command = null;
  if (platform === 'linux') {
    try { command = readFile(`/proc/${pid}/cmdline`, 'utf8').split('\0').join(' '); } catch { /* fall back to ps */ }
  }
  if (command === null) {
    const listed = run('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (listed.error || listed.status !== 0) return false;
    command = listed.stdout;
  }
  return command.includes('claude-dispatch');
}

/** Stop the running turn of `session`: `{ status: 'stopped' | 'none', ... }` in the shape of a turn result. */
function stopSession(session, { lockDirectory = turnLockDirectory, alive = processAlive, owns = ownsTurn, terminate = terminateTree } = {}) {
  const base = { sessionID: session, text: '', tokens: emptyTokens(), cost: 0, exit_code: null, error: null };
  const directory = lockDirectory();
  if (directory === null) return { status: 'none', ...base };
  const lockFile = path.join(directory, `${session}.lock`);
  const childFile = path.join(directory, `${session}.child`);
  const removeMarkers = () => {
    for (const file of [lockFile, childFile]) {
      try { fs.unlinkSync(file); } catch { /* the turn released it already */ }
    }
  };
  const pid = lockHolder(lockFile);
  if (pid === null || !alive(pid) || !owns(pid)) {
    removeMarkers();
    return { status: 'none', ...base };
  }
  terminate(pid, { childPid: lockHolder(childFile) });
  removeMarkers();
  return { status: 'stopped', ...base };
}

/** The command and its options: `{ command, agent, session, inputFile, cwd }`, or a `UsageError`. */
function parseArguments(argv) {
  const { argv: rest, inputFile } = extractInputFile(argv);
  const [command, ...flags] = rest;
  if (!['route', 'start', 'continue', 'stop'].includes(command)) throw new UsageError('The command is route, start, continue, or stop');
  const options = { command, agent: undefined, session: undefined, inputFile, cwd: undefined };
  const names = { '--agent': 'agent', '--session': 'session', '--cwd': 'cwd' };
  for (let i = 0; i < flags.length; i += 2) {
    const key = names[flags[i]];
    if (!key) throw new UsageError(`Unknown option ${flags[i]}`);
    if (options[key] !== undefined) throw new UsageError(`${flags[i]} given more than once`);
    if (i + 1 >= flags.length || flags[i + 1].startsWith('--')) throw new UsageError(`${flags[i]} requires a value`);
    options[key] = flags[i + 1];
  }
  if (command === 'route') {
    if (options.session !== undefined) throw new UsageError('--session belongs to continue and stop');
    if (inputFile !== null) throw new UsageError('route takes no --input-file');
  }
  if (command === 'start' && options.session !== undefined) throw new UsageError('--session belongs to continue and stop');
  if (command === 'stop' && inputFile !== null) throw new UsageError('stop takes no --input-file');
  if (command === 'route' || command === 'start') {
    if (!AGENT.test(options.agent ?? '')) throw new UsageError('--agent must be the name of the agent');
  }
  if (command === 'continue' || command === 'stop') {
    if (!SESSION.test(options.session ?? '')) throw new UsageError('--session must be the sessionID of the worker');
  }
  if (command === 'continue' && !AGENT.test(options.agent ?? '')) throw new UsageError('--agent must be the name of the agent');
  if ((command === 'start' || command === 'continue') && inputFile === null) throw new UsageError(`${command} requires --input-file`);
  return { ...options, cwd: options.cwd ?? process.cwd() };
}

async function main(argv) {
  const guarded = usageKit.handle(USAGE, argv);
  if (guarded !== null) return guarded;
  let options;
  let message;
  try {
    options = parseArguments(argv);
    if (options.command === 'start' || options.command === 'continue') message = readInputFile(options.inputFile);
  } catch (error) {
    if (!(error instanceof UsageError) && !(error instanceof InputFileError)) throw error;
    process.stderr.write(`${usageKit.error(USAGE, usageKit.recognized(USAGE, argv), error.message)}\n`);
    return 2;
  }
  if (options.command === 'route') {
    process.stdout.write(`${JSON.stringify(route(options))}\n`);
    return 0;
  }
  if (options.command === 'stop') {
    process.stdout.write(`${JSON.stringify(stopSession(options.session))}\n`);
    return 0;
  }
  const result = await guardedTurn({
    agent: options.agent,
    session: options.command === 'start' ? crypto.randomUUID() : options.session,
    message,
    cwd: options.cwd,
    create: options.command === 'start',
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.status === 'ok' ? 0 : result.status === 'busy' ? BUSY_EXIT : 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}

module.exports = {
  route, checkAgents, FALLBACK_CAUSES, turn, guardedTurn, stopSession, terminateTree, ownsTurn, readResult, runArguments,
  agentSettings, childEnvironment, harnessOf, parseArguments, UsageError, USAGE, BUSY_EXIT,
};

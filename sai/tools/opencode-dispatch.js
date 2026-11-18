#!/usr/bin/env node

'use strict';

/**
 * opencode-dispatch — the dispatch of a Claude Code agent through the OpenCode CLI (sai/policies/opencode-dispatch.md).
 *
 * A Claude Code agent file that carries `harness: opencode` runs through `opencode run --format json`, one process per
 * turn, so the model comes from the OpenCode agent of the same name. The tool decides the route, runs one turn, and
 * prints one JSON object. It never passes `--auto`: an `ask` permission is rejected without hanging the turn. It never
 * opens a shell: the worker message travels as one `spawn` argument, after `--`, so free text is never re-quoted and a
 * message that starts with `--` is never read as an option.
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
 * `status` `ok` or `failed`. `sessionID` is the one of the first output event (the handle for later turns), `text` the
 * text of the turn's last message, and `tokens` the sum of its steps. A turn is `failed` on a non-zero exit, an `error`
 * event, or (for `start`) no `sessionID`. Exit 0 for `ok`, 1 for `failed`, 2 for a usage error.
 * The message reaches opencode exactly as the file holds it: the tool adds nothing to it.
 *
 * Stopping the tool (SIGTERM, SIGINT, SIGHUP) stops its `opencode run` process too.
 */

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { extractInputFile, readInputFile, InputFileError } = require('./input-reader');

const AGENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SESSION = /^[A-Za-z0-9_-]+$/;
const HARNESS_KEY = /^harness:\s*(.*?)\s*$/;
const USAGE = [
  'Usage: node opencode-dispatch.js route --agent <name> [--cwd <project-root>]',
  '       node opencode-dispatch.js start --agent <name> --input-file <path> [--cwd <project-root>]',
  '       node opencode-dispatch.js continue --session <sessionID> --input-file <path> [--agent <name>] [--cwd <project-root>]',
].join('\n');
const PROBE_TIMEOUT_MS = 20000;

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

/** `opencode --version` and `opencode debug agents`, run without a shell: `{ available, agents }`, `agents` null on failure. */
function defaultProbe(cwd) {
  const options = { cwd, encoding: 'utf8', timeout: PROBE_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] };
  const version = spawnSync('opencode', ['--version'], options);
  if (version.error || version.status !== 0) return { available: false, agents: null };
  const listing = spawnSync('opencode', ['debug', 'agents'], options);
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
  'opencode-agent-missing': 'opencode has no agent of that name',
  'opencode-agents-unavailable': 'opencode did not list its agents',
};

function fallback(agent, cause) {
  return {
    route: 'claude', cause, agent,
    notice: `Agent ${agent} is set to run through opencode, but ${FALLBACK_CAUSES[cause]}. It runs through Claude Code with the model of its Claude Code agent file.`,
  };
}

/** The fallback cause of `agent` against one probe result, or `null` when opencode can run it. */
function missingCause(agent, { available, agents }) {
  if (!available) return 'opencode-missing';
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
  const cause = missingCause(agent, probe(cwd));
  if (cause !== null) return fallback(agent, cause);
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
    const child = spawn('opencode', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
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
  let options;
  let message;
  try {
    options = parseArguments(argv);
    if (options.command !== 'route') message = readInputFile(options.inputFile);
  } catch (error) {
    if (!(error instanceof UsageError) && !(error instanceof InputFileError)) throw error;
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }
  if (options.command === 'route') {
    process.stdout.write(`${JSON.stringify(route(options))}\n`);
    return 0;
  }
  const result = await turn({ agent: options.agent, session: options.session, message, cwd: options.cwd });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.status === 'ok' ? 0 : 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}

module.exports = { route, checkAgents, FALLBACK_CAUSES, turn, readEvents, runArguments, harnessOf, parseArguments, UsageError };

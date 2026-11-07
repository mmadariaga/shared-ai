'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

// Chain supersession (sai/policies/cache-warming.md): every agent owns one chain of waits. The generation of the
// chain's most recent arm lives in a private file under the SAI temp root; a wait of an earlier generation, or one
// armed before the cutoff mark that the benchmark's warming override writes, returns `finished` when it completes.
const CHAIN_PREFIX = 'warm-chain-';
const CUTOFF_FILE = 'warming-cutoff.json';
const CHAIN_STALE_MS = 24 * 3600000;
const CHAIN_ID = /^[0-9a-f]{16}$/;
const HARNESSES = ['claude', 'opencode'];
const AGENT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// The install root: `<root>/skills/sai-cache-warmer/wait.js`, or `<repo>/skills/universal/sai-cache-warmer/wait.js` in a
// source checkout. The shared tools sit at `sai/tools` of that root.
const INSTALL_ROOT = [path.resolve(__dirname, '..', '..'), path.resolve(__dirname, '..', '..', '..')]
  .find(root => fs.existsSync(path.join(root, 'sai', 'tools', 'temp-root.js'))) ?? path.resolve(__dirname, '..', '..');
const STDIN_GRACE_MS = 2000;

/** A misuse of the command line (exit 2); every other failure exits 1. */
class UsageError extends Error {}

function intervalMilliseconds(value) {
  const match = /^(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)?$/i.exec(String(value ?? '').trim());
  if (!match) return null;
  const unit = (match[2] || 'm').toLowerCase()[0];
  const ms = Number(match[1]) * ({ s: 1000, m: 60000, h: 3600000 }[unit]);
  return ms >= 1 && Number.isSafeInteger(Math.round(ms)) ? Math.round(ms) : null;
}

function splitArguments(text = '') {
  text = String(text ?? '');
  const match = /^(.*?)\s*((?:\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}|now\s*\+\s*\d+(?:\.\d+)?\s*h)\s*$/i.exec(text.trim());
  if (match) return { interval: match[1].trim(), target: match[2] };
  const partial = /^(\d+(?:\.\d+)?\s*(?:seconds?|sec|s|minutes?|min|m|hours?|hr|h)?)\s+(.+)$/i.exec(text.trim());
  return partial ? { interval: partial[1], target: partial[2] } : { interval: text.trim(), target: '' };
}

const pad = value => String(value).padStart(2, '0');
const localDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localTime = date => {
  const minutes = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (!date.getSeconds() && !date.getMilliseconds()) return minutes;
  const seconds = `${minutes}:${pad(date.getSeconds())}`;
  return date.getMilliseconds() ? `${seconds}.${String(date.getMilliseconds()).padStart(3, '0')}` : seconds;
};

function resolveTarget(value, date, now) {
  const relative = /^now\s*\+\s*(\d+(?:\.\d+)?)\s*h$/i.exec(value);
  if (relative) {
    const target = new Date(now.getTime() + Number(relative[1]) * 3600000);
    if (!Number.isFinite(target.getTime())) return null;
    if (date) {
      const dated = resolveTarget(`${pad(target.getHours())}:${pad(target.getMinutes())}`, date, now);
      if (!dated) return null;
      dated.target.setSeconds(target.getSeconds(), target.getMilliseconds());
      return dated;
    }
    return { target, explicit: false };
  }
  const match = /^(?:(\d{4}-\d{2}-\d{2})\s+)?(\d{1,2}):(\d{2})$/.exec(value);
  if (!match || +match[2] > 23 || +match[3] > 59) return null;
  const day = date || match[1] || localDate(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const target = new Date(0);
  target.setFullYear(year, month - 1, dayOfMonth);
  target.setHours(+match[2], +match[3], 0, 0);
  if (localDate(target) !== day || target.getHours() !== +match[2] || target.getMinutes() !== +match[3]) return null;
  const explicit = Boolean(date || match[1]);
  if (!explicit && target.getTime() + 60000 <= now.getTime()) target.setDate(target.getDate() + 1);
  return { target, explicit };
}

function prepare(input, now = new Date()) {
  const supplied = splitArguments(input.arguments);
  const values = { interval: input.interval ?? supplied.interval, target: input.target ?? supplied.target };
  if (input.date !== undefined) values.date = input.date;
  const interval = intervalMilliseconds(values.interval);
  const targetValue = String(values.target).trim();
  const saved = input.resolved_target;
  const savedDate = new Date(saved?.instant_ms);
  const reusable = saved?.value === targetValue && Number.isSafeInteger(saved.instant_ms) &&
    Number.isFinite(savedDate.getTime()) && typeof saved.requires_confirmation === 'boolean' &&
    (input.date === undefined || input.date === localDate(savedDate));
  const resolved = reusable ? { target: savedDate, explicit: !saved.requires_confirmation || input.date !== undefined }
    : resolveTarget(targetValue, input.date, now);
  const requiresConfirmation = resolved && (reusable
    ? saved.requires_confirmation && input.date === undefined
    : !resolved.explicit && localDate(resolved.target) !== localDate(now));
  if (resolved) values.resolved_target = {
    value: targetValue, instant_ms: resolved.target.getTime(), requires_confirmation: Boolean(requiresConfirmation),
  };
  const fields = [];
  const reasons = {};
  if (interval === null) { fields.push('interval'); reasons.interval = 'Enter a positive interval in seconds, minutes or hours.'; }
  if (!resolved) { fields.push('target'); reasons.target = 'Enter a valid local HH:mm, YYYY-MM-DD HH:mm, or now + Nh target.'; }
  if (fields.length) {
    if (!resolved) delete values.date;
    return { status: 'needs_input', fields, reasons, values };
  }
  const { target } = resolved;
  if (requiresConfirmation) {
    return { status: 'confirm_date', values,
      proposed_date: localDate(target), target_local: `${localDate(target)} ${localTime(target)}` };
  }
  const closing = target.getTime() + 60000;
  if (!Number.isSafeInteger(closing) || !Number.isFinite(new Date(closing).getTime())) throw new Error('Closing time is outside the supported date range.');
  return { status: 'ready', state: { interval_ms: interval, closing_ms: closing },
    closing_local: `${localDate(new Date(closing))} ${localTime(new Date(closing))}` };
}

async function sleep(ms) {
  // Node timers overflow above 2^31-1 ms; chunk only this single logical wait.
  const end = Date.now() + ms;
  let remaining = ms;
  while (remaining > 0) {
    await delay(Math.min(remaining, 2147483647));
    remaining = end - Date.now();
  }
}

async function waitOnce(state, { now = Date.now, wait = sleep } = {}) {
  if (!Number.isSafeInteger(state.interval_ms) || state.interval_ms <= 0 ||
      !Number.isSafeInteger(state.closing_ms) || !Number.isFinite(new Date(state.closing_ms).getTime())) {
    throw new Error('Invalid fixed wait state.');
  }
  const remaining = state.closing_ms - now();
  const waited_ms = Math.max(0, Math.min(state.interval_ms, remaining));
  if (waited_ms > 0) await wait(waited_ms);
  return { status: now() >= state.closing_ms ? 'finished' : 'continue', waited_ms };
}

// Agent self-warming (sai/policies/cache-warming.md): `interval` and `max` are minutes, with no target time and no
// closing margin. `begin` runs once in the foreground per agent: it resolves the agent's timings from the project
// settings, stores the agent's identity in its chain record, and prints the chain id. `warm --chain <id>` arms after
// each real message and opens a window of `max` minutes from now; each re-arm after a wake passes the returned `state`
// back (`warm --state <token>`), so the window closes `max` minutes after the agent's last real task or continuation.
// Every arm and every wake resolves the timings again from the stored identity, so a changed setting applies with no
// agent restart.
function warmState({ interval, max }, now = Date.now()) {
  const interval_ms = intervalMilliseconds(interval);
  const max_ms = intervalMilliseconds(max);
  if (interval_ms === null || max_ms === null) throw new Error('Warming needs a positive interval and max in minutes.');
  if (max_ms < interval_ms) throw new Error('Warming max must be at least the interval.');
  return { interval_ms, closing_ms: now + max_ms };
}

/** A fresh chain id of an agent that is not the main session. */
const newChainId = () => crypto.randomBytes(8).toString('hex');

/** The chain id of a main session: the same harness session always owns the same chain. */
const sessionChainId = (harness, session) => crypto.createHash('sha256').update(`${harness}:${session}`).digest('hex').slice(0, 16);

/** The SAI temp root of the harness that installed this script. */
function defaultSaiRoot() {
  const tempRoot = require(path.resolve(INSTALL_ROOT, 'sai', 'tools', 'temp-root.js'));
  return tempRoot.resolveTempRoot(tempRoot.harnessFromInstalledPath(__filename));
}

/** The effective timings of an identity: `off` or `{ interval, max }`. Unreadable settings are `off`. */
function defaultResolve(identity) {
  if (identity.fixed) return identity.fixed;
  try {
    const settings = require(path.resolve(INSTALL_ROOT, 'sai', 'tools', 'project-settings.js'));
    const { provider, model, role, harness, cwd } = identity;
    return settings.warming({ provider, model, role, harness }, { cwd }).warming;
  } catch { return 'off'; }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return null; throw error; }
}

function writeAtomic(file, text) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, text, { mode: 0o600 });
    fs.renameSync(temp, file);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
}

const chainFile = (saiRoot, chain) => {
  if (typeof chain !== 'string' || !CHAIN_ID.test(chain)) throw new UsageError('Warming chain must be the id that begin returned.');
  return path.join(saiRoot, `${CHAIN_PREFIX}${chain}.json`);
};

/** The chain record of a `begin`, which holds the identity that every arm and wake resolves its timings from. */
function chainRecord(saiRoot, chain) {
  const record = readJson(chainFile(saiRoot, chain));
  if (!record?.identity) throw new UsageError('Warming chain has no record: run begin first, and pass the chain it returned.');
  return record;
}

/** Make the chain's newest generation the current one. */
function bumpGeneration(saiRoot, chain, now) {
  const file = chainFile(saiRoot, chain);
  const record = readJson(file);
  const held = record?.generation;
  const generation = (Number.isSafeInteger(held) ? held : 0) + 1;
  writeAtomic(file, `${JSON.stringify({ ...record, generation, updated_ms: now })}\n`);
  return generation;
}

/** Refresh the record's modification time, so the age prune never reaches a chain that still arms. */
function touchChain(saiRoot, chain) {
  try {
    const stamp = new Date();
    fs.utimesSync(chainFile(saiRoot, chain), stamp, stamp);
  } catch (error) { if (error instanceof UsageError) throw error; /* a missing record means the chain already ended */ }
}

/** Remove chain records that no live window can still need. Best effort. */
function pruneChains(saiRoot, now) {
  try {
    for (const name of fs.readdirSync(saiRoot)) {
      if (!name.startsWith(CHAIN_PREFIX)) continue;
      const file = path.join(saiRoot, name);
      if (fs.statSync(file).mtimeMs < now - CHAIN_STALE_MS) fs.rmSync(file, { force: true });
    }
  } catch { /* a record that cannot be pruned is pruned by a later arm */ }
}

/** A wait is superseded by a later arm of its chain, or by a cutoff mark newer than its arm. */
function superseded(state, saiRoot) {
  if (!state.chain) return false;
  if (readJson(chainFile(saiRoot, state.chain))?.generation !== state.generation) return true;
  const cutoff = readJson(path.join(saiRoot, CUTOFF_FILE))?.cutoff_ms;
  return Number.isFinite(cutoff) && state.armed_ms < cutoff;
}

// A chain keeps its record when its window closes or its setting turns off: the same agent arms again after its next real
// message with the same chain id, and the generation must keep counting up so that no earlier wait looks current. The
// age prune removes the record 24 hours after its last arm or wake.

/** The `model` of an agent file's frontmatter, as written. */
function frontmatterModel(text) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const line = block && /^model:[ \t]*(.+?)[ \t]*$/m.exec(block[1]);
  return line ? line[1].replace(/^(["'])(.*)\1$/, '$2') : undefined;
}

/** The folders whose `<name>.md` can hold an installed agent of one harness: project-local, install root, user-global. */
function agentFolders(harness, cwd, home = os.homedir()) {
  const project = path.join(cwd, harness === 'claude' ? '.claude' : '.opencode', 'agents');
  const user = harness === 'claude' ? path.join(home, '.claude', 'agents') : path.join(home, '.config', 'opencode', 'agents');
  return [...new Set([project, path.join(INSTALL_ROOT, 'agents'), user])];
}

/**
 * The provider and model of a subagent, from the `model` frontmatter of its installed agent file. On Claude Code the
 * provider is `anthropic` and the model is the value as written; on opencode the value is `<provider>/<model>`.
 */
function agentIdentity(name, harness, { cwd, folders = agentFolders(harness, cwd) }) {
  if (!AGENT_NAME.test(name)) throw new UsageError('--agent must be the name of an installed agent.');
  const file = folders.map(folder => path.join(folder, `${name}.md`)).find(candidate => fs.existsSync(candidate));
  const model = file ? frontmatterModel(fs.readFileSync(file, 'utf8')) : undefined;
  if (harness === 'claude') return { provider: 'anthropic', ...(model === undefined ? {} : { model }) };
  const slash = model === undefined ? -1 : model.indexOf('/');
  if (slash <= 0) throw new Error(`Agent ${name} has no <provider>/<model> in the model frontmatter of an installed agent file.`);
  return { provider: model.slice(0, slash), model: model.slice(slash + 1) };
}

/**
 * The foreground start of an agent's warming. A subagent names its installed agent file (`agent`); the main session
 * names its provider and model (`role: 'agent'`). Prints `{ chain, warming }`: `off` (no chain, nothing to arm) or
 * the resolved `{ interval, max }` with the chain every later `warm --chain` passes. The main session's chain follows
 * its harness session id, so a later command invocation in the same chat returns the chain it already owns.
 */
function beginOnce(input, io = {}) {
  const now = io.now ?? Date.now;
  const cwd = io.cwd ?? process.cwd();
  const { harness } = input;
  if (!HARNESSES.includes(harness)) throw new UsageError(`begin needs --harness ${HARNESSES.join('|')}`);
  let identity;
  if (input.agent !== undefined) {
    if ([input.role, input.provider, input.model, input.interval, input.max].some(value => value !== undefined)) throw new UsageError('begin takes --agent alone for a subagent; --role, --provider, --model, --interval and --max belong to the main session');
    identity = { ...agentIdentity(input.agent, harness, { cwd, folders: io.agentFolders }), role: 'subagent' };
  } else {
    if (input.role !== 'agent' || !input.provider) throw new UsageError('begin takes --agent for a subagent, or --role agent --provider <p> for the main session');
    identity = { provider: input.provider, ...(input.model === undefined ? {} : { model: input.model }), role: 'agent' };
    // Timings the user chose in the conversation (the explore hand-off wait) replace the settings for this chain.
    if (input.interval !== undefined || input.max !== undefined) {
      const fixed = { interval: Number(input.interval), max: Number(input.max) };
      try { warmState(fixed); } catch { throw new UsageError('--interval and --max must be given together, as positive numbers of minutes with max at least interval'); }
      identity.fixed = fixed;
    }
    if (input.fixedDeadline && !identity.fixed) throw new UsageError('--fixed-deadline needs the --interval and --max the user chose');
  }
  if (input.fixedDeadline && input.agent !== undefined) throw new UsageError('--fixed-deadline belongs to the main session');
  identity = { ...identity, harness, cwd };
  const warming = (io.resolve ?? defaultResolve)(identity);
  if (warming === 'off') return { chain: null, warming: 'off' };
  const saiRoot = io.saiRoot ?? defaultSaiRoot();
  const session = input.session ?? (harness === 'claude' ? process.env.CLAUDE_CODE_SESSION_ID : process.env.OPENCODE_SESSION_ID);
  const chain = identity.role === 'agent' && session ? sessionChainId(harness, session) : newChainId();
  const file = chainFile(saiRoot, chain);
  const held = readJson(file);
  // A fixed deadline is a property of the record, set here: it closes `max` minutes from this begin, and no later arm moves it.
  const deadline = input.fixedDeadline ? { deadline_ms: warmState(identity.fixed, now()).closing_ms } : {};
  writeAtomic(file, `${JSON.stringify({ generation: Number.isSafeInteger(held?.generation) ? held.generation : 0, updated_ms: now(), identity, ...deadline })}\n`);
  touchChain(saiRoot, chain);
  pruneChains(saiRoot, now());
  return { chain, warming };
}

/** Arm after a real message: a new generation supersedes the chain's earlier waits, and the window opens now. */
async function armOnce(chain, io) {
  const now = io.now ?? Date.now;
  const saiRoot = io.saiRoot ?? defaultSaiRoot();
  const record = chainRecord(saiRoot, chain);
  const timings = (io.resolve ?? defaultResolve)(record.identity);
  if (timings === 'off') return { status: 'finished', waited_ms: 0, state: { chain } };
  const base = warmState(timings, now());
  // A chain with a fixed deadline keeps the window its begin opened: an arm supersedes the earlier wait but never moves the end.
  if (record.deadline_ms !== undefined) {
    if (now() >= record.deadline_ms) return { status: 'finished', waited_ms: 0, state: { chain } };
    base.closing_ms = record.deadline_ms;
  }
  const generation = bumpGeneration(saiRoot, chain, now());
  touchChain(saiRoot, chain);
  pruneChains(saiRoot, now());
  return waitWith({ ...base, chain, generation, armed_ms: now() }, { ...io, saiRoot });
}

/** Re-arm after a wake: the timings are resolved again, and a new interval applies from this wait. The window stays. */
async function wakeOnce(state, io) {
  if (!state || typeof state !== 'object' || !state.chain) throw new UsageError('warm --state needs the state_token that a wake returned from a begin chain.');
  const saiRoot = io.saiRoot ?? defaultSaiRoot();
  if (superseded(state, saiRoot)) return { status: 'finished', waited_ms: 0, state };
  const timings = (io.resolve ?? defaultResolve)(chainRecord(saiRoot, state.chain).identity);
  if (timings === 'off') return { status: 'finished', waited_ms: 0, state };
  const interval_ms = intervalMilliseconds(timings.interval);
  touchChain(saiRoot, state.chain);
  return waitWith(interval_ms === null ? state : { ...state, interval_ms }, { ...io, saiRoot });
}

async function warmOnce(input, io = {}) {
  if (input.state !== undefined) return wakeOnce(input.state, io);
  if (input.chain === undefined) throw new UsageError('warm needs --chain <id> from begin, or --state <token> from a wake.');
  return armOnce(input.chain, io);
}

async function waitWith(state, io) {
  const saiRoot = io.saiRoot;
  if (superseded(state, saiRoot)) return { status: 'finished', waited_ms: 0, state };
  const result = await waitOnce(state, io);
  if (superseded(state, saiRoot)) return { status: 'finished', waited_ms: result.waited_ms, state };
  return { ...result, state };
}

const FLAGS = {
  begin: ['--agent', '--role', '--provider', '--model', '--harness', '--session', '--interval', '--max'],
  warm: ['--chain', '--state'],
};
/** Flags that take no value. */
const SWITCHES = { begin: ['--fixed-deadline'], warm: [] };

/** Strict `--flag value` pairs of one subcommand, plus its valueless switches; an unknown flag or a missing value is a usage error. */
function parseFlags(command, args) {
  const values = {};
  for (let i = 0; i < args.length; i += 1) {
    if (SWITCHES[command].includes(args[i])) {
      values[args[i].slice(2).replace(/-(\w)/g, (_, letter) => letter.toUpperCase())] = true;
      continue;
    }
    if (!FLAGS[command].includes(args[i]) || i + 1 >= args.length) throw new UsageError(`${command} takes ${[...FLAGS[command], ...SWITCHES[command]].join(', ')}, each flag with a value`);
    values[args[i].slice(2)] = args[i + 1];
    i += 1;
  }
  return values;
}

/** The argv form of `warm`: `--chain <id>` arms a wait, and `--state <token>` (the `state_token` of a wake) re-arms it. */
function inputFromArgv(args) {
  const values = parseFlags('warm', args);
  if (values.state !== undefined) {
    if (values.chain !== undefined) throw new UsageError('warm takes --chain or --state, not both');
    let state;
    try { state = JSON.parse(Buffer.from(values.state, 'base64url').toString('utf8')); } catch { state = null; }
    if (!state || typeof state !== 'object') throw new UsageError('--state is not a state token');
    return { state };
  }
  if (values.chain === undefined) throw new UsageError('warm needs --chain <id> from begin, or --state <token> from a wake.');
  return { chain: values.chain };
}

/** The argv form of `begin`. */
function beginInputFromArgv(args) {
  return parseFlags('begin', args);
}

const stateToken = state => Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');

/** All of stdin. A `warm` with no arguments waits only `graceMs` for it, so a forgotten flag fails instead of hanging. */
async function readStdin(graceMs) {
  let text = '';
  const timer = graceMs === undefined ? null : setTimeout(() => process.stdin.destroy(), graceMs);
  try { for await (const chunk of process.stdin) text += chunk; } catch { /* destroyed after the grace period */ }
  clearTimeout(timer);
  return text;
}

const isInputFile = arg => arg === '--input-file' || arg.startsWith('--input-file=');

if (require.main === module) {
  (async () => {
    const [command, ...args] = process.argv.slice(2);
    if (command === 'begin') return console.log(JSON.stringify(beginOnce(beginInputFromArgv(args))));
    if (command === 'warm' && args.length && !args.some(isInputFile)) {
      const result = await warmOnce(inputFromArgv(args));
      return console.log(JSON.stringify({ ...result, state_token: stateToken(result.state) }));
    }
    if (command === 'warm' && !args.length && process.stdin.isTTY) throw new UsageError('warm needs --chain <id> from begin, or --state <token> from a wake.');
    let text = '';
    if (args.some(isInputFile)) {
      const reader = require(path.join(INSTALL_ROOT, 'sai', 'tools', 'input-reader.js'));
      text = reader.readInputFile(reader.extractInputFile(args).inputFile);
    } else text = await readStdin(command === 'warm' && !args.length ? STDIN_GRACE_MS : undefined);
    if (command === 'warm' && !text.trim()) throw new UsageError('warm needs --chain <id> from begin, or --state <token> from a wake.');
    const input = JSON.parse(text);
    if (!['prepare', 'wait', 'warm'].includes(command)) throw new Error('Use begin with flags, or prepare, wait or warm with JSON in --input-file <path> (stdin also accepted).');
    const run = { prepare: () => prepare(input), wait: () => waitOnce(input), warm: () => warmOnce(input) }[command];
    console.log(JSON.stringify(await run()));
  })().catch(error => {
    console.error(JSON.stringify({ status: 'failed', message: error.message }));
    process.exitCode = error instanceof UsageError ? 2 : 1;
  });
}

module.exports = {
  UsageError, inputFromArgv, beginInputFromArgv, stateToken, CUTOFF_FILE, CHAIN_STALE_MS, newChainId, sessionChainId,
  intervalMilliseconds, splitArguments, prepare, waitOnce, warmState, beginOnce, warmOnce, frontmatterModel, agentIdentity,
};

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

// Chain supersession (sai/policies/cache-warming.md): every agent owns one chain of waits. The generation of the
// chain's most recent arm lives in a private file under the SAI temp root; a wait of an earlier generation, or one
// armed before the cutoff mark that the benchmark's warming override writes, returns `finished` when it completes.
const CHAIN_PREFIX = 'warm-chain-';
const CUTOFF_FILE = 'warming-cutoff.json';
const CHAIN_STALE_MS = 24 * 3600000;
const CHAIN_ID = /^[0-9a-f]{16}$/;

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

// Agent self-warming (sai/policies/cache-warming.md): `interval` and `max` are minutes, with no target time and
// no closing margin. The first call of a real message opens the window (`max` from now); each re-arm after a wake
// passes the returned `state` back unchanged, so the window closes `max` minutes after the agent's last real task or
// continuation. A real message passes the `chain` id of the agent's last returned state, which supersedes the
// waits that the chain armed before.
function warmState({ interval, max }, now = Date.now()) {
  const interval_ms = intervalMilliseconds(interval);
  const max_ms = intervalMilliseconds(max);
  if (interval_ms === null || max_ms === null) throw new Error('Warming needs a positive interval and max in minutes.');
  if (max_ms < interval_ms) throw new Error('Warming max must be at least the interval.');
  return { interval_ms, closing_ms: now + max_ms };
}

/** A fresh chain id. An agent asks for one before its first arm, because a wait returns its state only at its wake. */
const newChainId = () => crypto.randomBytes(8).toString('hex');

/** The SAI temp root of the harness that installed this script. */
function defaultSaiRoot() {
  const tempRoot = require(path.resolve(__dirname, '..', '..', 'sai', 'tools', 'temp-root.js'));
  return tempRoot.resolveTempRoot(tempRoot.harnessFromInstalledPath(__filename));
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
  if (typeof chain !== 'string' || !CHAIN_ID.test(chain)) throw new Error('Warming chain must be the id that an earlier warm call returned.');
  return path.join(saiRoot, `${CHAIN_PREFIX}${chain}.json`);
};

/** Make the chain's newest generation the current one. */
function bumpGeneration(saiRoot, chain, now) {
  const file = chainFile(saiRoot, chain);
  const held = readJson(file)?.generation;
  const generation = (Number.isSafeInteger(held) ? held : 0) + 1;
  writeAtomic(file, `${JSON.stringify({ generation, updated_ms: now })}\n`);
  return generation;
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

function releaseChain(saiRoot, state) {
  const file = chainFile(saiRoot, state.chain);
  if (readJson(file)?.generation === state.generation) fs.rmSync(file, { force: true });
}

// A re-arm may carry a freshly resolved `interval`; the window closes where it was set.
async function warmOnce(input, io = {}) {
  const now = io.now ?? Date.now;
  if (!input.state) {
    const base = warmState(input, now());
    const saiRoot = io.saiRoot ?? defaultSaiRoot();
    const chain = input.chain === undefined ? newChainId() : input.chain;
    const generation = bumpGeneration(saiRoot, chain, now());
    pruneChains(saiRoot, now());
    return waitWith({ ...base, chain, generation, armed_ms: now() }, { ...io, saiRoot });
  }
  if (input.interval === undefined) return waitWith(input.state, io);
  const interval_ms = intervalMilliseconds(input.interval);
  if (interval_ms === null) throw new Error('Warming needs a positive interval in minutes.');
  return waitWith({ ...input.state, interval_ms }, io);
}

async function waitWith(state, io) {
  const saiRoot = state.chain ? (io.saiRoot ?? defaultSaiRoot()) : null;
  if (saiRoot && superseded(state, saiRoot)) return { status: 'finished', waited_ms: 0, state };
  const result = await waitOnce(state, io);
  if (saiRoot) {
    if (superseded(state, saiRoot)) return { status: 'finished', waited_ms: result.waited_ms, state };
    if (result.status === 'finished') releaseChain(saiRoot, state);
  }
  return { ...result, state };
}

if (require.main === module) {
  (async () => {
    const command = process.argv[2];
    if (command === 'chain') return console.log(JSON.stringify({ chain: newChainId() }));
    let text = '';
    for await (const chunk of process.stdin) text += chunk;
    const input = JSON.parse(text);
    if (!['prepare', 'wait', 'warm'].includes(command)) throw new Error('Use prepare, wait or warm with JSON on stdin, or chain.');
    const run = { prepare: () => prepare(input), wait: () => waitOnce(input), warm: () => warmOnce(input) }[command];
    console.log(JSON.stringify(await run()));
  })().catch(error => {
    console.error(JSON.stringify({ status: 'failed', message: error.message }));
    process.exitCode = 1;
  });
}

module.exports = { CUTOFF_FILE, newChainId, intervalMilliseconds, splitArguments, prepare, waitOnce, warmState, warmOnce };

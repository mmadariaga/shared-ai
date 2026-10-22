#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DEFAULTS, parameters, measure, renderSummary, validateIdentity } = require('./engine');
const { OpenCodeAdapter, claudeLimitations, ClaudeTranscripts, ClaudeReplayAdapter, transcriptRequests, parseTranscript, WAIT_LABEL } = require('./adapters');

const STEP_COMMANDS = ['next', 'record', 'wait', 'finish'];

function parseArgs(argv) {
  if (argv.includes('--subagent')) {
    if (argv.includes('--mode')) throw new Error('Use --subagent or --mode, not both');
    argv = argv.flatMap(value => value === '--subagent' ? ['--mode', 'subagent'] : [value]);
  }
  const args = { ...DEFAULTS, tool: null, mode: 'main', session: null, 'invoking-session': null, out: null, log: path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local/share'), 'opencode/log/opencode.log'), projects: null, 'dry-run': false, inspect: false, 'acknowledge-consumption': false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !Object.hasOwn(args, key)) throw new Error(`Unknown option ${argv[i]}`);
    if (['dry-run', 'inspect', 'acknowledge-consumption'].includes(key)) { args[key] = true; continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`--${key} needs a value`);
    args[key] = key === 'time-prefix' ? (/^(true|false)$/.test(value) ? value === 'true' : undefined) : Object.hasOwn(DEFAULTS, key) && !['probe-text', 'time-prefix'].includes(key) ? Number(value) : value;
  }
  parameters(args);
  if (!['opencode', 'claude'].includes(args.tool) || !['main', 'subagent'].includes(args.mode) || !args.session || !args['invoking-session'] || !args.out) throw new Error('Require --tool opencode|claude --mode main|subagent --session ID --invoking-session ID --out DIR');
  return args;
}

function writeOutputs(out, report, extra = '') {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  fs.writeFileSync(path.join(out, 'summary.md'), renderSummary(report) + extra, { mode: 0o600 });
}

function unavailableReport(identity, p, message) {
  return { ...identity, model: null, parameters: p, status: 'unavailable', stop_reason: 'compatibility', probes: 0, samples: [], results_valid: false, limitations: [message] };
}

// ---------------------------------------------------------------------------
// Claude Code. No external process can send a prompt into a live session, so
// the model in the session performs each wait and the reactivation (main) or
// the SendMessage continuation (subagent) is the probe. This runner only plans
// the next wait and records each probe from the transcripts. The decisions come
// from the same engine as opencode: every call replays the probes recorded in
// state.json through measure(), so a sample sequence yields the same ladder,
// descent, refinement and sanity checks on both tools.
// ---------------------------------------------------------------------------

const statePath = out => path.join(out, 'state.json');

function loadState(out) {
  try { return JSON.parse(fs.readFileSync(statePath(out), 'utf8')); } catch { throw new Error(`No Claude Code run state in ${out}; start the run first`); }
}

function saveState(out, state) {
  const temporary = `${statePath(out)}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(temporary, statePath(out));
}

async function replay(state) {
  const clock = { t: state.started_ms, now: () => clock.t, sleep: async ms => { clock.t += ms; } };
  const controller = new AbortController();
  const adapter = new ClaudeReplayAdapter(state, clock, () => controller.abort());
  const report = await measure(adapter, state.parameters, { clock, signal: controller.signal });
  return { report, pending: adapter.pending };
}

function finalizeReport(state, report) {
  const samples = report.samples.filter(s => s.phase !== 'preflight');
  samples.forEach((sample, index) => {
    const recorded = state.observations[index];
    if (!recorded) return;
    sample.cache_bucket = recorded.cache_bucket ?? null;
    sample.anchor_cache_bucket = recorded.anchor_cache_bucket ?? null;
    if (recorded.notes?.length) sample.observations = recorded.notes;
  });
  const buckets = [...new Set(state.observations.flatMap(o => [o.cache_bucket, o.anchor_cache_bucket]).filter(Boolean))];
  const limitations = claudeLimitations(state.mode);
  const incomplete = state.observations.find(o => o.incomplete);
  if (incomplete) report.stop_reason = 'wait-ended-early';
  if (state.observations.some(o => o.killed)) limitations.push('Claude Code stopped a background wait. CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1 is a launch option you may choose before starting Claude Code; the benchmark never sets it.');
  report.limitations = [...limitations, ...report.limitations];
  report.cache_buckets = buckets;
  return report;
}

function bucketLines(report) {
  const buckets = report.cache_buckets ?? [];
  return `\n- Observed cache bucket: ${buckets.length ? buckets.join(', ') : 'unknown'}\n` + (report.samples ?? []).flatMap(s => s.observations ?? []).map(o => `- ${o}\n`).join('');
}

function finish(out, state, report) {
  finalizeReport(state, report);
  fs.writeFileSync(path.join(out, 'results.jsonl'), report.samples.map(s => JSON.stringify(s)).join('\n') + (report.samples.length ? '\n' : ''), { mode: 0o600 });
  writeOutputs(out, report, bucketLines(report));
  state.finished = true;
  saveState(out, state);
  return { action: 'done', status: report.status, stop_reason: report.stop_reason, report: path.join(out, 'report.json'), summary: path.join(out, 'summary.md') };
}

function describeNext(state, pending, out) {
  const seconds = Math.round(pending.gap_s * 1000) / 1000;
  const common = { action: 'wait', sample: state.observations.length + 1, seconds, wait_args: `wait --out ${out} --seconds ${seconds}`, record_args: `record --out ${out}`, wait_description: WAIT_LABEL };
  return state.mode === 'main'
    ? { ...common, probe: 'reactivation', note: 'Start the wait as a background command, then end the turn. The wake-up is the probe: call record in that turn.' }
    : { ...common, probe: 'send-message', agent: state.session, message: state.parameters['probe-text'], note: 'Start the wait as a background command and end the turn. When it finishes, SendMessage the message to the agent, then call record.' };
}

async function claudeNext(out) {
  const state = loadState(out), { report, pending } = await replay(state);
  if (state.finished) return { action: 'done', status: report.status, report: path.join(out, 'report.json') };
  return pending ? describeNext(state, pending, out) : finish(out, state, report);
}

async function claudeRecord(out, { pollS = 120 } = {}, io = {}) {
  const now = io.now ?? Date.now, sleep = io.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const state = loadState(out);
  if (state.finished) return claudeNext(out);
  const before = await replay(state);
  if (!before.pending) return finish(out, state, before.report);
  const reader = new ClaudeTranscripts({ session: state.session, invokingSession: state.invoking_session, mode: state.mode, projects: state.projects }, { now });
  const deadline = now() + (state.mode === 'subagent' ? pollS * 1000 : 0);
  let seen;
  for (;;) {
    seen = reader.observe(state, state.pending_attempts ?? 0);
    if (!seen.pending || now() >= deadline) break;
    await sleep(1000);
  }
  if (seen.pending) {
    state.pending_attempts = (state.pending_attempts ?? 0) + 1;
    saveState(out, state);
    return { action: 'pending', reason: seen.pending, retry: `record --out ${out}` };
  }
  state.observations.push(seen.observation);
  state.cursor = seen.cursor;
  state.pending_attempts = 0;
  saveState(out, state);
  return claudeNext(out);
}

// Waits until `seconds` after the session's last request on the target, and
// until that request has been stable for a moment. The wait therefore cannot
// end before the interval it stands for, even when the reply that ends the
// launching turn is written after the command started.
async function claudeWait(out, seconds, io = {}) {
  const now = io.now ?? Date.now, sleep = io.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('--seconds must be nonnegative');
  const state = loadState(out), file = state.mode === 'main' ? state.files.main : state.files.child;
  let key = null, changed = now();
  for (;;) {
    const last = transcriptRequests(parseTranscript(fs.readFileSync(file, 'utf8'))).at(-1);
    if (last?.id !== key) { key = last?.id ?? null; changed = now(); }
    const due = (last?.ts ?? changed) + seconds * 1000;
    if (now() >= due && now() - changed >= 2000) return { waited: true, seconds, last_request_ms: last?.ts ?? null };
    await sleep(Math.max(250, Math.min(1000, due - now())));
  }
}

async function claudeFinish(out, { unavailable = null, reason = 'cancelled' } = {}) {
  const state = loadState(out);
  if (unavailable) {
    const report = unavailableReport({ tool: 'claude', mode: state.mode, session: state.session, invoking_session: state.invoking_session }, state.parameters, `Claude Code ${state.mode} measurement unavailable: ${unavailable}`);
    writeOutputs(out, report);
    state.finished = true; saveState(out, state);
    return { action: 'done', status: 'unavailable', report: path.join(out, 'report.json'), summary: path.join(out, 'summary.md') };
  }
  const { report } = await replay(state);
  if (report.stop_reason === 'cancelled' && !state.observations.some(o => o.incomplete)) report.stop_reason = reason;
  return finish(out, state, report);
}

async function claudeStart(args, p, io = {}) {
  fs.mkdirSync(args.out, { mode: 0o700 });
  const identity = { tool: 'claude', mode: args.mode, session: args.session, invoking_session: args['invoking-session'] };
  try {
    const reader = new ClaudeTranscripts({ session: args.session, invokingSession: args['invoking-session'], mode: args.mode, projects: args.projects }, io);
    const found = reader.identify();
    validateIdentity(found.identity);
    const state = { version: 1, ...identity, projects: reader.projects, started_ms: (io.now ?? Date.now)(), parameters: p, identity: found.identity, files: found.files, cursor: found.cursor, pending_attempts: 0, observations: [], finished: false };
    saveState(args.out, state);
    const next = await claudeNext(args.out);
    return { started: true, out: args.out, identity: found.identity, ...next };
  } catch (error) {
    const report = unavailableReport(identity, p, error.message);
    writeOutputs(args.out, report);
    return { started: false, action: 'done', status: 'unavailable', reason: error.message, report: path.join(args.out, 'report.json'), summary: path.join(args.out, 'summary.md') };
  }
}

function stepArgs(argv) {
  const [command, ...rest] = argv, args = { out: null, seconds: null, 'poll-s': 120, reason: null, unavailable: null };
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i].replace(/^--/, '');
    if (!rest[i].startsWith('--') || !Object.hasOwn(args, key)) throw new Error(`Unknown option ${rest[i]}`);
    const value = rest[++i];
    if (!value) throw new Error(`--${key} needs a value`);
    args[key] = ['seconds', 'poll-s'].includes(key) ? Number(value) : value;
  }
  if (!args.out) throw new Error(`${command} requires --out DIR`);
  return { command, ...args };
}

async function runStep(argv, io = {}) {
  const a = stepArgs(argv);
  if (a.command === 'next') return claudeNext(a.out);
  if (a.command === 'record') return claudeRecord(a.out, { pollS: a['poll-s'] }, io);
  if (a.command === 'wait') return claudeWait(a.out, a.seconds, io);
  return claudeFinish(a.out, { unavailable: a.unavailable, reason: a.reason ?? 'cancelled' });
}

async function main(argv, io = {}) {
  if (STEP_COMMANDS.includes(argv[0])) {
    const result = await runStep(argv, io);
    (io.stdout ?? process.stdout).write(JSON.stringify(result) + '\n');
    return 0;
  }
  const args = parseArgs(argv);
  const p = parameters(Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, args[k]])));
  if (args['dry-run']) {
    const plan = { dry_run: true, tool: args.tool, mode: args.mode, session: args.session, invoking_session: args['invoking-session'], parameters: p, limitation: 'Plan only; identity, usage, permissions and interference not yet verified.' };
    if (args.tool === 'claude') plan.claude_limitations = claudeLimitations(args.mode);
    process.stdout.write(JSON.stringify(plan) + '\n');
    return 0;
  }
  if (args.inspect) {
    const identity = args.tool === 'claude'
      ? new ClaudeTranscripts({ session: args.session, invokingSession: args['invoking-session'], mode: args.mode, projects: args.projects }, io).identify().identity
      : await new OpenCodeAdapter({ session: args.session, invokingSession: args['invoking-session'], mode: args.mode, log: args.log }).identify();
    if (args.tool === 'claude') validateIdentity(identity);
    process.stdout.write(JSON.stringify({ identity, parameters: p, output: args.out, warning: 'Billable requests; silence in target required; no settings will be changed.' }) + '\n');
    return 0;
  }
  if (!args['acknowledge-consumption']) throw new Error('Warn about billable usage and silence, then supply --acknowledge-consumption after explicit user consent');
  if (args.tool === 'claude') {
    const started = await claudeStart(args, p, io);
    process.stdout.write(JSON.stringify(started) + '\n');
    return started.started ? 0 : 1;
  }
  // One invocation owns a new output directory; partial results are never
  // appended to a different model's run or overwritten by a repeated command.
  fs.mkdirSync(args.out, { mode: 0o700 });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  let report;
  const identity = { tool: args.tool, mode: args.mode, session: args.session, invoking_session: args['invoking-session'] };
  try {
    const adapter = new OpenCodeAdapter({ session: args.session, invokingSession: args['invoking-session'], mode: args.mode, log: args.log });
    report = await measure(adapter, p, { signal: controller.signal, onSample: sample => fs.appendFileSync(path.join(args.out, 'results.jsonl'), JSON.stringify(sample) + '\n', { mode: 0o600 }) });
  } catch (error) {
    report = unavailableReport(identity, p, error.message);
  } finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
  writeOutputs(args.out, report);
  process.stdout.write(`REPORT ${path.join(args.out, 'report.json')}\nSUMMARY ${path.join(args.out, 'summary.md')}\n`);
  return report.status === 'completed' ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 2; });
module.exports = { parseArgs, main, runStep, claudeStart, claudeNext, claudeRecord, claudeWait, claudeFinish, replay };

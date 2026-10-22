'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { modelKey, validateIdentity } = require('./engine');
const exec = promisify(execFile);

async function api(method, route, body) {
  const args = ['api', method, route];
  if (body) args.push('--data', JSON.stringify(body));
  const { stdout } = await exec('opencode', args, { timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function opencodeUsage(row) {
  const t = row.tokens;
  if (row.type !== 'assistant' || !Number.isFinite(t?.cache?.read) || !Number.isFinite(t?.input) || !Number.isFinite(row.time?.created) || !Number.isFinite(row.time?.completed)) throw new Error('OpenCode per-request usage or completion timing is unavailable');
  return { id: row.id, model: row.model, cache_read: t.cache.read, input: t.input, created_ms: row.time.created };
}

const CLAUDE_PROVIDER = 'anthropic';
// The description given to the background wait command; its completion
// notification carries it, which is how a wait is told apart from any other
// background task of the session.
const WAIT_LABEL = 'cache-ttl-wait';

// One transcript line of an assistant response. A request is written as several
// lines that share message.id; any of them may carry the usage.
function claudeUsage(row) {
  const t = row.message?.usage;
  if (row.type !== 'assistant' || typeof row.message?.model !== 'string' || !Number.isFinite(t?.cache_read_input_tokens) || !Number.isFinite(t?.input_tokens)) throw new Error('Claude Code per-request cache usage is unavailable');
  const written = key => Number.isFinite(t.cache_creation?.[key]) ? t.cache_creation[key] : null;
  return { id: row.message.id ?? null, model: row.message.model, cache_read: t.cache_read_input_tokens, input: t.input_tokens, cache_5m: written('ephemeral_5m_input_tokens'), cache_1h: written('ephemeral_1h_input_tokens') };
}

// The Claude Code mechanism is driven by the model in the session, so these are
// standing limitations of every run, not reasons for refusing one.
function claudeLimitations(mode) {
  const common = [
    'Claude Code measurement runs from inside the session: the model performs each wait and the reactivation (main) or the SendMessage continuation (subagent) is the probe; the session is reserved and any other message invalidates the sample in flight.',
    'A background wait can be stopped by Claude Code (status killed, for example under memory pressure); such a sample is incomplete, never a MISS.',
    'Each probe is a full model turn over the whole conversation, which costs more than an opencode probe.',
    'Intervals use transcript timestamps, from the request before each probe to the probe request, never the requested wait time.',
  ];
  return mode === 'subagent' ? [...common, 'The subagent effort level is not recorded in the transcript: only its model is verified, so effort is an unverified limitation.'] : common;
}

function parseTranscript(text) {
  const lines = text.split('\n'), rows = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try { rows.push(JSON.parse(line)); } catch {
      // A line still being written can only be the last one.
      if (lines.slice(index + 1).some(l => l.trim())) throw new Error(`Transcript line ${index + 1} is not valid JSON`);
    }
  });
  return rows;
}

function contentText(content) {
  if (typeof content === 'string') return content;
  return Array.isArray(content) ? content.map(b => typeof b === 'string' ? b : b?.text ?? '').join('\n') : '';
}

function rowText(row) {
  return contentText(row.message?.content) || contentText(row.attachment?.prompt);
}

function isToolResult(row) {
  const content = row.message?.content;
  return Array.isArray(content) && content.length > 0 && content.every(b => b?.type === 'tool_result');
}

function notificationOf(row) {
  const origin = row.origin ?? row.attachment?.origin;
  if (origin?.kind !== 'task-notification') return null;
  const text = rowText(row);
  const tag = name => text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1].trim() ?? null;
  return { tool_use_id: tag('tool-use-id'), status: tag('status'), summary: tag('summary') ?? '' };
}

// Collapse the lines of one response into a request: earliest timestamp, the
// latest usage any line carried, and the tool calls it issued.
function transcriptRequests(rows) {
  const byId = new Map(), requests = [];
  rows.forEach((row, index) => {
    if (row.type !== 'assistant' || !row.message || row.message.model === '<synthetic>' || row.isApiErrorMessage) return;
    const key = row.message.id ?? `row-${index}`;
    let request = byId.get(key);
    if (!request) { request = { id: key, model: row.message.model, first: index, last: index, ts: Date.parse(row.timestamp), usage: null, tool_uses: new Set() }; byId.set(key, request); requests.push(request); }
    request.last = index;
    if (typeof row.message.model === 'string') request.model = row.message.model;
    const ts = Date.parse(row.timestamp);
    if (Number.isFinite(ts) && !(ts >= request.ts)) request.ts = ts;
    if (Array.isArray(row.message.content)) for (const block of row.message.content) if (block?.type === 'tool_use' && block.id) request.tool_uses.add(block.id);
    try { request.usage = claudeUsage(row); } catch { /* a later line of the request may carry it */ }
  });
  return requests;
}

// Classify what happened between two rows of the measured target: the one
// expected trigger of the probe, interference, and context seen on the probe turn.
function classifyEvents(rows, from, to, isExpected) {
  const result = { expected: 0, interference: [], observations: [] };
  for (let i = Math.max(from + 1, 0); i < to; i++) {
    const row = rows[i], note = notificationOf(row);
    if (row.type === 'user' && isToolResult(row)) continue;
    if (row.type === 'user' || (row.type === 'attachment' && (note || row.attachment?.type === 'queued_command'))) {
      if (isExpected(row)) result.expected++;
      else result.interference.push(row.isCompactSummary ? 'automatic compaction' : note ? 'another task notification' : row.type === 'attachment' ? 'queued input' : 'user message');
    } else if (row.type === 'system' && /compact/.test(row.subtype ?? '')) result.interference.push('automatic compaction');
    else if (row.type === 'attachment' && /^hook_/.test(row.attachment?.type ?? '')) result.observations.push(`Hook-added context on the probe turn (${row.attachment.hookName ?? row.attachment.type}); not interference.`);
  }
  return result;
}

function cacheBucket(usage) {
  if (!usage || usage.cache_5m === null || usage.cache_1h === null) return null;
  if (usage.cache_5m > 0 && usage.cache_1h > 0) return 'ephemeral_5m+ephemeral_1h';
  return usage.cache_1h > 0 ? 'ephemeral_1h' : usage.cache_5m > 0 ? 'ephemeral_5m' : 'none-written';
}

function claudeProjectsRoot(env = process.env) {
  return path.join(env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects');
}

// Locates and reads the transcripts of the invoking session and, in subagent
// mode, of the child. Every selection is by exact identifier: no match, several
// matches or a transcript naming another session is unavailable, never the
// closest candidate.
class ClaudeTranscripts {
  constructor({ session, invokingSession, mode, projects }, io = {}) {
    const id = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
    if (![session, invokingSession].every(s => typeof s === 'string' && id.test(s))) throw new Error('Explicit unambiguous Claude Code session IDs are required');
    if (!['main', 'subagent'].includes(mode)) throw new Error('Explicit main or subagent mode is required');
    this.session = session; this.invokingSession = invokingSession; this.mode = mode;
    this.projects = projects ?? claudeProjectsRoot();
    this.now = io.now ?? Date.now;
  }
  locate() {
    let folders;
    try { folders = fs.readdirSync(this.projects, { withFileTypes: true }).filter(d => d.isDirectory()); } catch { throw new Error('The Claude Code projects folder is not readable; transcripts are unavailable'); }
    const main = folders.map(d => path.join(this.projects, d.name, `${this.invokingSession}.jsonl`)).filter(f => fs.existsSync(f));
    if (main.length !== 1) throw new Error(main.length ? 'More than one transcript names the invoking session; the target is ambiguous' : 'No transcript names the invoking Claude Code session; the target is unavailable');
    const files = { main: main[0], child: null };
    if (this.mode === 'subagent') {
      files.child = path.join(path.dirname(main[0]), this.invokingSession, 'subagents', `agent-${this.session}.jsonl`);
      if (!fs.existsSync(files.child)) throw new Error('No subagent transcript exists for the requested agent under the invoking session; the target is unavailable');
    }
    return files;
  }
  load(file) {
    const rows = parseTranscript(fs.readFileSync(file, 'utf8'));
    const owner = rows.find(r => r.sessionId)?.sessionId;
    if (owner !== undefined && owner !== this.invokingSession) throw new Error('The transcript belongs to a different session than the invoking one');
    if (file === this.files?.child && rows.some(r => r.agentId && r.agentId !== this.session)) throw new Error('The subagent transcript belongs to a different agent');
    return { rows, requests: transcriptRequests(rows) };
  }
  identify() {
    this.files = this.locate();
    const main = this.load(this.files.main);
    const mainRequest = main.requests.findLast(r => r.usage);
    if (!mainRequest) throw new Error('Claude Code transcript usage fields (cache_read_input_tokens, input_tokens) are unavailable for the invoking session');
    const model = id => ({ providerID: CLAUDE_PROVIDER, id });
    const cursor = { main: main.rows.length, child: 0 };
    let identity;
    if (this.mode === 'main') identity = { tool: 'claude', mode: 'main', session: this.session, invoking_session: this.invokingSession, parent_session: null, model: model(mainRequest.model), parent_model: model(mainRequest.model) };
    else {
      const child = this.load(this.files.child), childRequest = child.requests.findLast(r => r.usage);
      if (!childRequest) throw new Error('The subagent has no completed request with transcript usage fields; run it once before measuring');
      cursor.child = child.rows.length;
      identity = { tool: 'claude', mode: 'subagent', session: this.session, invoking_session: this.invokingSession, parent_session: this.invokingSession, model: model(childRequest.model), parent_model: model(mainRequest.model) };
    }
    return { identity, files: this.files, cursor };
  }
  // Reads the one sample that has finished since the saved cursors. The result
  // is { pending }, or { observation, cursor } where an observation is a probe
  // with its usage or one explicit reason it is not a measurement.
  observe(state, attempts) {
    this.files = state.files;
    const main = this.load(state.files.main);
    const note = main.rows.map((row, index) => ({ index, note: index >= state.cursor.main ? notificationOf(row) : null })).find(n => n.note?.summary.includes(WAIT_LABEL));
    if (!note) return { pending: 'The wait has not finished: its completion notification is not in the session transcript yet.' };
    const cursor = { main: note.index + 1, child: state.cursor.child };
    const exitCode = note.note.summary.match(/exit code (-?\d+)/)?.[1];
    if (note.note.status !== 'completed' || (exitCode !== undefined && exitCode !== '0')) {
      const killed = note.note.status === 'killed';
      return { observation: { incomplete: true, killed, error: `The background wait ended without completing (status ${note.note.status ?? 'unknown'}); the sample is incomplete, not a MISS` }, cursor };
    }
    const target = state.mode === 'main' ? main : this.load(state.files.child);
    let trigger, from;
    if (state.mode === 'main') {
      trigger = note.index;
      const launch = main.requests.find(r => note.note.tool_use_id && r.tool_uses.has(note.note.tool_use_id));
      from = launch ? launch.last : state.cursor.main - 1;
    } else {
      const text = state.parameters['probe-text'];
      trigger = target.rows.findIndex((row, index) => index >= state.cursor.child && row.type === 'user' && !isToolResult(row) && rowText(row).includes(text));
      if (trigger < 0) return { pending: 'The probe continuation has not reached the subagent transcript yet.' };
      from = state.cursor.child - 1;
      cursor.child = target.rows.length;
    }
    const index = target.requests.findIndex(r => r.first > trigger);
    if (index < 0) return { pending: 'The probe request has not reached the transcript yet.' };
    const probe = target.requests[index], anchor = target.requests[index - 1];
    const fail = error => ({ observation: { error }, cursor });
    if (!anchor) return fail('No request precedes the probe, so the waiting interval cannot be measured');
    const events = classifyEvents(target.rows, from, probe.first, row => row === target.rows[trigger]);
    const later = target.requests[index + 1];
    const lastWrite = Math.max(0, ...target.rows.slice(probe.first).map(r => Date.parse(r.timestamp)).filter(Number.isFinite));
    // The probe usage is read on the next request. A subagent has none, so its
    // transcript must instead have been quiet since the probe finished.
    if (!later && (state.mode === 'main' ? attempts < 2 : this.now() - lastWrite < 5000)) return { pending: 'The probe usage is read on the next request or once the transcript is quiet; call record again.' };
    if (events.interference.length) return fail(`Interference on the measured target during the sample: ${[...new Set(events.interference)].join(', ')}`);
    if (events.expected !== 1) return fail('The probe was not triggered by exactly one benchmark wait or continuation');
    if (!probe.usage) return fail('The probe usage fields are absent from the transcript; the sample is invalid, not a MISS');
    return { observation: { row_id: probe.id, model: probe.model, anchor_ms: anchor.ts, created_ms: probe.ts, cache_read: probe.usage.cache_read, input: probe.usage.input, cache_bucket: cacheBucket(probe.usage), anchor_cache_bucket: cacheBucket(anchor.usage), notes: events.observations }, cursor };
  }
}

// The engine's adapter on Claude Code: it replays the probes recorded so far.
// The model, not this process, performs every wait and probe, so a sample the
// transcript does not hold yet ends the replay and names the wait still to do.
class ClaudeReplayAdapter {
  constructor(state, clock, abort) {
    this.state = state; this.clock = clock; this.abort = abort;
    this.index = 0; this.pending = null;
  }
  async identify() { return this.state.identity; }
  async snapshot() {
    const next = this.state.observations[this.index];
    return { anchor_ms: next?.anchor_ms ?? this.clock.now() };
  }
  async assertUnchanged(before) {
    if (this.index < this.state.observations.length) return;
    this.pending = { gap_s: (this.clock.now() - before.anchor_ms) / 1000 };
    this.abort();
  }
  async probe() {
    const recorded = this.state.observations[this.index++];
    if (!recorded) throw new Error('No recorded probe');
    if (recorded.error) {
      if (recorded.incomplete) this.abort();
      throw new Error(recorded.error);
    }
    this.clock.t = Math.max(this.clock.now(), recorded.created_ms);
    const next = this.state.observations[this.index];
    return { id: recorded.row_id, model: { providerID: CLAUDE_PROVIDER, id: recorded.model }, cache_read: recorded.cache_read, input: recorded.input, created_ms: recorded.created_ms, snapshot: { anchor_ms: next?.anchor_ms ?? this.clock.now() }, limitations: [] };
  }
}

class OpenCodeAdapter {
  constructor({ session, invokingSession, mode, log }, io = {}) {
    if (![session, invokingSession].every(s => typeof s === 'string' && /^ses_[A-Za-z0-9_-]+$/.test(s))) throw new Error('Explicit unambiguous OpenCode session IDs are required');
    if (!['main', 'subagent'].includes(mode)) throw new Error('Explicit main or subagent mode is required');
    this.session = session; this.invokingSession = invokingSession; this.mode = mode;
    this.api = io.api ?? api;
    this.readLog = io.readLog ?? (() => fs.readFileSync(log, 'utf8'));
    this.now = io.now ?? Date.now;
    this.sleep = io.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  }
  async identify() {
    const { data: target } = await this.api('get', `/api/session/${this.session}`);
    const { data: parent } = this.session === this.invokingSession ? { data: target } : await this.api('get', `/api/session/${this.invokingSession}`);
    if (target?.id !== this.session || parent?.id !== this.invokingSession || target.fork) throw new Error('Requested session identity or native category cannot be verified');
    const identity = { tool: 'opencode', mode: this.mode, session: this.session, invoking_session: this.invokingSession, parent_session: target.parentID ?? null, model: target.model, parent_model: parent.model };
    validateIdentity(identity);
    // An unreadable log is a compatibility limitation, never zero warming.
    this.readLog();
    this.identity = identity;
    return identity;
  }
  async snapshot() {
    const response = await this.api('get', `/api/session/${this.session}/message?limit=1000&order=desc`);
    const rows = response.data;
    if (!Array.isArray(rows) || !rows.length || rows.some(r => !r.id || !r.time)) throw new Error('OpenCode message-list schema unavailable');
    // Ignore idle markers only: they do not invoke the provider.
    const messages = rows.filter(r => r.type !== 'idle').sort((a, b) => a.time.created - b.time.created || a.id.localeCompare(b.id));
    const last = messages.at(-1);
    opencodeUsage(last);
    if (last.finish !== 'stop' || last.error || last.retry || last.content?.some(c => c.type !== 'text' && c.type !== 'reasoning')) throw new Error('Target is not quiet after a completed plain-text response');
    const log = this.readLog();
    // The idle interval begins at completion, not when polling starts. Include
    // warming between that completion and our first snapshot in the evidence.
    this.checkAnchorWarming(log, last.time.completed);
    return { rows: messages, anchor_ms: last.time.completed, fingerprint: JSON.stringify(messages), log };
  }
  checkAnchorWarming(log, anchor) {
    for (const line of log.split('\n')) {
      if (!line.includes(this.session) || !/warming session|keep.?alive/i.test(line)) continue;
      let stamp = line.match(/\btimestamp=([^\s]+)/)?.[1];
      if (!stamp && line.startsWith('{')) {
        try { stamp = JSON.parse(line).timestamp; } catch { /* reported below */ }
      }
      if (typeof stamp !== 'string') throw new Error('Warming evidence has no interpretable timestamp');
      if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(stamp)) stamp += 'Z';
      const ms = Date.parse(stamp);
      if (!Number.isFinite(ms)) throw new Error('Warming evidence has no interpretable timestamp');
      if (ms >= anchor) throw new Error('Cache-warming interference since the completion anchor');
    }
  }
  async ready({ deadline, signal }) {
    const timeout = Math.min(deadline, this.now() + 90000);
    let previous = null, stable = this.now();
    while (this.now() < timeout && !signal?.aborted) {
      try {
        const snap = await this.snapshot();
        if (snap.fingerprint === previous && this.now() - stable >= 4000) return snap;
        if (snap.fingerprint !== previous) { previous = snap.fingerprint; stable = this.now(); }
      } catch (error) {
        if (!/not quiet|usage or completion timing/.test(error.message)) throw error;
        previous = null; stable = this.now();
      }
      await this.sleep(Math.min(1000, timeout - this.now()));
    }
    throw new Error('Target did not become quiet before cancellation or startup limit');
  }
  warmingChanged(before, after) {
    if (!after.startsWith(before)) throw new Error('Warming log rotated or was truncated; interference cannot be verified');
    if (after.slice(before.length).split('\n').some(line => line.includes(this.session) && /warming session|keep.?alive/i.test(line))) throw new Error('Cache-warming interference observed');
  }
  async assertUnchanged(before, identity) {
    const current = await this.identify();
    if (modelKey(current.model) !== modelKey(identity.model)) throw new Error('Model or variant changed');
    const snap = await this.snapshot();
    if (snap.fingerprint !== before.fingerprint) throw new Error('Additional interaction or compaction disturbed the waiting interval');
    this.warmingChanged(before.log, snap.log);
  }
  async probe(text, { before, identity, deadline, signal }) {
    if (signal?.aborted || this.now() >= deadline) throw new Error('Cancelled or duration limit reached before submission');
    const { data: admitted } = await this.api('post', `/api/session/${this.session}/prompt`, { text });
    if (!admitted?.id || admitted.sessionID !== this.session) throw new Error('Probe admission did not identify the requested session');
    const seen = new Set(before.rows.map(r => r.id));
    const timeout = Math.min(deadline, this.now() + 240000);
    while (this.now() < timeout && !signal?.aborted) {
      try {
        const snap = await this.snapshot();
        const added = snap.rows.filter(r => !seen.has(r.id));
        if (added.some(r => !['user', 'assistant'].includes(r.type))) throw new Error('Compaction or session event during probe');
        if (added.filter(r => r.type === 'user').some(r => r.id !== admitted.id || r.text !== text)) throw new Error('Additional user interaction during probe');
        const assistants = added.filter(r => r.type === 'assistant');
        if (assistants.length > 1) throw new Error('Multiple provider requests during probe');
        if (assistants.length === 1 && added.some(r => r.id === admitted.id)) {
          const row = assistants[0], result = opencodeUsage(row);
          if (modelKey(row.model) !== modelKey(identity.model)) throw new Error('Probe used a different model or variant');
          const { data: current } = await this.api('get', `/api/session/${this.session}`);
          if (modelKey(current?.model) !== modelKey(identity.model)) throw new Error('Session model changed during probe');
          if (!snap.rows.some(r => r.id === before.rows.at(-1).id)) throw new Error('Original history anchor was lost');
          const retained = snap.rows.filter(r => seen.has(r.id));
          const expected = before.rows.filter(r => retained.some(old => old.id === r.id));
          if (JSON.stringify(retained) !== JSON.stringify(expected)) throw new Error('Existing history changed during probe');
          this.warmingChanged(before.log, snap.log);
          if (row.content?.filter(c => c.type === 'text').map(c => c.text).join('').trim() !== 'OK') throw new Error('Probe did not return exactly OK');
          return { ...result, snapshot: snap, limitations: [] };
        }
      } catch (error) {
        // Incomplete output is expected while a request streams. Every other
        // error is evidence against validity, not a reason to retry a request.
        if (!/not quiet|usage or completion timing/.test(error.message)) throw error;
      }
      await this.sleep(Math.min(1000, timeout - this.now()));
    }
    throw new Error(signal?.aborted ? 'Cancelled; an already admitted request may still finish' : 'Probe result timeout; no retry submitted');
  }
}

module.exports = { OpenCodeAdapter, opencodeUsage, claudeUsage, claudeLimitations, ClaudeTranscripts, ClaudeReplayAdapter, parseTranscript, transcriptRequests, classifyEvents, cacheBucket, claudeProjectsRoot, CLAUDE_PROVIDER, WAIT_LABEL };

'use strict';

const fs = require('node:fs');
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

function claudeUsage(row) {
  const t = row.message?.usage;
  if (row.type !== 'assistant' || typeof row.message?.model !== 'string' || !Number.isFinite(t?.cache_read_input_tokens) || !Number.isFinite(t?.input_tokens)) throw new Error('Claude Code per-request cache usage is unavailable');
  return { model: row.message.model, cache_read: t.cache_read_input_tokens, input: t.input_tokens };
}

// Resume restores a transcript, not proof that the request remains in the
// native main/subagent TTL bucket. Reject before any paid CLI or SDK request.
function claudeLimitation(mode) {
  return `Claude Code ${mode} measurement unavailable: no validated interface here submits timed probes to the existing native ${mode} conversation and correlates its per-request usage while preserving its cache category. claude -p --resume and a new SDK session are not equivalent evidence. No request was sent and no settings were changed.`;
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

module.exports = { OpenCodeAdapter, opencodeUsage, claudeUsage, claudeLimitation };

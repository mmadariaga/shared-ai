'use strict';

// Claude Code side of the context-cache benchmark. Transcripts are fixtures in
// the shape Claude Code writes and time is simulated: no billable measurement,
// no real wait and no model request runs here.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { measure, parameters } = require('../skills/universal/sai-context-cache-ttl-benchmark/engine');
const { claudeStart, claudeNext, claudeRecord, claudeWait, claudeFinish } = require('../skills/universal/sai-context-cache-ttl-benchmark/cache_ttl');

const SKILL = path.resolve(__dirname, '../skills/universal/sai-context-cache-ttl-benchmark');
const MODEL = 'claude-sonnet-5-5';
const SESSION = '0a1b2c3d-4e5f-4061-8a9b-0c1d2e3f4a5b';
const AGENT = 'a1b2c3d4e5f607182';
const T0 = Date.parse('2026-10-22T08:00:00.000Z');

class Session {
  constructor(t, { mode = 'main', childModel = MODEL, mainModel = MODEL, project = 'C--Projects-demo' } = {}) {
    this.root = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-benchmark-claude-'));
    this.projects = path.join(this.root, 'projects');
    this.mode = mode; this.t = t; this.n = 0; this.mainModel = mainModel; this.childModel = childModel;
    this.dir = path.join(this.projects, project);
    fs.mkdirSync(path.join(this.dir, SESSION, 'subagents'), { recursive: true });
    this.rows = []; this.child = [];
    this.request('main', { read: 1000 });
    if (mode === 'subagent') this.request('child', { read: 5000 });
  }
  now = () => this.t;
  iso = () => new Date(this.t).toISOString();
  id = prefix => `${prefix}_${++this.n}`;
  list = who => who === 'main' ? this.rows : this.child;
  push(who, row) { this.list(who).push(who === 'child' ? { sessionId: SESSION, agentId: AGENT, isSidechain: true, ...row } : { sessionId: SESSION, isSidechain: false, ...row }); this.flush(); }
  flush() {
    fs.writeFileSync(path.join(this.dir, `${SESSION}.jsonl`), this.rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    if (this.mode === 'subagent') fs.writeFileSync(path.join(this.dir, SESSION, 'subagents', `agent-${AGENT}.jsonl`), this.child.map(r => JSON.stringify(r)).join('\n') + '\n');
  }
  // One request becomes two lines that share message.id, as the transcript writes it.
  request(who, { read = 0, input = 6, w5 = 0, w1 = 0, toolUse = null, text = 'OK', model, noUsage = false, lines = 2 } = {}) {
    const id = this.id('msg');
    const usage = noUsage ? { output_tokens: 1 } : { input_tokens: input, cache_read_input_tokens: read, output_tokens: 4, cache_creation_input_tokens: w5 + w1, cache_creation: { ephemeral_5m_input_tokens: w5, ephemeral_1h_input_tokens: w1 } };
    for (let i = 0; i < lines; i++) {
      this.push(who, { type: 'assistant', timestamp: new Date(this.t + i * 40).toISOString(), message: { id, model: model ?? (who === 'main' ? this.mainModel : this.childModel), role: 'assistant', content: [toolUse && i === lines - 1 ? { type: 'tool_use', id: toolUse, name: 'Bash', input: {} } : { type: 'text', text }], stop_reason: null, usage } });
    }
    return id;
  }
  toolResult(who, toolUseId) { this.push(who, { type: 'user', timestamp: this.iso(), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content: 'ok' }] } }); }
  userMessage(who, text, extra = {}) { this.push(who, { type: 'user', timestamp: this.iso(), message: { role: 'user', content: text }, ...extra }); }
  notification(toolUseId, status = 'completed') {
    const summary = status === 'completed' ? 'Background command "cache-ttl-wait" completed (exit code 0)' : `Background command "cache-ttl-wait" was ${status}`;
    this.push('main', { type: 'user', origin: { kind: 'task-notification' }, timestamp: this.iso(), message: { role: 'user', content: `<task-notification>\n<task-id>b9</task-id>\n<tool-use-id>${toolUseId}</tool-use-id>\n<status>${status}</status>\n<summary>${summary}</summary>\n</task-notification>` } });
  }
  foreignNotification() {
    this.push('main', { type: 'user', origin: { kind: 'task-notification' }, timestamp: this.iso(), message: { role: 'user', content: '<task-notification>\n<task-id>zz</task-id>\n<tool-use-id>toolu_other</tool-use-id>\n<status>completed</status>\n<summary>Background command "build" completed (exit code 0)</summary>\n</task-notification>' } });
  }
  hook() { this.push('main', { type: 'attachment', timestamp: this.iso(), attachment: { type: 'hook_success', hookName: 'UserPromptSubmit', hookEvent: 'UserPromptSubmit', content: 'extra context' } }); }
  cleanup() { fs.rmSync(this.root, { recursive: true, force: true }); }
}

function startArgs(session, mode, out) {
  return { tool: 'claude', mode, session: mode === 'main' ? SESSION : AGENT, 'invoking-session': SESSION, out, projects: session.projects };
}

// The model's side of the protocol: start the wait, end the turn, wake up on the
// notification (main) or send the continuation (subagent), then record.
async function playSample(s, step, { read, latency = 6000, hooks = false, interfere = null, status = 'completed', lateUsage = false, subagentLatency = 6000 } = {}) {
  const call = s.id('toolu');
  s.request('main', { toolUse: call }); s.t += 300; s.toolResult('main', call);
  s.t += 1500; s.request('main', { text: 'Waiting.' });
  if (interfere === 'user-during-wait') { s.t += 20000; s.userMessage('main', 'hello there'); s.t += 1000; s.request('main', { text: 'hi' }); }
  s.t += step.seconds * 1000 + latency;
  if (interfere === 'foreign-notification') s.foreignNotification();
  if (interfere === 'compaction') s.push('main', { type: 'system', subtype: 'compact_boundary', timestamp: s.iso() });
  s.notification(call, status);
  if (status !== 'completed') return;
  if (hooks) s.hook();
  if (s.mode === 'main') {
    s.t += 1000; s.request('main', { read: read(step.seconds), w1: 120, noUsage: lateUsage });
    return { afterProbe: () => { s.t += 2000; const next = s.id('toolu'); s.request('main', { toolUse: next, text: 'recording' }); s.toolResult('main', next); } };
  }
  s.t += 500; s.request('main', { text: 'sending' });
  s.t += 1000;
  if (interfere === 'child-user') { s.userMessage('child', 'unrelated question'); s.t += 200; s.request('child', { text: 'answer' }); s.t += 20000; }
  s.userMessage('child', step.message);
  s.t += 400;
  s.request('child', { read: read(step.seconds), w5: 90, noUsage: lateUsage });
  s.t += subagentLatency;
  return { afterProbe: () => {} };
}

async function drive(s, mode, options = {}, overrides = {}) {
  const out = path.join(s.root, `run-${mode}-${Math.random().toString(16).slice(2)}`);
  const p = parameters({ repeats: 1, cap: 20, ...overrides });
  let result = await claudeStart(startArgs(s, mode, out), p, { now: s.now });
  const calls = [];
  for (let guard = 0; result.action !== 'done' && guard < 400; guard++) {
    assert.equal(result.action, 'wait');
    calls.push(result.seconds);
    const sample = await playSample(s, result, options);
    if (!sample) { result = await claudeRecord(out, { pollS: 0 }, { now: s.now, sleep: async () => {} }); continue; }
    result = await claudeRecord(out, { pollS: 0 }, { now: s.now, sleep: async () => {} });
    if (result.action === 'pending') { sample.afterProbe(); result = await claudeRecord(out, { pollS: 0 }, { now: s.now, sleep: async () => {} }); }
  }
  return { out, result, calls, report: fs.existsSync(path.join(out, 'report.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8')) : null };
}

const ttlRead = ttl => target => target < ttl ? 3000 : 0;

function opencodeLoop({ ttl }) {
  let time = T0, anchor = time, calls = 0;
  const clock = { now: () => time, sleep: async ms => { time += ms; } };
  const model = { providerID: 'anthropic', id: MODEL };
  const adapter = {
    identify: async () => ({ tool: 'opencode', mode: 'main', session: 'ses_a', invoking_session: 'ses_a', parent_session: null, model, parent_model: model }),
    snapshot: async () => ({ anchor_ms: anchor }),
    assertUnchanged: async () => {},
    probe: async (text, { before }) => {
      calls++; const created = time, elapsed = (time - before.anchor_ms) / 1000;
      time += 100; anchor = time;
      return { id: `a${calls}`, model, cache_read: ttlRead(ttl)(elapsed), input: 6, created_ms: created, snapshot: { anchor_ms: anchor }, limitations: [] };
    },
  };
  return { adapter, clock };
}

test('Claude Code main: the step protocol reaches the same decisions as the opencode loop', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const claude = await drive(s, 'main', { read: ttlRead(400) });
  assert.equal(claude.report.status, 'completed');
  const o = opencodeLoop({ ttl: 400 });
  const reference = await measure(o.adapter, parameters({ repeats: 1, cap: 20 }), { clock: o.clock });
  const decisions = r => r.samples.map(x => [x.rep, x.phase, x.target_gap_s, x.hit]);
  assert.deepEqual(decisions(claude.report), decisions(reference));
  assert.equal(claude.report.observation.kind, reference.observation.kind);
  assert.equal(claude.report.ttl_estimates_s.length, reference.ttl_estimates_s.length);
  assert.deepEqual(claude.report.repetitions.map(r => r.ttl_bracket_targets_s), reference.repetitions.map(r => r.ttl_bracket_targets_s));
  assert.deepEqual(claude.calls, claude.report.samples.map(x => x.target_gap_s));
  assert.equal(claude.report.tool, 'claude'); assert.equal(claude.report.mode, 'main');
  assert.deepEqual(claude.report.model, { providerID: 'anthropic', id: MODEL });
});

test('Claude Code subagent: the step protocol reaches the same decisions as the opencode loop', async t => {
  const s = new Session(T0, { mode: 'subagent' }); t.after(() => s.cleanup());
  const claude = await drive(s, 'subagent', { read: ttlRead(400) }, { repeats: 2 });
  const o = opencodeLoop({ ttl: 400 });
  const reference = await measure(o.adapter, parameters({ repeats: 2, cap: 20 }), { clock: o.clock });
  const decisions = r => r.samples.map(x => [x.rep, x.phase, x.target_gap_s, x.hit]);
  assert.equal(claude.report.status, 'completed');
  assert.deepEqual(decisions(claude.report), decisions(reference));
  assert.equal(claude.report.mode, 'subagent');
  assert.equal(claude.report.invoking_session, SESSION); assert.equal(claude.report.session, AGENT);
  assert.ok(claude.report.limitations.some(l => /effort/.test(l)), 'effort is reported as an unverified limitation');
});

test('E1 the target is the exact invoking session or the run is unavailable', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const run = async (mutate, options = {}) => {
    const out = path.join(s.root, `e1-${Math.random().toString(16).slice(2)}`);
    mutate?.();
    return claudeStart({ ...startArgs(s, 'main', out), ...options }, parameters({}), { now: s.now });
  };
  const missing = await run(null, { session: 'ffffffff-0000-4000-8000-000000000000', 'invoking-session': 'ffffffff-0000-4000-8000-000000000000' });
  assert.equal(missing.status, 'unavailable'); assert.match(missing.reason, /No transcript names the invoking/);
  const unsubstituted = await run(null, { session: '${CLAUDE_SESSION_ID}', 'invoking-session': '${CLAUDE_SESSION_ID}' });
  assert.match(unsubstituted.reason, /Explicit unambiguous/);
  fs.mkdirSync(path.join(s.projects, 'C--other-project'));
  fs.copyFileSync(path.join(s.dir, `${SESSION}.jsonl`), path.join(s.projects, 'C--other-project', `${SESSION}.jsonl`));
  const ambiguous = await run();
  assert.match(ambiguous.reason, /More than one transcript/);
  fs.rmSync(path.join(s.projects, 'C--other-project'), { recursive: true });
  const foreign = fs.readFileSync(path.join(s.dir, `${SESSION}.jsonl`), 'utf8').replaceAll(SESSION, 'other-session');
  fs.writeFileSync(path.join(s.dir, `${SESSION}.jsonl`), foreign);
  assert.match((await run()).reason, /different session/);
  const report = JSON.parse(fs.readFileSync(path.join(s.root, fs.readdirSync(s.root).find(n => n.startsWith('e1-')), 'report.json'), 'utf8'));
  assert.equal(report.status, 'unavailable'); assert.equal(report.probes, 0);
});

test('E1 a subagent target is a child of the invoking session and is never the closest match', async t => {
  const s = new Session(T0, { mode: 'subagent' }); t.after(() => s.cleanup());
  const out = path.join(s.root, 'wrong-agent');
  const result = await claudeStart({ ...startArgs(s, 'subagent', out), session: 'a0000000000000000' }, parameters({}), { now: s.now });
  assert.equal(result.status, 'unavailable'); assert.match(result.reason, /No subagent transcript/);
  const same = await claudeStart({ ...startArgs(s, 'subagent', path.join(s.root, 'same')), session: SESSION }, parameters({}), { now: s.now });
  assert.equal(same.status, 'unavailable');
});

test('E2 a subagent on another model stops the run with a report and never switches the model', async t => {
  const s = new Session(T0, { mode: 'subagent', childModel: 'claude-haiku-4-5' }); t.after(() => s.cleanup());
  const out = path.join(s.root, 'mismatch');
  const result = await claudeStart(startArgs(s, 'subagent', out), parameters({}), { now: s.now });
  assert.equal(result.status, 'unavailable'); assert.match(result.reason, /same model and variant/);
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  assert.equal(report.probes, 0); assert.equal(report.model, null);
});

test('E2 a model change during the run invalidates that sample', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const out = path.join(s.root, 'switch');
  const started = await claudeStart(startArgs(s, 'main', out), parameters({ repeats: 1, cap: 20 }), { now: s.now });
  s.mainModel = 'claude-opus-5-5';
  await playSample(s, started, { read: () => 3000 });
  let result = await claudeRecord(out, {}, { now: s.now });
  s.t += 2000; s.request('main', { text: 'next' });
  result = await claudeRecord(out, {}, { now: s.now });
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  assert.equal(result.action, 'done'); assert.equal(report.status, 'incomplete');
  assert.equal(report.samples[0].valid, false); assert.match(report.samples[0].limitations[0], /Model or variant changed/);
});

test('E3 absent transcript usage fields make the run unavailable and name what is missing', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const stripped = fs.readFileSync(path.join(s.dir, `${SESSION}.jsonl`), 'utf8').replaceAll('cache_read_input_tokens', 'renamed_tokens');
  fs.writeFileSync(path.join(s.dir, `${SESSION}.jsonl`), stripped);
  const result = await claudeStart(startArgs(s, 'main', path.join(s.root, 'no-usage')), parameters({}), { now: s.now });
  assert.equal(result.status, 'unavailable'); assert.match(result.reason, /transcript usage fields/);
});

test('E3 a missing background-notification or SendMessage capability is reported by name', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  for (const capability of ['background command notifications', 'SendMessage continuation']) {
    const out = path.join(s.root, capability.split(' ')[0]);
    await claudeStart(startArgs(s, 'main', out), parameters({ repeats: 1, cap: 20 }), { now: s.now });
    const done = await claudeFinish(out, { unavailable: `missing ${capability}` });
    assert.equal(done.status, 'unavailable');
    const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
    assert.match(report.limitations[0], new RegExp(capability)); assert.equal(report.probes, 0);
  }
});

test('E4 other requests on the target during a sample invalidate it, hook context does not', async t => {
  for (const [mode, interfere] of [['main', 'user-during-wait'], ['main', 'foreign-notification'], ['main', 'compaction'], ['subagent', 'child-user']]) {
    const s = new Session(T0, { mode }); t.after(() => s.cleanup());
    const run = await drive(s, mode, { read: () => 3000, interfere });
    assert.equal(run.report.status, 'incomplete', `${mode}/${interfere}`);
    assert.equal(run.report.samples[0].valid, false, `${mode}/${interfere}`);
    assert.match(run.report.samples[0].limitations[0], /Interference/, `${mode}/${interfere}`);
    assert.equal(run.report.stop_reason, 'adapter-error');
  }
  const s = new Session(T0); t.after(() => s.cleanup());
  const run = await drive(s, 'main', { read: ttlRead(400), hooks: true });
  assert.equal(run.report.status, 'completed');
  assert.ok(run.report.samples.every(x => x.valid));
  assert.ok(run.report.samples[0].observations.some(o => /Hook-added context/.test(o)));
  assert.match(fs.readFileSync(path.join(run.out, 'summary.md'), 'utf8'), /Hook-added context/);
});

test('E5 all HIT is a lower bound and no HIT is an upper bound through the Claude protocol', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const all = await drive(s, 'main', { read: () => 3000 });
  assert.equal(all.report.observation.kind, 'lower-bound'); assert.equal(all.report.ttl_range_s, null);
  assert.deepEqual(all.calls, [240, 540, 840, 1140, 1200]);
  const none = new Session(T0); t.after(() => none.cleanup());
  const miss = await drive(none, 'main', { read: () => 0 });
  assert.equal(miss.report.observation.kind, 'upper-bound');
  assert.deepEqual(miss.calls, [240, 60, 30, 15]);
});

test('E6 a stopped background wait leaves an incomplete sample, keeps earlier samples and names the launch option', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const out = path.join(s.root, 'killed');
  const p = parameters({ repeats: 1, cap: 20 });
  let step = await claudeStart(startArgs(s, 'main', out), p, { now: s.now });
  const sample = await playSample(s, step, { read: () => 3000 });
  assert.equal((await claudeRecord(out, {}, { now: s.now })).action, 'pending');
  sample.afterProbe();
  step = await claudeRecord(out, {}, { now: s.now });
  assert.equal(step.action, 'wait');
  await playSample(s, step, { read: () => 3000, status: 'killed' });
  const done = await claudeRecord(out, {}, { now: s.now });
  assert.equal(done.action, 'done'); assert.equal(done.status, 'incomplete');
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  assert.equal(report.stop_reason, 'wait-ended-early');
  assert.equal(report.samples[0].valid, true); assert.equal(report.samples[0].hit, true);
  assert.equal(report.samples[1].valid, false); assert.equal(report.samples[1].hit, null);
  assert.equal(report.observation.kind, 'lower-bound');
  assert.ok(report.limitations.some(l => /CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1/.test(l) && /never sets it/.test(l)));
});

test('E6 cancelling keeps the valid samples and marks the report incomplete', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const out = path.join(s.root, 'cancel');
  const p = parameters({ repeats: 1, cap: 20 });
  let step = await claudeStart(startArgs(s, 'main', out), p, { now: s.now });
  const sample = await playSample(s, step, { read: () => 3000 });
  await claudeRecord(out, {}, { now: s.now }); sample.afterProbe();
  await claudeRecord(out, {}, { now: s.now });
  const done = await claudeFinish(out, { reason: 'cancelled' });
  assert.equal(done.status, 'incomplete');
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  assert.equal(report.stop_reason, 'cancelled'); assert.equal(report.samples.length, 1); assert.equal(report.probes, 1);
  assert.equal(JSON.parse(JSON.stringify(await claudeRecord(out, {}, { now: s.now }))).action, 'done');
});

test('E7 the skill states the cost, the run time and the reserved session before the first probe, and consent is required', () => {
  const skill = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
  for (const needle of [/explicit consent/i, /full model turn over the whole conversation/, /session is reserved/, /invalidates/, /expected run time|about 15\.5 hours/]) assert.match(skill, needle);
  assert.throws(() => execFileSync(process.execPath, [path.join(SKILL, 'cache_ttl.js'), '--tool', 'claude', '--mode', 'main', '--session', SESSION, '--invoking-session', SESSION, '--out', path.join(os.tmpdir(), 'never-created')], { stdio: 'pipe' }), error => error.status === 2 && /consent/.test(error.stderr.toString()));
});

test('E8 the probe usage is read on the next request, and absent usage is invalid, never a MISS', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const out = path.join(s.root, 'late');
  let step = await claudeStart(startArgs(s, 'main', out), parameters({ repeats: 1, cap: 20 }), { now: s.now });
  const sample = await playSample(s, step, { read: () => 0, lateUsage: true });
  const first = await claudeRecord(out, {}, { now: s.now });
  assert.equal(first.action, 'pending'); assert.match(first.reason, /next request|late/);
  sample.afterProbe();
  const second = await claudeRecord(out, {}, { now: s.now });
  assert.equal(second.action, 'done');
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  assert.equal(report.samples[0].valid, false); assert.equal(report.samples[0].hit, null);
  assert.match(report.samples[0].limitations[0], /usage fields are absent/);
  assert.notEqual(report.observation.kind, 'upper-bound');
});

test('E8 intervals come from transcript timestamps and each sample records its cache bucket', async t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const run = await drive(s, 'main', { read: ttlRead(400), latency: 9000 }, { cap: 20 });
  for (const sample of run.report.samples) {
    assert.ok(sample.actual_gap_s > sample.target_gap_s, 'the actual interval is not the requested wait');
    assert.ok(Math.abs(sample.actual_gap_s - sample.target_gap_s - 10) < 0.5, `${sample.actual_gap_s} includes reactivation latency and the probe delay`);
    assert.equal(sample.cache_bucket, 'ephemeral_1h');
  }
  assert.deepEqual(run.report.cache_buckets, ['ephemeral_1h', 'none-written'].filter(b => run.report.cache_buckets.includes(b)));
  const sub = new Session(T0, { mode: 'subagent' }); t.after(() => sub.cleanup());
  const child = await drive(sub, 'subagent', { read: ttlRead(400) });
  assert.ok(child.report.samples.every(x => x.cache_bucket === 'ephemeral_5m'));
  assert.match(fs.readFileSync(path.join(child.out, 'summary.md'), 'utf8'), /Observed cache bucket: .*ephemeral_5m/);
});

test('the wait ends only an interval after the last request of the target', async t => {
  const s = new Session(T0, { mode: 'main' }); t.after(() => s.cleanup());
  const out = path.join(s.root, 'wait');
  await claudeStart(startArgs(s, 'main', out), parameters({}), { now: s.now });
  const last = Date.parse(JSON.parse(fs.readFileSync(path.join(s.dir, `${SESSION}.jsonl`), 'utf8').trim().split('\n').at(-1)).timestamp);
  let clock = last + 1000; const sleeps = [];
  const result = await claudeWait(out, 30, { now: () => clock, sleep: async ms => { sleeps.push(ms); clock += ms; } });
  assert.ok(clock >= last - 40 + 30000); assert.equal(result.waited, true);
  assert.ok(clock - (last - 40 + 30000) < 1500, 'it does not overshoot by more than a polling step');
  // A reply written while the command runs moves the due time past it.
  clock = last + 1000; let injected = false;
  await claudeWait(out, 5, { now: () => clock, sleep: async ms => { clock += ms; if (!injected && clock > last + 3000) { injected = true; s.t = clock; s.request('main', { text: 'late reply' }); } } });
  assert.ok(injected); assert.ok(clock >= s.t + 5000);
});

test('the command line plans, starts, replays and reports through next and record', t => {
  const s = new Session(T0); t.after(() => s.cleanup());
  const runner = path.join(SKILL, 'cache_ttl.js'), out = path.join(s.root, 'cli');
  const flags = ['--tool', 'claude', '--mode', 'main', '--session', SESSION, '--invoking-session', SESSION, '--projects', s.projects];
  const dry = JSON.parse(execFileSync(process.execPath, [runner, ...flags, '--out', out, '--dry-run'], { encoding: 'utf8' }));
  assert.equal(dry.dry_run, true); assert.ok(dry.claude_limitations.length); assert.ok(!fs.existsSync(out));
  const inspected = JSON.parse(execFileSync(process.execPath, [runner, ...flags, '--out', out, '--inspect'], { encoding: 'utf8' }));
  assert.deepEqual(inspected.identity.model, { providerID: 'anthropic', id: MODEL }); assert.ok(!fs.existsSync(out));
  const started = JSON.parse(execFileSync(process.execPath, [runner, ...flags, '--out', out, '--acknowledge-consumption'], { encoding: 'utf8' }));
  assert.equal(started.action, 'wait'); assert.equal(started.seconds, 240); assert.equal(started.probe, 'reactivation');
  assert.equal(started.wait_description, 'cache-ttl-wait'); assert.match(started.wait_args, /^wait --out .* --seconds 240$/);
  const { started: _s, out: _o, identity: _i, ...step } = started;
  assert.deepEqual(JSON.parse(execFileSync(process.execPath, [runner, 'next', '--out', out], { encoding: 'utf8' })), step);
  const pending = JSON.parse(execFileSync(process.execPath, [runner, 'record', '--out', out], { encoding: 'utf8' }));
  assert.equal(pending.action, 'pending');
  assert.throws(() => execFileSync(process.execPath, [runner, 'next', '--out', path.join(s.root, 'nothing')], { stdio: 'pipe' }), error => error.status === 2);
  const state = JSON.parse(fs.readFileSync(path.join(out, 'state.json'), 'utf8'));
  assert.equal(state.identity.tool, 'claude'); assert.equal(fs.statSync(path.join(out, 'state.json')).mode & 0o077, process.platform === 'win32' ? fs.statSync(path.join(out, 'state.json')).mode & 0o077 : 0);
});

test('the Claude command profile grants background shell, Agent and SendMessage; opencode is unchanged', () => {
  const { expandInstallManifest } = require('../bin/install-manifest');
  const { translate } = require('../bin/capabilities');
  const manifest = require('../sai/install-manifest.json');
  const profile = name => translate(manifest.capabilities, name, 'claude');
  const claude = profile('context-cache-benchmark-command');
  assert.match(claude.tools, /\bAgent\b/); assert.match(claude.tools, /\bSendMessage\b/); assert.match(claude.tools, /\bBash\b/);
  assert.ok(claude.allowedTools.split(', ').some(t => /^Bash\(.*cache_ttl\.js:\*\)$/.test(t)));
  const opencode = translate(manifest.capabilities, 'context-cache-benchmark-command', 'opencode');
  assert.ok(!opencode.nativeActions.includes('SendMessage'));
  assert.ok(expandInstallManifest);
});

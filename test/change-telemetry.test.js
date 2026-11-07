'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { collect, main } = require('../sai/tools/change-telemetry');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'change-telemetry.js');
const { DatabaseSync } = (() => { try { return require('node:sqlite'); } catch { return {}; } })();
const sqliteTest = (name, fn) => test(name, { skip: !DatabaseSync && 'node:sqlite is not available in this runtime' }, fn);

const SESSION_COLUMNS = 'id text primary key, project_id text, parent_id text, agent text, title text, directory text NOT NULL, time_created integer NOT NULL';
const MESSAGE_COLUMNS = 'id text primary key, session_id text NOT NULL, type text NOT NULL, seq integer NOT NULL, time_created integer NOT NULL, data text NOT NULL';
const BASE = Date.parse('2026-02-01T10:00:00.000Z');
const at = seconds => BASE + seconds * 1000;
const envelope = (name, args) => `Fetch the card.\n\nInvocationEnvelope:\n  command_name: ${name}\n  arguments_value: ${args}\n\n<!-- User customizations below this line -->`;

// A scratch project, its opencode data home, and a builder for the database.
function scratch() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'change-telemetry-'));
  const project = path.join(base, 'project');
  const data = path.join(base, 'data');
  fs.mkdirSync(path.join(project, 'openspec', 'changes', 'demo'), { recursive: true });
  fs.mkdirSync(path.join(data, 'opencode'), { recursive: true });
  const env = { XDG_DATA_HOME: data };
  const file = path.join(data, 'opencode', 'opencode.db');
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE session_v2 (${SESSION_COLUMNS}); CREATE TABLE session_message (${MESSAGE_COLUMNS});`);
  const insertSession = db.prepare('INSERT INTO session_v2 (id, parent_id, agent, title, directory, time_created) VALUES (?, ?, ?, ?, ?, ?)');
  const insertMessage = db.prepare('INSERT INTO session_message (id, session_id, type, seq, time_created, data) VALUES (?, ?, ?, ?, ?, ?)');
  let seq = 0;
  const api = {
    base, project, env, file, db,
    session: (id, parent, agent, seconds, directory = project) => insertSession.run(id, parent, agent, `title ${id}`, directory, at(seconds)),
    user: (session, seconds, text) => insertMessage.run(`msg_${++seq}`, session, 'user', seq, at(seconds), JSON.stringify({ text })),
    invoke: (session, seconds, name, args) => { api.user(session, seconds, envelope(name, args)); return `msg_${seq}`; },
    // `data` overrides any field; `null` removes it. The request spans `length` seconds.
    request: (session, seconds, { tokens, cost, model, variant, content = [], length = 2, done = true, drop = [] } = {}) => {
      const data = { time: { created: at(seconds), ...(done ? { completed: at(seconds + length) } : {}) }, agent: 'x', content };
      if (tokens !== null) data.tokens = tokens ?? { input: 10, output: 5, reasoning: 1, cache: { read: 100, write: 20 } };
      if (cost !== null) data.cost = cost ?? 0.5;
      if (model !== null) data.model = { id: model ?? 'model-a', providerID: 'p', ...(variant === null ? {} : { variant: variant ?? 'high' }) };
      for (const field of drop) delete data[field];
      insertMessage.run(`msg_${++seq}`, session, 'assistant', seq, at(seconds), JSON.stringify(data));
    },
    close: () => { db.close(); fs.rmSync(base, { recursive: true, force: true }); },
  };
  return api;
}

const tool = (name, status = 'completed', input = {}, content = []) => ({ type: 'tool', id: `call_${name}`, name, state: { status, input, content } });
const dispatch = (sessionId, name = 'task') => ({ type: 'tool', id: `call_${sessionId}`, name, state: { status: 'completed', input: {}, metadata: { sessionId }, content: [] } });
const options = (fixture, extra = {}) => ({ harness: 'opencode', command: 'sai-plan', change: 'demo', cwd: fixture.project, status: 'completed', ...extra });
const telemetryOf = (fixture, relative = 'openspec/changes/demo/telemetry.md') => fs.readFileSync(path.join(fixture.project, relative), 'utf8');
const section = (text, heading) => text.split(/^### /m).find(part => part.startsWith(heading)) ?? '';
const rowOf = (text, agent) => text.split('\n').find(line => line.startsWith(`| ${agent} |`));

function planFixture() {
  const f = scratch();
  f.session('ses_root', null, 'build', 0);
  f.invoke('ses_root', 1, 'plan', 'demo');
  f.request('ses_root', 2, { tokens: { input: 100, output: 10, reasoning: 0, cache: { read: 0, write: 50 } }, cost: 0.25, content: [tool('read'), tool('read'), tool('grep'), dispatch('ses_spec')] });
  f.request('ses_root', 3, { tokens: { input: 20, output: 2, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.5, content: [tool('bash', 'error')] });
  f.request('ses_root', 4, { done: false, content: [tool('read')] });
  f.session('ses_spec', 'ses_root', 'sai-1-spec-proposal-worker', 5);
  f.request('ses_spec', 6, { tokens: { input: 30, output: 3, reasoning: 1, cache: { read: 300, write: 10 } }, cost: 1, content: [tool('write'), tool('websearch'), dispatch('ses_helper', 'subagent')] });
  f.request('ses_spec', 8, { tokens: { input: 31, output: 4, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 2 });
  f.session('ses_helper', 'ses_spec', 'budget-explorer', 7);
  f.request('ses_helper', 7, { tokens: { input: 5, output: 1, reasoning: 0, cache: { read: 50, write: 0 } }, cost: 0 });
  return f;
}

// ---------------------------------------------------------------------------
// Claude Code: the same collection from the session transcripts
// ---------------------------------------------------------------------------

const claudeIso = seconds => new Date(BASE + seconds * 1000).toISOString();
const SPLIT_USAGE = (input, output, read, write5m = 0, write1h = 0) => ({ input_tokens: input, output_tokens: output, cache_read_input_tokens: read, cache_creation_input_tokens: write5m + write1h, cache_creation: { ephemeral_5m_input_tokens: write5m, ephemeral_1h_input_tokens: write1h } });

// A scratch project and its Claude Code config folder, with a builder for the transcripts.
function claudeScratch() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'change-telemetry-claude-'));
  const project = path.join(base, 'project');
  const config = path.join(base, 'config');
  fs.mkdirSync(path.join(project, 'openspec', 'changes', 'demo'), { recursive: true });
  const folder = path.join(config, 'projects', project.replace(/[^A-Za-z0-9]/g, '-'));
  fs.mkdirSync(folder, { recursive: true });
  let seq = 0;
  const tails = new Map();
  const uuid = () => `00000000-0000-0000-0000-${String(++seq).padStart(12, '0')}`;
  const write = (file, row) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.appendFileSync(file, `${JSON.stringify(row)}\n`); };
  const api = {
    base, project, folder, env: { CLAUDE_CONFIG_DIR: config },
    root: id => path.join(folder, `${id}.jsonl`),
    agent: (root, id) => path.join(folder, root, 'subagents', `agent-${id}.jsonl`),
    meta: (root, id, meta) => { const file = path.join(folder, root, 'subagents', `agent-${id}.meta.json`); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(meta)); },
    // A slash command typed by the user; returns the record's uuid.
    command: (file, session, seconds, name, args = '') => {
      const id = uuid();
      write(file, { type: 'user', uuid: id, parentUuid: tails.get(file) ?? null, timestamp: claudeIso(seconds), sessionId: session, message: { role: 'user', content: `<command-name>/${name}</command-name>\n<command-message>${name}</command-message>\n<command-args>${args}</command-args>` } });
      tails.set(file, id);
      return id;
    },
    user: (file, session, seconds, text) => {
      const id = uuid();
      write(file, { type: 'user', uuid: id, parentUuid: tails.get(file) ?? null, timestamp: claudeIso(seconds), sessionId: session, message: { role: 'user', content: text } });
      tails.set(file, id);
    },
    // One request: a first line at `seconds`, one line per tool call at `seconds + length`, and a result
    // for each call unless the request is still running. `duplicate` repeats the last line of the message.
    request: (file, session, seconds, { usage = SPLIT_USAGE(10, 5, 100, 15, 5), tools = [], length = 2, pending = false, duplicate = false, model = 'claude-test' } = {}) => {
      const messageId = `msg_${++seq}`;
      const message = content => ({ id: messageId, role: 'assistant', model, stop_reason: tools.length ? 'tool_use' : 'end_turn', content, ...(usage ? { usage } : {}) });
      let previous = uuid();
      write(file, { type: 'assistant', uuid: previous, parentUuid: tails.get(file) ?? null, timestamp: claudeIso(seconds), sessionId: session, message: message([{ type: 'text', text: 'x' }]) });
      const ids = [];
      for (const call of tools) {
        const id = uuid();
        ids.push(call.id ?? `toolu_${id.slice(-6)}`);
        write(file, { type: 'assistant', uuid: id, parentUuid: previous, timestamp: claudeIso(seconds + length), sessionId: session, message: message([{ type: 'tool_use', id: ids.at(-1), name: call.name, input: call.input ?? {} }]) });
        previous = id;
      }
      if (duplicate) { const id = uuid(); write(file, { type: 'assistant', uuid: id, parentUuid: previous, timestamp: claudeIso(seconds + length), sessionId: session, message: message([{ type: 'text', text: 'x' }]) }); previous = id; }
      tails.set(file, previous);
      if (!pending) tools.forEach((call, index) => {
        const id = uuid();
        write(file, { type: 'user', uuid: id, parentUuid: tails.get(file), timestamp: claudeIso(seconds + length + 0.5), sessionId: session, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: ids[index], content: 'result', ...(call.error ? { is_error: true } : {}) }] } });
        tails.set(file, id);
      });
      return ids;
    },
    close: () => fs.rmSync(base, { recursive: true, force: true }),
  };
  return api;
}

const use = (name, input = {}, extra = {}) => ({ name, input, ...extra });
const claudeOptions = (fixture, extra = {}) => ({ harness: 'claude', command: 'sai-plan', change: 'demo', cwd: fixture.project, status: 'completed', ...extra });
const metricCells = (text, area, agent) => {
  const cells = rowOf(section(text, area), agent).split(' | ').map(value => value.replace(/^\| /, '').replace(/ \|$/, '').trim());
  const names = ['agent', 'model', 'variant', 'requests', 'input', 'output', 'reasoning', 'cacheRead', 'cacheWrite', 'cacheMisses', 'cost', 'time', 'toolCalls', 'toolErrors', 'subagents', 'tools'];
  return Object.fromEntries(names.map((name, index) => [name, cells[index]]));
};

// A /sai-plan run in one Claude Code session: a spec worker that dispatches a helper and is continued once.
function claudePlanFixture() {
  const f = claudeScratch();
  const root = f.root('cs-root');
  f.command(root, 'cs-root', 1, 'sai-plan', 'demo');
  f.request(root, 'cs-root', 2, { usage: SPLIT_USAGE(100, 10, 0, 50, 0), duplicate: true, tools: [use('Read'), use('Read'), use('Grep'), use('Agent', { subagent_type: 'sai-1-spec-proposal-worker' }, { id: 'toolu_spec' })] });
  f.request(root, 'cs-root', 6, { usage: SPLIT_USAGE(20, 2, 0), tools: [use('Bash', {}, { error: true })] });
  f.request(root, 'cs-root', 10, { tools: [use('Bash', { command: 'node change-telemetry.js collect' })], pending: true });
  f.meta('cs-root', 'aspec', { agentType: 'sai-1-spec-proposal-worker', toolUseId: 'toolu_spec', spawnDepth: 1 });
  const spec = f.agent('cs-root', 'aspec');
  f.request(spec, 'cs-root', 5, { usage: SPLIT_USAGE(30, 3, 300, 10, 0), tools: [use('Write', { file_path: `${f.project}/openspec/changes/demo/proposal.md` }), use('WebSearch'), use('SendMessage'), use('Agent', {}, { id: 'toolu_helper' })] });
  f.request(spec, 'cs-root', 9, { usage: SPLIT_USAGE(31, 4, 0) });
  f.meta('cs-root', 'ahelper', { agentType: 'budget-explorer', toolUseId: 'toolu_helper', parentAgentId: 'aspec', spawnDepth: 2 });
  f.request(f.agent('cs-root', 'ahelper'), 'cs-root', 7, { usage: SPLIT_USAGE(5, 1, 50) });
  return f;
}

test('claude collect: a direct /sai-plan is measured from its transcripts, with no cost, reasoning, or variant (E4, E5, E6, E7)', () => {
  const f = claudePlanFixture();
  try {
    const result = collect(claudeOptions(f), { env: f.env });
    assert.deepEqual(result, { outcome: 'written', path: 'openspec/changes/demo/telemetry.md', message: 'Change telemetry written to openspec/changes/demo/telemetry.md (execution 1).' });
    const text = telemetryOf(f);
    assert.match(text, /## Execution 1 — \/sai-plan — completed/);
    assert.match(text, /Session: cs-root · Harness: Claude Code/);
    assert.match(text, /Claude Code transcripts record no cost, reasoning, or variant/);
    // The repeated line of one message.id is one request; the request still running is left out.
    const coordinator = metricCells(text, 'Coordinator', 'sai-plan');
    assert.deepEqual(coordinator, { agent: 'sai-plan', model: 'claude-test', variant: 'unavailable', requests: '2', input: '120', output: '12', reasoning: 'unavailable', cacheRead: '0', cacheWrite: '50', cacheMisses: '1', cost: 'unavailable', time: '7s', toolCalls: '4', toolErrors: '1', subagents: '1', tools: 'Read×2, Bash×1, Grep×1' });
    // Cache write sums the 5-minute and 1-hour creation tokens; a SendMessage continuation dispatches nothing.
    const spec = metricCells(text, 'Spec', 'sai-1-spec-proposal-worker');
    assert.deepEqual({ requests: spec.requests, input: spec.input, cacheRead: spec.cacheRead, cacheWrite: spec.cacheWrite, toolCalls: spec.toolCalls, subagents: spec.subagents, cost: spec.cost }, { requests: '2', input: '61', cacheRead: '300', cacheWrite: '10', toolCalls: '3', subagents: '1', cost: 'unavailable' });
    assert.equal(spec.tools, 'SendMessage×1, WebSearch×1, Write×1');
    const helper = metricCells(text, 'Spec', '↳ budget-explorer');
    assert.equal(helper.requests, '1');
    assert.equal(helper.cacheRead, '50');
    const total = text.split('\n').find(line => /^\| ≥?\d/.test(line));
    assert.match(total, /unavailable/);
    assert.ok(!/\$\d/.test(text), 'no cost figure appears');
  } finally { f.close(); }
});

test('claude collect: a cache write without the 5-minute and 1-hour split is the unsplit value (E5), and a missing usage is unavailable', () => {
  const f = claudeScratch();
  try {
    const root = f.root('cs-root');
    f.command(root, 'cs-root', 1, 'sai-plan', 'demo');
    f.request(root, 'cs-root', 2, { usage: { input_tokens: 7, output_tokens: 3, cache_read_input_tokens: 0, cache_creation_input_tokens: 42 } });
    f.request(root, 'cs-root', 5, { usage: null });
    f.request(root, 'cs-root', 8, { pending: true, tools: [use('Bash')] });
    assert.equal(collect(claudeOptions(f), { env: f.env }).outcome, 'written');
    const coordinator = metricCells(telemetryOf(f), 'Coordinator', 'sai-plan');
    assert.equal(coordinator.requests, '2');
    assert.equal(coordinator.cacheWrite, '≥42');
    assert.equal(coordinator.input, '≥7');
  } finally { f.close(); }
});

test('claude collect: a dispatch whose subagent is not recorded is an unavailable row and a partial total (E7)', () => {
  const f = claudeScratch();
  try {
    const root = f.root('cs-root');
    f.command(root, 'cs-root', 1, 'sai-plan', 'demo');
    f.request(root, 'cs-root', 2, { tools: [use('Agent', {}, { id: 'toolu_ghost' })] });
    f.request(root, 'cs-root', 6, { pending: true, tools: [use('Bash')] });
    collect(claudeOptions(f), { env: f.env });
    assert.match(telemetryOf(f), /unavailable \(session toolu_ghost is not in the Claude Code transcripts\) \| unavailable \| unavailable \| unavailable/);
  } finally { f.close(); }
});

test('claude collect: the latest execution of the command on that change wins, and another change is never mixed in', () => {
  const f = claudeScratch();
  try {
    const old = f.root('cs-old');
    f.command(old, 'cs-old', 1, 'sai-plan', 'demo');
    f.request(old, 'cs-old', 2, { usage: SPLIT_USAGE(1, 1, 0) });
    const root = f.root('cs-new');
    f.command(root, 'cs-new', 100, 'sai-plan', 'other-change');
    f.request(root, 'cs-new', 101, { usage: SPLIT_USAGE(900, 1, 0) });
    f.command(root, 'cs-new', 200, 'model');
    f.command(root, 'cs-new', 201, 'sai-plan', 'demo');
    f.request(root, 'cs-new', 202, { usage: SPLIT_USAGE(2, 1, 0) });
    f.request(root, 'cs-new', 205, { pending: true, tools: [use('Bash')] });
    collect(claudeOptions(f), { env: f.env });
    const text = telemetryOf(f);
    assert.match(text, /Session: cs-new/);
    assert.equal(metricCells(text, 'Coordinator', 'sai-plan').input, '2');
  } finally { f.close(); }
});

test('claude collect: a change named only by the files its workers wrote is found', () => {
  const f = claudeScratch();
  try {
    const root = f.root('cs-root');
    f.command(root, 'cs-root', 1, 'sai-plan', '--block-file /tmp/x/block.md --block-hash abc');
    f.request(root, 'cs-root', 2, { tools: [use('Write', { file_path: `${f.project}/openspec/changes/demo/proposal.md` })] });
    f.request(root, 'cs-root', 6, { pending: true, tools: [use('Bash')] });
    assert.equal(collect(claudeOptions(f), { env: f.env }).outcome, 'written');
  } finally { f.close(); }
});

test('claude collect: a missing or unreadable transcript folder skips with the reason and writes nothing (E2)', () => {
  const f = claudeScratch();
  try {
    const result = collect(claudeOptions(f), { env: { CLAUDE_CONFIG_DIR: path.join(f.base, 'elsewhere') } });
    assert.equal(result.outcome, 'skipped');
    assert.match(result.reason, /No readable Claude Code transcript folder was found/);
    assert.ok(!fs.existsSync(path.join(f.project, 'openspec', 'changes', 'demo', 'telemetry.md')));
  } finally { f.close(); }
});

test('claude collect: an execution that is not in the session transcripts skips and writes no section (E3)', () => {
  const f = claudePlanFixture();
  try {
    const result = collect(claudeOptions(f, { command: 'sai-build' }), { env: f.env });
    assert.equal(result.outcome, 'skipped');
    assert.match(result.reason, /No Claude Code execution of \/sai-build on demo/);
    assert.ok(!fs.existsSync(path.join(f.project, 'openspec', 'changes', 'demo', 'telemetry.md')));
    // /clear starts a new session mid-run: the new transcript holds no invocation of the command.
    const cleared = claudeScratch();
    try {
      cleared.user(cleared.root('cs-cleared'), 'cs-cleared', 1, 'continue the plan');
      cleared.request(cleared.root('cs-cleared'), 'cs-cleared', 2);
      assert.match(collect(claudeOptions(cleared), { env: cleared.env }).reason, /No Claude Code execution of \/sai-plan on demo/);
    } finally { cleared.close(); }
  } finally { f.close(); }
});

test('claude collect: a rerun is idempotent, a foreign telemetry.md is left alone, and a second execution appends (E11)', () => {
  const f = claudePlanFixture();
  try {
    collect(claudeOptions(f, { status: 'stopped' }), { env: f.env });
    const first = telemetryOf(f);
    assert.match(collect(claudeOptions(f), { env: f.env }).reason, /already recorded/);
    assert.equal(telemetryOf(f), first);
    const root = f.root('cs-root');
    f.command(root, 'cs-root', 100, 'sai-plan', 'demo');
    f.request(root, 'cs-root', 101, { usage: SPLIT_USAGE(1, 1, 0) });
    f.request(root, 'cs-root', 105, { pending: true, tools: [use('Bash')] });
    collect(claudeOptions(f, { status: 'blocked' }), { env: f.env });
    const text = telemetryOf(f);
    assert.ok(text.includes(first.slice(first.indexOf('## Execution 1'))), 'the first section is byte-identical');
    assert.match(text, /## Execution 2 — \/sai-plan — blocked/);
    assert.match(text, /Executions: 2/);
    const foreign = path.join(f.project, 'openspec', 'changes', 'demo', 'telemetry.md');
    fs.writeFileSync(foreign, 'my own notes\n');
    assert.match(collect(claudeOptions(f, { status: 'completed' }), { env: f.env }).reason, /was not written by this tool/);
    assert.equal(fs.readFileSync(foreign, 'utf8'), 'my own notes\n');
  } finally { f.close(); }
});

test('claude collect: /sai-build finds its review worker and the findings review.md carries', () => {
  const f = claudeScratch();
  try {
    const root = f.root('cs-root');
    f.command(root, 'cs-root', 1, 'sai-build', 'demo');
    f.request(root, 'cs-root', 2, { tools: [use('Agent', {}, { id: 'toolu_red' })] });
    f.request(root, 'cs-root', 20, { tools: [use('Agent', {}, { id: 'toolu_review' })] });
    f.request(root, 'cs-root', 40, { tools: [use('Agent', {}, { id: 'toolu_fix' })] });
    f.request(root, 'cs-root', 60, { pending: true, tools: [use('Bash')] });
    f.meta('cs-root', 'ared', { agentType: 'sai-3-red-worker', toolUseId: 'toolu_red', spawnDepth: 1 });
    f.request(f.agent('cs-root', 'ared'), 'cs-root', 3, {});
    f.meta('cs-root', 'areview', { agentType: 'sai-4-review-worker', toolUseId: 'toolu_review', spawnDepth: 1 });
    const summary = 'Summary: Critical=0 High=2 Medium=1 Low=0 Questions=0';
    f.request(f.agent('cs-root', 'areview'), 'cs-root', 21, { tools: [use('Write', { file_path: `${f.project}/openspec/changes/demo/review.md`, content: `# Review\n\n${summary}\n` })] });
    f.meta('cs-root', 'afix', { agentType: 'sai-3-green-worker', toolUseId: 'toolu_fix', spawnDepth: 1 });
    f.request(f.agent('cs-root', 'afix'), 'cs-root', 41, {});
    fs.writeFileSync(path.join(f.project, 'openspec', 'changes', 'demo', 'review.md'), `# Review\n\n#### H1 first\n#### H2 second (FIXED)\n#### M1 third (FIXED)\n\n${summary}\n`);
    assert.equal(collect(claudeOptions(f, { command: 'sai-build' }), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f);
    assert.match(section(text, 'Review'), /Findings found: Critical=0 High=2 Medium=1 Low=0 Questions=0 · pending: Critical=0 High=1 Medium=0 Low=0 Questions=0/);
    assert.match(section(text, 'Fix implement'), /sai-3-green-worker/);
    assert.match(section(text, 'Implement'), /sai-3-red-worker/);
  } finally { f.close(); }
});

test('claude collect: a Plan - Unattended route is found through its workers in the explore session', () => {
  const f = claudeScratch();
  try {
    const root = f.root('cs-explore');
    f.command(root, 'cs-explore', 1, 'sai-explore', 'crystallized idea');
    f.request(root, 'cs-explore', 2, { usage: SPLIT_USAGE(1, 1, 0) });
    f.request(root, 'cs-explore', 9, { usage: SPLIT_USAGE(3, 1, 0), tools: [use('Agent', {}, { id: 'toolu_spec' })] });
    f.request(root, 'cs-explore', 20, { usage: SPLIT_USAGE(4, 1, 0) });
    f.request(root, 'cs-explore', 30, { pending: true, tools: [use('Bash')] });
    f.meta('cs-explore', 'aspec', { agentType: 'sai-1-spec-proposal-worker', toolUseId: 'toolu_spec', spawnDepth: 1 });
    f.request(f.agent('cs-explore', 'aspec'), 'cs-explore', 10, { tools: [use('Write', { file_path: `${f.project}/openspec/changes/demo/proposal.md` })] });
    const result = collect(claudeOptions(f, { command: 'sai-explore-plan' }), { env: f.env });
    assert.equal(result.outcome, 'written');
    const text = telemetryOf(f);
    assert.match(text, /## Execution 1 — sai-explore \(Plan - Unattended\) — completed/);
    assert.match(text, /<!-- telemetry-execution cs-explore:aspec -->/);
    // The request before the first worker is outside the window; the closing turn is left out.
    assert.equal(metricCells(text, 'Coordinator', 'sai-explore').requests, '1');
    assert.match(section(text, 'Spec'), /sai-1-spec-proposal-worker/);
    // A direct /sai-plan command is not an in-session route.
    assert.match(collect(claudeOptions(f, { command: 'sai-plan' }), { env: f.env }).reason, /No Claude Code execution of \/sai-plan/);
  } finally { f.close(); }
});

test('claude collect: a Direct Build slice starts after the previous slice and skips the proof of concept worker', () => {
  const f = claudeScratch();
  try {
    const root = f.root('cs-explore');
    f.command(root, 'cs-explore', 1, 'sai-explore', 'idea');
    f.request(root, 'cs-explore', 2, { tools: [use('Agent', {}, { id: 'toolu_poc' })] });
    f.request(root, 'cs-explore', 20, { tools: [use('Agent', {}, { id: 'toolu_archive_a' })] });
    f.request(root, 'cs-explore', 40, { tools: [use('Agent', {}, { id: 'toolu_impl' })] });
    f.request(root, 'cs-explore', 50, { tools: [use('Agent', {}, { id: 'toolu_backfill' })] });
    f.request(root, 'cs-explore', 60, { pending: true, tools: [use('Bash')] });
    f.meta('cs-explore', 'apoc', { agentType: 'sai-direct-build-worker', toolUseId: 'toolu_poc', spawnDepth: 1 });
    f.user(f.agent('cs-explore', 'apoc'), 'cs-explore', 3, '--direct-build --no-specs\n--work-root /tmp/x');
    f.request(f.agent('cs-explore', 'apoc'), 'cs-explore', 4, {});
    f.meta('cs-explore', 'aarchive-a', { agentType: 'sai-archive-worker', toolUseId: 'toolu_archive_a', spawnDepth: 1 });
    f.request(f.agent('cs-explore', 'aarchive-a'), 'cs-explore', 21, { tools: [use('Bash', { command: 'git mv openspec/changes/earlier openspec/changes/archive/2026-02-01-earlier && echo openspec/changes/earlier/' })] });
    f.meta('cs-explore', 'aimpl', { agentType: 'sai-direct-build-worker', toolUseId: 'toolu_impl', spawnDepth: 1 });
    f.request(f.agent('cs-explore', 'aimpl'), 'cs-explore', 41, {});
    f.meta('cs-explore', 'abackfill', { agentType: 'sai-backfill-worker', toolUseId: 'toolu_backfill', spawnDepth: 1 });
    f.request(f.agent('cs-explore', 'abackfill'), 'cs-explore', 51, { tools: [use('Bash', { command: 'node transfer.js materialize openspec/changes/demo/proposal.md' })] });
    assert.equal(collect(claudeOptions(f, { command: 'sai-explore-direct-build' }), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f);
    assert.match(text, /## Execution 1 — sai-explore \(Direct Build - Unattended\) — completed/);
    assert.match(section(text, 'Implement'), /sai-direct-build-worker/);
    assert.match(section(text, 'Backfill'), /sai-backfill-worker/);
    assert.ok(!text.includes('sai-archive-worker'), 'the previous slice stays outside the window');
    assert.equal(text.split('sai-direct-build-worker').length - 1, 1, 'the proof of concept worker is not a slice worker');
  } finally { f.close(); }
});

sqliteTest('claude and opencode executions share one telemetry.md: each section names its harness and a total is partial where a harness lacks a field (E8)', () => {
  const f = planFixture();
  try {
    f.db.close();
    assert.equal(collect(options(f), { env: f.env }).outcome, 'written');
    assert.match(telemetryOf(f), /Session: ses_root · Harness: opencode/);
    const folder = path.join(f.base, 'config', 'projects', f.project.replace(/[^A-Za-z0-9]/g, '-'));
    fs.mkdirSync(folder, { recursive: true });
    const rows = [
      { type: 'user', uuid: 'u-1', parentUuid: null, timestamp: claudeIso(500), sessionId: 'cs-1', message: { role: 'user', content: '<command-name>/sai-plan</command-name>\n<command-args>demo</command-args>' } },
      { type: 'assistant', uuid: 'a-1', parentUuid: 'u-1', timestamp: claudeIso(502), sessionId: 'cs-1', message: { id: 'm-1', role: 'assistant', model: 'claude-test', content: [{ type: 'tool_use', id: 't-1', name: 'Bash', input: {} }], usage: SPLIT_USAGE(1000, 1, 0) } },
    ];
    fs.writeFileSync(path.join(folder, 'cs-1.jsonl'), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
    fs.writeFileSync(path.join(folder, 'cs-0.jsonl'), `${JSON.stringify({ ...rows[0], uuid: 'u-0', sessionId: 'cs-0', timestamp: claudeIso(400) })}\n${JSON.stringify({ ...rows[1], uuid: 'a-0', parentUuid: 'u-0', sessionId: 'cs-0', timestamp: claudeIso(402), message: { ...rows[1].message, id: 'm-0', content: [], usage: SPLIT_USAGE(7, 1, 0) } })}\n`);
    assert.equal(collect(claudeOptions(f), { env: { CLAUDE_CONFIG_DIR: path.join(f.base, 'config') } }).outcome, 'written');
    const text = telemetryOf(f);
    assert.match(text, /## Execution 2 — \/sai-plan — completed/);
    assert.match(text, /Session: cs-1 · Harness: Claude Code/);
    assert.match(text, /Executions: 2/);
    const total = text.split('\n').find(line => /^\| ≥?\d/.test(line));
    // The opencode execution recorded a cost and the Claude Code one did not: the sum is partial.
    assert.match(total, /≥\$3\.7500/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

test('claude explore-origin: the sub-command skips and says why', () => {
  assert.deepEqual(main(['explore-origin', '--harness', 'claude', '--session', 'ses_x']).payload, { outcome: 'skipped', reason: 'Recording the explore origin on Claude Code is not supported yet.' });
});

sqliteTest('collect: a missing database, a missing sqlite, and an unsupported schema each skip with a reason (E3)', () => {
  const f = scratch();
  try {
    f.db.close();
    fs.rmSync(f.file);
    assert.match(collect(options(f), { env: f.env }).reason, /No opencode database was found/);
    const unreadable = () => { throw new Error('no sqlite'); };
    assert.match(collect(options(f), { env: f.env, loadSqlite: unreadable }).reason, /node:sqlite is not available/);
    const other = new DatabaseSync(f.file);
    other.exec('CREATE TABLE session_v2 (id text); CREATE TABLE session_message (id text);');
    other.close();
    assert.match(collect(options(f), { env: f.env }).reason, /lacks the column/);
    assert.ok(!fs.existsSync(path.join(f.project, 'openspec', 'changes', 'demo', 'telemetry.md')));
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: an execution that is not recorded skips and writes no file (E3)', () => {
  const f = planFixture();
  try {
    const result = collect(options(f, { change: 'demo', command: 'sai-build' }), { env: f.env });
    assert.equal(result.outcome, 'skipped');
    assert.match(result.reason, /No opencode execution of \/sai-build on demo/);
    assert.ok(!fs.existsSync(path.join(f.project, 'openspec', 'changes', 'demo', 'telemetry.md')));
    fs.rmSync(path.join(f.project, 'openspec', 'changes', 'demo'), { recursive: true });
    assert.match(collect(options(f), { env: f.env }).reason, /change directory openspec\/changes\/demo\/ was not found/);
  } finally { f.close(); }
});

sqliteTest('collect: reads per-agent figures, counts tool calls apart from dispatches, and marks missing data (E5, E6, E15, E16, E18, E19)', () => {
  const f = planFixture();
  try {
    f.db.close();
    const result = collect(options(f), { env: f.env });
    assert.deepEqual(result, { outcome: 'written', path: 'openspec/changes/demo/telemetry.md', message: 'Change telemetry written to openspec/changes/demo/telemetry.md (execution 1).' });
    const text = telemetryOf(f);
    // E6: the third coordinator request is still running (no completion), so it is the closing turn and is left out.
    const coordinator = rowOf(section(text, 'Coordinator'), 'sai-plan').split(' | ').map(cell => cell.trim());
    assert.deepEqual(coordinator.slice(1, -1), ['model-a', 'high', '2', '120', '12', '0', '0', '50', '1', '$0.7500', '4s', '4', '1', '1']);
    assert.equal(coordinator.at(-1), 'read×2, bash×1, grep×1 |');
    assert.match(text, /closing turn/);
    // E16/E15: the dispatch call is a subagent dispatched and never a tool call; the websearch counts as a call.
    const spec = rowOf(section(text, 'Spec'), 'sai-1-spec-proposal-worker').split(' | ').map(cell => cell.trim());
    assert.deepEqual(spec.slice(1, -1), ['model-a', 'high', '2', '61', '7', '1', '300', '10', '1', '$3.0000', '4s', '2', '0', '1']);
    assert.match(spec.at(-1), /websearch×1, write×1/);
    assert.match(rowOf(section(text, 'Spec'), '↳ budget-explorer'), /\| 1 \| 5 \| 1 \| 0 \| 50 \| 0 \| 0 \| \$0\.0000 \|/);
    // E9: the segment that never started shows as not run.
    assert.match(section(text, 'Design'), /Not run\./);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: a request without tokens, model, variant, cost, or duration is unavailable and its totals partial (E5, E19)', () => {
  const f = scratch();
  try {
    f.session('ses_root', null, 'build', 0);
    f.invoke('ses_root', 1, 'build', 'demo');
    f.request('ses_root', 2, { cost: 1 });
    f.request('ses_root', 4, { tokens: null, cost: null, model: null, drop: ['time'], content: [] });
    f.request('ses_root', 6, { variant: null, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }, done: false });
    f.db.close();
    collect(options(f, { command: 'sai-build' }), { env: f.env });
    const cells = rowOf(section(telemetryOf(f), 'Coordinator'), 'sai-build').split(' | ').map(cell => cell.trim());
    assert.deepEqual(cells.slice(1, 4), ['model-a, unavailable', 'high, unavailable', '2']);
    // A figure the second request lacks is only a lower bound; with no known later request, the misses are unavailable.
    assert.deepEqual(cells.slice(4, 14), ['≥10', '≥5', '≥1', '≥100', '≥20', 'unavailable', '≥$1.0000', '≥2s', '0', '0']);
    assert.match(telemetryOf(f), /Execution 1 — \/sai-build — completed/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: a subagent session that is not in the database is an unavailable row and partial totals (E17)', () => {
  const f = scratch();
  try {
    f.session('ses_root', null, 'build', 0);
    f.invoke('ses_root', 1, 'plan', 'demo');
    f.request('ses_root', 2, { content: [dispatch('ses_gone')] });
    f.request('ses_root', 4, { tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0 });
    f.request('ses_root', 6, { done: false });
    f.db.close();
    collect(options(f), { env: f.env });
    const text = telemetryOf(f);
    assert.match(text, /unavailable \(session ses_gone is not in opencode\.db\) \| unavailable \| unavailable \| unavailable/);
    const total = text.split('\n').find(line => /^\| ≥/.test(line));
    assert.ok(total, 'the change total is partial');
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: the latest execution of the command on that change in that directory wins, and a sibling worktree is never mixed in (E11)', () => {
  const f = scratch();
  try {
    const sibling = path.join(f.base, 'sibling');
    f.session('ses_old', null, 'build', 0);
    f.invoke('ses_old', 1, 'plan', 'demo');
    f.request('ses_old', 2, { cost: 1 });
    f.session('ses_sibling', null, 'build', 100, sibling);
    f.invoke('ses_sibling', 101, 'plan', 'demo');
    f.request('ses_sibling', 102, { cost: 7 });
    f.session('ses_new', null, 'build', 200);
    f.invoke('ses_new', 201, 'plan', 'other-change');
    f.request('ses_new', 202, { cost: 9 });
    f.invoke('ses_new', 300, 'plan', 'demo');
    f.request('ses_new', 301, { cost: 2 });
    f.request('ses_new', 305, { done: false });
    f.db.close();
    collect(options(f), { env: f.env });
    const text = telemetryOf(f);
    assert.match(text, /Session: ses_new/);
    assert.match(rowOf(section(text, 'Coordinator'), 'sai-plan'), /\$2\.0000/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: a change named only by the files its workers wrote is found (block input)', () => {
  const f = scratch();
  try {
    f.session('ses_root', null, 'build', 0);
    f.invoke('ses_root', 1, 'plan', '--block-file /tmp/x/block.md --block-hash abc');
    f.request('ses_root', 2, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/proposal.md` })] });
    f.request('ses_root', 4, { done: false });
    f.db.close();
    assert.equal(collect(options(f), { env: f.env }).outcome, 'written');
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: a second execution appends, leaves the first untouched, and recomputes the total (E4, E7)', () => {
  const f = scratch();
  try {
    f.session('ses_root', null, 'build', 0);
    f.invoke('ses_root', 1, 'plan', 'demo');
    f.request('ses_root', 2, { cost: 1 });
    f.request('ses_root', 4, { done: false });
    f.db.close();
    collect(options(f, { status: 'stopped' }), { env: f.env });
    const first = telemetryOf(f);
    assert.match(first, /## Execution 1 — \/sai-plan — stopped/);
    const again = collect(options(f), { env: f.env });
    assert.match(again.reason, /already recorded/);
    assert.equal(telemetryOf(f), first);
    const db = new DatabaseSync(f.file);
    const insert = db.prepare('INSERT INTO session_message (id, session_id, type, seq, time_created, data) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run('msg_u2', 'ses_root', 'user', 900, at(100), JSON.stringify({ text: envelope('plan', 'demo') }));
    insert.run('msg_a2', 'ses_root', 'assistant', 901, at(101), JSON.stringify({ time: { created: at(101), completed: at(103) }, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 2, model: { id: 'm', variant: 'v' }, content: [] }));
    insert.run('msg_a3', 'ses_root', 'assistant', 902, at(104), JSON.stringify({ time: { created: at(104) }, content: [] }));
    db.close();
    collect(options(f, { status: 'blocked' }), { env: f.env });
    const text = telemetryOf(f);
    assert.ok(text.includes(first.slice(first.indexOf('## Execution 1'))), 'the first section is byte-identical');
    assert.match(text, /## Execution 2 — \/sai-plan — blocked/);
    assert.match(text, /Executions: 2/);
    const total = text.split('\n').find(line => /^\| ≥?\d/.test(line));
    assert.match(total, /\$3\.0000/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: a telemetry.md that this tool did not write is left alone', () => {
  const f = planFixture();
  try {
    f.db.close();
    const file = path.join(f.project, 'openspec', 'changes', 'demo', 'telemetry.md');
    fs.writeFileSync(file, 'my notes\n');
    assert.match(collect(options(f), { env: f.env }).reason, /not written by this tool/);
    assert.equal(fs.readFileSync(file, 'utf8'), 'my notes\n');
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('collect: reading leaves the database unchanged', () => {
  const f = planFixture();
  try {
    f.db.close();
    const digest = () => crypto.createHash('sha256').update(fs.readFileSync(f.file)).digest('hex');
    const before = digest();
    collect(options(f), { env: f.env });
    assert.equal(digest(), before);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

function writeRounds(project, files) {
  const dir = fs.mkdtempSync(path.join(path.dirname(project), 'run-'));
  fs.mkdirSync(path.join(dir, 'reviews'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, 'reviews', name), text);
  return dir;
}

sqliteTest('plan: found counts come from the first round and pending counts from the last; a missing Summary is unavailable (E8, E20)', () => {
  const f = planFixture();
  try {
    f.session('ses_design', 'ses_root', 'sai-2-design-worker', 20);
    f.request('ses_design', 21, { cost: 1 });
    f.db.close();
    const runDir = writeRounds(f.project, {
      'spec-round-1.md': '#### H1\nSummary: High=2 Medium=1 Low=0\n',
      'spec-round-2.md': 'finding\nSummary: High=1 Medium=0 Low=0\n',
      'spec-round-10.md': 'Summary: High=0 Medium=0 Low=3\n',
      'design-round-1.md': 'no tally here\n',
    });
    collect(options(f, { runDir }), { env: f.env });
    const text = telemetryOf(f);
    assert.match(section(text, 'Spec'), /Findings found: High=2 Medium=1 Low=0 · pending: High=0 Medium=0 Low=3/);
    assert.match(section(text, 'Design'), /Findings found: unavailable · pending: unavailable/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('plan: a segment that ends after its first round reports the same counts for both (E20), and no run directory is unavailable', () => {
  const f = planFixture();
  try {
    f.db.close();
    const runDir = writeRounds(f.project, { 'spec-round-1.md': 'Summary: High=0 Medium=2 Low=1\n' });
    collect(options(f, { runDir }), { env: f.env });
    assert.match(section(telemetryOf(f), 'Spec'), /Findings found: High=0 Medium=2 Low=1 · pending: High=0 Medium=2 Low=1/);
    fs.rmSync(path.join(f.project, 'openspec', 'changes', 'demo', 'telemetry.md'));
    collect(options(f), { env: f.env });
    assert.match(section(telemetryOf(f), 'Spec'), /Findings found: unavailable · pending: unavailable/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

// An explore session hosting an in-session route: the route workers write the change.
function routeFixture() {
  const f = scratch();
  f.session('ses_explore', null, 'build', 0);
  f.invoke('ses_explore', 1, 'explore', 'crystallized idea');
  f.request('ses_explore', 2, { tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }, cost: 0.1 });
  f.session('ses_spec', 'ses_explore', 'sai-1-spec-proposal-worker', 10);
  f.request('ses_spec', 11, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/proposal.md` })] });
  f.session('ses_design', 'ses_explore', 'sai-2-design-worker', 20);
  f.request('ses_design', 21, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/design.md` })] });
  f.request('ses_explore', 30, { cost: 0.5 });
  return f;
}

const routeOptions = (fixture, extra = {}) => ({ harness: 'opencode', command: 'sai-explore-plan', change: 'demo', cwd: fixture.project, status: 'completed', ...extra });

sqliteTest('plan route: the explore session is found through its first writing worker, which starts the window', () => {
  const f = routeFixture();
  try {
    f.request('ses_explore', 32, { done: false });
    f.db.close();
    assert.equal(collect(routeOptions(f), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f);
    assert.match(text, /## Execution 1 — sai-explore \(Plan - Unattended\) — completed/);
    const coordinator = rowOf(section(text, 'Coordinator'), 'sai-explore').split(' | ').map(cell => cell.trim());
    // The request before the first worker is outside the window; the closing turn is left out.
    assert.equal(coordinator[3], '1');
    assert.match(section(text, 'Spec'), /sai-1-spec-proposal-worker/);
    assert.match(section(text, 'Design'), /sai-2-design-worker/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('plan route: a change written only from a direct plan session is not an in-session route', () => {
  const f = planFixture();
  try {
    f.db.close();
    const result = collect(routeOptions(f), { env: f.env });
    assert.equal(result.outcome, 'skipped');
    assert.match(result.reason, /No opencode execution of sai-explore \(Plan - Unattended\) on demo/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('plan route: design alone starts the window when the spec segment was already done (E3)', () => {
  const f = scratch();
  try {
    f.session('ses_explore', null, 'build', 0);
    f.invoke('ses_explore', 1, 'explore', 'idea');
    f.session('ses_design', 'ses_explore', 'sai-2-design-worker', 10);
    f.request('ses_design', 11, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/design.md` })] });
    f.request('ses_explore', 20, { done: false });
    f.db.close();
    assert.equal(collect(routeOptions(f), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f);
    assert.match(section(text, 'Spec'), /Not run\./);
    assert.match(section(text, 'Design'), /sai-2-design-worker/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

// A completed Direct Build slice: the change is already archived, its workers write
// through transfer files and git in shell calls, and a previous slice ran in the
// same explore session.
function directBuildFixture() {
  const f = scratch();
  fs.rmSync(path.join(f.project, 'openspec', 'changes', 'demo'), { recursive: true });
  fs.mkdirSync(path.join(f.project, 'openspec', 'changes', 'archive', '2026-02-01-demo'), { recursive: true });
  f.session('ses_explore', null, 'build', 0);
  f.invoke('ses_explore', 1, 'explore', 'idea');
  f.session('ses_old_direct', 'ses_explore', 'sai-direct-build-worker', 5);
  f.request('ses_old_direct', 6, { cost: 9 });
  f.session('ses_old_archive', 'ses_explore', 'sai-archive-worker', 7);
  f.request('ses_old_archive', 8, { cost: 9, content: [tool('shell', 'completed', { command: 'git add openspec/changes/archive/2026-02-01-old/' })] });
  f.session('ses_direct', 'ses_explore', 'sai-direct-build-worker', 10);
  // The implementer reads a previous change's archived proposal; that never makes it a slice boundary.
  f.request('ses_direct', 11, { content: [
    tool('edit', 'completed', { path: `${f.project}/sai/tools/change-telemetry.js` }),
    tool('read', 'completed', { path: `${f.project}/openspec/changes/archive/2026-02-01-old/proposal.md` }),
  ] });
  f.session('ses_backfill', 'ses_explore', 'sai-backfill-worker', 20);
  f.request('ses_backfill', 21, { content: [tool('shell', 'completed', { command: 'node transfer.js materialize --destination openspec/changes/demo/proposal.md' })] });
  f.session('ses_archive', 'ses_explore', 'sai-archive-worker', 30);
  f.request('ses_archive', 31, { content: [tool('shell', 'completed', { command: 'git add openspec/changes/archive/2026-02-01-demo/' })] });
  f.request('ses_explore', 40, { cost: 0.5 });
  return f;
}

const directBuildOptions = (fixture, extra = {}) => ({ ...routeOptions(fixture, { command: 'sai-explore-direct-build' }), ...extra });
const ARCHIVED_TELEMETRY = 'openspec/changes/archive/2026-02-01-demo/telemetry.md';

sqliteTest('direct build route: the current slice starts at its implementer, and the archived change is found', () => {
  const f = directBuildFixture();
  try {
    f.request('ses_explore', 42, { done: false });
    f.db.close();
    const result = collect(directBuildOptions(f), { env: f.env });
    assert.equal(result.outcome, 'written');
    assert.equal(result.path, ARCHIVED_TELEMETRY);
    const text = telemetryOf(f, ARCHIVED_TELEMETRY);
    assert.match(text, /## Execution 1 — sai-explore \(Direct Build - Unattended\) — completed/);
    assert.match(section(text, 'Implement'), /sai-direct-build-worker/);
    assert.match(section(text, 'Backfill'), /sai-backfill-worker/);
    assert.match(section(text, 'Archive'), /sai-archive-worker/);
    // The previous slice's workers and the request before the implementer are outside the window.
    assert.ok(!text.includes('ses_old_direct'));
    const coordinator = rowOf(section(text, 'Coordinator'), 'sai-explore').split(' | ').map(cell => cell.trim());
    assert.equal(coordinator[3], '1');
    assert.match(coordinator.join(' | '), /\$0\.5000/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('direct build route: an implementer reading another change does not start the slice', () => {
  const f = directBuildFixture();
  try {
    f.request('ses_explore', 42, { done: false });
    f.db.close();
    assert.equal(collect(directBuildOptions(f), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f, ARCHIVED_TELEMETRY);
    assert.match(section(text, 'Implement'), /\| sai-direct-build-worker \|/);
    assert.match(section(text, 'Backfill'), /\| sai-backfill-worker \|/);
    const coordinator = rowOf(section(text, 'Coordinator'), 'sai-explore').split(' | ').map(cell => cell.trim());
    assert.equal(coordinator[3], '1');
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('direct build route: a replaced archive worker stays inside the current slice', () => {
  const f = directBuildFixture();
  try {
    f.session('ses_archive_first', 'ses_explore', 'sai-archive-worker', 25);
    f.request('ses_archive_first', 26, { content: [tool('shell', 'completed', { command: 'git add openspec/changes/demo/' })] });
    f.request('ses_explore', 42, { done: false });
    f.db.close();
    assert.equal(collect(directBuildOptions(f), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f, ARCHIVED_TELEMETRY);
    assert.match(section(text, 'Implement'), /sai-direct-build-worker/);
    assert.match(section(text, 'Backfill'), /sai-backfill-worker/);
    assert.equal(section(text, 'Archive').split('\n').filter(line => line.startsWith('| sai-archive-worker |')).length, 2);
    const coordinator = rowOf(section(text, 'Coordinator'), 'sai-explore').split(' | ').map(cell => cell.trim());
    assert.equal(coordinator[3], '1');
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('direct build route: a POC implementer before the first slice is excluded', () => {
  const f = scratch();
  try {
    fs.rmSync(path.join(f.project, 'openspec', 'changes', 'demo'), { recursive: true });
    fs.mkdirSync(path.join(f.project, 'openspec', 'changes', 'archive', '2026-02-01-demo'), { recursive: true });
    f.session('ses_explore', null, 'build', 0);
    f.invoke('ses_explore', 1, 'explore', 'idea');
    f.session('ses_poc', 'ses_explore', 'sai-direct-build-worker', 4);
    f.user('ses_poc', 5, '--direct-build --no-specs\n--work-root /tmp/poc');
    f.request('ses_poc', 6, { cost: 42 });
    f.session('ses_direct', 'ses_explore', 'sai-direct-build-worker', 10);
    f.request('ses_direct', 11, {});
    f.session('ses_backfill', 'ses_explore', 'sai-backfill-worker', 20);
    f.request('ses_backfill', 21, { content: [tool('shell', 'completed', { command: 'node transfer.js materialize --destination openspec/changes/demo/proposal.md' })] });
    f.session('ses_archive', 'ses_explore', 'sai-archive-worker', 30);
    f.request('ses_archive', 31, { content: [tool('shell', 'completed', { command: 'git add openspec/changes/archive/2026-02-01-demo/' })] });
    f.request('ses_explore', 40, { cost: 0.5 });
    f.request('ses_explore', 42, { done: false });
    f.db.close();
    assert.equal(collect(directBuildOptions(f), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f, ARCHIVED_TELEMETRY);
    assert.equal(section(text, 'Implement').split('\n').filter(line => line.startsWith('| sai-direct-build-worker |')).length, 1);
    assert.ok(!text.includes('$42.0000'));
    const coordinator = rowOf(section(text, 'Coordinator'), 'sai-explore').split(' | ').map(cell => cell.trim());
    assert.equal(coordinator[3], '1');
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('direct build route: implement findings come from the fix-loop round files, the other segments carry none', () => {
  const f = directBuildFixture();
  try {
    f.request('ses_explore', 42, { done: false });
    f.db.close();
    const runDir = writeRounds(f.project, {
      'implement-round-1.md': '#### H1\nSummary: High=2 Medium=1 Low=0\n',
      'implement-round-4.md': '#### H1\nSummary: High=0 Medium=1 Low=0\n',
    });
    assert.equal(collect(directBuildOptions(f, { runDir }), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f, ARCHIVED_TELEMETRY);
    assert.match(section(text, 'Implement'), /Findings found: High=2 Medium=1 Low=0 · pending: High=0 Medium=1 Low=0/);
    assert.match(section(text, 'Backfill'), /Findings: unavailable \(this segment records no review-finding tally\)\./);
    assert.match(section(text, 'Archive'), /Findings: unavailable \(this segment records no review-finding tally\)\./);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('plan route: the latest explore session that wrote the change wins', () => {
  const f = scratch();
  try {
    f.session('ses_old', null, 'build', 0);
    f.invoke('ses_old', 1, 'explore', 'old');
    f.session('ses_old_spec', 'ses_old', 'sai-1-spec-proposal-worker', 10);
    f.request('ses_old_spec', 11, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/proposal.md` })] });
    f.request('ses_old', 20, { done: false });
    f.session('ses_new', null, 'build', 100);
    f.invoke('ses_new', 101, 'explore', 'new');
    f.session('ses_new_spec', 'ses_new', 'sai-1-spec-proposal-worker', 110);
    f.request('ses_new_spec', 111, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/proposal.md` })] });
    f.request('ses_new', 120, { done: false });
    f.db.close();
    assert.equal(collect(routeOptions(f), { env: f.env }).outcome, 'written');
    assert.match(telemetryOf(f), /Session: ses_new/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

const REVIEW_FIRST = '## Findings\n#### H1 — one\n#### M1 — two\n#### Q1 — ask\n\nSummary: Critical=0 High=1 Medium=1 Low=0 Questions=1\n';

function buildFixture({ fix = true, firstWrite = true } = {}) {
  const f = scratch();
  f.session('ses_root', null, 'build', 0);
  f.invoke('ses_root', 1, 'build', 'demo');
  f.request('ses_root', 2, { content: [dispatch('ses_red')] });
  f.session('ses_red', 'ses_root', 'sai-3-red-worker', 10);
  f.request('ses_red', 11, {});
  f.session('ses_explore1', 'ses_root', 'budget-explorer', 15);
  f.request('ses_explore1', 16, {});
  f.session('ses_review', 'ses_root', 'sai-4-review-worker', 30);
  f.request('ses_review', 31, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/review.md`, content: firstWrite ? REVIEW_FIRST : 'draft' })] });
  if (fix) {
    f.session('ses_green', 'ses_root', 'sai-3-green-worker', 50);
    f.request('ses_green', 51, {});
  }
  f.request('ses_root', 60, { done: false });
  f.db.close();
  return f;
}

sqliteTest('build: segments get their own subsections, review findings come from the first write and the disk, the step reviews are unavailable (E10, E21, E22)', () => {
  const f = buildFixture();
  try {
    fs.writeFileSync(path.join(f.project, 'openspec', 'changes', 'demo', 'review.md'), REVIEW_FIRST.replace('#### H1 — one', '#### H1 — one (FIXED)').replace('#### M1 — two', '#### M1 — two (EXCLUDED: cosmetic)'));
    collect(options(f, { command: 'sai-build' }), { env: f.env });
    const text = telemetryOf(f);
    assert.match(section(text, 'Implement'), /Findings: unavailable \(the step reviews carry no Summary line\)\./);
    assert.match(section(text, 'Implement'), /sai-3-red-worker/);
    assert.match(section(text, 'Implement'), /budget-explorer/, 'a helper created in the implement window stays there');
    assert.match(section(text, 'Review'), /Findings found: Critical=0 High=1 Medium=1 Low=0 Questions=1 · pending: Critical=0 High=0 Medium=1 Low=0 Questions=1/);
    assert.match(section(text, 'Fix implement'), /sai-3-green-worker/);
    assert.match(section(text, 'Fix implement'), /Findings: unavailable/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('build: an absent fix segment is not run, and an absent review.md makes the review findings unavailable (E10, E21)', () => {
  const f = buildFixture({ fix: false });
  try {
    collect(options(f, { command: 'sai-build' }), { env: f.env });
    const text = telemetryOf(f);
    assert.match(section(text, 'Fix implement'), /Not run\./);
    assert.match(section(text, 'Review'), /Findings found: unavailable · pending: unavailable/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('build: a first write without a Summary line leaves the found counts unavailable', () => {
  const f = buildFixture({ firstWrite: false });
  try {
    fs.writeFileSync(path.join(f.project, 'openspec', 'changes', 'demo', 'review.md'), REVIEW_FIRST);
    collect(options(f, { command: 'sai-build' }), { env: f.env });
    assert.match(section(telemetryOf(f), 'Review'), /Findings found: unavailable · pending: Critical=0 High=1 Medium=1 Low=0 Questions=1/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('main: an unexpected failure becomes a skipped collection, never an error exit', () => {
  const f = planFixture();
  try {
    f.db.close();
    const broken = () => ({ DatabaseSync: class { constructor() { throw Object.assign(new Error('boom'), { code: 'X' }); } } });
    const { status, payload } = main(['collect', '--harness', 'opencode', '--command', 'sai-plan', '--change', 'demo', '--cwd', f.project, '--status', 'completed'], { env: f.env, loadSqlite: broken });
    assert.equal(status, 0);
    assert.equal(payload.outcome, 'skipped');
    assert.match(payload.reason, /could not be opened read-only/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

test('usage errors exit 2 with their code and write nothing', () => {
  const cases = [
    [[], 'sub-command'], [['collect'], '--harness'],
    [['collect', '--harness', 'opencode', '--command', 'sai-plan', '--change', 'Bad Name', '--cwd', '.', '--status', 'completed'], '--change'],
    [['collect', '--harness', 'opencode', '--command', 'sai-plan', '--change', 'demo', '--cwd', '.', '--status', 'weird'], '--status'],
    [['collect', '--harness', 'opencode', '--command', 'sai-3-implement', '--change', 'demo', '--cwd', '.', '--status', 'completed'], '--command'],
    [['collect', '--bogus', '1'], 'option'],
  ];
  for (const [args, mention] of cases) {
    const result = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2, args.join(' '));
    const { error } = JSON.parse(result.stdout);
    assert.equal(error.code, 'USAGE');
    assert.ok(error.message.includes(mention), `${error.message} should mention ${mention}`);
  }
});

test('the CLI prints one JSON line and exits 0 for a skipped collection', () => {
  const result = spawnSync(process.execPath, [TOOL, 'collect', '--harness', 'claude', '--command', 'sai-build', '--change', 'demo', '--cwd', os.tmpdir(), '--status', 'completed'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const lines = result.stdout.trim().split('\n');
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), { outcome: 'skipped', reason: 'The change directory openspec/changes/demo/ was not found.' });
});

// Exploration: the origin sessions listed in the change's .openspec.yaml.
const writeOrigin = (fixture, sessions, change = 'demo') => fs.writeFileSync(path.join(fixture.project, 'openspec', 'changes', change, '.openspec.yaml'), `schema: sai-workflow\nexplore_origin: [${sessions.join(', ')}]\n`);
const exploration = text => text.slice(text.indexOf('## Exploration'), text.indexOf('## Execution 1'));
const collectCall = change => tool('bash', 'completed', { command: `node "/x/change-telemetry.js" collect --harness opencode --command sai-explore-plan --change ${change} --cwd /p --status completed` });
const requestsOfRow = (text, agent) => rowOf(text, agent).split(' | ').map(cell => cell.trim())[3];

// An earlier explore session that crystallized several slices and built one of them in-session.
function originFixture() {
  const f = scratch();
  f.session('ses_origin', null, 'build', 0);
  f.invoke('ses_origin', 1, 'explore', 'idea');
  f.request('ses_origin', 2, { content: [dispatch('ses_explorer')] });
  f.session('ses_explorer', 'ses_origin', 'budget-explorer', 3);
  f.request('ses_explorer', 3, {});
  f.session('ses_poc', 'ses_origin', 'sai-direct-build-worker', 4);
  f.user('ses_poc', 4, '--direct-build --no-specs');
  f.request('ses_poc', 5, {});
  f.request('ses_origin', 6, {});
  // A sibling slice ran its plan route in this session.
  fs.mkdirSync(path.join(f.project, 'openspec', 'changes', 'sibling'), { recursive: true });
  f.session('ses_sibling_spec', 'ses_origin', 'sai-1-spec-proposal-worker', 10);
  f.request('ses_sibling_spec', 11, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/sibling/proposal.md` })] });
  f.request('ses_origin', 12, {});
  f.request('ses_origin', 20, { content: [collectCall('sibling')] });
  f.request('ses_origin', 30, {});
  // The slice under measure was planned later, in another session.
  f.session('ses_later', null, 'build', 100);
  f.invoke('ses_later', 101, 'explore', 'later');
  f.session('ses_later_spec', 'ses_later', 'sai-1-spec-proposal-worker', 110);
  f.request('ses_later_spec', 111, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/proposal.md` })] });
  f.request('ses_later', 120, { done: false });
  return f;
}

sqliteTest('exploration: an origin session records its explore windows minus the route windows, names the siblings, and a missing session is unavailable (E1, E3, E4, E8)', () => {
  const f = originFixture();
  try {
    f.db.close();
    writeOrigin(f, ['ses_origin', 'ses_gone', 'ses_origin']);
    assert.equal(collect(routeOptions(f), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f);
    const block = exploration(text);
    assert.equal(text.indexOf('## Exploration') < text.indexOf('## Execution 1'), true);
    assert.equal(block.split('### Origin session ses_origin').length, 2, 'one segment per session');
    // Requests at 2, 6, and 30 count; the one at 12 and the closing turn at 20 belong to the sibling route.
    assert.equal(requestsOfRow(section(block, 'Origin session ses_origin').split('#### ')[1], 'sai-explore'), '3');
    assert.match(block, /Shared: yes, with sibling, which had a route window in this exploration\. Other slices without a route window may exist\./);
    // The explorer and the POC worker fall inside the exploration; the sibling's spec worker does not.
    const others = block.slice(block.indexOf('#### Other agents'));
    assert.match(others, /\| budget-explorer \|/);
    assert.match(others, /\| sai-direct-build-worker \|/);
    assert.ok(!others.includes('sai-1-spec-proposal-worker'));
    assert.match(block, /### Origin session ses_gone\n\nExploration: unavailable \(session ses_gone is not in opencode\.db\)\./);
    // The route execution is still recorded.
    assert.match(text, /## Execution 1 — sai-explore \(Plan - Unattended\) — completed/);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('exploration: in the route session it stops at the route start and ignores later routes (E1)', () => {
  const f = routeFixture();
  try {
    f.db.close();
    writeOrigin(f, ['ses_explore']);
    assert.equal(collect(routeOptions(f), { env: f.env }).outcome, 'written');
    const block = exploration(telemetryOf(f));
    // The request at 2 counts; the one at 30 follows the route's first worker.
    assert.equal(requestsOfRow(block, 'sai-explore'), '1');
    assert.match(block, /Shared: no other change had a route window in this exploration\. Other slices without a route window may exist\./);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('exploration: it is written once; a later execution leaves it unchanged (E2)', () => {
  const f = routeFixture();
  try {
    f.session('ses_build', null, 'build', 200);
    f.invoke('ses_build', 201, 'build', 'demo');
    f.request('ses_build', 202, {});
    f.request('ses_build', 203, { done: false });
    f.db.close();
    writeOrigin(f, ['ses_explore']);
    assert.equal(collect(routeOptions(f), { env: f.env }).outcome, 'written');
    const first = exploration(telemetryOf(f));
    writeOrigin(f, ['ses_explore', 'ses_other']);
    assert.equal(collect(options(f, { command: 'sai-build' }), { env: f.env }).outcome, 'written');
    const text = telemetryOf(f);
    assert.match(text, /## Execution 2 — \/sai-build — completed/);
    assert.equal(exploration(text), first);
    assert.equal(text.split('## Exploration').length, 2);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('exploration: a change without explore_origin has no exploration section (E7)', () => {
  const f = routeFixture();
  try {
    f.db.close();
    assert.equal(collect(routeOptions(f), { env: f.env }).outcome, 'written');
    assert.ok(!telemetryOf(f).includes('## Exploration'));
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('exploration: a session without a /sai-explore invocation is unavailable', () => {
  const f = routeFixture();
  try {
    f.session('ses_plain', null, 'build', 300);
    f.invoke('ses_plain', 301, 'plan', 'other');
    f.db.close();
    writeOrigin(f, ['ses_plain']);
    collect(routeOptions(f), { env: f.env });
    assert.match(exploration(telemetryOf(f)), /Exploration: unavailable \(session ses_plain holds no \/sai-explore invocation\)\./);
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

sqliteTest('explore-origin: a subagent session resolves to its explore root, anything else is skipped (E9)', () => {
  const f = routeFixture();
  try {
    f.session('ses_helper', 'ses_spec', 'budget-explorer', 12);
    f.session('ses_plain', null, 'build', 300);
    f.invoke('ses_plain', 301, 'plan', 'other');
    f.session('ses_plain_child', 'ses_plain', 'budget-explorer', 302);
    f.db.close();
    const run = session => main(['explore-origin', '--harness', 'opencode', '--session', session], { env: f.env });
    assert.deepEqual(run('ses_helper'), { status: 0, payload: { outcome: 'found', session: 'ses_explore' } });
    assert.deepEqual(run('ses_explore').payload, { outcome: 'found', session: 'ses_explore' });
    assert.match(run('ses_plain_child').payload.reason, /root session ses_plain holds no \/sai-explore invocation/);
    assert.match(run('ses_unknown').payload.reason, /not in opencode\.db/);
    assert.deepEqual(main(['explore-origin', '--harness', 'claude', '--session', 'ses_helper']).payload, { outcome: 'skipped', reason: 'Recording the explore origin on Claude Code is not supported yet.' });
  } finally { fs.rmSync(f.base, { recursive: true, force: true }); }
});

test('explore-origin: a missing or malformed session is a usage error', () => {
  for (const args of [['explore-origin', '--harness', 'opencode'], ['explore-origin', '--harness', 'opencode', '--session', 'not a session'], ['explore-origin', '--harness', 'opencode', '--session', 'ses_a', '--cwd', '.']]) {
    const { status, payload } = main(args);
    assert.equal(status, 2, args.join(' '));
    assert.equal(payload.error.code, 'USAGE');
  }
});

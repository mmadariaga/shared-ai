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
const telemetryOf = fixture => fs.readFileSync(path.join(fixture.project, 'openspec', 'changes', 'demo', 'telemetry.md'), 'utf8');
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

test('claude: the harness is not supported yet and nothing is written', () => {
  const result = collect({ harness: 'claude', command: 'sai-plan', change: 'demo', cwd: os.tmpdir(), status: 'completed' });
  assert.deepEqual(result, { outcome: 'skipped', reason: 'Change telemetry is not supported on Claude Code yet.' });
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

sqliteTest('direct build route: segment marks follow the direct-build, backfill, and archive workers', () => {
  const f = scratch();
  try {
    f.session('ses_explore', null, 'build', 0);
    f.invoke('ses_explore', 1, 'explore', 'idea');
    f.session('ses_direct', 'ses_explore', 'sai-direct-build-worker', 10);
    f.request('ses_direct', 11, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/proposal.md` })] });
    f.session('ses_backfill', 'ses_explore', 'sai-backfill-worker', 20);
    f.request('ses_backfill', 21, { content: [tool('write', 'completed', { filePath: `${f.project}/openspec/changes/demo/specs/demo/spec.md` })] });
    f.session('ses_archive', 'ses_explore', 'sai-archive-worker', 30);
    f.request('ses_archive', 31, {});
    f.request('ses_explore', 40, { done: false });
    f.db.close();
    const result = collect(routeOptions(f, { command: 'sai-explore-direct-build' }), { env: f.env });
    assert.equal(result.outcome, 'written');
    const text = telemetryOf(f);
    assert.match(text, /## Execution 1 — sai-explore \(Direct Build - Unattended\) — completed/);
    assert.match(section(text, 'Implement'), /sai-direct-build-worker/);
    assert.match(section(text, 'Backfill'), /sai-backfill-worker/);
    assert.match(section(text, 'Archive'), /sai-archive-worker/);
    assert.match(section(text, 'Implement'), /Findings: unavailable \(the route records no review-finding tally\)\./);
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
  assert.deepEqual(JSON.parse(result.stdout), { outcome: 'skipped', reason: 'Change telemetry is not supported on Claude Code yet.' });
});

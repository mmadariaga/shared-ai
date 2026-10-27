'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'retrospective.js');
const { splitPaths, classifyTarget, projectFolder } = require('../sai/tools/retrospective.js');

const SESSION = '11111111-2222-4333-8444-555555555555';
const OTHER_SESSION = '66666666-7777-4888-8999-000000000000';
const WORKER_AGENT = 'a0123456789abcdef';
const AUX_AGENT = 'a1111111111111111';
const LATE_AGENT = 'a2222222222222222';
const PROJECT = '/work/demo.project';

function line(row) {
  return JSON.stringify({ sessionId: SESSION, ...row });
}

function invocation(uuid, time, name, args = '') {
  return line({ type: 'user', uuid, timestamp: time, message: { role: 'user', content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>${args ? `\n<command-args>${args}</command-args>` : ''}` } });
}

function assistant(uuid, time, blocksOrText, stop = 'tool_use') {
  const content = typeof blocksOrText === 'string' ? [{ type: 'text', text: blocksOrText }] : blocksOrText;
  return line({ type: 'assistant', uuid, timestamp: time, message: { role: 'assistant', stop_reason: stop, content } });
}

function toolUse(id, name, input) {
  return { type: 'tool_use', id, name, input };
}

function toolResult(uuid, time, id, text, extra = {}) {
  return line({ type: 'user', uuid, timestamp: time, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: text, ...(extra.is_error ? { is_error: true } : {}) }] }, ...(extra.toolUseResult ? { toolUseResult: extra.toolUseResult } : {}) });
}

const SESSION_LINES = [
  line({ type: 'mode', mode: 'default' }),
  // A mention of a command name in user text is not an invocation.
  line({ type: 'user', uuid: 'u-mention', timestamp: '2026-01-01T09:00:00.000Z', message: { role: 'user', content: 'please explain <command-name>/sai-status</command-name> to me' } }),
  invocation('u-inv1', '2026-01-01T10:00:00.000Z', 'sai-status'),
  // The command body arrives stamped just before its invocation record, chained to it.
  line({ type: 'user', uuid: 'u-meta1', parentUuid: 'u-inv1', timestamp: '2026-01-01T10:00:00.000Z', isMeta: true, message: { role: 'user', content: [{ type: 'text', text: 'companion' }] } }),
  line({ type: 'attachment', uuid: 'a-file1', parentUuid: 'u-meta1', timestamp: '2026-01-01T09:59:59.999Z', attachment: { type: 'file', filename: '/repo/sai/commands/status/body.md', content: { type: 'text', file: { filePath: '/repo/sai/commands/status/body.md', content: 'status body text' } } } }),
  assistant('a-1', '2026-01-01T10:00:02.000Z', [toolUse('tu-read', 'Read', { file_path: '/repo/sai/policies/remember.md' }), toolUse('tu-other', 'Read', { file_path: '/repo/src/app.js' })]),
  toolResult('r-1', '2026-01-01T10:00:03.000Z', 'tu-read', '1\tremember text', { toolUseResult: { type: 'text', file: { filePath: '/repo/sai/policies/remember.md', content: 'remember text' } } }),
  toolResult('r-2', '2026-01-01T10:00:03.500Z', 'tu-other', '1\tcode', { toolUseResult: { type: 'text', file: { filePath: '/repo/src/app.js', content: 'code' } } }),
  line({ type: 'attachment', uuid: 'a-again', timestamp: '2026-01-01T10:00:04.000Z', attachment: { type: 'already_read_file', filename: '/repo/sai/policies/remember.md', content: { type: 'file_unchanged', file: { filePath: '/repo/sai/policies/remember.md' } } } }),
  assistant('a-2', '2026-01-01T10:00:05.000Z', [toolUse('tu-skill', 'Skill', { skill: 'safe-operations' }), toolUse('tu-fail', 'Bash', { command: 'false' })]),
  line({ type: 'user', uuid: 'm-skill', timestamp: '2026-01-01T10:00:06.000Z', isMeta: true, sourceToolUseID: 'tu-skill', message: { role: 'user', content: [{ type: 'text', text: 'Base directory for this skill: /home/u/.claude/skills/safe-operations\n\n# Safe operations' }] } }),
  toolResult('r-3', '2026-01-01T10:00:07.000Z', 'tu-fail', 'Exit code 1\nboom', { is_error: true }),
  assistant('a-3', '2026-01-01T10:00:08.000Z', [toolUse('tu-worker', 'Agent', { subagent_type: 'sai-direct-build-worker' }), toolUse('tu-aux', 'Agent', { subagent_type: 'budget-explorer' })]),
  assistant('a-4', '2026-01-01T10:00:09.000Z', 'done', 'end_turn'),
  invocation('u-inv2', '2026-01-01T11:00:00.000Z', 'sai-explore', 'a topic'),
  assistant('b-1', '2026-01-01T11:00:01.000Z', 'working', 'tool_use'),
  invocation('u-inv3', '2026-01-01T12:00:00.000Z', 'sai-status'),
  assistant('c-1', '2026-01-01T12:00:01.000Z', 'ok', 'end_turn'),
  invocation('u-other', '2026-01-01T13:00:00.000Z', 'to-pr'),
  assistant('o-1', '2026-01-01T13:00:01.000Z', [toolUse('tu-late', 'Agent', { subagent_type: 'sai-direct-build-worker' })]),
  invocation('u-inv4', '2026-01-01T14:00:00.000Z', 'sai-status'),
  assistant('d-1', '2026-01-01T14:00:01.000Z', 'still going', 'tool_use'),
];

function workerLines() {
  const row = (extra) => JSON.stringify({ sessionId: SESSION, agentId: WORKER_AGENT, isSidechain: true, ...extra });
  return [
    row({ type: 'user', uuid: 'w-1', timestamp: '2026-01-01T10:00:10.000Z', message: { role: 'user', content: 'Worker contract' } }),
    row({ type: 'assistant', uuid: 'w-2', timestamp: '2026-01-01T10:00:11.000Z', message: { role: 'assistant', stop_reason: 'tool_use', content: [toolUse('tw-read', 'Read', { file_path: '/repo/sai/commands/x/worker.md' })] } }),
    row({ type: 'user', uuid: 'w-3', timestamp: '2026-01-01T10:00:12.000Z', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tw-read', content: 'x', is_error: true }] }, toolUseResult: { type: 'text', file: { filePath: '/repo/sai/commands/x/worker.md', content: 'worker text' } } }),
  ];
}

function makeConfig() {
  const config = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-retro-'));
  const folder = projectFolder(path.join(config, 'projects'), PROJECT);
  fs.mkdirSync(path.join(folder, SESSION, 'subagents'), { recursive: true });
  fs.writeFileSync(path.join(folder, `${SESSION}.jsonl`), `${SESSION_LINES.join('\n')}\n`);
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', `agent-${WORKER_AGENT}.jsonl`), `${workerLines().join('\n')}\n`);
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', `agent-${WORKER_AGENT}.meta.json`), JSON.stringify({ agentType: 'sai-direct-build-worker', toolUseId: 'tu-worker', spawnDepth: 1, finished: true, description: 'worker' }));
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', `agent-${AUX_AGENT}.meta.json`), JSON.stringify({ agentType: 'budget-explorer', toolUseId: 'tu-aux', spawnDepth: 1, finished: true }));
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', `agent-${AUX_AGENT}.jsonl`), 'not read\n');
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', `agent-${LATE_AGENT}.meta.json`), JSON.stringify({ agentType: 'sai-direct-build-worker', toolUseId: 'tu-late', spawnDepth: 1, finished: true }));
  fs.writeFileSync(path.join(folder, SESSION, 'subagents', `agent-${LATE_AGENT}.jsonl`), `${JSON.stringify({ sessionId: SESSION, agentId: LATE_AGENT, type: 'user', uuid: 'l-1', timestamp: '2026-01-01T13:00:02.000Z', message: { role: 'user', content: 'late worker' } })}\n`);
  // A second session with no command invocations is never parsed for executions.
  fs.writeFileSync(path.join(folder, `${OTHER_SESSION}.jsonl`), `${JSON.stringify({ type: 'user', uuid: 'x', timestamp: '2026-01-01T00:00:00.000Z', message: { role: 'user', content: 'hi' } })}\n`);
  return config;
}

function run(config, args) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd: os.tmpdir(), encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: config } });
  return { status: result.status, payload: JSON.parse(result.stdout) };
}

test('splitPaths separates on commas except inside quotes', () => {
  assert.deepEqual(splitPaths('/a,/b'), ['/a', '/b']);
  assert.deepEqual(splitPaths('"/a,b",/c'), ['/a,b', '/c']);
  assert.deepEqual(splitPaths("'/x y', /z ,"), ['/x y', '/z']);
});

test('classifyTarget separates session IDs, agent IDs, and command names by form', () => {
  assert.equal(classifyTarget(SESSION).kind, 'claude-session');
  assert.equal(classifyTarget('ses_1a2B3c').kind, 'opencode-session');
  assert.equal(classifyTarget(`agent-${WORKER_AGENT}`).agent, WORKER_AGENT);
  assert.deepEqual(classifyTarget('/sai-status'), { kind: 'command', command: 'sai-status' });
  assert.deepEqual(classifyTarget('sai-status'), { kind: 'command', command: 'sai-status' });
  assert.equal(classifyTarget('status'), null);
  assert.equal(classifyTarget('hello world'), null);
});

test('index: a command target counts invocations, not mentions, newest first, with boundaries at the next SAI invocation', () => {
  const config = makeConfig();
  try {
    const { status, payload } = run(config, ['index', '/sai-status', '--paths', PROJECT]);
    assert.equal(status, 0);
    assert.deepEqual(payload.executions.map(e => e.invocation.record), ['u-inv4', 'u-inv3', 'u-inv1']);
    const first = payload.executions[2];
    assert.equal(first.end_time, '2026-01-01T11:00:00.000Z');
    assert.equal(payload.executions[1].end_time, '2026-01-01T14:00:00.000Z', 'a non-SAI slash command does not end the execution');
    assert.equal(first.harness, 'claude');
    assert.deepEqual(payload.harnesses.map(h => [h.harness, h.status]), [['claude', 'analyzed'], ['opencode', 'not-analyzed']]);
    assert.match(payload.harnesses[1].reason, /not available/);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: --limit caps executions in total and lists the portion beyond it as unread', () => {
  const config = makeConfig();
  try {
    const { payload } = run(config, ['index', 'sai-status', '--paths', PROJECT, '--limit', '2']);
    assert.deepEqual(payload.executions.map(e => e.invocation.record), ['u-inv4', 'u-inv3']);
    assert.deepEqual(payload.unread.find(u => u.kind === 'executions-beyond-limit').count, 1);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: links the principal worker through meta.json and leaves the auxiliary agent unread', () => {
  const config = makeConfig();
  try {
    const { payload } = run(config, ['index', SESSION, '--paths', PROJECT]);
    assert.equal(payload.executions.length, 4);
    const status1 = payload.executions.find(e => e.invocation.record === 'u-inv1');
    assert.deepEqual(status1.principal_workers.map(w => [w.agent_id, w.agent_type, w.records]), [[WORKER_AGENT, 'sai-direct-build-worker', 3]]);
    assert.deepEqual(status1.auxiliary_agents.map(a => [a.agent_id, a.agent_type, a.records]), [[AUX_AGENT, 'budget-explorer', null]]);
    assert.ok(payload.unread.some(u => u.kind === 'auxiliary-agents' && u.execution === 'u-inv1' && u.count === 1));
    assert.ok(payload.unread.some(u => u.kind === 'records-before-first-invocation' && u.session === SESSION && u.count === 1));
    const status3 = payload.executions.find(e => e.invocation.record === 'u-inv3');
    assert.deepEqual(status3.principal_workers.map(w => [w.agent_id, w.records]), [[LATE_AGENT, 1]], 'a worker dispatched after a non-SAI command stays in its SAI execution');
    assert.deepEqual(payload.unlinked_agents, []);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: captures loaded instruction text sources, tool errors, and the late-stamped command body', () => {
  const config = makeConfig();
  try {
    const { payload } = run(config, ['index', SESSION, '--paths', PROJECT]);
    const execution = payload.executions.find(e => e.invocation.record === 'u-inv1');
    const loaded = execution.loaded_instructions.map(l => [l.path, l.source, l.agent, l.text_available]);
    assert.deepEqual(loaded, [
      ['/repo/sai/commands/status/body.md', 'attachment', null, true],
      ['/repo/sai/policies/remember.md', 'Read', null, true],
      ['/repo/sai/policies/remember.md', 'already_read_file', null, false],
      ['/home/u/.claude/skills/safe-operations/SKILL.md', 'Skill', null, true],
      ['/repo/sai/commands/x/worker.md', 'Read', WORKER_AGENT, true],
    ]);
    assert.equal(execution.non_instruction_reads, 1);
    assert.deepEqual(execution.tool_errors.map(e => [e.record, e.agent, e.tool]), [['r-3', null, 'Bash'], ['w-3', WORKER_AGENT, 'Read']]);
    assert.match(execution.tool_errors[0].message, /Exit code 1/);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: only the last execution of a session can be in progress', () => {
  const config = makeConfig();
  try {
    const { payload } = run(config, ['index', SESSION, '--paths', PROJECT]);
    const byRecord = Object.fromEntries(payload.executions.map(e => [e.invocation.record, e.in_progress]));
    assert.deepEqual(byRecord, { 'u-inv1': false, 'u-inv2': false, 'u-inv3': false, 'u-inv4': true });
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: reports the default project, inaccessible paths, and continues with valid ones', () => {
  const config = makeConfig();
  try {
    const defaulted = run(config, ['index', 'sai-explore', '--cwd', PROJECT]).payload;
    assert.match(defaulted.defaults_applied[0], /current project/);
    assert.equal(defaulted.executions.length, 1);
    const mixed = run(config, ['index', 'sai-explore', '--paths', `/no/such,"${PROJECT}"`]).payload;
    assert.deepEqual(mixed.projects.map(p => [p.project, p.status]), [['/no/such', 'inaccessible'], [PROJECT, 'analyzed']]);
    assert.equal(mixed.executions.length, 1);
    const none = run(config, ['index', 'sai-merge', '--paths', PROJECT]).payload;
    assert.deepEqual(none.executions, []);
    assert.match(none.notes[0], /No matching executions/);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: a subagent target resolves to its parent execution; an opencode target is not analyzed', () => {
  const config = makeConfig();
  try {
    const { payload } = run(config, ['index', `agent-${WORKER_AGENT}`, '--paths', PROJECT]);
    assert.deepEqual(payload.executions.map(e => e.invocation.record), ['u-inv1']);
    assert.match(payload.notes[0], /subagent of session/);
    const late = run(config, ['index', LATE_AGENT, '--paths', PROJECT]).payload;
    assert.deepEqual(late.executions.map(e => e.invocation.record), ['u-inv3']);
    const opencode = run(config, ['index', 'ses_abc123']).payload;
    assert.deepEqual(opencode.executions, []);
    assert.deepEqual(opencode.harnesses, [{ harness: 'opencode', status: 'not-analyzed', reason: payload.harnesses[1].reason }]);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: usage errors name their code and exit 2', () => {
  const config = makeConfig();
  try {
    for (const [args, code] of [[['index'], 'MISSING_TARGET'], [['index', 'status'], 'UNRECOGNIZED_TARGET'], [['index', 'sai-status', '--limit', '0'], 'USAGE'], [['index', 'sai-status', '--bogus', '1'], 'USAGE']]) {
      const { status, payload } = run(config, args);
      assert.equal(status, 2, args.join(' '));
      assert.equal(payload.error.code, code);
    }
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('excerpt: pages records by ID in timestamp-then-uuid order and cuts long text', () => {
  const config = makeConfig();
  try {
    const first = run(config, ['excerpt', '--project', PROJECT, '--session', SESSION, '--from', 'u-inv1', '--count', '3', '--max-chars', '10']).payload;
    assert.deepEqual(first.records.map(r => r.id), ['u-inv1', 'u-meta1', 'a-1']);
    assert.ok(first.next_record);
    const next = run(config, ['excerpt', '--project', PROJECT, '--session', SESSION, '--from', first.next_record, '--count', '1']).payload;
    assert.equal(next.records[0].id, first.next_record);
    const worker = run(config, ['excerpt', '--project', PROJECT, '--session', SESSION, '--agent', WORKER_AGENT]).payload;
    assert.deepEqual(worker.records.map(r => r.id), ['w-1', 'w-2', 'w-3']);
    assert.equal(worker.next_record, null);
    assert.equal(worker.records[2].loaded_file.text, 'worker text');
    const cut = run(config, ['excerpt', '--project', PROJECT, '--session', SESSION, '--agent', WORKER_AGENT, '--count', '1', '--max-chars', '6']).payload;
    assert.match(cut.records[0].text, /^Worker… \[\+\d+ chars\]$/);
    assert.equal(run(config, ['excerpt', '--project', PROJECT, '--session', SESSION, '--from', 'missing']).payload.error.code, 'NOT_FOUND');
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

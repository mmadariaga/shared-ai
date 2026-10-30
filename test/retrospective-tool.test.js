'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'retrospective.js');
const { main, splitPaths, classifyTarget, projectFolder } = require('../sai/tools/retrospective.js');

// `node:sqlite` is only available without a flag from Node 22.13: the opencode fixtures skip below it.
const { DatabaseSync } = (() => { try { return require('node:sqlite'); } catch { return {}; } })();
const opencodeTest = (name, fn) => test(name, { skip: !DatabaseSync && 'node:sqlite is not available in this runtime' }, fn);

const SESSION = '11111111-2222-4333-8444-555555555555';
const OTHER_SESSION = '66666666-7777-4888-8999-000000000000';
const WORKER_AGENT = 'a0123456789abcdef';
const AUX_AGENT = 'a1111111111111111';
const LATE_AGENT = 'a2222222222222222';
// Fixture paths are absolute on the tool's own drive, so Windows resolves them to themselves.
const ROOT = path.parse(os.tmpdir()).root;
const rooted = (...parts) => path.join(ROOT, ...parts);
const PROJECT = rooted('work', 'demo.project');
const OTHER_PROJECT = rooted('work', 'other');
const MISSING_PROJECT = rooted('no', 'such');

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

// The opencode data directory lives inside the config folder, so a run never reads the machine's own database.
function envFor(config) {
  return { ...process.env, CLAUDE_CONFIG_DIR: config, XDG_DATA_HOME: path.join(config, 'data') };
}

function run(config, args) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd: os.tmpdir(), encoding: 'utf8', env: envFor(config) });
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
    assert.match(payload.harnesses[1].reason, /No opencode database was found/);
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
    const mixed = run(config, ['index', 'sai-explore', '--paths', `${MISSING_PROJECT},"${PROJECT}"`]).payload;
    assert.deepEqual(mixed.projects.map(p => [p.project, p.status]), [[MISSING_PROJECT, 'inaccessible'], [PROJECT, 'analyzed']]);
    assert.equal(mixed.executions.length, 1);
    const none = run(config, ['index', 'sai-merge', '--paths', PROJECT]).payload;
    assert.deepEqual(none.executions, []);
    assert.match(none.notes[0], /No matching executions/);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('index: a subagent target resolves to its parent execution; an opencode target without a database is not analyzed', () => {
  const config = makeConfig();
  try {
    const { payload } = run(config, ['index', `agent-${WORKER_AGENT}`, '--paths', PROJECT]);
    assert.deepEqual(payload.executions.map(e => e.invocation.record), ['u-inv1']);
    assert.match(payload.notes[0], /subagent of session/);
    const late = run(config, ['index', LATE_AGENT, '--paths', PROJECT]).payload;
    assert.deepEqual(late.executions.map(e => e.invocation.record), ['u-inv3']);
    const opencode = run(config, ['index', 'ses_abc123']).payload;
    assert.deepEqual(opencode.executions, []);
    assert.deepEqual(opencode.harnesses.map(h => [h.harness, h.status]), [['opencode', 'not-analyzed']]);
    assert.match(opencode.harnesses[0].reason, /No opencode database was found/);
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

// ---------------------------------------------------------------------------
// opencode reader
// ---------------------------------------------------------------------------

const OC = { root: 'ses_root0001', worker: 'ses_worker01', aux: 'ses_aux00001', grand: 'ses_grand001', late: 'ses_late0001', orphan: 'ses_orphan01', other: 'ses_other001' };
const at = (clock) => Date.parse(`2026-01-01T${clock}Z`);

function envelope(name, args = '') {
  return `Fetch @sai/commands/${name}/body.md and follow it exactly, forwarding the InvocationEnvelope block below.\n\nInvocationEnvelope:\n  command_name: ${name}\n  arguments_value: ${args}\n\n<!-- User customizations below this line -->`;
}

const doneTime = (clock) => ({ created: at(clock), completed: at(clock) + 1 });
const tool = (id, name, state) => ({ type: 'tool', id, name, state });
const reading = (id, file, text = 'file text') => tool(id, 'read', { status: 'completed', input: { path: file }, content: [{ type: 'text', text }] });

function openCodeRows() {
  const row = (session, seq, type, clock, data) => ({ id: `msg_${session}_${String(seq).padStart(2, '0')}`, session, seq, type, time: at(clock), data: JSON.stringify(data) });
  return [
    row(OC.root, 1, 'user', '13:00:00.000', { time: { created: at('13:00:00.000') }, text: 'hello before any command' }),
    row(OC.root, 2, 'user', '13:00:10.000', { time: { created: at('13:00:10.000') }, text: envelope('design', 'my-change') }),
    row(OC.root, 3, 'idle', '13:00:10.500', { time: { created: at('13:00:10.500') } }),
    row(OC.root, 4, 'synthetic', '13:00:11.000', { time: { created: at('13:00:11.000') }, text: 'Called the Read tool with the following input: {"filePath":"/repo/sai/commands/design/body.md"}\n\n<path>/repo/sai/commands/design/body.md</path>\n<type>file</type>\n<content>\n1: body\n</content>' }),
    row(OC.root, 5, 'synthetic', '13:00:11.500', { time: { created: at('13:00:11.500') }, text: 'Called the Read tool with the following input: {"filePath":"/repo/.claude/"}\n\n<path>/repo/.claude/</path>\n<type>directory</type>\n<entries>\ncommands/\n</entries>' }),
    row(OC.root, 6, 'assistant', '13:00:12.000', { time: doneTime('13:00:12.000'), agent: 'build', content: [
      { type: 'reasoning', text: '' },
      reading('call-1', '/repo/sai/policies/remember.md', 'remember text'),
      reading('call-2', '/repo/src/app.js', 'code'),
      tool('call-3', 'read', { status: 'error', input: { path: '/repo/.opencode/sai/missing.md' }, error: { type: 'tool.execution', message: 'File not found: /repo/.opencode/sai/missing.md' } }),
      reading('call-4', '/repo/sai/commands/', 'a directory listing'),
      tool('call-5', 'skill', { status: 'completed', input: { id: 'safe-operations' }, content: [{ type: 'text', text: '<skill_content name="safe-operations">\n# Skill: safe-operations\n\nBase directory for this skill: file:///home/u/.config/opencode/skills/safe-operations\n</skill_content>' }] }),
    ] }),
    row(OC.root, 7, 'assistant', '13:00:50.000', { time: doneTime('13:00:50.000'), agent: 'build', content: [{ type: 'text', text: 'design done' }] }),
    row(OC.root, 8, 'user', '14:30:00.000', { time: { created: at('14:30:00.000') }, text: envelope('status') }),
    row(OC.root, 9, 'assistant', '14:30:05.000', { time: doneTime('14:30:05.000'), agent: 'build', content: [{ type: 'text', text: 'status shown' }] }),
    row(OC.root, 10, 'user', '15:00:00.000', { time: { created: at('15:00:00.000') }, text: envelope('status') }),
    row(OC.root, 11, 'assistant', '15:00:01.000', { time: { created: at('15:00:01.000') }, agent: 'build', content: [{ type: 'text', text: 'still going' }] }),
    row(OC.worker, 1, 'user', '13:00:31.000', { time: { created: at('13:00:31.000') }, text: 'Worker contract' }),
    row(OC.worker, 2, 'assistant', '13:00:32.000', { time: doneTime('13:00:32.000'), agent: 'sai-direct-build-worker', content: [
      reading('w-1', '/repo/sai/commands/x/worker.md', 'worker text'),
      tool('w-2', 'shell', { status: 'error', input: { command: 'false' }, error: { type: 'permission.rejected', message: 'Permission denied: shell' } }),
    ] }),
    row(OC.grand, 1, 'user', '13:00:41.000', { time: { created: at('13:00:41.000') }, text: 'not read' }),
    row(OC.aux, 1, 'user', '13:00:36.000', { time: { created: at('13:00:36.000') }, text: 'not read' }),
    row(OC.late, 1, 'user', '14:30:31.000', { time: { created: at('14:30:31.000') }, text: 'late worker' }),
    row(OC.other, 1, 'user', '16:00:00.000', { time: { created: at('16:00:00.000') }, text: envelope('status') }),
  ];
}

function openCodeSessions() {
  return [
    [OC.root, null, 'build', PROJECT, '12:59:00.000'],
    [OC.orphan, OC.root, 'budget-explorer', PROJECT, '12:59:30.000'],
    [OC.worker, OC.root, 'sai-direct-build-worker', PROJECT, '13:00:30.000'],
    [OC.aux, OC.root, 'budget-explorer', PROJECT, '13:00:35.000'],
    [OC.grand, OC.worker, 'budget-explorer', PROJECT, '13:00:40.000'],
    [OC.late, OC.root, 'sai-direct-build-worker', PROJECT, '14:30:30.000'],
    [OC.other, null, 'build', OTHER_PROJECT, '16:00:00.000'],
  ];
}

const SESSION_COLUMNS = 'id text primary key, project_id text, parent_id text, agent text, title text, directory text NOT NULL, time_created integer NOT NULL';
const MESSAGE_COLUMNS = 'id text primary key, session_id text NOT NULL, type text NOT NULL, seq integer NOT NULL, time_created integer NOT NULL, data text NOT NULL';

function makeOpencodeDb(config, { sessionColumns = SESSION_COLUMNS } = {}) {
  const directory = path.join(config, 'data', 'opencode');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'opencode.db');
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE session_v2 (${sessionColumns}); CREATE TABLE session_message (${MESSAGE_COLUMNS});`);
  if (sessionColumns === SESSION_COLUMNS) {
    const insertSession = db.prepare('INSERT INTO session_v2 (id, parent_id, agent, title, directory, time_created) VALUES (?, ?, ?, ?, ?, ?)');
    for (const [id, parent, agent, dir, clock] of openCodeSessions()) insertSession.run(id, parent, agent, `title ${id}`, dir, at(clock));
    const insertMessage = db.prepare('INSERT INTO session_message (id, session_id, type, seq, time_created, data) VALUES (?, ?, ?, ?, ?, ?)');
    for (const { id, session, seq, type, time, data } of openCodeRows()) insertMessage.run(id, session, type, seq, time, data);
  }
  db.close();
  return file;
}

const digest = (file) => require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');

opencodeTest('opencode: a command target reads child sessions of the right project and maps the envelope to the SAI command', () => {
  const config = makeConfig();
  try {
    makeOpencodeDb(config);
    const { status, payload } = run(config, ['index', 'sai-2-design', '--paths', PROJECT]);
    assert.equal(status, 0);
    assert.deepEqual(payload.harnesses.map(h => [h.harness, h.status]), [['claude', 'analyzed'], ['opencode', 'analyzed']]);
    assert.deepEqual(payload.projects.filter(p => p.harness === 'opencode').map(p => [p.project, p.status, p.sessions_read]), [[PROJECT, 'analyzed', 1]]);
    assert.equal(payload.executions.length, 1);
    const [design] = payload.executions;
    assert.equal(design.harness, 'opencode');
    assert.equal(design.session, OC.root);
    assert.deepEqual(design.invocation, { record: `msg_${OC.root}_02`, timestamp: '2026-01-01T13:00:10.000Z', command: 'sai-2-design', args: 'my-change' });
    assert.equal(design.end_time, '2026-01-01T14:30:00.000Z');
    assert.equal(design.in_progress, false);
    assert.deepEqual(design.records, { count: 5, first: `msg_${OC.root}_02`, last: `msg_${OC.root}_07` }, 'idle markers are not records');
    assert.deepEqual(design.principal_workers.map(w => [w.agent_id, w.agent_type, w.spawn_depth, w.records]), [[OC.worker, 'sai-direct-build-worker', 1, 2]]);
    assert.deepEqual(design.auxiliary_agents.map(a => [a.agent_id, a.agent_type, a.spawn_depth, a.records]), [[OC.aux, 'budget-explorer', 1, null], [OC.grand, 'budget-explorer', 2, null]], 'a child of a worker stays in the same execution');
    assert.deepEqual(payload.unlinked_agents.map(a => [a.session, a.agent_id]), [[OC.root, OC.orphan]], 'a child created before the first invocation is unlinked');
    assert.ok(payload.unread.some(u => u.kind === 'records-before-first-invocation' && u.session === OC.root && u.count === 1));
    assert.ok(payload.unread.some(u => u.kind === 'auxiliary-agents' && u.execution === design.invocation.record && u.count === 2));
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

opencodeTest('opencode: captures loaded instructions from reads, skills, and synthetic reads, plus tool errors', () => {
  const config = makeConfig();
  try {
    makeOpencodeDb(config);
    const [design] = run(config, ['index', 'sai-2-design', '--paths', PROJECT]).payload.executions;
    assert.deepEqual(design.loaded_instructions.map(l => [l.path, l.source, l.agent, l.text_available]), [
      ['/repo/sai/commands/design/body.md', 'synthetic-read', null, true],
      ['/repo/sai/policies/remember.md', 'Read', null, true],
      ['/home/u/.config/opencode/skills/safe-operations/SKILL.md', 'Skill', null, true],
      ['/repo/sai/commands/x/worker.md', 'Read', OC.worker, true],
    ]);
    assert.equal(design.non_instruction_reads, 1);
    assert.deepEqual(design.tool_errors.map(e => [e.record, e.agent, e.tool]), [[`msg_${OC.root}_06`, null, 'read'], [`msg_${OC.worker}_02`, OC.worker, 'shell']]);
    assert.match(design.tool_errors[0].message, /File not found/);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

opencodeTest('opencode: merges both harnesses into one newest-first selection under a single --limit', () => {
  const config = makeConfig();
  try {
    makeOpencodeDb(config);
    const all = run(config, ['index', 'sai-status', '--paths', PROJECT]).payload;
    assert.deepEqual(all.executions.map(e => [e.harness, e.invocation.record]), [
      ['opencode', `msg_${OC.root}_10`], ['opencode', `msg_${OC.root}_08`], ['claude', 'u-inv4'], ['claude', 'u-inv3'], ['claude', 'u-inv1'],
    ]);
    const limited = run(config, ['index', 'sai-status', '--paths', PROJECT, '--limit', '3']).payload;
    assert.deepEqual(limited.executions.map(e => e.invocation.record), [`msg_${OC.root}_10`, `msg_${OC.root}_08`, 'u-inv4']);
    assert.equal(limited.unread.find(u => u.kind === 'executions-beyond-limit').count, 2);
    assert.deepEqual(all.executions.map(e => e.in_progress), [true, false, true, false, false], 'only the last execution of an opencode session can be in progress');
    assert.deepEqual(all.executions[1].principal_workers.map(w => w.agent_id), [OC.late]);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

opencodeTest('opencode: a session target reads that harness only; a child session resolves to its parent execution', () => {
  const config = makeConfig();
  try {
    makeOpencodeDb(config);
    const root = run(config, ['index', OC.root, '--paths', PROJECT]).payload;
    assert.deepEqual(root.harnesses.map(h => h.harness), ['opencode']);
    assert.deepEqual(root.executions.map(e => e.invocation.command), ['sai-status', 'sai-status', 'sai-2-design']);
    const child = run(config, ['index', OC.grand, '--paths', PROJECT]).payload;
    assert.deepEqual(child.executions.map(e => e.invocation.record), [`msg_${OC.root}_02`]);
    assert.match(child.notes[0], /child session of ses_root0001/);
    const lateChild = run(config, ['index', OC.late, '--paths', PROJECT]).payload;
    assert.deepEqual(lateChild.executions.map(e => e.invocation.record), [`msg_${OC.root}_08`]);
    const wrongProject = run(config, ['index', OC.root, '--paths', OTHER_PROJECT]).payload;
    assert.deepEqual(wrongProject.executions, []);
    assert.match(wrongProject.notes[0], /No opencode session ses_root0001 was found/);
    const missing = run(config, ['index', 'ses_nothere', '--paths', PROJECT]).payload;
    assert.deepEqual(missing.executions, []);
    assert.deepEqual(missing.projects.map(p => [p.harness, p.status]), [['opencode', 'inaccessible']]);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

opencodeTest('opencode: reading leaves the database file unchanged', () => {
  const config = makeConfig();
  try {
    const file = makeOpencodeDb(config);
    const before = digest(file);
    run(config, ['index', 'sai-status', '--paths', PROJECT]);
    run(config, ['excerpt', '--project', PROJECT, '--session', OC.root]);
    assert.equal(digest(file), before);
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['opencode.db']);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

opencodeTest('opencode: a schema that fails the guard reports opencode as not analyzed and reads nothing', () => {
  const config = makeConfig();
  try {
    makeOpencodeDb(config, { sessionColumns: 'id text primary key, directory text NOT NULL, time_created integer NOT NULL' });
    const { status, payload } = run(config, ['index', 'sai-status', '--paths', PROJECT]);
    assert.equal(status, 0);
    assert.deepEqual(payload.harnesses.map(h => [h.harness, h.status]), [['claude', 'analyzed'], ['opencode', 'not-analyzed']]);
    assert.match(payload.harnesses[1].reason, /session_v2 table lacks the column\(s\) parent_id, agent, title/);
    assert.deepEqual(payload.executions.map(e => e.harness), ['claude', 'claude', 'claude']);
    const target = run(config, ['index', OC.root, '--paths', PROJECT]).payload;
    assert.deepEqual(target.executions, []);
    assert.equal(target.harnesses[0].status, 'not-analyzed');
    assert.equal(run(config, ['excerpt', '--project', PROJECT, '--session', OC.root]).payload.error.code, 'OPENCODE_UNAVAILABLE');
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

opencodeTest('opencode: a file that is not a database reports opencode as not analyzed', () => {
  const config = makeConfig();
  try {
    fs.mkdirSync(path.join(config, 'data', 'opencode'), { recursive: true });
    fs.writeFileSync(path.join(config, 'data', 'opencode', 'opencode.db'), 'this is not a sqlite database, '.repeat(20));
    const { status, payload } = run(config, ['index', 'sai-status', '--paths', PROJECT]);
    assert.equal(status, 0);
    assert.equal(payload.harnesses[1].status, 'not-analyzed');
    assert.match(payload.harnesses[1].reason, /could not be (read|opened)/);
    assert.equal(payload.executions.length, 3);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

test('opencode: a runtime without node:sqlite reports opencode as not analyzed and keeps the Claude Code data', () => {
  const config = makeConfig();
  try {
    const payload = main(['index', 'sai-status', '--paths', PROJECT], envFor(config), () => { throw new Error('No such built-in module: node:sqlite'); });
    assert.deepEqual(payload.harnesses.map(h => [h.harness, h.status]), [['claude', 'analyzed'], ['opencode', 'not-analyzed']]);
    assert.match(payload.harnesses[1].reason, /node:sqlite is not available in this Node runtime/);
    assert.equal(payload.executions.length, 3);
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

opencodeTest('opencode excerpt: pages records by ID for a session and for a child session of it', () => {
  const config = makeConfig();
  try {
    makeOpencodeDb(config);
    const first = run(config, ['excerpt', '--project', PROJECT, '--session', OC.root, '--from', `msg_${OC.root}_02`, '--count', '3', '--max-chars', '12']).payload;
    assert.deepEqual(first.records.map(r => r.id), [`msg_${OC.root}_02`, `msg_${OC.root}_04`, `msg_${OC.root}_05`]);
    assert.match(first.records[0].text, /^Fetch @sai\/c… \[\+\d+ chars\]$/);
    assert.equal(first.next_record, `msg_${OC.root}_06`);
    const next = run(config, ['excerpt', '--project', PROJECT, '--session', OC.root, '--from', first.next_record, '--count', '1']).payload;
    assert.deepEqual(next.records[0].tool_results.map(r => [r.tool_use_id, r.is_error]), [['call-1', false], ['call-2', false], ['call-3', true], ['call-4', false], ['call-5', false]]);
    assert.equal(next.records[0].tool_results[0].text, 'remember text');
    assert.equal(next.records[0].agent, 'build');
    const worker = run(config, ['excerpt', '--project', PROJECT, '--session', OC.root, '--agent', OC.worker]).payload;
    assert.deepEqual(worker.records.map(r => r.id), [`msg_${OC.worker}_01`, `msg_${OC.worker}_02`]);
    assert.equal(worker.next_record, null);
    assert.equal(worker.records[1].tool_results[1].is_error, true);
    const code = (args) => run(config, ['excerpt', '--project', PROJECT, '--session', OC.root, ...args]).payload.error.code;
    assert.equal(code(['--from', 'missing']), 'NOT_FOUND');
    assert.equal(code(['--agent', OC.other]), 'NOT_FOUND', 'a session of another tree is not an agent of this one');
    assert.equal(code(['--agent', 'a0123456789abcdef']), 'USAGE');
    assert.equal(run(config, ['excerpt', '--project', OTHER_PROJECT, '--session', OC.root]).payload.error.code, 'NOT_FOUND');
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------
// cost measurement: usage, tool calls, pipeline segments, dispatch, worktrees, pairing
// ---------------------------------------------------------------------------

const { claudeTokens, opencodeTokens, claudeUsage, opencodeUsage } = require('../skills/universal/sai-context-cache-ttl-benchmark/adapters.js');
const { cost, index, changeNameFromArgs, expandProjects } = require('../sai/tools/retrospective.js');

const GIT = spawnSync('git', ['--version']).status === 0;
const gitTest = (name, fn) => test(name, { skip: !GIT && 'git is not available' }, fn);
const gitOpencodeTest = (name, fn) => test(name, { skip: (!GIT && 'git is not available') || (!DatabaseSync && 'node:sqlite is not available in this runtime') }, fn);

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

// A repository with one linked worktree, a worktree that was removed again, and a
// sibling directory sharing the name prefix that is its own repository.
function makeRepos() {
  const base = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'sai-cost-'));
  const main = path.join(base, 'demo');
  const linked = path.join(base, 'demo.wt1'), removed = path.join(base, 'demo.gone'), sibling = path.join(base, 'demo.mobile');
  fs.mkdirSync(main);
  if (!GIT) return { base, main, linked, removed, sibling };
  git(main, 'init', '-q');
  git(main, 'commit', '-q', '--allow-empty', '-m', 'init');
  git(main, 'worktree', 'add', '-q', '-b', 'wt1', linked);
  git(main, 'worktree', 'add', '-q', '-b', 'gone', removed);
  git(main, 'worktree', 'remove', '--force', removed);
  fs.mkdirSync(sibling);
  git(sibling, 'init', '-q');
  return { base, main, linked, removed, sibling };
}

const CS = { design: '1a000000-0000-4000-8000-000000000001', implement: '1a000000-0000-4000-8000-000000000002', build: '1a000000-0000-4000-8000-000000000003', blank: '1a000000-0000-4000-8000-000000000004', lonely: '1a000000-0000-4000-8000-000000000005', pathName: '1a000000-0000-4000-8000-000000000006', plan: '1a000000-0000-4000-8000-000000000007', sibling: '1a000000-0000-4000-8000-000000000008', gone: '1a000000-0000-4000-8000-000000000009' };

function usage(input, output, read, write5m, write1h) {
  return { input_tokens: input, output_tokens: output, cache_read_input_tokens: read, cache_creation_input_tokens: write5m + write1h, cache_creation: { ephemeral_5m_input_tokens: write5m, ephemeral_1h_input_tokens: write1h } };
}

// One transcript line of an assistant response; `usageValue` null leaves the usage out.
function turnLine(session, agent, uuid, time, messageId, usageValue, content, stop = 'tool_use') {
  return JSON.stringify({ sessionId: session, ...(agent ? { agentId: agent, isSidechain: true } : {}), type: 'assistant', uuid, timestamp: time, message: { id: messageId, role: 'assistant', model: 'claude-test', stop_reason: stop, content, ...(usageValue ? { usage: usageValue } : {}) } });
}

function userLine(session, agent, uuid, time, text) {
  return JSON.stringify({ sessionId: session, ...(agent ? { agentId: agent, isSidechain: true } : {}), type: 'user', uuid, timestamp: time, message: { role: 'user', content: text } });
}

function invocationLine(session, uuid, time, name, args = '') {
  return JSON.stringify({ sessionId: session, type: 'user', uuid, timestamp: time, message: { role: 'user', content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>${args ? `\n<command-args>${args}</command-args>` : ''}` } });
}

function writeSession(folder, session, lines, agents = []) {
  fs.mkdirSync(path.join(folder, session, 'subagents'), { recursive: true });
  fs.writeFileSync(path.join(folder, `${session}.jsonl`), `${lines.join('\n')}\n`);
  for (const { id, meta, lines: agentLines } of agents) {
    fs.writeFileSync(path.join(folder, session, 'subagents', `agent-${id}.meta.json`), JSON.stringify(meta));
    if (agentLines) fs.writeFileSync(path.join(folder, session, 'subagents', `agent-${id}.jsonl`), `${agentLines.join('\n')}\n`);
  }
}

const agentTool = (id, type) => ({ type: 'tool_use', id, name: 'Agent', input: { subagent_type: type } });
const AG = { designWorker: 'a1000000000000001', nested: 'a1000000000000002', aux: 'a1000000000000003', red: 'a1000000000000004', green: 'a1000000000000005', review: 'a1000000000000006', reviewHelper: 'a1000000000000007', red2: 'a1000000000000008' };

function makeCostClaude(config, repos) {
  const projects = path.join(config, 'projects');
  const folder = project => projectFolder(projects, project);
  const mainFolder = folder(repos.main);
  const meta = (type, toolUseId, extra = {}) => ({ agentType: type, toolUseId, spawnDepth: 1, finished: true, ...extra });

  // A design run: a request written as two lines (the later one carries the final output), a worker that wrote
  // to the change, a helper the worker dispatched, a helper without a transcript, and a request without usage.
  const S = CS.design;
  writeSession(mainFolder, S, [
    invocationLine(S, 'd-inv', '2026-02-01T10:00:00.000Z', 'sai-2-design', 'plan-change --fast-track'),
    turnLine(S, null, 'd-1a', '2026-02-01T10:00:01.000Z', 'm-1', usage(100, 10, 1000, 200, 300), [{ type: 'text', text: 'dispatching' }]),
    turnLine(S, null, 'd-1b', '2026-02-01T10:00:01.500Z', 'm-1', usage(100, 25, 1000, 200, 300), [agentTool('tu-worker', 'sai-2-design-worker')]),
    turnLine(S, null, 'd-2', '2026-02-01T10:00:20.000Z', 'm-2', usage(50, 5, 2000, 0, 100), [agentTool('tu-aux', 'budget-explorer'), { type: 'tool_use', id: 'tu-read', name: 'Read', input: { file_path: '/x' } }]),
    turnLine(S, null, 'd-3', '2026-02-01T10:00:40.000Z', 'm-3', null, [{ type: 'text', text: 'done' }], 'end_turn'),
  ], [
    { id: AG.designWorker, meta: meta('sai-2-design-worker', 'tu-worker', { description: 'design' }), lines: [
      userLine(S, AG.designWorker, 'w-0', '2026-02-01T10:00:02.000Z', 'task'),
      turnLine(S, AG.designWorker, 'w-1', '2026-02-01T10:00:03.000Z', 'wm-1', usage(10, 20, 300, 40, 0), [agentTool('tu-nested', 'budget-explorer'), { type: 'tool_use', id: 'tu-write', name: 'Write', input: { file_path: 'openspec/changes/plan-change/design.md', content: 'x' } }]),
      turnLine(S, AG.designWorker, 'w-2', '2026-02-01T10:00:10.000Z', 'wm-2', usage(5, 6, 700, 0, 8), [{ type: 'text', text: 'done' }], 'end_turn'),
    ] },
    { id: AG.nested, meta: meta('budget-explorer', 'tu-nested', { parentAgentId: AG.designWorker, spawnDepth: 2 }), lines: [
      turnLine(S, AG.nested, 'n-1', '2026-02-01T10:00:05.000Z', 'nm-1', usage(1, 2, 3, 4, 0), [{ type: 'tool_use', id: 'tu-grep', name: 'Grep', input: {} }, { type: 'tool_use', id: 'tu-glob', name: 'Glob', input: {} }]),
    ] },
    { id: AG.aux, meta: meta('budget-explorer', 'tu-aux') },
  ]);

  // Implementation runs of the same change: a rerun stays a separate run; the GREEN worker has no usage data.
  const I = CS.implement;
  writeSession(mainFolder, I, [
    invocationLine(I, 'i-inv', '2026-02-02T10:00:00.000Z', 'sai-3-implement', 'plan-change'),
    turnLine(I, null, 'i-1', '2026-02-02T10:00:01.000Z', 'im-1', usage(7, 7, 70, 7, 0), [agentTool('tu-red', 'sai-3-red-worker'), agentTool('tu-green', 'sai-3-green-worker')], 'end_turn'),
  ], [
    { id: AG.red, meta: meta('sai-3-red-worker', 'tu-red'), lines: [turnLine(I, AG.red, 'r-1', '2026-02-02T10:00:02.000Z', 'rm-1', usage(11, 12, 130, 14, 0), [{ type: 'tool_use', id: 'tu-r1', name: 'Bash', input: {} }])] },
    { id: AG.green, meta: meta('sai-3-green-worker', 'tu-green'), lines: [turnLine(I, AG.green, 'g-1', '2026-02-02T10:00:03.000Z', 'gm-1', {}, [{ type: 'tool_use', id: 'tu-g1', name: 'Bash', input: {} }])] },
  ]);

  // /sai-build: its review worker and the helper that worker dispatched stay outside the three segments.
  const B = CS.build;
  writeSession(mainFolder, B, [
    invocationLine(B, 'b-inv', '2026-02-03T10:00:00.000Z', 'sai-build', 'plan-change'),
    turnLine(B, null, 'b-1', '2026-02-03T10:00:01.000Z', 'bm-1', usage(3, 3, 30, 3, 0), [agentTool('tu-red2', 'sai-3-red-worker'), agentTool('tu-review', 'sai-4-review-worker')], 'end_turn'),
  ], [
    { id: AG.red2, meta: meta('sai-3-red-worker', 'tu-red2'), lines: [turnLine(B, AG.red2, 'r2-1', '2026-02-03T10:00:02.000Z', 'r2m-1', usage(1, 1, 1, 1, 0), [])] },
    { id: AG.review, meta: meta('sai-4-review-worker', 'tu-review'), lines: [turnLine(B, AG.review, 'v-1', '2026-02-03T10:00:03.000Z', 'vm-1', usage(2, 2, 2, 2, 0), [agentTool('tu-helper', 'budget-explorer')])] },
    { id: AG.reviewHelper, meta: meta('budget-explorer', 'tu-helper', { parentAgentId: AG.review, spawnDepth: 2 }), lines: [turnLine(B, AG.reviewHelper, 'vh-1', '2026-02-03T10:00:04.000Z', 'vhm-1', usage(4, 4, 4, 4, 0), [])] },
  ]);

  // A planning run whose change name cannot be determined, and a planning run with no implementation.
  writeSession(mainFolder, CS.blank, [invocationLine(CS.blank, 'k-inv', '2026-02-04T10:00:00.000Z', 'sai-1-spec'), turnLine(CS.blank, null, 'k-1', '2026-02-04T10:00:01.000Z', 'km-1', usage(1, 1, 1, 1, 0), [], 'end_turn')]);
  writeSession(mainFolder, CS.lonely, [invocationLine(CS.lonely, 'l-inv', '2026-02-05T10:00:00.000Z', 'sai-2-design', 'lonely-change'), turnLine(CS.lonely, null, 'l-1', '2026-02-05T10:00:01.000Z', 'lm-1', usage(1, 1, 1, 1, 0), [], 'end_turn')]);
  // A planning run named by its Ready to Propose block.
  writeSession(mainFolder, CS.plan, [invocationLine(CS.plan, 'p-inv', '2026-02-06T10:00:00.000Z', 'sai-plan', '## Ready to Propose\n\n**Change name**: path-change\n**What**: x'), turnLine(CS.plan, null, 'p-1', '2026-02-06T10:00:01.000Z', 'pm-1', usage(1, 1, 1, 1, 0), [], 'end_turn')]);

  // An implementation run without arguments in a linked worktree: its change is the one it wrote to.
  const W = CS.pathName;
  writeSession(folder(repos.linked), W, [
    invocationLine(W, 'w-inv', '2026-02-07T10:00:00.000Z', 'sai-3-implement'),
    turnLine(W, null, 'x-1', '2026-02-07T10:00:01.000Z', 'xm-1', usage(2, 2, 2, 2, 0), [{ type: 'tool_use', id: 'tu-edit', name: 'Edit', input: { file_path: 'C:\\repo\\openspec\\changes\\path-change\\tasks.md', old_string: 'a', new_string: 'b' } }], 'end_turn'),
  ]);

  // Sessions of a sibling repository and of a removed worktree stay out of the project.
  writeSession(folder(repos.sibling), CS.sibling, [invocationLine(CS.sibling, 's-inv', '2026-02-08T10:00:00.000Z', 'sai-1-spec', 'sibling-change'), turnLine(CS.sibling, null, 's-1', '2026-02-08T10:00:01.000Z', 'sm-1', usage(1, 1, 1, 1, 0), [], 'end_turn')]);
  writeSession(folder(repos.removed), CS.gone, [invocationLine(CS.gone, 'g-inv', '2026-02-09T10:00:00.000Z', 'sai-1-spec', 'gone-change'), turnLine(CS.gone, null, 'q-1', '2026-02-09T10:00:01.000Z', 'qm-1', usage(1, 1, 1, 1, 0), [], 'end_turn')]);
}

function costConfig() {
  const repos = makeRepos();
  const config = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'sai-cost-cfg-'));
  makeCostClaude(config, repos);
  const cleanup = () => { fs.rmSync(config, { recursive: true, force: true }); fs.rmSync(repos.base, { recursive: true, force: true }); };
  return { repos, config, env: envFor(config), cleanup };
}

const realSqlite = () => require('node:sqlite');
const unavailableSqlite = () => { throw new Error('No such built-in module: node:sqlite'); };
const agentOf = (execution, id) => [...execution.principal_workers, ...execution.auxiliary_agents].find(agent => agent.agent_id === id);

test('token readers: a missing usage reads as unavailable, never zero, and the cache readers still throw', () => {
  assert.deepEqual(claudeTokens({ type: 'assistant', message: { usage: usage(1, 2, 3, 4, 5) } }), { input: 1, output: 2, cache_read: 3, cache_write_5m: 4, cache_write_1h: 5, cache_write_unsplit: null });
  assert.equal(claudeTokens({ type: 'assistant', message: { usage: {} } }), 'unavailable');
  assert.equal(claudeTokens({ type: 'assistant', message: {} }), 'unavailable');
  assert.equal(claudeTokens({ type: 'assistant', message: { usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 0, cache_creation_input_tokens: 9 } } }).cache_write_unsplit, 9);
  assert.deepEqual(opencodeTokens({ tokens: { input: 1, output: 2, reasoning: 3, cache: { read: 4, write: 5 } }, cost: 0.5 }), { input: 1, output: 2, reasoning: 3, cache_read: 4, cache_write: 5, cost: 0.5 });
  assert.equal(opencodeTokens({ time: {} }), 'unavailable');
  assert.throws(() => opencodeUsage({ type: 'assistant', time: { completed: 1 } }), /unavailable/);
  assert.throws(() => claudeUsage({ type: 'assistant', message: { model: 'x', usage: {} } }), /unavailable/);
});

test('changeNameFromArgs reads a name, a quoted name, or a block, and skips option values', () => {
  assert.equal(changeNameFromArgs('plan-change --fast-track'), 'plan-change');
  assert.equal(changeNameFromArgs('"quoted-change --supervised"'), 'quoted-change');
  assert.equal(changeNameFromArgs('--supervised\n## Ready to Propose\n\n**Change name**: block-change\n'), 'block-change');
  assert.equal(changeNameFromArgs('--overview-lang Español named-change'), 'named-change');
  assert.equal(changeNameFromArgs(''), null);
  assert.equal(changeNameFromArgs('--fast-track'), null);
  assert.equal(changeNameFromArgs('Not A Name'), null);
});

test('cost: Claude Code agents carry usage, tool calls, pipeline segment, and the agent that dispatched them', () => {
  const { repos, env, cleanup } = costConfig();
  try {
    const { executions } = index(['sai-2-design', '--paths', repos.main], env, unavailableSqlite);
    assert.equal(executions.length, 2, 'the design run and the lonely design run');
    const design = executions.find(execution => execution.change_name === 'plan-change');
    // E1: the request without usage is counted apart; the two lines of one request count once, with the final output.
    assert.deepEqual(design.coordinator, { pipeline_segment: 'design', usage: { requests: 3, requests_without_usage: 1, input: 150, output: 30, cache_read: 3000, cache_write_5m: 200, cache_write_1h: 400 }, tool_calls: 3 });
    const worker = agentOf(design, AG.designWorker);
    assert.equal(worker.pipeline_segment, 'design');
    assert.equal(worker.parent_agent_id, null);
    assert.deepEqual(worker.usage, { requests: 2, input: 15, output: 26, cache_read: 1000, cache_write_5m: 40, cache_write_1h: 8 });
    assert.equal(worker.tool_calls, 2);
    // E2: a helper the worker dispatched is a separate agent linked to it, and its figures are not the worker's.
    const nested = agentOf(design, AG.nested);
    assert.equal(nested.parent_agent_id, AG.designWorker);
    assert.equal(nested.spawn_depth, 2);
    assert.equal(nested.pipeline_segment, null);
    assert.deepEqual(nested.usage, { requests: 1, input: 1, output: 2, cache_read: 3, cache_write_5m: 4, cache_write_1h: 0 });
    assert.equal(nested.tool_calls, 2);
    assert.ok(design.auxiliary_agents.some(agent => agent.agent_id === AG.nested));
    // E1: a helper without a transcript reports unavailable usage, not zero, and stays in the index.
    const aux = agentOf(design, AG.aux);
    assert.equal(aux.usage, 'unavailable');
    assert.equal(aux.tool_calls, null);
    assert.equal(aux.parent_agent_id, null);
  } finally { cleanup(); }
});

test('cost: an agent with no usable request is unavailable and its run stays in the index', () => {
  const { repos, env, cleanup } = costConfig();
  try {
    const [implement] = index(['sai-3-implement', '--paths', repos.main], env, unavailableSqlite).executions;
    assert.equal(agentOf(implement, AG.green).usage, 'unavailable');
    assert.equal(agentOf(implement, AG.green).tool_calls, 1);
    assert.equal(agentOf(implement, AG.red).pipeline_segment, 'implement');
    assert.equal(agentOf(implement, AG.green).pipeline_segment, 'implement');
    assert.deepEqual(agentOf(implement, AG.red).usage, { requests: 1, input: 11, output: 12, cache_read: 130, cache_write_5m: 14, cache_write_1h: 0 });
  } finally { cleanup(); }
});

gitTest('cost: a project is measured with the worktrees git reports, never a sibling directory or a removed worktree', () => {
  const { repos, env, cleanup } = costConfig();
  try {
    const notes = [];
    assert.deepEqual(expandProjects([repos.main], true, notes).map(member => [member.path, member.group]), [[repos.main, repos.main], [repos.linked, repos.main]]);
    assert.deepEqual(expandProjects([repos.main], false, notes).map(member => member.path), [repos.main]);
    const report = cost(['--paths', repos.main, '--with-worktrees'], env, unavailableSqlite);
    assert.deepEqual(report.projects.map(project => project.project), [repos.main, repos.linked]);
    assert.ok(report.runs.every(run => run.project_group === repos.main));
    assert.ok(!report.runs.some(run => /sibling-change|gone-change/.test(run.change ?? '')), 'sibling and removed worktree sessions stay out');
    assert.equal(report.runs.length, 7);
    assert.equal(cost(['--paths', repos.main], env, unavailableSqlite).runs.length, 6, 'without the option the linked worktree stays out');
    const missing = expandProjects([path.join(repos.base, 'not-a-repo')], true, notes);
    assert.equal(missing.length, 1);
    assert.match(notes[0], /git could not list the worktrees/);
  } finally { cleanup(); }
});

gitTest('cost: planning and implementation runs pair by change name; unknown names and lone runs are unpaired', () => {
  const { repos, env, cleanup } = costConfig();
  try {
    const report = cost(['--paths', repos.main, '--with-worktrees'], env, unavailableSqlite);
    const byName = Object.fromEntries(report.changes.map(change => [change.change, change]));
    const runOf = number => report.runs[number - 1];
    // E3: the rerun and the /sai-build run are separate implementation runs under the same change.
    assert.equal(byName['plan-change'].status, 'paired');
    assert.deepEqual(byName['plan-change'].planning_runs.map(n => runOf(n).command), ['sai-2-design']);
    assert.deepEqual(byName['plan-change'].implementation_runs.map(n => runOf(n).command), ['sai-3-implement', 'sai-build']);
    // The block names one change and the worktree run is named by the change its coordinator wrote to.
    assert.equal(byName['path-change'].status, 'paired');
    assert.deepEqual(byName['path-change'].planning_runs.map(n => runOf(n).command), ['sai-plan']);
    assert.equal(runOf(byName['path-change'].implementation_runs[0]).project_group, repos.main);
    assert.deepEqual([byName['lonely-change'].status, byName['lonely-change'].side], ['unpaired', 'planning-only']);
    assert.deepEqual(report.unnamed_runs.map(entry => [runOf(entry.run).command, entry.status]), [['sai-1-spec', 'unpaired']]);
    assert.equal(report.changes.length, 3);
  } finally { cleanup(); }
});

gitTest('cost: segments split the pipeline workers; any other worker and what it dispatches stay outside them', () => {
  const { repos, env, cleanup } = costConfig();
  try {
    const report = cost(['--paths', repos.main], env, unavailableSqlite);
    const rows = report.rows.filter(row => row.harness === 'claude');
    const row = (segment, role, type) => rows.find(candidate => candidate.segment === segment && candidate.role === role && candidate.agent_type === type);
    assert.deepEqual([row('design', 'worker', 'sai-2-design-worker').input, row('design', 'worker', 'sai-2-design-worker').tool_calls], [15, 2]);
    // The helper of the design worker and the helper the design coordinator launched are reported by type under
    // the design segment, apart from the worker; the one without a transcript adds no figures.
    assert.equal(row('design', 'dispatched', 'budget-explorer').input, 1);
    assert.equal(row('design', 'dispatched', 'budget-explorer').agents, 2);
    assert.equal(row('design', 'dispatched', 'budget-explorer').unavailable_agents, 1);
    assert.equal(row('implement', 'worker', 'sai-3-red-worker').runs, 2);
    assert.equal(row('implement', 'worker', 'sai-3-green-worker').unavailable_agents, 1);
    assert.equal(row('implement', 'worker', 'sai-3-green-worker').input, undefined, 'unavailable usage adds no zero');
    // E7: the review worker keeps its type and the helper it dispatched follows it out of every segment.
    assert.equal(row('other', 'worker', 'sai-4-review-worker').input, 2);
    assert.equal(row('other', 'dispatched', 'budget-explorer').input, 4);
    assert.ok(!rows.some(candidate => candidate.segment !== 'other' && candidate.agent_type === 'sai-4-review-worker'));
    assert.equal(row('other', 'coordinator', 'sai-build').input, 3);
    assert.equal(row('design', 'coordinator', 'sai-2-design').input, 151);
  } finally { cleanup(); }
});

// opencode fixtures: a design run with a worker, a helper below it, and a helper that never produced a message.
const OCC = { design: 'ses_cost_design', designWorker: 'ses_cost_dworker', nested: 'ses_cost_nested', aux: 'ses_cost_aux', implement: 'ses_cost_impl', red: 'ses_cost_red', wt: 'ses_cost_wt' };

function makeCostOpencode(config, repos) {
  const directory = path.join(config, 'data', 'opencode');
  fs.mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, 'opencode.db'));
  db.exec(`CREATE TABLE session_v2 (${SESSION_COLUMNS}); CREATE TABLE session_message (${MESSAGE_COLUMNS});`);
  const insertSession = db.prepare('INSERT INTO session_v2 (id, parent_id, agent, title, directory, time_created) VALUES (?, ?, ?, ?, ?, ?)');
  const insertMessage = db.prepare('INSERT INTO session_message (id, session_id, type, seq, time_created, data) VALUES (?, ?, ?, ?, ?, ?)');
  // opencode keeps the separators of the platform that created the session.
  const forward = repos.main.replace(/\\/g, '/'), backward = repos.linked.replace(/\//g, '\\');
  for (const [id, parent, agent, dir, clock] of [
    [OCC.design, null, 'build', forward, '09:00:00.000'], [OCC.designWorker, OCC.design, 'sai-2-design-worker', forward, '09:00:10.000'], [OCC.nested, OCC.designWorker, 'explore', forward, '09:00:20.000'], [OCC.aux, OCC.design, 'explore', forward, '09:00:30.000'],
    [OCC.implement, null, 'build', forward, '10:00:00.000'], [OCC.red, OCC.implement, 'sai-3-red-worker', forward, '10:00:10.000'],
    [OCC.wt, null, 'build', backward, '11:00:00.000'],
  ]) insertSession.run(id, parent, agent, `title ${id}`, dir, at(clock));
  let seq = 0;
  const message = (session, type, clock, data) => insertMessage.run(`msg_${session}_${String(++seq).padStart(3, '0')}`, session, type, seq, at(clock), JSON.stringify(data));
  const assistant = (session, clock, tokens, spent, content) => message(session, 'assistant', clock, { time: doneTime(clock), agent: 'build', ...(tokens ? { tokens } : {}), ...(spent !== null ? { cost: spent } : {}), content });
  message(OCC.design, 'user', '09:00:01.000', { time: { created: at('09:00:01.000') }, text: envelope('design', 'oc-change') });
  assistant(OCC.design, '09:00:02.000', { input: 100, output: 10, reasoning: 4, cache: { read: 1000, write: 50 } }, 0.25, [tool('c1', 'subagent', { status: 'completed', input: {}, content: [] }), tool('c2', 'read', { status: 'completed', input: { path: '/x' }, content: [] })]);
  assistant(OCC.design, '09:00:03.000', { input: 20, output: 2, reasoning: 0, cache: { read: 200, write: 0 } }, 0.5, [{ type: 'text', text: 'done' }]);
  message(OCC.designWorker, 'user', '09:00:11.000', { time: { created: at('09:00:11.000') }, text: 'Worker contract' });
  assistant(OCC.designWorker, '09:00:12.000', { input: 30, output: 3, reasoning: 1, cache: { read: 300, write: 10 } }, 0.5, [tool('w1', 'write', { status: 'completed', input: { path: '/repo/openspec/changes/oc-change/design.md' }, content: [] }), tool('w2', 'subagent', { status: 'completed', input: {}, content: [] })]);
  assistant(OCC.designWorker, '09:00:13.000', null, null, [{ type: 'text', text: 'interrupted before usage' }]);
  message(OCC.nested, 'user', '09:00:21.000', { time: { created: at('09:00:21.000') }, text: 'research' });
  assistant(OCC.nested, '09:00:22.000', { input: 4, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }, 0, [tool('n1', 'grep', { status: 'completed', input: {}, content: [] })]);
  message(OCC.aux, 'user', '09:00:31.000', { time: { created: at('09:00:31.000') }, text: 'research' });
  message(OCC.implement, 'user', '10:00:01.000', { time: { created: at('10:00:01.000') }, text: envelope('implement', 'oc-change') });
  assistant(OCC.implement, '10:00:02.000', { input: 9, output: 9, reasoning: 0, cache: { read: 90, write: 9 } }, 0.125, []);
  message(OCC.red, 'user', '10:00:11.000', { time: { created: at('10:00:11.000') }, text: 'Worker contract' });
  assistant(OCC.red, '10:00:12.000', { input: 5, output: 5, reasoning: 0, cache: { read: 50, write: 5 } }, 0.25, [tool('r1', 'shell', { status: 'completed', input: { command: 'x' }, content: [] })]);
  message(OCC.wt, 'user', '11:00:01.000', { time: { created: at('11:00:01.000') }, text: envelope('implement') });
  assistant(OCC.wt, '11:00:02.000', { input: 1, output: 1, reasoning: 0, cache: { read: 1, write: 1 } }, 0, [tool('x1', 'edit', { status: 'completed', input: { path: '/repo/openspec/changes/wt-change/tasks.md' }, content: [] })]);
  db.close();
}

opencodeTest('cost: opencode agents carry usage and cost from the session messages, tool calls, and their dispatcher', () => {
  const { repos, config, env, cleanup } = costConfig();
  try {
    makeCostOpencode(config, repos);
    const { executions } = index(['sai-2-design', '--paths', repos.main], env, realSqlite);
    const design = executions.find(execution => execution.harness === 'opencode');
    assert.equal(design.project, repos.main, 'the project is the supplied path, whatever separators opencode stored');
    assert.deepEqual(design.coordinator, { pipeline_segment: 'design', usage: { requests: 2, input: 120, output: 12, reasoning: 4, cache_read: 1200, cache_write: 50, cost: 0.75 }, tool_calls: 2 });
    const worker = agentOf(design, OCC.designWorker);
    assert.equal(worker.pipeline_segment, 'design');
    assert.equal(worker.parent_agent_id, null);
    // E1: the message the run was interrupted on has no usage; it is counted, never read as zero.
    assert.deepEqual(worker.usage, { requests: 2, requests_without_usage: 1, input: 30, output: 3, reasoning: 1, cache_read: 300, cache_write: 10, cost: 0.5 });
    assert.equal(worker.tool_calls, 2);
    // E2: the helper below the worker is its own agent, linked to it; the one with no messages is unavailable.
    const nested = agentOf(design, OCC.nested);
    assert.equal(nested.parent_agent_id, OCC.designWorker);
    assert.equal(nested.spawn_depth, 2);
    assert.deepEqual(nested.usage, { requests: 1, input: 4, output: 1, reasoning: 0, cache_read: 0, cache_write: 0, cost: 0 });
    assert.equal(agentOf(design, OCC.aux).usage, 'unavailable');
    assert.equal(agentOf(design, OCC.aux).parent_agent_id, null);
    assert.equal(design.change_name, 'oc-change');
  } finally { cleanup(); }
});

gitOpencodeTest('cost: opencode runs pair by change name and group the worktrees git reports', () => {
  const { repos, config, env, cleanup } = costConfig();
  try {
    makeCostOpencode(config, repos);
    const report = cost(['--paths', repos.main, '--with-worktrees'], env, realSqlite);
    const opencodeRuns = report.runs.filter(run => run.harness === 'opencode');
    assert.deepEqual(opencodeRuns.map(run => [run.command, run.change]), [['sai-2-design', 'oc-change'], ['sai-3-implement', 'oc-change'], ['sai-3-implement', 'wt-change']]);
    assert.ok(opencodeRuns.every(run => run.project_group === repos.main), 'the worktree session joins its project');
    assert.equal(report.changes.find(candidate => candidate.change === 'oc-change').status, 'paired');
    assert.equal(report.changes.find(candidate => candidate.change === 'wt-change').side, 'implementation-only');
    const red = opencodeRuns[1].agents.find(agent => agent.agent_type === 'sai-3-red-worker');
    assert.deepEqual([red.segment, red.role, red.usage.cache_write, red.usage.cost, red.tool_calls], ['implement', 'worker', 5, 0.25, 1]);
    assert.ok(report.projects.some(project => project.harness === 'opencode' && project.project === repos.linked && project.sessions_read === 1));
    assert.ok(report.rows.some(row => row.harness === 'opencode' && row.cache_write !== undefined && row.cache_write_5m === undefined), 'opencode reports one cache-write figure');
    assert.ok(report.rows.filter(row => row.harness === 'claude').every(row => row.cost === undefined), 'Claude Code records no cost');
  } finally { cleanup(); }
});

gitTest('cost --format markdown: an aliased project shows its alias and numbered changes, nothing else of it', () => {
  const { repos, env, cleanup } = costConfig();
  try {
    const text = cost(['--paths', repos.main, '--with-worktrees', '--alias', `${repos.main}=Project B`, '--format', 'markdown'], env, unavailableSqlite);
    assert.equal(typeof text, 'string');
    assert.match(text, /^# Planning and implementation cost baseline \(\d{4}-\d{2}-\d{2}\)/);
    assert.match(text, /## Project B/);
    assert.match(text, /\| change 1 \| paired \|/);
    for (const hidden of ['plan-change', 'path-change', 'lonely-change', 'demo', path.basename(repos.base), repos.main, CS.design]) assert.ok(!text.includes(hidden), `the report leaks ${hidden}`);
    // Claude Code separates the cache writes; the design worker row carries the 5-minute and 1-hour columns.
    assert.match(text, /Cache write 5m \| Cache write 1h/);
    assert.match(text, /\| design \| worker \| sai-2-design-worker \| 1 \| 1 \| 15 \| 26 \| 1,000 \| 40 \| 8 \| 2 \|/);
    const named = cost(['--paths', repos.main, '--format', 'markdown'], env, unavailableSqlite);
    assert.match(named, /## demo/);
    assert.match(named, /`plan-change`/);
  } finally { cleanup(); }
});

test('cost: usage errors name their code and exit 2', () => {
  for (const [args, code] of [[['cost', 'sai-status'], 'USAGE'], [['cost', '--format', 'html'], 'USAGE'], [['cost', '--alias', 'no-equals'], 'USAGE'], [['cost', '--bogus', '1'], 'USAGE']]) {
    const result = spawnSync(process.execPath, [TOOL, ...args], { cwd: os.tmpdir(), encoding: 'utf8' });
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(JSON.parse(result.stdout).error.code, code);
  }
});

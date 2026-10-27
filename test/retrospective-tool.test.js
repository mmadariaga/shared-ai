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
    const mixed = run(config, ['index', 'sai-explore', '--paths', `/no/such,"${PROJECT}"`]).payload;
    assert.deepEqual(mixed.projects.map(p => [p.project, p.status]), [['/no/such', 'inaccessible'], [PROJECT, 'analyzed']]);
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
    [OC.root, null, 'build', '/work/demo.project', '12:59:00.000'],
    [OC.orphan, OC.root, 'budget-explorer', '/work/demo.project', '12:59:30.000'],
    [OC.worker, OC.root, 'sai-direct-build-worker', '/work/demo.project', '13:00:30.000'],
    [OC.aux, OC.root, 'budget-explorer', '/work/demo.project', '13:00:35.000'],
    [OC.grand, OC.worker, 'budget-explorer', '/work/demo.project', '13:00:40.000'],
    [OC.late, OC.root, 'sai-direct-build-worker', '/work/demo.project', '14:30:30.000'],
    [OC.other, null, 'build', '/work/other', '16:00:00.000'],
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
    const wrongProject = run(config, ['index', OC.root, '--paths', '/work/other']).payload;
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
    assert.equal(run(config, ['excerpt', '--project', '/work/other', '--session', OC.root]).payload.error.code, 'NOT_FOUND');
  } finally { fs.rmSync(config, { recursive: true, force: true }); }
});

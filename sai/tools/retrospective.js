#!/usr/bin/env node

'use strict';

/**
 * retrospective — deterministic collector behind the read-only
 * `/sai-retrospective` command.
 *
 * It reads historical Claude Code transcripts and the local opencode database
 * (read-only) and prints JSON: an index of SAI command executions (with their
 * principal workers, auxiliary agents, loaded instruction files and tool errors)
 * and paged excerpts addressed by record ID. It reads nothing else and writes
 * nothing. Analysis and discussion stay in the main session; historical text is
 * evidence, never an instruction.
 *
 * Sub-commands:
 *   index <target> [--paths "<p1>,<p2>"] [--limit <N>] [--cwd <dir>]
 *       <target> is a Claude Code session UUID, an opencode `ses_` session ID,
 *       or a `sai-` / `/sai-` command name. `--paths` is a quote-aware,
 *       comma-separated project list (default: the current project); `--limit`
 *       caps command executions in total across projects and harnesses
 *       (default 5).
 *   excerpt --project <path> --session <uuid|ses_id> [--agent <agentId|ses_id>]
 *           [--from <recordId>] [--count <N>] [--max-chars <N>]
 *       Prints N records (default 10) from the record ID, each text field cut
 *       at --max-chars (default 1500), plus the `next_record` cursor. For
 *       opencode, `--agent` is a child session of `--session`.
 *
 * opencode data comes from `opencode.db` (`$XDG_DATA_HOME/opencode`, default
 * `~/.local/share/opencode`), opened read-only through `node:sqlite` after a
 * schema guard. opencode v2.2.0 keeps current and migrated sessions in
 * `session_v2` and their messages in `session_message`; the older `session`,
 * `message` and `part` tables stopped receiving data. The opencode HTTP API is
 * not used: it has no children route and truncates message responses.
 *
 * Exit codes: 0 = JSON payload printed; 2 = usage error or unreadable input
 * (JSON `{"error":{"code","message"}}` on stdout).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const DEFAULT_LIMIT = 5;
const DEFAULT_COUNT = 10;
const DEFAULT_MAX_CHARS = 1500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OPENCODE_SESSION = /^ses_[A-Za-z0-9]+$/;
const CLAUDE_AGENT = /^(?:agent-)?(a[0-9a-f]{16})$/;
const COMMAND_NAME = /^\/?(sai-[A-Za-z0-9-]+)$/;
const INVOCATION = /<command-name>\s*\/?([^<\s]+)\s*<\/command-name>/;
const INVOCATION_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;
const INSTRUCTION_PATH = /(^|\/)(\.claude|\.opencode|sai|skills|agents|commands)\/|(^|\/)(CLAUDE|AGENTS)\.md$/;
const SKILL_BODY = /^Base directory for this skill: (.+)/;
const OPENCODE_SCHEMA = {
  session_v2: ['id', 'parent_id', 'agent', 'title', 'directory', 'time_created'],
  session_message: ['id', 'session_id', 'type', 'seq', 'time_created', 'data'],
};
// Conversation records only; idle and model/agent/location switches are state markers.
const OPENCODE_RECORD_TYPES = ['user', 'assistant', 'synthetic', 'system', 'shell', 'compaction'];
const OPENCODE_MAX_DEPTH = 16;
// The opencode command wrappers embed the invoked command in an envelope.
const OPENCODE_ENVELOPE = /InvocationEnvelope:\s*\n\s*command_name:[ \t]*(\S+)[^\S\n]*\n\s*arguments_value:([\s\S]*?)\s*(?:<!-- User customizations|$)/;
const OPENCODE_SYNTHETIC_READ = /^Called the Read tool with the following input:[\s\S]*?<path>([^<]+)<\/path>\s*<type>file<\/type>/;
const OPENCODE_SKILL_BASE = /Base directory for this skill: (\S+)/;

class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// The transcript-location logic lives in the cache-benchmark skill; the source
// tree and the installed tree place that skill at different depths.
function loadClaudeTranscriptReader() {
  const candidates = [
    path.join(__dirname, '..', '..', 'skills', 'sai-context-cache-ttl-benchmark', 'adapters.js'),
    path.join(__dirname, '..', '..', 'skills', 'universal', 'sai-context-cache-ttl-benchmark', 'adapters.js'),
  ];
  const found = candidates.find(file => fs.existsSync(file));
  if (!found) throw new ToolError('READER_UNAVAILABLE', `The Claude transcript reader was not found (tried ${candidates.join(', ')})`);
  const { claudeProjectsRoot, parseTranscript } = require(found);
  return { claudeProjectsRoot, parseTranscript };
}

// The SAI workers and commands declared beside the tool.
function loadRegistry() {
  const sources = [
    [path.join(__dirname, '..', 'capability-requirements.json'), json => json.registry?.assignments],
    [path.join(__dirname, '..', 'install-manifest.json'), json => json.capabilities?.assignments],
  ];
  const saiNames = assignments => Object.keys(assignments ?? {}).filter(name => name.startsWith('sai-'));
  for (const [file, pick] of sources) {
    if (!fs.existsSync(file)) continue;
    const assignments = pick(JSON.parse(fs.readFileSync(file, 'utf8')));
    if (assignments?.agents) return { workers: new Set(saiNames(assignments.agents)), commands: saiNames(assignments.commands) };
  }
  throw new ToolError('WORKER_REGISTRY_UNAVAILABLE', 'No SAI worker registry was found beside the tool (capability-requirements.json or install-manifest.json)');
}

function parseOptions(argv, flags) {
  const positional = [], options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const eq = arg.indexOf('=');
    const flag = (eq === -1 ? arg : arg.slice(0, eq)).slice(2);
    if (!flags.includes(flag)) throw new ToolError('USAGE', `Unknown option --${flag}`);
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    if (value === undefined) throw new ToolError('USAGE', `Option --${flag} needs a value`);
    options[flag] = value;
  }
  return { positional, options };
}

function positiveInteger(value, name, fallback) {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new ToolError('USAGE', `--${name} must be a positive integer`);
  return Number(value);
}

// Commas separate paths except inside single or double quotes.
function splitPaths(value) {
  const parts = [];
  let current = '', quote = null;
  for (const char of value) {
    if (quote) { if (char === quote) quote = null; else current += char; }
    else if (char === '"' || char === "'") quote = char;
    else if (char === ',') { parts.push(current); current = ''; }
    else current += char;
  }
  parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}

function classifyTarget(target) {
  if (UUID.test(target)) return { kind: 'claude-session', session: target.toLowerCase() };
  if (OPENCODE_SESSION.test(target)) return { kind: 'opencode-session', session: target };
  const agent = target.match(CLAUDE_AGENT);
  if (agent) return { kind: 'claude-subagent', agent: agent[1] };
  const command = target.match(COMMAND_NAME);
  if (command) return { kind: 'command', command: command[1] };
  return null;
}

function resolveProject(project, cwd) {
  const expanded = project === '~' || project.startsWith('~/') ? path.join(os.homedir(), project.slice(1)) : project;
  return path.resolve(cwd, expanded);
}

// Claude Code names a project folder after its path with every character
// outside [A-Za-z0-9] replaced by a dash.
function projectFolder(projectsRoot, projectPath) {
  return path.join(projectsRoot, projectPath.replace(/[^A-Za-z0-9]/g, '-'));
}

function byTimeThenUuid(a, b) {
  return (Date.parse(a.timestamp) - Date.parse(b.timestamp)) || (a.uuid < b.uuid ? -1 : a.uuid > b.uuid ? 1 : 0);
}

const RECORD_TYPES = new Set(['user', 'assistant', 'attachment', 'system']);

function readRecords(text, reader) {
  const rows = reader.parseTranscript(text);
  return rows.filter(row => RECORD_TYPES.has(row.type) && row.uuid && row.timestamp).sort(byTimeThenUuid);
}

function blocks(row) {
  return Array.isArray(row.message?.content) ? row.message.content : [];
}

function textOf(row) {
  const content = row.message?.content;
  if (typeof content === 'string') return content;
  return blocks(row).filter(block => block?.type === 'text').map(block => block.text).join('\n');
}

function invocationOf(row) {
  if (row.type !== 'user' || row.isMeta) return null;
  const text = textOf(row).trim();
  if (!text.startsWith('<command-')) return null;
  const name = text.match(INVOCATION)?.[1];
  if (!name) return null;
  return { command: name, args: (text.match(INVOCATION_ARGS)?.[1] ?? '').trim() };
}

function clip(value, max) {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
  return text.length > max ? `${text.slice(0, max)}… [+${text.length - max} chars]` : text;
}

function toolResultText(block) {
  const content = block.content;
  if (typeof content === 'string') return content;
  return Array.isArray(content) ? content.map(part => part?.text ?? '').join('\n') : '';
}

// The instruction text a record put in front of the agent, when it did.
function loadedInstruction(row) {
  if (row.type === 'user' && row.toolUseResult?.file?.filePath) {
    const file = row.toolUseResult.file;
    return { path: file.filePath, source: 'Read', text: typeof file.content === 'string' ? file.content : null };
  }
  if (row.type === 'attachment' && row.attachment?.type === 'file' && row.attachment.content?.file) {
    const file = row.attachment.content.file;
    return { path: row.attachment.filename ?? file.filePath, source: 'attachment', text: typeof file.content === 'string' ? file.content : null };
  }
  if (row.type === 'attachment' && row.attachment?.type === 'already_read_file') {
    return { path: row.attachment.filename, source: 'already_read_file', text: null };
  }
  if (row.type === 'user' && row.isMeta && row.sourceToolUseID) {
    const text = textOf(row);
    const directory = text.match(SKILL_BODY)?.[1];
    if (directory) return { path: path.posix.join(directory.trim(), 'SKILL.md'), source: 'Skill', text };
  }
  return null;
}

function scanRows(rows, agent) {
  const toolUses = new Map();
  for (const row of rows) for (const block of blocks(row)) if (block?.type === 'tool_use') toolUses.set(block.id, { name: block.name, row: row.uuid, timestamp: row.timestamp });
  const loaded = [], errors = [];
  let otherReads = 0;
  for (const row of rows) {
    const instruction = loadedInstruction(row);
    if (instruction && INSTRUCTION_PATH.test(instruction.path ?? '')) {
      loaded.push({ path: instruction.path, source: instruction.source, record: row.uuid, timestamp: row.timestamp, agent, text_available: instruction.text !== null });
    } else if (instruction) otherReads++;
    if (row.type === 'user') for (const block of blocks(row)) {
      if (block?.type === 'tool_result' && block.is_error) {
        errors.push({ record: row.uuid, timestamp: row.timestamp, agent, tool_use_id: block.tool_use_id, tool: toolUses.get(block.tool_use_id)?.name ?? null, message: clip(toolResultText(block), 160) });
      }
    }
  }
  return { toolUses, loaded, errors, otherReads };
}

function readAgents(sessionDir) {
  const directory = path.join(sessionDir, 'subagents');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(name => /^agent-.+\.meta\.json$/.test(name)).sort().map(name => {
    const id = name.slice('agent-'.length, -'.meta.json'.length);
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')); } catch { /* an unreadable meta file leaves the agent unlinked */ }
    return { agent_id: id, agent_type: meta.agentType ?? null, description: meta.description ?? null, tool_use_id: meta.toolUseId ?? null, spawn_depth: meta.spawnDepth ?? null, finished: meta.finished ?? null, file: path.join(directory, `agent-${id}.jsonl`) };
  });
}

function agentSummary(agent, rows, idOf = row => row.uuid) {
  const { agent_id, agent_type, description, tool_use_id, spawn_depth, finished } = agent;
  return { agent_id, agent_type, description, tool_use_id, spawn_depth, finished, records: rows ? rows.length : null, first_record: rows?.length ? idOf(rows[0]) : null, last_record: rows?.length ? idOf(rows.at(-1)) : null };
}

function byTimeThenRecord(a, b) {
  return (Date.parse(a.timestamp) - Date.parse(b.timestamp)) || (a.record < b.record ? -1 : a.record > b.record ? 1 : 0);
}

// Rows are assigned to the execution that began with the latest invocation at
// or before them. A row stamped a millisecond before its own invocation (the
// command body Claude Code attaches to it) follows its parent into that segment.
function assignSegments(rows, starts) {
  const segmentOf = new Array(rows.length).fill(-1), indexOf = new Map(rows.map((row, i) => [row.uuid, i]));
  starts.forEach((start, k) => { for (let i = start; i < (starts[k + 1] ?? rows.length); i++) segmentOf[i] = k; });
  for (let i = rows.length - 1; i >= 0; i--) {
    const parent = indexOf.get(rows[i].parentUuid);
    if (parent !== undefined && segmentOf[parent] > segmentOf[i]) segmentOf[i] = segmentOf[parent];
  }
  return segmentOf;
}

function buildSession({ reader, workers, project, sessionDir, text, session }) {
  const rows = readRecords(text, reader);
  // Only a SAI command invocation starts an execution; any other slash command
  // typed during one stays inside it as an ordinary record.
  const starts = [];
  rows.forEach((row, index) => { if (/^sai-/.test(invocationOf(row)?.command ?? '')) starts.push(index); });
  const segmentOf = assignSegments(rows, starts);

  const uses = new Map(); // tool_use_id -> segment of the transcript that issued it
  rows.forEach((row, index) => { if (segmentOf[index] >= 0) for (const block of blocks(row)) if (block?.type === 'tool_use') uses.set(block.id, segmentOf[index]); });

  const agents = readAgents(sessionDir).map(agent => ({ ...agent, segment: null, rows: null }));
  const pending = new Set(agents);
  for (let progressed = true; progressed;) {
    progressed = false;
    for (const agent of pending) {
      if (!uses.has(agent.tool_use_id)) continue;
      agent.segment = uses.get(agent.tool_use_id);
      pending.delete(agent);
      progressed = true;
      if (workers.has(agent.agent_type) && fs.existsSync(agent.file)) {
        agent.rows = readRecords(fs.readFileSync(agent.file, 'utf8'), reader);
        for (const row of agent.rows) for (const block of blocks(row)) if (block?.type === 'tool_use') uses.set(block.id, agent.segment);
      }
    }
  }

  const executions = [];
  starts.forEach((start, k) => {
    const invocation = invocationOf(rows[start]);
    const segmentRows = rows.filter((_, i) => segmentOf[i] === k);
    const own = agents.filter(agent => agent.segment === k);
    const principal = own.filter(agent => workers.has(agent.agent_type));
    const auxiliary = own.filter(agent => !workers.has(agent.agent_type));
    const scans = [scanRows(segmentRows, null), ...principal.filter(agent => agent.rows).map(agent => scanRows(agent.rows, agent.agent_id))];
    const lastTurn = segmentRows.findLast(row => row.type === 'assistant' || (row.type === 'user' && !row.isMeta));
    const finished = lastTurn?.type === 'assistant' && lastTurn.message?.stop_reason === 'end_turn';
    executions.push({
      harness: 'claude',
      project,
      session,
      invocation: { record: rows[start].uuid, timestamp: rows[start].timestamp, command: invocation.command, args: invocation.args },
      start_time: rows[start].timestamp,
      end_time: starts[k + 1] === undefined ? null : rows[starts[k + 1]].timestamp,
      in_progress: k === starts.length - 1 && (own.some(agent => agent.finished === false) || !finished),
      records: { count: segmentRows.length, first: segmentRows[0].uuid, last: segmentRows.at(-1).uuid },
      principal_workers: principal.map(agent => agentSummary(agent, agent.rows)),
      auxiliary_agents: auxiliary.map(agent => agentSummary(agent, null)),
      loaded_instructions: scans.flatMap(scan => scan.loaded).sort(byTimeThenRecord),
      non_instruction_reads: scans.reduce((sum, scan) => sum + scan.otherReads, 0),
      tool_errors: scans.flatMap(scan => scan.errors).sort(byTimeThenRecord),
    });
  });
  return { executions, unlinked: [...pending].map(agent => agentSummary(agent, null)), before_first_invocation: segmentOf.filter(segment => segment < 0).length };
}

function indexProject({ reader, workers, projectsRoot, projectPath, target }) {
  const folder = projectFolder(projectsRoot, projectPath);
  const result = { harness: 'claude', project: projectPath, status: 'analyzed', reason: null, sessions_read: 0, executions: [], unlinked_agents: [], unread: [] };
  let entries;
  try { entries = fs.readdirSync(folder).filter(name => name.endsWith('.jsonl')); } catch (error) {
    return { ...result, status: 'inaccessible', reason: `No readable Claude Code transcript folder for this project (${error.code ?? 'error'})` };
  }
  const wanted = target.kind === 'claude-session' ? entries.filter(name => name === `${target.session}.jsonl`) : entries;
  for (const name of wanted.sort()) {
    const session = name.slice(0, -'.jsonl'.length);
    try {
      const text = fs.readFileSync(path.join(folder, name), 'utf8');
      if (!text.includes('<command-name>')) continue;
      const built = buildSession({ reader, workers, project: projectPath, sessionDir: path.join(folder, session), text, session });
      result.sessions_read++;
      result.executions.push(...built.executions);
      if (built.executions.length && built.before_first_invocation) result.unread.push({ kind: 'records-before-first-invocation', project: projectPath, session, count: built.before_first_invocation, reason: 'these records precede the first SAI invocation of the session' });
      result.unlinked_agents.push(...built.unlinked.map(agent => ({ session, ...agent })));
    } catch (error) {
      result.unread.push({ kind: 'session', project: projectPath, session, reason: error.message });
    }
  }
  return result;
}

function findSubagentSession(projectsRoot, projectPaths, agentId) {
  for (const projectPath of projectPaths) {
    const folder = projectFolder(projectsRoot, projectPath);
    let entries = [];
    try { entries = fs.readdirSync(folder, { withFileTypes: true }).filter(entry => entry.isDirectory()); } catch { continue; }
    for (const entry of entries) if (fs.existsSync(path.join(folder, entry.name, 'subagents', `agent-${agentId}.meta.json`))) return entry.name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// opencode source
// ---------------------------------------------------------------------------

// The opencode reader could not be used; the harness is reported not analyzed.
class OpencodeUnavailable extends Error {}

const defaultLoadSqlite = () => require('node:sqlite');

function opencodeDatabasePath(env) {
  return path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'opencode', 'opencode.db');
}

// opencode's database is an internal format: every table and column the reader
// uses must exist before the first query, otherwise nothing is read.
function guardOpencodeSchema(db) {
  for (const [table, columns] of Object.entries(OPENCODE_SCHEMA)) {
    const present = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
    if (present.size === 0) throw new OpencodeUnavailable(`The opencode database has no ${table} table`);
    const missing = columns.filter(column => !present.has(column));
    if (missing.length) throw new OpencodeUnavailable(`The opencode ${table} table lacks the column(s) ${missing.join(', ')}`);
  }
}

// `node:sqlite` needs Node 22.13 or later without a flag; package.json declares
// `node >=22`, so an older runtime is detected here instead of raising the minimum.
function openOpencodeDatabase(env, loadSqlite) {
  let sqlite;
  try { sqlite = loadSqlite(); } catch { throw new OpencodeUnavailable('node:sqlite is not available in this Node runtime (it needs Node 22.13 or later)'); }
  const file = opencodeDatabasePath(env);
  if (!fs.existsSync(file)) throw new OpencodeUnavailable(`No opencode database was found at ${file}`);
  let db;
  try { db = new sqlite.DatabaseSync(file, { readOnly: true }); } catch (error) {
    throw new OpencodeUnavailable(`The opencode database could not be opened read-only (${error.code ?? error.message})`);
  }
  try { guardOpencodeSchema(db); } catch (error) {
    db.close();
    throw error instanceof OpencodeUnavailable ? error : new OpencodeUnavailable(`The opencode database could not be read (${error.message})`);
  }
  return db;
}

function opencodeRecord(row) {
  let data = {}, parsed = true;
  try { data = JSON.parse(row.data) ?? {}; } catch { parsed = false; }
  return { id: row.id, type: row.type, timestamp: new Date(row.time_created).toISOString(), time: row.time_created, data, parsed };
}

function opencodeRecords(db, sessionId) {
  const types = OPENCODE_RECORD_TYPES.map(type => `'${type}'`).join(',');
  return db.prepare(`SELECT id, type, time_created, data FROM session_message WHERE session_id = ? AND type IN (${types}) ORDER BY seq`).all(sessionId).map(opencodeRecord);
}

function opencodeText(record) {
  const { data } = record;
  if (record.type === 'assistant') return (Array.isArray(data.content) ? data.content : []).filter(item => item?.type === 'text').map(item => item.text).join('\n');
  const text = data.text ?? data.summary ?? data.command;
  return typeof text === 'string' ? text : '';
}

function opencodeToolItems(record) {
  return Array.isArray(record.data.content) ? record.data.content.filter(item => item?.type === 'tool') : [];
}

function opencodeToolText(item) {
  const content = item.state?.content;
  return item.state?.error?.message ?? (Array.isArray(content) ? content.map(part => part?.text ?? '').join('\n') : '');
}

const opencodeSettled = item => item.state?.status === 'completed' || item.state?.status === 'error';

function opencodeInvocation(record) {
  if (record.type !== 'user') return null;
  const match = opencodeText(record).match(OPENCODE_ENVELOPE);
  return match ? { name: match[1], args: match[2].trim() } : null;
}

// The envelope names the command body (`design`); the registry holds the command
// (`sai-2-design`).
function resolveOpencodeCommand(name, commands) {
  return commands.find(command => command.replace(/^sai-(?:\d+-)?/, '') === name) ?? `sai-${name}`;
}

function skillBasePath(text) {
  const base = text.match(OPENCODE_SKILL_BASE)?.[1];
  if (!base) return null;
  if (!base.startsWith('file://')) return base;
  // A URL recorded on another platform (a drive-less path read on Windows) is not convertible here; keep its path part.
  try { return fileURLToPath(base); } catch { try { return decodeURIComponent(new URL(base).pathname); } catch { return base; } }
}

// The instruction text a record put in front of the agent, when it did.
function opencodeLoads(record) {
  const loads = [];
  if (record.type === 'synthetic') {
    const text = opencodeText(record);
    const file = text.match(OPENCODE_SYNTHETIC_READ)?.[1];
    if (file) loads.push({ path: file, source: 'synthetic-read', text: text.includes('<content>') ? text : null });
  }
  for (const item of opencodeToolItems(record)) {
    if (item.state?.status !== 'completed') continue;
    const text = opencodeToolText(item);
    if (item.name === 'read') {
      const file = item.state.input?.path ?? item.state.input?.filePath;
      if (typeof file === 'string' && !file.endsWith('/')) loads.push({ path: file, source: 'Read', text: text || null });
    } else if (item.name === 'skill') {
      const base = skillBasePath(text);
      loads.push({ path: base ? path.posix.join(base, 'SKILL.md') : `skill:${item.state.input?.id ?? ''}`, source: 'Skill', text });
    }
  }
  return loads;
}

function scanOpencodeRecords(records, agent) {
  const loaded = [], errors = [];
  let otherReads = 0;
  for (const record of records) {
    for (const load of opencodeLoads(record)) {
      if (load.source === 'Skill' || INSTRUCTION_PATH.test(load.path)) loaded.push({ path: load.path, source: load.source, record: record.id, timestamp: record.timestamp, agent, text_available: load.text !== null });
      else otherReads++;
    }
    for (const item of opencodeToolItems(record)) {
      if (item.state?.status === 'error') errors.push({ record: record.id, timestamp: record.timestamp, agent, tool_use_id: item.id, tool: item.name ?? null, message: clip(opencodeToolText(item), 160) });
    }
  }
  return { loaded, errors, otherReads };
}

// The session and its root, following `parent_id` upward.
function opencodeRoot(db, sessionId) {
  return db.prepare(`
    WITH RECURSIVE up(id, parent_id, directory, depth) AS (
      SELECT id, parent_id, directory, 0 FROM session_v2 WHERE id = ?
      UNION ALL
      SELECT s.id, s.parent_id, s.directory, up.depth + 1 FROM session_v2 s JOIN up ON s.id = up.parent_id WHERE up.depth < ${OPENCODE_MAX_DEPTH})
    SELECT id, directory FROM up WHERE parent_id IS NULL`).get(sessionId);
}

// Every child session below a root, parents before their children.
function opencodeChildren(db, rootId) {
  return db.prepare(`
    WITH RECURSIVE tree(id, parent_id, agent, title, time_created, depth) AS (
      SELECT id, parent_id, agent, title, time_created, 1 FROM session_v2 WHERE parent_id = ?
      UNION ALL
      SELECT s.id, s.parent_id, s.agent, s.title, s.time_created, tree.depth + 1 FROM session_v2 s JOIN tree ON s.parent_id = tree.id WHERE tree.depth < ${OPENCODE_MAX_DEPTH})
    SELECT id, parent_id, agent, title, time_created, depth FROM tree ORDER BY depth, time_created, id`).all(rootId);
}

function buildOpencodeSession({ db, registry, root }) {
  const records = opencodeRecords(db, root.id);
  const starts = [];
  records.forEach((record, index) => { if (opencodeInvocation(record)) starts.push(index); });
  const segmentOf = new Array(records.length).fill(-1);
  starts.forEach((start, k) => { for (let i = start; i < (starts[k + 1] ?? records.length); i++) segmentOf[i] = k; });

  // A child session belongs to the execution that began at or before its creation;
  // its own children follow it.
  const segmentOfSession = new Map();
  const children = opencodeChildren(db, root.id).map(child => {
    let segment = segmentOfSession.get(child.parent_id);
    if (segment === undefined) segment = starts.findLastIndex(start => records[start].time <= child.time_created);
    segmentOfSession.set(child.id, segment);
    const principal = segment >= 0 && registry.workers.has(child.agent);
    return { agent_id: child.id, agent_type: child.agent, description: child.title, tool_use_id: null, spawn_depth: child.depth, finished: null, segment, rows: principal ? opencodeRecords(db, child.id) : null };
  });

  const recordId = record => record.id;
  const executions = starts.map((start, k) => {
    const invocation = opencodeInvocation(records[start]);
    const segmentRecords = records.filter((_, i) => segmentOf[i] === k);
    const own = children.filter(child => child.segment === k);
    const principal = own.filter(child => child.rows);
    const auxiliary = own.filter(child => !child.rows);
    const scans = [scanOpencodeRecords(segmentRecords, null), ...principal.map(child => scanOpencodeRecords(child.rows, child.agent_id))];
    const lastTurn = segmentRecords.findLast(record => record.type === 'assistant' || record.type === 'user');
    const finished = lastTurn?.type === 'assistant' && lastTurn.data.time?.completed != null && opencodeToolItems(lastTurn).every(opencodeSettled);
    return {
      harness: 'opencode',
      project: root.directory,
      session: root.id,
      invocation: { record: records[start].id, timestamp: records[start].timestamp, command: resolveOpencodeCommand(invocation.name, registry.commands), args: invocation.args },
      start_time: records[start].timestamp,
      end_time: starts[k + 1] === undefined ? null : records[starts[k + 1]].timestamp,
      in_progress: k === starts.length - 1 && !finished,
      records: { count: segmentRecords.length, first: segmentRecords[0].id, last: segmentRecords.at(-1).id },
      principal_workers: principal.map(child => agentSummary(child, child.rows, recordId)),
      auxiliary_agents: auxiliary.map(child => agentSummary(child, null, recordId)),
      loaded_instructions: scans.flatMap(scan => scan.loaded).sort(byTimeThenRecord),
      non_instruction_reads: scans.reduce((sum, scan) => sum + scan.otherReads, 0),
      tool_errors: scans.flatMap(scan => scan.errors).sort(byTimeThenRecord),
    };
  });
  const unparsed = [records, ...children.map(child => child.rows ?? [])].reduce((sum, set) => sum + set.filter(record => !record.parsed).length, 0);
  return {
    executions,
    unlinked: children.filter(child => child.segment < 0).map(child => agentSummary(child, null, recordId)),
    before_first_invocation: segmentOf.filter(segment => segment < 0).length,
    unparsed,
  };
}

// Reads the opencode executions of the supplied projects. Each project entry
// reports whether opencode recorded a session for it.
function indexOpencode({ db, registry, projectPaths, target }) {
  const result = { projects: [], executions: [], unlinked_agents: [], unread: [], notes: [] };
  let sessionId = null, child = null;
  if (target.kind === 'opencode-session') {
    const root = opencodeRoot(db, target.session);
    sessionId = root?.id ?? target.session;
    if (root && root.id !== target.session) {
      child = target.session;
      result.notes.push(`${target.session} is a child session of ${root.id}: its parent execution is analyzed instead.`);
    }
  }
  const marks = projectPaths.map(() => '?').join(',');
  const sessions = db.prepare(`SELECT id, directory FROM session_v2 WHERE parent_id IS NULL AND directory IN (${marks})${sessionId ? ' AND id = ?' : ''} ORDER BY time_created, id`).all(...projectPaths, ...(sessionId ? [sessionId] : []));
  const hasInvocation = db.prepare("SELECT 1 FROM session_message WHERE session_id = ? AND type = 'user' AND data LIKE '%InvocationEnvelope:%' LIMIT 1");
  const read = new Map(projectPaths.map(project => [project, 0]));
  for (const root of sessions) {
    if (!hasInvocation.get(root.id)) continue;
    try {
      const built = buildOpencodeSession({ db, registry, root });
      read.set(root.directory, read.get(root.directory) + 1);
      result.executions.push(...built.executions);
      result.unlinked_agents.push(...built.unlinked.map(agent => ({ session: root.id, ...agent })));
      if (built.executions.length && built.before_first_invocation) result.unread.push({ kind: 'records-before-first-invocation', project: root.directory, session: root.id, count: built.before_first_invocation, reason: 'these records precede the first SAI invocation of the session' });
      if (built.unparsed) result.unread.push({ kind: 'unparseable-records', project: root.directory, session: root.id, count: built.unparsed, reason: 'the record data is not valid JSON' });
    } catch (error) {
      result.unread.push({ kind: 'session', project: root.directory, session: root.id, reason: error.message });
    }
  }
  const recorded = new Set(sessions.map(session => session.directory));
  result.projects = projectPaths.map(project => recorded.has(project)
    ? { harness: 'opencode', project, status: 'analyzed', reason: null, sessions_read: read.get(project) }
    : { harness: 'opencode', project, status: 'inaccessible', reason: 'No opencode session is recorded for this project', sessions_read: 0 });
  if (target.kind === 'opencode-session' && sessions.length === 0) result.notes.push(`No opencode session ${target.session} was found under the supplied projects.`);
  if (child) result.executions = result.executions.filter(execution => [...execution.principal_workers, ...execution.auxiliary_agents].some(agent => agent.agent_id === child));
  return result;
}

function renderOpencodeRecord(record, max) {
  const out = { id: record.id, type: record.type, timestamp: record.timestamp, agent: record.data.agent ?? null };
  const text = opencodeText(record);
  if (text) out.text = clip(text, max);
  const items = opencodeToolItems(record);
  if (items.length) {
    out.tool_uses = items.map(item => ({ id: item.id, name: item.name, input: clip(item.state?.input, max) }));
    out.tool_results = items.filter(opencodeSettled).map(item => ({ tool_use_id: item.id, is_error: item.state.status === 'error', text: clip(opencodeToolText(item), max) }));
  }
  return out;
}

function excerptOpencode(options, env, loadSqlite) {
  let db;
  try { db = openOpencodeDatabase(env, loadSqlite); } catch (error) {
    if (error instanceof OpencodeUnavailable) throw new ToolError('OPENCODE_UNAVAILABLE', error.message);
    throw error;
  }
  try {
    if (options.agent !== undefined && !OPENCODE_SESSION.test(options.agent)) throw new ToolError('USAGE', '--agent must be an opencode session ID when --session is one');
    const root = opencodeRoot(db, options.session);
    const own = options.agent === undefined ? root : opencodeRoot(db, options.agent);
    if (!root || !own || own.id !== root.id || root.directory !== resolveProject(options.project, process.cwd())) throw new ToolError('NOT_FOUND', 'No opencode session matches that project, session, and agent');
    const records = opencodeRecords(db, options.agent ?? options.session);
    return { session: options.session, agent: options.agent ?? null, ...pageRecords(records, record => record.id, options, renderOpencodeRecord) };
  } finally { db.close(); }
}

// Claude Code side of an index run. Returns its executions, or null when a
// subagent target is in no transcript (its note is already on the output).
function indexClaude({ target, projectPaths, workers, env, output }) {
  const reader = loadClaudeTranscriptReader(), projectsRoot = reader.claudeProjectsRoot(env);
  let session = target.kind === 'claude-session' ? target.session : null;
  if (target.kind === 'claude-subagent') {
    session = findSubagentSession(projectsRoot, projectPaths, target.agent);
    if (!session) {
      output.harnesses.push({ harness: 'claude', status: 'analyzed', reason: null });
      output.notes.push(`No subagent ${target.agent} was found under the supplied projects.`);
      return null;
    }
    output.notes.push(`${target.agent} is a subagent of session ${session}: its parent execution is analyzed instead.`);
  }
  const probe = session ? { kind: 'claude-session', session } : target;
  const executions = [];
  for (const projectPath of projectPaths) {
    const project = indexProject({ reader, workers, projectsRoot, projectPath, target: probe });
    const { executions: found, unlinked_agents: unlinked, unread, ...summary } = project;
    output.projects.push(summary);
    output.unread.push(...unread);
    output.unlinked_agents.push(...unlinked);
    executions.push(...found);
  }
  const analyzed = output.projects.some(project => project.harness === 'claude' && project.status === 'analyzed');
  output.harnesses.push({ harness: 'claude', status: analyzed ? 'analyzed' : 'not-analyzed', reason: analyzed ? null : 'no supplied project has a readable transcript folder' });
  return executions;
}

// opencode side of an index run: a reader that cannot run reports the harness
// as not analyzed and contributes no data.
function indexOpencodeHarness({ target, projectPaths, registry, env, loadSqlite, output }) {
  let db;
  try { db = openOpencodeDatabase(env, loadSqlite); } catch (error) {
    if (!(error instanceof OpencodeUnavailable)) throw error;
    output.harnesses.push({ harness: 'opencode', status: 'not-analyzed', reason: error.message });
    return [];
  }
  try {
    const result = indexOpencode({ db, registry, projectPaths, target });
    output.projects.push(...result.projects);
    output.unread.push(...result.unread);
    output.unlinked_agents.push(...result.unlinked_agents);
    output.notes.push(...result.notes);
    const analyzed = result.projects.some(project => project.status === 'analyzed');
    output.harnesses.push({ harness: 'opencode', status: analyzed ? 'analyzed' : 'not-analyzed', reason: analyzed ? null : 'no supplied project has an opencode session' });
    return result.executions;
  } catch (error) {
    if (error.code !== 'ERR_SQLITE_ERROR') throw error;
    output.harnesses.push({ harness: 'opencode', status: 'not-analyzed', reason: `The opencode database could not be read (${error.message})` });
    return [];
  } finally { db.close(); }
}

function index(argv, env, loadSqlite) {
  const { positional, options } = parseOptions(argv, ['paths', 'limit', 'cwd']);
  if (positional.length === 0) throw new ToolError('MISSING_TARGET', 'Give a session ID or a SAI command name');
  if (positional.length > 1) throw new ToolError('USAGE', 'Give one target');
  const target = classifyTarget(positional[0]);
  if (!target) throw new ToolError('UNRECOGNIZED_TARGET', `"${positional[0]}" is not a Claude Code session ID, an opencode ses_ session ID, or a sai- command name`);
  const limit = positiveInteger(options.limit, 'limit', DEFAULT_LIMIT);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const defaults = [];
  let projectPaths;
  if (options.paths === undefined) {
    projectPaths = [cwd];
    defaults.push(`--paths not given: analyzing the current project (${cwd})`);
  } else {
    projectPaths = [...new Set(splitPaths(options.paths).map(project => resolveProject(project, cwd)))];
    if (projectPaths.length === 0) throw new ToolError('USAGE', '--paths holds no path');
  }
  const output = { read_at: new Date().toISOString(), target: { input: positional[0], ...target }, limit: target.kind === 'command' ? limit : null, defaults_applied: defaults, harnesses: [], projects: [], executions: [], unlinked_agents: [], unread: [], notes: [] };
  const registry = loadRegistry();
  let executions = [];
  // A session or agent ID belongs to one harness; a command name is read from both.
  if (target.kind !== 'opencode-session') {
    const claude = indexClaude({ target, projectPaths, workers: registry.workers, env, output });
    if (claude === null) return output;
    executions.push(...claude);
  }
  if (target.kind === 'command' || target.kind === 'opencode-session') executions.push(...indexOpencodeHarness({ target, projectPaths, registry, env, loadSqlite, output }));
  if (target.kind === 'command') executions = executions.filter(execution => execution.invocation.command === target.command);
  if (target.kind === 'claude-subagent') executions = executions.filter(execution => [...execution.principal_workers, ...execution.auxiliary_agents].some(agent => agent.agent_id === target.agent));
  executions.sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time) || (a.invocation.record < b.invocation.record ? -1 : 1));
  if (target.kind === 'command' && executions.length > limit) {
    output.unread.push({ kind: 'executions-beyond-limit', count: executions.length - limit, reason: `--limit ${limit}` });
    executions = executions.slice(0, limit);
  }
  for (const execution of executions) {
    if (execution.auxiliary_agents.length) output.unread.push({ kind: 'auxiliary-agents', session: execution.session, execution: execution.invocation.record, count: execution.auxiliary_agents.length, reason: 'auxiliary agents are read only on request' });
  }
  output.executions = executions;
  if (executions.length === 0) output.notes.push('No matching executions were found.');
  return output;
}

function renderRecord(row, max) {
  const out = { id: row.uuid, parent: row.parentUuid ?? null, type: row.type, timestamp: row.timestamp, agent: row.agentId ?? null };
  const text = textOf(row);
  if (text) out.text = clip(text, max);
  const uses = blocks(row).filter(block => block?.type === 'tool_use').map(block => ({ id: block.id, name: block.name, input: clip(block.input, max) }));
  if (uses.length) out.tool_uses = uses;
  const results = blocks(row).filter(block => block?.type === 'tool_result').map(block => ({ tool_use_id: block.tool_use_id, is_error: Boolean(block.is_error), text: clip(toolResultText(block), max) }));
  if (results.length && !loadedInstruction(row)) out.tool_results = results;
  if (row.type === 'attachment') out.attachment = row.attachment?.type ?? null;
  const instruction = loadedInstruction(row);
  if (instruction) out.loaded_file = { path: instruction.path, source: instruction.source, text: instruction.text === null ? null : clip(instruction.text, max) };
  return out;
}

function pageRecords(rows, idOf, options, render) {
  const start = options.from === undefined ? 0 : rows.findIndex(row => idOf(row) === options.from);
  if (start === -1) throw new ToolError('NOT_FOUND', `Record ${options.from} is not in that transcript`);
  const count = positiveInteger(options.count, 'count', DEFAULT_COUNT), max = positiveInteger(options['max-chars'], 'max-chars', DEFAULT_MAX_CHARS);
  const page = rows.slice(start, start + count);
  return { total_records: rows.length, records: page.map(row => render(row, max)), next_record: rows[start + count] ? idOf(rows[start + count]) : null };
}

function excerpt(argv, env, loadSqlite) {
  const { options } = parseOptions(argv, ['project', 'session', 'agent', 'from', 'count', 'max-chars']);
  if (!options.project || !options.session) throw new ToolError('USAGE', 'excerpt needs --project and --session');
  if (OPENCODE_SESSION.test(options.session)) return excerptOpencode(options, env, loadSqlite);
  if (!UUID.test(options.session)) throw new ToolError('USAGE', '--session must be a Claude Code session UUID or an opencode ses_ session ID');
  if (options.agent !== undefined && !CLAUDE_AGENT.test(options.agent)) throw new ToolError('USAGE', '--agent must be a Claude Code agent ID');
  const reader = loadClaudeTranscriptReader();
  const folder = projectFolder(reader.claudeProjectsRoot(env), resolveProject(options.project, process.cwd()));
  const agent = options.agent?.match(CLAUDE_AGENT)[1];
  const file = agent ? path.join(folder, options.session, 'subagents', `agent-${agent}.jsonl`) : path.join(folder, `${options.session}.jsonl`);
  if (!fs.existsSync(file)) throw new ToolError('NOT_FOUND', 'No transcript matches that project, session, and agent');
  const rows = readRecords(fs.readFileSync(file, 'utf8'), reader);
  return { session: options.session, agent: agent ?? null, ...pageRecords(rows, row => row.uuid, options, renderRecord) };
}

function main(argv, env = process.env, loadSqlite = defaultLoadSqlite) {
  const [command, ...rest] = argv;
  if (command === 'index') return index(rest, env, loadSqlite);
  if (command === 'excerpt') return excerpt(rest, env, loadSqlite);
  throw new ToolError('USAGE', 'Usage: retrospective.js index <target> [--paths "<p1>,<p2>"] [--limit <N>] | excerpt --project <path> --session <id> [--agent <id>] [--from <record>] [--count <N>] [--max-chars <N>]');
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)))}\n`);
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    process.stdout.write(`${JSON.stringify({ error: { code: error.code, message: error.message } })}\n`);
    process.exitCode = 2;
  }
}

module.exports = { main, index, excerpt, splitPaths, classifyTarget, projectFolder, ToolError };

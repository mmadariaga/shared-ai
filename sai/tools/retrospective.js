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
 *       (default 5). `--with-worktrees` measures each project together with the
 *       worktrees that `git worktree list` reports for it.
 *   cost [--paths "<p1>,<p2>"] [--with-worktrees] [--alias "<path>=<alias>,..."]
 *        [--format json|markdown] [--cwd <dir>]
 *       Reads every planning and implementation execution (/sai-1-spec,
 *       /sai-2-design, /sai-plan, /sai-3-implement, /sai-build) of the projects
 *       and reports token usage and tool calls per agent and per pipeline
 *       segment, plus the pairing of planning runs with implementation runs by
 *       change name. `markdown` prints the versioned baseline report; an
 *       aliased project shows only its alias and numbered changes there.
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
const { execFileSync } = require('node:child_process');
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
const UNAVAILABLE = 'unavailable';
// The spec, design, and implement parts of a run, told apart by worker type. Every
// other agent keeps its own type and is reported outside the three segments.
const PIPELINE_SEGMENTS = { 'sai-1-spec-proposal-worker': 'spec', 'sai-2-design-worker': 'design', 'sai-3-red-worker': 'implement', 'sai-3-green-worker': 'implement', 'sai-direct-build-worker': 'implement' };
const COMMAND_SEGMENTS = { 'sai-1-spec': 'spec', 'sai-2-design': 'design', 'sai-3-implement': 'implement' };
const PLANNING_COMMANDS = ['sai-1-spec', 'sai-2-design', 'sai-plan'];
const IMPLEMENTATION_COMMANDS = ['sai-3-implement', 'sai-build'];
const PIPELINE_COMMANDS = new Set([...PLANNING_COMMANDS, ...IMPLEMENTATION_COMMANDS]);
const SEGMENT_ORDER = ['spec', 'design', 'implement', 'other'];
const CHANGE_NAME = /^[a-z0-9][a-z0-9-]*$/;
const CHANGE_NAME_IN_BLOCK = /\*\*Change name\*\*:[ \t]*([a-z0-9][a-z0-9-]*)/;
const VALUE_OPTIONS = new Set(['block-file', 'block-hash', 'overview-lang', 'parent-branch', 'path', 'tier', 'url']);
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'write', 'edit', 'patch']);
const BASELINE_FORMAT = 1;

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
  const { claudeProjectsRoot, parseTranscript, claudeTokens, opencodeTokens } = require(found);
  return { claudeProjectsRoot, parseTranscript, claudeTokens, opencodeTokens };
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

function parseOptions(argv, flags, switches = []) {
  const positional = [], options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const eq = arg.indexOf('=');
    const flag = (eq === -1 ? arg : arg.slice(0, eq)).slice(2);
    if (switches.includes(flag) && eq === -1) { options[flag] = true; continue; }
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

// ---------------------------------------------------------------------------
// Cost measurement: usage, tool calls, pipeline segment, and change name
// ---------------------------------------------------------------------------

const USAGE_FIELDS = ['input', 'output', 'reasoning', 'cache_read', 'cache_write', 'cache_write_5m', 'cache_write_1h', 'cache_write_unsplit', 'cost'];
const pipelineSegmentOf = type => PIPELINE_SEGMENTS[type] ?? null;

// One entry per model request, each a token record or `unavailable`. A request
// that lacks usage never counts as zero: with no usable request the whole usage
// is `unavailable`, and a partial agent says how many requests it lacks.
function summarizeUsage(requests) {
  const usable = requests.filter(request => request !== UNAVAILABLE);
  if (usable.length === 0) return UNAVAILABLE;
  const usage = { requests: requests.length };
  if (usable.length < requests.length) usage.requests_without_usage = requests.length - usable.length;
  for (const field of USAGE_FIELDS) {
    const values = usable.map(request => request[field]).filter(value => value !== null && value !== undefined);
    if (values.length) usage[field] = values.reduce((sum, value) => sum + value, 0);
  }
  return usage;
}

// A request spans several transcript lines sharing message.id; the line with the
// most output carries its final usage.
function claudeMetrics(rows, reader) {
  if (!rows) return { usage: UNAVAILABLE, tool_calls: null };
  const requests = new Map(), toolIds = new Set();
  for (const row of rows) {
    if (row.type !== 'assistant' || !row.message || row.message.model === '<synthetic>' || row.isApiErrorMessage) continue;
    for (const block of blocks(row)) if (block?.type === 'tool_use' && block.id) toolIds.add(block.id);
    const key = row.message.id ?? `row:${row.uuid}`, tokens = reader.claudeTokens(row), kept = requests.get(key);
    if (kept === undefined || (tokens !== UNAVAILABLE && (kept === UNAVAILABLE || tokens.output >= kept.output))) requests.set(key, tokens);
  }
  return { usage: summarizeUsage([...requests.values()]), tool_calls: toolIds.size };
}

function opencodeMetrics(records, reader) {
  if (!records) return { usage: UNAVAILABLE, tool_calls: null };
  const assistants = records.filter(record => record.type === 'assistant');
  return { usage: summarizeUsage(assistants.map(record => reader.opencodeTokens(record.data))), tool_calls: assistants.reduce((sum, record) => sum + opencodeToolItems(record).length, 0) };
}

// The change a run belongs to: the name its invocation gives (or its Ready to
// Propose block), otherwise the single `openspec/changes/<name>/` its workers wrote to.
function changeNameFromArgs(args) {
  const block = args.match(CHANGE_NAME_IN_BLOCK)?.[1];
  if (block) return block;
  const tokens = args.replace(/["'|]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith('--')) { if (VALUE_OPTIONS.has(tokens[i].slice(2))) i++; continue; }
    return CHANGE_NAME.test(tokens[i]) ? tokens[i] : null;
  }
  return null;
}

function writtenChanges(toolName, input, into) {
  if (!WRITE_TOOLS.has(toolName) || !input || typeof input !== 'object') return;
  const text = Object.values(input).filter(value => typeof value === 'string').join('\n').replace(/\\/g, '/');
  for (const match of text.matchAll(/openspec\/changes\/([^/\s"'`]+)\//g)) if (match[1] !== 'archive' && CHANGE_NAME.test(match[1])) into.add(match[1]);
}

// Only a pipeline command's arguments name a change; any other command (explore takes a topic) is read from what its workers wrote.
function changeNameOf(command, args, written) {
  return (PIPELINE_COMMANDS.has(command) ? changeNameFromArgs(args) : null) ?? (written.size === 1 ? [...written][0] : null);
}

function scanRows(rows, agent) {
  const toolUses = new Map(), changes = new Set();
  for (const row of rows) for (const block of blocks(row)) if (block?.type === 'tool_use') {
    toolUses.set(block.id, { name: block.name, row: row.uuid, timestamp: row.timestamp });
    writtenChanges(block.name, block.input, changes);
  }
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
  return { toolUses, loaded, errors, otherReads, changes };
}

function readAgents(sessionDir) {
  const directory = path.join(sessionDir, 'subagents');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(name => /^agent-.+\.meta\.json$/.test(name)).sort().map(name => {
    const id = name.slice('agent-'.length, -'.meta.json'.length);
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')); } catch { /* an unreadable meta file leaves the agent unlinked */ }
    return { agent_id: id, agent_type: meta.agentType ?? null, description: meta.description ?? null, tool_use_id: meta.toolUseId ?? null, parent_agent_id: meta.parentAgentId ?? null, spawn_depth: meta.spawnDepth ?? null, finished: meta.finished ?? null, file: path.join(directory, `agent-${id}.jsonl`) };
  });
}

// `parent_agent_id` names the agent that dispatched this one (null: the main
// session did). `usage` and `tool_calls` are present once the agent is linked to
// an execution.
function agentSummary(agent, rows, idOf = row => row.uuid) {
  const { agent_id, agent_type, description, tool_use_id, parent_agent_id, spawn_depth, finished } = agent;
  const measured = agent.metrics ? { usage: agent.metrics.usage, tool_calls: agent.metrics.tool_calls } : {};
  return { agent_id, agent_type, description, tool_use_id, parent_agent_id: parent_agent_id ?? null, spawn_depth, finished, pipeline_segment: pipelineSegmentOf(agent_type), ...measured, records: rows ? rows.length : null, first_record: rows?.length ? idOf(rows[0]) : null, last_record: rows?.length ? idOf(rows.at(-1)) : null };
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

// A subagent whose transcript is missing or unreadable measures as `unavailable`.
function readAgentRows(agent, reader) {
  try { return fs.existsSync(agent.file) ? readRecords(fs.readFileSync(agent.file, 'utf8'), reader) : null; } catch { return null; }
}

function buildSession({ reader, workers, project, group, sessionDir, text, session }) {
  const rows = readRecords(text, reader);
  // Only a SAI command invocation starts an execution; any other slash command
  // typed during one stays inside it as an ordinary record.
  const starts = [];
  rows.forEach((row, index) => { if (/^sai-/.test(invocationOf(row)?.command ?? '')) starts.push(index); });
  const segmentOf = assignSegments(rows, starts);

  const uses = new Map(); // tool_use_id -> segment of the transcript that issued it
  rows.forEach((row, index) => { if (segmentOf[index] >= 0) for (const block of blocks(row)) if (block?.type === 'tool_use') uses.set(block.id, segmentOf[index]); });

  const agents = readAgents(sessionDir).map(agent => ({ ...agent, segment: null, rows: null }));
  const pending = new Set(agents), byId = new Map(agents.map(agent => [agent.agent_id, agent]));
  for (let progressed = true; progressed;) {
    progressed = false;
    for (const agent of pending) {
      // The dispatching tool call places an agent; so does its dispatcher's own placement.
      const parent = agent.parent_agent_id ? byId.get(agent.parent_agent_id) : null;
      const segment = uses.has(agent.tool_use_id) ? uses.get(agent.tool_use_id) : parent && parent.segment !== null ? parent.segment : undefined;
      if (segment === undefined) continue;
      agent.segment = segment;
      pending.delete(agent);
      progressed = true;
      const principal = workers.has(agent.agent_type);
      if (principal && fs.existsSync(agent.file)) {
        agent.rows = readRecords(fs.readFileSync(agent.file, 'utf8'), reader);
        for (const row of agent.rows) for (const block of blocks(row)) if (block?.type === 'tool_use') uses.set(block.id, agent.segment);
      }
      agent.metrics = claudeMetrics(agent.rows ?? (principal ? null : readAgentRows(agent, reader)), reader);
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
      project_group: group,
      session,
      invocation: { record: rows[start].uuid, timestamp: rows[start].timestamp, command: invocation.command, args: invocation.args },
      change_name: changeNameOf(invocation.command, invocation.args, new Set(scans.flatMap(scan => [...scan.changes]))),
      start_time: rows[start].timestamp,
      end_time: starts[k + 1] === undefined ? null : rows[starts[k + 1]].timestamp,
      in_progress: k === starts.length - 1 && (own.some(agent => agent.finished === false) || !finished),
      records: { count: segmentRows.length, first: segmentRows[0].uuid, last: segmentRows.at(-1).uuid },
      coordinator: { pipeline_segment: COMMAND_SEGMENTS[invocation.command] ?? null, ...claudeMetrics(segmentRows, reader) },
      principal_workers: principal.map(agent => agentSummary(agent, agent.rows)),
      auxiliary_agents: auxiliary.map(agent => agentSummary(agent, null)),
      loaded_instructions: scans.flatMap(scan => scan.loaded).sort(byTimeThenRecord),
      non_instruction_reads: scans.reduce((sum, scan) => sum + scan.otherReads, 0),
      tool_errors: scans.flatMap(scan => scan.errors).sort(byTimeThenRecord),
    });
  });
  return { executions, unlinked: [...pending].map(agent => agentSummary(agent, null)), before_first_invocation: segmentOf.filter(segment => segment < 0).length };
}

function indexProject({ reader, workers, projectsRoot, projectPath, group, target }) {
  const folder = projectFolder(projectsRoot, projectPath);
  const result = { harness: 'claude', project: projectPath, project_group: group, status: 'analyzed', reason: null, sessions_read: 0, executions: [], unlinked_agents: [], unread: [] };
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
      const built = buildSession({ reader, workers, project: projectPath, group, sessionDir: path.join(folder, session), text, session });
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

// The assistant messages alone, which hold the usage of a session read for its figures only.
function opencodeAssistants(db, sessionId) {
  return db.prepare("SELECT id, type, time_created, data FROM session_message WHERE session_id = ? AND type = 'assistant' ORDER BY seq").all(sessionId).map(opencodeRecord);
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
  const loaded = [], errors = [], changes = new Set();
  let otherReads = 0;
  for (const record of records) {
    for (const item of opencodeToolItems(record)) writtenChanges(item.name, item.state?.input, changes);
    for (const load of opencodeLoads(record)) {
      if (load.source === 'Skill' || INSTRUCTION_PATH.test(load.path)) loaded.push({ path: load.path, source: load.source, record: record.id, timestamp: record.timestamp, agent, text_available: load.text !== null });
      else otherReads++;
    }
    for (const item of opencodeToolItems(record)) {
      if (item.state?.status === 'error') errors.push({ record: record.id, timestamp: record.timestamp, agent, tool_use_id: item.id, tool: item.name ?? null, message: clip(opencodeToolText(item), 160) });
    }
  }
  return { loaded, errors, otherReads, changes };
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

function buildOpencodeSession({ db, registry, reader, root, member }) {
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
    const rows = principal ? opencodeRecords(db, child.id) : null;
    const metrics = segment >= 0 ? opencodeMetrics(rows ?? opencodeAssistants(db, child.id), reader) : null;
    return { agent_id: child.id, agent_type: child.agent, description: child.title, tool_use_id: null, parent_agent_id: child.parent_id === root.id ? null : child.parent_id, spawn_depth: child.depth, finished: null, segment, rows, metrics };
  });

  const recordId = record => record.id;
  const executions = starts.map((start, k) => {
    const invocation = opencodeInvocation(records[start]);
    const command = resolveOpencodeCommand(invocation.name, registry.commands);
    const segmentRecords = records.filter((_, i) => segmentOf[i] === k);
    const own = children.filter(child => child.segment === k);
    const principal = own.filter(child => child.rows);
    const auxiliary = own.filter(child => !child.rows);
    const scans = [scanOpencodeRecords(segmentRecords, null), ...principal.map(child => scanOpencodeRecords(child.rows, child.agent_id))];
    const lastTurn = segmentRecords.findLast(record => record.type === 'assistant' || record.type === 'user');
    const finished = lastTurn?.type === 'assistant' && lastTurn.data.time?.completed != null && opencodeToolItems(lastTurn).every(opencodeSettled);
    return {
      harness: 'opencode',
      project: member.path,
      project_group: member.group,
      session: root.id,
      invocation: { record: records[start].id, timestamp: records[start].timestamp, command, args: invocation.args },
      change_name: changeNameOf(command, invocation.args, new Set(scans.flatMap(scan => [...scan.changes]))),
      start_time: records[start].timestamp,
      end_time: starts[k + 1] === undefined ? null : records[starts[k + 1]].timestamp,
      in_progress: k === starts.length - 1 && !finished,
      records: { count: segmentRecords.length, first: segmentRecords[0].id, last: segmentRecords.at(-1).id },
      coordinator: { pipeline_segment: COMMAND_SEGMENTS[command] ?? null, ...opencodeMetrics(segmentRecords, reader) },
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
function indexOpencode({ db, registry, reader, members, target }) {
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
  // opencode records a directory with the separators of the platform that created it.
  const owner = new Map();
  for (const member of members) for (const form of directoryForms(member.path)) if (!owner.has(form)) owner.set(form, member);
  const forms = [...owner.keys()];
  const marks = forms.map(() => '?').join(',');
  const sessions = db.prepare(`SELECT id, directory FROM session_v2 WHERE parent_id IS NULL AND directory IN (${marks})${sessionId ? ' AND id = ?' : ''} ORDER BY time_created, id`).all(...forms, ...(sessionId ? [sessionId] : []));
  const hasInvocation = db.prepare("SELECT 1 FROM session_message WHERE session_id = ? AND type = 'user' AND data LIKE '%InvocationEnvelope:%' LIMIT 1");
  const read = new Map(members.map(member => [member.path, 0]));
  for (const root of sessions) {
    if (!hasInvocation.get(root.id)) continue;
    const member = owner.get(root.directory);
    try {
      const built = buildOpencodeSession({ db, registry, reader, root, member });
      read.set(member.path, read.get(member.path) + 1);
      result.executions.push(...built.executions);
      result.unlinked_agents.push(...built.unlinked.map(agent => ({ session: root.id, ...agent })));
      if (built.executions.length && built.before_first_invocation) result.unread.push({ kind: 'records-before-first-invocation', project: member.path, session: root.id, count: built.before_first_invocation, reason: 'these records precede the first SAI invocation of the session' });
      if (built.unparsed) result.unread.push({ kind: 'unparseable-records', project: member.path, session: root.id, count: built.unparsed, reason: 'the record data is not valid JSON' });
    } catch (error) {
      result.unread.push({ kind: 'session', project: member.path, session: root.id, reason: error.message });
    }
  }
  const recorded = new Set(sessions.map(session => owner.get(session.directory).path));
  result.projects = members.map(({ path: project, group }) => recorded.has(project)
    ? { harness: 'opencode', project, project_group: group, status: 'analyzed', reason: null, sessions_read: read.get(project) }
    : { harness: 'opencode', project, project_group: group, status: 'inaccessible', reason: 'No opencode session is recorded for this project', sessions_read: 0 });
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
    if (!root || !own || own.id !== root.id || !sameDirectory(root.directory, resolveProject(options.project, process.cwd()))) throw new ToolError('NOT_FOUND', 'No opencode session matches that project, session, and agent');
    const records = opencodeRecords(db, options.agent ?? options.session);
    return { session: options.session, agent: options.agent ?? null, ...pageRecords(records, record => record.id, options, renderOpencodeRecord) };
  } finally { db.close(); }
}

// opencode records a directory with the separators of the platform that created it.
function directoryForms(directory) {
  const forward = directory.replace(/\\/g, '/');
  return [...new Set([directory, forward, forward.replace(/\//g, '\\')])];
}

const sameDirectory = (a, b) => a.replace(/\\/g, '/') === b.replace(/\\/g, '/');

// The worktrees `git worktree list` reports for a project, as paths; null when
// git cannot list them.
function gitWorktrees(projectPath) {
  let output;
  try { output = execFileSync('git', ['-C', projectPath, 'worktree', 'list', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 }); } catch { return null; }
  return output.split(/\r?\n\r?\n/).filter(block => !/^bare$/m.test(block)).map(block => block.match(/^worktree (.+)$/m)?.[1]).filter(Boolean).map(entry => path.resolve(entry.trim()));
}

// Each project path becomes the members measured together under it: itself, plus
// with `withWorktrees` the worktrees git reports for it. A sibling directory that
// merely shares a name prefix is never a member.
function expandProjects(projectPaths, withWorktrees, notes) {
  const members = [], seen = new Set();
  const add = (memberPath, group) => { if (!seen.has(memberPath)) { seen.add(memberPath); members.push({ path: memberPath, group }); } };
  for (const projectPath of projectPaths) {
    add(projectPath, projectPath);
    if (!withWorktrees) continue;
    const worktrees = gitWorktrees(projectPath);
    if (worktrees === null) { notes.push(`git could not list the worktrees of ${projectPath}: only that directory is measured.`); continue; }
    for (const worktree of worktrees) add(worktree, projectPath);
  }
  return members;
}

// Claude Code side of an index run. Returns its executions, or null when a
// subagent target is in no transcript (its note is already on the output).
function indexClaude({ target, members, reader, workers, env, output }) {
  const projectsRoot = reader.claudeProjectsRoot(env);
  let session = target.kind === 'claude-session' ? target.session : null;
  if (target.kind === 'claude-subagent') {
    session = findSubagentSession(projectsRoot, members.map(member => member.path), target.agent);
    if (!session) {
      output.harnesses.push({ harness: 'claude', status: 'analyzed', reason: null });
      output.notes.push(`No subagent ${target.agent} was found under the supplied projects.`);
      return null;
    }
    output.notes.push(`${target.agent} is a subagent of session ${session}: its parent execution is analyzed instead.`);
  }
  const probe = session ? { kind: 'claude-session', session } : target;
  const executions = [];
  for (const { path: projectPath, group } of members) {
    const project = indexProject({ reader, workers, projectsRoot, projectPath, group, target: probe });
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
function indexOpencodeHarness({ target, members, reader, registry, env, loadSqlite, output }) {
  let db;
  try { db = openOpencodeDatabase(env, loadSqlite); } catch (error) {
    if (!(error instanceof OpencodeUnavailable)) throw error;
    output.harnesses.push({ harness: 'opencode', status: 'not-analyzed', reason: error.message });
    return [];
  }
  try {
    const result = indexOpencode({ db, registry, reader, members, target });
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

// The projects of a run: the `--paths` list (default: the current project), each
// with its worktrees when `--with-worktrees` is given.
function resolveMembers(options, cwd, defaults, notes) {
  let projectPaths;
  if (options.paths === undefined) {
    projectPaths = [cwd];
    defaults.push(`--paths not given: analyzing the current project (${cwd})`);
  } else {
    projectPaths = [...new Set(splitPaths(options.paths).map(project => resolveProject(project, cwd)))];
    if (projectPaths.length === 0) throw new ToolError('USAGE', '--paths holds no path');
  }
  return expandProjects(projectPaths, options['with-worktrees'] === true, notes);
}

// Collects the executions a target selects across both harnesses, newest first.
function collectExecutions({ target, members, env, loadSqlite, output, registry }) {
  const reader = loadClaudeTranscriptReader();
  const executions = [];
  // A session or agent ID belongs to one harness; a command name is read from both.
  if (target.kind !== 'opencode-session') {
    const claude = indexClaude({ target, members, reader, workers: registry.workers, env, output });
    if (claude === null) return null;
    executions.push(...claude);
  }
  if (target.kind === 'command' || target.kind === 'pipeline' || target.kind === 'opencode-session') executions.push(...indexOpencodeHarness({ target, members, reader, registry, env, loadSqlite, output }));
  const selected = executions.filter(execution => {
    if (target.kind === 'command') return execution.invocation.command === target.command;
    // A run is a pipeline command, or any execution (explore's routes) whose workers did a pipeline segment.
    if (target.kind === 'pipeline') return PIPELINE_COMMANDS.has(execution.invocation.command) || execution.principal_workers.some(agent => agent.pipeline_segment);
    if (target.kind === 'claude-subagent') return [...execution.principal_workers, ...execution.auxiliary_agents].some(agent => agent.agent_id === target.agent);
    return true;
  });
  return selected.sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time) || (a.invocation.record < b.invocation.record ? -1 : 1));
}

function index(argv, env, loadSqlite) {
  const { positional, options } = parseOptions(argv, ['paths', 'limit', 'cwd'], ['with-worktrees']);
  if (positional.length === 0) throw new ToolError('MISSING_TARGET', 'Give a session ID or a SAI command name');
  if (positional.length > 1) throw new ToolError('USAGE', 'Give one target');
  const target = classifyTarget(positional[0]);
  if (!target) throw new ToolError('UNRECOGNIZED_TARGET', `"${positional[0]}" is not a Claude Code session ID, an opencode ses_ session ID, or a sai- command name`);
  const limit = positiveInteger(options.limit, 'limit', DEFAULT_LIMIT);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const defaults = [], notes = [];
  const members = resolveMembers(options, cwd, defaults, notes);
  const output = { read_at: new Date().toISOString(), target: { input: positional[0], ...target }, limit: target.kind === 'command' ? limit : null, defaults_applied: defaults, harnesses: [], projects: [], executions: [], unlinked_agents: [], unread: [], notes };
  let executions = collectExecutions({ target, members, env, loadSqlite, output, registry: loadRegistry() });
  if (executions === null) return output;
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

// ---------------------------------------------------------------------------
// cost: usage and tool calls per agent and per pipeline segment
// ---------------------------------------------------------------------------

const ROLE_ORDER = ['coordinator', 'worker', 'dispatched'];
const TOKEN_FIELDS = ['input', 'output', 'cache_read', 'cache_write', 'cache_write_5m', 'cache_write_1h', 'cache_write_unsplit'];
const sumOf = (total, fields) => fields.reduce((sum, field) => sum + (total[field] ?? 0), 0);
// Every token kind the agent processed: fresh input and output, cache reads, and cache writes.
const totalTokens = total => sumOf(total, TOKEN_FIELDS);
const cacheWrites = total => sumOf(total, ['cache_write', 'cache_write_5m', 'cache_write_1h', 'cache_write_unsplit']);

// The segment an agent is reported under: a pipeline worker keeps its own; any other
// SAI worker stays outside the three segments; a helper follows the agent that
// dispatched it, or the run's command when the main session dispatched it.
function attributeAgents(execution) {
  const principalIds = new Set(execution.principal_workers.map(agent => agent.agent_id));
  const listed = [...execution.principal_workers, ...execution.auxiliary_agents];
  const byId = new Map(listed.map(agent => [agent.agent_id, agent]));
  const segmentOf = (agent, depth = 0) => {
    if (agent.pipeline_segment) return agent.pipeline_segment;
    if (principalIds.has(agent.agent_id) || depth > OPENCODE_MAX_DEPTH) return null;
    if (!agent.parent_agent_id) return execution.coordinator.pipeline_segment;
    const parent = byId.get(agent.parent_agent_id);
    return parent ? segmentOf(parent, depth + 1) : null;
  };
  const coordinator = { role: 'coordinator', agent_type: null, agent_id: null, parent_agent_id: null, parent_agent_type: null, segment: execution.coordinator.pipeline_segment, usage: execution.coordinator.usage, tool_calls: execution.coordinator.tool_calls };
  return [coordinator, ...listed.map(agent => ({
    role: principalIds.has(agent.agent_id) ? 'worker' : 'dispatched',
    agent_type: agent.agent_type,
    agent_id: agent.agent_id,
    parent_agent_id: agent.parent_agent_id,
    parent_agent_type: agent.parent_agent_id ? byId.get(agent.parent_agent_id)?.agent_type ?? null : null,
    segment: segmentOf(agent),
    usage: agent.usage ?? UNAVAILABLE,
    tool_calls: agent.tool_calls ?? null,
  }))];
}

function addAgent(total, agent) {
  total.agents = (total.agents ?? 0) + 1;
  if (agent.usage === UNAVAILABLE) total.unavailable_agents = (total.unavailable_agents ?? 0) + 1;
  else for (const field of ['requests', ...USAGE_FIELDS]) if (agent.usage[field] !== undefined) total[field] = (total[field] ?? 0) + agent.usage[field];
  if (agent.tool_calls !== null) total.tool_calls = (total.tool_calls ?? 0) + agent.tool_calls;
  return total;
}

// A run is planning when its command or one of its workers plans, implementation when its command or one of its workers implements; one run can be both.
function runKinds(command, agents) {
  const worked = segment => agents.some(agent => agent.role === 'worker' && agent.segment === segment);
  return [PLANNING_COMMANDS.includes(command) || worked('spec') || worked('design') ? 'planning' : null, IMPLEMENTATION_COMMANDS.includes(command) || worked('implement') ? 'implementation' : null].filter(Boolean);
}

// Planning runs pair with implementation runs by change name, inside one project
// group. A run of unknown change name pairs with nothing, and several runs of one
// change stay separate runs under it.
function pairRuns(runs) {
  const changes = new Map(), unnamed = [];
  for (const run of runs) {
    if (!run.change) { unnamed.push({ run: run.run, kinds: run.kinds, status: 'unpaired', reason: 'change name unknown' }); continue; }
    const key = `${run.project_group}\u0000${run.change}`;
    if (!changes.has(key)) changes.set(key, { project_group: run.project_group, change: run.change, planning_runs: [], implementation_runs: [] });
    for (const kind of run.kinds) changes.get(key)[`${kind}_runs`].push(run.run);
  }
  const paired = [...changes.values()].map(change => ({ ...change, status: change.planning_runs.length && change.implementation_runs.length ? 'paired' : 'unpaired', side: change.planning_runs.length && change.implementation_runs.length ? null : change.planning_runs.length ? 'planning-only' : 'implementation-only' }));
  return { changes: paired, unnamed_runs: unnamed };
}

function costRuns(executions) {
  return [...executions].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time) || (a.invocation.record < b.invocation.record ? -1 : 1)).map((execution, i) => {
    const agents = attributeAgents(execution);
    const totals = agents.reduce((total, agent) => addAgent(total, agent), {});
    return { run: i + 1, harness: execution.harness, project_group: execution.project_group, command: execution.invocation.command, kinds: runKinds(execution.invocation.command, agents), start_time: execution.start_time, in_progress: execution.in_progress, change: execution.change_name, totals: { tokens: totalTokens(totals), tool_calls: totals.tool_calls ?? 0, unavailable_agents: totals.unavailable_agents ?? 0 }, agents };
  });
}

// One row per project group, harness, segment, role, and agent type.
function costRows(runs) {
  const rows = new Map();
  for (const run of runs) for (const agent of run.agents) {
    const segment = agent.segment ?? 'other', type = agent.role === 'coordinator' ? run.command : agent.agent_type ?? 'unknown';
    const key = [run.project_group, run.harness, segment, agent.role, type].join('\u0000');
    if (!rows.has(key)) rows.set(key, { project_group: run.project_group, harness: run.harness, segment, role: agent.role, agent_type: type, runs: new Set() });
    const row = rows.get(key);
    row.runs.add(run.run);
    addAgent(row, agent);
  }
  const order = (list, value) => list.indexOf(value);
  return [...rows.values()].map(({ runs: members, ...row }) => ({ ...row, runs: members.size }))
    .sort((a, b) => a.project_group.localeCompare(b.project_group) || a.harness.localeCompare(b.harness) || order(SEGMENT_ORDER, a.segment) - order(SEGMENT_ORDER, b.segment) || order(ROLE_ORDER, a.role) - order(ROLE_ORDER, b.role) || a.agent_type.localeCompare(b.agent_type));
}

// `--alias "<path>=<alias>,..."` names the projects whose report must not carry
// their names or paths.
function parseAliases(value, cwd) {
  const aliases = new Map();
  for (const entry of value === undefined ? [] : splitPaths(value)) {
    const split = entry.lastIndexOf('=');
    const alias = entry.slice(split + 1).trim();
    if (split <= 0 || !/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/.test(alias)) throw new ToolError('USAGE', '--alias takes "<path>=<alias>" entries whose alias is plain text');
    aliases.set(resolveProject(entry.slice(0, split).trim(), cwd), alias);
  }
  return aliases;
}

function cost(argv, env, loadSqlite) {
  const { positional, options } = parseOptions(argv, ['paths', 'cwd', 'alias', 'format'], ['with-worktrees']);
  if (positional.length) throw new ToolError('USAGE', 'cost takes no target');
  const format = options.format ?? 'json';
  if (format !== 'json' && format !== 'markdown') throw new ToolError('USAGE', '--format must be json or markdown');
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const aliases = parseAliases(options.alias, cwd);
  const defaults = [], notes = [];
  const members = resolveMembers(options, cwd, defaults, notes);
  const output = { read_at: new Date().toISOString(), baseline_format: BASELINE_FORMAT, defaults_applied: defaults, harnesses: [], projects: [], unlinked_agents: [], unread: [], notes };
  const executions = collectExecutions({ target: { kind: 'pipeline' }, members, env, loadSqlite, output, registry: loadRegistry() }) ?? [];
  const runs = costRuns(executions);
  const report = { ...output, runs, ...pairRuns(runs), rows: costRows(runs) };
  if (executions.length === 0) report.notes.push('No planning or implementation executions were found.');
  return format === 'markdown' ? renderBaseline(report, aliases) : report;
}

// ---------------------------------------------------------------------------
// Baseline report (markdown)
// ---------------------------------------------------------------------------

const groupLabel = (group, aliases) => aliases.get(group) ?? path.basename(group);

function thousands(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const figure = value => value === undefined || value === null ? '-' : thousands(value);
const money = value => value === undefined ? '-' : `$${value.toFixed(4)}`;
const table = (header, rows) => [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${row.join(' | ')} |`)].join('\n');

function agentsCell(total) {
  return total.unavailable_agents ? `${figure(total.agents)} (${figure(total.unavailable_agents)} unavailable)` : figure(total.agents);
}

function usageColumns(harness, total) {
  return harness === 'claude'
    ? [figure(total.input), figure(total.output), figure(total.cache_read), figure(total.cache_write_5m), figure(total.cache_write_1h), figure(total.tool_calls)]
    : [figure(total.input), figure(total.output), figure(total.cache_read), figure(total.cache_write), figure(total.tool_calls), money(total.cost)];
}

const usageHeader = harness => harness === 'claude'
  ? ['Input', 'Output', 'Cache read', 'Cache write 5m', 'Cache write 1h', 'Tool calls']
  : ['Input', 'Output', 'Cache read', 'Cache write', 'Tool calls', 'Cost'];

function segmentTable(harness, rows) {
  const body = [];
  for (const segment of SEGMENT_ORDER) {
    const own = rows.filter(row => row.segment === segment);
    if (!own.length) continue;
    for (const row of own) body.push([segment, row.role, row.agent_type, figure(row.runs), agentsCell(row), ...usageColumns(harness, row)]);
  }
  return table(['Segment', 'Role', 'Agent', 'Runs', 'Agents', ...usageHeader(harness)], body);
}

// Mean per run of the runs that have the segment, over every agent reported in it.
function meanTable(harness, rows, runsByRun) {
  const body = [];
  for (const segment of SEGMENT_ORDER) {
    const own = rows.filter(row => row.segment === segment);
    if (!own.length) continue;
    const total = own.reduce((sum, row) => {
      for (const field of ['agents', 'unavailable_agents', 'requests', ...USAGE_FIELDS, 'tool_calls']) if (row[field] !== undefined) sum[field] = (sum[field] ?? 0) + row[field];
      return sum;
    }, {});
    const runs = runsByRun.get(segment) ?? 1;
    const mean = Object.fromEntries(Object.entries(total).map(([field, value]) => [field, value / runs]));
    body.push([segment, figure(runs), figure(totalTokens(total) / runs), ...usageColumns(harness, mean)]);
  }
  return table(['Segment', 'Runs', 'Total tokens', ...usageHeader(harness)], body);
}

function renderBaseline(report, aliases) {
  const labels = new Map();
  const groups = [...new Set([...report.projects.map(project => project.project_group), ...report.runs.map(run => run.project_group)])];
  groups.forEach(group => labels.set(group, groupLabel(group, aliases)));
  const lines = [];
  const date = report.read_at.slice(0, 10);
  lines.push(`# Planning and implementation cost baseline (${date})`, '');
  lines.push(`Baseline format ${report.baseline_format}. Measured with \`sai/tools/retrospective.js cost --with-worktrees --format markdown\` over the projects listed below; the figures are the harnesses' own token counts for every SAI planning and implementation run still present in their transcripts. Rerun the same command after a contract change and compare the tables.`, '');
  lines.push('## Reading the figures', '');
  lines.push('- A run is an execution of `/sai-1-spec`, `/sai-2-design`, `/sai-plan`, `/sai-3-implement`, or `/sai-build`, or of any other command (such as an `/sai-explore` route) whose workers did a spec, design, or implement segment. It covers the invocation up to the next SAI invocation of the same session; the coordinator of an `/sai-explore` run is the whole exploration session.');
  lines.push('- The coordinator is the main session of the run. A worker is a SAI worker the run created; its segment follows its type (`spec`, `design`, or `implement` for the RED, GREEN, and Direct Build workers). Any other SAI worker, such as the review worker of `/sai-build`, is reported under `other` with its own type.');
  lines.push('- A dispatched agent is a helper another agent launched (for example the explorers of the design worker). It is reported by type, apart from the agent that dispatched it, under that agent\'s segment; a helper the main session launched follows the run\'s command.');
  lines.push('- Usage is summed per model request. Claude Code separates 5-minute and 1-hour cache writes and records no cost; opencode records one cache-write figure and a cost when the provider reports one. An agent whose usage is missing counts as `unavailable` and adds nothing to the sums.');
  lines.push('- Total tokens are input, output, cache read, and cache write added together. Tool calls are the tool-use blocks an agent issued.');
  lines.push('- Review rounds and coordination stay inside the coordinator\'s figures.', '');
  lines.push('## Coverage', '');
  lines.push(table(['Project', 'Harness', 'Directories with sessions', 'Sessions read', 'Status'], [...groups].flatMap(group => {
    const own = report.projects.filter(project => project.project_group === group);
    return [...new Set(own.map(project => project.harness))].map(harness => {
      const mine = own.filter(project => project.harness === harness);
      return [labels.get(group), harness, figure(mine.filter(project => project.sessions_read > 0).length), figure(mine.reduce((sum, project) => sum + project.sessions_read, 0)), mine.some(project => project.status === 'analyzed') ? 'analyzed' : 'not analyzed'];
    });
  })), '');
  for (const harness of report.harnesses.filter(entry => entry.status !== 'analyzed')) lines.push(`- ${harness.harness}: not analyzed (${harness.reason}).`);
  const unavailableRuns = report.runs.filter(run => run.totals.unavailable_agents > 0).length;
  lines.push(`- ${figure(report.runs.length)} runs were read; ${figure(report.runs.filter(run => run.in_progress).length)} were still in progress at read time; ${figure(unavailableRuns)} include an agent without usage data.`, '');

  for (const group of groups) {
    const groupRuns = report.runs.filter(run => run.project_group === group);
    if (!groupRuns.length) continue;
    const label = labels.get(group), anonymous = aliases.has(group);
    lines.push(`## ${label}`, '');
    for (const harness of ['claude', 'opencode']) {
      const runs = groupRuns.filter(run => run.harness === harness);
      if (!runs.length) continue;
      const rows = report.rows.filter(row => row.project_group === group && row.harness === harness);
      lines.push(`### ${label}: ${harness === 'claude' ? 'Claude Code' : 'opencode'}`, '');
      const commands = [...new Set(runs.map(run => run.command))].sort();
      lines.push(table(['Command', 'Runs', 'In progress'], commands.map(command => [`\`${command}\``, figure(runs.filter(run => run.command === command).length), figure(runs.filter(run => run.command === command && run.in_progress).length)])), '');
      lines.push('Cost by segment, role, and agent type:', '', segmentTable(harness, rows), '');
      const segmentRuns = new Map(SEGMENT_ORDER.map(segment => [segment, runs.filter(run => run.agents.some(agent => (agent.segment ?? 'other') === segment)).length]));
      lines.push('Mean per run, over the runs that have the segment:', '', meanTable(harness, rows, segmentRuns), '');
    }
    const named = report.changes.filter(change => change.project_group === group);
    const sideTotals = (runNumbers) => runNumbers.map(number => report.runs[number - 1]).reduce((sum, run) => ({ tokens: sum.tokens + run.totals.tokens, tool_calls: sum.tool_calls + run.totals.tool_calls, unavailable: sum.unavailable + run.totals.unavailable_agents }), { tokens: 0, tool_calls: 0, unavailable: 0 });
    const side = runNumbers => { const total = sideTotals(runNumbers); return [figure(runNumbers.length), runNumbers.length ? `${figure(total.tokens)}${total.unavailable ? '*' : ''}` : '-', runNumbers.length ? figure(total.tool_calls) : '-']; };
    const unnamed = report.unnamed_runs.filter(entry => report.runs[entry.run - 1].project_group === group);
    lines.push(`### ${label}: pairing of planning and implementation`, '');
    lines.push(`${figure(named.filter(change => change.status === 'paired').length)} changes have both planning and implementation runs, ${figure(named.filter(change => change.side === 'planning-only').length)} only planning runs, ${figure(named.filter(change => change.side === 'implementation-only').length)} only implementation runs, and ${figure(unnamed.length)} runs have no determinable change name and count as unpaired.`, '');
    // A change with planning runs is listed on its own; the implementation-only changes share one row.
    const listed = named.filter(change => change.planning_runs.length).map((change, i) => ({ change, number: i + 1 }));
    const implementationOnly = named.filter(change => !change.planning_runs.length);
    if (listed.length || implementationOnly.length) {
      const rows = listed.map(({ change, number }) => [anonymous ? `change ${number}` : `\`${change.change}\``, change.status === 'paired' ? 'paired' : `unpaired (${change.side})`, ...side(change.planning_runs), ...side(change.implementation_runs)]);
      if (implementationOnly.length) rows.push([`${figure(implementationOnly.length)} changes`, 'unpaired (implementation-only)', '0', '-', '-', ...side(implementationOnly.flatMap(change => change.implementation_runs))]);
      lines.push(table(['Change', 'Status', 'Planning runs', 'Planning tokens', 'Planning tool calls', 'Implementation runs', 'Implementation tokens', 'Implementation tool calls'], rows), '');
      if (named.some(change => [...change.planning_runs, ...change.implementation_runs].some(number => report.runs[number - 1].totals.unavailable_agents))) lines.push('\\* includes an agent without usage data.', '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function main(argv, env = process.env, loadSqlite = defaultLoadSqlite) {
  const [command, ...rest] = argv;
  if (command === 'index') return index(rest, env, loadSqlite);
  if (command === 'cost') return cost(rest, env, loadSqlite);
  if (command === 'excerpt') return excerpt(rest, env, loadSqlite);
  throw new ToolError('USAGE', 'Usage: retrospective.js index <target> [--paths "<p1>,<p2>"] [--with-worktrees] [--limit <N>] | cost [--paths "<p1>,<p2>"] [--with-worktrees] [--alias "<path>=<alias>"] [--format json|markdown] | excerpt --project <path> --session <id> [--agent <id>] [--from <record>] [--count <N>] [--max-chars <N>]');
}

if (require.main === module) {
  try {
    const result = main(process.argv.slice(2));
    process.stdout.write(typeof result === 'string' ? result : `${JSON.stringify(result)}\n`);
  } catch (error) {
    if (!(error instanceof ToolError)) throw error;
    process.stdout.write(`${JSON.stringify({ error: { code: error.code, message: error.message } })}\n`);
    process.exitCode = 2;
  }
}

module.exports = { main, index, cost, excerpt, splitPaths, changeNameFromArgs, expandProjects, classifyTarget, projectFolder, ToolError };

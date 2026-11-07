'use strict';

/**
 * claude-transcripts — the read-only Claude Code transcript reader shared by the
 * SAI tools.
 *
 * It locates `<config>/projects/<encoded-project>/<session>.jsonl` and
 * `<session>/subagents/agent-<id>.{jsonl,meta.json}` (the config folder is
 * `CLAUDE_CONFIG_DIR`, default `~/.claude`), parses them, collapses the lines of
 * one assistant response into one request by `message.id`, and reads each
 * request's usage, tool calls, tool errors, and dispatches. It writes nothing.
 * Claude Code's transcript is an internal format: a datum a record does not
 * hold is `null`, never zero.
 *
 * `retrospective.js` uses the locating and parsing helpers; `change-telemetry.js`
 * uses `openClaudeSource`, which answers the same questions as its opencode
 * source.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const UNAVAILABLE = 'unavailable';
const OPEN_END = Number.MAX_SAFE_INTEGER;
const DISPATCH_TOOL = 'Agent';
const INVOCATION = /<command-name>\s*\/?([^<\s]+)\s*<\/command-name>/;
const INVOCATION_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;
const RECORD_TYPES = new Set(['user', 'assistant', 'attachment', 'system']);

// The Claude Code reader could not be used; the harness is reported not analyzed.
class ClaudeUnavailable extends Error {}

function claudeProjectsRoot(env = process.env) {
  return path.join(env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects');
}

// Claude Code names a project folder after its path with every character
// outside [A-Za-z0-9] replaced by a dash.
function projectFolder(projectsRoot, projectPath) {
  return path.join(projectsRoot, projectPath.replace(/[^A-Za-z0-9]/g, '-'));
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

function byTimeThenUuid(a, b) {
  return (Date.parse(a.timestamp) - Date.parse(b.timestamp)) || (a.uuid < b.uuid ? -1 : a.uuid > b.uuid ? 1 : 0);
}

function readRecords(text) {
  return parseTranscript(text).filter(row => RECORD_TYPES.has(row.type) && row.uuid && row.timestamp).sort(byTimeThenUuid);
}

function blocks(row) {
  return Array.isArray(row.message?.content) ? row.message.content : [];
}

function textOf(row) {
  const content = row.message?.content;
  if (typeof content === 'string') return content;
  return blocks(row).filter(block => block?.type === 'text').map(block => block.text).join('\n');
}

// The slash command a user record invoked: `{ command, args }`, or null.
function invocationOf(row) {
  if (row.type !== 'user' || row.isMeta) return null;
  const text = textOf(row).trim();
  if (!text.startsWith('<command-')) return null;
  const name = text.match(INVOCATION)?.[1];
  if (!name) return null;
  return { command: name, args: (text.match(INVOCATION_ARGS)?.[1] ?? '').trim() };
}

const count = value => (Number.isFinite(value) ? value : null);

// One transcript line of an assistant response (a request spans several lines
// that share message.id; the caller keeps the line with the most output).
function claudeTokens(row) {
  const t = row?.message?.usage;
  const input = count(t?.input_tokens), output = count(t?.output_tokens), cacheRead = count(t?.cache_read_input_tokens);
  if (row?.type !== 'assistant' || input === null || output === null || cacheRead === null) return UNAVAILABLE;
  const write5m = count(t.cache_creation?.ephemeral_5m_input_tokens), write1h = count(t.cache_creation?.ephemeral_1h_input_tokens);
  const split = write5m !== null && write1h !== null;
  return { input, output, cache_read: cacheRead, cache_write_5m: split ? write5m : null, cache_write_1h: split ? write1h : null, cache_write_unsplit: split ? null : count(t.cache_creation_input_tokens) };
}

// The subagents of a session, from `<session dir>/subagents/agent-<id>.meta.json`.
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

// ---------------------------------------------------------------------------
// Requests: one per assistant `message.id`
// ---------------------------------------------------------------------------

const outputOf = usage => count(usage?.output_tokens) ?? -1;
const timeOf = row => { const time = Date.parse(row?.timestamp); return Number.isFinite(time) ? time : null; };

function cacheWrite(usage) {
  const write5m = count(usage?.cache_creation?.ephemeral_5m_input_tokens), write1h = count(usage?.cache_creation?.ephemeral_1h_input_tokens);
  if (write5m !== null && write1h !== null) return write5m + write1h;
  return count(usage?.cache_creation_input_tokens);
}

/**
 * The requests of a transcript's records (sorted, from `readRecords`), in order.
 * Repeated lines of one `message.id` are one request; a tool call counts once by
 * its `tool_use` id. The model time of a request runs from the record that
 * triggered it to its last line. A request whose tool calls have no result yet,
 * at the end of the transcript, is still running and has no completion time.
 * `agentOfToolUse` maps a dispatch call to the subagent it started.
 */
function transcriptRequests(rows, agentOfToolUse = new Map()) {
  const byUuid = new Map(rows.map(row => [row.uuid, row]));
  const answered = new Set(), failed = new Set();
  for (const row of rows) {
    if (row.type !== 'user') continue;
    for (const block of blocks(row)) {
      if (block?.type !== 'tool_result' || !block.tool_use_id) continue;
      answered.add(block.tool_use_id);
      if (block.is_error) failed.add(block.tool_use_id);
    }
  }
  const merged = new Map(), list = [];
  for (const row of rows) {
    if (row.type !== 'assistant' || !row.message || row.message.model === '<synthetic>' || row.isApiErrorMessage) continue;
    const key = row.message.id ?? `row:${row.uuid}`;
    let entry = merged.get(key);
    if (!entry) { entry = { first: row, last: row, usage: row.message.usage, model: null, calls: new Map() }; merged.set(key, entry); list.push(entry); }
    entry.last = row;
    if (typeof row.message.model === 'string') entry.model = row.message.model;
    const usage = row.message.usage;
    if (usage && outputOf(usage) >= outputOf(entry.usage)) entry.usage = usage;
    for (const block of blocks(row)) if (block?.type === 'tool_use' && block.id && !entry.calls.has(block.id)) entry.calls.set(block.id, { id: block.id, name: block.name ?? null, input: block.input });
  }
  return list.map((entry, index) => {
    const items = [...entry.calls.values()].map(call => ({ id: call.id, name: call.name, state: { status: failed.has(call.id) ? 'error' : 'completed', input: call.input } }));
    const pending = index === list.length - 1 && items.some(item => !answered.has(item.id));
    const created = timeOf(entry.first), completed = pending ? null : timeOf(entry.last);
    const triggered = timeOf(byUuid.get(entry.first.parentUuid));
    const ms = triggered !== null && completed !== null && completed >= triggered ? completed - triggered : null;
    const dispatches = items.filter(item => item.name === DISPATCH_TOOL);
    return {
      time: created,
      completed,
      input: count(entry.usage?.input_tokens),
      output: count(entry.usage?.output_tokens),
      reasoning: null,
      cacheRead: count(entry.usage?.cache_read_input_tokens),
      cacheWrite: cacheWrite(entry.usage),
      cost: null,
      ms,
      model: typeof entry.model === 'string' && entry.model ? entry.model : null,
      variant: null,
      items,
      calls: items.filter(item => item.name !== DISPATCH_TOOL),
      dispatches: dispatches.length,
      links: dispatches.map(item => ({ session: agentOfToolUse.get(item.id) ?? item.id, time: created })),
    };
  }).filter(request => request.time !== null);
}

// The first timestamp of a transcript file, read without loading all of it.
function firstTimestamp(file) {
  let descriptor;
  try {
    descriptor = fs.openSync(file, 'r');
    const chunk = Buffer.alloc(65536);
    let pending = '', offset = 0, read;
    while ((read = fs.readSync(descriptor, chunk, 0, chunk.length, offset)) > 0 && offset < 4 * 1024 * 1024) {
      offset += read;
      pending += chunk.toString('utf8', 0, read);
      const lines = pending.split('\n');
      pending = lines.pop();
      for (const line of lines) {
        try { const time = timeOf(JSON.parse(line)); if (time !== null) return time; } catch { /* the next line may be readable */ }
      }
    }
    try { return timeOf(JSON.parse(pending)); } catch { return null; }
  } catch { return null; } finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}

// ---------------------------------------------------------------------------
// The source `change-telemetry.js` reads a project's executions through
// ---------------------------------------------------------------------------

/**
 * The transcripts of one project folder as the telemetry source: root sessions
 * (one per `<session>.jsonl`), their subagents as children, and requests by
 * time window. A session or agent ID is its UUID or agent ID.
 */
function openClaudeSource({ cwd, env = process.env }) {
  const projects = claudeProjectsRoot(env);
  const folder = projectFolder(projects, cwd);
  let entries;
  try { entries = fs.readdirSync(folder).filter(name => name.endsWith('.jsonl')).sort(); } catch (error) {
    throw new ClaudeUnavailable(`No readable Claude Code transcript folder was found for ${cwd} (${folder}: ${error.code ?? 'error'})`);
  }
  const roots = new Set(entries.map(name => name.slice(0, -'.jsonl'.length)));
  const commandRoots = new Map(), rootRows = new Map(), agentsOf = new Map(), agentFile = new Map(), agentRows = new Map(), requestCache = new Map();

  const sessionDir = id => path.join(folder, id);
  const rootHasCommands = id => {
    if (!commandRoots.has(id)) {
      let found = false;
      try { found = fs.readFileSync(path.join(folder, `${id}.jsonl`), 'utf8').includes('<command-name>'); } catch { /* an unreadable session holds nothing */ }
      commandRoots.set(id, found);
    }
    return commandRoots.get(id);
  };
  const readFile = file => { try { return readRecords(fs.readFileSync(file, 'utf8')); } catch { return null; } };

  // The records of a root session, or null when it cannot be read.
  function rowsOfRoot(id) {
    if (!rootRows.has(id)) {
      let text = null;
      try { text = fs.readFileSync(path.join(folder, `${id}.jsonl`), 'utf8'); } catch { /* an unreadable session holds nothing */ }
      rootRows.set(id, text === null ? null : readRecords(text));
    }
    return rootRows.get(id);
  }

  function agentsOfRoot(id) {
    if (!agentsOf.has(id)) {
      const agents = readAgents(sessionDir(id)).filter(agent => fs.existsSync(agent.file));
      for (const agent of agents) agentFile.set(agent.agent_id, { file: agent.file, root: id });
      agentsOf.set(id, agents);
    }
    return agentsOf.get(id);
  }

  const toolUseAgents = id => new Map(agentsOfRoot(id).filter(agent => agent.tool_use_id).map(agent => [agent.tool_use_id, agent.agent_id]));

  // Locates the agent in any root of the project: roots are indexed on first use.
  function findAgent(agentId) {
    if (!agentFile.has(agentId)) for (const root of roots) { agentsOfRoot(root); if (agentFile.has(agentId)) break; }
    return agentFile.get(agentId) ?? null;
  }

  function sessionRecords(sessionId) {
    if (roots.has(sessionId)) return { rows: rowsOfRoot(sessionId), root: sessionId };
    const agent = findAgent(sessionId);
    if (!agent) return { rows: null, root: null };
    if (!agentRows.has(sessionId)) agentRows.set(sessionId, readFile(agent.file));
    return { rows: agentRows.get(sessionId), root: agent.root };
  }

  function allRequests(sessionId) {
    if (!requestCache.has(sessionId)) {
      const { rows, root } = sessionRecords(sessionId);
      requestCache.set(sessionId, rows ? transcriptRequests(rows, toolUseAgents(root)) : []);
    }
    return requestCache.get(sessionId);
  }

  return {
    name: 'Claude Code',
    store: 'the Claude Code transcripts',
    close() {},
    roots: () => [...roots].map(id => ({ id })),
    isRoot: id => roots.has(id),
    hasSession: id => roots.has(id) || findAgent(id) !== null,
    // A transcript without `<command-name>` holds no command invocation and is never parsed.
    invocations(sessionId) {
      if (!roots.has(sessionId) || !rootHasCommands(sessionId)) return [];
      return (rowsOfRoot(sessionId) ?? []).flatMap(row => {
        const invocation = invocationOf(row);
        if (!/^sai-/.test(invocation?.command ?? '')) return [];
        return [{ id: `${sessionId}:${row.uuid}`, time: timeOf(row), name: invocation.command.replace(/^sai-/, ''), args: invocation.args }];
      }).filter(invocation => invocation.time !== null);
    },
    routeId: (rootId, anchorId) => `${rootId}:${anchorId}`,
    requests: (sessionId, from, to) => allRequests(sessionId).filter(request => request.time >= from && request.time < to),
    userTexts(sessionId) {
      const { rows } = sessionRecords(sessionId);
      return (rows ?? []).filter(row => row.type === 'user' && !blocks(row).some(block => block?.type === 'tool_result')).map(textOf);
    },
    // Every subagent below a root, parents before their children.
    children(rootId) {
      const agents = agentsOfRoot(rootId);
      const depths = new Map();
      const depthOf = agent => {
        if (depths.has(agent.agent_id)) return depths.get(agent.agent_id);
        const parent = agent.parent_agent_id ? agents.find(candidate => candidate.agent_id === agent.parent_agent_id) : null;
        const depth = Number.isInteger(agent.spawn_depth) ? agent.spawn_depth : parent ? depthOf(parent) + 1 : 1;
        depths.set(agent.agent_id, depth);
        return depth;
      };
      return agents.map(agent => ({
        id: agent.agent_id,
        parent_id: agent.parent_agent_id ?? rootId,
        agent: agent.agent_type,
        time_created: firstTimestamp(agent.file) ?? OPEN_END,
        depth: depthOf(agent),
      })).sort((a, b) => a.depth - b.depth || a.time_created - b.time_created || (a.id < b.id ? -1 : 1));
    },
  };
}

module.exports = {
  ClaudeUnavailable,
  claudeProjectsRoot,
  projectFolder,
  parseTranscript,
  readRecords,
  blocks,
  textOf,
  invocationOf,
  claudeTokens,
  readAgents,
  transcriptRequests,
  openClaudeSource,
};

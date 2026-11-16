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
 * It also finds the wakes of cache warming: the turns that the completion of an
 * agent's own `wait.js ... warm` background wait opens, matched on the command and
 * the background task id, never on the task description or a reply literal.
 *
 * An agent routed to opencode (sai/policies/opencode-dispatch.md) leaves no
 * subagent file: `dispatchedWorkers` finds its session through the dispatch tool's
 * results, and `openClaudeSource` reads that session's requests from `opencode.db`
 * through `opencode-db.js`, read-only.
 *
 * `retrospective.js` uses the locating and parsing helpers; `change-telemetry.js`
 * uses `openClaudeSource`, which answers the same questions as its opencode
 * source.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { OpencodeUnavailable, defaultLoadSqlite, openOpencodeDatabase, opencodeSessionMessages } = require('./opencode-db');

const UNAVAILABLE = 'unavailable';
const OPEN_END = Number.MAX_SAFE_INTEGER;
const DISPATCH_TOOL = 'Agent';
const INVOCATION = /<command-name>\s*\/?([^<\s]+)\s*<\/command-name>/;
const INVOCATION_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;
const RECORD_TYPES = new Set(['user', 'assistant', 'attachment', 'system']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
// The command of a cache-warm wait: `wait.js` followed by `warm`, whatever description the task carries.
const WAIT_WARM = /wait\.js["']?\s+warm\b/;
const TASK_NOTIFICATION = /<task-notification>[\s\S]*?<task-id>\s*([^<\s]+)\s*<\/task-id>/;
const BACKGROUND_ID = /with ID:\s*([A-Za-z0-9_-]+)/;

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
// Wakes: the turns that the completion of an agent's own cache-warm wait opens
// ---------------------------------------------------------------------------

const requestKey = row => row.message.id ?? `row:${row.uuid}`;
const isModelRequest = row => row.type === 'assistant' && row.message && row.message.model !== '<synthetic>' && !row.isApiErrorMessage;

function toolResultText(block) {
  const content = block.content;
  if (typeof content === 'string') return content;
  return Array.isArray(content) ? content.map(part => part?.text ?? '').join('\n') : '';
}

/**
 * The background task ids of the cache-warm waits an agent launched: the id that
 * Claude Code returned for a shell `tool_use` whose command is `wait.js ... warm`.
 * The task description is never read.
 */
function claudeWaitTasks(rows) {
  const arms = new Set();
  for (const row of rows) {
    if (row.type !== 'assistant') continue;
    for (const block of blocks(row)) {
      if (block?.type === 'tool_use' && block.id && SHELL_TOOLS.has(block.name) && typeof block.input?.command === 'string' && WAIT_WARM.test(block.input.command)) arms.add(block.id);
    }
  }
  const tasks = new Set();
  if (arms.size === 0) return tasks;
  for (const row of rows) {
    if (row.type !== 'user') continue;
    const results = blocks(row).filter(block => block?.type === 'tool_result' && arms.has(block.tool_use_id));
    for (const block of results) {
      const id = (typeof row.toolUseResult?.backgroundTaskId === 'string' && results.length === 1 ? row.toolUseResult.backgroundTaskId : null) ?? toolResultText(block).match(BACKGROUND_ID)?.[1];
      if (id) tasks.add(id);
    }
  }
  return tasks;
}

// A user record opens a turn unless it answers a tool call: a tool result, or the content a tool call injected
// (a skill body). Injected messages, task notifications included, are marked `isMeta` and still open one.
const opensTurn = row => row.type === 'user' && !row.sourceToolUseID && !blocks(row).some(block => block?.type === 'tool_result');

/**
 * The wakes of a transcript's records (sorted, from `readRecords`): each opens at
 * the `<task-notification>` that completes one of the agent's own wait tasks, and
 * lasts to the end of its turn, the next record that opens a turn. A wake lists
 * the request keys (`message.id`) of every model request in that stretch, the
 * re-arm and the reply literal included. A reply literal alone never makes a wake.
 */
function claudeWakes(rows, tasks = claudeWaitTasks(rows)) {
  if (tasks.size === 0) return [];
  const wakes = [];
  rows.forEach((row, index) => {
    if (row.type !== 'user') return;
    const id = textOf(row).match(TASK_NOTIFICATION)?.[1];
    if (!id || !tasks.has(id)) return;
    const keys = new Set();
    for (let i = index + 1; i < rows.length && !opensTurn(rows[i]); i++) if (isModelRequest(rows[i])) keys.add(requestKey(rows[i]));
    wakes.push({ record: row.uuid, time: timeOf(row), keys: [...keys] });
  });
  return wakes.filter(wake => wake.time !== null);
}

// ---------------------------------------------------------------------------
// opencode-routed workers: the sessions `opencode-dispatch.js` ran for the agent
// ---------------------------------------------------------------------------

/**
 * The opencode-routed workers a transcript dispatched (sai/policies/opencode-dispatch.md). A worker runs as an
 * `opencode run` session, not as a Claude Code subagent, so no `subagents/` file records it: its trace is the shell
 * calls of `opencode-dispatch.js start|continue` and the one JSON object each prints (`sessionID`, `tokens`, ...).
 * The object of a call is read where it landed: the result of the call itself, the output file of its background task
 * (named by the call's result and by the task notification, read from disk when it is still there), or the later call
 * that read that file. A `continue` names its session in its own command line. A worker is one session; its first call
 * names the agent and the time. A `start` whose `sessionID` cannot be found is a worker with `session: null`: its
 * tokens are unavailable, never zero. Returns `[{ session, agent, tool_use_id, time, calls }]` in time order.
 */
const DISPATCH_CALL = /node(?:\.exe)?["']?\s+["']?[^\s"']*opencode-dispatch\.js["']?\s+(start|continue)\b/;
const OUTPUT_FILE = /Output is being written to:\s*(\S+?\.output)/;
const NOTIFIED_TOOL_USE = /<tool-use-id>\s*([^<\s]+)\s*<\/tool-use-id>/;
const NOTIFIED_OUTPUT = /<output-file>\s*([^<\s]+)\s*<\/output-file>/;
// Claude Code's Read and `cat -n` prefix each line with its number.
const LINE_NUMBER = /^\s*\d+[\t→]\s?/;

function flagValue(command, flag) {
  const match = command.match(new RegExp(`${flag}[ \\t]+("([^"]+)"|'([^']+)'|(\\S+))`));
  return match ? (match[2] ?? match[3] ?? match[4]) : null;
}

// The dispatch result objects in a text: JSON lines with a `sessionID` and a `tokens` object.
function dispatchResultsIn(text) {
  const found = [];
  for (const line of String(text).split(/\r?\n/)) {
    const candidate = line.replace(LINE_NUMBER, '').trim();
    if (!candidate.startsWith('{') || !candidate.includes('"sessionID"')) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed?.sessionID === 'string' && parsed.sessionID && parsed.tokens && typeof parsed.tokens === 'object') found.push(parsed);
    } catch { /* a line that is not a result object */ }
  }
  return found;
}

function dispatchedWorkers(rows, { readFile = file => fs.readFileSync(file, 'utf8') } = {}) {
  const calls = new Map(), uses = [], results = new Map(), outputs = new Map();
  for (const row of rows) {
    if (row.type === 'assistant') {
      for (const block of blocks(row)) {
        if (block?.type !== 'tool_use' || !block.id) continue;
        uses.push({ id: block.id, input: block.input });
        const command = SHELL_TOOLS.has(block.name) && typeof block.input?.command === 'string' ? block.input.command : '';
        const kind = command.match(DISPATCH_CALL)?.[1];
        if (kind) calls.set(block.id, { id: block.id, kind, agent: flagValue(command, '--agent'), session: kind === 'continue' ? flagValue(command, '--session') : null, time: timeOf(row) ?? 0 });
      }
    } else if (row.type === 'user') {
      for (const block of blocks(row)) if (block?.type === 'tool_result' && block.tool_use_id) results.set(block.tool_use_id, toolResultText(block));
      const notice = textOf(row);
      if (notice.includes('<task-notification>')) {
        const id = notice.match(NOTIFIED_TOOL_USE)?.[1], file = notice.match(NOTIFIED_OUTPUT)?.[1];
        if (id && file) outputs.set(id, file);
      }
    }
  }
  if (calls.size === 0) return [];

  // The text each later call read, by call: the result objects a Read or `cat` of a task output file shows.
  const resultOf = call => {
    const own = dispatchResultsIn(results.get(call.id) ?? '')[0];
    if (own) return own;
    const file = outputs.get(call.id) ?? results.get(call.id)?.match(OUTPUT_FILE)?.[1];
    if (!file) return null;
    try { const read = dispatchResultsIn(readFile(file))[0]; if (read) return read; } catch { /* the file is gone: a call that read it still holds the object */ }
    for (const use of uses) {
      if (calls.has(use.id) || !JSON.stringify(use.input ?? {}).includes(file)) continue;
      const seen = dispatchResultsIn(results.get(use.id) ?? '')[0];
      if (seen) return seen;
    }
    return null;
  };

  const workers = new Map(), list = [];
  for (const call of [...calls.values()].sort((a, b) => a.time - b.time)) {
    const session = call.kind === 'start' ? resultOf(call)?.sessionID ?? null : call.session;
    const key = session ?? `unresolved:${call.id}`;
    const worker = workers.get(key);
    if (worker) { worker.calls++; worker.agent ??= call.agent; continue; }
    const created = { session, agent: call.agent, tool_use_id: call.id, time: call.time, calls: 1 };
    workers.set(key, created);
    list.push(created);
  }
  return list;
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
 * `agentOfToolUse` maps a dispatch call to the subagent it started. A request
 * the turn of a wake (`claudeWakes`) made is flagged `wake`.
 */
function transcriptRequests(rows, agentOfToolUse = new Map()) {
  const byUuid = new Map(rows.map(row => [row.uuid, row]));
  const wakeKeys = new Set(claudeWakes(rows).flatMap(wake => wake.keys));
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
    if (!isModelRequest(row)) continue;
    const key = requestKey(row);
    let entry = merged.get(key);
    if (!entry) { entry = { key, first: row, last: row, usage: row.message.usage, model: null, calls: new Map() }; merged.set(key, entry); list.push(entry); }
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
      wake: wakeKeys.has(entry.key),
      input: count(entry.usage?.input_tokens),
      output: count(entry.usage?.output_tokens),
      reasoning: null,
      cacheRead: count(entry.usage?.cache_read_input_tokens),
      cacheWrite: cacheWrite(entry.usage),
      cacheWrite5m: count(entry.usage?.cache_creation?.ephemeral_5m_input_tokens),
      cacheWrite1h: count(entry.usage?.cache_creation?.ephemeral_1h_input_tokens),
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
 * time window. A session or agent ID is its UUID or agent ID. The opencode-routed workers
 * of a session are its children too: their ID is the opencode `sessionID`, and
 * `opencodeRequest` shapes the rows of their session (a child that carries `store` is
 * read from there, and `unavailable` says why a child has no session to read). A caller
 * that passes no `opencodeRequest` gets the subagents alone.
 */
function openClaudeSource({ cwd, env = process.env, loadSqlite = defaultLoadSqlite, opencodeRequest = null }) {
  const projects = claudeProjectsRoot(env);
  const folder = projectFolder(projects, cwd);
  let entries;
  try { entries = fs.readdirSync(folder).filter(name => name.endsWith('.jsonl')).sort(); } catch (error) {
    throw new ClaudeUnavailable(`No readable Claude Code transcript folder was found for ${cwd} (${folder}: ${error.code ?? 'error'})`);
  }
  const roots = new Set(entries.map(name => name.slice(0, -'.jsonl'.length)));
  const commandRoots = new Map(), rootRows = new Map(), agentsOf = new Map(), agentFile = new Map(), agentRows = new Map(), requestCache = new Map(), wakeCache = new Map();

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

  function allWakes(sessionId) {
    if (!wakeCache.has(sessionId)) wakeCache.set(sessionId, claudeWakes(sessionRecords(sessionId).rows ?? []));
    return wakeCache.get(sessionId);
  }

  // The opencode-routed workers. `opencode.db` is opened on first use, read-only; one that cannot be read leaves the
  // sessions unavailable with its message, and a session it does not hold is unavailable too, never an empty one.
  const routedSessions = new Set(), dispatchCache = new Map(), childCache = new Map();
  let opencode;
  const opencodeDatabase = () => {
    if (opencode === undefined) {
      try { opencode = { db: openOpencodeDatabase(env, loadSqlite), error: null }; } catch (error) {
        if (!(error instanceof OpencodeUnavailable)) throw error;
        opencode = { db: null, error: error.message };
      }
    }
    return opencode;
  };
  const routedMessages = sessionId => {
    const { db } = opencodeDatabase();
    if (!db) return null;
    try { return opencodeSessionMessages(db, sessionId); } catch { return null; }
  };

  // The workers an owner session (a root or one of its subagents) dispatched through `opencode-dispatch.js`.
  function dispatchesOf(ownerId) {
    if (!opencodeRequest) return [];
    if (!dispatchCache.has(ownerId)) {
      let found = [];
      const file = roots.has(ownerId) ? path.join(folder, `${ownerId}.jsonl`) : findAgent(ownerId)?.file;
      try { if (file && fs.readFileSync(file, 'utf8').includes('opencode-dispatch.js')) found = dispatchedWorkers(sessionRecords(ownerId).rows ?? []); } catch { /* an unreadable transcript holds no dispatch */ }
      dispatchCache.set(ownerId, found);
    }
    return dispatchCache.get(ownerId);
  }

  function routedChild(worker, owner) {
    let unavailable = null;
    if (worker.session === null) unavailable = 'its sessionID is not in the transcript';
    else {
      routedSessions.add(worker.session);
      if (routedMessages(worker.session) === null) unavailable = `session ${worker.session} is not in opencode.db${opencode.error ? ` (${opencode.error})` : ''}`;
    }
    return { id: worker.session ?? `unresolved-${worker.tool_use_id}`, parent_id: owner.id, agent: worker.agent, time_created: worker.time, depth: owner.depth + 1, store: 'opencode.db', ...(unavailable ? { unavailable } : {}) };
  }

  function routedRequests(sessionId) {
    if (!requestCache.has(sessionId)) requestCache.set(sessionId, opencodeRequest ? (routedMessages(sessionId) ?? []).map(opencodeRequest) : []);
    return requestCache.get(sessionId);
  }

  return {
    name: 'Claude Code',
    store: 'the Claude Code transcripts',
    close() { if (opencode?.db) opencode.db.close(); },
    roots: () => [...roots].map(id => ({ id })),
    isRoot: id => roots.has(id),
    hasSession: id => roots.has(id) || findAgent(id) !== null || (routedSessions.has(id) && routedMessages(id) !== null),
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
    requests: (sessionId, from, to) => (routedSessions.has(sessionId) ? routedRequests(sessionId) : allRequests(sessionId)).filter(request => request.time >= from && request.time < to),
    // The wakes that opened in [from, to): `{ record, time, keys }`.
    wakes: (sessionId, from, to) => allWakes(sessionId).filter(wake => wake.time >= from && wake.time < to),
    userTexts(sessionId) {
      const { rows } = sessionRecords(sessionId);
      return (rows ?? []).filter(row => row.type === 'user' && !blocks(row).some(block => block?.type === 'tool_result')).map(textOf);
    },
    // Every subagent below a root, parents before their children, and the opencode-routed workers each of them dispatched.
    children(rootId) {
      if (childCache.has(rootId)) return childCache.get(rootId);
      const agents = agentsOfRoot(rootId);
      const depths = new Map();
      const depthOf = agent => {
        if (depths.has(agent.agent_id)) return depths.get(agent.agent_id);
        const parent = agent.parent_agent_id ? agents.find(candidate => candidate.agent_id === agent.parent_agent_id) : null;
        const depth = Number.isInteger(agent.spawn_depth) ? agent.spawn_depth : parent ? depthOf(parent) + 1 : 1;
        depths.set(agent.agent_id, depth);
        return depth;
      };
      const subagents = agents.map(agent => ({
        id: agent.agent_id,
        parent_id: agent.parent_agent_id ?? rootId,
        agent: agent.agent_type,
        time_created: firstTimestamp(agent.file) ?? OPEN_END,
        depth: depthOf(agent),
      }));
      const owners = [{ id: rootId, depth: 0 }, ...agents.map(agent => ({ id: agent.agent_id, depth: depthOf(agent) }))];
      const routed = owners.flatMap(owner => dispatchesOf(owner.id).map(worker => routedChild(worker, owner)));
      const children = [...subagents, ...routed].sort((a, b) => a.depth - b.depth || a.time_created - b.time_created || (a.id < b.id ? -1 : 1));
      childCache.set(rootId, children);
      return children;
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
  claudeWaitTasks,
  claudeWakes,
  dispatchedWorkers,
  transcriptRequests,
  openClaudeSource,
};

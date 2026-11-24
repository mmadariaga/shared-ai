'use strict';

/**
 * opencode-db — the read-only opencode database reader shared by the SAI tools.
 *
 * It opens `opencode.db` (`$XDG_DATA_HOME/opencode`, default
 * `~/.local/share/opencode`) read-only through `node:sqlite` after a schema
 * guard, links child sessions to their root by `parent_id`, detects the change
 * a run belongs to, and finds the wakes of cache warming. It writes nothing.
 * opencode's database is an internal format: opencode v2.2.0 keeps current and
 * migrated sessions in `session_v2` and their messages in `session_message`.
 * A message's content items (text, tool calls, reasoning) live in
 * `session_message.data.content` up to opencode v2.2 and in the `session_part`
 * table from v2.4.1; `opencodeContent` reads both.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const OPENCODE_SCHEMA = {
  session_v2: ['id', 'parent_id', 'agent', 'title', 'directory', 'time_created'],
  session_message: ['id', 'session_id', 'type', 'seq', 'time_created', 'data'],
};
// Tables that databases created before opencode v2.4 lack: their columns are checked only when the table exists.
const OPENCODE_OPTIONAL_SCHEMA = {
  session_part: ['message_id', 'ordinal', 'type', 'data'],
};
// The item types of a message's content that the readers use; any other type is ignored.
const CONTENT_TYPES = new Set(['text', 'tool', 'reasoning']);
const OPENCODE_MAX_DEPTH = 16;
const CHANGE_NAME = /^[a-z0-9][a-z0-9-]*$/;
const CHANGE_NAME_IN_BLOCK = /\*\*Change name\*\*:[ \t]*([a-z0-9][a-z0-9-]*)/;
// The opencode command wrappers embed the invoked command in an envelope.
const OPENCODE_ENVELOPE = /InvocationEnvelope:\s*\n\s*command_name:[ \t]*(\S+)[^\S\n]*\n\s*arguments_value:([\s\S]*?)\s*(?:<!-- User customizations|$)/;
const VALUE_OPTIONS = new Set(['block-file', 'block-hash', 'overview-lang', 'parent-branch', 'path', 'tier', 'url']);
// The command of a cache-warm wait: `wait.js` followed by `warm`, whatever description the shell carries.
const WAIT_WARM = /wait\.js["']?\s+warm\b/;
// The records that open a turn; the next one ends the turn a wake opened.
const TURN_OPENERS = "'user','synthetic','system','compaction','shell','idle'";
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'write', 'edit', 'patch']);

// The opencode reader could not be used; the harness is reported not analyzed.
class OpencodeUnavailable extends Error {}

const defaultLoadSqlite = () => require('node:sqlite');

function opencodeDatabasePath(env) {
  return path.join(env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'opencode', 'opencode.db');
}

// opencode's database is an internal format: every table and column the reader
// uses must exist before the first query, otherwise nothing is read.
function guardOpencodeSchema(db) {
  const tables = [...Object.entries(OPENCODE_SCHEMA).map(([table, columns]) => [table, columns, true]), ...Object.entries(OPENCODE_OPTIONAL_SCHEMA).map(([table, columns]) => [table, columns, false])];
  for (const [table, columns, required] of tables) {
    const present = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
    if (present.size === 0) {
      if (required) throw new OpencodeUnavailable(`The opencode database has no ${table} table`);
      continue;
    }
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

// opencode records a directory with the separators of the platform that created it.
function directoryForms(directory) {
  const forward = directory.replace(/\\/g, '/');
  return [...new Set([directory, forward, forward.replace(/\//g, '\\')])];
}

// The command a user message invoked through a wrapper envelope: `{ name, args }`, or null.
function parseInvocation(text) {
  const match = text.match(OPENCODE_ENVELOPE);
  return match ? { name: match[1], args: match[2].trim() } : null;
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

// Whether the database has the optional `session_part` table (the guard has checked its columns), asked once per database.
const partTables = new WeakMap();
function hasSessionParts(db) {
  if (!partTables.has(db)) partTables.set(db, db.prepare('PRAGMA table_info(session_part)').all().length > 0);
  return partTables.get(db);
}

// The part rows of a session, as `message_id` to their `data` texts in `ordinal` order: one query for the whole session.
function sessionParts(db, sessionId) {
  const byMessage = new Map();
  if (!hasSessionParts(db)) return byMessage;
  const rows = db.prepare('SELECT p.message_id, p.data FROM session_part p JOIN session_message m ON m.id = p.message_id WHERE m.session_id = ? ORDER BY p.message_id, p.ordinal').all(sessionId);
  for (const row of rows) {
    if (!byMessage.has(row.message_id)) byMessage.set(row.message_id, []);
    byMessage.get(row.message_id).push(row.data);
  }
  return byMessage;
}

const hasUsage = data => [data.tokens?.input, data.tokens?.output, data.tokens?.reasoning, data.tokens?.cache?.read, data.tokens?.cache?.write].some(count => typeof count === 'number' && count > 0);

// The content items of each message of `rows` (`id`, `type`, `data`), aligned with them: `{ items, unparsed, unread }`.
// A non-empty `data.content` is the message's content and its parts are not read (so nothing counts twice); otherwise
// the content is the `data` of its `session_part` rows by `ordinal`. `items` holds the `text`, `tool`, and `reasoning`
// objects only. `unparsed` counts the part rows whose `data` is not valid JSON, which are skipped. `unread` tells an
// assistant message with a token counter above 0 and no item in either layout. A database without `session_part` is
// read as before: there an empty `data.content` is the whole message, so nothing can have moved out of it.
function opencodeContent(db, sessionId, rows) {
  const partLayout = hasSessionParts(db);
  let parts = null;
  return rows.map(row => {
    let data;
    try { data = JSON.parse(row.data); } catch { data = null; }
    if (row.type !== 'assistant' || !data || typeof data !== 'object') return { items: [], unparsed: 0, unread: false };
    let candidates = Array.isArray(data.content) ? data.content : [];
    let unparsed = 0;
    if (candidates.length === 0) {
      parts ??= sessionParts(db, sessionId);
      candidates = [];
      for (const text of parts.get(row.id) ?? []) {
        try { candidates.push(JSON.parse(text)); } catch { unparsed++; }
      }
    }
    const items = candidates.filter(item => CONTENT_TYPES.has(item?.type));
    return { items, unparsed, unread: partLayout && items.length === 0 && hasUsage(data) };
  });
}

// The assistant messages of one session in order (`id`, `type`, `time_created`, `data`, `content`), or null when the
// session is not recorded; `content` is the `opencodeContent` reading of the message. A session that holds no
// assistant message is an empty list: the caller tells the two apart.
function opencodeSessionMessages(db, sessionId) {
  if (!db.prepare('SELECT 1 FROM session_v2 WHERE id = ?').get(sessionId)) return null;
  return withOpencodeContent(db, sessionId, db.prepare("SELECT id, type, time_created, data FROM session_message WHERE session_id = ? AND type = 'assistant' ORDER BY seq").all(sessionId));
}

// The rows with their `content` attached.
function withOpencodeContent(db, sessionId, rows) {
  const contents = opencodeContent(db, sessionId, rows);
  return rows.map((row, index) => ({ ...row, content: contents[index] }));
}

// The wakes of a session: each opens at a `synthetic` message whose
// `metadata.source` is `shell` and whose `<shell ... command="...">` header runs
// `wait.js ... warm`, and lasts to the end of its turn, the next message that
// opens one. A wake lists the ids of the `assistant` messages of that stretch,
// the re-arm and the reply literal included. The shell state (`completed`, `error`)
// is not read: a wait that returned `finished` is a wake too. A reply literal alone
// never makes one.
function opencodeWakes(db, sessionId) {
  const opened = db.prepare("SELECT id, seq, time_created, data FROM session_message WHERE session_id = ? AND type = 'synthetic' AND data LIKE '%wait.js%' ORDER BY seq").all(sessionId);
  const nextOpener = db.prepare(`SELECT seq FROM session_message WHERE session_id = ? AND seq > ? AND type IN (${TURN_OPENERS}) ORDER BY seq LIMIT 1`);
  const requests = db.prepare("SELECT id FROM session_message WHERE session_id = ? AND type = 'assistant' AND seq > ? AND seq < ? ORDER BY seq");
  const wakes = [];
  for (const row of opened) {
    let data;
    try { data = JSON.parse(row.data); } catch { continue; }
    const text = typeof data?.text === 'string' ? data.text : '';
    if (data?.metadata?.source !== 'shell') continue;
    const close = text.indexOf('">\n');
    if (!WAIT_WARM.test(close === -1 ? text.split('\n')[0] : text.slice(0, close))) continue;
    const end = nextOpener.get(sessionId, row.seq)?.seq ?? Number.MAX_SAFE_INTEGER;
    wakes.push({ id: row.id, time: row.time_created, requests: requests.all(sessionId, row.seq, end).map(request => request.id) });
  }
  return wakes;
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
function changeNameOf(command, args, written, pipelineCommands) {
  return (pipelineCommands.has(command) ? changeNameFromArgs(args) : null) ?? (written.size === 1 ? [...written][0] : null);
}

module.exports = {
  OPENCODE_MAX_DEPTH,
  OpencodeUnavailable,
  defaultLoadSqlite,
  openOpencodeDatabase,
  directoryForms,
  parseInvocation,
  opencodeRoot,
  opencodeChildren,
  opencodeContent,
  withOpencodeContent,
  opencodeSessionMessages,
  opencodeWakes,
  changeNameFromArgs,
  writtenChanges,
  changeNameOf,
};

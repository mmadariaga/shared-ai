'use strict';

// Usage of one run, read from the harness data the backend copied out of the container.
// The readers are the shared ones of the SAI tools: `sai/tools/claude-transcripts.js` for Claude
// Code transcripts and `sai/tools/opencode-db.js` for the opencode database. Nothing is
// written, and nothing that identifies the project or a session reaches the result: the
// measurement holds token counts, tool-call counts, and model names only.
//
// A measurement is a list of per-model rows:
//   { model, requests, requestsWithoutUsage, input, output, cacheRead,
//     cacheWrite5m, cacheWrite1h, cacheWrite, recordedCost, toolCalls }
// `output` includes the reasoning tokens opencode counts apart.
// `cacheWrite` holds the cache-write tokens a request did not split by lifetime (every opencode
// request, and a Claude Code request whose usage record carries no split). `recordedCost` is the
// sum of the costs the harness recorded, or null when any request of the model recorded none.

const { openClaudeSource } = require('../sai/tools/claude-transcripts.js');
const { defaultLoadSqlite, openOpencodeDatabase } = require('../sai/tools/opencode-db.js');

const CLAUDE_PROJECT = '/work';
const OPEN_END = Number.MAX_SAFE_INTEGER;
const COUNTED = ['input', 'output', 'cacheRead', 'cacheWrite5m', 'cacheWrite1h', 'cacheWrite'];

const known = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function emptyRow(model) {
  return { model, requests: 0, requestsWithoutUsage: 0, ...Object.fromEntries(COUNTED.map((field) => [field, 0])), recordedCost: 0, toolCalls: 0 };
}

/** Rows are keyed by the model the harness recorded; a request with no recorded model has `model: null`. */
class Rows {
  constructor() {
    this.byModel = new Map();
  }

  add(model, { input, output, reasoning = null, cacheRead, cacheWrite5m = null, cacheWrite1h = null, cacheWrite = null, cost = null, toolCalls = 0 }) {
    const key = model ?? '';
    if (!this.byModel.has(key)) this.byModel.set(key, emptyRow(model));
    const row = this.byModel.get(key);
    row.requests += 1;
    row.toolCalls += toolCalls;
    if (input === null || output === null) {
      row.requestsWithoutUsage += 1;
      return;
    }
    const split = cacheWrite5m !== null && cacheWrite1h !== null;
    const values = { input, output: output + (reasoning ?? 0), cacheRead: cacheRead ?? 0, cacheWrite5m: split ? cacheWrite5m : 0, cacheWrite1h: split ? cacheWrite1h : 0, cacheWrite: split ? 0 : cacheWrite ?? 0 };
    for (const field of COUNTED) row[field] += values[field];
    row.recordedCost = row.recordedCost === null || cost === null ? null : row.recordedCost + cost;
  }

  list() {
    return [...this.byModel.values()].sort((a, b) => String(a.model).localeCompare(String(b.model)));
  }
}

/** Root sessions and every subagent below them: the folder holds this run's sessions only. */
function measureClaude(dataDir, env = {}) {
  const source = openClaudeSource({ cwd: CLAUDE_PROJECT, env: { ...env, CLAUDE_CONFIG_DIR: dataDir } });
  const rows = new Rows();
  const sessions = source.roots().flatMap((root) => [root.id, ...source.children(root.id).map((child) => child.id)]);
  for (const session of sessions) {
    for (const request of source.requests(session, 0, OPEN_END)) {
      rows.add(request.model, {
        input: request.input,
        output: request.output,
        cacheRead: request.cacheRead,
        cacheWrite5m: request.cacheWrite5m,
        cacheWrite1h: request.cacheWrite1h,
        cacheWrite: request.cacheWrite,
        toolCalls: request.items.length,
      });
    }
  }
  return rows.list();
}

function parseData(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Every assistant message of the copied database: the root session and its child sessions. */
function measureOpencode(dataDir, env = {}, loadSqlite = defaultLoadSqlite) {
  const db = openOpencodeDatabase({ ...env, XDG_DATA_HOME: dataDir }, loadSqlite);
  try {
    const rows = new Rows();
    for (const message of db.prepare("SELECT data FROM session_message WHERE type = 'assistant' ORDER BY seq").all()) {
      const data = parseData(message.data);
      const tokens = data.tokens ?? {};
      rows.add(typeof data.model?.id === 'string' && data.model.id !== '' ? data.model.id : null, {
        input: known(tokens.input),
        output: known(tokens.output),
        reasoning: known(tokens.reasoning),
        cacheRead: known(tokens.cache?.read),
        cacheWrite: known(tokens.cache?.write),
        cost: known(data.cost),
        toolCalls: Array.isArray(data.content) ? data.content.filter((item) => item?.type === 'tool').length : 0,
      });
    }
    return rows.list();
  } finally {
    db.close();
  }
}

module.exports = { measureClaude, measureOpencode };

#!/usr/bin/env node

'use strict';

/**
 * change-telemetry — writes the telemetry of one `/sai-plan`, `/sai-build`, or
 * `/sai-explore` in-session route execution into the change's optional `telemetry.md`.
 *
 *   collect --harness <claude|opencode>
 *           --command <sai-plan|sai-build|sai-explore-plan|sai-explore-direct-build>
 *           --change <name> --cwd <project-dir>
 *           --status <completed|failed|stopped|blocked|unanswered> [--run-dir <dir>]
 *   explore-origin --harness <claude|opencode> --session <sessionID>
 *
 * The coordinator runs `collect` at its close, once. Every figure is read after the fact
 * from the harness's own record, through a source with one shape on both harnesses:
 * `opencode.db` on opencode (read-only, through the shared reader in `opencode-db.js`)
 * and the session transcripts on Claude Code (read-only, through the shared reader in
 * `claude-transcripts.js`). It measures the coordinator session and each subagent
 * session of the latest execution of the command on that change in that project
 * directory. A direct command is found by its invocation (the envelope on opencode,
 * the `<command-name>` record on Claude Code); an in-session route is found through
 * its workers, because the explore session carries no route invocation and one
 * explore session can host several routes and Direct Build slices. Claude Code
 * records no cost, reasoning, or variant: its cost is estimated from `model-prices.js`, and reasoning
 * and variant are unavailable, never zero. `--run-dir` is the plan or
 * Direct Build run directory, whose `reviews/{segment}-round-{k}.md` files hold the
 * review findings. The change folder may already be archived when Direct Build
 * collects, so `telemetry.md` is written into that folder. Only `telemetry.md` is
 * written, and only when the collection succeeds. The tool never runs git: the
 * coordinator commits the file.
 *
 * When the change's `.openspec.yaml` lists `explore_origin` sessions, the first
 * collection that writes `telemetry.md` also records the exploration that produced
 * the change: one segment per listed session, made of the windows of its `explore`
 * invocation minus the route windows of that session (and, in the route's own
 * session, only up to the route's first worker). Each listed id is read with the
 * reader of its own harness (`ses_...` is opencode, a UUID is Claude Code), whatever
 * harness runs the collection, and an id whose data is absent on this machine is
 * marked unavailable. `explore-origin` resolves the session the block's `Explore
 * origin` lists: on opencode the explore root session of a subagent session, on
 * Claude Code the given session itself when it holds a `/sai-explore` invocation
 * in the Claude Code transcripts of the working directory.
 *
 * It prints one JSON object and exits 0: `{outcome: "written", path, message}` or
 * `{outcome: "skipped", reason}`; `explore-origin` prints `{outcome: "found", session}`
 * or `{outcome: "skipped", reason}`. A usage error exits 2 with
 * `{error: {code, message}}`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { OpencodeUnavailable, defaultLoadSqlite, openOpencodeDatabase, directoryForms, parseInvocation, opencodeRoot, opencodeChildren, opencodeWakes, changeNameFromArgs, writtenChanges } = require('./opencode-db');
const { ClaudeUnavailable, openClaudeSource } = require('./claude-transcripts');
const { readOpenspecYaml, exploreOriginHarness, OPENCODE_SESSION, CLAUDE_SESSION } = require('./openspec-yaml');
const { PRICES, PER_MILLION, findPrice, priceFromTable } = require('./model-prices');

const OPEN_END = Number.MAX_SAFE_INTEGER;
const UNAVAILABLE = 'unavailable';
const DISPATCH_TOOLS = new Set(['task', 'subagent']);
const STATUSES = ['completed', 'failed', 'stopped', 'blocked', 'unanswered'];
const HARNESSES = ['claude', 'opencode'];
// The segments of each command, in order, and the worker type that starts each one.
// A direct command is discovered through its invocation envelope; an in-session
// route has no such envelope and is discovered through the workers it creates.
const COMMANDS = {
  'sai-plan': { envelope: 'plan', order: ['spec', 'design'], workers: { 'sai-1-spec-proposal-worker': 'spec', 'sai-2-design-worker': 'design' } },
  'sai-build': {
    envelope: 'build',
    order: ['implement', 'review', 'fix-implement'],
    workers: { 'sai-3-red-worker': 'implement', 'sai-3-green-worker': 'implement', 'sai-direct-build-worker': 'implement', 'sai-4-review-worker': 'review' },
  },
  'sai-explore-plan': {
    inSession: true,
    label: 'sai-explore (Plan - Unattended)',
    coordinator: 'sai-explore',
    order: ['spec', 'design'],
    workers: { 'sai-1-spec-proposal-worker': 'spec', 'sai-2-design-worker': 'design' },
  },
  'sai-explore-direct-build': {
    inSession: true,
    label: 'sai-explore (Direct Build - Unattended)',
    coordinator: 'sai-explore',
    order: ['implement', 'backfill', 'archive'],
    workers: { 'sai-direct-build-worker': 'implement', 'sai-backfill-worker': 'backfill', 'sai-archive-worker': 'archive' },
  },
};
const SEGMENT_LABELS = { spec: 'Spec', design: 'Design', implement: 'Implement', backfill: 'Backfill', archive: 'Archive', review: 'Review', 'fix-implement': 'Fix implement', other: 'Other agents' };
const PLAN_COMMANDS = new Set(['sai-plan', 'sai-explore-plan']);
const commandLabel = command => COMMANDS[command].label ?? `/${command}`;
const coordinatorName = command => COMMANDS[command].coordinator ?? command;
const METRICS = [
  ['requests', 'Requests'], ['input', 'Input'], ['output', 'Output'], ['reasoning', 'Reasoning'], ['cacheRead', 'Cache read'], ['cacheWrite', 'Cache write'],
  ['cacheMisses', 'Cache misses'], ['cost', 'Cost'], ['ms', 'Time'], ['toolCalls', 'Tool calls'], ['toolErrors', 'Tool errors'], ['subagents', 'Subagents dispatched'], ['wakes', 'Wakes'],
];
// The figures kept in the `telemetry-totals` comment. `rewritten` (tokens) and `overcost` (money) are stored without a
// column: the `Overcost/miss` and `Cache hit` columns are derived from the stored figures when a table is rendered.
const STORED = [...METRICS, ['rewritten', 'Rewritten tokens'], ['overcost', 'Overcost']];
// The requests of an agent's wake turns, a subset of the figures above (`wakes` counts the turns themselves).
const WAKE_METRICS = [['requests', 'Requests'], ['input', 'Input'], ['output', 'Output'], ['reasoning', 'Reasoning'], ['cacheRead', 'Cache read'], ['cacheWrite', 'Cache write'], ['cost', 'Cost']];
const MARKER = '<!-- change-telemetry -->';
const PLAN_SUMMARY = /^Summary: High=(\d+) Medium=(\d+) Low=(\d+)[ \t]*$/gm;
const REVIEW_SUMMARY = /^Summary: Critical=(\d+) High=(\d+) Medium=(\d+) Low=(\d+) Questions=(\d+)[ \t]*$/m;
const REVIEW_SEVERITY = { C: 'Critical', H: 'High', M: 'Medium', L: 'Low', Q: 'Questions' };

class UsageError extends Error {}

// ---------------------------------------------------------------------------
// Figures: one request per assistant message; a missing datum is never a zero.
// ---------------------------------------------------------------------------

const number = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const label = value => (typeof value === 'string' && value ? value : null);
const exact = value => ({ value, partial: false });
const UNKNOWN = { value: null, partial: true };
const UNKNOWN_FIGURES = Object.fromEntries(STORED.map(([key]) => [key, UNKNOWN]));
const UNKNOWN_WAKE = Object.fromEntries(WAKE_METRICS.map(([key]) => [key, UNKNOWN]));

// The session a dispatch call started or continued.
function dispatchLink(item) {
  const state = item.state ?? {};
  const direct = state.metadata?.sessionId ?? state.input?.sessionID ?? state.input?.task_id;
  if (typeof direct === 'string' && direct) return direct;
  const content = Array.isArray(state.content) ? state.content.map(part => part?.text ?? '').join('\n') : '';
  return content.match(/<(?:subagent sessionID|task id)="([^"]+)"/)?.[1] ?? null;
}

function toRequest(row) {
  let data = {};
  try {
    const parsed = JSON.parse(row.data);
    if (parsed && typeof parsed === 'object') data = parsed;
  } catch { /* an unreadable message leaves every datum of the request unavailable */ }
  const tokens = data.tokens ?? {};
  const created = number(data.time?.created), completed = number(data.time?.completed);
  const items = toolItems(data);
  const dispatches = items.filter(item => DISPATCH_TOOLS.has(item.name));
  return {
    id: row.id,
    time: row.time_created,
    completed,
    wake: false,
    input: number(tokens.input),
    output: number(tokens.output),
    reasoning: number(tokens.reasoning),
    cacheRead: number(tokens.cache?.read),
    cacheWrite: number(tokens.cache?.write),
    // opencode records one cache-write figure with no lifetime split: it is priced as the 5-minute write.
    cacheWrite5m: null,
    cacheWrite1h: null,
    cost: number(data.cost),
    ms: created !== null && completed !== null ? completed - created : null,
    model: label(data.model?.id),
    variant: label(data.model?.variant),
    items,
    calls: items.filter(item => !DISPATCH_TOOLS.has(item.name)),
    dispatches: dispatches.length,
    links: dispatches.map(dispatchLink).filter(Boolean).map(session => ({ session, time: row.time_created })),
  };
}

// The total of one figure over requests; it is partial when some request lacks it.
function sum(values) {
  const known = values.filter(value => value !== null);
  return { value: known.length ? known.reduce((total, value) => total + value, 0) : null, partial: known.length < values.length };
}

// The cost total of requests: a cost a price table supplied rather than the harness recorded marks the total estimated.
function costSum(requests) {
  return { ...sum(requests.map(request => request.cost)), ...(requests.some(request => request.estimated) ? { estimated: true } : {}) };
}

// Claude Code records no cost, so the cost of its request is estimated from the dated price table. A request with
// a token count the transcript lacks, or a model with no price, has no cost.
function estimateCost(request) {
  const { input, output, cacheRead, cacheWrite, cacheWrite5m, cacheWrite1h } = request;
  if ([input, output, cacheRead, cacheWrite].includes(null)) return null;
  const split = cacheWrite5m !== null && cacheWrite1h !== null;
  return priceFromTable({ input, output, cacheRead, cacheWrite5m: split ? cacheWrite5m : 0, cacheWrite1h: split ? cacheWrite1h : 0, cacheWrite: split ? 0 : cacheWrite }, findPrice(PRICES, request.model));
}

// The price per million tokens that the cache write of a request paid, by the lifetime the transcript recorded:
// the 5-minute and the 1-hour writes at their own price, a write without the split at the 5-minute price.
function writePrice(entry, request) {
  const split = request.cacheWrite5m !== null && request.cacheWrite1h !== null;
  const long = split ? request.cacheWrite1h : 0;
  const short = split ? request.cacheWrite5m : request.cacheWrite ?? 0;
  const { cacheWrite5mPerMTok: short5m, cacheWrite1hPerMTok: long1h } = entry;
  if (short + long === 0) return typeof short5m === 'number' ? short5m : null;
  if ((short > 0 && typeof short5m !== 'number') || (long > 0 && typeof long1h !== 'number')) return null;
  return (short * (short5m ?? 0) + long * (long1h ?? 0)) / (short + long);
}

// A cache miss: a request after an agent's first whose cache read is smaller than the previous request's cache read
// plus cache write. The shortfall is the tokens the request had to rewrite; each costs the write price instead of the
// read price. A figure the records or the price table lack is null, never zero.
function missOf(previous, request) {
  if (previous.cacheRead === null || previous.cacheWrite === null || request.cacheRead === null) return { misses: null, rewritten: null, overcost: null };
  const rewritten = Math.max(0, previous.cacheRead + previous.cacheWrite - request.cacheRead);
  if (rewritten === 0) return { misses: 0, rewritten: 0, overcost: 0 };
  const entry = findPrice(PRICES, request.model);
  const write = entry ? writePrice(entry, request) : null;
  const overcost = typeof write === 'number' && typeof entry.cacheReadPerMTok === 'number' ? (rewritten * (write - entry.cacheReadPerMTok)) / PER_MILLION : null;
  return { misses: 1, rewritten, overcost };
}

// `wakes` is the number of wakes of the agent in the same window as `requests`.
function figuresOf(requests, wakes) {
  if (requests.length === 0) return { ...UNKNOWN_FIGURES, requests: exact(0), wakes: exact(wakes) };
  const calls = requests.flatMap(request => request.calls);
  // An agent's first request always writes the cache, so only later requests can miss.
  const misses = requests.slice(1).map((request, index) => missOf(requests[index], request));
  const missFigure = key => (requests.length === 1 ? exact(0) : sum(misses.map(miss => miss[key])));
  return {
    wakes: exact(wakes),
    requests: exact(requests.length),
    input: sum(requests.map(request => request.input)),
    output: sum(requests.map(request => request.output)),
    reasoning: sum(requests.map(request => request.reasoning)),
    cacheRead: sum(requests.map(request => request.cacheRead)),
    cacheWrite: sum(requests.map(request => request.cacheWrite)),
    cacheMisses: missFigure('misses'),
    rewritten: missFigure('rewritten'),
    overcost: missFigure('overcost'),
    cost: costSum(requests),
    ms: sum(requests.map(request => request.ms)),
    toolCalls: exact(calls.length),
    toolErrors: exact(calls.filter(item => item.state?.status === 'error').length),
    subagents: exact(requests.reduce((total, request) => total + request.dispatches, 0)),
  };
}

// The requests of the wake turns of one agent. An agent with no wake request has zero of each figure its
// requests record, and no figure for one they never record (Claude Code records no cost or reasoning).
function wakeFiguresOf(requests) {
  const own = requests.filter(request => request.wake);
  const field = key => (own.length ? (key === 'cost' ? costSum(own) : sum(own.map(request => request[key]))) : requests.length === 0 || requests.some(request => request[key] !== null) ? exact(0) : UNKNOWN);
  return { requests: exact(own.length), input: field('input'), output: field('output'), reasoning: field('reasoning'), cacheRead: field('cacheRead'), cacheWrite: field('cacheWrite'), cost: field('cost') };
}

// The figures of several agents added up; a total is partial when any part is. A part a figure set
// lacks (a section written before the figure existed) is unknown.
function combine(list, metrics = STORED) {
  return Object.fromEntries(metrics.map(([key]) => {
    const parts = list.map(figures => figures[key] ?? UNKNOWN);
    const known = parts.filter(metric => metric.value !== null);
    return [key, { value: known.length ? known.reduce((total, metric) => total + metric.value, 0) : null, partial: parts.some(metric => metric.partial || metric.value === null), ...(parts.some(metric => metric.estimated) ? { estimated: true } : {}) }];
  }));
}

const distinct = (requests, field) => (requests.length ? [...new Set(requests.map(request => request[field] ?? UNAVAILABLE))].join(', ') : UNAVAILABLE);

function toolBreakdown(requests) {
  const counts = new Map();
  for (const item of requests.flatMap(request => request.calls)) counts.set(item.name ?? UNAVAILABLE, (counts.get(item.name ?? UNAVAILABLE) ?? 0) + 1);
  const entries = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return entries.length ? entries.map(([name, count]) => `${name}×${count}`).join(', ') : '-';
}

function agentRow(name, depth, requests, wakes) {
  return { name, depth, figures: figuresOf(requests, wakes), wake: wakeFiguresOf(requests), model: distinct(requests, 'model'), variant: distinct(requests, 'variant'), tools: toolBreakdown(requests) };
}

const missingRow = (session, depth, store) => ({ name: `${UNAVAILABLE} (session ${session} is not in ${store})`, depth, figures: UNKNOWN_FIGURES, wake: UNKNOWN_WAKE, model: UNAVAILABLE, variant: UNAVAILABLE, tools: UNAVAILABLE });

// ---------------------------------------------------------------------------
// Sources: finding the execution and reading its sessions
// ---------------------------------------------------------------------------
//
// A source answers the same questions on both harnesses, so the measurement below
// never reads a harness format:
//   name, store            the harness name and where its record lives
//   roots(cwd)             the root sessions of the project: [{ id }]
//   invocations(session)   the SAI command invocations of a root: [{ id, time, name, args }]
//   requests(session, from, to)  the requests created in [from, to), each shaped by `toRequest`; a request of a wake turn is flagged `wake`
//   wakes(session, from, to)     the wakes opened in [from, to): the turns that the completion of the agent's own `wait.js ... warm` wait opens
//   children(root)         every subagent session below a root, parents first
//   hasSession(id), isRoot(id), userTexts(session), routeId(root, anchor), close()

// The tool items of one opencode message's parsed `data`.
function toolItems(data) {
  return Array.isArray(data?.content) ? data.content.filter(item => item?.type === 'tool') : [];
}

function userText(data) {
  try { const text = JSON.parse(data)?.text; return typeof text === 'string' ? text : ''; } catch { return ''; }
}

function opencodeSource(db) {
  const wakeCache = new Map();
  const wakesOf = sessionId => {
    if (!wakeCache.has(sessionId)) wakeCache.set(sessionId, opencodeWakes(db, sessionId));
    return wakeCache.get(sessionId);
  };
  return {
    name: 'opencode',
    store: 'opencode.db',
    close: () => db.close(),
    roots(cwd) {
      const forms = directoryForms(cwd);
      return db.prepare(`SELECT id, directory FROM session_v2 WHERE parent_id IS NULL AND directory IN (${forms.map(() => '?').join(',')})`).all(...forms);
    },
    isRoot: id => Boolean(db.prepare('SELECT id FROM session_v2 WHERE id = ? AND parent_id IS NULL').get(id)),
    hasSession: id => Boolean(db.prepare('SELECT 1 FROM session_v2 WHERE id = ?').get(id)),
    invocations: sessionId => db.prepare("SELECT id, time_created, data FROM session_message WHERE session_id = ? AND type = 'user' AND data LIKE '%InvocationEnvelope:%' ORDER BY seq").all(sessionId)
      .flatMap(row => { const parsed = parseInvocation(userText(row.data)); return parsed ? [{ id: row.id, time: row.time_created, ...parsed }] : []; }),
    routeId: (rootId, anchorId) => anchorId,
    requests(sessionId, from, to) {
      const wakeIds = new Set(wakesOf(sessionId).flatMap(wake => wake.requests));
      return db
        .prepare("SELECT id, time_created, data FROM session_message WHERE session_id = ? AND type = 'assistant' AND time_created >= ? AND time_created < ? ORDER BY seq")
        .all(sessionId, from, to).map(row => ({ ...toRequest(row), wake: wakeIds.has(row.id) }));
    },
    wakes: (sessionId, from, to) => wakesOf(sessionId).filter(wake => wake.time >= from && wake.time < to),
    userTexts: sessionId => db.prepare("SELECT data FROM session_message WHERE session_id = ? AND type = 'user'").all(sessionId).map(row => userText(row.data)),
    children: rootId => opencodeChildren(db, rootId),
  };
}

// The Claude Code source with the cost of each request estimated from the price table (the transcripts record none).
function estimatingSource(source) {
  return {
    ...source,
    requests: (sessionId, from, to) => source.requests(sessionId, from, to).map(request => {
      const cost = estimateCost(request);
      return { ...request, cost, estimated: cost !== null };
    }),
  };
}

function openSource(harness, { cwd, env, loadSqlite }) {
  return harness === 'claude' ? estimatingSource(openClaudeSource({ cwd, env })) : opencodeSource(openOpencodeDatabase(env, loadSqlite));
}

const isSourceUnavailable = error => error instanceof OpencodeUnavailable || error instanceof ClaudeUnavailable;

const isExploreSession = (source, sessionId) => source.invocations(sessionId).some(inv => inv.name === 'explore');

const childrenIn = (source, execution) => source.children(execution.root.id).filter(child => child.time_created >= execution.inv.time && child.time_created < execution.end);

// The change an execution worked on: its invocation names it, otherwise the one change its sessions wrote to.
function changeOf(source, execution) {
  const named = changeNameFromArgs(execution.inv.args);
  if (named) return named;
  const written = new Set();
  const requests = [
    ...source.requests(execution.root.id, execution.inv.time, execution.end),
    ...childrenIn(source, execution).flatMap(child => source.requests(child.id, 0, OPEN_END)),
  ];
  for (const request of requests) for (const item of request.items) writtenChanges(item.name, item.state?.input, written);
  return written.size === 1 ? [...written][0] : null;
}

// A worker session wrote under `openspec/changes/<change>/` through a write tool.
function wroteChange(source, sessionId, change) {
  for (const request of source.requests(sessionId, 0, OPEN_END)) {
    for (const item of request.items) {
      const written = new Set();
      writtenChanges(item.name, item.state?.input, written);
      if (written.has(change)) return true;
    }
  }
  return false;
}

// Direct Build workers write the change through `transfer.js materialize` and git
// in shell calls, not through a write tool, so any tool input naming the change
// path counts as a touch.
function touchesChange(source, sessionId, change) {
  const target = new RegExp(`openspec/changes/(?:archive/\\d{4}-\\d{2}-\\d{2}-)?${change.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  for (const request of source.requests(sessionId, 0, OPEN_END)) {
    for (const item of request.items) {
      const input = item.state?.input;
      if (!input || typeof input !== 'object') continue;
      const text = Object.values(input).filter(value => typeof value === 'string').join('\n').replace(/\\/g, '/');
      if (target.test(text)) return true;
    }
  }
  return false;
}

// The changes a worker's tool inputs name. A Direct Build worker writes the change
// through transfer files and git, so its paths, not a write tool, identify it.
function touchedChanges(source, sessionId) {
  const names = new Set();
  for (const request of source.requests(sessionId, 0, OPEN_END)) {
    for (const item of request.items) {
      const input = item.state?.input;
      if (!input || typeof input !== 'object') continue;
      const text = Object.values(input).filter(value => typeof value === 'string').join('\n').replace(/\\/g, '/');
      for (const match of text.matchAll(/openspec\/changes\/(?:archive\/\d{4}-\d{2}-\d{2}-)?([a-z0-9][a-z0-9-]*)(?=[/\s"'`]|$)/g)) {
        if (match[1] !== 'archive') names.add(match[1]);
      }
    }
  }
  return names;
}

// A POC implementer runs `--direct-build --no-specs` in the same explore session
// before crystallization; it is not a worker of any final slice.
function isPocWorker(source, sessionId) {
  return source.userTexts(sessionId).some(text => text.includes('--no-specs'));
}

// The route's workers in creation order. Direct Build hosts several slices in one
// explore session, so a slice starts after the last worker that touched a different
// change. A replaced worker of the current slice touched this change and stays in.
function routeWorkers(source, rootId, command) {
  return source.children(rootId)
    .filter(child => COMMANDS[command].workers[child.agent])
    .filter(child => !(command === 'sai-explore-direct-build' && child.agent === 'sai-direct-build-worker' && isPocWorker(source, child.id)))
    .sort((a, b) => a.time_created - b.time_created || (a.id < b.id ? -1 : 1));
}

const CHANGE_OWNERS = new Set(['sai-backfill-worker', 'sai-archive-worker']);

function directBuildSlice(source, workers, change) {
  let start = 0;
  for (let index = 0; index < workers.length; index++) {
    // An implementer reads other changes routinely and never owns one, so only a
    // backfill or archive worker can end the previous slice.
    if (!CHANGE_OWNERS.has(workers[index].agent)) continue;
    const changes = touchedChanges(source, workers[index].id);
    if (changes.size && !changes.has(change)) start = index + 1;
  }
  return workers.slice(start);
}

// An in-session route has no invocation of its own: it is the explore
// session whose route worker wrote the change. The window starts at the creation
// of the route's first worker and ends when the coordinator asks for this
// collection. Plan keeps its first writing worker; Direct Build starts at the
// current slice's first worker, because its first writer is the backfill worker.
function routeAnchor(source, rootId, command, change, until = OPEN_END) {
  const workers = routeWorkers(source, rootId, command).filter(child => child.time_created <= until);
  const directBuild = command === 'sai-explore-direct-build';
  const slice = directBuild ? directBuildSlice(source, workers, change) : workers;
  const writer = child => (directBuild ? touchesChange(source, child.id, change) : wroteChange(source, child.id, change));
  if (!slice.some(writer)) return null;
  return directBuild ? slice[0] : slice.find(writer);
}

function findRouteExecution(source, { command, change, cwd }) {
  const candidates = [];
  for (const root of source.roots(cwd)) {
    if (!isExploreSession(source, root.id)) continue;
    const anchor = routeAnchor(source, root.id, command, change);
    if (anchor) candidates.push({ root, anchor });
  }
  const latest = candidates
    .sort((a, b) => b.anchor.time_created - a.anchor.time_created || (a.root.id < b.root.id ? -1 : 1))[0];
  if (!latest) return null;
  return { root: latest.root, inv: { id: source.routeId(latest.root.id, latest.anchor.id), time: latest.anchor.time_created, args: '' }, end: Date.now() };
}

// The latest execution of the command, on the change, in the project directory.
function findExecution(source, options) {
  const { command, change, cwd } = options;
  if (COMMANDS[command].inSession) return findRouteExecution(source, options);
  const candidates = source.roots(cwd).flatMap(root => {
    const all = source.invocations(root.id);
    return all.map((inv, index) => ({ root, inv, end: all[index + 1]?.time ?? OPEN_END })).filter(candidate => candidate.inv.name === COMMANDS[command].envelope);
  }).sort((a, b) => b.inv.time - a.inv.time);
  return candidates.find(candidate => changeOf(source, candidate) === change) ?? null;
}

// Where each segment starts: the creation time of its first worker, in creation order.
// In `/sai-build`, an implementation worker created after the review worker belongs to the fix segment.
function segmentMarks(command, children) {
  const marks = [];
  let reviewed = false;
  for (const child of children.filter(candidate => COMMANDS[command].workers[candidate.agent]).sort((a, b) => a.time_created - b.time_created)) {
    let segment = COMMANDS[command].workers[child.agent];
    if (segment === 'review') reviewed = true;
    else if (command === 'sai-build' && reviewed) segment = 'fix-implement';
    if (marks.at(-1)?.segment !== segment) marks.push({ segment, time: child.time_created });
  }
  return marks;
}

const segmentAt = (marks, time) => marks.findLast(mark => mark.time <= time)?.segment ?? marks[0]?.segment ?? 'other';

// ---------------------------------------------------------------------------
// Review findings
// ---------------------------------------------------------------------------

function roundSummary(file, pick) {
  try {
    const matches = [...fs.readFileSync(file, 'utf8').matchAll(PLAN_SUMMARY)];
    const match = matches[pick === 'first' ? 0 : matches.length - 1];
    return match ? { High: Number(match[1]), Medium: Number(match[2]), Low: Number(match[3]) } : null;
  } catch { return null; }
}

// `/sai-plan`: found counts from the first round of a segment, pending counts from its last round.
function planFindings(runDir, segment) {
  const directory = runDir && path.join(runDir, 'reviews');
  let rounds = [];
  try { rounds = fs.readdirSync(directory).map(name => name.match(new RegExp(`^${segment}-round-(\\d+)\\.md$`))).filter(Boolean).sort((a, b) => a[1] - b[1]); } catch { /* no round files: unavailable */ }
  if (rounds.length === 0) return { found: null, pending: null };
  return { found: roundSummary(path.join(directory, rounds[0][0]), 'first'), pending: roundSummary(path.join(directory, rounds.at(-1)[0]), 'last') };
}

function reviewTally(text) {
  const match = text.match(REVIEW_SUMMARY);
  return match ? { Critical: Number(match[1]), High: Number(match[2]), Medium: Number(match[3]), Low: Number(match[4]), Questions: Number(match[5]) } : null;
}

// `/sai-build`: found counts from the review worker's first write of review.md.
function firstReviewTally(source, reviewer, change) {
  const target = `openspec/changes/${change}/review.md`;
  for (const request of source.requests(reviewer, 0, OPEN_END)) {
    for (const item of request.items) {
      const strings = Object.values(item.state?.input ?? {}).filter(value => typeof value === 'string');
      if (!strings.some(value => value.replace(/\\/g, '/').endsWith(target)) || !/^(write|edit|multiedit|patch|apply_patch)$/i.test(item.name ?? '')) continue;
      return reviewTally(strings.join('\n'));
    }
  }
  return null;
}

// `/sai-build`: pending counts from review.md on disk, every finding that carries no fixed mark.
function pendingReviewTally(directory) {
  let text;
  try { text = fs.readFileSync(path.join(directory.absolute, 'review.md'), 'utf8'); } catch { return null; }
  if (!reviewTally(text)) return null;
  const pending = { Critical: 0, High: 0, Medium: 0, Low: 0, Questions: 0 };
  for (const heading of text.matchAll(/^#### ([CHMLQ])\d+\b(.*)$/gm)) if (!/ \(FIXED\)\s*$/.test(heading[2])) pending[REVIEW_SEVERITY[heading[1]]]++;
  return pending;
}

function findingsOf(source, { command, segment, runDir, reviewers, change, directory }) {
  if (PLAN_COMMANDS.has(command)) return planFindings(runDir, segment);
  // Direct Build's functional fix loop writes the same round files as a plan segment.
  if (command === 'sai-explore-direct-build') {
    return segment === 'implement'
      ? planFindings(runDir, segment)
      : { unavailable: 'this segment records no review-finding tally' };
  }
  if (segment === 'review') {
    // Without review.md on disk at close, neither count is trusted.
    const pending = pendingReviewTally(directory);
    return { found: pending && reviewers[0] ? firstReviewTally(source, reviewers[0], change) : null, pending };
  }
  if (COMMANDS[command].inSession) return { unavailable: 'the route records no review-finding tally' };
  return { unavailable: 'the step reviews carry no Summary line' };
}

// ---------------------------------------------------------------------------
// Measuring one execution
// ---------------------------------------------------------------------------

// The rows of the subagents below a session, grouped by segment, and one row for each
// dispatch whose session is not recorded. A child belongs to its parent's segment, and a
// first-level child to the segment `segmentFor` gives its creation time.
function subagentRows(source, root, requests, children, segmentFor) {
  const segmentOfSession = new Map([[root.id, null]]);
  const requestsOf = new Map([[root.id, requests]]);
  const rows = new Map(Object.keys(SEGMENT_LABELS).map(key => [key, []]));
  const depthOf = new Map([[root.id, 0]]);
  for (const child of children) {
    const segment = segmentOfSession.get(child.parent_id) ?? segmentFor(child.time_created);
    segmentOfSession.set(child.id, segment);
    depthOf.set(child.id, child.depth);
    requestsOf.set(child.id, source.requests(child.id, 0, OPEN_END));
    rows.get(segment).push(agentRow(`${child.depth > 1 ? '↳ ' : ''}${child.agent ?? UNAVAILABLE}`, child.depth, requestsOf.get(child.id), source.wakes(child.id, 0, OPEN_END).length));
  }
  // A dispatch whose child session is not recorded is an unavailable subagent.
  const missing = new Set();
  for (const [session, list] of requestsOf) {
    for (const link of list.flatMap(request => request.links)) {
      if (missing.has(link.session) || source.hasSession(link.session)) continue;
      missing.add(link.session);
      rows.get(segmentOfSession.get(session) ?? segmentFor(link.time)).push(missingRow(link.session, depthOf.get(session) + 1, source.store));
    }
  }
  return { rows, requestsOf };
}

function measure(source, options, execution) {
  const { command } = options;
  const { root, inv, end } = execution;
  // The coordinator's own closing turn is still running when it asks for this collection: it is left out.
  const requests = source.requests(root.id, inv.time, end);
  if (requests.length && requests.at(-1).completed === null) requests.pop();
  const children = childrenIn(source, execution);
  const marks = segmentMarks(command, children);
  const { rows, requestsOf } = subagentRows(source, root, requests, children, time => segmentAt(marks, time));
  const coordinator = agentRow(coordinatorName(command), 0, requests, source.wakes(root.id, inv.time, end).length);
  const reviewers = children.filter(child => child.agent === 'sai-4-review-worker').map(child => child.id);
  const segments = [...COMMANDS[command].order, 'other']
    .filter(key => key !== 'other' || rows.get('other').length)
    .map(key => ({ key, ran: marks.some(mark => mark.segment === key), rows: rows.get(key), findings: findingsOf(source, { ...options, segment: key, reviewers }) }));
  const all = [coordinator, ...segments.flatMap(segment => segment.rows)];
  const completed = [...requestsOf.values()].flat().map(request => request.completed).filter(value => value !== null);
  return { start: inv.time, wallMs: completed.length ? Math.max(...completed) - inv.time : null, coordinator, segments, totals: combine(all.map(row => row.figures)), wakeTotals: combine(all.map(row => row.wake), WAKE_METRICS) };
}

// ---------------------------------------------------------------------------
// Exploration: the origin sessions that produced the change
// ---------------------------------------------------------------------------

const IN_SESSION_COMMANDS = Object.keys(COMMANDS).filter(command => COMMANDS[command].inSession);

// The `explore` invocations of a session, each lasting until the session's next invocation.
function exploreWindows(source, sessionId) {
  const all = source.invocations(sessionId);
  return all.flatMap((inv, index) => (inv.name === 'explore' ? [[inv.time, all[index + 1]?.time ?? OPEN_END]] : []));
}

// The route windows of an explore session: from a slice's first route worker to the
// shell call that ran its collector, found in the session's own tool calls.
function routeWindows(source, sessionId) {
  const windows = [];
  for (const request of source.requests(sessionId, 0, OPEN_END)) {
    for (const item of request.items) {
      const text = Object.values(item.state?.input ?? {}).filter(value => typeof value === 'string').join('\n');
      if (!/change-telemetry\.js["']?\s+collect\b/.test(text)) continue;
      const command = text.match(/--command\s+(\S+)/)?.[1];
      const change = text.match(/--change\s+(\S+)/)?.[1];
      if (!IN_SESSION_COMMANDS.includes(command) || !change) continue;
      const anchor = routeAnchor(source, sessionId, command, change, request.time);
      // The message that ran the collector is the route's closing turn, so the window covers it.
      if (anchor) windows.push({ change, from: anchor.time_created, to: Math.max(request.completed ?? 0, request.time) + 1 });
    }
  }
  return windows;
}

// The parts of `windows` outside every cut.
const subtract = (windows, cuts) => cuts.reduce((rest, { from, to }) => rest.flatMap(([a, b]) => [[a, Math.min(b, from)], [Math.max(a, to), b]].filter(([x, y]) => x < y)), windows);

// One origin session: its coordinator and the subagents created inside its exploration windows.
function measureOrigin(source, sessionId, execution, change) {
  if (!source.isRoot(sessionId)) return { id: sessionId, unavailable: `session ${sessionId} is not in ${source.store}` };
  const root = { id: sessionId };
  const explored = exploreWindows(source, sessionId);
  if (!explored.length) return { id: sessionId, unavailable: `session ${sessionId} holds no /sai-explore invocation` };
  // In the route's own session the exploration ends where the route starts.
  const capped = explored.map(([a, b]) => [a, execution.root.id === sessionId ? Math.min(b, execution.inv.time) : b]).filter(([a, b]) => a < b);
  const routes = routeWindows(source, sessionId).filter(route => capped.some(([a, b]) => route.from >= a && route.from < b));
  const windows = subtract(capped, routes);
  const within = time => windows.some(([a, b]) => time >= a && time < b);
  const requests = windows.flatMap(([a, b]) => source.requests(sessionId, a, b));
  if (requests.length && requests.at(-1).completed === null) requests.pop();
  const included = new Set([sessionId]);
  const children = source.children(sessionId).filter(child => {
    const keep = child.parent_id === sessionId ? within(child.time_created) : included.has(child.parent_id);
    if (keep) included.add(child.id);
    return keep;
  });
  const { rows } = subagentRows(source, root, requests, children, () => 'other');
  const coordinator = agentRow('sai-explore', 0, requests, windows.reduce((total, [a, b]) => total + source.wakes(sessionId, a, b).length, 0));
  const siblings = [...new Set(routes.map(route => route.change))].filter(name => name !== change);
  return { id: sessionId, start: windows[0]?.[0] ?? null, siblings, coordinator, rows: rows.get('other'), totals: combine([coordinator, ...rows.get('other')].map(row => row.figures)), wakeTotals: combine([coordinator, ...rows.get('other')].map(row => row.wake), WAKE_METRICS) };
}

// One origin session, read with the reader of its own harness. The reader of another
// harness than the collection's is opened on first use; data absent on this machine
// (or an id of no known harness) is an unavailable origin, never an error.
const STORE_OF = { opencode: 'opencode.db', claude: 'the Claude Code transcripts' };

function measureOriginOf(sources, sessionId, execution, change, { cwd, env, loadSqlite }) {
  const harness = exploreOriginHarness(sessionId);
  if (!harness) return { id: sessionId, unavailable: `session ${sessionId} is not an opencode or Claude Code session ID` };
  if (!sources.has(harness)) {
    try { sources.set(harness, openSource(harness, { cwd, env, loadSqlite })); } catch (error) {
      if (!isSourceUnavailable(error)) throw error;
      sources.set(harness, null);
    }
  }
  const source = sources.get(harness);
  if (!source) return { id: sessionId, unavailable: `session ${sessionId} is not in ${STORE_OF[harness]}` };
  return measureOrigin(source, sessionId, execution, change);
}

// ---------------------------------------------------------------------------
// telemetry.md
// ---------------------------------------------------------------------------

const cell = text => String(text).replace(/\|/g, '\\|');

function duration(ms) {
  const seconds = Math.round(ms / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return `${hours ? `${hours}h ` : ''}${hours || minutes ? `${minutes}m ` : ''}${seconds % 60}s`;
}

const FORMATS = { cost: value => `$${value.toFixed(4)}`, ms: duration };

// `≥` marks a partial figure and `~` a cost estimated from the price table.
function show(metric, key) {
  if (metric.value === null) return UNAVAILABLE;
  return `${metric.partial ? '≥' : ''}${metric.estimated ? '~' : ''}${FORMATS[key] ? FORMATS[key](metric.value) : metric.value.toLocaleString('en-US')}`;
}

// Cache hit % = cache read ÷ (cache read + cache write + input), from the summed tokens. A figure set written before
// the miss figures existed has no `rewritten`: its hit % is unavailable, and a total that adds it up is partial.
function cacheHit(figures) {
  const parts = ['cacheRead', 'cacheWrite', 'input', 'rewritten'].map(key => figures[key] ?? UNKNOWN);
  if (parts.some(metric => metric.value === null)) return UNAVAILABLE;
  const denominator = parts[0].value + parts[1].value + parts[2].value;
  if (denominator === 0) return UNAVAILABLE;
  return `${parts.some(metric => metric.partial) ? '≥' : ''}${((100 * parts[0].value) / denominator).toFixed(1)}%`;
}

// Overcost per miss = total overcost ÷ total misses, from the summed figures. No misses is `n/a`, which is not `unavailable`.
function overcostPerMiss(figures) {
  const misses = figures.cacheMisses ?? UNKNOWN, overcost = figures.overcost ?? UNKNOWN;
  // A figure set written before the miss figures existed has no `rewritten`: its misses follow the earlier rule.
  if ((figures.rewritten ?? UNKNOWN).value === null) return UNAVAILABLE;
  if (misses.value === 0 && !misses.partial) return 'n/a';
  // A partial overcost of zero comes from agents with no miss, while the misses the price table could not price add nothing known.
  if (misses.value === null || misses.value === 0 || overcost.value === null || (overcost.partial && overcost.value === 0)) return UNAVAILABLE;
  return show({ value: overcost.value / misses.value, partial: misses.partial || overcost.partial }, 'cost');
}

// The metric columns in order; the two derived columns follow the figure they derive from.
const DERIVED_COLUMNS = { cacheWrite: ['Cache hit', cacheHit], cacheMisses: ['Overcost/miss', overcostPerMiss] };
const COLUMNS = METRICS.flatMap(([key, name]) => [[name, figures => show(figures[key], key)], ...(DERIVED_COLUMNS[key] ? [DERIVED_COLUMNS[key]] : [])]);
const metricCells = figures => COLUMNS.map(([, cellOf]) => cellOf(figures));
const TABLE_HEAD = ['Agent', 'Model', 'Variant', ...COLUMNS.map(([name]) => name), 'Tools'];
const tableLines = rows => [
  `| ${TABLE_HEAD.join(' | ')} |`,
  `|${TABLE_HEAD.map(() => '---').join('|')}|`,
  ...rows.map(row => `| ${[row.name, row.model, row.variant, ...metricCells(row.figures), row.tools].map(cell).join(' | ')} |`),
];

// The wake-cost table: for each agent, its wakes and the requests of its wake turns, then the total of the table.
const WAKE_HEAD = ['Agent', 'Wakes', ...WAKE_METRICS.map(([, name]) => name)];
const wakeCells = wake => WAKE_METRICS.map(([key]) => show(wake[key], key));
const wakeTableLines = (rows, totals, totalName) => [
  `| ${WAKE_HEAD.join(' | ')} |`,
  `|${WAKE_HEAD.map(() => '---').join('|')}|`,
  ...rows.map(row => `| ${[row.name, show(row.figures.wakes, 'wakes'), ...wakeCells(row.wake)].map(cell).join(' | ')} |`),
  `| ${[totalName, show(totals.wakes, 'wakes'), ...wakeCells(totals.wakeTotals)].map(cell).join(' | ')} |`,
];

const counts = tally => Object.entries(tally).map(([name, count]) => `${name}=${count}`).join(' ');

function findingsLine(findings) {
  if (findings.unavailable) return `Findings: ${UNAVAILABLE} (${findings.unavailable}).`;
  return `Findings found: ${findings.found ? counts(findings.found) : UNAVAILABLE} · pending: ${findings.pending ? counts(findings.pending) : UNAVAILABLE}`;
}

// What each harness's record cannot supply, stated in every section written from it.
const UNRECORDED = {
  claude: `- Note: Claude Code transcripts record no cost, so each cost is estimated (~) from the price table dated ${PRICES.date} (\`sai/tools/model-prices.js\`), and a model with no entry there has an ${UNAVAILABLE} cost. They record no reasoning or variant either, so those figures are ${UNAVAILABLE}.`,
};

function sectionText(number, options, execution, measured, source) {
  const out = [
    `## Execution ${number} — ${commandLabel(options.command)} — ${options.status}`,
    '',
    `<!-- telemetry-execution ${execution.inv.id} -->`,
    `<!-- telemetry-totals ${JSON.stringify(measured.totals)} -->`,
    `- Started: ${new Date(measured.start).toISOString()} · Session: ${execution.root.id} · Harness: ${source.name}`,
    `- Wall time: ${measured.wallMs === null ? UNAVAILABLE : duration(measured.wallMs)}`,
    '- Note: the coordinator row leaves out its own closing turn, the model request that was still running when this section was written.',
    `- Note: a wake is the turn of an agent that the completion of its own \`wait.js … warm\` background wait opens (cache warming), the main session included. Its requests stay inside the tables above; the wake-cost table at the end is their subset. ${UNAVAILABLE} in Wakes means the agent's session was not recorded.`,
    `- Note: ≥ marks a partial total (a request lacks the datum); ${UNAVAILABLE} means no request supplied it. A subagent's own subagents are indented with ↳; dispatch calls count as subagents dispatched and stay out of tool calls.`,
    ...(UNRECORDED[options.harness] ? [UNRECORDED[options.harness]] : []),
    `- Note: a cache miss is a request after an agent's first whose cache read is smaller than the previous request's cache read plus cache write (a context compaction counts). Its rewritten tokens are that shortfall, and Overcost/miss is the rewritten tokens × (cache write price − cache read price), from the price table dated ${PRICES.date}, divided by the misses (\`n/a\` means no miss). Cache hit is cache read ÷ (cache read + cache write + input).`,
    '',
    '### Coordinator',
    '',
    ...tableLines([measured.coordinator]),
  ];
  for (const segment of measured.segments) {
    out.push('', `### ${SEGMENT_LABELS[segment.key]}`, '');
    if (!segment.ran && !segment.rows.length) { out.push('Not run.'); continue; }
    out.push(findingsLine(segment.findings), '', ...(segment.rows.length ? tableLines(segment.rows) : ['No subagents.']));
  }
  out.push('', '### Cache-warming wakes', '', ...wakeTableLines([measured.coordinator, ...measured.segments.flatMap(segment => segment.rows)], { wakes: measured.totals.wakes, wakeTotals: measured.wakeTotals }, 'Run total'));
  return `${out.join('\n')}\n`;
}

// The exploration block of telemetry.md: one subsection per origin session.
function explorationText(origins) {
  const out = [
    '## Exploration',
    '',
    '<!-- telemetry-exploration -->',
    `- Note: written once, by the first execution that wrote this file. Each subsection is the exploration of one origin session. An exploration shared by several changes is counted in each of their telemetry.md files, so adding those files up counts it more than once. A figure shown as ${UNAVAILABLE} could not be read; ≥ marks a partial total.`,
  ];
  for (const origin of origins) {
    out.push('', `### Origin session ${origin.id}`, '');
    if (origin.unavailable) { out.push(`Exploration: ${UNAVAILABLE} (${origin.unavailable}).`); continue; }
    out.push(
      `<!-- telemetry-totals ${JSON.stringify(origin.totals)} -->`,
      `- Started: ${origin.start === null ? UNAVAILABLE : new Date(origin.start).toISOString()} · Session: ${origin.id}`,
      origin.siblings.length
        ? `- Shared: yes, with ${origin.siblings.join(', ')}, which had a route window in this exploration. Other slices without a route window may exist.`
        : '- Shared: no other change had a route window in this exploration. Other slices without a route window may exist.',
      '- Note: the figures cover the coordinator and the subagents of the exploration, and leave out every route window of the session.',
      '',
      '#### Coordinator',
      '',
      ...tableLines([origin.coordinator]),
      '',
      '#### Other agents',
      '',
      ...(origin.rows.length ? tableLines(origin.rows) : ['No subagents.']),
      '',
      '#### Cache-warming wakes',
      '',
      ...wakeTableLines([origin.coordinator, ...origin.rows], { wakes: origin.totals.wakes, wakeTotals: origin.wakeTotals }, 'Exploration total'),
    );
  }
  return `${out.join('\n')}\n\n`;
}

const metricsList = totals => `| ${COLUMNS.map(([name]) => name).join(' | ')} |\n|${COLUMNS.map(() => '---').join('|')}|\n| ${metricCells(totals).join(' | ')} |`;

// The command label of an execution heading (`## Execution N — <label> — <status>`), without the slash of a direct command.
const commandOf = section => section.match(/^## Execution \d+ — (.+) — \S+$/m)?.[1].replace(/^\//, '') ?? UNAVAILABLE;

// One row per command label: the executions of the command in this change, added up, and the exploration as its own row.
function commandRows(sections, exploration) {
  const groups = new Map();
  for (const section of sections) groups.set(commandOf(section), [...(groups.get(commandOf(section)) ?? []), totalsOf(section)]);
  const rows = [...groups].map(([name, list]) => ({ name, count: list.length, totals: combine(list) }));
  const origins = exploration ? exploration.split(/(?=^### Origin session )/m).slice(1) : [];
  if (origins.length) rows.push({ name: 'sai-explore (exploration)', count: origins.length, totals: combine(origins.map(totalsOf)) });
  return rows;
}

function byCommandText(sections, exploration) {
  const head = ['Command', 'Executions', ...COLUMNS.map(([name]) => name)];
  return [
    '## By command',
    '',
    'Each row adds up every execution of one command in this change; the exploration is its own row (its count is the origin sessions) and stays out of the change total.',
    '',
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...commandRows(sections, exploration).map(row => `| ${[row.name, row.count, ...metricCells(row.totals)].map(cell).join(' | ')} |`),
    '',
    '',
  ].join('\n');
}

function headerText(change, count, totals, sections, exploration) {
  return [
    `# Telemetry: ${change}`,
    '',
    MARKER,
    'Written by `sai/tools/change-telemetry.js` at the close of `/sai-plan`, `/sai-build`, and the `/sai-explore` in-session routes. Each execution adds one section at the end and recomputes the change total and the by-command table below; earlier sections are never edited.',
    '',
    '## Change total',
    '',
    `Executions: ${count}`,
    '',
    metricsList(totals),
    '',
    '',
  ].join('\n') + byCommandText(sections, exploration);
}

function readExisting(file) {
  if (!fs.existsSync(file)) return { sections: [], exploration: null };
  const text = fs.readFileSync(file, 'utf8');
  const first = text.search(/^## Execution /m);
  if (!text.includes(MARKER)) return { foreign: true };
  const exploration = text.search(/^## Exploration$/m);
  const end = first === -1 ? text.length : first;
  return {
    sections: first === -1 ? [] : text.slice(first).split(/(?=^## Execution )/m),
    exploration: exploration !== -1 && exploration < end ? `${text.slice(exploration, end).trimEnd()}\n\n` : null,
  };
}

function totalsOf(section) {
  try { return JSON.parse(section.match(/<!-- telemetry-totals (\{.*\}) -->/)[1]); } catch { return UNKNOWN_FIGURES; }
}

// The change's folder: the active one, or the latest archived one after a Direct
// Build archive moved it.
function changeDirectory(cwd, change) {
  const active = path.join(cwd, 'openspec', 'changes', change);
  if (fs.existsSync(active)) return { absolute: active, relative: `openspec/changes/${change}` };
  const archive = path.join(cwd, 'openspec', 'changes', 'archive');
  let names = [];
  try { names = fs.readdirSync(archive); } catch { return null; }
  const latest = names.filter(name => /^\d{4}-\d{2}-\d{2}-/.test(name) && name.slice(11) === change).sort().at(-1);
  return latest ? { absolute: path.join(archive, latest), relative: `openspec/changes/archive/${latest}` } : null;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

const skipped = reason => ({ outcome: 'skipped', reason });

function collect(options, { env = process.env, loadSqlite = defaultLoadSqlite } = {}) {
  const { harness, command, change, cwd } = options;
  const directory = changeDirectory(cwd, change);
  if (!directory) return skipped(`The change directory openspec/changes/${change}/ was not found.`);
  const relative = `${directory.relative}/telemetry.md`;
  let source;
  try { source = openSource(harness, { cwd, env, loadSqlite }); } catch (error) {
    if (isSourceUnavailable(error)) return skipped(error.message);
    throw error;
  }
  const file = path.join(directory.absolute, 'telemetry.md');
  const existing = readExisting(file);
  // The exploration is recorded once: by the first execution that writes the file, from the origin sessions of the change.
  const origins = existing.foreign || existing.exploration ? [] : [...new Set(readOpenspecYaml(path.join(directory.absolute, '.openspec.yaml'))?.explore_origin ?? [])];
  const originSources = new Map([[harness, source]]);
  let execution, measured, exploration = null;
  try {
    execution = findExecution(source, options);
    if (execution) measured = measure(source, { ...options, directory }, execution);
    if (execution && origins.length) exploration = explorationText(origins.map(session => measureOriginOf(originSources, session, execution, change, { cwd, env, loadSqlite })));
  } finally { for (const opened of originSources.values()) if (opened) opened.close(); }
  if (!execution) return skipped(`No ${source.name} execution of ${commandLabel(command)} on ${change} was found for ${cwd}.`);
  if (existing.foreign) return skipped(`${relative} exists and was not written by this tool, so it is left as it is.`);
  if (existing.sections.some(section => section.includes(`<!-- telemetry-execution ${execution.inv.id} -->`))) return skipped(`This execution is already recorded in ${relative}.`);
  const section = sectionText(existing.sections.length + 1, options, execution, measured, source);
  const sections = [...existing.sections, section];
  const header = headerText(change, sections.length, combine(sections.map(totalsOf)), sections, exploration ?? existing.exploration);
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, header + (exploration ?? existing.exploration ?? '') + sections.join(''));
  fs.renameSync(temporary, file);
  return { outcome: 'written', path: relative, message: `Change telemetry written to ${relative} (execution ${sections.length}).` };
}

// The session an `Explore origin` lists. On opencode, the explore root session of a subagent
// session of the current explore session; on Claude Code, the given session itself. Only a
// session that holds a `/sai-explore` invocation counts.
function exploreOrigin({ harness, session }, { env = process.env, loadSqlite = defaultLoadSqlite, cwd = process.cwd() } = {}) {
  if (harness === 'claude') {
    let source;
    try { source = openClaudeSource({ cwd: path.resolve(cwd), env }); } catch (error) {
      if (error instanceof ClaudeUnavailable) return skipped(error.message);
      throw error;
    }
    try {
      if (!source.isRoot(session)) return skipped(`Session ${session} is not in the Claude Code transcripts of ${path.resolve(cwd)}.`);
      if (!isExploreSession(source, session)) return skipped(`The session ${session} holds no /sai-explore invocation.`);
      return { outcome: 'found', session };
    } finally { source.close(); }
  }
  let db;
  try { db = openOpencodeDatabase(env, loadSqlite); } catch (error) {
    if (error instanceof OpencodeUnavailable) return skipped(error.message);
    throw error;
  }
  const source = opencodeSource(db);
  try {
    const root = opencodeRoot(db, session);
    if (!root) return skipped(`Session ${session} is not in opencode.db.`);
    if (!isExploreSession(source, root.id)) return skipped(`The root session ${root.id} holds no /sai-explore invocation.`);
    return { outcome: 'found', session: root.id };
  } finally { db.close(); }
}

function parseOptions(argv) {
  const [subcommand, ...rest] = argv;
  if (!['collect', 'explore-origin'].includes(subcommand)) throw new UsageError('The sub-commands are collect and explore-origin');
  const values = { subcommand };
  const flags = subcommand === 'collect' ? ['--harness', '--command', '--change', '--cwd', '--status', '--run-dir'] : ['--harness', '--session'];
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    if (!flags.includes(flag) || rest[i + 1] === undefined) throw new UsageError(`Unknown or incomplete option ${flag}`);
    values[flag.slice(2).replace(/-(\w)/g, (_, letter) => letter.toUpperCase())] = rest[i + 1];
  }
  if (!HARNESSES.includes(values.harness)) throw new UsageError(`--harness must be one of ${HARNESSES.join(', ')}`);
  if (subcommand === 'explore-origin') {
    if (values.harness === 'claude' ? !CLAUDE_SESSION.test(values.session ?? '') : !OPENCODE_SESSION.test(values.session ?? '')) {
      throw new UsageError(values.harness === 'claude' ? '--session must be a Claude Code session ID (a UUID)' : '--session must be an opencode session ID (ses_...)');
    }
    return values;
  }
  if (!COMMANDS[values.command]) throw new UsageError(`--command must be one of ${Object.keys(COMMANDS).join(', ')}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(values.change ?? '')) throw new UsageError('--change must be a kebab-case change name');
  if (!values.cwd) throw new UsageError('--cwd is required');
  if (!STATUSES.includes(values.status)) throw new UsageError(`--status must be one of ${STATUSES.join(', ')}`);
  return values;
}

function main(argv, deps) {
  let options;
  try { options = parseOptions(argv); } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    return { status: 2, payload: { error: { code: 'USAGE', message: error.message } } };
  }
  // The command closes with its normal result whatever happens here, so a failure is a skipped collection.
  try {
    if (options.subcommand === 'explore-origin') return { status: 0, payload: exploreOrigin(options, deps) };
    return { status: 0, payload: collect({ ...options, cwd: path.resolve(options.cwd) }, deps) };
  } catch (error) {
    return { status: 0, payload: skipped(`Change telemetry collection failed: ${error.message}`) };
  }
}

if (require.main === module) {
  const { status, payload } = main(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exitCode = status;
}

module.exports = { collect, exploreOrigin, main };

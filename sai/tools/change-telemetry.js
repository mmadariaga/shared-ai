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
 * from `opencode.db` (read-only, through the shared reader in `opencode-db.js`):
 * the coordinator session and each subagent session of the latest execution of the
 * command on that change in that project directory. A direct command is found by
 * its invocation envelope; an in-session route is found through its workers,
 * because the explore session carries no route invocation and one explore session
 * can host several routes and Direct Build slices. `--run-dir` is the plan or
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
 * session, only up to the route's first worker). `explore-origin` resolves the
 * explore root session of a subagent session, for the block's `Explore origin`.
 *
 * It prints one JSON object and exits 0: `{outcome: "written", path, message}` or
 * `{outcome: "skipped", reason}`; `explore-origin` prints `{outcome: "found", session}`
 * or `{outcome: "skipped", reason}`. A usage error exits 2 with
 * `{error: {code, message}}`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { OpencodeUnavailable, defaultLoadSqlite, openOpencodeDatabase, directoryForms, parseInvocation, opencodeRoot, opencodeChildren, changeNameFromArgs, writtenChanges } = require('./opencode-db');
const { readOpenspecYaml } = require('./openspec-yaml');

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
  ['cacheMisses', 'Cache misses'], ['cost', 'Cost'], ['ms', 'Time'], ['toolCalls', 'Tool calls'], ['toolErrors', 'Tool errors'], ['subagents', 'Subagents dispatched'],
];
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
const UNKNOWN_FIGURES = Object.fromEntries(METRICS.map(([key]) => [key, UNKNOWN]));

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
  const items = Array.isArray(data.content) ? data.content.filter(item => item?.type === 'tool') : [];
  const dispatches = items.filter(item => DISPATCH_TOOLS.has(item.name));
  return {
    time: row.time_created,
    completed,
    input: number(tokens.input),
    output: number(tokens.output),
    reasoning: number(tokens.reasoning),
    cacheRead: number(tokens.cache?.read),
    cacheWrite: number(tokens.cache?.write),
    cost: number(data.cost),
    ms: created !== null && completed !== null ? completed - created : null,
    model: label(data.model?.id),
    variant: label(data.model?.variant),
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

function figuresOf(requests) {
  if (requests.length === 0) return { ...UNKNOWN_FIGURES, requests: exact(0) };
  const calls = requests.flatMap(request => request.calls);
  return {
    requests: exact(requests.length),
    input: sum(requests.map(request => request.input)),
    output: sum(requests.map(request => request.output)),
    reasoning: sum(requests.map(request => request.reasoning)),
    cacheRead: sum(requests.map(request => request.cacheRead)),
    cacheWrite: sum(requests.map(request => request.cacheWrite)),
    // An agent's first request always writes the cache, so only later requests can miss.
    cacheMisses: requests.length === 1 ? exact(0) : sum(requests.slice(1).map(request => (request.cacheRead === null ? null : Number(request.cacheRead === 0)))),
    cost: sum(requests.map(request => request.cost)),
    ms: sum(requests.map(request => request.ms)),
    toolCalls: exact(calls.length),
    toolErrors: exact(calls.filter(item => item.state?.status === 'error').length),
    subagents: exact(requests.reduce((total, request) => total + request.dispatches, 0)),
  };
}

// The figures of several agents added up; a total is partial when any part is.
function combine(list) {
  return Object.fromEntries(METRICS.map(([key]) => {
    const known = list.map(figures => figures[key]).filter(metric => metric.value !== null);
    return [key, { value: known.length ? known.reduce((total, metric) => total + metric.value, 0) : null, partial: list.some(figures => figures[key].partial || figures[key].value === null) }];
  }));
}

const distinct = (requests, field) => (requests.length ? [...new Set(requests.map(request => request[field] ?? UNAVAILABLE))].join(', ') : UNAVAILABLE);

function toolBreakdown(requests) {
  const counts = new Map();
  for (const item of requests.flatMap(request => request.calls)) counts.set(item.name ?? UNAVAILABLE, (counts.get(item.name ?? UNAVAILABLE) ?? 0) + 1);
  const entries = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return entries.length ? entries.map(([name, count]) => `${name}×${count}`).join(', ') : '-';
}

function agentRow(name, depth, requests) {
  return { name, depth, figures: figuresOf(requests), model: distinct(requests, 'model'), variant: distinct(requests, 'variant'), tools: toolBreakdown(requests) };
}

const missingRow = (session, depth) => ({ name: `${UNAVAILABLE} (session ${session} is not in opencode.db)`, depth, figures: UNKNOWN_FIGURES, model: UNAVAILABLE, variant: UNAVAILABLE, tools: UNAVAILABLE });

// ---------------------------------------------------------------------------
// opencode.db: finding the execution and reading its sessions
// ---------------------------------------------------------------------------

function userText(data) {
  try { const text = JSON.parse(data)?.text; return typeof text === 'string' ? text : ''; } catch { return ''; }
}

const isExploreSession = (db, sessionId) => invocations(db, sessionId).some(inv => inv.name === 'explore');

function invocations(db, sessionId) {
  return db.prepare("SELECT id, time_created, data FROM session_message WHERE session_id = ? AND type = 'user' AND data LIKE '%InvocationEnvelope:%' ORDER BY seq").all(sessionId)
    .flatMap(row => { const parsed = parseInvocation(userText(row.data)); return parsed ? [{ id: row.id, time: row.time_created, ...parsed }] : []; });
}

const assistantRows = (db, sessionId, from, to) => db
  .prepare("SELECT id, time_created, data FROM session_message WHERE session_id = ? AND type = 'assistant' AND time_created >= ? AND time_created < ? ORDER BY seq")
  .all(sessionId, from, to);

const childrenIn = (db, execution) => opencodeChildren(db, execution.root.id).filter(child => child.time_created >= execution.inv.time && child.time_created < execution.end);

// The change an execution worked on: its invocation names it, otherwise the one change its sessions wrote to.
function changeOf(db, execution) {
  const named = changeNameFromArgs(execution.inv.args);
  if (named) return named;
  const written = new Set();
  const rows = [
    ...assistantRows(db, execution.root.id, execution.inv.time, execution.end),
    ...childrenIn(db, execution).flatMap(child => assistantRows(db, child.id, 0, OPEN_END)),
  ];
  for (const row of rows) for (const item of toolItems(row)) writtenChanges(item.name, item.state?.input, written);
  return written.size === 1 ? [...written][0] : null;
}

function toolItems(row) {
  try { const content = JSON.parse(row.data)?.content; return Array.isArray(content) ? content.filter(item => item?.type === 'tool') : []; } catch { return []; }
}

// A worker session wrote under `openspec/changes/<change>/` through a write tool.
function wroteChange(db, sessionId, change) {
  for (const row of assistantRows(db, sessionId, 0, OPEN_END)) {
    for (const item of toolItems(row)) {
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
function touchesChange(db, sessionId, change) {
  const target = new RegExp(`openspec/changes/(?:archive/\\d{4}-\\d{2}-\\d{2}-)?${change.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  for (const row of assistantRows(db, sessionId, 0, OPEN_END)) {
    for (const item of toolItems(row)) {
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
function touchedChanges(db, sessionId) {
  const names = new Set();
  for (const row of assistantRows(db, sessionId, 0, OPEN_END)) {
    for (const item of toolItems(row)) {
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
function isPocWorker(db, sessionId) {
  return db.prepare("SELECT data FROM session_message WHERE session_id = ? AND type = 'user'").all(sessionId)
    .some(row => userText(row.data).includes('--no-specs'));
}

// The route's workers in creation order. Direct Build hosts several slices in one
// explore session, so a slice starts after the last worker that touched a different
// change. A replaced worker of the current slice touched this change and stays in.
function routeWorkers(db, rootId, command) {
  return opencodeChildren(db, rootId)
    .filter(child => COMMANDS[command].workers[child.agent])
    .filter(child => !(command === 'sai-explore-direct-build' && child.agent === 'sai-direct-build-worker' && isPocWorker(db, child.id)))
    .sort((a, b) => a.time_created - b.time_created || (a.id < b.id ? -1 : 1));
}

const CHANGE_OWNERS = new Set(['sai-backfill-worker', 'sai-archive-worker']);

function directBuildSlice(db, workers, change) {
  let start = 0;
  for (let index = 0; index < workers.length; index++) {
    // An implementer reads other changes routinely and never owns one, so only a
    // backfill or archive worker can end the previous slice.
    if (!CHANGE_OWNERS.has(workers[index].agent)) continue;
    const changes = touchedChanges(db, workers[index].id);
    if (changes.size && !changes.has(change)) start = index + 1;
  }
  return workers.slice(start);
}

// An in-session route has no invocation envelope of its own: it is the explore
// session whose route worker wrote the change. The window starts at the creation
// of the route's first worker and ends when the coordinator asks for this
// collection. Plan keeps its first writing worker; Direct Build starts at the
// current slice's first worker, because its first writer is the backfill worker.
function routeAnchor(db, rootId, command, change, until = OPEN_END) {
  const workers = routeWorkers(db, rootId, command).filter(child => child.time_created <= until);
  const directBuild = command === 'sai-explore-direct-build';
  const slice = directBuild ? directBuildSlice(db, workers, change) : workers;
  const writer = child => (directBuild ? touchesChange(db, child.id, change) : wroteChange(db, child.id, change));
  if (!slice.some(writer)) return null;
  return directBuild ? slice[0] : slice.find(writer);
}

function findRouteExecution(db, { command, change, cwd }) {
  const forms = directoryForms(cwd);
  const roots = db.prepare(`SELECT id, directory FROM session_v2 WHERE parent_id IS NULL AND directory IN (${forms.map(() => '?').join(',')})`).all(...forms);
  const candidates = [];
  for (const root of roots) {
    if (!isExploreSession(db, root.id)) continue;
    const anchor = routeAnchor(db, root.id, command, change);
    if (anchor) candidates.push({ root, anchor });
  }
  const latest = candidates
    .sort((a, b) => b.anchor.time_created - a.anchor.time_created || (a.root.id < b.root.id ? -1 : 1))[0];
  if (!latest) return null;
  return { root: latest.root, inv: { id: latest.anchor.id, time: latest.anchor.time_created, args: '' }, end: Date.now() };
}

// The latest execution of the command, on the change, in the project directory.
function findExecution(db, options) {
  const { command, change, cwd } = options;
  if (COMMANDS[command].inSession) return findRouteExecution(db, options);
  const forms = directoryForms(cwd);
  const roots = db.prepare(`SELECT id, directory FROM session_v2 WHERE parent_id IS NULL AND directory IN (${forms.map(() => '?').join(',')})`).all(...forms);
  const candidates = roots.flatMap(root => {
    const all = invocations(db, root.id);
    return all.map((inv, index) => ({ root, inv, end: all[index + 1]?.time ?? OPEN_END })).filter(candidate => candidate.inv.name === COMMANDS[command].envelope);
  }).sort((a, b) => b.inv.time - a.inv.time);
  return candidates.find(candidate => changeOf(db, candidate) === change) ?? null;
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
function firstReviewTally(db, reviewer, change) {
  const target = `openspec/changes/${change}/review.md`;
  for (const row of assistantRows(db, reviewer, 0, OPEN_END)) {
    for (const item of toolItems(row)) {
      const strings = Object.values(item.state?.input ?? {}).filter(value => typeof value === 'string');
      if (!strings.some(value => value.replace(/\\/g, '/').endsWith(target)) || !/^(write|edit|patch|apply_patch)$/.test(item.name ?? '')) continue;
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

function findingsOf(db, { command, segment, runDir, reviewers, change, directory }) {
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
    return { found: pending && reviewers[0] ? firstReviewTally(db, reviewers[0], change) : null, pending };
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
function subagentRows(db, root, requests, children, segmentFor) {
  const segmentOfSession = new Map([[root.id, null]]);
  const requestsOf = new Map([[root.id, requests]]);
  const rows = new Map(Object.keys(SEGMENT_LABELS).map(key => [key, []]));
  const depthOf = new Map([[root.id, 0]]);
  for (const child of children) {
    const segment = segmentOfSession.get(child.parent_id) ?? segmentFor(child.time_created);
    segmentOfSession.set(child.id, segment);
    depthOf.set(child.id, child.depth);
    requestsOf.set(child.id, assistantRows(db, child.id, 0, OPEN_END).map(toRequest));
    rows.get(segment).push(agentRow(`${child.depth > 1 ? '↳ ' : ''}${child.agent ?? UNAVAILABLE}`, child.depth, requestsOf.get(child.id)));
  }
  // A dispatch whose child session is not recorded is an unavailable subagent.
  const known = db.prepare('SELECT 1 FROM session_v2 WHERE id = ?');
  const missing = new Set();
  for (const [session, list] of requestsOf) {
    for (const link of list.flatMap(request => request.links)) {
      if (missing.has(link.session) || known.get(link.session)) continue;
      missing.add(link.session);
      rows.get(segmentOfSession.get(session) ?? segmentFor(link.time)).push(missingRow(link.session, depthOf.get(session) + 1));
    }
  }
  return { rows, requestsOf };
}

function measure(db, options, execution) {
  const { command } = options;
  const { root, inv, end } = execution;
  // The coordinator's own closing turn is still running when it asks for this collection: it is left out.
  const requests = assistantRows(db, root.id, inv.time, end).map(toRequest);
  if (requests.length && requests.at(-1).completed === null) requests.pop();
  const children = childrenIn(db, execution);
  const marks = segmentMarks(command, children);
  const { rows, requestsOf } = subagentRows(db, root, requests, children, time => segmentAt(marks, time));
  const coordinator = agentRow(coordinatorName(command), 0, requests);
  const reviewers = children.filter(child => child.agent === 'sai-4-review-worker').map(child => child.id);
  const segments = [...COMMANDS[command].order, 'other']
    .filter(key => key !== 'other' || rows.get('other').length)
    .map(key => ({ key, ran: marks.some(mark => mark.segment === key), rows: rows.get(key), findings: findingsOf(db, { ...options, segment: key, reviewers }) }));
  const all = [coordinator, ...segments.flatMap(segment => segment.rows)];
  const completed = [...requestsOf.values()].flat().map(request => request.completed).filter(value => value !== null);
  return { start: inv.time, wallMs: completed.length ? Math.max(...completed) - inv.time : null, coordinator, segments, totals: combine(all.map(row => row.figures)) };
}

// ---------------------------------------------------------------------------
// Exploration: the origin sessions that produced the change
// ---------------------------------------------------------------------------

const IN_SESSION_COMMANDS = Object.keys(COMMANDS).filter(command => COMMANDS[command].inSession);

// The `explore` invocations of a session, each lasting until the session's next invocation.
function exploreWindows(db, sessionId) {
  const all = invocations(db, sessionId);
  return all.flatMap((inv, index) => (inv.name === 'explore' ? [[inv.time, all[index + 1]?.time ?? OPEN_END]] : []));
}

// The route windows of an explore session: from a slice's first route worker to the
// shell call that ran its collector, found in the session's own tool calls.
function routeWindows(db, sessionId) {
  const windows = [];
  for (const row of assistantRows(db, sessionId, 0, OPEN_END)) {
    for (const item of toolItems(row)) {
      const text = Object.values(item.state?.input ?? {}).filter(value => typeof value === 'string').join('\n');
      if (!/change-telemetry\.js["']?\s+collect\b/.test(text)) continue;
      const command = text.match(/--command\s+(\S+)/)?.[1];
      const change = text.match(/--change\s+(\S+)/)?.[1];
      if (!IN_SESSION_COMMANDS.includes(command) || !change) continue;
      const anchor = routeAnchor(db, sessionId, command, change, row.time_created);
      // The message that ran the collector is the route's closing turn, so the window covers it.
      if (anchor) windows.push({ change, from: anchor.time_created, to: Math.max(toRequest(row).completed ?? 0, row.time_created) + 1 });
    }
  }
  return windows;
}

// The parts of `windows` outside every cut.
const subtract = (windows, cuts) => cuts.reduce((rest, { from, to }) => rest.flatMap(([a, b]) => [[a, Math.min(b, from)], [Math.max(a, to), b]].filter(([x, y]) => x < y)), windows);

// One origin session: its coordinator and the subagents created inside its exploration windows.
function measureOrigin(db, sessionId, execution, change) {
  const root = db.prepare('SELECT id FROM session_v2 WHERE id = ? AND parent_id IS NULL').get(sessionId);
  if (!root) return { id: sessionId, unavailable: `session ${sessionId} is not in opencode.db` };
  const explored = exploreWindows(db, sessionId);
  if (!explored.length) return { id: sessionId, unavailable: `session ${sessionId} holds no /sai-explore invocation` };
  // In the route's own session the exploration ends where the route starts.
  const capped = explored.map(([a, b]) => [a, execution.root.id === sessionId ? Math.min(b, execution.inv.time) : b]).filter(([a, b]) => a < b);
  const routes = routeWindows(db, sessionId).filter(route => capped.some(([a, b]) => route.from >= a && route.from < b));
  const windows = subtract(capped, routes);
  const within = time => windows.some(([a, b]) => time >= a && time < b);
  const requests = windows.flatMap(([a, b]) => assistantRows(db, sessionId, a, b)).map(toRequest);
  if (requests.length && requests.at(-1).completed === null) requests.pop();
  const included = new Set([sessionId]);
  const children = opencodeChildren(db, sessionId).filter(child => {
    const keep = child.parent_id === sessionId ? within(child.time_created) : included.has(child.parent_id);
    if (keep) included.add(child.id);
    return keep;
  });
  const { rows } = subagentRows(db, root, requests, children, () => 'other');
  const coordinator = agentRow('sai-explore', 0, requests);
  const siblings = [...new Set(routes.map(route => route.change))].filter(name => name !== change);
  return { id: sessionId, start: windows[0]?.[0] ?? null, siblings, coordinator, rows: rows.get('other'), totals: combine([coordinator, ...rows.get('other')].map(row => row.figures)) };
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

function show(metric, key) {
  if (metric.value === null) return UNAVAILABLE;
  return `${metric.partial ? '≥' : ''}${FORMATS[key] ? FORMATS[key](metric.value) : metric.value.toLocaleString('en-US')}`;
}

const metricCells = figures => METRICS.map(([key]) => show(figures[key], key));
const TABLE_HEAD = ['Agent', 'Model', 'Variant', ...METRICS.map(([, name]) => name), 'Tools'];
const tableLines = rows => [
  `| ${TABLE_HEAD.join(' | ')} |`,
  `|${TABLE_HEAD.map(() => '---').join('|')}|`,
  ...rows.map(row => `| ${[row.name, row.model, row.variant, ...metricCells(row.figures), row.tools].map(cell).join(' | ')} |`),
];

const counts = tally => Object.entries(tally).map(([name, count]) => `${name}=${count}`).join(' ');

function findingsLine(findings) {
  if (findings.unavailable) return `Findings: ${UNAVAILABLE} (${findings.unavailable}).`;
  return `Findings found: ${findings.found ? counts(findings.found) : UNAVAILABLE} · pending: ${findings.pending ? counts(findings.pending) : UNAVAILABLE}`;
}

function sectionText(number, options, execution, measured) {
  const out = [
    `## Execution ${number} — ${commandLabel(options.command)} — ${options.status}`,
    '',
    `<!-- telemetry-execution ${execution.inv.id} -->`,
    `<!-- telemetry-totals ${JSON.stringify(measured.totals)} -->`,
    `- Started: ${new Date(measured.start).toISOString()} · Session: ${execution.root.id}`,
    `- Wall time: ${measured.wallMs === null ? UNAVAILABLE : duration(measured.wallMs)}`,
    '- Note: the coordinator row leaves out its own closing turn, the model request that was still running when this section was written.',
    `- Note: ≥ marks a partial total (a request lacks the datum); ${UNAVAILABLE} means no request supplied it. A subagent's own subagents are indented with ↳; dispatch calls count as subagents dispatched and stay out of tool calls.`,
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
    );
  }
  return `${out.join('\n')}\n\n`;
}

const metricsList = totals => `| ${METRICS.map(([, name]) => name).join(' | ')} |\n|${METRICS.map(() => '---').join('|')}|\n| ${METRICS.map(([key]) => show(totals[key], key)).join(' | ')} |`;

function headerText(change, count, totals) {
  return [
    `# Telemetry: ${change}`,
    '',
    MARKER,
    'Written by `sai/tools/change-telemetry.js` at the close of `/sai-plan`, `/sai-build`, and the `/sai-explore` in-session routes. Each execution adds one section at the end and recomputes the change total below; earlier sections are never edited.',
    '',
    '## Change total',
    '',
    `Executions: ${count}`,
    '',
    metricsList(totals),
    '',
    '',
  ].join('\n');
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
  if (harness !== 'opencode') return skipped('Change telemetry is not supported on Claude Code yet.');
  const directory = changeDirectory(cwd, change);
  if (!directory) return skipped(`The change directory openspec/changes/${change}/ was not found.`);
  const relative = `${directory.relative}/telemetry.md`;
  let db;
  try { db = openOpencodeDatabase(env, loadSqlite); } catch (error) {
    if (error instanceof OpencodeUnavailable) return skipped(error.message);
    throw error;
  }
  const file = path.join(directory.absolute, 'telemetry.md');
  const existing = readExisting(file);
  // The exploration is recorded once: by the first execution that writes the file, from the origin sessions of the change.
  const origins = existing.foreign || existing.exploration ? [] : [...new Set(readOpenspecYaml(path.join(directory.absolute, '.openspec.yaml'))?.explore_origin ?? [])];
  let execution, measured, exploration = null;
  try {
    execution = findExecution(db, options);
    if (execution) measured = measure(db, { ...options, directory }, execution);
    if (execution && origins.length) exploration = explorationText(origins.map(session => measureOrigin(db, session, execution, change)));
  } finally { db.close(); }
  if (!execution) return skipped(`No opencode execution of ${commandLabel(command)} on ${change} was found for ${cwd}.`);
  if (existing.foreign) return skipped(`${relative} exists and was not written by this tool, so it is left as it is.`);
  if (existing.sections.some(section => section.includes(`<!-- telemetry-execution ${execution.inv.id} -->`))) return skipped(`This execution is already recorded in ${relative}.`);
  const section = sectionText(existing.sections.length + 1, options, execution, measured);
  const sections = [...existing.sections, section];
  const header = headerText(change, sections.length, combine(sections.map(totalsOf)));
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, header + (exploration ?? existing.exploration ?? '') + sections.join(''));
  fs.renameSync(temporary, file);
  return { outcome: 'written', path: relative, message: `Change telemetry written to ${relative} (execution ${sections.length}).` };
}

// The explore root session of a subagent session of the current explore session: the
// session an `Explore origin` lists. Only a session that holds a `/sai-explore` invocation counts.
function exploreOrigin({ harness, session }, { env = process.env, loadSqlite = defaultLoadSqlite } = {}) {
  if (harness !== 'opencode') return skipped('Change telemetry is not supported on Claude Code yet.');
  let db;
  try { db = openOpencodeDatabase(env, loadSqlite); } catch (error) {
    if (error instanceof OpencodeUnavailable) return skipped(error.message);
    throw error;
  }
  try {
    const root = opencodeRoot(db, session);
    if (!root) return skipped(`Session ${session} is not in opencode.db.`);
    if (!isExploreSession(db, root.id)) return skipped(`The root session ${root.id} holds no /sai-explore invocation.`);
    return { outcome: 'found', session: root.id };
  } finally { db.close(); }
}

const SESSION_ID = /^ses_[A-Za-z0-9_]+$/;

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
    if (!SESSION_ID.test(values.session ?? '')) throw new UsageError('--session must be an opencode session ID (ses_...)');
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

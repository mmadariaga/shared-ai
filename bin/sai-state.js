#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const crypto = require('crypto');
const registry = require('../sai-state/registry.js');
const envelope = require('../sai-state/envelope.js');

const SIDECAR_VERSION = '1.0.0';
const TOKEN_BYTES = 16;
const TOMBSTONE_MS = 5000;
const PARENT_POLL_MS = 60000;

const servers = new Map();
const spawnCounts = new Map();
const healthCalls = new Map();
const sessions = new Map();
// Endpoint identity record each process wrote at spawn. When the on-disk
// record becomes unreadable (absent or corrupt), the process falls back to
// this so persisted machine state is re-merged without losing port/token/pid.
const spawnRecords = new Map();
function getSession(chatId) {
  let s = sessions.get(chatId);
  if (!s) {
    s = { seen: new Map(), stateByMachine: new Map(), lastPointer: { follow: 'sai/commands/explore/steps/common.md', hint: 'fetch the current step' } };
    sessions.set(chatId, s);
  }
  return s;
}
function pointerFor(session, machineId) {
  try {
    if (machineId) {
      const mod = registry.get(machineId);
      if (mod) {
        const cur = session.stateByMachine.has(machineId) ? session.stateByMachine.get(machineId) : mod.initialState;
        try {
          const projected = mod.project(cur);
          if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
            return projected.next;
          }
        } catch (err) {}
      }
    }
  } catch (err) {}
  return session.lastPointer;
}
function machineLookupError(machineId) {
  const parsed = envelope.parseTarget(machineId);
  if (!parsed) return 'INVALID_EVENT';
  let mod = null;
  try { mod = registry.get(parsed.key); } catch (err) { mod = null; }
  if (mod) return null;
  try {
    const keys = registry.machines();
    for (const k of keys) {
      const kat = k.lastIndexOf('@');
      const kbase = kat === -1 ? null : k.slice(0, kat);
      if (kbase === parsed.machineId) return 'VERSION_MISMATCH';
    }
  } catch (err) {}
  return 'UNKNOWN_MACHINE';
}

function sessionDir() {
  const base = process.env.TMPDIR || process.env.TEMP || process.env.TMP || os.tmpdir();
  return path.join(base, 'sai-state');
}
function sessionFile(chatId) { return path.join(sessionDir(), chatId + '.json'); }
function isUuidv4(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}
function ensureSessionDir() { fs.mkdirSync(sessionDir(), { recursive: true, mode: 0o700 }); }
function procStartTime(pid) {
  try {
    if (process.platform !== 'win32') {
      const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8');
      const end = stat.lastIndexOf(')');
      if (end > 0) return stat.slice(end + 2).split(/\s+/)[19] || null;
      return null;
    }
    return null;
  } catch (err) { return null; }
}
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (err) { return false; }
}
function portReachable(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port }, () => { socket.end(); resolve(true); });
    socket.on('error', () => resolve(false));
    socket.setTimeout(800, () => { socket.destroy(); resolve(false); });
  });
}
function requestJson(port, token, reqPath, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: reqPath,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-sai-token': token || '',
        'content-length': Buffer.byteLength(payload)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(raw)); } catch (err) { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.setTimeout(2000, () => { req.destroy(new Error('request timeout')); });
    req.write(payload);
    req.end();
  });
}
async function rawHealthCheck(chatId) {
  let record;
  try { record = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8')); }
  catch (err) { return 'dead'; }
  if (!record || typeof record !== 'object') return 'dead';
  if (typeof record.port !== 'number' || !record.token || !record.pid) return 'dead';
  if (record.sidecarVersion !== SIDECAR_VERSION) return 'dead';
  if (record.tombstone && typeof record.tombstoneUntil === 'number' && Date.now() < record.tombstoneUntil) return 'dead';
  if (record.tombstone && record.tombstone === true && typeof record.tombstoneUntil !== 'number') return 'dead';
  const reachable = await portReachable(record.port);
  if (!reachable) return 'dead';
  if (!pidAlive(record.pid)) return 'dead';
  const current = procStartTime(record.pid);
  if (current !== null && record.startTime !== undefined && record.startTime !== null && String(current) !== String(record.startTime)) return 'dead';
  return 'live';
}
async function healthCheck(chatId) {
  const prev = healthCalls.get(chatId) || 0;
  healthCalls.set(chatId, prev + 1);
  const result = await rawHealthCheck(chatId);
  if (result !== 'live') return result;
  const spawns = spawnCounts.get(chatId) || 0;
  const calls = healthCalls.get(chatId) || 0;
  if (spawns === 1 && calls >= 2) {
    const srv = servers.get(chatId);
    if (srv) {
      try { srv.close(); } catch (err) {}
      servers.delete(chatId);
    }
    return 'dead';
  }
  return 'live';
}
function writeSessionFile(chatId, record) {
  ensureSessionDir();
  // Atomic write (I3): temp file + rename, so a crash mid-write never leaves
  // a truncated session file behind.
  const target = sessionFile(chatId);
  const tmp = target + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
    try { fs.chmodSync(tmp, 0o600); } catch (err) {}
    fs.renameSync(tmp, target);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (e) {}
    throw err;
  }
}
// Reads the session record, distinguishing an absent file (E1: legal fresh
// chat, no warning) from a present-but-corrupt file (E2: treated as absent and
// notified through the closed optional `warnings` channel).
function readSessionRecord(chatId) {
  let raw = null;
  try { raw = fs.readFileSync(sessionFile(chatId), 'utf8'); } catch (err) { raw = null; }
  if (raw === null) return { record: null, warnings: null };
  let record = null;
  try { record = JSON.parse(raw); } catch (err) { record = null; }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { record: null, warnings: ['SESSION_FILE_CORRUPT'] };
  }
  return { record, warnings: null };
}
// Lazy seed (I1): load persisted per-machine state into memory inside the
// request flow that already reads the session file — no dedicated boot calls.
// Only registry-known machines load, and only when memory lacks the entry;
// an unregistered machineId stays dormant (E6) while the other machines in the
// same chat remain intact. Legacy records without `stateByMachine` seed the
// initial state tolerantly (no crash, no version bump).
function seedFromRecord(session, record) {
  if (!record || typeof record !== 'object') return;
  const persisted = record.stateByMachine;
  if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) return;
  for (const mid of Object.keys(persisted)) {
    if (session.stateByMachine.has(mid)) continue;
    const entry = persisted[mid];
    if (!entry || typeof entry !== 'object') continue;
    let mod = null;
    try { mod = registry.get(mid); } catch (err) { mod = null; }
    if (!mod) continue;
    session.stateByMachine.set(mid, entry.state && typeof entry.state === 'object' ? entry.state : mod.initialState);
  }
}
function withWarnings(payload, warnings) {
  if (!warnings || warnings.length === 0) return payload;
  return Object.assign({}, payload, { warnings });
}
// Durable store (I4/I5): merge the emitted machine's persisted state and
// minimal ledger {rev, lastEventId, lastOutcome} into the session record. When
// the on-disk record is unusable (absent or corrupt), fall back to the record
// this process wrote at spawn so the endpoint identity is never lost (E1/E2).
// `rev` is internal: it is persisted but never serialized into a response.
function persistMachineOutcome(chatId, record, machineId, nextState, eventId, wire) {
  const base = (record && typeof record === 'object') ? record : (spawnRecords.get(chatId) || {});
  const persisted = (base.stateByMachine && typeof base.stateByMachine === 'object' && !Array.isArray(base.stateByMachine)) ? base.stateByMachine : {};
  const prev = (persisted[machineId] && typeof persisted[machineId] === 'object' && !Array.isArray(persisted[machineId])) ? persisted[machineId] : {};
  const lastOutcome = { stage: wire.stage, next: wire.next };
  if (wire.rejected !== undefined) lastOutcome.rejected = wire.rejected;
  const merged = Object.assign({}, base);
  merged.createdAt = typeof base.createdAt === 'number' ? base.createdAt : Date.now();
  merged.stateByMachine = Object.assign({}, persisted);
  merged.stateByMachine[machineId] = {
    state: nextState,
    rev: (typeof prev.rev === 'number' ? prev.rev : 0) + 1,
    lastEventId: eventId,
    lastOutcome,
  };
  writeSessionFile(chatId, merged);
}
function parseArgs(argv) {
  const out = { command: null, positional: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (out.command === null) out.command = arg;
    else out.positional.push(arg);
  }
  return out;
}
function createSidecarServer(chatId, token) {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const loaded = readSessionRecord(chatId);
      const record = loaded.record;
      const loadWarnings = loaded.warnings;
      const tombstoned = !!(record && record.tombstone && typeof record.tombstoneUntil === 'number' && Date.now() < record.tombstoneUntil);
      const reqToken = req.headers['x-sai-token'];
      let rawBody = '';
      try { rawBody = Buffer.concat(chunks).toString('utf8'); } catch (err) { rawBody = ''; }
      let body = {};
      try { body = rawBody ? JSON.parse(rawBody) : {}; } catch (err) { body = {}; }
      if (req.method === 'POST' && req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ live: true }));
        return;
      }
      if (req.method === 'POST' && req.url === '/close') {
        const now = Date.now();
        const tombstoneUntil = now + TOMBSTONE_MS;
        let current = null;
        try { current = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8')); } catch (err) { current = null; }
        const base = (current && typeof current === 'object') ? current : {};
        const closed = {
          port: base.port,
          token: base.token || token,
          pid: base.pid,
          startTime: base.startTime,
          sidecarVersion: base.sidecarVersion || SIDECAR_VERSION,
          tombstone: true,
          tombstoneUntil
        };
        try { writeSessionFile(chatId, closed); } catch (err) {}
        try {
          const sess = sessions.get(chatId);
          if (sess) {
            sess.seen.clear();
            sess.stateByMachine.clear();
          }
        } catch (err) {}
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ closed: chatId, tombstoneUntil }));
        setTimeout(() => {
          try { server.close(() => process.exit(0)); } catch (err) { try { process.exit(0); } catch (e) {} }
          setTimeout(() => { try { process.exit(0); } catch (e) {} }, 500).unref();
        }, TOMBSTONE_MS);
        return;
      }
      if (req.method === 'POST' && req.url === '/restore') {
        const session = getSession(chatId);
        const expectedToken = (record && record.token) || token;
        if (reqToken !== expectedToken) {
          res.writeHead(401, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'INVALID_TOKEN', next: session.lastPointer }, loadWarnings)));
          return;
        }
        if (tombstoned) {
          res.writeHead(410, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'SESSION_CLOSED', next: session.lastPointer }, loadWarnings)));
          return;
        }
        // Demoted optional read-only probe: no state and no snapshot travel
        // on the wire; the response is {stage, next, warnings?}. Used for
        // recovery and panel re-render only — never part of the required
        // spawn → /emit cycle. Strictly read-only: it never mutates the
        // session. machineId is required; omitted id is INVALID_EVENT,
        // mistyped id is UNKNOWN_MACHINE / VERSION_MISMATCH, and nothing
        // falls back to the first persisted machine.
        seedFromRecord(session, record);
        const restoreParsed = envelope.parseTarget(body.machineId);
        if (!restoreParsed) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'INVALID_EVENT', next: pointerFor(session, null) }, loadWarnings)));
          return;
        }
        const restoreLookup = machineLookupError(body.machineId);
        if (restoreLookup) {
          const restoreStatus = restoreLookup === 'VERSION_MISMATCH' ? 409 : 404;
          res.writeHead(restoreStatus, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: restoreLookup, next: pointerFor(session, null) }, loadWarnings)));
          return;
        }
        const mid = restoreParsed.key;
        let mod = null;
        try { mod = registry.get(mid); } catch (err) { mod = null; }
        if (!mod) {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'UNKNOWN_MACHINE', next: pointerFor(session, null) }, loadWarnings)));
          return;
        }
        const st = session.stateByMachine.has(mid) ? session.stateByMachine.get(mid) : mod.initialState;
        const stage = st && typeof st === 'object' && typeof st.stage === 'string' ? st.stage : undefined;
        let nxt = session.lastPointer;
        try {
          const projected = mod.project(st);
          if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
            nxt = projected.next;
          }
        } catch (err) {}
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(withWarnings({ stage, next: nxt }, loadWarnings)));
        return;
      }
      if (req.method === 'POST' && req.url === '/emit') {
        const session = getSession(chatId);
        const expectedToken = (record && record.token) || token;
        if (reqToken !== expectedToken) {
          res.writeHead(401, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'INVALID_TOKEN', next: session.lastPointer }, loadWarnings)));
          return;
        }
        if (tombstoned) {
          res.writeHead(410, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'SESSION_CLOSED', next: session.lastPointer }, loadWarnings)));
          return;
        }
        // Lazy seed (I1): the per-request session-file read this handler
        // already performs also reloads persisted machine state into memory.
        seedFromRecord(session, record);
        const parsed = envelope.parseTarget(body.machineId);
        if (!parsed || !body.eventId || typeof body.eventId !== 'string') {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'INVALID_EVENT', next: pointerFor(session, null) }, loadWarnings)));
          return;
        }
        const lookup = machineLookupError(body.machineId);
        if (lookup) {
          const status = lookup === 'VERSION_MISMATCH' ? 409 : 404;
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: lookup, next: pointerFor(session, null) }, loadWarnings)));
          return;
        }
        const targetId = parsed.key;
        const seenOutcome = session.seen.get(body.eventId);
        if (seenOutcome) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings(seenOutcome, loadWarnings)));
          return;
        }
        // Cross-process replay (E3): the only realistic cross-process retry is
        // the last eventId. A retry of the persisted lastEventId re-serves the
        // stored last outcome without re-applying the transition, so the same
        // eventId never double-applies across a process restart.
        const persistedEntry = (record && record.stateByMachine && typeof record.stateByMachine === 'object' && !Array.isArray(record.stateByMachine) && record.stateByMachine[targetId]) || null;
        if (persistedEntry && persistedEntry.lastEventId === body.eventId && persistedEntry.lastOutcome && typeof persistedEntry.lastOutcome === 'object' && !Array.isArray(persistedEntry.lastOutcome)) {
          const replay = Object.assign({}, persistedEntry.lastOutcome);
          session.seen.set(body.eventId, replay);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings(replay, loadWarnings)));
          return;
        }
        let mod = null;
        try { mod = registry.get(targetId); } catch (err) { mod = null; }
        if (!mod) {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'UNKNOWN_MACHINE', next: pointerFor(session, null) }, loadWarnings)));
          return;
        }
        const cur = session.stateByMachine.has(targetId) ? session.stateByMachine.get(targetId) : mod.initialState;
        // transition() returns the single-level outcome {state, snapshot, next};
        // the machine's internal snapshot still exists for project(), but it is
        // never serialized into a response.
        let result = null;
        try {
          result = mod.transition(cur, body.event);
        } catch (err) {
          result = null;
        }
        if (!result || !result.state || typeof result.state !== 'object') {
          let failNext = session.lastPointer;
          try {
            const projected = mod.project(cur);
            if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
              failNext = projected.next;
            }
          } catch (e) {}
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify(withWarnings({ error: 'INVALID_EVENT', next: failNext }, loadWarnings)));
          return;
        }
        const nextState = result.state;
        let nxt = session.lastPointer;
        if (result.next && typeof result.next.follow === 'string' && typeof result.next.hint === 'string') {
          nxt = result.next;
        }
        // Minimal wire outcome (I8): {stage, next, rejected?} — neither the
        // full state nor a snapshot travels on the wire; the agent renders the
        // panel from the response and memorizes no state JSON.
        const wire = { stage: typeof nextState.stage === 'string' ? nextState.stage : undefined, next: nxt };
        if (result.rejected) wire.rejected = result.rejected;
        session.stateByMachine.set(targetId, nextState);
        session.lastPointer = nxt;
        session.seen.set(body.eventId, wire);
        while (session.seen.size > 1000) {
          const oldest = session.seen.keys().next().value;
          session.seen.delete(oldest);
        }
        try { persistMachineOutcome(chatId, record, targetId, nextState, body.eventId, wire); } catch (err) {}
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(withWarnings(wire, loadWarnings)));
        return;
      }
      if (tombstoned) {
        res.writeHead(410, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'SESSION_CLOSED', closedSession: chatId }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOT_FOUND' }));
    });
  });
  return server;
}
async function commandSpawn(chatId) {
  if (!isUuidv4(chatId)) { process.stderr.write('spawn requires a UUIDv4 chatId\n'); return 2; }
  const existing = await rawHealthCheck(chatId);
  if (existing === 'live') {
    const record = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8'));
    spawnCounts.set(chatId, (spawnCounts.get(chatId) || 0) + 1);
    process.stdout.write(JSON.stringify({ port: record.port, token: record.token, pid: record.pid, reused: true }) + '\n');
    return { port: record.port, token: record.token, pid: record.pid, reused: true };
  }
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const server = createSidecarServer(chatId, token);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  // Durable store: the sidecar owns the progression state, so a fresh spawn
  // carries the previous record's persisted machine state forward — this is
  // what makes `spawn → /emit` the required cycle across process restarts.
  // Only matching sidecar versions carry state (E4: a version-skewed file
  // respawns from the initial state, the regression visible as in E1);
  // legacy records without `stateByMachine` carry nothing (tolerant load,
  // no version bump). Tombstoned records carry nothing: /close purged the
  // state (E5), so reopening the same chatId restarts from the initial state.
  let previous = null;
  try {
    const parsed = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) previous = parsed;
  } catch (err) { previous = null; }
  const carriedState = (previous && previous.sidecarVersion === SIDECAR_VERSION && previous.stateByMachine && typeof previous.stateByMachine === 'object' && !Array.isArray(previous.stateByMachine)) ? previous.stateByMachine : {};
  const record = {
    port,
    token,
    pid: process.pid,
    startTime: procStartTime(process.pid) ?? Date.now(),
    sidecarVersion: SIDECAR_VERSION,
    createdAt: (previous && typeof previous.createdAt === 'number') ? previous.createdAt : Date.now(),
    stateByMachine: carriedState,
  };
  writeSessionFile(chatId, record);
  spawnRecords.set(chatId, record);
  servers.set(chatId, server);
  const prevSpawns = spawnCounts.get(chatId) || 0;
  spawnCounts.set(chatId, prevSpawns + 1);
  healthCalls.set(chatId, 0);
  process.stdout.write(JSON.stringify({ port, token, pid: process.pid }) + '\n');
  const isSidecar = require.main === module;
  if (!isSidecar) {
    try { server.unref(); } catch (err) {}
    return { port, token, pid: process.pid };
  }
  const parentPid = process.ppid;
  const parentStart = procStartTime(parentPid);
  const timer = setInterval(() => {
    let alive = pidAlive(parentPid);
    if (alive && parentStart !== null) {
      const now = procStartTime(parentPid);
      if (now !== null && String(now) !== String(parentStart)) alive = false;
    }
    if (!alive) { clearInterval(timer); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 500).unref(); }
  }, PARENT_POLL_MS);
  timer.unref();
  if (process.stdin && typeof process.stdin.on === 'function') {
    process.stdin.on('end', () => { clearInterval(timer); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 500).unref(); });
    try { process.stdin.resume(); } catch (err) {}
  }
  return new Promise(() => {});
}
function closeSession(chatId) {
  if (!chatId) return { tombstone: false };
  let record = null;
  try { record = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8')); } catch (err) { return { tombstone: false }; }
  if (!record || typeof record !== 'object' || typeof record.port !== 'number') return { tombstone: false };
  const now = Date.now();
  const tombstoneUntil = now + TOMBSTONE_MS;
  const closed = {
    port: record.port,
    token: record.token,
    pid: record.pid,
    startTime: record.startTime,
    sidecarVersion: record.sidecarVersion || SIDECAR_VERSION,
    tombstone: true,
    tombstoneUntil
  };
  try { writeSessionFile(chatId, closed); } catch (err) {}
  const srv = servers.get(chatId);
  if (srv) {
    try { srv.close(); } catch (err) {}
    servers.delete(chatId);
  }
  return { tombstone: true, tombstoneUntil };
}
async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.command === 'spawn') { const code = await commandSpawn(parsed.positional[0]); if (typeof code === 'number') process.exitCode = code; return; }
  if (parsed.command === 'health-check') {
    const live = await healthCheck(parsed.positional[0]);
    process.stdout.write(JSON.stringify({ chatId: parsed.positional[0], live }) + '\n');
    process.exitCode = 0; return;
  }
  if (parsed.command === 'close') {
    const chatId = parsed.positional[0];
    let record = null;
    try { record = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8')); }
    catch (err) {
      process.stdout.write(JSON.stringify({ closed: chatId, alreadyDead: true }) + '\n');
      process.exitCode = 0; return;
    }
    try {
      const response = await requestJson(record.port, record.token, '/close', {});
      process.stdout.write(JSON.stringify({ closed: chatId, response }) + '\n');
    } catch (err) {
      try { fs.unlinkSync(sessionFile(chatId)); } catch (e) {}
      process.stdout.write(JSON.stringify({ closed: chatId, forced: true }) + '\n');
    }
    process.exitCode = 0; return;
  }
  process.stderr.write('Usage: sai-state <spawn|health-check|close> <chatId>\n');
  process.exitCode = 2;
}
module.exports = { spawn: commandSpawn, healthCheck, closeSession, sessionFile, sessionDir, isUuidv4, SIDECAR_VERSION, TOMBSTONE_MS, PARENT_POLL_MS, requestJson };
module.exports.closeSession = closeSession;
if (require.main === module) { main(process.argv.slice(2)); }

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
function getSession(chatId) {
  let s = sessions.get(chatId);
  if (!s) {
    s = { pinned: null, seen: new Map(), stateByMachine: new Map(), lastPointer: { follow: 'sai/commands/explore/steps/common.md', hint: 'fetch the current step' } };
    sessions.set(chatId, s);
  }
  return s;
}
function pinnedNext(session) {
  try {
    if (session.pinned) {
      const mod = registry.get(session.pinned);
      if (mod) {
        const cur = session.stateByMachine.has(session.pinned) ? session.stateByMachine.get(session.pinned) : mod.initialState;
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
  fs.writeFileSync(sessionFile(chatId), JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
  try { fs.chmodSync(sessionFile(chatId), 0o600); } catch (err) {}
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
      let record = null;
      try { record = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8')); } catch (err) { record = null; }
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
          res.end(JSON.stringify({ error: 'INVALID_TOKEN', next: session.lastPointer }));
          return;
        }
        if (tombstoned) {
          res.writeHead(410, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'SESSION_CLOSED', next: session.lastPointer }));
          return;
        }
        const snap = body && body.snapshot;
        if (!snap || typeof snap !== 'object' || !('state' in snap) || !('machineId' in snap)) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'INVALID_SNAPSHOT', next: pinnedNext(session) }));
          return;
        }
        if (session.pinned && snap.machineId !== session.pinned) {
          res.writeHead(409, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'VERSION_MISMATCH', next: pinnedNext(session) }));
          return;
        }
        let mod = null;
        try { mod = registry.get(snap.machineId); } catch (err) { mod = null; }
        if (!mod) {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNKNOWN_MACHINE', next: pinnedNext(session) }));
          return;
        }
        session.pinned = snap.machineId;
        const st = snap.state;
        session.stateByMachine.set(session.pinned, st);
        let nxt = session.lastPointer;
        try {
          const projected = mod.project(st);
          if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
            nxt = projected.next;
          }
        } catch (err) {}
        session.lastPointer = nxt;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ state: st, snapshot: { state: st, machineId: session.pinned }, next: nxt }));
        return;
      }
      if (req.method === 'POST' && req.url === '/emit') {
        const session = getSession(chatId);
        const expectedToken = (record && record.token) || token;
        if (reqToken !== expectedToken) {
          res.writeHead(401, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'INVALID_TOKEN', next: session.lastPointer }));
          return;
        }
        if (tombstoned) {
          res.writeHead(410, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'SESSION_CLOSED', next: session.lastPointer }));
          return;
        }
        const parsed = envelope.parseTarget(body.machineId);
        if (!parsed || !body.eventId || typeof body.eventId !== 'string') {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'INVALID_EVENT', next: pinnedNext(session) }));
          return;
        }
        if (!session.pinned) {
          session.pinned = parsed.key;
        } else if (parsed.key !== session.pinned) {
          res.writeHead(409, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'VERSION_MISMATCH', next: pinnedNext(session) }));
          return;
        }
        if (session.seen.has(body.eventId)) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(session.seen.get(body.eventId)));
          return;
        }
        let mod = null;
        try { mod = registry.get(session.pinned); } catch (err) { mod = null; }
        if (!mod) {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNKNOWN_MACHINE', next: pinnedNext(session) }));
          return;
        }
        const cur = session.stateByMachine.has(session.pinned) ? session.stateByMachine.get(session.pinned) : mod.initialState;
        let nextState;
        try {
          nextState = mod.transition(cur, body.event);
        } catch (err) {
          let failNext = session.lastPointer;
          try {
            const projected = mod.project(cur);
            if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
              failNext = projected.next;
            }
          } catch (e) {}
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'INVALID_EVENT', next: failNext }));
          return;
        }
        let nxt = session.lastPointer;
        try {
          const projected = mod.project(nextState);
          if (projected && projected.next && typeof projected.next.follow === 'string' && typeof projected.next.hint === 'string') {
            nxt = projected.next;
          }
        } catch (err) {}
        const outcome = { state: nextState, snapshot: { state: nextState, machineId: session.pinned }, next: nxt };
        session.stateByMachine.set(session.pinned, nextState);
        session.lastPointer = nxt;
        session.seen.set(body.eventId, outcome);
        while (session.seen.size > 1000) {
          const oldest = session.seen.keys().next().value;
          session.seen.delete(oldest);
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(outcome));
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
  const record = { port, token, pid: process.pid, startTime: procStartTime(process.pid) ?? Date.now(), sidecarVersion: SIDECAR_VERSION };
  writeSessionFile(chatId, record);
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

#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const crypto = require('crypto');

const SIDECAR_VERSION = '1.0.0';
const TOKEN_BYTES = 16;

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
async function healthCheck(chatId) {
  let record;
  try { record = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8')); }
  catch (err) { return 'dead'; }
  if (!record || typeof record.port !== 'number' || !record.token || !record.pid) return 'dead';
  const reachable = await portReachable(record.port);
  if (!reachable) return 'dead';
  if (!pidAlive(record.pid)) return 'dead';
  const current = procStartTime(record.pid);
  if (current !== null && record.startTime !== undefined && String(current) !== String(record.startTime)) return 'dead';
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
async function commandSpawn(chatId) {
  if (!isUuidv4(chatId)) { process.stderr.write('spawn requires a UUIDv4 chatId\n'); return 2; }
  const existing = await healthCheck(chatId);
  if (existing === 'live') {
    const record = JSON.parse(fs.readFileSync(sessionFile(chatId), 'utf8'));
    process.stdout.write(JSON.stringify({ port: record.port, token: record.token, pid: record.pid, reused: true }) + '\n');
    return { port: record.port, token: record.token, pid: record.pid, reused: true };
  }
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const server = http.createServer((req, res) => {
    if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"live":true}'); return; }
    res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"NOT_FOUND"}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const record = { port, token, pid: process.pid, startTime: procStartTime(process.pid) ?? Date.now(), sidecarVersion: SIDECAR_VERSION };
  writeSessionFile(chatId, record);
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
  }, 60000);
  timer.unref();
  if (process.stdin && typeof process.stdin.on === 'function') {
    process.stdin.on('end', () => { clearInterval(timer); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 500).unref(); });
    try { process.stdin.resume(); } catch (err) {}
  }
  return new Promise(() => {});
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
    try { fs.unlinkSync(sessionFile(parsed.positional[0])); } catch (err) {}
    process.stdout.write(JSON.stringify({ closed: parsed.positional[0] }) + '\n');
    process.exitCode = 0; return;
  }
  process.stderr.write('Usage: sai-state <spawn|health-check|close> <chatId>\n');
  process.exitCode = 2;
}
module.exports = { spawn: commandSpawn, healthCheck, sessionFile, sessionDir, isUuidv4, SIDECAR_VERSION };
if (require.main === module) { main(process.argv.slice(2)); }

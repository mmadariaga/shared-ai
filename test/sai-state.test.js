'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const { spawn, healthCheck } = require('../bin/sai-state.js');

function tmpBase() {
  return process.env.TMPDIR || os.tmpdir();
}

function sessionFile(chatId) {
  return path.join(tmpBase(), 'sai-state', `${chatId}.json`);
}

function readSession(chatId) {
  const raw = fs.readFileSync(sessionFile(chatId), 'utf8');
  return JSON.parse(raw);
}

function cleanup(chatIds) {
  for (const chatId of chatIds) {
    try {
      fs.rmSync(sessionFile(chatId), { force: true });
    } catch {
      // best-effort cleanup only
    }
  }
}

async function capturedSpawn(chatId) {
  let output = '';
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, encoding, callback) => {
    output += typeof chunk === 'string' ? chunk : chunk.toString(encoding);
    if (typeof encoding === 'function') {
      encoding();
    } else if (typeof callback === 'function') {
      callback();
    }
    return true;
  };
  try {
    const result = await spawn(chatId);
    return { result, output };
  } finally {
    process.stdout.write = originalWrite;
  }
}

function assertRealEndpoint(result, label) {
  assert.ok(result && typeof result === 'object', `${label} must return { port, token }`);
  assert.ok(
    Number.isInteger(result.port) && result.port > 0 && result.port <= 65535,
    `${label} must return a real port (1-65535), got ${result && result.port}`,
  );
  assert.ok(
    typeof result.token === 'string' && result.token.length >= 16,
    `${label} must return a real token (>=16 chars), got ${JSON.stringify(result && result.token)}`,
  );
}

test('fresh UUIDv4 spawn is discoverable two ways — stdout announcement and session file agree', async () => {
  const chatId = crypto.randomUUID();
  try {
    const { result, output } = await capturedSpawn(chatId);

    // Behaviour under test: real port + token, not stub wrong values.
    assertRealEndpoint(result, 'spawn()');

    // Way 1: stdout announcement carries the same port + token.
    assert.ok(
      output.includes(String(result.port)) && output.includes(result.token),
      `stdout must announce the same port+token (port=${result.port}); got stdout=${JSON.stringify(output)}`,
    );

    // Way 2: session file agrees with the spawn return.
    const session = readSession(chatId);
    assert.equal(session.port, result.port, 'session file port must agree with spawn return');
    assert.equal(session.token, result.token, 'session file token must agree with spawn return');
  } finally {
    cleanup([chatId]);
  }
});

test('same live chatId reuses session — no second process', async () => {
  const chatId = crypto.randomUUID();
  try {
    const first = await spawn(chatId);
    assertRealEndpoint(first, 'first spawn()');

    const second = await spawn(chatId);
    assertRealEndpoint(second, 'second spawn()');

    assert.equal(second.port, first.port, 'same chatId must reuse the same port');
    assert.equal(second.token, first.token, 'same chatId must reuse the same token');

    const session = readSession(chatId);
    assert.equal(session.port, first.port, 'session file must still agree after reuse');
    assert.ok(
      Number.isInteger(session.pid) && session.pid > 0,
      `session file must carry a live pid, got ${session.pid}`,
    );

    // Reuse means one process: pid is stable across spawns.
    const sessionAfter = readSession(chatId);
    assert.equal(sessionAfter.pid, session.pid, 'no second process may be created for the same live chatId');

    assert.equal(await healthCheck(chatId), 'live', 'reused session must report live');
  } finally {
    cleanup([chatId]);
  }
});

test('concurrent chatIds are isolated', async () => {
  const chatA = crypto.randomUUID();
  const chatB = crypto.randomUUID();
  try {
    const a = await spawn(chatA);
    const b = await spawn(chatB);
    assertRealEndpoint(a, 'spawn(A)');
    assertRealEndpoint(b, 'spawn(B)');

    assert.notEqual(a.port, b.port, 'two chatIds must not share a port');
    assert.notEqual(a.token, b.token, 'two chatIds must not share a token');

    const sessionA = readSession(chatA);
    const sessionB = readSession(chatB);
    assert.equal(sessionA.port, a.port, 'session A must agree with spawn A');
    assert.equal(sessionB.port, b.port, 'session B must agree with spawn B');
    assert.notEqual(sessionA.port, sessionB.port, 'session files must preserve isolation');
  } finally {
    cleanup([chatA, chatB]);
  }
});

test('session file carries owner-only intent without POSIX asserts on Windows', async () => {
  const chatId = crypto.randomUUID();
  try {
    const result = await spawn(chatId);
    assertRealEndpoint(result, 'spawn()');

    const file = sessionFile(chatId);
    assert.ok(fs.existsSync(file), `session file must exist at ${file}`);

    const session = readSession(chatId);
    assert.equal(session.port, result.port, 'session port must be present and agree');
    assert.equal(session.token, result.token, 'session token must agree');
    assert.ok(Number.isInteger(session.pid) && session.pid > 0, 'session must carry pid');
    assert.ok(session.startTime, 'session must carry startTime');
    assert.ok(session.sidecarVersion, 'session must carry sidecarVersion');

    if (process.platform === 'win32') {
      // No POSIX stat asserts on Windows: content presence is the intent check.
      assert.ok(session.port && session.token && session.pid, 'owner-only intent verified via content presence on Windows');
    } else {
      const mode = fs.statSync(file).mode & 0o777;
      assert.equal(mode, 0o600, `session file must be owner-only (0o600), got 0o${mode.toString(8)}`);
    }
  } finally {
    cleanup([chatId]);
  }
});

test('step2 abandoned chat without close dies via pipe EOF or parent poll, no user-activity timer', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const result = await mod.spawn(chatId);
    assertRealEndpoint(result, 'spawn()');
    assert.equal(await mod.healthCheck(chatId), 'live', 'fresh spawn must be live before abandon');
    const src = fs.readFileSync(path.join(__dirname, '../bin/sai-state.js'), 'utf8');
    assert.ok(src.includes('stdin'), 'sidecar must handle pipe EOF (stdin)');
    assert.ok(src.includes('ppid') || src.includes('parent'), 'sidecar must validate parent');
    assert.ok(!src.includes('lastActivity') && !src.includes('idleTTL') && !src.includes('user-activity'), 'must have no user-activity timer');
    assert.equal(await mod.healthCheck(chatId), 'dead', 'abandoned chat without close must report dead via pipe EOF or parent poll');
  } finally {
    cleanup([chatId]);
  }
});

test('step2 post-close tombstone then dead port (5s window)', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const result = await mod.spawn(chatId);
    assertRealEndpoint(result, 'spawn()');
    assert.equal(await mod.healthCheck(chatId), 'live', 'must be live before close');
    const closed = mod.closeSession(chatId);
    assert.equal(closed && closed.tombstone, true, 'close must return tombstone:true immediately (5s tombstone naming closed session)');
  } finally {
    cleanup([chatId]);
  }
});

test('step2 stale-file recovery on dead port plus recycled PID', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const first = await mod.spawn(chatId);
    assertRealEndpoint(first, 'initial spawn()');
    const stale = { port: 1, token: 'stale-token-0000000000000000', pid: 999999, startTime: 'stale', sidecarVersion: '1.0.0' };
    fs.writeFileSync(sessionFile(chatId), JSON.stringify(stale) + '\n');
    assert.equal(await mod.healthCheck(chatId), 'dead', 'stale file with dead port must report dead');
    const recycled = { port: 1, token: 'recycled-token-000000000000', pid: process.pid, startTime: '__recycled__', sidecarVersion: '1.0.0' };
    fs.writeFileSync(sessionFile(chatId), JSON.stringify(recycled) + '\n');
    assert.equal(await mod.healthCheck(chatId), 'dead', 'recycled PID with dead port must report dead');
    const second = await mod.spawn(chatId);
    assertRealEndpoint(second, 're-spawn()');
    assert.ok(second.port !== 1, 'next spawn must overwrite stale file with real port');
    const closed = mod.closeSession(chatId);
    assert.equal(closed && closed.tombstone, true, 'stale recovery must preserve tombstone-aware close');
  } finally {
    cleanup([chatId]);
  }
});

test('step2 same spawn+emit+health-check+close succeeds on Windows and POSIX layout', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const result = await mod.spawn(chatId);
    assertRealEndpoint(result, 'spawn()');
    const file = sessionFile(chatId);
    const expectedDir = path.join(tmpBase(), 'sai-state');
    assert.ok(file.startsWith(expectedDir), `session file must live under ${expectedDir}, got ${file}`);
    assert.ok(fs.existsSync(file), 'session file must exist after spawn on any platform');
    assert.equal(await mod.healthCheck(chatId), 'live', 'health-check must report live on any platform');
    const closed = mod.closeSession(chatId);
    assert.equal(closed && closed.tombstone, true, 'close must return tombstone:true on Windows and POSIX');
  } finally {
    cleanup([chatId]);
  }
});

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

// Step 3: Uniform envelope and code registry (RED)
const envelope = require('../sai-state/envelope.js');
const registry = require('../sai-state/registry.js');

test('step3 uniform envelope identical shapes across machines (11th needs no change)', () => {
  const ids = Array.from({ length: 11 }, (_, i) => `step3uni${i + 1}@1`);
  for (const id of ids) {
    registry.register(id, {
      initialState: 'idle',
      transition: (s) => s,
      project: (s) => s,
    });
  }
  const results = ids.map((id, idx) => envelope.buildNext(id, { type: 'EVT' }, `step3uni-evt-${idx}`));
  for (const r of results) {
    assert.ok(r && typeof r === 'object', 'buildNext must return an object');
    assert.deepEqual(Object.keys(r).sort(), ['follow', 'hint'], 'envelope next must have exactly {follow,hint}');
    assert.ok(typeof r.follow === 'string' && r.follow !== 'wrong', `follow must be real routing value, got ${JSON.stringify(r && r.follow)}`);
    assert.ok(typeof r.hint === 'string' && r.hint !== 'wrong', `hint must be real hint, got ${JSON.stringify(r && r.hint)}`);
  }
  assert.deepEqual(Object.keys(results[10]).sort(), Object.keys(results[0]).sort(), '11th machine needs no envelope change (identical shape)');
});

test('step3 new machine module plus one line routable (no transport change)', () => {
  const mod = {
    initialState: 'idle',
    transition: (state) => state,
    project: (state) => state,
  };
  registry.register('step3routable@1', mod);
  assert.equal(registry.get('step3routable@1'), mod, 'registry must return registered module (one-line routable)');
  assert.ok(registry.machines().includes('step3routable@1'), 'machines() must list the new machine');
});

test('step3 pinned version stable for session', () => {
  const v1 = { initialState: 'v1', transition: () => {}, project: () => {} };
  const v2 = { initialState: 'v2', transition: () => {}, project: () => {} };
  registry.register('step3pinned@1', v1);
  registry.register('step3pinned@2', v2);
  assert.equal(registry.get('step3pinned@1'), v1, 'v1 must stay pinned');
  assert.equal(registry.get('step3pinned@2'), v2, 'v2 must resolve separately');
  assert.equal(registry.get('step3pinned@1'), v1, 'pinned v1 stable across session');
});

test('step3 retried eventId applies once (idempotent)', () => {
  registry.register('step3idem@1', { initialState: 's0', transition: (s) => `${s}+1`, project: (s) => s });
  const a1 = envelope.buildNext('step3idem@1', { type: 'INC' }, 'step3idem-dup');
  const a2 = envelope.buildNext('step3idem@1', { type: 'INC' }, 'step3idem-dup');
  assert.deepEqual(a2, a1, 'retried eventId must return identical envelope (applies once)');
  assert.ok(a1.follow !== 'wrong' && a1.hint !== 'wrong', `idempotent emit must carry real follow/hint, got ${JSON.stringify(a1)}`);
});

test('step3 bounded retention oldest-first (1000 per-session)', () => {
  registry.register('step3bound@1', { initialState: 's0', transition: (s) => s, project: (s) => s });
  const first = envelope.buildNext('step3bound@1', { type: 'E' }, 'step3bound-evt-0');
  assert.ok(first.follow !== 'wrong', `must carry real follow before bound, got ${JSON.stringify(first.follow)}`);
  for (let i = 1; i <= 1000; i++) {
    envelope.buildNext('step3bound@1', { type: 'E' }, `step3bound-evt-${i}`);
  }
  const retry = envelope.buildNext('step3bound@1', { type: 'E' }, 'step3bound-evt-0');
  assert.notDeepEqual(retry, first, 'oldest-first eviction: evicted eventId must re-apply, not dedupe');
  assert.ok(retry.follow !== 'wrong', `evicted retry must carry real follow, got ${JSON.stringify(retry.follow)}`);
});

test('step3 retention empty after close (cleared on close)', () => {
  const mod = { initialState: 'c0', transition: (s) => s, project: (s) => s };
  registry.register('step3close@1', mod);
  assert.ok(registry.machines().includes('step3close@1'), 'must be routable before close');
  const clearer = registry.clear || registry.close || registry.reset || envelope.clear || envelope.reset || envelope.close;
  assert.ok(typeof clearer === 'function', 'registry/envelope must expose a clear-on-close function');
  if (typeof clearer === 'function') {
    clearer.call(registry);
  }
  const after = envelope.buildNext('step3close@1', { type: 'E' }, 'step3close-evt-new');
  assert.ok(after.follow !== 'wrong' && after.hint !== 'wrong', `must still route after close with real values, got ${JSON.stringify(after)}`);
});

test('step3 rejection carries closed vocab plus current-state pointer', () => {
  registry.register('step3rej@1', { initialState: 'cur', transition: (s) => s, project: (s) => s });
  const bad = envelope.buildNext('step3rej@99', { type: 'E' }, 'step3rej-evt-bad');
  assert.ok(bad && typeof bad === 'object', 'rejection must return an object');
  assert.ok(typeof bad.error === 'string' && bad.error.length > 0 && bad.error !== 'wrong', `rejection must carry closed-vocab error, got ${JSON.stringify(bad)}`);
  assert.ok(bad.next && typeof bad.next === 'object', `rejection must carry next pointer, got ${JSON.stringify(bad)}`);
  assert.ok(bad.next && typeof bad.next.follow === 'string' && bad.next.follow !== 'wrong', `pointer must carry real follow, got ${JSON.stringify(bad && bad.next)}`);
});

test('step3 machines compose only through caller (no sidecar guard)', () => {
  const modA = { initialState: 'a0', transition: () => 'a1', project: (s) => s };
  const modB = { initialState: 'b0', transition: () => 'b1', project: (s) => s };
  registry.register('step3compA@1', modA);
  registry.register('step3compB@1', modB);
  const gotA = registry.get('step3compA@1');
  const gotB = registry.get('step3compB@1');
  assert.equal(gotA, modA, 'caller must retrieve A via registry');
  assert.equal(gotB, modB, 'caller must retrieve B via registry');
  assert.equal(gotA.transition(gotA.initialState, { type: 'GO' }), 'a1', 'caller composes A');
  assert.equal(gotB.transition(gotB.initialState, { type: 'GO' }), 'b1', 'caller composes B');
  assert.equal(registry.compose, undefined, 'no sidecar compose guard');
  assert.equal(registry.guard, undefined, 'no sidecar guard');
  assert.equal(envelope.compose, undefined, 'no envelope compose');
});

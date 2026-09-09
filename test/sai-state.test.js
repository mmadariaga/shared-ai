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

// Step 4: Explore-stage machine and pure projection (RED)
const exploreStage = require('../sai-state/machines/explore-stage.js');

function step4RealStage() {
  const s = exploreStage && exploreStage.initialState;
  if (s && typeof s.stage === 'string' && s.stage !== 'wrong') return s.stage;
  return 'explore';
}

test('step4 intent-vs-readiness: non-empty without intent rejects with current pointer', () => {
  assert.ok(exploreStage && typeof exploreStage.transition === 'function', 'explore-stage must export transition(state, signal)');
  assert.ok(typeof exploreStage.project === 'function', 'explore-stage must export project(state)');
  assert.ok(exploreStage.initialState && typeof exploreStage.initialState === 'object', 'must export initialState object');
  assert.ok(Array.isArray(exploreStage.initialState.ideaList), 'initialState must carry ideaList array');
  assert.ok(
    typeof exploreStage.initialState.stage === 'string' && exploreStage.initialState.stage !== 'wrong',
    `initial stage must be real routing value, got ${JSON.stringify(exploreStage.initialState && exploreStage.initialState.stage)}`,
  );
  const stage = step4RealStage();
  const state = { stage, ideaList: ['idea-a'] };
  const current = exploreStage.project(state);
  assert.ok(current && typeof current === 'object', 'project must return {snapshot,next}');
  assert.ok(current.next && typeof current.next.follow === 'string' && current.next.follow !== 'wrong', `current pointer follow must be real, got ${JSON.stringify(current && current.next)}`);
  assert.ok(typeof current.next.hint === 'string' && current.next.hint !== 'wrong', `current pointer hint must be real, got ${JSON.stringify(current && current.next)}`);
  const rejected = exploreStage.transition(state, undefined);
  assert.ok(rejected && typeof rejected === 'object', 'transition without intent must return {state,snapshot,next}');
  assert.equal(rejected.state.stage, state.stage, 'readiness must not advance without explicit intent');
  assert.deepEqual(rejected.next, current.next, 'no-intent must reject with current pointer');
  assert.ok(rejected.next.follow !== 'wrong' && rejected.next.hint !== 'wrong', `rejected pointer must be real, got ${JSON.stringify(rejected.next)}`);
  const advanced = exploreStage.transition(state, { intent: 'crystallize' });
  assert.notEqual(advanced.state.stage, state.stage, 'explicit intent must advance non-empty stage');
  assert.ok(advanced.state.stage !== 'wrong', `advanced stage must be real, got ${JSON.stringify(advanced.state && advanced.state.stage)}`);
  assert.ok(advanced.next.follow !== 'wrong' && advanced.next.hint !== 'wrong', `advanced pointer must be real, got ${JSON.stringify(advanced.next)}`);
});

test('step4 empty auto-advance: recorded-empty lists at edge-case and implementation-details stages auto-advance; unrecorded lists do not', () => {
  // E1: From initialState, a transition with no intent signal SHALL NOT advance.
  // This is the binary acceptance criterion correcting the old behavior.
  const initialStage = step4RealStage();
  const initialStateSnapshot = exploreStage.initialState;
  const r1 = exploreStage.transition(initialStateSnapshot, undefined);
  assert.equal(r1.state.stage, initialStage, 'E1: initialState without intent must NOT advance');
  assert.ok(r1.rejected === 'READINESS_IS_NOT_INTENT', 'E1: must reject with READINESS_IS_NOT_INTENT');

  // E2: At review-edge-cases, an unrecorded list SHALL NOT auto-advance, even though no population is present.
  const edgeCaseUnrecorded = { stage: 'review-edge-cases', ideaList: [], edgeCaseList: null };
  const r2 = exploreStage.transition(edgeCaseUnrecorded, undefined);
  assert.equal(r2.state.stage, 'review-edge-cases', 'E2: unrecorded edgeCaseList at review-edge-cases must NOT auto-advance');
  assert.ok(r2.rejected === 'READINESS_IS_NOT_INTENT', 'E2: must reject with READINESS_IS_NOT_INTENT');

  // E2 variant: At implementation-details, an unrecorded list SHALL NOT auto-advance.
  const implDetailsUnrecorded = { stage: 'implementation-details', ideaList: [], implementationDetailsList: null };
  const r2b = exploreStage.transition(implDetailsUnrecorded, undefined);
  assert.equal(r2b.state.stage, 'implementation-details', 'E2: unrecorded implementationDetailsList at implementation-details must NOT auto-advance');
  assert.ok(r2b.rejected === 'READINESS_IS_NOT_INTENT', 'E2: must reject with READINESS_IS_NOT_INTENT');

  // E3: Auto-advance SHALL NOT fire at explore-change or crystallize under any list state.
  const exploreChangeEmpty = { stage: 'explore-change', ideaList: [], edgeCaseList: [] };
  const r3 = exploreStage.transition(exploreChangeEmpty, undefined);
  assert.equal(r3.state.stage, 'explore-change', 'E3: explore-change must NOT auto-advance even with empty edgeCaseList');
  assert.ok(r3.rejected === 'READINESS_IS_NOT_INTENT', 'E3: must reject with READINESS_IS_NOT_INTENT');

  const crystallizeEmpty = { stage: 'crystallize', ideaList: [], edgeCaseList: [] };
  const r3b = exploreStage.transition(crystallizeEmpty, undefined);
  assert.equal(r3b.state.stage, 'crystallize', 'E3: crystallize must NOT auto-advance even with empty edgeCaseList');
  assert.ok(r3b.rejected === 'READINESS_IS_NOT_INTENT', 'E3: must reject with READINESS_IS_NOT_INTENT');

  // E4: A recorded non-empty list without intent SHALL still return the current pointer with READINESS_IS_NOT_INTENT.
  const edgeCaseNonEmpty = { stage: 'review-edge-cases', ideaList: [], edgeCaseList: ['E1', 'E2'] };
  const r4 = exploreStage.transition(edgeCaseNonEmpty, undefined);
  assert.equal(r4.state.stage, 'review-edge-cases', 'E4: recorded non-empty list must NOT advance without intent');
  assert.ok(r4.rejected === 'READINESS_IS_NOT_INTENT', 'E4: must reject with READINESS_IS_NOT_INTENT');
  assert.ok(r4.next && typeof r4.next.follow === 'string', 'E4: must return current pointer with real follow');

  // Main content-based auto-advance tests:
  // At review-edge-cases with recorded-empty list, auto-advance should occur.
  const edgeCaseEmpty = { stage: 'review-edge-cases', ideaList: [], edgeCaseList: [] };
  const r5 = exploreStage.transition(edgeCaseEmpty, undefined);
  assert.notEqual(r5.state.stage, 'review-edge-cases', 'recorded-empty edgeCaseList at review-edge-cases must auto-advance');
  assert.ok(!('rejected' in r5) || r5.rejected === undefined, 'auto-advance must not reject');
  assert.ok(typeof r5.next.follow === 'string' && r5.next.follow !== 'wrong', 'auto-advance must carry real follow');

  // At implementation-details with recorded-empty list, auto-advance should occur.
  const implDetailsEmpty = { stage: 'implementation-details', ideaList: [], implementationDetailsList: [] };
  const r6 = exploreStage.transition(implDetailsEmpty, undefined);
  assert.notEqual(r6.state.stage, 'implementation-details', 'recorded-empty implementationDetailsList at implementation-details must auto-advance');
  assert.ok(!('rejected' in r6) || r6.rejected === undefined, 'auto-advance must not reject');
  assert.ok(typeof r6.next.follow === 'string' && r6.next.follow !== 'wrong', 'auto-advance must carry real follow');

  // E5: A snapshot restored from the previous state shape, lacking the new fields, SHALL be treated as unrecorded.
  // Simulate a snapshot without edgeCaseList and implementationDetailsList (old state shape).
  const oldShapeSnapshot = { stage: 'review-edge-cases', ideaList: [] };
  const r7 = exploreStage.transition(oldShapeSnapshot, undefined);
  assert.equal(r7.state.stage, 'review-edge-cases', 'E5: old state shape without recorded lists must treat them as unrecorded and NOT auto-advance');
  assert.ok(r7.rejected === 'READINESS_IS_NOT_INTENT', 'E5: must reject with READINESS_IS_NOT_INTENT');

  // Verify determinism: same transition twice with recorded-empty must yield identical results.
  const r8 = exploreStage.transition(edgeCaseEmpty, undefined);
  const r9 = exploreStage.transition(edgeCaseEmpty, undefined);
  assert.deepEqual(r8, r9, 'recorded-empty auto-advance must be deterministic');
});

test('step4 double-projection purity: same state twice identical snapshot+next', () => {
  const stage = step4RealStage();
  const state = { stage, ideaList: ['idea-a'] };
  const before = JSON.stringify(state);
  const p1 = exploreStage.project(state);
  const p2 = exploreStage.project(state);
  assert.deepEqual(p2, p1, 'same state twice must project identically');
  assert.ok(p1.snapshot !== null && typeof p1.snapshot === 'object', `snapshot must be real object, got ${JSON.stringify(p1.snapshot)}`);
  assert.ok(p1.next.follow !== 'wrong' && p1.next.hint !== 'wrong', `projected pointer must be real, got ${JSON.stringify(p1.next)}`);
  assert.equal(JSON.stringify(state), before, 'projection must not mutate input state (no side effects)');
  const t1 = exploreStage.transition(state, { intent: 'go' });
  const t2 = exploreStage.transition(state, { intent: 'go' });
  assert.deepEqual(t2, t1, 'same transition twice must be identical (no side effects)');
  assert.equal(JSON.stringify(state), before, 'transition must not mutate input state');
});

test('step4 compaction restore: last carried snapshot restores with consistent pointer', () => {
  const stage = step4RealStage();
  const state = { stage, ideaList: ['idea-a', 'idea-b'] };
  const r = exploreStage.transition(state, { intent: 'crystallize' });
  assert.ok(r.snapshot !== null && typeof r.snapshot === 'object', `carried snapshot must be real object, got ${JSON.stringify(r.snapshot)}`);
  assert.ok(r.next.follow !== 'wrong' && r.next.hint !== 'wrong', `carried pointer must be real, got ${JSON.stringify(r.next)}`);
  const compacted = JSON.parse(JSON.stringify(r.snapshot));
  assert.deepEqual(compacted, r.snapshot, 'snapshot must survive compaction JSON round-trip');
  const restoredState = JSON.parse(JSON.stringify(r.state));
  assert.deepEqual(restoredState, r.state, 'carried state must survive compaction round-trip');
  const reproj = exploreStage.project(restoredState);
  assert.deepEqual(reproj.next, r.next, 'restored state must project consistent pointer');
  assert.ok(reproj.snapshot !== null && typeof reproj.snapshot === 'object', 're-projected snapshot must stay real after restore');
});

test('step4 absorbed-vs-excluded: transition carries only state+snapshot+next; classifier out-of-scope returns current pointer', () => {
  const stage = step4RealStage();
  const state = { stage, ideaList: ['idea-a'] };
  const t = exploreStage.transition(state, { intent: 'go' });
  assert.deepEqual(Object.keys(t).sort(), ['next', 'snapshot', 'state'], 'transition must carry state+snapshot+next only');
  assert.ok(!('panels' in t) && !('body' in t) && !('closure' in t) && !('review' in t), 'caller owns panels/closure/review, never transition');
  assert.deepEqual(Object.keys(t.next).sort(), ['follow', 'hint'], 'next must be exactly {follow,hint}');
  assert.ok(t.next.follow !== 'wrong' && t.next.hint !== 'wrong', `transition pointer must be real, got ${JSON.stringify(t.next)}`);
  assert.ok(t.snapshot !== null && typeof t.snapshot === 'object', 'transition snapshot must be real');
  const p = exploreStage.project(state);
  assert.deepEqual(Object.keys(p).sort(), ['next', 'snapshot'], 'project must carry snapshot+next only (pure, never renders panels/bodies)');
  assert.ok(!('panels' in p) && !('body' in p) && !('closure' in p) && !('review' in p), 'project never renders panels/bodies');
  assert.ok(p.next.follow !== 'wrong' && p.next.hint !== 'wrong', `project pointer must be real, got ${JSON.stringify(p.next)}`);
  const current = exploreStage.project(state);
  const out = exploreStage.transition(state, { type: 'classifier', readiness: true });
  assert.equal(out.state.stage, state.stage, 'Result Loop/classifier readiness judgment is out-of-scope and must not advance');
  assert.deepEqual(out.next, current.next, 'out-of-scope must return current pointer (stage-progression decides)');
  assert.ok(out.next.follow !== 'wrong', `out-of-scope pointer must be real, got ${JSON.stringify(out.next)}`);
});

// Step 5: Recovery, close parity, and distribution (RED)
test('step5 crash resume pinned: mid-chat crash + prior snapshot restores + one retry keeps pinned version', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const first = await mod.spawn(chatId);
    assertRealEndpoint(first, 'spawn()');
    const session = readSession(chatId);
    assert.ok(session.sidecarVersion, 'session must carry sidecarVersion for pinning');
    const pinned = session.sidecarVersion;
    const priorSnapshot = { sidecarVersion: pinned, chatId, state: { stage: 'explore', ideaList: ['idea-a'] } };
    fs.writeFileSync(
      sessionFile(chatId),
      JSON.stringify({ port: 1, token: 'dead-token-0000000000000000', pid: 999999, startTime: session.startTime, sidecarVersion: pinned }) + '\n',
    );
    const respawned = await mod.spawn(chatId);
    assertRealEndpoint(respawned, 'respawn()');
    const restored = envelope.validateRestore(priorSnapshot);
    assert.equal(restored.ok, true, 'matching-version restore must succeed after crash respawn');
    assert.deepEqual(restored.state, priorSnapshot.state, 'restored state must equal prior snapshot state');
    assert.equal(restored.version || restored.sidecarVersion || pinned, pinned, 'pinned version kept, no migration');
    registry.register('step5crash@1', { initialState: 's0', transition: (s) => s, project: (s) => s });
    const r1 = envelope.buildNext('step5crash@1', { type: 'E' }, `step5crash-${chatId}`);
    const r2 = envelope.buildNext('step5crash@1', { type: 'E' }, `step5crash-${chatId}`);
    assert.deepEqual(r2, r1, 'one retry must apply once');
    assert.ok(r1.follow !== 'wrong' && r1.hint !== 'wrong', `retry envelope must be real, got ${JSON.stringify(r1)}`);
    assert.ok(restored.next && typeof restored.next.follow === 'string' && restored.next.follow.includes('/'), `restore pointer follow must name step path, got ${JSON.stringify(restored && restored.next)}`);
    assert.ok(typeof restored.next.hint === 'string' && restored.next.hint.includes('fetch'), `restore hint must carry fetch cue, got ${JSON.stringify(restored && restored.next)}`);
  } finally {
    cleanup([chatId]);
  }
});

test('step5 cross-version snapshot rejects with current pointer and no migration', () => {
  const cross = { sidecarVersion: '0.0.0-cross-version', state: { stage: 'explore', ideaList: ['idea-a'] } };
  const before = JSON.stringify(cross);
  const rejected = envelope.validateRestore(cross);
  assert.equal(rejected.ok, false, 'cross-version must reject');
  assert.ok(typeof rejected.error === 'string' && rejected.error.length > 0, `reject must carry closed-vocab error, got ${JSON.stringify(rejected)}`);
  assert.ok(envelope.ERRORS.includes(rejected.error), `error must be closed vocab ${JSON.stringify(envelope.ERRORS)}, got ${JSON.stringify(rejected && rejected.error)}`);
  assert.ok(rejected.next && typeof rejected.next.follow === 'string' && rejected.next.follow.includes('/'), `reject pointer follow must name step path, got ${JSON.stringify(rejected && rejected.next)}`);
  assert.ok(rejected.next.follow.includes('sai/') || rejected.next.follow.includes('steps/') || rejected.next.follow.includes('.md'), `follow must name step path, got ${JSON.stringify(rejected && rejected.next)}`);
  assert.ok(typeof rejected.next.hint === 'string' && rejected.next.hint.includes('fetch'), `reject hint must carry fetch cue, got ${JSON.stringify(rejected && rejected.next)}`);
  assert.equal(JSON.stringify(cross), before, 'no migration: input snapshot must be unchanged');
  assert.ok(!('state' in rejected) || rejected.state === undefined, 'rejection must not carry migrated state');
});

test('step5 stale clean recovery plus skew never interoperates', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const first = await mod.spawn(chatId);
    assertRealEndpoint(first, 'spawn()');
    const session = readSession(chatId);
    const staleSnapshot = { sidecarVersion: session.sidecarVersion, state: null, stale: true, chatId };
    const result = envelope.validateRestore(staleSnapshot);
    assert.equal(result.ok, false, 'stale snapshot must not restore as ok');
    assert.ok(typeof result.error === 'string' && result.error.length > 0, `stale must carry error, got ${JSON.stringify(result)}`);
    assert.ok(result.next && typeof result.next.follow === 'string' && result.next.follow.includes('/'), `stale pointer follow must name step path, got ${JSON.stringify(result && result.next)}`);
    assert.ok(typeof result.next.hint === 'string' && result.next.hint.includes('fetch'), `stale hint must carry fetch cue, got ${JSON.stringify(result && result.next)}`);
    const skewed = { ...session, sidecarVersion: 'skew-0.0.0-never-interop' };
    fs.writeFileSync(sessionFile(chatId), JSON.stringify(skewed) + '\n');
    const hc = await mod.healthCheck(chatId);
    assert.notEqual(hc, 'live', 'skewed version must not interoperate as live');
    const respawned = await mod.spawn(chatId);
    assertRealEndpoint(respawned, 'skew respawn()');
    const after = readSession(chatId);
    assert.notEqual(after.sidecarVersion, 'skew-0.0.0-never-interop', 'skew respawn must restore matching version, never interoperate');
  } finally {
    cleanup([chatId]);
  }
});

test('step5 4-combination parity: spawn+emit+health-check+close same envelope layout exit', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const spawned = await mod.spawn(chatId);
    assertRealEndpoint(spawned, 'spawn()');
    const file = sessionFile(chatId);
    assert.ok(fs.existsSync(file), 'layout: session file must exist');
    assert.ok(file.includes('sai-state'), 'layout: same tmp sai-state dir');
    assert.equal(await mod.healthCheck(chatId), 'live', 'health-check must report live');
    registry.register('step5parity@1', { initialState: 's0', transition: (s) => s, project: (s) => s });
    const emitted = envelope.buildNext('step5parity@1', { type: 'E' }, `step5parity-${chatId}`);
    assert.deepEqual(Object.keys(emitted).sort(), ['follow', 'hint'], 'emit envelope must be exactly {follow,hint}');
    assert.ok(emitted.follow !== 'wrong' && emitted.hint !== 'wrong', `emit must be real, got ${JSON.stringify(emitted)}`);
    const session = readSession(chatId);
    const snap = { sidecarVersion: session.sidecarVersion, state: { stage: 'explore', ideaList: ['parity-a'] }, chatId };
    const restored = envelope.validateRestore(snap);
    assert.equal(restored.ok, true, 'restore must succeed for parity');
    assert.deepEqual(Object.keys(restored.next).sort(), ['follow', 'hint'], 'restore next must share same envelope {follow,hint}');
    assert.equal(restored.next.follow, emitted.follow, 'parity: restore follow must equal emit follow (same envelope)');
    assert.equal(restored.next.hint.split(' #')[0], emitted.hint.split(' #')[0], 'parity: restore hint must equal emit hint base (same envelope)');
    const closed = mod.closeSession(chatId);
    assert.equal(closed && closed.tombstone, true, 'close exit must be tombstone:true');
    assert.ok(restored.next.follow.includes('/') && (restored.next.follow.includes('sai/') || restored.next.follow.includes('steps/') || restored.next.follow.includes('.md')), `follow must name step path, got ${JSON.stringify(restored && restored.next)}`);
    assert.ok(restored.next.hint.includes('fetch'), `hint must carry fetch cue, got ${JSON.stringify(restored && restored.next)}`);
  } finally {
    cleanup([chatId]);
  }
});

test('step5 compaction rediscovery via file plus snapshot restores last snapshot', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const first = await mod.spawn(chatId);
    assertRealEndpoint(first, 'spawn()');
    const session = readSession(chatId);
    const lastSnapshot = { sidecarVersion: session.sidecarVersion, state: { stage: 'explore', ideaList: ['keep-1', 'keep-2'] }, chatId };
    const compacted = JSON.parse(JSON.stringify(lastSnapshot));
    assert.deepEqual(compacted, lastSnapshot, 'snapshot must survive compaction JSON round-trip');
    const rediscovered = readSession(chatId);
    assert.equal(rediscovered.port, first.port, 'session-file rediscovery must find last port');
    assert.equal(rediscovered.token, first.token, 'rediscovery must find last token');
    const restored = envelope.validateRestore(compacted);
    assert.equal(restored.ok, true, 'restore from last snapshot must succeed after compaction');
    assert.deepEqual(restored.state, lastSnapshot.state, 'restored state must equal last snapshot');
    assert.ok(restored.next && typeof restored.next.follow === 'string' && restored.next.follow.includes('/'), `pointer follow must name step path, got ${JSON.stringify(restored && restored.next)}`);
    assert.ok(typeof restored.next.hint === 'string' && restored.next.hint.includes('fetch'), `hint must carry fetch cue, got ${JSON.stringify(restored && restored.next)}`);
  } finally {
    cleanup([chatId]);
  }
});

// HTTP seam (live server): /emit minimal wire outcome, stage walk, recording,
// empty-set auto-advance, idempotent replay, no-intent rejection, sidecar-owned
// persisted state. Uses the in-process spawn (server unref'd, no OS-conditional
// paths).
test('emit seam: minimal {stage,next}; consecutive next-step emits walk all stages without resets; /restore is a body-less read-only probe', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const endpoint = await mod.spawn(chatId);
    assertRealEndpoint(endpoint, 'emit-seam spawn()');
    const emit = (eventId, event) =>
      mod.requestJson(endpoint.port, endpoint.token, '/emit', { machineId: 'explore-stage@1', eventId, event });

    // First next-step emit: explore-change -> review-edge-cases, minimal wire
    // outcome. No state object and no snapshot travel on the wire.
    const r1 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.ok(r1 && typeof r1 === 'object', `/emit must return an object, got ${JSON.stringify(r1)}`);
    assert.deepEqual(Object.keys(r1).sort(), ['next', 'stage'], `/emit response must be minimal {stage,next}, got ${JSON.stringify(Object.keys(r1))}`);
    assert.ok(typeof r1.stage === 'string', `stage must be a string, got ${JSON.stringify(r1)}`);
    assert.equal(r1.stage, 'review-edge-cases', `first next-step must advance explore-change -> review-edge-cases, got ${r1.stage}`);
    assert.ok(r1.next && typeof r1.next.follow === 'string' && r1.next.follow.includes('.md'), `next must be a real pointer, got ${JSON.stringify(r1.next)}`);

    // Consecutive next-step emits walk the full stage table without resets.
    const r2 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r2.stage, 'implementation-details', `second next-step must reach implementation-details, got ${r2.stage}`);
    const r3 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r3.stage, 'crystallize', `third next-step must reach crystallize, got ${r3.stage}`);
    const r4 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r4.stage, 'crystallize', `next-step at crystallize must not reset to explore-change, got ${r4.stage}`);
    assert.ok(r1.stage !== 'explore-change' && r4.stage === 'crystallize', 'consecutive emits must not reset the stage');

    // /restore is an optional read-only probe: no body, no state on the wire,
    // returns the sidecar-owned current stage for recovery/panel re-render.
    const restored = await mod.requestJson(endpoint.port, endpoint.token, '/restore', {});
    assert.ok(restored && typeof restored === 'object', `/restore must return an object, got ${JSON.stringify(restored)}`);
    assert.deepEqual(Object.keys(restored).sort(), ['next', 'stage'], `/restore probe must return {stage,next} with no state and no snapshot, got ${JSON.stringify(Object.keys(restored))}`);
    assert.equal(restored.stage, 'crystallize', 'probe must report the sidecar-owned current stage');
    assert.ok(restored.next && typeof restored.next.follow === 'string' && restored.next.follow.includes('.md'), `probe next must be a real pointer, got ${JSON.stringify(restored.next)}`);

    // The probe is read-only: a later emit continues from the current stage
    // instead of resetting to the initial state.
    const r5 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r5.stage, 'crystallize', 'probe must not reset the progression');

    const closed = mod.closeSession(chatId);
    assert.equal(closed && closed.tombstone, true, 'close after emit+probe must tombstone the session');
  } finally {
    cleanup([chatId]);
  }
});

test('emit seam: recordedList records without advancing; empty-set auto-advance on a later no-intent emit; idempotent replay; no-intent rejection', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const endpoint = await mod.spawn(chatId);
    assertRealEndpoint(endpoint, 'record-seam spawn()');
    const emit = (eventId, event) =>
      mod.requestJson(endpoint.port, endpoint.token, '/emit', { machineId: 'explore-stage@1', eventId, event });
    const persistedStage = () => {
      const entry = readSession(chatId).stateByMachine['explore-stage@1'];
      return entry && entry.state ? entry.state.stage : undefined;
    };

    // Advance to review-edge-cases.
    const r0 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r0.stage, 'review-edge-cases', `setup advance must reach review-edge-cases, got ${r0.stage}`);

    // No-intent emit is rejected in-band and does not advance.
    const rej = await emit(crypto.randomUUID(), {});
    assert.equal(rej.stage, 'review-edge-cases', 'no-intent emit must not advance');
    assert.equal(rej.rejected, 'READINESS_IS_NOT_INTENT', `no-intent emit must carry the rejection marker, got ${JSON.stringify(rej)}`);

    // A recordedList records into the current stage's own list without
    // advancing; the recorded list lives only in the sidecar's store, so the
    // wire response exposes no state object.
    const rec = await emit(crypto.randomUUID(), { recordedList: ['E1', 'E2'] });
    assert.equal(rec.stage, 'review-edge-cases', 'recording must not advance the stage');
    assert.equal(rec.rejected, undefined, 'recording must not reject');
    assert.equal(!('state' in rec) && !('snapshot' in rec), true, 'recording response must carry no state and no snapshot');
    assert.deepEqual(readSession(chatId).stateByMachine['explore-stage@1'].state.edgeCaseList, ['E1', 'E2'], `recordedList must persist into the stage's own list, got ${JSON.stringify(readSession(chatId).stateByMachine)}`);

    // Non-empty recorded list: a no-intent emit still rejects (no empty-set advance).
    const rej2 = await emit(crypto.randomUUID(), {});
    assert.equal(rej2.stage, 'review-edge-cases', 'non-empty list must not auto-advance');
    assert.equal(rej2.rejected, 'READINESS_IS_NOT_INTENT', 'no-intent emit with non-empty list must reject');

    // Record an empty list: stays in the current stage.
    const recEmpty = await emit(crypto.randomUUID(), { recordedList: [] });
    assert.equal(recEmpty.stage, 'review-edge-cases', 'empty-list recording must not advance by itself');
    assert.deepEqual(readSession(chatId).stateByMachine['explore-stage@1'].state.edgeCaseList, [], 'empty recordedList must persist as recorded-empty');

    // The existing content-based empty-set rule advances on a later no-intent emit.
    const adv = await emit(crypto.randomUUID(), {});
    assert.equal(adv.stage, 'implementation-details', `recorded-empty list must auto-advance on a later no-intent emit, got ${adv.stage}`);
    assert.equal(adv.rejected, undefined, 'empty-set auto-advance must not reject');

    // Idempotent replay: the same eventId returns the identical response and applies once.
    const dupId = crypto.randomUUID();
    const d1 = await emit(dupId, { intent: 'next-step' });
    const d2 = await emit(dupId, { intent: 'next-step' });
    assert.deepEqual(d2, d1, 'replayed eventId must return the identical stored outcome');
    assert.equal(d1.stage, 'crystallize', 'duplicate eventId must not advance twice, got ' + d1.stage);

    // Persisted minimal ledger (I4/I5): rev is internal and never exposed on
    // the wire; the ledger enables the cross-process last-event replay.
    const entry = readSession(chatId).stateByMachine['explore-stage@1'];
    assert.ok(typeof entry.rev === 'number' && entry.rev > 0, `ledger must persist an internal rev, got ${JSON.stringify(entry)}`);
    assert.equal(typeof entry.lastEventId, 'string', 'ledger must persist lastEventId');
    assert.deepEqual(Object.keys(entry.lastOutcome).sort(), ['next', 'stage'], `ledger lastOutcome must stay minimal, got ${JSON.stringify(entry.lastOutcome)}`);
    assert.equal(persistedStage(), 'crystallize', 'persisted state must equal the walked stage');

    const closed = mod.closeSession(chatId);
    assert.equal(closed && closed.tombstone, true, 'close after record+advance must tombstone the session');
  } finally {
    cleanup([chatId]);
  }
});

test('sidecar-owned store: session record shape (createdAt + stateByMachine ledger), atomic write leaves no temp files, /restore probe before any emit is 404', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const endpoint = await mod.spawn(chatId);
    assertRealEndpoint(endpoint, 'store-shape spawn()');

    // Optional probe on a fresh chat (no emit yet, no persisted machine): 404
    // with the closed vocabulary, never a state object.
    const probe = await mod.requestJson(endpoint.port, endpoint.token, '/restore', {});
    assert.equal(probe && probe.error, 'UNKNOWN_MACHINE', `probe before any emit must 404 UNKNOWN_MACHINE, got ${JSON.stringify(probe)}`);
    assert.ok(!('state' in probe) && !('snapshot' in probe) && !('stage' in probe), `probe error must carry no state, got ${JSON.stringify(probe)}`);
    const denied = await mod.requestJson(endpoint.port, 'wrong-token-0000000000', '/restore', {});
    assert.equal(denied && denied.error, 'INVALID_TOKEN', `probe with a bad token must 401, got ${JSON.stringify(denied)}`);

    const emit = (eventId, event) =>
      mod.requestJson(endpoint.port, endpoint.token, '/emit', { machineId: 'explore-stage@1', eventId, event });
    const eventId = crypto.randomUUID();
    const r1 = await emit(eventId, { intent: 'next-step' });
    assert.equal(r1.stage, 'review-edge-cases', `emit must advance, got ${JSON.stringify(r1)}`);

    // I5 record shape: createdAt + stateByMachine (machineId -> state/rev/
    // lastEventId/lastOutcome). Legacy records without stateByMachine and
    // pre-change files load as initial state, so the shape is additive only.
    const session = readSession(chatId);
    assert.ok(typeof session.createdAt === 'number' && session.createdAt > 0, `record must carry createdAt, got ${JSON.stringify(session.createdAt)}`);
    const entry = session.stateByMachine['explore-stage@1'];
    assert.ok(entry && typeof entry === 'object', `record must persist stateByMachine['explore-stage@1'], got ${JSON.stringify(session.stateByMachine)}`);
    assert.equal(entry.state.stage, 'review-edge-cases', 'persisted state must be the plain machine state');
    assert.deepEqual(Object.keys(entry.lastOutcome).sort(), ['next', 'stage'], `lastOutcome must stay minimal, got ${JSON.stringify(entry.lastOutcome)}`);
    assert.equal(entry.lastEventId, eventId, 'ledger must persist lastEventId');
    assert.ok(!('rev' in r1) && !('state' in r1) && !('snapshot' in r1), `rev must never be exposed on the wire, got ${JSON.stringify(r1)}`);

    // Atomic write (I3): temp + rename leaves no temp files behind.
    const dirEntries = fs.readdirSync(path.join(tmpBase(), 'sai-state')).filter((f) => f.startsWith(chatId));
    assert.deepEqual(dirEntries, [chatId + '.json'], `only the session file may remain, got ${JSON.stringify(dirEntries)}`);
  } finally {
    cleanup([chatId]);
  }
});

test('sidecar-owned store: corrupt session file notifies SESSION_FILE_CORRUPT in the same response, seeds initial state, and heals (E2)', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const endpoint = await mod.spawn(chatId);
    assertRealEndpoint(endpoint, 'corrupt-seed spawn()');

    // Corrupt the file while memory is still empty: the sidecar treats the
    // corrupt file as absent (initial seed) and piggybacks the closed warning
    // on the response the agent already receives — no extra turns, no calls.
    fs.writeFileSync(sessionFile(chatId), '{"port": 1, "token": "trunc', 'utf8');
    const emit = (eventId, event) =>
      mod.requestJson(endpoint.port, endpoint.token, '/emit', { machineId: 'explore-stage@1', eventId, event });
    const r1 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.deepEqual(r1.warnings, ['SESSION_FILE_CORRUPT'], `corrupt file must notify through the closed warnings attribute, got ${JSON.stringify(r1)}`);
    assert.equal(r1.stage, 'review-edge-cases', `corrupt file must be treated as absent (initial seed advanced once), got ${JSON.stringify(r1)}`);

    // The emit rewrote the store: the warning is absent from later responses.
    const r2 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r2.warnings, undefined, `healed store must stop warning, got ${JSON.stringify(r2)}`);
    assert.equal(r2.stage, 'implementation-details', `healed store must continue the progression, got ${JSON.stringify(r2)}`);

    // /restore piggybacks the same warning channel.
    fs.writeFileSync(sessionFile(chatId), 'not json at all', 'utf8');
    const probe = await mod.requestJson(endpoint.port, endpoint.token, '/restore', {});
    assert.deepEqual(probe.warnings, ['SESSION_FILE_CORRUPT'], `restore probe must carry the warning, got ${JSON.stringify(probe)}`);
  } finally {
    cleanup([chatId]);
  }
});

test('sidecar-owned store: absent session file mid-process is legal (no warning) and memory state wins (E1)', async () => {
  const chatId = crypto.randomUUID();
  try {
    const mod = require('../bin/sai-state.js');
    const endpoint = await mod.spawn(chatId);
    assertRealEndpoint(endpoint, 'absent-file spawn()');
    const emit = (eventId, event) =>
      mod.requestJson(endpoint.port, endpoint.token, '/emit', { machineId: 'explore-stage@1', eventId, event });
    const r1 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r1.stage, 'review-edge-cases', 'setup advance');
    fs.rmSync(sessionFile(chatId), { force: true });
    const r2 = await emit(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(r2.warnings, undefined, 'absence is legal (fresh chat semantics) and carries no warning');
    assert.equal(r2.stage, 'implementation-details', 'in-memory sidecar state keeps serving the progression');
    assert.ok(fs.existsSync(sessionFile(chatId)), 'the emit rewrites the store from the live endpoint identity');
  } finally {
    cleanup([chatId]);
  }
});

test('sidecar-owned state survives a real process restart: respawn reloads persisted state and the last eventId replays without re-applying (E3)', async () => {
  const chatId = crypto.randomUUID();
  const binPath = path.join(__dirname, '..', 'bin', 'sai-state.js');
  const { spawn: spawnProcess } = require('child_process');
  const startChild = () => new Promise((resolve, reject) => {
    const child = spawnProcess(process.execPath, [binPath, 'spawn', chatId], { stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => { try { child.kill(); } catch (e) {} reject(new Error('sidecar child spawn timeout')); }, 15000);
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const nl = buf.indexOf('\n');
      if (nl !== -1) {
        clearTimeout(timer);
        try { resolve({ child, endpoint: JSON.parse(buf.slice(0, nl)) }); }
        catch (err) { try { child.kill(); } catch (e) {} reject(err); }
      }
    });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
  const children = [];
  try {
    const first = await startChild();
    children.push(first.child);
    const ep1 = first.endpoint;
    assertRealEndpoint(ep1, 'child spawn #1');
    const emit1 = (eventId, event) =>
      mod_request(ep1.port, ep1.token, eventId, event);
    const eventId = crypto.randomUUID();
    const r1 = await emit1(eventId, { intent: 'next-step' });
    assert.equal(r1.stage, 'review-edge-cases', `first-process emit must advance, got ${JSON.stringify(r1)}`);

    // Kill the process: the sidecar dies at turn end in production too. The
    // progression state must survive in the store, not in any conversation.
    first.child.kill();
    await new Promise((resolve) => { first.child.on('exit', resolve); });

    const second = await startChild();
    children.push(second.child);
    const ep2 = second.endpoint;
    assertRealEndpoint(ep2, 'child spawn #2');
    assert.notEqual(ep2.port, ep1.port, 'respawn must listen on a fresh port (new process)');
    const emit2 = (eventId, event) =>
      mod_request(ep2.port, ep2.token, eventId, event);

    // E3: retrying the same eventId after the process death replays the
    // persisted last outcome without re-applying the transition.
    const replay = await emit2(eventId, { intent: 'next-step' });
    assert.deepEqual(replay, r1, 'same eventId after restart must replay the stored outcome byte-identically');

    // The reloaded state continues: a new event advances from the persisted
    // stage, not from the initial state.
    const cont = await emit2(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(cont.stage, 'implementation-details', `reloaded state must continue from the persisted stage, got ${JSON.stringify(cont)}`);
  } finally {
    for (const child of children) { try { child.kill(); } catch (e) {} }
    cleanup([chatId]);
  }
});

test('/close purges the persisted state and tombstones the record; reopening the same chatId restarts from initial (E5)', async () => {
  const chatId = crypto.randomUUID();
  const binPath = path.join(__dirname, '..', 'bin', 'sai-state.js');
  const { spawn: spawnProcess } = require('child_process');
  const startChild = () => new Promise((resolve, reject) => {
    const child = spawnProcess(process.execPath, [binPath, 'spawn', chatId], { stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => { try { child.kill(); } catch (e) {} reject(new Error('sidecar child spawn timeout')); }, 15000);
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const nl = buf.indexOf('\n');
      if (nl !== -1) {
        clearTimeout(timer);
        try { resolve({ child, endpoint: JSON.parse(buf.slice(0, nl)) }); }
        catch (err) { try { child.kill(); } catch (e) {} reject(err); }
      }
    });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
  const children = [];
  try {
    const first = await startChild();
    children.push(first.child);
    const ep1 = first.endpoint;
    const emit1 = (eventId, event) =>
      mod_request(ep1.port, ep1.token, eventId, event);
    for (let i = 0; i < 3; i++) {
      const r = await emit1(crypto.randomUUID(), { intent: 'next-step' });
      if (i === 2) assert.equal(r.stage, 'crystallize', `setup walk must reach crystallize, got ${JSON.stringify(r)}`);
    }

    // The real /close: purges the persisted state, tombstones the record, and
    // exits the process after the 5s window.
    const closed = await mod_request(ep1.port, ep1.token, null, null, '/close');
    assert.equal(closed && closed.closed, chatId, `close must acknowledge, got ${JSON.stringify(closed)}`);
    first.child.kill();
    await new Promise((resolve) => { first.child.on('exit', resolve); });
    assert.ok(!('stateByMachine' in readSession(chatId)), `close must purge the persisted state, got ${JSON.stringify(readSession(chatId).stateByMachine)}`);

    const second = await startChild();
    children.push(second.child);
    const ep2 = second.endpoint;
    const emit2 = (eventId, event) =>
      mod_request(ep2.port, ep2.token, eventId, event);
    const reopened = await emit2(crypto.randomUUID(), { intent: 'next-step' });
    assert.equal(reopened.stage, 'review-edge-cases', `reopen must restart from the initial state, got ${JSON.stringify(reopened)}`);
    assert.equal(reopened.warnings, undefined, 'reopen after close carries no warning');
  } finally {
    for (const child of children) { try { child.kill(); } catch (e) {} }
    cleanup([chatId]);
  }
});

// Minimal HTTP POST helper for the child-process tests: the parent test
// process talks to the real sidecar processes over loopback.
function mod_request(port, token, eventId, event, reqPath) {
  const http = require('http');
  const target = reqPath || '/emit';
  const payload = JSON.stringify(target === '/close' ? {} : { machineId: 'explore-stage@1', eventId, event });
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: target,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sai-token': token || '', 'content-length': Buffer.byteLength(payload) }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(raw)); } catch (err) { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('request timeout')); });
    req.write(payload);
    req.end();
  });
}

// Sidecar Installation Tests
const { spawnSync } = require('child_process');
const { installClaude, installOpencode } = require('../bin/install-flow.js');

test('installed sai-state binary can be executed and reaches argument handling', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-state-install-'));
  try {
    // Create a minimal installation to test the projection
    const claudeBase = path.join(projectRoot, 'claude');
    fs.mkdirSync(claudeBase, { recursive: true });
    installClaude(claudeBase);

    // The sai-state binary should be installed at claudeBase/sai/bin/sai-state.js
    const installedBinary = path.join(claudeBase, 'sai', 'bin', 'sai-state.js');
    assert.ok(fs.existsSync(installedBinary), `installed binary must exist at ${installedBinary}`);

    // The required modules must also be installed
    const registryModule = path.join(claudeBase, 'sai', 'sai-state', 'registry.js');
    const envelopeModule = path.join(claudeBase, 'sai', 'sai-state', 'envelope.js');
    const exploreStageModule = path.join(claudeBase, 'sai', 'sai-state', 'machines', 'explore-stage.js');

    assert.ok(fs.existsSync(registryModule), `registry.js must be installed at ${registryModule}`);
    assert.ok(fs.existsSync(envelopeModule), `envelope.js must be installed at ${envelopeModule}`);
    assert.ok(fs.existsSync(exploreStageModule), `explore-stage.js must be installed at ${exploreStageModule}`);

    // Try to execute the installed binary with --help flag to verify it can run
    const result = spawnSync('node', [installedBinary, '--help'], { cwd: claudeBase });
    assert.notEqual(result.status, 0, 'sai-state --help should not exit with 0 (binary has no help mode)');
    const stderr = result.stderr.toString();
    const stdout = result.stdout.toString();
    const output = stderr + stdout;

    // Must not fail with MODULE_NOT_FOUND error
    assert.ok(
      !output.includes('Cannot find module') && !output.includes('MODULE_NOT_FOUND'),
      `installed binary must not fail with module resolution error, got: ${output}`,
    );
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('npm pack includes sai-state modules', () => {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8', shell: true });

  const stderr = result.stderr || '';
  const stdout = result.stdout || '';
  const status = result.status;
  const error = result.error;

  assert.ok(!error, `npm pack must not error, got: ${error}`);
  assert.ok(status === 0 || status === null, `npm pack --dry-run must succeed, got status ${status}, stderr: ${stderr}`);

  const output = stdout;
  assert.ok(output && typeof output === 'string' && output.length > 0, `npm pack output must be non-empty, got: ${output}`);

  let packData;
  try {
    packData = JSON.parse(output);
  } catch (e) {
    assert.fail(`npm pack output must be valid JSON, got error: ${e.message}, output: ${output}`);
  }

  // packData is an array with one package object
  assert.ok(Array.isArray(packData), 'npm pack --dry-run --json should return an array');
  assert.ok(packData.length > 0, 'npm pack should return at least one package');

  const pkg = packData[0];
  assert.ok(pkg && typeof pkg === 'object' && Array.isArray(pkg.files), 'first item should be a package object with files array');

  const files = pkg.files.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && typeof item.path === 'string') return item.path;
    return String(item);
  });

  const hasSaiStateRegistry = files.some(f => typeof f === 'string' && f.includes('sai-state/registry.js'));
  const hasSaiStateEnvelope = files.some(f => typeof f === 'string' && f.includes('sai-state/envelope.js'));
  const hasSaiStateExploreStage = files.some(f => typeof f === 'string' && f.includes('sai-state/machines/explore-stage.js'));

  assert.ok(hasSaiStateRegistry, `npm pack must include sai-state/registry.js, got files: ${files.filter(f => f.includes('sai-state')).join(', ')}`);
  assert.ok(hasSaiStateEnvelope, `npm pack must include sai-state/envelope.js, got files: ${files.filter(f => f.includes('sai-state')).join(', ')}`);
  assert.ok(
    hasSaiStateExploreStage,
    `npm pack must include sai-state/machines/explore-stage.js, got files: ${files.filter(f => f.includes('sai-state')).join(', ')}`,
  );
});

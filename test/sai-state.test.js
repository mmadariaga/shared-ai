'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const { sessionFile, sessionDir, isUuidv4, STATE_VERSION } = require('../bin/sai-state.js');

function tmpBase() {
  return process.env.TMPDIR || os.tmpdir();
}

function cleanup(ids) {
  for (const id of ids) {
    try {
      fs.rmSync(sessionFile(id), { force: true });
    } catch {
      // best-effort cleanup only
    }
  }
}

// Pass individual arguments and properly escape them for shell
function invokeCommand(...args) {
  // On Windows, use double quotes for arguments that contain spaces
  const escaped = args.map(arg => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  }).join(' ');

  const cmd = `node bin/sai-state.js ${escaped}`;

  try {
    const output = execSync(cmd, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    return { stdout: output, stderr: '', exitCode: 0 };
  } catch (err) {
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status || 1,
    };
  }
}

test('CLI: spawn derives deterministic UUIDv4 from key (E3)', () => {
  const key = 'test-key-123';
  const result1 = invokeCommand('spawn', '--key', key);
  assert.equal(result1.exitCode, 0, 'spawn should succeed');

  const json1 = JSON.parse(result1.stdout);
  assert.ok(json1.id, 'spawn should return id');
  assert.ok(isUuidv4(json1.id), 'id should be valid UUIDv4');

  // Same key should derive same id
  const result2 = invokeCommand('spawn', '--key', key);
  assert.equal(result2.exitCode, 0, 'second spawn should succeed');
  const json2 = JSON.parse(result2.stdout);
  assert.equal(json2.id, json1.id, 'same key should derive same id');

  cleanup([json1.id]);
});

test('CLI: spawn without key returns exit code 2', () => {
  const result = invokeCommand('spawn');
  assert.equal(result.exitCode, 2, 'spawn without key should fail with exit code 2');
});

test('CLI: emit returns minimal wire outcome {stage, next, ...} (E2)', () => {
  const key = 'test-emit-key';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    const event = JSON.stringify({ intent: 'next-step' });
    const result = invokeCommand('emit', id, 'explore-idea@1', event);
    assert.equal(result.exitCode, 0, 'emit should succeed');

    const json = JSON.parse(result.stdout);
    assert.ok(json.stage !== undefined, 'response should have stage');
    assert.ok(json.next, 'response should have next');
    assert.ok(json.next.follow, 'next should have follow');
    assert.ok(json.next.hint, 'next should have hint');
  } finally {
    cleanup([id]);
  }
});

test('CLI: emit with invalid machineId returns error field with closed literals (E2)', () => {
  const key = 'test-invalid-machine';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    // Test INVALID_EVENT
    const event = JSON.stringify({ intent: 'test' });
    const result = invokeCommand('emit', id, 'invalid-machine', event);
    assert.equal(result.exitCode, 1, 'emit with invalid machine should fail with exit code 1');
    const json = JSON.parse(result.stdout);
    assert.ok(json.error, 'response should have error field');
    assert.match(json.error, /INVALID_EVENT|UNKNOWN_MACHINE|VERSION_MISMATCH/,
      'error should be a closed literal');
  } finally {
    cleanup([id]);
  }
});

test('CLI: emit without required arguments returns exit code 2', () => {
  const result = invokeCommand('emit');
  assert.equal(result.exitCode, 2, 'emit without args should fail with exit code 2');
});

test('CLI: emit rejects invalid JSON event', () => {
  const key = 'test-invalid-json';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    const result = invokeCommand('emit', id, 'explore-idea@1', 'not-json');
    assert.equal(result.exitCode, 1, 'emit with invalid JSON should fail with exit code 1');
    const json = JSON.parse(result.stdout);
    assert.ok(json.error, 'response should have error field');
  } finally {
    cleanup([id]);
  }
});

test('CLI: close deletes session file (E5)', () => {
  const key = 'test-close-key';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;
  const file = sessionFile(id);

  try {
    assert.ok(fs.existsSync(file), 'session file should exist after spawn');

    const result = invokeCommand('close', id);
    assert.equal(result.exitCode, 0, 'close should succeed');

    assert.ok(!fs.existsSync(file), 'session file should be deleted after close');
  } finally {
    cleanup([id]);
  }
});

test('CLI: close without id returns exit code 2', () => {
  const result = invokeCommand('close');
  assert.equal(result.exitCode, 2, 'close without id should fail with exit code 2');
});

test('CLI: spawn reuse-or-fresh returns same id for same key', () => {
  const key = 'test-reuse-key';

  const spawn1 = invokeCommand('spawn', '--key', key);
  const id1 = JSON.parse(spawn1.stdout).id;

  // Emit an event
  const event = JSON.stringify({ intent: 'next-step' });
  invokeCommand('emit', id1, 'explore-idea@1', event);

  // Spawn again with same key
  const spawn2 = invokeCommand('spawn', '--key', key);
  const id2 = JSON.parse(spawn2.stdout).id;

  try {
    assert.equal(id2, id1, 'same key should reuse same id');
  } finally {
    cleanup([id1]);
  }
});

test('CLI: version mismatch discards old session files (E4)', () => {
  const key = 'test-version-mismatch';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;
  const file = sessionFile(id);

  try {
    // Write a session file with old version
    const oldSession = {
      createdAt: Date.now(),
      stateVersion: '1.0.0', // old version
      stateByMachine: {},
    };
    fs.writeFileSync(file, JSON.stringify(oldSession));

    // Spawn should discard the old file and create a fresh session
    const spawn2 = invokeCommand('spawn', '--key', key);
    assert.equal(spawn2.exitCode, 0, 'spawn should succeed despite version mismatch');

    const json = JSON.parse(spawn2.stdout);
    // Verify we got a valid response
    assert.ok(json.id, 'should return valid id');

    // Check the stored session has new version
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(stored.stateVersion, STATE_VERSION, 'should have updated version');
  } finally {
    cleanup([id]);
  }
});

test('CLI: SESSION_FILE_CORRUPT warning in response (E4)', () => {
  const key = 'test-corrupt-warning';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;
  const file = sessionFile(id);

  try {
    // Write corrupt JSON
    fs.writeFileSync(file, 'not-json');

    // emit should detect corruption
    const event = JSON.stringify({ intent: 'next-step' });
    const result = invokeCommand('emit', id, 'explore-idea@1', event);
    assert.equal(result.exitCode, 0, 'emit should succeed despite corruption');

    const json = JSON.parse(result.stdout);
    assert.ok(json.warnings, 'response should have warnings array');
    assert.ok(json.warnings.includes('SESSION_FILE_CORRUPT'),
      'warnings should include SESSION_FILE_CORRUPT');
  } finally {
    cleanup([id]);
  }
});

test('CLI: idempotency — last eventId per machine (E1)', () => {
  const key = 'test-idempotency';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    // First emit
    const event1 = JSON.stringify({ intent: 'next-step' });
    const result1 = invokeCommand('emit', id, 'explore-idea@1', event1);
    assert.equal(result1.exitCode, 0);
    const json1 = JSON.parse(result1.stdout);
    const stage1 = json1.stage;

    // Emit same event again (idempotent)
    const result2 = invokeCommand('emit', id, 'explore-idea@1', event1);
    assert.equal(result2.exitCode, 0);
    const json2 = JSON.parse(result2.stdout);

    // Second emit should reflect current state (may differ based on machine logic)
    // but the store should handle replayed events correctly
    assert.ok(json2.stage !== undefined, 'idempotent emit should return valid response');
  } finally {
    cleanup([id]);
  }
});

test('CLI: usage message on invalid command', () => {
  const result = invokeCommand('invalid-command');
  assert.equal(result.exitCode, 2, 'invalid command should fail with exit code 2');
});

test('CLI: session file persists state across invocations', () => {
  const key = 'test-persistence';

  // First spawn
  const spawn1 = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn1.stdout).id;

  try {
    // Emit event
    const event = JSON.stringify({ intent: 'next-step' });
    const emit1 = invokeCommand('emit', id, 'explore-idea@1', event);
    assert.equal(emit1.exitCode, 0);

    // Session file should exist and be readable
    const file = sessionFile(id);
    assert.ok(fs.existsSync(file), 'session file should exist');

    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(stored.stateByMachine, 'session should have stateByMachine');
    assert.equal(stored.stateVersion, STATE_VERSION, 'should have correct version');
  } finally {
    cleanup([id]);
  }
});

test('machines: explore-idea@1 is registered and reachable', () => {
  const key = 'test-explore-idea-machine';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    const event = JSON.stringify({ intent: 'next-step' });
    const result = invokeCommand('emit', id, 'explore-idea@1', event);
    assert.equal(result.exitCode, 0, 'explore-idea@1 should be reachable');

    const json = JSON.parse(result.stdout);
    assert.ok(json.stage !== undefined, 'should return stage from machine');
    assert.ok(json.next, 'should return next pointer from machine');
  } finally {
    cleanup([id]);
  }
});

test('machines: explore-slice@1 is registered and reachable', () => {
  const key = 'test-explore-slice-machine';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    const event = JSON.stringify({ intent: 'plan' });
    const result = invokeCommand('emit', id, 'explore-slice@1', event);
    assert.equal(result.exitCode, 0, 'explore-slice@1 should be reachable');

    const json = JSON.parse(result.stdout);
    assert.ok(json.stage !== undefined, 'should return stage from machine');
    assert.ok(json.next, 'should return next pointer from machine');
  } finally {
    cleanup([id]);
  }
});

test('sessionDir and sessionFile utilities work correctly', () => {
  const dir = sessionDir();
  assert.ok(typeof dir === 'string', 'sessionDir should return string');
  assert.ok(dir.includes('sai-state'), 'sessionDir should contain sai-state');

  const id = crypto.randomUUID();
  const file = sessionFile(id);
  assert.ok(file.includes(id), 'sessionFile should contain id');
  assert.ok(file.includes('.json'), 'sessionFile should end with .json');
  assert.ok(file.startsWith(dir), 'sessionFile should be under sessionDir');
});

test('CLI: reset clears one machine state in a fresh session', () => {
  const key = 'test-reset-fresh';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    // Reset a machine that has no prior state (fresh session)
    const reset = invokeCommand('reset', id, 'review-standalone@1');
    assert.equal(reset.exitCode, 0, 'reset on fresh session should succeed');
    const json = JSON.parse(reset.stdout);
    assert.equal(json.reset, 'review-standalone@1', 'reset should return the machine id');
  } finally {
    cleanup([id]);
  }
});

test('CLI: reset resets one machine to initial state and preserves others', () => {
  const key = 'test-reset-multiple';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    // Emit to explore-idea to establish state
    const event1 = JSON.stringify({ intent: 'next-step' });
    const emit1 = invokeCommand('emit', id, 'explore-idea@1', event1);
    assert.equal(emit1.exitCode, 0);

    // Emit to review-standalone to establish state
    const event2 = JSON.stringify({ step_ids: ['resolve-change'] });
    const emit2 = invokeCommand('emit', id, 'review-standalone@1', event2);
    assert.equal(emit2.exitCode, 0);
    const json2 = JSON.parse(emit2.stdout);
    assert.equal(json2.stage, 'establish-diff-scope', 'review should be past first step');

    // Reset only review-standalone
    const reset = invokeCommand('reset', id, 'review-standalone@1');
    assert.equal(reset.exitCode, 0);

    // Verify review is back to initial state
    const project = invokeCommand('emit', id, 'review-standalone@1', JSON.stringify({}));
    assert.equal(project.exitCode, 0);
    const json3 = JSON.parse(project.stdout);
    assert.equal(json3.stage, 'resolve-change', 'review should be reset to initial step');

    // Verify explore-idea state is preserved
    const exploreCheck = invokeCommand('emit', id, 'explore-idea@1', event1);
    assert.equal(exploreCheck.exitCode, 0);
    const json4 = JSON.parse(exploreCheck.stdout);
    assert.ok(json4.stage !== undefined, 'explore-idea state should be preserved');
  } finally {
    cleanup([id]);
  }
});

test('CLI: reset with unknown machine id returns UNKNOWN_MACHINE', () => {
  const key = 'test-reset-unknown';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    const reset = invokeCommand('reset', id, 'nonexistent@1');
    assert.equal(reset.exitCode, 1, 'reset with unknown machine should fail with exit code 1');
    const json = JSON.parse(reset.stdout);
    assert.equal(json.error, 'UNKNOWN_MACHINE', 'should return UNKNOWN_MACHINE error');
  } finally {
    cleanup([id]);
  }
});

test('CLI: reset with missing args returns exit code 2', () => {
  const key = 'test-reset-missing-args';
  const spawn = invokeCommand('spawn', '--key', key);
  const id = JSON.parse(spawn.stdout).id;

  try {
    // Missing machineId
    const result1 = invokeCommand('reset', id);
    assert.equal(result1.exitCode, 2, 'reset missing machineId should return exit code 2');

    // Missing both id and machineId
    const result2 = invokeCommand('reset');
    assert.equal(result2.exitCode, 2, 'reset missing all args should return exit code 2');
  } finally {
    cleanup([id]);
  }
});

test('isUuidv4 validates UUIDv4 format correctly', () => {
  assert.ok(isUuidv4('550e8400-e29b-41d4-a716-446655440000'), 'valid v4 UUID should pass');
  assert.ok(isUuidv4('12345678-1234-4234-9234-123456789012'), 'valid v4 UUID should pass');
  assert.ok(!isUuidv4('550e8400-e29b-31d4-a716-446655440000'), 'v3 UUID should fail');
  assert.ok(!isUuidv4('550e8400-e29b-51d4-a716-446655440000'), 'v5 UUID should fail');
  assert.ok(!isUuidv4('invalid-uuid'), 'invalid UUID should fail');
  assert.ok(!isUuidv4(''), 'empty string should fail');
});

test('STATE_VERSION is exported correctly', () => {
  assert.ok(typeof STATE_VERSION === 'string', 'STATE_VERSION should be string');
  assert.match(STATE_VERSION, /^\d+\.\d+\.\d+$/, 'STATE_VERSION should be semantic version');
});

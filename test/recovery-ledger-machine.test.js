'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const machine = require('../sai-state/machines/recovery-ledger.js');
const registry = require('../sai-state/registry.js');

const REPO_ROOT = path.join(__dirname, '..');
const SAI_STATE_TOOL = path.join(REPO_ROOT, 'bin', 'sai-state.js');

// Helper to generate a stable UUID from a key string
function deriveUuidFromKey(key) {
  const hash = crypto.createHash('sha256').update(key).digest();
  let uuid = '';
  for (let i = 0; i < 16; i++) {
    uuid += ('0' + hash[i].toString(16)).slice(-2);
  }
  uuid = uuid.substring(0, 12) + '4' + uuid.substring(13);
  const variantSet = ((parseInt(uuid.substring(16, 17), 16) & 0x3) | 0x8).toString(16);
  uuid = uuid.substring(0, 16) + variantSet + uuid.substring(17);
  return uuid.match(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/).slice(1).join('-').toLowerCase();
}

// Helper to call sai-state CLI and parse JSON output
function callSaiState(command, sessionId, machineId, eventJson) {
  const args = [command];
  if (sessionId) args.push(sessionId);
  if (machineId) args.push(machineId);
  if (eventJson) args.push(eventJson);

  const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...args], { encoding: 'utf8' });
  let payload = null;
  try {
    if (result.stdout.trim()) {
      payload = JSON.parse(result.stdout);
    }
  } catch (err) {
    // Failed to parse JSON
  }
  return { status: result.status, payload, stderr: result.stderr, stdout: result.stdout };
}

test('recovery-ledger@1 is registered and declares required properties', () => {
  assert.ok(registry.has('recovery-ledger@1'), 'recovery-ledger@1 must be registered');
  assert.equal(machine.machineId, 'recovery-ledger@1');
  assert.ok(machine.initialState && typeof machine.initialState === 'object', 'initialState must exist');
  assert.ok(Array.isArray(machine.initialState.ledger), 'ledger must be an array');
  assert.equal(typeof machine.transition, 'function', 'transition must be a function');
  assert.equal(typeof machine.project, 'function', 'project must be a function');
});

test('recovery-ledger@1 initial state has empty ledger', () => {
  assert.deepEqual(machine.initialState.ledger, []);
});

test('recovery-ledger@1 initial project returns follow: none', () => {
  const projected = machine.project(machine.initialState);
  assert.equal(projected.next.follow, 'none');
  assert.ok(projected.next.hint && typeof projected.next.hint === 'string');
});

test('recovery-ledger@1 accepts first unique diagnosis key', () => {
  const state = machine.initialState;
  const key = ['sai/commands/spec/steps/proposal.md', 'line 42', 'spec-worker'];

  const result = machine.transition(state, { key });

  assert.equal(result.state.stage, '1', 'first key should consume slot 1');
  assert.ok(!('rejected' in result) || result.rejected === undefined, 'first unique key should not reject');
  assert.equal(result.state.ledger.length, 1);
});

test('recovery-ledger@1 accepts multiple unique keys up to three slots', () => {
  const state = machine.initialState;
  const keys = [
    ['path1.md', 'point 1', 'boundary-a'],
    ['path2.md', 'point 2', 'boundary-b'],
    ['path3.md', 'point 3', 'boundary-c'],
  ];

  let current = state;
  for (let i = 0; i < keys.length; i++) {
    const result = machine.transition(current, { key: keys[i] });
    assert.equal(result.state.stage, String(i + 1), `key ${i} should consume slot ${i + 1}`);
    assert.ok(!('rejected' in result) || result.rejected === undefined, `key ${i} should not reject`);
    assert.equal(result.state.ledger.length, i + 1);
    current = result.state;
  }
});

test('recovery-ledger@1 rejects duplicate normalized diagnosis key', () => {
  let state = machine.initialState;
  const key = ['sai/commands/spec/steps/proposal.md', 'line 42', 'spec-worker'];

  // First attempt succeeds
  let result = machine.transition(state, { key });
  assert.equal(result.state.stage, '1');
  assert.ok(!('rejected' in result) || result.rejected === undefined);
  state = result.state;

  // Second attempt with same key fails
  result = machine.transition(state, { key });
  assert.equal(result.rejected, 'duplicate diagnosis', 'duplicate key should be rejected');
  assert.equal(result.state.stage, '', 'duplicate should not consume a slot');
  assert.equal(result.state.ledger.length, 1, 'ledger should still have only one entry');
});

test('recovery-ledger@1 normalizes paths before duplicate comparison', () => {
  let state = machine.initialState;

  // First key with standard path
  const key1 = ['sai/commands/spec/steps/proposal.md', 'line 42', 'spec-worker'];
  let result = machine.transition(state, { key: key1 });
  assert.equal(result.state.stage, '1');
  state = result.state;

  // Second key with redundant dot segment (should normalize to same)
  const key2 = ['sai/./commands/spec/./steps/proposal.md', 'line 42', 'spec-worker'];
  result = machine.transition(state, { key: key2 });
  assert.equal(result.rejected, 'duplicate diagnosis', 'redundant . segments should be normalized away');
  assert.equal(result.state.stage, '');
});

test('recovery-ledger@1 normalizes whitespace in concrete point', () => {
  let state = machine.initialState;

  // First key with single spaces
  const key1 = ['path.md', 'error at line 42', 'boundary'];
  let result = machine.transition(state, { key: key1 });
  assert.equal(result.state.stage, '1');
  state = result.state;

  // Second key with extra whitespace (should normalize to same)
  const key2 = ['path.md', '  error  at   line  42  ', 'boundary'];
  result = machine.transition(state, { key: key2 });
  assert.equal(result.rejected, 'duplicate diagnosis', 'multiple spaces should be normalized');
  assert.equal(result.state.stage, '');
});

test('recovery-ledger@1 rejects fourth key with exhaustion', () => {
  let state = machine.initialState;

  // Record three unique keys
  for (let i = 0; i < 3; i++) {
    const key = [`path${i}.md`, `point ${i}`, `boundary${i}`];
    const result = machine.transition(state, { key });
    assert.equal(result.state.stage, String(i + 1));
    state = result.state;
  }

  // Fourth key should be exhausted
  const fourthKey = ['path3.md', 'point 3', 'boundary3'];
  const result = machine.transition(state, { key: fourthKey });
  assert.equal(result.rejected, 'exhaustion', 'no slots remain after three keys');
  assert.equal(result.state.stage, '');
  assert.equal(result.state.ledger.length, 3);
});

test('recovery-ledger@1 handles missing or invalid keys gracefully', () => {
  const state = machine.initialState;

  // No key signal
  let result = machine.transition(state, {});
  assert.equal(result.state.stage, '');
  assert.ok(!('rejected' in result) || result.rejected === undefined);

  // Null key
  result = machine.transition(state, { key: null });
  assert.equal(result.state.stage, '');
  assert.ok(!('rejected' in result) || result.rejected === undefined);

  // Non-array key
  result = machine.transition(state, { key: 'not-a-tuple' });
  assert.equal(result.state.stage, '');
  assert.ok(!('rejected' in result) || result.rejected === undefined);

  // Wrong length array
  result = machine.transition(state, { key: ['path', 'point'] });
  assert.equal(result.state.stage, '');
  assert.ok(!('rejected' in result) || result.rejected === undefined);
});

test('recovery-ledger@1 preserves case sensitivity in repository paths', () => {
  let state = machine.initialState;

  const key1 = ['sai/Commands/spec.md', 'point', 'boundary'];
  let result = machine.transition(state, { key: key1 });
  assert.equal(result.state.stage, '1');
  state = result.state;

  const key2 = ['sai/commands/spec.md', 'point', 'boundary'];
  result = machine.transition(state, { key: key2 });
  assert.notEqual(result.rejected, 'duplicate diagnosis',
    'different case should not be treated as duplicate (case-sensitive)');
  assert.equal(result.state.stage, '2', 'different case should be accepted as a new key');
});

test('recovery-ledger@1 output includes snapshot metadata', () => {
  const state = machine.initialState;
  const key = ['path.md', 'point', 'boundary'];

  const result = machine.transition(state, { key });

  assert.ok(result.snapshot && typeof result.snapshot === 'object');
  assert.equal(result.snapshot.machineId, 'recovery-ledger@1');
  assert.ok(result.snapshot.state && typeof result.snapshot.state === 'object');
  assert.ok(Array.isArray(result.snapshot.state.ledger));
});

test('recovery-ledger@1 CLI emit returns slot ordinal in wire stage field', () => {
  // Use a unique session ID for this test (includes current timestamp to avoid collisions)
  const sessionId = deriveUuidFromKey('recovery-ledger-cli-test-' + Date.now());

  // First spawn to initialize session
  const spawnResult = callSaiState('spawn', undefined, undefined, undefined);
  spawnResult.payload = spawnResult.payload || { id: sessionId };

  // First consult: should return stage "1"
  const key1 = ['sai/commands/spec/steps/proposal.md', 'line 42', 'spec-worker'];
  const signal1 = { key: key1 };
  const result1 = callSaiState('emit', sessionId, 'recovery-ledger@1', JSON.stringify(signal1));

  assert.ok(result1.payload, 'emit should return valid JSON');
  assert.equal(result1.payload.stage, '1', 'first consult should return stage "1" in wire');
  assert.ok(!result1.payload.rejected, 'first consult should not be rejected');
  assert.ok(result1.payload.next, 'wire should include next pointer');

  // Second consult with different key: should return stage "2"
  const key2 = ['sai/commands/implement/steps/code.md', 'line 10', 'implement-worker'];
  const signal2 = { key: key2 };
  const result2 = callSaiState('emit', sessionId, 'recovery-ledger@1', JSON.stringify(signal2));

  assert.ok(result2.payload, 'second emit should return valid JSON');
  assert.equal(result2.payload.stage, '2', 'second consult should return stage "2" in wire');
  assert.ok(!result2.payload.rejected, 'second consult should not be rejected');

  // Third consult with duplicate key: should return rejected "duplicate diagnosis"
  const result3 = callSaiState('emit', sessionId, 'recovery-ledger@1', JSON.stringify(signal1));

  assert.ok(result3.payload, 'duplicate emit should return valid JSON');
  assert.equal(result3.payload.rejected, 'duplicate diagnosis', 'duplicate should return rejected reason');
  assert.equal(result3.payload.stage, '', 'duplicate should have empty stage (zero slots)');

  // Fourth consult with third unique key: should return stage "3"
  const key3 = ['sai/commands/design/steps/overview.md', 'line 5', 'design-worker'];
  const signal3 = { key: key3 };
  const result4 = callSaiState('emit', sessionId, 'recovery-ledger@1', JSON.stringify(signal3));

  assert.ok(result4.payload, 'third unique key emit should return valid JSON');
  assert.equal(result4.payload.stage, '3', 'third unique consult should return stage "3" in wire');
  assert.ok(!result4.payload.rejected, 'third unique consult should not be rejected');

  // Fifth consult with fourth unique key: should return rejected "exhaustion"
  const key4 = ['other/file.md', 'line 99', 'other-worker'];
  const signal4 = { key: key4 };
  const result5 = callSaiState('emit', sessionId, 'recovery-ledger@1', JSON.stringify(signal4));

  assert.ok(result5.payload, 'exhaustion emit should return valid JSON');
  assert.equal(result5.payload.rejected, 'exhaustion', 'fourth key should return exhaustion');
  assert.equal(result5.payload.stage, '', 'exhaustion should have empty stage (zero slots)');
});

test('recovery-ledger@1 counts coordinator attempts against a three-attempt budget', () => {
  let state = machine.initialState;

  for (let i = 0; i < 3; i += 1) {
    const result = machine.transition(state, { kind: 'coordinator-attempt' });
    assert.equal(result.state.stage, String(i + 1), `coordinator attempt ${i + 1} should report its ordinal`);
    assert.equal(result.state.coordinator_attempts, i + 1);
    assert.ok(!result.rejected, 'an attempt inside the budget must not be rejected');
    state = result.state;
  }

  const exhausted = machine.transition(state, { kind: 'coordinator-attempt' });
  assert.equal(exhausted.rejected, 'exhaustion', 'a fourth coordinator attempt must exhaust the budget');
  assert.equal(exhausted.state.stage, '');
  assert.equal(exhausted.state.coordinator_attempts, 3);
});

test('recovery-ledger@1 keeps the coordinator budget separate from the worker slots', () => {
  let state = machine.initialState;

  state = machine.transition(state, { kind: 'coordinator-attempt' }).state;
  state = machine.transition(state, { kind: 'coordinator-attempt' }).state;

  assert.equal(state.ledger.length, 0, 'coordinator attempts must not consume worker ledger slots');

  const workerResult = machine.transition(state, { key: ['path.md', 'point', 'red-worker'] });
  assert.equal(workerResult.state.stage, '1', 'the worker ledger must still start at slot 1');
  assert.equal(workerResult.state.coordinator_attempts, 2, 'the coordinator budget must survive a worker consult');
});

test('recovery-ledger@1 resets both budgets from its initial state', () => {
  assert.equal(machine.initialState.coordinator_attempts, 0);
  assert.deepEqual(machine.initialState.ledger, []);
});

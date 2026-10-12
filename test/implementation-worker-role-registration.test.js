'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { IMPLEMENTATION_REGISTRATION } = require('../bin/implementation-worker-roles');
const { defineWorkerMatrix, assertWorkerIdentity } = require('../bin/worker-matrix');
const { loadInstallManifest, expandInstallManifest, matrixRenderFor } = require('../bin/install-manifest');
const { buildChecklistTargets } = require('../bin/model-customization');

const repoRoot = path.join(__dirname, '..');
const manifest = () => loadInstallManifest(repoRoot);
const implementationEntry = entries => entries.find(entry => entry.phase === 'implementation');

test('implementation phase registration owns a closed, immutable current role set', () => {
  assert.equal(IMPLEMENTATION_REGISTRATION.phase, 'implementation');
  assert.equal(IMPLEMENTATION_REGISTRATION.command, 'sai-3-implement');
  assert.deepEqual(IMPLEMENTATION_REGISTRATION.roles, [{
    workerName: 'sai-3-implementation-worker',
    workerContract: 'sai/commands/implement/worker.md',
  }]);
  assert.ok(Object.isFrozen(IMPLEMENTATION_REGISTRATION));
  assert.ok(Object.isFrozen(IMPLEMENTATION_REGISTRATION.roles));
  assert.ok(Object.isFrozen(IMPLEMENTATION_REGISTRATION.roles[0]));
  const entries = manifest()['worker-matrix'].entries;
  assert.deepEqual(entries.filter(entry => entry.phase === 'implementation').map(({ workerName, workerContract }) =>
    ({ workerName, workerContract })), IMPLEMENTATION_REGISTRATION.roles);
  assert.equal(defineWorkerMatrix(entries).entries.length, 15);
});

test('implementation role identity and contract checks stay closed at registration and both install surfaces', () => {
  for (const patch of [
    { workerName: 'sai-3-ui-worker' },
    { workerName: 'sai-2-design-worker' },
    { workerContract: 'sai/commands/design/worker.md' },
  ]) {
    const altered = manifest();
    const entries = altered['worker-matrix'].entries;
    Object.assign(implementationEntry(entries), patch);
    assert.throws(() => defineWorkerMatrix(entries), /Invalid Worker Matrix (worker identity|contract path).*implementation/);
    assert.throws(() => assertWorkerIdentity(implementationEntry(entries)), /implementation.*misassigned|implementation.*mismatched/);
    for (const harness of ['claude', 'opencode']) {
      assert.throws(() => expandInstallManifest(altered, { harness, repoRoot, destinationRoot: {} }),
        new RegExp(`${harness} worker matrix: phase implementation has (misassigned|mismatched)`));
    }
  }
});

test('the preparation does not admit additional or duplicate implementation roles', () => {
  const entries = manifest()['worker-matrix'].entries;
  assert.throws(() => defineWorkerMatrix([...entries, { ...implementationEntry(entries) }]), /exactly 15 entries/);
  const duplicate = entries.map(entry => ({ ...entry }));
  duplicate[3] = { ...implementationEntry(entries) };
  assert.throws(() => defineWorkerMatrix(duplicate), /Duplicate Worker Matrix worker name: sai-3-implementation-worker/);
  const reordered = entries.map(entry => ({ ...entry }));
  [reordered[1], reordered[2]] = [reordered[2], reordered[1]];
  assert.throws(() => defineWorkerMatrix(reordered), /phase implementation is out of order; expected design/);
});

test('both harnesses preserve every current rendered worker byte and destination', () => {
  // Captured before this refactor; pins the whole installed roster, not only sai-3.
  const expected = {
    claude: '4d9f5725c8067300bf0e5b7ea65f42000507972bf58c135f11a103ea4b633f32',
    opencode: 'f078d8c75583496584e2490edd384991059dbb17a930c90edd0d6950c609c58d',
  };
  for (const harness of ['claude', 'opencode']) {
    const rendered = matrixRenderFor(manifest(), harness, repoRoot);
    assert.equal(rendered.length, 30);
    const bytes = JSON.stringify(rendered.map(({ kind, destinationName, text }) => ({ kind, destinationName, text })));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected[harness]);
  }
});

test('implementation binding destinations remain unique in each harness projection', () => {
  const altered = manifest();
  implementationEntry(altered['worker-matrix'].entries).bindingStem = 'design';
  for (const harness of ['claude', 'opencode']) {
    const prefix = path.join(repoRoot, '.tmp', 'prepare-sai3-worker-role-registration', harness);
    const destinationRoot = Object.fromEntries(['commands', 'sai', 'skills', 'agents', 'config', 'root']
      .map(kind => [kind, path.join(prefix, kind)]));
    assert.throws(() => expandInstallManifest(altered, { harness, repoRoot, destinationRoot }), /collision/i);
  }
});

test('the model customizer retains the implementation command and its existing worker grouping', () => {
  const rows = buildChecklistTargets('All', {
    command: ['sai-3-implement', 'sai-4-apply'],
    worker: ['sai-4-green-worker', 'sai-3-implementation-worker', 'sai-4-red-worker'],
  });
  assert.deepEqual(rows.map(row => row.value), [
    'command:sai-3-implement', 'worker:sai-3-implementation-worker',
    'command:sai-4-apply', 'worker:sai-4-red-worker', 'worker:sai-4-green-worker',
  ]);
});

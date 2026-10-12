'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { IMPLEMENTATION_REGISTRATION } = require('../bin/implementation-worker-roles');
const { defineWorkerMatrix, assertWorkerIdentity } = require('../bin/worker-matrix');
const { loadInstallManifest, matrixRenderFor, expandInstallManifest } = require('../bin/install-manifest');
const previous = require('../fixtures/implementation-projections-7112f07.json');
const { buildChecklistTargets } = require('../bin/model-customization');
const { validateClaudeWorkerBindings, validateOpencodeWorkerBindings } = require('../bin/install-flow').__test;

const root = path.join(__dirname, '..');
const manifest = () => loadInstallManifest(root);

test('implementation registration closes five identical planning roles', () => {
  const names = ['ui', 'frontend', 'backend', 'infra', 'other'].map(agent => `sai-3-${agent}-worker`);
  assert.deepEqual(IMPLEMENTATION_REGISTRATION.roles.map(role => role.workerName), names);
  assert.ok(Object.isFrozen(IMPLEMENTATION_REGISTRATION.roles));
  const entries = manifest()['worker-matrix'].entries;
  assert.equal(defineWorkerMatrix(entries).entries.length, 19);
  const planners = entries.filter(entry => entry.phase === 'implementation');
  for (const harness of ['claudeAgent', 'opencodeAgent']) {
    const baseline = { ...planners[0][harness] };
    delete baseline.agentName;
    for (const entry of planners) {
      const actual = { ...entry[harness] };
      delete actual.agentName;
      assert.deepEqual(actual, baseline);
      assert.equal(entry.workerContract, 'sai/commands/implement/worker.md');
    }
  }
  assert.doesNotThrow(validateClaudeWorkerBindings);
  assert.equal(validateOpencodeWorkerBindings().length, 19);
});

test('invalid, duplicate, missing and reordered category roles remain rejected', () => {
  for (const patch of [{ workerName: 'sai-3-unknown-worker' }, { workerContract: 'sai/commands/design/worker.md' }]) {
    const entries = manifest()['worker-matrix'].entries;
    Object.assign(entries[2], patch);
    assert.throws(() => defineWorkerMatrix(entries), /Invalid Worker Matrix/);
    assert.throws(() => assertWorkerIdentity(entries[2]), /misassigned|mismatched/);
  }
  const entries = manifest()['worker-matrix'].entries;
  assert.throws(() => defineWorkerMatrix(entries.slice(1)), /exactly 19/);
  const duplicate = entries.map(entry => ({ ...entry }));
  duplicate[3] = { ...duplicate[2] };
  assert.throws(() => defineWorkerMatrix(duplicate), /Duplicate Worker Matrix worker/);
  const reordered = entries.map(entry => ({ ...entry }));
  [reordered[2], reordered[3]] = [reordered[3], reordered[2]];
  assert.throws(() => defineWorkerMatrix(reordered), /implementation role out of order/);
});

test('both harnesses materialize five unique planning agents and bindings', () => {
  for (const harness of ['claude', 'opencode']) {
    const rendered = matrixRenderFor(manifest(), harness, root);
    assert.equal(rendered.length, 38);
    const planners = rendered.filter(item => item.entry.phase === 'implementation');
    assert.equal(planners.length, 10);
    assert.equal(new Set(planners.map(item => `${item.kind}/${item.destinationName}`)).size, 10);
    for (const item of planners) assert.match(item.text, /sai\/commands\/implement\/worker\.md/);
  }
});

test('unaffected agent and binding destinations and every rendered byte match base 7112f07', () => {
  assert.equal(previous.base, '7112f07be7e9a5f96d8cfe7aaa7daa023a614853');
  const originalDataRoot = process.env.XDG_DATA_HOME;
  process.env.XDG_DATA_HOME = '';
  try {
    for (const harness of ['claude', 'opencode']) {
      const base = path.join(root, '.tmp', 'category-byte-pins', harness);
      const destinationRoot = Object.fromEntries(['root', 'config', 'agents', 'commands', 'sai', 'skills'].map(key => [key, path.join(base, key)]));
      const projections = expandInstallManifest(manifest(), { harness, repoRoot: root, destinationRoot });
      const unchanged = projections.filter(item => item.destinationPath.startsWith(destinationRoot.agents + path.sep)
        || item.destinationPath.startsWith(path.join(destinationRoot.sai, 'orchestration/workers/bindings') + path.sep))
        .map(item => [path.relative(base, item.destinationPath).split(path.sep).join('/'), item.sourceText ?? fs.readFileSync(item.sourcePath, 'utf8')])
        .filter(([destination]) => !/\/(sai-3-|implementation-)/.test(destination))
        .sort(([left], [right]) => left.localeCompare(right, 'en'));
      assert.equal(unchanged.length, 31);
      const hash = crypto.createHash('sha256').update(JSON.stringify(unchanged)).digest('hex');
      assert.equal(hash, previous[harness].unaffectedDestinationContentHash,
        `${harness}: all unrelated projected destination names, defaults, permissions and bodies remain byte-identical`);
      const planners = matrixRenderFor(manifest(), harness, root).filter(item => item.entry.phase === 'implementation');
      for (const item of planners) {
        const prior = previous[harness].legacy.find(record => record.destination.startsWith(item.kind === 'agent' ? 'agents/' : 'sai/'));
        const normalized = item.text.replaceAll(item.entry.workerName, 'sai-3-implementation-worker')
          .replace(/^description:.*$/m, prior.text.match(/^description:.*$/m)?.[0] || '');
        assert.equal(normalized, prior.text,
          `${harness}/${item.destinationName}: only role identity and description change; defaults, skills, contract and native access retain baseline bytes`);
      }
    }
  } finally {
    if (originalDataRoot === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = originalDataRoot;
  }
});

test('model customizer groups all five individually selectable planners under sai-3', () => {
  const names = IMPLEMENTATION_REGISTRATION.roles.map(role => role.workerName);
  const rows = buildChecklistTargets('All', { command: ['sai-3-implement', 'sai-4-apply'], worker: [...names].reverse() });
  assert.deepEqual(rows.map(row => row.value), ['command:sai-3-implement', ...names.map(name => `worker:${name}`), 'command:sai-4-apply']);
});

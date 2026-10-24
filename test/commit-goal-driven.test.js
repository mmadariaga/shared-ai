'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const LEGACY = /command-runner|worker-core|bounded-recovery|stop-options|unattended-runtime-recovery/;

test('the commit wrappers fetch the skill and the coordinator card directly', () => {
  for (const harness of ['claude', 'opencode']) {
    const wrapper = read(`commands/${harness}/sai-commit.md`);
    assert.match(wrapper, /Fetch @sai\/commands\/commit\/coordinator\.md and follow it exactly/);
    assert.doesNotMatch(wrapper, /@sai\/adapters\/|command-bootstrap\.md/);
    assert.ok(wrapper.includes('This invocation starts clean'));
  }
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/commit/command-bootstrap.md')), false);
});

test('the commit coordinator is a goal-driven card on the shared obstacle policy', () => {
  const card = read('sai/commands/commit/coordinator.md');
  for (const heading of ['## Goal', '## Start', '## Obstacles', '## Close']) {
    assert.ok(card.includes(heading), `coordinator has ${heading}`);
  }
  assert.ok(card.includes('Fetch @sai/policies/obstacle-escalation.md'));
  assert.doesNotMatch(card, LEGACY);
  assert.doesNotMatch(card, /<TASK>|original_envelope|replacement_reconstruction_fields|recovery_policy/);
});

test('the commit authorization gate and terminal literal are unchanged', () => {
  const card = read('sai/commands/commit/coordinator.md');
  assert.match(card, /Allow on this session/);
  assert.match(card, /only an explicit `no` declines/);
  assert.match(card, /exactly `Commit done\.`/);
  assert.match(card, /`commit\.js apply`, after an authorized answer|`apply`/);
  assert.match(card, /never stage, unstage, push, or bypass hooks/);
  assert.match(read('sai/commands/commit/instructions.md'), /Run `git commit` on the staged changes above\?/);
});

test('the commit worker runs on a standalone binding and no longer loads the legacy worker protocol', () => {
  const worker = read('sai/commands/commit/worker.md');
  assert.doesNotMatch(worker, LEGACY);
  assert.match(worker, /event: ready/);
  assert.match(worker, /NEVER run `git add`, `git commit`/);

  const manifest = loadInstallManifest(repoRoot);
  for (const harness of ['claude', 'opencode']) {
    const binding = matrixRenderFor(manifest, harness, repoRoot)
      .find(item => item.kind === 'binding' && item.phase === 'commit');
    assert.ok(binding, `${harness} commit binding`);
    assert.doesNotMatch(binding.text, /command-runner|replacement_reconstruction_fields|continue_after_|panel-render/);
    assert.match(binding.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /task\(task_id: "<captured task ID>"/);
    assert.match(binding.text, /Fetch @sai\/commands\/commit\/worker\.md/);
  }
});

test('the shared obstacle and escalation policy states the budget, force majeure, options, and answer', () => {
  const policy = read('sai/policies/obstacle-escalation.md');
  assert.match(policy, /budget of 3 attempts/);
  assert.match(policy, /different from the previous one/);
  assert.match(policy, /rejects an attempt as `exhaustion`/);
  assert.match(policy, /resets that obstacle's counter/);
  assert.match(policy, /Never forward the old worker's history/);
  assert.match(policy, /Force majeure escalates at once, without spending an attempt/);
  assert.match(policy, /Keep the option count within the picker's capacity/);
  assert.match(policy, /one option that stops the run/);
  assert.match(policy, /A dismissed question closes the run as escalated/);
  assert.match(policy, /@sai\/policies\/question-context\.md/);
  assert.doesNotMatch(policy, LEGACY);
});

test('the retired commit bootstrap is listed for removal from installed roots', () => {
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  const entry = manifest.retirements.find(item => item.destination && item.destination.path === 'commands/commit/command-bootstrap.md');
  assert.ok(entry, 'the commit bootstrap has a retirement entry');
  assert.deepEqual(entry.harnesses, ['claude', 'opencode']);
  assert.ok(entry.managedHashes.length >= 1);
});

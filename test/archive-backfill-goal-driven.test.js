'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(repoRoot, relativePath));

const LEGACY = /command-runner|worker-core|bounded-recovery|stop-options|unattended-runtime-recovery/;
const COMMANDS = ['archive', 'backfill'];

test('the archive and backfill wrappers fetch the skill and the coordinator card directly', () => {
  for (const name of COMMANDS) {
    for (const harness of ['claude', 'opencode']) {
      const wrapper = read(`commands/${harness}/sai-${name}.md`);
      assert.match(wrapper, new RegExp(`Fetch @sai/commands/${name}/coordinator\\.md and follow it exactly`));
      assert.doesNotMatch(wrapper, /@sai\/adapters\/|command-bootstrap\.md/);
      assert.ok(wrapper.includes('This invocation starts clean'));
      assert.match(wrapper, new RegExp(`command_name: ${name}\\n  arguments_value: \\$ARGUMENTS\\n$`));
    }
    assert.match(read(`commands/opencode/sai-${name}.md`), /^subtask: false$/m);
    assert.equal(exists(`sai/commands/${name}/command-bootstrap.md`), false);
  }
});

test('the archive and backfill coordinators are goal-driven cards on the shared obstacle policy', () => {
  for (const name of COMMANDS) {
    const card = read(`sai/commands/${name}/coordinator.md`);
    for (const heading of ['## Goal', '## Start', '## Obstacles', '## Close']) {
      assert.ok(card.includes(heading), `${name} coordinator has ${heading}`);
    }
    assert.ok(card.includes('Fetch @sai/policies/obstacle-escalation.md'));
    assert.match(card, /Obstacles, their budget of 3 attempts, force majeure, and escalation follow `@sai\/policies\/obstacle-escalation\.md`/);
    assert.ok(card.includes(`Fetch @sai/orchestration/workers/bindings/${name}-worker.md and use it.`));
    assert.ok(card.includes('Fetch @sai/policies/no-commit-guard.md'));
    assert.ok(card.includes('guard_base'));
    assert.doesNotMatch(card, LEGACY);
    assert.doesNotMatch(card, /<TASK>|original_envelope|replacement_reconstruction_fields|recovery_policy|phase adapter/i);
  }
});

test('E6: archive keeps its fast-track parse, its gates, and its terminal literal', () => {
  const card = read('sai/commands/archive/coordinator.md');
  assert.match(card, /positional token `--fast-track`/);
  assert.match(card, /print the exact line `> FAST-TRACK MODE ACTIVE`/);
  assert.match(card, /`fast_track_active` declared beside it as session state, never as an envelope key/);
  assert.match(card, /Fetch @sai\/policies\/change-picker\.md and follow it exactly/);
  assert.match(card, /Under `fast_track_active` it skips its selector as that file says; without the flag every gate still asks/);
  assert.match(card, /exactly `Archive done\.`/);
  assert.match(card, /archive-commit-gate\.instructions\.md/);
  assert.match(card, /`archive_content_fix_attempted`/);
  assert.match(card, /no further retry, no second fix, no replacement worker/);
  assert.match(read('sai/commands/archive/archive-commit-gate.instructions.md'), /Under `fast_track_active`, the selector is not shown/);
});

test('E5: backfill keeps its interview as user questions and stays unattended inside Direct Build', () => {
  const card = read('sai/commands/backfill/coordinator.md');
  assert.match(card, /A standalone run keeps its interview: the questions below stay user questions/);
  assert.match(card, /the worker returns zero `needs_input` results/);
  assert.match(card, /--direct-build-prepare/);
  assert.match(card, /--direct-build-execute/);
  assert.match(card, /Backfill complete in openspec\/changes\/\{name\}\//);
  assert.match(card, /\*\*Open a new chat\*\* and run `\/sai-archive \{name\}` \(--fast-track\)\./);
  assert.match(card, /no backfill window carries `allow_commit`/);
  assert.match(card, /ALL file writes into `openspec\/changes\/\{name\}\/`/);

  const instructions = read('sai/commands/backfill/instructions.md');
  assert.match(instructions, /When `fast_track_active` is true, do NOT ask any generated reconciliation question/);
  assert.match(instructions, /ask for the decision — except when `fast_track_active` is true/);
  assert.match(instructions, /with `fast_track_active` true, accept it directly with no ask/);
});

test('Direct Build keeps dispatching the archive and backfill workers through standalone bindings', () => {
  const manifest = loadInstallManifest(repoRoot);
  for (const harness of ['claude', 'opencode']) {
    for (const phase of COMMANDS) {
      const binding = matrixRenderFor(manifest, harness, repoRoot)
        .find(item => item.kind === 'binding' && item.phase === phase);
      assert.ok(binding, `${harness} ${phase} binding`);
      assert.doesNotMatch(binding.text, /command-runner|replacement_reconstruction_fields|continue_after_|panel-render/);
      assert.match(binding.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /task\(task_id: "<captured task ID>"/);
      assert.match(binding.text, new RegExp(`Fetch @sai/commands/${phase}/worker\\.md`));
    }
  }
  const pipeline = read('sai/commands/explore/steps/pipeline-direct-build.md');
  assert.match(pipeline, /Fetch @sai\/orchestration\/workers\/bindings\/archive-worker\.md and use it\./);
  assert.match(pipeline, /--direct-build-prepare/);
  assert.match(read('sai/commands/archive/worker.md'), /--direct-build-execute/);
  assert.match(read('sai/commands/backfill/worker.md'), /--direct-build-execute/);
});

test('the boot adapters no longer name archive or backfill as routed commands', () => {
  for (const harness of ['claude', 'opencode']) {
    const boot = read(`sai/adapters/${harness}/boot.md`);
    assert.doesNotMatch(boot, /Routed names|`archive`|`backfill`|coordinator\.md/);
    assert.match(boot, /Utility names|utility names/);
  }
});

test('the fast-track policy is scoped to archive and backfill', () => {
  const policy = read('sai/policies/fast-track-flag.md');
  assert.match(policy, /## Scope\n\nThe model governs `\/sai-archive` and `\/sai-backfill`/);
  assert.match(policy, /owns BOTH the parse and the banner for\n {3}`sai-archive`/);
  assert.doesNotMatch(policy, /sai-merge/);
});

test('the retired archive and backfill bootstraps are listed for removal from installed roots', () => {
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  for (const name of COMMANDS) {
    const entry = manifest.retirements.find(item => item.destination && item.destination.path === `commands/${name}/command-bootstrap.md`);
    assert.ok(entry, `the ${name} bootstrap has a retirement entry`);
    assert.deepEqual(entry.harnesses, ['claude', 'opencode']);
    assert.equal(entry.destination.class, 'sai');
    assert.ok(entry.managedHashes.length >= 1);
    assert.ok(entry.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)));
  }
});

test('the archive and backfill command profiles carry the safe-operations skill', () => {
  const profiles = JSON.parse(read('sai/install-manifest.json')).capabilities.profiles;
  for (const name of COMMANDS) {
    assert.deepEqual(profiles[`${name}-command`].skills, ['safe-operations']);
  }
});

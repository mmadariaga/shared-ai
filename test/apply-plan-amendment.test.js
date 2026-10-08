'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const STEP = 'sai/commands/apply/steps/plan-amendment.md';

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('the amendment branch lives in its own step file with the fixed notice and the mode rule', () => {
  const card = artifact(STEP);
  assert.match(card, /> PLAN AMENDED: <path> — Step N — <reason>/);
  assert.match(card, /Read `fast_track_active`\./);
  assert.match(card, /\*\*Active\*\*[^\n]*amend on your own/);
  assert.match(card, /\*\*Inactive:\*\*[^\n]*ask through the native picker/);
  assert.match(card, /file-manifest\.js/);
  assert.match(card, /checkpoint-plan/);
  assert.match(card, /One amendment per discrepancy/);
  assert.match(card, /never legitimizes what a worker's role forbids/);
});

test('coordinator and runner point at the branch instead of carrying it', () => {
  const coordinator = artifact('sai/commands/apply/coordinator.md');
  const runner = artifact('sai/commands/apply/runner.md');
  assert.match(coordinator, /`Files Affected omits a path the plan names` error[^\n]*plan-amendment\.md[^\n]*before the baseline capture/);
  assert.match(coordinator, /production files the worker reported that neither `implementation\.md` nor `tasks\.md` names[^\n]*plan-amendment\.md/);
  assert.match(coordinator, /plan amendment \(`steps\/plan-amendment\.md`\)/);
  assert.match(runner, /one per plan amendment \(`steps\/plan-amendment\.md`/);
  assert.match(runner, /A `DEVIATION` after a passing verify is a plan finding: fetch @sai\/commands\/apply\/steps\/plan-amendment\.md before step 2/);
  assert.doesNotMatch(runner, /Fetch @sai\/commands\/apply\/steps\/plan-amendment\.md\n/, 'the branch is a conditional pointer, not an unconditional fetch');
});

test('a run-start amendment is declared at the baseline and committed by the first closing Step', () => {
  const card = artifact(STEP);
  const coordinator = artifact('sai/commands/apply/coordinator.md');
  assert.match(card, /one `amended: <path>` stdin line per amended artifact/);
  assert.match(card, /The first Step that closes commits those artifacts/);
  assert.match(coordinator, /one `amended: <path>` line for each artifact a run-start plan amendment changed/);
});

test('commit gate failures state one default reaction and name only the exceptions', () => {
  const runner = artifact('sai/commands/apply/runner.md');
  const section = runner.slice(runner.indexOf('5. **Failures.**'), runner.indexOf('6. **Continue.**'));
  assert.match(section, /the default for every `reason` is to report the `reason` and `error` and stop with the stop report/);
  for (const reason of ['guard-violation', 'empty-add-list', 'nothing-to-stage', 'commit-failed', 'git-add-failed', 'invalid-message']) {
    assert.ok(section.includes(`\`${reason}\``), `${reason} keeps its written reaction`);
  }
  assert.match(section, /file discrepancy[\s\S]*plan-amendment\.md/);
});

test('the design rule asks for a complete Files Affected list, tests included', () => {
  const tasks = artifact('sai/commands/design/steps/tasks.md');
  assert.match(tasks, /`\*\*Files Affected\*\*` lists every file the step creates, modifies, or deletes, tests included/);
});

test('repository documentation lists the third apply fast-track opt-out and the amendment', () => {
  const agents = artifact('AGENTS.md');
  assert.match(agents, /`sai-4-apply` — pre-activates session commit authorization, auto-stays[^\n]*amends a defective planning artifact without asking/);
  assert.match(agents, /\*\*Plan amendment\*\*:/);
});

test('the recursive command projection installs the branch file for both harnesses', () => {
  const manifest = loadInstallManifest(repoRoot);
  for (const harness of ['claude', 'opencode']) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-amend-'));
    try {
      const projections = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: { commands: path.join(base, 'commands'), sai: path.join(base, 'sai'), skills: path.join(base, 'skills'), agents: path.join(base, 'agents'), config: base, root: base },
      });
      const sources = projections.map((p) => path.relative(repoRoot, p.sourcePath).split(path.sep).join('/'));
      assert.ok(sources.includes(STEP), `${harness} installs ${STEP}`);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

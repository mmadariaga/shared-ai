'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const exists = relativePath => fs.existsSync(path.join(repoRoot, relativePath));

const UTILITIES = ['explore', 'retire-docs', 'status', 'worktree'];
const RETIRED_POLICIES = ['stop-options', 'bounded-recovery', 'unattended-runtime-recovery'];

// Every retired source file, with the harnesses that installed it and its installed destination under the sai root.
const RETIRED = [
  ...UTILITIES.map(name => ({ source: `sai/commands/${name}/command-bootstrap.md`, destination: `commands/${name}/command-bootstrap.md`, harnesses: ['claude', 'opencode'] })),
  { source: 'sai/adapters/claude/boot.md', destination: 'adapters/claude/boot.md', harnesses: ['claude'] },
  { source: 'sai/adapters/opencode/boot.md', destination: 'adapters/opencode/boot.md', harnesses: ['opencode'] },
  { source: 'sai/orchestration/command-runner.md', destination: 'orchestration/command-runner.md', harnesses: ['claude', 'opencode'] },
  { source: 'sai/orchestration/worker-core.md', destination: 'orchestration/worker-core.md', harnesses: ['claude', 'opencode'] },
  ...RETIRED_POLICIES.map(name => ({ source: `sai/policies/${name}.md`, destination: `policies/${name}.md`, harnesses: ['claude', 'opencode'] })),
];
// The routed binding templates are checked-in sources only: they are rendered, never installed.
const RETIRED_TEMPLATES = [
  'sai/orchestration/workers/bindings/claude/worker-template.md',
  'sai/orchestration/workers/bindings/opencode/worker-template.md',
];

const RETIRED_NAMES = /command-runner|worker-core|stop-options|bounded-recovery|unattended-runtime-recovery|adapters\/(?:claude|opencode)\/boot\.md|bindings\/(?:claude|opencode)\/worker-template\.md|commands\/(?:explore|retire-docs|status|worktree)\/command-bootstrap/;

function filesUnder(relativeDirectory, pattern) {
  const found = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (pattern.test(entry.name)) found.push(path.relative(repoRoot, full).split(path.sep).join('/'));
    }
  };
  visit(path.join(repoRoot, relativeDirectory));
  return found;
}

test('the retired orchestration files are deleted and the surfaces other cards still load stay (E2)', () => {
  for (const file of [...RETIRED.map(item => item.source), ...RETIRED_TEMPLATES]) {
    assert.equal(exists(file), false, `${file} is deleted`);
  }
  for (const kept of [
    'sai/policies/bounded-dispatch-retry.md',
    'sai/policies/change-picker.md',
    'sai/policies/todo-structure.md',
    'sai/policies/verified-precondition-handback.md',
    'sai/policies/obstacle-escalation.md',
    'sai/orchestration/workers/bindings/claude/standalone-worker-template.md',
    'sai/orchestration/workers/bindings/opencode/standalone-worker-template.md',
  ]) {
    assert.ok(exists(kept), `${kept} stays`);
  }
  assert.match(read('sai/commands/spec/worker.md'), /bounded-dispatch-retry\.md/);
  assert.match(read('sai/commands/backfill/worker.md'), /bounded-dispatch-retry\.md/);
  assert.match(read('sai/commands/archive/coordinator.md'), /change-picker\.md/);
  assert.match(read('sai/policies/status-picker.md'), /change-picker\.md/);
});

test('nothing in sai, commands, bin, agents, skills, AGENTS.md, or the manifest projections names a retired surface (E2, E3)', () => {
  const scanned = [
    ...filesUnder('sai', /\.(?:md|js|json)$/),
    ...filesUnder('commands', /\.md$/),
    ...filesUnder('bin', /\.js$/),
    ...filesUnder('agents', /\.md$/),
    ...filesUnder('skills', /\.md$/),
    'AGENTS.md',
  ].filter(file => file !== 'sai/install-manifest.json');
  for (const file of scanned) {
    assert.doesNotMatch(read(file), RETIRED_NAMES, `${file} names no retired surface`);
  }
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  const { retirements, ...live } = manifest;
  assert.doesNotMatch(JSON.stringify(live), RETIRED_NAMES, 'the manifest projections and matrix name no retired surface');
  assert.equal(retirements.length > 0, true);
});

test('every deleted file leaves its projection and gets one retirement entry per installing harness (I5)', () => {
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = {
    commands: path.join(os.tmpdir(), 'sai-retire-commands'),
    sai: path.join(os.tmpdir(), 'sai-retire-sai'),
    skills: path.join(os.tmpdir(), 'sai-retire-skills'),
    agents: path.join(os.tmpdir(), 'sai-retire-agents'),
    config: path.join(os.tmpdir(), 'sai-retire-config'),
    root: path.join(os.tmpdir(), 'sai-retire-config'),
  };
  for (const item of RETIRED) {
    const entries = manifest.retirements.filter(entry => entry.destination.class === 'sai' && entry.destination.path === item.destination);
    assert.equal(entries.length, 1, `${item.destination} has exactly one retirement entry`);
    const [entry] = entries;
    assert.match(entry.id, /^retired-retire-legacy-orchestration-/);
    assert.deepEqual(entry.harnesses, item.harnesses, `${item.destination} retires for the harnesses that installed it`);
    assert.ok(entry.managedHashes.length >= 1);
    assert.ok(entry.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)));
    assert.equal(new Set(entry.managedHashes).size, entry.managedHashes.length);
    for (const harness of ['claude', 'opencode']) {
      const sources = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot })
        .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'));
      assert.equal(sources.includes(item.source), false, `${harness} no longer projects ${item.source}`);
    }
  }
});

test('the empty utility bootstraps retire under the hash the installer recognizes', () => {
  const text = 'This command has no command-specific loads, and this file is complete as written. Execution continues with the card selected by the harness boot adapter.\n';
  const digest = require('node:crypto').createHash('sha256').update(text).digest('hex');
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  for (const name of UTILITIES) {
    const entry = manifest.retirements.find(item => item.destination.path === `commands/${name}/command-bootstrap.md` && /retire-legacy-orchestration/.test(item.id));
    assert.ok(entry.managedHashes.includes(digest), `${name} bootstrap retirement recognizes the released empty bootstrap`);
  }
});

test('the worker matrix has no routed binding template: every binding renders from the standalone template', () => {
  const manifest = loadInstallManifest(repoRoot);
  assert.deepEqual(Object.keys(manifest['worker-matrix'].templates).sort(), [
    'claudeAgent', 'claudeStandaloneBinding', 'opencodeAgent', 'opencodeStandaloneBinding',
  ]);
  assert.doesNotMatch(read('bin/worker-matrix.js'), /STANDALONE_PHASES|claudeBinding|opencodeBinding|panelRenderBinding/);
  for (const harness of ['claude', 'opencode']) {
    const bindings = matrixRenderFor(manifest, harness, repoRoot).filter(item => item.kind === 'binding');
    assert.equal(bindings.length, 13, `${harness} renders thirteen bindings`);
    for (const binding of bindings) {
      assert.match(binding.text, /Create the worker with the ready prompt alone/, `${harness} ${binding.phase} renders from the standalone template`);
      assert.doesNotMatch(binding.text, /replacement_reconstruction_fields|continue_after_|panel-render/, `${harness} ${binding.phase} carries no routed binding text`);
    }
  }
});

test('the three stops that named the legacy recovery policies point to the obstacle policy (E9)', () => {
  for (const file of ['sai/policies/implementation-closing-report.md', 'sai/policies/no-commit-guard.md', 'sai/policies/bounded-dispatch-retry.md']) {
    const text = read(file);
    assert.ok(text.includes('@sai/policies/obstacle-escalation.md'), `${file} references the obstacle policy`);
    assert.doesNotMatch(text, /stop-options|bounded-recovery|unattended-runtime-recovery/, `${file} names no legacy recovery policy`);
  }
  assert.match(read('sai/policies/implementation-closing-report.md'), /escalation options of `@sai\/policies\/obstacle-escalation\.md` follow\s+Execution details as a separate decision prompt, outside the report/);
  const directBuild = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(directBuild, /options of `@sai\/policies\/obstacle-escalation\.md` follow after `Execution details` as a separate question/);
});

for (const [harness, install] of [['claude', installClaude], ['opencode', installOpencode]]) {
  test(`${harness}: a fresh install lands none of the retired files and an upgrade removes recognized ones and keeps customized ones (E3, E10, E11)`, t => {
    t.mock.method(console, 'warn', () => {});
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), `sai-retire-fresh-${harness}-`));
    const upgraded = fs.mkdtempSync(path.join(os.tmpdir(), `sai-retire-upgrade-${harness}-`));
    try {
      install(fresh);
      const mine = RETIRED.filter(item => item.harnesses.includes(harness));
      for (const item of mine) {
        assert.equal(fs.existsSync(path.join(fresh, 'sai', item.destination)), false, `a fresh ${harness} install lands no ${item.destination}`);
      }

      const recognized = 'This command has no command-specific loads, and this file is complete as written. Execution continues with the card selected by the harness boot adapter.\n';
      for (const item of mine) {
        const destination = path.join(upgraded, 'sai', item.destination);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, item.destination.endsWith('command-bootstrap.md') ? recognized : 'customized by the user\n');
      }
      install(upgraded);
      for (const item of mine) {
        const destination = path.join(upgraded, 'sai', item.destination);
        if (item.destination.endsWith('command-bootstrap.md')) {
          assert.equal(fs.existsSync(destination), false, `${item.destination} matches a managed hash and is removed`);
        } else {
          assert.equal(fs.readFileSync(destination, 'utf8'), 'customized by the user\n', `${item.destination} is customized and stays unchanged`);
        }
      }
      for (const wrapper of ['sai-explore', 'sai-retire-docs', 'sai-status', 'sai-worktree']) {
        const installed = fs.readFileSync(path.join(upgraded, 'commands', `${wrapper}.md`), 'utf8');
        assert.doesNotMatch(installed, RETIRED_NAMES, `${wrapper} points at no retired file after the upgrade`);
        assert.match(installed, /Fetch @sai\/commands\/[a-z-]+\/body\.md and follow it exactly/);
      }
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
      fs.rmSync(upgraded, { recursive: true, force: true });
    }
  });
}

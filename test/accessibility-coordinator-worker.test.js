'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PassThrough } = require('stream');

const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
const { enumerateClaude, enumerateOpencode, runDeletion } = require('../bin/uninstall-flow.js');
const { main: doctorMain } = require('../bin/doctor.js');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function destinationRoots(base) {
  return {
    commands: path.join(base, 'commands'),
    sai: path.join(base, 'sai'),
    skills: path.join(base, 'skills'),
    agents: path.join(base, 'agents'),
    config: base,
  };
}

function sourcePath(repoRoot, projection) {
  return path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
}

function accessibilityProjections(harness, base) {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  return expandInstallManifest(manifest, {
    harness,
    repoRoot,
    destinationRoot: destinationRoots(base),
  }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker'));
}

function collectOutput() {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  return { out, text: () => Buffer.concat(chunks).toString('utf8') };
}

test('accessibility invocation core loads budget, instruction, and remember in order', () => {
  const core = artifact('sai/commands/accessibility/invocation.md');
  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/instructions/accessibility.md',
    'Fetch @sai/policies/remember.md',
  ];

  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /^arguments:\s*\$ARGUMENTS\s*$/m);
});

test('accessibility scope, runtime, and parent arguments reach the shared core unchanged', () => {
  const caller = artifact('sai/commands/sai-8-accessibility.md');
  const core = artifact('sai/commands/accessibility/invocation.md');
  const argumentsValue = '--full --path src/components --runtime feature-branch';

  assert.match(caller, /Fetch @sai\/commands\/accessibility\/invocation\.md/);
  assert.match(caller, /arguments:\s*\$ARGUMENTS/);
  assert.match(core, /arguments:\s*\$ARGUMENTS/);
  assert.ok(caller.includes('$ARGUMENTS'), `complete arguments should preserve ${argumentsValue}`);
  assert.ok(core.includes('$ARGUMENTS'), `complete arguments should reach the core: ${argumentsValue}`);
});

test('accessibility review defaults to static-only without a runtime scanner', () => {
  const instruction = artifact('sai/instructions/accessibility.md');

  assert.match(instruction, /`--runtime` to enable browser-based[\s\S]{0,160}Default:\s*static-only/i);
  assert.match(instruction, /Runtime requires[\s\S]{0,160}explicitly authorize each command/i);
});

// ─── Step 2: routed accessibility lifecycle ─────────────────────────────────

test('Step 2 accessibility coordinator dispatches one worker and performs no technical I/O', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');

  assert.match(coordinator, /dispatch[\s\S]{0,160}exactly one[\s\S]{0,160}sai-8-accessibility-worker/i);
  assert.equal((coordinator.match(/sai-8-accessibility-worker/g) || []).length, 1);
  for (const operation of ['prerequisite', 'argument', 'git', 'source', 'scanner', 'research', 'artifact']) {
    assert.match(
      coordinator,
      new RegExp(`(?:SHALL NOT|MUST NOT|does not|no)[^\\n]{0,180}${operation}`, 'i'),
      `coordinator should prohibit ${operation} I/O`
    );
  }
});

test('Step 2 accessibility worker preserves input precedence, grammar, change resolution, and scope ownership', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /wrapper_echo_value[\s\S]{0,240}precedence/i);
  assert.match(worker, /arguments_value/);
  assert.match(worker, /--full/);
  assert.match(worker, /--path/);
  assert.match(worker, /--runtime/);
  assert.match(worker, /resolve[\s-]+(?:the )?change/);
  assert.match(worker, /scope/);
});

test('Step 2 accessibility findings use the closed severity set and promote legacy Major findings', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  for (const severity of ['Critical', 'High', 'Medium', 'Low', 'Informational']) {
    assert.match(worker, new RegExp(`\\b${severity}\\b`));
  }
  assert.match(worker, /Major[\s\S]{0,160}(?:High|promot|at least High)/i);
});

test('Step 2 accessibility worker owns small-scope inspection without mandatory explorer delegation', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /five or fewer|<=\s*5|at most five/i);
  assert.match(worker, /source inspection[\s\S]{0,180}(?:worker|direct)/i);
  assert.match(worker, /without mandatory explorer|explorer delegation is not mandatory|no mandatory explorer/i);
});

test('Step 2 accessibility worker delegates large-scope inspection in bounded parallel areas', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /more than five|>\s*5|six or more/i);
  assert.match(worker, /per-component inspection|component[s-]level inspection/i);
  assert.match(worker, /parallel(?:ize|ized| independent)/i);
  assert.match(worker, /no more than eight|eight explorer|8 explorer/i);
});

test('Step 2 runtime mode asks for server confirmation before any scanner command', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /runtime/);
  assert.match(worker, /server confirmation|confirm.*server|server.*question/i);
  assert.match(worker, /one server question|exactly one.*server|single.*server/i);
  assert.match(worker, /before[\s\S]{0,160}(?:scanner command|scanner)/i);
});

test('Step 2 applicable scanners require one authorize-or-skip question and explicit authorization', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');

  assert.match(worker, /applicable scanner|scanner.*applicable/i);
  assert.match(worker, /authorize/);
  assert.match(worker, /skip/);
  assert.match(worker, /one authorize[/-]or[/-]skip question|exactly one.*authorize.*skip|single.*authorize.*skip/i);
  assert.match(worker, /only.*explicitly authorized|execute only.*authorized|authorized command/i);
});

test('Step 2 Claude and opencode bindings continue the same worker with only the selected value', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = artifact(`sai/orchestration/workers/bindings/${harness}/accessibility-worker.md`);
    assert.match(binding, /continue_same_worker|same-worker continuation/i);
    assert.match(binding, /selected value|selected_value/);
    assert.match(binding, /only.*selected|forwards only.*value/i);
    assert.match(binding, /preserv.*active worker state|active worker state.*preserv/i);
    assert.doesNotMatch(binding, /sai\/orchestration\/inline-invocation\.md/);
  }
});

test('Step 2 replacement restart excludes prior authorization, results, evidence, journal, and report content', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = artifact(`sai/orchestration/workers/bindings/${harness}/accessibility-worker.md`);
    assert.match(binding, /dispatch_one_replacement_worker|one replacement/i);
    for (const item of ['authorization', 'command results', 'evidence', 'journal', 'artifact content']) {
      assert.match(
        binding,
        new RegExp(`replacement[\\s\\S]{0,320}(?:without|exclude|not)[^\\n]{0,120}${item}`, 'i'),
        `${harness} replacement should exclude ${item}`
      );
    }
  }
});

test('Step 2 completion writes only accessibility.md and prints the exact completion line', () => {
  const worker = artifact('sai/orchestration/workers/sai-8-accessibility-worker.md');
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');

  assert.match(worker, /openspec\/changes\/\{change-name\}\/accessibility\.md/);
  assert.match(worker, /changed_files[\s\S]{0,180}only[\s\S]{0,120}accessibility\.md/i);
  assert.match(coordinator, /worker-authored summary/);
  assert.match(coordinator, /ordered duplicate-free changed_files/);
  assert.ok(coordinator.includes('Accessibility audit done.'));
});

// ─── Step 3: installation and inventory projections ─────────────────────────

test('Step 3 Claude Code and opencode wrappers load the coordinator and direct worker binding', () => {
  const wrappers = [
    ['claude', 'commands/claude/sai-8-accessibility.md', 'sai/orchestration/workers/bindings/accessibility-worker.md', 'claude'],
    ['opencode', 'commands/opencode/sai-8-accessibility.md', 'sai/orchestration/workers/bindings/accessibility-worker.md', 'opencode'],
  ];

  for (const [harness, wrapperPath, bindingPath, bindingHarness] of wrappers) {
    const wrapper = artifact(wrapperPath);
    assert.match(wrapper, /sai[\\/]commands[\\/]accessibility[\\/]coordinator\.md/,
      `${harness} should load the accessibility coordinator`);
    assert.match(wrapper, new RegExp(`Fetch @${bindingPath.replaceAll('/', '[\\\\/]')}`),
      `${harness} should load its neutral accessibility binding`);
    assert.doesNotMatch(wrapper, /Fetch @skills\/sai-8-accessibility-worker\/SKILL\.md/,
      `${harness} should not load the worker forwarding skill`);
    assert.match(wrapper, /\$ARGUMENTS/, `${harness} should preserve complete arguments`);
    assert.match(
      artifact(`sai/orchestration/workers/bindings/${bindingHarness}/accessibility-worker.md`),
      /sai-8-accessibility-worker/,
      `${harness} should have the matching accessibility binding`
    );
  }
});

test('Step 3 accessibility manifest projections are deterministic, unique, and harness-specific', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const expected = {
    claude: [
      'sai/orchestration/workers/sai-8-accessibility-worker.md',
      'sai/orchestration/workers/bindings/claude/accessibility-worker.md',
      'agents/claude/sai-8-accessibility-worker.md',
    ],
    opencode: [
      'sai/orchestration/workers/sai-8-accessibility-worker.md',
      'sai/orchestration/workers/bindings/opencode/accessibility-worker.md',
    ],
  };

  for (const [harness, requiredSources] of Object.entries(expected)) {
    const base = tempDir(`sai-accessibility-projections-${harness}-`);
    try {
      const first = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: destinationRoots(base),
      }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker'));
      const second = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: destinationRoots(base),
      }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker'));

      assert.deepEqual(first.map(projection => ({
        source: sourcePath(repoRoot, projection),
        destination: projection.destinationPath,
        strategy: projection.strategy,
      })), second.map(projection => ({
        source: sourcePath(repoRoot, projection),
        destination: projection.destinationPath,
        strategy: projection.strategy,
      })));
       const sources = new Set(first.map(projection => sourcePath(repoRoot, projection)));
       for (const source of requiredSources) assert.ok(sources.has(source), `${harness} should project ${source}`);
       assert.equal(first.some(projection => sourcePath(repoRoot, projection).startsWith('skills/')), false,
         `${harness} should not project an accessibility worker proxy skill`);
      assert.equal(new Set(first.map(projection => projection.destinationPath)).size, first.length,
        `${harness} accessibility destinations should be unique`);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }

});

test('Step 3 accessibility installation stops on a conflicting Claude destination without replacement', () => {
  const base = tempDir('sai-accessibility-collision-');
  const agentPath = path.join(base, 'agents', 'sai-8-accessibility-worker.md');
  const ownerPath = path.join(base, 'agents', '.sai-8-accessibility-worker.owner.json');
  const sentinel = 'unrelated user-owned accessibility agent\n';
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, sentinel);
    assert.throws(() => installClaude(base), /collision|incompatible|ownership|rename|remove/i);
    assert.equal(fs.readFileSync(agentPath, 'utf8'), sentinel);
    assert.equal(fs.existsSync(ownerPath), false, 'blocked installation must not create ownership metadata');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('Step 3 doctor and uninstall enumerate accessibility assets from the manifest inventory', () => {
  for (const [harness, install, enumerate] of [
    ['claude', installClaude, enumerateClaude],
    ['opencode', installOpencode, enumerateOpencode],
  ]) {
    const base = tempDir(`sai-accessibility-inventory-${harness}-`);
    try {
      install(base);
      const expected = accessibilityProjections(harness, base).map(projection => projection.destinationPath);
      if (harness === 'claude') {
        expected.push(path.join(base, 'agents', '.sai-8-accessibility-worker.owner.json'));
      }
      const actual = enumerate(base)
        .filter(entry => entry.assetType !== 'retired-managed-file' &&
          (entry.dest.includes('accessibility-worker') || entry.dest.includes('accessibility\\worker')))
        .map(entry => entry.dest)
        .sort();
      assert.deepEqual(actual, expected.sort(), `${harness} inventory should match manifest projections`);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('Step 3 existing user-owned accessibility agents survive doctor and uninstall', async () => {
  const base = tempDir('sai-accessibility-owned-');
  const projectRoot = tempDir('sai-accessibility-doctor-');
  const agentPath = path.join(base, 'agents', 'sai-8-accessibility-worker.md');
  const sentinel = 'custom user accessibility agent\n';
  const captured = collectOutput();
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, sentinel);
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');

    assert.throws(() => installClaude(base), /collision|incompatible|ownership|rename|remove/i);
    await doctorMain({
      argv: ['--json'],
      projectRoot,
      claudeBase: base,
      opencodeBase: path.join(projectRoot, 'missing-opencode'),
      execOpenspec: () => ({ status: 0, stdout: '1.4.1\n', stderr: '', error: null }),
      out: captured.out,
    });
    runDeletion(enumerateClaude(base));
    assert.equal(fs.readFileSync(agentPath, 'utf8'), sentinel);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('Step 3 routed accessibility bindings accept only closed lifecycle fields', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = artifact(`sai/orchestration/workers/bindings/${harness}/accessibility-worker.md`);
    assert.match(binding, /sai-8-accessibility-worker/);
    const resultContract = binding.match(/(?:closed payload|lifecycle result|result fields)[\s\S]{0,900}/i);
    assert.ok(resultContract, `${harness} binding should define a closed lifecycle result contract`);
    for (const field of ['completed', 'needs_input', 'failed', 'cancelled', 'status', 'question', 'options', 'blocking_summary', 'changed_files', 'summary']) {
      assert.match(resultContract[0], new RegExp(`\\b${field}\\b`, 'i'),
        `${harness} result should expose only the declared lifecycle field set`);
    }
    for (const forbidden of ['continuation identifier', 'runtime command', 'report content', 'binding metadata']) {
      assert.match(resultContract[0], new RegExp(`(?:must not|shall not|exclude|without|never)[^\\n]{0,180}${forbidden}`, 'i'),
        `${harness} result should reject ${forbidden}`);
    }
  }
});

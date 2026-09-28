'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PassThrough } = require('stream');

const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');
const { enumerateClaude, enumerateOpencode, runDeletion } = require('../bin/uninstall-flow.js');
const { main: doctorMain } = require('../bin/doctor.js');

const repoRoot = path.join(__dirname, '..');

const matrixManifest = loadInstallManifest(path.join(__dirname, '..'));
function matrixBinding(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'binding' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix binding should exist`);
  return item.text;
}

function matrixAgent(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'agent' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix agent should exist`);
  return item.text;
}

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
    root: base,
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
  }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker') || /accessibility[\\/]worker\.md$/.test(sourcePath(repoRoot, projection)));
}

function collectOutput() {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', chunk => chunks.push(chunk));
  return { out, text: () => Buffer.concat(chunks).toString('utf8') };
}

test('Step 1 accessibility card uses neutral root protocols and retires flat canonical sources', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');
  assert.match(worker, /@sai\/orchestration\/worker-core\.md/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-8-accessibility-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('accessibility scope, runtime, and parent arguments reach the worker unchanged', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');
  const worker = artifact('sai/commands/accessibility/worker.md');
  const claudeWrapper = artifact('commands/claude/sai-8-accessibility.md');
  const opencodeWrapper = artifact('commands/opencode/sai-8-accessibility.md');
  const argumentsValue = '--full --path src/components --runtime feature-branch';

  assert.match(coordinator, /arguments_value/);
  assert.doesNotMatch(coordinator, /wrapper_echo_value/,
    'the accessibility coordinator must not construct or forward wrapper_echo_value');
  assert.match(coordinator, /preserving the complete argument string/);
  assert.match(claudeWrapper, /command_name:\s*accessibility/);
  assert.match(claudeWrapper, /arguments_value:\s*\$ARGUMENTS/);
  assert.match(opencodeWrapper, /command_name:\s*accessibility/);
  assert.doesNotMatch(opencodeWrapper, /wrapper_echo_value/,
    'the opencode accessibility wrapper must not construct or forward wrapper_echo_value');
  assert.match(opencodeWrapper, /arguments_value:\s*\$ARGUMENTS/);
  assert.match(worker, /Reconstruct `\$ARGUMENTS` as the resolved change name plus the preserved optional scope, `--runtime`, and parent-branch values/,
    `complete arguments should reach the worker: ${argumentsValue}`);
});

test('accessibility review defaults to static-only without a runtime scanner', () => {
  const common = artifact('sai/commands/accessibility/steps/common.md');
  const runtimeStep = artifact('sai/commands/accessibility/steps/resolve-runtime-audit.md');

  assert.match(common, /`--runtime` enables browser-based[\s\S]{0,160}Default:\s*static-only/i);
  assert.match(runtimeStep, /Without `--runtime`, resolve the gate as legitimately skipped without asking/);
  assert.match(artifact('sai/commands/accessibility/worker.md'), /## Runtime Authorization/);
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
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(worker, /arguments_value/);
  assert.doesNotMatch(worker, /wrapper_echo_value/,
    'the accessibility worker must use arguments_value as its sole request source');
  assert.match(worker, /--full/);
  assert.match(worker, /--path/);
  assert.match(worker, /--runtime/);
  assert.match(worker, /resolve[\s-]+(?:the )?change/);
  assert.match(worker, /scope/);
});

test('Step 2 accessibility findings use the closed severity set', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  for (const severity of ['Critical', 'High', 'Medium', 'Low', 'Informational']) {
    assert.match(worker, new RegExp(`\\b${severity}\\b`));
  }
  assert.doesNotMatch(worker, /\bMajor\b/,
    'the binding carries only the closed Critical/High/Medium/Low/Informational taxonomy');
});

test('Step 2 accessibility worker owns small-scope inspection without mandatory explorer delegation', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(worker, /five or fewer|<=\s*5|at most five/i);
  assert.match(worker, /source inspection[\s\S]{0,180}(?:worker|direct)/i);
  assert.match(worker, /without mandatory explorer|explorer delegation is not mandatory|no mandatory explorer/i);
});

test('Step 2 accessibility worker delegates large-scope inspection in bounded parallel areas', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(worker, /more than five|>\s*5|six or more/i);
  assert.match(worker, /per-component inspection|component[s-]level inspection/i);
  assert.match(worker, /parallel(?:ize|ized| independent)/i);
  assert.match(worker, /no more than eight|eight explorer|8 explorer/i);
});

test('Step 2 runtime mode asks for server confirmation before any scanner command', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(worker, /runtime/);
  assert.match(worker, /server confirmation|confirm.*server|server.*question/i);
  assert.match(worker, /one server question|exactly one.*server|single.*server/i);
  assert.match(worker, /before[\s\S]{0,160}(?:scanner command|scanner)/i);
});

test('Step 2 applicable scanners require one authorize-or-skip question and explicit authorization', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(worker, /applicable scanner|scanner.*applicable/i);
  assert.match(worker, /authorize/);
  assert.match(worker, /skip/);
  assert.match(worker, /one authorize[/-]or[/-]skip question|exactly one.*authorize.*skip|single.*authorize.*skip/i);
  assert.match(worker, /only.*explicitly authorized|execute only.*authorized|authorized command/i);
});

test('Step 2 Claude and opencode bindings continue the same worker with the continuation payload', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = matrixBinding(harness, 'accessibility');
    assert.match(binding, /Continue on the same (?:worker|task)|same[- ]?(?:worker|task) continuation/i,
      'the binding should continue the same worker');
    assert.match(binding, /<continuation payload>/,
      'the binding should forward the continuation payload');
    assert.doesNotMatch(binding, /sai\/orchestration\/inline-invocation\.md/);
  }
});

test('Step 2 replacement restart excludes prior authorization, results, evidence, journal, and report content', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');
  assert.match(worker, /replacement/i,
    'the worker contract should define the replacement path');
  for (const item of ['authorization', 'command results', 'evidence', 'journal', 'artifact contents']) {
    assert.match(
      worker,
      new RegExp(`(?:no|without|never)[^\\n]{0,160}${item}`, 'i'),
      `the replacement restart should exclude ${item}`
    );
  }
});

test('Step 2 completion writes only accessibility.md and prints the exact completion line', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');

  assert.match(worker, /openspec\/changes\/\{change-name\}\/accessibility\.md/);
  assert.match(worker, /changed_files[\s\S]{0,180}only[\s\S]{0,120}accessibility\.md/i);
  assert.match(coordinator, /worker-authored summary/);
  assert.match(coordinator, /ordered duplicate-free changed_files/);
  assert.ok(coordinator.includes('Accessibility audit done.'));
});

// ─── Step 3: installation and inventory projections ─────────────────────────

test('Step 3 Claude Code and opencode wrappers load the launcher and the launcher loads the coordinator and direct worker binding', () => {
  const launcher = artifact('sai/commands/accessibility/command-bootstrap.md');
  assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/accessibility-worker\.md/,
    'launcher should load the neutral accessibility binding');

  const wrappers = [
    ['claude', 'commands/claude/sai-8-accessibility.md', 'claude'],
    ['opencode', 'commands/opencode/sai-8-accessibility.md', 'opencode'],
  ];

  for (const [harness, wrapperPath, bindingHarness] of wrappers) {
    const wrapper = artifact(wrapperPath);
    assert.match(wrapper, /sai[\\/]commands[\\/]accessibility[\\/]command-bootstrap\.md/,
      `${harness} should load the accessibility command bootstrap`);
    assert.match(wrapper, /\$ARGUMENTS/, `${harness} should preserve complete arguments`);
    assert.doesNotMatch(wrapper, /Fetch @skills\/sai-8-accessibility-worker\/SKILL\.md/,
      `${harness} should not load the worker forwarding skill`);
    assert.match(
      matrixBinding(bindingHarness, 'accessibility'),
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
      'sai/commands/accessibility/worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/claude/accessibility-worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/claude/sai-8-accessibility-worker.md',
    ],
    opencode: [
      'sai/commands/accessibility/worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/opencode/accessibility-worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/opencode/sai-8-accessibility-worker.md',
    ],
  };

  for (const [harness, requiredSources] of Object.entries(expected)) {
    const base = tempDir(`sai-accessibility-projections-${harness}-`);
    try {
      const first = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: destinationRoots(base),
      }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker') || /accessibility[\\/]worker\.md$/.test(sourcePath(repoRoot, projection)));
      const second = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: destinationRoots(base),
      }).filter(projection => sourcePath(repoRoot, projection).includes('accessibility-worker') || /accessibility[\\/]worker\.md$/.test(sourcePath(repoRoot, projection)));

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

test('Step 3 accessibility installation overwrites a conflicting Claude destination with notice', () => {
  const base = tempDir('sai-accessibility-collision-');
  const agentPath = path.join(base, 'agents', 'sai-8-accessibility-worker.md');
  const ownerPath = path.join(base, 'agents', '.sai-8-accessibility-worker.owner.json');
  const sentinel = 'unrelated user-owned accessibility agent\n';
  const notices = [];
  const originalLog = console.log;
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, sentinel);
    console.log = message => notices.push(String(message));
    assert.doesNotThrow(() => installClaude(base),
      'installClaude should not throw on a conflicting agent destination');
  } finally {
    console.log = originalLog;
  }
  assert.deepEqual(
    fs.readFileSync(agentPath),
    Buffer.from(matrixAgent('claude', 'accessibility')),
    'the conflicting content should be overwritten with the managed source bytes');
  assert.equal(fs.existsSync(ownerPath), false, 'install must not create ownership metadata');
  assert.ok(notices.some(message => message.includes(agentPath)),
    'the overwrite should be announced with a stdout notice naming the file');
  fs.rmSync(base, { recursive: true, force: true });
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
      const actual = enumerate(base)
        .filter(entry => entry.assetType !== 'retired-managed-file' &&
          (entry.dest.includes('accessibility-worker') ||
            /[\\/]commands[\\/]accessibility[\\/]worker\.md$/.test(entry.dest)))
        .map(entry => entry.dest)
        .sort();
      assert.deepEqual(actual, expected.sort(), `${harness} inventory should match manifest projections`);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  }
});

test('Step 3 divergent accessibility agents are overwritten, doctor-clean, and uninstalled', async () => {
  const base = tempDir('sai-accessibility-owned-');
  const projectRoot = tempDir('sai-accessibility-doctor-');
  const agentPath = path.join(base, 'agents', 'sai-8-accessibility-worker.md');
  const ownerPath = path.join(base, 'agents', '.sai-8-accessibility-worker.owner.json');
  const sentinel = 'custom user accessibility agent\n';
  const captured = collectOutput();
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, sentinel);
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');

    assert.doesNotThrow(() => installClaude(base),
      'installClaude should not throw on a divergent agent destination');
    assert.deepEqual(
      fs.readFileSync(agentPath),
      Buffer.from(matrixAgent('claude', 'accessibility')),
      'the divergent agent should be overwritten with the managed source bytes');
    assert.equal(fs.existsSync(ownerPath), false, 'no owner sidecar should exist after install');

    const code = await doctorMain({
      argv: ['--json'],
      projectRoot,
      claudeBase: base,
      opencodeBase: path.join(projectRoot, 'missing-opencode'),
      execOpenspec: () => ({ status: 0, stdout: '1.4.1\n', stderr: '', error: null }),
      out: captured.out,
    });
    assert.equal(code, 0, 'doctor should accept the restored managed agent');
    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(agentPath), false,
      'the body-matching agent should be removed by uninstall');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('Step 3 routed accessibility worker contract accepts only closed lifecycle fields', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');
  assert.match(worker, /Accessibility Worker|sai-8-accessibility-worker/);
  const payloadContract = worker.match(/(?:payload includes|closed payload|lifecycle result)[\s\S]{0,800}/i);
  assert.ok(payloadContract, 'the worker contract should define a closed lifecycle result contract');
  for (const field of ['completed', 'needs_input', 'failed', 'cancelled', 'status', 'question', 'options', 'changed_files', 'summary']) {
    assert.match(worker, new RegExp(`\\b${field}\\b`, 'i'),
      `the worker result should expose only the declared lifecycle field set`);
  }
  for (const forbidden of ['continuation identifier', 'command results', 'report content', 'binding metadata']) {
    assert.match(worker, new RegExp(`(?:must not|shall not|exclude|without|never|no)[^\\n]{0,180}${forbidden}`, 'i'),
      `the worker result should reject ${forbidden}`);
  }
});

// ─── Step 5: accessibility-phase progress surfaces ──────────────────────────

test('accessibility coordinator declares the canonical five-step progress plan in order with labels', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');

  for (const id of ['resolve-accessibility-scope', 'map-ui-framework', 'resolve-static-audit', 'resolve-runtime-audit', 'close-accessibility-outcome']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /resolve-accessibility-scope[\s\S]{0,300}map-ui-framework[\s\S]{0,300}resolve-static-audit[\s\S]{0,300}resolve-runtime-audit[\s\S]{0,300}close-accessibility-outcome/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /resolve-accessibility-scope[\s\S]{0,200}Resolve accessibility scope and runtime mode/i);
  assert.match(coordinator, /map-ui-framework[\s\S]{0,200}Map UI components and framework/i);
  assert.match(coordinator, /resolve-static-audit[\s\S]{0,200}Resolve static accessibility audit/i);
  assert.match(coordinator, /resolve-runtime-audit[\s\S]{0,200}Resolve runtime-audit gate/i);
  assert.match(coordinator, /close-accessibility-outcome[\s\S]{0,200}Close accessibility outcome/i);
  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,240}(?:progress|sole nonterminal)/i);
  assert.match(coordinator, /at dispatch/i);
  assert.match(coordinator, /continue_after_progress[\s\S]{0,160}protocol[- ]?only/i);
});

test('accessibility worker contract enumerates the five ids and pins the batch semantics', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(
    worker,
    /resolve-accessibility-scope[\s\S]{0,800}map-ui-framework[\s\S]{0,800}resolve-static-audit[\s\S]{0,800}resolve-runtime-audit[\s\S]{0,800}close-accessibility-outcome/,
    'the accessibility worker contract should enumerate the same five ids in the same order'
  );
  assert.match(worker, /startup act/i);
  assert.match(worker, /resolve-accessibility-scope/);
  assert.match(worker, /runtime[\s\S]{0,240}(?:authorization|not applicable|skip)/i);
  assert.match(worker, /resolve-runtime-audit/);
  assert.match(worker, /no-?UI[\s\S]{0,240}Not Applicable report[\s\S]{0,80}`completed`/i);
  assert.doesNotMatch(worker, /no Milestone Stamp/i, 'audit plans carry stamps per todo-structure; the worker states nothing about them');
  assert.match(worker, /never[\s\S]{0,160}(?:before resolution|in place of a terminal|needs_input)/i);
});

test('accessibility coordinator and policy carry a Progress rendering contract with threshold reference and no stamp', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
  assert.match(policy, /completed[\s\S]{0,240}in_progress|in_progress[\s\S]{0,240}completed/i,
    'reported ids should render completed and the leading unmarked step in_progress');
  assert.match(policy, /(?:below|fewer than|less than)[\s\S]{0,120}three|three[\s\S]{0,120}(?:below|fewer than|less than)/i,
    'the policy should state the declared-step threshold');
  assert.match(policy, /(?:no|without|never)[\s\S]{0,200}(?:below|threshold)/i,
    'no task list / todowrite call should be emitted below the threshold');
  assert.doesNotMatch(coordinator, /fewer than three|below three/,
    'the coordinator should reference the policy and not restate the threshold constant');
  assert.match(policy, /coordinator session/i,
    'the policy should record the coordinator-only emission ownership');
  assert.doesNotMatch(coordinator, /date \+%H:%M/,
    'the coordinator should carry no per-harness wall-clock command');

  assert.match(policy, /todowrite/i,
    'the policy should name the opencode todowrite tool');
  assert.match(policy, /disabl[\s\S]{0,200}subagent/i,
    'the policy should tie the disabled-by-default tool to the subagent context');
  assert.doesNotMatch(coordinator, /Get-Date/,
    'the coordinator should carry no PowerShell wall-clock command');

  assert.doesNotMatch(worker, /no Milestone Stamp/i,
    'the worker never renders stamps, so its contract states nothing about them');
  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
});

// ─── audit-step-gated-instructions (step-gated delivery replicated onto the audit family) ──

const ACCESSIBILITY_PLAN_STEPS = [
  ['resolve-accessibility-scope', 'Resolve accessibility scope and runtime mode'],
  ['map-ui-framework', 'Map UI components and framework'],
  ['resolve-static-audit', 'Resolve static accessibility audit'],
  ['resolve-runtime-audit', 'Resolve runtime-audit gate'],
  ['close-accessibility-outcome', 'Close accessibility outcome'],
];
const ACCESSIBILITY_STEP_MAP = {
  'resolve-accessibility-scope': null,
  'map-ui-framework': 'sai/commands/accessibility/steps/map-ui-framework.md',
  'resolve-static-audit': 'sai/commands/accessibility/steps/resolve-static-audit.md',
  'resolve-runtime-audit': 'sai/commands/accessibility/steps/resolve-runtime-audit.md',
  'close-accessibility-outcome': 'sai/commands/accessibility/steps/close-accessibility-outcome.md',
};

test('step-gated: the accessibility coordinator declares step_machine and loads stage-machine.md', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');

  assert.match(coordinator, /step_machine: accessibility-standalone@1/,
    'the coordinator should declare step_machine: accessibility-standalone@1');
  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.doesNotMatch(coordinator, /step_pointer_map/,
    'the static step_pointer_map should not be declared');
});

test('step-gated: progress continuations carry exactly two lines with the deterministic Active step pointer', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /## Step machines/,
    'stage-machine.md should have a Step machines section');
  assert.match(stageMachine, /the two-line continuation/i,
    'stage-machine.md should document the two-line continuation');
  assert.match(stageMachine, /`Active step: none` line/,
    'stage-machine.md should specify the terminal pointer line');
});

test('step-gated: non-progress continuations carry no pointer line', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /do not invoke emit and do not consult the machine/,
    'stage-machine.md should state that non-progress continuations do not invoke emit');
  assert.match(stageMachine, /active step file persists/,
    'stage-machine.md should state that the active step file persists');
});

test('step-gated: replacement reconstruction includes active_step_id', () => {
  const coordinator = artifact('sai/commands/accessibility/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /replacement_reconstruction_fields[\s\S]{0,400}active_step_id/,
    'replacement reconstruction should include the departing worker active_step_id');
  assert.match(stageMachine, /A replacement worker re-resolves/,
    "stage-machine.md should describe replacement re-resolution");
  assert.match(stageMachine, /## Step machines/,
    'stage-machine.md should have a Step machines section');
});

test('step-gated: the accessibility worker loads steps/common.md at dispatch and executes only the active step', () => {
  const worker = artifact('sai/commands/accessibility/worker.md');

  assert.match(worker, /Fetch @sai\/commands\/accessibility\/steps\/common\.md and keep it in force for the entire run/,
    'common.md should load at dispatch as part of the sealed initial surface');
  assert.match(worker, /## Active Step Execution/, 'the worker contract should own active-step execution');
  assert.match(worker, /this contract plus common\.md is the sealed initial surface/);
  assert.match(worker, /`resolve-accessibility-scope` runs from it before the first progress event/,
    'the fileless first step should run from the sealed surface before the first pointer');
  assert.match(worker, /never prefetch, open, or follow any other step instruction file/,
    'the worker must execute only the coordinator-named step');
  assert.doesNotMatch(worker, /Fetch @sai\/commands\/accessibility\/invocation\.md/,
    'the wholesale invocation fetch chain must be replaced by active-step execution');
  assert.match(worker, /A gated stage resolved by legitimate skip still reports its milestone/,
    'a legitimately skipped gated stage still advances the pointer past it');
});

test('step-gated: the step library is the only accessibility instruction surface', () => {
  for (const retired of ['instructions.md', 'invocation.md']) {
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/accessibility', retired)), false,
      `the monolithic accessibility ${retired} is retired`);
  }
  const manifest = JSON.parse(artifact('sai/install-manifest.json'));
  for (const [id, destination] of [
    ['retired-sai-8-accessibility-instructions', 'commands/accessibility/instructions.md'],
    ['retired-sai-8-accessibility-invocation', 'commands/accessibility/invocation.md'],
  ]) {
    const retirement = manifest.retirements.find(record => record.id === id);
    assert.ok(retirement, `the manifest should retire installed copies of ${destination}`);
    assert.equal(retirement.destination.path, destination);
  }
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/commands/accessibility/steps/common.md')),
    'steps/common.md should exist');
  for (const [id, relativePath] of Object.entries(ACCESSIBILITY_STEP_MAP)) {
    if (!relativePath) continue;
    const source = artifact(relativePath);
    assert.notEqual(source, '', `${relativePath} should exist`);
    assert.match(source, new RegExp(`Active step: ${id}\\.`),
      `${relativePath} should name its active step id`);
  }
  assert.match(artifact('sai/commands/accessibility/steps/common.md'), /`resolve-accessibility-scope` has no step file of its own/,
    'common.md should record that resolve-accessibility-scope is fileless');
});
